include!("rank8_delta03_e4_exact_prefix_shard_common_agent.rs");

mod engine {
    include!("produce_rank8_delta03_e4_four_cubic_path_inner_pendant_internal_i256_agent.rs");
    define_exact_prefix_shard_entry!(
        ipi_prefixes,
        ipi_rights,
        ipi_prefix_worker,
        "four_cubic_path:inner_pendant_internal",
        "583669652F2185B44807A52825D3E281B540FE8981222406025012A55A4487D8",
        12_544,
        12_544
    );
}

fn main() {
    engine::exact_prefix_shard_entry();
}
