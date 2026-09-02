"""Exact diagonal-symbol probe for the binomial marker-parent operator.

For bounded input degrees (N,N,1,1,1,1), the Borcea--Branden algebraic
symbol is obtained by applying the operator to

  x^N y^N (z1+c1)(z2+c2)(w1+e1)(w2+e2).

This script diagonalizes the derivative-slot output variables and performs
exact positive-direction line tests.  A failure disproves a universal
stability-preserver route; a clean result remains probe evidence only.
"""

from __future__ import annotations

import hashlib
import json
import random
from pathlib import Path

import sympy as sp


HERE = Path(__file__).resolve().parent
REPORT = HERE / "group_marker_operator_symbol_probe_20260804.json"
x, y, t, tau = sp.symbols("x y t tau")
c1, c2, e1, e2 = sp.symbols("c1 c2 e1 e2")


def dsum(poly: sp.Expr, order: int) -> sp.Expr:
    return sp.expand(sum(
        sp.binomial(order, i)
        * sp.diff(poly, x, i, y, order - i)
        for i in range(order + 1)
    ))


def lift(poly: sp.Expr, power: int) -> sp.Expr:
    return sp.expand(sum(
        sp.binomial(power, k) * t**k * dsum(poly, k)
        for k in range(power + 1)
    ))


def symbol(N: int, d: int) -> sp.Expr:
    base = x**N * y**N
    return sp.expand(
        c1 * c2 * e1 * e2 * lift(base, d)
        - t**2 * (c2 * e2 + c1 * e1) * lift(base, d - 2)
        + t**4 * lift(base, d - 4)
    )


def digest(q: sp.Poly) -> str:
    _, primitive = q.clear_denoms(convert=True)
    coeffs = primitive.all_coeffs()
    if coeffs and coeffs[0] < 0:
        coeffs = [-a for a in coeffs]
    return hashlib.sha256(",".join(map(str, coeffs)).encode()).hexdigest()


def main() -> None:
    rng = random.Random(993_530_20260804)
    records = []
    status = "PASS_PROBE_ONLY"
    first_failure = None
    for m in range(1, 4):
        N, d = 3 * m + 4, 2 * m + 5
        P = symbol(N, d)
        variables = [x, y, t, c1, c2, e1, e2]
        for trial in range(20):
            bases = [rng.randint(-17, 17) for _ in variables]
            dirs = [rng.randint(1, 11) for _ in variables]
            line = {
                var: bases[i] + dirs[i] * tau
                for i, var in enumerate(variables)
            }
            q = sp.Poly(sp.expand(P.subs(line)), tau, domain=sp.QQ)
            real = int(q.count_roots(-sp.oo, sp.oo))
            item = {
                "m": m, "N": N, "d": d, "trial": trial,
                "degree": q.degree(), "real_roots": real,
                "bases": bases, "directions": dirs, "digest": digest(q),
            }
            records.append(item)
            print(
                f"m={m} line={trial + 1}: degree={q.degree()} real={real}",
                flush=True,
            )
            if real != q.degree():
                status = "COUNTEREXAMPLE"
                first_failure = item
                break
        if first_failure is not None:
            break

    report = {
        "status": status,
        "line_test_count": len(records),
        "first_failure": first_failure,
        "records": records,
        "scope": (
            "A counterexample rules out the universal algebraic-symbol route. "
            "A clean diagonal-symbol probe is necessary evidence only."
        ),
    }
    REPORT.write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    print(json.dumps({
        "status": status,
        "line_test_count": len(records),
        "first_failure": first_failure,
        "report": str(REPORT),
    }, indent=2))


if __name__ == "__main__":
    main()
