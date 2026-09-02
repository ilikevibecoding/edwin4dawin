// Exact streaming evaluator for the rank-seven common0/sum0 no-parent G1
// coefficient on canonical parent arrays emitted by nauty's gentreeg -p.
//
// This is a bounded census engine.  It never asserts a theorem by itself;
// an authoritative wrapper pins the generator, source, expected counts, and
// ordered-record SHA-256 before promotion.

use std::io::{self, BufRead};

#[derive(Clone)]
struct Sha256 {
    state: [u32; 8],
    buffer: [u8; 64],
    used: usize,
    length: u64,
}

impl Sha256 {
    fn new() -> Self {
        Self {
            state: [
                0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a,
                0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19,
            ],
            buffer: [0; 64],
            used: 0,
            length: 0,
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
        let mut w = [0u32; 64];
        for i in 0..16 {
            w[i] = u32::from_be_bytes([
                block[4*i], block[4*i+1], block[4*i+2], block[4*i+3],
            ]);
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
        for (slot, value) in self.state.iter_mut().zip([a,b,c,d,e,f,g,h]) {
            *slot = slot.wrapping_add(value);
        }
    }

    fn update(&mut self, mut bytes: &[u8]) {
        self.length += bytes.len() as u64;
        if self.used != 0 {
            let take = (64-self.used).min(bytes.len());
            self.buffer[self.used..self.used+take].copy_from_slice(&bytes[..take]);
            self.used += take;
            bytes = &bytes[take..];
            if self.used == 64 {
                let block = self.buffer;
                self.block(&block);
                self.used = 0;
            }
        }
        while bytes.len() >= 64 {
            let block: &[u8;64] = bytes[..64].try_into().unwrap();
            self.block(block);
            bytes = &bytes[64..];
        }
        self.buffer[..bytes.len()].copy_from_slice(bytes);
        self.used = bytes.len();
    }

    fn finish(mut self) -> String {
        let bits = self.length * 8;
        self.buffer[self.used] = 0x80;
        self.used += 1;
        if self.used > 56 {
            for byte in &mut self.buffer[self.used..] { *byte = 0; }
            let block = self.buffer;
            self.block(&block);
            self.buffer = [0;64];
            self.used = 0;
        }
        for byte in &mut self.buffer[self.used..56] { *byte = 0; }
        self.buffer[56..64].copy_from_slice(&bits.to_be_bytes());
        let block = self.buffer;
        self.block(&block);
        self.state.iter().map(|value| format!("{value:08X}")).collect()
    }
}

fn add(left: &[i128;9], right: &[i128;9]) -> [i128;9] {
    let mut out=[0;9];
    for i in 0..9 { out[i]=left[i]+right[i]; }
    out
}

fn mul(left: &[i128;9], right: &[i128;9]) -> [i128;9] {
    let mut out=[0;9];
    for i in 0..9 {
        if left[i]==0 { continue; }
        for j in 0..(9-i) { out[i+j]+=left[i]*right[j]; }
    }
    out
}

fn rooted_from_adjacency(adjacency: &[Vec<usize>], vertex: usize, parent: usize) -> ([i128;9],[i128;9]) {
    let mut excluded=[0;9]; excluded[0]=1;
    let mut included=[0;9]; included[1]=1;
    for &child in &adjacency[vertex] {
        if child==parent { continue; }
        let (child_excluded, child_included)=rooted_from_adjacency(adjacency,child,vertex);
        excluded=mul(&excluded,&add(&child_excluded,&child_included));
        included=mul(&included,&child_excluded);
    }
    (excluded,included)
}

fn q(row: &[i128;9]) -> i128 {
    let (w3,w4,w5,w6,w7,w8)=(row[3],row[4],row[5],row[6],row[7],row[8]);
    8*w3*w3 + 24*w3*w4 - 64*w3*w5 - 106*w3*w6 - 51*w3*w7 - 8*w3*w8
        + 80*w4*w4 + 90*w4*w5 - 12*w4*w6 - 10*w4*w7 + 39*w5*w5 + 10*w5*w6
}

fn main() {
    let arguments: Vec<String> = std::env::args().collect();
    let order: usize = arguments.get(1).expect("order").parse().expect("integer order");
    assert!((2..=64).contains(&order));
    let stdin=io::stdin();
    let mut total=0u64;
    let mut eligible=0u64;
    let mut negative=0u64;
    let mut crosschecks=0u64;
    let mut minimum: Option<(i128,u64,String,Vec<usize>,[i128;9])>=None;
    let mut stream=Sha256::new();

    for raw in stdin.lock().lines() {
        let raw=raw.expect("read parent array");
        if raw.trim().is_empty() { continue; }
        let tokens: Vec<usize>=raw.split_whitespace().map(|x|x.parse().expect("parent token")).collect();
        assert_eq!(tokens.len(),order);
        assert_eq!(tokens[0],0);
        let mut parent=vec![usize::MAX;order];
        let mut degree=vec![0usize;order];
        let mut children=vec![Vec::new();order];
        let mut adjacency=vec![Vec::new();order];
        for child in 1..order {
            assert!((1..=child).contains(&tokens[child]));
            let p=tokens[child]-1;
            parent[child]=p;
            degree[child]+=1; degree[p]+=1;
            children[p].push(child);
            adjacency[p].push(child); adjacency[child].push(p);
        }
        let mut degrees=degree.clone(); degrees.sort_unstable_by(|a,b|b.cmp(a));
        let active=degrees[0]>=4 && degrees.iter().filter(|&&value|value>=3).count()>=3;
        let canonical=tokens.iter().map(|value|value.to_string()).collect::<Vec<_>>().join(" ");
        stream.update(format!("T|{order}|{total}|{canonical}|{:?}|{}\n",degrees,active as u8).as_bytes());
        if active {
            let mut excluded=vec![[0i128;9];order];
            let mut included=vec![[0i128;9];order];
            for vertex in (0..order).rev() {
                excluded[vertex][0]=1;
                included[vertex][1]=1;
                for &child in &children[vertex] {
                    excluded[vertex]=mul(&excluded[vertex],&add(&excluded[child],&included[child]));
                    included[vertex]=mul(&included[vertex],&excluded[child]);
                }
            }
            let row=add(&excluded[0],&included[0]);
            let value=q(&row);
            stream.update(format!("V|{:?}|{value}\n",row).as_bytes());
            eligible+=1;
            if value<0 { negative+=1; }
            let replace=minimum.as_ref().map_or(true,|old| (value,total)<(old.0,old.1));
            if replace { minimum=Some((value,total,canonical.clone(),degrees.clone(),row)); }
            if eligible % 4096 == 0 {
                let root=(eligible as usize)%order;
                let (a,b)=rooted_from_adjacency(&adjacency,root,usize::MAX);
                assert_eq!(add(&a,&b),row);
                crosschecks+=1;
            }
        }
        total+=1;
    }
    let minimum=minimum.expect("at least one eligible tree");
    println!("ORDER {order}");
    println!("TOTAL {total}");
    println!("ELIGIBLE {eligible}");
    println!("NEGATIVE {negative}");
    println!("CROSSCHECKS {crosschecks}");
    println!("MINIMUM_VALUE {}",minimum.0);
    println!("MINIMUM_INDEX {}",minimum.1);
    println!("MINIMUM_PARENT {}",minimum.2);
    println!("MINIMUM_DEGREES {:?}",minimum.3);
    println!("MINIMUM_ROW {:?}",minimum.4);
    println!("ORDERED_STREAM_SHA256 {}",stream.finish());
}
