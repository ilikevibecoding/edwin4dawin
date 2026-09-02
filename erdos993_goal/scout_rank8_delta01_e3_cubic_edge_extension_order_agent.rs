// Exact finite scout of every one-edge extension of the e=3 cubic skeleton.
// The checked arithmetic and Delta implementation are included from the
// separately sealed all-root order scanner.

mod base {
    include!("verify_rank8_delta01_e3_cubic_skeleton_order_agent.rs");

    #[derive(Clone, Copy, Debug, PartialEq, Eq)]
    enum RootKey {
        Branch(usize),
        Edge(usize, usize),
    }

    impl Default for RootKey {
        fn default() -> Self {
            RootKey::Branch(0)
        }
    }

    fn subdivision_with_keys(lengths: &[usize; 7]) -> (Vec<Vec<usize>>, Vec<RootKey>) {
        let edges = [
            (0_usize, 1_usize),
            (1, 2),
            (0, 3),
            (0, 4),
            (1, 5),
            (2, 6),
            (2, 7),
        ];
        let order = 8 + lengths.iter().sum::<usize>() - 7;
        let mut adjacency = vec![Vec::new(); order];
        let mut keys = (0..8).map(RootKey::Branch).collect::<Vec<_>>();
        let mut next_vertex = 8;
        for (edge_index, ((left, right), &length)) in
            edges.iter().zip(lengths.iter()).enumerate()
        {
            let mut previous = *left;
            for step in 1..length {
                let vertex = next_vertex;
                next_vertex += 1;
                adjacency[previous].push(vertex);
                adjacency[vertex].push(previous);
                previous = vertex;
                keys.push(RootKey::Edge(edge_index, step));
            }
            adjacency[previous].push(*right);
            adjacency[*right].push(previous);
        }
        assert_eq!(next_vertex, order);
        assert_eq!(keys.len(), order);
        (adjacency, keys)
    }

    fn rooted_values(adjacency: &[Vec<usize>]) -> ([i128; 9], Vec<(i128, i128)>) {
        let order = adjacency.len();
        let mut memo = vec![None; order * order];
        let core = whole(0, adjacency, &mut memo);
        let values = (0..order)
            .map(|root| {
                let deleted = deletion(root, adjacency, &mut memo);
                deltas(&core, &deleted)
            })
            .collect();
        (core, values)
    }

    #[derive(Default)]
    struct ExtensionAudit {
        trees: u64,
        old_root_comparisons: u64,
        inserted_roots: u64,
        negative_increment0: u64,
        negative_increment1: u64,
        negative_inserted0: u64,
        negative_inserted1: u64,
        minimum_increment0: Option<i128>,
        minimum_increment1: Option<i128>,
        minimum_inserted0: Option<i128>,
        minimum_inserted1: Option<i128>,
        witness_increment0: ([usize; 7], usize, RootKey, i128, i128),
        witness_increment1: ([usize; 7], usize, RootKey, i128, i128),
        witness_inserted0: ([usize; 7], usize, i128),
        witness_inserted1: ([usize; 7], usize, i128),
    }

    impl ExtensionAudit {
        fn check(&mut self, lengths: &[usize; 7]) {
            let (old_adjacency, old_keys) = subdivision_with_keys(lengths);
            let (_, old_values) = rooted_values(&old_adjacency);
            self.trees += 1;
            for extended_edge in 0..7 {
                let mut extended = *lengths;
                let inserted_step = extended[extended_edge];
                extended[extended_edge] += 1;
                let (new_adjacency, new_keys) = subdivision_with_keys(&extended);
                let (_, new_values) = rooted_values(&new_adjacency);
                for (old_root, key) in old_keys.iter().enumerate() {
                    let new_root = new_keys.iter().position(|candidate| candidate == key).unwrap();
                    let old_value = old_values[old_root];
                    let new_value = new_values[new_root];
                    let increment0 = sub_i(new_value.0, old_value.0);
                    let increment1 = sub_i(new_value.1, old_value.1);
                    self.old_root_comparisons += 1;
                    if increment0 <= 0 {
                        self.negative_increment0 += 1;
                    }
                    if increment1 <= 0 {
                        self.negative_increment1 += 1;
                    }
                    if self.minimum_increment0.map_or(true, |value| increment0 < value) {
                        self.minimum_increment0 = Some(increment0);
                        self.witness_increment0 = (*lengths, extended_edge, *key, old_value.0, new_value.0);
                    }
                    if self.minimum_increment1.map_or(true, |value| increment1 < value) {
                        self.minimum_increment1 = Some(increment1);
                        self.witness_increment1 = (*lengths, extended_edge, *key, old_value.1, new_value.1);
                    }
                }
                let inserted_key = RootKey::Edge(extended_edge, inserted_step);
                let inserted_root = new_keys.iter().position(|candidate| *candidate == inserted_key).unwrap();
                let inserted = new_values[inserted_root];
                self.inserted_roots += 1;
                if inserted.0 <= 0 {
                    self.negative_inserted0 += 1;
                }
                if inserted.1 <= 0 {
                    self.negative_inserted1 += 1;
                }
                if self.minimum_inserted0.map_or(true, |value| inserted.0 < value) {
                    self.minimum_inserted0 = Some(inserted.0);
                    self.witness_inserted0 = (*lengths, extended_edge, inserted.0);
                }
                if self.minimum_inserted1.map_or(true, |value| inserted.1 < value) {
                    self.minimum_inserted1 = Some(inserted.1);
                    self.witness_inserted1 = (*lengths, extended_edge, inserted.1);
                }
            }
        }
    }

    fn key_json(key: RootKey) -> String {
        match key {
            RootKey::Branch(vertex) => format!("\"branch:{}\"", vertex),
            RootKey::Edge(edge, step) => format!("\"edge:{}:step:{}\"", edge, step),
        }
    }

    pub fn extension_main() {
        let args: Vec<String> = std::env::args().collect();
        let order: usize = args.get(1).expect("order argument").parse().expect("integer order");
        let mut audit = ExtensionAudit::default();
        compositions(order - 1, &mut |lengths| {
            let (u, v, a1, a2, b1, b2) = (
                lengths[0], lengths[1], lengths[2], lengths[3], lengths[5], lengths[6]
            );
            if a1 > a2 || b1 > b2 || (a1, a2, u) > (b1, b2, v) {
                return;
            }
            audit.check(lengths);
        });
        let w0 = audit.witness_increment0;
        let w1 = audit.witness_increment1;
        let i0 = audit.witness_inserted0;
        let i1 = audit.witness_inserted1;
        println!(
            "{{\"source_order\":{},\"trees\":{},\"old_root_comparisons\":{},\"inserted_roots\":{},\"negative_increment0\":{},\"negative_increment1\":{},\"negative_inserted0\":{},\"negative_inserted1\":{},\"minimum_increment0\":\"{}\",\"minimum_increment1\":\"{}\",\"minimum_inserted0\":\"{}\",\"minimum_inserted1\":\"{}\",\"witness_increment0\":{{\"lengths\":{:?},\"edge\":{},\"root\":{},\"old\":\"{}\",\"new\":\"{}\"}},\"witness_increment1\":{{\"lengths\":{:?},\"edge\":{},\"root\":{},\"old\":\"{}\",\"new\":\"{}\"}},\"witness_inserted0\":{{\"lengths\":{:?},\"edge\":{},\"value\":\"{}\"}},\"witness_inserted1\":{{\"lengths\":{:?},\"edge\":{},\"value\":\"{}\"}}}}",
            order,
            audit.trees,
            audit.old_root_comparisons,
            audit.inserted_roots,
            audit.negative_increment0,
            audit.negative_increment1,
            audit.negative_inserted0,
            audit.negative_inserted1,
            audit.minimum_increment0.unwrap(),
            audit.minimum_increment1.unwrap(),
            audit.minimum_inserted0.unwrap(),
            audit.minimum_inserted1.unwrap(),
            w0.0, w0.1, key_json(w0.2), w0.3, w0.4,
            w1.0, w1.1, key_json(w1.2), w1.3, w1.4,
            i0.0, i0.1, i0.2,
            i1.0, i1.1, i1.2,
        );
    }
}

fn main() {
    base::extension_main();
}
