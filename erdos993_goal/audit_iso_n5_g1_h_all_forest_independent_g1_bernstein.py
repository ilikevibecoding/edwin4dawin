#!/usr/bin/env python3
"""Independent exact audit of the all-forest rank-five H block.

This source does not import the producer.  It reconstructs the factorial-
ratio identity, independently converts the bounded low branch to the degree-2
Bernstein basis, and enumerates every unlabeled forest through order twelve as
a multiset of nonisomorphic tree components.  The result is only the H>=0
sublemma; no coupled L/K or rank-five bundle sign is asserted.
"""

from __future__ import annotations

from functools import lru_cache
import hashlib
import itertools
import json
from math import comb
from pathlib import Path

import networkx as nx
import sympy as sp


HERE = Path(__file__).resolve().parent
PRODUCER_SOURCE = HERE / "prove_iso_n5_g1_h_all_forest_root.py"
PRODUCER_REPORT = HERE / "iso_n5_g1_h_all_forest_exact_root_20260829.json"
MARKER = "PASS_INDEPENDENT_EXACT_ISO_N5_G1_H_ALL_FOREST_AUDIT_G1_BERNSTEIN"
EXPECTED_PRODUCER_SOURCE = "FEE26C37D2FBF86D68DEA8C6EF6992F4AFCBCFDAD0E1BC654BF8B20A8C7D0D9D"
EXPECTED_PRODUCER_REPORT = "9113045F4184B5E79EE51D43B358BAD3C2FF88C64047C7EF86A112470D4B787D"
EXPECTED_FORESTS = (1, 1, 2, 3, 6, 10, 20, 37, 76, 153, 329, 710, 1601)


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def polynomial_hash(polynomial: sp.Poly) -> str:
    ordered = tuple((monomial, str(coefficient)) for monomial, coefficient in polynomial.terms())
    return hashlib.sha256(repr(ordered).encode()).hexdigest().upper()


def add(left: tuple[int, ...], right: tuple[int, ...]) -> tuple[int, ...]:
    width = max(len(left), len(right))
    return tuple(
        (left[index] if index < len(left) else 0)
        + (right[index] if index < len(right) else 0)
        for index in range(width)
    )


def multiply(left: tuple[int, ...], right: tuple[int, ...]) -> tuple[int, ...]:
    out = [0] * (len(left) + len(right) - 1)
    for i, a in enumerate(left):
        for j, b in enumerate(right):
            out[i + j] += a * b
    return tuple(out)


def tree_polynomial(graph: nx.Graph) -> tuple[int, ...]:
    """Independent exact include/exclude recursion on vertex masks."""
    graph = nx.convert_node_labels_to_integers(graph)
    order = len(graph)
    neighbors = tuple(sum(1 << v for v in graph.neighbors(u)) for u in range(order))

    @lru_cache(maxsize=None)
    def recurse(mask: int) -> tuple[int, ...]:
        if not mask:
            return (1,)
        bit = mask & -mask
        vertex = bit.bit_length() - 1
        excluded = recurse(mask ^ bit)
        included = (0, *recurse((mask ^ bit) & ~neighbors[vertex]))
        return add(excluded, included)

    return recurse((1 << order) - 1)


def h_value(row: tuple[int, ...]) -> int:
    value = row + (0,) * max(0, 7 - len(row))
    return (
        2 * value[1] * value[4] - 5 * value[1] * value[5]
        - 6 * value[1] * value[6] + 6 * value[2] * value[3]
        - 8 * value[2] * value[5] + 5 * value[3] ** 2
        + 6 * value[3] * value[4]
    )


def finite_audit() -> dict:
    component_types: list[tuple[int, str, tuple[int, ...], nx.Graph]] = []
    by_size: dict[int, list[int]] = {}
    for size in range(1, 13):
        candidates = [nx.empty_graph(1)] if size == 1 else nx.nonisomorphic_trees(size)
        for graph0 in candidates:
            graph = nx.convert_node_labels_to_integers(graph0)
            index = len(component_types)
            component_types.append((
                size,
                nx.to_graph6_bytes(graph, header=False).decode().strip(),
                tree_polynomial(graph),
                graph,
            ))
            by_size.setdefault(size, []).append(index)

    rows = {}
    total = 0
    for order in range(13):
        count = 0
        minimum = None
        witness = None

        def extend(remaining: int, start: int, chosen: tuple[int, ...], row: tuple[int, ...]):
            nonlocal count, minimum, witness
            if remaining == 0:
                count += 1
                value = h_value(row)
                assert value >= 0
                if minimum is None or value < minimum:
                    minimum = value
                    witness = {
                        "component_graph6": [component_types[index][1] for index in chosen],
                        "independence_polynomial": list(row),
                    }
                return
            for index in range(start, len(component_types)):
                size = component_types[index][0]
                if size > remaining:
                    break
                extend(
                    remaining - size,
                    index,
                    (*chosen, index),
                    multiply(row, component_types[index][2]),
                )

        extend(order, 0, (), (1,))
        assert count == EXPECTED_FORESTS[order]
        rows[str(order)] = {"unlabeled_forests": count, "minimum_H": minimum, "witness": witness}
        total += count
    assert total == 2949
    return {"orders": [0, 12], "unlabeled_forests": total, "rows": rows}


def ratio_audit() -> dict:
    rho1, rho2, rho3, rho4, rho5 = rho = sp.symbols("rho1:6", nonnegative=True)
    q1 = sp.Symbol("q1", positive=True)
    q = [None, q1]
    for ratio in rho:
        q.append(sp.expand(q[-1] * ratio))
    a = [None] + [q[index] / (sp.Integer(2) ** index * sp.factorial(index)) for index in range(1, 7)]
    h = sp.expand(
        2 * a[1] * a[4] - 5 * a[1] * a[5] - 6 * a[1] * a[6]
        + 6 * a[2] * a[3] - 8 * a[2] * a[5]
        + 5 * a[3] ** 2 + 6 * a[3] * a[4]
    )
    normalized = sp.cancel(46080 * h / q1**2)
    expected = rho1 * rho2 * (
        15 * rho1 * rho2 * rho3 + 100 * rho1 * rho2
        - 12 * rho1 * rho3 * rho4 + 720 * rho1
        - 3 * rho3 * rho4 * rho5 - 30 * rho3 * rho4 + 120 * rho3
    )
    assert sp.expand(normalized - expected) == 0

    t, d1, d2, d3, d4 = sp.symbols("t d1 d2 d3 d4", nonnegative=True)
    high = sp.expand(normalized.subs({
        rho5: t,
        rho4: t + 1 + d4,
        rho3: t + 2 + d4 + d3,
        rho2: t + 3 + d4 + d3 + d2,
        rho1: t + 4 + d4 + d3 + d2 + d1,
    }))
    high_poly = sp.Poly(high, t, d1, d2, d3, d4)
    assert len(high_poly.terms()) == 227
    assert min(high_poly.coeffs()) == 3
    assert all(coefficient > 0 for coefficient in high_poly.coeffs())

    r = sp.Symbol("r", nonnegative=True)
    low = sp.expand(normalized.subs({
        rho5: t,
        rho4: t + 1 + d4,
        rho3: t + 2 + d4 + d3,
        rho2: t + 4 - r + d4 + d3 + d2,
        rho1: t + 4 + d4 + d3 + d2,
    }))
    assert sp.degree(low, r) == 2
    p0, p1, p2 = (sp.expand(low.coeff(r, degree)) for degree in range(3))
    # Independent endpoint/derivative conversion for f(r) on [0,1].
    bernstein = (p0, sp.expand(p0 + p1 / 2), sp.expand(p0 + p1 + p2))
    basis = ((1 - r) ** 2, 2 * r * (1 - r), r**2)
    assert sp.expand(low - sum(coefficient * term for coefficient, term in zip(bernstein, basis))) == 0
    low_rows = []
    for coefficient in bernstein:
        polynomial = sp.Poly(coefficient, t, d2, d3, d4)
        assert len(polynomial.terms()) == 124
        assert min(polynomial.coeffs()) == 3
        assert all(value > 0 for value in polynomial.coeffs())
        low_rows.append({
            "terms": 124,
            "minimum_scalar_coefficient": 3,
            "ordered_coefficient_sha256": polynomial_hash(polynomial),
        })
    return {
        "ratio_identity_reconstructed": True,
        "ratio_indexing": "q_(j+1)=rho_j*q_j for j=1,...,5; q1 scaling cancels",
        "high_cone": {
            "terms": 227,
            "minimum_scalar_coefficient": 3,
            "ordered_coefficient_sha256": polynomial_hash(high_poly),
        },
        "low_cone": {
            "bounded_variable": "0<=r=delta1<=1",
            "degree": 2,
            "bernstein_reconstruction": True,
            "rows": low_rows,
        },
        "coverage": {
            "high": "delta1=1+d1; delta2=1+d2; delta3=1+d3; delta4=1+d4",
            "low": "delta1=r; delta2=2-r+d2; delta3=1+d3; delta4=1+d4",
        },
    }


def main() -> None:
    assert sha256(PRODUCER_SOURCE) == EXPECTED_PRODUCER_SOURCE
    assert sha256(PRODUCER_REPORT) == EXPECTED_PRODUCER_REPORT
    producer = json.loads(PRODUCER_REPORT.read_text(encoding="utf-8"))
    assert producer["marker"] == "PASS_EXACT_ISO_N5_G1_H_ALL_FOREST_ROOT"
    finite = finite_audit()
    ratio = ratio_audit()
    report = {
        "marker": MARKER,
        "theorem_audited": "H(F)>=0 for every finite forest F",
        "finite_audit": finite,
        "all_order_ratio_audit": ratio,
        "threshold_logic": (
            "For n>=13, bipartiteness gives alpha>=ceil(n/2)>=7. "
            "The pinned rank-4 theorem supplies delta3>=1, the pinned rank-5 "
            "theorem applies since n>=10 and supplies delta4>=1, and the "
            "universal low-rank drops split exhaustively into the two audited cones."
        ),
        "producer": {
            "source": PRODUCER_SOURCE.name,
            "source_sha256": EXPECTED_PRODUCER_SOURCE,
            "report": PRODUCER_REPORT.name,
            "report_sha256": EXPECTED_PRODUCER_REPORT,
        },
        "scope": (
            "Independent exact audit of H only. It does not prove the coupled L/K "
            "blocks, rank-five g1 or g2, all N5, or Erdos Problem 993."
        ),
        "source_sha256": sha256(Path(__file__)),
    }
    print(json.dumps(report, indent=2, sort_keys=True))
    print(MARKER)


if __name__ == "__main__":
    main()
