#!/usr/bin/env python3
"""Exact two-outlier discrete reduction for the factorial-window core.

Let the arbitrary negative factor parameters be -c_i, c_i>0, and define

  F_C(x)=sum_j e_(r-j)(-c_1,...,-c_r) 4^j/(C)_j (x)_j^fall.

The multiplier 1/(C)_j and the Pochhammer transform imply that F_C has
positive roots with mesh at least one.  Adding one bounded positive factor
u in (0,1] is the first-order difference operator

  L_(u,C)F = u(C+x)F(x)+(4-u)xF(x-1).

For two bounded positive factors u,v and B=N-m+1, the full coefficient
polynomial is exactly

  T = L_(v,B)L_(u,B+1)F_(B+2)/(B(B+1)).

The two degree-(r+1) summands in the first application have interlacing
roots, so the first application has one negative and r positive simple
roots.  Consequently only the second application contains the unresolved
two-outlier interaction.
"""

from __future__ import annotations

import argparse
import hashlib
import json
from pathlib import Path

import sympy as sp


HERE = Path(__file__).resolve().parent
REPORT = HERE / "window_two_outlier_discrete_reduction_exact_20260808.json"
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


def pochhammer_family(
    values: list[sp.Rational], parameter: int
) -> sp.Poly:
    """Return sum_j e_(r-j) 4^j/(parameter)_j (x)_j^fall."""

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


def exact_audit() -> dict[str, object]:
    cases = 0
    positive_mesh_inputs = 0
    first_step_root_counts = 0
    identity_digests: list[str] = []
    pool = [
        sp.Rational(1, 100),
        sp.Rational(1, 10),
        sp.Rational(1, 3),
        sp.Rational(1, 2),
        sp.Integer(1),
        sp.Integer(3),
        sp.Integer(10),
    ]

    for r in range(0, 8):
        good = [-pool[(3 * r + 2 * index) % len(pool)] for index in range(r)]
        for offset in range(4):
            B = 3 * r + 5 + offset
            u = pool[(r + offset) % 5]
            v = pool[(2 * r + offset + 1) % 5]
            H = pochhammer_family(good, B + 2)
            one_direct = pochhammer_family([u, *good], B + 1)
            one_operator = first_order(H, u, B + 1)
            assert one_operator == sp.Poly(
                sp.expand((B + 1) * one_direct.as_expr()), X, domain=sp.QQ
            )

            full_direct = pochhammer_family([u, v, *good], B)
            full_operator = first_order(one_operator, v, B)
            assert full_operator == sp.Poly(
                sp.expand(B * (B + 1) * full_direct.as_expr()),
                X,
                domain=sp.QQ,
            )

            # Equivalent three-shift formula in terms of H alone.
            three_shift = sp.Poly(
                sp.expand(
                    u
                    * v
                    * (B + X)
                    * (B + X + 1)
                    * H.as_expr()
                    + 2
                    * X
                    * (B + X)
                    * (2 * (u + v) - u * v)
                    * H.as_expr().subs(X, X - 1)
                    + X
                    * (X - 1)
                    * (4 - u)
                    * (4 - v)
                    * H.as_expr().subs(X, X - 2)
                ),
                X,
                domain=sp.QQ,
            )
            assert three_shift == full_operator

            if r:
                assert H.count_roots(0, sp.oo) == r
                assert sp.discriminant(H.as_expr(), X) != 0
            positive_mesh_inputs += 1

            # The analytic interlacing proof gives this in all orders.  The
            # exact Sturm replay independently checks the sampled instances.
            assert one_operator.count_roots(-sp.oo, 0) == 1
            assert one_operator.count_roots(0, sp.oo) == r
            assert sp.discriminant(one_operator.as_expr(), X) != 0
            first_step_root_counts += 1

            identity_digests.append(primitive_digest(full_direct))
            cases += 1

    digest = hashlib.sha256("".join(identity_digests).encode("ascii")).hexdigest()
    return {
        "cases": cases,
        "positive_mesh_input_root_counts": positive_mesh_inputs,
        "first_step_exact_sturm_root_counts": first_step_root_counts,
        "combined_primitive_digest": digest,
    }


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--output", type=Path, default=REPORT)
    args = parser.parse_args()

    audit = exact_audit()
    report = {
        "kind": "window_two_outlier_discrete_reduction_exact",
        "date": "2026-08-08",
        "status": "PASS_EXACT_TWO_STEP_REDUCTION",
        "identity": (
            "B(B+1)T=L_(v,B)L_(u,B+1)F_(B+2), "
            "L_(a,C)F=a(C+x)F(x)+(4-a)xF(x-1)"
        ),
        "three_shift_identity": (
            "B(B+1)T=uv(B+x)(B+x+1)H(x)+"
            "2x(B+x)(2(u+v)-uv)H(x-1)+"
            "x(x-1)(4-u)(4-v)H(x-2)"
        ),
        "rigorous_consequence": (
            "F_(B+2) is positive-rooted with mesh at least one.  The roots "
            "of (B+1+x)F(x) and xF(x-1) strictly interlace; hence the first "
            "operator application has exactly one negative and r positive "
            "simple roots.  Only the second application can contain the "
            "quadratic exceptional interaction."
        ),
        "remaining_lemma": (
            "Control the second L-application by the four effective-"
            "dimension coefficient inequalities, or prove its corresponding "
            "Laguerre combination positive directly."
        ),
        "audit": audit,
    }
    args.output.write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    print(json.dumps({**report, "output": str(args.output.resolve())}, indent=2))


if __name__ == "__main__":
    main()
