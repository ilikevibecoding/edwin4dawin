#!/usr/bin/env python3
"""Probe the half-angle sector lemma that would lift repeated benign factors.

Fix an upper target-circle point z=R exp(i theta), where

    R^2=(B+r+1)(B+r)/16.

For the repeated-benign diagonal define

    D_r(d)=P_B[(q+t/4)^2 (4q-d)^r](z).

The observed sector statement is

    D_r(d)=0  ==>  Im(exp(-i theta/2)d)>0              (0<t<=1).

If true in all rank, Grace--Walsh--Szego immediately lifts the fixed-circle
exclusion from repeated d to arbitrary positive d_1,...,d_r.  Indeed the
original transform is the symmetric multiaffine polarization of D_r, while
the closed half-plane

    Im(exp(-i theta/2)d)<=0

contains every positive real d_i and, by the sector statement, no zero of
D_r.  This script verifies the polarization algebra in finite symbolic rank
and performs a deterministic floating stress audit.  It does NOT prove the
all-rank sector statement.
"""

from __future__ import annotations

import cmath
import hashlib
import json
import math
from pathlib import Path

import numpy as np
import sympy as sp


HERE = Path(__file__).resolve().parent
REPORT = HERE / "repeated_diagonal_half_angle_grace_lift_probe_20260809.json"
q, z, d, t = sp.symbols("q z d t")


def falling(order: int) -> sp.Expr:
    return sp.prod((z - j for j in range(order)), start=sp.Integer(1))


def rising(reserve: sp.Expr, order: int) -> sp.Expr:
    return sp.prod(
        (reserve + j for j in range(order)), start=sp.Integer(1)
    )


def transformed_expression(source: sp.Expr, reserve: sp.Expr) -> sp.Expr:
    polynomial = sp.Poly(sp.expand(source), q)
    return sp.expand(sum(
        polynomial.nth(k) * falling(k) / rising(reserve, k)
        for k in range(polynomial.degree() + 1)
    ))


def main() -> None:
    # Finite symbolic verification that the arbitrary-benign transform is the
    # symmetric multiaffine polarization of the repeated-d diagonal.
    polarization_records: list[dict[str, object]] = []
    reserve_symbol = sp.Symbol("B", positive=True)
    for rank in range(1, 7):
        variables = sp.symbols(f"d0:{rank}")
        source = (q + t / 4) ** 2 * sp.prod(4 * q - x for x in variables)
        polarized = transformed_expression(source, reserve_symbol)
        diagonal = transformed_expression(
            (q + t / 4) ** 2 * (4 * q - d) ** rank,
            reserve_symbol,
        )
        assert sp.factor(
            polarized.subs(dict.fromkeys(variables, d)) - diagonal
        ) == 0
        polynomial = sp.Poly(polarized, *variables)
        assert all(polynomial.degree(variable) <= 1 for variable in variables)
        polarization_records.append(
            {
                "rank": rank,
                "symmetric_multiaffine": True,
                "diagonal_sha256": hashlib.sha256(
                    str(sp.factor(diagonal)).encode("utf-8")
                ).hexdigest(),
            }
        )

    # Deterministic sector stress.  The minimum reported half-angle height is
    # Im(exp(-i theta/2)d)/max(1,|d|), so positivity has a scale-free meaning.
    theta_values = np.linspace(0.002, math.pi - 0.002, 101)
    outlier_values = [
        sp.Rational(1, 100),
        sp.Rational(1, 10),
        sp.Rational(1, 3),
        sp.Rational(2, 3),
        sp.Rational(1, 1),
    ]
    total_root_sets = 0
    total_roots = 0
    global_minimum_height = math.inf
    worst_record: dict[str, object] | None = None
    per_rank: list[dict[str, object]] = []

    for rank in range(1, 11):
        reserve_values = [
            3 * rank + 4,
            3 * rank + 5,
            4 * rank + 9,
            6 * rank + 17,
        ]
        rank_sets = 0
        rank_minimum = math.inf
        for reserve in reserve_values:
            N = reserve + rank + 1
            radius = math.sqrt(N * (N - 1)) / 4
            for outlier in outlier_values:
                source = sp.Poly(
                    sp.expand(
                        (q + outlier / 4) ** 2 * (4 * q - d) ** rank
                    ),
                    q,
                )
                diagonal = sp.expand(sum(
                    source.nth(k) * falling(k) / rising(reserve, k)
                    for k in range(rank + 3)
                ))
                coefficient_functions = [
                    sp.lambdify(z, coefficient, "numpy")
                    for coefficient in sp.Poly(diagonal, d).all_coeffs()
                ]
                for theta in theta_values:
                    circle_point = radius * cmath.exp(1j * float(theta))
                    coefficients = [
                        complex(function(circle_point))
                        for function in coefficient_functions
                    ]
                    roots = np.roots(coefficients)
                    total_root_sets += 1
                    rank_sets += 1
                    total_roots += len(roots)
                    for root in roots:
                        rotated = root * cmath.exp(-0.5j * float(theta))
                        height = rotated.imag / max(1.0, abs(root))
                        if height < rank_minimum:
                            rank_minimum = height
                        if height < global_minimum_height:
                            global_minimum_height = height
                            worst_record = {
                                "rank": rank,
                                "B": reserve,
                                "t": str(outlier),
                                "theta": float(theta),
                                "z": [circle_point.real, circle_point.imag],
                                "d_root": [float(root.real), float(root.imag)],
                                "rotated_height": float(height),
                            }
                        assert height > -2e-7
        per_rank.append(
            {
                "rank": rank,
                "root_sets": rank_sets,
                "minimum_normalized_half_angle_height": rank_minimum,
            }
        )

    payload = {
        "kind": "repeated_diagonal_half_angle_sector_grace_lift_probe",
        "date": "2026-08-09",
        "status": "PASS_FINITE_HALF_ANGLE_SECTOR_PROBE_AND_EXACT_POLARIZATION_REDUCTION",
        "scope": (
            "exact finite-rank polarization identities plus a deterministic "
            "floating sector audit; not an all-rank proof"
        ),
        "sector_lemma": (
            "If z=R*exp(i*theta), 0<theta<pi, D_r(d)=0, "
            "B>=3r+4 and 0<t<=1, then Im(exp(-i*theta/2)*d)>0."
        ),
        "grace_walsh_consequence": (
            "The complementary closed half-plane contains every positive real "
            "d_i.  Grace-Walsh-Szego would therefore turn any arbitrary-list "
            "circle zero into a forbidden repeated-d circle zero."
        ),
        "polarization_replays": polarization_records,
        "root_sets": total_root_sets,
        "roots_checked": total_roots,
        "ranks": "1..10",
        "reserve_values_per_rank": "3r+4, 3r+5, 4r+9, 6r+17",
        "outlier_values": [str(value) for value in outlier_values],
        "theta_count": len(theta_values),
        "minimum_normalized_half_angle_height": global_minimum_height,
        "worst_case": worst_record,
        "per_rank": per_rank,
        "remaining_obligation": (
            "Prove the half-angle sector lemma analytically, for example by a "
            "Hermite-Biehler/continued-fraction or dissipative-matrix argument."
        ),
    }
    REPORT.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    print(payload["status"])
    print(f"root_sets={total_root_sets}")
    print(f"roots_checked={total_roots}")
    print(f"minimum_height={global_minimum_height:.12g}")
    print(f"report={REPORT}")


if __name__ == "__main__":
    main()
