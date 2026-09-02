// Empirical obstruction probe only: test whether adding a leaf always makes
// each Delta0..Delta3 value increase at every pre-existing root.  A failure
// rules out the naive induction; a pass is not a proof.

include!("rank8_delta03_e4_literal_i256_audit_common_agent.rs");

fn prufer_tree(code: &[usize]) -> Vec<Vec<usize>> {
    let n = code.len() + 2;
    let mut degree = vec![1_usize; n];
    for &vertex in code { degree[vertex] += 1; }
    let mut adjacency = vec![Vec::new(); n];
    for &vertex in code {
        let leaf = (0..n).find(|&candidate| degree[candidate] == 1).unwrap();
        adjacency[leaf].push(vertex);
        adjacency[vertex].push(leaf);
        degree[leaf] -= 1;
        degree[vertex] -= 1;
    }
    let leaves: Vec<usize> = (0..n).filter(|&vertex| degree[vertex] == 1).collect();
    assert_eq!(leaves.len(), 2);
    adjacency[leaves[0]].push(leaves[1]);
    adjacency[leaves[1]].push(leaves[0]);
    adjacency
}

fn add_leaf(source: &[Vec<usize>], attach: usize) -> Vec<Vec<usize>> {
    let mut out = source.to_vec();
    let leaf = out.len();
    out.push(vec![attach]);
    out[attach].push(leaf);
    out
}

fn check_tree(label: &str, adjacency: &[Vec<usize>]) -> bool {
    let n = adjacency.len();
    let source: Vec<[Z; 4]> = (0..n)
        .map(|root| audit_deltas(adjacency, root).0)
        .collect();
    for attach in 0..n {
        let extended = add_leaf(adjacency, attach);
        for root in 0..n {
            let values = audit_deltas(&extended, root).0;
            for rank in 0..4 {
                let increment = values[rank].sub(source[root][rank]);
                if increment.is_negative() {
                    println!(
                        "NEGATIVE_OLD_ROOT_INCREMENT label={} attach={} root={} rank={} value={}",
                        label, attach, root, rank, increment.decimal(),
                    );
                    println!("ADJ {:?}", adjacency);
                    return false;
                }
            }
        }
        let leaf_values = audit_deltas(&extended, n).0;
        for rank in 0..4 {
            if !leaf_values[rank].is_positive() {
                println!(
                    "NONPOSITIVE_NEW_LEAF label={} attach={} rank={} value={}",
                    label, attach, rank, leaf_values[rank].decimal(),
                );
                println!("ADJ {:?}", adjacency);
                return false;
            }
        }
    }
    true
}

fn main() {
    let n = 27_usize;
    let mut path = vec![Vec::new(); n];
    for vertex in 1..n {
        path[vertex - 1].push(vertex);
        path[vertex].push(vertex - 1);
    }
    if !check_tree("path", &path) { return; }

    let mut star = vec![Vec::new(); n];
    for vertex in 1..n {
        star[0].push(vertex);
        star[vertex].push(0);
    }
    if !check_tree("star", &star) { return; }

    let mut state = 0xD1B54A32D192ED03_u64;
    for sample in 0..400_usize {
        let mut code = Vec::with_capacity(n - 2);
        for _ in 0..(n - 2) {
            state ^= state >> 12;
            state ^= state << 25;
            state ^= state >> 27;
            state = state.wrapping_mul(0x2545F4914F6CDD1D);
            code.push((state as usize) % n);
        }
        let adjacency = prufer_tree(&code);
        if !check_tree(&format!("random_{}", sample), &adjacency) { return; }
        if sample % 25 == 24 { eprintln!("PROBE {}/400", sample + 1); }
    }
    println!("NO_OBSTRUCTION_IN_PATH_STAR_AND_400_RANDOM_ORDER27_TREES");
}
