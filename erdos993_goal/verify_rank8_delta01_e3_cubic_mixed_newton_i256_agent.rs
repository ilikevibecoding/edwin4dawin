// Low-memory exact Newton scanner for mixed short/long cubic boundary cells.
// Arguments: ROOT START LIMIT.

mod exact {
    include!("rank8_delta01_e3_cubic_exact_i256_core_agent.rs");
}

use std::env;
use std::time::Instant;
use exact::Z;

#[derive(Clone, Copy, Debug, PartialEq, Eq)]
struct State { value: i32, long: bool }

fn states(first: i32, last_short: i32, long_base: i32) -> Vec<State> {
    let mut out = (first..=last_short).map(|value| State { value, long:false }).collect::<Vec<_>>();
    out.push(State { value:long_base, long:true });
    out
}

fn pairs(items: &[State]) -> Vec<(State, State)> {
    let mut out = vec![];
    for i in 0..items.len() { for j in i..items.len() { out.push((items[i], items[j])); } }
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
        for index in 0..(29-order) { current[index] = current[index+1].sub(current[index]); }
    }
    out
}

struct Audit {
    root:String, start:u64, limit:u64, total:u64, done:u64,
    negative0:u64, negative1:u64, zero_higher:u64,
    min_base0:Option<Z>, min_base1:Option<Z>, min_first0:Option<Z>, min_first1:Option<Z>,
    witness_base0:(Vec<i32>,u16), witness_base1:(Vec<i32>,u16),
    witness_first0:(Vec<i32>,u16), witness_first1:(Vec<i32>,u16),
}

impl Audit {
    fn new(root:&str, start:u64, limit:u64) -> Audit { Audit {
        root:root.to_string(), start, limit, total:0, done:0,
        negative0:0, negative1:0, zero_higher:0,
        min_base0:None, min_base1:None, min_first0:None, min_first1:None,
        witness_base0:(vec![],0), witness_base1:(vec![],0),
        witness_first0:(vec![],0), witness_first1:(vec![],0),
    }}

    fn see(&mut self, items:&[State]) {
        let long_count = items.iter().filter(|item| item.long).count();
        if long_count == 0 || long_count == items.len() { return; }
        let index = self.total;
        self.total += 1;
        if index < self.start || self.done >= self.limit { return; }
        let (base_values, mask) = encode(items);
        let variable = (0..items.len()).find(|&i| items[i].long).unwrap();
        let mut samples0 = [Z::zero(); 30];
        let mut samples1 = [Z::zero(); 30];
        for offset in 0..30_i32 {
            let mut values = base_values.clone();
            values[variable] += offset;
            let (d0, d1) = exact::evaluate(&self.root, &values);
            samples0[offset as usize] = d0;
            samples1[offset as usize] = d1;
        }
        let n0 = forward(&samples0);
        let n1 = forward(&samples1);
        if !n0[0].is_positive() || !n0[1].is_positive() || n0.iter().any(|x| x.is_negative()) {
            self.negative0 += 1;
        }
        if !n1[0].is_positive() || !n1[1].is_positive() || n1.iter().any(|x| x.is_negative()) {
            self.negative1 += 1;
        }
        self.zero_higher += n0[2..].iter().filter(|x| x.is_zero()).count() as u64;
        self.zero_higher += n1[2..].iter().filter(|x| x.is_zero()).count() as u64;
        if self.min_base0.map_or(true, |m| n0[0].cmp(m).is_lt()) {
            self.min_base0=Some(n0[0]); self.witness_base0=(base_values.clone(),mask);
        }
        if self.min_base1.map_or(true, |m| n1[0].cmp(m).is_lt()) {
            self.min_base1=Some(n1[0]); self.witness_base1=(base_values.clone(),mask);
        }
        if self.min_first0.map_or(true, |m| n0[1].cmp(m).is_lt()) {
            self.min_first0=Some(n0[1]); self.witness_first0=(base_values.clone(),mask);
        }
        if self.min_first1.map_or(true, |m| n1[1].cmp(m).is_lt()) {
            self.min_first1=Some(n1[1]); self.witness_first1=(base_values,mask);
        }
        self.done += 1;
        if self.negative0 > 0 || self.negative1 > 0 {
            let d0 = n0.iter().map(|x| x.decimal()).collect::<Vec<_>>();
            let d1 = n1.iter().map(|x| x.decimal()).collect::<Vec<_>>();
            panic!("signed Newton cell root={} index={} mask={} n0={:?} n1={:?}", self.root,index,mask,d0,d1);
        }
    }
}

fn enumerate(root:&str, a:&mut Audit) {
    let pendant=states(1,7,8); let spine=states(1,9,10); let incident=states(1,8,9);
    let near=states(0,7,8); let tail=states(0,6,7); let outer_pairs=pairs(&pendant);
    let mut modules=vec![];
    for &s in &spine { for &pair in &outer_pairs { modules.push((s,pair)); } }
    match root {
        "outer_branch" => for &pa in &outer_pairs { for &m in &pendant { for &pb in &outer_pairs { for &u in &spine { for &v in &spine {
            a.see(&[pa.0,pa.1,m,pb.0,pb.1,u,v]);
        }}}}},
        "middle_branch" => for &m in &pendant { for i in 0..modules.len() { for j in i..modules.len() { let x=modules[i]; let y=modules[j];
            a.see(&[m,x.1.0,x.1.1,y.1.0,y.1.1,x.0,y.0]);
        }}},
        "outer_leaf" => for &a1 in &incident { for &a2 in &pendant { for &m in &pendant { for &pb in &outer_pairs { for &u in &spine { for &v in &spine {
            a.see(&[a1,a2,m,pb.0,pb.1,u,v]);
        }}}}}},
        "middle_leaf" => for &m in &incident { for i in 0..modules.len() { for j in i..modules.len() { let x=modules[i]; let y=modules[j];
            a.see(&[m,x.1.0,x.1.1,y.1.0,y.1.1,x.0,y.0]);
        }}},
        "outer_pendant_internal" => for &n in &near { for &t in &tail { for &a2 in &pendant { for &m in &pendant { for &pb in &outer_pairs { for &u in &spine { for &v in &spine {
            a.see(&[n,t,a2,m,pb.0,pb.1,u,v]);
        }}}}}}},
        "middle_pendant_internal" => for &n in &near { for &t in &tail { for i in 0..modules.len() { for j in i..modules.len() { let x=modules[i]; let y=modules[j];
            a.see(&[n,t,x.1.0,x.1.1,y.1.0,y.1.1,x.0,y.0]);
        }}}},
        "spine_internal" => for &n in &near { for &t in &near { for &pa in &outer_pairs { for &m in &pendant { for &(v,pb) in &modules {
            a.see(&[n,t,pa.0,pa.1,m,pb.0,pb.1,v]);
        }}}}},
        _ => panic!("root"),
    }
}

fn pair_json(pair:&(Vec<i32>,u16)) -> String {
    format!("{{\"values\":{:?},\"long_mask\":{}}}", pair.0, pair.1)
}

fn main() {
    let args:Vec<String> = env::args().collect();
    let root=args.get(1).expect("root");
    let start:u64=args.get(2).expect("start").parse().unwrap();
    let limit:u64=args.get(3).expect("limit").parse().unwrap();
    let timer=Instant::now();
    let mut audit=Audit::new(root,start,limit);
    enumerate(root,&mut audit);
    println!("{{\"status\":\"PASS_EXACT_MIXED_NEWTON_I256_CHUNK\",\"root\":\"{}\",\"start\":{},\"stop\":{},\"processed\":{},\"universe\":{},\"negative0\":{},\"negative1\":{},\"zero_higher\":{},\"minimum_base0\":\"{}\",\"minimum_base1\":\"{}\",\"minimum_first0\":\"{}\",\"minimum_first1\":\"{}\",\"witness_base0\":{},\"witness_base1\":{},\"witness_first0\":{},\"witness_first1\":{},\"runtime_seconds\":{:.6}}}",
        root,start,start+audit.done,audit.done,audit.total,audit.negative0,audit.negative1,audit.zero_higher,
        audit.min_base0.unwrap_or(Z::zero()).decimal(),audit.min_base1.unwrap_or(Z::zero()).decimal(),
        audit.min_first0.unwrap_or(Z::zero()).decimal(),audit.min_first1.unwrap_or(Z::zero()).decimal(),
        pair_json(&audit.witness_base0),pair_json(&audit.witness_base1),
        pair_json(&audit.witness_first0),pair_json(&audit.witness_first1),timer.elapsed().as_secs_f64());
    assert_eq!(audit.negative0,0);
    assert_eq!(audit.negative1,0);
}

