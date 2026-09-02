// Exact exhaustive verifier for the pure-cubic B2=5 c4 formula on the
// complete subdivision band 23<=n<=38.
mod structural{
    include!("verify_rank7_rooted_cross_b2_4.rs");
    fn choose(n:usize,k:usize)->i128{if k>n{return 0}let mut v=1i128;for j in 0..k{v=v*(n-j)as i128/(j+1)as i128}v}
    fn check(a:&[Vec<usize>],lengths:&[usize],branch_edges:usize){let n=a.len();let mut memo=vec![None;n*n];let c=whole(0,a,&mut memo);let p=lengths[..branch_edges].iter().filter(|&&l|l>=2).count();let q=lengths[branch_edges..].iter().filter(|&&l|l>=2).count();let formula=choose(n-3,4)+5*(n as i128)-32+(p as i128)-(q as i128);assert_eq!(c[4],formula)}
    fn order(n:usize)->u64{let total=n-1;let mut trees=0u64;let pe=[(0,1),(1,2),(2,3),(3,4),(0,5),(0,6),(1,7),(2,8),(3,9),(4,10),(4,11)];compositions(total,11,&mut|l|{if l[4]>l[5]||l[9]>l[10]||(l[4],l[5],l[0],l[6],l[1])>(l[9],l[10],l[3],l[8],l[2]){return}let a=subdivision(12,&pe,l);check(&a,l,4);trees+=1});let te=[(0,1),(0,2),(0,3),(3,4),(1,5),(1,6),(2,7),(2,8),(3,9),(4,10),(4,11)];compositions(total,11,&mut|l|{if l[4]>l[5]||l[6]>l[7]||l[9]>l[10]||(l[4],l[5],l[0])>(l[6],l[7],l[1]){return}let a=subdivision(12,&te,l);check(&a,l,4);trees+=1});println!("order={n} trees={trees}");trees}
    pub fn run(first:usize,last:usize){let mut total=0;for n in first..=last{total+=order(n)}println!("PASS_EXACT_RANK7_B2_5_CUBIC_C4_FORMULA trees={total}")}
}
fn main(){let a:Vec<String>=std::env::args().collect();let f=a.get(1).and_then(|s|s.parse().ok()).unwrap_or(23);let l=a.get(2).and_then(|s|s.parse().ok()).unwrap_or(38);structural::run(f,l)}
