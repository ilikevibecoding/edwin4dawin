// Exact checked-i256 Delta0..3 census for every rooted e=4 subdivision at n=27.

mod wide {
    include!("rank8_delta01_e3_cubic_exact_i256_core_agent.rs");
}

use wide::Z;

const ORDER: usize = 27;
const RANKS: usize = 9;

#[derive(Clone, Copy)]
struct State {
    excluded: [i128; RANKS],
    included: [i128; RANKS],
}

fn ai(a: i128, b: i128) -> i128 { a.checked_add(b).expect("i128 add overflow") }
fn mi(a: i128, b: i128) -> i128 { a.checked_mul(b).expect("i128 mul overflow") }
fn one() -> [i128; RANKS] { let mut out = [0; RANKS]; out[0] = 1; out }
fn x() -> [i128; RANKS] { let mut out = [0; RANKS]; out[1] = 1; out }

fn add(left: [i128; RANKS], right: [i128; RANKS]) -> [i128; RANKS] {
    let mut out = [0; RANKS];
    for k in 0..RANKS { out[k] = ai(left[k], right[k]); }
    out
}

fn multiply(left: [i128; RANKS], right: [i128; RANKS]) -> [i128; RANKS] {
    let mut out = [0; RANKS];
    for i in 0..RANKS {
        for j in 0..(RANKS-i) { out[i+j] = ai(out[i+j], mi(left[i], right[j])); }
    }
    out
}

fn directed(vertex: usize, parent: usize, adjacency: &[Vec<usize>], memo: &mut [Option<State>]) -> State {
    let order = adjacency.len();
    let key = vertex * order + parent;
    if let Some(state) = memo[key] { return state; }
    let mut excluded = one();
    let mut included = x();
    for &child in &adjacency[vertex] {
        if child == parent { continue; }
        let state = directed(child, vertex, adjacency, memo);
        excluded = multiply(excluded, add(state.excluded, state.included));
        included = multiply(included, state.excluded);
    }
    let state = State { excluded, included };
    memo[key] = Some(state);
    state
}

fn whole(root: usize, adjacency: &[Vec<usize>], memo: &mut [Option<State>]) -> [i128; RANKS] {
    let mut excluded = one();
    let mut included = x();
    for &neighbor in &adjacency[root] {
        let state = directed(neighbor, root, adjacency, memo);
        excluded = multiply(excluded, add(state.excluded, state.included));
        included = multiply(included, state.excluded);
    }
    add(excluded, included)
}

fn deletion(root: usize, adjacency: &[Vec<usize>], memo: &mut [Option<State>]) -> [i128; RANKS] {
    let mut out = one();
    for &neighbor in &adjacency[root] {
        let state = directed(neighbor, root, adjacency, memo);
        out = multiply(out, add(state.excluded, state.included));
    }
    out
}

fn choose_small(n: usize, k: usize) -> i128 {
    if k > n { return 0; }
    let mut out = 1_i128;
    for j in 0..k { out = out * (n-j) as i128 / (j+1) as i128; }
    out
}

fn zterm(constant: i128, factors: &[i128]) -> Z {
    let mut out = Z::from_i128(constant);
    for &factor in factors { out = out.mul_i128(factor); }
    out
}

fn residual(core: &[i128; RANKS], deleted: &[i128; RANKS], siblings: usize) -> Z {
    let mut smooth7 = 0_i128;
    let mut smooth8 = 0_i128;
    let mut open9 = 0_i128;
    for index in 0..=7 { smooth7 = ai(smooth7, mi(core[7-index], choose_small(siblings,index))); }
    for index in 0..=8 { smooth8 = ai(smooth8, mi(core[8-index], choose_small(siblings,index))); }
    for index in 1..=9 { open9 = ai(open9, mi(core[9-index], choose_small(siblings,index))); }
    let p7 = ai(smooth7, deleted[6]);
    let p8 = ai(smooth8, deleted[7]);
    let q8 = ai(ai(mi(16, mi(p8,p8)), -mi(p7,p8)), -mi(18,mi(p7,open9)));
    let core_q = ai(mi(16,mi(core[8],core[8])), -mi(core[7],core[8]));
    let deleted_q = ai(mi(14,mi(deleted[7],deleted[7])), -mi(deleted[6],deleted[7]));
    zterm(8, &[core[7], deleted[6], q8])
        .sub(zterm(8, &[deleted[6], p7, core_q]))
        .sub(zterm(9, &[core[7], p7, deleted_q]))
}

fn deltas(core: &[i128; RANKS], deleted: &[i128; RANKS]) -> [Z; 4] {
    let r1 = residual(core, deleted, 1);
    let r2 = residual(core, deleted, 2);
    let r3 = residual(core, deleted, 3);
    let r4 = residual(core, deleted, 4);
    [
        r1,
        r2.sub(r1),
        r3.sub(r2).sub(r2).add(r1),
        r4.sub(r3).sub(r3).sub(r3).add(r2).add(r2).add(r2).sub(r1),
    ]
}

#[derive(Clone)]
struct Skeleton {
    name: &'static str,
    node_count: usize,
    edges: Vec<(usize,usize)>,
    node_orbits: Vec<usize>,
    edge_orbits: Vec<usize>,
    orbit_names: Vec<&'static str>,
}

fn skeletons() -> Vec<Skeleton> {
    vec![
        Skeleton {
            name: "four_cubic_star",
            node_count: 10,
            // C=0, outer branches 1..3, leaf pairs 4/5,6/7,8/9.
            edges: vec![(0,1),(1,4),(1,5),(0,2),(2,6),(2,7),(0,3),(3,8),(3,9)],
            node_orbits: vec![0,1,1,1,2,2,2,2,2,2],
            edge_orbits: vec![3,4,4,3,4,4,3,4,4],
            orbit_names: vec!["center_branch","outer_branch","leaf","center_outer_spine_internal","pendant_internal"],
        },
        Skeleton {
            name: "four_cubic_path",
            node_count: 10,
            // Branch path 0-1-2-3; leaves 4,5 at 0; 6 at1; 7 at2; 8,9 at3.
            edges: vec![(0,1),(1,2),(2,3),(0,4),(0,5),(1,6),(2,7),(3,8),(3,9)],
            node_orbits: vec![0,1,1,0,2,2,3,3,2,2],
            edge_orbits: vec![4,5,4,6,6,7,7,6,6],
            orbit_names: vec!["outer_branch","inner_branch","outer_leaf","inner_leaf","outer_spine_internal","middle_spine_internal","outer_pendant_internal","inner_pendant_internal"],
        },
        Skeleton {
            name: "quartic_cubic_bistar",
            node_count: 7,
            // Q=0,C=1; quartic leaves2..4; cubic leaves5..6.
            edges: vec![(0,1),(0,2),(0,3),(0,4),(1,5),(1,6)],
            node_orbits: vec![0,1,2,2,2,3,3],
            edge_orbits: vec![4,5,5,5,6,6],
            orbit_names: vec!["quartic_branch","cubic_branch","quartic_leaf","cubic_leaf","central_spine_internal","quartic_pendant_internal","cubic_pendant_internal"],
        },
    ]
}

fn subdivision(skeleton: &Skeleton, lengths: &[usize]) -> (Vec<Vec<usize>>, Vec<usize>) {
    assert_eq!(skeleton.edges.len(), lengths.len());
    let order = skeleton.node_count + lengths.iter().sum::<usize>() - lengths.len();
    assert_eq!(order, ORDER);
    let mut adjacency = vec![Vec::new(); order];
    let mut root_orbits = skeleton.node_orbits.clone();
    let mut next = skeleton.node_count;
    for (edge_index, (&(left,right), &length)) in skeleton.edges.iter().zip(lengths.iter()).enumerate() {
        assert!(length >= 1);
        let mut previous = left;
        for _ in 1..length {
            let vertex = next; next += 1;
            adjacency[previous].push(vertex); adjacency[vertex].push(previous);
            root_orbits.push(skeleton.edge_orbits[edge_index]);
            previous = vertex;
        }
        adjacency[previous].push(right); adjacency[right].push(previous);
    }
    assert_eq!(next, order);
    assert_eq!(root_orbits.len(), order);
    (adjacency, root_orbits)
}

fn surplus(adjacency: &[Vec<usize>]) -> usize {
    adjacency.iter().map(|row| { let x=row.len().saturating_sub(1); x*x.saturating_sub(1)/2 }).sum()
}

fn canonical(skeleton: &str, l: &[usize]) -> bool {
    match skeleton {
        "four_cubic_star" => {
            // modules are (sorted leaf pair, center spine), one per outer branch.
            if l[1] > l[2] || l[4] > l[5] || l[7] > l[8] { return false; }
            let m0=(l[1],l[2],l[0]); let m1=(l[4],l[5],l[3]); let m2=(l[7],l[8],l[6]);
            m0 <= m1 && m1 <= m2
        },
        "four_cubic_path" => {
            if l[3] > l[4] || l[7] > l[8] { return false; }
            let forward=(l[3],l[4],l[0],l[5],l[1],l[6],l[2],l[7],l[8]);
            let reverse=(l[7],l[8],l[2],l[6],l[1],l[5],l[0],l[3],l[4]);
            forward <= reverse
        },
        "quartic_cubic_bistar" => l[1] <= l[2] && l[2] <= l[3] && l[4] <= l[5],
        _ => panic!("unknown skeleton"),
    }
}

fn compositions<F: FnMut(&[usize])>(total: usize, slots: usize, callback: &mut F) {
    fn visit<F: FnMut(&[usize])>(remaining: usize, slot: usize, current: &mut [usize], callback: &mut F) {
        if slot + 1 == current.len() {
            if remaining >= 1 { current[slot] = remaining; callback(current); }
            return;
        }
        let left = current.len() - slot;
        for value in 1..=(remaining-left+1) {
            current[slot] = value;
            visit(remaining-value, slot+1, current, callback);
        }
    }
    let mut current = vec![0; slots];
    visit(total, 0, &mut current, callback);
}

#[derive(Clone)]
struct Minimum {
    value: Z,
    lengths: Vec<usize>,
    root: usize,
    core: [i128; RANKS],
    deleted: [i128; RANKS],
}

struct OrbitAudit {
    checks: u64,
    nonpositive: [u64;4],
    minima: [Option<Minimum>;4],
}

impl OrbitAudit {
    fn new() -> OrbitAudit { OrbitAudit { checks:0, nonpositive:[0;4], minima:[None,None,None,None] } }
    fn record(&mut self, values:[Z;4], lengths:&[usize], root:usize, core:[i128;RANKS], deleted:[i128;RANKS]) {
        self.checks += 1;
        for rank in 0..4 {
            if !values[rank].is_positive() { self.nonpositive[rank] += 1; }
            if self.minima[rank].as_ref().map_or(true, |row| values[rank].cmp(row.value).is_lt()) {
                self.minima[rank] = Some(Minimum { value:values[rank], lengths:lengths.to_vec(), root, core, deleted });
            }
        }
    }
}

fn json_i128_array(row:&[i128;RANKS]) -> String {
    format!("[{}]", row.iter().map(|x| x.to_string()).collect::<Vec<_>>().join(","))
}

fn main() {
    let mut total_trees=0_u64;
    let mut total_roots=0_u64;
    let mut skeleton_json=Vec::new();
    let mut any_nonpositive=false;
    for skeleton in skeletons() {
        let mut audits: Vec<OrbitAudit> = (0..skeleton.orbit_names.len()).map(|_| OrbitAudit::new()).collect();
        let mut trees=0_u64;
        compositions(ORDER-1, skeleton.edges.len(), &mut |lengths| {
            if !canonical(skeleton.name, lengths) { return; }
            let (adjacency, root_orbits)=subdivision(&skeleton,lengths);
            assert_eq!(surplus(&adjacency),4);
            let mut memo=vec![None; ORDER*ORDER];
            let core=whole(0,&adjacency,&mut memo);
            trees += 1;
            for root in 0..ORDER {
                let deleted=deletion(root,&adjacency,&mut memo);
                let values=deltas(&core,&deleted);
                audits[root_orbits[root]].record(values,lengths,root,core,deleted);
            }
        });
        let roots=audits.iter().map(|row| row.checks).sum::<u64>();
        assert_eq!(roots,trees*ORDER as u64);
        total_trees += trees; total_roots += roots;
        let mut orbit_json=Vec::new();
        for (index,audit) in audits.iter().enumerate() {
            let mut minima_json=Vec::new();
            for rank in 0..4 {
                let row=audit.minima[rank].as_ref().expect("nonempty root orbit");
                if audit.nonpositive[rank] != 0 { any_nonpositive=true; }
                minima_json.push(format!(
                    "\"{}\":{{\"value\":\"{}\",\"lengths\":{:?},\"root\":{},\"core\":{},\"deleted\":{}}}",
                    rank,row.value.decimal(),row.lengths,row.root,json_i128_array(&row.core),json_i128_array(&row.deleted)
                ));
            }
            orbit_json.push(format!(
                "{{\"root_orbit\":\"{}:{}\",\"literal_root_checks\":{},\"nonpositive\":[{},{},{},{}],\"minima\":{{{}}}}}",
                skeleton.name,skeleton.orbit_names[index],audit.checks,
                audit.nonpositive[0],audit.nonpositive[1],audit.nonpositive[2],audit.nonpositive[3],minima_json.join(",")
            ));
        }
        skeleton_json.push(format!(
            "{{\"skeleton\":\"{}\",\"canonical_subdivisions\":{},\"literal_root_checks\":{},\"root_orbits\":[{}]}}",
            skeleton.name,trees,roots,orbit_json.join(",")
        ));
        eprintln!("DONE {} trees={} roots={}",skeleton.name,trees,roots);
    }
    let status=if any_nonpositive {"OBSTRUCTION_EXACT_RANK8_DELTA03_E4_SKELETONS_ORDER27"} else {"PASS_EXACT_RANK8_DELTA03_E4_SKELETONS_ALL_ROOTS_ORDER27"};
    println!("{{\"schema\":\"rank8-delta03-e4-skeletons-order27-i256-agent-v1\",\"status\":\"{}\",\"order\":27,\"canonical_subdivisions\":{},\"literal_root_checks\":{},\"skeletons\":[{}],\"scope_guard\":\"Exact finite order-27 e=4 census only; no all-order or e>=5 claim.\"}}",
        status,total_trees,total_roots,skeleton_json.join(","));
    println!("{}",status);
    if any_nonpositive { std::process::exit(2); }
}
