// Deterministic exact adversarial tree search for Erdos Problem 993.
//
// For each topology, root the tree at vertex 0 and compute
//   E_v = product(T_child),
//   S_v = x product(E_child),
//   T_v = E_v + S_v.
// The coefficients fit unsigned 128-bit arithmetic for orders <= 120 because
// their sum is at most 2^n.  Fitness is restricted to the pre-tail region;
// every counterexample decision is an exact integer comparison.

#include <algorithm>
#include <array>
#include <cassert>
#include <chrono>
#include <cstdint>
#include <fstream>
#include <iomanip>
#include <iostream>
#include <limits>
#include <numeric>
#include <queue>
#include <random>
#include <set>
#include <sstream>
#include <stdexcept>
#include <string>
#include <unordered_set>
#include <utility>
#include <vector>

using U128 = unsigned __int128;
using Graph = std::vector<std::vector<int>>;
using Poly = std::vector<U128>;

struct Wide256 {
    std::array<std::uint64_t, 4> limb{0, 0, 0, 0};
};

struct Ratio {
    U128 num = 0;
    U128 den = 1;
    int index = -1;
    int trough = -1;
};

struct Factor {
    long double value = 0.0L;
    int index = -1;
    int trough = -1;
};

struct Fitness {
    bool witness = false;
    int alpha = 0;
    int first_descent = -1;
    int first_reascent = -1;
    int tail_start = 0;
    bool legal_rebound = false;
    int boundary_gap = 1'000'000;
    Ratio best_legal_post;
    Ratio best_legal_rebound;
    Ratio best_any_rebound;
    Factor best_any_factor;
    Ratio adjacent_after_mode;
};

struct Individual {
    Graph graph;
    Poly polynomial;
    Fitness fitness;
    std::string key;
};

struct Seed {
    std::string label;
    Graph graph;
};

struct OrderReport {
    int order = 0;
    std::uint64_t unique_evaluated = 0;
    std::uint64_t duplicates_skipped = 0;
    int generations_completed = 0;
    Individual champion;
};

static std::string u128_string(U128 value) {
    if (value == 0) return "0";
    std::string output;
    while (value) {
        output.push_back(static_cast<char>('0' + value % 10));
        value /= 10;
    }
    std::reverse(output.begin(), output.end());
    return output;
}

static long double ratio_float(const Ratio& ratio) {
    if (ratio.den == 0) return 0.0L;
    return static_cast<long double>(ratio.num)
        / static_cast<long double>(ratio.den);
}

static long double factor_float(const Factor& factor) {
    return factor.value;
}

static Wide256 wide_product(U128 left, U128 right) {
    std::uint64_t a0 = static_cast<std::uint64_t>(left);
    std::uint64_t a1 = static_cast<std::uint64_t>(left >> 64);
    std::uint64_t b0 = static_cast<std::uint64_t>(right);
    std::uint64_t b1 = static_cast<std::uint64_t>(right >> 64);
    U128 p00 = U128(a0) * b0;
    U128 p01 = U128(a0) * b1;
    U128 p10 = U128(a1) * b0;
    U128 p11 = U128(a1) * b1;
    Wide256 output;
    output.limb[0] = static_cast<std::uint64_t>(p00);
    std::uint64_t middle = static_cast<std::uint64_t>(p00 >> 64);
    std::uint64_t add1 = static_cast<std::uint64_t>(p01);
    std::uint64_t add2 = static_cast<std::uint64_t>(p10);
    std::uint64_t carry1 = static_cast<std::uint64_t>(middle + add1 < middle);
    middle += add1;
    std::uint64_t carry2 = static_cast<std::uint64_t>(middle + add2 < middle);
    middle += add2;
    output.limb[1] = middle;
    U128 high = (p01 >> 64) + (p10 >> 64)
        + carry1 + carry2 + static_cast<std::uint64_t>(p11);
    output.limb[2] = static_cast<std::uint64_t>(high);
    output.limb[3] = static_cast<std::uint64_t>(p11 >> 64)
        + static_cast<std::uint64_t>(high >> 64);
    return output;
}

static int compare_wide(const Wide256& left, const Wide256& right) {
    for (int index = 3; index >= 0; --index) {
        if (left.limb[index] < right.limb[index]) return -1;
        if (left.limb[index] > right.limb[index]) return 1;
    }
    return 0;
}

static int compare_ratio(const Ratio& left, const Ratio& right) {
    return compare_wide(wide_product(left.num, right.den),
                        wide_product(right.num, left.den));
}

static int compare_factor(const Factor& left, const Factor& right) {
    if (left.value < right.value) return -1;
    if (left.value > right.value) return 1;
    return 0;
}

static Poly multiply(const Poly& left, const Poly& right) {
    Poly output(left.size() + right.size() - 1, 0);
    for (std::size_t i = 0; i < left.size(); ++i) {
        for (std::size_t j = 0; j < right.size(); ++j) {
            output[i + j] += left[i] * right[j];
        }
    }
    return output;
}

static Poly add(const Poly& left, const Poly& right) {
    Poly output(std::max(left.size(), right.size()), 0);
    for (std::size_t i = 0; i < left.size(); ++i) output[i] += left[i];
    for (std::size_t i = 0; i < right.size(); ++i) output[i] += right[i];
    while (output.size() > 1 && output.back() == 0) output.pop_back();
    return output;
}

static Poly shift(const Poly& polynomial) {
    Poly output(polynomial.size() + 1, 0);
    std::copy(polynomial.begin(), polynomial.end(), output.begin() + 1);
    return output;
}

static Poly independence_polynomial(const Graph& graph) {
    const int n = static_cast<int>(graph.size());
    std::vector<int> parent(n, -2), order;
    order.reserve(n);
    parent[0] = -1;
    order.push_back(0);
    for (std::size_t position = 0; position < order.size(); ++position) {
        int vertex = order[position];
        for (int neighbor : graph[vertex]) {
            if (neighbor == parent[vertex]) continue;
            if (parent[neighbor] != -2) {
                throw std::runtime_error("input is not a tree");
            }
            parent[neighbor] = vertex;
            order.push_back(neighbor);
        }
    }
    if (static_cast<int>(order.size()) != n) {
        throw std::runtime_error("input is disconnected");
    }

    std::vector<Poly> excluded(n), total(n);
    for (auto iterator = order.rbegin(); iterator != order.rend(); ++iterator) {
        int vertex = *iterator;
        Poly exclude{1};
        Poly select_children{1};
        for (int neighbor : graph[vertex]) {
            if (parent[neighbor] != vertex) continue;
            exclude = multiply(exclude, total[neighbor]);
            select_children = multiply(select_children, excluded[neighbor]);
        }
        excluded[vertex] = std::move(exclude);
        total[vertex] = add(excluded[vertex], shift(select_children));
    }
    return total[0];
}

static Fitness profile(const Poly& coefficients) {
    Fitness result;
    result.alpha = static_cast<int>(coefficients.size()) - 1;
    result.tail_start = (2 * result.alpha + 1) / 3;
    result.first_descent = result.alpha;
    for (int index = 0; index < result.alpha; ++index) {
        if (coefficients[index + 1] < coefficients[index]) {
            result.first_descent = index;
            break;
        }
    }
    result.first_reascent = -1;
    for (int index = result.first_descent + 1;
         index < result.alpha; ++index) {
        if (coefficients[index + 1] > coefficients[index]) {
            result.first_reascent = index;
            result.witness = true;
            break;
        }
    }

    result.best_legal_post = Ratio{};
    for (int index = result.first_descent + 1;
         index < std::min(result.tail_start, result.alpha); ++index) {
        Ratio candidate{coefficients[index + 1], coefficients[index], index, -1};
        if (compare_ratio(candidate, result.best_legal_post) > 0) {
            result.best_legal_post = candidate;
        }
    }

    if (result.first_descent < result.alpha) {
        Ratio trough{coefficients[result.first_descent + 1],
                     coefficients[result.first_descent],
                     result.first_descent, -1};
        bool any_rebound = false;
        for (int index = result.first_descent + 1;
             index < result.alpha; ++index) {
            Ratio current{coefficients[index + 1], coefficients[index], index,
                          trough.index};
            if (compare_ratio(current, trough) > 0) {
                any_rebound = true;
                int gap = std::max(0, index - (result.tail_start - 1));
                result.boundary_gap = std::min(result.boundary_gap, gap);
                if (compare_ratio(current, result.best_any_rebound) > 0) {
                    result.best_any_rebound = current;
                }
                Factor factor{
                    ratio_float(current) / ratio_float(trough),
                    index,
                    trough.index,
                };
                if (compare_factor(factor, result.best_any_factor) > 0) {
                    result.best_any_factor = factor;
                }
                if (index < result.tail_start) {
                    result.legal_rebound = true;
                    if (compare_ratio(current, result.best_legal_rebound) > 0) {
                        result.best_legal_rebound = current;
                    }
                }
            }
            if (compare_ratio(current, trough) < 0) trough = current;
        }
        if (!any_rebound) result.boundary_gap = result.alpha + 1;
    }

    int mode = 0;
    for (int index = 1; index <= result.alpha; ++index) {
        if (coefficients[index] > coefficients[mode]) mode = index;
    }
    if (mode < result.alpha) {
        result.adjacent_after_mode = Ratio{
            coefficients[mode + 1], coefficients[mode], mode, -1};
    }
    return result;
}

static std::string topology_key(const Graph& graph) {
    std::ostringstream output;
    output << graph.size() << ':';
    for (int left = 0; left < static_cast<int>(graph.size()); ++left) {
        for (int right : graph[left]) {
            if (left < right) output << left << '-' << right << ',';
        }
    }
    return output.str();
}

static Individual evaluate(Graph graph) {
    Individual result;
    result.key = topology_key(graph);
    result.graph = std::move(graph);
    result.polynomial = independence_polynomial(result.graph);
    result.fitness = profile(result.polynomial);
    return result;
}

static void add_edge(Graph& graph, int left, int right) {
    graph[left].push_back(right);
    graph[right].push_back(left);
}

static void remove_edge(Graph& graph, int left, int right) {
    auto& a = graph[left];
    a.erase(std::find(a.begin(), a.end(), right));
    auto& b = graph[right];
    b.erase(std::find(b.begin(), b.end(), left));
}

static std::vector<std::pair<int, int>> edges(const Graph& graph) {
    std::vector<std::pair<int, int>> output;
    for (int left = 0; left < static_cast<int>(graph.size()); ++left) {
        for (int right : graph[left]) {
            if (left < right) output.emplace_back(left, right);
        }
    }
    return output;
}

static Graph augment(Graph graph, int order, std::mt19937_64& random) {
    while (static_cast<int>(graph.size()) < order) {
        int vertex = static_cast<int>(graph.size());
        graph.emplace_back();
        auto current_edges = edges(graph);
        if (!current_edges.empty() && (random() % 100) < 58) {
            auto [left, right] = current_edges[random() % current_edges.size()];
            remove_edge(graph, left, right);
            add_edge(graph, left, vertex);
            add_edge(graph, vertex, right);
        } else {
            int parent = static_cast<int>(random() % vertex);
            add_edge(graph, parent, vertex);
        }
    }
    return graph;
}

static Graph random_tree(int order, std::mt19937_64& random) {
    Graph graph(order);
    if (order == 1) return graph;
    std::vector<int> degree(order, 1), code(order - 2);
    for (int& value : code) {
        value = static_cast<int>(random() % order);
        ++degree[value];
    }
    std::priority_queue<int, std::vector<int>, std::greater<int>> leaves;
    for (int vertex = 0; vertex < order; ++vertex) {
        if (degree[vertex] == 1) leaves.push(vertex);
    }
    for (int value : code) {
        int leaf = leaves.top();
        leaves.pop();
        add_edge(graph, leaf, value);
        if (--degree[value] == 1) leaves.push(value);
    }
    int left = leaves.top(); leaves.pop();
    int right = leaves.top(); leaves.pop();
    add_edge(graph, left, right);
    return graph;
}

static void spr_mutation(Graph& graph, std::mt19937_64& random) {
    auto all_edges = edges(graph);
    auto [a, b] = all_edges[random() % all_edges.size()];
    if (random() & 1) std::swap(a, b);

    std::vector<char> side(graph.size(), false);
    std::vector<int> stack{a};
    side[a] = true;
    while (!stack.empty()) {
        int vertex = stack.back();
        stack.pop_back();
        for (int neighbor : graph[vertex]) {
            if ((vertex == a && neighbor == b) ||
                (vertex == b && neighbor == a) || side[neighbor]) {
                continue;
            }
            side[neighbor] = true;
            stack.push_back(neighbor);
        }
    }
    std::vector<int> outside;
    outside.reserve(graph.size());
    for (int vertex = 0; vertex < static_cast<int>(graph.size()); ++vertex) {
        if (!side[vertex] && vertex != b) outside.push_back(vertex);
    }
    if (outside.empty()) return;
    int target = outside[random() % outside.size()];
    remove_edge(graph, a, b);
    add_edge(graph, a, target);
}

static void leaf_move(Graph& graph, std::mt19937_64& random) {
    std::vector<int> leaves;
    for (int vertex = 0; vertex < static_cast<int>(graph.size()); ++vertex) {
        if (graph[vertex].size() == 1) leaves.push_back(vertex);
    }
    if (leaves.empty()) return;
    int leaf = leaves[random() % leaves.size()];
    int old_parent = graph[leaf][0];
    int target = old_parent;
    while (target == old_parent || target == leaf) {
        target = static_cast<int>(random() % graph.size());
    }
    remove_edge(graph, leaf, old_parent);
    add_edge(graph, leaf, target);
}

static Graph mutate(Graph graph, std::mt19937_64& random) {
    int steps = 1 + static_cast<int>(random() % 8);
    for (int step = 0; step < steps; ++step) {
        if ((random() % 100) < 20) leaf_move(graph, random);
        else spr_mutation(graph, random);
    }
    for (auto& neighbors : graph) std::sort(neighbors.begin(), neighbors.end());
    return graph;
}

static bool direct_better(const Individual& left, const Individual& right) {
    if (left.fitness.witness != right.fitness.witness)
        return left.fitness.witness;
    if (left.fitness.legal_rebound != right.fitness.legal_rebound)
        return left.fitness.legal_rebound;
    int comparison = compare_ratio(left.fitness.best_legal_post,
                                   right.fitness.best_legal_post);
    if (comparison != 0) return comparison > 0;
    comparison = compare_ratio(left.fitness.best_legal_rebound,
                               right.fitness.best_legal_rebound);
    if (comparison != 0) return comparison > 0;
    return left.key < right.key;
}

static bool rebound_better(const Individual& left, const Individual& right) {
    if (left.fitness.witness != right.fitness.witness)
        return left.fitness.witness;
    if (left.fitness.legal_rebound != right.fitness.legal_rebound)
        return left.fitness.legal_rebound;
    int comparison = compare_ratio(left.fitness.best_legal_rebound,
                                   right.fitness.best_legal_rebound);
    if (comparison != 0) return comparison > 0;
    comparison = compare_factor(left.fitness.best_any_factor,
                                right.fitness.best_any_factor);
    if (comparison != 0) return comparison > 0;
    comparison = compare_ratio(left.fitness.best_legal_post,
                               right.fitness.best_legal_post);
    if (comparison != 0) return comparison > 0;
    return left.key < right.key;
}

static bool boundary_better(const Individual& left, const Individual& right) {
    if (left.fitness.witness != right.fitness.witness)
        return left.fitness.witness;
    if (left.fitness.legal_rebound != right.fitness.legal_rebound)
        return left.fitness.legal_rebound;
    if (left.fitness.boundary_gap != right.fitness.boundary_gap)
        return left.fitness.boundary_gap < right.fitness.boundary_gap;
    int comparison = compare_factor(left.fitness.best_any_factor,
                                    right.fitness.best_any_factor);
    if (comparison != 0) return comparison > 0;
    comparison = compare_ratio(left.fitness.best_legal_post,
                               right.fitness.best_legal_post);
    if (comparison != 0) return comparison > 0;
    return left.key < right.key;
}

template <typename Comparator>
static void retain(std::vector<Individual>& output,
                   std::unordered_set<std::string>& selected,
                   std::vector<Individual>& candidates,
                   int count, Comparator comparator) {
    std::sort(candidates.begin(), candidates.end(), comparator);
    for (const auto& candidate : candidates) {
        if (static_cast<int>(output.size()) >= count) break;
        if (selected.insert(candidate.key).second) output.push_back(candidate);
    }
}

static std::vector<Seed> load_seeds(const std::string& path) {
    std::ifstream input(path);
    if (!input) throw std::runtime_error("cannot open seed file: " + path);
    std::vector<Seed> seeds;
    std::string line;
    while (std::getline(input, line)) {
        if (line.empty() || line[0] == '#') continue;
        std::istringstream parser(line);
        std::string label, order_text, edge_text;
        if (!std::getline(parser, label, '\t') ||
            !std::getline(parser, order_text, '\t') ||
            !std::getline(parser, edge_text)) {
            throw std::runtime_error("bad seed line");
        }
        int order = std::stoi(order_text);
        Graph graph(order);
        std::istringstream edge_parser(edge_text);
        std::string item;
        while (std::getline(edge_parser, item, ',')) {
            if (item.empty()) continue;
            std::size_t split = item.find('-');
            int left = std::stoi(item.substr(0, split));
            int right = std::stoi(item.substr(split + 1));
            add_edge(graph, left, right);
        }
        for (auto& neighbors : graph) std::sort(neighbors.begin(), neighbors.end());
        independence_polynomial(graph);
        seeds.push_back(Seed{label, std::move(graph)});
    }
    if (seeds.empty()) throw std::runtime_error("seed file is empty");
    return seeds;
}

static void json_ratio(std::ostream& out, const Ratio& ratio) {
    out << "{\"index\":" << ratio.index
        << ",\"trough_index\":" << ratio.trough
        << ",\"numerator\":\"" << u128_string(ratio.num)
        << "\",\"denominator\":\"" << u128_string(ratio.den)
        << "\",\"decimal\":" << std::setprecision(18)
        << static_cast<double>(ratio_float(ratio)) << '}';
}

static void json_factor(std::ostream& out, const Factor& factor) {
    out << "{\"index\":" << factor.index
        << ",\"trough_index\":" << factor.trough
        << ",\"ranking_decimal\":" << std::setprecision(18)
        << static_cast<double>(factor_float(factor)) << '}';
}

static void json_individual(std::ostream& out, const Individual& item) {
    out << "{\n      \"order\":" << item.graph.size()
        << ",\n      \"alpha\":" << item.fitness.alpha
        << ",\n      \"first_descent\":" << item.fitness.first_descent
        << ",\n      \"first_reascent\":" << item.fitness.first_reascent
        << ",\n      \"tail_start\":" << item.fitness.tail_start
        << ",\n      \"legal_rebound\":"
        << (item.fitness.legal_rebound ? "true" : "false")
        << ",\n      \"boundary_gap\":" << item.fitness.boundary_gap
        << ",\n      \"best_legal_post_descent_ratio\":";
    json_ratio(out, item.fitness.best_legal_post);
    out << ",\n      \"best_legal_rebound_ratio\":";
    json_ratio(out, item.fitness.best_legal_rebound);
    out << ",\n      \"best_any_rebound_factor\":";
    json_factor(out, item.fitness.best_any_factor);
    out << ",\n      \"edges\":[";
    bool first = true;
    for (int left = 0; left < static_cast<int>(item.graph.size()); ++left) {
        for (int right : item.graph[left]) {
            if (left >= right) continue;
            if (!first) out << ',';
            first = false;
            out << '[' << left << ',' << right << ']';
        }
    }
    out << "],\n      \"polynomial\":[";
    for (std::size_t index = 0; index < item.polynomial.size(); ++index) {
        if (index) out << ',';
        out << '"' << u128_string(item.polynomial[index]) << '"';
    }
    out << "]\n    }";
}

static std::vector<int> parse_orders(const std::string& text) {
    std::vector<int> orders;
    std::istringstream input(text);
    std::string item;
    while (std::getline(input, item, ',')) orders.push_back(std::stoi(item));
    return orders;
}

int main(int argc, char** argv) {
    try {
        std::string seed_file;
        std::string output_path;
        std::vector<int> orders{60, 72, 84, 96, 108, 120};
        int population_size = 144;
        int generations = 900;
        int children = 12;
        std::uint64_t seed_value = 99308132026ULL;
        for (int index = 1; index < argc; ++index) {
            std::string option = argv[index];
            auto value = [&]() -> std::string {
                if (++index >= argc) throw std::runtime_error("missing argument");
                return argv[index];
            };
            if (option == "--seed-file") seed_file = value();
            else if (option == "--output") output_path = value();
            else if (option == "--orders") orders = parse_orders(value());
            else if (option == "--population") population_size = std::stoi(value());
            else if (option == "--generations") generations = std::stoi(value());
            else if (option == "--children") children = std::stoi(value());
            else if (option == "--seed") seed_value = std::stoull(value());
            else throw std::runtime_error("unknown option: " + option);
        }
        if (seed_file.empty() || output_path.empty()) {
            throw std::runtime_error("--seed-file and --output are required");
        }
        for (int order : orders) {
            if (order < 2 || order > 120) {
                throw std::runtime_error("orders must be in [2,120]");
            }
        }
        std::vector<Seed> seeds = load_seeds(seed_file);
        std::mt19937_64 random(seed_value);
        auto started = std::chrono::steady_clock::now();
        std::vector<OrderReport> reports;
        bool found_witness = false;
        Individual global_champion;
        bool have_global = false;

        for (int order : orders) {
            std::unordered_set<std::string> seen;
            std::vector<Individual> population;
            OrderReport report;
            report.order = order;
            while (static_cast<int>(population.size()) < population_size) {
                Graph graph;
                if ((random() % 100) < 82) {
                    const Seed& source = seeds[random() % seeds.size()];
                    if (static_cast<int>(source.graph.size()) > order) continue;
                    graph = augment(source.graph, order, random);
                    int warmup = static_cast<int>(random() % 10);
                    for (int step = 0; step < warmup; ++step)
                        graph = mutate(std::move(graph), random);
                } else {
                    graph = random_tree(order, random);
                }
                std::string key = topology_key(graph);
                if (!seen.insert(key).second) {
                    ++report.duplicates_skipped;
                    continue;
                }
                Individual item = evaluate(std::move(graph));
                ++report.unique_evaluated;
                if (item.fitness.witness) {
                    population.push_back(std::move(item));
                    found_witness = true;
                    break;
                }
                population.push_back(std::move(item));
            }

            for (int generation = 0;
                 generation < generations && !found_witness; ++generation) {
                std::vector<Individual> candidates = population;
                for (const Individual& parent : population) {
                    for (int child = 0; child < children; ++child) {
                        Graph graph = mutate(parent.graph, random);
                        std::string key = topology_key(graph);
                        if (!seen.insert(key).second) {
                            ++report.duplicates_skipped;
                            continue;
                        }
                        Individual item = evaluate(std::move(graph));
                        ++report.unique_evaluated;
                        if (item.fitness.witness) {
                            candidates.push_back(std::move(item));
                            found_witness = true;
                            break;
                        }
                        candidates.push_back(std::move(item));
                    }
                    if (found_witness) break;
                }

                std::vector<Individual> following;
                following.reserve(population_size);
                std::unordered_set<std::string> selected;
                int direct_count = population_size / 2;
                retain(following, selected, candidates, direct_count,
                       direct_better);
                int rebound_count = direct_count + population_size / 4;
                retain(following, selected, candidates, rebound_count,
                       rebound_better);
                retain(following, selected, candidates, population_size,
                       boundary_better);
                population = std::move(following);
                report.generations_completed = generation + 1;

                if (generation % 100 == 0 || found_witness) {
                    const Individual& best = *std::max_element(
                        population.begin(), population.end(),
                        [](const Individual& a, const Individual& b) {
                            return direct_better(b, a);
                        });
                    std::cerr << "order=" << order
                              << " generation=" << generation
                              << " unique=" << report.unique_evaluated
                              << " ratio=" << std::setprecision(12)
                              << static_cast<double>(ratio_float(
                                  best.fitness.best_legal_post))
                              << " legal_rebound="
                              << best.fitness.legal_rebound
                              << " gap=" << best.fitness.boundary_gap
                              << '\n';
                }
            }

            report.champion = *std::max_element(
                population.begin(), population.end(),
                [](const Individual& a, const Individual& b) {
                    return direct_better(b, a);
                });
            if (!have_global || direct_better(report.champion, global_champion)) {
                global_champion = report.champion;
                have_global = true;
            }
            reports.push_back(report);
            if (found_witness) break;
        }

        std::uint64_t total = 0, duplicates = 0;
        for (const auto& report : reports) {
            total += report.unique_evaluated;
            duplicates += report.duplicates_skipped;
        }
        double elapsed = std::chrono::duration<double>(
            std::chrono::steady_clock::now() - started).count();

        std::ofstream output(output_path);
        if (!output) throw std::runtime_error("cannot write output");
        output << "{\n  \"status\":\""
               << (found_witness ? "COUNTEREXAMPLE" : "NO_COUNTEREXAMPLE")
               << "\",\n  \"scope\":\"Finite deterministic adversarial search over distinct labeled topology encodings; not an exhaustive isomorphism census and not a theorem.\","
               << "\n  \"arithmetic\":\"Exact rooted-tree recurrence in unsigned 128-bit integers; order capped at 120 so every coefficient and recurrence subtotal is below 2^120.\","
               << "\n  \"seed_file\":\"" << seed_file << "\","
               << "\n  \"parameters\":{\"population\":" << population_size
               << ",\"generations\":" << generations
               << ",\"children\":" << children
               << ",\"seed\":" << seed_value << "},"
               << "\n  \"total_unique_labeled_topologies\":" << total
               << ",\n  \"duplicates_skipped\":" << duplicates
               << ",\n  \"elapsed_seconds\":" << std::setprecision(9)
               << elapsed << ",\n  \"orders\":[\n";
        for (std::size_t index = 0; index < reports.size(); ++index) {
            const auto& report = reports[index];
            if (index) output << ",\n";
            output << "    {\"order\":" << report.order
                   << ",\"unique_labeled_topologies\":"
                   << report.unique_evaluated
                   << ",\"duplicates_skipped\":"
                   << report.duplicates_skipped
                   << ",\"generations_completed\":"
                   << report.generations_completed
                   << ",\"champion\":";
            json_individual(output, report.champion);
            output << '}';
        }
        output << "\n  ],\n  \"global_champion\":";
        json_individual(output, global_champion);
        output << "\n}\n";
        output.close();

        std::cout << "status="
                  << (found_witness ? "COUNTEREXAMPLE" : "NO_COUNTEREXAMPLE")
                  << " unique=" << total
                  << " duplicates=" << duplicates
                  << " elapsed=" << elapsed
                  << " output=" << output_path << '\n';
        return found_witness ? 1 : 0;
    } catch (const std::exception& error) {
        std::cerr << "error: " << error.what() << '\n';
        return 2;
    }
}
