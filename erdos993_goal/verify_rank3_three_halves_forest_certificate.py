#!/usr/bin/env python3
"""Exact certificate that every forest has nonnegative rank-3 Q reserve."""

from __future__ import annotations

import json
from pathlib import Path

import sympy as sp

from explore_rank4_three_halves_grouped import (
    minimum_with_index,
    split_bernstein_midpoint,
    tensor_bernstein_fast,
)
from scan_rank3_three_halves_forest_finite import q3


FINITE_OUTPUT = Path("rank3_three_halves_forest_finite_n15_20260727.json")


def symbolic_large_order_certificate():
    n, e, S, R = sp.symbols("n e S R", nonnegative=True)

    def choose(a, k):
        return sp.prod(a - j for j in range(k)) / sp.factorial(k)

    p2 = choose(n, 2) - e
    p3 = choose(n, 3) - e * (n - 2) + S
    p4 = (
        choose(n, 4)
        - e * choose(n - 2, 2)
        + S * (n - 4)
        + choose(e, 2)
        - R
    )
    Q = sp.expand(6 * p3**2 - p2 * p3 - 8 * p2 * p4)
    assert sp.expand(sp.diff(Q, R) - 8 * p2) == 0

    # For the line graph: W=sum binom(d_i,2)>=2S^2/e-S, and every
    # connected triple contributes at most three wedges, so R>=W/3.
    line_lower = (2 * S**2 / e - S) / 3
    lower = sp.cancel(Q.subs(R, line_lower))

    u, v, s, z = sp.symbols("u v s z", nonnegative=True)
    N = 1 / u
    edge_box = 1 + (N - 2) * s
    S_box = edge_box * (edge_box - 1) * z / 2
    box = sp.cancel(
        lower.subs({n: N, e: edge_box, S: S_box}) * u**6
    )
    assert sp.denom(box) == 1
    box = sp.expand(box.subs(u, v / 16))
    assert sp.Poly(box, v, s, z).degree_list() == (6, 4, 2)

    degrees, coefficients = tensor_bernstein_fast(box, (v, s, z))
    assert degrees == (6, 4, 2)
    assert minimum_with_index(coefficients) == (
        sp.Rational(-202125, 33554432),
        (6, 4, 1),
    )

    stack = [(coefficients, 0)]
    certified = 0
    unresolved = []
    depth_counts = {}
    while stack:
        patch, depth = stack.pop()
        minimum = minimum_with_index(patch)
        if minimum[0] >= 0:
            certified += 1
            depth_counts[depth] = depth_counts.get(depth, 0) + 1
            continue
        if depth >= 12:
            unresolved.append(minimum)
            continue
        axis = depth % 3
        left, right = split_bernstein_midpoint(patch, axis)
        stack.append((left, depth + 1))
        stack.append((right, depth + 1))

    assert not unresolved
    assert certified == 22
    assert depth_counts == {
        2: 2,
        3: 2,
        5: 4,
        6: 7,
        7: 1,
        8: 1,
        9: 1,
        10: 1,
        11: 1,
        12: 2,
    }
    return certified, depth_counts


def finite_output_audit():
    payload = json.loads(FINITE_OUTPUT.read_text(encoding="utf-8"))
    expected_counts = [
        1,
        2,
        3,
        6,
        10,
        20,
        36,
        73,
        142,
        294,
        618,
        1348,
        2974,
        6777,
        15739,
    ]
    rows = payload["per_order"]
    assert [row["order"] for row in rows] == list(range(1, 16))
    assert [row["distinct_polynomials"] for row in rows] == expected_counts
    assert sum(expected_counts) == 28_043
    assert payload["checks"] == 28_043
    assert payload["negative_q3"] == 0
    assert payload["prefix_failures"] == 0
    assert payload["first_negative"] is None
    assert payload["first_prefix_failure"] is None
    for row in rows:
        witness = row["minimum_q3_witness"]
        assert q3(witness["polynomial"]) == row["minimum_q3"]
        assert witness["q3"] == row["minimum_q3"]
    return payload["checks"]


def main() -> int:
    certified, _ = symbolic_large_order_certificate()
    finite = finite_output_audit()
    print("rank-3 three-halves forest certificate: PASS")
    print("large-order domain: n >= 16")
    print(f"Bernstein terminal boxes: {certified}")
    print(f"finite nonempty forest polynomials: {finite:,}")
    print("the empty forest is trivial")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
