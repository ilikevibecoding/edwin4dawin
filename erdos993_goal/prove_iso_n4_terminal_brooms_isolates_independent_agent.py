#!/usr/bin/env python3
"""Independent exact rank-4 terminal theorem for marked forests.

The terminal condition is that no unmarked vertex is adjacent to an unmarked
leaf.  A structural argument then leaves exactly two families (arbitrary
unmarked isolated vertices are allowed):

  * two disjoint stars rooted at the two marks;
  * a connected double broom whose handle is the path between the marks.

This file independently derives all four independence-polynomial rows and
certifies N_4 >= 0 in both families.  The certificates use exact integer
forward differences, hence product binomial bases.  The connected tail uses
an additional path-length Newton basis.  A small literal graph replay and an
unlabelled-forest classification census are audits, not inputs to the proof.
"""

from __future__ import annotations

import hashlib
import itertools
import json
from math import comb, factorial
from pathlib import Path

import networkx as nx
import sympy as sp


HERE = Path(__file__).resolve().parent
OUTPUT = HERE / "iso_n4_terminal_brooms_isolates_independent_exact_agent_20260829.json"
MARKER = "PASS_INDEPENDENT_EXACT_ISO_N4_TERMINAL_BROOMS_ISOLATES_AGENT"
MAXIMUM = 5
FOREST_COUNTS = {2: 2, 3: 3, 4: 6, 5: 10, 6: 20, 7: 37, 8: 76}


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def at(row, index):
    return row[index] if 0 <= index < len(row) else 0


def add(*rows, maximum=MAXIMUM):
    return tuple(sum(at(row, index) for row in rows) for index in range(maximum + 1))


def shift(row, amount=1, maximum=MAXIMUM):
    return tuple(at(row, index - amount) for index in range(maximum + 1))


def convolution(left, right, maximum=MAXIMUM):
    return tuple(
        sum(at(left, index) * at(right, rank - index) for index in range(rank + 1))
        for rank in range(maximum + 1)
    )


def binomial_polynomial(variable, index):
    if index < 0:
        return sp.Integer(0)
    result = sp.Integer(1)
    for offset in range(index):
        result *= variable - offset
    return sp.expand(result / factorial(index))


def binomial_row(parameter, maximum=MAXIMUM):
    if isinstance(parameter, int):
        return tuple(comb(parameter, index) if index <= parameter else 0 for index in range(maximum + 1))
    return tuple(binomial_polynomial(parameter, index) for index in range(maximum + 1))


def path_count(order, index):
    """The coefficient i_index(P_order), including recurrence boundaries."""
    if index < 0:
        return 0
    if order == -2:
        return 0
    if order == -1:
        return int(index == 0)
    assert order >= 0
    top = order - index + 1
    return comb(top, index) if top >= index else 0


def path_row(order, maximum=MAXIMUM):
    return tuple(path_count(order, index) for index in range(maximum + 1))


def four_minor_n4(rows):
    """The rank-four four-minor Newton expression, in exact row entries."""
    e, u, v, w = rows
    return (
        8 * at(e, 4) * at(w, 2)
        - 5 * at(e, 5) * at(w, 1)
        + at(e, 3) * (2 * at(w, 1) - 5 * at(w, 3))
        + at(u, 4) * (-5 * at(v, 2) - at(w, 1))
        + at(u, 3) * (8 * at(v, 3) + 2 * at(w, 2))
        + at(u, 2) * (-5 * at(v, 4) + 2 * at(v, 2) - at(w, 3))
        - at(v, 4) * at(w, 1)
        + 2 * at(v, 3) * at(w, 2)
        - at(v, 2) * at(w, 3)
    )


def disconnected_rows(arm_u, arm_v, isolates):
    """Rows for K_(1,a) disjoint K_(1,b) plus t isolated vertices."""
    arow = binomial_row(arm_u)
    brow = binomial_row(arm_v)
    trow = binomial_row(isolates)
    a_plus_x = add(arow, shift((1,) + (0,) * MAXIMUM))
    b_plus_x = add(brow, shift((1,) + (0,) * MAXIMUM))
    return (
        convolution(trow, convolution(a_plus_x, b_plus_x)),
        convolution(trow, convolution(arow, b_plus_x)),
        convolution(trow, convolution(a_plus_x, brow)),
        convolution(trow, convolution(arow, brow)),
    )


def connected_rows(path_order, arm_u, arm_v, isolates):
    """Rows for a double broom on a path of path_order>=2 vertices."""
    assert path_order >= 2
    internal = path_order - 2
    arow = binomial_row(arm_u)
    brow = binomial_row(arm_v)
    trow = binomial_row(isolates)
    ab = convolution(arow, brow)
    p0 = path_row(internal)
    p1 = path_row(internal - 1)
    p2 = path_row(internal - 2)

    e0 = add(
        convolution(ab, p0),
        shift(convolution(arow, p1)),
        shift(convolution(brow, p1)),
        shift(p2, 2),
    )
    u0 = convolution(arow, add(convolution(brow, p0), shift(p1)))
    v0 = convolution(brow, add(convolution(arow, p0), shift(p1)))
    w0 = convolution(ab, p0)
    return tuple(convolution(trow, row) for row in (e0, u0, v0, w0))


def disconnected_value(arm_u, arm_v, isolates):
    return int(four_minor_n4(disconnected_rows(arm_u, arm_v, isolates)))


def connected_value(path_order, arm_u, arm_v, isolates):
    return int(four_minor_n4(connected_rows(path_order, arm_u, arm_v, isolates)))


def mixed_forward_difference_3(value, i, j, k):
    """Delta_a^i Delta_b^j Delta_t^k value(0,0,0), exactly."""
    total = 0
    for aa in range(i + 1):
        for bb in range(j + 1):
            for tt in range(k + 1):
                total += (
                    (-1) ** (i - aa + j - bb + k - tt)
                    * comb(i, aa)
                    * comb(j, bb)
                    * comb(k, tt)
                    * value(aa, bb, tt)
                )
    return total


def leaf_newton_coefficients(value):
    records = []
    for i in range(6):
        for j in range(6 - i):
            for k in range(6 - i - j):
                coefficient = mixed_forward_difference_3(value, i, j, k)
                records.append((i, j, k, coefficient))
    assert len(records) == 56
    return records


def reconstruct_leaf_certificate(records, aa, bb, tt):
    return sp.expand(sum(
        coefficient
        * binomial_polynomial(aa, i)
        * binomial_polynomial(bb, j)
        * binomial_polynomial(tt, k)
        for i, j, k, coefficient in records
    ))


def record_stream_sha(records):
    encoded = json.dumps(records, separators=(",", ":"), sort_keys=True).encode()
    return hashlib.sha256(encoded).hexdigest().upper()


def coefficient_summary(records, include_records=False):
    values = [record[-1] for record in records]
    positive = [value for value in values if value > 0]
    result = {
        "coefficient_cells": len(records),
        "nonzero_coefficients": sum(value != 0 for value in values),
        "zero_coefficients": sum(value == 0 for value in values),
        "negative_coefficients": sum(value < 0 for value in values),
        "minimum_coefficient": min(values),
        "minimum_positive_coefficient": min(positive),
        "maximum_coefficient": max(values),
        "ordered_stream_sha256": record_stream_sha(records),
    }
    if include_records:
        result["records"] = [
            {"index": [i, j, k], "coefficient": coefficient}
            for i, j, k, coefficient in records
        ]
    return result


def generic_leaf_degree_check():
    """Exact CAS check: the connected leaf/isolate degree-six part vanishes."""
    aa, bb, tt = sp.symbols("a b t", integer=True, nonnegative=True)
    arow = binomial_row(aa)
    brow = binomial_row(bb)
    trow = binomial_row(tt)
    ab = convolution(arow, brow)
    r_symbols = sp.symbols("r1:6")
    s_symbols = sp.symbols("s1:6")
    h_symbols = sp.symbols("h1:6")
    prow = (sp.Integer(1),) + r_symbols
    pminus1 = (sp.Integer(1),) + s_symbols
    pminus2 = (sp.Integer(1),) + h_symbols
    e0 = add(
        convolution(ab, prow),
        shift(convolution(arow, pminus1)),
        shift(convolution(brow, pminus1)),
        shift(pminus2, 2),
    )
    u0 = convolution(arow, add(convolution(brow, prow), shift(pminus1)))
    v0 = convolution(brow, add(convolution(arow, prow), shift(pminus1)))
    w0 = convolution(ab, prow)
    expression = sp.expand(four_minor_n4(tuple(convolution(trow, row) for row in (e0, u0, v0, w0))))
    polynomial = sp.Poly(expression, aa, bb, tt)
    assert polynomial.total_degree() <= 5
    coefficient_payload = sorted(
        (list(monomial), str(coefficient))
        for monomial, coefficient in polynomial.terms()
    )
    payload_hash = hashlib.sha256(
        json.dumps(coefficient_payload, separators=(",", ":")).encode()
    ).hexdigest().upper()
    return {
        "formal_path_rows": "P=(1,r1,...,r5), Pminus1=(1,s1,...,s5), Pminus2=(1,h1,...,h5)",
        "leaf_variables": ["a", "b", "t"],
        "exact_total_degree": polynomial.total_degree(),
        "degree_six_part": "identically zero before imposing any relation among the formal path coefficients",
        "expanded_term_count": len(polynomial.terms()),
        "coefficient_payload_sha256": payload_hash,
    }


def disconnected_certificate():
    aa, bb, tt = sp.symbols("a b t", integer=True, nonnegative=True)
    expression = sp.expand(four_minor_n4(disconnected_rows(aa, bb, tt)))
    polynomial = sp.Poly(expression, aa, bb, tt)
    assert polynomial.total_degree() <= 5
    records = leaf_newton_coefficients(disconnected_value)
    assert all(coefficient >= 0 for *_, coefficient in records)
    assert sp.expand(reconstruct_leaf_certificate(records, aa, bb, tt) - expression) == 0
    summary = coefficient_summary(records, include_records=True)
    assert summary["nonzero_coefficients"] == 53
    assert summary["minimum_positive_coefficient"] == 4
    return expression, summary


def forward_difference_column(values):
    firsts = []
    current = list(values)
    while current:
        firsts.append(current[0])
        current = [current[index + 1] - current[index] for index in range(len(current) - 1)]
    return firsts


def connected_certificate():
    # Boundary path orders.  Each is an exact product-binomial certificate in
    # (a,b,t), not a parameter census.
    boundary = {}
    boundary_records = {}
    for path_order in range(2, 13):
        value = lambda aa, bb, tt, n=path_order: connected_value(n, aa, bb, tt)
        records = leaf_newton_coefficients(value)
        assert all(coefficient >= 0 for *_, coefficient in records)
        boundary_records[path_order] = records
        boundary[str(path_order)] = coefficient_summary(records)

    expected_minima = {
        2: 0,
        3: 0,
        4: 2,
        5: 24,
        6: 25,
        7: 25,
        8: 25,
        9: 25,
        10: 25,
        11: 25,
        12: 25,
    }
    assert {n: boundary[str(n)]["minimum_coefficient"] for n in range(2, 13)} == expected_minima

    # Tail n=13+q.  For each leaf Newton index the coefficient is a polynomial
    # of degree <=6 in n.  Seven forward-difference layers therefore give its
    # all-q binomial expansion.  Values through n=20 additionally verify the
    # seventh difference is zero exactly.
    tail_by_order = {}
    for path_order in range(13, 21):
        value = lambda aa, bb, tt, n=path_order: connected_value(n, aa, bb, tt)
        tail_by_order[path_order] = leaf_newton_coefficients(value)

    indices = [(i, j, k) for i in range(6) for j in range(6 - i) for k in range(6 - i - j)]
    tail_records = []
    for position, (i, j, k) in enumerate(indices):
        sequence = [tail_by_order[n][position][3] for n in range(13, 21)]
        differences = forward_difference_column(sequence)
        assert differences[7] == 0
        for degree in range(7):
            coefficient = differences[degree]
            assert coefficient >= 0
            tail_records.append((i, j, k, degree, coefficient))

    assert len(tail_records) == 392
    nonzero = [record[-1] for record in tail_records if record[-1] != 0]
    assert len(nonzero) == 126
    assert min(nonzero) == 25
    tail_stream = record_stream_sha(tail_records)

    # Exact reconstruction at every boundary n, using polynomial expressions,
    # checks the finite-difference extraction independently of sign tests.
    aa, bb, tt = sp.symbols("a b t", integer=True, nonnegative=True)
    reconstruction_hash = hashlib.sha256()
    for path_order in range(2, 21):
        records = boundary_records.get(path_order, tail_by_order.get(path_order))
        expression = sp.expand(four_minor_n4(connected_rows(path_order, aa, bb, tt)))
        reconstruction = reconstruct_leaf_certificate(records, aa, bb, tt)
        assert sp.expand(reconstruction - expression) == 0
        assert sp.Poly(expression, aa, bb, tt).total_degree() <= 5
        reconstruction_hash.update(f"{path_order}:{expression};".encode())

    return {
        "boundary_path_orders_2_through_12": boundary,
        "tail_path_order": "n=13+q, q>=0",
        "tail_path_degree_bound": 6,
        "tail_newton_cells": len(tail_records),
        "tail_nonzero_coefficients": len(nonzero),
        "tail_negative_coefficients": 0,
        "tail_minimum_coefficient": min(record[-1] for record in tail_records),
        "tail_minimum_positive_coefficient": min(nonzero),
        "tail_ordered_stream_sha256": tail_stream,
        "tail_seventh_differences": "all 56 are exactly zero",
        "reconstruction_orders": [2, 20],
        "reconstruction_expression_stream_sha256": reconstruction_hash.hexdigest().upper(),
        "proof_of_all_tail_orders": (
            "Every path coefficient used by N4 is binom(n-c-j,j), hence polynomial in n. "
            "In every N4 product the two row indices sum to at most 6, so every mixed "
            "leaf coefficient has path degree at most 6.  Thus its exact forward-difference "
            "identity c(13+q)=sum_{d=0}^6 Delta^d c(13) binom(q,d), with all displayed "
            "Delta^d c(13)>=0, proves nonnegativity for every q>=0."
        ),
    }


def unlabelled_forests(order):
    tree_types = []
    for size in range(1, order + 1):
        trees = [nx.empty_graph(1)] if size == 1 else list(nx.nonisomorphic_trees(size))
        for tree in trees:
            tree_types.append((size, nx.convert_node_labels_to_integers(tree)))

    def extend(remaining, start, selected):
        if remaining == 0:
            yield nx.disjoint_union_all([tree_types[index][1] for index in selected])
            return
        for index in range(start, len(tree_types)):
            size = tree_types[index][0]
            if size > remaining:
                break
            yield from extend(remaining - size, index, selected + (index,))

    yield from extend(order, 0, ())


def has_eligible_unmarked_support(graph, u, v):
    marks = {u, v}
    for support in graph.nodes():
        if support in marks:
            continue
        for leaf in graph.neighbors(support):
            if leaf not in marks and graph.degree(leaf) == 1:
                return True
    return False


def classify_terminal(graph, u, v):
    """Executable version of the structural proof; assertions fail closed."""
    assert u != v
    assert nx.is_forest(graph)
    assert not has_eligible_unmarked_support(graph, u, v)
    marks = {u, v}
    components = [set(component) for component in nx.connected_components(graph)]
    unmarked_components = [component for component in components if not (component & marks)]
    assert all(len(component) == 1 for component in unmarked_components)
    isolates = len(unmarked_components)
    component_u = next(component for component in components if u in component)
    component_v = next(component for component in components if v in component)

    if component_u != component_v:
        assert all(vertex == u or graph.degree(vertex) == 1 and graph.has_edge(u, vertex) for vertex in component_u)
        assert all(vertex == v or graph.degree(vertex) == 1 and graph.has_edge(v, vertex) for vertex in component_v)
        return ("disconnected_two_rooted_stars_plus_isolates", len(component_u) - 1, len(component_v) - 1, isolates)

    path = nx.shortest_path(graph, u, v)
    path_set = set(path)
    for index, vertex in enumerate(path[1:-1], start=1):
        assert set(graph.neighbors(vertex)) == {path[index - 1], path[index + 1]}
    extra_u = set(graph.neighbors(u)) - {path[1]}
    extra_v = set(graph.neighbors(v)) - {path[-2]}
    assert all(vertex not in marks and graph.degree(vertex) == 1 for vertex in extra_u | extra_v)
    assert component_u == path_set | extra_u | extra_v
    return ("connected_double_broom_plus_isolates", len(path), len(extra_u), len(extra_v), isolates)


def classification_census():
    by_order = {}
    family_counts = {
        "disconnected_two_rooted_stars_plus_isolates": 0,
        "connected_double_broom_plus_isolates": 0,
    }
    totals = {"forests": 0, "marked_cells": 0, "terminal_cells": 0}
    stream = hashlib.sha256()
    for order, expected_count in FOREST_COUNTS.items():
        forests = list(unlabelled_forests(order))
        assert len(forests) == expected_count
        local = 0
        for forest_index, graph in enumerate(forests):
            for u, v in itertools.combinations(graph.nodes(), 2):
                totals["marked_cells"] += 1
                if has_eligible_unmarked_support(graph, u, v):
                    continue
                classification = classify_terminal(graph, u, v)
                family_counts[classification[0]] += 1
                totals["terminal_cells"] += 1
                local += 1
                stream.update(f"{order},{forest_index},{u},{v},{classification};".encode())
        by_order[str(order)] = {"unlabelled_forests": expected_count, "terminal_marked_cells": local}
        totals["forests"] += expected_count
    return {
        "label": "finite census only; the preceding structural argument is the theorem",
        "orders": [2, 8],
        "totals": totals,
        "family_counts": family_counts,
        "by_order": by_order,
        "classification_stream_sha256": stream.hexdigest().upper(),
    }


def independence_row(number, edges, removed):
    live = [vertex for vertex in range(number) if vertex not in removed]
    position = {vertex: index for index, vertex in enumerate(live)}
    masks = [
        (1 << position[left]) | (1 << position[right])
        for left, right in edges
        if left in position and right in position
    ]
    row = [0] * (MAXIMUM + 1)
    for subset in range(1 << len(live)):
        if all(subset & mask != mask for mask in masks):
            size = subset.bit_count()
            if size <= MAXIMUM:
                row[size] += 1
    return tuple(row)


def direct_graph_rows(number, edges, u, v):
    return tuple(independence_row(number, edges, removed) for removed in (set(), {u}, {v}, {u, v}))


def disconnected_graph(arm_u, arm_v, isolates):
    u = 0
    v = arm_u + 1
    number = arm_u + arm_v + isolates + 2
    edges = [(u, leaf) for leaf in range(1, arm_u + 1)]
    edges += [(v, leaf) for leaf in range(v + 1, v + arm_v + 1)]
    return number, edges, u, v


def connected_graph(path_order, arm_u, arm_v, isolates):
    u = 0
    v = path_order - 1
    next_vertex = path_order
    number = path_order + arm_u + arm_v + isolates
    edges = [(vertex, vertex + 1) for vertex in range(path_order - 1)]
    edges += [(u, leaf) for leaf in range(next_vertex, next_vertex + arm_u)]
    next_vertex += arm_u
    edges += [(v, leaf) for leaf in range(next_vertex, next_vertex + arm_v)]
    return number, edges, u, v


def direct_literal_replay():
    checks = 0
    minima = {"disconnected": None, "connected": None}
    stream = hashlib.sha256()

    for aa, bb, tt in itertools.product(range(4), repeat=3):
        number, edges, u, v = disconnected_graph(aa, bb, tt)
        direct = direct_graph_rows(number, edges, u, v)
        analytic = disconnected_rows(aa, bb, tt)
        assert direct == analytic
        value = four_minor_n4(direct)
        assert value == disconnected_value(aa, bb, tt) and value >= 0
        checks += 1
        cell = {"a": aa, "b": bb, "t": tt, "value": value}
        if minima["disconnected"] is None or value < minima["disconnected"]["value"]:
            minima["disconnected"] = cell
        stream.update(f"D,{aa},{bb},{tt},{value};".encode())

    for path_order, aa, bb, tt in itertools.product(range(2, 9), range(3), range(3), range(3)):
        number, edges, u, v = connected_graph(path_order, aa, bb, tt)
        direct = direct_graph_rows(number, edges, u, v)
        analytic = connected_rows(path_order, aa, bb, tt)
        assert direct == analytic
        value = four_minor_n4(direct)
        assert value == connected_value(path_order, aa, bb, tt) and value >= 0
        checks += 1
        cell = {"n": path_order, "a": aa, "b": bb, "t": tt, "value": value}
        if minima["connected"] is None or value < minima["connected"]["value"]:
            minima["connected"] = cell
        stream.update(f"C,{path_order},{aa},{bb},{tt},{value};".encode())

    assert checks == 253
    return {
        "label": "finite literal graph replay only; not the all-order proof",
        "checks": checks,
        "ranges": {
            "disconnected": "0<=a,b,t<=3",
            "connected": "2<=n<=8 and 0<=a,b,t<=2",
        },
        "minima": minima,
        "value_stream_sha256": stream.hexdigest().upper(),
    }


def main():
    generic_degree = generic_leaf_degree_check()
    disconnected_expression, disconnected = disconnected_certificate()
    connected = connected_certificate()
    classification = classification_census()
    replay = direct_literal_replay()

    report = {
        "marker": MARKER,
        "theorem": (
            "Let F be a forest with distinct marked vertices u,v and no unmarked vertex adjacent "
            "to an unmarked leaf.  Then the rank-four four-minor Newton quantity N4(F;u,v) is nonnegative."
        ),
        "terminal_classification_theorem": {
            "terminal_condition": "no unmarked vertex is adjacent to an unmarked degree-one vertex",
            "proof": [
                "A component containing neither mark cannot be nontrivial: a longest path in such a tree has an unmarked leaf whose neighbour is an unmarked support. Hence every unmarked component is an isolate.",
                "If u and v are in different components, a marked component cannot contain a vertex at distance at least two from its mark: a farthest such vertex is an unmarked leaf with unmarked support. Thus the two marked components are stars centred at u and v.",
                "If u and v are in one component, take the unique u-v path. Any branch off that path has a farthest unmarked leaf. Its support is unmarked unless the branch is one edge attached directly to u or v. A one-edge branch at an internal path vertex also has unmarked support. Thus every off-path vertex is a leaf at u or v, giving a double broom.",
                "The arguments permit zero endpoint leaves and any number of isolated unmarked vertices, so the two listed families are exhaustive including all degeneracies."
            ],
            "families": [
                "K_(1,a) disjoint K_(1,b), marked at the centres, plus t isolates; a,b,t>=0",
                "a path on n>=2 vertices marked at its endpoints, with a,b extra endpoint leaves, plus t isolates; a,b,t>=0",
            ],
            "finite_census_audit": classification,
        },
        "rank_four_expression": (
            "N4=8E4W2-5E5W1+E3(2W1-5W3)+U4(-5V2-W1)+U3(8V3+2W2)"
            "+U2(-5V4+2V2-W3)-V4W1+2V3W2-V2W3"
        ),
        "generic_leaf_degree_certificate": generic_degree,
        "disconnected_two_rooted_stars_plus_isolates": {
            "row_identity": {
                "notation": "A=(1+x)^a, B=(1+x)^b, T=(1+x)^t",
                "E": "T(A+x)(B+x)",
                "U": "TA(B+x)",
                "V": "T(A+x)B",
                "W": "TAB",
            },
            "expanded_n4": str(disconnected_expression),
            "product_binomial_certificate": disconnected,
            "submarker": "PASS_INDEPENDENT_EXACT_ISO_N4_TWO_ROOTED_STARS_PLUS_ISOLATES_AGENT",
        },
        "connected_double_broom_plus_isolates": {
            "row_identity": {
                "notation": "p=n-2, A=(1+x)^a, B=(1+x)^b, T=(1+x)^t, P_j=I(P_j;x)",
                "E": "T[AB P_p+x(A+B)P_(p-1)+x^2 P_(p-2)]",
                "U": "TA[B P_p+xP_(p-1)]",
                "V": "TB[A P_p+xP_(p-1)]",
                "W": "TABP_p",
                "boundary_convention": "P_-1=1 and P_-2=0",
                "path_coefficients": "[x^j]P_m=binom(m-j+1,j)",
            },
            "all_order_certificate": connected,
            "submarker": "PASS_INDEPENDENT_EXACT_ISO_N4_CONNECTED_DOUBLE_BROOM_PLUS_ISOLATES_AGENT",
        },
        "direct_literal_replay": replay,
        "proof_status_distinctions": {
            "theorem": "The structural classification plus the nonnegative exact binomial certificates prove N4>=0 for every terminal forest in the stated rank-four scope.",
            "finite_census": "The order-2..8 classification census and 253 direct graph cells only audit the formulas; no finite census is promoted to an all-order proof.",
            "failed_relaxation": "none used",
        },
        "scope_guard": (
            "This is only the terminal rank-four theorem. It does not prove the rank-four bundle payment "
            "for nonterminal |S|=2 internal-spine supports, does not yet prove N4 for every marked forest, "
            "does not address ranks >=5, and does not prove Erdos Problem 993."
        ),
        "source_sha256": sha256(Path(__file__)),
    }
    OUTPUT.write_text(json.dumps(report, indent=2, sort_keys=True) + "\n", encoding="utf-8")
    print(json.dumps({
        "marker": MARKER,
        "classification_terminal_cells": classification["totals"]["terminal_cells"],
        "disconnected": {
            key: disconnected[key]
            for key in ("coefficient_cells", "nonzero_coefficients", "negative_coefficients", "minimum_positive_coefficient")
        },
        "connected_boundary_minima": {
            n: connected["boundary_path_orders_2_through_12"][str(n)]["minimum_coefficient"]
            for n in range(2, 13)
        },
        "connected_tail": {
            key: connected[key]
            for key in ("tail_newton_cells", "tail_nonzero_coefficients", "tail_negative_coefficients", "tail_minimum_positive_coefficient")
        },
        "direct_replay_checks": replay["checks"],
        "source_sha256": report["source_sha256"],
        "output": OUTPUT.name,
    }, indent=2, sort_keys=True))


if __name__ == "__main__":
    main()
