#!/usr/bin/env python3
"""Exact counterexample to the fixed three-variable endpoint parent.

The required bottom endpoint is the d-th z derivative at z=0 of

  g_N(X+z)g_N(Y+z) - z^2 h(X+z)h(Y+z)/(d(d-1)).

If this parent were stable, differentiation would prove the endpoint.
The calculation below shows that the parent is already nonstable at m=2.
It does not refute the differentiated endpoint or Erdos Problem 993.
"""

from __future__ import annotations

import json
from pathlib import Path

import sympy as sp

from probe_umbral_repaired_core_stability import (
    add,
    affine_values,
    integer_values,
    multiply,
)
from verify_umbral_hypergeometric_finite_free_structure import (
    X,
    hypergeometric_form,
)


q = sp.symbols("q")
OUT = Path("fixed_endpoint_parent_counterexample_20260802.json")


def main() -> None:
    m = 2
    N = 3 * m + 3
    d = 2 * m + 3
    x_base, y_base, z_base = -38, 7, -13
    x_direction, y_direction, z_direction = 1, 11, 34

    g = sp.Poly(hypergeometric_form(N, 3), X)
    h = sp.Poly(hypergeometric_form(N - 1, 3), X)
    gx = affine_values(g, x_base + z_base, x_direction + z_direction)
    gy = affine_values(g, y_base + z_base, y_direction + z_direction)
    hx = affine_values(h, x_base + z_base, x_direction + z_direction)
    hy = affine_values(h, y_base + z_base, y_direction + z_direction)
    z_squared = multiply([z_base, z_direction], [z_base, z_direction])
    parent_line = add(
        multiply(gx, gy),
        multiply(z_squared, multiply(hx, hy)),
        -sp.Rational(1, d * (d - 1)),
    )
    primitive = integer_values(parent_line)
    polynomial = sp.Poly(
        sum(value * q**k for k, value in enumerate(primitive)), q
    )
    assert polynomial.degree() == 18
    repeated_factor = sp.monic(sp.gcd(polynomial, polynomial.diff()))
    assert repeated_factor.degree() == 2
    assert sp.expand(
        repeated_factor.as_expr()
        - (q - sp.Rational(2, 15)) * (q - sp.Rational(51, 35))
    ) == 0
    squarefree_part = polynomial.sqf_part()
    distinct_real_roots = int(squarefree_part.count_roots(-sp.oo, sp.oo))
    assert distinct_real_roots == 14
    real_roots_with_multiplicity = distinct_real_roots + repeated_factor.degree()
    assert real_roots_with_multiplicity == 16

    report = {
        "kind": "fixed_endpoint_parent_counterexample",
        "date": "2026-08-02",
        "status": "EXACT_COUNTEREXAMPLE_TO_FIXED_PARENT_STABILITY",
        "scope_warning": (
            "This does not refute the differentiated endpoint A-B or Erdos "
            "Problem 993.  It refutes only stability of the proposed "
            "three-variable parent before the endpoint derivative."
        ),
        "parameters": {"m": m, "N": N, "d": d},
        "parent": (
            "g_N(X+Z)g_N(Y+Z)-Z^2 g_(N-1)(X+Z)"
            "g_(N-1)(Y+Z)/(d(d-1))"
        ),
        "affine_line": {
            "X": "-38+q",
            "Y": "7+11q",
            "Z": "-13+34q",
        },
        "primitive_integer_coefficients_ascending": primitive,
        "degree": polynomial.degree(),
        "squarefree": False,
        "repeated_real_roots": ["2/15", "51/35"],
        "exact_distinct_real_root_count": distinct_real_roots,
        "exact_real_root_count_with_multiplicity": real_roots_with_multiplicity,
        "nonreal_root_count": polynomial.degree() - real_roots_with_multiplicity,
        "real_root_isolating_intervals": [
            {
                "left": str(interval[0]),
                "right": str(interval[1]),
                "multiplicity": multiplicity,
            }
            for interval, multiplicity in polynomial.intervals(
                eps=sp.Rational(1, 10) ** 10
            )
        ],
        "conclusion": (
            "The exact positive-direction line has degree 18 but only 16 "
            "real roots.  Endpoint differentiation is an essential part "
            "of the observed stability repair."
        ),
    }
    OUT.write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    print(json.dumps({**report, "output": str(OUT.resolve())}, indent=2))


if __name__ == "__main__":
    main()
