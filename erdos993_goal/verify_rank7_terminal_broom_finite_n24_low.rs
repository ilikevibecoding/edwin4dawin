// Exact WROM certificate for the seven still-needed terminal-broom Newton
// coefficients at n=24. Delta^7..Delta^13 are supplied by the separate
// all-core high-Newton theorem valid from order 15.
mod base {
    include!("verify_rank7_terminal_broom_finite.rs");
    pub fn run(){
        let n=24usize;let expected=39299897u64;let mut layout:Option<Vec<usize>>=Some((0..=n/2).chain(1..((n+1)/2)).collect());let mut trees=0u64;let mut roots=0u64;let mut mins=[i128::MAX;7];
        while let Some(cand)=layout{
            layout=next_tree(&cand);let valid=match layout.clone(){Some(v)=>v,None=>break};let a=adjacency(&valid);let mut memo=vec![None;n*n];let s=root(0,&a,&mut memo);let core=add(s.excluded,s.included);trees+=1;
            for v in 0..n{let del=root(v,&a,&mut memo).excluded;if core[6]>0&&del[5]>0{let mut vals:Vec<i128>=(1..=8).map(|t|residual(core,del,t)).collect();mins[0]=mins[0].min(vals[0]);for d in 1..7{vals=vals.windows(2).map(|p|p[1]-p[0]).collect();mins[d]=mins[d].min(vals[0])}}roots+=1}
            layout=next_rooted(&valid,None)
        }
        assert_eq!(trees,expected);assert_eq!(roots,expected*n as u64);assert!(mins.iter().all(|v|*v>=0));
        println!("core_n=24 trees={trees} roots={roots} low_newton_minima={:?} negative=[]",mins);
        println!("PASS_EXACT_RANK7_TERMINAL_BROOM_LOW_NEWTON_ALL_ROOTED_CORES_N24")
    }
}
fn main(){base::run()}
