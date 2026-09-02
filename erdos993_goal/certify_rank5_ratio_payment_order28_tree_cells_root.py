#!/usr/bin/env python3
"""Exact order-28 strong rank-five payment on the real tree coefficient cells.

This replaces the overly broad generic isolate cone by the exact fixed-order
tree identities for a terminal core C of order m=26-s:

    i1=m,
    i2=C(m-1,2),
    i3=C(m-2,3)+e,
    i4=C(m-3,4)+(m-4)e-tau.

The proved joint degree-surplus/tau interval, Q4 lower defect, and sharp
rank-(3,4,5) defect ceiling then parameterize every actual core.  Five exact
root regions cover the lower q endpoint, while q=1 is the upper endpoint of
the concave payment.  The target is the payment required to preserve
Q5>=i4*i5/5 at total order 28.
"""

from __future__ import annotations

import argparse
import hashlib
import json
import os
import time
from pathlib import Path

import sympy as sp

from certify_rank5_ratio_payment_order28_large_cores_root import (
    certify_adaptive,
    raw_ratio_margin,
)
from explore_rank4_three_halves_grouped import (
    minimum_with_index,
    tensor_bernstein_fast,
)


HERE = Path(__file__).resolve().parent
D4_CEILING = sp.Rational(1559, 3575)


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def root_regions(D0, R, T):
    rm = (1 + D0) / 2
    rmax = (1 + D4_CEILING) / 2
    r_full = sp.Rational(1, 2) + R / 2
    r_low = sp.Rational(1, 2) + (rm - sp.Rational(1, 2)) * R
    r_middle = rm + (rmax - rm) * R
    r_high = rmax + (1 - rmax) * R
    D_full = D0 + (D4_CEILING - D0) * T
    D_half = 2 * r_middle - 1 + (D4_CEILING - (2 * r_middle - 1)) * T
    D_cross = D0 + (2 * r_middle - 1 - D0) * T
    return (
        ("q_upper", r_full, D_full, sp.S.One),
        ("q_half_low_r", r_low, D_full, sp.Rational(1, 2)),
        ("q_half_middle_r", r_middle, D_half, sp.Rational(1, 2)),
        ("q_cross_middle_r", r_middle, D_cross, r_middle - D_cross / 2),
        ("q_cross_high_r", r_high, D_full, r_high - D_full / 2),
    )


def certify_cell(core_order, smoothing, gamma_branch, maximum_depth):
    started = time.perf_counter()
    assert 0 <= smoothing <= 6 and 20 <= core_order <= 26
    assert core_order + smoothing <= 26
    B, A, T, R = sp.symbols("B A T R", nonnegative=True)
    variables = (B, A, T, R)
    mass = sp.Integer(core_order - 2)
    threshold = mass / 2
    maximum = sp.binomial(core_order - 2, 2)
    if gamma_branch == "zero":
        e_low, e_high = sp.S.Zero, threshold
    elif gamma_branch == "cauchy":
        e_low, e_high = threshold, maximum
    else:
        raise ValueError(gamma_branch)
    excess = sp.expand(e_low + (e_high - e_low) * B)
    gamma = (
        sp.S.Zero if gamma_branch == "zero"
        else sp.expand(excess * (2 * excess - mass) / (3 * mass))
    )
    tau_low = sp.expand(excess + gamma)
    tau_high = sp.expand(sp.Rational(core_order - 1, 3) * excess)
    tau = sp.expand(tau_low + (tau_high - tau_low) * A)
    c3 = sp.expand(sp.binomial(core_order - 2, 3) + excess)
    c4 = sp.expand(
        sp.binomial(core_order - 3, 4) + (core_order - 4) * excess - tau
    )
    X = sp.cancel(c3 / c4)
    D0 = sp.cancel((2 + X) / 10)
    cap = sp.Rational(
        4 * (core_order - 2),
        (core_order - 5) * (core_order - 6),
    )
    # The tau upper endpoint itself implies the sharp path-ratio cap.
    cap_gap = sp.factor(c4 - c3 / cap)
    if gamma_branch == "zero":
        assert cap_gap.subs({B: 0, A: 1}) == 0
    assert all(
        cap_gap.subs({B: b, A: a}) >= 0
        for b in (0, 1) for a in (0, 1)
    )
    assert all(
        c4.subs({B: b, A: a}) > 0
        for b in (0, 1) for a in (0, 1)
    )
    assert all(
        (D4_CEILING - D0).subs({B: b, A: a}) >= 0
        for b in (0, 1) for a in (0, 1)
    )

    raw, coefficient_variables = raw_ratio_margin(smoothing)
    c0v, c1v, c2v, c3v, c4v, c5v, hv, kv = coefficient_variables
    rows = []
    for label, r_value, D_value, q_value in root_regions(D0, R, T):
        c5 = sp.cancel((1 - D_value) * c4**2 / c3)
        substitution = {
            c0v: 1,
            c1v: core_order,
            c2v: sp.binomial(core_order - 1, 2),
            c3v: c3,
            c4v: c4,
            c5v: c5,
            hv: r_value * c3,
            kv: q_value * c4,
        }
        value = sp.cancel(raw.subs(substitution, simultaneous=True))
        numerator, denominator = sp.fraction(value)
        midpoint = {variable: sp.Rational(1, 2) for variable in variables}
        if denominator.subs(midpoint) < 0:
            numerator, denominator = -numerator, -denominator
        denominator_degrees, denominator_coefficients = tensor_bernstein_fast(
            sp.expand(denominator), variables
        )
        denominator_minimum, denominator_index = minimum_with_index(
            denominator_coefficients
        )
        assert denominator_minimum > 0, (
            label, sp.factor(denominator), denominator_minimum, denominator_index
        )
        polynomial = sp.expand(numerator)
        degrees, coefficients = tensor_bernstein_fast(polynomial, variables)
        initial_minimum, initial_index = minimum_with_index(coefficients)
        if initial_minimum >= 0:
            leaves, deepest, terminal_minimum = 1, 0, initial_minimum
        else:
            leaves, deepest, terminal_minimum = certify_adaptive(
                coefficients, degrees, maximum_depth
            )
        row = {
            "sibling_isolates": smoothing,
            "core_order": core_order,
            "gamma_branch": gamma_branch,
            "degree_surplus_interval": [str(e_low), str(e_high)],
            "root_region": label,
            "degrees": [int(value) for value in degrees],
            "initial_minimum": str(initial_minimum),
            "initial_minimum_index": [int(value) for value in initial_index],
            "terminal_patches": leaves,
            "maximum_depth": deepest,
            "terminal_minimum": str(terminal_minimum),
            "Bernstein_coefficients": int(coefficients.size) * leaves,
            "denominator_degrees": [int(value) for value in denominator_degrees],
            "denominator_minimum": str(denominator_minimum),
        }
        rows.append(row)
        print(
            "PASS", "s", smoothing, "core", core_order, gamma_branch,
            label, "degrees", degrees, "initial", initial_minimum,
            "leaves", leaves, "depth", deepest, flush=True,
        )
    return rows, time.perf_counter() - started


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument(
        "--pairs",
        nargs="*",
        help="core:sibling pairs; default is every pair with core>=20 and total<=28",
    )
    parser.add_argument(
        "--diagonal",
        action="store_true",
        help="only the seven total-order-28 pairs core=26-s",
    )
    parser.add_argument("--maximum-depth", type=int, default=28)
    args = parser.parse_args()
    if args.pairs:
        pairs = []
        for text in args.pairs:
            core_text, smoothing_text = text.split(":", 1)
            pairs.append((int(core_text), int(smoothing_text)))
    elif args.diagonal:
        pairs = [(26 - smoothing, smoothing) for smoothing in range(7)]
    else:
        pairs = [
            (core_order, smoothing)
            for core_order in range(20, 27)
            for smoothing in range(27 - core_order)
        ]
    assert pairs and len(set(pairs)) == len(pairs)
    assert all(
        20 <= core_order <= 26
        and 0 <= smoothing <= 6
        and core_order + smoothing <= 26
        for core_order, smoothing in pairs
    )
    all_rows = []
    elapsed = 0.0
    for core_order, smoothing in pairs:
        for branch in ("zero", "cauchy"):
            rows, seconds = certify_cell(
                core_order, smoothing, branch, args.maximum_depth
            )
            all_rows.extend(rows)
            elapsed += seconds
    output = HERE / (
        "rank5_ratio_payment_through28_large_core_grid_exact_root_20260826.json"
    )
    payload = {
        "schema": "rank5-ratio-payment-order28-tree-cells-root-v1",
        "status": "PASS_EXACT_RANK5_RATIO_PAYMENT_ORDER28_TREE_CELLS",
        "core_sibling_pairs": [list(pair) for pair in pairs],
        "total_orders": sorted({core + siblings + 2 for core, siblings in pairs}),
        "theorem": (
            "On every displayed terminal order-28 tree cell, "
            "M_s>=a_s*d_s*e_s*(a_s+d_s), the payment required to preserve "
            "Q5>=i4*i5/5."
        ),
        "coverage": (
            "For each core order, the zero/cauchy surplus branches cover e from "
            "0 through C(m-2,2); the five root regions cover q=1 and the entire "
            "lower endpoint q=max(1/2,r-D/2). Concavity in q covers the interval."
        ),
        "cells": all_rows,
        "total_Bernstein_coefficients": sum(row["Bernstein_coefficients"] for row in all_rows),
        "resources": {"elapsed_seconds": elapsed},
        "source_sha256": sha256(Path(__file__)),
        "scope_warning": (
            "Only the displayed s/core-order rows are covered. The complete "
            "strong-Q5 induction also needs small cores, stars, and a finite base."
        ),
    }
    temporary = output.with_suffix(output.suffix + ".tmp")
    temporary.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    os.replace(temporary, output)
    print(payload["status"], flush=True)
    print("SOURCE", payload["source_sha256"], flush=True)
    print("REPORT", sha256(output), flush=True)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
