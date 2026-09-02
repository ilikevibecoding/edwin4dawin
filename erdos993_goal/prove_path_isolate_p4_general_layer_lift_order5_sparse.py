#!/usr/bin/env python3
"""Certify Newton and factored-quotient order five by sparse algebra.

Let f_i be the normalized lift residual at s=i-1 and put
E=2c+2m+x-1.  Formal division of its Newton polynomial by
(1+z)^E gives the direct identity

  B_5 = sum_(i=0)^5 (-1)^(5-i) binom(E+5,5-i) f_i.

All f_i have a common positive m-denominator at the sixth boundary.
This script converts their common numerators to sparse ordinary
polynomials, forms A_5 and B_5 exactly, and certifies A_5 globally
and B_5 on the five cones partitioning c+m>=4.
"""

from __future__ import annotations

import hashlib
import json
import math
import argparse
from fractions import Fraction
from pathlib import Path

import sympy as sp


Monomial = tuple[int, int, int]
Polynomial = dict[Monomial, Fraction]


def add(
    target: Polynomial,
    source: Polynomial,
    scalar: Fraction = Fraction(1),
) -> None:
    for monomial, coefficient in source.items():
        value = target.get(monomial, Fraction(0)) + (
            scalar * coefficient
        )
        if value:
            target[monomial] = value
        elif monomial in target:
            del target[monomial]


def multiply(left: Polynomial, right: Polynomial) -> Polynomial:
    result: Polynomial = {}
    for (lc, lm, lx), left_coefficient in left.items():
        for (rc, rm, rx), right_coefficient in right.items():
            key = (lc + rc, lm + rm, lx + rx)
            result[key] = result.get(key, Fraction(0)) + (
                left_coefficient * right_coefficient
            )
    return {key: value for key, value in result.items() if value}


def from_sympy(
    expression: sp.Expr,
    c: sp.Symbol,
    m: sp.Symbol,
    x: sp.Symbol,
) -> Polynomial:
    polynomial = sp.Poly(sp.expand(expression), c, m, x)
    return {
        monomial: Fraction(
            int(coefficient.p), int(coefficient.q)
        )
        for monomial, coefficient in polynomial.terms()
    }


def binomial_polynomial(order: int) -> list[Fraction]:
    coefficients = [Fraction(1)]
    for root in range(order):
        updated = [Fraction(0)] * (len(coefficients) + 1)
        for power, coefficient in enumerate(coefficients):
            updated[power] -= root * coefficient
            updated[power + 1] += coefficient
        coefficients = updated
    divisor = math.factorial(order)
    return [coefficient / divisor for coefficient in coefficients]


def tensor_newton_to_ordinary(
    coefficient_items: list[dict],
) -> Polynomial:
    maximum_c = max(
        item["orders_c_m_x"][0] for item in coefficient_items
    )
    maximum_m = max(
        item["orders_c_m_x"][1] for item in coefficient_items
    )
    maximum_x = max(
        item["orders_c_m_x"][2] for item in coefficient_items
    )
    rows_c = [
        binomial_polynomial(order)
        for order in range(maximum_c + 1)
    ]
    rows_m = [
        binomial_polynomial(order)
        for order in range(maximum_m + 1)
    ]
    rows_x = [
        binomial_polynomial(order)
        for order in range(maximum_x + 1)
    ]
    result: Polynomial = {}
    for item in coefficient_items:
        order_c, order_m, order_x = item["orders_c_m_x"]
        scalar = Fraction(item["numerator"], item["denominator"])
        for power_c, coefficient_c in enumerate(rows_c[order_c]):
            if not coefficient_c:
                continue
            for power_m, coefficient_m in enumerate(rows_m[order_m]):
                if not coefficient_m:
                    continue
                for power_x, coefficient_x in enumerate(
                    rows_x[order_x]
                ):
                    if not coefficient_x:
                        continue
                    key = (power_c, power_m, power_x)
                    result[key] = result.get(
                        key, Fraction(0)
                    ) + (
                        scalar
                        * coefficient_c
                        * coefficient_m
                        * coefficient_x
                    )
    return {key: value for key, value in result.items() if value}


def common_numerators(
    order: int,
    parity: int,
    c: sp.Symbol,
    m: sp.Symbol,
    x: sp.Symbol,
) -> list[Polynomial]:
    first = 1 if parity == 0 else 2
    last = order + 4
    common_denominator = sp.prod(
        m + shift for shift in range(first, last + 1)
    )
    source = json.loads(
        Path(
            "path_isolate_p4_general_layer_lift_boundary_"
            "s3_20260730.json"
        ).read_text(encoding="utf-8")
    )
    values: dict[int, sp.Expr] = {
        -1: sp.Integer(0) if parity == 1 else None
    }
    for item in source["certificates"]:
        if item["parity_epsilon"] != parity:
            continue
        values[item["support_distance_s"]] = sp.sympify(
            item["lift_residual_over_central_binomial"],
            locals={"c": c, "m": m, "x": x},
        )

    result = []
    for support in range(-1, min(3, order - 1) + 1):
        print(
            f"clearing denominator epsilon={parity}, s={support}",
            flush=True,
        )
        cleared = sp.cancel(
            common_denominator * values[support]
        )
        result.append(from_sympy(cleared, c, m, x))

    for support in range(4, order):
        interpolation = json.loads(
            Path(
                f"path_isolate_p4_boundary_s{support}_newton_"
                "interpolation_20260730.json"
            ).read_text(encoding="utf-8")
        )
        support_report = next(
            report
            for report in interpolation["reports"]
            if report["parity_epsilon"] == parity
        )
        print(
            f"converting s={support} tensor basis, "
            f"epsilon={parity}",
            flush=True,
        )
        polynomial = tensor_newton_to_ordinary(
            support_report["coefficients"]
        )
        support_last = support + 5
        if support_last < last:
            ratio = from_sympy(
                sp.prod(
                    m + shift
                    for shift in range(support_last + 1, last + 1)
                ),
                c,
                m,
                x,
            )
            polynomial = multiply(polynomial, ratio)
        result.append(polynomial)
    return result


def weight_polynomial(
    order: int,
    parity_sign: int,
    choose_order: int,
    c: sp.Symbol,
    m: sp.Symbol,
    x: sp.Symbol,
) -> Polynomial:
    e_value = 2 * c + 2 * m + x - 1
    if choose_order == 0:
        expression = sp.Integer(parity_sign)
    else:
        expression = parity_sign * sp.prod(
            e_value + order - root
            for root in range(choose_order)
        ) / sp.factorial(choose_order)
    return from_sympy(expression, c, m, x)


def substitute_cone(
    polynomial: Polynomial,
    fixed_c: int | None,
    m_shift: int,
) -> Polynomial:
    """Use c=fixed_c or c=4+C, and m=m_shift+M."""

    result: Polynomial = {}
    for (power_c, power_m, power_x), coefficient in polynomial.items():
        if fixed_c is None:
            c_parts = [
                (
                    new_power_c,
                    Fraction(
                        math.comb(power_c, new_power_c)
                        * 4 ** (power_c - new_power_c)
                    ),
                )
                for new_power_c in range(power_c + 1)
            ]
        else:
            c_parts = [
                (0, Fraction(fixed_c**power_c))
            ]
        for new_power_c, c_factor in c_parts:
            for new_power_m in range(power_m + 1):
                m_factor = Fraction(
                    math.comb(power_m, new_power_m)
                    * m_shift ** (power_m - new_power_m)
                )
                key = (
                    new_power_c,
                    new_power_m,
                    power_x,
                )
                result[key] = result.get(
                    key, Fraction(0)
                ) + coefficient * c_factor * m_factor
    return {key: value for key, value in result.items() if value}


def certificate(polynomial: Polynomial) -> dict:
    negative = [
        (monomial, coefficient)
        for monomial, coefficient in polynomial.items()
        if coefficient < 0
    ]
    canonical = "\n".join(
        f"{monomial}:{coefficient.numerator}/{coefficient.denominator}"
        for monomial, coefficient in sorted(polynomial.items())
    )
    degree = [
        max((monomial[index] for monomial in polynomial), default=0)
        for index in range(3)
    ]
    minimum = min(polynomial.values(), default=Fraction(0))
    return {
        "degree_list": degree,
        "term_count": len(polynomial),
        "smallest_coefficient": {
            "numerator": minimum.numerator,
            "denominator": minimum.denominator,
        },
        "negative_coefficient_count": len(negative),
        "first_negative_terms": [
            {
                "monomial": list(monomial),
                "numerator": coefficient.numerator,
                "denominator": coefficient.denominator,
            }
            for monomial, coefficient in negative[:20]
        ],
        "sha256": hashlib.sha256(
            canonical.encode("utf-8")
        ).hexdigest(),
    }


def power_to_newton(power: int) -> list[int]:
    """Coefficients of n^power in the basis binom(n,k)."""

    # k! S(power,k).
    stirling = [0] * (power + 1)
    stirling[0] = 1
    for exponent in range(power):
        updated = [0] * (power + 1)
        for order, value in enumerate(stirling):
            if not value:
                continue
            updated[order] += order * value
            if order + 1 <= power:
                updated[order + 1] += value
        stirling = updated
    return [
        stirling[order] * math.factorial(order)
        for order in range(power + 1)
    ]


def ordinary_to_newton(polynomial: Polynomial) -> Polynomial:
    maximum = [
        max(
            (monomial[index] for monomial in polynomial),
            default=0,
        )
        for index in range(3)
    ]
    rows = [
        [
            power_to_newton(power)
            for power in range(maximum[index] + 1)
        ]
        for index in range(3)
    ]
    result: Polynomial = {}
    for (power_c, power_m, power_x), coefficient in polynomial.items():
        for order_c, factor_c in enumerate(rows[0][power_c]):
            if not factor_c:
                continue
            for order_m, factor_m in enumerate(rows[1][power_m]):
                if not factor_m:
                    continue
                for order_x, factor_x in enumerate(rows[2][power_x]):
                    if not factor_x:
                        continue
                    key = (order_c, order_m, order_x)
                    result[key] = result.get(
                        key, Fraction(0)
                    ) + coefficient * factor_c * factor_m * factor_x
    return {key: value for key, value in result.items() if value}


def shift_coordinate(
    polynomial: Polynomial,
    coordinate: int,
    shift: int,
) -> Polynomial:
    result: Polynomial = {}
    for monomial, coefficient in polynomial.items():
        power = monomial[coordinate]
        for new_power in range(power + 1):
            shifted = list(monomial)
            shifted[coordinate] = new_power
            key = tuple(shifted)
            result[key] = result.get(key, Fraction(0)) + (
                coefficient
                * math.comb(power, new_power)
                * shift ** (power - new_power)
            )
    return {key: value for key, value in result.items() if value}


def fix_coordinate(
    polynomial: Polynomial,
    coordinate: int,
    value: int,
) -> Polynomial:
    result: Polynomial = {}
    for monomial, coefficient in polynomial.items():
        power = monomial[coordinate]
        fixed = list(monomial)
        fixed[coordinate] = 0
        key = tuple(fixed)
        result[key] = result.get(key, Fraction(0)) + (
            coefficient * value**power
        )
    return {key: coefficient for key, coefficient in result.items() if coefficient}


def evaluate_coordinate(
    polynomial: Polynomial,
    coordinate: int,
    value: int,
) -> Fraction:
    fixed = fix_coordinate(polynomial, coordinate, value)
    if any(any(power for power in monomial) for monomial in fixed):
        raise ValueError("polynomial was not univariate in the fixed coordinate")
    return sum(fixed.values(), Fraction(0))


def refine_c_zero_cone(polynomial: Polynomial) -> dict:
    """Prove a c=0 cone by an M tail and finitely many x tails."""

    maximum_shift = 60
    m_tail = None
    for shift in range(maximum_shift + 1):
        shifted = shift_coordinate(polynomial, 1, shift)
        item = certificate(ordinary_to_newton(shifted))
        if item["negative_coefficient_count"] == 0:
            m_tail = {
                "M_shift": shift,
                "meaning": f"m >= {4 + shift}",
                "tensor_Newton_certificate": item,
            }
            break
    if m_tail is None:
        return {
            "status": "FAIL_NO_M_TAIL",
            "maximum_shift": maximum_shift,
        }

    fixed_m_records = []
    failures = []
    for m_offset in range(m_tail["M_shift"]):
        univariate = fix_coordinate(polynomial, 1, m_offset)
        x_tail = None
        for x_shift in range(maximum_shift + 1):
            shifted = shift_coordinate(univariate, 2, x_shift)
            item = certificate(ordinary_to_newton(shifted))
            if item["negative_coefficient_count"] == 0:
                x_tail = {
                    "x_shift": x_shift,
                    "tensor_Newton_certificate": item,
                }
                break
        if x_tail is None:
            failures.append(
                {
                    "m": 4 + m_offset,
                    "kind": "no_x_tail",
                }
            )
            continue
        initial_values = []
        for x_value in range(x_tail["x_shift"]):
            value = evaluate_coordinate(univariate, 2, x_value)
            initial_values.append(
                {
                    "x": x_value,
                    "numerator": value.numerator,
                    "denominator": value.denominator,
                }
            )
            if value < 0:
                failures.append(
                    {
                        "m": 4 + m_offset,
                        "x": x_value,
                        "kind": "negative_initial_value",
                        "numerator": value.numerator,
                        "denominator": value.denominator,
                    }
                )
        fixed_m_records.append(
            {
                "m": 4 + m_offset,
                **x_tail,
                "initial_values": initial_values,
            }
        )
    return {
        "status": (
            "PASS_REFINED_C_ZERO_CONE"
            if not failures
            else "FAIL_REFINED_C_ZERO_CONE"
        ),
        "m_tail": m_tail,
        "fixed_m_records": fixed_m_records,
        "failure_count": len(failures),
        "first_failures": failures[:20],
    }


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--order", type=int, default=5)
    args = parser.parse_args()
    order = args.order
    if order < 1:
        raise ValueError("order must be positive")

    c, m, x = sp.symbols(
        "c m x", integer=True, nonnegative=True
    )
    records = []
    unresolved_quotient_cases = 0
    refinements = []
    for parity in (0, 1):
        values = common_numerators(order, parity, c, m, x)

        raw_order_polynomial: Polynomial = {}
        quotient_order_polynomial: Polynomial = {}
        for index, value in enumerate(values):
            add(
                raw_order_polynomial,
                value,
                Fraction(
                    (-1) ** (order - index)
                    * math.comb(order, index)
                ),
            )
            weight = weight_polynomial(
                order,
                (-1) ** (order - index),
                order - index,
                c,
                m,
                x,
            )
            add(
                quotient_order_polynomial,
                multiply(value, weight),
            )

        raw_certificate = certificate(raw_order_polynomial)
        raw_certificate.update(
            {
                "kind": f"raw_newton_order{order}",
                "parity_epsilon": parity,
                "domain": "c,m,x>=0",
            }
        )
        records.append(raw_certificate)

        cones = [
            ("c=0,m=4+M", 0, 4),
            ("c=1,m=3+M", 1, 3),
            ("c=2,m=2+M", 2, 2),
            ("c=3,m=1+M", 3, 1),
            ("c=4+C,m=M", None, 0),
        ]
        for cone_name, fixed_c, m_shift in cones:
            print(
                f"certifying epsilon={parity}, cone={cone_name}",
                flush=True,
            )
            for kind, source_polynomial in (
                (
                    f"raw_newton_order{order}",
                    raw_order_polynomial,
                ),
                (
                    f"quotient_order{order}",
                    quotient_order_polynomial,
                ),
            ):
                cone = substitute_cone(
                    source_polynomial, fixed_c, m_shift
                )
                ordinary = certificate(cone)
                ordinary.update(
                    {
                        "kind": kind,
                        "basis": "ordinary_monomial",
                        "parity_epsilon": parity,
                        "domain": cone_name,
                    }
                )
                records.append(ordinary)
                newton = certificate(
                    ordinary_to_newton(cone)
                )
                newton.update(
                    {
                        "kind": kind,
                        "basis": "tensor_Newton",
                        "parity_epsilon": parity,
                        "domain": cone_name,
                    }
                )
                records.append(newton)
                if (
                    kind == f"quotient_order{order}"
                    and newton["negative_coefficient_count"] > 0
                ):
                    if fixed_c == 0 and m_shift == 4:
                        refinement = refine_c_zero_cone(cone)
                        refinement.update(
                            {
                                "kind": kind,
                                "parity_epsilon": parity,
                                "domain": cone_name,
                            }
                        )
                        refinements.append(refinement)
                        if refinement["status"] != (
                            "PASS_REFINED_C_ZERO_CONE"
                        ):
                            unresolved_quotient_cases += 1
                    else:
                        unresolved_quotient_cases += 1

    report = {
        "status": (
            "PASS_PATH_ISOLATE_P4_GENERAL_LAYER_LIFT_"
            f"ORDER{order}_SPARSE"
            if unresolved_quotient_cases == 0
            else "FAIL_PATH_ISOLATE_P4_GENERAL_LAYER_LIFT_"
            f"ORDER{order}_SPARSE"
        ),
        "identity": (
            f"B{order}=sum_i=0^{order} "
            f"(-1)^({order}-i) "
            f"binom(E+{order},{order}-i) f(i-1), "
            "E=2c+2m+x-1"
        ),
        "common_denominators": {
            "even": f"product(m+i,i=1..{order + 4})",
            "odd": f"product(m+i,i=2..{order + 4})",
        },
        "unresolved_quotient_case_count": (
            unresolved_quotient_cases
        ),
        "records": records,
        "refined_c_zero_certificates": refinements,
    }
    Path(
        f"path_isolate_p4_general_layer_lift_order{order}_"
        "sparse_20260730.json"
    ).write_text(
        json.dumps(report, indent=2) + "\n",
        encoding="utf-8",
    )
    print(json.dumps(report, indent=2))
    if unresolved_quotient_cases:
        raise SystemExit(1)


if __name__ == "__main__":
    main()
