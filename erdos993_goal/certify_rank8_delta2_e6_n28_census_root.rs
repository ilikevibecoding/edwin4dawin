// Exact exhaustive Delta2 census for all rooted order-28 trees with
// degree surplus e=6.  Suppressed skeletons and their complete edge
// automorphism groups are generated and pinned separately.

include!("rank8_delta03_e4_literal_i256_audit_common_agent.rs");
include!("rank8_delta2_e6_n28_skeleton_data_root.rs");

use std::env;
use std::fs;
use std::path::Path;
use std::time::Instant;

const ORDER: usize = 28;
const EDGE_LENGTH_SUM: usize = 27;

#[derive(Clone, Copy)]
struct FixedTree {
    adjacency: [[u8; 5]; ORDER],
    degree: [u8; ORDER],
}

impl FixedTree {
    fn new() -> FixedTree {
        FixedTree { adjacency: [[0; 5]; ORDER], degree: [0; ORDER] }
    }

    fn add_edge(&mut self, left: usize, right: usize) {
        assert!(left < ORDER && right < ORDER && left != right);
        let dl = self.degree[left] as usize;
        let dr = self.degree[right] as usize;
        assert!(dl < 5 && dr < 5);
        self.adjacency[left][dl] = right as u8;
        self.adjacency[right][dr] = left as u8;
        self.degree[left] += 1;
        self.degree[right] += 1;
    }

    fn neighbors(&self, vertex: usize) -> &[u8] {
        &self.adjacency[vertex][..self.degree[vertex] as usize]
    }
}

#[derive(Clone)]
struct Witness {
    delta2: i128,
    lengths: [u8; 13],
    width: usize,
    root: usize,
    c7: i128,
    c8: i128,
    h6: i128,
    h7: i128,
}

struct CensusResult {
    index: usize,
    name: &'static str,
    raw_compositions: u64,
    canonical_trees: u64,
    marked_raw_compositions: u64,
    rooted_evaluations: u64,
    minimum: Witness,
    maximum_delta2: i128,
    sum_delta2: i128,
    stream_sha256: String,
    elapsed_seconds: f64,
}

fn checked_binomial(n: usize, k: usize) -> u64 {
    if k > n { return 0; }
    let k = k.min(n - k);
    let mut out = 1_u64;
    for j in 0..k {
        out = out.checked_mul((n - j) as u64).expect("binomial overflow")
            / (j + 1) as u64;
    }
    out
}

fn composition_rank(lengths: &[u8], total: usize) -> u64 {
    let mut rank = 0_u64;
    let mut remaining = total;
    let mut parts_left = lengths.len();
    for &raw in &lengths[..lengths.len() - 1] {
        let value = raw as usize;
        assert!(value >= 1 && value <= remaining - (parts_left - 1));
        rank = rank.checked_add(
            checked_binomial(remaining - 1, parts_left - 1)
                - checked_binomial(remaining - value, parts_left - 1)
        ).expect("composition rank overflow");
        remaining -= value;
        parts_left -= 1;
    }
    assert_eq!(remaining, lengths[lengths.len() - 1] as usize);
    rank
}

fn bit_get(bits: &[u64], index: u64) -> bool {
    bits[(index / 64) as usize] & (1_u64 << (index % 64)) != 0
}

fn bit_set(bits: &mut [u64], index: u64) -> bool {
    let word = &mut bits[(index / 64) as usize];
    let mask = 1_u64 << (index % 64);
    let fresh = *word & mask == 0;
    *word |= mask;
    fresh
}

fn subdivide(skeleton: &E6SkeletonData, lengths: &[u8]) -> FixedTree {
    assert_eq!(skeleton.edges.len(), lengths.len());
    assert_eq!(lengths.iter().map(|&x| x as usize).sum::<usize>(), EDGE_LENGTH_SUM);
    let mut tree = FixedTree::new();
    let mut next_vertex = skeleton.skeleton_order;
    for (edge_index, &(left, right)) in skeleton.edges.iter().enumerate() {
        let length = lengths[edge_index] as usize;
        assert!(length >= 1);
        let mut previous = left;
        for step in 1..=length {
            let current = if step == length {
                right
            } else {
                let value = next_vertex;
                next_vertex += 1;
                value
            };
            tree.add_edge(previous, current);
            previous = current;
        }
    }
    assert_eq!(next_vertex, ORDER);
    assert_eq!(tree.degree.iter().map(|&x| x as usize).sum::<usize>(), 2 * (ORDER - 1));
    let surplus: usize = tree.degree.iter().map(|&degree| {
        let x = degree.saturating_sub(1) as usize;
        x.saturating_mul(x.saturating_sub(1)) / 2
    }).sum();
    assert_eq!(surplus, 6);
    tree
}

fn rooted_polynomials(tree: &FixedTree) -> (V, [V; ORDER]) {
    let mut parent = [usize::MAX; ORDER];
    let mut traversal = [0_usize; ORDER];
    let mut count = 1_usize;
    traversal[0] = 0;
    for position in 0..ORDER {
        let vertex = traversal[position];
        for &raw_neighbor in tree.neighbors(vertex) {
            let neighbor = raw_neighbor as usize;
            if neighbor == parent[vertex] { continue; }
            assert_eq!(parent[neighbor], usize::MAX, "tree traversal cycle");
            parent[neighbor] = vertex;
            traversal[count] = neighbor;
            count += 1;
        }
    }
    assert_eq!(count, ORDER);

    // up_a[v], up_f[v] are the absent and total polynomials of the
    // component on v's side of the edge v-parent[v].
    let mut up_a = [[0_i128; 9]; ORDER];
    let mut up_f = [[0_i128; 9]; ORDER];
    for position in (0..ORDER).rev() {
        let vertex = traversal[position];
        let mut absent = one();
        let mut present_base = one();
        for &raw_neighbor in tree.neighbors(vertex) {
            let neighbor = raw_neighbor as usize;
            if parent[neighbor] == vertex {
                absent = mul(&absent, &up_f[neighbor]);
                present_base = mul(&present_base, &up_a[neighbor]);
            }
        }
        up_a[vertex] = absent;
        up_f[vertex] = add(&absent, &shifted(&present_base, 1));
    }
    let whole = up_f[0];
    assert_eq!(whole[0], 1);
    assert_eq!(whole[1], ORDER as i128);
    assert_eq!(whole[2], checked_binomial(ORDER - 1, 2) as i128);

    // down_a[v], down_f[v] are the corresponding message from the
    // parent side into v.  The maximum degree is five, so rebuilding the
    // product with one neighbor omitted is a small fixed amount of work.
    let mut down_a = [[0_i128; 9]; ORDER];
    let mut down_f = [[0_i128; 9]; ORDER];
    for position in 0..ORDER {
        let vertex = traversal[position];
        for &raw_child in tree.neighbors(vertex) {
            let child = raw_child as usize;
            if parent[child] != vertex { continue; }
            let mut absent = one();
            let mut present_base = one();
            if vertex != 0 {
                absent = mul(&absent, &down_f[vertex]);
                present_base = mul(&present_base, &down_a[vertex]);
            }
            for &raw_sibling in tree.neighbors(vertex) {
                let sibling = raw_sibling as usize;
                if sibling == child || parent[sibling] != vertex { continue; }
                absent = mul(&absent, &up_f[sibling]);
                present_base = mul(&present_base, &up_a[sibling]);
            }
            down_a[child] = absent;
            down_f[child] = add(&absent, &shifted(&present_base, 1));
        }
    }

    let mut deleted = [[0_i128; 9]; ORDER];
    for vertex in 0..ORDER {
        let mut forest = one();
        if vertex != 0 { forest = mul(&forest, &down_f[vertex]); }
        for &raw_neighbor in tree.neighbors(vertex) {
            let neighbor = raw_neighbor as usize;
            if parent[neighbor] == vertex { forest = mul(&forest, &up_f[neighbor]); }
        }
        assert_eq!(forest[0], 1);
        assert_eq!(forest[1], (ORDER - 1) as i128);
        deleted[vertex] = forest;
    }
    (whole, deleted)
}

fn residual_i128(c: &V, h: &V, siblings: usize) -> i128 {
    let mut p7 = h[6];
    let mut p8 = h[7];
    let mut open9 = 0_i128;
    for j in 0..=7 { p7 = ai(p7, mi(c[7-j], choose_small(siblings, j))); }
    for j in 0..=8 { p8 = ai(p8, mi(c[8-j], choose_small(siblings, j))); }
    for j in 1..=9 { open9 = ai(open9, mi(c[9-j], choose_small(siblings, j))); }
    let q8 = si(si(mi(16, mi(p8, p8)), mi(p7, p8)), mi(18, mi(p7, open9)));
    let cq = si(mi(16, mi(c[8], c[8])), mi(c[7], c[8]));
    let hq = si(mi(14, mi(h[7], h[7])), mi(h[6], h[7]));
    si(
        si(mi(8, mi(c[7], mi(h[6], q8))), mi(8, mi(h[6], mi(p7, cq)))),
        mi(9, mi(c[7], mi(p7, hq))),
    )
}

fn delta2_i128(c: &V, h: &V) -> i128 {
    let r1 = residual_i128(c, h, 1);
    let r2 = residual_i128(c, h, 2);
    let r3 = residual_i128(c, h, 3);
    ai(si(r3, mi(2, r2)), r1)
}

fn update_stream(hash: &mut AuditSha256, index: usize, lengths: &[u8], values: &[i128; ORDER]) {
    let mut row = [0_u8; 512];
    let mut used = 0_usize;
    row[used] = index as u8;
    used += 1;
    row[used] = lengths.len() as u8;
    used += 1;
    row[used..used + lengths.len()].copy_from_slice(lengths);
    used += lengths.len();
    for &value in values {
        row[used..used + 16].copy_from_slice(&value.to_le_bytes());
        used += 16;
    }
    hash.update(&row[..used]);
}

struct SkeletonCensus<'a> {
    index: usize,
    skeleton: &'a E6SkeletonData,
    visited: Vec<u64>,
    raw_seen: u64,
    canonical_seen: u64,
    marked: u64,
    rooted: u64,
    minimum: Option<Witness>,
    maximum: Option<i128>,
    sum: i128,
    stream: AuditSha256,
    limit: Option<u64>,
    started: Instant,
}

impl<'a> SkeletonCensus<'a> {
    fn evaluate(&mut self, lengths: &[u8]) {
        let rank = composition_rank(lengths, EDGE_LENGTH_SUM);
        assert_eq!(rank, self.raw_seen, "composition enumeration/rank mismatch");
        self.raw_seen += 1;
        if bit_get(&self.visited, rank) { return; }
        if let Some(limit) = self.limit {
            if self.canonical_seen >= limit { return; }
        }

        let width = lengths.len();
        assert_eq!(self.skeleton.edge_permutations.len() % width, 0);
        let mut transformed = [0_u8; 13];
        let mut orbit_size = 0_u64;
        for permutation in self.skeleton.edge_permutations.chunks_exact(width) {
            transformed[..width].fill(0);
            for source in 0..width {
                transformed[permutation[source] as usize] = lengths[source];
            }
            let image_rank = composition_rank(&transformed[..width], EDGE_LENGTH_SUM);
            if bit_set(&mut self.visited, image_rank) { orbit_size += 1; }
        }
        assert!(orbit_size >= 1);
        assert!(bit_get(&self.visited, rank));
        self.marked += orbit_size;
        self.canonical_seen += 1;

        let tree = subdivide(self.skeleton, lengths);
        let (c, deleted) = rooted_polynomials(&tree);
        let mut values = [0_i128; ORDER];
        for root in 0..ORDER {
            let delta = delta2_i128(&c, &deleted[root]);
            assert!(delta > 0, "nonpositive Delta2 at skeleton {} root {} lengths {:?}: {}",
                    self.index, root, lengths, delta);
            // Periodically replay the generic signed-i256 implementation.
            if (self.canonical_seen.wrapping_mul(131) + root as u64) % 1_000_003 == 0 {
                let exact = deltas03(&c, &deleted[root])[2];
                assert_eq!(exact, Z::from_i128(delta));
            }
            values[root] = delta;
            self.sum = ai(self.sum, delta);
            self.rooted += 1;
            let replace = self.minimum.as_ref().map_or(true, |old| delta < old.delta2);
            if replace {
                let mut saved = [0_u8; 13];
                saved[..width].copy_from_slice(lengths);
                self.minimum = Some(Witness {
                    delta2: delta, lengths: saved, width, root,
                    c7: c[7], c8: c[8], h6: deleted[root][6], h7: deleted[root][7],
                });
            }
            if self.maximum.map_or(true, |old| delta > old) { self.maximum = Some(delta); }
        }
        update_stream(&mut self.stream, self.index, lengths, &values);
        if self.canonical_seen % 100_000 == 0 {
            eprintln!(
                "PROGRESS skeleton={} canonical={} rooted={} seconds={:.1}",
                self.index, self.canonical_seen, self.rooted, self.started.elapsed().as_secs_f64()
            );
        }
    }
}

fn enumerate_recursive(census: &mut SkeletonCensus, lengths: &mut [u8; 13],
                       position: usize, width: usize, remaining: usize) {
    if position + 1 == width {
        assert!((1..=u8::MAX as usize).contains(&remaining));
        lengths[position] = remaining as u8;
        census.evaluate(&lengths[..width]);
        return;
    }
    let max_value = remaining - (width - position - 1);
    for value in 1..=max_value {
        lengths[position] = value as u8;
        enumerate_recursive(census, lengths, position + 1, width, remaining - value);
    }
}

fn run_skeleton(index: usize, limit: Option<u64>) -> CensusResult {
    let skeleton = &E6_SKELETONS[index - 1];
    let raw = skeleton.raw_compositions;
    assert_eq!(raw, checked_binomial(26, skeleton.edges.len() - 1));
    let mut census = SkeletonCensus {
        index,
        skeleton,
        visited: vec![0_u64; ((raw + 63) / 64) as usize],
        raw_seen: 0,
        canonical_seen: 0,
        marked: 0,
        rooted: 0,
        minimum: None,
        maximum: None,
        sum: 0,
        stream: AuditSha256::new(),
        limit,
        started: Instant::now(),
    };
    let mut lengths = [0_u8; 13];
    enumerate_recursive(
        &mut census, &mut lengths, 0, skeleton.edges.len(), EDGE_LENGTH_SUM
    );
    assert_eq!(census.raw_seen, raw);
    if limit.is_none() {
        assert_eq!(census.marked, raw);
        assert_eq!(census.canonical_seen, skeleton.canonical_orbits);
        assert_eq!(census.rooted, 28 * skeleton.canonical_orbits);
    }
    CensusResult {
        index,
        name: skeleton.name,
        raw_compositions: raw,
        canonical_trees: census.canonical_seen,
        marked_raw_compositions: census.marked,
        rooted_evaluations: census.rooted,
        minimum: census.minimum.expect("empty census"),
        maximum_delta2: census.maximum.expect("empty census"),
        sum_delta2: census.sum,
        stream_sha256: census.stream.hex(),
        elapsed_seconds: census.started.elapsed().as_secs_f64(),
    }
}

fn file_sha256(path: &str) -> String {
    let bytes = fs::read(path).expect("read hash input");
    let mut hash = AuditSha256::new();
    hash.update(&bytes);
    hash.hex()
}

fn lengths_json(witness: &Witness) -> String {
    let values: Vec<String> = witness.lengths[..witness.width]
        .iter().map(|value| value.to_string()).collect();
    format!("[{}]", values.join(","))
}

fn result_json(result: &CensusResult) -> String {
    format!(
        concat!(
            "{{\n",
            "      \"index\": {},\n",
            "      \"name\": \"{}\",\n",
            "      \"raw_compositions\": {},\n",
            "      \"canonical_trees\": {},\n",
            "      \"marked_raw_compositions\": {},\n",
            "      \"rooted_evaluations\": {},\n",
            "      \"minimum_delta2\": \"{}\",\n",
            "      \"maximum_delta2\": \"{}\",\n",
            "      \"sum_delta2\": \"{}\",\n",
            "      \"minimum_witness\": {{\"edge_lengths\": {}, \"root_vertex\": {}, ",
            "\"c7\": {}, \"c8\": {}, \"h6\": {}, \"h7\": {}}},\n",
            "      \"delta2_stream_sha256\": \"{}\",\n",
            "      \"elapsed_seconds\": {:.6}\n",
            "    }}"
        ),
        result.index, result.name, result.raw_compositions, result.canonical_trees,
        result.marked_raw_compositions, result.rooted_evaluations,
        result.minimum.delta2, result.maximum_delta2, result.sum_delta2,
        lengths_json(&result.minimum), result.minimum.root,
        result.minimum.c7, result.minimum.c8, result.minimum.h6, result.minimum.h7,
        result.stream_sha256, result.elapsed_seconds,
    )
}

fn main() {
    audit_sha_self_test();
    let arguments: Vec<String> = env::args().collect();
    let mut only: Option<usize> = None;
    let mut limit: Option<u64> = None;
    let mut position = 1;
    while position < arguments.len() {
        match arguments[position].as_str() {
            "--only" => {
                position += 1;
                only = Some(arguments[position].parse().expect("--only value"));
            },
            "--limit" => {
                position += 1;
                limit = Some(arguments[position].parse().expect("--limit value"));
            },
            other => panic!("unknown argument {}", other),
        }
        position += 1;
    }
    if let Some(index) = only { assert!((1..=10).contains(&index)); }
    if limit.is_some() { assert!(only.is_some(), "--limit requires --only"); }

    let selected: Vec<usize> = only.map_or_else(|| (1..=10).collect(), |x| vec![x]);
    let overall = Instant::now();
    let mut results = Vec::new();
    for index in selected {
        eprintln!("START skeleton={}", index);
        let result = run_skeleton(index, limit);
        eprintln!(
            "DONE skeleton={} canonical={} rooted={} minimum={} seconds={:.1}",
            index, result.canonical_trees, result.rooted_evaluations,
            result.minimum.delta2, result.elapsed_seconds
        );
        results.push(result);
    }

    if only.is_some() || limit.is_some() {
        println!("PASS_EXACT_E6_N28_DELTA2_CENSUS_SCOUT");
        for result in &results { println!("{}", result_json(result)); }
        return;
    }

    let total_raw: u64 = results.iter().map(|row| row.raw_compositions).sum();
    let total_canonical: u64 = results.iter().map(|row| row.canonical_trees).sum();
    let total_rooted: u64 = results.iter().map(|row| row.rooted_evaluations).sum();
    let total_sum = results.iter().fold(0_i128, |acc, row| ai(acc, row.sum_delta2));
    let minimum = results.iter().min_by_key(|row| row.minimum.delta2).unwrap();
    assert_eq!(total_raw, 51_374_180);
    assert_eq!(total_canonical, 6_361_943);
    assert_eq!(total_rooted, 178_134_404);
    assert!(minimum.minimum.delta2 > 0);

    let rows = results.iter().map(result_json).collect::<Vec<_>>().join(",\n");
    let source_hash = file_sha256("certify_rank8_delta2_e6_n28_census_root.rs");
    let data_hash = file_sha256("rank8_delta2_e6_n28_skeleton_data_root.rs");
    let core_hash = file_sha256("rank8_delta01_e3_cubic_exact_i256_core_agent.rs");
    let delta_hash = file_sha256("rank8_delta03_e3_cubic_exact_i256_core_root.rs");
    let common_hash = file_sha256("rank8_delta03_e4_literal_i256_audit_common_agent.rs");
    let data_report_hash = file_sha256("rank8_delta2_e6_n28_skeleton_data_root_20260826.json");
    let report = format!(
        concat!(
            "{{\n",
            "  \"schema\": \"rank8-delta2-e6-n28-census-root-v1\",\n",
            "  \"status\": \"PASS_EXACT_RANK8_DELTA2_E6_N28_ALL_ROOTED_TREES\",\n",
            "  \"theorem\": \"Delta2 R_1(A,q)>0 for every root q of every order-28 tree A with degree surplus e=6.\",\n",
            "  \"coverage\": {{\"suppressed_skeletons\": 10, \"raw_subdivision_vectors\": {}, ",
            "\"canonical_subdivision_trees\": {}, \"rooted_evaluations\": {}}},\n",
            "  \"skeletons\": [\n{}\n  ],\n",
            "  \"global_minimum\": {{\"delta2\": \"{}\", \"skeleton_index\": {}, ",
            "\"edge_lengths\": {}, \"root_vertex\": {}}},\n",
            "  \"sum_delta2\": \"{}\",\n",
            "  \"arithmetic\": \"checked signed i128, with periodic equality replays through the pinned signed-i256 residual core\",\n",
            "  \"proof_of_exhaustion\": \"Every raw positive edge-length composition is marked by exactly one processed automorphism orbit; every processed tree evaluates all 28 vertices as roots.\",\n",
            "  \"immutable_inputs\": {{\n",
            "    \"rank8_delta2_e6_n28_skeleton_data_root.rs\": \"{}\",\n",
            "    \"rank8_delta2_e6_n28_skeleton_data_root_20260826.json\": \"{}\",\n",
            "    \"rank8_delta01_e3_cubic_exact_i256_core_agent.rs\": \"{}\",\n",
            "    \"rank8_delta03_e3_cubic_exact_i256_core_root.rs\": \"{}\",\n",
            "    \"rank8_delta03_e4_literal_i256_audit_common_agent.rs\": \"{}\"\n",
            "  }},\n",
            "  \"source_sha256\": \"{}\",\n",
            "  \"elapsed_seconds\": {:.6},\n",
            "  \"scope_warning\": \"This closes only the order-28 degree-surplus-six Delta2 layer; global assembly is separate.\"\n",
            "}}\n"
        ),
        total_raw, total_canonical, total_rooted, rows,
        minimum.minimum.delta2, minimum.index, lengths_json(&minimum.minimum),
        minimum.minimum.root, total_sum,
        data_hash, data_report_hash, core_hash, delta_hash, common_hash,
        source_hash, overall.elapsed().as_secs_f64(),
    );
    let output = Path::new("rank8_delta2_e6_n28_census_exact_root_20260826.json");
    let temporary = Path::new("rank8_delta2_e6_n28_census_exact_root_20260826.json.tmp");
    fs::write(temporary, report.as_bytes()).expect("write temporary report");
    fs::rename(temporary, output).expect("replace report");
    println!("PASS_EXACT_RANK8_DELTA2_E6_N28_ALL_ROOTED_TREES");
    println!("RAW {} CANONICAL {} ROOTED {}", total_raw, total_canonical, total_rooted);
    println!("MINIMUM {} SKELETON {} LENGTHS {} ROOT {}",
             minimum.minimum.delta2, minimum.index,
             lengths_json(&minimum.minimum), minimum.minimum.root);
    println!("SOURCE {}", source_hash);
    println!("REPORT {}", file_sha256(output.to_str().unwrap()));
}
