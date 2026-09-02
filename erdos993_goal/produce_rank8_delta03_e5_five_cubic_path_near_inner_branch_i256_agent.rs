// Six-thread checked-i256 producer for five_cubic_path:near_inner_branch.

mod engine {
    include!("produce_rank8_delta03_e5_five_cubic_t_center_branch_i256_agent.rs");

    const P5NIB_THREADS: usize = 6;
    const P5NIB_BOUNDS: [usize; 7] = [0, 2_289, 4_422, 6_536, 8_645, 10_754, 12_544];

    #[derive(Clone, Copy)]
    struct P5NIBFixed {
        moving_group: usize,
        local: [i32; 5],
        remote: FCTTransfer,
        center_pendant: i32,
    }

    fn p5nib_local_lengths(local: FCTFar) -> [i32; 5] {
        [
            local.center_middle.length,
            local.middle_pendant.length,
            local.middle_outer.length,
            local.outer_low.length,
            local.outer_high.length,
        ]
    }

    fn p5nib_root_polynomials(
        local: [i32; 5],
        remote: FCTTransfer,
        center_pendant: i32,
    ) -> (V, V) {
        let outer = fct_arm_parts(local[2], local[3], local[4]);
        let center_absent = mul(&remote.free, &path(center_pendant));
        let center_present = shifted(
            &mul(&remote.blocked, &path(center_pendant - 1)),
            1,
        );
        let center = fct_cross(center_absent, center_present, local[0]);
        let deleted = product(&[outer.free, path(local[1]), center.free]);
        let selected = shifted(
            &product(&[outer.blocked, path(local[1] - 1), center.blocked]),
            1,
        );
        (add(&deleted, &selected), deleted)
    }

    fn p5nib_states(local: FCTFar, remote: FCTFar, center_pendant: i32) -> [FCTState; 11] {
        [
            local.center_middle,
            local.middle_pendant,
            local.middle_outer,
            local.outer_low,
            local.outer_high,
            remote.center_middle,
            remote.middle_pendant,
            remote.middle_outer,
            remote.outer_low,
            remote.outer_high,
            fct_pendant(center_pendant),
        ]
    }

    fn p5nib_values(lengths: &[i32; 11]) -> [Z; 4] {
        let (whole, deleted) = p5nib_root_polynomials(
            [lengths[0], lengths[1], lengths[2], lengths[3], lengths[4]],
            fct_far_parts(lengths[5], lengths[6], lengths[7], lengths[8], lengths[9]),
            lengths[10],
        );
        deltas03(&whole, &deleted)
    }

    fn p5nib_fixed(
        local: FCTFar,
        remote: FCTFar,
        center_pendant: i32,
        varying: usize,
    ) -> P5NIBFixed {
        P5NIBFixed {
            moving_group: match varying {
                0..=4 => 0,
                5..=9 => 1,
                10 => 2,
                _ => unreachable!(),
            },
            local: p5nib_local_lengths(local),
            remote: remote.at_root,
            center_pendant,
        }
    }

    fn p5nib_values_with_fixed(lengths: &[i32; 11], fixed: P5NIBFixed) -> [Z; 4] {
        let local = if fixed.moving_group == 0 {
            [lengths[0], lengths[1], lengths[2], lengths[3], lengths[4]]
        } else {
            fixed.local
        };
        let remote = if fixed.moving_group == 1 {
            fct_far_parts(lengths[5], lengths[6], lengths[7], lengths[8], lengths[9])
        } else {
            fixed.remote
        };
        let center_pendant = if fixed.moving_group == 2 {
            lengths[10]
        } else {
            fixed.center_pendant
        };
        let (whole, deleted) = p5nib_root_polynomials(local, remote, center_pendant);
        deltas03(&whole, &deleted)
    }

    fn p5nib_literal_tree(lengths: &[i32; 11]) -> (Vec<Vec<usize>>, usize) {
        let root = 0_usize;
        let mut adjacency = vec![Vec::new()];
        audit_attach(&mut adjacency, root, lengths[1]);
        let local_outer = audit_attach(&mut adjacency, root, lengths[2]);
        audit_attach(&mut adjacency, local_outer, lengths[3]);
        audit_attach(&mut adjacency, local_outer, lengths[4]);
        let center = audit_attach(&mut adjacency, root, lengths[0]);
        audit_attach(&mut adjacency, center, lengths[10]);
        let remote_inner = audit_attach(&mut adjacency, center, lengths[5]);
        audit_attach(&mut adjacency, remote_inner, lengths[6]);
        let remote_outer = audit_attach(&mut adjacency, remote_inner, lengths[7]);
        audit_attach(&mut adjacency, remote_outer, lengths[8]);
        audit_attach(&mut adjacency, remote_outer, lengths[9]);
        assert_eq!(adjacency.len(), 1 + lengths.iter().sum::<i32>() as usize);
        assert_eq!(adjacency.iter().map(Vec::len).sum::<usize>(), 2 * (adjacency.len() - 1));
        assert_eq!(adjacency.iter().filter(|row| row.len() == 3).count(), 5);
        (adjacency, root)
    }

    fn p5nib_literal_values(lengths: &[i32; 11]) -> [Z; 4] {
        let (adjacency, root) = p5nib_literal_tree(lengths);
        audit_deltas(&adjacency, root).0
    }

    fn p5nib_formula_smoke() {
        let mut random = 0x31F8_A46D_C920_75BE_u64;
        for sample in 0..512_usize {
            let mut lengths = [1_i32; 11];
            for (index, length) in lengths.iter_mut().enumerate() {
                random ^= random << 7;
                random ^= random >> 9;
                random ^= random << 8;
                let modulus = if matches!(index, 0 | 2 | 5 | 7) { 23 } else { 19 };
                *length = 1 + (random % modulus) as i32;
            }
            assert_eq!(
                p5nib_values(&lengths),
                p5nib_literal_values(&lengths),
                "five-cubic-path near-inner-branch mismatch {}",
                sample,
            );
        }
        println!("PASS_E5_FIVE_CUBIC_PATH_NEAR_INNER_BRANCH_PRIMARY_512_LITERAL_FORMULA_SMOKE");
    }

    fn p5nib_coefficient_leaf(
        states: &[FCTState; 11],
        baseline: i32,
        shift: i32,
        rows: &[[Z; AUDIT_SAMPLES]; 4],
    ) -> [u8; 32] {
        let mut hash = AuditSha256::new();
        hash.update(b"e5-five-cubic-path-near-inner-branch-coefficient-v1\0");
        for &state in states { fct_hash_state(&mut hash, state); }
        hash.update(&baseline.to_le_bytes());
        hash.update(&shift.to_le_bytes());
        for row in rows { for &value in row { fct_hash_z(&mut hash, value); } }
        fct_sha_bytes(hash)
    }

    fn p5nib_finite_leaf(states: &[FCTState; 11], order: i32, values: &[Z; 4]) -> [u8; 32] {
        let mut hash = AuditSha256::new();
        hash.update(b"e5-five-cubic-path-near-inner-branch-finite-v1\0");
        for &state in states { fct_hash_state(&mut hash, state); }
        hash.update(&order.to_le_bytes());
        for &value in values { fct_hash_z(&mut hash, value); }
        fct_sha_bytes(hash)
    }

    fn p5nib_coefficients(
        states: &[FCTState; 11],
        local: FCTFar,
        remote: FCTFar,
        center_pendant: i32,
        literal_points: bool,
    ) -> (i32, i32, [[Z; AUDIT_SAMPLES]; 4], u64) {
        let varying = states.iter().position(|state| state.is_long).expect("ray expected");
        let fixed = p5nib_fixed(local, remote, center_pendant, varying);
        let mut lengths = fct_lengths(states);
        let baseline = 1 + lengths.iter().sum::<i32>();
        let shift = (28 - baseline).max(0);
        let initial = lengths[varying];
        let mut samples = [[Z::zero(); AUDIT_SAMPLES]; 4];
        let mut literal_checks = 0_u64;
        for point in 0..AUDIT_SAMPLES {
            lengths[varying] = initial + shift + point as i32;
            let values = p5nib_values_with_fixed(&lengths, fixed);
            if literal_points && (point == 0 || point == 13) {
                assert_eq!(values, p5nib_literal_values(&lengths));
                literal_checks += 1;
            }
            for rank in 0..4 { samples[rank][point] = values[rank]; }
        }
        let rows: [[Z; AUDIT_SAMPLES]; 4] =
            std::array::from_fn(|rank| audit_differences(&samples[rank]));
        assert!(fct_degree_ok(&rows));
        lengths[varying] = initial + shift + AUDIT_SAMPLES as i32;
        let unseen = p5nib_values_with_fixed(&lengths, fixed);
        if literal_points {
            assert_eq!(unseen, p5nib_literal_values(&lengths));
            literal_checks += 1;
        }
        for rank in 0..4 { assert_eq!(unseen[rank], audit_newton_at_29(&rows[rank])); }
        (baseline, shift, rows, literal_checks)
    }

    fn p5nib_smoke_stream() {
        let halves = fct_fars();
        let mut coefficient = AuditSha256::new();
        let mut finite = AuditSha256::new();
        let mut finite_records = 0_u64;
        let mut ray_records = 0_u64;
        let mut gate_failures = 0_u64;
        for sample in 0..512_usize {
            let local = halves[(sample * 131 + 17) % halves.len()];
            let remote = halves[(sample * 104_729 + 23) % halves.len()];
            let center_pendant = 1 + ((sample * 17 + 5) % 7) as i32;
            let states = p5nib_states(local, remote, center_pendant);
            if !states.iter().any(|state| state.is_long) {
                let lengths = fct_lengths(&states);
                let order = 1 + lengths.iter().sum::<i32>();
                if order >= 28 {
                    let values = p5nib_values(&lengths);
                    finite.update(&p5nib_finite_leaf(&states, order, &values));
                    finite_records += 1;
                }
                continue;
            }
            let (baseline, shift, rows, _) =
                p5nib_coefficients(&states, local, remote, center_pendant, false);
            if !fct_gate_ok(&rows) { gate_failures += 1; }
            coefficient.update(&p5nib_coefficient_leaf(&states, baseline, shift, &rows));
            ray_records += 1;
        }
        println!("SMOKE_RECORDS {} {}", finite_records, ray_records);
        println!("SMOKE_GATE_FAILURES {}", gate_failures);
        println!("SMOKE_STREAM {} {}", coefficient.hex(), finite.hex());
    }

    struct P5NIBResult {
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

    fn p5nib_worker(worker: usize, halves: Arc<Vec<FCTFar>>) -> P5NIBResult {
        let start = P5NIB_BOUNDS[worker];
        let end = P5NIB_BOUNDS[worker + 1];
        let mut counts = [0_u64; 5];
        let mut unseen = 0_u64;
        let mut literal_checks = 0_u64;
        let mut coefficient_records = 0_u64;
        let mut finite_records = 0_u64;
        let mut coefficient = AuditSha256::new();
        let mut finite = AuditSha256::new();
        let mut checked_finite = false;
        let mut checked_ray = false;
        for local_index in start..end {
            let local = halves[local_index];
            for remote_index in 0..halves.len() {
                let remote = halves[remote_index];
                for center_pendant in 1..=7_i32 {
                    let states = p5nib_states(local, remote, center_pendant);
                    let long_count = states.iter().filter(|state| state.is_long).count();
                    if long_count == 0 {
                        counts[0] += 1;
                        let lengths = fct_lengths(&states);
                        let order = 1 + lengths.iter().sum::<i32>();
                        if order < 28 { continue; }
                        let values = p5nib_values(&lengths);
                        assert!(values.iter().all(|value| value.is_positive()));
                        finite.update(&p5nib_finite_leaf(&states, order, &values));
                        finite_records += 1;
                        if !checked_finite {
                            assert_eq!(values, p5nib_literal_values(&lengths));
                            checked_finite = true;
                            literal_checks += 1;
                        }
                        counts[1] += 1;
                        continue;
                    }
                    if long_count == 11 { counts[3] += 1; } else { counts[2] += 1; }
                    let (baseline, shift, rows, checked) = p5nib_coefficients(
                        &states, local, remote, center_pendant, !checked_ray,
                    );
                    audit_assert_gate(&rows);
                    if !checked_ray {
                        checked_ray = true;
                        literal_checks += checked;
                    }
                    coefficient.update(&p5nib_coefficient_leaf(&states, baseline, shift, &rows));
                    coefficient_records += 1;
                    counts[4] += 1;
                    unseen += 4;
                }
            }
        }
        assert!(checked_finite && checked_ray);
        P5NIBResult {
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

    fn p5nib_root_stream(results: &[P5NIBResult], coefficient: bool) -> String {
        let mut hash = AuditSha256::new();
        hash.update(if coefficient {
            b"e5-five-cubic-path-near-inner-branch-coefficient-six-shard-root-v1\0"
        } else {
            b"e5-five-cubic-path-near-inner-branch-finite-six-shard-root-v1\0"
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

    fn p5nib_full() {
        let halves = Arc::new(fct_fars());
        assert_eq!(halves.len(), 12_544);
        assert_eq!((halves.len() as u64).pow(2) * 7, 1_101_463_552);
        let mut handles = Vec::new();
        for worker in 0..P5NIB_THREADS {
            let table = Arc::clone(&halves);
            handles.push(thread::spawn(move || p5nib_worker(worker, table)));
        }
        let mut results: Vec<P5NIBResult> = handles
            .into_iter()
            .map(|handle| handle.join().expect("path-near-inner-branch worker panic"))
            .collect();
        results.sort_by_key(|result| result.worker);
        for (worker, result) in results.iter().enumerate() {
            assert_eq!(result.worker, worker);
            assert_eq!(result.start, P5NIB_BOUNDS[worker]);
            assert_eq!(result.end, P5NIB_BOUNDS[worker + 1]);
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
        assert_eq!(counts, [228_709_656, 226_246_180, 872_753_895, 1, 872_753_896]);
        assert_eq!(unseen, 3_491_015_584);
        assert_eq!(literal_checks, 24);
        assert_eq!(results.iter().map(|result| result.coefficient_records).sum::<u64>(), counts[4]);
        assert_eq!(results.iter().map(|result| result.finite_records).sum::<u64>(), counts[1]);
        let coefficient_stream = p5nib_root_stream(&results, true);
        let finite_stream = p5nib_root_stream(&results, false);
        let raw = format!(
            concat!(
                "PASS_I256_E5_FIVE_CUBIC_PATH_NEAR_INNER_BRANCH\n",
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
            "rank8_delta03_e5_five_cubic_path_near_inner_branch_i256_raw_agent_20260825.txt",
            raw.as_bytes(),
        ).expect("path-near-inner-branch primary raw write");
        print!("{}", raw);
    }

    pub fn run_path_near_inner_branch() {
        audit_sha_self_test();
        match std::env::args().nth(1).as_deref() {
            Some("smoke") => { p5nib_formula_smoke(); p5nib_smoke_stream(); }
            Some(value) => panic!("unknown mode {}", value),
            None => p5nib_full(),
        }
    }
}

fn main() {
    engine::run_path_near_inner_branch();
}
