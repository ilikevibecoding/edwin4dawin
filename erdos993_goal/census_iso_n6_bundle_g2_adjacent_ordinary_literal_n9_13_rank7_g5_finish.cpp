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
#include <tuple>
#include <vector>

using Row = std::array<std::int64_t, 8>;

struct Term { std::int64_t scalar; int left; int right; };
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
    for (const auto& term : terms)
        value += term.scalar * left[term.left] * right[term.right];
    return value;
}

struct Graph { int n = 0; std::vector<std::uint32_t> adjacency; };

Graph parse_graph6(const std::string& code) {
    if (code.empty()) throw std::runtime_error("empty graph6 code");
    int n = static_cast<unsigned char>(code[0]) - 63;
    if (n < 0 || n > 30) throw std::runtime_error("unsupported graph6 order");
    Graph graph{n, std::vector<std::uint32_t>(n, 0)};
    std::size_t bit_index = 0;
    for (int column = 1; column < n; ++column) {
        for (int row = 0; row < column; ++row) {
            const std::size_t char_index = 1 + bit_index / 6;
            if (char_index >= code.size()) throw std::runtime_error("short graph6 code");
            const int value = static_cast<unsigned char>(code[char_index]) - 63;
            const int bit = (value >> (5 - static_cast<int>(bit_index % 6))) & 1;
            if (bit) {
                graph.adjacency[row] |= std::uint32_t{1} << column;
                graph.adjacency[column] |= std::uint32_t{1} << row;
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
            const int vertex = std::countr_zero(mask);
            const std::uint32_t without = mask & ~(std::uint32_t{1} << vertex);
            const Row excluded = row(without);
            const Row included = row(without & ~graph_.adjacency[vertex]);
            result = excluded;
            for (int rank = 1; rank < 8; ++rank) result[rank] += included[rank-1];
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

std::int64_t parent_correction(const Row& a, const Row& b, const Row& c,
                               const Row& de, const Row& du,
                               const Row& dv, const Row& dw) {
    std::array<std::int64_t, 7> PA{}, PB{}, PW{};
    for (int rank = 2; rank <= 6; ++rank) {
        const std::int64_t da = du[rank] - dw[rank];
        const std::int64_t db = dv[rank] - dw[rank];
        const std::int64_t dz = de[rank] - du[rank] - dv[rank] + dw[rank];
        if (dz != 0) throw std::runtime_error("adjacent-mark PZ identity failed");
        PW[rank] = a[rank] - dw[rank];
        PA[rank] = b[rank-1] - da;
        PB[rank] = c[rank-1] - db;
        if (PW[rank] < 0 || PA[rank] < 0 || PB[rank] < 0)
            throw std::runtime_error("negative parent-loss count");
    }

    std::array<std::int64_t, 7> cPA{}, cPB{}, cPW{};
    cPA[3] = -2*a[2] + a[3] + 7*a[4] - 2*c[1] + 7*c[3];
    cPA[4] = -2*a[1] - 2*a[2] - 5*a[3] - 12*c[2];
    cPA[5] = a[1] - 5*a[2] + 7*c[1];
    cPA[6] = 7*a[1];
    cPB[3] = -2*a[2] + a[3] + 7*a[4] - 2*b[1] + 7*b[3];
    cPB[4] = -2*a[1] - 2*a[2] - 5*a[3] - 12*b[2];
    cPB[5] = a[1] - 5*a[2] + 7*b[1];
    cPB[6] = 7*a[1];
    cPW[2] = -2*a[3] + 2*a[4] + 7*a[5]
        - 2*b[2] + b[3] + 7*b[4] - 2*c[2] + c[3] + 7*c[4];
    cPW[3] = -4*a[2] - 2*a[3] + 2*a[4]
        - 2*b[1] - 2*b[2] - 5*b[3] - 2*c[1] - 2*c[2] - 5*c[3];
    cPW[4] = -2*a[1] - 2*a[2] - 10*a[3]
        + b[1] - 5*b[2] + c[1] - 5*c[2];
    cPW[5] = 2*a[1] + 2*a[2] + 7*b[1] + 7*c[1];
    cPW[6] = 7*a[1];

    std::int64_t correction = 0;
    for (int rank = 2; rank <= 6; ++rank)
        correction += cPA[rank]*PA[rank] + cPB[rank]*PB[rank] + cPW[rank]*PW[rank];
    return correction;
}

struct Witness {
    std::int64_t ordinary = std::numeric_limits<std::int64_t>::max();
    std::int64_t no_parent = 0;
    std::int64_t correction = 0;
    std::string graph6;
    std::uint64_t forest_index = 0;
    int u = -1, v = -1, p = -1;
};
struct Stats {
    std::uint64_t triples = 0, negative = 0, negative_correction = 0;
    Witness minimum, correction_minimum;
};

void update(Witness& target, std::int64_t key, std::int64_t ordinary,
            std::int64_t no_parent, std::int64_t correction,
            const std::string& code, std::uint64_t forest_index,
            int u, int v, int p) {
    if (key < target.ordinary) {
        target.ordinary = key; target.no_parent = no_parent; target.correction = correction;
        target.graph6 = code; target.forest_index = forest_index;
        target.u = u; target.v = v; target.p = p;
    }
}

void hash_u64(std::uint64_t& state, std::uint64_t value) {
    for (int index = 0; index < 8; ++index) {
        state ^= static_cast<unsigned char>((value >> (8*index)) & 0xffU);
        state *= 1099511628211ULL;
    }
}
std::string hex64(std::uint64_t value) {
    std::ostringstream out;
    out << std::uppercase << std::hex << std::setw(16) << std::setfill('0') << value;
    return out.str();
}
std::string escaped(const std::string& value) {
    std::string result;
    for (char character : value) {
        if (character == '\\' || character == '"') result.push_back('\\');
        result.push_back(character);
    }
    return result;
}

int main(int argc, char** argv) {
    if (argc != 3) {
        std::cerr << "usage: evaluator DATASET OUTPUT_JSON\n";
        return 2;
    }
    std::ifstream input(argv[1]);
    if (!input) throw std::runtime_error("cannot open dataset");
    std::map<std::tuple<int,int>, Stats> stats;
    std::map<int,std::uint64_t> forests_seen, order_index;
    std::uint64_t stream_hash = 1469598103934665603ULL;
    std::uint64_t graphs_total = 0;
    std::string line;
    while (std::getline(input, line)) {
        if (line.empty() || line[0] == '#') continue;
        const std::size_t space = line.find(' ');
        if (space == std::string::npos) throw std::runtime_error("bad dataset line");
        const int marked_order = std::stoi(line.substr(0, space));
        if (marked_order < 11 || marked_order > 15) continue;
        const std::string code = line.substr(space + 1);
        const Graph graph = parse_graph6(code);
        if (graph.n != marked_order) throw std::runtime_error("order mismatch");
        const int common_order = marked_order - 2;
        const std::uint64_t forest_index = order_index[marked_order]++;
        ++forests_seen[marked_order]; ++graphs_total;
        IndependenceCache cache(graph);
        const std::uint32_t full = (std::uint32_t{1} << graph.n) - 1;

        for (int u = 0; u < graph.n; ++u) {
            for (int v = 0; v < graph.n; ++v) {
                if (u == v || !((graph.adjacency[u] >> v) & 1U)) continue;
                const std::uint32_t bit_u = std::uint32_t{1} << u;
                const std::uint32_t bit_v = std::uint32_t{1} << v;
                const std::uint32_t closed_u = graph.adjacency[u] | bit_u;
                const std::uint32_t closed_v = graph.adjacency[v] | bit_v;
                const Row a = cache.row(full & ~(bit_u | bit_v));
                const Row b = cache.row(full & ~closed_v);
                const Row c = cache.row(full & ~closed_u);
                const std::int64_t no_parent = bilinear(a,a,A2) + bilinear(a,b,L2)
                    + bilinear(a,c,L2) + bilinear(b,c,K2);

                for (int p = 0; p < graph.n; ++p) {
                    if (p == u || p == v) continue;
                    const std::uint32_t bit_p = std::uint32_t{1} << p;
                    const Row de = cache.row(full & ~bit_p);
                    const Row du = cache.row(full & ~(bit_p | bit_u));
                    const Row dv = cache.row(full & ~(bit_p | bit_v));
                    const Row dw = cache.row(full & ~(bit_p | bit_u | bit_v));
                    const std::int64_t correction = parent_correction(a,b,c,de,du,dv,dw);
                    const std::int64_t ordinary = no_parent + correction;
                    const int adjacency = ((graph.adjacency[p] >> u) & 1U)
                        + ((graph.adjacency[p] >> v) & 1U);
                    if (adjacency > 1) throw std::runtime_error("forest triangle violation");
                    Stats& row = stats[{common_order, adjacency}];
                    ++row.triples; row.negative += ordinary < 0;
                    row.negative_correction += correction < 0;
                    update(row.minimum, ordinary, ordinary, no_parent, correction,
                           code, forest_index, u, v, p);
                    update(row.correction_minimum, correction, ordinary, no_parent,
                           correction, code, forest_index, u, v, p);
                    for (std::int64_t value : {
                        static_cast<std::int64_t>(marked_order),
                        static_cast<std::int64_t>(forest_index),
                        static_cast<std::int64_t>(u), static_cast<std::int64_t>(v),
                        static_cast<std::int64_t>(p), static_cast<std::int64_t>(adjacency),
                        no_parent, correction, ordinary
                    }) hash_u64(stream_hash, static_cast<std::uint64_t>(value));
                }
            }
        }
        if (graphs_total % 1000 == 0)
            std::cerr << "PROGRESS graphs=" << graphs_total << " order=" << marked_order << "\n";
    }

    std::uint64_t total_triples = 0, total_negative = 0;
    std::int64_t global_minimum = std::numeric_limits<std::int64_t>::max();
    for (const auto& [key,row] : stats) {
        total_triples += row.triples; total_negative += row.negative;
        global_minimum = std::min(global_minimum, row.minimum.ordinary);
    }
    const std::string marker = total_negative == 0
        ? "PASS_EXACT_ISO_N6_BUNDLE_G2_ADJACENT_ORDINARY_LITERAL_N9_13_RANK7_G5_FINISH"
        : "COUNTEREXAMPLE_ISO_N6_BUNDLE_G2_ADJACENT_ORDINARY_LITERAL_N9_13_RANK7_G5_FINISH";
    std::ofstream output(argv[2], std::ios::binary);
    if (!output) throw std::runtime_error("cannot open output");
    output << "{\n  \"marker\": \"" << marker << "\",\n";
    output << "  \"dataset_sha256\": \"A043EE3A7288E7DD41D4EEB226C0B58DAEF13CB70331D77844A2FAB8B04A8484\",\n";
    output << "  \"coverage\": \"all unlabeled forests of marked orders 11..15; both orientations of every edge uv and every p distinct from u,v; rows split by whether p is adjacent to a mark\",\n";
    output << "  \"forest_counts\": {";
    bool first = true;
    for (const auto& [order,count] : forests_seen) {
        if (!first) output << ", "; first = false;
        output << "\"" << order << "\": " << count;
    }
    output << "},\n  \"rows\": {\n";
    first = true;
    for (const auto& [key,row] : stats) {
        if (!first) output << ",\n"; first = false;
        const auto [n,adjacency] = key;
        const Witness& w = row.minimum;
        output << "    \"N" << n << "_parentAdj" << adjacency << "\": {"
               << "\"triples\": " << row.triples << ", \"negative\": " << row.negative
               << ", \"negative_correction\": " << row.negative_correction
               << ", \"minimum\": " << w.ordinary
               << ", \"minimum_correction\": " << row.correction_minimum.ordinary
               << ", \"minimum_witness\": {\"graph6\": \"" << escaped(w.graph6)
               << "\", \"forest_index\": " << w.forest_index << ", \"u\": " << w.u
               << ", \"v\": " << w.v << ", \"p\": " << w.p
               << ", \"no_parent\": " << w.no_parent
               << ", \"correction\": " << w.correction << "}}";
    }
    output << "\n  },\n  \"aggregate\": {\"triples\": " << total_triples
           << ", \"negative\": " << total_negative
           << ", \"global_minimum\": " << global_minimum
           << ", \"ordered_record_fnv1a64\": \"" << hex64(stream_hash) << "\"},\n"
           << "  \"exactness\": \"signed 64-bit integer arithmetic; literal induced-subforest rows and exact parent-loss identities\"\n}\n";
    output.close();
    std::cout << "MARKER " << marker << "\nTRIPLES " << total_triples
              << "\nNEGATIVE " << total_negative << "\nGLOBAL_MINIMUM " << global_minimum
              << "\nORDERED_RECORD_FNV1A64 " << hex64(stream_hash) << "\n";
    return total_negative == 0 ? 0 : 3;
}
