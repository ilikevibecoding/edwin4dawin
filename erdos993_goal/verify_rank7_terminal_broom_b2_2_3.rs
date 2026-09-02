// Exact terminal-broom Newton certificate for every B2=2 or B2=3 tree.
// Reuse the independently replayed suppressed-skeleton generator and rooted
// independence-polynomial engine from the rooted-C7 certificate.
mod structural {
    include!("verify_rank7_rooted_cross_b2_2_3.rs");

    fn choose(n:usize,k:usize)->i128{if k>n{return 0}let mut v=1i128;for j in 0..k{v=v*(n-j)as i128/(j+1)as i128}v}
    fn smooth(c:[i128;8],r:usize,t:usize)->i128{let mut v=0;for l in 0..=r.min(t){v+=choose(t,l)*c[r-l]}v}
    fn residual(c:[i128;8],h:[i128;8],t:usize)->i128{
        let p6=smooth(c,6,t)+h[5];let p7=smooth(c,7,t)+h[6];let mut p8o=0;
        for l in 1..=8.min(t){p8o+=choose(t,l)*c[8-l]}
        7*c[6]*h[5]*(14*p7*p7-p6*p7-16*p6*p8o)
        -7*h[5]*p6*(14*c[7]*c[7]-c[6]*c[7])
        -8*c[6]*p6*(12*h[6]*h[6]-h[5]*h[6])
    }
    struct ResidualAudit{trees:u64,roots:u64,minima:[i128;14],initialized:bool}
    impl ResidualAudit{
        fn new()->Self{Self{trees:0,roots:0,minima:[0;14],initialized:false}}
        fn check(&mut self,a:&[Vec<usize>]){
            let n=a.len();let mut memo=vec![None;n*n];let polynomial=whole(0,a,&mut memo);self.trees+=1;
            for root in 0..n{
                let deleted=deletion(root,a,&mut memo);
                let mut values:Vec<i128>=(1..=15).map(|t|residual(polynomial,deleted,t)).collect();let mut differences=[0i128;14];
                for rank in 0..14{differences[rank]=values[0];values=values.windows(2).map(|p|p[1]-p[0]).collect();}
                if !self.initialized{self.minima=differences;self.initialized=true}else{for rank in 0..14{self.minima[rank]=self.minima[rank].min(differences[rank]);}}
                assert!(differences.iter().all(|&v|v>=0));self.roots+=1;
            }
        }
    }
    fn verify_residual_order(order:usize){
        let total=order-1;let mut two=ResidualAudit::new();let mut star=ResidualAudit::new();let mut chain=ResidualAudit::new();
        let two_edges=[(0,1),(0,2),(0,3),(1,4),(1,5)];
        compositions(total,5,&mut|l|{let(a1,a2,b1,b2)=(l[1],l[2],l[3],l[4]);if a1>a2||b1>b2||(a1,a2)>(b1,b2){return}let a=subdivision(6,&two_edges,l);assert_eq!(b2_value(&a),2);two.check(&a)});
        let star_edges=[(0,1),(0,2),(0,3),(0,4)];
        compositions(total,4,&mut|l|{if !(l[0]<=l[1]&&l[1]<=l[2]&&l[2]<=l[3]){return}let a=subdivision(5,&star_edges,l);assert_eq!(b2_value(&a),3);star.check(&a)});
        let chain_edges=[(0,1),(1,2),(0,3),(0,4),(1,5),(2,6),(2,7)];
        compositions(total,7,&mut|l|{let(u,v,a1,a2,b1,b2)=(l[0],l[1],l[2],l[3],l[5],l[6]);if a1>a2||b1>b2||(a1,a2,u)>(b1,b2,v){return}let a=subdivision(8,&chain_edges,l);assert_eq!(b2_value(&a),3);chain.check(&a)});
        let mut three=star.minima;for rank in 0..14{three[rank]=three[rank].min(chain.minima[rank]);}
        println!("order={order} b2=2 trees={} roots={} minima={:?}",two.trees,two.roots,two.minima);
        println!("order={order} b2=3 trees={} roots={} minima={:?}",star.trees+chain.trees,star.roots+chain.roots,three);
    }
    fn b2_value(a:&[Vec<usize>])->usize{a.iter().map(|v|{let x=v.len().saturating_sub(1);x*x.saturating_sub(1)/2}).sum()}
    pub fn run(first:usize,last:usize){for n in first..=last{verify_residual_order(n)}println!("PASS_EXACT_RANK7_TERMINAL_BROOM_B2_2_3_ORDERS_{first}_THROUGH_{last}")}
}
fn main(){let a:Vec<String>=std::env::args().collect();let first=a.get(1).and_then(|v|v.parse().ok()).unwrap_or(23);let last=a.get(2).and_then(|v|v.parse().ok()).unwrap_or(38);structural::run(first,last)}
