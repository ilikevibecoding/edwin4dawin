// Low-memory checked-i128 scanner for the three large all-short cubic bands.
//
// It implements the same canonical quotient coordinates as the sealed Python
// universe and the same conditioned-path formulas, but uses fixed integer
// vectors.  Arguments: ROOT START LIMIT.  It always traverses the full root
// universe to report the exact selected total; only [START,START+LIMIT) is
// evaluated.

use std::env;
use std::time::Instant;

type V = [i128; 9];

fn ai(a: i128, b: i128) -> i128 { a.checked_add(b).expect("i128 add overflow") }
fn si(a: i128, b: i128) -> i128 { a.checked_sub(b).expect("i128 sub overflow") }
fn mi(a: i128, b: i128) -> i128 { a.checked_mul(b).expect("i128 mul overflow") }

fn one() -> V { let mut x=[0;9]; x[0]=1; x }
fn zero() -> V { [0;9] }

fn choose(n: i32, k: i32) -> i128 {
    if k < 0 || n < k { return 0; }
    let mut value=1_i128;
    for j in 0..k {
        value = mi(value, (n-j) as i128) / (j+1) as i128;
    }
    value
}

fn path(n: i32) -> V {
    if n == -1 { return one(); }
    if n <= -2 { return zero(); }
    let mut out=[0_i128;9];
    for r in 0..9_i32 { out[r as usize]=choose(n-r+1,r); }
    out
}

fn add(a: &V, b: &V) -> V {
    let mut out=[0;9];
    for k in 0..9 { out[k]=ai(a[k],b[k]); }
    out
}

fn mul(a: &V, b: &V) -> V {
    let mut out=[0;9];
    for i in 0..9 {
        for j in 0..(9-i) { out[i+j]=ai(out[i+j],mi(a[i],b[j])); }
    }
    out
}

fn product(factors: &[V]) -> V {
    let mut out=one();
    for factor in factors { out=mul(&out,factor); }
    out
}

fn shifted(a: &V, amount: usize) -> V {
    let mut out=[0;9];
    for k in amount..9 { out[k]=a[k-amount]; }
    out
}

#[derive(Clone,Copy,Default)]
struct L { u:i32,v:i32,a1:i32,a2:i32,m:i32,b1:i32,b2:i32,near:i32,tail:i32 }

fn core(l: &L) -> V {
    let mut out=[0;9];
    for left in 0..2_i32 { for middle in 0..2_i32 { for right in 0..2_i32 {
        let row=shifted(&product(&[
            path(l.a1-left),path(l.a2-left),path(l.m-middle),
            path(l.b1-right),path(l.b2-right),
            path(l.u-1-left-middle),path(l.v-1-middle-right),
        ]),(left+middle+right) as usize);
        out=add(&out,&row);
    }}}
    out
}

fn deleted_outer_branch(l:&L)->V {
    let mut out=[0;9];
    for middle in 0..2_i32 { for right in 0..2_i32 {
        let row=shifted(&product(&[
            path(l.a1),path(l.a2),path(l.u-1-middle),path(l.m-middle),
            path(l.v-1-middle-right),path(l.b1-right),path(l.b2-right),
        ]),(middle+right) as usize);
        out=add(&out,&row);
    }} out
}

fn deleted_middle_branch(l:&L)->V {
    let mut out=[0;9];
    for left in 0..2_i32 { for right in 0..2_i32 {
        let row=shifted(&product(&[
            path(l.m),path(l.a1-left),path(l.a2-left),path(l.u-1-left),
            path(l.b1-right),path(l.b2-right),path(l.v-1-right),
        ]),(left+right) as usize);
        out=add(&out,&row);
    }} out
}

fn deleted_outer_leaf(l:&L)->V {
    let mut out=[0;9];
    for left in 0..2_i32 { for middle in 0..2_i32 { for right in 0..2_i32 {
        let row=shifted(&product(&[
            path(l.a1-1-left),path(l.a2-left),path(l.m-middle),
            path(l.b1-right),path(l.b2-right),
            path(l.u-1-left-middle),path(l.v-1-middle-right),
        ]),(left+middle+right) as usize);
        out=add(&out,&row);
    }}} out
}

fn deleted_middle_leaf(l:&L)->V {
    let mut out=[0;9];
    for left in 0..2_i32 { for middle in 0..2_i32 { for right in 0..2_i32 {
        let row=shifted(&product(&[
            path(l.a1-left),path(l.a2-left),path(l.m-1-middle),
            path(l.b1-right),path(l.b2-right),
            path(l.u-1-left-middle),path(l.v-1-middle-right),
        ]),(left+middle+right) as usize);
        out=add(&out,&row);
    }}} out
}

fn deleted_outer_pendant_internal(l:&L)->V {
    let mut out=[0;9];
    for left in 0..2_i32 { for middle in 0..2_i32 { for right in 0..2_i32 {
        let row=shifted(&product(&[
            path(l.tail),path(l.near-left),path(l.a2-left),path(l.m-middle),
            path(l.b1-right),path(l.b2-right),
            path(l.u-1-left-middle),path(l.v-1-middle-right),
        ]),(left+middle+right) as usize);
        out=add(&out,&row);
    }}} out
}

fn deleted_middle_pendant_internal(l:&L)->V {
    let mut out=[0;9];
    for left in 0..2_i32 { for middle in 0..2_i32 { for right in 0..2_i32 {
        let row=shifted(&product(&[
            path(l.tail),path(l.near-middle),path(l.a1-left),path(l.a2-left),
            path(l.b1-right),path(l.b2-right),
            path(l.u-1-left-middle),path(l.v-1-middle-right),
        ]),(left+middle+right) as usize);
        out=add(&out,&row);
    }}} out
}

fn deleted_spine_internal(l:&L)->V {
    let mut out=[0;9];
    for left in 0..2_i32 { for middle in 0..2_i32 { for right in 0..2_i32 {
        let row=shifted(&product(&[
            path(l.near-left),path(l.tail-middle),path(l.a1-left),path(l.a2-left),
            path(l.m-middle),path(l.b1-right),path(l.b2-right),
            path(l.v-1-middle-right),
        ]),(left+middle+right) as usize);
        out=add(&out,&row);
    }}} out
}

fn choose_small(n:usize,k:usize)->i128 {
    if k>n{return 0;} let mut x=1_i128;
    for j in 0..k {x=x*(n-j) as i128/(j+1) as i128;} x
}

fn residual(c:&V,h:&V,siblings:usize)->i128 {
    let mut p7=h[6]; let mut p8=h[7]; let mut open9=0_i128;
    for j in 0..=7 {p7=ai(p7,mi(c[7-j],choose_small(siblings,j)));}
    for j in 0..=8 {p8=ai(p8,mi(c[8-j],choose_small(siblings,j)));}
    for j in 1..=9 {open9=ai(open9,mi(c[9-j],choose_small(siblings,j)));}
    let q8=si(si(mi(16,mi(p8,p8)),mi(p7,p8)),mi(18,mi(p7,open9)));
    let cq=si(mi(16,mi(c[8],c[8])),mi(c[7],c[8]));
    let hq=si(mi(14,mi(h[7],h[7])),mi(h[6],h[7]));
    si(si(mi(8,mi(mi(c[7],h[6]),q8)),mi(8,mi(mi(h[6],p7),cq))),mi(9,mi(mi(c[7],p7),hq)))
}

fn deltas(c:&V,h:&V)->(i128,i128){let a=residual(c,h,1);let b=residual(c,h,2);(a,si(b,a))}

#[derive(Clone,Copy)]
enum Root {OuterBranch,MiddleBranch,OuterLeaf,MiddleLeaf,OuterPendant,MiddlePendant,Spine}

fn root_name(r:Root)->&'static str {match r {
    Root::OuterBranch=>"outer_branch",Root::MiddleBranch=>"middle_branch",
    Root::OuterLeaf=>"outer_leaf",Root::MiddleLeaf=>"middle_leaf",
    Root::OuterPendant=>"outer_pendant_internal",Root::MiddlePendant=>"middle_pendant_internal",
    Root::Spine=>"spine_internal"}}

fn parse_root(s:&str)->Root{match s{
    "outer_branch"=>Root::OuterBranch,"middle_branch"=>Root::MiddleBranch,
    "outer_leaf"=>Root::OuterLeaf,"middle_leaf"=>Root::MiddleLeaf,
    "outer_pendant_internal"=>Root::OuterPendant,"middle_pendant_internal"=>Root::MiddlePendant,
    "spine_internal"=>Root::Spine,_=>panic!("root")}}

fn values(r:Root,x:&L)->(i128,i128){
    let mut l=*x;
    let h=match r{
        Root::OuterBranch=>deleted_outer_branch(&l),
        Root::MiddleBranch=>deleted_middle_branch(&l),
        Root::OuterLeaf=>deleted_outer_leaf(&l),
        Root::MiddleLeaf=>deleted_middle_leaf(&l),
        Root::OuterPendant=>{l.a1=l.near+l.tail+1;deleted_outer_pendant_internal(&l)},
        Root::MiddlePendant=>{l.m=l.near+l.tail+1;deleted_middle_pendant_internal(&l)},
        Root::Spine=>{l.u=l.near+l.tail+2;deleted_spine_internal(&l)},
    };
    deltas(&core(&l),&h)
}

fn order(r:Root,l:&L)->i32{match r{
    Root::OuterPendant=>2+l.near+l.tail+l.a2+l.m+l.b1+l.b2+l.u+l.v,
    Root::MiddlePendant=>2+l.near+l.tail+l.a1+l.a2+l.b1+l.b2+l.u+l.v,
    Root::Spine=>3+l.near+l.tail+l.a1+l.a2+l.m+l.b1+l.b2+l.v,
    _=>1+l.u+l.v+l.a1+l.a2+l.m+l.b1+l.b2,
}}

struct Audit{start:u64,limit:u64,total:u64,done:u64,neg0:u64,neg1:u64,min0:Option<i128>,min1:Option<i128>,wit0:Vec<i32>,wit1:Vec<i32>}
impl Audit{
 fn new(start:u64,limit:u64)->Audit{Audit{start,limit,total:0,done:0,neg0:0,neg1:0,min0:None,min1:None,wit0:vec![],wit1:vec![]}}
 fn see(&mut self,r:Root,l:&L,key:Vec<i32>){
  let idx=self.total;self.total+=1;if idx<self.start||self.done>=self.limit{return;}
  let (d0,d1)=values(r,l);self.done+=1;if d0<=0{self.neg0+=1;}if d1<=0{self.neg1+=1;}
  if self.min0.map_or(true,|m|d0<m){self.min0=Some(d0);self.wit0=key.clone();}
  if self.min1.map_or(true,|m|d1<m){self.min1=Some(d1);self.wit1=key;}
 }
}

fn pairs(max:i32)->Vec<(i32,i32)>{let mut x=vec![];for a in 1..=max{for b in a..=max{x.push((a,b));}}x}

fn enumerate(r:Root,a:&mut Audit){
 let ps=pairs(7);let mut modules=vec![];for s in 1..=9{for &p in &ps{modules.push((s,p));}}
 match r{
  Root::OuterBranch=>for &pa in &ps{for m in 1..=7{for &pb in &ps{for u in 1..=9{for v in 1..=9{
   let l=L{u,v,a1:pa.0,a2:pa.1,m,b1:pb.0,b2:pb.1,..Default::default()};if order(r,&l)>=37{a.see(r,&l,vec![pa.0,pa.1,m,pb.0,pb.1,u,v]);}
  }}}}},
  Root::MiddleBranch=>for m in 1..=7{for i in 0..modules.len(){for j in i..modules.len(){let x=modules[i];let y=modules[j];
   let l=L{u:x.0,v:y.0,a1:x.1.0,a2:x.1.1,m,b1:y.1.0,b2:y.1.1,..Default::default()};if order(r,&l)>=37{a.see(r,&l,vec![m,x.0,x.1.0,x.1.1,y.0,y.1.0,y.1.1]);}
  }}},
  Root::OuterLeaf=>for a1 in 1..=8{for a2 in 1..=7{for m in 1..=7{for &pb in &ps{for u in 1..=9{for v in 1..=9{
   let l=L{u,v,a1,a2,m,b1:pb.0,b2:pb.1,..Default::default()};if order(r,&l)>=37{a.see(r,&l,vec![a1,a2,m,pb.0,pb.1,u,v]);}
  }}}}}},
  Root::MiddleLeaf=>for m in 1..=8{for i in 0..modules.len(){for j in i..modules.len(){let x=modules[i];let y=modules[j];
   let l=L{u:x.0,v:y.0,a1:x.1.0,a2:x.1.1,m,b1:y.1.0,b2:y.1.1,..Default::default()};if order(r,&l)>=37{a.see(r,&l,vec![m,x.0,x.1.0,x.1.1,y.0,y.1.0,y.1.1]);}
  }}},
  Root::OuterPendant=>for near in 0..=7{for tail in 0..=6{for a2 in 1..=7{for m in 1..=7{for &pb in &ps{for u in 1..=9{for v in 1..=9{
   let l=L{u,v,a2,m,b1:pb.0,b2:pb.1,near,tail,..Default::default()};if order(r,&l)>=37{a.see(r,&l,vec![near,tail,a2,m,pb.0,pb.1,u,v]);}
  }}}}}}},
  Root::MiddlePendant=>for near in 0..=7{for tail in 0..=6{for i in 0..modules.len(){for j in i..modules.len(){let x=modules[i];let y=modules[j];
   let l=L{u:x.0,v:y.0,a1:x.1.0,a2:x.1.1,b1:y.1.0,b2:y.1.1,near,tail,..Default::default()};if order(r,&l)>=37{a.see(r,&l,vec![near,tail,x.0,x.1.0,x.1.1,y.0,y.1.0,y.1.1]);}
  }}}},
  Root::Spine=>for near in 0..=7{for tail in 0..=7{for &pa in &ps{for m in 1..=7{for &(v,pb) in &modules{
   let l=L{v,a1:pa.0,a2:pa.1,m,b1:pb.0,b2:pb.1,near,tail,..Default::default()};if order(r,&l)>=37{a.see(r,&l,vec![near,tail,pa.0,pa.1,m,v,pb.0,pb.1]);}
  }}}}},
 }
}

fn main(){
 let args:Vec<String>=env::args().collect();let r=parse_root(args.get(1).expect("root"));
 let start:u64=args.get(2).expect("start").parse().unwrap();let limit:u64=args.get(3).expect("limit").parse().unwrap();
 let t=Instant::now();let mut a=Audit::new(start,limit);enumerate(r,&mut a);
 println!("{{\"status\":\"{}\",\"root\":\"{}\",\"start\":{},\"stop\":{},\"processed\":{},\"universe\":{},\"negative0\":{},\"negative1\":{},\"minimum0\":\"{}\",\"minimum1\":\"{}\",\"witness0\":{:?},\"witness1\":{:?},\"runtime_seconds\":{:.6}}}",
  if a.neg0==0&&a.neg1==0{"PASS_EXACT_FAST_CHUNK"}else{"OBSTRUCTION"},root_name(r),start,start+a.done,a.done,a.total,a.neg0,a.neg1,a.min0.unwrap_or(0),a.min1.unwrap_or(0),a.wit0,a.wit1,t.elapsed().as_secs_f64());
 assert_eq!(a.neg0,0);assert_eq!(a.neg1,0);
}
