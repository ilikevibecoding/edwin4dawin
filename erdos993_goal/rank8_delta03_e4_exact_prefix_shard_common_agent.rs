// Shared fail-closed prefix-shard wrapper.  This macro is expanded inside an
// orbit producer module, so it can call that producer's private canonical
// enumerators/worker without editing the hash-pinned producer source.

macro_rules! define_exact_prefix_shard_entry {
    (
        $prefixes:ident,
        $secondary:ident,
        $worker:ident,
        $orbit:literal,
        $producer_sha:literal,
        $expected_prefixes:expr,
        $expected_secondary:expr
    ) => {
        pub fn exact_prefix_shard_entry() {
            use std::io::Write as _;

            audit_sha_self_test();
            let arguments: Vec<String> = std::env::args().collect();
            assert!(
                arguments.len() == 4 || arguments.len() == 5,
                "usage: shard.exe START END OUTPUT_DIR [SECONDARY_LIMIT]"
            );
            let start: usize = arguments[1].parse().expect("invalid start");
            let end: usize = arguments[2].parse().expect("invalid end");
            assert!(start < end, "empty/reversed shard");
            assert!(end - start <= 12, "shard exceeds 12-prefix hard bound");

            let prefixes = std::sync::Arc::new($prefixes());
            let all_secondary = $secondary();
            assert_eq!(prefixes.len(), $expected_prefixes, "prefix census drift");
            assert_eq!(
                all_secondary.len(),
                $expected_secondary,
                "secondary census drift"
            );
            assert!(end <= prefixes.len(), "prefix end out of range");
            let secondary_limit = if arguments.len() == 5 {
                arguments[4].parse::<usize>().expect("invalid secondary limit")
            } else {
                all_secondary.len()
            };
            assert!(
                0 < secondary_limit && secondary_limit <= all_secondary.len(),
                "secondary limit out of range"
            );
            let secondary = std::sync::Arc::new(
                all_secondary[..secondary_limit].to_vec()
            );

            let output_dir = std::path::PathBuf::from(&arguments[3]);
            std::fs::create_dir_all(&output_dir).expect("create output directory");
            let safe_orbit = $orbit.replace(':', "__");
            let base = format!(
                "{}_p{:05}_{:05}_r{:06}",
                safe_orbit,
                start,
                end,
                secondary_limit,
            );
            let coefficient_path = output_dir.join(format!("{}.coeff.bin", base));
            let finite_path = output_dir.join(format!("{}.finite.bin", base));
            let raw_path = output_dir.join(format!("{}.raw.txt", base));
            assert!(!coefficient_path.exists(), "coefficient output exists");
            assert!(!finite_path.exists(), "finite output exists");
            assert!(!raw_path.exists(), "raw output exists");

            let process = std::process::id();
            let coefficient_temp = output_dir.join(format!("{}.coeff.tmp.{}", base, process));
            let finite_temp = output_dir.join(format!("{}.finite.tmp.{}", base, process));
            let raw_temp = output_dir.join(format!("{}.raw.tmp.{}", base, process));
            let coefficient_file = std::fs::OpenOptions::new()
                .write(true).create_new(true).open(&coefficient_temp)
                .expect("create coefficient temp");
            let finite_file = std::fs::OpenOptions::new()
                .write(true).create_new(true).open(&finite_temp)
                .expect("create finite temp");
            let mut coefficient_writer = std::io::BufWriter::new(coefficient_file);
            let mut finite_writer = std::io::BufWriter::new(finite_file);
            let mut coefficient_hash = AuditSha256::new();
            let mut finite_hash = AuditSha256::new();
            let mut counts = [0_u64; 5];
            let mut unseen = 0_u64;
            let mut literal_checks = 0_u64;
            let timer = std::time::Instant::now();

            for prefix_index in start..end {
                let result = $worker(
                    prefix_index,
                    std::sync::Arc::clone(&prefixes),
                    std::sync::Arc::clone(&secondary),
                );
                assert_eq!(result.prefix_index, prefix_index, "prefix order drift");
                assert_eq!(
                    result.coefficient_leaves.len(),
                    result.counts[4] as usize * 32,
                    "coefficient byte/count mismatch"
                );
                assert_eq!(
                    result.finite_leaves.len(),
                    result.counts[1] as usize * 32,
                    "finite byte/count mismatch"
                );
                coefficient_writer
                    .write_all(&result.coefficient_leaves)
                    .expect("write coefficient leaves");
                finite_writer
                    .write_all(&result.finite_leaves)
                    .expect("write finite leaves");
                coefficient_hash.update(&result.coefficient_leaves);
                finite_hash.update(&result.finite_leaves);
                for index in 0..5 {
                    counts[index] = counts[index]
                        .checked_add(result.counts[index])
                        .expect("count overflow");
                }
                unseen = unseen.checked_add(result.unseen).expect("unseen overflow");
                literal_checks = literal_checks
                    .checked_add(result.literal_checks)
                    .expect("literal count overflow");
            }
            coefficient_writer.flush().expect("flush coefficient stream");
            finite_writer.flush().expect("flush finite stream");
            coefficient_writer.get_ref().sync_all().expect("sync coefficient stream");
            finite_writer.get_ref().sync_all().expect("sync finite stream");
            drop(coefficient_writer);
            drop(finite_writer);

            let keys = counts[0].checked_add(counts[4]).expect("key overflow");
            assert_eq!(
                keys,
                ((end - start) * secondary_limit) as u64,
                "key census mismatch"
            );
            assert_eq!(counts[4], counts[2] + counts[3], "ray sector mismatch");
            assert_eq!(unseen, 4 * counts[4], "unseen count mismatch");
            let coefficient_bytes = counts[4] * 32;
            let finite_bytes = counts[1] * 32;
            assert_eq!(
                std::fs::metadata(&coefficient_temp).expect("coefficient metadata").len(),
                coefficient_bytes,
                "coefficient file size mismatch"
            );
            assert_eq!(
                std::fs::metadata(&finite_temp).expect("finite metadata").len(),
                finite_bytes,
                "finite file size mismatch"
            );
            let coefficient_stream = coefficient_hash.hex();
            let finite_stream = finite_hash.hex();
            let elapsed_ms = timer.elapsed().as_millis();

            std::fs::rename(&coefficient_temp, &coefficient_path)
                .expect("promote coefficient stream");
            std::fs::rename(&finite_temp, &finite_path)
                .expect("promote finite stream");
            let mode = if secondary_limit == all_secondary.len() {
                "FULL_PREFIX"
            } else {
                "BOUNDED_SECONDARY_PROBE"
            };
            let raw = format!(
                concat!(
                    "PASS_EXACT_ORDERED_PREFIX_SHARD\n",
                    "ORBIT {}\n",
                    "MODE {}\n",
                    "PRODUCER_SOURCE_SHA256 {}\n",
                    "PREFIX_RANGE {} {} {}\n",
                    "SECONDARY_LIMIT {} {}\n",
                    "COUNTS {} {} {} {} {}\n",
                    "KEYS {}\n",
                    "UNSEEN {}\n",
                    "LITERAL_CHECKS {}\n",
                    "COEFFICIENT_BYTES {}\n",
                    "FINITE_BYTES {}\n",
                    "COEFFICIENT_STREAM_SHA256 {}\n",
                    "FINITE_STREAM_SHA256 {}\n",
                    "COEFFICIENT_FILE {}\n",
                    "FINITE_FILE {}\n",
                    "ELAPSED_MS {}\n"
                ),
                $orbit,
                mode,
                $producer_sha,
                start,
                end,
                prefixes.len(),
                secondary_limit,
                all_secondary.len(),
                counts[0],
                counts[1],
                counts[2],
                counts[3],
                counts[4],
                keys,
                unseen,
                literal_checks,
                coefficient_bytes,
                finite_bytes,
                coefficient_stream,
                finite_stream,
                coefficient_path.file_name().unwrap().to_string_lossy(),
                finite_path.file_name().unwrap().to_string_lossy(),
                elapsed_ms,
            );
            let mut raw_file = std::fs::OpenOptions::new()
                .write(true).create_new(true).open(&raw_temp)
                .expect("create raw temp");
            raw_file.write_all(raw.as_bytes()).expect("write raw manifest");
            raw_file.sync_all().expect("sync raw manifest");
            drop(raw_file);
            std::fs::rename(&raw_temp, &raw_path).expect("promote raw manifest");
            print!("{}", raw);
        }
    };
}
