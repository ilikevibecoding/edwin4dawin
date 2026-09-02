// Exact graph6/geng partition scanner for Delta0..Delta3 at core order 27.
// Arguments: RES MOD.  The six-partition launcher uses RES=0..5, MOD=6.

mod exact {
    include!("verify_rank8_terminal_delta5_finite.rs");

    pub fn all_deltas(adjacency: &[Vec<usize>]) -> Vec<[i128; 4]> {
        let mut memo = vec![None; adjacency.len() * adjacency.len()];
        let state = root(0, adjacency, &mut memo);
        let core = add(state.excluded, state.included);
        let mut rows = Vec::with_capacity(adjacency.len());
        for vertex in 0..adjacency.len() {
            let deleted = root(vertex, adjacency, &mut memo).excluded;
            let mut values: Vec<i128> = (1..=4).map(|t| residual(core, deleted, t)).collect();
            let mut out = [0_i128; 4];
            out[0] = values[0];
            for rank in 1..=3 {
                values = values.windows(2).map(|pair| pair[1] - pair[0]).collect();
                out[rank] = values[0];
            }
            rows.push(out);
        }
        rows
    }
}

use std::env;
use std::io::{BufRead, BufReader, Read};
use std::process::{Command, Stdio};
use std::time::Instant;

const N: usize = 27;

fn parse_graph6(line: &[u8]) -> Vec<Vec<usize>> {
    let data = if line.starts_with(b">>graph6<<") { &line[10..] } else { line };
    assert!(!data.is_empty());
    assert_eq!(data[0] as usize, N + 63, "unexpected graph6 order byte");
    let mut adjacency = vec![Vec::new(); N];
    let mut bit_index = 0_usize;
    for high in 1..N {
        for low in 0..high {
            let byte = data[1 + bit_index / 6];
            assert!((63..=126).contains(&byte), "invalid graph6 byte");
            let bit = (byte - 63) >> (5 - bit_index % 6) & 1;
            if bit != 0 {
                adjacency[low].push(high);
                adjacency[high].push(low);
            }
            bit_index += 1;
        }
    }
    assert!(data.len() >= 1 + (bit_index + 5) / 6);
    let edge_count: usize = adjacency.iter().map(Vec::len).sum::<usize>() / 2;
    assert_eq!(edge_count, N - 1, "geng row is not a tree by edge count");
    let mut stack = vec![0_usize];
    let mut seen = vec![false; N];
    seen[0] = true;
    while let Some(vertex) = stack.pop() {
        for &neighbor in &adjacency[vertex] {
            if !seen[neighbor] { seen[neighbor] = true; stack.push(neighbor); }
        }
    }
    assert!(seen.iter().all(|value| *value), "geng row is disconnected");
    adjacency
}

fn hex(bytes: &[u8]) -> String {
    bytes.iter().map(|byte| format!("{byte:02X}")).collect::<Vec<_>>().join("")
}

fn main() {
    let args: Vec<String> = env::args().collect();
    let residue: usize = args.get(1).expect("RES").parse().unwrap();
    let modulus: usize = args.get(2).expect("MOD").parse().unwrap();
    assert!(modulus >= 1 && residue < modulus);
    let timer = Instant::now();
    let partition = format!("{residue}/{modulus}");
    let mut child = Command::new("nauty2_8_9/geng.exe")
        .args(["-cq", "27", "26:26", &partition])
        .stdout(Stdio::piped()).stderr(Stdio::piped()).spawn().expect("spawn geng");
    let stdout = child.stdout.take().expect("geng stdout");
    let mut reader = BufReader::with_capacity(1 << 20, stdout);
    let mut buffer = Vec::with_capacity(64);
    let mut trees = 0_u64;
    let mut roots = 0_u64;
    let mut active = 0_u64;
    let mut minima = [i128::MAX; 4];
    let mut active_minima = [i128::MAX; 4];
    let mut witnesses: [Option<(String, usize)>; 4] = std::array::from_fn(|_| None);
    let mut negative_counts = [0_u64; 4];

    loop {
        buffer.clear();
        let bytes = reader.read_until(b'\n', &mut buffer).expect("read geng");
        if bytes == 0 { break; }
        while matches!(buffer.last(), Some(b'\n' | b'\r')) { buffer.pop(); }
        if buffer.is_empty() { continue; }
        let adjacency = parse_graph6(&buffer);
        let rows = exact::all_deltas(&adjacency);
        let graph_hex = hex(&buffer);
        for (vertex, values) in rows.iter().enumerate() {
            for rank in 0..4 {
                if values[rank] < minima[rank] {
                    minima[rank] = values[rank];
                    witnesses[rank] = Some((graph_hex.clone(), vertex));
                }
                if values[rank] < 0 { negative_counts[rank] += 1; }
            }
            // At order 27 both c7 and every root-deleted h6 are positive.
            active += 1;
            for rank in 0..4 { active_minima[rank] = active_minima[rank].min(values[rank]); }
            roots += 1;
        }
        trees += 1;
    }
    drop(reader);
    let mut stderr = String::new();
    child.stderr.take().expect("geng stderr").read_to_string(&mut stderr).unwrap();
    let status = child.wait().expect("wait geng");
    assert!(status.success(), "geng failed: {}", stderr);
    assert!(stderr.trim().is_empty(), "unexpected geng stderr: {}", stderr);
    assert!(trees > 0);
    assert_eq!(roots, trees * N as u64);
    assert_eq!(active, roots);
    assert_eq!(negative_counts, [0, 0, 0, 0]);

    let witness_json = witnesses.iter().map(|row| {
        let (graph6_hex, root) = row.as_ref().expect("witness");
        format!("{{\"graph6_hex\":\"{}\",\"root\":{}}}", graph6_hex, root)
    }).collect::<Vec<_>>().join(",");
    println!("{{\"status\":\"PASS_EXACT_RANK8_TERMINAL_DELTA03_N27_GENG_PARTITION\",\"order\":27,\"residue\":{},\"modulus\":{},\"trees\":{},\"roots\":{},\"active\":{},\"minima\":[{},{},{},{}],\"active_minima\":[{},{},{},{}],\"negative_counts\":[{},{},{},{}],\"minimum_witnesses\":[{}],\"runtime_seconds\":{:.6}}}",
        residue, modulus, trees, roots, active,
        minima[0], minima[1], minima[2], minima[3],
        active_minima[0], active_minima[1], active_minima[2], active_minima[3],
        negative_counts[0], negative_counts[1], negative_counts[2], negative_counts[3],
        witness_json, timer.elapsed().as_secs_f64());
}
