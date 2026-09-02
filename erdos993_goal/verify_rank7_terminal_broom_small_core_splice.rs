// Exact low-memory certificate for the small-core splice in the rank-seven
// connected-tree terminal-broom induction.
//
// For every free tree A of order at most 14 and every root q, form G_t by
// adjoining a support at q with t leaves.  Since alpha(G_t)=alpha(A)+t,
// the target range begins at t0=max(1,12-alpha(A)).  We evaluate Q7(G_t)
// at t0,...,t0+14 and require all Newton coefficients there to be
// nonnegative.  Q7(G_t) has degree at most 14, so this proves Q7(G_t)>=0
// for every integer t>=t0.

#[derive(Clone, Copy)]
struct State { excluded: [i128; 9], included: [i128; 9] }

fn one() -> [i128; 9] { let mut a=[0;9]; a[0]=1; a }
fn x() -> [i128; 9] { let mut a=[0;9]; a[1]=1; a }
fn add(a:[i128;9],b:[i128;9]) -> [i128;9] {
    let mut z=[0;9]; for j in 0..9 { z[j]=a[j]+b[j]; } z
}
fn mul(a:[i128;9],b:[i128;9]) -> [i128;9] {
    let mut z=[0;9];
    for i in 0..9 { for j in 0..(9-i) { z[i+j]+=a[i]*b[j]; } }
    z
}
fn split_tree(layout:&[usize]) -> (Vec<usize>,Vec<usize>) {
    let mut seen=false; let mut split=layout.len();
    for (i,l) in layout.iter().enumerate() {
        if *l==1 { if seen { split=i; break; } seen=true; }
    }
    let left=layout[1..split].iter().map(|l|l-1).collect();
    let mut rest=vec![0]; rest.extend_from_slice(&layout[split..]);
    (left,rest)
}
fn next_rooted(pre:&[usize],specified:Option<usize>) -> Option<Vec<usize>> {
    let p=match specified {
        Some(v)=>v,
        None=>{ let mut v=pre.len()-1; while pre[v]==1 { v-=1; } v }
    };
    if p==0 { return None; }
    let mut q=p-1; while pre[q]!=pre[p]-1 { q-=1; }
    let mut out=pre.to_vec();
    for i in p..out.len() { out[i]=out[i-p+q]; }
    Some(out)
}
fn next_tree(c:&[usize]) -> Option<Vec<usize>> {
    let (left,rest)=split_tree(c);
    let lh=*left.iter().max().unwrap(); let rh=*rest.iter().max().unwrap();
    let valid=rh>lh || (rh==lh && (left.len()<rest.len() ||
        (left.len()==rest.len() && left<=rest)));
    if valid { return Some(c.to_vec()); }
    let p=left.len(); let mut out=next_rooted(c,Some(p))?;
    if c[p]>2 {
        let (nl,_)=split_tree(&out); let len=nl.iter().max().unwrap()+1;
        let start=out.len()-len;
        for k in 0..len { out[start+k]=k+1; }
    }
    Some(out)
}
fn adjacency(layout:&[usize]) -> Vec<Vec<usize>> {
    let n=layout.len(); let mut a=vec![Vec::new();n]; let mut stack:Vec<usize>=Vec::new();
    for i in 0..n {
        let level=layout[i];
        if let Some(&last)=stack.last() {
            let mut p=last;
            while layout[p]>=level { stack.pop(); p=*stack.last().unwrap(); }
            a[i].push(p); a[p].push(i);
        }
        stack.push(i);
    }
    a
}
fn directed(v:usize,p:usize,a:&[Vec<usize>],memo:&mut[Option<State>]) -> State {
    let n=a.len(); let key=v*n+p;
    if let Some(s)=memo[key] { return s; }
    let mut ex=one(); let mut inc=x();
    for &u in &a[v] {
        if u==p { continue; }
        let s=directed(u,v,a,memo);
        ex=mul(ex,add(s.excluded,s.included)); inc=mul(inc,s.excluded);
    }
    let s=State{excluded:ex,included:inc}; memo[key]=Some(s); s
}
fn root(v:usize,a:&[Vec<usize>],memo:&mut[Option<State>]) -> State {
    let mut ex=one(); let mut inc=x();
    for &u in &a[v] {
        let s=directed(u,v,a,memo);
        ex=mul(ex,add(s.excluded,s.included)); inc=mul(inc,s.excluded);
    }
    State{excluded:ex,included:inc}
}
fn alpha_dp(v:usize,p:usize,a:&[Vec<usize>]) -> (usize,usize) {
    let mut ex=0; let mut inc=1;
    for &u in &a[v] {
        if u==p { continue; }
        let (ue,ui)=alpha_dp(u,v,a); ex+=ue.max(ui); inc+=ue;
    }
    (ex,inc)
}
fn choose(n:usize,k:usize) -> i128 {
    if k>n { return 0; }
    let mut v=1i128;
    for j in 0..k { v=v*(n-j) as i128/(j+1) as i128; }
    v
}
fn smooth(c:[i128;9],r:usize,t:usize) -> i128 {
    let mut v=0; for l in 0..=r.min(t) { v+=choose(t,l)*c[r-l]; } v
}
fn q7_terminal(c:[i128;9],h:[i128;9],t:usize) -> i128 {
    let p6=smooth(c,6,t)+h[5];
    let p7=smooth(c,7,t)+h[6];
    let p8=smooth(c,8,t)+h[7];
    14*p7*p7-p6*p7-16*p6*p8
}

fn main() {
    let expected:[u64;15]=[0,1,1,1,2,3,6,11,23,47,106,235,551,1301,3159];
    let mut total_roots=0u64; let mut global_min=i128::MAX;
    let mut global_min_coeff=i128::MAX; let mut min_order=0usize;
    for n in 1..=14 {
        let mut layout:Option<Vec<usize>>=if n==1 { Some(vec![0]) } else {
            Some((0..=n/2).chain(1..((n+1)/2)).collect())
        };
        let mut trees=0u64; let mut roots=0u64; let mut order_min=i128::MAX;
        let mut order_coeff_min=i128::MAX;
        while let Some(candidate)=layout {
            layout=if n==1 { None } else { next_tree(&candidate) };
            let valid=if n==1 { candidate } else {
                match layout.clone() { Some(v)=>v, None=>break }
            };
            let a=adjacency(&valid); let mut memo=vec![None;n*n];
            let core_state=root(0,&a,&mut memo);
            let core=add(core_state.excluded,core_state.included);
            let (ae,ai)=alpha_dp(0,usize::MAX,&a); let alpha=ae.max(ai);
            trees+=1;
            for v in 0..n {
                let h=root(v,&a,&mut memo).excluded;
                let t0=1usize.max(12usize.saturating_sub(alpha));
                let mut vals:Vec<i128>=(t0..=t0+14)
                    .map(|t|q7_terminal(core,h,t)).collect();
                order_min=order_min.min(vals[0]);
                for _ in 0..=14 {
                    order_coeff_min=order_coeff_min.min(vals[0]);
                    if vals.len()==1 { break; }
                    vals=vals.windows(2).map(|p|p[1]-p[0]).collect();
                }
                roots+=1;
            }
            if n>1 { layout=next_rooted(&valid,None); }
        }
        assert_eq!(trees,expected[n]); assert_eq!(roots,expected[n]*n as u64);
        assert!(order_min>=0,"negative Q7 at order {}",n);
        assert!(order_coeff_min>=0,"negative Newton coefficient at order {}",n);
        total_roots+=roots;
        if order_min<global_min { global_min=order_min; min_order=n; }
        global_min_coeff=global_min_coeff.min(order_coeff_min);
        println!("core_n={n} trees={trees} roots={roots} min_Q7_at_alpha12_entry={order_min} min_newton_coefficient={order_coeff_min}");
    }
    println!("PASS_EXACT_RANK7_TERMINAL_BROOM_SMALL_CORE_SPLICE_THROUGH_N14 roots={total_roots} min_Q7={global_min} min_Q7_order={min_order} min_newton_coefficient={global_min_coeff}");
}
