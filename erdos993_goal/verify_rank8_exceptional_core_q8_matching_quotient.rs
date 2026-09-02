// Exact low-memory Q8 audit for the six possible alpha=11,12 core cells
// beyond the existing order-20 forest-polynomial census.  The matching-
// quotient primitives are reused inside a module so their executable entry
// point is inert here.

mod shifted {
    include!("verify_rank8_exceptional_shifted_matching_quotient.rs");

    use std::collections::BTreeSet;

    #[derive(Clone)]
    struct CoreSummary {
        order: usize,
        alpha: usize,
        quotient_total: u64,
        quotient_processed: u64,
        singleton_designations: u64,
        endpoint_coverings: u64,
        valid_expansions: u64,
        q8_negative_with_multiplicity: u64,
        minimum_q8: Option<i128>,
        minimum_full: [u64; DEG],
        negative_jets: BTreeSet<[u64; DEG]>,
    }

    impl CoreSummary {
        fn new(order: usize, alpha: usize) -> Self {
            Self {
                order, alpha,
                quotient_total: 0, quotient_processed: 0,
                singleton_designations: 0, endpoint_coverings: 0,
                valid_expansions: 0, q8_negative_with_multiplicity: 0,
                minimum_q8: None, minimum_full: [0; DEG],
                negative_jets: BTreeSet::new(),
            }
        }
    }

    fn audit_core(adjacency: &[u32; MAX_N], summary: &mut CoreSummary) {
        let active = (1u32 << summary.order)-1;
        let (full, alpha) = forest_polynomial_alpha(adjacency, active);
        assert_eq!(alpha, summary.alpha);
        assert_eq!(component_mask(0, adjacency, active), active);
        let edge_twice: u32 = adjacency[..summary.order]
            .iter().map(|row| row.count_ones()).sum();
        assert_eq!(edge_twice as usize, 2*(summary.order-1));
        let p7 = full[7] as i128;
        let p8 = full[8] as i128;
        let p9 = full[9] as i128;
        let value = 16*p8*p8-p7*p8-18*p7*p9;
        summary.valid_expansions += 1;
        if value < 0 {
            summary.q8_negative_with_multiplicity += 1;
            summary.negative_jets.insert(full);
        }
        if summary.minimum_q8.is_none() || value < summary.minimum_q8.unwrap() {
            summary.minimum_q8 = Some(value);
            summary.minimum_full = full;
        }
    }

    fn process_core_singletons(
        quotient: &[u16;QMAX], singleton_mask: u16, summary: &mut CoreSummary,
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
        let valid=valid_matching_patterns(
            quotient,q,singleton_mask,&edges,&first_bit,&second_bit,free,
        );
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
            audit_core(&adjacency,summary);
        }
    }

    fn choose_core_singletons(
        quotient:&[u16;QMAX], start:usize, left:usize, selected:u16,
        summary:&mut CoreSummary,
    ) {
        if left==0 { process_core_singletons(quotient,selected,summary); return; }
        let q=summary.alpha;
        if q-start<left { return; }
        for vertex in start..=(q-left) {
            if quotient[vertex]&selected!=0 { continue; }
            choose_core_singletons(
                quotient,vertex+1,left-1,selected|(1u16<<vertex),summary,
            );
        }
    }

    pub fn core_main() {
        let arguments:Vec<String>=env::args().collect();
        let mut order=24usize; let mut alpha=12usize;
        let mut index=1usize;
        while index<arguments.len() {
            match arguments[index].as_str() {
                "--order"=>{index+=1;order=arguments[index].parse().unwrap();},
                "--alpha"=>{index+=1;alpha=arguments[index].parse().unwrap();},
                other=>panic!("unknown argument {}",other),
            }
            index+=1;
        }
        assert!((11..=12).contains(&alpha));
        assert!(order>=21 && order<=24 && alpha<=order && order<=2*alpha);
        let trees=collect_quotient_trees(alpha);
        let mut summary=CoreSummary::new(order,alpha);
        summary.quotient_total=trees.len() as u64;
        for tree in &trees {
            summary.quotient_processed+=1;
            let unmatched=2*alpha-order;
            choose_core_singletons(&tree.adjacency,0,unmatched,0,&mut summary);
        }
        println!(
            "COREQ8 order={} alpha={} quotient_total={} quotient_processed={} singleton_designations={} endpoint_coverings={} valid_expansions={} q8_negative_with_multiplicity={} distinct_negative_jets={} minimum_q8={} minimum_full=[{}]",
            summary.order,summary.alpha,summary.quotient_total,
            summary.quotient_processed,summary.singleton_designations,
            summary.endpoint_coverings,summary.valid_expansions,
            summary.q8_negative_with_multiplicity,summary.negative_jets.len(),
            summary.minimum_q8.unwrap(),array_text(&summary.minimum_full),
        );
        for jet in &summary.negative_jets {
            println!("NEGATIVE_JET alpha={} full=[{}]",alpha,array_text(jet));
        }
        println!(
            "PASS_EXACT_RANK8_EXCEPTIONAL_CORE_Q8_MATCHING_QUOTIENT_ORDER_{}_ALPHA_{}",
            order,alpha,
        );
    }
}

fn main() { shifted::core_main(); }
