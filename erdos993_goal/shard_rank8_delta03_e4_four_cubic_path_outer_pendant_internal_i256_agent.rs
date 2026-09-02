include!("rank8_delta03_e4_exact_prefix_shard_common_agent.rs");

mod engine {
    include!("produce_rank8_delta03_e4_four_cubic_path_outer_pendant_internal_i256_agent.rs");
    define_exact_prefix_shard_entry!(
        opi_prefixes,
        opi_rights,
        opi_prefix_worker,
        "four_cubic_path:outer_pendant_internal",
        "872E2F1B0DC827F19E619225C6365329606AC180FD375E04072BF37D8A3DA672",
        3_136,
        87_808
    );
}

fn main() {
    engine::exact_prefix_shard_entry();
}
