// Exact bounded test of the candidate: subdividing any edge of a pure-cubic
// B2=5 tree once does not decrease any low terminal-broom Newton coefficient
// at any pre-existing root.  New subdivision vertices are checked positive.
mod structural{
    include!("verify_rank7_rooted_cross_b2_4.rs");
    const fn bt()->[[i128;9];16]{let mut a=[[0;9];16];let mut n=0;while n<16{a[n][0]=1;let mut k=1;while k<=8&&k<=n{a[n][k]=a[n-1][k-1]+a[n-1][k];k+=1}n+=1}a}const B:[[i128;9];16]=bt();
    fn sm(c:[i128;8],r:usize,t:usize)->i128{let mut v=0;for l in 0..=r.min(t){v+=B[t][l]*c[r-l]}v}
    fn o8(c:[i128;8],t:usize)->i128{let mut v=0;for l in 1..=8.min(t){v+=B[t][l]*c[8-l]}v}
    fn rv(c:[i128;8],h:[i128;8],s6:i128,s7:i128,o:i128)->i128{let p6=s6+h[5];let p7=s7+h[6];7*c[6]*h[5]*(14*p7*p7-p6*p7-16*p6*o)-7*h[5]*p6*(14*c[7]*c[7]-c[6]*c[7])-8*c[6]*p6*(12*h[6]*h[6]-h[5]*h[6])}
    fn deltas(a:&[Vec<usize>])->Vec<[i128;7]>{let n=a.len();let mut memo=vec![None;n*n];let c=whole(0,a,&mut memo);let mut s6=[0;8];let mut s7=[0;8];let mut oo=[0;8];for t in 1..=8{s6[t-1]=sm(c,6,t);s7[t-1]=sm(c,7,t);oo[t-1]=o8(c,t)}let mut out=Vec::with_capacity(n);for r in 0..n{let h=deletion(r,a,&mut memo);let mut v=[0;8];for t in 0..8{v[t]=rv(c,h,s6[t],s7[t],oo[t])}let mut d=[0;7];for rank in 0..7{d[rank]=v[0];for i in 0..(7-rank){v[i]=v[i+1]-v[i]}}out.push(d)}out}
    fn mapped_root(r:usize,vertices:usize,lengths:&[usize],edge:usize)->usize{if r<vertices{return r}let mut offset=vertices;for (j,&length) in lengths.iter().enumerate(){let count=length-1;if r<offset+count{return if j>edge{r+1}else{r}}offset+=count}panic!("bad root")}
    fn new_vertex(vertices:usize,lengths:&[usize],edge:usize)->usize{vertices+lengths[..edge].iter().map(|x|x-1).sum::<usize>()+lengths[edge]-1}
    struct SubAudit{pairs:u64,min:[i128;7],init:bool,negative:u64,witness:(String,Vec<usize>,usize,usize,usize,i128)}
    impl SubAudit{fn new()->Self{Self{pairs:0,min:[0;7],init:false,negative:0,witness:(String::new(),Vec::new(),0,0,0,0)}}fn tree(&mut self,family:&str,vertices:usize,edges:&[(usize,usize)],l:&[usize]){let old=subdivision(vertices,edges,l);let od=deltas(&old);for edge in 0..l.len(){let mut nl=l.to_vec();nl[edge]+=1;let new=subdivision(vertices,edges,&nl);let nd=deltas(&new);for r in 0..old.len(){let nr=mapped_root(r,vertices,l,edge);for rank in 0..7{let diff=nd[nr][rank]-od[r][rank];if !self.init||diff<self.min[rank]{self.min[rank]=diff;if diff<0{self.witness=(family.to_string(),l.to_vec(),edge,r,rank,diff)}}if diff<0{self.negative+=1}}self.pairs+=1}let q=new_vertex(vertices,l,edge);assert!(nd[q].iter().all(|&x|x>=0))}self.init=true}}
    fn order(n:usize){let total=n-1;let mut a=SubAudit::new();let pe=[(0,1),(1,2),(2,3),(3,4),(0,5),(0,6),(1,7),(2,8),(3,9),(4,10),(4,11)];compositions(total,11,&mut|l|{if l[4]>l[5]||l[9]>l[10]||(l[4],l[5],l[0],l[6],l[1])>(l[9],l[10],l[3],l[8],l[2]){return}a.tree("path",12,&pe,l)});let te=[(0,1),(0,2),(0,3),(3,4),(1,5),(1,6),(2,7),(2,8),(3,9),(4,10),(4,11)];compositions(total,11,&mut|l|{if l[4]>l[5]||l[6]>l[7]||l[9]>l[10]||(l[4],l[5],l[0])>(l[6],l[7],l[1]){return}a.tree("tee",12,&te,l)});println!("order={n} comparisons={} negatives={} minima={:?} witness={:?}",a.pairs,a.negative,a.min,a.witness)}
    pub fn run(n:usize){order(n)}
}
fn main(){let a:Vec<String>=std::env::args().collect();structural::run(a.get(1).and_then(|s|s.parse().ok()).unwrap_or(23))}
