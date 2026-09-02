#!/usr/bin/env python3
"""Exact all-order theorem for the quadratic singleton-g2 increment Q.

For a four-row marked forest configuration E=(E,U,V,W), define

    Q(E) = [t^2] ( g2(t*x*E,0) ).

Equivalently, Q is the quadratic-in-E part of the singleton root-deletion
increment g2(D+xE,D)-g2(D,D).  Marks are allowed to be absent from the
forest; this is needed when the deleted parent is adjacent to one or both
marks.  Exact inclusion-exclusion and elementary forest bounds prove Q>=0
in all three survival cases (two, one, or zero surviving marks).

This theorem closes Q only.  The mixed increment L(D,E), singleton-ordinary
g2, the other canonical g2 modes, all N5, and Erdos Problem 993 remain
separate.
"""

from __future__ import annotations

import hashlib
import itertools
import json
from math import factorial
from pathlib import Path

import networkx as nx
import sympy as sp

from derive_iso_n5_bundle_g2_compact_polar_split_rank5_g2_alt import raw_g2
from derive_iso_n5_bundle_g12_canonical_configuration_g1_bernstein import four_rows


HERE = Path(__file__).resolve().parent
OUTPUT = HERE / "iso_n5_g2_singleton_q_all_marked_forest_exact_rank5_g2_alt_20260830.json"
MARKER = "PASS_EXACT_ISO_N5_G2_SINGLETON_Q_ALL_MARKED_FOREST_RANK5_G2_ALT"

DEPENDENCIES = {
    "derive_iso_n5_bundle_g2_compact_polar_split_rank5_g2_alt.py":
        "D4FD797FE25F095BCCE8326B022F0735BB24612F8EF7AE8BCE72930F0F887C94",
    "derive_iso_n5_bundle_g12_canonical_configuration_g1_bernstein.py":
        "9DDDB5A367BE06872D44615781CE32A069C8623FCB99C8965A845C1BCF873058",
}


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def at(row, rank):
    return row[rank] if 0 <= rank < len(row) else sp.Integer(0)


def choose(value, rank):
    if rank < 0:
        return sp.Integer(0)
    return sp.expand(
        sp.prod(value - offset for offset in range(rank)) / sp.Integer(factorial(rank))
    )


def i2(order, edges):
    return sp.expand(choose(order, 2) - edges)


def i3(order, edges, wedges):
    return sp.expand(choose(order, 3) - edges * (order - 2) + wedges)


def i4(order, edges, wedges, connected3):
    return sp.expand(
        choose(order, 4) - edges * choose(order - 2, 2)
        + wedges * (order - 4) + choose(edges, 2) - connected3
    )


def shifted_q_expression():
    rows = tuple(tuple(sp.symbols(f"e{name}0:7")) for name in "EUVW")
    shifted = tuple((sp.Integer(0), *row[:-1]) for row in rows)
    zero = tuple((sp.Integer(0),) * 7 for _ in range(4))
    expression = sp.expand(raw_g2(shifted, zero))
    assert len(sp.Poly(expression, *sorted(expression.free_symbols, key=str)).terms()) == 34
    return rows, expression


def occupation_certificate(rows, expression):
    a = tuple(sp.symbols("a0:7"))
    b = tuple(sp.symbols("b0:7"))
    c = tuple(sp.symbols("c0:7"))
    d = tuple(sp.symbols("d0:7"))
    epsilon = sp.symbols("epsilon")
    occupation = (
        tuple(at(a, rank) + at(b, rank - 1) + at(c, rank - 1)
              + epsilon * at(d, rank - 2) for rank in range(7)),
        tuple(at(a, rank) + at(b, rank - 1) for rank in range(7)),
        tuple(at(a, rank) + at(c, rank - 1) for rank in range(7)),
        a,
    )
    rules = {symbol: value for generic, actual in zip(rows, occupation)
             for symbol, value in zip(generic, actual)}
    reduced = sp.expand(expression.subs(rules))
    zero_b = {symbol: 0 for symbol in b}
    zero_c = {symbol: 0 for symbol in c}
    zero_d = {symbol: 0 for symbol in d}
    qa = sp.expand(reduced.subs(zero_b | zero_c | zero_d))
    ql_ab = sp.expand(reduced.subs(zero_c | zero_d) - qa)
    ql_ac = sp.expand(reduced.subs(zero_b | zero_d) - qa)
    qk_bc = sp.expand(reduced.subs(zero_d) - qa - ql_ab - ql_ac)
    qk_ad = sp.expand((reduced - reduced.subs({epsilon: 0})) / epsilon)
    assert sp.expand(reduced - qa - ql_ab - ql_ac - qk_bc - epsilon * qk_ad) == 0
    assert sp.expand(ql_ab.xreplace(dict(zip(b, c))) - ql_ac) == 0
    assert sp.expand(qk_bc.xreplace(dict(zip(b + c, c + b))) - qk_bc) == 0
    assert sp.expand(qk_ad - qk_bc.xreplace(dict(zip(b + c, a + d)))) == 0
    return {
        "identity": "Q=Aq(A)+Lq(A,B)+Lq(A,C)+Kq(B,C)+epsilon*Kq(A,D)",
        "Aq": str(sp.factor(qa)),
        "Lq": str(sp.factor(ql_ab)),
        "Kq": str(sp.factor(qk_bc)),
        "expanded_terms": len(sp.Poly(reduced, *sorted(reduced.free_symbols, key=str)).terms()),
    }


def two_survivors_certificate(rows, expression):
    n, edges, du, dv, adjacent = sp.symbols(
        "n edges du dv adjacent", integer=True, nonnegative=True
    )
    wedges, wu, wv, ww = sp.symbols("wedges wu wv ww", nonnegative=True)
    re, ru, rv, rw = sp.symbols("re ru rv rw", nonnegative=True)
    orders = (n, n - 1, n - 1, n - 2)
    edge_rows = (edges, edges - du, edges - dv, edges - du - dv + adjacent)
    wedge_rows = (wedges, wu, wv, ww)
    r_rows = (re, ru, rv, rw)
    actual = tuple(
        (1, order, i2(order, edge), i3(order, edge, wedge),
         i4(order, edge, wedge, r3), 0, 0)
        for order, edge, wedge, r3 in zip(orders, edge_rows, wedge_rows, r_rows)
    )
    rules = {symbol: value for generic, row in zip(rows, actual)
             for symbol, value in zip(generic, row)}
    q = sp.expand(expression.subs(rules))

    xu, xv, common = sp.symbols("xu xv common", nonnegative=True)
    local = {
        wu: wedges - choose(du, 2) - xu,
        wv: wedges - choose(dv, 2) - xv,
        ww: wedges - choose(du, 2) - choose(dv, 2) - xu - xv
            + adjacent * (du + dv - 2) + common,
    }
    q = sp.expand(q.subs(local))
    assert sp.expand(sp.diff(q, re) - 2) == 0
    assert sp.expand(sp.diff(q, ru) - 6) == 0
    assert sp.expand(sp.diff(q, rv) - 6) == 0
    assert sp.expand(sp.diff(q, wedges) - (45 - 16 * n)) == 0
    assert sp.expand(sp.diff(q, xu) - (14 * n - 23)) == 0
    assert sp.expand(sp.diff(q, xv) - (14 * n - 23)) == 0
    assert sp.expand(sp.diff(q, common) + 6 * n + 2) == 0

    # For n>=3: drop positive re,ru,rv,xu,xv; use
    # wedges<=C(edges,2).  The remaining edge polynomial is minimized at
    # edges=n-1.  Marked degree squares are relaxed to their exact real minima.
    degree_sum, degree_difference = sp.symbols("degree_sum degree_difference", real=True)
    degree_part = sp.expand(
        (14 * n - 29) / sp.Integer(2) * (du**2 + dv**2)
        + 8 * du * dv
        + (-16 * n**2 + 52 * n - 11) / sp.Integer(2) * (du + dv)
    )
    degree_rewritten = sp.expand(degree_part.subs({
        du: (degree_sum + degree_difference) / 2,
        dv: (degree_sum - degree_difference) / 2,
    }))
    expected_degree = sp.expand(
        (14 * n - 21) / sp.Integer(4) * degree_sum**2
        + (14 * n - 37) / sp.Integer(4) * degree_difference**2
        + (-16 * n**2 + 52 * n - 11) / sp.Integer(2) * degree_sum
    )
    assert sp.expand(degree_rewritten - expected_degree) == 0
    a = (14 * n - 21) / sp.Integer(4)
    b = (-16 * n**2 + 52 * n - 11) / sp.Integer(2)
    degree_floor = sp.factor(-b**2 / (4 * a))
    assert sp.cancel(
        a * degree_sum**2 + b * degree_sum - degree_floor
        - a * (degree_sum + b / (2 * a))**2
    ) == 0

    edge_bound = sp.expand(
        -(16 * n - 45) * edges * (edges - 1) / 2
        - edges**2 + 3 * edges * n**2 - 38 * edges * n + 35 * edges
    )
    edge_endpoint = sp.factor(edge_bound.subs(edges, n - 1))
    assert sp.expand(
        edge_endpoint + (n - 1) * (10 * n**2 + n + 18) / sp.Integer(2)
    ) == 0
    edge_residual = sp.factor(edge_bound - edge_endpoint)
    assert sp.expand(
        edge_residual
        + (edges - n + 1)
        * (16 * edges * n - 43 * edges + 10 * n**2 + n + 18)
        / sp.Integer(2)
    ) == 0

    base = (7 * n**4 + 92 * n**3 - 205 * n**2 + 106 * n) / 12
    nonadjacent_lower = sp.factor(base + degree_floor + edge_endpoint - (6 * n + 2))
    nonadjacent_expected = (
        98 * n**5 - 467 * n**4 + 2206 * n**3 - 6949 * n**2
        + 6036 * n - 2127
    ) / (84 * (2 * n - 3))
    assert sp.expand(nonadjacent_lower - nonadjacent_expected) == 0
    y = sp.symbols("y", nonnegative=True)
    nonadjacent_numerator = sp.together(nonadjacent_lower).as_numer_denom()[0]
    nonadjacent_shift = sp.expand(nonadjacent_numerator.subs(n, y + 4))
    assert nonadjacent_shift == (
        98 * y**5 + 1493 * y**4 + 10414 * y**3 + 37411 * y**2
        + 62220 * y + 32817
    )

    # Adjacent marks have common=0.  Incorporate the adjacency linear terms
    # before taking the degree real minimum, and use edges<=n-1 for -2*edges.
    adjacent_b = b - (6 * n + 2)
    adjacent_degree_floor = sp.factor(-adjacent_b**2 / (4 * a))
    adjacent_lower = sp.factor(
        base + adjacent_degree_floor + edge_endpoint - 2 * (n - 1)
        + 7 * n**2 - 4 * n - 2
    )
    adjacent_expected = (
        98 * n**5 - 467 * n**4 + 2230 * n**3 - 5785 * n**2
        + 6540 * n - 2943
    ) / (84 * (2 * n - 3))
    assert sp.expand(adjacent_lower - adjacent_expected) == 0
    adjacent_numerator = sp.together(adjacent_lower).as_numer_denom()[0]
    adjacent_shift = sp.expand(adjacent_numerator.subs(n, y + 3))
    assert adjacent_shift == (
        98 * y**5 + 1003 * y**4 + 5446 * y**3 + 15527 * y**2
        + 21294 * y + 10809
    )
    return {
        "local_expression_terms": len(sp.Poly(q, *sorted(q.free_symbols, key=str)).terms()),
        "positive_terms_dropped": ["2*re", "6*ru", "6*rv", "(14*n-23)*(xu+xv)"],
        "wedge_bound": "wedges<=binom(edges,2), coefficient 45-16*n<=0 for n>=3",
        "edge_endpoint": str(edge_endpoint),
        "edge_endpoint_residual": str(edge_residual),
        "degree_real_floor_nonadjacent": str(degree_floor),
        "nonadjacent_common_bound": "common<=1 in a forest",
        "nonadjacent_lower_n_at_least_4": str(nonadjacent_lower),
        "nonadjacent_numerator_shift_n_equals_4_plus_y": str(nonadjacent_shift),
        "adjacent_common": "0 (a common neighbor would form a triangle)",
        "degree_real_floor_adjacent": str(adjacent_degree_floor),
        "adjacent_lower_n_at_least_3": str(adjacent_lower),
        "adjacent_numerator_shift_n_equals_3_plus_y": str(adjacent_shift),
    }


def one_survivor_certificate(rows, expression):
    n, edges, degree = sp.symbols("n edges degree", integer=True, nonnegative=True)
    wedges, x, re, ra = sp.symbols("wedges x re ra", nonnegative=True)
    deleted_wedges = wedges - choose(degree, 2) - x
    full = (
        1, n, i2(n, edges), i3(n, edges, wedges), i4(n, edges, wedges, re), 0, 0
    )
    deleted = (
        1, n - 1, i2(n - 1, edges - degree),
        i3(n - 1, edges - degree, deleted_wedges),
        i4(n - 1, edges - degree, deleted_wedges, ra), 0, 0
    )
    # u absent and v present: (E,U,V,W)=(full,full,deleted,deleted).
    actual = (full, full, deleted, deleted)
    rules = {symbol: value for generic, row in zip(rows, actual)
             for symbol, value in zip(generic, row)}
    q = sp.expand(expression.subs(rules))
    assert sp.expand(sp.diff(q, re) - 8) == 0
    assert sp.expand(sp.diff(q, ra) - 6) == 0
    assert sp.expand(sp.diff(q, wedges) - (45 - 16 * n)) == 0
    assert sp.expand(sp.diff(q, x) - 7 * (2 * n - 3)) == 0

    a = (14 * n - 27) / sp.Integer(2)
    b = (-16 * n**2 + 52 * n - 7) / sp.Integer(2)
    degree_floor = sp.factor(-b**2 / (4 * a))
    degree_symbol = sp.symbols("degree_symbol", real=True)
    assert sp.cancel(
        a * degree_symbol**2 + b * degree_symbol - degree_floor
        - a * (degree_symbol + b / (2 * a))**2
    ) == 0
    edge_bound = sp.expand(
        -(16 * n - 45) * edges * (edges - 1) / 2
        - edges**2 + 3 * edges * n**2 - 36 * edges * n + 24 * edges
    )
    edge_endpoint = sp.factor(edge_bound.subs(edges, n - 1))
    assert sp.expand(
        edge_endpoint
        + (n - 1) * (10 * n**2 - 3 * n + 40) / sp.Integer(2)
    ) == 0
    edge_residual = sp.factor(edge_bound - edge_endpoint)
    assert sp.expand(
        edge_residual
        + (edges - n + 1)
        * (16 * edges * n - 43 * edges + 10 * n**2 - 3 * n + 40)
        / sp.Integer(2)
    ) == 0
    base = (7 * n**4 + 80 * n**3 - 55 * n**2 + 16 * n) / 12
    lower = sp.factor(base + degree_floor + edge_endpoint)
    expected = (
        196 * n**5 - 586 * n**4 + 4556 * n**3 - 16802 * n**2
        + 21972 * n - 13107
    ) / (24 * (14 * n - 27))
    assert sp.expand(lower - expected) == 0
    y = sp.symbols("y", nonnegative=True)
    numerator = sp.together(lower).as_numer_denom()[0]
    shifted = sp.expand(numerator.subs(n, y + 3))
    assert shifted == (
        196 * y**5 + 2354 * y**4 + 15164 * y**3 + 45478 * y**2
        + 60264 * y + 24765
    )
    return {
        "local_expression_terms": len(sp.Poly(q, *sorted(q.free_symbols, key=str)).terms()),
        "positive_terms_dropped": ["8*re", "6*ra", "7*(2*n-3)*x"],
        "wedge_bound": "wedges<=binom(edges,2), coefficient 45-16*n<=0 for n>=3",
        "edge_endpoint": str(edge_endpoint),
        "edge_endpoint_residual": str(edge_residual),
        "degree_real_floor": str(degree_floor),
        "lower_n_at_least_3": str(lower),
        "numerator_shift_n_equals_3_plus_y": str(shifted),
    }


def zero_survivors_certificate():
    n, a2, a3, a4 = sp.symbols("n a2 a3 a4", nonnegative=True)
    qa = 6 * n + 8 * a2 - 11 * a3 - 14 * a4 + 9 * n**2 + 12 * n * a2 \
        - 2 * n * a3 + 6 * a2**2
    assert sp.expand(sp.diff(qa, a2) - (8 + 12 * n + 12 * a2)) == 0
    assert sp.expand(sp.diff(qa, a3) - (-11 - 2 * n)) == 0
    assert sp.expand(sp.diff(qa, a4) + 14) == 0
    lower = sp.factor(qa.subs({
        a2: choose(n - 1, 2),
        a3: choose(n, 3),
        a4: choose(n, 4),
    }))
    assert sp.expand(
        lower
        - (7 * n**4 - 4 * n**3 + 155 * n**2 - 146 * n + 168)
        / sp.Integer(12)
    ) == 0
    y = sp.symbols("y", nonnegative=True)
    shifted = sp.expand(lower.subs(n, y + 2))
    assert shifted == (
        sp.Rational(7, 12) * y**4 + sp.Rational(13, 3) * y**3
        + sp.Rational(299, 12) * y**2 + sp.Rational(325, 6) * y + 48
    )
    return {
        "formula": str(qa),
        "bounds": (
            "for n>=2, a2>=binom(n-1,2), a3<=binom(n,3), "
            "a4<=binom(n,4)"
        ),
        "lower_n_at_least_2": str(lower),
        "shift_n_equals_2_plus_y": str(shifted),
    }


def finite_certificate(expression):
    # Only orders not covered by the displayed all-order branches:
    # two survivors n=2,3; one survivor n=1,2; zero survivors n=0,1.
    minima = {}
    checks = {}
    zero = tuple((sp.Integer(0),) * 7 for _ in range(4))

    def value(graph, u, v):
        rows = four_rows(graph, u, v)
        shifted = tuple((0, *row[:-1]) for row in rows)
        return int(raw_g2(shifted, zero))

    ranges = {
        "two_survivors": (2, 3),
        "one_survivor": (1, 2),
        "zero_survivors": (0, 1),
    }
    for case, orders in ranges.items():
        values = []
        for order in orders:
            for graph0 in nx.graph_atlas_g():
                if len(graph0) != order:
                    continue
                if order and not nx.is_forest(graph0):
                    continue
                graph = nx.convert_node_labels_to_integers(graph0)
                placements = (
                    itertools.permutations(graph, 2) if case == "two_survivors"
                    else ((-1, vertex) for vertex in graph) if case == "one_survivor"
                    else ((-1, -2),)
                )
                for u, v in placements:
                    q = value(graph, u, v)
                    assert q >= 0
                    values.append(q)
        checks[case] = len(values)
        minima[case] = min(values)
    assert checks == {"two_survivors": 22, "one_survivor": 5, "zero_survivors": 2}
    assert minima == {"two_survivors": 14, "one_survivor": 4, "zero_survivors": 0}
    return {"checks": checks, "minima": minima, "all_nonnegative": True}


def main():
    actual_dependencies = {name: sha256(HERE / name) for name in DEPENDENCIES}
    assert actual_dependencies == DEPENDENCIES
    rows, expression = shifted_q_expression()
    occupation = occupation_certificate(rows, expression)
    two = two_survivors_certificate(rows, expression)
    one = one_survivor_certificate(rows, expression)
    zero = zero_survivors_certificate()
    finite = finite_certificate(expression)
    report = {
        "marker": MARKER,
        "theorem": (
            "For every finite forest H with two formal distinct marks that may be "
            "present or absent, the quadratic singleton increment Q(E) is nonnegative."
        ),
        "definition": "Q(E)=raw_g2(xE,0), the E-quadratic part of Delta(D,E)",
        "raw_terms": 34,
        "occupation_certificate": occupation,
        "survival_cases": {
            "two_survivors": two,
            "one_survivor": one,
            "zero_survivors": zero,
        },
        "finite_boundary": finite,
        "coverage": {
            "two_survivors": "finite n=2,3; exact nonadjacent bound n>=4; exact adjacent bound n>=3",
            "one_survivor": "finite n=1,2; exact bound n>=3",
            "zero_survivors": "finite n=0,1; exact bound n>=2",
            "gap": "none for Q(E)",
        },
        "dependencies_sha256": actual_dependencies,
        "scope": (
            "Q(E)>=0 only. The mixed singleton increment L(D,E), the full "
            "singleton-ordinary g2 mode, the other canonical g2 modes, all N5, "
            "and Erdos Problem 993 remain separate."
        ),
        "source_sha256": sha256(Path(__file__)),
    }
    raw = json.dumps(report, indent=2, sort_keys=True) + "\n"
    OUTPUT.write_text(raw, encoding="utf-8", newline="\n")
    print(json.dumps({
        "marker": MARKER,
        "raw_terms": 34,
        "finite_checks": sum(finite["checks"].values()),
        "coverage_gap": report["coverage"]["gap"],
        "scope": report["scope"],
    }, indent=2, sort_keys=True))
    print("REPORT_SHA256", hashlib.sha256(raw.encode()).hexdigest().upper())
    print(MARKER)


if __name__ == "__main__":
    main()
