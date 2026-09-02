#!/usr/bin/env python3
"""Exact obstruction to an ordinary common-interlacing proof of (125).

All complete-level summands are stable, but even in an aligned N=4 model
two positive-direction line restrictions have incompatible first root gaps.
Thus the whole family cannot have one common interlacer.
"""

from __future__ import annotations

import json
from pathlib import Path

import sympy as sp


OUT = Path("level_summand_no_common_interlacing_certificate_20260802.json")


def main() -> None:
    X, Y, z = sp.symbols("X Y z")
    roots = [sp.Integer(0), sp.Integer(0), sp.Integer(5), sp.Integer(15)]
    N, L, d = 4, 5, 3
    line = {X: -39+4*z, Y: 29+z}

    def residual(deleted: tuple[int, ...], variable: sp.Symbol):
        keep = [i for i in range(N) if i not in deleted]
        a = sp.prod(variable+roots[i] for i in keep)
        h = sum(
            roots[i]/L
            * sp.prod(variable+roots[j] for j in keep if j != i)
            for i in keep
        )
        weight = sum(roots[i]/L for i in deleted)
        return sp.expand(a), sp.expand(a-h), sp.Rational(weight)

    def summand(left: tuple[int, ...], right: tuple[int, ...]) -> sp.Poly:
        ax, gx, wx = residual(left, X)
        ay, gy, wy = residual(right, Y)
        value = gx*gy-wx*wy*ax*ay/(d*(d-1))
        return sp.Poly(sp.expand(value.subs(line)), z)

    labels = [
        ((), (0, 2, 3)),
        ((0,), (0, 1)),
    ]
    polynomials = [summand(*label) for label in labels]
    intervals = [p.intervals(eps=sp.Rational(1, 10**10)) for p in polynomials]
    for p, roots_i in zip(polynomials, intervals):
        assert p.degree() == 5
        assert sum(mult for _, mult in roots_i) == 5

    # The smallest root of the first polynomial is exactly -29.  The second
    # root of the second polynomial lies strictly below -29.  A common
    # degree-four interlacer beta would require simultaneously
    # root_1 <= beta_1 <= root_2 for both polynomials, which is impossible.
    first_smallest = intervals[0][0][0]
    second_expanded = []
    for interval, multiplicity in intervals[1]:
        second_expanded.extend([interval]*multiplicity)
    second_second = second_expanded[1]
    assert first_smallest == (-29, -29)
    assert second_second[1] < -29

    report = {
        "kind": "level_summand_no_common_interlacing",
        "date": "2026-08-02",
        "status": "PASS_EXACT_NO_COMMON_INTERLACER",
        "aligned_model": (
            "N=4, L=5, root magnitudes (0,0,5,15), sum=20=NL, d=3"
        ),
        "positive_direction_line": "X=-39+4z, Y=29+z",
        "summand_labels": [
            {"left_deleted": list(left), "right_deleted": list(right)}
            for left, right in labels
        ],
        "primitive_coefficients_ascending": [
            [int(p.nth(i)) for i in range(p.degree()+1)] for p in polynomials
        ],
        "root_intervals": [[str(item) for item in roots_i] for roots_i in intervals],
        "incompatible_first_gap": {
            "maximum_first_root_at_least": "-29",
            "minimum_second_root_at_most": str(second_second[1]),
            "strict_order": f"{second_second[1]} < -29",
        },
        "conclusion": (
            "The stable summands in the complete deletion level do not form "
            "an ordinary common-interlacing family; a proof of their sum "
            "needs a stronger compatibility mechanism."
        ),
    }
    OUT.write_text(json.dumps(report, indent=2)+"\n", encoding="utf-8")
    print(json.dumps({
        "status": report["status"],
        "output": str(OUT.resolve()),
    }, indent=2))


if __name__ == "__main__":
    main()
