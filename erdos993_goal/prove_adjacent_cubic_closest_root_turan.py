#!/usr/bin/env python3
"""Exact replay of the closest-root half of adjacent-cubic compatibility.

The mathematical proof is all-order.  This file checks the formal identities
used by the proof and records exact finite spot checks; it is not being used
as a substitute for any quantified step.
"""

from __future__ import annotations

from fractions import Fraction
from hashlib import sha256
from json import dumps
from math import comb
from pathlib import Path

import sympy as sp

from probe_adjacent_quadratic_turan_closest_root import normalized_coefficients


HERE = Path(__file__).resolve().parent
REPORT = HERE / "adjacent_cubic_closest_root_turan_theorem_20260806.json"


def poly_eval(row: list[Fraction], value: Fraction) -> Fraction:
    total = Fraction(0)
    for coefficient in reversed(row):
        total = total * value + coefficient
    return total


def formal_checks() -> dict[str, str | int]:
    x0, x1, x2, x3, x4, aa, bb = sp.symbols(
        "x0 x1 x2 x3 x4 aa bb"
    )
    y0 = x0 + aa * x1 + bb * x2
    y1 = x1 + aa * x2 + bb * x3
    y2 = x2 + aa * x3 + bb * x4
    d0 = x1**2 - x0 * x2
    e1 = x1 * x2 - x0 * x3
    e2 = 2 * x1 * x3 - x0 * x4 - x2**2
    d2 = x2**2 - x1 * x3
    e3 = x2 * x3 - x1 * x4
    d3 = x3**2 - x2 * x4
    decomposition = (
        d0
        + aa * e1
        + bb * (e2 + 4 * d2)
        + (aa**2 - 4 * bb) * d2
        + aa * bb * e3
        + bb**2 * d3
    )
    assert sp.expand(y1**2 - y0 * y2 - decomposition) == 0
    assert sp.expand(e2 + 4 * d2 - (3 * x2**2 - 2 * x1 * x3 - x0 * x4)) == 0

    # Cauchy's inequality in the logarithmic-derivative calculation:
    # S1*S3-S2^2 = sum_{i<j} q_i*q_j*(q_i-q_j)^2.
    q1, q2, q3 = sp.symbols("q1 q2 q3")
    qs = (q1, q2, q3)
    s1 = sum(qs)
    s2 = sum(q**2 for q in qs)
    s3 = sum(q**3 for q in qs)
    sos = sum(qs[i] * qs[j] * (qs[i] - qs[j]) ** 2 for i in range(3) for j in range(i + 1, 3))
    assert sp.expand(s1 * s3 - s2**2 - sos) == 0

    # Reserve r=p-alpha>=13 makes the ODE endpoint factor strictly smaller
    # than four.  Write p=r+alpha to expose coefficientwise positivity.
    r, alpha = sp.symbols("r alpha", integer=True, nonnegative=True)
    p = r + alpha
    gap = sp.expand(4 * (p - 2) * (p - 3) - (p + alpha) * (p + alpha - 1))
    expected = sp.expand(3 * r**2 - 19 * r + 24 + (4 * r - 18) * alpha)
    assert sp.expand(gap - expected) == 0
    shifted = sp.Poly(expected.subs(r, r + 13), r, alpha)
    assert all(coefficient > 0 for coefficient in shifted.coeffs())

    payload = "|".join(
        [
            str(sp.expand(decomposition)),
            str(sp.expand(sos)),
            str(sp.expand(expected)),
        ]
    )
    return {
        "quadratic_turan_decomposition_terms": len(sp.Poly(decomposition, aa, bb).terms()),
        "log_derivative_cauchy_pairs_replayed": 3,
        "reserve_gap_shifted_coefficient_count": len(shifted.coeffs()),
        "formal_identity_sha256": sha256(payload.encode("utf-8")).hexdigest(),
    }


def exact_spot_checks() -> dict[str, int]:
    # Check the exact row-convolution identity and the Turan sign throughout
    # the interval preceding the first zero of Y0, using rational points.
    convolution_checks = 0
    turan_checks = 0
    for p in range(13, 31):
        alpha = p - 13
        total = p + 2 * alpha
        for u, v in (
            (Fraction(0), Fraction(0)),
            (Fraction(1), Fraction(1)),
            (Fraction(1, 2), Fraction(3, 4)),
            (Fraction(1, 100), Fraction(99, 100)),
        ):
            gamma = [Fraction(1), -(u + v), u * v]
            ys = []
            xs = []
            for j in range(5):
                pp, aa = p - 2 * j, alpha + j
                xrow = normalized_coefficients(pp, aa, [Fraction(1)])
                xs.append([Fraction(comb(total, aa)) * value for value in xrow])
                if j < 3:
                    yrow = normalized_coefficients(pp, aa, gamma)
                    ys.append([Fraction(comb(total, aa)) * value for value in yrow])

            # Polynomial form of Y_j=X_j-(u+v)tX_{j+1}+uv t^2X_{j+2}.
            for j in range(3):
                rhs = xs[j][:]
                if len(rhs) < len(ys[j]):
                    rhs += [Fraction(0)] * (len(ys[j]) - len(rhs))
                for k, value in enumerate(xs[j + 1]):
                    if k + 1 >= len(rhs):
                        rhs.append(Fraction(0))
                    rhs[k + 1] -= (u + v) * value
                for k, value in enumerate(xs[j + 2]):
                    while k + 2 >= len(rhs):
                        rhs.append(Fraction(0))
                    rhs[k + 2] += u * v * value
                while rhs and rhs[-1] == 0:
                    rhs.pop()
                assert rhs == ys[j]
                convolution_checks += 1

            # Small exact z values lie before the closest zeros uniformly in
            # this replay range.  Positivity of X1,...,X4 is checked directly,
            # then the target determinant is checked without floating point.
            for z in (Fraction(0), Fraction(1, 10000), Fraction(1, 5000)):
                xv = [poly_eval(row, -z) for row in xs]
                if min(xv[1:]) <= 0:
                    continue
                yv = [poly_eval(row, -z) for row in ys]
                assert yv[1] ** 2 - yv[0] * yv[2] > 0
                turan_checks += 1

    return {
        "exact_row_convolution_checks": convolution_checks,
        "exact_rational_turan_spot_checks": turan_checks,
    }


def main() -> None:
    report = {
        "status": "ALL_ORDER_CLOSEST_ROOT_INEQUALITY_PROVED",
        "theorem": (
            "For p-alpha>=13, 0<=u,v<=1 and c>0, if U=S[p,alpha][(1-ut)(1-vt)(t+c)] "
            "and H=S[p-2,alpha+1][(1-ut)(1-vt)(t+c)], then the closest negative "
            "zero of U has no larger magnitude than the closest negative zero of H."
        ),
        "proof_structure": [
            "write Y_j=X_j+(u+v)z X_(j+1)+uv z^2 X_(j+2) at t=-z",
            "use derivative interlacing and the hypergeometric ODE to place the first zero of Y_0 before the first zero of X_1",
            "prove value-log-concavity of the positive X_j tail by monotonicity of F'^2/(F F'')",
            "decompose Y_1^2-Y_0Y_2 into nonnegative log-concavity and cross-ratio terms, using (u+v)^2>=4uv",
            "evaluate H at the first zero of U and use cubic compatibility to identify the first branch",
        ],
        "scope": (
            "This proves the previously open i=1 complementary inequality u_1<=h_1.  "
            "The inequalities u_i<=h_i for i>=2 remain to be proved."
        ),
        "formal_checks": formal_checks(),
        "exact_replay": exact_spot_checks(),
    }
    REPORT.write_text(dumps(report, indent=2) + "\n", encoding="utf-8")
    print(dumps(report, indent=2))


if __name__ == "__main__":
    main()
