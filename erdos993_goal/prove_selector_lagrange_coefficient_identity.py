#!/usr/bin/env python3
"""Exact replay for a Lagrange coefficient formula for the unsigned path slice.

For s < 2M, put R=2M-s-1.  The unsigned gamma polynomial satisfies

    G_(M,s)(t)
      = [z^s] (1+z+t*z^2)^R / (1-t*z^2)^(2R+1)
      = [z^s] B_t(z) A_t(z)^R,

where

    A_t(z)=(1+z+t*z^2)/(1-t*z^2)^2,
    B_t(z)=1/(1-t*z^2).

Consequently the adjacent-size Turan target is exactly log-concavity, with
step two in R, of these fixed-degree coefficient extractions.  The notebook
contains the all-order Binet/Lagrange proof.  This script replays the rational
change-of-variable identities and compares both the coefficient formula and
its explicit positive sum with the original gamma transform.
"""

from __future__ import annotations

import argparse
import hashlib
import json
import math
from pathlib import Path

import sympy as sp

from analyze_selector_turan_fixedpoint_reduction import G


HERE = Path(__file__).resolve().parent
REPORT = HERE / "selector_lagrange_coefficient_identity_exact_20260810.json"

z, t = sp.symbols("z t")


def coefficient_formula_coefficients(M: int, s: int) -> list[int]:
    if not 0 <= s < 2 * M:
        raise ValueError("the branch-truncation proof requires 0 <= s < 2M")
    R = 2 * M - s - 1
    # A bivariate integer dictionary independently expands the rational
    # coefficient formula without symbolic-expression swell.
    numerator: dict[tuple[int, int], int] = {(0, 0): 1}
    for _ in range(R):
        updated: dict[tuple[int, int], int] = {}
        for (z_degree, t_degree), value in numerator.items():
            for z_step, t_step in ((0, 0), (1, 0), (2, 1)):
                if z_degree + z_step <= s:
                    key = (z_degree + z_step, t_degree + t_step)
                    updated[key] = updated.get(key, 0) + value
        numerator = updated
    answer = [0] * (s // 2 + 1)
    for (z_degree, t_degree), value in numerator.items():
        remainder = s - z_degree
        if remainder % 2 == 0:
            ell = remainder // 2
            answer[t_degree + ell] += value * math.comb(2 * R + ell, ell)
    return answer


def positive_sum_coefficients(M: int, s: int) -> list[int]:
    """Return the t coefficients from the explicit nonnegative double sum."""
    R = 2 * M - s - 1
    values: list[int] = []
    for h in range(s // 2 + 1):
        singles = s - 2 * h
        total = 0
        for quadratic_numerator_choices in range(h + 1):
            k = quadratic_numerator_choices
            if singles + k > R:
                continue
            numerator_multinomial = (
                math.factorial(R)
                // (
                    math.factorial(singles)
                    * math.factorial(k)
                    * math.factorial(R - singles - k)
                )
            )
            denominator_pairs = h - k
            denominator_choice = math.comb(2 * R + denominator_pairs, denominator_pairs)
            total += numerator_multinomial * denominator_choice
        values.append(total)
    return values


def algebraic_change_replay() -> dict[str, str]:
    """Verify the two rational identities used in the residue calculation."""
    Phi = (1 + z + t * z**2) / (1 - t * z**2) ** 2
    # Eliminating A=q(aU), B=q(bU), with w=AB and z=U/w, gives
    # w(1-tz^2)^2=1+z+tz^2.  The square-root denominator is
    # D=2w(1+tz^2)-1.
    D = 2 * Phi * (1 + t * z**2) - 1
    jacobian = 1 + z * sp.diff(Phi, z) / Phi
    collapsed = sp.factor(jacobian / D)
    expected = (1 - t * z**2) / (1 + z + t * z**2)
    assert sp.factor(collapsed - expected) == 0

    U = z * Phi
    elimination_residual = sp.factor(
        -U**4 * t**2
        + 2 * U**2 * t * Phi**2
        + U**2 * t * Phi
        + U * Phi**2
        - Phi**4
        + Phi**3
    )
    assert elimination_residual == 0
    return {
        "w_identity": "w*(1-t*z^2)^2=1+z+t*z^2",
        "jacobian_over_sqrt_denominator": str(collapsed),
    }


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--max-M", type=int, default=30)
    parser.add_argument("--max-s", type=int, default=16)
    parser.add_argument("--output", type=Path, default=REPORT)
    args = parser.parse_args()

    algebra = algebraic_change_replay()
    records: list[dict[str, int]] = []
    coefficient_checks = 0
    positive_sum_checks = 0
    for M in range(1, args.max_M + 1):
        for s in range(min(2 * M - 1, args.max_s) + 1):
            original = G(M, s)
            formula = coefficient_formula_coefficients(M, s)
            assert formula == original
            coefficient_checks += len(original)

            explicit = positive_sum_coefficients(M, s)
            assert explicit == original
            assert all(value >= 0 for value in explicit)
            if M >= 2 * s + 5:
                assert all(value > 0 for value in explicit)
            positive_sum_checks += len(explicit)
            records.append({"M": M, "s": s, "R": 2 * M - s - 1})

    source_hash = hashlib.sha256(Path(__file__).read_bytes()).hexdigest().upper()
    report = {
        "status": "PASS_EXACT_SELECTOR_LAGRANGE_COEFFICIENT_IDENTITY_REPLAY",
        "all_order_identity": (
            "G_(M,s)(t)=[z^s](1+z+t*z^2)^(2M-s-1)"
            "/(1-t*z^2)^(4M-2s-1), valid for s<2M"
        ),
        "algebraic_change_of_variable": algebra,
        "finite_replay_scope": {
            "max_M": args.max_M,
            "max_s": args.max_s,
            "cases": len(records),
            "coefficient_identity_checks": coefficient_checks,
            "positive_double_sum_checks": positive_sum_checks,
        },
        "turan_reduction": (
            "with A=(1+z+t*z^2)/(1-t*z^2)^2, B=(1-t*z^2)^-1, "
            "and R=2M-s-1, prove [z^s]BA^(R-2) squared exceeds "
            "([z^s]BA^R)([z^s]BA^(R-4))"
        ),
        "source_sha256": source_hash,
        "records": records,
    }
    args.output.write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    report_hash = hashlib.sha256(args.output.read_bytes()).hexdigest().upper()
    print(
        json.dumps(
            {
                "status": report["status"],
                "cases": len(records),
                "coefficient_identity_checks": coefficient_checks,
                "positive_double_sum_checks": positive_sum_checks,
                "source_sha256": source_hash,
                "report_sha256": report_hash,
                "report": str(args.output),
            },
            indent=2,
        )
    )


if __name__ == "__main__":
    main()
