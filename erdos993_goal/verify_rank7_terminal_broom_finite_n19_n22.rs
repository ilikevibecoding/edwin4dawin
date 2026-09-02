// Exact WROM certificate for the finite terminal-broom bridge at n=19..22.
mod base {
    include!("verify_rank7_terminal_broom_finite.rs");
    pub fn run(first:usize,last:usize){
        let expected:[u64;23]=[0,1,1,1,2,3,6,11,23,47,106,235,551,1301,3159,7741,19320,48629,123867,317955,823065,2144505,5623756];
        assert!(19<=first&&first<=last&&last<=22);
        for n in first..=last{
            let mut layout:Option<Vec<usize>>=Some((0..=n/2).chain(1..((n+1)/2)).collect());let mut trees=0u64;let mut roots=0u64;let mut mins=[i128::MAX;14];
            while let Some(cand)=layout{
                layout=next_tree(&cand);let valid=match layout.clone(){Some(v)=>v,None=>break};let a=adjacency(&valid);let mut memo=vec![None;n*n];let s=root(0,&a,&mut memo);let core=add(s.excluded,s.included);trees+=1;
                for v in 0..n{let del=root(v,&a,&mut memo).excluded;if core[6]>0&&del[5]>0{let mut vals:Vec<i128>=(1..=15).map(|t|residual(core,del,t)).collect();mins[0]=mins[0].min(vals[0]);for d in 1..14{vals=vals.windows(2).map(|p|p[1]-p[0]).collect();mins[d]=mins[d].min(vals[0])}}roots+=1}
                layout=next_rooted(&valid,None)
            }
            assert_eq!(trees,expected[n]);assert_eq!(roots,expected[n]*n as u64);assert!(mins.iter().all(|v|*v>=0));
            println!("core_n={n} trees={trees} roots={roots} minima={:?} negative=[]",mins);
        }
        println!("PASS_EXACT_RANK7_TERMINAL_BROOM_ALL_ROOTED_CORES_N{first}_THROUGH_N{last}")
    }
}
fn main(){let a:Vec<String>=std::env::args().collect();let first=a.get(1).and_then(|s|s.parse().ok()).unwrap_or(19);let last=a.get(2).and_then(|s|s.parse().ok()).unwrap_or(20);base::run(first,last)}
