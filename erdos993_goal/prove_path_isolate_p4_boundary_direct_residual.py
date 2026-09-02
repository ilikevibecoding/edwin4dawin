#!/usr/bin/env python3
"""Derive one boundary residual while simplifying only once.

This is an optimized companion to the general boundary script.  It
forms the two normalized groups as a single unsimplified difference,
so cancellations in the lift can occur before the expensive exact
gamma/binomial simplification.
"""

from __future__ import annotations

import argparse
import hashlib
import json
from pathlib import Path

import sympy as sp

from derive_path_isolate_p4_symbolic_kernel import (
    distinguished_kernel,
)


def simplify_exact(expression: sp.Expr) -> sp.Expr:
    return sp.factor(
        sp.cancel(
            sp.expand_func(
                sp.combsimp(
                    sp.gammasimp(sp.expand(expression))
                )
            )
        )
    )


def raw_normalized_group(
    c: sp.Symbol,
    m: sp.Symbol,
    x: sp.Symbol,
    parity: int,
    distance: int,
) -> sp.Expr:
    q = c + m + distance + 2
    length = 2 * q - 4 + x
    d = 2 * m + parity
    lower_v = -distance - 4 if parity == 0 else -distance - 3
    upper_v = distance + 3
    total = 0
    for v_value in range(lower_v, upper_v + 1):
        u_value = m + v_value
        total += (
            sp.binomial(d, u_value)
            * distinguished_kernel(
                q,
                length,
                c + u_value,
                c + d - u_value,
            )
        )
    return total / sp.binomial(d, m)


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--distance", type=int, required=True)
    parser.add_argument("--parity", type=int, choices=(0, 1), required=True)
    args = parser.parse_args()

    c, m, x = sp.symbols(
        "c m x", integer=True, nonnegative=True
    )
    print("building raw normalized group", flush=True)
    group = raw_normalized_group(
        c, m, x, args.parity, args.distance
    )
    central_ratio = (
        2 * (2 * m + 1) / (m + 1)
        if args.parity == 0
        else 2 * (2 * m + 3) / (m + 2)
    )
    print("forming raw lift residual", flush=True)
    raw_residual = (
        central_ratio * group.subs(m, m + 1) - group
    )
    print("simplifying lift residual once", flush=True)
    residual = simplify_exact(raw_residual)
    numerator, denominator = map(
        sp.factor, sp.fraction(residual)
    )
    polynomial = sp.Poly(sp.expand(numerator), c, m, x)
    terms = polynomial.terms()
    negative = [
        (monomial, coefficient)
        for monomial, coefficient in terms
        if coefficient < 0
    ]
    canonical = "\n".join(
        f"{monomial}:{coefficient}"
        for monomial, coefficient in terms
    )
    report = {
        "status": (
            "PASS_PATH_ISOLATE_P4_BOUNDARY_DIRECT_RESIDUAL"
            if not negative
            else "FAIL_PATH_ISOLATE_P4_BOUNDARY_DIRECT_RESIDUAL"
        ),
        "support_distance_s": args.distance,
        "parity_epsilon": args.parity,
        "lift_residual_over_central_binomial": str(residual),
        "positive_denominator": str(denominator),
        "numerator_degree_c_m_x": list(polynomial.degree_list()),
        "numerator_term_count": len(terms),
        "smallest_numerator_coefficient": str(
            min(coefficient for _, coefficient in terms)
        ),
        "negative_numerator_coefficient_count": len(negative),
        "first_negative_terms": [
            {
                "monomial": list(monomial),
                "coefficient": str(coefficient),
            }
            for monomial, coefficient in negative[:20]
        ],
        "numerator_sha256": hashlib.sha256(
            canonical.encode("utf-8")
        ).hexdigest(),
    }
    output = Path(
        "path_isolate_p4_boundary_direct_residual_"
        f"s{args.distance}_epsilon{args.parity}_20260730.json"
    )
    output.write_text(
        json.dumps(report, indent=2) + "\n",
        encoding="utf-8",
    )
    print(json.dumps({k: v for k, v in report.items() if k != "lift_residual_over_central_binomial"}, indent=2))
    if negative:
        raise SystemExit(1)


if __name__ == "__main__":
    main()
