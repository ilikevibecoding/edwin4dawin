#!/usr/bin/env python3
"""Canonical-field certificate probe for the new right gap01 H2 payments."""

from __future__ import annotations

import hashlib
import json
import math
import os
import pickle
from fractions import Fraction
from pathlib import Path

from sympy.polys.domains import QQ
from sympy.polys.fields import field

from probe_uniform_low_high_right_gap01_normalized_lift_root import (
    PRODUCTS,
    build_gap1_basis,
    product_coefficient,
)


HERE = Path(__file__).resolve().parent
OUTPUT = HERE / "uniform_low_high_right_gap01_h2_field_probe_root_20260827.json"
DEPENDENCIES = {
    "probe_uniform_low_high_right_gap01_normalized_lift_root.py":
        "446CD87FB6D5EA9D84B2927FEE6E198A677FE01E4EDF8852B242481A42441CC8",
    "uniform_low_high_right_gap01_normalized_lift_probe_root_20260827.json":
        "5C4AE307561634F6E583FEE6F2C3FC4C1333465E09C6BAB39235C2B202DC8501",
    "uniform_low_high_right_gap1_slack_exact_root_20260827.json":
        "AB958CE36ED840E4CA9A10B70979BAEA464113B1632D4BBA1E2E86FB881D0684",
    "uniform_low_high_right_gap1_rows_interpolation_audit_root_20260827.json":
        "598A179F63D5CB1354B79EDAB1469B57FEBD2E8A2571B28163FA29AC450E9088",
    "uniform_low_high_right_gap1_payments_sparse_audit_root_20260827.json":
        "087A2A14F69F349E550F118F91AA24C1A7CAD32904ED82AF922C981E7DD9591D",
    "uniform_low_high_right_gap0_slack_independent_audit_root_20260827.json":
        "57ACB1006AE195F36710BBD5BB411EF6937AAA157413C464FFE0439784D90F4B",
    "uniform_low_high_right_gap1_right_payments_exact_root_20260827.json":
        "EDD5C780AEAAC98E98AE874213473AFA2D22F0B170DE1B8BAAAE78ECC2EF5309",
    "uniform_low_high_right_gap1_s4_product_coefficients_root.pkl":
        "FC9F9CB888F044B8DC39DC5EB2940191CE3FFE2B53BBEE9F14FEF3354B87D4CF",
}


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def ordered_hash(values) -> str:
    return hashlib.sha256(
        "\n".join(str(value) for value in values).encode("ascii")
    ).hexdigest().upper()


def promote(field_object, value):
    return (
        field_object.from_expr(value.as_expr())
        if hasattr(value, "as_expr") else field_object(value)
    )


def outer_coefficients(value, coefficient_field):
    if value == 0:
        return [coefficient_field.zero]
    assert value.denom.degree() == 0
    denominator = value.denom[(0,)]
    result = [coefficient_field.zero for _ in range(value.numer.degree() + 1)]
    for (power,), coefficient in value.numer.terms():
        result[power] = coefficient / denominator
    return result


def raw_rows(base_field, k, x, y):
    slack_field, s = field("s", base_field)
    N, M, left_high, whole, tail = build_gap1_basis(k, x, y, s)
    left_high = {
        basis: tuple(promote(slack_field, value) for value in row)
        for basis, row in left_high.items()
    }
    whole = {
        basis: tuple(promote(slack_field, value) for value in row)
        for basis, row in whole.items()
    }
    tail = {
        basis: tuple(promote(slack_field, value) for value in row)
        for basis, row in tail.items()
    }
    rho = M + 1 + s
    reduced_whole = {
        basis: tuple((whole[basis][i] - left_high[basis][i]) / rho
                     for i in range(3))
        for basis in ("T", "L", "R")
    }
    reduced_tail = {
        basis: tuple((tail[basis][i] - left_high[basis][i]) / rho
                     for i in range(3))
        for basis in ("T", "L", "R")
    }
    rows = {
        product: outer_coefficients(
            product_coefficient(
                *product, reduced_whole, reduced_tail, N - 2
            ),
            base_field,
        )
        for product in PRODUCTS
    }
    assert max(len(row) for row in rows.values()) == 3
    return rows


def positive_summary(label, value):
    numerator_values = [coefficient for _, coefficient in value.numer.terms()]
    denominator_values = [coefficient for _, coefficient in value.denom.terms()]
    negative_numerator = sum(coefficient < 0 for coefficient in numerator_values)
    negative_denominator = sum(coefficient < 0 for coefficient in denominator_values)
    print(
        label,
        "NUM", len(numerator_values), "NEG", negative_numerator,
        "MIN", min(numerator_values),
        "DEN", len(denominator_values), "DEN_NEG", negative_denominator,
        "DEN_MIN", min(denominator_values),
        flush=True,
    )
    assert numerator_values and negative_numerator == 0
    assert all(coefficient > 0 for coefficient in numerator_values)
    assert denominator_values and negative_denominator == 0
    assert all(coefficient > 0 for coefficient in denominator_values)
    return {
        "numerator_terms": len(numerator_values),
        "numerator_minimum": str(min(numerator_values)),
        "numerator_ordered_coefficients_sha256": ordered_hash(numerator_values),
        "denominator_terms": len(denominator_values),
        "denominator_minimum": str(min(denominator_values)),
        "denominator_ordered_coefficients_sha256": ordered_hash(denominator_values),
    }


def coefficient_row(rank, terminal, gap0=0, gap1=0):
    ratios = [terminal + rank + 1 + gap0 + gap1,
              terminal + rank - 1 + gap1]
    ratios.extend(terminal + rank - index for index in range(2, rank + 1))
    coefficients = [1]
    for ratio in ratios:
        coefficients.append(coefficients[-1] * ratio)
    return ratios, coefficients


def convolution(first, second, degree):
    return sum(
        math.comb(degree, index) * first[index] * second[degree - index]
        for index in range(degree + 1)
    )


def direct_strong(rank, x, y, gap0, gap1):
    left_ratios, left = coefficient_row(rank, x)
    _, right = coefficient_row(rank, y, gap0=gap0, gap1=gap1)
    left_tail = [0, 0, 0, *left[3:]]
    whole = [convolution(left, right, degree)
             for degree in (rank - 1, rank, rank + 1)]
    tail = [convolution(left_tail, right, degree)
            for degree in (rank - 1, rank, rank + 1)]
    return (
        left_ratios[2] * (
            whole[1] ** 2 - whole[0] * whole[2] - whole[0] * whole[1]
        )
        + 2 * whole[1] * tail[1]
        - whole[0] * tail[2] - whole[2] * tail[0]
        - whole[0] * tail[1] - whole[1] * tail[0]
    )


def main() -> int:
    dependency_hashes = {}
    for name, expected in DEPENDENCIES.items():
        actual = sha256(HERE / name)
        assert actual == expected, (name, actual)
        dependency_hashes[name] = actual
    expected_statuses = {
        "uniform_low_high_right_gap01_normalized_lift_probe_root_20260827.json":
            "PASS_EXACT_RIGHT_GAP01_UNIVERSAL_QUADRATIC_LIFT_IDENTITY",
        "uniform_low_high_right_gap1_slack_exact_root_20260827.json":
            "PASS_EXACT_ALL_RANK_RIGHT_GAP1_SLACK_STRONG_BOUNDARY",
        "uniform_low_high_right_gap1_rows_interpolation_audit_root_20260827.json":
            "PASS_INDEPENDENT_EXACT_RIGHT_GAP1_ROWS_TENSOR_INTERPOLATION_AUDIT",
        "uniform_low_high_right_gap1_payments_sparse_audit_root_20260827.json":
            "PASS_INDEPENDENT_EXACT_ALL_RANK_RIGHT_GAP1_PAYMENTS_SPARSE_AUDIT",
        "uniform_low_high_right_gap0_slack_independent_audit_root_20260827.json":
            "PASS_INDEPENDENT_EXACT_ALL_RANK_RIGHT_GAP0_SLACK_AUDIT",
        "uniform_low_high_right_gap1_right_payments_exact_root_20260827.json":
            "PASS_EXACT_ALL_RANK_RIGHT_GAP1_RIGHT_PRODUCT_PAYMENTS",
    }
    for name, expected in expected_statuses.items():
        report = json.loads((HERE / name).read_text(encoding="utf-8"))
        assert report["status"] == expected, name

    certificates = {"x_at_least_y": {}, "y_at_least_x": {}}

    # The T*R/R^2 part of each new coefficient is a positive multiple of the
    # accepted s^4 right-payment block.
    generic, kg, xg, yg = field("k,x,y", QQ)
    generic_rows = raw_rows(generic, kg, xg, yg)
    Ng, Mg, Dg = kg + xg, kg + yg, (kg + yg) ** 2 - 1
    with (HERE / "uniform_low_high_right_gap1_s4_product_coefficients_root.pkl").open("rb") as stream:
        cache4 = pickle.load(stream)
    target_symbols = {"k": kg.as_expr(), "x": xg.as_expr(), "y": yg.as_expr()}
    cache4 = {
        product: generic.from_expr(expression.xreplace({
            symbol: target_symbols[str(symbol)]
            for symbol in expression.free_symbols
        }))
        for product, expression in cache4.items()
    }
    right_factors = ((Mg - 1) ** 2, 2 * (Mg - 1), generic.one)
    for product in (("T", "R"), ("R", "R")):
        common = cache4[product] / ((Ng * Mg) ** 2 * Dg**2)
        for degree, factor_value in enumerate(right_factors):
            assert generic_rows[product][degree] == factor_value * common
    right_relation = {
        "identity": (
            "For gap1 degrees 0,1,2 the raw gap0-quadratic T*R and R^2 "
            "rows are respectively (M-1)^2, 2(M-1), 1 times the accepted "
            "s4 right-payment row divided by the common positive scale."
        ),
        "sign_input": "beta4*T*R-delta4*R^2>0 from the pinned right-payment certificate",
    }

    # Region x>=y: write k=u+8 and x=y+z.
    high, u, y, z = field("u,y,z", QQ)
    kh, xh, yh = u + 8, y + z, y
    high_rows = raw_rows(high, kh, xh, yh)
    Nh, Mh = kh + xh, kh + yh
    lower_u = sum(
        math.prod(kh - 1 - index for index in range(power))
        * (Mh / Nh) ** power / math.factorial(power)
        for power in range(4)
    )
    for degree in (1, 2):
        alpha = high_rows[("T", "L")][degree]
        epsilon = high_rows[("L", "L")][degree]
        gamma = -high_rows[("L", "R")][degree]
        certificates["x_at_least_y"][f"degree_{degree}_drop_negative_gamma"] = positive_summary(
            f"HIGH_D{degree}_DROP_POSITIVE_GAMMA",
            alpha * lower_u + epsilon,
        )
        certificates["x_at_least_y"][f"degree_{degree}_gamma_reserve"] = positive_summary(
            f"HIGH_D{degree}_GAMMA_RESERVE",
            alpha * lower_u + epsilon - gamma * (Mh / Nh) ** 7,
        )

    # Region y>=x: write k=u+8 and y=x+z.
    low, ul, x, zl = field("u,x,z", QQ)
    kl, xl, yl = ul + 8, x, x + zl
    low_rows = raw_rows(low, kl, xl, yl)
    Nl, Ml = kl + xl, kl + yl
    lower_v = sum(
        math.prod(kl - 1 - index for index in range(power))
        * (Nl / Ml) ** power / math.factorial(power)
        for power in range(4)
    )
    epsilon1 = low_rows[("L", "L")][1]
    epsilon2 = low_rows[("L", "L")][2]
    certificates["y_at_least_x"]["degree_1_negative_epsilon"] = positive_summary(
        "LOW_D1_NEGATIVE_EPSILON", -epsilon1
    )
    certificates["y_at_least_x"]["degree_2_positive_epsilon"] = positive_summary(
        "LOW_D2_POSITIVE_EPSILON", epsilon2
    )
    for degree in (1, 2):
        alpha = low_rows[("T", "L")][degree]
        epsilon = low_rows[("L", "L")][degree]
        gamma = -low_rows[("L", "R")][degree]
        reserve = (
            alpha * lower_v + epsilon - gamma
            if degree == 1 else alpha * lower_v - gamma
        )
        certificates["y_at_least_x"][f"degree_{degree}_reserve"] = positive_summary(
            f"LOW_D{degree}_RESERVE", reserve
        )

    direct_checks = []
    for rank, xv, yv, sv in (
        (8, 0, 0, 1), (8, 3, 11, 29), (11, 1, 100, 43),
        (15, 29, 2, 5), (23, 7, 31, 71),
    ):
        _, Mv, av, cv, vv = build_gap1_basis(
            Fraction(rank), Fraction(xv), Fraction(yv), Fraction(sv)
        )
        rho = Mv + 1 + sv
        reduced_whole = {
            basis: tuple((cv[basis][i] - av[basis][i]) / rho
                         for i in range(3))
            for basis in ("T", "L", "R")
        }
        reduced_tail = {
            basis: tuple((vv[basis][i] - av[basis][i]) / rho
                         for i in range(3))
            for basis in ("T", "L", "R")
        }
        numeric_rows = {
            product: product_coefficient(
                *product, reduced_whole, reduced_tail, rank + xv - 2
            )
            for product in PRODUCTS
        }
        weights = {
            "T": math.prod(xv + yv + rank + j for j in range(2, rank + 1)),
            "L": math.prod(xv + j for j in range(2, rank + 1)),
            "R": math.prod(yv + j for j in range(2, rank + 1)),
        }
        reconstructed = sum(
            numeric_rows[product] * weights[product[0]] * weights[product[1]]
            for product in PRODUCTS
        )
        values = [direct_strong(rank, xv, yv, gap0, sv) for gap0 in range(3)]
        direct_quadratic = Fraction(values[2] - 2 * values[1] + values[0], 2)
        assert reconstructed == direct_quadratic and direct_quadratic > 0
        direct_checks.append({
            "rank": rank, "x": xv, "y": yv, "right_gap1_slack": sv,
            "raw_right_gap0_quadratic_coefficient": str(direct_quadratic),
        })

    payload = {
        "schema": "uniform-low-high-right-gap01-h2-field-probe-root-v1",
        "status": "PASS_EXACT_ALL_RANK_RIGHT_GAP01_H2_PAYMENT_CERTIFICATE",
        "theorem": (
            "For every integer k>=8 and real x,y,s>=0, the quadratic H2 "
            "coefficient produced by a normalized right gap0 lift over the "
            "right gap1 boundary is strictly positive."
        ),
        "factorization": (
            "H2=(y+k+1+s)^2*(G0+s*G1+s^2*G2), with the prefactor positive."
        ),
        "constant_term": (
            "G0>0 by the pinned independent right-gap0 audit over the zero-slack face."
        ),
        "right_product_relation": right_relation,
        "left_product_certificates": certificates,
        "ratio_bounds": {
            "both_regions": (
                "T/L or T/R is bounded below by the cubic truncation of "
                "(1+ratio)^(k-1)."
            ),
            "x_at_least_y": "R/L<=((y+k)/(x+k))^7",
            "y_at_least_x": "L/R<=1",
        },
        "direct_exact_reconstruction_checks": direct_checks,
        "dependencies_sha256": dependency_hashes,
        "source_sha256": sha256(Path(__file__)),
        "scope_warning": (
            "This certifies the new H2 payment needed for simultaneous right "
            "gap0+gap1 slack.  The theorem assembler and an independent audit "
            "remain separate artifacts."
        ),
    }
    temporary = OUTPUT.with_suffix(OUTPUT.suffix + ".tmp")
    temporary.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    os.replace(temporary, OUTPUT)

    print("PASS_EXACT_RIGHT_GAP01_H2_CANONICAL_FIELD_PAYMENT_PROBE", flush=True)
    print("SOURCE", payload["source_sha256"], flush=True)
    print("REPORT", sha256(OUTPUT), flush=True)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
