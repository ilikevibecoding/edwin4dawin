// Six-thread exact runner for one complete mixed cubic e=3 Delta2/Delta3 root orbit.
// Arguments: ROOT THREADS (THREADS must be 1..=6).
//
// The sealed serial scanner is included unchanged.  Workers receive adjacent,
// deterministic half-open ranges; the parent checks no gaps/overlaps, identical
// universe counts, zero failures, and deterministic global extrema.

mod serial {
    include!("verify_rank8_delta23_e3_cubic_mixed_newton_i256_thread_core_root.rs");

    pub struct Chunk {
        pub start: u64,
        pub stop: u64,
        pub total: u64,
        pub done: u64,
        pub negative2: u64,
        pub negative3: u64,
        pub zero_higher: u64,
        pub min_base2: Z,
        pub min_base3: Z,
        pub min_first2: Z,
        pub min_first3: Z,
        pub witness_base2: (Vec<i32>, u16),
        pub witness_base3: (Vec<i32>, u16),
        pub witness_first2: (Vec<i32>, u16),
        pub witness_first3: (Vec<i32>, u16),
    }

    pub fn scan(root: &str, start: u64, limit: u64) -> Chunk {
        let mut audit = Audit::new(root, start, limit);
        enumerate(root, &mut audit);
        assert_eq!(audit.done, limit, "worker processed count mismatch");
        assert_eq!(audit.negative2, 0, "worker Delta2 sign failure");
        assert_eq!(audit.negative3, 0, "worker Delta3 sign failure");
        Chunk {
            start,
            stop: start + audit.done,
            total: audit.total,
            done: audit.done,
            negative2: audit.negative2,
            negative3: audit.negative3,
            zero_higher: audit.zero_higher,
            min_base2: audit.min_base2.expect("empty worker"),
            min_base3: audit.min_base3.expect("empty worker"),
            min_first2: audit.min_first2.expect("empty worker"),
            min_first3: audit.min_first3.expect("empty worker"),
            witness_base2: audit.witness_base2,
            witness_base3: audit.witness_base3,
            witness_first2: audit.witness_first2,
            witness_first3: audit.witness_first3,
        }
    }

    pub fn z_decimal(value: Z) -> String { value.decimal() }
    pub fn z_less(left: Z, right: Z) -> bool { left.cmp(right).is_lt() }
    pub fn pair(value: &(Vec<i32>, u16)) -> String { pair_json(value) }
}

use std::env;
use std::thread;
use std::time::Instant;

fn expected(root: &str) -> u64 {
    match root {
        "outer_branch" => 592_271,
        "middle_branch" => 296_693,
        "outer_leaf" => 1_184_543,
        "middle_leaf" => 329_795,
        "outer_pendant_internal" => 10_365_407,
        "middle_pendant_internal" => 2_893_391,
        "spine_internal" => 5_236_991,
        _ => panic!("root"),
    }
}

fn main() {
    let args: Vec<String> = env::args().collect();
    let root = args.get(1).expect("root").clone();
    let workers: usize = args.get(2).expect("threads").parse().unwrap();
    assert!((1..=6).contains(&workers), "thread bound must be 1..=6");
    let universe = expected(&root);
    assert!(universe >= workers as u64, "nonempty deterministic chunks required");
    let timer = Instant::now();

    let base = universe / workers as u64;
    let extra = universe % workers as u64;
    let mut cursor = 0_u64;
    let mut handles = Vec::with_capacity(workers);
    let mut declared = Vec::with_capacity(workers);
    for worker in 0..workers {
        let length = base + u64::from((worker as u64) < extra);
        let start = cursor;
        let stop = start + length;
        cursor = stop;
        declared.push((worker, start, stop));
        let worker_root = root.clone();
        handles.push(thread::spawn(move || serial::scan(&worker_root, start, length)));
    }
    assert_eq!(cursor, universe, "parent range partition mismatch");

    let mut chunks = Vec::with_capacity(workers);
    for handle in handles { chunks.push(handle.join().expect("worker panic")); }
    assert_eq!(chunks.len(), workers);

    let mut processed = 0_u64;
    let mut negative2 = 0_u64;
    let mut negative3 = 0_u64;
    let mut zero_higher = 0_u64;
    for (index, chunk) in chunks.iter().enumerate() {
        assert_eq!(chunk.start, declared[index].1, "chunk start mismatch");
        assert_eq!(chunk.stop, declared[index].2, "chunk stop mismatch");
        assert_eq!(chunk.done, chunk.stop - chunk.start, "chunk length mismatch");
        assert_eq!(chunk.total, universe, "worker canonical universe mismatch");
        if index > 0 { assert_eq!(chunks[index - 1].stop, chunk.start, "chunk gap or overlap"); }
        processed = processed.checked_add(chunk.done).expect("processed count overflow");
        negative2 = negative2.checked_add(chunk.negative2).expect("negative2 count overflow");
        negative3 = negative3.checked_add(chunk.negative3).expect("negative3 count overflow");
        zero_higher = zero_higher.checked_add(chunk.zero_higher).expect("zero count overflow");
    }
    assert_eq!(chunks.first().unwrap().start, 0);
    assert_eq!(chunks.last().unwrap().stop, universe);
    assert_eq!(processed, universe, "parent processed count mismatch");
    assert_eq!(negative2, 0, "merged Delta2 sign failure");
    assert_eq!(negative3, 0, "merged Delta3 sign failure");

    let mut best_base2 = 0_usize;
    let mut best_base3 = 0_usize;
    let mut best_first2 = 0_usize;
    let mut best_first3 = 0_usize;
    for index in 1..chunks.len() {
        if serial::z_less(chunks[index].min_base2, chunks[best_base2].min_base2) { best_base2 = index; }
        if serial::z_less(chunks[index].min_base3, chunks[best_base3].min_base3) { best_base3 = index; }
        if serial::z_less(chunks[index].min_first2, chunks[best_first2].min_first2) { best_first2 = index; }
        if serial::z_less(chunks[index].min_first3, chunks[best_first3].min_first3) { best_first3 = index; }
    }

    let ranges = chunks.iter().enumerate().map(|(index, chunk)| format!(
        "{{\"worker\":{},\"start\":{},\"stop\":{},\"processed\":{},\"universe\":{},\"negative2\":{},\"negative3\":{}}}",
        index, chunk.start, chunk.stop, chunk.done, chunk.total, chunk.negative2, chunk.negative3
    )).collect::<Vec<_>>().join(",");
    println!("{{\"status\":\"PASS_EXACT_DELTA23_MIXED_NEWTON_I256_THREADED_FULL_UNIT\",\"root\":\"{}\",\"threads\":{},\"start\":0,\"stop\":{},\"processed\":{},\"universe\":{},\"negative2\":{},\"negative3\":{},\"zero_higher\":{},\"minimum_base2\":\"{}\",\"minimum_base3\":\"{}\",\"minimum_first2\":\"{}\",\"minimum_first3\":\"{}\",\"witness_base2\":{},\"witness_base3\":{},\"witness_first2\":{},\"witness_first3\":{},\"worker_ranges\":[{}],\"runtime_seconds\":{:.6}}}",
        root, workers, universe, processed, universe, negative2, negative3, zero_higher,
        serial::z_decimal(chunks[best_base2].min_base2),
        serial::z_decimal(chunks[best_base3].min_base3),
        serial::z_decimal(chunks[best_first2].min_first2),
        serial::z_decimal(chunks[best_first3].min_first3),
        serial::pair(&chunks[best_base2].witness_base2),
        serial::pair(&chunks[best_base3].witness_base3),
        serial::pair(&chunks[best_first2].witness_first2),
        serial::pair(&chunks[best_first3].witness_first3),
        ranges, timer.elapsed().as_secs_f64());
}
