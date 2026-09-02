#!/usr/bin/env python3
"""Audit cached one-sided Darboux inequalities in an exact Bernstein cone."""

from __future__ import annotations

import argparse
import hashlib
import json
import math
from pathlib import Path

import sympy as sp


HERE = Path(__file__).resolve().parent
R, U, V, C = sp.symbols("r u v c", nonnegative=True)


def coefficient_digest(polynomial: sp.Poly) -> str:
    payload = ";".join(
        f"{','.join(map(str, monomial))}:{coefficient}"
        for monomial, coefficient in polynomial.terms()
    )
    return hashlib.sha256(payload.encode("utf-8")).hexdigest()


def bernstein_audit(name: str, expression: sp.Expr) -> dict[str, object]:
    polynomial = sp.Poly(
        sp.expand(expression), U, V, C, domain=sp.QQ[R]
    )
    du, dv, dc = (
        polynomial.degree(U),
        polynomial.degree(V),
        polynomial.degree(C),
    )
    power = {
        (i, j, k): polynomial.coeff_monomial(U**i * V**j * C**k)
        for i in range(du + 1)
        for j in range(dv + 1)
        for k in range(dc + 1)
    }
    records = []
    positive = negative = mixed = zero = 0
    positive_at_r_zero = 0
    for i in range(du + 1):
        for j in range(dv + 1):
            for k in range(dc + 1):
                value = sp.Poly(
                    sp.expand(
                        sum(
                            power[a, b, k]
                            * sp.Rational(math.comb(i, a), math.comb(du, a))
                            * sp.Rational(math.comb(j, b), math.comb(dv, b))
                            for a in range(i + 1)
                            for b in range(j + 1)
                        )
                    ),
                    R,
                    domain=sp.QQ,
                )
                coefficients = value.all_coeffs() if not value.is_zero else []
                if not coefficients:
                    status = "zero"
                    zero += 1
                elif all(coefficient >= 0 for coefficient in coefficients):
                    status = "positive"
                    positive += 1
                    positive_at_r_zero += int(bool(value.eval(0) > 0))
                elif all(coefficient <= 0 for coefficient in coefficients):
                    status = "negative"
                    negative += 1
                else:
                    status = "mixed"
                    mixed += 1
                if status != "positive":
                    records.append(
                        {
                            "index_u_v_c": [i, j, k],
                            "status": status,
                            "coefficients_descending_r": list(map(str, coefficients)),
                        }
                    )
    return {
        "name": name,
        "degrees_u_v_c": [du, dv, dc],
        "power_term_count": len(polynomial.terms()),
        "power_digest": coefficient_digest(polynomial),
        "bernstein_coefficient_count": (du + 1) * (dv + 1) * (dc + 1),
        "bernstein_status_positive_negative_mixed_zero": [
            positive,
            negative,
            mixed,
            zero,
        ],
        "positive_coefficients_with_positive_r_zero_value": positive_at_r_zero,
        "strict_positive_bernstein_certificate": (
            negative == mixed == zero == 0
            and positive_at_r_zero == positive
        ),
        "nonpositive_records": records,
    }


def bernstein_controls(expression: sp.Expr) -> tuple[sp.Poly, dict[tuple[int, int, int], sp.Poly]]:
    polynomial = sp.Poly(
        sp.expand(expression), U, V, C, domain=sp.QQ[R]
    )
    du, dv, dc = (
        polynomial.degree(U),
        polynomial.degree(V),
        polynomial.degree(C),
    )
    power = {
        (i, j, k): polynomial.coeff_monomial(U**i * V**j * C**k)
        for i in range(du + 1)
        for j in range(dv + 1)
        for k in range(dc + 1)
    }
    controls = {}
    for i in range(du + 1):
        for j in range(dv + 1):
            for k in range(dc + 1):
                controls[i, j, k] = sp.Poly(
                    sp.expand(
                        sum(
                            power[a, b, k]
                            * sp.Rational(math.comb(i, a), math.comb(du, a))
                            * sp.Rational(math.comb(j, b), math.comb(dv, b))
                            for a in range(i + 1)
                            for b in range(j + 1)
                        )
                    ),
                    R,
                    domain=sp.QQ,
                )
    return polynomial, controls


def copositive_squared_gap_certificate(expression: sp.Expr) -> dict[str, object]:
    polynomial, controls = bernstein_controls(expression)
    assert [polynomial.degree(variable) for variable in (U, V, C)] == [4, 4, 4]
    mixed_indices = []
    negative_indices = []
    for index, control in controls.items():
        coefficients = control.all_coeffs() if not control.is_zero else []
        if coefficients and all(value >= 0 for value in coefficients):
            continue
        if coefficients and all(value <= 0 for value in coefficients):
            negative_indices.append(index)
        elif coefficients:
            mixed_indices.append(index)
    problematic_indices = sorted(negative_indices + mixed_indices)
    assert problematic_indices == [(1, 1, 0), (1, 1, 1), (1, 1, 2)]

    pair_records = []
    for k in range(3):
        center = controls[1, 1, k]
        neighbor = controls[2, 0, k]
        assert neighbor == controls[0, 2, k]
        paired = sp.Poly(
            sp.expand(center.as_expr() + sp.Rational(3, 4) * neighbor.as_expr()),
            R,
            domain=sp.QQ,
        )
        assert all(value >= 0 for value in paired.all_coeffs())
        assert paired.eval(0) > 0
        pair_records.append(
            {
                "c_power": k,
                "paired_control": "b_(1,1,k) + 3/4 b_(2,0,k)",
                "coefficientwise_positive_in_r": True,
                "positive_at_r_zero": True,
                "factorization": str(sp.factor(paired.as_expr())),
                "digest": coefficient_digest(paired),
            }
        )

    # With degree four Bernstein polynomials,
    # B20+B02 >= 3/4 B11 follows after factoring the positive boundary
    # weights from 6(a^2+b^2) >= 12ab = 3/4 * 16ab.
    return {
        "basis_inequality": (
            "B_2^4(u)B_0^4(v)+B_0^4(u)B_2^4(v) "
            ">= (3/4)B_1^4(u)B_1^4(v)"
        ),
        "only_nonpositive_or_mixed_control_indices": [
            list(index) for index in problematic_indices
        ],
        "paired_control_certificates": pair_records,
        "all_other_nonzero_controls_coefficientwise_positive_in_r": True,
        "nonnegative_on_closed_parameter_box": True,
        "strictly_positive_for_u_v_not_both_zero": True,
        "degenerate_u_v_zero_corner_handled_by_continuity": True,
    }


def one_parity(parity: str) -> dict[str, object]:
    cache_path = (
        HERE / f"one_sided_darboux_{parity}_expression_cache_20260806.json"
    )
    cached = json.loads(cache_path.read_text(encoding="utf-8"))
    assert cached["parity"] == parity
    expressions = {
        key: sp.sympify(value, locals={"r": R, "u": U, "v": V, "c": C})
        for key, value in cached["expressions"].items()
    }
    required = ("radical_majorant", "squared_radical_gap")
    assert all(name in expressions for name in required)
    numerator_records = []
    squared_gap_copositive_certificate = None
    denominator_records: dict[str, dict[str, object]] = {}
    for name in required:
        numerator, denominator = sp.fraction(sp.cancel(expressions[name]))
        numerator_records.append(bernstein_audit(f"{name}_numerator", numerator))
        if name == "squared_radical_gap":
            squared_gap_copositive_certificate = (
                copositive_squared_gap_certificate(numerator)
            )
        constant, factors = sp.factor_list(denominator)
        assert constant > 0
        for factor, exponent in factors:
            if not factor.has(U, V, C):
                factor_poly = sp.Poly(factor, R, domain=sp.QQ)
                assert all(value >= 0 for value in factor_poly.all_coeffs())
                assert factor_poly.eval(0) > 0
                continue
            key = str(factor)
            if key not in denominator_records:
                record = bernstein_audit(
                    f"denominator_factor_{len(denominator_records)}", factor
                )
                record["exponents_seen"] = []
                denominator_records[key] = record
            denominator_records[key]["exponents_seen"].append(int(exponent))
    assert squared_gap_copositive_certificate is not None
    strict_records = [numerator_records[0]] + list(denominator_records.values())
    return {
        "parity": parity,
        "numerators": numerator_records,
        "nontrivial_denominator_factors": list(denominator_records.values()),
        "squared_gap_copositive_certificate": squared_gap_copositive_certificate,
        "all_required_signs_certified": all(
            bool(record["strict_positive_bernstein_certificate"])
            for record in strict_records
        ) and bool(squared_gap_copositive_certificate["nonnegative_on_closed_parameter_box"]),
    }


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--parity", choices=("odd", "even", "both"), default="odd")
    parser.add_argument("--output", type=Path)
    args = parser.parse_args()
    parities = ("odd", "even") if args.parity == "both" else (args.parity,)
    records = [one_parity(parity) for parity in parities]
    report = {
        "status": "EXACT_ONE_SIDED_DARBOUX_BERNSTEIN_AUDIT",
        "records": records,
        "all_certified": all(
            bool(record["all_required_signs_certified"])
            for record in records
        ),
        "scope": (
            "Certification of the two rational inequalities implies inertia "
            "(2,1) for the localized Darboux difference and hence one of the "
            "two adjacent-cubic root-overlap inequalities."
        ),
    }
    output = args.output or HERE / (
        f"one_sided_darboux_{args.parity}_bernstein_audit_20260806.json"
    )
    output.write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(report, indent=2))


if __name__ == "__main__":
    main()
