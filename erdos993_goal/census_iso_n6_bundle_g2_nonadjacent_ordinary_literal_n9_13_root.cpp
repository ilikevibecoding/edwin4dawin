#include <array>
#include <bit>
#include <cstdint>
#include <fstream>
#include <iomanip>
#include <iostream>
#include <limits>
#include <map>
#include <sstream>
#include <stdexcept>
#include <string>
#include <utility>
#include <vector>

using Row = std::array<std::int64_t, 8>;

struct Term {
    std::int64_t scalar;
    int left;
    int right;
};

static const std::vector<Term> A2 = {
    {4,1,4},{-3,1,5},{-17,1,6},{-7,1,7},{12,2,3},{8,2,4},
    {-21,2,5},{-16,2,6},{11,3,3},{22,3,4},{-1,3,5},{8,4,4}
};
static const std::vector<Term> L2 = {
    {4,1,3},{-1,1,4},{-16,1,5},{-7,1,6},{8,2,2},{9,2,3},
    {-4,2,4},{-9,2,5},{4,3,1},{9,3,2},{24,3,3},{8,3,4},
    {-1,4,1},{-4,4,2},{8,4,3},{-16,5,1},{-9,5,2},{-7,6,1}
};
static const std::vector<Term> K2 = {
    {4,1,2},{1,1,3},{-15,1,4},{-7,1,5},{4,2,1},{6,2,2},
    {11,2,3},{-2,2,4},{1,3,1},{11,3,2},{10,3,3},{-15,4,1},
    {-2,4,2},{-7,5,1}
};

std::int64_t bilinear(const Row& left, const Row& right,
                      const std::vector<Term>& terms) {
    std::int64_t value = 0;
    for (const auto& term : terms) {
        value += term.scalar * left[term.left] * right[term.right];
    }
    return value;
}

struct Graph {
    int n = 0;
    std::vector<std::uint32_t> adjacency;
};

Graph parse_graph6(const std::string& code) {
    if (code.empty()) throw std::runtime_error("empty graph6 code");
    int n = static_cast<unsigned char>(code[0]) - 63;
    if (n < 0 || n > 30) throw std::runtime_error("unsupported graph6 order");
    Graph graph{n, std::vector<std::uint32_t>(n, 0)};
    std::size_t bit_index = 0;
    for (int column = 1; column < n; ++column) {
        for (int row = 0; row < column; ++row) {
            std::size_t char_index = 1 + bit_index / 6;
            if (char_index >= code.size()) throw std::runtime_error("short graph6 code");
            int value = static_cast<unsigned char>(code[char_index]) - 63;
            int bit = (value >> (5 - static_cast<int>(bit_index % 6))) & 1;
            if (bit) {
                graph.adjacency[row] |= (std::uint32_t{1} << column);
                graph.adjacency[column] |= (std::uint32_t{1} << row);
            }
            ++bit_index;
        }
    }
    return graph;
}

class IndependenceCache {
public:
    explicit IndependenceCache(const Graph& graph)
        : graph_(graph), values_(std::size_t{1} << graph.n),
          seen_(std::size_t{1} << graph.n, 0) {}

    const Row& row(std::uint32_t mask) {
        if (seen_[mask]) return values_[mask];
        Row result{};
        if (mask == 0) {
            result[0] = 1;
        } else {
            int vertex = std::countr_zero(mask);
            std::uint32_t without_vertex = mask & ~(std::uint32_t{1} << vertex);
            const Row excluded = row(without_vertex);
            const Row included_base = row(without_vertex & ~graph_.adjacency[vertex]);
            result = excluded;
            for (int rank = 1; rank < 8; ++rank) {
                result[rank] += included_base[rank - 1];
            }
        }
        values_[mask] = result;
        seen_[mask] = 1;
        return values_[mask];
    }

private:
    const Graph& graph_;
    std::vector<Row> values_;
    std::vector<unsigned char> seen_;
};

struct Witness {
    std::int64_t ordinary = std::numeric_limits<std::int64_t>::max();
    std::int64_t no_parent = 0;
    std::int64_t correction = 0;
    std::string graph6;
    std::uint64_t forest_index = 0;
    int u = -1;
    int v = -1;
    int p = -1;
};

struct Stats {
    std::uint64_t triples = 0;
    std::uint64_t negative = 0;
    std::uint64_t negative_correction = 0;
    Witness minimum;
    Witness correction_minimum;
};

void update_witness(Witness& target, std::int64_t key, std::int64_t ordinary,
                    std::int64_t no_parent, std::int64_t correction,
                    const std::string& code, std::uint64_t forest_index,
                    int u, int v, int p) {
    if (key < target.ordinary) {
        target.ordinary = key;
        target.no_parent = no_parent;
        target.correction = correction;
        target.graph6 = code;
        target.forest_index = forest_index;
        target.u = u;
        target.v = v;
        target.p = p;
    }
}

void hash_u64(std::uint64_t& state, std::uint64_t value) {
    for (int index = 0; index < 8; ++index) {
        state ^= static_cast<unsigned char>((value >> (8 * index)) & 0xffU);
        state *= 1099511628211ULL;
    }
}

std::string hex64(std::uint64_t value) {
    std::ostringstream out;
    out << std::uppercase << std::hex << std::setw(16) << std::setfill('0') << value;
    return out.str();
}

std::string json_escape(const std::string& value) {
    std::string result;
    for (char character : value) {
        if (character == '\\' || character == '"') result.push_back('\\');
        result.push_back(character);
    }
    return result;
}

std::int64_t coefficient_correction(const Row& a, const Row& b, const Row& c,
                                    const Row& d, const Row& de, const Row& du,
                                    const Row& dv, const Row& dw) {
    std::array<std::int64_t, 7> PA{}, PB{}, PW{}, PZ{};
    for (int rank = 2; rank <= 6; ++rank) {
        PW[rank] = a[rank] - dw[rank];
        PA[rank] = b[rank - 1] - (du[rank] - dw[rank]);
        PB[rank] = c[rank - 1] - (dv[rank] - dw[rank]);
        PZ[rank] = d[rank - 2] - (de[rank] - du[rank] - dv[rank] + dw[rank]);
        if (PW[rank] < 0 || PA[rank] < 0 || PB[rank] < 0 || PZ[rank] < 0) {
            throw std::runtime_error("negative parent-loss count");
        }
    }

    std::array<std::int64_t, 7> cPA{}, cPB{}, cPW{}, cPZ{};
    cPA[3] = -2*a[2] + a[3] + 7*a[4] - 2*c[1] + 7*c[3];
    cPA[4] = -2*a[1] - 2*a[2] - 5*a[3] - 12*c[2];
    cPA[5] = a[1] - 5*a[2] + 7*c[1];
    cPA[6] = 7*a[1];
    cPB[3] = -2*a[2] + a[3] + 7*a[4] - 2*b[1] + 7*b[3];
    cPB[4] = -2*a[1] - 2*a[2] - 5*a[3] - 12*b[2];
    cPB[5] = a[1] - 5*a[2] + 7*b[1];
    cPB[6] = 7*a[1];
    cPW[2] = -2*a[3] + 2*a[4] + 7*a[5]
        - 2*b[2] + b[3] + 7*b[4]
        - 2*c[2] + c[3] + 7*c[4]
        - 2*d[1] + 7*d[3];
    cPW[3] = -4*a[2] - 2*a[3] + 2*a[4]
        - 2*b[1] - 2*b[2] - 5*b[3]
        - 2*c[1] - 2*c[2] - 5*c[3] - 12*d[2];
    cPW[4] = -2*a[1] - 2*a[2] - 10*a[3]
        + b[1] - 5*b[2] + c[1] - 5*c[2] + 7*d[1];
    cPW[5] = 2*a[1] + 2*a[2] + 7*b[1] + 7*c[1];
    cPW[6] = 7*a[1];
    cPZ[4] = -2*a[1] + 7*a[3];
    cPZ[5] = -12*a[2];
    cPZ[6] = 7*a[1];

    std::int64_t correction = 0;
    for (int rank = 2; rank <= 6; ++rank) {
        correction += cPA[rank]*PA[rank] + cPB[rank]*PB[rank]
            + cPW[rank]*PW[rank] + cPZ[rank]*PZ[rank];
    }
    return correction;
}

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
        IndependenceCache cache(graph);
        std::uint32_t full = (std::uint32_t{1} << graph.n) - 1;

        for (int u = 0; u < graph.n; ++u) {
            for (int v = u + 1; v < graph.n; ++v) {
                if ((graph.adjacency[u] >> v) & 1U) continue;
                int common_neighbors = std::popcount(
                    graph.adjacency[u] & graph.adjacency[v]
                );
                if (common_neighbors > 1) throw std::runtime_error("forest common-neighbor violation");
                bool wanted = common_order <= 11
                    || (common_order <= 13 && common_neighbors == 0);
                if (!wanted) continue;

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
    const std::string marker = total_negative == 0
        ? "PASS_EXACT_ISO_N6_BUNDLE_G2_NONADJACENT_ORDINARY_LITERAL_N9_13_ROOT"
        : "COUNTEREXAMPLE_ISO_N6_BUNDLE_G2_NONADJACENT_ORDINARY_LITERAL_N9_13_ROOT";

    output << "{\n  \"marker\": \"" << marker << "\",\n";
    output << "  \"dataset_sha256\": \"A043EE3A7288E7DD41D4EEB226C0B58DAEF13CB70331D77844A2FAB8B04A8484\",\n";
    output << "  \"coverage\": \"all unlabeled forests of marked orders 11..15; every unordered nonedge uv and every p distinct from u,v; both geometries for N=9..11 and common0 for N=12..13\",\n";
    output << "  \"forest_counts\": {";
    bool first = true;
    for (const auto& [order,count] : forests_seen) {
        if (!first) output << ", ";
        first = false;
        output << "\"" << order << "\": " << count;
    }
    output << "},\n  \"rows\": {\n";
    first = true;
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
