#!/usr/bin/env python3
"""Exact replay for the finite-free path-block reduction.

This does not assume floating-point roots.  Polynomial identities and the
reported finite interlacings are checked over QQ, with the latter certified by
disjoint rational isolating intervals returned by SymPy's exact root isolator.
"""

from __future__ import annotations

import hashlib
import json
from pathlib import Path

import sympy as sp


x = sp.symbols("x")


def q(n: int, i: int) -> sp.Integer:
    if i < 0 or 2 * i > n:
        return sp.Integer(0)
    return sp.binomial(n - i, i)


def path_slice(n: int, m: int, s: int) -> sp.Poly:
    return sp.Poly(sum(q(n, i) * q(m, s - i) * x**i for i in range(s + 1)), x)


def b_block(n: int, s: int) -> sp.Poly:
    """The n-only _3F_1/Jensen block, with positive roots."""
    return sp.Poly(
        sum(
            (-1) ** i
            * sp.factorial(s)
            / sp.factorial(s - i)
            * q(n, i)
            * (x / 4) ** i
            for i in range(s + 1)
        ),
        x,
    )


def r_block(n: int, s: int) -> sp.Poly:
    """Reciprocal _2F_2 block, normalized to constant coefficient one."""
    a = sp.Rational(n - 2 * s + 1, 2)
    return sp.Poly(
        sum(
            (-1) ** i
            * sp.binomial(s, i)
            * sp.rf(s + 2 * a, i)
            / (sp.rf(a, i) * sp.rf(a + sp.Rational(1, 2), i))
            * x**i
            for i in range(s + 1)
        ),
        x,
    )


def laguerre_block(a: sp.Rational, s: int) -> sp.Poly:
    return sp.Poly(
        sum((-1) ** i * sp.binomial(s, i) / sp.rf(a, i) * x**i for i in range(s + 1)),
        x,
    )


def gegenbauer_block(a: sp.Rational, s: int) -> sp.Poly:
    return sp.Poly(
        sum(
            (-1) ** i
            * sp.binomial(s, i)
            * sp.rf(s + 2 * a, i)
            / sp.rf(a + sp.Rational(1, 2), i)
            * x**i
            for i in range(s + 1)
        ),
        x,
    )


def finite_mult_convolution(p: sp.Poly, r: sp.Poly, s: int) -> sp.Poly:
    """Coefficient-normalized degree-s finite multiplicative convolution.

    If p_i=(-1)^i[x^i]p/C(s,i), and similarly r_i, the result has
    coefficient (-1)^i C(s,i) p_i r_i.
    """
    out = sp.Integer(0)
    for i in range(s + 1):
        choose = sp.binomial(s, i)
        pi = (-1) ** i * p.nth(i) / choose
        ri = (-1) ** i * r.nth(i) / choose
        out += (-1) ** i * choose * pi * ri * x**i
    return sp.Poly(sp.cancel(out), x)


def reciprocal_monic_at_zero(p: sp.Poly) -> sp.Poly:
    return sp.Poly(sp.cancel(x ** p.degree() * p.as_expr().subs(x, 1 / x) / p.LC()), x)


def exact_positive_interlacing(p: sp.Poly, r: sp.Poly) -> bool:
    """Certify p_1<r_1<p_2<...<p_s<r_s, with every root positive."""
    eps = sp.Rational(1, 10**35)
    ip = p.intervals(eps=eps)
    ir = r.intervals(eps=eps)
    if len(ip) != p.degree() or len(ir) != r.degree():
        return False
    if any(mult != 1 for _, mult in ip + ir):
        return False
    ap = [interval for interval, _ in ip]
    ar = [interval for interval, _ in ir]
    if any(lo <= 0 for lo, _ in ap + ar):
        return False
    # Disjoint isolating intervals make these strict comparisons exact.
    for i in range(p.degree() - 1):
        if not (ap[i][1] < ar[i][0] and ar[i][1] < ap[i + 1][0]):
            return False
    return ap[-1][1] < ar[-1][0]


def main() -> None:
    identity_checks = 0
    block_interlacing_checks = 0
    induced_slice_checks = 0
    cases = []

    for s in range(2, 13):
        for excess in (0, 1, 5, 17):
            n = 4 * s + 9 + 2 * excess
            bn = b_block(n, s)
            bn4 = b_block(n - 4, s)
            rn = r_block(n, s)

            assert reciprocal_monic_at_zero(bn) == rn
            identity_checks += 1

            a = sp.Rational(n - 2 * s + 1, 2)
            assert finite_mult_convolution(
                laguerre_block(a, s), gegenbauer_block(a, s), s
            ) == rn
            identity_checks += 1

            assert exact_positive_interlacing(bn, bn4)
            block_interlacing_checks += 1

            for m in (n, n - 4):
                lhs = finite_mult_convolution(bn, r_block(m, s), s)
                rhs = sp.Poly(path_slice(n, m, s).as_expr().subs(x, -x) / q(m, s), x)
                assert lhs == rhs
                identity_checks += 1

                lhs4 = finite_mult_convolution(bn4, r_block(m, s), s)
                rhs4 = sp.Poly(path_slice(n - 4, m, s).as_expr().subs(x, -x) / q(m, s), x)
                assert lhs4 == rhs4
                identity_checks += 1

                assert exact_positive_interlacing(lhs, lhs4)
                induced_slice_checks += 1

            cases.append({"s": s, "excess": excess, "n": n})

    source = Path(__file__)
    report_path = source.with_name("finite_free_path_block_exact_20260810.json")
    report = {
        "status": "PASS_EXACT_FINITE_FREE_PATH_BLOCK_REDUCTION_REPLAY",
        "theorem_status": (
            "exact reduction; all-order B_(n,s) vs B_(n-4,s) interlacing remains to prove"
        ),
        "range": {"s": [2, 12], "excess": [0, 1, 5, 17]},
        "case_count": len(cases),
        "identity_checks": identity_checks,
        "exact_block_interlacing_checks": block_interlacing_checks,
        "exact_induced_slice_interlacing_checks": induced_slice_checks,
        "cases": cases,
        "source_sha256": hashlib.sha256(source.read_bytes()).hexdigest().upper(),
    }
    report_path.write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    report["report_sha256"] = hashlib.sha256(report_path.read_bytes()).hexdigest().upper()
    print(json.dumps(report, indent=2))


if __name__ == "__main__":
    main()
