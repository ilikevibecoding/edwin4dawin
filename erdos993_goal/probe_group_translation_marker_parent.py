#!/usr/bin/env python3
"""Exact line probe for a translation-grade parent of the group polynomial.

For d>=4 put

  P_(N,d)(X,Y,T) = h0(X+T,Y+T)
    - 2*T^2/(d)_2 h1(X+T,Y+T)
    + T^4/(d)_4 h2(X+T,Y+T),

where he=g_(N-e)(X)g_(N-e)(Y).  Then d^d/dT^d P|_(T=0)
is exactly G_(N,d).  Stability of P would therefore prove the target, but
the line checks here are only a necessary-condition probe.
"""

from __future__ import annotations

import argparse
import hashlib
import json
import random
from pathlib import Path

import sympy as sp

from probe_group_binomial_marker_parent import X, Y, direct_group
from verify_umbral_hypergeometric_finite_free_structure import hypergeometric_form


HERE = Path(__file__).resolve().parent
T, tau = sp.symbols("T tau")


def falling(value: int, order: int) -> int:
    answer = 1
    for j in range(order):
        answer *= value - j
    return answer


def parent(N: int, d: int) -> sp.Poly:
    shifted = []
    for e in range(3):
        seed = hypergeometric_form(N - e, 1)
        product = seed * seed.subs(X, Y)
        shifted.append(sp.expand(product.subs({X: X + T, Y: Y + T}, simultaneous=True)))
    expression = (
        shifted[0]
        - sp.Rational(2, falling(d, 2)) * T**2 * shifted[1]
        + sp.Rational(1, falling(d, 4)) * T**4 * shifted[2]
    )
    return sp.Poly(sp.expand(expression), X, Y, T, domain=sp.QQ)


def digest(poly: sp.Poly) -> str:
    _, primitive = poly.clear_denoms(convert=True)
    coefficients = primitive.all_coeffs()
    if coefficients and coefficients[0] < 0:
        coefficients = [-value for value in coefficients]
    return hashlib.sha256(",".join(map(str, coefficients)).encode()).hexdigest()


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--max-m", type=int, default=5)
    parser.add_argument("--trials", type=int, default=24)
    parser.add_argument(
        "--output",
        type=Path,
        default=HERE / "group_translation_marker_parent_probe_20260805.json",
    )
    args = parser.parse_args()
    rng = random.Random(993_20260805_117)
    records = []
    identities = []
    status = "PASS_PROBE_ONLY"
    for m in range(args.max_m + 1):
        N, d = 3 * m + 4, 2 * m + 5
        polynomial = parent(N, d)
        derivative = sp.diff(polynomial.as_expr(), T, d).subs(T, 0)
        identity = sp.Poly(
            sp.expand(derivative - direct_group(N, d)), X, Y, domain=sp.QQ
        ).is_zero
        assert identity
        identities.append({"m": m, "N": N, "d": d, "identity": True})
        print(f"m={m} N={N} d={d}", flush=True)
        for trial in range(args.trials):
            bases = [rng.randint(-31, 31) for _ in range(3)]
            directions = [rng.randint(1, 13) for _ in range(3)]
            line = sp.Poly(
                sp.expand(
                    polynomial.as_expr().subs(
                        {
                            X: bases[0] + directions[0] * tau,
                            Y: bases[1] + directions[1] * tau,
                            T: bases[2] + directions[2] * tau,
                        }
                    )
                ),
                tau,
                domain=sp.QQ,
            )
            real = int(line.count_roots(-sp.oo, sp.oo))
            item = {
                "m": m,
                "N": N,
                "d": d,
                "trial": trial,
                "degree": line.degree(),
                "real_roots": real,
                "bases": bases,
                "directions": directions,
                "digest": digest(line),
            }
            records.append(item)
            if real != line.degree():
                status = "COUNTEREXAMPLE"
                print(f"counterexample {real}/{line.degree()}", flush=True)
                break
        if status == "COUNTEREXAMPLE":
            break
    report = {
        "status": status,
        "derivative_identities": identities,
        "line_test_count": len(records),
        "first_failure": records[-1] if status == "COUNTEREXAMPLE" else None,
        "scope": "A failure is exact; a clean finite line screen is not a proof.",
    }
    args.output.write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    print(json.dumps({
        "status": status,
        "line_test_count": len(records),
        "first_failure": report["first_failure"],
        "report": str(args.output),
    }, indent=2))


if __name__ == "__main__":
    main()
