// Exact terminal-broom Newton certificate for the B2=5 trees containing a
// degree-four vertex.  There are exactly two suppressed mixed skeletons.
mod structural {
    include!("verify_rank7_rooted_cross_b2_4.rs");

    const fn binomial_table() -> [[i128;9];16] {
        let mut table=[[0i128;9];16]; let mut n=0;
        while n<16 { table[n][0]=1; let mut k=1; while k<=8 && k<=n { table[n][k]=table[n-1][k-1]+table[n-1][k]; k+=1; } n+=1; }
        table
    }
    const BINOMIAL:[[i128;9];16]=binomial_table();
    fn smooth(c:[i128;8],rank:usize,t:usize)->i128{let mut v=0;for l in 0..=rank.min(t){v+=BINOMIAL[t][l]*c[rank-l]}v}
    fn outer_eight(c:[i128;8],t:usize)->i128{let mut v=0;for l in 1..=8.min(t){v+=BINOMIAL[t][l]*c[8-l]}v}
    fn residual(c:[i128;8],h:[i128;8],s6:i128,s7:i128,p8o:i128)->i128{
        let p6=s6+h[5];let p7=s7+h[6];
        7*c[6]*h[5]*(14*p7*p7-p6*p7-16*p6*p8o)
        -7*h[5]*p6*(14*c[7]*c[7]-c[6]*c[7])
        -8*c[6]*p6*(12*h[6]*h[6]-h[5]*h[6])
    }

    struct ResidualAudit{trees:u64,roots:u64,minima:[i128;14],initialized:bool}
    impl ResidualAudit{
        fn new()->Self{Self{trees:0,roots:0,minima:[0;14],initialized:false}}
        fn check(&mut self,a:&[Vec<usize>]){
            assert_eq!(b2(a),5);let n=a.len();let mut memo=vec![None;n*n];let c=whole(0,a,&mut memo);
            let mut s6=[0i128;15];let mut s7=[0i128;15];let mut o8=[0i128;15];
            for t in 1..=15{s6[t-1]=smooth(c,6,t);s7[t-1]=smooth(c,7,t);o8[t-1]=outer_eight(c,t)}
            self.trees+=1;
            for root in 0..n{
                let h=deletion(root,a,&mut memo);let mut values=[0i128;15];
                for t in 0..15{values[t]=residual(c,h,s6[t],s7[t],o8[t])}
                let mut differences=[0i128;14];
                for rank in 0..14{differences[rank]=values[0];for index in 0..(14-rank){values[index]=values[index+1]-values[index]}}
                if !self.initialized{self.minima=differences;self.initialized=true}else{for rank in 0..14{self.minima[rank]=self.minima[rank].min(differences[rank])}}
                assert!(differences.iter().all(|&v|v>=0));self.roots+=1;
            }
        }
    }

    fn verify_residual_order(n:usize){
        let total=n-1;let mut middle=ResidualAudit::new();let mut end=ResidualAudit::new();
        // Degree four in the middle of the three branch vertices.  The two
        // degree-three sides are exchangeable, as are every leaf-arm pair.
        let middle_edges=[(0,1),(0,2),(0,3),(0,4),(1,5),(1,6),(2,7),(2,8)];
        compositions(total,8,&mut|l|{
            if l[2]>l[3]||l[4]>l[5]||l[6]>l[7]||(l[4],l[5],l[0])>(l[6],l[7],l[1]){return}
            let a=subdivision(9,&middle_edges,l);assert_eq!(a.len(),n);middle.check(&a)
        });
        // Degree four at one end of the branch path.  Its three leaf arms
        // are unordered; the two leaf arms at the other end are unordered.
        let end_edges=[(0,1),(1,2),(0,3),(0,4),(0,5),(1,6),(2,7),(2,8)];
        compositions(total,8,&mut|l|{
            if !(l[2]<=l[3]&&l[3]<=l[4]&&l[6]<=l[7]){return}
            let a=subdivision(9,&end_edges,l);assert_eq!(a.len(),n);end.check(&a)
        });
        assert!(middle.initialized&&end.initialized);let mut minima=middle.minima;
        for rank in 0..14{minima[rank]=minima[rank].min(end.minima[rank])}
        println!("order={n} trees={} middle_trees={} end_trees={} roots={} minima={:?}",middle.trees+end.trees,middle.trees,end.trees,middle.roots+end.roots,minima);
    }
    pub fn run(first:usize,last:usize){for n in first..=last{verify_residual_order(n)}println!("PASS_EXACT_RANK7_TERMINAL_BROOM_B2_5_MIXED_ORDERS_{first}_THROUGH_{last}")}
}
fn main(){let args:Vec<String>=std::env::args().collect();let first=args.get(1).and_then(|s|s.parse().ok()).unwrap_or(23);let last=args.get(2).and_then(|s|s.parse().ok()).unwrap_or(38);structural::run(first,last)}
