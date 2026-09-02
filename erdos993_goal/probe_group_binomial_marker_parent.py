"""Exact Sturm probe for the without-replacement derivative-slot parent.

For the endpoint N=3m+4, d=2m+5, define

 H_(N,d)(X,Y,t) = (1+tS)^d(g_N g_N)
   -2 t^2 (1+tS)^(d-2)(g_(N-1) g_(N-1))
   +t^4 (1+tS)^(d-4)(g_(N-2) g_(N-2)),

where S=D_X+D_Y.  Its t^d coefficient is exactly G_(N,d).  It is the
diagonalization of the symmetric multiaffine parent obtained by assigning
each state slot to a two-subset of d derivative slots without replacement.
If H is real stable in (X,Y,t), polarization and top-coefficient extraction
prove the hard group endpoint.  This script performs exact line tests only.
"""

from __future__ import annotations

import hashlib
import json
import random
import argparse
from pathlib import Path

import sympy as sp

from verify_umbral_hypergeometric_finite_free_structure import X, hypergeometric_form


HERE = Path(__file__).resolve().parent
REPORT = HERE / "group_binomial_marker_parent_probe_20260804.json"
Y, T, tau = sp.symbols("Y T tau")


def dsum(poly: sp.Expr, order: int) -> sp.Expr:
    return sp.expand(sum(
        sp.binomial(order, k) * sp.diff(poly, X, k, Y, order - k)
        for k in range(order + 1)
    ))


def one_plus_tS(poly: sp.Expr, power: int) -> sp.Expr:
    return sp.expand(sum(
        sp.binomial(power, k) * T**k * dsum(poly, k)
        for k in range(power + 1)
    ))


def parent(N: int, d: int) -> sp.Poly:
    seeds = [hypergeometric_form(N - s, 1) for s in range(3)]
    products = [seed * seed.subs(X, Y) for seed in seeds]
    expr = (
        one_plus_tS(products[0], d)
        - 2 * T**2 * one_plus_tS(products[1], d - 2)
        + T**4 * one_plus_tS(products[2], d - 4)
    )
    return sp.Poly(sp.expand(expr), X, Y, T, domain=sp.QQ)


def direct_group(N: int, d: int) -> sp.Expr:
    seeds = [hypergeometric_form(N - s, 1) for s in range(3)]
    products = [seed * seed.subs(X, Y) for seed in seeds]
    return sp.expand(
        dsum(products[0], d)
        - 2 * dsum(products[1], d - 2)
        + dsum(products[2], d - 4)
    )


def digest(q: sp.Poly) -> str:
    _, primitive = q.clear_denoms(convert=True)
    coeffs = primitive.all_coeffs()
    if coeffs and coeffs[0] < 0:
        coeffs = [-c for c in coeffs]
    return hashlib.sha256(",".join(map(str, coeffs)).encode()).hexdigest()


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--min-m", type=int, default=1)
    parser.add_argument("--max-m", type=int, default=8)
    parser.add_argument("--trials", type=int, default=20)
    parser.add_argument("--out", type=Path, default=REPORT)
    args = parser.parse_args()
    rng = random.Random(993_529_20260804)
    records = []
    top_checks = []
    status = "PASS_PROBE_ONLY"
    for m in range(args.min_m, args.max_m + 1):
        N, d = 3 * m + 4, 2 * m + 5
        H = parent(N, d)
        top = sp.Poly(H.as_expr(), T).coeff_monomial(T**d)
        top_ok = sp.Poly(sp.expand(top - direct_group(N, d)), X, Y).is_zero
        top_checks.append({"m": m, "N": N, "d": d, "top_coefficient_ok": bool(top_ok)})
        if not top_ok:
            status = "IDENTITY_MISMATCH"
            break

        print(f"built m={m}, N={N}, d={d}; top identity={top_ok}", flush=True)
        for trial in range(args.trials):
            bases = [rng.randint(-31, 31) for _ in range(3)]
            dirs = [rng.randint(1, 13) for _ in range(3)]
            expr = H.as_expr().subs({
                X: bases[0] + dirs[0] * tau,
                Y: bases[1] + dirs[1] * tau,
                T: bases[2] + dirs[2] * tau,
            })
            q = sp.Poly(sp.expand(expr), tau, domain=sp.QQ)
            real = int(q.count_roots(-sp.oo, sp.oo))
            item = {
                "m": m, "N": N, "d": d, "trial": trial,
                "degree": q.degree(), "real_roots": real,
                "bases": bases, "directions": dirs, "digest": digest(q),
            }
            records.append(item)
            print(
                f"  line {trial + 1}/{args.trials}: degree={q.degree()}, "
                f"real={real}",
                flush=True,
            )
            if real != q.degree():
                status = "COUNTEREXAMPLE"
                break
        if status != "PASS_PROBE_ONLY":
            break

    report = {
        "status": status,
        "top_coefficient_checks": top_checks,
        "line_test_count": len(records),
        "first_failure": records[-1] if status == "COUNTEREXAMPLE" else None,
        "records": records,
        "scope": (
            "The top-coefficient identity is exact algebra.  Line tests are "
            "necessary-condition probes only; a clean run is not a proof."
        ),
    }
    args.out.write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    print(json.dumps({
        "status": status,
        "top_checks": top_checks,
        "line_test_count": len(records),
        "first_failure": report["first_failure"],
        "report": str(args.out),
    }, indent=2))


if __name__ == "__main__":
    main()
