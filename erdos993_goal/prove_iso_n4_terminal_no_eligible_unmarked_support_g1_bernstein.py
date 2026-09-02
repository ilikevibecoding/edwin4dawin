#!/usr/bin/env python3
"""Exact rank-four terminal theorem with no eligible unmarked support.

Let F be a forest with distinct marked vertices u,v.  An eligible unmarked
support is an unmarked vertex adjacent to an unmarked leaf.  If none exists,
the non-isolated part of F is either

* a connected double broom: the u-v path, with extra leaves only at u,v; or
* two disjoint stars rooted at u and v.

Arbitrary additional isolates are allowed.  This script derives N_4 directly
for both families and certifies it by exact multivariate Newton/binomial-basis
expansions.  The isolate parameter is kept inside the full four-minor rows;
no isolate-FML assertion is imported.
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
OUTPUT = HERE / "iso_n4_terminal_no_eligible_unmarked_support_exact_g1_bernstein_20260829.json"
FOREST_COUNTS = {2: 2, 3: 3, 4: 6, 5: 10, 6: 20, 7: 37, 8: 76}

a, b, t, q = sp.symbols("a b t q", integer=True, nonnegative=True)


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def choose_polynomial(value, rank):
    if rank < 0:
        return sp.Integer(0)
    answer = sp.Integer(1)
    for offset in range(rank):
        answer *= value - offset
    return sp.expand(answer / factorial(rank))


def at(row, rank):
    return row[rank] if 0 <= rank < len(row) else sp.Integer(0)


def four_minor(rows, rank=4):
    e, u, v, w = rows
    r = rank
    return sp.expand(
        2 * r * at(e, r) * at(w, r - 2)
        - (r + 1) * at(e, r + 1) * at(w, r - 3)
        + at(e, r - 1) * (2 * at(w, r - 3) - (r + 1) * at(w, r - 1))
        + at(u, r) * (-(r + 1) * at(v, r - 2) - at(w, r - 3))
        + at(u, r - 1) * (2 * r * at(v, r - 1) + 2 * at(w, r - 2))
        + at(u, r - 2) * (-(r + 1) * at(v, r) + 2 * at(v, r - 2) - at(w, r - 1))
        - at(v, r) * at(w, r - 3)
        + 2 * at(v, r - 1) * at(w, r - 2)
        - at(v, r - 2) * at(w, r - 1)
    )


def disconnected_rows(maximum=5):
    """Rows for K_(1,a) disjoint K_(1,b) disjoint t K_1, marks at centres."""
    leaves = a + b + t
    rows = [[], [], [], []]
    for rank in range(maximum + 1):
        common = choose_polynomial(leaves, rank)
        rows[0].append(
            common
            + choose_polynomial(a + t, rank - 1)
            + choose_polynomial(b + t, rank - 1)
            + choose_polynomial(t, rank - 2)
        )
        rows[1].append(common + choose_polynomial(a + t, rank - 1))
        rows[2].append(common + choose_polynomial(b + t, rank - 1))
        rows[3].append(common)
    return tuple(tuple(sp.expand(value) for value in row) for row in rows)


def path_independent_count(order, size):
    """i_size(P_order), including the two boundary continuations used below."""
    if size < 0:
        return sp.Integer(0)
    if isinstance(order, int):
        if order == -1:
            return sp.Integer(int(size == 0))
        if order < -1:
            return sp.Integer(0)
        top = order - size + 1
        return sp.Integer(comb(top, size) if top >= size else 0)
    return choose_polynomial(order - size + 1, size)


def path_convolution(isolate_exponent, path_order, rank, shift):
    if rank < shift:
        return sp.Integer(0)
    return sp.expand(
        sum(
            choose_polynomial(isolate_exponent, rank - shift - size)
            * path_independent_count(path_order, size)
            for size in range(rank - shift + 1)
        )
    )


def connected_rows(internal_path_vertices, maximum=5):
    """Rows for a double broom with p internal u-v path vertices and t isolates."""
    p = internal_path_vertices
    leaves = a + b + t
    rows = [[], [], [], []]
    for rank in range(maximum + 1):
        base = path_convolution(leaves, p, rank, 0)
        from_u = path_convolution(b + t, p - 1, rank, 1)
        from_v = path_convolution(a + t, p - 1, rank, 1)
        both = path_convolution(t, p - 2, rank, 2)
        rows[0].append(base + from_u + from_v + both)
        rows[1].append(base + from_v)
        rows[2].append(base + from_u)
        rows[3].append(base)
    return tuple(tuple(sp.expand(value) for value in row) for row in rows)


def binomial_certificate(expression, variables, label):
    """Convert successively to a product binomial basis and invert exactly."""
    current = {(): sp.expand(expression)}
    degree_profile = []
    for variable in variables:
        next_current = {}
        local_degrees = set()
        for prefix, value in current.items():
            degree = sp.Poly(value, variable).degree()
            local_degrees.add(degree)
            evaluations = [sp.expand(value.subs(variable, integer)) for integer in range(degree + 1)]
            coefficients = []
            while evaluations:
                coefficients.append(sp.factor(evaluations[0]))
                evaluations = [
                    sp.expand(evaluations[index + 1] - evaluations[index])
                    for index in range(len(evaluations) - 1)
                ]
            for index, coefficient in enumerate(coefficients):
                if coefficient != 0:
                    next_current[prefix + (index,)] = coefficient
        assert len(local_degrees) == 1
        degree_profile.append(next(iter(local_degrees)))
        current = next_current

    assert all(not (set(variables) & coefficient.free_symbols) for coefficient in current.values())
    assert all(coefficient.is_integer is True for coefficient in current.values())
    assert all(coefficient >= 0 for coefficient in current.values())
    reconstruction = sp.Integer(0)
    records = []
    for index, coefficient in sorted(current.items()):
        term = coefficient
        for variable, rank in zip(variables, index):
            term *= choose_polynomial(variable, rank)
        reconstruction += term
        records.append({"index": list(index), "coefficient": int(coefficient)})
    assert sp.expand(reconstruction - expression) == 0
    positive = [int(coefficient) for coefficient in current.values() if coefficient > 0]
    stream = json.dumps(records, sort_keys=True, separators=(",", ":")).encode()
    return {
        "label": label,
        "variables": [str(variable) for variable in variables],
        "degree_profile": degree_profile,
        "nonzero_coefficients": len(records),
        "minimum_positive_coefficient": min(positive),
        "all_nonnegative": True,
        "exact_inverse": True,
        "ordered_stream_sha256": hashlib.sha256(stream).hexdigest().upper(),
        "records": records,
    }


def unlabeled_forests(order):
    tree_types = []
    for size in range(1, order + 1):
        trees = [nx.empty_graph(1)] if size == 1 else nx.nonisomorphic_trees(size)
        for tree in trees:
            tree_types.append((size, nx.convert_node_labels_to_integers(tree)))

    def extend(remaining, start, chosen):
        if remaining == 0:
            yield nx.disjoint_union_all([tree_types[index][1] for index in chosen])
            return
        for index in range(start, len(tree_types)):
            size = tree_types[index][0]
            if size > remaining:
                break
            yield from extend(remaining - size, index, (*chosen, index))

    yield from extend(order, 0, ())


def has_eligible_unmarked_support(graph, u, v):
    marks = {u, v}
    return any(
        support not in marks
        and leaf not in marks
        and graph.degree(leaf) == 1
        for support in graph.nodes()
        for leaf in graph.neighbors(support)
    )


def classify_terminal(graph, u, v):
    """Fail closed: return exact family parameters or raise on a structural gap."""
    marks = {u, v}
    assert not has_eligible_unmarked_support(graph, u, v)
    components = [set(component) for component in nx.connected_components(graph)]
    nontrivial_unmarked = [
        component for component in components
        if len(component) > 1 and not (component & marks)
    ]
    assert not nontrivial_unmarked
    isolated_outside = sum(len(component) == 1 and not (component & marks) for component in components)
    component_u = next(component for component in components if u in component)
    component_v = next(component for component in components if v in component)

    if component_u != component_v:
        assert all(
            vertex == u or (graph.degree(vertex) == 1 and graph.has_edge(u, vertex))
            for vertex in component_u
        )
        assert all(
            vertex == v or (graph.degree(vertex) == 1 and graph.has_edge(v, vertex))
            for vertex in component_v
        )
        return {
            "family": "disconnected_two_rooted_stars_plus_isolates",
            "a": len(component_u) - 1,
            "b": len(component_v) - 1,
            "t": isolated_outside,
        }

    path = nx.shortest_path(graph, u, v)
    path_set = set(path)
    for vertex in path[1:-1]:
        assert set(graph.neighbors(vertex)) == {path[path.index(vertex) - 1], path[path.index(vertex) + 1]}
    extra_u = set(graph.neighbors(u)) - {path[1]}
    extra_v = set(graph.neighbors(v)) - {path[-2]}
    assert all(graph.degree(vertex) == 1 and vertex not in marks for vertex in extra_u | extra_v)
    assert component_u == path_set | extra_u | extra_v
    return {
        "family": "connected_double_broom_plus_isolates",
        "a": len(extra_u),
        "b": len(extra_v),
        "p": len(path) - 2,
        "t": isolated_outside,
    }


def classification_census():
    by_order = {}
    family_counts = {
        "connected_double_broom_plus_isolates": 0,
        "disconnected_two_rooted_stars_plus_isolates": 0,
    }
    total_forests = 0
    total_marked_cells = 0
    terminal_cells = 0
    for order, expected in FOREST_COUNTS.items():
        forests = list(unlabeled_forests(order))
        assert len(forests) == expected
        local_terminal = 0
        for graph in forests:
            for u, v in itertools.combinations(graph.nodes(), 2):
                total_marked_cells += 1
                if has_eligible_unmarked_support(graph, u, v):
                    continue
                record = classify_terminal(graph, u, v)
                family_counts[record["family"]] += 1
                local_terminal += 1
                terminal_cells += 1
        by_order[str(order)] = {
            "forest_types": expected,
            "terminal_marked_cells": local_terminal,
        }
        total_forests += expected
    return {
        "orders": [2, 8],
        "unlabeled_forests": total_forests,
        "all_marked_cells": total_marked_cells,
        "terminal_marked_cells": terminal_cells,
        "family_counts": family_counts,
        "by_order": by_order,
    }


def independence_row(number, edges, removed):
    live = [vertex for vertex in range(number) if vertex not in removed]
    positions = {vertex: index for index, vertex in enumerate(live)}
    edge_masks = [
        (1 << positions[left]) | (1 << positions[right])
        for left, right in edges
        if left in positions and right in positions
    ]
    row = [0] * (len(live) + 1)
    for subset in range(1 << len(live)):
        if all(subset & mask != mask for mask in edge_masks):
            row[subset.bit_count()] += 1
    return row


def disconnected_graph(arm_u, arm_v, isolates):
    u = 0
    v = arm_u + 1
    number = arm_u + arm_v + isolates + 2
    edges = [(u, leaf) for leaf in range(1, arm_u + 1)]
    edges += [(v, leaf) for leaf in range(v + 1, v + arm_v + 1)]
    return number, edges, u, v


def connected_graph(arm_u, arm_v, internal, isolates):
    u = 0
    v = internal + 1
    next_vertex = v + 1
    number = internal + arm_u + arm_v + isolates + 2
    edges = [(vertex, vertex + 1) for vertex in range(v)]
    edges += [(u, leaf) for leaf in range(next_vertex, next_vertex + arm_u)]
    next_vertex += arm_u
    edges += [(v, leaf) for leaf in range(next_vertex, next_vertex + arm_v)]
    return number, edges, u, v


def direct_family_replay(disconnected_expression, connected_small, connected_tail):
    stream = hashlib.sha256()
    checks = 0
    minima = {"disconnected": None, "connected": None}

    def one(number, edges, u, v, analytic_rows, expected, family, parameters):
        nonlocal checks
        rows = tuple(
            independence_row(number, edges, removed)
            for removed in (set(), {u}, {v}, {u, v})
        )
        for rank in range(6):
            assert tuple(at(row, rank) for row in rows) == tuple(
                int(sp.expand(analytic[rank]).subs(parameters)) for analytic in analytic_rows
            )
        value = int(four_minor(rows, 4))
        assert value == int(expected.subs(parameters))
        assert value >= 0
        checks += 1
        stream.update(f"{family},{parameters},{value};".encode())
        cell = {"value": value, **{str(key): int(val) for key, val in parameters.items()}}
        if minima[family] is None or value < minima[family]["value"]:
            minima[family] = cell

    disconnected_analytic = disconnected_rows()
    for arm_u, arm_v, isolates in itertools.product(range(4), repeat=3):
        number, edges, u, v = disconnected_graph(arm_u, arm_v, isolates)
        parameters = {a: arm_u, b: arm_v, t: isolates}
        one(number, edges, u, v, disconnected_analytic, disconnected_expression,
            "disconnected", parameters)

    for arm_u, arm_v, isolates, internal in itertools.product(range(3), range(3), range(3), range(6)):
        number, edges, u, v = connected_graph(arm_u, arm_v, internal, isolates)
        parameters = {a: arm_u, b: arm_v, t: isolates}
        if internal < 4:
            analytic = connected_rows(internal)
            expected = connected_small[internal]
        else:
            analytic = connected_rows(q + 4)
            parameters[q] = internal - 4
            expected = connected_tail
        one(number, edges, u, v, analytic, expected, "connected", parameters)

    return {
        "checks": checks,
        "ranges": {
            "disconnected": "0<=a,b,t<=3",
            "connected": "0<=a,b,t<=2 and 0<=p<=5",
        },
        "minima": minima,
        "value_stream_sha256": stream.hexdigest().upper(),
    }


def main():
    disconnected = sp.factor(four_minor(disconnected_rows(), 4))
    assert sp.expand(disconnected - disconnected.xreplace({a: b, b: a})) == 0
    disconnected_certificate = binomial_certificate(
        disconnected, (a, b, t), "disconnected two rooted stars plus isolates"
    )
    assert disconnected_certificate["nonzero_coefficients"] == 53
    assert disconnected_certificate["minimum_positive_coefficient"] == 4

    connected_small = {
        internal: sp.factor(four_minor(connected_rows(internal), 4))
        for internal in range(4)
    }
    connected_small_certificates = {}
    expected_counts = {0: (53, 2), 1: (55, 4), 2: (56, 2), 3: (56, 24)}
    for internal, expression in connected_small.items():
        assert sp.expand(expression - expression.xreplace({a: b, b: a})) == 0
        certificate = binomial_certificate(
            expression, (a, b, t), f"connected double broom p={internal}"
        )
        assert (certificate["nonzero_coefficients"], certificate["minimum_positive_coefficient"]) == expected_counts[internal]
        connected_small_certificates[str(internal)] = certificate

    connected_tail = sp.factor(four_minor(connected_rows(q + 4), 4))
    assert sp.expand(connected_tail.subs(q, 0) - four_minor(connected_rows(4), 4)) == 0
    assert sp.expand(connected_tail - connected_tail.xreplace({a: b, b: a})) == 0
    connected_tail_certificate = binomial_certificate(
        connected_tail, (a, b, t, q), "connected double broom p=q+4"
    )
    assert connected_tail_certificate["nonzero_coefficients"] == 126
    assert connected_tail_certificate["minimum_positive_coefficient"] == 25

    classification = classification_census()
    replay = direct_family_replay(disconnected, connected_small, connected_tail)

    report = {
        "marker": "PASS_INDEPENDENT_EXACT_ISO_N4_NO_ELIGIBLE_UNMARKED_SUPPORT_TERMINAL_G1_BERNSTEIN",
        "theorem": (
            "For every forest F with distinct marks u,v and no unmarked vertex adjacent "
            "to an unmarked leaf, N4(F;u,v)>=0."
        ),
        "structural_classification": {
            "definition": "eligible support = an unmarked vertex adjacent to an unmarked degree-one vertex",
            "connected": (
                "The unique u-v path contains every non-leaf vertex.  Any off-path branch "
                "ending away from u or v would have an unmarked leaf with unmarked support; "
                "hence only leaves at u,v occur, giving a double broom."
            ),
            "disconnected": (
                "Every nontrivial component must contain a mark.  In a one-mark component, "
                "a farthest vertex at distance at least two would create an eligible unmarked "
                "support, so the component is a star rooted at its mark.  All other components "
                "are isolates."
            ),
            "families": [
                "connected double broom with a,b endpoint leaves, p>=0 internal path vertices, and t isolates",
                "disconnected stars K_(1,a),K_(1,b) rooted at u,v, plus t isolates",
            ],
            "exact_atlas_audit": classification,
        },
        "disconnected_two_rooted_stars_plus_isolates": {
            "row_identity": {
                "E": "(1+x)^t[((1+x)^a+x)((1+x)^b+x)]",
                "U": "(1+x)^(a+t)((1+x)^b+x)",
                "V": "(1+x)^(b+t)((1+x)^a+x)",
                "W": "(1+x)^(a+b+t)",
            },
            "expanded_polynomial": str(sp.expand(disconnected)),
            "certificate": disconnected_certificate,
            "submarker": "PASS_EXACT_ISO_N4_DISCONNECTED_TWO_ROOTED_STARS_PLUS_ISOLATES_TERMINAL",
        },
        "connected_double_broom_plus_isolates": {
            "parameter": "p is the number of internal vertices on the u-v path",
            "path_count": "i_j(P_p)=binom(p-j+1,j)",
            "row_identity": {
                "E": "T[AB P_p+x(A+B)P_(p-1)+x^2 P_(p-2)]",
                "U": "TA[B P_p+xP_(p-1)]",
                "V": "TB[A P_p+xP_(p-1)]",
                "W": "TABP_p",
                "notation": "A=(1+x)^a, B=(1+x)^b, T=(1+x)^t, P_-1=1, P_-2=0",
            },
            "small_p_certificates": connected_small_certificates,
            "tail_p_ge_4_certificate": connected_tail_certificate,
            "submarker": "PASS_EXACT_ISO_N4_CONNECTED_DOUBLE_BROOM_PLUS_ISOLATES_TERMINAL",
        },
        "direct_literal_replay": replay,
        "isolate_scope_guard": (
            "The t isolates are included directly in all four independence-polynomial rows. "
            "No universal isolate FML or isolate-monotonicity statement is used."
        ),
        "scope": (
            "Exact rank-four N4 theorem only for the no-eligible-unmarked-support terminal. "
            "It does not prove rank-four FML on nonterminal forests, N5 or higher, the full "
            "Bundle Payment Lemma, or Erdos Problem 993."
        ),
        "source_sha256": sha256(Path(__file__)),
    }
    encoded = json.dumps(report, indent=2, sort_keys=True) + "\n"
    OUTPUT.write_text(encoded, encoding="utf-8")
    print(json.dumps({
        "marker": report["marker"],
        "classification": classification,
        "disconnected_certificate": {
            key: disconnected_certificate[key]
            for key in ("degree_profile", "nonzero_coefficients", "minimum_positive_coefficient", "exact_inverse")
        },
        "connected_small": {
            key: {
                name: value[name]
                for name in ("nonzero_coefficients", "minimum_positive_coefficient", "exact_inverse")
            }
            for key, value in connected_small_certificates.items()
        },
        "connected_tail": {
            key: connected_tail_certificate[key]
            for key in ("degree_profile", "nonzero_coefficients", "minimum_positive_coefficient", "exact_inverse")
        },
        "direct_literal_replay": replay,
        "scope": report["scope"],
    }, indent=2, sort_keys=True))
    print("REPORT_SHA256", sha256(OUTPUT))
    print(report["marker"])


if __name__ == "__main__":
    main()
