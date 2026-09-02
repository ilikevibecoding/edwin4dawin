"""Probe a squarefree-derivative lift for the defect-one group target.

For c in R define, with four squarefree marker variables t_{i,+/-},

  P_{N,c} = prod_i (1+t_{i,+}(D_X+c D_{z_i}))
                       (1+t_{i,-}(D_X-c D_{z_i})) Phi_N(X;z)|_{z=0}.

If P_{N,1} and P_{N,1/2} are real stable for every N, Sinclair's
squarefree-product theorem gives the two complement contractions in one
step (the parameters have product -1/2 after swapping the +/- slots on the
second factor).  This script performs exact positive-direction Sturm tests
and exact coefficient-identity checks; it is only a probe, not a proof.
"""

from __future__ import annotations

import hashlib
import json
import random
from fractions import Fraction
from math import comb, factorial
from pathlib import Path

import sympy as sp


HERE = Path(__file__).resolve().parent
REPORT = HERE / "group_squarefree_derivative_lift_probe_20260804.json"

x, z1, z2 = sp.symbols("x z1 z2")
t = sp.symbols("t1p t1m t2p t2m")
tau = sp.symbols("tau")


def g(N: int, var: sp.Symbol) -> sp.Expr:
    return sp.Add(*[
        sp.Rational(comb(N + a - 1, N - a), factorial(a)) * var**a
        for a in range(1, N + 1)
    ])


def phi(N: int) -> sp.Expr:
    return g(N, x) + g(N - 1, x) * (z1 + z2) + g(N - 2, x) * z1 * z2


def apply_direction(poly: sp.Expr, zi: sp.Symbol, sign: int, c: sp.Rational) -> sp.Expr:
    return sp.diff(poly, x) + sign * c * sp.diff(poly, zi)


def lift(N: int, c: sp.Rational) -> sp.Poly:
    base = phi(N)
    out = sp.Integer(0)
    slots = ((z1, +1), (z1, -1), (z2, +1), (z2, -1))
    for mask in range(16):
        coeff = base
        mon = sp.Integer(1)
        for k, (zi, sign) in enumerate(slots):
            if mask & (1 << k):
                coeff = apply_direction(coeff, zi, sign, c)
                mon *= t[k]
        out += mon * coeff.subs({z1: 0, z2: 0})
    return sp.Poly(sp.expand(out), x, *t, domain=sp.QQ)


def primitive_digest(poly: sp.Poly) -> str:
    _, primitive = sp.Poly(poly, tau, domain=sp.QQ).clear_denoms(convert=True)
    vals = primitive.all_coeffs()
    if vals and vals[0] < 0:
        vals = [-v for v in vals]
    payload = ",".join(str(v) for v in vals).encode()
    return hashlib.sha256(payload).hexdigest()


def line_restriction(poly: sp.Poly, rng: random.Random) -> tuple[sp.Poly, dict[str, int]]:
    variables = (x, *t)
    bases = [rng.randint(-17, 19) for _ in variables]
    dirs = [rng.randint(1, 9) for _ in variables]
    expr = poly.as_expr().subs({v: a + b * tau for v, a, b in zip(variables, bases, dirs)})
    q = sp.Poly(sp.expand(expr), tau, domain=sp.QQ)
    data = {f"base_{v}": a for v, a in zip(variables, bases)}
    data.update({f"dir_{v}": b for v, b in zip(variables, dirs)})
    return q, data


def sturm_real_count(poly: sp.Poly) -> int:
    return int(sp.Poly(poly, tau, domain=sp.QQ).count_roots(-sp.oo, sp.oo))


def direct_group(N: int, d: int, X: sp.Symbol, Y: sp.Symbol) -> sp.Expr:
    S = lambda f, k: sp.expand(sum(
        comb(k, a) * sp.diff(f, X, a, Y, k - a) for a in range(k + 1)
    ))
    return sp.expand(
        S(g(N, X) * g(N, Y), d)
        - 2 * S(g(N - 1, X) * g(N - 1, Y), d - 2)
        + S(g(N - 2, X) * g(N - 2, Y), d - 4)
    )


def squarefree_top(P: sp.Poly, Q: sp.Poly, Y: sp.Symbol) -> sp.Expr:
    """Top coefficient of P(X,t) * Q(Y,t) modulo t_i^2.

    With the same +/- labeling and c(P)c(Q)=1/2, the complementary
    singleton allocations have opposite signs, making each cross state
    coefficient -1.
    """
    pe = P.as_expr()
    qe = Q.as_expr().subs({x: Y})
    pp = sp.Poly(pe, *t)
    qq = sp.Poly(qe, *t)
    total = sp.Integer(0)
    full = 15
    for mask in range(16):
        ma = tuple((mask >> k) & 1 for k in range(4))
        mbmask = full ^ mask
        mb = tuple((mbmask >> k) & 1 for k in range(4))
        total += pp.coeff_monomial(ma) * qq.coeff_monomial(mb)
    return sp.expand(total)


def main() -> None:
    rng = random.Random(993_20260804)
    report: dict[str, object] = {
        "status": "PASS_PROBE_ONLY",
        "candidate": "four-slot squarefree derivative lift",
        "line_tests": [],
        "identity_checks": [],
    }

    lifts: dict[tuple[int, Fraction], sp.Poly] = {}
    failures = []
    candidates = (
        sp.Rational(1, 2), sp.Rational(3, 5), sp.Rational(2, 3),
        sp.Rational(7, 10), sp.Rational(5, 7), sp.Rational(3, 4),
        sp.Rational(4, 5), sp.Rational(1),
    )
    for N in range(3, 6):
        for c in candidates:
            P = lift(N, c)
            lifts[(N, Fraction(int(c.p), int(c.q)))] = P
            for trial in range(4):
                q, line = line_restriction(P, rng)
                real = sturm_real_count(q)
                item = {
                    "N": N,
                    "c": str(c),
                    "trial": trial,
                    "degree": q.degree(),
                    "real_roots": real,
                    "digest": primitive_digest(q),
                    **line,
                }
                report["line_tests"].append(item)
                if real != q.degree():
                    failures.append(item)
                    break

    X, Y = sp.symbols("X Y")
    for m in range(1, 2):
        N, d = 3 * m + 4, 2 * m + 5
        P = lift(N, sp.Rational(1))
        Q = lift(N, sp.Rational(1, 2))
        top = squarefree_top(P, Q, Y).subs({x: X})
        target = direct_group(N, 4, X, Y)
        ok = sp.Poly(sp.expand(top - target), X, Y).is_zero
        report["identity_checks"].append({"m": m, "N": N, "four_slot_ok": bool(ok)})
        if not ok:
            report["status"] = "IDENTITY_MISMATCH"

    report["first_failure_by_N_c"] = failures
    if failures and report["status"] == "PASS_PROBE_ONLY":
        report["status"] = "SOME_LIFT_PARAMETERS_FAIL"

    REPORT.write_text(json.dumps(report, indent=2), encoding="utf-8")
    print(f"{report['status']}: {len(report['line_tests'])} exact line tests")
    print(json.dumps(failures, indent=2))
    print(json.dumps(report["identity_checks"], indent=2))
    print(REPORT)


if __name__ == "__main__":
    main()
