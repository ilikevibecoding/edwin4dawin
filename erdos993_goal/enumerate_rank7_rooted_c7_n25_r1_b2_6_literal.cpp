#include <array>
#include <cstdint>
#include <fstream>
#include <iomanip>
#include <iostream>
#include <limits>
#include <sstream>
#include <string>
#include <utility>
#include <vector>

// Complete exact literal enumeration for the smallest surviving profile:
// n=25, root degree 1, excess partition (2^6,1^11), root support excess 1.
//
// Suppressing the eleven degree-two vertices leaves a full cubic skeleton
// with six degree-three vertices and eight leaves.  Its six internal vertices
// induce one of the four free trees on six vertices of maximum degree three.
// We enumerate one representative of every rooted-leaf orbit, then every
// weak composition of the eleven subdivisions over the thirteen skeleton
// edges, requiring at least one subdivision on the root edge.

namespace {

constexpr int MAX_K = 7;

using Poly = std::array<std::uint64_t, MAX_K + 1>;

struct SkeletonCase {
    std::string name;
    std::vector<std::pair<int, int>> internal_edges;
    std::vector<int> root_internal_representatives;
};

struct RootedSkeleton {
    std::string name;
    std::vector<std::pair<int, int>> edges;
    int root_leaf = -1;
    int root_edge = -1;
    int root_internal = -1;
};

struct DP {
    Poly excluded{};
    Poly included{};
};

struct Witness {
    bool present = false;
    std::string rooted_skeleton;
    std::array<int, 13> subdivisions{};
    std::uint64_t h5 = 0;
    std::uint64_t h6 = 0;
    std::uint64_t h7 = 0;
    std::uint64_t g4 = 0;
    std::uint64_t g5 = 0;
    std::uint64_t g6 = 0;
    std::uint64_t c5 = 0;
    std::uint64_t c6 = 0;
    std::uint64_t c7 = 0;
    std::int64_t rooted_c7 = 0;
};

struct CaseResult {
    std::string name;
    std::uint64_t assignments = 0;
    std::uint64_t positive = 0;
    std::uint64_t zero = 0;
    std::uint64_t negative = 0;
    std::int64_t minimum = std::numeric_limits<std::int64_t>::max();
    std::uint64_t minimum_multiplicity = 0;
    Witness witness;
};

Poly add(const Poly& left, const Poly& right) {
    Poly result{};
    for (int i = 0; i <= MAX_K; ++i) result[i] = left[i] + right[i];
    return result;
}

Poly multiply(const Poly& left, const Poly& right) {
    Poly result{};
    for (int i = 0; i <= MAX_K; ++i) {
        for (int j = 0; i + j <= MAX_K; ++j) {
            result[i + j] += left[i] * right[j];
        }
    }
    return result;
}

DP tree_dp(int vertex, int parent, int skipped,
           const std::array<std::vector<int>, 25>& adjacency) {
    DP result;
    result.excluded[0] = 1;
    result.included[1] = 1;
    for (int child : adjacency[vertex]) {
        if (child == parent || child == skipped) continue;
        DP branch = tree_dp(child, vertex, skipped, adjacency);
        result.excluded = multiply(result.excluded, add(branch.excluded, branch.included));
        result.included = multiply(result.included, branch.excluded);
    }
    return result;
}

std::vector<SkeletonCase> skeleton_cases() {
    return {
        {
            "internal_path_P6",
            {{0,1},{1,2},{2,3},{3,4},{4,5}},
            {0,1,2},
        },
        {
            "internal_double_star_33",
            {{0,1},{0,2},{0,3},{1,4},{1,5}},
            {2},
        },
        {
            "internal_three_arms_311",
            {{0,1},{1,2},{2,3},{0,4},{0,5}},
            {1,2,3,4},
        },
        {
            "internal_three_arms_221",
            {{0,1},{1,2},{0,3},{3,4},{0,5}},
            {1,2,5},
        },
    };
}

RootedSkeleton make_rooted_skeleton(const SkeletonCase& source, int root_internal) {
    RootedSkeleton result;
    result.name = source.name + "_root_at_internal_" + std::to_string(root_internal);
    result.edges = source.internal_edges;
    result.root_internal = root_internal;
    std::array<int, 6> internal_degree{};
    for (auto [left, right] : source.internal_edges) {
        ++internal_degree[left];
        ++internal_degree[right];
    }
    int next_leaf = 6;
    for (int vertex = 0; vertex < 6; ++vertex) {
        const int leaves = 3 - internal_degree[vertex];
        if (leaves <= 0) continue;
        for (int index = 0; index < leaves; ++index) {
            const int leaf = next_leaf++;
            result.edges.push_back({vertex, leaf});
            if (vertex == root_internal && result.root_leaf < 0) {
                result.root_leaf = leaf;
                result.root_edge = static_cast<int>(result.edges.size()) - 1;
            }
        }
    }
    if (next_leaf != 14 || result.edges.size() != 13 || result.root_leaf < 0) {
        throw std::runtime_error("invalid rooted skeleton construction");
    }
    return result;
}

std::string vector_json(const std::array<int, 13>& values) {
    std::ostringstream out;
    out << "[";
    for (std::size_t i = 0; i < values.size(); ++i) {
        if (i) out << ",";
        out << values[i];
    }
    out << "]";
    return out.str();
}

void consider(const RootedSkeleton& skeleton,
              const std::array<int, 13>& subdivisions,
              CaseResult& result,
              std::uint64_t& checksum) {
    std::array<std::vector<int>, 25> adjacency;
    int next_vertex = 14;
    for (int edge_index = 0; edge_index < 13; ++edge_index) {
        auto [left, right] = skeleton.edges[edge_index];
        int previous = left;
        for (int step = 0; step < subdivisions[edge_index]; ++step) {
            const int current = next_vertex++;
            adjacency[previous].push_back(current);
            adjacency[current].push_back(previous);
            previous = current;
        }
        adjacency[previous].push_back(right);
        adjacency[right].push_back(previous);
    }
    if (next_vertex != 25 || adjacency[skeleton.root_leaf].size() != 1) {
        throw std::runtime_error("invalid subdivided tree");
    }
    const int support = adjacency[skeleton.root_leaf][0];
    if (adjacency[support].size() != 2) {
        throw std::runtime_error("root support does not have excess one");
    }

    // H=A-root, rooted at the support.  When the support is excluded, its
    // excluded DP polynomial is exactly I(H-support)=g.
    DP root = tree_dp(support, -1, skeleton.root_leaf, adjacency);
    Poly h = add(root.excluded, root.included);
    const Poly& g = root.excluded;

    const std::uint64_t c5 = h[5] + g[4];
    const std::uint64_t c6 = h[6] + g[5];
    const std::uint64_t c7 = h[7] + g[6];
    const __int128 signed_c5 = static_cast<__int128>(c5);
    const __int128 signed_c6 = static_cast<__int128>(c6);
    const __int128 signed_c7 = static_cast<__int128>(c7);
    const __int128 signed_h5 = static_cast<__int128>(h[5]);
    const __int128 signed_h6 = static_cast<__int128>(h[6]);
    const __int128 exact_rooted_c7 =
        signed_c5 * (signed_c6 * signed_c6 - signed_c5 * signed_c7)
        - 2 * signed_c6 * (signed_c6 * signed_h5 - signed_c5 * signed_h6);
    if (exact_rooted_c7 < std::numeric_limits<std::int64_t>::min()
        || exact_rooted_c7 > std::numeric_limits<std::int64_t>::max()) {
        throw std::runtime_error("rooted C7 does not fit signed 64-bit output");
    }
    const std::int64_t rooted_c7 = static_cast<std::int64_t>(exact_rooted_c7);

    ++result.assignments;
    if (rooted_c7 > 0) ++result.positive;
    else if (rooted_c7 == 0) ++result.zero;
    else ++result.negative;

    // Deterministic order-sensitive 64-bit FNV-1a checksum of every literal
    // result and subdivision vector.  The report SHA-256 protects this value.
    auto absorb = [&checksum](std::uint64_t value) {
        for (int byte = 0; byte < 8; ++byte) {
            checksum ^= (value >> (8 * byte)) & 0xFFu;
            checksum *= 1099511628211ULL;
        }
    };
    absorb(static_cast<std::uint64_t>(rooted_c7));
    absorb(c5); absorb(c6); absorb(c7); absorb(h[5]); absorb(h[6]);
    for (int value : subdivisions) absorb(static_cast<std::uint64_t>(value));

    if (rooted_c7 < result.minimum) {
        result.minimum = rooted_c7;
        result.minimum_multiplicity = 1;
        result.witness = {
            true, skeleton.name, subdivisions,
            h[5], h[6], h[7], g[4], g[5], g[6],
            c5, c6, c7, rooted_c7,
        };
    } else if (rooted_c7 == result.minimum) {
        ++result.minimum_multiplicity;
    }
}

void enumerate_compositions(const RootedSkeleton& skeleton,
                            int position,
                            int remaining,
                            std::array<int, 13>& subdivisions,
                            CaseResult& result,
                            std::uint64_t& checksum) {
    if (position == 13) {
        if (remaining == 0) consider(skeleton, subdivisions, result, checksum);
        return;
    }
    const int minimum = position == skeleton.root_edge ? 1 : 0;
    for (int value = minimum; value <= remaining; ++value) {
        subdivisions[position] = value;
        enumerate_compositions(
            skeleton, position + 1, remaining - value,
            subdivisions, result, checksum
        );
    }
}

void write_witness(std::ostream& out, const Witness& witness, int indent) {
    const std::string pad(indent, ' ');
    out << pad << "{\n";
    out << pad << "  \"rooted_skeleton\": \"" << witness.rooted_skeleton << "\",\n";
    out << pad << "  \"subdivisions_in_skeleton_edge_order\": "
        << vector_json(witness.subdivisions) << ",\n";
    out << pad << "  \"h5\": " << witness.h5 << ",\n";
    out << pad << "  \"h6\": " << witness.h6 << ",\n";
    out << pad << "  \"h7\": " << witness.h7 << ",\n";
    out << pad << "  \"g4\": " << witness.g4 << ",\n";
    out << pad << "  \"g5\": " << witness.g5 << ",\n";
    out << pad << "  \"g6\": " << witness.g6 << ",\n";
    out << pad << "  \"c5\": " << witness.c5 << ",\n";
    out << pad << "  \"c6\": " << witness.c6 << ",\n";
    out << pad << "  \"c7\": " << witness.c7 << ",\n";
    out << pad << "  \"rooted_C7\": " << witness.rooted_c7 << "\n";
    out << pad << "}";
}

}  // namespace

int main(int argc, char** argv) {
    const std::string output_path = argc >= 2
        ? argv[1]
        : "rank7_rooted_c7_n25_r1_b2_6_literal_exact_20260820.json";

    std::vector<RootedSkeleton> rooted_skeletons;
    for (const SkeletonCase& source : skeleton_cases()) {
        for (int root_internal : source.root_internal_representatives) {
            rooted_skeletons.push_back(make_rooted_skeleton(source, root_internal));
        }
    }
    if (rooted_skeletons.size() != 11) {
        throw std::runtime_error("expected eleven rooted skeleton orbits");
    }

    std::uint64_t checksum = 1469598103934665603ULL;
    std::vector<CaseResult> results;
    Witness global_witness;
    std::int64_t global_minimum = std::numeric_limits<std::int64_t>::max();
    std::uint64_t total = 0, positive = 0, zero = 0, negative = 0;

    for (const RootedSkeleton& skeleton : rooted_skeletons) {
        CaseResult result;
        result.name = skeleton.name;
        std::array<int, 13> subdivisions{};
        enumerate_compositions(skeleton, 0, 11, subdivisions, result, checksum);
        if (result.assignments != 646646ULL) {
            throw std::runtime_error("unexpected weak-composition count");
        }
        total += result.assignments;
        positive += result.positive;
        zero += result.zero;
        negative += result.negative;
        if (result.minimum < global_minimum) {
            global_minimum = result.minimum;
            global_witness = result.witness;
        }
        results.push_back(result);
        std::cerr << "completed " << results.size() << "/11 " << result.name
                  << " minimum=" << result.minimum << "\n";
    }

    if (total != 7113106ULL) {
        throw std::runtime_error("unexpected total assignment count");
    }

    std::ofstream out(output_path, std::ios::binary);
    if (!out) throw std::runtime_error("cannot open output");
    out << "{\n";
    out << "  \"schema\": \"rank7-rooted-c7-n25-r1-b2-6-literal-v1\",\n";
    out << "  \"status\": \""
        << (zero == 0 && negative == 0
            ? "PASS_EXACT_LITERAL_PROFILE_C7_POSITIVE"
            : "NONPOSITIVE_LITERAL_WITNESS_REQUIRES_INDEPENDENT_REPLAY")
        << "\",\n";
    out << "  \"scope\": {\"n\":25,\"root_degree\":1,\"B2\":6,"
           "\"positive_excess_partition\":[2,2,2,2,2,2,1,1,1,1,1,1,1,1,1,1,1],"
           "\"root_support_excess\":1},\n";
    out << "  \"structural_reduction\": {\n";
    out << "    \"degree_sequence\": \"3^6,2^11,1^8\",\n";
    out << "    \"internal_tree_shapes\": 4,\n";
    out << "    \"rooted_leaf_orbits\": 11,\n";
    out << "    \"skeleton_edges\": 13,\n";
    out << "    \"subdivisions\": 11,\n";
    out << "    \"root_edge_minimum_subdivisions\": 1,\n";
    out << "    \"weak_compositions_per_rooted_orbit\": 646646\n";
    out << "  },\n";
    out << "  \"counts\": {\"assignments\":" << total
        << ",\"positive\":" << positive
        << ",\"zero\":" << zero
        << ",\"negative\":" << negative << "},\n";
    out << "  \"minimum_rooted_C7\": " << global_minimum << ",\n";
    out << "  \"minimum_witness\": ";
    write_witness(out, global_witness, 2);
    out << ",\n";
    out << "  \"rooted_orbits\": [\n";
    for (std::size_t index = 0; index < results.size(); ++index) {
        const CaseResult& result = results[index];
        out << "    {\"name\":\"" << result.name << "\","
            << "\"assignments\":" << result.assignments << ","
            << "\"positive\":" << result.positive << ","
            << "\"zero\":" << result.zero << ","
            << "\"negative\":" << result.negative << ","
            << "\"minimum_rooted_C7\":" << result.minimum << ","
            << "\"minimum_multiplicity\":" << result.minimum_multiplicity << ","
            << "\"minimum_witness\":";
        write_witness(out, result.witness, 4);
        out << "}" << (index + 1 == results.size() ? "\n" : ",\n");
    }
    std::ostringstream checksum_text;
    checksum_text << std::uppercase << std::hex << std::setw(16)
                  << std::setfill('0') << checksum;
    out << "  ],\n";
    out << "  \"ordered_result_fnv1a64\": \"" << checksum_text.str() << "\",\n";
    out << "  \"scope_warning\": \"This closes only the named literal profile family.\"\n";
    out << "}\n";
    out.close();

    std::cout << (zero == 0 && negative == 0
        ? "PASS_EXACT_LITERAL_PROFILE_C7_POSITIVE"
        : "NONPOSITIVE_LITERAL_WITNESS_REQUIRES_INDEPENDENT_REPLAY") << "\n";
    std::cout << "assignments " << total << " minimum " << global_minimum
              << " checksum " << checksum_text.str() << "\n";
    std::cout << "report " << output_path << "\n";
    return (zero == 0 && negative == 0) ? 0 : 2;
}
