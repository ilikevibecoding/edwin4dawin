// Exact checked-i256 scanner for the all-short cubic e=3 Delta2/Delta3 band.
// Arguments: ROOT START LIMIT.  Every selected pattern has order at least 37.

mod exact {
    include!("rank8_delta03_e3_cubic_exact_i256_core_root.rs");
}

use exact::Z;
use std::env;
use std::time::Instant;

fn pairs(first: i32, last: i32) -> Vec<(i32, i32)> {
    let mut out = vec![];
    for a in first..=last { for b in a..=last { out.push((a, b)); } }
    out
}

fn order(root: &str, values: &[i32]) -> i32 {
    values.iter().sum::<i32>() + if root.contains("pendant_internal") {
        2
    } else if root == "spine_internal" {
        3
    } else {
        1
    }
}

struct Audit {
    root: String,
    start: u64,
    limit: u64,
    total: u64,
    done: u64,
    negative2: u64,
    negative3: u64,
    min2: Option<Z>,
    min3: Option<Z>,
    witness2: Vec<i32>,
    witness3: Vec<i32>,
}

impl Audit {
    fn new(root: &str, start: u64, limit: u64) -> Audit {
        Audit {
            root: root.to_string(), start, limit, total: 0, done: 0,
            negative2: 0, negative3: 0, min2: None, min3: None,
            witness2: vec![], witness3: vec![],
        }
    }

    fn see(&mut self, values: &[i32]) {
        if order(&self.root, values) < 37 { return; }
        let index = self.total;
        self.total += 1;
        if index < self.start || self.done >= self.limit { return; }
        let d = exact::evaluate03(&self.root, values);
        self.done += 1;
        if !d[2].is_positive() { self.negative2 += 1; }
        if !d[3].is_positive() { self.negative3 += 1; }
        if self.min2.map_or(true, |m| d[2].cmp(m).is_lt()) {
            self.min2 = Some(d[2]); self.witness2 = values.to_vec();
        }
        if self.min3.map_or(true, |m| d[3].cmp(m).is_lt()) {
            self.min3 = Some(d[3]); self.witness3 = values.to_vec();
        }
        if self.negative2 > 0 || self.negative3 > 0 {
            panic!("nonpositive all-short cell root={} index={} values={:?} d2={} d3={}",
                self.root, index, values, d[2].decimal(), d[3].decimal());
        }
    }
}

fn enumerate(root: &str, audit: &mut Audit) {
    let pendant_pairs = pairs(1, 7);
    let mut modules = vec![];
    for spine in 1..=9 { for &pair in &pendant_pairs { modules.push((spine, pair)); } }
    match root {
        "outer_branch" => for &pa in &pendant_pairs { for m in 1..=7 {
            for &pb in &pendant_pairs { for u in 1..=9 { for v in 1..=9 {
                audit.see(&[pa.0, pa.1, m, pb.0, pb.1, u, v]);
            }}}}},
        "middle_branch" => for m in 1..=7 { for i in 0..modules.len() {
            for j in i..modules.len() { let x = modules[i]; let y = modules[j];
                audit.see(&[m, x.1.0, x.1.1, y.1.0, y.1.1, x.0, y.0]);
            }}},
        "outer_leaf" => for a1 in 1..=8 { for a2 in 1..=7 { for m in 1..=7 {
            for &pb in &pendant_pairs { for u in 1..=9 { for v in 1..=9 {
                audit.see(&[a1, a2, m, pb.0, pb.1, u, v]);
            }}}}}},
        "middle_leaf" => for m in 1..=8 { for i in 0..modules.len() {
            for j in i..modules.len() { let x = modules[i]; let y = modules[j];
                audit.see(&[m, x.1.0, x.1.1, y.1.0, y.1.1, x.0, y.0]);
            }}},
        "outer_pendant_internal" => for near in 0..=7 { for tail in 0..=6 {
            for a2 in 1..=7 { for m in 1..=7 { for &pb in &pendant_pairs {
                for u in 1..=9 { for v in 1..=9 {
                    audit.see(&[near, tail, a2, m, pb.0, pb.1, u, v]);
                }}}}}}},
        "middle_pendant_internal" => for near in 0..=7 { for tail in 0..=6 {
            for i in 0..modules.len() { for j in i..modules.len() {
                let x = modules[i]; let y = modules[j];
                audit.see(&[near, tail, x.1.0, x.1.1, y.1.0, y.1.1, x.0, y.0]);
            }}}},
        "spine_internal" => for near in 0..=7 { for tail in 0..=7 {
            for &pa in &pendant_pairs { for m in 1..=7 { for &(v, pb) in &modules {
                audit.see(&[near, tail, pa.0, pa.1, m, pb.0, pb.1, v]);
            }}}}},
        _ => panic!("root"),
    }
}

fn main() {
    let args: Vec<String> = env::args().collect();
    let root = args.get(1).expect("root");
    let start: u64 = args.get(2).expect("start").parse().unwrap();
    let limit: u64 = args.get(3).expect("limit").parse().unwrap();
    let timer = Instant::now();
    let mut audit = Audit::new(root, start, limit);
    enumerate(root, &mut audit);
    println!("{{\"status\":\"PASS_EXACT_DELTA23_ALL_SHORT_I256_CHUNK\",\"root\":\"{}\",\"start\":{},\"stop\":{},\"processed\":{},\"universe\":{},\"negative2\":{},\"negative3\":{},\"minimum2\":\"{}\",\"minimum3\":\"{}\",\"witness2\":{:?},\"witness3\":{:?},\"runtime_seconds\":{:.6}}}",
        root, start, start + audit.done, audit.done, audit.total,
        audit.negative2, audit.negative3,
        audit.min2.unwrap_or(Z::zero()).decimal(),
        audit.min3.unwrap_or(Z::zero()).decimal(),
        audit.witness2, audit.witness3, timer.elapsed().as_secs_f64());
    assert_eq!(audit.negative2, 0);
    assert_eq!(audit.negative3, 0);
}
