#include <algorithm>
#include <array>
#include <cassert>
#include <cstdint>
#include <iomanip>
#include <iostream>
#include <limits>
#include <sstream>
#include <string>
#include <vector>

extern "C" {
#include "nausha.h"
}

using Poly = std::array<std::uint64_t, 9>;

struct Result {
    std::uint64_t assignments = 0;
    std::uint64_t eligible = 0;
    std::uint64_t negative = 0;
    std::uint64_t crosschecks = 0;
    std::int64_t minimum = std::numeric_limits<std::int64_t>::max();
    int minimum_b = 0;
    int minimum_core = 0;
    std::vector<int> minimum_parent;
    std::vector<int> minimum_leaves;
    std::vector<int> minimum_degrees;
    Poly minimum_row{};
    SHA256_CTX stream;
};

static std::uint64_t binomial[32][9];
static Result results[32];

static Poly add_poly(const Poly& left, const Poly& right) {
    Poly answer{};
    for (int k = 0; k <= 8; ++k) answer[k] = left[k] + right[k];
    return answer;
}

static Poly multiply_poly(const Poly& left, const Poly& right) {
    Poly answer{};
    for (int i = 0; i <= 8; ++i) {
        if (left[i] == 0) continue;
        for (int j = 0; i + j <= 8; ++j) {
            if (right[j] == 0) continue;
            answer[i + j] += left[i] * right[j];
        }
    }
    return answer;
}

static Poly weighted_row(
    const std::vector<std::vector<int>>& children,
    const std::vector<int>& traversal,
    const std::vector<int>& leaves
) {
    int b = static_cast<int>(children.size());
    std::vector<Poly> excluded(b), included(b);
    for (auto iterator = traversal.rbegin(); iterator != traversal.rend(); ++iterator) {
        int vertex = *iterator;
        Poly exc{};
        for (int rank = 0; rank <= 8; ++rank) {
            exc[rank] = binomial[leaves[vertex]][rank];
        }
        Poly inc{};
        inc[1] = 1;
        for (int child : children[vertex]) {
            exc = multiply_poly(exc, add_poly(excluded[child], included[child]));
            inc = multiply_poly(inc, excluded[child]);
        }
        excluded[vertex] = exc;
        included[vertex] = inc;
    }
    return add_poly(excluded[0], included[0]);
}

static Poly explicit_row(
    const std::vector<int>& parent_input,
    const std::vector<int>& leaves,
    int target_order
) {
    int b = static_cast<int>(parent_input.size());
    std::vector<std::vector<int>> adjacency(target_order);
    for (int child = 1; child < b; ++child) {
        int parent = parent_input[child] - 1;
        adjacency[child].push_back(parent);
        adjacency[parent].push_back(child);
    }
    int next = b;
    for (int vertex = 0; vertex < b; ++vertex) {
        for (int count = 0; count < leaves[vertex]; ++count) {
            adjacency[vertex].push_back(next);
            adjacency[next].push_back(vertex);
            ++next;
        }
    }
    assert(next == target_order);
    std::vector<int> parent(target_order, -2), traversal{0};
    parent[0] = -1;
    for (std::size_t index = 0; index < traversal.size(); ++index) {
        int vertex = traversal[index];
        for (int neighbor : adjacency[vertex]) {
            if (neighbor == parent[vertex]) continue;
            assert(parent[neighbor] == -2);
            parent[neighbor] = vertex;
            traversal.push_back(neighbor);
        }
    }
    assert(static_cast<int>(traversal.size()) == target_order);
    std::vector<Poly> excluded(target_order), included(target_order);
    for (auto iterator = traversal.rbegin(); iterator != traversal.rend(); ++iterator) {
        int vertex = *iterator;
        Poly exc{};
        exc[0] = 1;
        Poly inc{};
        inc[1] = 1;
        for (int neighbor : adjacency[vertex]) {
            if (parent[neighbor] != vertex) continue;
            exc = multiply_poly(exc, add_poly(excluded[neighbor], included[neighbor]));
            inc = multiply_poly(inc, excluded[neighbor]);
        }
        excluded[vertex] = exc;
        included[vertex] = inc;
    }
    return add_poly(excluded[0], included[0]);
}

static std::int64_t q_value(const Poly& row) {
    __int128 w3 = row[3], w4 = row[4], w5 = row[5];
    __int128 w6 = row[6], w7 = row[7], w8 = row[8];
    __int128 value =
        8*w3*w3 + 24*w3*w4 - 64*w3*w5 - 106*w3*w6
        - 51*w3*w7 - 8*w3*w8 + 80*w4*w4 + 90*w4*w5
        - 12*w4*w6 - 10*w4*w7 + 39*w5*w5 + 10*w5*w6;
    assert(value >= std::numeric_limits<std::int64_t>::min());
    assert(value <= std::numeric_limits<std::int64_t>::max());
    return static_cast<std::int64_t>(value);
}

static void hash_u64(SHA256_CTX* context, std::uint64_t value) {
    nsword8 bytes[8];
    for (int i = 0; i < 8; ++i) bytes[i] = (value >> (8*i)) & 0xff;
    sha256_update(context, bytes, 8);
}

static void hash_record(
    SHA256_CTX* context,
    int target_order,
    int b,
    int core_index,
    const std::vector<int>& parent_input,
    const std::vector<int>& leaves,
    const std::vector<int>& degrees,
    const Poly& row,
    std::int64_t value
) {
    hash_u64(context, target_order);
    hash_u64(context, b);
    hash_u64(context, core_index);
    for (int item : parent_input) hash_u64(context, item);
    for (int item : leaves) hash_u64(context, item);
    for (int item : degrees) hash_u64(context, item);
    for (std::uint64_t item : row) hash_u64(context, item);
    hash_u64(context, static_cast<std::uint64_t>(value));
}

static bool lexicographically_better(
    int b,
    int core_index,
    const std::vector<int>& leaves,
    const Result& result
) {
    if (result.minimum_b == 0) return true;
    if (b != result.minimum_b) return b < result.minimum_b;
    if (core_index != result.minimum_core) return core_index < result.minimum_core;
    return leaves < result.minimum_leaves;
}

static void evaluate_assignment(
    int target_order,
    int core_index,
    const std::vector<int>& parent_input,
    const std::vector<int>& core_degrees,
    const std::vector<std::vector<int>>& children,
    const std::vector<int>& traversal,
    const std::vector<int>& leaves
) {
    Result& result = results[target_order];
    ++result.assignments;
    int b = static_cast<int>(parent_input.size());
    std::vector<int> degrees(b);
    int maximum = 0;
    for (int vertex = 0; vertex < b; ++vertex) {
        degrees[vertex] = core_degrees[vertex] + leaves[vertex];
        maximum = std::max(maximum, degrees[vertex]);
    }
    if (maximum < 4) return;
    ++result.eligible;
    Poly row = weighted_row(children, traversal, leaves);
    assert(row[0] == 1);
    assert(row[1] == static_cast<std::uint64_t>(target_order));
    assert(row[2] == binomial[target_order][2] - (target_order - 1));
    std::int64_t value = q_value(row);
    if (value < 0) ++result.negative;
    hash_record(
        &result.stream, target_order, b, core_index, parent_input,
        leaves, degrees, row, value
    );
    if (value < result.minimum ||
        (value == result.minimum &&
         lexicographically_better(b, core_index, leaves, result))) {
        result.minimum = value;
        result.minimum_b = b;
        result.minimum_core = core_index;
        result.minimum_parent = parent_input;
        result.minimum_leaves = leaves;
        result.minimum_degrees = degrees;
        result.minimum_row = row;
    }
    if (result.eligible % 65536 == 0) {
        assert(explicit_row(parent_input, leaves, target_order) == row);
        ++result.crosschecks;
    }
}

static void enumerate_compositions(
    int position,
    int remaining,
    int target_order,
    int core_index,
    const std::vector<int>& parent_input,
    const std::vector<int>& core_degrees,
    const std::vector<std::vector<int>>& children,
    const std::vector<int>& traversal,
    const std::vector<int>& floors,
    std::vector<int>& leaves
) {
    int b = static_cast<int>(parent_input.size());
    if (position == b - 1) {
        leaves[position] = floors[position] + remaining;
        evaluate_assignment(
            target_order, core_index, parent_input, core_degrees,
            children, traversal, leaves
        );
        return;
    }
    for (int value = 0; value <= remaining; ++value) {
        leaves[position] = floors[position] + value;
        enumerate_compositions(
            position + 1, remaining - value, target_order, core_index,
            parent_input, core_degrees, children, traversal, floors, leaves
        );
    }
}

static std::string vector_text(const std::vector<int>& values) {
    std::ostringstream output;
    output << '[';
    for (std::size_t i = 0; i < values.size(); ++i) {
        if (i) output << ',';
        output << values[i];
    }
    output << ']';
    return output.str();
}

static std::string poly_text(const Poly& values) {
    std::ostringstream output;
    output << '[';
    for (int i = 0; i <= 8; ++i) {
        if (i) output << ',';
        output << values[i];
    }
    output << ']';
    return output.str();
}

static std::string digest_hex(SHA256_CTX* context) {
    nsword8 digest[32];
    sha256_final(context, digest);
    std::ostringstream output;
    output << std::hex << std::uppercase << std::setfill('0');
    for (int i = 0; i < 32; ++i) output << std::setw(2) << int(digest[i]);
    return output.str();
}

int main() {
    for (int n = 0; n <= 31; ++n) {
        binomial[n][0] = 1;
        for (int k = 1; k <= 8; ++k) {
            binomial[n][k] = (k > n) ? 0
                : (k == n ? 1 : binomial[n - 1][k - 1] + binomial[n - 1][k]);
        }
    }
    for (int n = 27; n <= 31; ++n) sha256_init(&results[n].stream);

    std::string line;
    int last_b = -1;
    int core_index = -1;
    std::array<int, 15> core_counts{};
    while (std::getline(std::cin, line)) {
        if (line.empty()) continue;
        std::istringstream input(line);
        std::vector<int> parent_input;
        int value;
        while (input >> value) parent_input.push_back(value);
        int b = static_cast<int>(parent_input.size());
        assert(b >= 3 && b <= 14);
        if (b != last_b) {
            assert(b > last_b);
            last_b = b;
            core_index = 0;
        } else {
            ++core_index;
        }
        ++core_counts[b];

        std::vector<std::vector<int>> adjacency(b);
        std::vector<int> core_degrees(b, 0);
        for (int child = 1; child < b; ++child) {
            int parent = parent_input[child] - 1;
            assert(parent >= 0 && parent < b && parent != child);
            adjacency[child].push_back(parent);
            adjacency[parent].push_back(child);
            ++core_degrees[child];
            ++core_degrees[parent];
        }
        std::vector<int> parent(b, -2), traversal{0};
        parent[0] = -1;
        for (std::size_t index = 0; index < traversal.size(); ++index) {
            int vertex = traversal[index];
            for (int neighbor : adjacency[vertex]) {
                if (neighbor == parent[vertex]) continue;
                assert(parent[neighbor] == -2);
                parent[neighbor] = vertex;
                traversal.push_back(neighbor);
            }
        }
        assert(static_cast<int>(traversal.size()) == b);
        std::vector<std::vector<int>> children(b);
        for (int vertex = 1; vertex < b; ++vertex) {
            children[parent[vertex]].push_back(vertex);
        }
        std::vector<int> floors(b);
        int floor_sum = 0;
        for (int vertex = 0; vertex < b; ++vertex) {
            floors[vertex] = std::max(0, 3 - core_degrees[vertex]);
            floor_sum += floors[vertex];
        }
        for (int target_order = 27; target_order <= 31; ++target_order) {
            int remaining = target_order - b - floor_sum;
            if (remaining < 0) continue;
            std::vector<int> leaves(b);
            enumerate_compositions(
                0, remaining, target_order, core_index, parent_input,
                core_degrees, children, traversal, floors, leaves
            );
        }
    }

    const int expected_cores[15] = {
        0,0,0,1,2,3,6,11,23,47,106,235,551,1301,3159
    };
    for (int b = 3; b <= 14; ++b) assert(core_counts[b] == expected_cores[b]);

    for (int n = 27; n <= 31; ++n) {
        Result& result = results[n];
        std::cout << "ORDER " << n << '\n';
        std::cout << "ASSIGNMENTS " << result.assignments << '\n';
        std::cout << "ELIGIBLE " << result.eligible << '\n';
        std::cout << "NEGATIVE " << result.negative << '\n';
        std::cout << "CROSSCHECKS " << result.crosschecks << '\n';
        std::cout << "MINIMUM_VALUE " << result.minimum << '\n';
        std::cout << "MINIMUM_CORE_ORDER " << result.minimum_b << '\n';
        std::cout << "MINIMUM_CORE_INDEX " << result.minimum_core << '\n';
        std::cout << "MINIMUM_PARENT " << vector_text(result.minimum_parent) << '\n';
        std::cout << "MINIMUM_LEAVES " << vector_text(result.minimum_leaves) << '\n';
        std::cout << "MINIMUM_DEGREES " << vector_text(result.minimum_degrees) << '\n';
        std::cout << "MINIMUM_ROW " << poly_text(result.minimum_row) << '\n';
        std::cout << "STREAM_SHA256 " << digest_hex(&result.stream) << '\n';
    }
    return 0;
}
