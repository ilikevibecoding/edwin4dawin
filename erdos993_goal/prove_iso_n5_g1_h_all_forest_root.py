#!/usr/bin/env python3
"""Exact all-forest theorem for the H block in no-mark-root rank-five g1.

For a forest independence row a_j=i_j(F), define

  H=2a1a4-5a1a5-6a1a6+6a2a3-8a2a5+5a3^2+6a3a4.

This replay proves H>=0 for every finite forest.  Orders through twelve are
enumerated exactly.  From order thirteen onward bipartiteness gives alpha>=7;
the pinned rank-four and rank-five three-halves theorems give delta3,delta4>=1,
while the pinned universal low-rank drops give the remaining high/low cone.
Both cone branches are certified by exact coefficient/Bernstein positivity.

This closes only H(A), not the coupled L/K blocks or rank-five g1 itself.
"""

from __future__ import annotations

import hashlib
import json
from pathlib import Path

import networkx as nx
import sympy as sp

from probe_iso_leaf_cross_remainder_root import poly_forest


HERE = Path(__file__).resolve().parent
OUTPUT = HERE / "iso_n5_g1_h_all_forest_exact_root_20260829.json"
MARKER = "PASS_EXACT_ISO_N5_G1_H_ALL_FOREST_ROOT"
DEPENDENCIES = {
    "RANK4_THREE_HALVES_FOREST_CERTIFICATE_2026-07-27.md":
        "38B1C6B41CBDB44D43569E2309BD7E606A59AF7B34322A0FF9083EC430C16FD1",
    "verify_rank4_three_halves_forest_certificate.py":
        "99059D9430D3A8D7AD0E6C5ED63CAE24F6AA99C1F23F204F3E974794A35F70AF",
    "RANK5_FOREST_THREE_HALVES_THEOREM_2026-07-27.md":
        "CA5323D8DF3110087228193C892F576F4814D4A813AE6FAB184887048377203D",
    "verify_rank5_three_halves_forest_certificate.py":
        "56B52DFE4FFA9BBE7273EF8EAA24AA737615338815DF0D41A5792C6728F17DBE",
}
KNOWN_FOREST_COUNTS = {
    0: 1, 1: 1, 2: 2, 3: 3, 4: 6, 5: 10, 6: 20,
    7: 37, 8: 76, 9: 153, 10: 329, 11: 710, 12: 1601,
}


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def at(row: tuple[int, ...], rank: int) -> int:
    return row[rank] if 0 <= rank < len(row) else 0


def h_value(row: tuple[int, ...]) -> int:
    return (
        2 * at(row, 1) * at(row, 4) - 5 * at(row, 1) * at(row, 5)
        - 6 * at(row, 1) * at(row, 6) + 6 * at(row, 2) * at(row, 3)
        - 8 * at(row, 2) * at(row, 5) + 5 * at(row, 3) ** 2
        + 6 * at(row, 3) * at(row, 4)
    )


def forest_graphs(order: int):
    if order == 0:
        yield nx.Graph()
        return
    types = []
    for size in range(1, order + 1):
        candidates = [nx.empty_graph(1)] if size == 1 else nx.nonisomorphic_trees(size)
        for graph in candidates:
            types.append((size, nx.convert_node_labels_to_integers(graph)))

    def extend(remaining: int, start: int, chosen: tuple[int, ...]):
        if remaining == 0:
            yield nx.disjoint_union_all([types[index][1] for index in chosen])
            return
        for index in range(start, len(types)):
            size = types[index][0]
            if size > remaining:
                break
            yield from extend(remaining - size, index, (*chosen, index))

    yield from extend(order, 0, ())


def finite_certificate() -> dict:
    rows = {}
    total = 0
    global_minimum = None
    for order in range(13):
        count = 0
        minimum = None
        witness = None
        for graph in forest_graphs(order):
            count += 1
            polynomial = tuple(poly_forest(graph))
            value = h_value(polynomial)
            assert value >= 0
            if minimum is None or value < minimum:
                minimum = value
                witness = {
                    "graph6": nx.to_graph6_bytes(graph, header=False).decode().strip(),
                    "independence_polynomial": polynomial,
                }
        assert count == KNOWN_FOREST_COUNTS[order]
        total += count
        global_minimum = minimum if global_minimum is None else min(global_minimum, minimum)
        rows[str(order)] = {"unlabeled_forests": count, "minimum_H": minimum, "witness": witness}
    assert total == sum(KNOWN_FOREST_COUNTS.values())
    assert global_minimum == 0
    return {
        "orders": [0, 12],
        "unlabeled_forests": total,
        "global_minimum": global_minimum,
        "rows": rows,
        "role": "complete exact finite branch, not extrapolated",
    }


def cone_certificate() -> dict:
    rho = sp.symbols("rho1:6", nonnegative=True)
    q = [sp.Integer(1), sp.Integer(1)]
    for value in rho:
        q.append(sp.expand(q[-1] * value))
    a = [q[k] / (sp.Integer(2) ** k * sp.factorial(k)) for k in range(7)]
    h = sp.expand(
        2 * a[1] * a[4] - 5 * a[1] * a[5] - 6 * a[1] * a[6]
        + 6 * a[2] * a[3] - 8 * a[2] * a[5]
        + 5 * a[3] ** 2 + 6 * a[3] * a[4]
    )
    denominator = sp.ilcm(*[coefficient.q for coefficient in sp.Poly(h, *rho).coeffs()])
    assert denominator == 46080
    normalized = sp.expand(denominator * h)
    expected = rho[0] * rho[1] * (
        15 * rho[0] * rho[1] * rho[2]
        + 100 * rho[0] * rho[1]
        - 12 * rho[0] * rho[2] * rho[3]
        + 720 * rho[0]
        - 3 * rho[2] * rho[3] * rho[4]
        - 30 * rho[2] * rho[3]
        + 120 * rho[2]
    )
    assert sp.expand(normalized - expected) == 0

    t, d1, d2, d3, d4 = sp.symbols("t d1 d2 d3 d4", nonnegative=True)
    high = sp.expand(normalized.subs({
        rho[4]: t,
        rho[3]: t + 1 + d4,
        rho[2]: t + 2 + d4 + d3,
        rho[1]: t + 3 + d4 + d3 + d2,
        rho[0]: t + 4 + d4 + d3 + d2 + d1,
    }))
    high_poly = sp.Poly(high, t, d1, d2, d3, d4)
    assert len(high_poly.terms()) == 227
    assert all(coefficient > 0 for coefficient in high_poly.coeffs())
    assert min(high_poly.coeffs()) == 3

    r = sp.Symbol("r", nonnegative=True)
    low = sp.expand(normalized.subs({
        rho[4]: t,
        rho[3]: t + 1 + d4,
        rho[2]: t + 2 + d4 + d3,
        rho[1]: t + 4 - r + d4 + d3 + d2,
        rho[0]: t + 4 + d4 + d3 + d2,
    }))
    assert sp.degree(low, r) == 2
    power = [low.coeff(r, j) for j in range(3)]
    bernstein = [sp.expand(sum(
        sp.Rational(sp.binomial(k, j), sp.binomial(2, j)) * power[j]
        for j in range(k + 1)
    )) for k in range(3)]
    bernstein_stats = []
    for coefficient in bernstein:
        polynomial = sp.Poly(coefficient, t, d2, d3, d4)
        assert len(polynomial.terms()) == 124
        assert all(value > 0 for value in polynomial.coeffs())
        assert min(polynomial.coeffs()) == 3
        bernstein_stats.append({"terms": 124, "minimum_scalar_coefficient": 3})

    return {
        "ratio_identity": (
            "46080*H/q1^2=rho1*rho2*(15rho1rho2rho3+100rho1rho2-"
            "12rho1rho3rho4+720rho1-3rho3rho4rho5-30rho3rho4+120rho3)"
        ),
        "large_order_scope": (
            "n>=13 gives alpha>=7. Universal delta1>=0, delta2>=1 and "
            "delta1+delta2>=2, plus pinned delta3>=1 and delta4>=1, exhaust "
            "the high delta1>=1 and low 0<=delta1<=1 cones."
        ),
        "high_cone": {"terms": 227, "minimum_scalar_coefficient": 3},
        "low_cone": {
            "degree_in_bounded_r": 2,
            "bernstein_coefficients": bernstein_stats,
        },
        "all_coefficients_strictly_positive": True,
    }


def main() -> None:
    for name, expected in DEPENDENCIES.items():
        assert sha256(HERE / name) == expected, name
    finite = finite_certificate()
    cone = cone_certificate()
    report = {
        "marker": MARKER,
        "theorem": (
            "For every finite forest F with independence coefficients a_j, "
            "H(F)=2a1a4-5a1a5-6a1a6+6a2a3-8a2a5+5a3^2+6a3a4 is nonnegative."
        ),
        "finite_certificate": finite,
        "all_order_cone_certificate": cone,
        "dependencies": DEPENDENCIES,
        "scope": (
            "This proves only the H(A) block in the no-mark-root g1 partition. "
            "The coupled L/K blocks, full g1, g2, all N5, and Problem 993 remain separate."
        ),
        "source_sha256": sha256(Path(__file__)),
    }
    raw = json.dumps(report, indent=2, sort_keys=True) + "\n"
    OUTPUT.write_text(raw, encoding="utf-8")
    print(json.dumps({
        "marker": MARKER,
        "finite_forests": finite["unlabeled_forests"],
        "high_terms": cone["high_cone"]["terms"],
        "low_bernstein_terms": [row["terms"] for row in cone["low_cone"]["bernstein_coefficients"]],
    }, indent=2, sort_keys=True))
    print("REPORT_SHA256", hashlib.sha256(raw.encode()).hexdigest().upper())
    print(MARKER)


if __name__ == "__main__":
    main()
