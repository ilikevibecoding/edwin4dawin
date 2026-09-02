// Shared checked-i256 primitives for independent literal-tree e=4 audits.
// This file has no main and is textually included by each orbit-specific engine.

include!("rank8_delta03_e3_cubic_exact_i256_core_root.rs");

const AUDIT_SAMPLES: usize = 29;
const AUDIT_DEGREES: [usize; 4] = [28, 28, 27, 26];

fn audit_attach(adjacency: &mut Vec<Vec<usize>>, start: usize, length: i32) -> usize {
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

fn audit_visit(
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
        let (child_absent, child_present) = audit_visit(neighbor, vertex, removed, adjacency, seen);
        absent = mul(&absent, &add(&child_absent, &child_present));
        present = mul(&present, &child_absent);
    }
    (absent, shifted(&present, 1))
}

fn audit_forest(adjacency: &[Vec<usize>], removed: Option<usize>) -> V {
    let mut seen = vec![false; adjacency.len()];
    if let Some(vertex) = removed { seen[vertex] = true; }
    let mut out = one();
    for vertex in 0..adjacency.len() {
        if seen[vertex] { continue; }
        let (absent, present) = audit_visit(vertex, usize::MAX, removed, adjacency, &mut seen);
        out = mul(&out, &add(&absent, &present));
    }
    out
}

fn audit_deltas(adjacency: &[Vec<usize>], root: usize) -> ([Z; 4], V, V) {
    let c = audit_forest(adjacency, None);
    let h = audit_forest(adjacency, Some(root));
    (deltas03(&c, &h), c, h)
}

fn audit_differences(values: &[Z; AUDIT_SAMPLES]) -> [Z; AUDIT_SAMPLES] {
    let mut work = *values;
    let mut out = [Z::zero(); AUDIT_SAMPLES];
    let mut width = AUDIT_SAMPLES;
    for power in 0..AUDIT_SAMPLES {
        out[power] = work[0];
        for index in 0..(width - 1) { work[index] = work[index + 1].sub(work[index]); }
        width -= 1;
    }
    out
}

fn audit_binomial(n: i128, k: i128) -> i128 {
    if k < 0 || n < k { return 0; }
    let mut out = 1_i128;
    for j in 0..k { out = out.checked_mul(n - j).expect("binomial overflow") / (j + 1); }
    out
}

fn audit_newton_at_29(coefficients: &[Z; AUDIT_SAMPLES]) -> Z {
    let mut out = Z::zero();
    for power in 0..AUDIT_SAMPLES {
        out = out.add(coefficients[power].mul_i128(audit_binomial(29, power as i128)));
    }
    out
}

fn audit_assert_gate(coefficients: &[[Z; AUDIT_SAMPLES]; 4]) {
    for rank in 0..4 {
        assert!(coefficients[rank][0].is_positive(), "d0 nonpositive");
        assert!(coefficients[rank][1].is_positive(), "d1 nonpositive");
        for power in 2..=AUDIT_DEGREES[rank] {
            assert!(!coefficients[rank][power].is_negative(), "higher Newton coefficient negative");
        }
        for power in (AUDIT_DEGREES[rank] + 1)..AUDIT_SAMPLES {
            assert!(coefficients[rank][power].is_zero(), "degree overflow");
        }
    }
}

fn audit_zrow_json(row: &[Z; AUDIT_SAMPLES]) -> String {
    let mut out = String::from("[");
    for (index, value) in row.iter().enumerate() {
        if index != 0 { out.push(','); }
        out.push_str(&value.decimal());
    }
    out.push(']');
    out
}

fn audit_coefficients_json(rows: &[[Z; AUDIT_SAMPLES]; 4]) -> String {
    format!("[{},{},{},{}]", audit_zrow_json(&rows[0]), audit_zrow_json(&rows[1]), audit_zrow_json(&rows[2]), audit_zrow_json(&rows[3]))
}

fn audit_values_json(values: &[Z; 4]) -> String {
    format!("[{},{},{},{}]", values[0].decimal(), values[1].decimal(), values[2].decimal(), values[3].decimal())
}

#[derive(Clone)]
struct AuditSha256 {
    state: [u32; 8],
    buffer: [u8; 64],
    used: usize,
    bytes: u64,
}

impl AuditSha256 {
    fn new() -> AuditSha256 {
        AuditSha256 {
            state: [0x6a09e667,0xbb67ae85,0x3c6ef372,0xa54ff53a,0x510e527f,0x9b05688c,0x1f83d9ab,0x5be0cd19],
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
        for i in 0..16 { w[i] = u32::from_be_bytes([block[4*i],block[4*i+1],block[4*i+2],block[4*i+3]]); }
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
        let bits = self.bytes.checked_mul(8).expect("sha bit length overflow");
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
        self.buffer[56..64].copy_from_slice(&bits.to_be_bytes());
        let block = self.buffer;
        self.block(&block);
        self.state.iter().map(|value| format!("{:08X}", value)).collect()
    }
}

fn audit_hash_line(hash: &mut AuditSha256, line: String) {
    hash.update(line.as_bytes());
    hash.update(b"\n");
}

fn audit_sha_self_test() {
    let mut short = AuditSha256::new();
    short.update(b"abc");
    assert_eq!(short.hex(), "BA7816BF8F01CFEA414140DE5DAE2223B00361A396177A9CB410FF61F20015AD");
    let mut incremental = AuditSha256::new();
    for _ in 0..1000 { incremental.update(b"a"); }
    assert_eq!(incremental.hex(), "41EDECE42D63E8D9BF515A9BA6932E1C20CBC9F5A5D134645ADB5DB1B9737EA3");
}
