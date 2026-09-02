"""Test the full four-slot squarefree convolution behind the group target.

Even though the individual signed directional lifts fail stability, their
squarefree convolution could conceivably retain it.  Its top coefficient is
the exact d=4 group contraction.  This script looks for exact line failures.
"""

from __future__ import annotations

import hashlib
import json
import random
from pathlib import Path

import sympy as sp

import probe_group_squarefree_derivative_lift as base


HERE = Path(__file__).resolve().parent
REPORT = HERE / "group_full_squarefree_convolution_probe_20260804.json"
Y, tau = sp.symbols("Y tau")


def mask_coeffs(poly: sp.Poly) -> dict[int, sp.Expr]:
    marker_poly = sp.Poly(poly.as_expr(), *base.t)
    out = {}
    for mask in range(16):
        mon = tuple((mask >> k) & 1 for k in range(4))
        out[mask] = marker_poly.coeff_monomial(mon)
    return out


def squarefree_convolution(N: int, a: sp.Rational, b: sp.Rational) -> sp.Poly:
    left = mask_coeffs(base.lift(N, a))
    right = {
        mask: coeff.subs({base.x: Y})
        for mask, coeff in mask_coeffs(base.lift(N, b)).items()
    }
    coeffs = {mask: sp.Integer(0) for mask in range(16)}
    for ma, ca in left.items():
        for mb, cb in right.items():
            if ma & mb == 0:
                coeffs[ma | mb] += ca * cb
    expr = sp.Add(*[
        sp.expand(coeff) * sp.prod(base.t[k] for k in range(4) if mask & (1 << k))
        for mask, coeff in coeffs.items()
    ])
    return sp.Poly(sp.expand(expr), base.x, Y, *base.t, domain=sp.QQ)


def digest(poly: sp.Poly) -> str:
    _, primitive = poly.clear_denoms(convert=True)
    values = primitive.all_coeffs()
    if values and values[0] < 0:
        values = [-v for v in values]
    return hashlib.sha256(",".join(map(str, values)).encode()).hexdigest()


def main() -> None:
    rng = random.Random(993_520_20260804)
    records = []
    status = "PASS_PROBE_ONLY"
    for m in range(1, 6):
        N = 3 * m + 4
        smoothing = 2 * m + 1
        raw = squarefree_convolution(N, sp.Rational(1), sp.Rational(1, 2)).as_expr()
        expr_smoothed = sp.expand(sum(
            sp.binomial(smoothing, k)
            * sp.diff(raw, base.x, k, Y, smoothing - k)
            for k in range(smoothing + 1)
        ))
        poly = sp.Poly(expr_smoothed, base.x, Y, *base.t, domain=sp.QQ)
        variables = (base.x, Y, *base.t)
        for trial in range(20):
            bases = [rng.randint(-23, 23) for _ in variables]
            dirs = [rng.randint(1, 11) for _ in variables]
            expr = poly.as_expr().subs({v: aa + bb * tau for v, aa, bb in zip(variables, bases, dirs)})
            q = sp.Poly(sp.expand(expr), tau, domain=sp.QQ)
            real = int(q.count_roots(-sp.oo, sp.oo))
            item = {
                "m": m, "N": N, "smoothing": smoothing,
                "trial": trial, "degree": q.degree(),
                "real_roots": real, "digest": digest(q),
                "bases": bases, "directions": dirs,
            }
            records.append(item)
            if real != q.degree():
                status = "COUNTEREXAMPLE"
                break
        if status == "COUNTEREXAMPLE":
            break
    report = {
        "status": status,
        "parameters": {"a": "1", "b": "1/2", "product": "1/2"},
        "tests": records,
        "first_failure": records[-1] if status == "COUNTEREXAMPLE" else None,
    }
    REPORT.write_text(json.dumps(report, indent=2), encoding="utf-8")
    print(json.dumps({
        "status": status,
        "test_count": len(records),
        "first_failure": report["first_failure"],
        "report": str(REPORT),
    }, indent=2))


if __name__ == "__main__":
    main()
