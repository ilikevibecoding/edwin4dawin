// Exact streaming WROM census of the rooted C7 margin at order 24.

#[derive(Clone,Copy)]
struct State { excluded:[i128;8], included:[i128;8] }
fn one()->[i128;8]{let mut a=[0;8];a[0]=1;a}
fn x()->[i128;8]{let mut a=[0;8];a[1]=1;a}
fn add(a:[i128;8],b:[i128;8])->[i128;8]{let mut z=[0;8];for j in 0..8{z[j]=a[j]+b[j]}z}
fn mul(a:[i128;8],b:[i128;8])->[i128;8]{let mut z=[0;8];for i in 0..8{for j in 0..(8-i){z[i+j]+=a[i]*b[j]}}z}
fn split_tree(layout:&[usize])->(Vec<usize>,Vec<usize>){let mut seen=false;let mut split=layout.len();for(i,l)in layout.iter().enumerate(){if *l==1{if seen{split=i;break}seen=true}}let left=layout[1..split].iter().map(|l|l-1).collect();let mut rest=vec![0];rest.extend_from_slice(&layout[split..]);(left,rest)}
fn next_rooted(pre:&[usize],specified:Option<usize>)->Option<Vec<usize>>{let p=match specified{Some(v)=>v,None=>{let mut v=pre.len()-1;while pre[v]==1{v-=1}v}};if p==0{return None}let mut q=p-1;while pre[q]!=pre[p]-1{q-=1}let mut out=pre.to_vec();for i in p..out.len(){out[i]=out[i-p+q]}Some(out)}
fn next_tree(c:&[usize])->Option<Vec<usize>>{let(left,rest)=split_tree(c);let lh=*left.iter().max().unwrap();let rh=*rest.iter().max().unwrap();let valid=rh>lh||(rh==lh&&(left.len()<rest.len()||(left.len()==rest.len()&&left<=rest)));if valid{return Some(c.to_vec())}let p=left.len();let mut out=next_rooted(c,Some(p))?;if c[p]>2{let(nl,_)=split_tree(&out);let len=nl.iter().max().unwrap()+1;let start=out.len()-len;for k in 0..len{out[start+k]=k+1}}Some(out)}
fn adjacency(layout:&[usize])->Vec<Vec<usize>>{let n=layout.len();let mut a:Vec<Vec<usize>>=vec![Vec::new();n];let mut stack:Vec<usize>=Vec::new();for i in 0..n{let level=layout[i];if let Some(&last)=stack.last(){let mut p=last;while layout[p]>=level{stack.pop();p=*stack.last().unwrap()}a[i].push(p);a[p].push(i)}stack.push(i)}a}
fn directed(v:usize,p:usize,a:&[Vec<usize>],memo:&mut[Option<State>])->State{let n=a.len();let key=v*n+p;if let Some(s)=memo[key]{return s}let mut ex=one();let mut inc=x();for &u in &a[v]{if u==p{continue}let s=directed(u,v,a,memo);ex=mul(ex,add(s.excluded,s.included));inc=mul(inc,s.excluded)}let s=State{excluded:ex,included:inc};memo[key]=Some(s);s}
fn whole(root:usize,a:&[Vec<usize>],memo:&mut[Option<State>])->[i128;8]{let mut ex=one();let mut inc=x();for &u in &a[root]{let s=directed(u,root,a,memo);ex=mul(ex,add(s.excluded,s.included));inc=mul(inc,s.excluded)}add(ex,inc)}
fn deletion(root:usize,a:&[Vec<usize>],memo:&mut[Option<State>])->[i128;8]{let mut out=one();for &u in &a[root]{let s=directed(u,root,a,memo);out=mul(out,add(s.excluded,s.included))}out}
fn cross(p:[i128;8],h:[i128;8])->i128{let(d,e,f)=(p[5],p[6],p[7]);d*(e*e-d*f)-2*e*(e*h[5]-d*h[6])}
fn b2(a:&[Vec<usize>])->usize{a.iter().map(|v|{let x=v.len().saturating_sub(1);x.saturating_mul(x.saturating_sub(1))/2}).sum()}

fn main(){
 let n=24usize;let expected=39_299_897u64;
 let mut layout:Option<Vec<usize>>=Some((0..=n/2).chain(1..((n+1)/2)).collect());
 let mut trees=0u64;let mut roots=0u64;let mut negative=0u64;let mut minimum=i128::MAX;
 let mut witness_layout=Vec::new();let mut witness_root=0usize;let mut witness_degree=0usize;let mut witness_b2=0usize;let mut witness_poly=[0i128;8];let mut witness_del=[0i128;8];
 while let Some(candidate)=layout{layout=next_tree(&candidate);if let Some(valid)=layout.clone(){let a=adjacency(&valid);let curvature=b2(&a);let mut memo=vec![None;n*n];let p=whole(0,&a,&mut memo);trees+=1;for root in 0..n{let h=deletion(root,&a,&mut memo);let value=cross(p,h);roots+=1;if value<0{negative+=1}if value<minimum{minimum=value;witness_layout=valid.clone();witness_root=root;witness_degree=a[root].len();witness_b2=curvature;witness_poly=p;witness_del=h}}layout=next_rooted(&valid,None)}}
 assert_eq!(trees,expected);assert_eq!(roots,expected*n as u64);assert_eq!(negative,0);assert!(minimum>0);
 println!("order={n} trees={trees} rooted_checks={roots} negative={negative} minimum={minimum} witness_root={witness_root} witness_degree={witness_degree} witness_B2={witness_b2} witness_layout={witness_layout:?} polynomial={witness_poly:?} deletion={witness_del:?}");
 println!("PASS_EXACT_RANK7_ROOTED_CROSS_ALL_ROOTS_ORDER_24");
}
