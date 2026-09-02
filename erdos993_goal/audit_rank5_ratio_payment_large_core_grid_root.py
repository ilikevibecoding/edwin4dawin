#!/usr/bin/env python3
"""Independent exact audit of all 280 large-core strong-payment cells.

The primary certificate uses a SymPy axis-by-axis Bernstein transform.  This
audit rebuilds the tree coefficient/payment polynomial directly and converts
it to python-flint multivariate rationals; a separate FLINT matrix transform
then produces the tensor Bernstein coefficients.  Subdivision is implemented
locally with exact de Casteljau midpoint steps.
"""

from __future__ import annotations

import argparse
import hashlib
import json
import math
import os
import time
from fractions import Fraction
from pathlib import Path

import numpy as np
import sympy as sp
from flint import fmpq_mpoly_ctx

from certify_rank8_delta4_junction_coupled_box import to_flint
from tensor_bernstein_flint_matrix_root import tensor_bernstein_from_flint_matrix


HERE = Path(__file__).resolve().parent
PRIMARY = HERE / "rank5_ratio_payment_through28_large_core_grid_exact_root_20260826.json"
OUTPUT = HERE / "rank5_ratio_payment_through28_large_core_grid_independent_audit_root_20260826.json"
CHECKPOINT = HERE / "rank5_ratio_payment_through28_large_core_grid_independent_audit_root_20260826.checkpoint.json"
D4_CEILING = sp.Rational(1559, 3575)


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def minimum_with_index(array):
    flat = min(range(array.size), key=lambda index: array.flat[index])
    return array.flat[flat], tuple(int(value) for value in np.unravel_index(flat, array.shape))


def midpoint_split(coefficients, axis):
    moved = np.moveaxis(coefficients, axis, 0)
    degree = moved.shape[0] - 1
    layers = [moved[index].copy() for index in range(degree + 1)]
    left = np.empty_like(moved)
    right = np.empty_like(moved)
    left[0] = layers[0]
    right[degree] = layers[degree]
    for level in range(1, degree + 1):
        layers = [
            (layers[index] + layers[index + 1]) / 2
            for index in range(len(layers) - 1)
        ]
        left[level] = layers[0]
        right[degree - level] = layers[-1]
    return np.moveaxis(left, 0, axis), np.moveaxis(right, 0, axis)


def certify_subdivision(coefficients, degrees, maximum_depth=28):
    stack = [(coefficients, 0)]
    leaves = 0
    deepest = 0
    terminal_minimum = None
    axis_preference = (3, 2, 1, 0)
    while stack:
        patch, depth = stack.pop()
        minimum, index = minimum_with_index(patch)
        if minimum >= 0:
            leaves += 1
            deepest = max(deepest, depth)
            terminal_minimum = minimum if terminal_minimum is None else min(terminal_minimum, minimum)
            continue
        assert depth < maximum_depth, (minimum, index, depth)
        # ``degrees`` comes from the FLINT transform and can contain fmpz
        # values.  Python-flint deliberately rejects non-exact ``/`` on fmpz,
        # while this axis-selection score is only a rational subdivision
        # heuristic.  Normalize both operands to Python ints and keep the
        # comparison exact with Fraction.
        interior = [
            Fraction(min(int(position), int(degree) - int(position)), int(degree))
            if int(degree)
            else Fraction(0, 1)
            for position, degree in zip(index, degrees)
        ]
        best = max(interior)
        assert best > 0, ("negative polynomial vertex", minimum, index)
        axis = next(axis for axis in axis_preference if interior[axis] == best)
        left, right = midpoint_split(patch, axis)
        stack.append((right, depth + 1))
        stack.append((left, depth + 1))
    return leaves, deepest, terminal_minimum


def smooth(core, siblings, rank):
    return sum(
        math.comb(siblings, offset) * core[rank - offset]
        for offset in range(min(siblings, rank) + 1)
    )


def payment_margin(a, b, d, e, f):
    q4 = 8 * e**2 - d * e - 10 * d * f
    mismatch = b * d - a * e
    payment = (
        6 * a * (a + d) * q4
        + a * d * e * (a + d + 2 * e)
        + 2 * a**2 * e**2
        - 50 * mismatch**2
    )
    return sp.expand(payment - a * d * e * (a + d))


def region_maps(D0, R, T):
    middle_low = (1 + D0) / 2
    middle_high = (1 + D4_CEILING) / 2
    r_any = (1 + R) / 2
    r_low = sp.Rational(1, 2) + (middle_low - sp.Rational(1, 2)) * R
    r_middle = middle_low + (middle_high - middle_low) * R
    r_high = middle_high + (1 - middle_high) * R
    D_any = D0 + (D4_CEILING - D0) * T
    D_above_cross = 2 * r_middle - 1 + (D4_CEILING - (2 * r_middle - 1)) * T
    D_below_cross = D0 + (2 * r_middle - 1 - D0) * T
    return {
        "q_upper": (r_any, D_any, sp.S.One),
        "q_half_low_r": (r_low, D_any, sp.Rational(1, 2)),
        "q_half_middle_r": (r_middle, D_above_cross, sp.Rational(1, 2)),
        "q_cross_middle_r": (r_middle, D_below_cross, r_middle - D_below_cross / 2),
        "q_cross_high_r": (r_high, D_any, r_high - D_any / 2),
    }


def audit_pair(core_order, siblings, maximum_depth):
    B, A, T, R = sp.symbols("B A T R", nonnegative=True)
    variables = (B, A, T, R)
    context = fmpq_mpoly_ctx.get([str(variable) for variable in variables])
    mass = sp.Integer(core_order - 2)
    threshold = mass / 2
    maximum = sp.binomial(core_order - 2, 2)
    rows = []
    for branch in ("zero", "cauchy"):
        if branch == "zero":
            e_low, e_high = sp.S.Zero, threshold
            gamma = sp.S.Zero
        else:
            e_low, e_high = threshold, maximum
            excess_probe = sp.expand(e_low + (e_high - e_low) * B)
            gamma = sp.expand(excess_probe * (2 * excess_probe - mass) / (3 * mass))
        excess = sp.expand(e_low + (e_high - e_low) * B)
        if branch == "cauchy":
            gamma = sp.expand(excess * (2 * excess - mass) / (3 * mass))
        tau_low = sp.expand(excess + gamma)
        tau_high = sp.expand(sp.Rational(core_order - 1, 3) * excess)
        tau = sp.expand(tau_low + (tau_high - tau_low) * A)
        c3 = sp.expand(sp.binomial(core_order - 2, 3) + excess)
        c4 = sp.expand(sp.binomial(core_order - 3, 4) + (core_order - 4) * excess - tau)
        X = sp.cancel(c3 / c4)
        D0 = sp.cancel((2 + X) / 10)
        for label, (r_value, defect, q_value) in region_maps(D0, R, T).items():
            c5 = sp.cancel((1 - defect) * c4**2 / c3)
            core = (
                sp.S.One,
                sp.Integer(core_order),
                sp.binomial(core_order - 1, 2),
                c3,
                c4,
                c5,
            )
            d = smooth(core, siblings, 3)
            e = smooth(core, siblings, 4)
            f = smooth(core, siblings, 5)
            h = sp.cancel(r_value * c3)
            k = sp.cancel(q_value * c4)
            rational = sp.cancel(payment_margin(e + h, f + k, d, e, f))
            numerator, denominator = sp.fraction(rational)
            midpoint = {variable: sp.Rational(1, 2) for variable in variables}
            if denominator.subs(midpoint) < 0:
                numerator, denominator = -numerator, -denominator

            denominator_flint = to_flint(context, sp.expand(denominator), variables)
            denominator_degrees, denominator_coefficients, _ = tensor_bernstein_from_flint_matrix(
                denominator_flint, len(variables), chunk_columns=4096
            )
            denominator_minimum, denominator_index = minimum_with_index(denominator_coefficients)
            assert denominator_minimum > 0, (core_order, siblings, branch, label, denominator_index)

            polynomial_flint = to_flint(context, sp.expand(numerator), variables)
            degrees, coefficients, mapped_terms = tensor_bernstein_from_flint_matrix(
                polynomial_flint, len(variables), chunk_columns=4096
            )
            initial_minimum, initial_index = minimum_with_index(coefficients)
            if initial_minimum >= 0:
                leaves, depth, terminal_minimum = 1, 0, initial_minimum
            else:
                leaves, depth, terminal_minimum = certify_subdivision(
                    coefficients, degrees, maximum_depth
                )
            rows.append({
                "core_order": core_order,
                "sibling_isolates": siblings,
                "gamma_branch": branch,
                "root_region": label,
                "degrees": [int(value) for value in degrees],
                "initial_minimum": str(initial_minimum),
                "initial_minimum_index": list(initial_index),
                "terminal_patches": leaves,
                "maximum_depth": depth,
                "terminal_minimum": str(terminal_minimum),
                "mapped_terms": int(mapped_terms),
                "denominator_degrees": [int(value) for value in denominator_degrees],
                "denominator_minimum": str(denominator_minimum),
            })
            print("AUDIT_PASS", core_order, siblings, branch, label, "leaves", leaves, flush=True)
    return rows


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--pairs", nargs="*")
    parser.add_argument("--maximum-depth", type=int, default=28)
    parser.add_argument("--test-only", action="store_true")
    args = parser.parse_args()
    if args.pairs:
        pairs = [tuple(map(int, item.split(":"))) for item in args.pairs]
    else:
        pairs = [(core, siblings) for core in range(20, 27) for siblings in range(27 - core)]
    assert len(pairs) == len(set(pairs))
    assert all(20 <= core <= 26 and 0 <= siblings <= 26 - core for core, siblings in pairs)

    started = time.perf_counter()
    use_checkpoint = not args.pairs and not args.test_only
    rows = []
    completed_pairs = set()
    current_source_hash = sha256(Path(__file__))
    if use_checkpoint and CHECKPOINT.exists():
        checkpoint = json.loads(CHECKPOINT.read_text(encoding="utf-8"))
        if (
            checkpoint.get("source_sha256") == current_source_hash
            and checkpoint.get("maximum_depth") == args.maximum_depth
        ):
            rows = checkpoint["cells"]
            grouped = {}
            for row in rows:
                key = (row["core_order"], row["sibling_isolates"])
                grouped.setdefault(key, []).append(row)
            assert all(len(group) == 10 for group in grouped.values())
            completed_pairs = set(grouped)
            print("RESUME_PAIRS", len(completed_pairs), flush=True)
    for core, siblings in pairs:
        if (core, siblings) in completed_pairs:
            continue
        rows.extend(audit_pair(core, siblings, args.maximum_depth))
        if use_checkpoint:
            checkpoint_payload = {
                "source_sha256": current_source_hash,
                "maximum_depth": args.maximum_depth,
                "cells": rows,
            }
            temporary_checkpoint = CHECKPOINT.with_suffix(CHECKPOINT.suffix + ".tmp")
            temporary_checkpoint.write_text(
                json.dumps(checkpoint_payload, indent=2) + "\n", encoding="utf-8"
            )
            os.replace(temporary_checkpoint, CHECKPOINT)
    assert all(sp.Rational(row["terminal_minimum"]) >= 0 for row in rows)
    if args.test_only:
        print("PASS_TEST_ONLY", len(rows))
        return 0

    expected_pairs = [(core, siblings) for core in range(20, 27) for siblings in range(27 - core)]
    assert pairs == expected_pairs and len(rows) == 280
    primary = json.loads(PRIMARY.read_text(encoding="utf-8"))
    assert primary["status"] == "PASS_EXACT_RANK5_RATIO_PAYMENT_ORDER28_TREE_CELLS"
    primary_index = {
        (row["core_order"], row["sibling_isolates"], row["gamma_branch"], row["root_region"]): row
        for row in primary["cells"]
    }
    assert len(primary_index) == 280
    for row in rows:
        key = (row["core_order"], row["sibling_isolates"], row["gamma_branch"], row["root_region"])
        reference = primary_index[key]
        assert row["degrees"] == reference["degrees"]
        assert row["initial_minimum"] == reference["initial_minimum"]
        assert row["initial_minimum_index"] == reference["initial_minimum_index"]
        assert row["denominator_degrees"] == reference["denominator_degrees"]
        assert row["denominator_minimum"] == reference["denominator_minimum"]

    payload = {
        "schema": "rank5-ratio-payment-large-core-grid-independent-audit-root-v1",
        "status": "PASS_INDEPENDENT_RANK5_RATIO_PAYMENT_LARGE_CORE_GRID_AUDIT",
        "method": (
            "The 280 rational payment polynomials were rebuilt directly and "
            "certified using python-flint multivariate polynomials, a FLINT "
            "matrix Bernstein transform, and a local exact de Casteljau "
            "subdivider. Initial degrees, minima, indices, and denominator "
            "certificates agree with the independent SymPy primary engine."
        ),
        "coverage": {
            "core_sibling_pairs": len(pairs),
            "analytic_cells": len(rows),
            "negative_terminal_minima": 0,
            "matching_primary_initial_certificates": len(rows),
        },
        "cells": rows,
        "resources": {"elapsed_seconds": time.perf_counter() - started},
        "artifacts": {
            PRIMARY.name: sha256(PRIMARY),
            "tensor_bernstein_flint_matrix_root.py": sha256(HERE / "tensor_bernstein_flint_matrix_root.py"),
            "certify_rank8_delta4_junction_coupled_box.py": sha256(HERE / "certify_rank8_delta4_junction_coupled_box.py"),
        },
        "source_sha256": current_source_hash,
    }
    temporary = OUTPUT.with_suffix(OUTPUT.suffix + ".tmp")
    temporary.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    os.replace(temporary, OUTPUT)
    print(payload["status"])
    print("CELLS", len(rows))
    print("SOURCE", payload["source_sha256"])
    print("REPORT", sha256(OUTPUT))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
