"""Certify the four all-order interval controls using FLINT exact arithmetic."""

from __future__ import annotations

import argparse
import hashlib
import json
from pathlib import Path

import sympy as sp

from certify_tail_collision_quarter_lemma import certify_polynomial
from derive_tail_collision_quarter_lemma import (
    C,
    R,
    U,
    V,
    interval_positive_scaling_factors,
    iter_interval_bernstein_controls,
    load_values,
)
from flint_multivariate_rational import FlintRational
from prove_one_sided_adjacent_cubic_darboux_inertia import bernstein_uv_coefficients
from prove_two_outlier_one_negative_factor import positive_rational_on_nonnegative_axis


HERE = Path(__file__).resolve().parent
VARIABLES = (R, U, V, C)


def convert(value: sp.Expr) -> FlintRational:
    return FlintRational.from_sympy(value, VARIABLES)


def expression_digest(value: sp.Expr) -> str:
    return hashlib.sha256(str(sp.cancel(value)).encode("utf-8")).hexdigest()


def short_axis_certificate(value: sp.Expr) -> dict[str, object]:
    certificate = positive_rational_on_nonnegative_axis(sp.cancel(value), R)
    return {
        "numerator_digest": certificate["numerator_digest"],
        "denominator_digest": certificate["denominator_digest"],
        "numerator_degree_r": len(certificate["numerator_coefficients_descending"]) - 1,
        "denominator_degree_r": len(certificate["denominator_coefficients_descending"]) - 1,
    }


def certify_quadratic_c_slices(value: sp.Expr) -> dict[str, object]:
    """Prove positivity by Bernstein in u,v and discriminants in c.

    Some middle c-power controls change sign as real functions of r, although
    the complete quadratic is positive.  For every u,v Bernstein index write
    the exact slice as A+B*c+D*c^2.  The three coefficientwise-positive
    certificates A>0, D>0 and 4*A*D-B^2>0 prove the slice positive for every
    real c, hence in particular for c>=0.
    """
    polynomial = sp.Poly(sp.expand(value), R, U, V, C, domain=sp.QQ)
    assert polynomial.degree(C) == 2
    denominator, controls = bernstein_uv_coefficients(value, R, U, V, C)
    assert denominator == 1
    table = dict(controls)
    slices = []
    for i in range(polynomial.degree(U) + 1):
        for j in range(polynomial.degree(V) + 1):
            first = sp.cancel(table[i, j, 0])
            middle = sp.cancel(table[i, j, 1])
            last = sp.cancel(table[i, j, 2])
            discriminant_gap = sp.expand(4 * first * last - middle**2)
            slices.append(
                {
                    "index_u_v": [i, j],
                    "constant": short_axis_certificate(first),
                    "leading": short_axis_certificate(last),
                    "four_ac_minus_b_squared": short_axis_certificate(discriminant_gap),
                    "middle_digest": expression_digest(middle),
                }
            )
    return {
        "degrees_r_u_v_c": list(polynomial.degree_list()),
        "power_term_count": len(polynomial.terms()),
        "uv_bernstein_slice_count": len(slices),
        "method": (
            "Tensor Bernstein in u,v; each c-slice A+B*c+D*c^2 has "
            "A>0, D>0, and 4*A*D-B^2>0 by nonnegative r-power coefficients."
        ),
        "slices": slices,
    }


def certify_cubic_c_slices(value: sp.Expr) -> dict[str, object]:
    """Prove each u,v Bernstein slice positive on c>=0.

    A slice with coefficientwise-positive c coefficients is immediate.  For
    every remaining slice, the constant and leading coefficients are positive
    and the cubic discriminant is negative.  Such a cubic has one real root;
    its root product shows that root is negative, so the slice is positive on
    the nonnegative c-axis.
    """
    polynomial = sp.Poly(sp.expand(value), R, U, V, C, domain=sp.QQ)
    assert polynomial.degree(C) == 3
    denominator, controls = bernstein_uv_coefficients(value, R, U, V, C)
    assert denominator == 1
    table = dict(controls)
    slices = []
    for i in range(polynomial.degree(U) + 1):
        for j in range(polynomial.degree(V) + 1):
            coefficients = [sp.cancel(table[i, j, k]) for k in range(4)]
            coefficient_certificates = []
            all_positive = True
            for coefficient in coefficients:
                try:
                    coefficient_certificates.append(short_axis_certificate(coefficient))
                except AssertionError:
                    all_positive = False
                    break
            if all_positive:
                slices.append(
                    {
                        "index_u_v": [i, j],
                        "method": "all four c-power coefficients positive",
                        "coefficients": coefficient_certificates,
                    }
                )
                continue
            cubic = sum(coefficients[k] * C**k for k in range(4))
            negative_discriminant = sp.expand(-sp.discriminant(cubic, C))
            slices.append(
                {
                    "index_u_v": [i, j],
                    "method": (
                        "positive constant and leading coefficients; negative "
                        "cubic discriminant; unique real root is negative"
                    ),
                    "constant": short_axis_certificate(coefficients[0]),
                    "leading": short_axis_certificate(coefficients[3]),
                    "negative_discriminant": short_axis_certificate(negative_discriminant),
                    "middle_digests": [
                        expression_digest(coefficients[1]),
                        expression_digest(coefficients[2]),
                    ],
                }
            )
    return {
        "degrees_r_u_v_c": list(polynomial.degree_list()),
        "power_term_count": len(polynomial.terms()),
        "uv_bernstein_slice_count": len(slices),
        "method": (
            "Tensor Bernstein in u,v; cubic c-slices are positive either "
            "coefficientwise or by a strictly negative discriminant."
        ),
        "slices": slices,
    }


def build_controls(
    values, threshold_value: sp.Rational = sp.Rational(1, 4)
) -> list[FlintRational]:
    converted = {name: convert(value) for name, value in values.items()}
    a0, a1, a2 = converted["a0"], converted["a1"], converted["a2"]
    b1 = converted["b1"]
    d0, d1, f = converted["d0"], converted["d1"], converted["f"]
    q1 = converted["_q1"]
    q2 = converted["_q2"]
    terminal = converted["_current_terminal"]
    delta = a0 - d0

    def trailing(y: FlintRational) -> FlintRational:
        return (y - q1) * (y - q2) - terminal * y / q1

    def trailing_derivative(y: FlintRational) -> FlintRational:
        return 2 * y - q1 - q2 - terminal / q1

    def collision(y: FlintRational) -> FlintRational:
        na = trailing(y)
        nh = y - d1
        return na * (delta * nh - f) + b1 * nh * (y - a2)

    def collision_derivative(y: FlintRational) -> FlintRational:
        na = trailing(y)
        nap = trailing_derivative(y)
        nh = y - d1
        return nap * (delta * nh - f) + na * delta + b1 * ((y - a2) + nh)

    threshold = FlintRational.constant(threshold_value)
    span = a2 - threshold
    endpoint0 = collision(threshold)
    endpoint1 = collision(a2)
    return [
        endpoint0,
        endpoint0 + span * collision_derivative(threshold) / 3,
        endpoint1 - span * collision_derivative(a2) / 3,
        endpoint1,
    ]


def build_lower_square_gap(values) -> FlintRational:
    """Return -4 Res(n_A,q_H) in its cancellation-safe quadratic form."""
    converted = {name: convert(value) for name, value in values.items()}
    a1, a2 = converted["a1"], converted["a2"]
    b2 = converted["b2"]
    d0, d1, f = converted["d0"], converted["d1"], converted["f"]
    trace = a1 + a2
    slope = trace - d0 - d1
    constant = d0 * d1 - f - a1 * a2 + b2
    determinant = a1 * a2 - b2
    return -4 * (
        constant**2 + slope * constant * trace + slope**2 * determinant
    )


def build_z_characteristic_scaled(values) -> FlintRational:
    """Return delta^2*n_A(d1+f/delta) in Cholesky coordinates."""
    converted = {name: convert(value) for name, value in values.items()}
    a0, d0 = converted["a0"], converted["d0"]
    d1, f = converted["d1"], converted["f"]
    q1, q2 = converted["_q1"], converted["_q2"]
    terminal = converted["_current_terminal"]
    delta = a0 - d0
    z_numerator = delta * d1 + f
    return (
        (z_numerator - delta * q1) * (z_numerator - delta * q2)
        - delta * terminal * z_numerator / q1
    )


def ordinary_rational_record(value: FlintRational) -> dict[str, object]:
    numerator, denominator = value.to_sympy_pair(VARIABLES)
    numerator_record = certify_polynomial(numerator)
    denominator_record = certify_polynomial(denominator)
    assert (
        denominator_record["strictly_positive_control_count"]
        == denominator_record["bernstein_control_count"]
    )
    return {
        "numerator": numerator_record,
        "denominator": denominator_record,
        "exact_engine": "python-flint fmpq_mpoly",
    }


def verify_specialized_builder(parity: str) -> None:
    values = load_values(parity, 0)
    flint_controls = build_controls(values)
    sympy_controls = list(iter_interval_bernstein_controls(values, sp.Rational(1, 4)))
    points = (
        (sp.Rational(1, 7), sp.Rational(2, 5), sp.Rational(1, 9)),
        (sp.Rational(1, 2), sp.Rational(4, 5), sp.Rational(1)),
        (sp.Rational(9, 10), sp.Rational(1, 3), sp.Rational(17, 4)),
        (sp.Rational(1), sp.Rational(1), sp.Rational(100)),
    )
    for index, (left, right) in enumerate(zip(flint_controls, sympy_controls)):
        for u_value, v_value, c_value in points:
            expected = sp.cancel(
                right.subs({U: u_value, V: v_value, C: c_value})
            )
            observed = left.evaluate((0, u_value, v_value, c_value))
            assert sp.Rational(observed.numerator, observed.denominator) == expected, (
                index,
                u_value,
                v_value,
                c_value,
            )


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--parity", choices=("odd", "even"), required=True)
    parser.add_argument("--verify-r0", action="store_true")
    args = parser.parse_args()
    if args.verify_r0:
        verify_specialized_builder(args.parity)
        print(f"verified specialized builder for {args.parity}", flush=True)

    output = HERE / f"tail_collision_quarter_lemma_{args.parity}_exact_20260806.json"
    report = json.loads(output.read_text(encoding="utf-8"))
    report["method"] = (
        "Exact FLINT multivariate rational reduction.  Tensor Bernstein in "
        "u,v; interval controls of c-degree two and three use exact slice "
        "discriminants, while the remaining controls are coefficientwise "
        "positive in c and r."
    )
    values = load_values(args.parity)
    if "z_characteristic_scaled" not in report["records"]:
        z_characteristic = build_z_characteristic_scaled(values)
        print(
            f"z_characteristic_scaled reduced term counts {z_characteristic.term_counts()}",
            flush=True,
        )
        report["records"]["z_characteristic_scaled"] = ordinary_rational_record(
            z_characteristic
        )
        output.write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
        print("saved z_characteristic_scaled", flush=True)

    scale_values = interval_positive_scaling_factors(values)
    scales = [convert(value) for value in scale_values]
    for index, (scale_value, scale) in enumerate(zip(scale_values, scales)):
        name = f"quarter_interval_scale_d{index}"
        if name in report["records"]:
            continue
        print(f"{name} reduced term counts {scale.term_counts()}", flush=True)
        report["records"][name] = ordinary_rational_record(scale)
        output.write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
        print(f"saved {name}", flush=True)
    interval_names = [f"quarter_interval_bernstein_{index}" for index in range(4)]
    if any(name not in report["records"] for name in interval_names):
        print("building four controls with FLINT", flush=True)
        controls = build_controls(values)
    else:
        controls = [None] * 4
    for index, control in enumerate(controls):
        name = f"quarter_interval_bernstein_{index}"
        if name in report["records"]:
            print(f"reusing {name}", flush=True)
            continue
        assert control is not None
        scaled = control * scales[0] * scales[1] * scales[2] ** index
        print(f"{name} reduced term counts {scaled.term_counts()}", flush=True)
        numerator, denominator = scaled.to_sympy_pair(VARIABLES)
        if index == 0:
            numerator_record = certify_quadratic_c_slices(numerator)
        elif index == 1:
            numerator_record = certify_cubic_c_slices(numerator)
        else:
            numerator_record = certify_polynomial(numerator)
        denominator_record = certify_polynomial(denominator)
        assert (
            denominator_record["strictly_positive_control_count"]
            == denominator_record["bernstein_control_count"]
        )
        report["records"][name] = {
            "numerator": numerator_record,
            "denominator": denominator_record,
            "exact_engine": "python-flint fmpq_mpoly",
        }
        output.write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
        print(f"saved {name}", flush=True)
    lower_name = "lower_tail_square_gap"
    if lower_name not in report["records"]:
        lower_gap = build_lower_square_gap(values)
        print(f"{lower_name} reduced term counts {lower_gap.term_counts()}", flush=True)
        numerator, denominator = lower_gap.to_sympy_pair(VARIABLES)
        numerator_record = certify_polynomial(numerator)
        denominator_record = certify_polynomial(denominator)
        assert (
            denominator_record["strictly_positive_control_count"]
            == denominator_record["bernstein_control_count"]
        )
        report["records"][lower_name] = {
            "numerator": numerator_record,
            "denominator": denominator_record,
            "exact_engine": "python-flint fmpq_mpoly",
            "identity": "-4*(M^2+L*M*T+L^2*(a1*a2-b2))",
        }
        output.write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
        print(f"saved {lower_name}", flush=True)
    else:
        # Persist the updated method description even on a complete resume.
        output.write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    required_names = {
        "delta",
        "d1_minus_a2",
        "d1_inside_trailing_spectrum",
        "trailing_trace_gap",
        "lower_tail_square_gap",
        "z_minus_a1_scaled",
        "z_minus_a2_scaled",
        "z_characteristic_scaled",
        "quarter_interval_scale_d0",
        "quarter_interval_scale_d1",
        "quarter_interval_scale_d2",
        *(f"quarter_interval_bernstein_{index}" for index in range(4)),
    }
    if required_names.issubset(report["records"]):
        report["status"] = "EXACT_TAIL_COLLISION_QUARTER_LEMMA_INGREDIENTS"
        report["logical_implication"] = (
            "The structural signs classify equal-tail-inertia collisions into "
            "the lower ground branch and one upper interval.  The z-ceiling "
            "excludes the upper interval.  Positive denominator scalings and "
            "the four exact c-slice certificates exclude collisions on "
            "[1/4,a2].  Therefore every equal-tail-inertia collision is a "
            "tail ground-branch collision below 1/4."
        )
        output.write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    print(output, flush=True)


if __name__ == "__main__":
    main()
