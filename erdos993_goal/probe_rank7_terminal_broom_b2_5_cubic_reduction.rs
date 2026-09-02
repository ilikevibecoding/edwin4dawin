// Exact witness probe for the two pure-cubic B2=5 suppressed skeletons.
// Intended for bounded structural-reduction experiments, not a full census.
mod structural {
    include!("verify_rank7_rooted_cross_b2_4.rs");
    const fn bt()->[[i128;9];16]{let mut a=[[0;9];16];let mut n=0;while n<16{a[n][0]=1;let mut k=1;while k<=8&&k<=n{a[n][k]=a[n-1][k-1]+a[n-1][k];k+=1}n+=1}a}
    const B:[[i128;9];16]=bt();
    fn sm(c:[i128;8],r:usize,t:usize)->i128{let mut v=0;for l in 0..=r.min(t){v+=B[t][l]*c[r-l]}v}
    fn o8(c:[i128;8],t:usize)->i128{let mut v=0;for l in 1..=8.min(t){v+=B[t][l]*c[8-l]}v}
    fn residual(c:[i128;8],h:[i128;8],s6:i128,s7:i128,o:i128)->i128{let p6=s6+h[5];let p7=s7+h[6];7*c[6]*h[5]*(14*p7*p7-p6*p7-16*p6*o)-7*h[5]*p6*(14*c[7]*c[7]-c[6]*c[7])-8*c[6]*p6*(12*h[6]*h[6]-h[5]*h[6])}
    struct RA{trees:u64,roots:u64,min:[i128;14],lens:[Vec<usize>;14],root:[usize;14],init:bool}
    impl RA{
        fn new()->Self{Self{trees:0,roots:0,min:[0;14],lens:std::array::from_fn(|_|Vec::new()),root:[0;14],init:false}}
        fn check(&mut self,a:&[Vec<usize>],l:&[usize]){assert_eq!(b2(a),5);let n=a.len();let mut memo=vec![None;n*n];let c=whole(0,a,&mut memo);let mut s6=[0;15];let mut s7=[0;15];let mut oo=[0;15];for t in 1..=15{s6[t-1]=sm(c,6,t);s7[t-1]=sm(c,7,t);oo[t-1]=o8(c,t)}self.trees+=1;for r in 0..n{let h=deletion(r,a,&mut memo);let mut v=[0;15];for t in 0..15{v[t]=residual(c,h,s6[t],s7[t],oo[t])}for rank in 0..14{let d=v[0];if !self.init||d<self.min[rank]{self.min[rank]=d;self.lens[rank]=l.to_vec();self.root[rank]=r}for i in 0..(14-rank){v[i]=v[i+1]-v[i]}}self.init=true;self.roots+=1}}
    }
    fn order(n:usize){let total=n-1;let mut path=RA::new();let mut tee=RA::new();
        let pe=[(0,1),(1,2),(2,3),(3,4),(0,5),(0,6),(1,7),(2,8),(3,9),(4,10),(4,11)];
        compositions(total,11,&mut|l|{if l[4]>l[5]||l[9]>l[10]||(l[4],l[5],l[0],l[6],l[1])>(l[9],l[10],l[3],l[8],l[2]){return}let a=subdivision(12,&pe,l);path.check(&a,l)});
        let te=[(0,1),(0,2),(0,3),(3,4),(1,5),(1,6),(2,7),(2,8),(3,9),(4,10),(4,11)];
        compositions(total,11,&mut|l|{if l[4]>l[5]||l[6]>l[7]||l[9]>l[10]||(l[4],l[5],l[0])>(l[6],l[7],l[1]){return}let a=subdivision(12,&te,l);tee.check(&a,l)});
        println!("order={n} path_trees={} tee_trees={} roots={}",path.trees,tee.trees,path.roots+tee.roots);
        for rank in 0..14{let (family,a)=if path.min[rank]<=tee.min[rank]{("path",&path)}else{("tee",&tee)};println!("rank={rank} min={} family={family} lengths={:?} root={}",a.min[rank],a.lens[rank],a.root[rank])}
    }
    pub fn run(first:usize,last:usize){for n in first..=last{order(n)}}
}
fn main(){let a:Vec<String>=std::env::args().collect();let f=a.get(1).and_then(|s|s.parse().ok()).unwrap_or(23);let l=a.get(2).and_then(|s|s.parse().ok()).unwrap_or(f);structural::run(f,l)}
