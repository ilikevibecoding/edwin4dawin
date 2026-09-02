// Checked-i256 Delta2/Delta3 extension of the sealed literal all-root cubic
// order census.  The original source is included unchanged inside a module so
// its tree construction, canonical composition quotient, and DP are reused
// byte-for-byte; only the two additional residual differences are new.

mod engine {
    include!("verify_rank8_delta01_e3_cubic_skeleton_order_agent.rs");

    mod wide {
        include!("rank8_delta01_e3_cubic_exact_i256_core_agent.rs");
    }

    use self::wide::Z;

    fn zterm(constant: i128, factors: &[i128]) -> Z {
        let mut out = Z::from_i128(constant);
        for &factor in factors { out = out.mul_i128(factor); }
        out
    }

    fn residual_wide(core: &[i128; 9], deleted: &[i128; 9], siblings: usize) -> Z {
        let mut smooth7 = 0_i128;
        let mut smooth8 = 0_i128;
        let mut open9 = 0_i128;
        for index in 0..=7 {
            smooth7 = add_i(smooth7, scale(core[7 - index], choose_small(siblings, index)));
        }
        for index in 0..=8 {
            smooth8 = add_i(smooth8, scale(core[8 - index], choose_small(siblings, index)));
        }
        for index in 1..=9 {
            open9 = add_i(open9, scale(core[9 - index], choose_small(siblings, index)));
        }
        let p7 = add_i(smooth7, deleted[6]);
        let p8 = add_i(smooth8, deleted[7]);
        let q8 = sub_i(
            sub_i(scale(mul_i(p8, p8), 16), mul_i(p7, p8)),
            scale(mul_i(p7, open9), 18),
        );
        let core_q = sub_i(scale(mul_i(core[8], core[8]), 16), mul_i(core[7], core[8]));
        let deleted_q = sub_i(
            scale(mul_i(deleted[7], deleted[7]), 14),
            mul_i(deleted[6], deleted[7]),
        );
        zterm(8, &[core[7], deleted[6], q8])
            .sub(zterm(8, &[deleted[6], p7, core_q]))
            .sub(zterm(9, &[core[7], p7, deleted_q]))
    }

    fn delta23(core: &[i128; 9], deleted: &[i128; 9]) -> (Z, Z) {
        let r1 = residual_wide(core, deleted, 1);
        let r2 = residual_wide(core, deleted, 2);
        let r3 = residual_wide(core, deleted, 3);
        let r4 = residual_wide(core, deleted, 4);
        (
            r3.sub(r2).sub(r2).add(r1),
            r4.sub(r3).sub(r3).sub(r3).add(r2).add(r2).add(r2).sub(r1),
        )
    }

    #[derive(Default)]
    struct WideAudit {
        trees: u64,
        roots: u64,
        negative2: u64,
        negative3: u64,
        minimum2: Option<Z>,
        minimum3: Option<Z>,
        witness2_lengths: [usize; 7],
        witness3_lengths: [usize; 7],
        witness2_root: usize,
        witness3_root: usize,
        witness2_core: [i128; 9],
        witness3_core: [i128; 9],
        witness2_deleted: [i128; 9],
        witness3_deleted: [i128; 9],
    }

    impl WideAudit {
        fn check(&mut self, adjacency: &[Vec<usize>], lengths: &[usize; 7]) {
            assert_eq!(surplus(adjacency), 3);
            let order = adjacency.len();
            let mut memo = vec![None; order * order];
            let core = whole(0, adjacency, &mut memo);
            self.trees += 1;
            for root in 0..order {
                let deleted = deletion(root, adjacency, &mut memo);
                let (delta2, delta3) = delta23(&core, &deleted);
                self.roots += 1;
                if !delta2.is_positive() { self.negative2 += 1; }
                if !delta3.is_positive() { self.negative3 += 1; }
                if self.minimum2.map_or(true, |minimum| delta2.cmp(minimum).is_lt()) {
                    self.minimum2 = Some(delta2);
                    self.witness2_lengths = *lengths;
                    self.witness2_root = root;
                    self.witness2_core = core;
                    self.witness2_deleted = deleted;
                }
                if self.minimum3.map_or(true, |minimum| delta3.cmp(minimum).is_lt()) {
                    self.minimum3 = Some(delta3);
                    self.witness3_lengths = *lengths;
                    self.witness3_root = root;
                    self.witness3_core = core;
                    self.witness3_deleted = deleted;
                }
                if self.negative2 > 0 || self.negative3 > 0 {
                    panic!("nonpositive Delta2/Delta3 order={} lengths={:?} root={} d2={} d3={}",
                        order, lengths, root, delta2.decimal(), delta3.decimal());
                }
            }
        }
    }

    pub fn run(order: usize) {
        assert!(order >= 8);
        let mut audit = WideAudit::default();
        compositions(order - 1, &mut |lengths| {
            let (u, v, a1, a2, b1, b2) = (
                lengths[0], lengths[1], lengths[2], lengths[3], lengths[5], lengths[6]
            );
            if a1 > a2 || b1 > b2 || (a1, a2, u) > (b1, b2, v) { return; }
            let adjacency = subdivision(lengths);
            assert_eq!(adjacency.len(), order);
            audit.check(&adjacency, lengths);
        });
        assert!(audit.minimum2.is_some() && audit.minimum3.is_some());
        println!(
            "{{\"order\":{},\"trees\":{},\"roots\":{},\"negative2\":{},\"negative3\":{},\"minimum2\":\"{}\",\"minimum3\":\"{}\",\"witness2\":{{\"lengths\":{:?},\"root\":{},\"core\":{:?},\"deleted\":{:?}}},\"witness3\":{{\"lengths\":{:?},\"root\":{},\"core\":{:?},\"deleted\":{:?}}}}}",
            order, audit.trees, audit.roots, audit.negative2, audit.negative3,
            audit.minimum2.unwrap().decimal(), audit.minimum3.unwrap().decimal(),
            audit.witness2_lengths, audit.witness2_root,
            audit.witness2_core, audit.witness2_deleted,
            audit.witness3_lengths, audit.witness3_root,
            audit.witness3_core, audit.witness3_deleted,
        );
        assert_eq!(audit.negative2, 0);
        assert_eq!(audit.negative3, 0);
        println!("PASS_EXACT_RANK8_DELTA23_E3_CUBIC_SKELETON_ORDER_{}", order);
    }
}

fn main() {
    let args: Vec<String> = std::env::args().collect();
    let order: usize = args.get(1).expect("order argument").parse().expect("integer order");
    engine::run(order);
}
