// Independent checked-i256 literal audit for five_cubic_path:inner_leaf.

mod engine {
    include!("audit_rank8_delta03_e5_five_cubic_t_center_branch_literal_i256_agent.rs");

    const P5ILA_THREADS: usize = 6;
    const P5ILA_BOUNDS: [usize; 7] = [0, 2_620, 5_059, 7_478, 9_890, 12_297, 14_336];

    #[derive(Clone, Copy)]
    struct P5ILALocal {
        center_middle: FACoord,
        root_link: FACoord,
        middle_outer: FACoord,
        outer_low: FACoord,
        outer_high: FACoord,
    }

    #[derive(Clone, Copy)]
    struct P5ILAFixed {
        moving_group: usize,
        local: [i32; 5],
        remote: FAMessage,
        center_leaf: i32,
    }

    fn p5ila_locals() -> Vec<P5ILALocal> {
        let mut out = Vec::with_capacity(14_336);
        for outer_low in 1..=7_i32 {
            for outer_high in outer_low..=7_i32 {
                for middle_outer in 1..=8_i32 {
                    for root_link in 1..=8_i32 {
                        for center_middle in 1..=8_i32 {
                            out.push(P5ILALocal {
                                center_middle: fa_link(center_middle),
                                root_link: fa_link(root_link),
                                middle_outer: fa_link(middle_outer),
                                outer_low: fa_leaf(outer_low),
                                outer_high: fa_leaf(outer_high),
                            });
                        }
                    }
                }
            }
        }
        assert_eq!(out.len(), 14_336);
        out
    }

    fn p5ila_local_lengths(local: P5ILALocal) -> [i32; 5] {
        [
            local.center_middle.value,
            local.root_link.value,
            local.middle_outer.value,
            local.outer_low.value,
            local.outer_high.value,
        ]
    }

    fn p5ila_root_polynomials(
        local: [i32; 5],
        remote: FAMessage,
        center_leaf: i32,
    ) -> (V, V) {
        let outer = fa_outer_message(local[2], local[3], local[4]);
        let center_absent = mul(&remote.parent_absent, &path(center_leaf));
        let center_present = shifted(
            &mul(&remote.parent_present, &path(center_leaf - 1)),
            1,
        );
        let center = fa_send(center_absent, center_present, local[0]);
        let inner_absent = mul(&outer.parent_absent, &center.parent_absent);
        let inner_present = shifted(
            &mul(&outer.parent_present, &center.parent_present),
            1,
        );
        let message = fa_send(inner_absent, inner_present, local[1]);
        (
            add(&message.parent_absent, &shifted(&message.parent_present, 1)),
            message.parent_absent,
        )
    }

    fn p5ila_coords(local: P5ILALocal, remote: FALongArm, center_leaf: i32) -> [FACoord; 11] {
        [
            local.center_middle,
            local.root_link,
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

    fn p5ila_values(lengths: &[i32; 11]) -> [Z; 4] {
        let (whole, deleted) = p5ila_root_polynomials(
            [lengths[0], lengths[1], lengths[2], lengths[3], lengths[4]],
            fa_long_message(lengths[5], lengths[6], lengths[7], lengths[8], lengths[9]),
            lengths[10],
        );
        deltas03(&whole, &deleted)
    }

    fn p5ila_fixed(
        local: P5ILALocal,
        remote: FALongArm,
        center_leaf: i32,
        varying: usize,
    ) -> P5ILAFixed {
        P5ILAFixed {
            moving_group: match varying {
                0..=4 => 0,
                5..=9 => 1,
                10 => 2,
                _ => unreachable!(),
            },
            local: p5ila_local_lengths(local),
            remote: remote.message,
            center_leaf,
        }
    }

    fn p5ila_values_with_fixed(lengths: &[i32; 11], fixed: P5ILAFixed) -> [Z; 4] {
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
        let (whole, deleted) = p5ila_root_polynomials(local, remote, center_leaf);
        deltas03(&whole, &deleted)
    }

    fn p5ila_tree(lengths: &[i32; 11]) -> (Vec<Vec<usize>>, usize) {
        let root = 0_usize;
        let mut adjacency = vec![Vec::new()];
        let local_inner = fa_extend(&mut adjacency, root, lengths[1]);
        let local_outer = fa_extend(&mut adjacency, local_inner, lengths[2]);
        fa_extend(&mut adjacency, local_outer, lengths[3]);
        fa_extend(&mut adjacency, local_outer, lengths[4]);
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

    fn p5ila_literal_values(lengths: &[i32; 11]) -> [Z; 4] {
        let (adjacency, root) = p5ila_tree(lengths);
        audit_deltas(&adjacency, root).0
    }

    fn p5ila_independent_smoke() {
        let mut random = 0x47D2_9B60_AE15_F38C_u64;
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
                p5ila_values(&lengths),
                p5ila_literal_values(&lengths),
                "independent path-inner-leaf direct mismatch {}",
                sample,
            );
        }
        let locals = p5ila_locals();
        let remotes = fa_long_table();
        for sample in 0..512_usize {
            random ^= random >> 12;
            random ^= random << 25;
            random ^= random >> 27;
            random = random.wrapping_mul(0x2545F4914F6CDD1D);
            let local = locals[random as usize % locals.len()];
            random ^= random >> 12;
            random ^= random << 25;
            random ^= random >> 27;
            random = random.wrapping_mul(0x2545F4914F6CDD1D);
            let remote = remotes[random as usize % remotes.len()];
            let center_leaf = 1 + (random % 7) as i32;
            let coords = p5ila_coords(local, remote, center_leaf);
            let mut lengths = fa_lengths(&coords);
            let varying = random as usize % 11;
            lengths[varying] += (random % 19) as i32;
            let fixed = p5ila_fixed(local, remote, center_leaf, varying);
            assert_eq!(
                p5ila_values_with_fixed(&lengths, fixed),
                p5ila_literal_values(&lengths),
                "independent path-inner-leaf cache mismatch {}",
                sample,
            );
        }
        println!("PASS_E5_FIVE_CUBIC_PATH_INNER_LEAF_INDEPENDENT_1024_LITERAL_SMOKE");
    }

    fn p5ila_coefficient_leaf(
        coords: &[FACoord; 11],
        baseline: i32,
        shift: i32,
        rows: &[[Z; AUDIT_SAMPLES]; 4],
    ) -> [u8; 32] {
        let mut hash = AuditSha256::new();
        hash.update(b"e5-five-cubic-path-inner-leaf-coefficient-v1\0");
        for &coord in coords { fa_hash_coord(&mut hash, coord); }
        hash.update(&baseline.to_le_bytes());
        hash.update(&shift.to_le_bytes());
        for row in rows { for &value in row { fa_hash_z(&mut hash, value); } }
        fa_sha_bytes(hash)
    }

    fn p5ila_finite_leaf(coords: &[FACoord; 11], order: i32, values: &[Z; 4]) -> [u8; 32] {
        let mut hash = AuditSha256::new();
        hash.update(b"e5-five-cubic-path-inner-leaf-finite-v1\0");
        for &coord in coords { fa_hash_coord(&mut hash, coord); }
        hash.update(&order.to_le_bytes());
        for &value in values { fa_hash_z(&mut hash, value); }
        fa_sha_bytes(hash)
    }

    fn p5ila_formula_coefficients(
        coords: &[FACoord; 11],
        local: P5ILALocal,
        remote: FALongArm,
        center_leaf: i32,
        literal: bool,
    ) -> (i32, i32, [[Z; AUDIT_SAMPLES]; 4], u64) {
        let varying = coords.iter().position(|coord| coord.infinite).expect("ray expected");
        let fixed = p5ila_fixed(local, remote, center_leaf, varying);
        let mut lengths = fa_lengths(coords);
        let baseline = 1 + lengths.iter().sum::<i32>();
        let shift = (28 - baseline).max(0);
        let initial = lengths[varying];
        let mut samples = [[Z::zero(); AUDIT_SAMPLES]; 4];
        let mut checks = 0_u64;
        for point in 0..AUDIT_SAMPLES {
            lengths[varying] = initial + shift + point as i32;
            let values = p5ila_values_with_fixed(&lengths, fixed);
            if literal && (point == 0 || point == 13) {
                assert_eq!(values, p5ila_literal_values(&lengths));
                checks += 1;
            }
            for rank in 0..4 { samples[rank][point] = values[rank]; }
        }
        let rows: [[Z; AUDIT_SAMPLES]; 4] =
            std::array::from_fn(|rank| audit_differences(&samples[rank]));
        assert!(fa_degree_ok(&rows));
        lengths[varying] = initial + shift + AUDIT_SAMPLES as i32;
        let unseen = p5ila_values_with_fixed(&lengths, fixed);
        if literal {
            assert_eq!(unseen, p5ila_literal_values(&lengths));
            checks += 1;
        }
        for rank in 0..4 { assert_eq!(unseen[rank], audit_newton_at_29(&rows[rank])); }
        (baseline, shift, rows, checks)
    }

    fn p5ila_literal_coefficients(
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
            let values = p5ila_literal_values(&lengths);
            for rank in 0..4 { samples[rank][point] = values[rank]; }
        }
        let rows: [[Z; AUDIT_SAMPLES]; 4] =
            std::array::from_fn(|rank| audit_differences(&samples[rank]));
        assert!(fa_degree_ok(&rows));
        lengths[varying] = initial + shift + AUDIT_SAMPLES as i32;
        let unseen = p5ila_literal_values(&lengths);
        for rank in 0..4 { assert_eq!(unseen[rank], audit_newton_at_29(&rows[rank])); }
        (baseline, shift, rows)
    }

    fn p5ila_smoke_stream() {
        let locals = p5ila_locals();
        let remotes = fa_long_table();
        let mut coefficient = AuditSha256::new();
        let mut finite = AuditSha256::new();
        let mut finite_records = 0_u64;
        let mut ray_records = 0_u64;
        let mut gate_failures = 0_u64;
        for sample in 0..512_usize {
            let local = locals[(sample * 131 + 17) % locals.len()];
            let remote = remotes[(sample * 104_729 + 23) % remotes.len()];
            let center_leaf = 1 + ((sample * 17 + 5) % 7) as i32;
            let coords = p5ila_coords(local, remote, center_leaf);
            if !coords.iter().any(|coord| coord.infinite) {
                let lengths = fa_lengths(&coords);
                let order = 1 + lengths.iter().sum::<i32>();
                if order >= 28 {
                    let values = p5ila_literal_values(&lengths);
                    finite.update(&p5ila_finite_leaf(&coords, order, &values));
                    finite_records += 1;
                }
                continue;
            }
            let (baseline, shift, rows) = p5ila_literal_coefficients(&coords);
            if !fa_gate_ok(&rows) { gate_failures += 1; }
            coefficient.update(&p5ila_coefficient_leaf(&coords, baseline, shift, &rows));
            ray_records += 1;
        }
        println!("SMOKE_RECORDS {} {}", finite_records, ray_records);
        println!("SMOKE_GATE_FAILURES {}", gate_failures);
        println!("SMOKE_STREAM {} {}", coefficient.hex(), finite.hex());
    }

    struct P5ILAResult {
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

    fn p5ila_worker(
        worker: usize,
        locals: Arc<Vec<P5ILALocal>>,
        remotes: Arc<Vec<FALongArm>>,
    ) -> P5ILAResult {
        let start = P5ILA_BOUNDS[worker];
        let end = P5ILA_BOUNDS[worker + 1];
        let mut counts = [0_u64; 5];
        let mut unseen = 0_u64;
        let mut literal = 0_u64;
        let mut coefficient_records = 0_u64;
        let mut finite_records = 0_u64;
        let mut coefficient = AuditSha256::new();
        let mut finite = AuditSha256::new();
        for local_index in start..end {
            let local = locals[local_index];
            for remote_index in 0..remotes.len() {
                let remote = remotes[remote_index];
                for center_leaf in 1..=7_i32 {
                    let coords = p5ila_coords(local, remote, center_leaf);
                    let long_count = coords.iter().filter(|coord| coord.infinite).count();
                    if long_count == 0 {
                        counts[0] += 1;
                        let lengths = fa_lengths(&coords);
                        let order = 1 + lengths.iter().sum::<i32>();
                        if order < 28 { continue; }
                        let fast = p5ila_values(&lengths);
                        let direct = p5ila_literal_values(&lengths);
                        assert_eq!(fast, direct);
                        assert!(direct.iter().all(|value| value.is_positive()));
                        finite.update(&p5ila_finite_leaf(&coords, order, &direct));
                        finite_records += 1;
                        counts[1] += 1;
                        literal += 1;
                        continue;
                    }
                    if long_count == 11 { counts[3] += 1; } else { counts[2] += 1; }
                    let (baseline, shift, rows, checks) = p5ila_formula_coefficients(
                        &coords, local, remote, center_leaf, true,
                    );
                    audit_assert_gate(&rows);
                    coefficient.update(&p5ila_coefficient_leaf(&coords, baseline, shift, &rows));
                    coefficient_records += 1;
                    counts[4] += 1;
                    unseen += 4;
                    literal += checks;
                }
            }
        }
        P5ILAResult {
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

    fn p5ila_root_stream(results: &[P5ILAResult], coefficient: bool) -> String {
        let mut hash = AuditSha256::new();
        hash.update(if coefficient {
            b"e5-five-cubic-path-inner-leaf-coefficient-six-shard-root-v1\0"
        } else {
            b"e5-five-cubic-path-inner-leaf-finite-six-shard-root-v1\0"
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

    fn p5ila_full() {
        let locals = Arc::new(p5ila_locals());
        let remotes = Arc::new(fa_long_table());
        assert_eq!((locals.len() as u64) * (remotes.len() as u64) * 7, 1_258_815_488);
        let mut handles = Vec::new();
        for worker in 0..P5ILA_THREADS {
            let local_table = Arc::clone(&locals);
            let remote_table = Arc::clone(&remotes);
            handles.push(thread::spawn(move || p5ila_worker(worker, local_table, remote_table)));
        }
        let mut results: Vec<P5ILAResult> = handles
            .into_iter()
            .map(|handle| handle.join().expect("path-inner-leaf audit worker panic"))
            .collect();
        results.sort_by_key(|result| result.worker);
        for (worker, result) in results.iter().enumerate() {
            assert_eq!(result.worker, worker);
            assert_eq!(result.start, P5ILA_BOUNDS[worker]);
            assert_eq!(result.end, P5ILA_BOUNDS[worker + 1]);
            if worker > 0 { assert_eq!(results[worker - 1].end, result.start); }
        }
        assert_eq!(results.first().unwrap().start, 0);
        assert_eq!(results.last().unwrap().end, locals.len());
        let mut counts = [0_u64; 5];
        let mut unseen = 0_u64;
        let mut literal = 0_u64;
        for result in &results {
            for index in 0..5 { counts[index] += result.counts[index]; }
            unseen += result.unseen;
            literal += result.literal;
        }
        assert_eq!(counts, [266_827_932, 264_323_724, 991_987_555, 1, 991_987_556]);
        assert_eq!(unseen, 3_967_950_224);
        assert_eq!(literal, 3_240_286_392);
        assert_eq!(results.iter().map(|result| result.coefficient_records).sum::<u64>(), counts[4]);
        assert_eq!(results.iter().map(|result| result.finite_records).sum::<u64>(), counts[1]);
        let coefficient_stream = p5ila_root_stream(&results, true);
        let finite_stream = p5ila_root_stream(&results, false);
        let raw = format!(
            concat!(
                "PASS_INDEPENDENT_LITERAL_I256_E5_FIVE_CUBIC_PATH_INNER_LEAF\n",
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
            "rank8_delta03_e5_five_cubic_path_inner_leaf_literal_i256_raw_agent_20260825.txt",
            raw.as_bytes(),
        ).expect("path-inner-leaf audit raw write");
        print!("{}", raw);
    }

    pub fn run_path_inner_leaf_audit() {
        audit_sha_self_test();
        match std::env::args().nth(1).as_deref() {
            Some("smoke") => { p5ila_independent_smoke(); p5ila_smoke_stream(); }
            Some(value) => panic!("unknown mode {}", value),
            None => p5ila_full(),
        }
    }
}

fn main() {
    engine::run_path_inner_leaf_audit();
}
