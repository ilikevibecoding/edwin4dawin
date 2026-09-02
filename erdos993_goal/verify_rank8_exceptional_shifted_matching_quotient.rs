// Exact low-memory matching-quotient verifier for the remaining shifted
// rank-eight terminal families.  This enumerates maximum-matching quotient
// expansions of connected tree cores in one fixed (order,alpha) cell, checks
// every root, and proves the literal Q8(G_t) polynomial by its complete
// shifted Newton expansion.  It does not enumerate WROM trees of the core
// order and retains no growing state set.

include!("verify_rank8_pgc_boundary_connected.rs");

const QMAX: usize = 14;

#[derive(Clone)]
struct QuotientTree {
    adjacency: [u16; QMAX],
}

#[derive(Clone)]
struct ShiftSummary {
    order: usize,
    alpha: usize,
    matching: usize,
    unmatched: usize,
    quotient_trees_total: u64,
    quotient_trees_processed: u64,
    singleton_designations: u64,
    endpoint_coverings: u64,
    matching_valid_expansions: u64,
    rooted_checks: u64,
    negative_coefficients: [u64; 16],
    minima: [Option<i128>; 16],
    minimum_root: [usize; 16],
    minimum_adjacency: [[u32; MAX_N]; 16],
}

impl ShiftSummary {
    fn new(order: usize, alpha: usize) -> Self {
        Self {
            order,
            alpha,
            matching: order-alpha,
            unmatched: 2*alpha-order,
            quotient_trees_total: 0,
            quotient_trees_processed: 0,
            singleton_designations: 0,
            endpoint_coverings: 0,
            matching_valid_expansions: 0,
            rooted_checks: 0,
            negative_coefficients: [0; 16],
            minima: [None; 16],
            minimum_root: [0; 16],
            minimum_adjacency: [[0; MAX_N]; 16],
        }
    }
}

fn rooted_mask(
    vertex: usize, parent: usize, adjacency: &[u32; MAX_N], active: u32,
) -> State {
    let mut excluded = one();
    let mut included = x();
    let mut alpha_excluded = 0usize;
    let mut alpha_included = 1usize;
    let mut neighbors = adjacency[vertex] & active;
    if parent != usize::MAX { neighbors &= !(1u32 << parent); }
    while neighbors != 0 {
        let child = neighbors.trailing_zeros() as usize;
        neighbors &= neighbors-1;
        let state = rooted_mask(child, vertex, adjacency, active);
        excluded = multiply(excluded, add(state.excluded, state.included));
        included = multiply(included, state.excluded);
        alpha_excluded += state.alpha_excluded.max(state.alpha_included);
        alpha_included += state.alpha_excluded;
    }
    State { excluded, included, alpha_excluded, alpha_included }
}

fn component_mask(start: usize, adjacency: &[u32; MAX_N], active: u32) -> u32 {
    let mut found = 0u32;
    let mut frontier = 1u32 << start;
    while frontier != 0 {
        let vertex = frontier.trailing_zeros() as usize;
        frontier &= frontier-1;
        let bit = 1u32 << vertex;
        if found & bit != 0 { continue; }
        found |= bit;
        frontier |= adjacency[vertex] & active & !found;
    }
    found
}

fn forest_polynomial_alpha(
    adjacency: &[u32; MAX_N], active: u32,
) -> ([u64; DEG], usize) {
    let mut unseen = active;
    let mut polynomial = one();
    let mut alpha = 0usize;
    while unseen != 0 {
        let root = unseen.trailing_zeros() as usize;
        let vertices = component_mask(root, adjacency, active);
        unseen &= !vertices;
        let state = rooted_mask(root, usize::MAX, adjacency, vertices);
        polynomial = multiply(polynomial, add(state.excluded, state.included));
        alpha += state.alpha_excluded.max(state.alpha_included);
    }
    (polynomial, alpha)
}

fn directed_state(
    vertex: usize, blocked: usize, adjacency: &[u32; MAX_N],
    memo: &mut [[Option<State>; MAX_N]; MAX_N],
) -> State {
    if let Some(state) = memo[vertex][blocked] { return state; }
    let mut excluded = one();
    let mut included = x();
    let mut alpha_excluded = 0usize;
    let mut alpha_included = 1usize;
    let mut neighbors = adjacency[vertex] & !(1u32 << blocked);
    while neighbors != 0 {
        let child = neighbors.trailing_zeros() as usize;
        neighbors &= neighbors-1;
        let state = directed_state(child, vertex, adjacency, memo);
        excluded = multiply(excluded, add(state.excluded, state.included));
        included = multiply(included, state.excluded);
        alpha_excluded += state.alpha_excluded.max(state.alpha_included);
        alpha_included += state.alpha_excluded;
    }
    let state = State { excluded, included, alpha_excluded, alpha_included };
    memo[vertex][blocked] = Some(state);
    state
}

fn all_vertex_deleted_polynomials(
    adjacency: &[u32; MAX_N], order: usize,
) -> [[u64; DEG]; MAX_N] {
    let mut memo = [[None::<State>; MAX_N]; MAX_N];
    let mut deleted = [[0u64; DEG]; MAX_N];
    for vertex in 0..order {
        let mut inside = one();
        let mut neighbors = adjacency[vertex];
        while neighbors != 0 {
            let child = neighbors.trailing_zeros() as usize;
            neighbors &= neighbors-1;
            let state = directed_state(child, vertex, adjacency, &mut memo);
            inside = multiply(inside, add(state.excluded, state.included));
        }
        deleted[vertex] = inside;
    }
    deleted
}

const fn binomial_table() -> [[i128; 10]; 32] {
    let mut table = [[0i128; 10]; 32];
    let mut n = 0usize;
    while n < 32 {
        table[n][0] = 1;
        let mut k = 1usize;
        while k < 10 {
            if k <= n {
                table[n][k] = if k == n { 1 } else { table[n-1][k-1]+table[n-1][k] };
            }
            k += 1;
        }
        n += 1;
    }
    table
}

const BINOMIAL: [[i128; 10]; 32] = binomial_table();

fn terminal_bases(c: &[u64; DEG], t0: usize) -> [[i128; 3]; 17] {
    let mut bases = [[0i128; 3]; 17];
    for shift in 0..=16 {
        let t = t0+shift;
        for (column, rank) in [7usize,8,9].iter().enumerate() {
            let mut value = 0i128;
            for ell in 0..=*rank {
                value += BINOMIAL[t][ell] * c[*rank-ell] as i128;
            }
            bases[shift][column] = value;
        }
    }
    bases
}

fn shifted_coefficients(bases: &[[i128; 3]; 17], h: &[u64; DEG]) -> [i128; 16] {
    let mut values: Vec<i128> = bases.iter().map(|base| {
        let p7 = base[0]+h[6] as i128;
        let p8 = base[1]+h[7] as i128;
        let p9 = base[2]+h[8] as i128;
        16*p8*p8-p7*p8-18*p7*p9
    }).collect();
    let mut coefficients = [0i128; 16];
    for level in 0..=16 {
        if level < 16 { coefficients[level] = values[0]; }
        if values.len() > 1 {
            values = values.windows(2).map(|pair| pair[1]-pair[0]).collect();
        }
    }
    assert_eq!(values, vec![0i128]);
    coefficients
}

fn audit_expanded_tree(adjacency: &[u32; MAX_N], summary: &mut ShiftSummary) {
    let active = (1u32 << summary.order)-1;
    let (full, alpha) = forest_polynomial_alpha(adjacency, active);
    assert_eq!(alpha, summary.alpha);
    assert_eq!(component_mask(0, adjacency, active), active);
    let edge_twice: u32 = adjacency[..summary.order].iter().map(|row| row.count_ones()).sum();
    assert_eq!(edge_twice as usize, 2*(summary.order-1));
    summary.matching_valid_expansions += 1;
    let deleted = all_vertex_deleted_polynomials(adjacency, summary.order);
    let t0 = 14-summary.alpha;
    let bases = terminal_bases(&full, t0);
    for root in 0..summary.order {
        let coefficients = shifted_coefficients(&bases, &deleted[root]);
        summary.rooted_checks += 1;
        for rank in 0..16 {
            let value = coefficients[rank];
            if value < 0 { summary.negative_coefficients[rank] += 1; }
            if summary.minima[rank].is_none() || value < summary.minima[rank].unwrap() {
                summary.minima[rank] = Some(value);
                summary.minimum_root[rank] = root;
                summary.minimum_adjacency[rank] = *adjacency;
            }
        }
    }
}

fn quotient_path(
    quotient: &[u16; QMAX], order: usize, start: usize, target: usize,
) -> Option<Vec<usize>> {
    let mut parent = [usize::MAX; QMAX];
    let mut stack = vec![start];
    parent[start] = start;
    while let Some(vertex) = stack.pop() {
        if vertex == target { break; }
        let mut neighbors = quotient[vertex];
        while neighbors != 0 {
            let neighbor = neighbors.trailing_zeros() as usize;
            neighbors &= neighbors-1;
            if neighbor >= order || parent[neighbor] != usize::MAX { continue; }
            parent[neighbor] = vertex;
            stack.push(neighbor);
        }
    }
    if parent[target] == usize::MAX { return None; }
    let mut reverse = vec![target];
    let mut vertex = target;
    while vertex != start {
        vertex = parent[vertex];
        reverse.push(vertex);
    }
    reverse.reverse();
    Some(reverse)
}

fn valid_matching_patterns(
    quotient: &[u16; QMAX], order: usize, singleton_mask: u16,
    edges: &[(usize, usize)], first_bit: &[Option<usize>],
    second_bit: &[Option<usize>], free: usize,
) -> Vec<bool> {
    let singletons: Vec<usize> = (0..order)
        .filter(|&v| singleton_mask & (1u16 << v) != 0)
        .collect();
    let edge_index = |u: usize, v: usize| -> usize {
        edges.iter().position(|&(a,b)| (a==u && b==v)||(a==v && b==u)).unwrap()
    };
    let endpoint_bit = |index: usize, vertex: usize| -> Option<usize> {
        if edges[index].0 == vertex { first_bit[index] } else { second_bit[index] }
    };
    let mut constraints = Vec::<Vec<(Option<usize>,Option<usize>)>>::new();
    for first in 0..singletons.len() {
        for second in (first+1)..singletons.len() {
            let path = quotient_path(quotient, order, singletons[first], singletons[second]).unwrap();
            if path[1..path.len()-1].iter().any(|&v| singleton_mask&(1u16<<v)!=0) { continue; }
            let mut row = Vec::new();
            for position in 1..path.len()-1 {
                let vertex = path[position];
                row.push((
                    endpoint_bit(edge_index(path[position-1],vertex),vertex),
                    endpoint_bit(edge_index(vertex,path[position+1]),vertex),
                ));
            }
            assert!(!row.is_empty());
            constraints.push(row);
        }
    }
    let bit_value = |coordinate: Option<usize>, pattern: u64| -> u64 {
        coordinate.map(|bit|(pattern>>bit)&1).unwrap_or(0)
    };
    (0u64..(1u64<<free)).map(|pattern| {
        !constraints.iter().any(|row| row.iter().all(|&(left,right)|
            bit_value(left,pattern) != bit_value(right,pattern)))
    }).collect()
}

fn collect_quotient_trees(order: usize) -> Vec<QuotientTree> {
    let mut trees = Vec::new();
    if order == 1 { return vec![QuotientTree { adjacency: [0;QMAX] }]; }
    let mut initial = [0u8; MAX_N];
    for (index, level) in (0..=(order/2)).chain(1..((order+1)/2)).enumerate() {
        initial[index] = level as u8;
    }
    let mut layout: Option<[u8; MAX_N]> = Some(initial);
    while let Some(candidate) = layout {
        layout = next_tree_fixed(candidate, order);
        if let Some(valid) = layout {
            let graph = adjacency_from_layout(&valid[..order]);
            let mut adjacency = [0u16; QMAX];
            for vertex in 0..order {
                for &neighbor in &graph[vertex] { adjacency[vertex] |= 1u16 << neighbor; }
            }
            trees.push(QuotientTree { adjacency });
            layout = next_rooted_fixed(valid, order, None);
        }
    }
    assert_eq!(trees.len() as u64, TREE_COUNTS[order]);
    trees
}

fn process_singletons(
    quotient: &[u16;QMAX], singleton_mask: u16, summary: &mut ShiftSummary,
) {
    summary.singleton_designations += 1;
    let q = summary.alpha;
    let mut first = [usize::MAX;QMAX];
    let mut second = [usize::MAX;QMAX];
    let mut next = 0usize;
    for vertex in 0..q {
        if singleton_mask&(1u16<<vertex)!=0 {
            first[vertex]=next; next+=1;
        } else {
            first[vertex]=next; second[vertex]=next+1; next+=2;
        }
    }
    assert_eq!(next, summary.order);
    let mut edges=Vec::<(usize,usize)>::new();
    for u in 0..q {
        let mut neighbors=quotient[u];
        while neighbors!=0 {
            let v=neighbors.trailing_zeros() as usize; neighbors&=neighbors-1;
            if u<v { edges.push((u,v)); }
        }
    }
    assert_eq!(edges.len(),q-1);
    let mut seen=[false;QMAX];
    let mut first_bit=vec![None::<usize>;edges.len()];
    let mut second_bit=vec![None::<usize>;edges.len()];
    let mut free=0usize;
    for (index,&(u,v)) in edges.iter().enumerate() {
        if singleton_mask&(1u16<<u)==0 {
            if seen[u] { first_bit[index]=Some(free); free+=1; } else { seen[u]=true; }
        }
        if singleton_mask&(1u16<<v)==0 {
            if seen[v] { second_bit[index]=Some(free); free+=1; } else { seen[v]=true; }
        }
    }
    assert!(free<=QMAX-2);
    let valid=valid_matching_patterns(quotient,q,singleton_mask,&edges,&first_bit,&second_bit,free);
    for pattern in 0u64..(1u64<<free) {
        summary.endpoint_coverings+=1;
        if !valid[pattern as usize] { continue; }
        let mut adjacency=[0u32;MAX_N];
        for vertex in 0..q {
            if second[vertex]!=usize::MAX {
                adjacency[first[vertex]]|=1u32<<second[vertex];
                adjacency[second[vertex]]|=1u32<<first[vertex];
            }
        }
        for (index,&(u,v)) in edges.iter().enumerate() {
            let ub=first_bit[index].map(|bit|((pattern>>bit)&1)as usize).unwrap_or(0);
            let vb=second_bit[index].map(|bit|((pattern>>bit)&1)as usize).unwrap_or(0);
            let eu=if ub==0{first[u]}else{second[u]};
            let ev=if vb==0{first[v]}else{second[v]};
            adjacency[eu]|=1u32<<ev; adjacency[ev]|=1u32<<eu;
        }
        audit_expanded_tree(&adjacency,summary);
    }
}

fn choose_singletons(
    quotient:&[u16;QMAX],start:usize,left:usize,selected:u16,summary:&mut ShiftSummary,
) {
    if left==0 { process_singletons(quotient,selected,summary); return; }
    let q=summary.alpha;
    if q-start<left { return; }
    for vertex in start..=(q-left) {
        if quotient[vertex]&selected!=0 { continue; }
        choose_singletons(quotient,vertex+1,left-1,selected|(1u16<<vertex),summary);
    }
}

fn option_array_text(values:&[Option<i128>;16])->String {
    let body=values.iter().map(|v|v.unwrap_or(0).to_string()).collect::<Vec<_>>().join(",");
    format!("[{}]",body)
}

fn u64_array_text(values:&[u64;16])->String {
    format!("[{}]",values.iter().map(|v|v.to_string()).collect::<Vec<_>>().join(","))
}

#[cfg(rank8_boundary_library)]
fn main() {
    let arguments:Vec<String>=env::args().collect();
    let mut order=26usize; let mut alpha=13usize; let mut shard_index=0u64; let mut shard_count=1u64;
    let mut index=1usize;
    while index<arguments.len() {
        match arguments[index].as_str() {
            "--order"=>{index+=1;order=arguments[index].parse().unwrap();},
            "--alpha"=>{index+=1;alpha=arguments[index].parse().unwrap();},
            "--shard-index"=>{index+=1;shard_index=arguments[index].parse().unwrap();},
            "--shard-count"=>{index+=1;shard_count=arguments[index].parse().unwrap();},
            other=>panic!("unknown argument {}",other),
        }
        index+=1;
    }
    assert!((11..=13).contains(&alpha));
    assert!(alpha<=order && order<=2*alpha);
    assert!(order>=21 && order<=26);
    assert!(shard_count>=1 && shard_index<shard_count);
    let trees=collect_quotient_trees(alpha);
    let mut summary=ShiftSummary::new(order,alpha);
    summary.quotient_trees_total=trees.len() as u64;
    for (tree_index,tree) in trees.iter().enumerate() {
        if tree_index as u64%shard_count!=shard_index {continue;}
        summary.quotient_trees_processed+=1;
        choose_singletons(&tree.adjacency,0,summary.unmatched,0,&mut summary);
    }
    assert!(summary.negative_coefficients.iter().all(|&value|value==0));
    println!(
        "QSHIFT order={} alpha={} matching={} unmatched={} quotient_total={} quotient_processed={} singleton_designations={} endpoint_coverings={} valid_expansions={} rooted_checks={} negatives={} minima={}",
        summary.order,summary.alpha,summary.matching,summary.unmatched,
        summary.quotient_trees_total,summary.quotient_trees_processed,
        summary.singleton_designations,summary.endpoint_coverings,
        summary.matching_valid_expansions,summary.rooted_checks,
        u64_array_text(&summary.negative_coefficients),option_array_text(&summary.minima),
    );
    println!("PASS_EXACT_RANK8_EXCEPTIONAL_SHIFTED_MATCHING_QUOTIENT_ORDER_{}_ALPHA_{}_SHARD_{}_OF_{}",order,alpha,shard_index,shard_count);
}
