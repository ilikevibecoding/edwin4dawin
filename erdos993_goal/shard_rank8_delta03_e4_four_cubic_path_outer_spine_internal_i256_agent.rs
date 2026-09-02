include!("rank8_delta03_e4_exact_prefix_shard_common_agent.rs");

mod engine {
    include!("produce_rank8_delta03_e4_four_cubic_path_outer_spine_internal_i256_agent.rs");
    define_exact_prefix_shard_entry!(
        osi_prefixes,
        osi_rights,
        osi_worker,
        "four_cubic_path:outer_spine_internal",
        "DD15B8BB51B931BDCA7802C5CB0C9DE07CBB195264FDE8D812DCF1C952E7224E",
        1_792,
        87_808
    );
}

fn main() {
    engine::exact_prefix_shard_entry();
}
