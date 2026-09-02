// Independent checked-i256 literal audit for five_cubic_path:center_branch.
//
// This uses the separately transcribed message/literal engine from the
// five-cubic-T audit, but enumerates the path topology independently as an
// unordered pair of long halves plus the center pendant.

mod engine {
    include!("audit_rank8_delta03_e5_five_cubic_t_center_branch_literal_i256_agent.rs");

    const P5A_THREADS: usize = 6;
    const P5A_BOUNDS: [usize; 7] = [0, 1_093, 2_302, 3_675, 5_302, 7_424, 12_544];

    fn p5a_leaf_message(length: i32) -> FAMessage {
        FAMessage {
            parent_absent: path(length),
            parent_present: path(length - 1),
        }
    }

    fn p5a_coords(left: FALongArm, right: FALongArm, center_leaf: i32) -> [FACoord; 11] {
        [
            left.center_middle,
            left.middle_leaf,
            left.middle_outer,
            left.outer_low,
            left.outer_high,
            right.center_middle,
            right.middle_leaf,
            right.middle_outer,
            right.outer_low,
            right.outer_high,
            fa_leaf(center_leaf),
        ]
    }

    fn p5a_direct_polynomials(lengths: &[i32; 11]) -> (V, V) {
        fa_root_polynomials(
            fa_long_message(lengths[0], lengths[1], lengths[2], lengths[3], lengths[4]),
            fa_long_message(lengths[5], lengths[6], lengths[7], lengths[8], lengths[9]),
            p5a_leaf_message(lengths[10]),
        )
    }

    fn p5a_fixed(left: FALongArm, right: FALongArm, center_leaf: i32, varying: usize) -> FAFixed {
        let leaf = p5a_leaf_message(center_leaf);
        match varying {
            0..=4 => FAFixed {
                moving_group: 0,
                parent_absent: mul(&right.message.parent_absent, &leaf.parent_absent),
                parent_present: mul(&right.message.parent_present, &leaf.parent_present),
            },
            5..=9 => FAFixed {
                moving_group: 1,
                parent_absent: mul(&left.message.parent_absent, &leaf.parent_absent),
                parent_present: mul(&left.message.parent_present, &leaf.parent_present),
            },
            10 => FAFixed {
                moving_group: 2,
                parent_absent: mul(&left.message.parent_absent, &right.message.parent_absent),
                parent_present: mul(&left.message.parent_present, &right.message.parent_present),
            },
            _ => unreachable!(),
        }
    }

    fn p5a_values_with_fixed(lengths: &[i32; 11], fixed: FAFixed) -> [Z; 4] {
        let moving = match fixed.moving_group {
            0 => fa_long_message(lengths[0], lengths[1], lengths[2], lengths[3], lengths[4]),
            1 => fa_long_message(lengths[5], lengths[6], lengths[7], lengths[8], lengths[9]),
            2 => p5a_leaf_message(lengths[10]),
            _ => unreachable!(),
        };
        let (whole, deleted) = fa_from_fixed(moving, fixed);
        deltas03(&whole, &deleted)
    }

    fn p5a_values(lengths: &[i32; 11]) -> [Z; 4] {
        let (whole, deleted) = p5a_direct_polynomials(lengths);
        deltas03(&whole, &deleted)
    }

    fn p5a_tree(lengths: &[i32; 11]) -> (Vec<Vec<usize>>, usize) {
        let root = 0_usize;
        let mut adjacency = vec![Vec::new()];

        let left_inner = fa_extend(&mut adjacency, root, lengths[0]);
        fa_extend(&mut adjacency, left_inner, lengths[1]);
        let left_outer = fa_extend(&mut adjacency, left_inner, lengths[2]);
        fa_extend(&mut adjacency, left_outer, lengths[3]);
        fa_extend(&mut adjacency, left_outer, lengths[4]);

        let right_inner = fa_extend(&mut adjacency, root, lengths[5]);
        fa_extend(&mut adjacency, right_inner, lengths[6]);
        let right_outer = fa_extend(&mut adjacency, right_inner, lengths[7]);
        fa_extend(&mut adjacency, right_outer, lengths[8]);
        fa_extend(&mut adjacency, right_outer, lengths[9]);

        fa_extend(&mut adjacency, root, lengths[10]);
        assert_eq!(adjacency.len(), 1 + lengths.iter().sum::<i32>() as usize);
        assert_eq!(adjacency.iter().map(Vec::len).sum::<usize>(), 2 * (adjacency.len() - 1));
        assert_eq!(adjacency.iter().filter(|row| row.len() == 3).count(), 5);
        (adjacency, root)
    }

    fn p5a_literal_values(lengths: &[i32; 11]) -> [Z; 4] {
        let (adjacency, root) = p5a_tree(lengths);
        audit_deltas(&adjacency, root).0
    }

    fn p5a_independent_smoke() {
        let mut random = 0x73A9_D561_4C20_E8BF_u64;
        for sample in 0..512_usize {
            let mut lengths = [0_i32; 11];
            for length in &mut lengths {
                random ^= random >> 12;
                random ^= random << 25;
                random ^= random >> 27;
                random = random.wrapping_mul(0x2545F4914F6CDD1D);
                *length = 1 + (random % 23) as i32;
            }
            assert_eq!(
                p5a_values(&lengths),
                p5a_literal_values(&lengths),
                "independent path-center direct mismatch {}",
                sample,
            );
        }
        let halves = fa_long_table();
        for sample in 0..512_usize {
            random ^= random >> 12;
            random ^= random << 25;
            random ^= random >> 27;
            random = random.wrapping_mul(0x2545F4914F6CDD1D);
            let left_index = random as usize % halves.len();
            random ^= random >> 12;
            random ^= random << 25;
            random ^= random >> 27;
            random = random.wrapping_mul(0x2545F4914F6CDD1D);
            let right_index = left_index + random as usize % (halves.len() - left_index);
            let center_leaf = 1 + (random % 7) as i32;
            let left = halves[left_index];
            let right = halves[right_index];
            let coords = p5a_coords(left, right, center_leaf);
            let mut lengths = fa_lengths(&coords);
            let varying = random as usize % 11;
            lengths[varying] += (random % 19) as i32;
            let fixed = p5a_fixed(left, right, center_leaf, varying);
            assert_eq!(
                p5a_values_with_fixed(&lengths, fixed),
                p5a_literal_values(&lengths),
                "independent path-center cache mismatch {}",
                sample,
            );
        }
        println!("PASS_E5_FIVE_CUBIC_PATH_CENTER_BRANCH_INDEPENDENT_1024_LITERAL_SMOKE");
    }

    fn p5a_coefficient_leaf(
        coords: &[FACoord; 11],
        baseline: i32,
        shift: i32,
        rows: &[[Z; AUDIT_SAMPLES]; 4],
    ) -> [u8; 32] {
        let mut hash = AuditSha256::new();
        hash.update(b"e5-five-cubic-path-center-branch-coefficient-v1\0");
        for &coord in coords { fa_hash_coord(&mut hash, coord); }
        hash.update(&baseline.to_le_bytes());
        hash.update(&shift.to_le_bytes());
        for row in rows { for &value in row { fa_hash_z(&mut hash, value); } }
        fa_sha_bytes(hash)
    }

    fn p5a_finite_leaf(coords: &[FACoord; 11], order: i32, values: &[Z; 4]) -> [u8; 32] {
        let mut hash = AuditSha256::new();
        hash.update(b"e5-five-cubic-path-center-branch-finite-v1\0");
        for &coord in coords { fa_hash_coord(&mut hash, coord); }
        hash.update(&order.to_le_bytes());
        for &value in values { fa_hash_z(&mut hash, value); }
        fa_sha_bytes(hash)
    }

    fn p5a_formula_coefficients(
        coords: &[FACoord; 11],
        left: FALongArm,
        right: FALongArm,
        center_leaf: i32,
        literal: bool,
    ) -> (i32, i32, [[Z; AUDIT_SAMPLES]; 4], u64) {
        let varying = coords.iter().position(|coord| coord.infinite).expect("ray expected");
        let fixed = p5a_fixed(left, right, center_leaf, varying);
        let mut lengths = fa_lengths(coords);
        let baseline = 1 + lengths.iter().sum::<i32>();
        let shift = (28 - baseline).max(0);
        let initial = lengths[varying];
        let mut samples = [[Z::zero(); AUDIT_SAMPLES]; 4];
        let mut checks = 0_u64;
        for point in 0..AUDIT_SAMPLES {
            lengths[varying] = initial + shift + point as i32;
            let values = p5a_values_with_fixed(&lengths, fixed);
            if literal && (point == 0 || point == 13) {
                assert_eq!(values, p5a_literal_values(&lengths));
                checks += 1;
            }
            for rank in 0..4 { samples[rank][point] = values[rank]; }
        }
        let rows: [[Z; AUDIT_SAMPLES]; 4] =
            std::array::from_fn(|rank| audit_differences(&samples[rank]));
        assert!(fa_degree_ok(&rows));
        lengths[varying] = initial + shift + AUDIT_SAMPLES as i32;
        let unseen = p5a_values_with_fixed(&lengths, fixed);
        if literal {
            assert_eq!(unseen, p5a_literal_values(&lengths));
            checks += 1;
        }
        for rank in 0..4 { assert_eq!(unseen[rank], audit_newton_at_29(&rows[rank])); }
        (baseline, shift, rows, checks)
    }

    fn p5a_literal_coefficients(coords: &[FACoord; 11]) -> (i32, i32, [[Z; AUDIT_SAMPLES]; 4]) {
        let varying = coords.iter().position(|coord| coord.infinite).expect("ray expected");
        let mut lengths = fa_lengths(coords);
        let baseline = 1 + lengths.iter().sum::<i32>();
        let shift = (28 - baseline).max(0);
        let initial = lengths[varying];
        let mut samples = [[Z::zero(); AUDIT_SAMPLES]; 4];
        for point in 0..AUDIT_SAMPLES {
            lengths[varying] = initial + shift + point as i32;
            let values = p5a_literal_values(&lengths);
            for rank in 0..4 { samples[rank][point] = values[rank]; }
        }
        let rows: [[Z; AUDIT_SAMPLES]; 4] =
            std::array::from_fn(|rank| audit_differences(&samples[rank]));
        assert!(fa_degree_ok(&rows));
        lengths[varying] = initial + shift + AUDIT_SAMPLES as i32;
        let unseen = p5a_literal_values(&lengths);
        for rank in 0..4 { assert_eq!(unseen[rank], audit_newton_at_29(&rows[rank])); }
        (baseline, shift, rows)
    }

    fn p5a_smoke_stream() {
        let halves = fa_long_table();
        let mut coefficient = AuditSha256::new();
        let mut finite = AuditSha256::new();
        let mut finite_records = 0_u64;
        let mut ray_records = 0_u64;
        let mut gate_failures = 0_u64;
        for sample in 0..512_usize {
            let left_index = (sample * 131 + 17) % halves.len();
            let right_index = left_index + (sample * 104_729 + 23) % (halves.len() - left_index);
            let center_leaf = 1 + ((sample * 17 + 5) % 7) as i32;
            let coords = p5a_coords(halves[left_index], halves[right_index], center_leaf);
            if !coords.iter().any(|coord| coord.infinite) {
                let lengths = fa_lengths(&coords);
                let order = 1 + lengths.iter().sum::<i32>();
                if order >= 28 {
                    let values = p5a_literal_values(&lengths);
                    finite.update(&p5a_finite_leaf(&coords, order, &values));
                    finite_records += 1;
                }
                continue;
            }
            let (baseline, shift, rows) = p5a_literal_coefficients(&coords);
            if !fa_gate_ok(&rows) { gate_failures += 1; }
            coefficient.update(&p5a_coefficient_leaf(&coords, baseline, shift, &rows));
            ray_records += 1;
        }
        println!("SMOKE_RECORDS {} {}", finite_records, ray_records);
        println!("SMOKE_GATE_FAILURES {}", gate_failures);
        println!("SMOKE_STREAM {} {}", coefficient.hex(), finite.hex());
    }

    struct P5AResult {
        worker: usize,
        start: usize,
        end: usize,
        counts: [u64; 5],
        unseen: u64,
        literal: u64,
        coefficient_records: u64,
        finite_records: u64,
        coefficient_digest: [u8; 32],
        finite_digest: [u8; 32],
    }

    fn p5a_worker(worker: usize, halves: Arc<Vec<FALongArm>>) -> P5AResult {
        let start = P5A_BOUNDS[worker];
        let end = P5A_BOUNDS[worker + 1];
        let mut counts = [0_u64; 5];
        let mut unseen = 0_u64;
        let mut literal = 0_u64;
        let mut coefficient_records = 0_u64;
        let mut finite_records = 0_u64;
        let mut coefficient = AuditSha256::new();
        let mut finite = AuditSha256::new();
        for left_index in start..end {
            let left = halves[left_index];
            for right_index in left_index..halves.len() {
                let right = halves[right_index];
                for center_leaf in 1..=7_i32 {
                    let coords = p5a_coords(left, right, center_leaf);
                    let long_count = coords.iter().filter(|coord| coord.infinite).count();
                    if long_count == 0 {
                        counts[0] += 1;
                        let lengths = fa_lengths(&coords);
                        let order = 1 + lengths.iter().sum::<i32>();
                        if order < 28 { continue; }
                        let fast = p5a_values(&lengths);
                        let direct = p5a_literal_values(&lengths);
                        assert_eq!(fast, direct);
                        assert!(direct.iter().all(|value| value.is_positive()));
                        finite.update(&p5a_finite_leaf(&coords, order, &direct));
                        finite_records += 1;
                        counts[1] += 1;
                        literal += 1;
                        continue;
                    }
                    if long_count == 11 { counts[3] += 1; } else { counts[2] += 1; }
                    let (baseline, shift, rows, checks) =
                        p5a_formula_coefficients(&coords, left, right, center_leaf, true);
                    audit_assert_gate(&rows);
                    coefficient.update(&p5a_coefficient_leaf(&coords, baseline, shift, &rows));
                    coefficient_records += 1;
                    counts[4] += 1;
                    unseen += 4;
                    literal += checks;
                }
            }
        }
        P5AResult {
            worker,
            start,
            end,
            counts,
            unseen,
            literal,
            coefficient_records,
            finite_records,
            coefficient_digest: fa_sha_bytes(coefficient),
            finite_digest: fa_sha_bytes(finite),
        }
    }

    fn p5a_root_stream(results: &[P5AResult], coefficient: bool) -> String {
        let mut hash = AuditSha256::new();
        hash.update(if coefficient {
            b"e5-five-cubic-path-center-branch-coefficient-six-shard-root-v1\0"
        } else {
            b"e5-five-cubic-path-center-branch-finite-six-shard-root-v1\0"
        });
        for result in results {
            hash.update(&(result.worker as u64).to_le_bytes());
            hash.update(&(result.start as u64).to_le_bytes());
            hash.update(&(result.end as u64).to_le_bytes());
            if coefficient {
                hash.update(&result.coefficient_records.to_le_bytes());
                hash.update(&result.coefficient_digest);
            } else {
                hash.update(&result.finite_records.to_le_bytes());
                hash.update(&result.finite_digest);
            }
        }
        hash.hex()
    }

    fn p5a_full() {
        let halves = Arc::new(fa_long_table());
        assert_eq!(halves.len(), 12_544);
        let unordered_pairs = (halves.len() as u64) * ((halves.len() + 1) as u64) / 2;
        assert_eq!(unordered_pairs, 78_682_240);
        let mut handles = Vec::new();
        for worker in 0..P5A_THREADS {
            let table = Arc::clone(&halves);
            handles.push(thread::spawn(move || p5a_worker(worker, table)));
        }
        let mut results: Vec<P5AResult> = handles
            .into_iter()
            .map(|handle| handle.join().expect("path-center audit worker panic"))
            .collect();
        results.sort_by_key(|result| result.worker);
        for (worker, result) in results.iter().enumerate() {
            assert_eq!(result.worker, worker);
            assert_eq!(result.start, P5A_BOUNDS[worker]);
            assert_eq!(result.end, P5A_BOUNDS[worker + 1]);
            if worker > 0 { assert_eq!(results[worker - 1].end, result.start); }
        }
        assert_eq!(results.first().unwrap().start, 0);
        assert_eq!(results.last().unwrap().end, halves.len());
        let mut counts = [0_u64; 5];
        let mut unseen = 0_u64;
        let mut literal = 0_u64;
        for result in &results {
            for index in 0..5 { counts[index] += result.counts[index]; }
            unseen += result.unseen;
            literal += result.literal;
        }
        assert_eq!(counts, [114_373_350, 113_140_669, 436_402_329, 1, 436_402_330]);
        assert_eq!(unseen, 1_745_609_320);
        assert_eq!(literal, 1_422_347_659);
        assert_eq!(results.iter().map(|result| result.coefficient_records).sum::<u64>(), counts[4]);
        assert_eq!(results.iter().map(|result| result.finite_records).sum::<u64>(), counts[1]);
        let coefficient_stream = p5a_root_stream(&results, true);
        let finite_stream = p5a_root_stream(&results, false);
        let raw = format!(
            concat!(
                "PASS_INDEPENDENT_LITERAL_I256_E5_FIVE_CUBIC_PATH_CENTER_BRANCH\n",
                "COUNTS {} {} {} {} {}\n",
                "UNSEEN {}\n",
                "LITERAL_TREES {}\n",
                "LITERAL_RAY_POINTS 0 13 29\n",
                "COEFFICIENT_MERKLE_STREAM {}\n",
                "FINITE_MERKLE_STREAM {}\n"
            ),
            counts[0], counts[1], counts[2], counts[3], counts[4], unseen,
            literal, coefficient_stream, finite_stream,
        );
        std::fs::write(
            "rank8_delta03_e5_five_cubic_path_center_branch_literal_i256_raw_agent_20260825.txt",
            raw.as_bytes(),
        ).expect("path-center audit raw write");
        print!("{}", raw);
    }

    pub fn run_path_audit() {
        audit_sha_self_test();
        match std::env::args().nth(1).as_deref() {
            Some("smoke") => { p5a_independent_smoke(); p5a_smoke_stream(); }
            Some(value) => panic!("unknown mode {}", value),
            None => p5a_full(),
        }
    }
}

fn main() {
    engine::run_path_audit();
}
