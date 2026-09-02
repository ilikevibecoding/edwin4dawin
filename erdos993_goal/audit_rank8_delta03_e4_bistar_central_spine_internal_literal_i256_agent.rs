// Independent checked-i256 literal-tree audit for the e=4 bistar central-spine root.

include!("rank8_delta03_e3_cubic_exact_i256_core_root.rs");

const SAMPLES: usize = 29;
const DEGREE: [usize; 4] = [28, 28, 27, 26];

#[derive(Clone, Copy)]
struct State { value: i32, long: bool }

fn ordinary(index: i32) -> State {
    if index == 6 { State { value: 7, long: true } }
    else { State { value: index + 1, long: false } }
}

fn gap(index: i32) -> State {
    if index == 7 { State { value: 7, long: true } }
    else { State { value: index, long: false } }
}

fn attach(adjacency: &mut Vec<Vec<usize>>, start: usize, length: i32) -> usize {
    let mut previous = start;
    for _ in 0..length {
        let vertex = adjacency.len();
        adjacency.push(Vec::new());
        adjacency[previous].push(vertex);
        adjacency[vertex].push(previous);
        previous = vertex;
    }
    previous
}

fn build_tree(lengths: &[i32; 7]) -> (Vec<Vec<usize>>, usize) {
    let mut adjacency: Vec<Vec<usize>> = vec![Vec::new()];
    let quartic = 0;
    let root = attach(&mut adjacency, quartic, lengths[5] + 1);
    let cubic = attach(&mut adjacency, root, lengths[6] + 1);
    for index in 0..3 { attach(&mut adjacency, quartic, lengths[index]); }
    for index in 3..5 { attach(&mut adjacency, cubic, lengths[index]); }
    let expected = 3 + lengths.iter().sum::<i32>() as usize;
    assert_eq!(adjacency.len(), expected, "literal order mismatch");
    let degree_sum: usize = adjacency.iter().map(|row| row.len()).sum();
    assert_eq!(degree_sum, 2 * (expected - 1), "literal edge mismatch");
    (adjacency, root)
}

fn visit_literal(
    vertex: usize,
    parent: usize,
    removed: Option<usize>,
    adjacency: &[Vec<usize>],
    seen: &mut [bool],
) -> (V, V) {
    seen[vertex] = true;
    let mut absent = one();
    let mut present = one();
    for &neighbor in &adjacency[vertex] {
        if neighbor == parent || Some(neighbor) == removed { continue; }
        let (child_absent, child_present) = visit_literal(neighbor, vertex, removed, adjacency, seen);
        absent = mul(&absent, &add(&child_absent, &child_present));
        present = mul(&present, &child_absent);
    }
    (absent, shifted(&present, 1))
}

fn forest_literal(adjacency: &[Vec<usize>], removed: Option<usize>) -> V {
    let mut seen = vec![false; adjacency.len()];
    if let Some(vertex) = removed { seen[vertex] = true; }
    let mut out = one();
    for vertex in 0..adjacency.len() {
        if seen[vertex] { continue; }
        let (absent, present) = visit_literal(vertex, usize::MAX, removed, adjacency, &mut seen);
        out = mul(&out, &add(&absent, &present));
    }
    out
}

fn branch_states_formula(arms: &[i32]) -> (V, V) {
    let excluded_factors: Vec<V> = arms.iter().map(|&length| path(length)).collect();
    let included_factors: Vec<V> = arms.iter().map(|&length| path(length - 1)).collect();
    (product(&excluded_factors), shifted(&product(&included_factors), 1))
}

fn star_formula(arms: &[i32]) -> V {
    let (excluded, included) = branch_states_formula(arms);
    add(&excluded, &included)
}

fn primary_formula(lengths: &[i32; 7]) -> (V, V) {
    let (q0, q1) = branch_states_formula(&lengths[0..3]);
    let (c0, c1) = branch_states_formula(&lengths[3..5]);
    let spine = lengths[5] + lengths[6] + 2;
    let mut core_formula = zero();
    for (left, qstate) in [(0_i32, q0), (1_i32, q1)] {
        for (right, cstate) in [(0_i32, c0), (1_i32, c1)] {
            let row = product(&[qstate, cstate, path(spine - 1 - left - right)]);
            core_formula = add(&core_formula, &row);
        }
    }
    let qarms = [lengths[0], lengths[1], lengths[2], lengths[5]];
    let carms = [lengths[3], lengths[4], lengths[6]];
    let deleted_formula = mul(&star_formula(&qarms), &star_formula(&carms));
    (core_formula, deleted_formula)
}

fn evaluate_literal(lengths: &[i32; 7]) -> [Z; 4] {
    let (adjacency, root) = build_tree(lengths);
    let c = forest_literal(&adjacency, None);
    let h = forest_literal(&adjacency, Some(root));
    let (formula_c, formula_h) = primary_formula(lengths);
    assert_eq!(c, formula_c, "literal/core formula mismatch");
    assert_eq!(h, formula_h, "literal/deletion formula mismatch");
    deltas03(&c, &h)
}

fn finite_differences(values: &[Z; SAMPLES]) -> [Z; SAMPLES] {
    let mut work = *values;
    let mut out = [Z::zero(); SAMPLES];
    let mut width = SAMPLES;
    for power in 0..SAMPLES {
        out[power] = work[0];
        for index in 0..(width - 1) { work[index] = work[index + 1].sub(work[index]); }
        width -= 1;
    }
    out
}

fn binomial(n: i128, k: i128) -> i128 {
    if k < 0 || n < k { return 0; }
    let mut out = 1_i128;
    for j in 0..k { out = out.checked_mul(n - j).expect("binomial overflow") / (j + 1); }
    out
}

fn newton_at_29(coefficients: &[Z; SAMPLES]) -> Z {
    let mut out = Z::zero();
    for power in 0..SAMPLES { out = out.add(coefficients[power].mul_i128(binomial(29, power as i128))); }
    out
}

fn state_json(state: State) -> String {
    if state.long { "\"L\"".to_string() } else { state.value.to_string() }
}

fn key_json(states: &[State; 7]) -> String {
    format!(
        "[[{},{},{}],[{},{}],{},{}]",
        state_json(states[0]), state_json(states[1]), state_json(states[2]),
        state_json(states[3]), state_json(states[4]), state_json(states[5]), state_json(states[6]),
    )
}

fn zrow_json(row: &[Z; SAMPLES]) -> String {
    let mut out = String::from("[");
    for (index, value) in row.iter().enumerate() {
        if index != 0 { out.push(','); }
        out.push_str(&value.decimal());
    }
    out.push(']');
    out
}

fn coefficients_json(rows: &[[Z; SAMPLES]; 4]) -> String {
    format!("[{},{},{},{}]", zrow_json(&rows[0]), zrow_json(&rows[1]), zrow_json(&rows[2]), zrow_json(&rows[3]))
}

fn values_json(values: &[Z; 4]) -> String {
    format!("[{},{},{},{}]", values[0].decimal(), values[1].decimal(), values[2].decimal(), values[3].decimal())
}

#[derive(Clone)]
struct Sha256 {
    state: [u32; 8],
    buffer: [u8; 64],
    used: usize,
    bytes: u64,
}

impl Sha256 {
    fn new() -> Sha256 {
        Sha256 {
            state: [0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a, 0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19],
            buffer: [0; 64], used: 0, bytes: 0,
        }
    }

    fn block(&mut self, block: &[u8; 64]) {
        const K: [u32; 64] = [
            0x428a2f98,0x71374491,0xb5c0fbcf,0xe9b5dba5,0x3956c25b,0x59f111f1,0x923f82a4,0xab1c5ed5,
            0xd807aa98,0x12835b01,0x243185be,0x550c7dc3,0x72be5d74,0x80deb1fe,0x9bdc06a7,0xc19bf174,
            0xe49b69c1,0xefbe4786,0x0fc19dc6,0x240ca1cc,0x2de92c6f,0x4a7484aa,0x5cb0a9dc,0x76f988da,
            0x983e5152,0xa831c66d,0xb00327c8,0xbf597fc7,0xc6e00bf3,0xd5a79147,0x06ca6351,0x14292967,
            0x27b70a85,0x2e1b2138,0x4d2c6dfc,0x53380d13,0x650a7354,0x766a0abb,0x81c2c92e,0x92722c85,
            0xa2bfe8a1,0xa81a664b,0xc24b8b70,0xc76c51a3,0xd192e819,0xd6990624,0xf40e3585,0x106aa070,
            0x19a4c116,0x1e376c08,0x2748774c,0x34b0bcb5,0x391c0cb3,0x4ed8aa4a,0x5b9cca4f,0x682e6ff3,
            0x748f82ee,0x78a5636f,0x84c87814,0x8cc70208,0x90befffa,0xa4506ceb,0xbef9a3f7,0xc67178f2,
        ];
        let mut w = [0_u32; 64];
        for i in 0..16 {
            w[i] = u32::from_be_bytes([block[4*i], block[4*i+1], block[4*i+2], block[4*i+3]]);
        }
        for i in 16..64 {
            let s0 = w[i-15].rotate_right(7) ^ w[i-15].rotate_right(18) ^ (w[i-15] >> 3);
            let s1 = w[i-2].rotate_right(17) ^ w[i-2].rotate_right(19) ^ (w[i-2] >> 10);
            w[i] = w[i-16].wrapping_add(s0).wrapping_add(w[i-7]).wrapping_add(s1);
        }
        let [mut a,mut b,mut c,mut d,mut e,mut f,mut g,mut h] = self.state;
        for i in 0..64 {
            let s1 = e.rotate_right(6) ^ e.rotate_right(11) ^ e.rotate_right(25);
            let ch = (e & f) ^ ((!e) & g);
            let t1 = h.wrapping_add(s1).wrapping_add(ch).wrapping_add(K[i]).wrapping_add(w[i]);
            let s0 = a.rotate_right(2) ^ a.rotate_right(13) ^ a.rotate_right(22);
            let maj = (a & b) ^ (a & c) ^ (b & c);
            let t2 = s0.wrapping_add(maj);
            h=g; g=f; f=e; e=d.wrapping_add(t1); d=c; c=b; b=a; a=t1.wrapping_add(t2);
        }
        let row = [a,b,c,d,e,f,g,h];
        for i in 0..8 { self.state[i] = self.state[i].wrapping_add(row[i]); }
    }

    fn update(&mut self, mut data: &[u8]) {
        self.bytes = self.bytes.checked_add(data.len() as u64).expect("sha length overflow");
        if self.used != 0 {
            let take = (64 - self.used).min(data.len());
            self.buffer[self.used..self.used+take].copy_from_slice(&data[..take]);
            self.used += take;
            data = &data[take..];
            if self.used == 64 {
                let block = self.buffer;
                self.block(&block);
                self.used = 0;
            }
        }
        if data.is_empty() { return; }
        while data.len() >= 64 {
            let mut block = [0_u8; 64];
            block.copy_from_slice(&data[..64]);
            self.block(&block);
            data = &data[64..];
        }
        self.buffer[..data.len()].copy_from_slice(data);
        self.used = data.len();
    }

    fn hex(mut self) -> String {
        let bit_length = self.bytes.checked_mul(8).expect("sha bit length overflow");
        self.buffer[self.used] = 0x80;
        self.used += 1;
        if self.used > 56 {
            for i in self.used..64 { self.buffer[i] = 0; }
            let block = self.buffer;
            self.block(&block);
            self.buffer = [0; 64];
            self.used = 0;
        }
        for i in self.used..56 { self.buffer[i] = 0; }
        self.buffer[56..64].copy_from_slice(&bit_length.to_be_bytes());
        let block = self.buffer;
        self.block(&block);
        self.state.iter().map(|value| format!("{:08X}", value)).collect()
    }
}

fn hash_line(hash: &mut Sha256, line: String) {
    hash.update(line.as_bytes());
    hash.update(b"\n");
}

fn process_key(
    states: &[State; 7],
    coefficient_hash: &mut Sha256,
    finite_hash: &mut Sha256,
    counts: &mut [u64; 5],
    unseen: &mut u64,
) {
    let flags: [bool; 7] = std::array::from_fn(|index| states[index].long);
    let long_count = flags.iter().filter(|&&value| value).count();
    let key = key_json(states);
    let mut lengths: [i32; 7] = std::array::from_fn(|index| states[index].value);
    if long_count == 0 {
        counts[0] += 1;
        let order = 3 + lengths.iter().sum::<i32>();
        if order < 27 { return; }
        let values = evaluate_literal(&lengths);
        assert!(values.iter().all(|value| value.is_positive()), "finite nonpositive");
        let line = format!("[{},{},{}]", key, order, values_json(&values));
        if counts[1] == 0 && std::env::var_os("DEBUG_RECORDS").is_some() { println!("DEBUG_FINITE {}", line); }
        hash_line(finite_hash, line);
        counts[1] += 1;
        return;
    }
    if long_count == 7 { counts[3] += 1; } else { counts[2] += 1; }
    let baseline = 3 + lengths.iter().sum::<i32>();
    let shift = (27 - baseline).max(0);
    let first = flags.iter().position(|&value| value).unwrap();
    let mut sampled = [[Z::zero(); SAMPLES]; 4];
    for sample in 0..SAMPLES {
        lengths[first] = states[first].value + shift + sample as i32;
        let values = evaluate_literal(&lengths);
        for rank in 0..4 { sampled[rank][sample] = values[rank]; }
    }
    let coefficients: [[Z; SAMPLES]; 4] = std::array::from_fn(|rank| finite_differences(&sampled[rank]));
    for rank in 0..4 {
        assert!(coefficients[rank][0].is_positive(), "d0 nonpositive");
        assert!(coefficients[rank][1].is_positive(), "d1 nonpositive");
        for power in 2..=DEGREE[rank] { assert!(!coefficients[rank][power].is_negative(), "higher negative"); }
        for power in (DEGREE[rank]+1)..SAMPLES { assert!(coefficients[rank][power].is_zero(), "degree overflow"); }
    }
    let line = format!("[{},{},{},{}]", key, baseline, shift, coefficients_json(&coefficients));
    if counts[4] == 0 && std::env::var_os("DEBUG_RECORDS").is_some() { println!("DEBUG_COEFFICIENT {}", line); }
    hash_line(coefficient_hash, line);
    lengths[first] = states[first].value + shift + SAMPLES as i32;
    let next = evaluate_literal(&lengths);
    for rank in 0..4 {
        assert_eq!(next[rank], newton_at_29(&coefficients[rank]), "unseen S29 mismatch");
        *unseen += 1;
    }
    counts[4] += 1;
}

fn main() {
    // Self-test the standalone streaming SHA-256 implementation.
    let mut test = Sha256::new();
    test.update(b"abc");
    assert_eq!(test.hex(), "BA7816BF8F01CFEA414140DE5DAE2223B00361A396177A9CB410FF61F20015AD");
    let mut long_test = Sha256::new();
    for _ in 0..1000 { long_test.update(b"a"); }
    assert_eq!(long_test.hex(), "41EDECE42D63E8D9BF515A9BA6932E1C20CBC9F5A5D134645ADB5DB1B9737EA3");

    let mut coefficient_hash = Sha256::new();
    let mut finite_hash = Sha256::new();
    // all-short, finite n>=27, mixed, all-long, rays
    let mut counts = [0_u64; 5];
    let mut unseen = 0_u64;
    for a in 0..7_i32 { for b in a..7 { for cc in b..7 {
        for d in 0..7_i32 { for e in d..7 {
            for left in 0..8_i32 { for right in 0..8_i32 {
                let states = [ordinary(a), ordinary(b), ordinary(cc), ordinary(d), ordinary(e), gap(left), gap(right)];
                process_key(&states, &mut coefficient_hash, &mut finite_hash, &mut counts, &mut unseen);
            }}
        }}
    }}}
    assert_eq!(counts, [57_624, 28_812, 92_903, 1, 92_904]);
    assert_eq!(unseen, 371_616);
    println!("PASS_LITERAL_I256_CENTRAL_SPINE_INTERNAL");
    println!("COUNTS {} {} {} {} {}", counts[0], counts[1], counts[2], counts[3], counts[4]);
    println!("UNSEEN {}", unseen);
    println!("COEFFICIENT_STREAM {}", coefficient_hash.hex());
    println!("FINITE_STREAM {}", finite_hash.hex());
}
