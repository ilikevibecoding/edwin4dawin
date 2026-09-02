// Exact finite probe: does one edge subdivision preserve/increase rooted C7
// on the two pure-cubic B2=5 skeleton families?
mod structural {
    include!("verify_rank7_rooted_cross_b2_4.rs");

    fn c7_all(a:&[Vec<usize>])->Vec<i128>{
        let n=a.len();let mut memo=vec![None;n*n];let p=whole(0,a,&mut memo);
        (0..n).map(|r|{let h=deletion(r,a,&mut memo);c7(p,h)}).collect()
    }
    fn mapped_root(r:usize,vertices:usize,lengths:&[usize],edge:usize)->usize{
        if r<vertices{return r}let mut offset=vertices;
        for(j,&length)in lengths.iter().enumerate(){let count=length-1;if r<offset+count{return if j>edge{r+1}else{r}}offset+=count}
        panic!("bad root")
    }
    fn new_vertex(vertices:usize,lengths:&[usize],edge:usize)->usize{
        vertices+lengths[..edge].iter().map(|x|x-1).sum::<usize>()+lengths[edge]-1
    }
    struct SubAudit{comparisons:u64,negative:u64,minimum:i128,new_min:i128,init:bool,witness:(String,Vec<usize>,usize,usize,i128)}
    impl SubAudit{
        fn new()->Self{Self{comparisons:0,negative:0,minimum:0,new_min:0,init:false,witness:(String::new(),Vec::new(),0,0,0)}}
        fn tree(&mut self,family:&str,vertices:usize,edges:&[(usize,usize)],lengths:&[usize]){
            let old=subdivision(vertices,edges,lengths);let ov=c7_all(&old);
            for edge in 0..lengths.len(){let mut nl=lengths.to_vec();nl[edge]+=1;let new=subdivision(vertices,edges,&nl);let nv=c7_all(&new);
                for r in 0..old.len(){let nr=mapped_root(r,vertices,lengths,edge);let diff=nv[nr]-ov[r];
                    if !self.init||diff<self.minimum{self.minimum=diff;self.witness=(family.to_string(),lengths.to_vec(),edge,r,diff)}
                    if diff<0{self.negative+=1}self.comparisons+=1}
                let q=new_vertex(vertices,lengths,edge);if !self.init||nv[q]<self.new_min{self.new_min=nv[q]}assert!(nv[q]>0);self.init=true;
            }
        }
    }
    pub fn run(n:usize){
        let total=n-1;let mut audit=SubAudit::new();
        let pe=[(0,1),(1,2),(2,3),(3,4),(0,5),(0,6),(1,7),(2,8),(3,9),(4,10),(4,11)];
        compositions(total,11,&mut|l|{if l[4]>l[5]||l[9]>l[10]||(l[4],l[5],l[0],l[6],l[1])>(l[9],l[10],l[3],l[8],l[2]){return}audit.tree("path",12,&pe,l)});
        let te=[(0,1),(0,2),(0,3),(3,4),(1,5),(1,6),(2,7),(2,8),(3,9),(4,10),(4,11)];
        compositions(total,11,&mut|l|{if l[4]>l[5]||l[6]>l[7]||l[9]>l[10]||(l[4],l[5],l[0])>(l[6],l[7],l[1]){return}audit.tree("tee",12,&te,l)});
        let me=[(0,1),(0,2),(0,3),(0,4),(1,5),(1,6),(2,7),(2,8)];
        compositions(total,8,&mut|l|{if l[2]>l[3]||l[4]>l[5]||l[6]>l[7]||(l[4],l[5],l[0])>(l[6],l[7],l[1]){return}audit.tree("mixed_middle",9,&me,l)});
        let ee=[(0,1),(1,2),(0,3),(0,4),(0,5),(1,6),(2,7),(2,8)];
        compositions(total,8,&mut|l|{if !(l[2]<=l[3]&&l[3]<=l[4]&&l[6]<=l[7]){return}audit.tree("mixed_end",9,&ee,l)});
        println!("order={n} comparisons={} negatives={} minimum_increment={} minimum_new_root={} witness={:?}",audit.comparisons,audit.negative,audit.minimum,audit.new_min,audit.witness);
    }
}
fn main(){let a:Vec<String>=std::env::args().collect();structural::run(a.get(1).and_then(|s|s.parse().ok()).unwrap_or(23))}
