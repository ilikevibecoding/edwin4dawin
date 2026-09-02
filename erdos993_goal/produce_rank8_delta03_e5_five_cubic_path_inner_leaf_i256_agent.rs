// Six-thread checked-i256 producer for five_cubic_path:inner_leaf.

mod engine {
    include!("produce_rank8_delta03_e5_five_cubic_t_center_branch_i256_agent.rs");

    const P5IL_THREADS: usize = 6;
    const P5IL_BOUNDS: [usize; 7] = [0, 2_620, 5_059, 7_478, 9_890, 12_297, 14_336];

    #[derive(Clone, Copy)]
    struct P5ILLocal {
        center_middle: FCTState,
        root_link: FCTState,
        middle_outer: FCTState,
        outer_low: FCTState,
        outer_high: FCTState,
    }

    #[derive(Clone, Copy)]
    struct P5ILFixed {
        moving_group: usize,
        local: [i32; 5],
        remote: FCTTransfer,
        center_pendant: i32,
    }

    fn p5il_locals() -> Vec<P5ILLocal> {
        let mut out = Vec::with_capacity(14_336);
        for outer_low in 1..=7_i32 {
            for outer_high in outer_low..=7_i32 {
                for middle_outer in 1..=8_i32 {
                    for root_link in 1..=8_i32 {
                        for center_middle in 1..=8_i32 {
                            out.push(P5ILLocal {
                                center_middle: fct_spine(center_middle),
                                root_link: fct_spine(root_link),
                                middle_outer: fct_spine(middle_outer),
                                outer_low: fct_pendant(outer_low),
                                outer_high: fct_pendant(outer_high),
                            });
                        }
                    }
                }
            }
        }
        assert_eq!(out.len(), 14_336);
        out
    }

    fn p5il_local_lengths(local: P5ILLocal) -> [i32; 5] {
        [
            local.center_middle.length,
            local.root_link.length,
            local.middle_outer.length,
            local.outer_low.length,
            local.outer_high.length,
        ]
    }

    fn p5il_root_polynomials(
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
        let inner_absent = mul(&outer.free, &center.free);
        let inner_present = shifted(&mul(&outer.blocked, &center.blocked), 1);
        let message = fct_cross(inner_absent, inner_present, local[1]);
        (
            add(&message.free, &shifted(&message.blocked, 1)),
            message.free,
        )
    }

    fn p5il_states(local: P5ILLocal, remote: FCTFar, center_pendant: i32) -> [FCTState; 11] {
        [
            local.center_middle,
            local.root_link,
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

    fn p5il_values(lengths: &[i32; 11]) -> [Z; 4] {
        let (whole, deleted) = p5il_root_polynomials(
            [lengths[0], lengths[1], lengths[2], lengths[3], lengths[4]],
            fct_far_parts(lengths[5], lengths[6], lengths[7], lengths[8], lengths[9]),
            lengths[10],
        );
        deltas03(&whole, &deleted)
    }

    fn p5il_fixed(
        local: P5ILLocal,
        remote: FCTFar,
        center_pendant: i32,
        varying: usize,
    ) -> P5ILFixed {
        P5ILFixed {
            moving_group: match varying {
                0..=4 => 0,
                5..=9 => 1,
                10 => 2,
                _ => unreachable!(),
            },
            local: p5il_local_lengths(local),
            remote: remote.at_root,
            center_pendant,
        }
    }

    fn p5il_values_with_fixed(lengths: &[i32; 11], fixed: P5ILFixed) -> [Z; 4] {
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
        let (whole, deleted) = p5il_root_polynomials(local, remote, center_pendant);
        deltas03(&whole, &deleted)
    }

    fn p5il_literal_tree(lengths: &[i32; 11]) -> (Vec<Vec<usize>>, usize) {
        let root = 0_usize;
        let mut adjacency = vec![Vec::new()];
        let local_inner = audit_attach(&mut adjacency, root, lengths[1]);
        let local_outer = audit_attach(&mut adjacency, local_inner, lengths[2]);
        audit_attach(&mut adjacency, local_outer, lengths[3]);
        audit_attach(&mut adjacency, local_outer, lengths[4]);
        let center = audit_attach(&mut adjacency, local_inner, lengths[0]);
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

    fn p5il_literal_values(lengths: &[i32; 11]) -> [Z; 4] {
        let (adjacency, root) = p5il_literal_tree(lengths);
        audit_deltas(&adjacency, root).0
    }

    fn p5il_formula_smoke() {
        let mut random = 0xBE42_6A19_D507_83FC_u64;
        for sample in 0..512_usize {
            let mut lengths = [1_i32; 11];
            for (index, length) in lengths.iter_mut().enumerate() {
                random ^= random << 7;
                random ^= random >> 9;
                random ^= random << 8;
                let modulus = if matches!(index, 0 | 1 | 2 | 5 | 7) { 23 } else { 19 };
                *length = 1 + (random % modulus) as i32;
            }
            assert_eq!(
                p5il_values(&lengths),
                p5il_literal_values(&lengths),
                "five-cubic-path inner-leaf mismatch {}",
                sample,
            );
        }
        println!("PASS_E5_FIVE_CUBIC_PATH_INNER_LEAF_PRIMARY_512_LITERAL_FORMULA_SMOKE");
    }

    fn p5il_coefficient_leaf(
        states: &[FCTState; 11],
        baseline: i32,
        shift: i32,
        rows: &[[Z; AUDIT_SAMPLES]; 4],
    ) -> [u8; 32] {
        let mut hash = AuditSha256::new();
        hash.update(b"e5-five-cubic-path-inner-leaf-coefficient-v1\0");
        for &state in states { fct_hash_state(&mut hash, state); }
        hash.update(&baseline.to_le_bytes());
        hash.update(&shift.to_le_bytes());
        for row in rows { for &value in row { fct_hash_z(&mut hash, value); } }
        fct_sha_bytes(hash)
    }

    fn p5il_finite_leaf(states: &[FCTState; 11], order: i32, values: &[Z; 4]) -> [u8; 32] {
        let mut hash = AuditSha256::new();
        hash.update(b"e5-five-cubic-path-inner-leaf-finite-v1\0");
        for &state in states { fct_hash_state(&mut hash, state); }
        hash.update(&order.to_le_bytes());
        for &value in values { fct_hash_z(&mut hash, value); }
        fct_sha_bytes(hash)
    }

    fn p5il_coefficients(
        states: &[FCTState; 11],
        local: P5ILLocal,
        remote: FCTFar,
        center_pendant: i32,
        literal_points: bool,
    ) -> (i32, i32, [[Z; AUDIT_SAMPLES]; 4], u64) {
        let varying = states.iter().position(|state| state.is_long).expect("ray expected");
        let fixed = p5il_fixed(local, remote, center_pendant, varying);
        let mut lengths = fct_lengths(states);
        let baseline = 1 + lengths.iter().sum::<i32>();
        let shift = (28 - baseline).max(0);
        let initial = lengths[varying];
        let mut samples = [[Z::zero(); AUDIT_SAMPLES]; 4];
        let mut literal_checks = 0_u64;
        for point in 0..AUDIT_SAMPLES {
            lengths[varying] = initial + shift + point as i32;
            let values = p5il_values_with_fixed(&lengths, fixed);
            if literal_points && (point == 0 || point == 13) {
                assert_eq!(values, p5il_literal_values(&lengths));
                literal_checks += 1;
            }
            for rank in 0..4 { samples[rank][point] = values[rank]; }
        }
        let rows: [[Z; AUDIT_SAMPLES]; 4] =
            std::array::from_fn(|rank| audit_differences(&samples[rank]));
        assert!(fct_degree_ok(&rows));
        lengths[varying] = initial + shift + AUDIT_SAMPLES as i32;
        let unseen = p5il_values_with_fixed(&lengths, fixed);
        if literal_points {
            assert_eq!(unseen, p5il_literal_values(&lengths));
            literal_checks += 1;
        }
        for rank in 0..4 { assert_eq!(unseen[rank], audit_newton_at_29(&rows[rank])); }
        (baseline, shift, rows, literal_checks)
    }

    fn p5il_smoke_stream() {
        let locals = p5il_locals();
        let remotes = fct_fars();
        let mut coefficient = AuditSha256::new();
        let mut finite = AuditSha256::new();
        let mut finite_records = 0_u64;
        let mut ray_records = 0_u64;
        let mut gate_failures = 0_u64;
        for sample in 0..512_usize {
            let local = locals[(sample * 131 + 17) % locals.len()];
            let remote = remotes[(sample * 104_729 + 23) % remotes.len()];
            let center_pendant = 1 + ((sample * 17 + 5) % 7) as i32;
            let states = p5il_states(local, remote, center_pendant);
            if !states.iter().any(|state| state.is_long) {
                let lengths = fct_lengths(&states);
                let order = 1 + lengths.iter().sum::<i32>();
                if order >= 28 {
                    let values = p5il_values(&lengths);
                    finite.update(&p5il_finite_leaf(&states, order, &values));
                    finite_records += 1;
                }
                continue;
            }
            let (baseline, shift, rows, _) =
                p5il_coefficients(&states, local, remote, center_pendant, false);
            if !fct_gate_ok(&rows) { gate_failures += 1; }
            coefficient.update(&p5il_coefficient_leaf(&states, baseline, shift, &rows));
            ray_records += 1;
        }
        println!("SMOKE_RECORDS {} {}", finite_records, ray_records);
        println!("SMOKE_GATE_FAILURES {}", gate_failures);
        println!("SMOKE_STREAM {} {}", coefficient.hex(), finite.hex());
    }

    struct P5ILResult {
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

    fn p5il_worker(
        worker: usize,
        locals: Arc<Vec<P5ILLocal>>,
        remotes: Arc<Vec<FCTFar>>,
    ) -> P5ILResult {
        let start = P5IL_BOUNDS[worker];
        let end = P5IL_BOUNDS[worker + 1];
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
            let local = locals[local_index];
            for remote_index in 0..remotes.len() {
                let remote = remotes[remote_index];
                for center_pendant in 1..=7_i32 {
                    let states = p5il_states(local, remote, center_pendant);
                    let long_count = states.iter().filter(|state| state.is_long).count();
                    if long_count == 0 {
                        counts[0] += 1;
                        let lengths = fct_lengths(&states);
                        let order = 1 + lengths.iter().sum::<i32>();
                        if order < 28 { continue; }
                        let values = p5il_values(&lengths);
                        assert!(values.iter().all(|value| value.is_positive()));
                        finite.update(&p5il_finite_leaf(&states, order, &values));
                        finite_records += 1;
                        if !checked_finite {
                            assert_eq!(values, p5il_literal_values(&lengths));
                            checked_finite = true;
                            literal_checks += 1;
                        }
                        counts[1] += 1;
                        continue;
                    }
                    if long_count == 11 { counts[3] += 1; } else { counts[2] += 1; }
                    let (baseline, shift, rows, checked) = p5il_coefficients(
                        &states, local, remote, center_pendant, !checked_ray,
                    );
                    audit_assert_gate(&rows);
                    if !checked_ray {
                        checked_ray = true;
                        literal_checks += checked;
                    }
                    coefficient.update(&p5il_coefficient_leaf(&states, baseline, shift, &rows));
                    coefficient_records += 1;
                    counts[4] += 1;
                    unseen += 4;
                }
            }
        }
        assert!(checked_finite && checked_ray);
        P5ILResult {
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

    fn p5il_root_stream(results: &[P5ILResult], coefficient: bool) -> String {
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

    fn p5il_full() {
        let locals = Arc::new(p5il_locals());
        let remotes = Arc::new(fct_fars());
        assert_eq!((locals.len() as u64) * (remotes.len() as u64) * 7, 1_258_815_488);
        let mut handles = Vec::new();
        for worker in 0..P5IL_THREADS {
            let local_table = Arc::clone(&locals);
            let remote_table = Arc::clone(&remotes);
            handles.push(thread::spawn(move || p5il_worker(worker, local_table, remote_table)));
        }
        let mut results: Vec<P5ILResult> = handles
            .into_iter()
            .map(|handle| handle.join().expect("path-inner-leaf worker panic"))
            .collect();
        results.sort_by_key(|result| result.worker);
        for (worker, result) in results.iter().enumerate() {
            assert_eq!(result.worker, worker);
            assert_eq!(result.start, P5IL_BOUNDS[worker]);
            assert_eq!(result.end, P5IL_BOUNDS[worker + 1]);
            if worker > 0 { assert_eq!(results[worker - 1].end, result.start); }
        }
        assert_eq!(results.first().unwrap().start, 0);
        assert_eq!(results.last().unwrap().end, locals.len());
        let mut counts = [0_u64; 5];
        let mut unseen = 0_u64;
        let mut literal_checks = 0_u64;
        for result in &results {
            for index in 0..5 { counts[index] += result.counts[index]; }
            unseen += result.unseen;
            literal_checks += result.literal_checks;
        }
        assert_eq!(counts, [266_827_932, 264_323_724, 991_987_555, 1, 991_987_556]);
        assert_eq!(unseen, 3_967_950_224);
        assert_eq!(literal_checks, 24);
        assert_eq!(results.iter().map(|result| result.coefficient_records).sum::<u64>(), counts[4]);
        assert_eq!(results.iter().map(|result| result.finite_records).sum::<u64>(), counts[1]);
        let coefficient_stream = p5il_root_stream(&results, true);
        let finite_stream = p5il_root_stream(&results, false);
        let raw = format!(
            concat!(
                "PASS_I256_E5_FIVE_CUBIC_PATH_INNER_LEAF\n",
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
            "rank8_delta03_e5_five_cubic_path_inner_leaf_i256_raw_agent_20260825.txt",
            raw.as_bytes(),
        ).expect("path-inner-leaf primary raw write");
        print!("{}", raw);
    }

    pub fn run_path_inner_leaf() {
        audit_sha_self_test();
        match std::env::args().nth(1).as_deref() {
            Some("smoke") => { p5il_formula_smoke(); p5il_smoke_stream(); }
            Some(value) => panic!("unknown mode {}", value),
            None => p5il_full(),
        }
    }
}

fn main() {
    engine::run_path_inner_leaf();
}
