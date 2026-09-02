// Independent full replay of the order-28, degree-surplus-six Delta2 census.
// This audit does not include or call the primary census source.  It rebuilds
// every independence polynomial through memoized directed-edge messages.

include!("rank8_delta03_e4_literal_i256_audit_common_agent.rs");
include!("rank8_delta2_e6_n28_skeleton_data_root.rs");

use std::fs;
use std::path::Path;
use std::time::Instant;

const N28: usize = 28;
type Poly = [i128; 9];

#[derive(Clone)]
struct AuditWitness {
    value: i128,
    lengths: [u8; 13],
    width: usize,
    root: usize,
}

struct AuditResult {
    index: usize,
    name: &'static str,
    raw: u64,
    canonical: u64,
    rooted: u64,
    minimum: AuditWitness,
    maximum: i128,
    sum: i128,
    stream: String,
    seconds: f64,
}

fn aadd(left: i128, right: i128) -> i128 {
    left.checked_add(right).expect("audit i128 add overflow")
}

fn asub(left: i128, right: i128) -> i128 {
    left.checked_sub(right).expect("audit i128 sub overflow")
}

fn amul(left: i128, right: i128) -> i128 {
    left.checked_mul(right).expect("audit i128 multiply overflow")
}

fn poly_one() -> Poly {
    let mut out = [0_i128; 9];
    out[0] = 1;
    out
}

fn poly_add(left: &Poly, right: &Poly) -> Poly {
    let mut out = [0_i128; 9];
    for k in 0..9 { out[k] = aadd(left[k], right[k]); }
    out
}

fn poly_mul(left: &Poly, right: &Poly) -> Poly {
    let mut out = [0_i128; 9];
    for i in 0..9 {
        for j in 0..(9 - i) {
            out[i + j] = aadd(out[i + j], amul(left[i], right[j]));
        }
    }
    out
}

fn poly_shift(source: &Poly) -> Poly {
    let mut out = [0_i128; 9];
    out[1..].copy_from_slice(&source[..8]);
    out
}

fn choose_u64(n: usize, k: usize) -> u64 {
    if k > n { return 0; }
    let k = k.min(n - k);
    let mut out = 1_u64;
    for j in 0..k { out = out * (n - j) as u64 / (j + 1) as u64; }
    out
}

fn choose_i128(n: usize, k: usize) -> i128 {
    choose_u64(n, k) as i128
}

fn lexicographic_composition_rank(parts: &[u8]) -> u64 {
    // Independent separator-combination ranking.  Positive compositions of
    // 27 correspond to separator subsets of {1,...,26}.
    let separator_count = parts.len() - 1;
    let mut rank = 0_u64;
    let mut previous = 0_usize;
    let mut separator = 0_usize;
    for i in 0..separator_count {
        separator += parts[i] as usize;
        for candidate in (previous + 1)..separator {
            rank += choose_u64(26 - candidate, separator_count - i - 1);
        }
        previous = separator;
    }
    rank
}

fn seen(bits: &[u64], rank: u64) -> bool {
    bits[(rank / 64) as usize] & (1_u64 << (rank % 64)) != 0
}

fn mark(bits: &mut [u64], rank: u64) -> bool {
    let word = &mut bits[(rank / 64) as usize];
    let mask = 1_u64 << (rank % 64);
    let fresh = *word & mask == 0;
    *word |= mask;
    fresh
}

fn build_tree(skeleton: &E6SkeletonData, lengths: &[u8]) -> Vec<Vec<usize>> {
    let mut adjacency = vec![Vec::<usize>::new(); N28];
    let mut next = skeleton.skeleton_order;
    for (edge_index, &(left, right)) in skeleton.edges.iter().enumerate() {
        let mut previous = left;
        for step in 1..=lengths[edge_index] as usize {
            let current = if step == lengths[edge_index] as usize {
                right
            } else {
                let vertex = next;
                next += 1;
                vertex
            };
            adjacency[previous].push(current);
            adjacency[current].push(previous);
            previous = current;
        }
    }
    assert_eq!(next, N28);
    assert_eq!(adjacency.iter().map(Vec::len).sum::<usize>(), 54);
    assert!(adjacency.iter().all(|neighbors| neighbors.len() <= 5));
    adjacency
}

fn directed_message(
    vertex: usize,
    blocked: usize,
    adjacency: &[Vec<usize>],
    memo: &mut [Option<(Poly, Poly)>],
) -> (Poly, Poly) {
    let key = vertex * N28 + blocked;
    if let Some(answer) = memo[key] { return answer; }
    let mut absent = poly_one();
    let mut present_base = poly_one();
    for &neighbor in &adjacency[vertex] {
        if neighbor == blocked { continue; }
        let (neighbor_absent, neighbor_total) =
            directed_message(neighbor, vertex, adjacency, memo);
        absent = poly_mul(&absent, &neighbor_total);
        present_base = poly_mul(&present_base, &neighbor_absent);
    }
    let answer = (absent, poly_add(&absent, &poly_shift(&present_base)));
    memo[key] = Some(answer);
    answer
}

fn all_root_polynomials(adjacency: &[Vec<usize>]) -> (Poly, [Poly; N28]) {
    let mut memo = vec![None; N28 * N28];
    let mut deleted = [[0_i128; 9]; N28];
    for root in 0..N28 {
        let mut forest = poly_one();
        for &neighbor in &adjacency[root] {
            let (_, total) = directed_message(neighbor, root, adjacency, &mut memo);
            forest = poly_mul(&forest, &total);
        }
        assert_eq!(forest[0], 1);
        assert_eq!(forest[1], 27);
        deleted[root] = forest;
    }
    let root = 0;
    let mut absent = poly_one();
    let mut present_base = poly_one();
    for &neighbor in &adjacency[root] {
        let (neighbor_absent, neighbor_total) =
            directed_message(neighbor, root, adjacency, &mut memo);
        absent = poly_mul(&absent, &neighbor_total);
        present_base = poly_mul(&present_base, &neighbor_absent);
    }
    let whole = poly_add(&absent, &poly_shift(&present_base));
    assert_eq!(whole[0], 1);
    assert_eq!(whole[1], 28);
    assert_eq!(whole[2], 351);
    (whole, deleted)
}

fn residual_audit(c: &Poly, h: &Poly, siblings: usize) -> i128 {
    let mut p7 = h[6];
    let mut p8 = h[7];
    let mut open9 = 0_i128;
    for j in 0..=7 { p7 = aadd(p7, amul(c[7-j], choose_i128(siblings, j))); }
    for j in 0..=8 { p8 = aadd(p8, amul(c[8-j], choose_i128(siblings, j))); }
    for j in 1..=9 { open9 = aadd(open9, amul(c[9-j], choose_i128(siblings, j))); }
    let q8 = asub(asub(amul(16, amul(p8, p8)), amul(p7, p8)), amul(18, amul(p7, open9)));
    let cq = asub(amul(16, amul(c[8], c[8])), amul(c[7], c[8]));
    let hq = asub(amul(14, amul(h[7], h[7])), amul(h[6], h[7]));
    asub(
        asub(amul(8, amul(c[7], amul(h[6], q8))), amul(8, amul(h[6], amul(p7, cq)))),
        amul(9, amul(c[7], amul(p7, hq))),
    )
}

fn delta2_audit(c: &Poly, h: &Poly) -> i128 {
    aadd(
        asub(residual_audit(c, h, 3), amul(2, residual_audit(c, h, 2))),
        residual_audit(c, h, 1),
    )
}

fn stream_row(hash: &mut AuditSha256, index: usize, lengths: &[u8], values: &[i128; N28]) {
    let mut bytes = [0_u8; 512];
    let mut used = 0;
    bytes[used] = index as u8;
    used += 1;
    bytes[used] = lengths.len() as u8;
    used += 1;
    bytes[used..used + lengths.len()].copy_from_slice(lengths);
    used += lengths.len();
    for &value in values {
        bytes[used..used + 16].copy_from_slice(&value.to_le_bytes());
        used += 16;
    }
    hash.update(&bytes[..used]);
}

struct State<'a> {
    index: usize,
    skeleton: &'a E6SkeletonData,
    bits: Vec<u64>,
    raw_seen: u64,
    marked: u64,
    canonical: u64,
    rooted: u64,
    minimum: Option<AuditWitness>,
    maximum: Option<i128>,
    sum: i128,
    hash: AuditSha256,
    started: Instant,
}

impl<'a> State<'a> {
    fn visit(&mut self, lengths: &[u8]) {
        let rank = lexicographic_composition_rank(lengths);
        assert_eq!(rank, self.raw_seen);
        self.raw_seen += 1;
        if seen(&self.bits, rank) { return; }
        let width = lengths.len();
        let mut image = [0_u8; 13];
        let mut orbit = 0_u64;
        for permutation in self.skeleton.edge_permutations.chunks_exact(width) {
            image[..width].fill(0);
            for source in 0..width {
                image[permutation[source] as usize] = lengths[source];
            }
            let image_rank = lexicographic_composition_rank(&image[..width]);
            if mark(&mut self.bits, image_rank) { orbit += 1; }
        }
        assert!(orbit > 0);
        self.marked += orbit;
        self.canonical += 1;

        let adjacency = build_tree(self.skeleton, lengths);
        let (c, deleted) = all_root_polynomials(&adjacency);
        let mut values = [0_i128; N28];
        for root in 0..N28 {
            let value = delta2_audit(&c, &deleted[root]);
            assert!(value > 0, "audit nonpositive at {} {:?} root {}", self.index, lengths, root);
            if (self.canonical.wrapping_mul(193) + root as u64) % 1_000_033 == 0 {
                let generic = deltas03(&c, &deleted[root])[2];
                assert_eq!(generic, Z::from_i128(value));
            }
            values[root] = value;
            self.sum = aadd(self.sum, value);
            self.rooted += 1;
            if self.minimum.as_ref().map_or(true, |old| value < old.value) {
                let mut saved = [0_u8; 13];
                saved[..width].copy_from_slice(lengths);
                self.minimum = Some(AuditWitness { value, lengths: saved, width, root });
            }
            if self.maximum.map_or(true, |old| value > old) { self.maximum = Some(value); }
        }
        stream_row(&mut self.hash, self.index, lengths, &values);
        if self.canonical % 100_000 == 0 {
            eprintln!("AUDIT_PROGRESS skeleton={} canonical={} rooted={} seconds={:.1}",
                      self.index, self.canonical, self.rooted,
                      self.started.elapsed().as_secs_f64());
        }
    }
}

fn recurse(state: &mut State, lengths: &mut [u8; 13], position: usize,
           width: usize, remaining: usize) {
    if position + 1 == width {
        lengths[position] = remaining as u8;
        state.visit(&lengths[..width]);
        return;
    }
    let maximum = remaining - (width - position - 1);
    for value in 1..=maximum {
        lengths[position] = value as u8;
        recurse(state, lengths, position + 1, width, remaining - value);
    }
}

fn run(index: usize) -> AuditResult {
    let skeleton = &E6_SKELETONS[index - 1];
    let mut state = State {
        index,
        skeleton,
        bits: vec![0_u64; ((skeleton.raw_compositions + 63) / 64) as usize],
        raw_seen: 0, marked: 0, canonical: 0, rooted: 0,
        minimum: None, maximum: None, sum: 0,
        hash: AuditSha256::new(), started: Instant::now(),
    };
    let mut lengths = [0_u8; 13];
    recurse(&mut state, &mut lengths, 0, skeleton.edges.len(), 27);
    assert_eq!(state.raw_seen, skeleton.raw_compositions);
    assert_eq!(state.marked, skeleton.raw_compositions);
    assert_eq!(state.canonical, skeleton.canonical_orbits);
    assert_eq!(state.rooted, 28 * skeleton.canonical_orbits);
    AuditResult {
        index, name: skeleton.name, raw: state.raw_seen,
        canonical: state.canonical, rooted: state.rooted,
        minimum: state.minimum.unwrap(), maximum: state.maximum.unwrap(),
        sum: state.sum, stream: state.hash.hex(),
        seconds: state.started.elapsed().as_secs_f64(),
    }
}

fn witness_lengths(witness: &AuditWitness) -> String {
    witness.lengths[..witness.width].iter().map(u8::to_string)
        .collect::<Vec<_>>().join(",")
}

fn row_json(row: &AuditResult) -> String {
    format!(
        concat!(
            "{{\"index\":{},\"name\":\"{}\",\"raw_compositions\":{},",
            "\"canonical_trees\":{},\"rooted_evaluations\":{},",
            "\"minimum_delta2\":\"{}\",\"maximum_delta2\":\"{}\",",
            "\"sum_delta2\":\"{}\",\"minimum_edge_lengths\":[{}],",
            "\"minimum_root_vertex\":{},\"delta2_stream_sha256\":\"{}\",",
            "\"elapsed_seconds\":{:.6}}}"
        ),
        row.index, row.name, row.raw, row.canonical, row.rooted,
        row.minimum.value, row.maximum, row.sum, witness_lengths(&row.minimum),
        row.minimum.root, row.stream, row.seconds,
    )
}

fn sha_file(path: &str) -> String {
    let mut hash = AuditSha256::new();
    hash.update(&fs::read(path).expect("hash read"));
    hash.hex()
}

fn main() {
    audit_sha_self_test();
    let all_started = Instant::now();
    let mut results = Vec::new();
    for index in 1..=10 {
        eprintln!("AUDIT_START skeleton={}", index);
        let row = run(index);
        eprintln!("AUDIT_DONE skeleton={} canonical={} minimum={} seconds={:.1}",
                  index, row.canonical, row.minimum.value, row.seconds);
        results.push(row);
    }
    let raw: u64 = results.iter().map(|row| row.raw).sum();
    let canonical: u64 = results.iter().map(|row| row.canonical).sum();
    let rooted: u64 = results.iter().map(|row| row.rooted).sum();
    assert_eq!((raw, canonical, rooted), (51_374_180, 6_361_943, 178_134_404));
    let minimum = results.iter().min_by_key(|row| row.minimum.value).unwrap();
    assert!(minimum.minimum.value > 0);
    let rows = results.iter().map(row_json).collect::<Vec<_>>().join(",\n    ");
    let report = format!(
        concat!(
            "{{\n",
            "  \"schema\":\"rank8-delta2-e6-n28-census-independent-audit-root-v1\",\n",
            "  \"status\":\"PASS_INDEPENDENT_RANK8_DELTA2_E6_N28_ALL_ROOTED_AUDIT\",\n",
            "  \"coverage\":{{\"raw_subdivision_vectors\":{},\"canonical_trees\":{},\"rooted_evaluations\":{}}},\n",
            "  \"skeletons\":[\n    {}\n  ],\n",
            "  \"global_minimum\":{{\"delta2\":\"{}\",\"skeleton_index\":{},\"edge_lengths\":[{}],\"root_vertex\":{}}},\n",
            "  \"method\":\"independent heap adjacency plus memoized directed-edge independence messages; no primary census source is imported\",\n",
            "  \"source_sha256\":\"{}\",\n",
            "  \"data_sha256\":\"{}\",\n",
            "  \"elapsed_seconds\":{:.6}\n",
            "}}\n"
        ),
        raw, canonical, rooted, rows, minimum.minimum.value, minimum.index,
        witness_lengths(&minimum.minimum), minimum.minimum.root,
        sha_file("audit_rank8_delta2_e6_n28_census_root.rs"),
        sha_file("rank8_delta2_e6_n28_skeleton_data_root.rs"),
        all_started.elapsed().as_secs_f64(),
    );
    let temporary = Path::new("rank8_delta2_e6_n28_census_independent_audit_root_20260826.json.tmp");
    let output = Path::new("rank8_delta2_e6_n28_census_independent_audit_root_20260826.json");
    fs::write(temporary, report).expect("write audit report");
    fs::rename(temporary, output).expect("replace audit report");
    println!("PASS_INDEPENDENT_RANK8_DELTA2_E6_N28_ALL_ROOTED_AUDIT");
    println!("RAW {} CANONICAL {} ROOTED {}", raw, canonical, rooted);
    println!("MINIMUM {} SKELETON {} LENGTHS [{}] ROOT {}",
             minimum.minimum.value, minimum.index,
             witness_lengths(&minimum.minimum), minimum.minimum.root);
    println!("SOURCE {}", sha_file("audit_rank8_delta2_e6_n28_census_root.rs"));
    println!("REPORT {}", sha_file(output.to_str().unwrap()));
}
