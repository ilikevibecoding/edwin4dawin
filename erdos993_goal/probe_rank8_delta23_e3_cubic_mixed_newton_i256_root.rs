// Exact low-memory Newton probe for the two connected residual ranks that are
// outside the active Delta0/Delta1 cubic program.  Arguments: ROOT START LIMIT.

mod exact {
    include!("rank8_delta03_e3_cubic_exact_i256_core_root.rs");
}

use std::env;
use std::time::Instant;
use exact::Z;

#[derive(Clone, Copy, Debug, PartialEq, Eq)]
struct State { value: i32, long: bool }

fn states(first: i32, last_short: i32, long_base: i32) -> Vec<State> {
    let mut out = (first..=last_short)
        .map(|value| State { value, long: false })
        .collect::<Vec<_>>();
    out.push(State { value: long_base, long: true });
    out
}

fn pairs(items: &[State]) -> Vec<(State, State)> {
    let mut out = vec![];
    for i in 0..items.len() {
        for j in i..items.len() { out.push((items[i], items[j])); }
    }
    out
}

fn encode(items: &[State]) -> (Vec<i32>, u16) {
    let values = items.iter().map(|item| item.value).collect::<Vec<_>>();
    let mut mask = 0_u16;
    for (index, item) in items.iter().enumerate() {
        if item.long { mask |= 1_u16 << index; }
    }
    (values, mask)
}

fn forward(values: &[Z; 30]) -> [Z; 30] {
    let mut current = *values;
    let mut out = [Z::zero(); 30];
    for order in 0..30 {
        out[order] = current[0];
        for index in 0..(29-order) {
            current[index] = current[index + 1].sub(current[index]);
        }
    }
    out
}

struct Audit {
    root: String,
    start: u64,
    limit: u64,
    total: u64,
    done: u64,
    negative2: u64,
    negative3: u64,
    zero_higher: u64,
    min_base2: Option<Z>,
    min_base3: Option<Z>,
    min_first2: Option<Z>,
    min_first3: Option<Z>,
    witness_base2: (Vec<i32>, u16),
    witness_base3: (Vec<i32>, u16),
    witness_first2: (Vec<i32>, u16),
    witness_first3: (Vec<i32>, u16),
}

impl Audit {
    fn new(root: &str, start: u64, limit: u64) -> Audit {
        Audit {
            root: root.to_string(), start, limit, total: 0, done: 0,
            negative2: 0, negative3: 0, zero_higher: 0,
            min_base2: None, min_base3: None, min_first2: None, min_first3: None,
            witness_base2: (vec![], 0), witness_base3: (vec![], 0),
            witness_first2: (vec![], 0), witness_first3: (vec![], 0),
        }
    }

    fn see(&mut self, items: &[State]) {
        let long_count = items.iter().filter(|item| item.long).count();
        if long_count == 0 || long_count == items.len() { return; }
        let index = self.total;
        self.total += 1;
        if index < self.start || self.done >= self.limit { return; }
        let (base_values, mask) = encode(items);
        let variable = (0..items.len()).find(|&i| items[i].long).unwrap();
        let mut samples2 = [Z::zero(); 30];
        let mut samples3 = [Z::zero(); 30];
        for offset in 0..30_i32 {
            let mut values = base_values.clone();
            values[variable] += offset;
            let d = exact::evaluate03(&self.root, &values);
            samples2[offset as usize] = d[2];
            samples3[offset as usize] = d[3];
        }
        let n2 = forward(&samples2);
        let n3 = forward(&samples3);
        if !n2[0].is_positive() || !n2[1].is_positive()
            || n2.iter().any(|x| x.is_negative()) { self.negative2 += 1; }
        if !n3[0].is_positive() || !n3[1].is_positive()
            || n3.iter().any(|x| x.is_negative()) { self.negative3 += 1; }
        self.zero_higher += n2[2..].iter().filter(|x| x.is_zero()).count() as u64;
        self.zero_higher += n3[2..].iter().filter(|x| x.is_zero()).count() as u64;
        if self.min_base2.map_or(true, |m| n2[0].cmp(m).is_lt()) {
            self.min_base2 = Some(n2[0]); self.witness_base2 = (base_values.clone(), mask);
        }
        if self.min_base3.map_or(true, |m| n3[0].cmp(m).is_lt()) {
            self.min_base3 = Some(n3[0]); self.witness_base3 = (base_values.clone(), mask);
        }
        if self.min_first2.map_or(true, |m| n2[1].cmp(m).is_lt()) {
            self.min_first2 = Some(n2[1]); self.witness_first2 = (base_values.clone(), mask);
        }
        if self.min_first3.map_or(true, |m| n3[1].cmp(m).is_lt()) {
            self.min_first3 = Some(n3[1]); self.witness_first3 = (base_values, mask);
        }
        self.done += 1;
        if self.negative2 > 0 || self.negative3 > 0 {
            let d2 = n2.iter().map(|x| x.decimal()).collect::<Vec<_>>();
            let d3 = n3.iter().map(|x| x.decimal()).collect::<Vec<_>>();
            panic!("signed Newton cell root={} index={} mask={} n2={:?} n3={:?}",
                self.root, index, mask, d2, d3);
        }
    }
}

fn enumerate(root: &str, a: &mut Audit) {
    let pendant = states(1, 7, 8);
    let spine = states(1, 9, 10);
    let incident = states(1, 8, 9);
    let near = states(0, 7, 8);
    let tail = states(0, 6, 7);
    let outer_pairs = pairs(&pendant);
    let mut modules = vec![];
    for &s in &spine { for &pair in &outer_pairs { modules.push((s, pair)); } }
    match root {
        "outer_branch" => for &pa in &outer_pairs { for &m in &pendant {
            for &pb in &outer_pairs { for &u in &spine { for &v in &spine {
                a.see(&[pa.0, pa.1, m, pb.0, pb.1, u, v]);
            }}}}},
        "middle_branch" => for &m in &pendant { for i in 0..modules.len() {
            for j in i..modules.len() { let x = modules[i]; let y = modules[j];
                a.see(&[m, x.1.0, x.1.1, y.1.0, y.1.1, x.0, y.0]);
            }}},
        "outer_leaf" => for &a1 in &incident { for &a2 in &pendant {
            for &m in &pendant { for &pb in &outer_pairs { for &u in &spine { for &v in &spine {
                a.see(&[a1, a2, m, pb.0, pb.1, u, v]);
            }}}}}},
        "middle_leaf" => for &m in &incident { for i in 0..modules.len() {
            for j in i..modules.len() { let x = modules[i]; let y = modules[j];
                a.see(&[m, x.1.0, x.1.1, y.1.0, y.1.1, x.0, y.0]);
            }}},
        "outer_pendant_internal" => for &n in &near { for &t in &tail {
            for &a2 in &pendant { for &m in &pendant { for &pb in &outer_pairs {
                for &u in &spine { for &v in &spine {
                    a.see(&[n, t, a2, m, pb.0, pb.1, u, v]);
                }}}}}}},
        "middle_pendant_internal" => for &n in &near { for &t in &tail {
            for i in 0..modules.len() { for j in i..modules.len() {
                let x = modules[i]; let y = modules[j];
                a.see(&[n, t, x.1.0, x.1.1, y.1.0, y.1.1, x.0, y.0]);
            }}}},
        "spine_internal" => for &n in &near { for &t in &near { for &pa in &outer_pairs {
            for &m in &pendant { for &(v, pb) in &modules {
                a.see(&[n, t, pa.0, pa.1, m, pb.0, pb.1, v]);
            }}}}},
        _ => panic!("root"),
    }
}

fn pair_json(pair: &(Vec<i32>, u16)) -> String {
    format!("{{\"values\":{:?},\"long_mask\":{}}}", pair.0, pair.1)
}

fn main() {
    let args: Vec<String> = env::args().collect();
    let root = args.get(1).expect("root");
    let start: u64 = args.get(2).expect("start").parse().unwrap();
    let limit: u64 = args.get(3).expect("limit").parse().unwrap();
    let timer = Instant::now();
    let mut audit = Audit::new(root, start, limit);
    enumerate(root, &mut audit);
    println!("{{\"status\":\"PASS_EXACT_DELTA23_MIXED_NEWTON_I256_CHUNK\",\"root\":\"{}\",\"start\":{},\"stop\":{},\"processed\":{},\"universe\":{},\"negative2\":{},\"negative3\":{},\"zero_higher\":{},\"minimum_base2\":\"{}\",\"minimum_base3\":\"{}\",\"minimum_first2\":\"{}\",\"minimum_first3\":\"{}\",\"witness_base2\":{},\"witness_base3\":{},\"witness_first2\":{},\"witness_first3\":{},\"runtime_seconds\":{:.6}}}",
        root, start, start + audit.done, audit.done, audit.total,
        audit.negative2, audit.negative3, audit.zero_higher,
        audit.min_base2.unwrap_or(Z::zero()).decimal(),
        audit.min_base3.unwrap_or(Z::zero()).decimal(),
        audit.min_first2.unwrap_or(Z::zero()).decimal(),
        audit.min_first3.unwrap_or(Z::zero()).decimal(),
        pair_json(&audit.witness_base2), pair_json(&audit.witness_base3),
        pair_json(&audit.witness_first2), pair_json(&audit.witness_first3),
        timer.elapsed().as_secs_f64());
    assert_eq!(audit.negative2, 0);
    assert_eq!(audit.negative3, 0);
}
