// Independent checked-i256 literal audit for five_cubic_path:outer_branch.

mod engine {
    include!("audit_rank8_delta03_e5_five_cubic_t_center_branch_literal_i256_agent.rs");

    const P5OBA_THREADS: usize = 6;
    const P5OBA_BOUNDS: [usize; 7] = [0, 2_289, 4_422, 6_536, 8_645, 10_754, 12_544];

    #[derive(Clone, Copy)]
    struct P5OBAFixed {
        moving_group: usize,
        local: [i32; 5],
        remote: FAMessage,
        center_leaf: i32,
    }

    fn p5oba_local_lengths(local: FALongArm) -> [i32; 5] {
        [
            local.center_middle.value,
            local.middle_leaf.value,
            local.middle_outer.value,
            local.outer_low.value,
            local.outer_high.value,
        ]
    }

    fn p5oba_root_polynomials(
        local: [i32; 5],
        remote: FAMessage,
        center_leaf: i32,
    ) -> (V, V) {
        let center_absent = mul(&remote.parent_absent, &path(center_leaf));
        let center_present = shifted(
            &mul(&remote.parent_present, &path(center_leaf - 1)),
            1,
        );
        let toward_center = fa_send(center_absent, center_present, local[0]);
        let inner_absent = mul(&path(local[1]), &toward_center.parent_absent);
        let inner_present = shifted(
            &mul(&path(local[1] - 1), &toward_center.parent_present),
            1,
        );
        let inward = fa_send(inner_absent, inner_present, local[2]);
        let deleted = product(&[
            path(local[3]),
            path(local[4]),
            inward.parent_absent,
        ]);
        let selected = shifted(
            &product(&[
                path(local[3] - 1),
                path(local[4] - 1),
                inward.parent_present,
            ]),
            1,
        );
        (add(&deleted, &selected), deleted)
    }

    fn p5oba_coords(local: FALongArm, remote: FALongArm, center_leaf: i32) -> [FACoord; 11] {
        [
            local.center_middle,
            local.middle_leaf,
            local.middle_outer,
            local.outer_low,
            local.outer_high,
            remote.center_middle,
            remote.middle_leaf,
            remote.middle_outer,
            remote.outer_low,
            remote.outer_high,
            fa_leaf(center_leaf),
        ]
    }

    fn p5oba_values(lengths: &[i32; 11]) -> [Z; 4] {
        let (whole, deleted) = p5oba_root_polynomials(
            [lengths[0], lengths[1], lengths[2], lengths[3], lengths[4]],
            fa_long_message(lengths[5], lengths[6], lengths[7], lengths[8], lengths[9]),
            lengths[10],
        );
        deltas03(&whole, &deleted)
    }

    fn p5oba_fixed(
        local: FALongArm,
        remote: FALongArm,
        center_leaf: i32,
        varying: usize,
    ) -> P5OBAFixed {
        P5OBAFixed {
            moving_group: match varying {
                0..=4 => 0,
                5..=9 => 1,
                10 => 2,
                _ => unreachable!(),
            },
            local: p5oba_local_lengths(local),
            remote: remote.message,
            center_leaf,
        }
    }

    fn p5oba_values_with_fixed(lengths: &[i32; 11], fixed: P5OBAFixed) -> [Z; 4] {
        let local = if fixed.moving_group == 0 {
            [lengths[0], lengths[1], lengths[2], lengths[3], lengths[4]]
        } else {
            fixed.local
        };
        let remote = if fixed.moving_group == 1 {
            fa_long_message(lengths[5], lengths[6], lengths[7], lengths[8], lengths[9])
        } else {
            fixed.remote
        };
        let center_leaf = if fixed.moving_group == 2 {
            lengths[10]
        } else {
            fixed.center_leaf
        };
        let (whole, deleted) = p5oba_root_polynomials(local, remote, center_leaf);
        deltas03(&whole, &deleted)
    }

    fn p5oba_tree(lengths: &[i32; 11]) -> (Vec<Vec<usize>>, usize) {
        let root = 0_usize;
        let mut adjacency = vec![Vec::new()];
        fa_extend(&mut adjacency, root, lengths[3]);
        fa_extend(&mut adjacency, root, lengths[4]);
        let local_inner = fa_extend(&mut adjacency, root, lengths[2]);
        fa_extend(&mut adjacency, local_inner, lengths[1]);
        let center = fa_extend(&mut adjacency, local_inner, lengths[0]);
        fa_extend(&mut adjacency, center, lengths[10]);
        let remote_inner = fa_extend(&mut adjacency, center, lengths[5]);
        fa_extend(&mut adjacency, remote_inner, lengths[6]);
        let remote_outer = fa_extend(&mut adjacency, remote_inner, lengths[7]);
        fa_extend(&mut adjacency, remote_outer, lengths[8]);
        fa_extend(&mut adjacency, remote_outer, lengths[9]);
        assert_eq!(adjacency.len(), 1 + lengths.iter().sum::<i32>() as usize);
        assert_eq!(adjacency.iter().map(Vec::len).sum::<usize>(), 2 * (adjacency.len() - 1));
        assert_eq!(adjacency.iter().filter(|row| row.len() == 3).count(), 5);
        (adjacency, root)
    }

    fn p5oba_literal_values(lengths: &[i32; 11]) -> [Z; 4] {
        let (adjacency, root) = p5oba_tree(lengths);
        audit_deltas(&adjacency, root).0
    }

    fn p5oba_independent_smoke() {
        let mut random = 0xD370_29A5_6F1C_84EB_u64;
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
                p5oba_values(&lengths),
                p5oba_literal_values(&lengths),
                "independent path-outer-branch direct mismatch {}",
                sample,
            );
        }
        let halves = fa_long_table();
        for sample in 0..512_usize {
            random ^= random >> 12;
            random ^= random << 25;
            random ^= random >> 27;
            random = random.wrapping_mul(0x2545F4914F6CDD1D);
            let local = halves[random as usize % halves.len()];
            random ^= random >> 12;
            random ^= random << 25;
            random ^= random >> 27;
            random = random.wrapping_mul(0x2545F4914F6CDD1D);
            let remote = halves[random as usize % halves.len()];
            let center_leaf = 1 + (random % 7) as i32;
            let coords = p5oba_coords(local, remote, center_leaf);
            let mut lengths = fa_lengths(&coords);
            let varying = random as usize % 11;
            lengths[varying] += (random % 19) as i32;
            let fixed = p5oba_fixed(local, remote, center_leaf, varying);
            assert_eq!(
                p5oba_values_with_fixed(&lengths, fixed),
                p5oba_literal_values(&lengths),
                "independent path-outer-branch cache mismatch {}",
                sample,
            );
        }
        println!("PASS_E5_FIVE_CUBIC_PATH_OUTER_BRANCH_INDEPENDENT_1024_LITERAL_SMOKE");
    }

    fn p5oba_coefficient_leaf(
        coords: &[FACoord; 11],
        baseline: i32,
        shift: i32,
        rows: &[[Z; AUDIT_SAMPLES]; 4],
    ) -> [u8; 32] {
        let mut hash = AuditSha256::new();
        hash.update(b"e5-five-cubic-path-outer-branch-coefficient-v1\0");
        for &coord in coords { fa_hash_coord(&mut hash, coord); }
        hash.update(&baseline.to_le_bytes());
        hash.update(&shift.to_le_bytes());
        for row in rows { for &value in row { fa_hash_z(&mut hash, value); } }
        fa_sha_bytes(hash)
    }

    fn p5oba_finite_leaf(coords: &[FACoord; 11], order: i32, values: &[Z; 4]) -> [u8; 32] {
        let mut hash = AuditSha256::new();
        hash.update(b"e5-five-cubic-path-outer-branch-finite-v1\0");
        for &coord in coords { fa_hash_coord(&mut hash, coord); }
        hash.update(&order.to_le_bytes());
        for &value in values { fa_hash_z(&mut hash, value); }
        fa_sha_bytes(hash)
    }

    fn p5oba_formula_coefficients(
        coords: &[FACoord; 11],
        local: FALongArm,
        remote: FALongArm,
        center_leaf: i32,
        literal: bool,
    ) -> (i32, i32, [[Z; AUDIT_SAMPLES]; 4], u64) {
        let varying = coords.iter().position(|coord| coord.infinite).expect("ray expected");
        let fixed = p5oba_fixed(local, remote, center_leaf, varying);
        let mut lengths = fa_lengths(coords);
        let baseline = 1 + lengths.iter().sum::<i32>();
        let shift = (28 - baseline).max(0);
        let initial = lengths[varying];
        let mut samples = [[Z::zero(); AUDIT_SAMPLES]; 4];
        let mut checks = 0_u64;
        for point in 0..AUDIT_SAMPLES {
            lengths[varying] = initial + shift + point as i32;
            let values = p5oba_values_with_fixed(&lengths, fixed);
            if literal && (point == 0 || point == 13) {
                assert_eq!(values, p5oba_literal_values(&lengths));
                checks += 1;
            }
            for rank in 0..4 { samples[rank][point] = values[rank]; }
        }
        let rows: [[Z; AUDIT_SAMPLES]; 4] =
            std::array::from_fn(|rank| audit_differences(&samples[rank]));
        assert!(fa_degree_ok(&rows));
        lengths[varying] = initial + shift + AUDIT_SAMPLES as i32;
        let unseen = p5oba_values_with_fixed(&lengths, fixed);
        if literal {
            assert_eq!(unseen, p5oba_literal_values(&lengths));
            checks += 1;
        }
        for rank in 0..4 { assert_eq!(unseen[rank], audit_newton_at_29(&rows[rank])); }
        (baseline, shift, rows, checks)
    }

    fn p5oba_literal_coefficients(
        coords: &[FACoord; 11],
    ) -> (i32, i32, [[Z; AUDIT_SAMPLES]; 4]) {
        let varying = coords.iter().position(|coord| coord.infinite).expect("ray expected");
        let mut lengths = fa_lengths(coords);
        let baseline = 1 + lengths.iter().sum::<i32>();
        let shift = (28 - baseline).max(0);
        let initial = lengths[varying];
        let mut samples = [[Z::zero(); AUDIT_SAMPLES]; 4];
        for point in 0..AUDIT_SAMPLES {
            lengths[varying] = initial + shift + point as i32;
            let values = p5oba_literal_values(&lengths);
            for rank in 0..4 { samples[rank][point] = values[rank]; }
        }
        let rows: [[Z; AUDIT_SAMPLES]; 4] =
            std::array::from_fn(|rank| audit_differences(&samples[rank]));
        assert!(fa_degree_ok(&rows));
        lengths[varying] = initial + shift + AUDIT_SAMPLES as i32;
        let unseen = p5oba_literal_values(&lengths);
        for rank in 0..4 { assert_eq!(unseen[rank], audit_newton_at_29(&rows[rank])); }
        (baseline, shift, rows)
    }

    fn p5oba_smoke_stream() {
        let halves = fa_long_table();
        let mut coefficient = AuditSha256::new();
        let mut finite = AuditSha256::new();
        let mut finite_records = 0_u64;
        let mut ray_records = 0_u64;
        let mut gate_failures = 0_u64;
        for sample in 0..512_usize {
            let local = halves[(sample * 131 + 17) % halves.len()];
            let remote = halves[(sample * 104_729 + 23) % halves.len()];
            let center_leaf = 1 + ((sample * 17 + 5) % 7) as i32;
            let coords = p5oba_coords(local, remote, center_leaf);
            if !coords.iter().any(|coord| coord.infinite) {
                let lengths = fa_lengths(&coords);
                let order = 1 + lengths.iter().sum::<i32>();
                if order >= 28 {
                    let values = p5oba_literal_values(&lengths);
                    finite.update(&p5oba_finite_leaf(&coords, order, &values));
                    finite_records += 1;
                }
                continue;
            }
            let (baseline, shift, rows) = p5oba_literal_coefficients(&coords);
            if !fa_gate_ok(&rows) { gate_failures += 1; }
            coefficient.update(&p5oba_coefficient_leaf(&coords, baseline, shift, &rows));
            ray_records += 1;
        }
        println!("SMOKE_RECORDS {} {}", finite_records, ray_records);
        println!("SMOKE_GATE_FAILURES {}", gate_failures);
        println!("SMOKE_STREAM {} {}", coefficient.hex(), finite.hex());
    }

    struct P5OBAResult {
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

    fn p5oba_worker(worker: usize, halves: Arc<Vec<FALongArm>>) -> P5OBAResult {
        let start = P5OBA_BOUNDS[worker];
        let end = P5OBA_BOUNDS[worker + 1];
        let mut counts = [0_u64; 5];
        let mut unseen = 0_u64;
        let mut literal = 0_u64;
        let mut coefficient_records = 0_u64;
        let mut finite_records = 0_u64;
        let mut coefficient = AuditSha256::new();
        let mut finite = AuditSha256::new();
        for local_index in start..end {
            let local = halves[local_index];
            for remote_index in 0..halves.len() {
                let remote = halves[remote_index];
                for center_leaf in 1..=7_i32 {
                    let coords = p5oba_coords(local, remote, center_leaf);
                    let long_count = coords.iter().filter(|coord| coord.infinite).count();
                    if long_count == 0 {
                        counts[0] += 1;
                        let lengths = fa_lengths(&coords);
                        let order = 1 + lengths.iter().sum::<i32>();
                        if order < 28 { continue; }
                        let fast = p5oba_values(&lengths);
                        let direct = p5oba_literal_values(&lengths);
                        assert_eq!(fast, direct);
                        assert!(direct.iter().all(|value| value.is_positive()));
                        finite.update(&p5oba_finite_leaf(&coords, order, &direct));
                        finite_records += 1;
                        counts[1] += 1;
                        literal += 1;
                        continue;
                    }
                    if long_count == 11 { counts[3] += 1; } else { counts[2] += 1; }
                    let (baseline, shift, rows, checks) = p5oba_formula_coefficients(
                        &coords, local, remote, center_leaf, true,
                    );
                    audit_assert_gate(&rows);
                    coefficient.update(&p5oba_coefficient_leaf(&coords, baseline, shift, &rows));
                    coefficient_records += 1;
                    counts[4] += 1;
                    unseen += 4;
                    literal += checks;
                }
            }
        }
        P5OBAResult {
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

    fn p5oba_root_stream(results: &[P5OBAResult], coefficient: bool) -> String {
        let mut hash = AuditSha256::new();
        hash.update(if coefficient {
            b"e5-five-cubic-path-outer-branch-coefficient-six-shard-root-v1\0"
        } else {
            b"e5-five-cubic-path-outer-branch-finite-six-shard-root-v1\0"
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

    fn p5oba_full() {
        let halves = Arc::new(fa_long_table());
        assert_eq!(halves.len(), 12_544);
        assert_eq!((halves.len() as u64).pow(2) * 7, 1_101_463_552);
        let mut handles = Vec::new();
        for worker in 0..P5OBA_THREADS {
            let table = Arc::clone(&halves);
            handles.push(thread::spawn(move || p5oba_worker(worker, table)));
        }
        let mut results: Vec<P5OBAResult> = handles
            .into_iter()
            .map(|handle| handle.join().expect("path-outer-branch audit worker panic"))
            .collect();
        results.sort_by_key(|result| result.worker);
        for (worker, result) in results.iter().enumerate() {
            assert_eq!(result.worker, worker);
            assert_eq!(result.start, P5OBA_BOUNDS[worker]);
            assert_eq!(result.end, P5OBA_BOUNDS[worker + 1]);
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
        assert_eq!(counts, [228_709_656, 226_246_180, 872_753_895, 1, 872_753_896]);
        assert_eq!(unseen, 3_491_015_584);
        assert_eq!(literal, 2_844_507_868);
        assert_eq!(results.iter().map(|result| result.coefficient_records).sum::<u64>(), counts[4]);
        assert_eq!(results.iter().map(|result| result.finite_records).sum::<u64>(), counts[1]);
        let coefficient_stream = p5oba_root_stream(&results, true);
        let finite_stream = p5oba_root_stream(&results, false);
        let raw = format!(
            concat!(
                "PASS_INDEPENDENT_LITERAL_I256_E5_FIVE_CUBIC_PATH_OUTER_BRANCH\n",
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
            "rank8_delta03_e5_five_cubic_path_outer_branch_literal_i256_raw_agent_20260825.txt",
            raw.as_bytes(),
        ).expect("path-outer-branch audit raw write");
        print!("{}", raw);
    }

    pub fn run_path_outer_branch_audit() {
        audit_sha_self_test();
        match std::env::args().nth(1).as_deref() {
            Some("smoke") => { p5oba_independent_smoke(); p5oba_smoke_stream(); }
            Some(value) => panic!("unknown mode {}", value),
            None => p5oba_full(),
        }
    }
}

fn main() {
    engine::run_path_outer_branch_audit();
}
