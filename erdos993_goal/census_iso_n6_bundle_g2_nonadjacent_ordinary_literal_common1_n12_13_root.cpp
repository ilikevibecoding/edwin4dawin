#define main archived_literal_n9_13_main
#include "census_iso_n6_bundle_g2_nonadjacent_ordinary_literal_n9_13_root.cpp"
#undef main

// Exact completion of the two rows deliberately skipped by the original run.
int main(int argc, char** argv) {
    if (argc != 3) {
        std::cerr << "usage: evaluator DATASET OUTPUT_JSON\n";
        return 2;
    }
    std::ifstream input(argv[1]);
    if (!input) throw std::runtime_error("cannot open dataset");
    std::ofstream output(argv[2], std::ios::binary);
    if (!output) throw std::runtime_error("cannot open output");

    std::map<std::pair<int,int>, Stats> stats;
    std::map<int,std::uint64_t> forests_seen;
    std::map<int,std::uint64_t> order_index;
    std::uint64_t stream_hash = 1469598103934665603ULL;
    std::uint64_t graphs_total = 0;
    std::string line;
    while (std::getline(input, line)) {
        if (line.empty() || line[0] == '#') continue;
        std::size_t space = line.find(' ');
        if (space == std::string::npos) throw std::runtime_error("bad dataset line");
        int marked_order = std::stoi(line.substr(0, space));
        std::string code = line.substr(space + 1);
        Graph graph = parse_graph6(code);
        if (graph.n != marked_order) throw std::runtime_error("order mismatch");
        int common_order = marked_order - 2;
        std::uint64_t forest_index = order_index[marked_order]++;
        ++forests_seen[marked_order];
        ++graphs_total;
        if (common_order < 12) continue;
        IndependenceCache cache(graph);
        std::uint32_t full = (std::uint32_t{1} << graph.n) - 1;

        for (int u = 0; u < graph.n; ++u) {
            for (int v = u + 1; v < graph.n; ++v) {
                if ((graph.adjacency[u] >> v) & 1U) continue;
                int common_neighbors = std::popcount(
                    graph.adjacency[u] & graph.adjacency[v]
                );
                if (common_neighbors > 1) {
                    throw std::runtime_error("forest common-neighbor violation");
                }
                if (common_neighbors != 1) continue;

                std::uint32_t bit_u = std::uint32_t{1} << u;
                std::uint32_t bit_v = std::uint32_t{1} << v;
                std::uint32_t closed_u = graph.adjacency[u] | bit_u;
                std::uint32_t closed_v = graph.adjacency[v] | bit_v;
                const Row a = cache.row(full & ~(bit_u | bit_v));
                const Row b = cache.row(full & ~(bit_u | closed_v));
                const Row c = cache.row(full & ~(bit_v | closed_u));
                const Row d = cache.row(full & ~(closed_u | closed_v));
                std::int64_t no_parent = bilinear(a,a,A2) + bilinear(a,b,L2)
                    + bilinear(a,c,L2) + bilinear(b,c,K2) + bilinear(a,d,K2);

                Stats& row_stats = stats[{common_order, common_neighbors}];
                for (int p = 0; p < graph.n; ++p) {
                    if (p == u || p == v) continue;
                    std::uint32_t bit_p = std::uint32_t{1} << p;
                    const Row de = cache.row(full & ~bit_p);
                    const Row du = cache.row(full & ~(bit_p | bit_u));
                    const Row dv = cache.row(full & ~(bit_p | bit_v));
                    const Row dw = cache.row(full & ~(bit_p | bit_u | bit_v));
                    std::int64_t correction = coefficient_correction(
                        a,b,c,d,de,du,dv,dw
                    );
                    std::int64_t ordinary = no_parent + correction;
                    ++row_stats.triples;
                    row_stats.negative += ordinary < 0;
                    row_stats.negative_correction += correction < 0;
                    update_witness(
                        row_stats.minimum, ordinary, ordinary, no_parent, correction,
                        code, forest_index, u, v, p
                    );
                    update_witness(
                        row_stats.correction_minimum, correction, ordinary, no_parent,
                        correction, code, forest_index, u, v, p
                    );
                    for (std::int64_t value : {
                        static_cast<std::int64_t>(marked_order),
                        static_cast<std::int64_t>(forest_index),
                        static_cast<std::int64_t>(u),
                        static_cast<std::int64_t>(v),
                        static_cast<std::int64_t>(p),
                        no_parent, correction, ordinary
                    }) hash_u64(stream_hash, static_cast<std::uint64_t>(value));
                }
            }
        }
        if (graphs_total % 1000 == 0) {
            std::cerr << "PROGRESS graphs=" << graphs_total
                      << " marked_order=" << marked_order << "\n";
        }
    }

    std::uint64_t total_triples = 0;
    std::uint64_t total_negative = 0;
    std::int64_t global_minimum = std::numeric_limits<std::int64_t>::max();
    for (const auto& [key, value] : stats) {
        total_triples += value.triples;
        total_negative += value.negative;
        global_minimum = std::min(global_minimum, value.minimum.ordinary);
    }
    if (stats.size() != 2 || !stats.contains({12,1}) || !stats.contains({13,1})) {
        throw std::runtime_error("incomplete N12/N13 common1 coverage");
    }
    const std::string marker = total_negative == 0
        ? "PASS_EXACT_ISO_N6_BUNDLE_G2_NONADJACENT_ORDINARY_LITERAL_COMMON1_N12_13_ROOT"
        : "COUNTEREXAMPLE_ISO_N6_BUNDLE_G2_NONADJACENT_ORDINARY_LITERAL_COMMON1_N12_13_ROOT";

    output << "{\n  \"marker\": \"" << marker << "\",\n";
    output << "  \"dataset_sha256\": \"A043EE3A7288E7DD41D4EEB226C0B58DAEF13CB70331D77844A2FAB8B04A8484\",\n";
    output << "  \"coverage\": \"all unlabeled forests of marked orders 14..15; every unordered nonedge uv with exactly one common neighbor and every p distinct from u,v; N=12..13 common1\",\n";
    output << "  \"rows\": {\n";
    bool first = true;
    for (const auto& [key,value] : stats) {
        if (!first) output << ",\n";
        first = false;
        const Witness& witness = value.minimum;
        output << "    \"N" << key.first << "_common" << key.second << "\": {"
               << "\"triples\": " << value.triples
               << ", \"negative\": " << value.negative
               << ", \"negative_correction\": " << value.negative_correction
               << ", \"minimum\": " << witness.ordinary
               << ", \"minimum_correction\": "
               << value.correction_minimum.ordinary
               << ", \"minimum_witness\": {"
               << "\"graph6\": \"" << json_escape(witness.graph6) << "\""
               << ", \"forest_index\": " << witness.forest_index
               << ", \"u\": " << witness.u << ", \"v\": " << witness.v
               << ", \"p\": " << witness.p
               << ", \"no_parent\": " << witness.no_parent
               << ", \"correction\": " << witness.correction << "}}";
    }
    output << "\n  },\n";
    output << "  \"aggregate\": {\"triples\": " << total_triples
           << ", \"negative\": " << total_negative
           << ", \"global_minimum\": " << global_minimum
           << ", \"ordered_record_fnv1a64\": \"" << hex64(stream_hash) << "\"},\n";
    output << "  \"exactness\": \"signed 64-bit integer arithmetic; all intermediate magnitudes are below 2^63 in this order range\"\n}\n";
    output.close();

    std::cout << "MARKER " << marker << "\n"
              << "TRIPLES " << total_triples << "\n"
              << "NEGATIVE " << total_negative << "\n"
              << "GLOBAL_MINIMUM " << global_minimum << "\n"
              << "ORDERED_RECORD_FNV1A64 " << hex64(stream_hash) << "\n";
    return total_negative == 0 ? 0 : 3;
}
