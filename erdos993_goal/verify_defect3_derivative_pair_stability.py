#!/usr/bin/env python3
"""Rigorous stable decomposition of the non-edge bottom-endpoint terms.

Let g=g_N be the defect-three seed and h=g_(N-1).  For d>=2 define

  C_a = binom(d,a+1) g^(a+1)(X) g^(d-a-1)(Y)
        -binom(d-2,a) h^a(X) h^(d-2-a)(Y).

The target is the sum of all C_a plus the two extreme terms
g(X)g^d(Y)+g^d(X)g(Y).  This script checks the exact decomposition and
the hypergeometric identities behind a uniform proof that every C_a is
real stable.  It also records exact counterexamples showing that the edge
and arbitrary sums of the stable C_a are not stable; an additional closure
argument is therefore genuinely required.
"""

from __future__ import annotations

import json
import math
from pathlib import Path

import sympy as sp

from verify_umbral_hypergeometric_finite_free_structure import (
    X,
    hypergeometric_form,
)


Y, q = sp.symbols("Y q")
OUT = Path("defect3_derivative_pair_stability_certificate_20260802.json")


def jacobi_seed(n: int) -> sp.Expr:
    """Jacobi alpha=beta=1/2 seed in the endpoint X normalization."""
    return sp.expand(
        sum(
            sp.rf(-n, k)
            * sp.rf(n + 2, k)
            / sp.rf(sp.Rational(3, 2), k)
            * (-X / 4) ** k
            / sp.factorial(k)
            for k in range(n + 1)
        )
    )


def multiplier(poly: sp.Expr, c: int) -> sp.Expr:
    source = sp.Poly(poly, X)
    return sp.expand(
        sum(
            source.nth(k) * X**k / sp.rf(c, k)
            for k in range(source.degree() + 1)
        )
    )


def derivative_sum_square(poly: sp.Expr, order: int) -> sp.Expr:
    return sp.expand(
        sum(
            sp.binomial(order, a)
            * sp.diff(poly, X, a)
            * sp.diff(poly.subs(X, Y), Y, order - a)
            for a in range(order + 1)
        )
    )


def paired_component(g: sp.Expr, h: sp.Expr, d: int, a: int) -> sp.Expr:
    return sp.expand(
        sp.binomial(d, a + 1)
        * sp.diff(g, X, a + 1)
        * sp.diff(g.subs(X, Y), Y, d - a - 1)
        - sp.binomial(d - 2, a)
        * sp.diff(h, X, a)
        * sp.diff(h.subs(X, Y), Y, d - a - 2)
    )


def primitive_integer_line(poly: sp.Expr) -> tuple[sp.Poly, list[int]]:
    line = sp.Poly(
        sp.expand(poly.subs({X: -147 + 5 * q, Y: -72 + 21 * q})), q
    )
    values = [sp.Rational(line.nth(k)) for k in range(line.degree() + 1)]
    denominator = sp.ilcm(*[value.q for value in values])
    integers = [int(value * denominator) for value in values]
    divisor = abs(math.gcd(*integers))
    primitive = [value // divisor for value in integers]
    return sp.Poly(sum(value * q**k for k, value in enumerate(primitive)), q), primitive


def root_record(name: str, poly: sp.Expr) -> dict[str, object]:
    line, coefficients = primitive_integer_line(poly)
    assert sp.gcd(line, line.diff()).degree() == 0
    real_roots = int(line.count_roots(-sp.oo, sp.oo))
    return {
        "name": name,
        "line": {"X": "-147+5q", "Y": "-72+21q"},
        "primitive_integer_coefficients_ascending": coefficients,
        "degree": line.degree(),
        "squarefree": True,
        "exact_real_root_count": real_roots,
        "nonreal_root_count": line.degree() - real_roots,
        "real_root_isolating_intervals": [
            {
                "left": str(interval[0]),
                "right": str(interval[1]),
                "multiplicity": multiplicity,
            }
            for interval, multiplicity in line.intervals(
                eps=sp.Rational(1, 10) ** 10
            )
        ],
    }


def main() -> None:
    transformation_checks = []
    for N in range(4, 41):
        n = N - 2
        jacobi_n = jacobi_seed(n)
        jacobi_previous = jacobi_seed(n - 1)
        g = hypergeometric_form(N, 3)
        h = hypergeometric_form(N - 1, 3)

        g_identity = sp.Rational(N - 1, 2) * X**2 * multiplier(jacobi_n, 3)
        g_prime_identity = (N - 1) * X * multiplier(jacobi_n, 2)
        h_identity = (N - 2) * X * multiplier(X * jacobi_previous, 2)
        assert sp.expand(g - g_identity) == 0
        assert sp.expand(sp.diff(g, X) - g_prime_identity) == 0
        assert sp.expand(h - h_identity) == 0
        transformation_checks.append(N)

    decomposition_checks = []
    for m in range(1, 11):
        N = 3 * m + 3
        d = 2 * m + 3
        g = hypergeometric_form(N, 3)
        h = hypergeometric_form(N - 1, 3)
        target = sp.expand(
            derivative_sum_square(g, d)
            - derivative_sum_square(h, d - 2)
        )
        edge = sp.expand(
            g * sp.diff(g.subs(X, Y), Y, d)
            + sp.diff(g, X, d) * g.subs(X, Y)
        )
        components = [paired_component(g, h, d, a) for a in range(d - 1)]
        assert sp.expand(target - edge - sum(components)) == 0
        decomposition_checks.append(
            {"m": m, "N": N, "d": d, "stable_components": len(components)}
        )

    # Exact controls at the first endpoint.  Each individual C_a is stable
    # by the theorem chain below, but C_0+C_(d-2) is not; neither is the
    # omitted edge.  Thus ordinary positive-sum closure is unavailable.
    m = 1
    N = 6
    d = 5
    g = hypergeometric_form(N, 3)
    h = hypergeometric_form(N - 1, 3)
    edge = sp.expand(
        g * sp.diff(g.subs(X, Y), Y, d)
        + sp.diff(g, X, d) * g.subs(X, Y)
    )
    first = paired_component(g, h, d, 0)
    last = paired_component(g, h, d, d - 2)
    controls = [
        root_record("two_extreme_derivative_terms", edge),
        root_record("sum_of_two_stable_transpose_components", first + last),
    ]
    assert controls[0]["nonreal_root_count"] == 4
    assert controls[1]["nonreal_root_count"] == 2

    report = {
        "kind": "defect3_derivative_pair_stability",
        "date": "2026-08-02",
        "status": "PASS_RIGOROUS_COMPONENT_STABILITY_REDUCTION",
        "transformation_identity_checks": len(transformation_checks),
        "transformation_range_N": [transformation_checks[0], transformation_checks[-1]],
        "identities": {
            "n": "N-2",
            "J_n": "2F1(-n,n+2;3/2;-X/4)",
            "T_c": "T_c(X^k)=X^k/(c)_k",
            "g_N": "(N-1)X^2 T_3(J_n)/2",
            "g_N_prime": "(N-1)X T_2(J_n)",
            "g_(N-1)": "(N-2)X T_2(X J_(n-1))",
        },
        "proper_position_proof": [
            (
                "J_n and X*J_(n-1) interlace: consecutive Jacobi roots "
                "interlace in (-4,0), and the factor X adds the right endpoint."
            ),
            (
                "T_2 is a Polya-Schur multiplier sequence because its symbol "
                "0F1(;2;z) has only negative real zeros; HKO transfers "
                "interlacing and orientation."
            ),
            (
                "The displayed identities and a common factor X imply "
                "g_(N-1) is in proper position with g_N'."
            ),
            (
                "Differentiating the stable proper-position pencil preserves "
                "the same orientation, so h^a is in proper position with "
                "g^(a+1) for every a."
            ),
        ],
        "component": (
            "C_a=binom(d,a+1)g^(a+1)(X)g^(d-a-1)(Y)"
            "-binom(d-2,a)h^a(X)h^(d-2-a)(Y)"
        ),
        "component_stability_lemma": (
            "If q/p and s/r map the upper half-plane into the same open "
            "half-plane, then lambda*p(X)r(Y)-q(X)s(Y) is stable for "
            "lambda>0, because the product (q/p)(s/r) cannot be positive real."
        ),
        "component_scale": (
            "binom(d,a+1)/binom(d-2,a)="
            "d(d-1)/((a+1)(d-a-1))>0"
        ),
        "decomposition_checks": decomposition_checks,
        "exact_nonclosure_controls": controls,
        "conclusion": (
            "Every non-edge aligned component is rigorously real stable.  "
            "The full endpoint is their prescribed binomial sum plus two "
            "unstable extreme derivative terms.  Even the sum of two stable "
            "transpose components can be nonstable, so the remaining proof "
            "must exploit the complete symmetrized combination."
        ),
    }
    OUT.write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    print(
        json.dumps(
            {
                "status": report["status"],
                "transformation_identity_checks": len(transformation_checks),
                "decomposition_checks": len(decomposition_checks),
                "proved_stable_component_families": sum(
                    item["stable_components"] for item in decomposition_checks
                ),
                "output": str(OUT.resolve()),
            },
            indent=2,
        )
    )


if __name__ == "__main__":
    main()
