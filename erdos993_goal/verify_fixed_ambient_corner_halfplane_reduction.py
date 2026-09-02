#!/usr/bin/env python3
"""Exact reduction of the all-rank fixed-circle problem to feasibility.

For a structured benign block H, the two-outlier transform T_{u,v} is a
convex combination of the three corner polynomials T00, T10, T11.  The pair
T00,T10 is in the required half-plane by an analytic interlacing argument.
The stronger full-triangle condition involving just T00,T11 is false, so the
reachable weights must be retained.  With s=u+v and p=uv, write

    Tuv = T00 + s A + p D,
    A = T10-T00,  D = T00-2*T10+T11.

At a nonreal zero the two real parameters are determined by three circle
Wronskians.  This script checks that reduction symbolically and supplies an
exact finite rational-projection audit of the resulting feasibility tests.
It deliberately does not label the finite audit as a proof.
"""

from __future__ import annotations

import hashlib
import json
from pathlib import Path

import sympy as sp


HERE = Path(__file__).resolve().parent
REPORT = HERE / "fixed_ambient_corner_halfplane_exact_20260809.json"
X, Y, Z, QVAR = sp.symbols("x y z q", real=True)


def falling(variable: sp.Expr, order: int) -> sp.Expr:
    return sp.prod(
        (variable - offset for offset in range(order)), start=sp.Integer(1)
    )


def rising(value: sp.Expr | int, order: int) -> sp.Expr:
    return sp.prod(
        (value + offset for offset in range(order)), start=sp.Integer(1)
    )


def normalized_benign_transform(
    B: int, ds: list[sp.Rational]
) -> sp.Poly:
    source = sp.Poly(
        sp.prod((4 * QVAR - value for value in ds), start=sp.Integer(1)),
        QVAR,
    )
    rank = len(ds)
    result = sum(
        source.nth(index)
        * falling(Z, index)
        / rising(B + 2, index)
        for index in range(rank + 1)
    )
    return sp.Poly(sp.expand(result), Z)


def append_operator(poly: sp.Expr, parameter: sp.Expr, C: sp.Expr) -> sp.Expr:
    return sp.expand(
        parameter * (Z + C) * poly
        + (4 - parameter) * Z * poly.subs(Z, Z - 1)
    )


def corner_polynomials(B: int, H: sp.Poly) -> tuple[sp.Poly, sp.Poly, sp.Poly]:
    expression = H.as_expr()
    t00 = append_operator(append_operator(expression, 0, B + 1), 0, B)
    t10 = append_operator(append_operator(expression, 1, B + 1), 0, B)
    t11 = append_operator(append_operator(expression, 1, B + 1), 1, B)
    return sp.Poly(t00, Z), sp.Poly(t10, Z), sp.Poly(t11, Z)


def reduce_even_y(poly: sp.Expr, radius_squared: sp.Rational) -> sp.Poly:
    source = sp.Poly(sp.expand(poly), Y)
    result = sp.Integer(0)
    for (power,), coefficient in source.terms():
        assert power % 2 == 0
        result += coefficient * (radius_squared - X**2) ** (power // 2)
    return sp.Poly(sp.cancel(result), X)


def circle_wronskian(
    left: sp.Poly, right: sp.Poly, radius_squared: sp.Rational
) -> sp.Poly:
    point = X + sp.I * Y
    product = sp.expand_complex(
        left.as_expr().subs(Z, point)
        * sp.conjugate(right.as_expr().subs(Z, point))
    )
    imaginary = sp.Poly(sp.im(product), Y)
    quotient = sp.Integer(0)
    for (power,), coefficient in imaginary.terms():
        assert power % 2 == 1
        quotient += coefficient * Y ** (power - 1)
    return reduce_even_y(quotient, radius_squared)


def feasible_symmetric_parameters(
    denominator: sp.Rational,
    s_numerator: sp.Rational,
    p_numerator: sp.Rational,
) -> bool:
    """Return whether (s,p) can equal (u+v,uv) for u,v in [0,1]."""
    if denominator == 0:
        raise ZeroDivisionError("singular two-parameter circle system")
    s = s_numerator / denominator
    p = p_numerator / denominator
    return bool(
        p >= 0
        and p <= 1
        and s >= 0
        and s <= 1 + p
        and s**2 >= 4 * p
    )


def interval_location(
    interval: tuple[sp.Rational, sp.Rational], radius_squared: sp.Rational
) -> str:
    left, right = map(sp.Rational, interval)
    if left <= 0 <= right:
        return "inside"
    lower_abs = min(abs(left), abs(right))
    upper_abs = max(abs(left), abs(right))
    if upper_abs**2 < radius_squared:
        return "inside"
    if lower_abs**2 > radius_squared:
        return "outside"
    return "ambiguous"


def exact_case(B: int, ds: list[sp.Rational]) -> dict[str, object]:
    rank = len(ds)
    N = B + rank + 1
    radius_squared = sp.Rational(N * (N - 1), 16)
    H = normalized_benign_transform(B, ds)
    t00, t10, t11 = corner_polynomials(B, H)
    A = sp.Poly(t10.as_expr() - t00.as_expr(), Z)
    D = sp.Poly(t00.as_expr() - 2 * t10.as_expr() + t11.as_expr(), Z)
    denominator = circle_wronskian(A, D, radius_squared)
    s_numerator = sp.Poly(
        -circle_wronskian(t00, D, radius_squared).as_expr(), X
    )
    p_numerator = circle_wronskian(t00, A, radius_squared)

    # Exact rational x-grid.  Each retained projection has y>0 because the
    # circle membership test is strict and exact.  This is evidence only; the
    # remaining theorem is the continuum exclusion in every rank.
    grid_denominator = 16
    max_numerator = int(sp.floor(sp.sqrt(radius_squared) * grid_denominator))
    projections = [
        sp.Rational(numerator, grid_denominator)
        for numerator in range(-max_numerator, max_numerator + 1)
        if sp.Rational(numerator**2, grid_denominator**2) < radius_squared
    ]
    singular_count = 0
    feasible_count = 0
    violation_counts = {
        "p_below_zero": 0,
        "p_above_one": 0,
        "s_below_zero": 0,
        "s_above_one_plus_p": 0,
        "negative_discriminant": 0,
    }
    for projection in projections:
        den_value = sp.Rational(denominator.eval(projection))
        s_value = sp.Rational(s_numerator.eval(projection))
        p_value = sp.Rational(p_numerator.eval(projection))
        if den_value == 0:
            singular_count += 1
            continue
        s_parameter = s_value / den_value
        p_parameter = p_value / den_value
        violations = {
            "p_below_zero": p_parameter < 0,
            "p_above_one": p_parameter > 1,
            "s_below_zero": s_parameter < 0,
            "s_above_one_plus_p": s_parameter > 1 + p_parameter,
            "negative_discriminant": s_parameter**2 < 4 * p_parameter,
        }
        for label, violated in violations.items():
            violation_counts[label] += int(bool(violated))
        feasible_count += int(
            feasible_symmetric_parameters(den_value, s_value, p_value)
        )

    assert singular_count == 0
    assert feasible_count == 0

    return {
        "rank": rank,
        "B": B,
        "N": N,
        "negative_parameters": [str(value) for value in ds],
        "fixed_radius_squared": str(radius_squared),
        "H_primitive_sha256": hashlib.sha256(
            str(sp.primitive(H.as_expr(), Z)[1]).encode("utf-8")
        ).hexdigest(),
        "rational_projection_grid_denominator": grid_denominator,
        "rational_projection_count": len(projections),
        "singular_projection_count": singular_count,
        "feasible_projection_count": feasible_count,
        "violation_counts": violation_counts,
        "circle_system_degrees": {
            "denominator": denominator.degree(),
            "s_numerator": s_numerator.degree(),
            "p_numerator": p_numerator.degree(),
        },
        "circle_system_primitive_sha256": {
            label: hashlib.sha256(
                str(sp.primitive(poly.as_expr(), X)[1]).encode("utf-8")
            ).hexdigest()
            for label, poly in (
                ("denominator", denominator),
                ("s_numerator", s_numerator),
                ("p_numerator", p_numerator),
            )
        },
    }


def main() -> None:
    # Symbolic three-corner convex decomposition.  h0,h1,h2 stand for
    # H(z), H(z-1), H(z-2), so this identity is independent of degree.
    u, v, B, z, h0, h1, h2 = sp.symbols("u v B z h0 h1 h2")
    first = u * (z + B + 1) * h0 + (4 - u) * z * h1
    first_shift = u * (z + B) * h1 + (4 - u) * (z - 1) * h2
    general = sp.expand(v * (z + B) * first + (4 - v) * z * first_shift)

    def value_at(a: int, b: int) -> sp.Expr:
        return sp.expand(general.subs({u: a, v: b}))

    t00 = value_at(0, 0)
    t10 = value_at(1, 0)
    t01 = value_at(0, 1)
    t11 = value_at(1, 1)
    assert sp.expand(t10 - t01) == 0
    convex = sp.expand(
        (1 - u) * (1 - v) * t00
        + (u * (1 - v) + v * (1 - u)) * t10
        + u * v * t11
    )
    assert sp.expand(general - convex) == 0

    # Exact ratio behind the analytic T00/T10 half-plane theorem.
    H0, H1, H2 = sp.symbols("H0 H1 H2", nonzero=True)
    C00 = 16 * z * (z - 1) * H2
    C10 = 4 * z * ((z + B) * H1 + 3 * (z - 1) * H2)
    ratio_remainder = sp.factor(
        C10 / C00
        - sp.Rational(3, 4)
        - (z + B) * H1 / (4 * (z - 1) * H2)
    )
    assert ratio_remainder == 0

    cases: list[dict[str, object]] = []
    for rank in range(1, 8):
        cases.append(
            exact_case(
                3 * rank + 4,
                [sp.Rational(1, 1000)] * rank,
            )
        )
        cases.append(
            exact_case(
                3 * rank + 7,
                [
                    sp.Integer(1000)
                    if index % 2 == 0
                    else sp.Rational(1, 1000)
                    for index in range(rank)
                ],
            )
        )
        cases.append(
            exact_case(
                4 * rank + 9,
                [
                    sp.Rational(index + 1, rank + 2 - index)
                    for index in range(rank)
                ],
            )
        )

    # Symbolic Cramer's-rule reduction.  cross(a,b)=Im(a*conjugate(b)).
    ar, ai, dr, di, tr, ti, s, p = sp.symbols(
        "ar ai dr di tr ti s p", real=True
    )
    denominator = sp.expand(ai * dr - ar * di)
    s_numerator = sp.expand(tr * di - ti * dr)
    p_numerator = sp.expand(ti * ar - tr * ai)
    assert sp.cancel(
        (tr + s * ar + p * dr).subs(
            {s: s_numerator / denominator, p: p_numerator / denominator}
        )
    ) == 0
    assert sp.cancel(
        (ti + s * ai + p * di).subs(
            {s: s_numerator / denominator, p: p_numerator / denominator}
        )
    ) == 0

    payload = {
        "kind": "fixed_ambient_reachable_weight_feasibility_exact_audit",
        "date": "2026-08-09",
        "status": "PASS_EXACT_REACHABLE_WEIGHT_REDUCTION_AND_FINITE_GRID_AUDIT",
        "scope": (
            "all-rank algebraic reduction plus finite exact rational-projection "
            "audit; not a continuum or all-rank proof"
        ),
        "convex_weights": [
            "(1-u)(1-v)",
            "u(1-v)+v(1-u)",
            "uv",
        ],
        "analytic_first_corner": (
            "T10/T00=3/4+(z+B)H(z-1)/(4(z-1)H(z-2)).  The nonconstant "
            "ratio has interlacing real zeros and poles when H has positive "
            "mesh at least one, hence negative imaginary part in the upper "
            "half-plane and Im(T00*conj(T10))>0."
        ),
        "reachable_parameter_conditions": [
            "0<=p<=1",
            "0<=s<=1+p",
            "s^2>=4p",
        ],
        "remaining_feasibility_lemma": (
            "For structured H and every -R<x<R on "
            "R^2=N(N-1)/16, prove that the circle-Wronskian candidate "
            "(s,p) violates at least one reachable-parameter condition."
        ),
        "case_count": len(cases),
        "rank_range": [1, 7],
        "cases": cases,
    }
    REPORT.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    print(payload["status"])
    print(f"case_count={payload['case_count']}")
    print(f"report={REPORT}")


if __name__ == "__main__":
    main()
