#!/usr/bin/env python3
"""Exact counterexample to the proposed reverse proper-position shortcut.

This does not refute the endpoint difference A-B or the forest conjecture.
It refutes only stability of the stronger pencil B+U*A that had passed the
earlier bounded random affine-line probes.
"""

from __future__ import annotations

import json
from pathlib import Path

import sympy as sp

from probe_catalan_smoothed_proper_position import (
    add,
    derivative_sum_line,
    derivative_table,
)
from probe_umbral_repaired_core_stability import integer_values, multiply
from verify_umbral_hypergeometric_finite_free_structure import X, hypergeometric_form


OUT = Path("reverse_proper_position_counterexample_20260802.json")


def main() -> None:
    q, y = sp.symbols("q y")
    m = 1
    N = 3 * m + 3
    b = 2 * m + 1
    xy_base = (-5, -170)
    xy_direction = (10, 3)
    u_base = -59
    u_direction = 12

    g = sp.Poly(hypergeometric_form(N, 3), X)
    h = sp.Poly(hypergeometric_form(N - 1, 3), X)
    g_derivatives = derivative_table(g, b + 2)
    h_derivatives = derivative_table(h, b)
    a_line = derivative_sum_line(g_derivatives, b + 2, xy_base, xy_direction)
    b_line = derivative_sum_line(h_derivatives, b, xy_base, xy_direction)
    pencil_line = add(b_line, multiply(a_line, [u_base, u_direction]))
    integer_line = integer_values(pencil_line)
    line_poly = sp.Poly(sum(value * q**k for k, value in enumerate(integer_line)), q)

    assert line_poly.degree() == 8
    assert sp.gcd(line_poly, line_poly.diff()).degree() == 0
    real_root_count = int(line_poly.count_roots(-sp.oo, sp.oo))
    assert real_root_count == 6

    # An independent exact obstruction: the coordinate Wronskian changes sign.
    def block(seed: sp.Poly, order: int) -> sp.Expr:
        return sp.expand(
            sum(
                sp.binomial(order, k)
                * sp.diff(seed.as_expr(), X, k)
                * sp.diff(seed.as_expr().subs(X, y), y, order - k)
                for k in range(order + 1)
            )
        )

    a = block(g, b + 2)
    bb = block(h, b)
    wronskian = sp.expand(sp.diff(bb, X) * a - bb * sp.diff(a, X))
    wronskian_values = {
        "(-50,-50)": str(wronskian.subs({X: -50, y: -50})),
        "(-50,0)": str(wronskian.subs({X: -50, y: 0})),
    }
    assert sp.Rational(wronskian_values["(-50,-50)"]) > 0
    assert sp.Rational(wronskian_values["(-50,0)"]) < 0

    isolating_intervals = [
        {"left": str(interval[0]), "right": str(interval[1]), "multiplicity": mult}
        for interval, mult in line_poly.intervals(eps=sp.Rational(1, 10) ** 10)
    ]
    report = {
        "kind": "reverse_proper_position_counterexample",
        "date": "2026-08-02",
        "status": "EXACT_COUNTEREXAMPLE_TO_REVERSE_PROPER_POSITION_SHORTCUT",
        "scope_warning": (
            "This is not a counterexample to A-B stability or to Erdos Problem 993; "
            "it refutes only the stronger proposed pencil B+U*A."
        ),
        "parameters": {"m": m, "N": N, "b": b},
        "pencil": "B+U*A",
        "A": "(D_X+D_Y)^(b+2)(g_N(X)g_N(Y))",
        "B": "(D_X+D_Y)^b(g_(N-1)(X)g_(N-1)(Y))",
        "affine_line": {
            "X": "-5+10q",
            "Y": "-170+3q",
            "U": "-59+12q",
        },
        "rational_coefficients_ascending": [str(value) for value in pencil_line],
        "primitive_integer_coefficients_ascending": integer_line,
        "degree": line_poly.degree(),
        "squarefree": True,
        "exact_real_root_count": real_root_count,
        "nonreal_root_count": line_poly.degree() - real_root_count,
        "real_root_isolating_intervals": isolating_intervals,
        "coordinate_wronskian_values": wronskian_values,
        "conclusion": (
            "The exact positive-direction affine specialization has degree 8 but "
            "only 6 real roots, so B+U*A is not real stable."
        ),
    }
    OUT.write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    print(json.dumps({**report, "output": str(OUT.resolve())}, indent=2))


if __name__ == "__main__":
    main()
