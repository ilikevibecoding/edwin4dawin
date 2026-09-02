// Exact bounded subdivision audit for every B2=6 suppressed skeleton.
//
// For a requested source order n, enumerate one canonical positive edge-length
// assignment for every tree, subdivide every skeleton edge once, compare C7
// at every pre-existing root, and check the newly inserted root separately.
mod structural {
    include!("verify_rank7_rooted_cross_b2_4.rs");

    #[derive(Clone)]
    struct Skeleton {
        name: &'static str,
        capacities: Vec<usize>,
        internal_edges: Vec<(usize, usize)>,
        vertices: usize,
        edges: Vec<(usize, usize)>,
        leaf_edge_indices: Vec<Vec<usize>>,
        automorphisms: Vec<Vec<usize>>, // old branch vertex -> new branch vertex
    }

    fn next_permutation(values: &mut [usize]) -> bool {
        if values.len() < 2 { return false; }
        let mut i = values.len() - 2;
        while values[i] >= values[i + 1] {
            if i == 0 { values.reverse(); return false; }
            i -= 1;
        }
        let mut j = values.len() - 1;
        while values[j] <= values[i] { j -= 1; }
        values.swap(i, j);
        values[i + 1..].reverse();
        true
    }

    fn has_edge(edges: &[(usize, usize)], left: usize, right: usize) -> bool {
        edges.iter().any(|&(a, b)| (a == left && b == right) || (a == right && b == left))
    }

    fn make_skeleton(
        name: &'static str,
        capacities: &[usize],
        internal_edges: &[(usize, usize)],
    ) -> Skeleton {
        let branches = capacities.len();
        let mut internal_degree = vec![0usize; branches];
        for &(left, right) in internal_edges {
            internal_degree[left] += 1;
            internal_degree[right] += 1;
        }
        let mut edges = internal_edges.to_vec();
        let mut leaf_edge_indices = vec![Vec::new(); branches];
        let mut next_vertex = branches;
        for vertex in 0..branches {
            assert!(internal_degree[vertex] <= capacities[vertex]);
            for _ in 0..(capacities[vertex] - internal_degree[vertex]) {
                let edge_index = edges.len();
                edges.push((vertex, next_vertex));
                leaf_edge_indices[vertex].push(edge_index);
                next_vertex += 1;
            }
        }
        assert_eq!(edges.len() + 1, next_vertex);
        assert_eq!(capacities.iter().map(|&d| (d - 1) * (d - 2) / 2).sum::<usize>(), 6);

        let mut permutation: Vec<usize> = (0..branches).collect();
        let mut automorphisms = Vec::new();
        loop {
            let capacity_ok = (0..branches).all(|v| capacities[v] == capacities[permutation[v]]);
            let edge_ok = capacity_ok && internal_edges.iter().all(|&(left, right)| {
                has_edge(internal_edges, permutation[left], permutation[right])
            });
            if edge_ok { automorphisms.push(permutation.clone()); }
            if !next_permutation(&mut permutation) { break; }
        }
        assert!(!automorphisms.is_empty());
        Skeleton {
            name,
            capacities: capacities.to_vec(),
            internal_edges: internal_edges.to_vec(),
            vertices: next_vertex,
            edges,
            leaf_edge_indices,
            automorphisms,
        }
    }

    fn skeletons() -> Vec<Skeleton> {
        vec![
            make_skeleton("cubic_path_P6", &[3,3,3,3,3,3],
                &[(0,1),(1,2),(2,3),(3,4),(4,5)]),
            make_skeleton("cubic_double_star_33", &[3,3,3,3,3,3],
                &[(0,1),(0,2),(0,3),(1,4),(1,5)]),
            make_skeleton("cubic_arms_311", &[3,3,3,3,3,3],
                &[(0,1),(1,2),(2,3),(0,4),(0,5)]),
            make_skeleton("cubic_arms_221", &[3,3,3,3,3,3],
                &[(0,1),(1,2),(0,3),(3,4),(0,5)]),
            make_skeleton("mixed43_path_degree4_endpoint", &[4,3,3,3],
                &[(0,1),(1,2),(2,3)]),
            make_skeleton("mixed43_path_degree4_inner", &[3,4,3,3],
                &[(0,1),(1,2),(2,3)]),
            make_skeleton("mixed43_star_degree4_center", &[4,3,3,3],
                &[(0,1),(0,2),(0,3)]),
            make_skeleton("mixed43_star_degree4_leaf", &[3,4,3,3],
                &[(0,1),(0,2),(0,3)]),
            make_skeleton("double_degree4", &[4,4], &[(0,1)]),
            make_skeleton("single_degree5", &[5], &[]),
        ]
    }

    fn transformed_lengths(skeleton: &Skeleton, lengths: &[usize], permutation: &[usize]) -> Vec<usize> {
        let mut result = vec![0usize; skeleton.edges.len()];
        for (old_index, &(left, right)) in skeleton.internal_edges.iter().enumerate() {
            let new_left = permutation[left];
            let new_right = permutation[right];
            let new_index = skeleton.internal_edges.iter().position(|&(a, b)| {
                (a == new_left && b == new_right) || (a == new_right && b == new_left)
            }).unwrap();
            result[new_index] = lengths[old_index];
        }
        for old_vertex in 0..skeleton.capacities.len() {
            let new_vertex = permutation[old_vertex];
            let old_edges = &skeleton.leaf_edge_indices[old_vertex];
            let new_edges = &skeleton.leaf_edge_indices[new_vertex];
            assert_eq!(old_edges.len(), new_edges.len());
            for (&old_edge, &new_edge) in old_edges.iter().zip(new_edges) {
                result[new_edge] = lengths[old_edge];
            }
        }
        result
    }

    fn canonical(skeleton: &Skeleton, lengths: &[usize]) -> bool {
        // First quotient the freely permutable leaves at each branch.
        if skeleton.leaf_edge_indices.iter().any(|indices| {
            indices.windows(2).any(|pair| lengths[pair[0]] > lengths[pair[1]])
        }) { return false; }
        // Then choose the lexicographically least representative under every
        // color/capacity-preserving automorphism of the internal branch tree.
        for permutation in &skeleton.automorphisms {
            if transformed_lengths(skeleton, lengths, permutation).as_slice() < lengths {
                return false;
            }
        }
        true
    }

    fn c7_all(adjacency: &[Vec<usize>]) -> Vec<i128> {
        let n = adjacency.len();
        let mut memo = vec![None; n * n];
        let polynomial = whole(0, adjacency, &mut memo);
        (0..n).map(|root| {
            let deleted = deletion(root, adjacency, &mut memo);
            c7(polynomial, deleted)
        }).collect()
    }

    fn mapped_root(root: usize, vertices: usize, lengths: &[usize], edge: usize) -> usize {
        if root < vertices { return root; }
        let mut offset = vertices;
        for (index, &length) in lengths.iter().enumerate() {
            let count = length - 1;
            if root < offset + count { return if index > edge { root + 1 } else { root }; }
            offset += count;
        }
        panic!("bad old root index");
    }

    fn new_vertex(vertices: usize, lengths: &[usize], edge: usize) -> usize {
        vertices + lengths[..edge].iter().map(|value| value - 1).sum::<usize>() + lengths[edge] - 1
    }

    #[derive(Default)]
    struct FamilyAudit {
        trees: u64,
        base_roots: u64,
        comparisons: u64,
        negative_increments: u64,
        zero_increments: u64,
        nonpositive_new_roots: u64,
        base_nonpositive: u64,
        minimum_increment: i128,
        minimum_new_root: i128,
        minimum_base: i128,
        initialized: bool,
        increment_witness: (Vec<usize>, usize, usize, i128),
        new_root_witness: (Vec<usize>, usize, i128),
        base_witness: (Vec<usize>, usize, i128),
    }

    impl FamilyAudit {
        fn tree(&mut self, skeleton: &Skeleton, lengths: &[usize]) {
            let old = subdivision(skeleton.vertices, &skeleton.edges, lengths);
            assert_eq!(b2(&old), 6);
            let old_values = c7_all(&old);
            self.trees += 1;
            for (root, &value) in old_values.iter().enumerate() {
                self.base_roots += 1;
                if value <= 0 { self.base_nonpositive += 1; }
                if !self.initialized || value < self.minimum_base {
                    self.minimum_base = value;
                    self.base_witness = (lengths.to_vec(), root, value);
                }
            }
            for edge in 0..lengths.len() {
                let mut new_lengths = lengths.to_vec();
                new_lengths[edge] += 1;
                let new = subdivision(skeleton.vertices, &skeleton.edges, &new_lengths);
                assert_eq!(b2(&new), 6);
                let new_values = c7_all(&new);
                for root in 0..old.len() {
                    let mapped = mapped_root(root, skeleton.vertices, lengths, edge);
                    let difference = new_values[mapped] - old_values[root];
                    if difference < 0 { self.negative_increments += 1; }
                    if difference == 0 { self.zero_increments += 1; }
                    if !self.initialized || difference < self.minimum_increment {
                        self.minimum_increment = difference;
                        self.increment_witness = (lengths.to_vec(), edge, root, difference);
                    }
                    self.comparisons += 1;
                }
                let inserted = new_vertex(skeleton.vertices, lengths, edge);
                let inserted_value = new_values[inserted];
                if inserted_value <= 0 { self.nonpositive_new_roots += 1; }
                if !self.initialized || inserted_value < self.minimum_new_root {
                    self.minimum_new_root = inserted_value;
                    self.new_root_witness = (lengths.to_vec(), edge, inserted_value);
                }
            }
            self.initialized = true;
        }
    }

    pub fn run(order: usize) -> bool {
        let total_length = order - 1;
        let mut total_trees = 0u64;
        let mut total_base_roots = 0u64;
        let mut total_comparisons = 0u64;
        let mut total_negative = 0u64;
        let mut total_zero = 0u64;
        let mut total_new_nonpositive = 0u64;
        let mut total_base_nonpositive = 0u64;
        let all_skeletons = skeletons();
        println!("BEGIN order={order} skeletons={}", all_skeletons.len());
        for skeleton in &all_skeletons {
            let mut audit = FamilyAudit::default();
            compositions(total_length, skeleton.edges.len(), &mut |lengths| {
                if canonical(skeleton, lengths) { audit.tree(skeleton, lengths); }
            });
            assert!(audit.initialized);
            println!(
                "FAMILY order={order} name={} vertices={} edges={} automorphisms={} trees={} base_roots={} comparisons={} base_nonpositive={} negative_increments={} zero_increments={} nonpositive_new_roots={} minimum_base={} minimum_increment={} minimum_new_root={} base_witness={:?} increment_witness={:?} new_root_witness={:?}",
                skeleton.name, skeleton.vertices, skeleton.edges.len(), skeleton.automorphisms.len(),
                audit.trees, audit.base_roots, audit.comparisons, audit.base_nonpositive,
                audit.negative_increments, audit.zero_increments, audit.nonpositive_new_roots,
                audit.minimum_base, audit.minimum_increment, audit.minimum_new_root,
                audit.base_witness, audit.increment_witness, audit.new_root_witness,
            );
            total_trees += audit.trees;
            total_base_roots += audit.base_roots;
            total_comparisons += audit.comparisons;
            total_negative += audit.negative_increments;
            total_zero += audit.zero_increments;
            total_new_nonpositive += audit.nonpositive_new_roots;
            total_base_nonpositive += audit.base_nonpositive;
        }

        // Re-scan the printed family summaries is intentionally avoided; the
        // global minima are less important than the exact family witnesses.
        // The aggregate line is the machine-parsed induction gate.
        println!(
            "TOTAL order={order} trees={total_trees} base_roots={total_base_roots} comparisons={total_comparisons} base_nonpositive={total_base_nonpositive} negative_increments={total_negative} zero_increments={total_zero} nonpositive_new_roots={total_new_nonpositive}"
        );
        total_base_nonpositive == 0 && total_negative == 0 && total_new_nonpositive == 0
    }
}

fn main() {
    let arguments: Vec<String> = std::env::args().collect();
    let order = arguments.get(1).and_then(|value| value.parse().ok()).unwrap_or(25);
    let pass = structural::run(order);
    if pass {
        println!("PASS_EXACT_RANK7_ROOTED_C7_B2_6_SUBDIVISION_SOURCE_ORDER_{order}");
    } else {
        println!("STOP_EXACT_RANK7_ROOTED_C7_B2_6_SUBDIVISION_SOURCE_ORDER_{order}");
        std::process::exit(2);
    }
}
