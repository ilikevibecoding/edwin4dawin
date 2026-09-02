#!/usr/bin/env python3
"""Exact replay for the rank-4/5/6 cross-orientation stopping payment.

For a forest B with distinct marked vertices u,v, put

    U=I(B-u), V=I(B-v), W=I(B-{u,v}), P=U+xW.

The candidate coupled payment is C_k=Q_k(P)+D_k(V,W).  This replay
checks the exact reserve split, the scalar proof of its residual for
k=4,5,6, every finite exception to the three-halves inputs, and every
small marked forest needed by the proof.  It also records the exact
k=7 obstruction to this particular relaxed scalar argument; that
obstruction is not a forest counterexample.
"""

from __future__ import annotations

import hashlib
import itertools
import json
from fractions import Fraction

import networkx as nx
import sympy as sp

from probe_iso_leaf_cross_remainder_root import add, graph6, iso, poly_forest
from search_iso_cross_orientation_coupling_agent import leaf_d, reserve, shift


KNOWN_FOREST_COUNTS = {
    0: 1,
    1: 1,
    2: 2,
    3: 3,
    4: 6,
    5: 10,
    6: 20,
    7: 37,
    8: 76,
    9: 153,
    10: 329,
    11: 710,
    12: 1601,
}


def forest_graphs(max_order: int) -> dict[int, list[nx.Graph]]:
    """Generate each unlabeled forest once as a multiset of tree types."""
    tree_types: list[tuple[int, nx.Graph]] = []
    for order in range(1, max_order + 1):
        if order == 1:
            trees = [nx.empty_graph(1)]
        else:
            trees = list(nx.nonisomorphic_trees(order))
        for tree in trees:
            tree_types.append((order, nx.convert_node_labels_to_integers(tree)))

    answer: dict[int, list[nx.Graph]] = {0: [nx.Graph()]}
    for target in range(1, max_order + 1):
        rows: list[nx.Graph] = []

        def visit(remaining: int, start: int, chosen: list[int]) -> None:
            if remaining == 0:
                components = [tree_types[index][1] for index in chosen]
                rows.append(nx.disjoint_union_all(components))
                return
            for index in range(start, len(tree_types)):
                size = tree_types[index][0]
                if size > remaining:
                    continue
                visit(remaining - size, index, [*chosen, index])

        visit(target, 0, [])
        answer[target] = rows
        assert len(rows) == KNOWN_FOREST_COUNTS[target]
    return answer


def symbolic_replay() -> dict[str, object]:
    k = sp.symbols("k", integer=True, positive=True)
    a, b, c, d, e, f, g = sp.symbols("a b c d e f g", nonnegative=True)
    j, ell = sp.symbols("j ell", nonnegative=True)
    t0 = (
        2 * a**2
        + 9 * a * b
        - a * c
        - 2 * (k + 1) * a * d
        + 4 * a * e
        - 2 * (k + 1) * a * g
        + 5 * b**2
        + (2 * k - 1) * b * c
        + 4 * k * b * f
        - 2 * (k + 1) * c * e
    )
    reserve_left = 2 * (k - 1) * b**2 - a * b - 2 * k * a * c
    reserve_right = 2 * k * c**2 - b * c - 2 * (k + 1) * b * d
    remainder = sp.expand(b * t0 - a * reserve_right - c * reserve_left)
    expected = sp.expand(
        b
        * (
            2 * a**2
            + 9 * a * b
            + a * c
            + 4 * a * e
            - 2 * (k + 1) * a * g
            + 5 * b**2
            + b * c
            + 4 * k * b * f
            - 2 * (k + 1) * c * e
        )
    )
    assert remainder == expected

    # Recover T directly from P_(k-1)=a+b+j, P_k=b+c+ell and
    # V_(k-1)=b+e, V_k=c+f, V_(k+1)=d+g.  This verifies both the
    # reserve split and that every omitted X term is nonnegative.
    p_minus = a + b + j
    p_here = b + c + ell
    d_operator = (
        b**2
        + 2 * k * (c + f) * b
        + 2 * (b + e) * a
        - (k + 1) * (b + e) * c
        - (k + 1) * a * (d + g)
        - a * c
    )
    t_full = sp.expand(2 * p_minus**2 + p_minus * p_here + 2 * d_operator)
    assert sp.expand(t_full.subs({j: 0, ell: 0}) - t0) == 0
    x_payment = sp.Poly(sp.expand(t_full - t0), j, ell, a, b, c)
    assert all(coefficient >= 0 for _, coefficient in x_payment.terms())

    p_plus = sp.symbols("p_plus", nonnegative=True)
    q_operator = k * p_here**2 + p_minus**2 - (k + 1) * p_minus * p_plus
    s_operator = 2 * k * p_here**2 - p_minus * p_here - 2 * (k + 1) * p_minus * p_plus
    assert sp.expand(2 * (q_operator + d_operator) - s_operator - t_full) == 0

    r = sp.symbols("r", nonnegative=True)
    pa = 12 * k * r**3 + (20 * k + 1) * r**2 + (-4 * k**2 + 12 * k + 1) * r + 2 * k - 2
    pb = 4 * k * r**3 + (20 * k + 1) * r**2 + (-4 * k**2 + 12 * k + 1) * r + 2 * k - 2
    positivity: dict[int, dict[str, object]] = {}
    for rank in (4, 5):
        rank_rows: dict[str, object] = {}
        for name, polynomial in (("A", pa), ("B", pb)):
            value = sp.Poly(sp.expand(polynomial.subs(k, rank)), r)
            coefficients = [int(item) for item in value.all_coeffs()]
            # The cubic term is positive, and the quadratic tail has
            # negative discriminant and positive leading coefficient.
            quadratic = sp.Poly(value.as_expr() - value.LC() * r**3, r)
            discriminant = int(sp.discriminant(quadratic.as_expr(), r))
            assert discriminant < 0 and quadratic.LC() > 0 and value.LC() > 0
            rank_rows[name] = {
                "coefficients": coefficients,
                "quadratic_tail_discriminant": discriminant,
            }
        positivity[rank] = rank_rows

    # At k=6 the quadratic tail changes sign.  Each full cubic has
    # negative discriminant, hence one real root; p(0)>0 and the positive
    # leading coefficient force that sole root to be negative.
    rank_rows = {}
    for name, polynomial in (("A", pa), ("B", pb)):
        value = sp.Poly(sp.expand(polynomial.subs(k, 6)), r)
        discriminant = int(sp.discriminant(value.as_expr(), r))
        assert discriminant < 0 and value.eval(0) > 0 and value.LC() > 0
        rank_rows[name] = {
            "coefficients": [int(item) for item in value.all_coeffs()],
            "cubic_discriminant": discriminant,
        }
    positivity[6] = rank_rows

    # Exact feasible point of the relaxed coefficient cone where T0<0.
    # It obeys both W reserves and the Y reserve, but need not be realized
    # by independence polynomials of actual forests.
    rank = 7
    av = Fraction(1, 3)
    bv = Fraction(1)
    cv = Fraction(5, 2)
    dv = Fraction(85, 16)
    ev = Fraction(1, 3)
    fv = Fraction(0)
    gv = Fraction(0)
    t0_value = (
        2 * av**2
        + 9 * av * bv
        - av * cv
        - 2 * (rank + 1) * av * dv
        + 4 * av * ev
        - 2 * (rank + 1) * av * gv
        + 5 * bv**2
        + (2 * rank - 1) * bv * cv
        + 4 * rank * bv * fv
        - 2 * (rank + 1) * cv * ev
    )
    reserve_a = 2 * (rank - 1) * bv**2 - av * bv - 2 * rank * av * cv
    reserve_b = 2 * rank * cv**2 - bv * cv - 2 * (rank + 1) * bv * dv
    reserve_y = 2 * (rank - 1) * fv**2 - ev * fv - 2 * rank * ev * gv
    assert reserve_a == reserve_b == reserve_y == 0
    assert t0_value == Fraction(-4, 3)

    return {
        "reserve_split": "2C_k=S_k(P)+T_k",
        "T_definition": "T_k=2P_(k-1)^2+P_(k-1)P_k+2D_k(V,W)",
        "X_payment": str(sp.expand(t_full - t0)),
        "residual_identity": str(sp.factor(remainder)),
        "endpoint_positivity": positivity,
        "rank7_relaxed_cone_obstruction": {
            "a_b_c_d_e_f_g": [
                str(value) for value in (av, bv, cv, dv, ev, fv, gv)
            ],
            "W_reserves": [str(reserve_a), str(reserve_b)],
            "Y_reserve": str(reserve_y),
            "T0": str(t0_value),
            "scope": "not asserted forest-realizable",
        },
    }


def marked_coupling(graph: nx.Graph, rank: int, u: int, v: int) -> tuple[int, dict]:
    def deleted_polynomial(nodes: tuple[int, ...]) -> list[int]:
        reduced = graph.copy()
        reduced.remove_nodes_from(nodes)
        return poly_forest(reduced)

    u_row = deleted_polynomial((u,))
    v_row = deleted_polynomial((v,))
    w_row = deleted_polynomial((u, v))
    p_row = add(u_row, shift(w_row))
    q = iso(p_row, rank)
    d = leaf_d(v_row, w_row, rank)
    return q + d, {
        "order": len(graph),
        "graph6": graph6(graph),
        "u": u,
        "v": v,
        "P": p_row,
        "W": w_row,
        "Q": q,
        "D": d,
    }


def direct_small_marked_audit(
    forests: dict[int, list[nx.Graph]],
) -> dict[int, dict[str, object]]:
    # These are exactly the small P ranges not supplied by the global
    # rank-k reserve: S4 has only order-7 exceptions, S5 is good from
    # order 10, and S6 is good from order 13.
    order_ranges = {4: (7,), 5: tuple(range(2, 10)), 6: tuple(range(2, 13))}
    report: dict[int, dict[str, object]] = {}
    for rank, orders in order_ranges.items():
        checks = 0
        minimum: int | None = None
        witness: dict | None = None
        for order in orders:
            for graph in forests[order]:
                for u in graph:
                    for v in graph:
                        if u == v:
                            continue
                        value, row = marked_coupling(graph, rank, u, v)
                        assert value >= 0
                        checks += 1
                        if minimum is None or value < minimum:
                            minimum, witness = value, row
        report[rank] = {
            "orders": list(orders),
            "checks": checks,
            "minimum": minimum,
            "minimum_witness": witness,
        }
    return report


def root_sets(graph: nx.Graph):
    choices = [[None, *sorted(component)] for component in nx.connected_components(graph)]
    for selected in itertools.product(*choices):
        yield tuple(vertex for vertex in selected if vertex is not None)


def t0_value(w: list[int], y: list[int], rank: int) -> int:
    coeff = lambda row, index: row[index] if 0 <= index < len(row) else 0
    a, b, c, d = (coeff(w, index) for index in range(rank - 2, rank + 2))
    e, f, g = (coeff(y, index) for index in range(rank - 2, rank + 1))
    return (
        2 * a**2
        + 9 * a * b
        - a * c
        - 2 * (rank + 1) * a * d
        + 4 * a * e
        - 2 * (rank + 1) * a * g
        + 5 * b**2
        + (2 * rank - 1) * b * c
        + 4 * rank * b * f
        - 2 * (rank + 1) * c * e
    )


def bad_w_audit(
    forests: dict[int, list[nx.Graph]],
) -> dict[int, dict[str, object]]:
    # Once P is beyond its direct finite range, W can violate a reserve
    # only in these orders.  S4: order 7.  S5: orders 8,9.  For k=6,
    # B has order at least 13, so W has order at least 11; only orders
    # 11,12 can violate S6.
    order_ranges = {4: (7,), 5: (8, 9), 6: (11, 12)}
    report: dict[int, dict[str, object]] = {}
    for rank, orders in order_ranges.items():
        checks = 0
        bad_graphs = 0
        minimum: int | None = None
        witness: dict | None = None
        for order in orders:
            for graph in forests[order]:
                w = poly_forest(graph)
                previous_bad = reserve(w, rank - 1) < 0
                current_bad = reserve(w, rank) < 0
                if not (previous_bad or current_bad):
                    continue
                bad_graphs += 1
                for roots in root_sets(graph):
                    reduced = graph.copy()
                    reduced.remove_nodes_from(roots)
                    y = poly_forest(reduced)
                    value = t0_value(w, y, rank)
                    assert value >= 0
                    checks += 1
                    if minimum is None or value < minimum:
                        minimum = value
                        witness = {
                            "order": order,
                            "graph6": graph6(graph),
                            "roots": roots,
                            "W": w,
                            "Y": y,
                            "previous_reserve": reserve(w, rank - 1),
                            "current_reserve": reserve(w, rank),
                            "T0": value,
                        }
        report[rank] = {
            "orders": list(orders),
            "bad_graphs": bad_graphs,
            "root_set_checks": checks,
            "minimum": minimum,
            "minimum_witness": witness,
        }
    return report


def reserve_exception_classification(
    forests: dict[int, list[nx.Graph]],
) -> dict[int, dict[str, object]]:
    report: dict[int, dict[str, object]] = {}
    for rank, upper in ((4, 12), (5, 9), (6, 12)):
        rows: set[tuple[int, ...]] = set()
        for order in range(1, upper + 1):
            for graph in forests[order]:
                polynomial = tuple(poly_forest(graph))
                if reserve(list(polynomial), rank) < 0:
                    rows.add(polynomial)
        expected_counts = {4: 2, 5: 7, 6: 28}
        assert len(rows) == expected_counts[rank]
        if rank in (4, 5):
            # This is the only property needed to repair a bad reserve
            # on Y: its next coefficient g=y_k vanishes.
            assert all(len(row) <= rank + 1 for row in rows)
        report[rank] = {
            "negative_polynomial_count": len(rows),
            "negative_polynomials": [list(row) for row in sorted(rows)],
            "all_have_next_coefficient_zero": all(len(row) <= rank + 1 for row in rows),
        }
    return report


def main() -> None:
    symbolic = symbolic_replay()
    forests = forest_graphs(12)
    direct = direct_small_marked_audit(forests)
    exceptions = reserve_exception_classification(forests)
    bad_w = bad_w_audit(forests)
    report = {
        "marker": "PASS_EXACT_CROSS_ORIENTATION_COUPLING_R4_R6",
        "theorem": "C_k=Q_k(U+xW)+D_k(V,W)>=0 for every marked forest and k=4,5,6",
        "forest_counts": {order: len(rows) for order, rows in forests.items()},
        "symbolic": symbolic,
        "direct_small_marked": direct,
        "reserve_exceptions": exceptions,
        "bad_W_root_sets": bad_w,
        "scope": (
            "Uses the proved global forest reserves S3, S4 classification, "
            "S5 from order 10, and S6 from order 13.  The k=7 row only "
            "obstructs this relaxed scalar proof and is not a graph counterexample."
        ),
    }
    raw = json.dumps(report, indent=2, sort_keys=True) + "\n"
    print(raw, end="")
    print("REPORT_SHA256", hashlib.sha256(raw.encode()).hexdigest().upper())
    print(report["marker"])


if __name__ == "__main__":
    main()
