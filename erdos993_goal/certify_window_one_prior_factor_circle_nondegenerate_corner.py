"""Exact blow-up audit for the nondegenerate second-stage corner.

The ordinary quartic resultant certificate has a compactification family at

    a -> 1, 15*p*t+p+t-1 -> 0,

where a=1-10/L.  The exact chart below covers

    0<=u<=1, 0<=v<=1

throughout the full root-parameter square.  Its terminal equality occurs at
u=v=1 and p=t=1/5.  Set h=15pt+p+t-1 and use

    t=(1-p+h)/(1+15p).

There are two exact projective charts:

    upper:       0<=u,v<=1,       1/8<=p<=1/4,
    lower_tail:  1/2<=u,v<=1,        0<=p<=1/8.

The second chart closes the one-sided compactification edge at
`p=1/8`; the ordinary global subdivision handles the complementary
lower-parameter region.  In each chart this program first certifies that
any local zero N=0 has

    -2(1-a) <= h <= 0.

It then blows up the corner with r=-h/(1-a), 0<r<2, divides the transformed
resultant by 1-a, and certifies W>=0 on the resulting compact N=0 chart.
All accepted inequalities use exact integer Bernstein arithmetic.
"""

from __future__ import annotations

import argparse
import hashlib
import json
import math
import time
from collections import Counter
from dataclasses import dataclass
from fractions import Fraction
from pathlib import Path

import numpy as np
import sympy as sp
from scipy.optimize import linprog

from certify_pf_length3_repeated_positive_root_orientation import elevate_tensor_to_shape
from certify_pf_length3_uniform_inner_orientation import midpoint_split_exact
from certify_window_one_prior_factor_circle_schur_boundary import (
    bounds,
    build_polynomials,
    controls_for,
    nonnegative_modulo_constraint,
)


HERE = Path(__file__).resolve().parent
DEFAULT_OUTPUT = (
    HERE / "window_one_prior_factor_circle_nondegenerate_corner_exact_20260809.json"
)


@dataclass
class Cell:
    controls: dict[str, np.ndarray]
    depth: tuple[int, int, int, int, int]
    address: str


def strict_sign(array: np.ndarray) -> int:
    low, high = bounds(array)
    if low > 0:
        return 1
    if high < 0:
        return -1
    return 0


def transform_controls(
    expression: sp.Expr,
    variables: tuple[sp.Symbol, ...],
) -> tuple[np.ndarray, dict]:
    polynomial = sp.Poly(sp.expand(expression), *variables, domain=sp.QQ)
    return controls_for(polynomial)


def restrict_to_chart(array: np.ndarray, chart: str) -> np.ndarray:
    if chart == "upper":
        return array
    if chart != "lower_tail":
        raise ValueError(f"unknown corner chart: {chart}")
    # U,V are the actual root parameters, while P/8 is p in the lower
    # chart.  Taking the right Bernstein half on the root-parameter axes
    # gives U,V>=1/2 exactly; the entire lower p interval is retained.
    result = array
    for axis in (1, 2):
        _, result = midpoint_split_exact(result, axis)
    return result


def build_corner_data(chart: str) -> tuple[dict[str, np.ndarray], dict]:
    projected, parent_derivation = build_polynomials()
    a, u, v, p, t, h = sp.symbols("a u v p t h")
    A, U, V, P, H = sp.symbols("A U V P H")
    denominator = 1 + 15 * p
    t_of_h = (1 - p + h) / denominator

    transformed = {}
    transformed_denominators = {}
    for name in ("N", "W"):
        numerator, positive_denominator = sp.cancel(
            projected[name].as_expr().subs(t, t_of_h)
        ).as_numer_denom()
        # The denominator is a positive power of 1+15p on 0<=p<=1.
        coefficient, factors = sp.factor_list(sp.factor(positive_denominator))
        assert coefficient > 0
        assert all(factor == denominator and exponent >= 0 for factor, exponent in factors)
        transformed[name] = sp.expand(numerator)
        transformed_denominators[name] = str(sp.factor(positive_denominator))

    N_h = transformed["N"]
    N0_over_height = sp.cancel(N_h.subs(h, 0) / (1 - a))
    assert sp.denom(N0_over_height) == 1
    N_minus_2_height = sp.cancel(N_h.subs(h, -2 * (1 - a)) / (1 - a))
    assert sp.denom(N_minus_2_height) == 1
    derivative = sp.diff(N_h, h)

    if chart == "upper":
        p_chart = sp.Rational(1, 8) + P / 8
        p_old = P
        local_chart = (
            "7/8<=a<=1, 0<=u,v<=1, 1/8<=p<=1/4; "
            "-1/4<=h<=7/16"
        )
    elif chart == "lower_tail":
        p_chart = P / 8
        # The multiplier identities were derived in the coordinate
        # p=(1+P_old)/8.
        p_old = P - 1
        local_chart = (
            "7/8<=a<=1, 1/2<=u,v<=1, 0<=p<=1/8; "
            "-1/4<=h<=7/16"
        )
    else:
        raise ValueError(f"unknown corner chart: {chart}")

    local_base = {
        a: sp.Rational(7, 8) + A / 8,
        u: U,
        v: V,
        p: p_chart,
    }
    audit_specs = {
        "N_at_h0_over_1ma": (N0_over_height.subs(local_base), 1),
        "N_at_h_minus_2ma_over_1ma": (N_minus_2_height.subs(local_base), -1),
        "dNdh_negative_strip": (
            derivative.subs({**local_base, h: -H / 4}),
            1,
        ),
        "dNdh_positive_strip": (
            derivative.subs({**local_base, h: sp.Rational(7, 16) * H}),
            1,
        ),
    }
    inequality_audits = {}
    for name, (expression, expected_sign) in audit_specs.items():
        variables_for_audit = (A, U, V, P, H)
        signed_expression = expected_sign * expression
        controls, metadata = transform_controls(signed_expression, variables_for_audit)
        signed = restrict_to_chart(controls, chart)
        minimum = min(map(int, signed.flat))
        assert minimum >= 0
        finite_a_margin = None
        if minimum == 0:
            if chart == "lower_tail":
                # At p=0 the zero face is allowed to attain equality.  The
                # closed wedge is enough because the blow-up certificate
                # includes R=0 and R=1; strict localization is not used on
                # this chart.
                finite_a_margin = {
                    "epsilon": None,
                    "identity": (
                        "coefficientwise nonnegative on the closed chart; "
                        "endpoint equality is retained in the blow-up"
                    ),
                }
            else:
                for exponent in range(13):
                    epsilon = sp.Rational(1, 10**exponent)
                    strict_controls, strict_metadata = transform_controls(
                        signed_expression - epsilon * (1 - A),
                        variables_for_audit,
                    )
                    strict_controls = restrict_to_chart(strict_controls, chart)
                    strict_minimum = min(map(int, strict_controls.flat))
                    if strict_minimum >= 0:
                        finite_a_margin = {
                            "epsilon": str(epsilon),
                            "identity": (
                                "signed_expression >= epsilon*(1-A) = "
                                "8*epsilon*(1-a), hence strict for finite L"
                            ),
                            "polynomial": strict_metadata,
                            "minimum_control": strict_minimum,
                            "maximum_control": max(map(int, strict_controls.flat)),
                        }
                        break
                assert finite_a_margin is not None
        inequality_audits[name] = {
            "expected_sign": expected_sign,
            "polynomial": metadata,
            "minimum_signed_control": minimum,
            "maximum_signed_control": max(map(int, signed.flat)),
            "finite_a_strict_margin": finite_a_margin,
        }

    # Blow up h=-(1-a)r with 0<=r<=2.  D is the unit coordinate for
    # 8(1-a), and R is the unit coordinate for r/2.
    D, R = sp.symbols("D R")
    blowup = {
        a: 1 - D / 8,
        u: U,
        v: V,
        p: p_chart,
        h: -D * R / 4,
    }
    N_bar = sp.cancel(transformed["N"].subs(blowup) / D)
    assert sp.denom(N_bar) == 1
    W_bar = sp.expand(transformed["W"].subs(blowup))
    variables = (D, U, V, P, R)
    n_controls, n_metadata = transform_controls(N_bar, variables)
    w_controls, w_metadata = transform_controls(W_bar, variables)
    # U=u and V=v, so 8u+8=8U+8 and 8v+8=8V+8.
    F_polynomial = sp.expand((8 * U + 8) * (8 * V + 8) * W_bar - 200 * D * N_bar)
    f_guard, f_metadata = transform_controls(F_polynomial, variables)
    F_boundary = sp.factor(F_polynomial.subs(D, 0))
    expected_F_boundary = sp.factor(
        sp.Rational(15625, 65536)
        * (3 * p_old + 11) ** 2
        * (5 * p_old - 3) ** 2
        * (8 * U + 8)
        * (8 * V + 8)
        * (64 * U * V - 64) ** 2
    )
    assert sp.factor(F_boundary - expected_F_boundary) == 0
    G_polynomial = sp.cancel((F_polynomial - F_boundary) / D)
    assert sp.denom(G_polynomial) == 1
    g_guard, g_metadata = transform_controls(G_polynomial, variables)
    curve_linear_polynomial = (5 * p_old - 3) ** 2 * (
        3 * D + 80 * (2 - U - V)
    )
    J_polynomial = sp.expand(
        4 * (3 * p_old + 11) ** 2 * G_polynomial
        + 96 * (5 * p_old - 3) * (15 * p_old + 119) * N_bar
        - 1875 * (3 * p_old + 11) ** 4 * curve_linear_polynomial
    )
    j_guard, j_metadata = transform_controls(J_polynomial, variables)
    target_shape = tuple(
        max(first, second, third, fourth, fifth)
        for first, second, third, fourth, fifth in zip(
            n_controls.shape,
            w_controls.shape,
            f_guard.shape,
            g_guard.shape,
            j_guard.shape,
        )
    )
    n_controls = elevate_tensor_to_shape(n_controls, target_shape, exact=True)
    w_controls = elevate_tensor_to_shape(w_controls, target_shape, exact=True)
    d_guard, _ = transform_controls(D, variables)
    square_guard, _ = transform_controls((5 * p_old - 3) ** 2, variables)
    tangent_square_guard, tangent_square_metadata = transform_controls(
        (3 * D + 40 * (2 - U - V)) ** 2, variables
    )
    curve_linear_guard, curve_linear_metadata = transform_controls(
        curve_linear_polynomial, variables
    )
    d_guard = elevate_tensor_to_shape(d_guard, target_shape, exact=True)
    square_guard = elevate_tensor_to_shape(square_guard, target_shape, exact=True)
    tangent_square_guard = elevate_tensor_to_shape(
        tangent_square_guard, target_shape, exact=True
    )
    curve_linear_guard = elevate_tensor_to_shape(
        curve_linear_guard, target_shape, exact=True
    )
    f_guard = elevate_tensor_to_shape(f_guard, target_shape, exact=True)
    g_guard = elevate_tensor_to_shape(g_guard, target_shape, exact=True)
    j_guard = elevate_tensor_to_shape(j_guard, target_shape, exact=True)
    controls = {
        "N": n_controls,
        "W": w_controls,
        "N_for_W": n_controls.copy(),
        "D_guard": d_guard,
        "square_guard": square_guard,
        "tangent_square_guard": tangent_square_guard,
        "curve_linear_guard": curve_linear_guard,
        "F_guard": f_guard,
        "G_guard": g_guard,
        "J_guard": j_guard,
    }
    controls = {
        name: restrict_to_chart(array, chart) for name, array in controls.items()
    }

    derivation = {
        "chart": chart,
        "parent_derivation": parent_derivation,
        "h": "15*p*t+p+t-1",
        "t_of_h": "(1-p+h)/(1+15*p)",
        "local_chart": local_chart,
        "transformed_positive_denominators": transformed_denominators,
        "inequality_audits": inequality_audits,
        "blowup": (
            "a=1-D/8, u=U, v=V, p=(1+P)/8, h=-D*R/4"
            if chart == "upper"
            else "a=1-D/8, u=U, v=V, p=P/8, h=-D*R/4"
        ),
        "blowup_range": "0<=D,U,V,P,R<=1, corresponding to 0<=r<=2",
        "N_bar_sha256": hashlib.sha256(str(sp.expand(N_bar)).encode("utf-8")).hexdigest(),
        "W_bar_sha256": hashlib.sha256(str(sp.expand(W_bar)).encode("utf-8")).hexdigest(),
        "N_bar": n_metadata,
        "W_bar": w_metadata,
        "F_guard": f_metadata,
        "F_identity": "F=(8U+8)(8V+8)W_bar-200D*N_bar",
        "F_boundary": str(F_boundary),
        "G_guard": g_metadata,
        "G_identity": "F=F_boundary+D*G",
        "limiting_point": (
            "D=0,U=V=1,P=3/5,R=8/25"
            if chart == "upper"
            else "the p=1/5 equality is outside the lower-tail chart"
        ),
        "leading_G_quadratic": (
            "65536*(3D+40(2-U-V))^2"
            if chart == "upper"
            else "not needed: 5*p-1 is bounded away from zero"
        ),
        "tangent_square_guard": tangent_square_metadata,
        "curve_linear_guard": curve_linear_metadata,
        "J_guard": j_metadata,
        "J_identity": (
            "write P_old=8p-1; "
            "J=4(3P_old+11)^2*G+"
            "96(5P_old-3)(15P_old+119)*N_bar-"
            "1875(3P_old+11)^4*curve_linear"
        ),
        "bernstein_tensor_shape": list(target_shape),
    }
    return controls, derivation


def scaled_float(value: int, exponent: int) -> float:
    if value == 0:
        return 0.0
    magnitude = abs(value)
    shift = max(0, magnitude.bit_length() - 53)
    result = math.ldexp(float(magnitude >> shift), shift - exponent)
    return -result if value < 0 else result


def exact_guarded_nonnegative(
    controls: dict[str, np.ndarray],
    lam: Fraction,
    alpha: Fraction,
    beta: Fraction,
) -> bool:
    common = math.lcm(lam.denominator, alpha.denominator, beta.denominator)
    coefficients = [
        value.numerator * (common // value.denominator)
        for value in (lam, alpha, beta)
    ]
    arrays = (
        controls["W"],
        controls["N"],
        controls["D_guard"],
        controls["square_guard"],
    )
    for target, n_value, d_value, square_value in zip(*(array.flat for array in arrays)):
        remainder = (
            common * int(target)
            - coefficients[0] * int(n_value)
            - coefficients[1] * int(d_value)
            - coefficients[2] * int(square_value)
        )
        if remainder < 0:
            return False
    return True


def guarded_nonnegative(controls: dict[str, np.ndarray]) -> bool:
    """Propose and exactly verify W-lambda*N-alpha*D-beta*(5P-3)^2 >= 0."""

    arrays = (
        controls["W"],
        controls["N"],
        controls["D_guard"],
        controls["square_guard"],
    )
    integer_rows = list(zip(*(array.flat for array in arrays)))
    matrix = np.empty((len(integer_rows), 4), dtype=float)
    target = np.empty(len(integer_rows), dtype=float)
    for index, row in enumerate(integer_rows):
        row = tuple(map(int, row))
        exponent = max(max(abs(value).bit_length() for value in row), 1)
        target[index] = scaled_float(row[0], exponent)
        matrix[index, :3] = [scaled_float(value, exponent) for value in row[1:]]
        matrix[index, 3] = 1.0
    proposal = linprog(
        c=np.array([0.0, 0.0, 0.0, -1.0]),
        A_ub=matrix,
        b_ub=target,
        bounds=[(None, None), (0.0, None), (0.0, None), (None, None)],
        method="highs",
        options={"presolve": True},
    )
    if not proposal.success:
        return False
    base_candidates = [
        tuple(Fraction(float(value)) for value in proposal.x[:3]),
        tuple(Fraction(str(float(value))) for value in proposal.x[:3]),
    ]
    for lam, alpha, beta in base_candidates:
        for scale in (Fraction(1), Fraction(999, 1000), Fraction(9, 10), Fraction(1, 2)):
            alpha_scaled, beta_scaled = scale * alpha, scale * beta
            if alpha_scaled >= 0 and beta_scaled >= 0 and exact_guarded_nonnegative(
                controls, lam, alpha_scaled, beta_scaled
            ):
                return True
    return False


def exact_F_guarded_nonnegative(
    controls: dict[str, np.ndarray], alpha: Fraction, beta: Fraction
) -> bool:
    common = math.lcm(alpha.denominator, beta.denominator)
    ai = alpha.numerator * (common // alpha.denominator)
    bi = beta.numerator * (common // beta.denominator)
    arrays = (controls["F_guard"], controls["D_guard"], controls["square_guard"])
    for target, d_value, square_value in zip(*(array.flat for array in arrays)):
        if common * int(target) - ai * int(d_value) - bi * int(square_value) < 0:
            return False
    return True


def F_guarded_nonnegative(controls: dict[str, np.ndarray]) -> bool:
    """Propose and exactly verify F-alpha*D-beta*(5P-3)^2 >= 0."""

    arrays = (controls["F_guard"], controls["D_guard"], controls["square_guard"])
    integer_rows = list(zip(*(array.flat for array in arrays)))
    matrix = np.empty((len(integer_rows), 3), dtype=float)
    target = np.empty(len(integer_rows), dtype=float)
    for index, row in enumerate(integer_rows):
        row = tuple(map(int, row))
        exponent = max(max(abs(value).bit_length() for value in row), 1)
        target[index] = scaled_float(row[0], exponent)
        matrix[index, :2] = [scaled_float(value, exponent) for value in row[1:]]
        matrix[index, 2] = 1.0
    proposal = linprog(
        c=np.array([0.0, 0.0, -1.0]),
        A_ub=matrix,
        b_ub=target,
        bounds=[(0.0, None), (0.0, None), (None, None)],
        method="highs",
        options={"presolve": True},
    )
    if not proposal.success:
        return False
    base_candidates = [
        tuple(Fraction(float(value)) for value in proposal.x[:2]),
        tuple(Fraction(str(float(value))) for value in proposal.x[:2]),
    ]
    for alpha, beta in base_candidates:
        for scale in (Fraction(1), Fraction(999, 1000), Fraction(9, 10), Fraction(1, 2)):
            alpha_scaled, beta_scaled = scale * alpha, scale * beta
            if alpha_scaled >= 0 and beta_scaled >= 0 and exact_F_guarded_nonnegative(
                controls, alpha_scaled, beta_scaled
            ):
                return True
    # Zero-slack certificates are often exact vertices.  Reconstruct them
    # from pairs of the most nearly active integer inequalities rather than
    # trusting a rounded floating-point vertex.
    residual = target - matrix[:, 0] * proposal.x[0] - matrix[:, 1] * proposal.x[1]
    active = np.argsort(residual)[: min(32, len(integer_rows))]
    for position, first_index in enumerate(active):
        f_first, d_first, s_first = map(int, integer_rows[int(first_index)])
        for second_index in active[position + 1 :]:
            f_second, d_second, s_second = map(int, integer_rows[int(second_index)])
            determinant = d_first * s_second - d_second * s_first
            if determinant == 0:
                continue
            alpha = Fraction(
                f_first * s_second - f_second * s_first,
                determinant,
            )
            beta = Fraction(
                d_first * f_second - d_second * f_first,
                determinant,
            )
            if alpha >= 0 and beta >= 0 and exact_F_guarded_nonnegative(
                controls, alpha, beta
            ):
                return True
    return False


def exact_G_curve_guarded_nonnegative(
    controls: dict[str, np.ndarray],
    lam: Fraction,
    alpha: Fraction,
    beta: Fraction,
) -> bool:
    common = math.lcm(lam.denominator, alpha.denominator, beta.denominator)
    li = lam.numerator * (common // lam.denominator)
    ai = alpha.numerator * (common // alpha.denominator)
    bi = beta.numerator * (common // beta.denominator)
    arrays = (
        controls["G_guard"],
        controls["N_for_W"],
        controls["curve_linear_guard"],
        controls["tangent_square_guard"],
    )
    for target, n_value, curve_value, square_value in zip(
        *(array.flat for array in arrays)
    ):
        if (
            common * int(target)
            - li * int(n_value)
            - ai * int(curve_value)
            - bi * int(square_value)
            < 0
        ):
            return False
    return True


def determinant3(rows: tuple[tuple[int, int, int], ...]) -> int:
    (a, b, c), (d, e, f), (g, h, i) = rows
    return a * (e * i - f * h) - b * (d * i - f * g) + c * (d * h - e * g)


def G_curve_guarded_nonnegative(controls: dict[str, np.ndarray]) -> bool:
    """Exactly verify G-lambda*N-alpha*C-beta*T^2>=0, alpha,beta>=0."""

    arrays = (
        controls["G_guard"],
        controls["N_for_W"],
        controls["curve_linear_guard"],
        controls["tangent_square_guard"],
    )
    integer_rows = list(zip(*(array.flat for array in arrays)))
    matrix = np.empty((len(integer_rows), 3), dtype=float)
    target = np.empty(len(integer_rows), dtype=float)
    for index, row in enumerate(integer_rows):
        row = tuple(map(int, row))
        exponent = max(max(abs(value).bit_length() for value in row), 1)
        target[index] = scaled_float(row[0], exponent)
        matrix[index, :] = [scaled_float(value, exponent) for value in row[1:]]
    proposal = linprog(
        c=np.array([0.0, -1.0, -1.0]),
        A_ub=matrix,
        b_ub=target,
        bounds=[(None, None), (0.0, None), (0.0, None)],
        method="highs",
        options={"presolve": True},
    )
    if not proposal.success:
        return False
    candidates = (
        tuple(Fraction(float(value)) for value in proposal.x[:3]),
        tuple(Fraction(str(float(value))) for value in proposal.x[:3]),
    )
    for lam, alpha, beta in candidates:
        for scale in (
            Fraction(1),
            Fraction(999, 1000),
            Fraction(9, 10),
            Fraction(1, 2),
            Fraction(1, 10),
        ):
            alpha_scaled, beta_scaled = scale * alpha, scale * beta
            if (
                alpha_scaled >= 0
                and beta_scaled >= 0
                and exact_G_curve_guarded_nonnegative(
                    controls, lam, alpha_scaled, beta_scaled
                )
            ):
                return True
    residual = target - matrix @ proposal.x[:3]
    active = np.argsort(residual)[: min(24, len(integer_rows))]
    for position, first_index in enumerate(active):
        first = tuple(map(int, integer_rows[int(first_index)]))
        for second_position, second_index in enumerate(
            active[position + 1 :], start=position + 1
        ):
            second = tuple(map(int, integer_rows[int(second_index)]))
            for third_index in active[second_position + 1 :]:
                third = tuple(map(int, integer_rows[int(third_index)]))
                coefficient_rows = tuple(row[1:] for row in (first, second, third))
                determinant = determinant3(coefficient_rows)
                if determinant == 0:
                    continue
                rhs = (first[0], second[0], third[0])
                lam = Fraction(
                    determinant3(tuple((rhs[i], row[1], row[2]) for i, row in enumerate(coefficient_rows))),
                    determinant,
                )
                alpha = Fraction(
                    determinant3(tuple((row[0], rhs[i], row[2]) for i, row in enumerate(coefficient_rows))),
                    determinant,
                )
                beta = Fraction(
                    determinant3(tuple((row[0], row[1], rhs[i]) for i, row in enumerate(coefficient_rows))),
                    determinant,
                )
                if (
                    alpha >= 0
                    and beta >= 0
                    and exact_G_curve_guarded_nonnegative(
                        controls, lam, alpha, beta
                    )
                ):
                    return True
    return False


def leaf_reason(
    controls: dict[str, np.ndarray], depth: tuple[int, int, int, int, int]
) -> str | None:
    sign = strict_sign(controls["N"])
    if sign > 0:
        return "N>0"
    if sign < 0:
        return "N<0"
    if nonnegative_modulo_constraint(controls["W"], controls["N_for_W"]):
        return "W>=0_on_N=0"
    if guarded_nonnegative(controls):
        return "W>=alpha*D+beta*(5P-3)^2_on_N=0"
    if F_guarded_nonnegative(controls):
        return "F>=alpha*D+beta*(5P-3)^2_on_N=0"
    if nonnegative_modulo_constraint(controls["G_guard"], controls["N_for_W"]):
        return "G>=0_on_N=0_and_F=F_boundary+D*G"
    if bounds(controls["J_guard"])[0] >= 0:
        return "J>=0_exact_polynomial_multiplier"
    if nonnegative_modulo_constraint(
        controls["J_guard"], controls["N_for_W"]
    ):
        return "J>=0_on_N=0_exact_polynomial_multiplier"
    return None


def choose_axis(controls: dict[str, np.ndarray], depth: tuple[int, ...]) -> int:
    scores = []
    for axis in range(5):
        variation = 0
        for name in ("N", "W"):
            current = max(abs(int(value)) for value in np.diff(controls[name], axis=axis).flat)
            variation = max(variation, current.bit_length() if current else 0)
        scores.append(variation - depth[axis])
    return max(range(5), key=lambda axis: scores[axis])


def certify_chart(
    chart: str, max_cells: int, max_depth: int, progress_every: int
) -> dict:
    started = time.monotonic()
    controls, derivation = build_corner_data(chart)
    stack = [Cell(controls, (0, 0, 0, 0, 0), "")]
    reasons: Counter[str] = Counter()
    deepest = [0, 0, 0, 0, 0]
    unresolved = None
    processed = 0
    while stack:
        cell = stack.pop()
        processed += 1
        if progress_every and processed % progress_every == 0:
            print(
                json.dumps(
                    {
                        "chart": chart,
                        "processed": processed,
                        "stack": len(stack),
                        "leaves": sum(reasons.values()),
                        "leaf_reasons": dict(reasons),
                        "deepest": deepest,
                        "elapsed_seconds": round(time.monotonic() - started, 3),
                    }
                ),
                flush=True,
            )
        if processed > max_cells:
            unresolved = {"reason": "max_cells", "address": cell.address, "depth": cell.depth}
            break
        reason = leaf_reason(cell.controls, cell.depth)
        if reason:
            reasons[reason] += 1
            continue
        if sum(cell.depth) >= max_depth:
            unresolved = {"reason": "max_depth", "address": cell.address, "depth": cell.depth}
            break
        axis = choose_axis(cell.controls, cell.depth)
        children = [dict(), dict()]
        for name, array in cell.controls.items():
            children[0][name], children[1][name] = midpoint_split_exact(array, axis)
        next_depth = list(cell.depth)
        next_depth[axis] += 1
        deepest[axis] = max(deepest[axis], next_depth[axis])
        stack.append(Cell(children[1], tuple(next_depth), cell.address + f"{axis}R"))
        stack.append(Cell(children[0], tuple(next_depth), cell.address + f"{axis}L"))

    return {
        "status": (
            "PASS_EXACT_CHART" if unresolved is None else "INCOMPLETE"
        ),
        "claim": (
            "Every local N=0 point lies in the closed wedge "
            "-2(1-a)<=h<=0, and after the blow-up r=-h/(1-a), "
            "W>=0 on N=0."
        ),
        "processed_cells": processed,
        "certified_leaves": sum(reasons.values()),
        "leaf_reasons": dict(reasons),
        "deepest": deepest,
        "derivation": derivation,
        "unresolved": unresolved,
        "elapsed_seconds": round(time.monotonic() - started, 3),
    }


def certify(max_cells: int, max_depth: int, progress_every: int) -> dict:
    started = time.monotonic()
    chart_reports = {
        chart: certify_chart(chart, max_cells, max_depth, progress_every)
        for chart in ("upper", "lower_tail")
    }
    unresolved = {
        chart: report["unresolved"]
        for chart, report in chart_reports.items()
        if report["unresolved"] is not None
    }
    reasons: Counter[str] = Counter()
    deepest = [0, 0, 0, 0, 0]
    for report in chart_reports.values():
        reasons.update(report["leaf_reasons"])
        deepest = [
            max(current, candidate)
            for current, candidate in zip(deepest, report["deepest"])
        ]
    return {
        "status": (
            "PASS_EXACT_NONDEGENERATE_SECOND_STAGE_CORNER"
            if not unresolved
            else "INCOMPLETE"
        ),
        "claim": (
            "On both exact projective charts, every local N=0 point lies "
            "in -2(1-a)<=h<=0, and after the blow-up r=-h/(1-a), "
            "W>=0 on N=0."
        ),
        "coverage": {
            "upper": (
                "7/8<=a<=1, 0<=u,v<=1, 1/8<=p<=1/4, "
                "-1/4<=h<=7/16"
            ),
            "lower_tail": (
                "7/8<=a<=1, 1/2<=u,v<=1, 0<=p<=1/8, "
                "-1/4<=h<=7/16"
            ),
        },
        "processed_cells": sum(
            report["processed_cells"] for report in chart_reports.values()
        ),
        "certified_leaves": sum(
            report["certified_leaves"] for report in chart_reports.values()
        ),
        "leaf_reasons": dict(reasons),
        "deepest": deepest,
        "charts": chart_reports,
        "unresolved": unresolved or None,
        "elapsed_seconds": round(time.monotonic() - started, 3),
    }


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--max-cells", type=int, default=100_000)
    parser.add_argument("--max-depth", type=int, default=220)
    parser.add_argument("--progress-every", type=int, default=500)
    parser.add_argument("--output", type=Path, default=DEFAULT_OUTPUT)
    args = parser.parse_args()
    report = certify(args.max_cells, args.max_depth, args.progress_every)
    args.output.write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(report, indent=2))


if __name__ == "__main__":
    main()
