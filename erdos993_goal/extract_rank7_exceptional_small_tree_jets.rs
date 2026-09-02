// Stream-extract the finite tree factors which are not already in the
// rank-seven factorial-ratio cone.
//
// A tree factor is cone-full when alpha>=7 and
//   Q7=14*i7^2-i6*i7-16*i6*i8 >= 0.
// The lower gap inequalities are already theorems for forests; alpha>=7
// ensures the ratios through q7 are defined (q8 may be zero).  Hence the
// only fixed factors needed by the forest lift are alpha<=6 or Q7<0.
//
// The WROM generator streams one free tree at a time.  Only distinct
// exceptional (alpha, i0..i8) jets are retained, so memory is proportional
// to the certificate, not to the 9,114,285 trees through order 22.

use std::collections::BTreeSet;
use std::fs::File;
use std::io::{BufWriter, Write};

#[derive(Clone, Copy)]
struct State { excluded: [i128; 9], included: [i128; 9] }

fn one() -> [i128; 9] { let mut a=[0;9]; a[0]=1; a }
fn x() -> [i128; 9] { let mut a=[0;9]; a[1]=1; a }
fn add(a:[i128;9], b:[i128;9]) -> [i128;9] {
    let mut z=[0;9]; for j in 0..9 { z[j]=a[j]+b[j]; } z
}
fn mul(a:[i128;9], b:[i128;9]) -> [i128;9] {
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
fn next_rooted(pre:&[usize], specified:Option<usize>) -> Option<Vec<usize>> {
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
fn rooted(v:usize,p:usize,a:&[Vec<usize>]) -> State {
    let mut ex=one(); let mut inc=x();
    for &u in &a[v] {
        if u==p { continue; }
        let s=rooted(u,v,a); ex=mul(ex,add(s.excluded,s.included)); inc=mul(inc,s.excluded);
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
fn item(layout:&[usize]) -> (usize,[i128;9]) {
    let a=adjacency(layout); let s=rooted(0,usize::MAX,&a);
    let (ae,ai)=alpha_dp(0,usize::MAX,&a);
    (ae.max(ai),add(s.excluded,s.included))
}
fn q7(p:[i128;9]) -> i128 { 14*p[7]*p[7]-p[6]*p[7]-16*p[6]*p[8] }

fn main() {
    let args:Vec<String>=std::env::args().collect();
    let output=args.get(1).map(String::as_str)
        .unwrap_or("rank7_exceptional_small_tree_jets_exact_20260816.tsv");
    let expected:[u64;23]=[
        0,1,1,1,2,3,6,11,23,47,106,235,551,1301,3159,7741,19320,
        48629,123867,317955,823065,2144505,5623756,
    ];
    let mut exceptional:BTreeSet<(usize,[i128;9])>=BTreeSet::new();
    let mut total=0u64; let mut eligible=0u64; let mut exceptional_occ=0u64;
    let mut summaries=Vec::new();
    for n in 1..=22 {
        let mut layout:Option<Vec<usize>>=if n==1 { Some(vec![0]) } else {
            Some((0..=n/2).chain(1..((n+1)/2)).collect())
        };
        let mut count=0u64; let mut small=0u64; let mut bad=0u64;
        while let Some(candidate)=layout {
            layout=if n==1 { None } else { next_tree(&candidate) };
            let valid=if n==1 { candidate } else {
                match layout.clone() { Some(v)=>v, None=>break }
            };
            let (alpha,polynomial)=item(&valid); count+=1; total+=1;
            if alpha<=11 {
                small+=1; eligible+=1;
                if alpha<=6 || q7(polynomial)<0 {
                    bad+=1; exceptional_occ+=1;
                    exceptional.insert((alpha,polynomial));
                }
            }
            if n>1 { layout=next_rooted(&valid,None); }
        }
        assert_eq!(count,expected[n]);
        println!("order={n} trees={count} alpha_le_11={small} exceptional_occurrences={bad} distinct_exceptional_so_far={}",exceptional.len());
        summaries.push((n,count,small,bad));
    }
    assert_eq!(total,9_114_285);
    let file=File::create(output).unwrap(); let mut w=BufWriter::new(file);
    writeln!(w,"alpha\ti0\ti1\ti2\ti3\ti4\ti5\ti6\ti7\ti8\tq7").unwrap();
    for (alpha,p) in &exceptional {
        writeln!(w,"{}\t{}\t{}\t{}\t{}\t{}\t{}\t{}\t{}\t{}\t{}",
            alpha,p[0],p[1],p[2],p[3],p[4],p[5],p[6],p[7],p[8],q7(*p)).unwrap();
    }
    w.flush().unwrap();
    println!("PASS_EXACT_STREAM_RANK7_EXCEPTIONAL_SMALL_TREE_JETS total_trees={total} alpha_le_11_occurrences={eligible} exceptional_occurrences={exceptional_occ} distinct_exceptional={}",exceptional.len());
    for (n,count,small,bad) in summaries { println!("SUMMARY {n} {count} {small} {bad}"); }
}
