// Six-thread exact WROM census for Delta0..Delta3 at one core order.
// Arguments: ORDER THREADS.  Supported orders are 23..27; THREADS is 1..=6.
//
// Each worker deterministically replays the canonical WROM successor up to
// its adjacent half-open tree-index range and evaluates only that range.  The
// parent verifies exact coverage, the known A000055 count, and all minima.

mod exact {
    include!("verify_rank8_terminal_delta5_finite.rs");

    #[derive(Debug)]
    pub struct Chunk {
        pub start: u64,
        pub stop: u64,
        pub seen: u64,
        pub processed: u64,
        pub roots: u64,
        pub active: u64,
        pub minima: [i128; 4],
        pub active_minima: [i128; 4],
        pub negative_counts: [u64; 4],
        pub witnesses: [Option<(Vec<usize>, usize)>; 4],
    }

    pub fn scan(order: usize, start: u64, limit: u64) -> Chunk {
        let stop = start + limit;
        let mut layout: Option<Vec<usize>> =
            Some((0..=order / 2).chain(1..((order + 1) / 2)).collect());
        let mut seen = 0_u64;
        let mut processed = 0_u64;
        let mut roots = 0_u64;
        let mut active = 0_u64;
        let mut minima = [i128::MAX; 4];
        let mut active_minima = [i128::MAX; 4];
        let mut negative_counts = [0_u64; 4];
        let mut witnesses: [Option<(Vec<usize>, usize)>; 4] = std::array::from_fn(|_| None);

        while let Some(candidate) = layout {
            layout = next_tree(&candidate);
            let valid = match layout.clone() { Some(value) => value, None => break };
            let index = seen;
            seen += 1;
            if index >= start && index < stop {
                let adjacency = adjacency(&valid);
                let mut memo = vec![None; order * order];
                let state = root(0, &adjacency, &mut memo);
                let core = add(state.excluded, state.included);
                for vertex in 0..order {
                    let deleted = root(vertex, &adjacency, &mut memo).excluded;
                    let mut residuals: Vec<i128> =
                        (1..=4).map(|siblings| residual(core, deleted, siblings)).collect();
                    let mut values = [0_i128; 4];
                    values[0] = residuals[0];
                    for rank in 1..=3 {
                        residuals = residuals.windows(2).map(|pair| pair[1] - pair[0]).collect();
                        values[rank] = residuals[0];
                    }
                    for rank in 0..4 {
                        if values[rank] < minima[rank] {
                            minima[rank] = values[rank];
                            witnesses[rank] = Some((valid.clone(), vertex));
                        }
                        if values[rank] < 0 {
                            negative_counts[rank] += 1;
                            eprintln!("FIRST_NEGATIVE order={} tree_index={} layout={:?} root={} rank={} value={}",
                                order, index, valid, vertex, rank, values[rank]);
                            panic!("negative terminal residual");
                        }
                    }
                    if core[7] > 0 && deleted[6] > 0 {
                        active += 1;
                        for rank in 0..4 {
                            active_minima[rank] = active_minima[rank].min(values[rank]);
                        }
                    }
                    roots += 1;
                }
                processed += 1;
                if processed == limit { break; }
            }
            layout = next_rooted(&valid, None);
        }
        assert_eq!(seen, stop, "worker successor prefix count mismatch");
        assert_eq!(processed, limit, "worker processed count mismatch");
        assert_eq!(roots, limit * order as u64, "worker rooted count mismatch");
        assert_eq!(negative_counts, [0, 0, 0, 0]);
        Chunk {
            start, stop, seen, processed, roots, active, minima, active_minima,
            negative_counts, witnesses,
        }
    }
}

use std::env;
use std::thread;
use std::time::Instant;

fn expected(order: usize) -> u64 {
    match order {
        23 => 14_828_074,
        24 => 39_299_897,
        25 => 104_636_890,
        26 => 279_793_450,
        27 => 751_065_460,
        _ => panic!("supported order is 23..27"),
    }
}

fn witness_json(witness: &(Vec<usize>, usize)) -> String {
    format!("{{\"layout\":{:?},\"root\":{}}}", witness.0, witness.1)
}

fn main() {
    let args: Vec<String> = env::args().collect();
    let order: usize = args.get(1).expect("ORDER").parse().unwrap();
    let workers: usize = args.get(2).expect("THREADS").parse().unwrap();
    assert!((1..=6).contains(&workers));
    let universe = expected(order);
    let timer = Instant::now();

    let base = universe / workers as u64;
    let extra = universe % workers as u64;
    let mut cursor = 0_u64;
    let mut declared = Vec::with_capacity(workers);
    let mut handles = Vec::with_capacity(workers);
    for worker in 0..workers {
        let length = base + u64::from((worker as u64) < extra);
        let start = cursor;
        let stop = start + length;
        cursor = stop;
        declared.push((worker, start, stop));
        handles.push(thread::spawn(move || exact::scan(order, start, length)));
    }
    assert_eq!(cursor, universe);
    let mut chunks = Vec::with_capacity(workers);
    for handle in handles { chunks.push(handle.join().expect("worker panic")); }

    let mut trees = 0_u64;
    let mut roots = 0_u64;
    let mut active = 0_u64;
    let mut negative_counts = [0_u64; 4];
    let mut minima = [i128::MAX; 4];
    let mut active_minima = [i128::MAX; 4];
    let mut best = [0_usize; 4];
    for (index, chunk) in chunks.iter().enumerate() {
        assert_eq!(chunk.start, declared[index].1);
        assert_eq!(chunk.stop, declared[index].2);
        assert_eq!(chunk.seen, chunk.stop);
        if index > 0 { assert_eq!(chunks[index - 1].stop, chunk.start); }
        trees += chunk.processed;
        roots += chunk.roots;
        active += chunk.active;
        for rank in 0..4 {
            negative_counts[rank] += chunk.negative_counts[rank];
            if chunk.minima[rank] < minima[rank] {
                minima[rank] = chunk.minima[rank];
                best[rank] = index;
            }
            active_minima[rank] = active_minima[rank].min(chunk.active_minima[rank]);
        }
    }
    assert_eq!(chunks.first().unwrap().start, 0);
    assert_eq!(chunks.last().unwrap().stop, universe);
    assert_eq!(trees, universe);
    assert_eq!(roots, universe * order as u64);
    assert_eq!(active, roots);
    assert_eq!(negative_counts, [0, 0, 0, 0]);

    let ranges = chunks.iter().enumerate().map(|(index, chunk)| format!(
        "{{\"worker\":{},\"start\":{},\"stop\":{},\"seen_prefix\":{},\"processed\":{},\"roots\":{},\"active\":{}}}",
        index, chunk.start, chunk.stop, chunk.seen, chunk.processed, chunk.roots, chunk.active
    )).collect::<Vec<_>>().join(",");
    let witnesses = (0..4).map(|rank| {
        witness_json(chunks[best[rank]].witnesses[rank].as_ref().expect("minimum witness"))
    }).collect::<Vec<_>>().join(",");
    println!("{{\"status\":\"PASS_EXACT_RANK8_TERMINAL_DELTA03_FINITE_WROM_THREADED\",\"order\":{},\"threads\":{},\"trees\":{},\"roots\":{},\"active\":{},\"minima\":[{},{},{},{}],\"active_minima\":[{},{},{},{}],\"negative_counts\":[{},{},{},{}],\"minimum_witnesses\":[{}],\"worker_ranges\":[{}],\"runtime_seconds\":{:.6}}}",
        order, workers, trees, roots, active,
        minima[0], minima[1], minima[2], minima[3],
        active_minima[0], active_minima[1], active_minima[2], active_minima[3],
        negative_counts[0], negative_counts[1], negative_counts[2], negative_counts[3],
        witnesses, ranges, timer.elapsed().as_secs_f64());
}
