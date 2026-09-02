// Six-thread exact runner for one complete mixed cubic e=3 root orbit.
// Arguments: ROOT THREADS (THREADS must be 1..=6).
//
// The sealed serial scanner is included unchanged.  Each worker receives one
// deterministic half-open index range, independently traverses the canonical
// universe, and evaluates only its own range.  The parent verifies equal full
// universe counts, exact adjacent coverage, and merges minima deterministically.

mod serial {
    include!("verify_rank8_delta01_e3_cubic_mixed_newton_i256_thread_core_agent.rs");

    pub struct Chunk {
        pub start:u64,
        pub stop:u64,
        pub total:u64,
        pub done:u64,
        pub negative0:u64,
        pub negative1:u64,
        pub zero_higher:u64,
        pub min_base0:Z,
        pub min_base1:Z,
        pub min_first0:Z,
        pub min_first1:Z,
        pub witness_base0:(Vec<i32>,u16),
        pub witness_base1:(Vec<i32>,u16),
        pub witness_first0:(Vec<i32>,u16),
        pub witness_first1:(Vec<i32>,u16),
    }

    pub fn scan(root:&str, start:u64, limit:u64) -> Chunk {
        let mut audit=Audit::new(root,start,limit);
        enumerate(root,&mut audit);
        assert_eq!(audit.done,limit,"worker processed count mismatch");
        assert_eq!(audit.negative0,0,"worker Delta0 sign failure");
        assert_eq!(audit.negative1,0,"worker Delta1 sign failure");
        Chunk {
            start,
            stop:start+audit.done,
            total:audit.total,
            done:audit.done,
            negative0:audit.negative0,
            negative1:audit.negative1,
            zero_higher:audit.zero_higher,
            min_base0:audit.min_base0.expect("empty worker"),
            min_base1:audit.min_base1.expect("empty worker"),
            min_first0:audit.min_first0.expect("empty worker"),
            min_first1:audit.min_first1.expect("empty worker"),
            witness_base0:audit.witness_base0,
            witness_base1:audit.witness_base1,
            witness_first0:audit.witness_first0,
            witness_first1:audit.witness_first1,
        }
    }

    pub fn z_decimal(value:Z)->String { value.decimal() }
    pub fn z_less(left:Z,right:Z)->bool { left.cmp(right).is_lt() }
    pub fn pair(value:&(Vec<i32>,u16))->String { pair_json(value) }
}

use std::env;
use std::thread;
use std::time::Instant;

fn expected(root:&str)->u64 {
    match root {
        "outer_branch"=>592_271,
        "middle_branch"=>296_693,
        "outer_leaf"=>1_184_543,
        "middle_leaf"=>329_795,
        "outer_pendant_internal"=>10_365_407,
        "middle_pendant_internal"=>2_893_391,
        "spine_internal"=>5_236_991,
        _=>panic!("root"),
    }
}

fn main() {
    let args:Vec<String>=env::args().collect();
    let root=args.get(1).expect("root").clone();
    let workers:usize=args.get(2).expect("threads").parse().unwrap();
    assert!((1..=6).contains(&workers),"thread bound must be 1..=6");
    let universe=expected(&root);
    assert!(universe>=workers as u64,"nonempty deterministic chunks required");
    let timer=Instant::now();

    let base=universe/workers as u64;
    let extra=universe%workers as u64;
    let mut cursor=0_u64;
    let mut handles=Vec::with_capacity(workers);
    let mut declared=Vec::with_capacity(workers);
    for worker in 0..workers {
        let length=base+u64::from((worker as u64)<extra);
        let start=cursor;
        let stop=start+length;
        cursor=stop;
        declared.push((worker,start,stop));
        let worker_root=root.clone();
        handles.push(thread::spawn(move || serial::scan(&worker_root,start,length)));
    }
    assert_eq!(cursor,universe,"parent range partition mismatch");

    let mut chunks=Vec::with_capacity(workers);
    for handle in handles { chunks.push(handle.join().expect("worker panic")); }
    assert_eq!(chunks.len(),workers);

    let mut processed=0_u64;
    let mut negative0=0_u64;
    let mut negative1=0_u64;
    let mut zero_higher=0_u64;
    for (index,chunk) in chunks.iter().enumerate() {
        assert_eq!(chunk.start,declared[index].1,"chunk start mismatch");
        assert_eq!(chunk.stop,declared[index].2,"chunk stop mismatch");
        assert_eq!(chunk.done,chunk.stop-chunk.start,"chunk length mismatch");
        assert_eq!(chunk.total,universe,"worker canonical universe mismatch");
        if index>0 { assert_eq!(chunks[index-1].stop,chunk.start,"chunk gap or overlap"); }
        processed=processed.checked_add(chunk.done).expect("processed count overflow");
        negative0=negative0.checked_add(chunk.negative0).expect("negative0 count overflow");
        negative1=negative1.checked_add(chunk.negative1).expect("negative1 count overflow");
        zero_higher=zero_higher.checked_add(chunk.zero_higher).expect("zero count overflow");
    }
    assert_eq!(chunks.first().unwrap().start,0);
    assert_eq!(chunks.last().unwrap().stop,universe);
    assert_eq!(processed,universe,"parent processed count mismatch");
    assert_eq!(negative0,0,"merged Delta0 sign failure");
    assert_eq!(negative1,0,"merged Delta1 sign failure");

    let mut best_base0=0_usize;
    let mut best_base1=0_usize;
    let mut best_first0=0_usize;
    let mut best_first1=0_usize;
    for index in 1..chunks.len() {
        if serial::z_less(chunks[index].min_base0,chunks[best_base0].min_base0) { best_base0=index; }
        if serial::z_less(chunks[index].min_base1,chunks[best_base1].min_base1) { best_base1=index; }
        if serial::z_less(chunks[index].min_first0,chunks[best_first0].min_first0) { best_first0=index; }
        if serial::z_less(chunks[index].min_first1,chunks[best_first1].min_first1) { best_first1=index; }
    }

    let ranges=chunks.iter().enumerate().map(|(index,chunk)| format!(
        "{{\"worker\":{},\"start\":{},\"stop\":{},\"processed\":{},\"universe\":{},\"negative0\":{},\"negative1\":{}}}",
        index,chunk.start,chunk.stop,chunk.done,chunk.total,chunk.negative0,chunk.negative1
    )).collect::<Vec<_>>().join(",");
    println!("{{\"status\":\"PASS_EXACT_MIXED_NEWTON_I256_THREADED_FULL_UNIT\",\"root\":\"{}\",\"threads\":{},\"processed\":{},\"universe\":{},\"negative0\":{},\"negative1\":{},\"zero_higher\":{},\"minimum_base0\":\"{}\",\"minimum_base1\":\"{}\",\"minimum_first0\":\"{}\",\"minimum_first1\":\"{}\",\"witness_base0\":{},\"witness_base1\":{},\"witness_first0\":{},\"witness_first1\":{},\"worker_ranges\":[{}],\"runtime_seconds\":{:.6}}}",
        root,workers,processed,universe,negative0,negative1,zero_higher,
        serial::z_decimal(chunks[best_base0].min_base0),
        serial::z_decimal(chunks[best_base1].min_base1),
        serial::z_decimal(chunks[best_first0].min_first0),
        serial::z_decimal(chunks[best_first1].min_first1),
        serial::pair(&chunks[best_base0].witness_base0),
        serial::pair(&chunks[best_base1].witness_base1),
        serial::pair(&chunks[best_first0].witness_first0),
        serial::pair(&chunks[best_first1].witness_first1),
        ranges,timer.elapsed().as_secs_f64());
}
