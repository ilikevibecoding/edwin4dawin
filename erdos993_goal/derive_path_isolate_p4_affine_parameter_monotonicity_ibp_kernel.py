#!/usr/bin/env python3
"""Derive the bounded kernel from the V-derivative integration by parts."""

from __future__ import annotations

import argparse
import hashlib
import json
from pathlib import Path

import sympy as sp

from analyze_path_isolate_p4_bottom_pair_affine_two_kernel import A, T, V, m, q, w, x, z
from analyze_path_isolate_p4_group_affine_grouped_tail_symbolic import c, to_sparse
from probe_path_isolate_p4_affine_parameter_monotonicity_reaggregated_v import (
    aggregate,
    bottom_increment,
    group_increment,
    quotient,
)
from stress_path_isolate_p4_affine_parameter_monotonicity_large_rays import (
    audit_components,
)


r = sp.symbols("r", integer=True, nonnegative=True)
C, M, X, R = sp.symbols("C M X R", integer=True, nonnegative=True)


def polynomial_summary(expression: sp.Expr, variables) -> dict:
    polynomial = sp.Poly(sp.expand(expression), *variables)
    canonical = "\n".join(
        f"{monomial}:{coefficient}"
        for monomial, coefficient in polynomial.terms()
    )
    coefficients = polynomial.coeffs()
    return {
        "term_count": len(coefficients),
        "degrees": [int(value) for value in polynomial.degree_list()],
        "negative_coefficient_count": len(
            [value for value in coefficients if value < 0]
        ),
        "minimum_coefficient": int(min(coefficients)),
        "sha256": hashlib.sha256(canonical.encode("utf-8")).hexdigest(),
    }


def symmetric_layer_audit(expression: sp.Expr) -> dict:
    polynomial = sp.Poly(sp.expand(expression), z, w, C, M, X, R)
    groups = {}
    symmetry_failures = 0
    lookup = {monomial: int(coefficient) for monomial, coefficient in polynomial.terms()}
    for monomial, value in lookup.items():
        pz, pw, *parameters = monomial
        reflected = (pw, pz, *parameters)
        if lookup.get(reflected, 0) != value:
            symmetry_failures += 1
        groups.setdefault((*parameters, pz + pw), {})[pz] = value
    negative_schur = 0
    minimum_schur = None
    for key, row in groups.items():
        degree = key[-1]
        previous = 0
        for pz in range(degree // 2 + 1):
            current = row.get(pz, 0)
            difference = current - previous
            negative_schur += difference < 0
            minimum_schur = (
                difference if minimum_schur is None
                else min(minimum_schur, difference)
            )
            previous = current
    return {
        "symmetry_failure_count": symmetry_failures,
        "negative_schur_coefficient_count": negative_schur,
        "minimum_schur_coefficient": minimum_schur,
        "hcu": symmetry_failures == 0 and negative_schur == 0,
    }


def parameter_slice_summaries(expression: sp.Expr, parameter: sp.Symbol) -> list[dict]:
    polynomial = sp.Poly(sp.expand(expression), parameter)
    records = []
    for exponent in range(int(polynomial.degree()) + 1):
        coefficient = polynomial.coeff_monomial(parameter**exponent)
        records.append({
            "exponent": exponent,
            **polynomial_summary(coefficient, (z, w, C, M, X, R)),
        })
    return records


def derive(
    family: str,
    parity: int,
    coordinate: str,
    common: sp.Expr,
    q_power: int,
    a: sp.Expr,
    b: sp.Expr,
    target: sp.Expr,
    substitutions: dict,
    sample: tuple[int, int, int, int],
    run_smoothing: bool,
) -> dict:
    d_expression, reserve_expression = (
        group_increment(parity, coordinate)
        if family == "group"
        else bottom_increment(parity, coordinate)
    )
    d_reduced = quotient(d_expression, common)
    reserve_reduced = quotient(reserve_expression, common)
    ell = quotient(d_reduced - reserve_reduced, V)
    Q = quotient(reserve_reduced, T**2)
    q_factor = q**q_power
    h = sp.expand(q_factor * Q)
    hz = sp.cancel(h / z)
    hw = sp.cancel(h / w)
    divisible = hz.is_polynomial(z, w, c, m, x) and hw.is_polynomial(z, w, c, m, x)
    record = {
        "family": family,
        "parity": parity,
        "coordinate": coordinate,
        "reserve_after_common_T2_divisible_by_z_and_w": bool(divisible),
    }
    if not divisible:
        return record

    B = sp.expand(b + 5)
    kernel = sp.expand(
        2 * A * q_factor * ell
        + A * T**2 * (
            target * (hz + hw) - z * sp.diff(hz, z) - w * sp.diff(hw, w)
        )
        - a * T**2 * (
            z * sp.diff(A, z) * hz + w * sp.diff(A, w) * hw
        )
        - B * A * T * (
            z * sp.diff(T, z) * hz + w * sp.diff(T, w) * hw
        )
    )
    shifted = sp.expand(kernel.subs(substitutions, simultaneous=True))
    c_value, m_value, x_value, r_value = sample
    a_value = int(a.subs({c: c_value, m: m_value, x: x_value}))
    b_value = int(b.subs({m: m_value}))
    target_value = int(target.subs({m: m_value, r: r_value}))
    numeric_kernel = sp.expand(kernel.subs({
        c: c_value, m: m_value, x: x_value, r: r_value,
    }))
    transformed_total = sum(aggregate(
        to_sparse(numeric_kernel), a_value - 1, b_value + 3,
        r_value + 1, target_value, c_value, m_value, x_value,
    ))
    original = audit_components(
        family, parity, coordinate, c_value, m_value, x_value, r_value,
        to_sparse(d_expression), to_sparse(reserve_expression),
    )
    identity_check = {
        "sample_c_m_x_r": list(sample),
        "twice_original": 2 * original["full_total"],
        "transformed_total": transformed_total,
        "matches": transformed_total == 2 * original["full_total"],
    }
    smoothing_audits = []
    for rho in ((0, 1, 2, 3, 4, 6, 8, 12) if run_smoothing else ()):
        smoothed = sp.expand(V**rho * shifted)
        summary = polynomial_summary(smoothed, (z, w, C, M, X, R))
        smoothing_audits.append({
            "rho": rho,
            "negative_coefficient_count": summary["negative_coefficient_count"],
            "minimum_coefficient": summary["minimum_coefficient"],
            **symmetric_layer_audit(smoothed),
        })
    record.update({
        "identity": (
            "Twice the target coefficient equals the coefficient of "
            "A^(a-1) T^(b+3) V^(r+1) times this kernel."
        ),
        "kernel": polynomial_summary(kernel, (z, w, c, m, x, r)),
        "shifted_tail_kernel": polynomial_summary(
            shifted, (z, w, C, M, X, R)
        ),
        "V_smoothing_audits": smoothing_audits,
        "numeric_identity_check": identity_check,
        "excess_order_R_slices": parameter_slice_summaries(shifted, R),
        "extra_x_X_slices": parameter_slice_summaries(shifted, X),
    })
    return record


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--identity-only", action="store_true")
    args = parser.parse_args()
    records = [
        derive(
            "group", 0, "m", T**3, 0,
            2 * c + m + x - 3,
            2 * m - 4,
            m + r + 6,
            {c: C + 1, m: M + 3, x: X, r: R + 2 * (M + 3)},
            (1, 3, 6, 6),
            not args.identity_only,
        ),
        derive(
            "bottom", 1, "x", q**2 * T**3, 2,
            m + x - 3,
            2 * m - 4,
            m + r + 5,
            {m: M + 3, x: X, r: R + 2 * (M + 3), c: C},
            (0, 3, 6, 6),
            not args.identity_only,
        ),
    ]
    report = {"status": "EXACT_SYMBOLIC", "records": records}
    mode_suffix = "_identity" if args.identity_only else ""
    Path(
        "path_isolate_p4_affine_parameter_monotonicity_"
        f"ibp_kernel{mode_suffix}_20260802.json"
    ).write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(report, indent=2))


if __name__ == "__main__":
    main()
