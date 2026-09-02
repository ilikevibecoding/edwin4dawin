// Exact terminal-broom Newton certificate for every B2=4 tree.
// Reuse the independently replayed suppressed-skeleton generator and rooted
// independence-polynomial engine from the rooted-C7 certificate.
mod structural {
    include!("verify_rank7_rooted_cross_b2_4.rs");

    const fn binomial_table() -> [[i128;9];16] {
        let mut table = [[0i128;9];16];
        let mut n = 0;
        while n < 16 {
            table[n][0] = 1;
            let mut k = 1;
            while k <= 8 && k <= n {
                table[n][k] = table[n-1][k-1] + table[n-1][k];
                k += 1;
            }
            n += 1;
        }
        table
    }
    const BINOMIAL: [[i128;9];16] = binomial_table();
    fn smooth(c: [i128;8], rank: usize, t: usize) -> i128 {
        let mut value = 0;
        for l in 0..=rank.min(t) { value += BINOMIAL[t][l] * c[rank-l]; }
        value
    }
    fn outer_eight(c: [i128;8], t: usize) -> i128 {
        let mut value = 0;
        for l in 1..=8.min(t) { value += BINOMIAL[t][l] * c[8-l]; }
        value
    }
    fn residual(c: [i128;8], h: [i128;8], smooth6: i128, smooth7: i128, p8o: i128) -> i128 {
        let p6 = smooth6 + h[5];
        let p7 = smooth7 + h[6];
        7*c[6]*h[5]*(14*p7*p7-p6*p7-16*p6*p8o)
            - 7*h[5]*p6*(14*c[7]*c[7]-c[6]*c[7])
            - 8*c[6]*p6*(12*h[6]*h[6]-h[5]*h[6])
    }

    struct ResidualAudit {
        trees: u64,
        roots: u64,
        minima: [i128;14],
        initialized: bool,
    }
    impl ResidualAudit {
        fn new() -> Self { Self { trees:0, roots:0, minima:[0;14], initialized:false } }
        fn check(&mut self, a: &[Vec<usize>]) {
            let n = a.len();
            let mut memo = vec![None; n*n];
            let polynomial = whole(0,a,&mut memo);
            let mut smooth6 = [0i128;15];
            let mut smooth7 = [0i128;15];
            let mut outer8 = [0i128;15];
            for t in 1..=15 {
                smooth6[t-1] = smooth(polynomial,6,t);
                smooth7[t-1] = smooth(polynomial,7,t);
                outer8[t-1] = outer_eight(polynomial,t);
            }
            self.trees += 1;
            for root in 0..n {
                let deleted = deletion(root,a,&mut memo);
                let mut values = [0i128;15];
                for t in 0..15 { values[t] = residual(polynomial,deleted,smooth6[t],smooth7[t],outer8[t]); }
                let mut differences = [0i128;14];
                for rank in 0..14 {
                    differences[rank] = values[0];
                    for index in 0..(14-rank) { values[index] = values[index+1]-values[index]; }
                }
                if !self.initialized {
                    self.minima = differences;
                    self.initialized = true;
                } else {
                    for rank in 0..14 { self.minima[rank] = self.minima[rank].min(differences[rank]); }
                }
                assert!(differences.iter().all(|&value| value >= 0));
                self.roots += 1;
            }
        }
    }

    fn verify_residual_order(n: usize) {
        let total = n-1;
        let mut mixed = ResidualAudit::new();
        let mut path = ResidualAudit::new();
        let mut star = ResidualAudit::new();

        let mixed_edges=[(0,1),(0,2),(0,3),(0,4),(1,5),(1,6)];
        compositions(total,6,&mut|lengths| {
            if !(lengths[1]<=lengths[2] && lengths[2]<=lengths[3] && lengths[4]<=lengths[5]) { return; }
            let a=subdivision(7,&mixed_edges,lengths);
            assert_eq!(a.len(),n); assert_eq!(b2(&a),4);
            mixed.check(&a);
        });

        let path_edges=[(0,1),(1,2),(2,3),(0,4),(0,5),(1,6),(2,7),(3,8),(3,9)];
        compositions(total,9,&mut|lengths| {
            let(u,_v,w,a1,a2,b,c,d1,d2)=(lengths[0],lengths[1],lengths[2],lengths[3],lengths[4],lengths[5],lengths[6],lengths[7],lengths[8]);
            if a1>a2 || d1>d2 || (a1,a2,u,b)>(d1,d2,w,c) { return; }
            let a=subdivision(10,&path_edges,lengths);
            assert_eq!(a.len(),n); assert_eq!(b2(&a),4);
            path.check(&a);
        });

        let star_edges=[(0,1),(1,4),(1,5),(0,2),(2,6),(2,7),(0,3),(3,8),(3,9)];
        compositions(total,9,&mut|lengths| {
            let descriptors=[(lengths[1],lengths[2],lengths[0]),(lengths[4],lengths[5],lengths[3]),(lengths[7],lengths[8],lengths[6])];
            if descriptors.iter().any(|&(left,right,_)| left>right) { return; }
            if !(descriptors[0]<=descriptors[1] && descriptors[1]<=descriptors[2]) { return; }
            let a=subdivision(10,&star_edges,lengths);
            assert_eq!(a.len(),n); assert_eq!(b2(&a),4);
            star.check(&a);
        });

        assert!(mixed.initialized && path.initialized && star.initialized);
        let mut minima=mixed.minima;
        for rank in 0..14 { minima[rank]=minima[rank].min(path.minima[rank]).min(star.minima[rank]); }
        println!("order={n} trees={} mixed_trees={} path_trees={} star_trees={} roots={} minima={:?}",
            mixed.trees+path.trees+star.trees,mixed.trees,path.trees,star.trees,mixed.roots+path.roots+star.roots,minima);
    }

    pub fn run(first: usize, last: usize) {
        for n in first..=last { verify_residual_order(n); }
        println!("PASS_EXACT_RANK7_TERMINAL_BROOM_B2_4_ORDERS_{first}_THROUGH_{last}");
    }
}

fn main() {
    let args: Vec<String> = std::env::args().collect();
    let first=args.get(1).and_then(|value|value.parse().ok()).unwrap_or(23);
    let last=args.get(2).and_then(|value|value.parse().ok()).unwrap_or(38);
    structural::run(first,last);
}
