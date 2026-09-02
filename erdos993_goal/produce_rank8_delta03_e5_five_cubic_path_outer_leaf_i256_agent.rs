// Six-thread checked-i256 producer for five_cubic_path:outer_leaf.

mod engine {
    include!("produce_rank8_delta03_e5_five_cubic_t_center_branch_i256_agent.rs");

    const P5OL_THREADS: usize = 6;
    const P5OL_BOUNDS: [usize; 7] = [0, 4_422, 8_819, 13_213, 17_566, 21_747, 25_088];

    #[derive(Clone, Copy)]
    struct P5OLLocal {
        center_middle: FCTState,
        middle_pendant: FCTState,
        middle_outer: FCTState,
        root_link: FCTState,
        other_pendant: FCTState,
    }

    #[derive(Clone, Copy)]
    struct P5OLFixed {
        moving_group: usize,
        local: [i32; 5],
        remote: FCTTransfer,
        center_pendant: i32,
    }

    fn p5ol_locals() -> Vec<P5OLLocal> {
        let mut out = Vec::with_capacity(25_088);
        for other_pendant in 1..=7_i32 {
            for root_link in 1..=8_i32 {
                for middle_outer in 1..=8_i32 {
                    for middle_pendant in 1..=7_i32 {
                        for center_middle in 1..=8_i32 {
                            out.push(P5OLLocal {
                                center_middle: fct_spine(center_middle),
                                middle_pendant: fct_pendant(middle_pendant),
                                middle_outer: fct_spine(middle_outer),
                                root_link: fct_spine(root_link),
                                other_pendant: fct_pendant(other_pendant),
                            });
                        }
                    }
                }
            }
        }
        assert_eq!(out.len(), 25_088);
        out
    }

    fn p5ol_local_lengths(local: P5OLLocal) -> [i32; 5] {
        [
            local.center_middle.length,
            local.middle_pendant.length,
            local.middle_outer.length,
            local.root_link.length,
            local.other_pendant.length,
        ]
    }

    fn p5ol_root_polynomials(
        local: [i32; 5],
        remote: FCTTransfer,
        center_pendant: i32,
    ) -> (V, V) {
        let center_absent = mul(&remote.free, &path(center_pendant));
        let center_present = shifted(
            &mul(&remote.blocked, &path(center_pendant - 1)),
            1,
        );
        let toward_center = fct_cross(center_absent, center_present, local[0]);
        let inner_absent = mul(&path(local[1]), &toward_center.free);
        let inner_present = shifted(
            &mul(&path(local[1] - 1), &toward_center.blocked),
            1,
        );
        let inward = fct_cross(inner_absent, inner_present, local[2]);
        let outer_absent = mul(&path(local[4]), &inward.free);
        let outer_present = shifted(&mul(&path(local[4] - 1), &inward.blocked), 1);
        let message = fct_cross(outer_absent, outer_present, local[3]);
        (
            add(&message.free, &shifted(&message.blocked, 1)),
            message.free,
        )
    }

    fn p5ol_states(local: P5OLLocal, remote: FCTFar, center_pendant: i32) -> [FCTState; 11] {
        [
            local.center_middle,
            local.middle_pendant,
            local.middle_outer,
            local.root_link,
            local.other_pendant,
            remote.center_middle,
            remote.middle_pendant,
            remote.middle_outer,
            remote.outer_low,
            remote.outer_high,
            fct_pendant(center_pendant),
        ]
    }

    fn p5ol_values(lengths: &[i32; 11]) -> [Z; 4] {
        let (whole, deleted) = p5ol_root_polynomials(
            [lengths[0], lengths[1], lengths[2], lengths[3], lengths[4]],
            fct_far_parts(lengths[5], lengths[6], lengths[7], lengths[8], lengths[9]),
            lengths[10],
        );
        deltas03(&whole, &deleted)
    }

    fn p5ol_fixed(
        local: P5OLLocal,
        remote: FCTFar,
        center_pendant: i32,
        varying: usize,
    ) -> P5OLFixed {
        P5OLFixed {
            moving_group: match varying {
                0..=4 => 0,
                5..=9 => 1,
                10 => 2,
                _ => unreachable!(),
            },
            local: p5ol_local_lengths(local),
            remote: remote.at_root,
            center_pendant,
        }
    }

    fn p5ol_values_with_fixed(lengths: &[i32; 11], fixed: P5OLFixed) -> [Z; 4] {
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
        let (whole, deleted) = p5ol_root_polynomials(local, remote, center_pendant);
        deltas03(&whole, &deleted)
    }

    fn p5ol_literal_tree(lengths: &[i32; 11]) -> (Vec<Vec<usize>>, usize) {
        let root = 0_usize;
        let mut adjacency = vec![Vec::new()];
        let local_outer = audit_attach(&mut adjacency, root, lengths[3]);
        audit_attach(&mut adjacency, local_outer, lengths[4]);
        let local_inner = audit_attach(&mut adjacency, local_outer, lengths[2]);
        audit_attach(&mut adjacency, local_inner, lengths[1]);
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

    fn p5ol_literal_values(lengths: &[i32; 11]) -> [Z; 4] {
        let (adjacency, root) = p5ol_literal_tree(lengths);
        audit_deltas(&adjacency, root).0
    }

    fn p5ol_formula_smoke() {
        let mut random = 0x18C7_F4A2_5D90_BE63_u64;
        for sample in 0..512_usize {
            let mut lengths = [1_i32; 11];
            for (index, length) in lengths.iter_mut().enumerate() {
                random ^= random << 7;
                random ^= random >> 9;
                random ^= random << 8;
                let modulus = if matches!(index, 0 | 2 | 3 | 5 | 7) { 23 } else { 19 };
                *length = 1 + (random % modulus) as i32;
            }
            assert_eq!(
                p5ol_values(&lengths),
                p5ol_literal_values(&lengths),
                "five-cubic-path outer-leaf mismatch {}",
                sample,
            );
        }
        println!("PASS_E5_FIVE_CUBIC_PATH_OUTER_LEAF_PRIMARY_512_LITERAL_FORMULA_SMOKE");
    }

    fn p5ol_coefficient_leaf(
        states: &[FCTState; 11],
        baseline: i32,
        shift: i32,
        rows: &[[Z; AUDIT_SAMPLES]; 4],
    ) -> [u8; 32] {
        let mut hash = AuditSha256::new();
        hash.update(b"e5-five-cubic-path-outer-leaf-coefficient-v1\0");
        for &state in states { fct_hash_state(&mut hash, state); }
        hash.update(&baseline.to_le_bytes());
        hash.update(&shift.to_le_bytes());
        for row in rows { for &value in row { fct_hash_z(&mut hash, value); } }
        fct_sha_bytes(hash)
    }

    fn p5ol_finite_leaf(states: &[FCTState; 11], order: i32, values: &[Z; 4]) -> [u8; 32] {
        let mut hash = AuditSha256::new();
        hash.update(b"e5-five-cubic-path-outer-leaf-finite-v1\0");
        for &state in states { fct_hash_state(&mut hash, state); }
        hash.update(&order.to_le_bytes());
        for &value in values { fct_hash_z(&mut hash, value); }
        fct_sha_bytes(hash)
    }

    fn p5ol_coefficients(
        states: &[FCTState; 11],
        local: P5OLLocal,
        remote: FCTFar,
        center_pendant: i32,
        literal_points: bool,
    ) -> (i32, i32, [[Z; AUDIT_SAMPLES]; 4], u64) {
        let varying = states.iter().position(|state| state.is_long).expect("ray expected");
        let fixed = p5ol_fixed(local, remote, center_pendant, varying);
        let mut lengths = fct_lengths(states);
        let baseline = 1 + lengths.iter().sum::<i32>();
        let shift = (28 - baseline).max(0);
        let initial = lengths[varying];
        let mut samples = [[Z::zero(); AUDIT_SAMPLES]; 4];
        let mut literal_checks = 0_u64;
        for point in 0..AUDIT_SAMPLES {
            lengths[varying] = initial + shift + point as i32;
            let values = p5ol_values_with_fixed(&lengths, fixed);
            if literal_points && (point == 0 || point == 13) {
                assert_eq!(values, p5ol_literal_values(&lengths));
                literal_checks += 1;
            }
            for rank in 0..4 { samples[rank][point] = values[rank]; }
        }
        let rows: [[Z; AUDIT_SAMPLES]; 4] =
            std::array::from_fn(|rank| audit_differences(&samples[rank]));
        assert!(fct_degree_ok(&rows));
        lengths[varying] = initial + shift + AUDIT_SAMPLES as i32;
        let unseen = p5ol_values_with_fixed(&lengths, fixed);
        if literal_points {
            assert_eq!(unseen, p5ol_literal_values(&lengths));
            literal_checks += 1;
        }
        for rank in 0..4 { assert_eq!(unseen[rank], audit_newton_at_29(&rows[rank])); }
        (baseline, shift, rows, literal_checks)
    }

    fn p5ol_smoke_stream() {
        let locals = p5ol_locals();
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
            let states = p5ol_states(local, remote, center_pendant);
            if !states.iter().any(|state| state.is_long) {
                let lengths = fct_lengths(&states);
                let order = 1 + lengths.iter().sum::<i32>();
                if order >= 28 {
                    let values = p5ol_values(&lengths);
                    finite.update(&p5ol_finite_leaf(&states, order, &values));
                    finite_records += 1;
                }
                continue;
            }
            let (baseline, shift, rows, _) =
                p5ol_coefficients(&states, local, remote, center_pendant, false);
            if !fct_gate_ok(&rows) { gate_failures += 1; }
            coefficient.update(&p5ol_coefficient_leaf(&states, baseline, shift, &rows));
            ray_records += 1;
        }
        println!("SMOKE_RECORDS {} {}", finite_records, ray_records);
        println!("SMOKE_GATE_FAILURES {}", gate_failures);
        println!("SMOKE_STREAM {} {}", coefficient.hex(), finite.hex());
    }

    struct P5OLResult {
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

    fn p5ol_worker(
        worker: usize,
        locals: Arc<Vec<P5OLLocal>>,
        remotes: Arc<Vec<FCTFar>>,
    ) -> P5OLResult {
        let start = P5OL_BOUNDS[worker];
        let end = P5OL_BOUNDS[worker + 1];
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
                    let states = p5ol_states(local, remote, center_pendant);
                    let long_count = states.iter().filter(|state| state.is_long).count();
                    if long_count == 0 {
                        counts[0] += 1;
                        let lengths = fct_lengths(&states);
                        let order = 1 + lengths.iter().sum::<i32>();
                        if order < 28 { continue; }
                        let values = p5ol_values(&lengths);
                        assert!(values.iter().all(|value| value.is_positive()));
                        finite.update(&p5ol_finite_leaf(&states, order, &values));
                        finite_records += 1;
                        if !checked_finite {
                            assert_eq!(values, p5ol_literal_values(&lengths));
                            checked_finite = true;
                            literal_checks += 1;
                        }
                        counts[1] += 1;
                        continue;
                    }
                    if long_count == 11 { counts[3] += 1; } else { counts[2] += 1; }
                    let (baseline, shift, rows, checked) = p5ol_coefficients(
                        &states, local, remote, center_pendant, !checked_ray,
                    );
                    audit_assert_gate(&rows);
                    if !checked_ray {
                        checked_ray = true;
                        literal_checks += checked;
                    }
                    coefficient.update(&p5ol_coefficient_leaf(&states, baseline, shift, &rows));
                    coefficient_records += 1;
                    counts[4] += 1;
                    unseen += 4;
                }
            }
        }
        assert!(checked_finite && checked_ray);
        P5OLResult {
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

    fn p5ol_root_stream(results: &[P5OLResult], coefficient: bool) -> String {
        let mut hash = AuditSha256::new();
        hash.update(if coefficient {
            b"e5-five-cubic-path-outer-leaf-coefficient-six-shard-root-v1\0"
        } else {
            b"e5-five-cubic-path-outer-leaf-finite-six-shard-root-v1\0"
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

    fn p5ol_full() {
        let locals = Arc::new(p5ol_locals());
        let remotes = Arc::new(fct_fars());
        assert_eq!((locals.len() as u64) * (remotes.len() as u64) * 7, 2_202_927_104);
        let mut handles = Vec::new();
        for worker in 0..P5OL_THREADS {
            let local_table = Arc::clone(&locals);
            let remote_table = Arc::clone(&remotes);
            handles.push(thread::spawn(move || p5ol_worker(worker, local_table, remote_table)));
        }
        let mut results: Vec<P5OLResult> = handles
            .into_iter()
            .map(|handle| handle.join().expect("path-outer-leaf worker panic"))
            .collect();
        results.sort_by_key(|result| result.worker);
        for (worker, result) in results.iter().enumerate() {
            assert_eq!(result.worker, worker);
            assert_eq!(result.start, P5OL_BOUNDS[worker]);
            assert_eq!(result.end, P5OL_BOUNDS[worker + 1]);
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
        assert_eq!(counts, [457_419_312, 453_426_133, 1_745_507_791, 1, 1_745_507_792]);
        assert_eq!(unseen, 6_982_031_168);
        assert_eq!(literal_checks, 24);
        assert_eq!(results.iter().map(|result| result.coefficient_records).sum::<u64>(), counts[4]);
        assert_eq!(results.iter().map(|result| result.finite_records).sum::<u64>(), counts[1]);
        let coefficient_stream = p5ol_root_stream(&results, true);
        let finite_stream = p5ol_root_stream(&results, false);
        let raw = format!(
            concat!(
                "PASS_I256_E5_FIVE_CUBIC_PATH_OUTER_LEAF\n",
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
            "rank8_delta03_e5_five_cubic_path_outer_leaf_i256_raw_agent_20260825.txt",
            raw.as_bytes(),
        ).expect("path-outer-leaf primary raw write");
        print!("{}", raw);
    }

    pub fn run_path_outer_leaf() {
        audit_sha_self_test();
        match std::env::args().nth(1).as_deref() {
            Some("smoke") => { p5ol_formula_smoke(); p5ol_smoke_stream(); }
            Some(value) => panic!("unknown mode {}", value),
            None => p5ol_full(),
        }
    }
}

fn main() {
    engine::run_path_outer_leaf();
}
