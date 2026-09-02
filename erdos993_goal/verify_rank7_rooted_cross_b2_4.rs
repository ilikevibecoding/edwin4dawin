// Exact structural rooted-C7 census for every tree with B2=4.
// The three suppressed skeletons are degree-(4,3), four degree-three
// branch vertices in a path, and four degree-three branch vertices in a star.

#[derive(Clone, Copy)]
struct State { excluded: [i128; 8], included: [i128; 8] }
fn one() -> [i128; 8] { let mut a=[0;8]; a[0]=1; a }
fn x() -> [i128; 8] { let mut a=[0;8]; a[1]=1; a }
fn add(a:[i128;8],b:[i128;8])->[i128;8]{let mut z=[0;8];for i in 0..8{z[i]=a[i]+b[i]}z}
fn mul(a:[i128;8],b:[i128;8])->[i128;8]{let mut z=[0;8];for i in 0..8{for j in 0..(8-i){z[i+j]+=a[i]*b[j]}}z}
fn directed(v:usize,p:usize,a:&[Vec<usize>],memo:&mut[Option<State>])->State{
    let n=a.len();let key=v*n+p;if let Some(s)=memo[key]{return s}
    let mut ex=one();let mut inc=x();for &u in &a[v]{if u==p{continue}let s=directed(u,v,a,memo);ex=mul(ex,add(s.excluded,s.included));inc=mul(inc,s.excluded)}
    let s=State{excluded:ex,included:inc};memo[key]=Some(s);s
}
fn whole(r:usize,a:&[Vec<usize>],memo:&mut[Option<State>])->[i128;8]{
    let mut ex=one();let mut inc=x();for &u in &a[r]{let s=directed(u,r,a,memo);ex=mul(ex,add(s.excluded,s.included));inc=mul(inc,s.excluded)}add(ex,inc)
}
fn deletion(r:usize,a:&[Vec<usize>],memo:&mut[Option<State>])->[i128;8]{
    let mut z=one();for &u in &a[r]{let s=directed(u,r,a,memo);z=mul(z,add(s.excluded,s.included))}z
}
fn c7(p:[i128;8],h:[i128;8])->i128{let(d,e,f)=(p[5],p[6],p[7]);d*(e*e-d*f)-2*e*(e*h[5]-d*h[6])}

fn subdivision(vertices:usize,edges:&[(usize,usize)],lengths:&[usize])->Vec<Vec<usize>>{
    assert_eq!(edges.len(),lengths.len());let n=vertices+lengths.iter().sum::<usize>()-lengths.len();let mut a=vec![Vec::new();n];let mut next=vertices;
    for(&(left,right),&length)in edges.iter().zip(lengths){assert!(length>=1);let mut previous=left;for _ in 1..length{let v=next;next+=1;a[previous].push(v);a[v].push(previous);previous=v}a[previous].push(right);a[right].push(previous)}
    assert_eq!(next,n);a
}
fn b2(a:&[Vec<usize>])->usize{a.iter().map(|v|{let x=v.len().saturating_sub(1);x*x.saturating_sub(1)/2}).sum()}

#[derive(Default)]
struct Audit{trees:u64,roots:u64,failures:u64,minimum:i128,initialized:bool,witness_lengths:Vec<usize>,witness_root:usize,witness_poly:[i128;8],witness_del:[i128;8]}
impl Audit{
    fn check(&mut self,a:&[Vec<usize>],lengths:&[usize]){
        assert_eq!(b2(a),4);let n=a.len();let mut memo=vec![None;n*n];let p=whole(0,a,&mut memo);self.trees+=1;
        for root in 0..n{let h=deletion(root,a,&mut memo);let value=c7(p,h);self.roots+=1;if value<=0{self.failures+=1}if !self.initialized||value<self.minimum{self.initialized=true;self.minimum=value;self.witness_lengths=lengths.to_vec();self.witness_root=root;self.witness_poly=p;self.witness_del=h}}
    }
}
fn compositions<F:FnMut(&[usize])>(total:usize,parts:usize,callback:&mut F){
    fn visit<F:FnMut(&[usize])>(remaining:usize,slots:usize,prefix:&mut Vec<usize>,callback:&mut F){if slots==1{if remaining>=1{prefix.push(remaining);callback(prefix);prefix.pop();}return}for first in 1..=(remaining-slots+1){prefix.push(first);visit(remaining-first,slots-1,prefix,callback);prefix.pop();}}
    visit(total,parts,&mut Vec::with_capacity(parts),callback)
}

fn verify_order(n:usize){
    let total=n-1;let mut mixed=Audit::default();let mut path=Audit::default();let mut star=Audit::default();

    // Degree-four -- degree-three.  Lengths: branch edge, three arms at
    // degree four, two arms at degree three.
    let mixed_edges=[(0,1),(0,2),(0,3),(0,4),(1,5),(1,6)];
    compositions(total,6,&mut|l|{if !(l[1]<=l[2]&&l[2]<=l[3]&&l[4]<=l[5]){return}let a=subdivision(7,&mixed_edges,l);assert_eq!(a.len(),n);mixed.check(&a,l)});

    // Four degree-three branch vertices in a path A--B--C--D.
    // Lengths: AB,BC,CD; A pair; B leaf; C leaf; D pair.
    let path_edges=[(0,1),(1,2),(2,3),(0,4),(0,5),(1,6),(2,7),(3,8),(3,9)];
    compositions(total,9,&mut|l|{
        let(u,_v,w,a1,a2,b,c,d1,d2)=(l[0],l[1],l[2],l[3],l[4],l[5],l[6],l[7],l[8]);
        if a1>a2||d1>d2||(a1,a2,u,b)>(d1,d2,w,c){return}
        let a=subdivision(10,&path_edges,l);assert_eq!(a.len(),n);path.check(&a,l)
    });

    // Four degree-three branch vertices in a star.  Each outer branch has
    // a connection length and an unordered pair of leaf-arm lengths.
    let star_edges=[(0,1),(1,4),(1,5),(0,2),(2,6),(2,7),(0,3),(3,8),(3,9)];
    compositions(total,9,&mut|l|{
        let descriptors=[(l[1],l[2],l[0]),(l[4],l[5],l[3]),(l[7],l[8],l[6])];
        if descriptors.iter().any(|&(left,right,_)|left>right){return}
        if !(descriptors[0]<=descriptors[1]&&descriptors[1]<=descriptors[2]){return}
        let a=subdivision(10,&star_edges,l);assert_eq!(a.len(),n);star.check(&a,l)
    });
    assert!(mixed.initialized&&path.initialized&&star.initialized);assert_eq!(mixed.failures+path.failures+star.failures,0);
    let audits=[("degree4_degree3",&mixed),("degree3_path",&path),("degree3_star",&star)];let &(family,witness)=audits.iter().min_by_key(|(_,a)|a.minimum).unwrap();
    println!("order={n} trees={} mixed_trees={} path_trees={} star_trees={} roots={} failures=0 minimum={} witness_family={} witness_lengths={:?} witness_root={} polynomial={:?} deletion={:?}",mixed.trees+path.trees+star.trees,mixed.trees,path.trees,star.trees,mixed.roots+path.roots+star.roots,witness.minimum,family,witness.witness_lengths,witness.witness_root,witness.witness_poly,witness.witness_del);
}
fn main(){let args:Vec<String>=std::env::args().collect();let first=args.get(1).and_then(|s|s.parse().ok()).unwrap_or(23);let last=args.get(2).and_then(|s|s.parse().ok()).unwrap_or(38);for n in first..=last{verify_order(n)}println!("PASS_EXACT_RANK7_ROOTED_CROSS_B2_4_ORDERS_{first}_THROUGH_{last}")}
