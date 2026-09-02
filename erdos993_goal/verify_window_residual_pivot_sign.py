#!/usr/bin/env python3
"""Exact all-order certificate for the residual Laguerre pivot sign.

This script verifies the algebra behind the following all-order argument.
Write m=r+2, B=N-m+1, H=F_(B+2), and

  B(B+1)T(x)
    =uv(B+x)(B+x+1)H(x)
     +2x(B+x)(2(u+v)-uv)H(x-1)
     +x(x-1)(4-u)(4-v)H(x-2).

At x=-y, every falling-factorial summand of H has the same sign.  If
z=y+j, its multiplier in the displayed expression is

  K(A,z;u,v)=uv A(A+1)-2A(2(u+v)-uv)z
             +(4-u)(4-v)z(z+1),

where A=B-y.  K is multiaffine in u,v.  Its four corner values are

  16z(z+1), 4z(3(z+1)-A), 4z(3(z+1)-A),
  (A-3z)^2+A+9z.

For the target y=s+beta-1, s=n-r, beta=epsilon-1/2, and reserve
p-alpha=3r+5+delta, the only non-obvious corner margin is exactly

  3(z+1)-A = 2epsilon+3+3j+delta > 0.

Consequently (-1)^r T(-y)>0.  Since

  Q_L(y)=(-1)^(r+2) positive_constant*T(-y)

and the r removed factors of Q_L are y+zeta_i>0, the residual quadratic
Q_exc satisfies Q_exc(y)>0.  This is precisely

  (s+beta-1)(s+beta-G1)+G2 > 0.
"""

from __future__ import annotations

import argparse
import hashlib
import json
from pathlib import Path

import sympy as sp


HERE = Path(__file__).resolve().parent
REPORT = HERE / "window_residual_pivot_sign_exact_20260808.json"
X = sp.symbols("x")


def elementary(values: list[sp.Rational]) -> list[sp.Expr]:
    result: list[sp.Expr] = [sp.Integer(1)]
    for value in values:
        result.append(sp.Integer(0))
        for index in range(len(result) - 1, 0, -1):
            result[index] = sp.expand(
                result[index] + value * result[index - 1]
            )
    return result


def falling(index: int) -> sp.Expr:
    return sp.prod(X - offset for offset in range(index))


def pochhammer_family(values: list[sp.Rational], parameter: int) -> sp.Poly:
    degree = len(values)
    e = elementary(values)
    expression = sum(
        e[degree - index]
        * 4**index
        / sp.rf(parameter, index)
        * falling(index)
        for index in range(degree + 1)
    )
    return sp.Poly(sp.expand(expression), X, domain=sp.QQ)


def first_order(poly: sp.Poly, value: sp.Rational, parameter: int) -> sp.Poly:
    expression = (
        value * (parameter + X) * poly.as_expr()
        + (4 - value) * X * poly.as_expr().subs(X, X - 1)
    )
    return sp.Poly(sp.expand(expression), X, domain=sp.QQ)


def primitive_digest(poly: sp.Poly) -> str:
    _, integer = poly.clear_denoms(convert=True)
    _, primitive = integer.primitive()
    if primitive.LC() < 0:
        primitive = -primitive
    payload = ",".join(map(str, primitive.all_coeffs()))
    return hashlib.sha256(payload.encode("ascii")).hexdigest()


def symbolic_audit() -> dict[str, str]:
    A, z, u, v, epsilon, j, delta = sp.symbols(
        "A z u v epsilon j delta"
    )
    kernel = sp.expand(
        u * v * A * (A + 1)
        - 2 * A * (2 * (u + v) - u * v) * z
        + (4 - u) * (4 - v) * z * (z + 1)
    )
    corners = {
        "00": sp.factor(kernel.subs({u: 0, v: 0})),
        "10": sp.factor(kernel.subs({u: 1, v: 0})),
        "01": sp.factor(kernel.subs({u: 0, v: 1})),
        "11": sp.factor(kernel.subs({u: 1, v: 1})),
    }
    expected = {
        "00": 16 * z * (z + 1),
        "10": 4 * z * (3 * (z + 1) - A),
        "01": 4 * z * (3 * (z + 1) - A),
        "11": (A - 3 * z) ** 2 + A + 9 * z,
    }
    assert all(sp.expand(corners[key] - expected[key]) == 0 for key in corners)

    # Substitute the sharp reserve parameterization.
    n, r = sp.symbols("n r")
    alpha = 2 * n + epsilon - 3 * r - 5 - delta
    target_y = n - r + epsilon - sp.Rational(3, 2)
    target_A = n + alpha + sp.Rational(1, 2)
    target_z = target_y + j
    margin = sp.factor(3 * (target_z + 1) - target_A)
    assert margin == 2 * epsilon + 3 * j + delta + 3

    # Verify the single-basis-vector evaluation giving K.
    B, y = sp.symbols("B y")
    basis = sp.rf(y, j) / sp.rf(B + 2, j)
    basis_shift_1 = sp.rf(y + 1, j) / sp.rf(B + 2, j)
    basis_shift_2 = sp.rf(y + 2, j) / sp.rf(B + 2, j)
    evaluated = sp.expand(
        u * v * (B - y) * (B - y + 1) * basis
        - 2 * y * (B - y) * (2 * (u + v) - u * v) * basis_shift_1
        + y * (y + 1) * (4 - u) * (4 - v) * basis_shift_2
    )
    target = sp.expand(
        basis
        * kernel.subs({A: B - y, z: y + j})
    )
    assert sp.simplify(evaluated - target) == 0

    return {
        "kernel": str(kernel),
        "corner_00": str(corners["00"]),
        "corner_10": str(corners["10"]),
        "corner_01": str(corners["01"]),
        "corner_11": str(corners["11"]),
        "sharp_reserve_margin": str(margin),
    }


def exact_cases() -> dict[str, object]:
    pool = [
        sp.Rational(1, 100),
        sp.Rational(1, 10),
        sp.Rational(1, 3),
        sp.Rational(1, 2),
        sp.Integer(1),
        sp.Integer(3),
        sp.Integer(10),
    ]
    cases = 0
    sign_checks = 0
    identity_checks = 0
    digests: list[str] = []

    for epsilon in (0, 1):
        beta = sp.Rational(2 * epsilon - 1, 2)
        for r in range(0, 11):
            for delta in range(4):
                # This choice realizes the reserve equality/slack while keeping
                # alpha nonnegative and s=n-r at least two.
                n = 2 * r + 6 + delta
                p = 2 * n + epsilon
                alpha = p - (3 * r + 5 + delta)
                assert alpha >= 0
                N = p + alpha
                m = r + 2
                B = N - m + 1
                s = n - r
                y = sp.Rational(s) + beta - 1
                assert y > 0

                good = [-pool[(3 * r + 2 * index + delta) % len(pool)] for index in range(r)]
                u = pool[(r + delta) % 5]
                v = pool[(2 * r + delta + 1) % 5]
                H = pochhammer_family(good, B + 2)
                one = first_order(H, u, B + 1)
                full = first_order(one, v, B)
                direct = pochhammer_family([u, v, *good], B)
                assert full == sp.Poly(
                    sp.expand(B * (B + 1) * direct.as_expr()),
                    X,
                    domain=sp.QQ,
                )
                identity_checks += 1

                signed_value = sp.factor((-1) ** r * full.eval(-y))
                assert signed_value > 0
                sign_checks += 1
                digests.append(primitive_digest(direct))
                cases += 1

    combined = hashlib.sha256("".join(digests).encode("ascii")).hexdigest()
    return {
        "cases": cases,
        "operator_identity_checks": identity_checks,
        "exact_target_sign_checks": sign_checks,
        "combined_primitive_digest": combined,
    }


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--output", type=Path, default=REPORT)
    args = parser.parse_args()

    report = {
        "kind": "window_residual_pivot_sign_exact",
        "date": "2026-08-08",
        "status": "PASS_EXACT_ALL_ORDER_RESIDUAL_PIVOT_SIGN",
        "conclusion": (
            "For every r>=0, 0<u,v<=1, and reserve "
            "p-alpha>=3r+5, the residual quadratic satisfies "
            "Q_exc(s+beta-1)>0, equivalently "
            "(s+beta-1)(s+beta-G1)+G2>0."
        ),
        "symbolic": symbolic_audit(),
        "audit": exact_cases(),
    }
    args.output.write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    print(json.dumps({**report, "output": str(args.output.resolve())}, indent=2))


if __name__ == "__main__":
    main()
