#!/usr/bin/env python3
"""Independent exact audit of the terminal marked-forest N6 theorem.

The terminal-family exhaustion is proved directly from the absence of an edge
joining an unmarked support to an unmarked leaf.  The N6 four-minor algebra is
then rebuilt for the two resulting families: two rooted stars, or a connected
double broom, with arbitrary unmarked isolates.  Newton-basis positivity covers
all arm/isolate parameters for path orders 2..16, and a positive symbolic power
basis covers every path order at least 17.  Finite graph checks are supplementary.
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
SOURCE = Path(__file__).resolve()
PRODUCER_SOURCE = HERE / "prove_iso_n6_terminal_brooms_isolates_g1_nonadjacent.py"
PRODUCER_REPORT = HERE / "iso_n6_terminal_brooms_isolates_exact_g1_nonadjacent_20260830.json"
OUTPUT = HERE / (
    "iso_n6_terminal_brooms_isolates_independent_audit_exact_rank5_g2_alt_20260830.json"
)
MARKER = "PASS_INDEPENDENT_EXACT_ISO_N6_TERMINAL_BROOMS_ISOLATES_RANK5_G2_ALT"
EXPECTED_SOURCE = "2A925AF880B63389AA7F0BC4EAB16E9A49BFC589F6510D2A8527ED7C62028CC1"
EXPECTED_REPORT = "FAB36BAAB45E5F33DC629C8EE3235CD1E2CC300CC1FD38942A0C9CF522BD6958"
MAXIMUM = 7
DEGREE = 9


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def at(row, index):
    return row[index] if 0 <= index < len(row) else 0


def row_sum(*rows):
    return tuple(sp.expand(sum(at(row, k) for row in rows))
                 for k in range(MAXIMUM + 1))


def row_shift(row, amount=1):
    return tuple(at(row, k - amount) for k in range(MAXIMUM + 1))


def row_product(left, right):
    return tuple(
        sp.expand(sum(at(left, j) * at(right, k - j) for j in range(k + 1)))
        for k in range(MAXIMUM + 1)
    )


def falling_choose(value, rank):
    numerator = sp.Integer(1)
    for offset in range(rank):
        numerator *= value - offset
    return sp.expand(numerator / factorial(rank))


def isolate_row(number):
    if isinstance(number, int):
        return tuple(comb(number, k) if k <= number else 0
                     for k in range(MAXIMUM + 1))
    return tuple(falling_choose(number, k) for k in range(MAXIMUM + 1))


def path_count(order, rank):
    if rank < 0:
        return 0
    if order == -2:
        return 0
    if order == -1:
        return int(rank == 0)
    assert order >= 0
    top = order - rank + 1
    return comb(top, rank) if top >= rank else 0


def literal_path_row(order):
    return tuple(path_count(order, rank) for rank in range(MAXIMUM + 1))


def polynomial_path_row(order):
    return tuple(falling_choose(order - rank + 1, rank)
                 for rank in range(MAXIMUM + 1))


def n6(rows):
    e, u, v, w = rows
    r = 6
    return sp.expand(
        2*r*at(e,r)*at(w,r-2) - (r+1)*at(e,r+1)*at(w,r-3)
        + at(e,r-1)*(2*at(w,r-3)-(r+1)*at(w,r-1))
        + at(u,r)*(-(r+1)*at(v,r-2)-at(w,r-3))
        + at(u,r-1)*(2*r*at(v,r-1)+2*at(w,r-2))
        + at(u,r-2)*(-(r+1)*at(v,r)+2*at(v,r-2)-at(w,r-1))
        - at(v,r)*at(w,r-3) + 2*at(v,r-1)*at(w,r-2)
        - at(v,r-2)*at(w,r-1)
    )


def rows_two_stars(a, b, isolates):
    ar, br, tr = isolate_row(a), isolate_row(b), isolate_row(isolates)
    one = (1,) + (0,) * MAXIMUM
    star_a = row_sum(ar, row_shift(one))
    star_b = row_sum(br, row_shift(one))
    return (
        row_product(tr, row_product(star_a, star_b)),
        row_product(tr, row_product(ar, star_b)),
        row_product(tr, row_product(star_a, br)),
        row_product(tr, row_product(ar, br)),
    )


def rows_double_broom(path_order, a, b, isolates, polynomial_path=False):
    path = polynomial_path_row if polynomial_path else literal_path_row
    internal = path_order - 2
    ar, br, tr = isolate_row(a), isolate_row(b), isolate_row(isolates)
    arms = row_product(ar, br)
    p0, p1, p2 = path(internal), path(internal - 1), path(internal - 2)
    e = row_sum(
        row_product(arms, p0),
        row_shift(row_product(ar, p1)),
        row_shift(row_product(br, p1)),
        row_shift(p2, 2),
    )
    minus_u = row_product(ar, row_sum(row_product(br, p0), row_shift(p1)))
    minus_v = row_product(br, row_sum(row_product(ar, p0), row_shift(p1)))
    minus_both = row_product(arms, p0)
    return tuple(row_product(tr, row) for row in (e, minus_u, minus_v, minus_both))


def difference_3d(value, i, j, k):
    return sum(
        (-1) ** ((i-aa)+(j-bb)+(k-tt))
        * comb(i, aa) * comb(j, bb) * comb(k, tt) * value(aa, bb, tt)
        for aa in range(i + 1)
        for bb in range(j + 1)
        for tt in range(k + 1)
    )


def newton_records(value):
    return [
        (i, j, k, int(difference_3d(value, i, j, k)))
        for i in range(DEGREE + 1)
        for j in range(DEGREE + 1 - i)
        for k in range(DEGREE + 1 - i - j)
    ]


def reconstruct(records, variables):
    a, b, t = variables
    return sp.expand(sum(
        coefficient * falling_choose(a, i) * falling_choose(b, j) * falling_choose(t, k)
        for i, j, k, coefficient in records
    ))


def summarize(records):
    values = [record[-1] for record in records]
    positive = [value for value in values if value > 0]
    return {
        "coefficients": len(records),
        "negative": sum(value < 0 for value in values),
        "zero": sum(value == 0 for value in values),
        "minimum": min(values),
        "minimum_positive": min(positive),
        "ordered_stream_sha256": hashlib.sha256(
            json.dumps(records, separators=(",", ":")).encode()
        ).hexdigest().upper(),
    }


def literal_rows(number_of_vertices, edges, u, v):
    answer = []
    for deleted in (set(), {u}, {v}, {u, v}):
        row = [0] * (MAXIMUM + 1)
        available = [x for x in range(number_of_vertices) if x not in deleted]
        for rank in range(MAXIMUM + 1):
            for chosen in itertools.combinations(available, rank):
                if not any((min(x,y), max(x,y)) in edges
                           for x, y in itertools.combinations(chosen, 2)):
                    row[rank] += 1
        answer.append(tuple(row))
    return tuple(answer)


def literal_two_stars(a, b, isolates):
    u, v, cursor = 0, 1, 2
    edges = set()
    for _ in range(a):
        edges.add((u, cursor)); cursor += 1
    for _ in range(b):
        edges.add((v, cursor)); cursor += 1
    cursor += isolates
    return cursor, edges, u, v


def literal_double_broom(path_order, a, b, isolates):
    u, v, cursor = 0, path_order - 1, path_order
    edges = {(x, x+1) for x in range(path_order - 1)}
    for _ in range(a):
        edges.add((u, cursor)); cursor += 1
    for _ in range(b):
        edges.add((v, cursor)); cursor += 1
    cursor += isolates
    return cursor, edges, u, v


def has_unmarked_support_leaf(graph, u, v):
    marks = {u, v}
    return any(
        leaf not in marks and graph.degree(leaf) == 1
        and next(iter(graph.neighbors(leaf))) not in marks
        for leaf in graph
    )


def terminal_family(graph, u, v):
    marks = {u, v}
    same = nx.node_connected_component(graph, u) == nx.node_connected_component(graph, v)
    for component in nx.connected_components(graph):
        component_marks = component & marks
        if not component_marks:
            if len(component) != 1:
                return None
        elif len(component_marks) == 1:
            mark = next(iter(component_marks))
            if not all(graph.degree(x) == 1 and graph.has_edge(x, mark)
                       for x in component - {mark}):
                return None
        else:
            spine = set(nx.shortest_path(graph, u, v))
            if not all(
                graph.degree(x) == 1
                and (graph.has_edge(x, u) or graph.has_edge(x, v))
                for x in component - spine
            ):
                return None
    return "connected_double_broom" if same else "disconnected_two_rooted_stars"


def classification_replay():
    cells = terminal_cells = 0
    class_counts = {"connected_double_broom": 0, "disconnected_two_rooted_stars": 0}
    for graph0 in nx.graph_atlas_g():
        if not (2 <= len(graph0) <= 7 and nx.is_forest(graph0)):
            continue
        graph = nx.convert_node_labels_to_integers(graph0)
        for u, v in itertools.combinations(tuple(graph), 2):
            cells += 1
            terminal = not has_unmarked_support_leaf(graph, u, v)
            family = terminal_family(graph, u, v)
            assert terminal == (family is not None)
            if terminal:
                terminal_cells += 1
                class_counts[family] += 1
    assert cells == 1224
    return {
        "atlas_orders": [2, 7],
        "unordered_marked_forest_cells": cells,
        "terminal_cells": terminal_cells,
        "terminal_class_counts": class_counts,
        "equivalence_failures": 0,
        "role": "supplementary replay of the independently proved family-exhaustion lemmas",
    }


def main():
    assert sha256(PRODUCER_SOURCE) == EXPECTED_SOURCE
    assert sha256(PRODUCER_REPORT) == EXPECTED_REPORT
    producer = json.loads(PRODUCER_REPORT.read_text(encoding="utf-8"))
    assert producer["marker"] == "PASS_EXACT_ISO_N6_TERMINAL_BROOMS_ISOLATES_G1_NONADJACENT"

    a, b, t = sp.symbols("a b t", integer=True, nonnegative=True)
    disconnected_expression = sp.expand(n6(rows_two_stars(a, b, t)))
    assert sp.Poly(disconnected_expression, a, b, t).total_degree() == DEGREE
    disconnected_records = newton_records(
        lambda aa, bb, tt: n6(rows_two_stars(aa, bb, tt))
    )
    disconnected_summary = summarize(disconnected_records)
    assert disconnected_summary["negative"] == 0
    assert disconnected_summary["coefficients"] == 220
    assert sp.expand(reconstruct(disconnected_records, (a,b,t)) - disconnected_expression) == 0
    assert disconnected_summary == producer["disconnected_two_rooted_stars"]["Newton_basis"]

    finite = {}
    finite_stream = []
    for order in range(2, 17):
        expression = sp.expand(n6(rows_double_broom(order, a, b, t)))
        assert sp.Poly(expression, a, b, t).total_degree() <= DEGREE
        records = newton_records(
            lambda aa, bb, tt, order=order: n6(rows_double_broom(order, aa, bb, tt))
        )
        summary = summarize(records)
        assert summary["coefficients"] == 220 and summary["negative"] == 0
        assert sp.expand(reconstruct(records, (a,b,t)) - expression) == 0
        assert summary == producer["connected_double_brooms"]["finite_Newton_basis"][str(order)]
        finite[str(order)] = summary
        finite_stream.extend((order, *record) for record in records)
    finite_sha = hashlib.sha256(
        json.dumps(finite_stream, separators=(",", ":")).encode()
    ).hexdigest().upper()
    assert finite_sha == producer["connected_double_brooms"]["finite_ordered_stream_sha256"]

    path_order, h = sp.symbols("path_order h", integer=True, nonnegative=True)
    tail_general = sp.expand(n6(rows_double_broom(
        path_order, a, b, t, polynomial_path=True
    )))
    tail = sp.expand(tail_general.subs(path_order, h + 17))
    tail_polynomial = sp.Poly(tail, h, a, b, t)
    terms = tail_polynomial.terms()
    coefficients = tail_polynomial.coeffs()
    assert tail_polynomial.total_degree() == DEGREE
    assert len(terms) == 715
    assert all(value > 0 for value in coefficients)
    assert min(coefficients) == sp.Rational(13, 8640)
    tail_stream = [(list(powers), str(value)) for powers, value in terms]
    tail_sha = hashlib.sha256(
        json.dumps(tail_stream, separators=(",", ":")).encode()
    ).hexdigest().upper()
    assert tail_sha == producer["connected_double_brooms"]["symbolic_tail"]["ordered_power_stream_sha256"]

    literal_checks = 0
    for aa, bb, tt in itertools.product(range(3), repeat=3):
        graph = literal_two_stars(aa, bb, tt)
        literal = literal_rows(*graph)
        formula = rows_two_stars(aa, bb, tt)
        assert literal == formula and n6(literal) == n6(formula)
        literal_checks += 1
    for order in range(2, 8):
        for aa, bb, tt in itertools.product(range(3), repeat=3):
            graph = literal_double_broom(order, aa, bb, tt)
            literal = literal_rows(*graph)
            formula = rows_double_broom(order, aa, bb, tt)
            assert literal == formula and n6(literal) == n6(formula)
            literal_checks += 1
    assert literal_checks == 189

    classifier = classification_replay()
    exhaustion_proof = {
        "unmarked_components": (
            "Any unmarked tree component with at least two vertices has an "
            "unmarked leaf whose unique neighbour is unmarked, hence an eligible "
            "support. Therefore every terminal unmarked component is an isolate."
        ),
        "one_mark_component": (
            "If a one-mark tree has a vertex at distance at least two from its "
            "mark, choose a farthest vertex. It is an unmarked leaf with an "
            "unmarked neighbour. Hence every other vertex is a leaf adjacent "
            "directly to the mark: a rooted star."
        ),
        "two_mark_component": (
            "Use the unique u-v path. A branch off an internal path vertex either "
            "is a leaf adjacent to an unmarked support or contains a farthest leaf "
            "with unmarked parent. A branch at a marked endpoint of length at least "
            "two has the same obstruction. Thus the only off-path vertices are "
            "leaves adjacent to u or v: a double broom."
        ),
        "converse": (
            "In two rooted stars or a double broom, every unmarked graph leaf is "
            "adjacent to a mark, while unmarked isolates have no neighbour. Hence "
            "there is no eligible unmarked support-leaf edge."
        ),
    }

    report = {
        "marker": MARKER,
        "theorem_audited": producer["theorem"],
        "independent_terminal_family_exhaustion": {
            "proof": exhaustion_proof,
            "atlas_replay": classifier,
        },
        "independent_N6_algebra": {
            "maximum_independence_coefficient": MAXIMUM,
            "disconnected_Newton_basis": disconnected_summary,
            "finite_connected_path_orders": [2,16],
            "finite_Newton_coefficients": len(finite_stream),
            "finite_ordered_stream_sha256": finite_sha,
            "tail_path_orders": ">=17",
            "tail_shift": "h=path_order-17>=0",
            "tail_power_monomials": len(terms),
            "tail_minimum_scalar_coefficient": str(min(coefficients)),
            "tail_ordered_power_stream_sha256": tail_sha,
            "literal_four_minor_row_replays": literal_checks,
        },
        "all_order_positivity_logic": (
            "For the disconnected family and each fixed path order 2..16, all "
            "three-variable Newton coefficients are nonnegative, so the exact "
            "reconstructions are nonnegative for all integer arm and isolate "
            "parameters. For path order >=17, every scalar coefficient in the "
            "ordinary power basis in h,a,b,t is positive. The path formula is "
            "combinatorial through rank seven because the smallest used path "
            "has order path_order-4>=13=2*7-1."
        ),
        "coverage": {
            "disconnected": "all arm_u,arm_v,isolates>=0",
            "connected_finite": "all path orders 2..16 and all arm/isolate parameters",
            "connected_tail": "all path orders >=17 and all arm/isolate parameters",
            "terminal_families_exhausted": True,
            "no_gap": True,
        },
        "dependencies_sha256": {
            PRODUCER_SOURCE.name: EXPECTED_SOURCE,
            PRODUCER_REPORT.name: EXPECTED_REPORT,
        },
        "scope_guard": (
            "Exact all-order terminal marked N6 theorem only. It does not prove "
            "nonterminal bundle coefficients, the all-N6 assembly, N7, or Erdos "
            "Problem 993. Finite replays are supplementary."
        ),
        "source_sha256": sha256(SOURCE),
    }
    encoded = json.dumps(report, indent=2, sort_keys=True) + "\n"
    OUTPUT.write_text(encoded, encoding="utf-8", newline="\n")
    print(json.dumps({
        "marker": MARKER,
        "terminal_atlas_cells": classifier["terminal_cells"],
        "disconnected_newton_coefficients": disconnected_summary["coefficients"],
        "finite_connected_newton_coefficients": len(finite_stream),
        "tail_power_monomials": len(terms),
        "literal_row_replays": literal_checks,
        "source_sha256": report["source_sha256"],
        "report_sha256": hashlib.sha256(encoded.encode()).hexdigest().upper(),
    }, indent=2, sort_keys=True))
    print(MARKER)


if __name__ == "__main__":
    main()
