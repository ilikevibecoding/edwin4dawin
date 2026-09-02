// Six-thread checked-i256 producer for four_cubic_star:outer_branch.

include!("rank8_delta03_e4_literal_i256_audit_common_agent.rs");

use std::sync::Arc;
use std::thread;

const THREADS: usize = 6;

#[derive(Clone, Copy)]
struct OBState { value: i32, long: bool }

#[derive(Clone, Copy)]
struct OBModule { arm_a: OBState, arm_b: OBState, spine: OBState }

fn ob_arm(index: i32) -> OBState {
    if index == 6 { OBState { value: 7, long: true } }
    else { OBState { value: index + 1, long: false } }
}

fn ob_spine(index: i32) -> OBState {
    if index == 7 { OBState { value: 8, long: true } }
    else { OBState { value: index + 1, long: false } }
}

fn ob_modules() -> Vec<OBModule> {
    let mut out = Vec::with_capacity(224);
    for a in 0..7_i32 { for b in a..7 { for spine in 0..8_i32 {
        out.push(OBModule { arm_a: ob_arm(a), arm_b: ob_arm(b), spine: ob_spine(spine) });
    }}}
    assert_eq!(out.len(), 224);
    out
}

fn ob_states(root: OBModule, left: OBModule, right: OBModule) -> [OBState; 9] {
    [root.arm_a,root.arm_b,root.spine,left.arm_a,left.arm_b,left.spine,right.arm_a,right.arm_b,right.spine]
}

fn ob_lengths(states: &[OBState; 9]) -> [i32; 9] {
    std::array::from_fn(|index| states[index].value)
}

fn ob_module_poly(a: i32, b: i32, center_arm: i32) -> V {
    let excluded = product(&[path(a),path(b),path(center_arm)]);
    let included = shifted(&product(&[path(a-1),path(b-1),path(center_arm-1)]),1);
    add(&excluded,&included)
}

fn ob_formula(lengths: &[i32; 9]) -> (V,V) {
    let free: [V;3] = std::array::from_fn(|module| {
        let base=3*module;
        ob_module_poly(lengths[base],lengths[base+1],lengths[base+2]-1)
    });
    let blocked: [V;3] = std::array::from_fn(|module| {
        let base=3*module;
        ob_module_poly(lengths[base],lengths[base+1],lengths[base+2]-2)
    });
    let full_deleted_center = product(&free);
    let core = add(&full_deleted_center,&shifted(&product(&blocked),1));
    let center_component = add(
        &product(&[path(lengths[2]-1),free[1],free[2]]),
        &shifted(&product(&[path(lengths[2]-2),blocked[1],blocked[2]]),1),
    );
    let deleted_outer = product(&[path(lengths[0]),path(lengths[1]),center_component]);
    (core,deleted_outer)
}

fn ob_values(lengths: &[i32;9]) -> [Z;4] {
    let (c,h)=ob_formula(lengths);
    deltas03(&c,&h)
}

fn ob_sha_bytes(mut hash: AuditSha256) -> [u8;32] {
    let bits=hash.bytes.checked_mul(8).expect("sha length overflow");
    hash.buffer[hash.used]=0x80;
    hash.used+=1;
    if hash.used>56 {
        for i in hash.used..64 { hash.buffer[i]=0; }
        let block=hash.buffer;
        hash.block(&block);
        hash.buffer=[0;64];
        hash.used=0;
    }
    for i in hash.used..56 { hash.buffer[i]=0; }
    hash.buffer[56..64].copy_from_slice(&bits.to_be_bytes());
    let block=hash.buffer;
    hash.block(&block);
    let mut out=[0_u8;32];
    for i in 0..8 { out[4*i..4*i+4].copy_from_slice(&hash.state[i].to_be_bytes()); }
    out
}

fn ob_hash_state(hash: &mut AuditSha256,state: OBState) {
    hash.update(&[state.long as u8]);
    hash.update(&state.value.to_le_bytes());
}

fn ob_hash_z(hash: &mut AuditSha256,value: Z) {
    hash.update(&[value.negative as u8]);
    for limb in value.limbs { hash.update(&limb.to_le_bytes()); }
}

fn ob_coefficient_leaf(states: &[OBState;9],baseline:i32,shift:i32,rows:&[[Z;AUDIT_SAMPLES];4]) -> [u8;32] {
    let mut hash=AuditSha256::new();
    hash.update(b"outer-branch-coefficient-v1\0");
    for &state in states { ob_hash_state(&mut hash,state); }
    hash.update(&baseline.to_le_bytes());
    hash.update(&shift.to_le_bytes());
    for row in rows { for &value in row { ob_hash_z(&mut hash,value); }}
    ob_sha_bytes(hash)
}

fn ob_finite_leaf(states:&[OBState;9],order:i32,values:&[Z;4]) -> [u8;32] {
    let mut hash=AuditSha256::new();
    hash.update(b"outer-branch-finite-v1\0");
    for &state in states { ob_hash_state(&mut hash,state); }
    hash.update(&order.to_le_bytes());
    for &value in values { ob_hash_z(&mut hash,value); }
    ob_sha_bytes(hash)
}

fn ob_build_literal(lengths:&[i32;9]) -> (Vec<Vec<usize>>,usize) {
    let mut adjacency=vec![Vec::new()];
    let center=0;
    let mut root=usize::MAX;
    for module in 0..3 {
        let base=3*module;
        let outer=audit_attach(&mut adjacency,center,lengths[base+2]);
        if module==0 { root=outer; }
        audit_attach(&mut adjacency,outer,lengths[base]);
        audit_attach(&mut adjacency,outer,lengths[base+1]);
    }
    assert_eq!(adjacency.len(),1+lengths.iter().sum::<i32>() as usize);
    (adjacency,root)
}

struct OBResult {
    id:usize,
    counts:[u64;5],
    unseen:u64,
    coefficient_leaves:Vec<u8>,
    finite_leaves:Vec<u8>,
    literal_checks:u64,
}

fn ob_worker(id:usize,start:usize,end:usize,modules:Arc<Vec<OBModule>>) -> OBResult {
    let mut counts=[0_u64;5]; // all-short, finite, mixed, all-long, rays
    let mut unseen=0_u64;
    let mut coefficient_leaves=Vec::new();
    let mut finite_leaves=Vec::new();
    let mut literal_checks=0_u64;
    for root_index in start..end {
        let root=modules[root_index];
        for left_index in 0..modules.len() {
            for right_index in left_index..modules.len() {
                let states=ob_states(root,modules[left_index],modules[right_index]);
                let flags:[bool;9]=std::array::from_fn(|index| states[index].long);
                let long_count=flags.iter().filter(|&&value|value).count();
                let mut lengths=ob_lengths(&states);
                if long_count==0 {
                    counts[0]+=1;
                    let order=1+lengths.iter().sum::<i32>();
                    if order<27 { continue; }
                    let values=ob_values(&lengths);
                    assert!(values.iter().all(|value|value.is_positive()),"finite nonpositive");
                    finite_leaves.extend_from_slice(&ob_finite_leaf(&states,order,&values));
                    if literal_checks<16 {
                        let (adjacency,root_vertex)=ob_build_literal(&lengths);
                        let (literal,_,_)=audit_deltas(&adjacency,root_vertex);
                        assert_eq!(literal,values,"producer literal spot mismatch");
                        literal_checks+=1;
                    }
                    counts[1]+=1;
                    continue;
                }
                if long_count==9 { counts[3]+=1; } else { counts[2]+=1; }
                let baseline=1+lengths.iter().sum::<i32>();
                let shift=(27-baseline).max(0);
                let first=flags.iter().position(|&value|value).unwrap();
                let base_first=lengths[first];
                let mut samples=[[Z::zero();AUDIT_SAMPLES];4];
                for sample in 0..AUDIT_SAMPLES {
                    lengths[first]=base_first+shift+sample as i32;
                    let values=ob_values(&lengths);
                    for rank in 0..4 { samples[rank][sample]=values[rank]; }
                }
                let coefficients:[[Z;AUDIT_SAMPLES];4]=std::array::from_fn(|rank|audit_differences(&samples[rank]));
                audit_assert_gate(&coefficients);
                coefficient_leaves.extend_from_slice(&ob_coefficient_leaf(&states,baseline,shift,&coefficients));
                lengths[first]=base_first+shift+AUDIT_SAMPLES as i32;
                let next=ob_values(&lengths);
                for rank in 0..4 {
                    assert_eq!(next[rank],audit_newton_at_29(&coefficients[rank]),"unseen mismatch");
                    unseen+=1;
                }
                if literal_checks<32 {
                    let (adjacency,root_vertex)=ob_build_literal(&lengths);
                    let (literal,_,_)=audit_deltas(&adjacency,root_vertex);
                    assert_eq!(literal,next,"producer literal ray spot mismatch");
                    literal_checks+=1;
                }
                counts[4]+=1;
            }
        }
        eprintln!("WORKER {} ROOT {}/{}",id,root_index+1,end);
    }
    assert_eq!(coefficient_leaves.len(),counts[4] as usize*32);
    assert_eq!(finite_leaves.len(),counts[1] as usize*32);
    OBResult{id,counts,unseen,coefficient_leaves,finite_leaves,literal_checks}
}

fn main() {
    audit_sha_self_test();
    let modules=Arc::new(ob_modules());
    let mut handles=Vec::new();
    for id in 0..THREADS {
        let start=id*modules.len()/THREADS;
        let end=(id+1)*modules.len()/THREADS;
        let cloned=Arc::clone(&modules);
        handles.push(thread::spawn(move||ob_worker(id,start,end,cloned)));
    }
    let mut results:Vec<OBResult>=handles.into_iter().map(|handle|handle.join().expect("worker panic")).collect();
    results.sort_by_key(|row|row.id);
    let mut counts=[0_u64;5];
    let mut unseen=0_u64;
    let mut literal_checks=0_u64;
    let mut coefficient_master=AuditSha256::new();
    let mut finite_master=AuditSha256::new();
    for row in results {
        for index in 0..5 { counts[index]+=row.counts[index]; }
        unseen+=row.unseen;
        literal_checks+=row.literal_checks;
        coefficient_master.update(&row.coefficient_leaves);
        finite_master.update(&row.finite_leaves);
    }
    assert_eq!(counts,[1_599_066,1_448_115,4_045_733,1,4_045_734]);
    assert_eq!(unseen,16_182_936);
    let raw=format!(
        "PASS_I256_FOUR_CUBIC_STAR_OUTER_BRANCH_PRODUCER\nCOUNTS {} {} {} {} {}\nUNSEEN {}\nLITERAL_SPOT_CHECKS {}\nCOEFFICIENT_MERKLE_STREAM {}\nFINITE_MERKLE_STREAM {}\n",
        counts[0],counts[1],counts[2],counts[3],counts[4],unseen,literal_checks,coefficient_master.hex(),finite_master.hex(),
    );
    std::fs::write("rank8_delta03_e4_four_cubic_star_outer_branch_i256_raw_agent_20260823.txt",raw.as_bytes()).expect("raw write");
    print!("{}",raw);
}
