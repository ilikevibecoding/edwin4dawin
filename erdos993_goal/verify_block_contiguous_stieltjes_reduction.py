#!/usr/bin/env python3
"""Exact replay for BLOCK_CONTIGUOUS_STIELTJES_REDUCTION_2026-08-10.md.

The script proves the generic differential identity by a coefficient-ratio
calculation over Q(n,s), verifies the displayed ODE reduction, and records the
finite exact obstruction to termwise use of the four lower blocks.  It does
not claim an all-order proof of the block interlacing lemma.
"""

from __future__ import annotations

import hashlib
import json
from pathlib import Path

import sympy as sp


x, k, n, s = sp.symbols("x k n s")


def q(nn: int, i: int) -> sp.Integer:
    if i < 0 or 2 * i > nn:
        return sp.Integer(0)
    return sp.binomial(nn - i, i)


def block(nn: int, ss: int) -> sp.Poly:
    return sp.Poly(
        sum(
            (-1) ** i
            * sp.factorial(ss)
            / sp.factorial(ss - i)
            * q(nn, i)
            * (x / 4) ** i
            for i in range(ss + 1)
        ),
        x,
        domain=sp.QQ,
    )


def isolated(poly: sp.Poly) -> list[tuple[sp.Rational, sp.Rational]]:
    ans = []
    for interval, multiplicity in poly.intervals(eps=sp.Rational(1, 10**12)):
        assert multiplicity == 1
        ans.append(interval)
    return ans


def degree_one_interlaces(p: sp.Poly, h: sp.Poly) -> bool:
    pp, hh = isolated(p), isolated(h)
    return len(pp) == len(hh) + 1 and all(
        pp[i][1] < hh[i][0] and hh[i][1] < pp[i + 1][0]
        for i in range(len(hh))
    )


def generic_identity() -> tuple[sp.Expr, dict[str, sp.Expr]]:
    D = sp.prod(n - s - j for j in range(4))
    E = (n - 2 * s - 2) * (n - 2 * s - 3)
    a = [
        64 * s * (n - 1) / (D * (n + 1)),
        16 * s * (6 * n**2 - 3 * n * s - 7 * n + s + 3) / (D * (n + 1)),
        12 * n * s * (n - 1) / D,
        n * (n - 1) * E / D,
    ]
    b = [
        256 / (D * (n + 1)),
        64 * (5 * n - 6 * s + 3) / (D * (n + 1)),
        16 * (-3 * n**2 - 14 * n * s + 27 * n + 8 * s**2 + 6 * s - 18)
        / (D * (n + 1)),
        -4 * (3 * n**2 + 8 * n * s - 5 * n - 18 * s - 6) / D,
        -2 * (2 * n - 3) * E / D,
    ]
    c = [
        256 / (D * (n + 1)),
        64 * (5 * n - 2 * s - 3) / (D * (n + 1)),
        16 * (n + 2 * s) / D,
        4 * E / D,
    ]

    def rnum(j: sp.Expr) -> sp.Expr:
        return -(s - j) * (n - 2 * j) * (n - 2 * j - 1)

    def rden(j: sp.Expr) -> sp.Expr:
        return 4 * (j + 1) * (n - j)

    bases = {
        -1: sp.prod(rnum(k - j) for j in (3, 2, 1, 0)),
        0: sp.prod(rnum(k - j) for j in (3, 2, 1)) * rden(k),
        1: sp.prod(rnum(k - j) for j in (3, 2)) * rden(k - 1) * rden(k),
        2: rnum(k - 3) * rden(k - 2) * rden(k - 1) * rden(k),
        3: sp.prod(rden(k - j) for j in (3, 2, 1, 0)),
    }
    dnum = sp.prod(n - 2 * (k - 3) - j for j in range(4))
    residual = (
        a[0] * bases[0]
        + a[1] * bases[1]
        + a[2] * bases[2]
        + a[3] * bases[3]
        + b[0] * (k + 1) * bases[-1]
        + b[1] * k * bases[0]
        + b[2] * (k - 1) * bases[1]
        + b[3] * (k - 2) * bases[2]
        + b[4] * (k - 3) * bases[3]
        + c[0] * k * (k - 1) * bases[0]
        + c[1] * (k - 1) * (k - 2) * bases[1]
        + c[2] * (k - 2) * (k - 3) * bases[2]
        + c[3] * (k - 3) * (k - 4) * bases[3]
        - dnum * 4**4 * (k - 2) * (k - 1) * k * (k + 1)
    )
    residual = sp.cancel(residual)
    return residual, {"D": D, "E": E, "a": a, "b": b, "c": c}


def main() -> None:
    residual, coeffs = generic_identity()
    assert residual == 0

    # Direct polynomial checks of the contiguous and four-lower-block identities.
    direct_checks = 0
    lower_counts = {str(j): {"pass": 0, "fail": 0} for j in range(2, 6)}
    lower_fail_examples: dict[str, dict[str, int]] = {}
    for ss in range(2, 13):
        for excess in (0, 1, 5, 17):
            nn = 4 * ss + 9 + excess
            p, q4 = block(nn, ss), block(nn - 4, ss)
            lower_sum = sum((block(nn - j, ss - 1).as_expr() for j in range(2, 6)), sp.S.Zero)
            assert sp.Poly(
                p.as_expr() - q4.as_expr() + ss * x * lower_sum / 4, x
            ).is_zero
            direct_checks += 1
            for j in range(2, 6):
                ok = degree_one_interlaces(p, block(nn - j, ss - 1))
                lower_counts[str(j)]["pass" if ok else "fail"] += 1
                if not ok and str(j) not in lower_fail_examples:
                    lower_fail_examples[str(j)] = {"s": ss, "n": nn, "excess": excess}

    # The hypergeometric ODE converted from theta=x*d/dx and evaluated at P=0.
    A = s + n - sp.Rational(1, 2)
    pair_sum = n * (n - 1) / 4 + s * (2 * n - 1) / 2
    K = sp.factor(1 - A + pair_sum)
    assert sp.simplify(K - (n**2 + 4 * n * s - 5 * n - 6 * s + 6) / 4) == 0

    source = Path(__file__)
    report_path = source.with_name("block_contiguous_stieltjes_exact_20260810.json")
    report = {
        "status": "PASS_EXACT_BLOCK_CONTIGUOUS_STIELTJES_REDUCTION_REPLAY",
        "theorem_status": "exact reduction; all-order Stieltjes inequality remains open",
        "generic_coefficient_residual": "0",
        "direct_four_step_checks": direct_checks,
        "lower_block_exact_interlacing_counts": lower_counts,
        "first_lower_block_fail_examples": lower_fail_examples,
        "orientation_caveat": (
            "positive compatibility is weaker than the uniform sign of Q(r_i)/P'(r_i)"
        ),
        "source_sha256": hashlib.sha256(source.read_bytes()).hexdigest().upper(),
    }
    report_path.write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    report["report_sha256"] = hashlib.sha256(report_path.read_bytes()).hexdigest().upper()
    print(json.dumps(report, indent=2))


if __name__ == "__main__":
    main()
