// Six-thread checked-i256 producer for five_cubic_path:center_leaf.

mod engine {
    include!("produce_rank8_delta03_e5_five_cubic_t_center_branch_i256_agent.rs");

    const P5CL_THREADS: usize = 6;
    const P5CL_BENCH_RAYS: usize = 1_024;
    const P5CL_BOUNDS: [usize; 7] = [0, 1_093, 2_302, 3_675, 5_302, 7_424, 12_544];

    #[derive(Clone, Copy)]
    struct P5CLFixed {
        moving_group: usize,
        other_half: FCTTransfer,
        center_absent: V,
        center_present: V,
        root_link: i32,
    }

    fn p5cl_center(left: FCTTransfer, right: FCTTransfer) -> (V, V) {
        (
            mul(&left.free, &right.free),
            shifted(&mul(&left.blocked, &right.blocked), 1),
        )
    }

    fn p5cl_root_polynomials(center_absent: V, center_present: V, root_link: i32) -> (V, V) {
        let message = fct_cross(center_absent, center_present, root_link);
        (
            add(&message.free, &shifted(&message.blocked, 1)),
            message.free,
        )
    }

    fn p5cl_states(left: FCTFar, right: FCTFar, root_link: i32) -> [FCTState; 11] {
        [
            left.center_middle,
            left.middle_pendant,
            left.middle_outer,
            left.outer_low,
            left.outer_high,
            right.center_middle,
            right.middle_pendant,
            right.middle_outer,
            right.outer_low,
            right.outer_high,
            fct_spine(root_link),
        ]
    }

    fn p5cl_formula_polynomials(lengths: &[i32; 11]) -> (V, V) {
        let left = fct_far_parts(lengths[0], lengths[1], lengths[2], lengths[3], lengths[4]);
        let right = fct_far_parts(lengths[5], lengths[6], lengths[7], lengths[8], lengths[9]);
        let (center_absent, center_present) = p5cl_center(left, right);
        p5cl_root_polynomials(center_absent, center_present, lengths[10])
    }

    fn p5cl_fixed(left: FCTFar, right: FCTFar, root_link: i32, varying: usize) -> P5CLFixed {
        let (center_absent, center_present) = p5cl_center(left.at_root, right.at_root);
        P5CLFixed {
            moving_group: match varying {
                0..=4 => 0,
                5..=9 => 1,
                10 => 2,
                _ => unreachable!(),
            },
            other_half: if varying < 5 { right.at_root } else { left.at_root },
            center_absent,
            center_present,
            root_link,
        }
    }

    fn p5cl_values_with_fixed(lengths: &[i32; 11], fixed: P5CLFixed) -> [Z; 4] {
        let (center_absent, center_present, root_link) = match fixed.moving_group {
            0 => {
                let moving = fct_far_parts(
                    lengths[0], lengths[1], lengths[2], lengths[3], lengths[4],
                );
                let (absent, present) = p5cl_center(moving, fixed.other_half);
                (absent, present, fixed.root_link)
            }
            1 => {
                let moving = fct_far_parts(
                    lengths[5], lengths[6], lengths[7], lengths[8], lengths[9],
                );
                let (absent, present) = p5cl_center(fixed.other_half, moving);
                (absent, present, fixed.root_link)
            }
            2 => (fixed.center_absent, fixed.center_present, lengths[10]),
            _ => unreachable!(),
        };
        let (whole, deleted) = p5cl_root_polynomials(center_absent, center_present, root_link);
        deltas03(&whole, &deleted)
    }

    fn p5cl_values(lengths: &[i32; 11]) -> [Z; 4] {
        let (whole, deleted) = p5cl_formula_polynomials(lengths);
        deltas03(&whole, &deleted)
    }

    fn p5cl_literal_tree(lengths: &[i32; 11]) -> (Vec<Vec<usize>>, usize) {
        let center = 0_usize;
        let mut adjacency = vec![Vec::new()];

        let left_inner = audit_attach(&mut adjacency, center, lengths[0]);
        audit_attach(&mut adjacency, left_inner, lengths[1]);
        let left_outer = audit_attach(&mut adjacency, left_inner, lengths[2]);
        audit_attach(&mut adjacency, left_outer, lengths[3]);
        audit_attach(&mut adjacency, left_outer, lengths[4]);

        let right_inner = audit_attach(&mut adjacency, center, lengths[5]);
        audit_attach(&mut adjacency, right_inner, lengths[6]);
        let right_outer = audit_attach(&mut adjacency, right_inner, lengths[7]);
        audit_attach(&mut adjacency, right_outer, lengths[8]);
        audit_attach(&mut adjacency, right_outer, lengths[9]);

        let root = audit_attach(&mut adjacency, center, lengths[10]);
        assert_eq!(adjacency.len(), 1 + lengths.iter().sum::<i32>() as usize);
        assert_eq!(adjacency.iter().map(Vec::len).sum::<usize>(), 2 * (adjacency.len() - 1));
        assert_eq!(adjacency.iter().filter(|row| row.len() == 3).count(), 5);
        (adjacency, root)
    }

    fn p5cl_literal_values(lengths: &[i32; 11]) -> [Z; 4] {
        let (adjacency, root) = p5cl_literal_tree(lengths);
        audit_deltas(&adjacency, root).0
    }

    fn p5cl_formula_smoke() {
        let mut random = 0x9B72_1C43_E8D5_A60F_u64;
        for sample in 0..512_usize {
            let mut lengths = [1_i32; 11];
            for (index, length) in lengths.iter_mut().enumerate() {
                random ^= random << 7;
                random ^= random >> 9;
                random ^= random << 8;
                let modulus = if matches!(index, 0 | 2 | 5 | 7 | 10) { 23 } else { 19 };
                *length = 1 + (random % modulus) as i32;
            }
            assert_eq!(
                p5cl_values(&lengths),
                p5cl_literal_values(&lengths),
                "five-cubic-path center-leaf mismatch {}",
                sample,
            );
        }
        println!("PASS_E5_FIVE_CUBIC_PATH_CENTER_LEAF_PRIMARY_512_LITERAL_FORMULA_SMOKE");
    }

    fn p5cl_coefficient_leaf(
        states: &[FCTState; 11],
        baseline: i32,
        shift: i32,
        rows: &[[Z; AUDIT_SAMPLES]; 4],
    ) -> [u8; 32] {
        let mut hash = AuditSha256::new();
        hash.update(b"e5-five-cubic-path-center-leaf-coefficient-v1\0");
        for &state in states { fct_hash_state(&mut hash, state); }
        hash.update(&baseline.to_le_bytes());
        hash.update(&shift.to_le_bytes());
        for row in rows { for &value in row { fct_hash_z(&mut hash, value); } }
        fct_sha_bytes(hash)
    }

    fn p5cl_finite_leaf(states: &[FCTState; 11], order: i32, values: &[Z; 4]) -> [u8; 32] {
        let mut hash = AuditSha256::new();
        hash.update(b"e5-five-cubic-path-center-leaf-finite-v1\0");
        for &state in states { fct_hash_state(&mut hash, state); }
        hash.update(&order.to_le_bytes());
        for &value in values { fct_hash_z(&mut hash, value); }
        fct_sha_bytes(hash)
    }

    fn p5cl_coefficients(
        states: &[FCTState; 11],
        left: FCTFar,
        right: FCTFar,
        root_link: i32,
        literal_points: bool,
    ) -> (i32, i32, [[Z; AUDIT_SAMPLES]; 4], u64) {
        let varying = states.iter().position(|state| state.is_long).expect("ray expected");
        let fixed = p5cl_fixed(left, right, root_link, varying);
        let mut lengths = fct_lengths(states);
        let baseline = 1 + lengths.iter().sum::<i32>();
        let shift = (28 - baseline).max(0);
        let initial = lengths[varying];
        let mut samples = [[Z::zero(); AUDIT_SAMPLES]; 4];
        let mut literal_checks = 0_u64;
        for point in 0..AUDIT_SAMPLES {
            lengths[varying] = initial + shift + point as i32;
            let values = p5cl_values_with_fixed(&lengths, fixed);
            if literal_points && (point == 0 || point == 13) {
                assert_eq!(values, p5cl_literal_values(&lengths));
                literal_checks += 1;
            }
            for rank in 0..4 { samples[rank][point] = values[rank]; }
        }
        let rows: [[Z; AUDIT_SAMPLES]; 4] =
            std::array::from_fn(|rank| audit_differences(&samples[rank]));
        assert!(fct_degree_ok(&rows));
        lengths[varying] = initial + shift + AUDIT_SAMPLES as i32;
        let unseen = p5cl_values_with_fixed(&lengths, fixed);
        if literal_points {
            assert_eq!(unseen, p5cl_literal_values(&lengths));
            literal_checks += 1;
        }
        for rank in 0..4 { assert_eq!(unseen[rank], audit_newton_at_29(&rows[rank])); }
        (baseline, shift, rows, literal_checks)
    }

    fn p5cl_smoke_stream() {
        let halves = fct_fars();
        let mut coefficient = AuditSha256::new();
        let mut finite = AuditSha256::new();
        let mut finite_records = 0_u64;
        let mut ray_records = 0_u64;
        let mut gate_failures = 0_u64;
        for sample in 0..512_usize {
            let left_index = (sample * 131 + 17) % halves.len();
            let right_index = left_index + (sample * 104_729 + 23) % (halves.len() - left_index);
            let root_link = 1 + ((sample * 17 + 5) % 8) as i32;
            let left = halves[left_index];
            let right = halves[right_index];
            let states = p5cl_states(left, right, root_link);
            if !states.iter().any(|state| state.is_long) {
                let lengths = fct_lengths(&states);
                let order = 1 + lengths.iter().sum::<i32>();
                if order >= 28 {
                    let values = p5cl_values(&lengths);
                    finite.update(&p5cl_finite_leaf(&states, order, &values));
                    finite_records += 1;
                }
                continue;
            }
            let (baseline, shift, rows, _) =
                p5cl_coefficients(&states, left, right, root_link, false);
            if !fct_gate_ok(&rows) { gate_failures += 1; }
            coefficient.update(&p5cl_coefficient_leaf(&states, baseline, shift, &rows));
            ray_records += 1;
        }
        println!("SMOKE_RECORDS {} {}", finite_records, ray_records);
        println!("SMOKE_GATE_FAILURES {}", gate_failures);
        println!("SMOKE_STREAM {} {}", coefficient.hex(), finite.hex());
    }

    fn p5cl_bench() {
        let halves = fct_fars();
        let mut stream = AuditSha256::new();
        let mut rays = 0_usize;
        let mut candidate = 0_usize;
        while rays < P5CL_BENCH_RAYS {
            let left_index = (candidate * 131 + 5) % halves.len();
            let right_index = left_index + (candidate * 104_729 + 31) % (halves.len() - left_index);
            let root_link = 1 + ((candidate * 19 + 3) % 8) as i32;
            candidate += 1;
            let left = halves[left_index];
            let right = halves[right_index];
            let states = p5cl_states(left, right, root_link);
            if !states.iter().any(|state| state.is_long) { continue; }
            let (baseline, shift, rows, _) =
                p5cl_coefficients(&states, left, right, root_link, false);
            stream.update(&p5cl_coefficient_leaf(&states, baseline, shift, &rows));
            rays += 1;
        }
        println!("BENCH_RAYS {}", rays);
        println!("BENCH_STREAM {}", stream.hex());
        println!("RESOURCE_TABLE_BYTES {}", halves.len() * std::mem::size_of::<FCTFar>());
    }

    struct P5CLResult {
        worker: usize,
        start: usize,
        end: usize,
        counts: [u64; 5],
        unseen: u64,
        literal_checks: u64,
        coefficient_records: u64,
        finite_records: u64,
        coefficient_digest: [u8; 32],
        finite_digest: [u8; 32],
    }

    fn p5cl_worker(worker: usize, halves: Arc<Vec<FCTFar>>) -> P5CLResult {
        let start = P5CL_BOUNDS[worker];
        let end = P5CL_BOUNDS[worker + 1];
        let mut counts = [0_u64; 5];
        let mut unseen = 0_u64;
        let mut literal_checks = 0_u64;
        let mut coefficient_records = 0_u64;
        let mut finite_records = 0_u64;
        let mut coefficient = AuditSha256::new();
        let mut finite = AuditSha256::new();
        let mut checked_finite = false;
        let mut checked_ray = false;
        for left_index in start..end {
            let left = halves[left_index];
            for right_index in left_index..halves.len() {
                let right = halves[right_index];
                for root_link in 1..=8_i32 {
                    let states = p5cl_states(left, right, root_link);
                    let long_count = states.iter().filter(|state| state.is_long).count();
                    if long_count == 0 {
                        counts[0] += 1;
                        let lengths = fct_lengths(&states);
                        let order = 1 + lengths.iter().sum::<i32>();
                        if order < 28 { continue; }
                        let values = p5cl_values(&lengths);
                        assert!(values.iter().all(|value| value.is_positive()));
                        finite.update(&p5cl_finite_leaf(&states, order, &values));
                        finite_records += 1;
                        if !checked_finite {
                            assert_eq!(values, p5cl_literal_values(&lengths));
                            checked_finite = true;
                            literal_checks += 1;
                        }
                        counts[1] += 1;
                        continue;
                    }
                    if long_count == 11 { counts[3] += 1; } else { counts[2] += 1; }
                    let (baseline, shift, rows, checked) =
                        p5cl_coefficients(&states, left, right, root_link, !checked_ray);
                    audit_assert_gate(&rows);
                    if !checked_ray {
                        checked_ray = true;
                        literal_checks += checked;
                    }
                    coefficient.update(&p5cl_coefficient_leaf(&states, baseline, shift, &rows));
                    coefficient_records += 1;
                    counts[4] += 1;
                    unseen += 4;
                }
            }
        }
        assert!(checked_finite && checked_ray);
        P5CLResult {
            worker,
            start,
            end,
            counts,
            unseen,
            literal_checks,
            coefficient_records,
            finite_records,
            coefficient_digest: fct_sha_bytes(coefficient),
            finite_digest: fct_sha_bytes(finite),
        }
    }

    fn p5cl_root_stream(results: &[P5CLResult], coefficient: bool) -> String {
        let mut hash = AuditSha256::new();
        hash.update(if coefficient {
            b"e5-five-cubic-path-center-leaf-coefficient-six-shard-root-v1\0"
        } else {
            b"e5-five-cubic-path-center-leaf-finite-six-shard-root-v1\0"
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

    fn p5cl_full() {
        let halves = Arc::new(fct_fars());
        assert_eq!(halves.len(), 12_544);
        let mut handles = Vec::new();
        for worker in 0..P5CL_THREADS {
            let table = Arc::clone(&halves);
            handles.push(thread::spawn(move || p5cl_worker(worker, table)));
        }
        let mut results: Vec<P5CLResult> = handles
            .into_iter()
            .map(|handle| handle.join().expect("path-center-leaf worker panic"))
            .collect();
        results.sort_by_key(|result| result.worker);
        for (worker, result) in results.iter().enumerate() {
            assert_eq!(result.worker, worker);
            assert_eq!(result.start, P5CL_BOUNDS[worker]);
            assert_eq!(result.end, P5CL_BOUNDS[worker + 1]);
            if worker > 0 { assert_eq!(results[worker - 1].end, result.start); }
        }
        assert_eq!(results.first().unwrap().start, 0);
        assert_eq!(results.last().unwrap().end, halves.len());
        let mut counts = [0_u64; 5];
        let mut unseen = 0_u64;
        let mut literal_checks = 0_u64;
        for result in &results {
            for index in 0..5 { counts[index] += result.counts[index]; }
            unseen += result.unseen;
            literal_checks += result.literal_checks;
        }
        assert_eq!(counts, [133_435_575, 132_182_485, 496_022_344, 1, 496_022_345]);
        assert_eq!(unseen, 1_984_089_380);
        assert_eq!(literal_checks, 24);
        assert_eq!(results.iter().map(|result| result.coefficient_records).sum::<u64>(), counts[4]);
        assert_eq!(results.iter().map(|result| result.finite_records).sum::<u64>(), counts[1]);
        let coefficient_stream = p5cl_root_stream(&results, true);
        let finite_stream = p5cl_root_stream(&results, false);
        let raw = format!(
            concat!(
                "PASS_I256_E5_FIVE_CUBIC_PATH_CENTER_LEAF\n",
                "COUNTS {} {} {} {} {}\n",
                "UNSEEN {}\n",
                "LITERAL_CHECKS {}\n",
                "COEFFICIENT_MERKLE_STREAM {}\n",
                "FINITE_MERKLE_STREAM {}\n"
            ),
            counts[0], counts[1], counts[2], counts[3], counts[4], unseen,
            literal_checks, coefficient_stream, finite_stream,
        );
        std::fs::write(
            "rank8_delta03_e5_five_cubic_path_center_leaf_i256_raw_agent_20260825.txt",
            raw.as_bytes(),
        ).expect("path-center-leaf primary raw write");
        print!("{}", raw);
    }

    pub fn run_path_center_leaf() {
        audit_sha_self_test();
        match std::env::args().nth(1).as_deref() {
            Some("smoke") => { p5cl_formula_smoke(); p5cl_smoke_stream(); }
            Some("bench") => p5cl_bench(),
            Some(value) => panic!("unknown mode {}", value),
            None => p5cl_full(),
        }
    }
}

fn main() {
    engine::run_path_center_leaf();
}
