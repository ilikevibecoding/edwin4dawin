include!("rank8_delta03_e4_exact_prefix_shard_common_agent.rs");

mod engine {
    include!("produce_rank8_delta03_e4_four_cubic_star_pendant_internal_i256_agent.rs");
    define_exact_prefix_shard_entry!(
        psp_prefixes,
        psp_module_pairs,
        psp_prefix_worker,
        "four_cubic_star:pendant_internal",
        "67AFF9B1C8A046C7B175BD1468B4D19A6F89D8E965AC9D1122FEE9ACFC19B1FB",
        3_136,
        25_200
    );
}

fn main() {
    engine::exact_prefix_shard_entry();
}
