#!/usr/bin/env python3
"""Exact certificate for one negative factor in the two-outlier lemma.

For ``0 <= u,v <= 1`` and ``c > 0`` put

    Gamma(t) = (1-u*t)(1-v*t)(t+c).

At the sharp reserve boundary ``p-alpha=9`` the binomial-window image has
the form

    K = V0*p_n + V1*p_(n-1) + V2*p_(n-2) + V3*p_(n-3)

in the monic Jacobi basis associated with the even/odd palindromic lift.
After division by V0, K is the characteristic polynomial of a real
symmetric Jacobi matrix provided its one modified terminal squared coupling
is positive.  Clearing its manifestly positive denominator gives

    R = b_l*V0^2*b_p^2 - V2*V0*b_p^2 + V3*V1*b_p
        + V3*V0*(a_p-a_l)*b_p - V3^2.

This script derives R exactly in both parities, changes from the power basis
to the tensor Bernstein basis of bidegree (2,2) in (u,v), and certifies each
of the 27 resulting coefficients (three powers of c at each of nine tensor
indices) by coefficientwise positivity as a rational function of r>=0.
No floating-point arithmetic is admitted.

The boundary theorem propagates to every ``p-alpha>=9`` by the classical
Euler multiplier operators relating adjacent shifted-binomial windows.
"""

from __future__ import annotations

import argparse
import hashlib
import json
import math
import random
from fractions import Fraction
from pathlib import Path

import sympy as sp

from probe_two_outlier_gamma_binomial_window import (
    direct_transform,
    negative_root_count,
)


HERE = Path(__file__).resolve().parent
REPORT = HERE / "two_outlier_one_negative_factor_theorem_20260805.json"


def ff(x: sp.Expr, h: int) -> sp.Expr:
    """Falling factorial, kept as an exact factored product."""
    return sp.prod((x - j for j in range(h)), start=sp.Integer(1))


def exact_quotient(numerator: sp.Expr, denominator: sp.Expr) -> sp.Expr:
    value = sp.cancel(sp.sympify(numerator) / sp.sympify(denominator))
    assert not value.atoms(sp.Float)
    return value


def coefficient_digest(poly: sp.Poly) -> str:
    payload = ";".join(
        f"{','.join(map(str, monomial))}:{coefficient}"
        for monomial, coefficient in poly.terms()
    )
    return hashlib.sha256(payload.encode("utf-8")).hexdigest()


def positive_rational_on_nonnegative_axis(
    value: sp.Expr, variable: sp.Symbol
) -> dict[str, object]:
    """Return an exact coefficientwise positivity certificate."""
    assert not value.atoms(sp.Float)
    numerator, denominator = sp.fraction(sp.cancel(value))
    numerator_poly = sp.Poly(sp.expand(numerator), variable, domain=sp.QQ)
    denominator_poly = sp.Poly(sp.expand(denominator), variable, domain=sp.QQ)
    if denominator_poly.LC() < 0:
        numerator_poly = -numerator_poly
        denominator_poly = -denominator_poly
    assert all(coefficient >= 0 for coefficient in numerator_poly.all_coeffs())
    assert any(coefficient > 0 for coefficient in numerator_poly.all_coeffs())
    assert all(coefficient >= 0 for coefficient in denominator_poly.all_coeffs())
    assert denominator_poly.eval(0) > 0
    return {
        "numerator_coefficients_descending": list(
            map(str, numerator_poly.all_coeffs())
        ),
        "denominator_coefficients_descending": list(
            map(str, denominator_poly.all_coeffs())
        ),
        "numerator_digest": coefficient_digest(numerator_poly),
        "denominator_digest": coefficient_digest(denominator_poly),
    }


def verify_terminal_coupling_identity() -> None:
    """Audit the clearing formula once over a free rational-function field."""
    V0, V1, V2, V3 = sp.symbols("V0 V1 V2 V3", nonzero=True)
    a_last, a_previous, b_last, b_previous = sp.symbols(
        "a_last a_previous b_last b_previous", nonzero=True
    )
    A, B, C = V1 / V0, V2 / V0, V3 / V0
    coupling_squared = (
        b_last
        - B
        + C * (A + a_previous - a_last) / b_previous
        - C**2 / b_previous**2
    )
    cleared = (
        b_last * V0**2 * b_previous**2
        - V2 * V0 * b_previous**2
        + V3 * V1 * b_previous
        + V3 * V0 * (a_previous - a_last) * b_previous
        - V3**2
    )
    assert sp.cancel(cleared - coupling_squared * V0**2 * b_previous**2) == 0


def boundary_data(parity: str, reserve: int = 9) -> dict[str, object]:
    """Derive the cleared terminal coupling at a fixed odd reserve."""
    assert reserve >= 9 and reserve % 2 == 1
    r, u, v, c = sp.symbols("r u v c", nonnegative=True)
    if parity == "even":
        n = r + (reserve + 1) // 2
        p = 2 * r + reserve + 1
        alpha = 2 * r + 1
        beta = sp.Rational(-1, 2)
    elif parity == "odd":
        n = r + (reserve - 1) // 2
        p = 2 * r + reserve
        alpha = 2 * r
        beta = sp.Rational(1, 2)
    else:
        raise ValueError(parity)
    ambient = p + alpha

    def top_coefficients(k: sp.Expr) -> tuple[sp.Expr, sp.Expr]:
        total = alpha + beta
        diagonal = exact_quotient(-k * (k + alpha), 2 * k + total)
        second = exact_quotient(
            k * (k - 1) * (k + alpha - 1) * (k + alpha),
            2 * (2 * k + total - 1) * (2 * k + total),
        )
        return diagonal, second

    def T_action(j: int) -> tuple[sp.Expr, sp.Expr, sp.Expr]:
        k = n - j
        diagonal_top, second_top = top_coefficients(k)
        diagonal_next, second_next = top_coefficients(k + 1)
        upper = sp.Integer(j)
        diagonal = sp.cancel(
            k + (j + 1) * diagonal_top - upper * diagonal_next
        )
        lower = sp.cancel(
            (k - 1) * diagonal_top
            + (j + 2) * second_top
            - upper * second_next
            - diagonal * diagonal_top
        )
        assert not (diagonal.atoms(sp.Float) or lower.atoms(sp.Float))
        return upper, diagonal, lower

    actions = [T_action(j) for j in range(4)]

    def apply_T_minus(vector: list[sp.Expr], shift: int) -> list[sp.Expr]:
        output = [sp.Integer(0)] * 4
        for j, coefficient in enumerate(vector):
            upper, diagonal, lower = actions[j]
            if j:
                output[j - 1] += coefficient * upper
            output[j] += coefficient * (diagonal - sp.Integer(shift))
            if j < 3:
                output[j + 1] += coefficient * lower
        return [sp.cancel(value) for value in output]

    falling_vectors = [[sp.Integer(1), sp.Integer(0), sp.Integer(0), sp.Integer(0)]]
    for shift in range(3):
        falling_vectors.append(apply_T_minus(falling_vectors[-1], shift))

    gamma = [
        c,
        1 - c * (u + v),
        c * u * v - (u + v),
        u * v,
    ]
    V = []
    for index in range(4):
        value = sum(
            gamma[h]
            * exact_quotient(ff(ambient, h), ff(p, 2 * h))
            * falling_vectors[h][index]
            for h in range(4)
        )
        value = sp.cancel(value)
        assert not value.atoms(sp.Float)
        V.append(value)

    def recurrence(k: sp.Expr) -> tuple[sp.Expr, sp.Expr]:
        diagonal_top, second_top = top_coefficients(k)
        diagonal_next, second_next = top_coefficients(k + 1)
        diagonal = sp.cancel(diagonal_top - diagonal_next)
        subdiagonal = sp.cancel(
            second_top - second_next - diagonal * diagonal_top
        )
        assert not (diagonal.atoms(sp.Float) or subdiagonal.atoms(sp.Float))
        return diagonal, subdiagonal

    a_last, b_last = recurrence(n - 1)
    a_previous, b_previous = recurrence(n - 2)
    b_last_certificate = positive_rational_on_nonnegative_axis(b_last, r)
    b_previous_certificate = positive_rational_on_nonnegative_axis(b_previous, r)

    V0, V1, V2, V3 = V
    raw = (
        b_last * V0**2 * b_previous**2
        - V2 * V0 * b_previous**2
        + V3 * V1 * b_previous
        + V3 * V0 * (a_previous - a_last) * b_previous
        - V3**2
    )
    raw = sp.cancel(raw)
    assert not raw.atoms(sp.Float)
    numerator, denominator = sp.fraction(raw)
    numerator = sp.Poly(sp.expand(numerator), u, v, c, domain=sp.QQ.frac_field(r))
    denominator = sp.factor(denominator)
    assert numerator.degree(u) <= 2
    assert numerator.degree(v) <= 2
    assert numerator.degree(c) <= 2
    assert not denominator.has(u, v, c)
    denominator_constant, denominator_factors = sp.factor_list(denominator)
    assert denominator_constant > 0
    denominator_factor_records = []
    for factor, exponent in denominator_factors:
        factor_poly = sp.Poly(factor, r, domain=sp.QQ)
        assert all(coefficient >= 0 for coefficient in factor_poly.all_coeffs())
        assert factor_poly.eval(0) > 0
        assert exponent > 0
        denominator_factor_records.append(
            {
                "factor": str(factor),
                "exponent": int(exponent),
                "coefficientwise_nonnegative": True,
                "positive_constant_term": True,
            }
        )

    # Convert the numerator from powers to the tensor Bernstein basis of
    # degree (2,2) in u,v.  Each entry remains a polynomial of degree <=2 in c.
    power = {
        (i, j, k): numerator.coeff_monomial(u**i * v**j * c**k)
        for i in range(3)
        for j in range(3)
        for k in range(3)
    }
    bernstein: dict[tuple[int, int, int], sp.Expr] = {}
    for i in range(3):
        for j in range(3):
            for k in range(3):
                value = sum(
                    power[a, b, k]
                    * sp.Rational(math.comb(i, a), math.comb(2, a))
                    * sp.Rational(math.comb(j, b), math.comb(2, b))
                    for a in range(i + 1)
                    for b in range(j + 1)
                )
                bernstein[i, j, k] = sp.cancel(value)

    records = []
    for index, value in sorted(bernstein.items()):
        assert not value.atoms(sp.Float)
        positivity = positive_rational_on_nonnegative_axis(value, r)
        value_num, value_den = sp.fraction(sp.cancel(value))
        num_poly = sp.Poly(sp.expand(value_num), r, domain=sp.QQ)
        den_poly = sp.Poly(sp.expand(value_den), r, domain=sp.QQ)
        if den_poly.LC() < 0:
            num_poly = -num_poly
            den_poly = -den_poly
        num_coeffs = num_poly.all_coeffs()
        den_coeffs = den_poly.all_coeffs()
        records.append(
            {
                "bernstein_index_u_v_c": list(index),
                "numerator_degree_r": num_poly.degree(),
                "denominator_degree_r": den_poly.degree(),
                "numerator_term_count": len(num_poly.terms()),
                "denominator_term_count": len(den_poly.terms()),
                "numerator_digest": positivity["numerator_digest"],
                "denominator_digest": positivity["denominator_digest"],
                "numerator_coefficients_descending": list(map(str, num_coeffs)),
                "denominator_coefficients_descending": list(map(str, den_coeffs)),
            }
        )

    # Independent exact comparisons against the coefficient transform and
    # the Möbius change t=-y/(4(1-y)).  These are replay checks; the symbolic
    # adjoint derivation above is the all-order identity.
    y, t = sp.symbols("y t")
    samples = [
        (0, sp.Rational(1, 2), sp.Rational(4, 5), sp.Rational(3, 2)),
        (1, sp.Rational(1), sp.Rational(1, 5), sp.Rational(5)),
        (3, sp.Rational(4, 5), sp.Rational(1), sp.Rational(1, 25)),
    ]
    identity_records = []
    for r_value, u_value, v_value, c_value in samples:
        substitutions = {r: r_value, u: u_value, v: v_value, c: c_value}
        n_value = int(n.subs(r, r_value))
        p_value = int(p.subs(r, r_value))
        alpha_value = int(alpha.subs(r, r_value))

        monic_jacobi = [sp.Integer(1)]
        for degree in range(n_value):
            diagonal_top, second_top = top_coefficients(sp.Integer(degree))
            diagonal_next, second_next = top_coefficients(sp.Integer(degree + 1))
            diagonal = sp.cancel(diagonal_top - diagonal_next).subs(r, r_value)
            subdiagonal = sp.cancel(
                second_top
                - second_next
                - (diagonal_top - diagonal_next) * diagonal_top
            ).subs(r, r_value)
            previous = monic_jacobi[degree - 1] if degree else sp.Integer(0)
            monic_jacobi.append(
                sp.Poly(
                    sp.expand(
                        (y - diagonal) * monic_jacobi[degree]
                        - subdiagonal * previous
                    ),
                    y,
                ).as_expr()
            )
        jacobi_combination = sp.Poly(
            sp.expand(
                sum(
                    V[j].subs(substitutions) * monic_jacobi[n_value - j]
                    for j in range(4)
                )
            ),
            y,
        )

        gamma_fraction = [
            Fraction(c_value),
            Fraction(1 - c_value * (u_value + v_value)),
            Fraction(c_value * u_value * v_value - (u_value + v_value)),
            Fraction(u_value * v_value),
        ]
        transformed = direct_transform(gamma_fraction, p_value, alpha_value)
        transformed_expr = sum(
            sp.Rational(value.numerator, value.denominator) * t**index
            for index, value in enumerate(transformed)
        )
        changed = sp.Poly(
            sp.cancel(
                (1 - y) ** n_value
                * transformed_expr.subs(t, -y / (4 * (1 - y)))
            ),
            y,
        )
        assert jacobi_combination.degree() == changed.degree() == n_value
        assert jacobi_combination.monic() == changed.monic()
        identity_records.append(
            {
                "r": r_value,
                "u": str(u_value),
                "v": str(v_value),
                "c": str(c_value),
                "degree": n_value,
                "exact_monic_coefficient_match": True,
            }
        )

    return {
        "parity": parity,
        "reserve": reserve,
        "p": str(p),
        "alpha": str(alpha),
        "n": str(n),
        "raw_degrees_u_v_c": [
            numerator.degree(u),
            numerator.degree(v),
            numerator.degree(c),
        ],
        "raw_term_count": len(numerator.terms()),
        "raw_denominator": str(denominator),
        "raw_denominator_positive_factor_certificate": {
            "constant": str(denominator_constant),
            "factors": denominator_factor_records,
        },
        "jacobi_subdiagonal_certificates": {
            "last": b_last_certificate,
            "previous": b_previous_certificate,
        },
        "bernstein_coefficient_count": len(records),
        "all_exact_no_float_atoms": True,
        "all_rational_functions_coefficientwise_positive_on_r_nonnegative": True,
        "coefficients": records,
        "exact_jacobi_window_identity_replay": identity_records,
    }


def exact_sturm_replay(max_p: int, trials: int) -> dict[str, int]:
    randomizer = random.Random(993131)
    units = [Fraction(1), Fraction(4, 5), Fraction(1, 2), Fraction(1, 5), Fraction(1, 25)]
    moduli = [Fraction(1, 25), Fraction(1, 5), Fraction(1), Fraction(5), Fraction(25)]
    checks = 0
    identity_checks = 0
    for p in range(9, max_p + 1):
        boundary_alpha = p - 9
        sampled_alphas = sorted({0, boundary_alpha // 2, boundary_alpha})
        for alpha in sampled_alphas:
            for _ in range(trials):
                u = randomizer.choice(units)
                v = randomizer.choice(units)
                c = randomizer.choice(moduli)
                gamma = [c, 1 - c * (u + v), c * u * v - (u + v), u * v]
                transformed = direct_transform(gamma, p, alpha)
                negative, degree = negative_root_count(transformed)
                assert negative == degree
                checks += 1

                # Root-parameter form differs only by a positive scalar.
                b1, b2 = 1 / u, 1 / v
                root_form = [
                    c * b1 * b2,
                    b1 * b2 - c * (b1 + b2),
                    c - b1 - b2,
                    Fraction(1),
                ]
                scaled = direct_transform(root_form, p, alpha)
                scale = b1 * b2
                assert transformed == [value / scale for value in scaled]
                identity_checks += 1
    return {
        "maximum_p": max_p,
        "exact_sturm_checks": checks,
        "root_parameter_identity_checks": identity_checks,
    }


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--max-p", type=int, default=80)
    parser.add_argument("--trials", type=int, default=12)
    parser.add_argument("--output", type=Path, default=REPORT)
    args = parser.parse_args()

    verify_terminal_coupling_identity()

    parity_records = []
    for parity in ("even", "odd"):
        record = boundary_data(parity)
        parity_records.append(record)
        print(
            f"{parity}: raw terms={record['raw_term_count']}, "
            f"Bernstein coefficients={record['bernstein_coefficient_count']}",
            flush=True,
        )

    replay = exact_sturm_replay(args.max_p, args.trials)
    report = {
        "status": "ALL_ORDER_TWO_OUTLIER_ONE_NEGATIVE_FACTOR_THEOREM",
        "theorem": (
            "If Gamma has two roots in [1,infinity), one negative root, "
            "and p-alpha>=9, then its shifted-binomial-window gamma image "
            "has only negative real roots."
        ),
        "normalization": "Gamma(t)=(1-u*t)(1-v*t)(t+c), 0<u,v<=1 and c>0",
        "boundary_proof": [
            "the output is a top-four monic Jacobi combination",
            "it is the characteristic polynomial of a symmetric Jacobi matrix if one terminal squared coupling is positive",
            "after clearing positive denominators that coupling has tensor Bernstein degree (2,2) in (u,v)",
            "all 27 coefficient functions (three c powers at nine tensor indices) are coefficientwise positive rational functions of r>=0",
        ],
        "cone_propagation": (
            "Adjacent alpha levels are related by the real-rootedness-preserving "
            "Euler multipliers (E+alpha+1)(p+alpha+1-E), so the boundary "
            "p-alpha=9 implies every larger reserve."
        ),
        "parities": parity_records,
        "exact_replay": replay,
        "scope": (
            "This proves the two-outlier lemma for gamma degree three. "
            "Arbitrarily many additional negative factors remain to be handled."
        ),
    }
    args.output.write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    print(json.dumps({"status": report["status"], **replay}, indent=2))
    print(args.output)


if __name__ == "__main__":
    main()
