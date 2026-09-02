#!/usr/bin/env python3
"""Exact analytic strong-payment cells for core orders 20..32 through order 34."""

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
from certify_rank5_ratio_payment_order28_tree_cells_root import (
    D4_CEILING,
    root_regions,
)
from explore_rank4_three_halves_grouped import (
    minimum_with_index,
    tensor_bernstein_fast,
)


HERE = Path(__file__).resolve().parent
OUTPUT = HERE / "rank5_ratio_payment_through34_large_core_grid_exact_root_20260826.json"
CHECKPOINT = HERE / "rank5_ratio_payment_through34_large_core_grid_exact_root_20260826.checkpoint.json"
THROUGH28 = HERE / "rank5_ratio_payment_through28_large_core_grid_exact_root_20260826.json"


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def certify_cell(core_order: int, smoothing: int, gamma_branch: str, maximum_depth: int):
    assert 20 <= core_order <= 32
    assert 0 <= smoothing <= 12
    assert core_order + smoothing <= 32
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
        sp.S.Zero
        if gamma_branch == "zero"
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
    cap_gap = sp.factor(c4 - c3 / cap)
    if gamma_branch == "zero":
        assert cap_gap.subs({B: 0, A: 1}) == 0
    assert all(cap_gap.subs({B: b, A: a}) >= 0 for b in (0, 1) for a in (0, 1))
    assert all(c4.subs({B: b, A: a}) > 0 for b in (0, 1) for a in (0, 1))
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
            core_order, smoothing, gamma_branch, label,
            denominator_minimum, denominator_index,
        )
        degrees, coefficients = tensor_bernstein_fast(sp.expand(numerator), variables)
        initial_minimum, initial_index = minimum_with_index(coefficients)
        if initial_minimum >= 0:
            leaves, deepest, terminal_minimum = 1, 0, initial_minimum
        else:
            leaves, deepest, terminal_minimum = certify_adaptive(
                coefficients, degrees, maximum_depth
            )
        rows.append({
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
        })
        print(
            "PASS", core_order, smoothing, gamma_branch, label,
            "leaves", leaves, "depth", deepest,
            flush=True,
        )
    return rows


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--pairs", nargs="*")
    parser.add_argument("--maximum-depth", type=int, default=28)
    parser.add_argument("--test-only", action="store_true")
    args = parser.parse_args()
    expected_pairs = [
        (core, siblings)
        for core in range(20, 33)
        for siblings in range(33 - core)
    ]
    pairs = (
        [tuple(map(int, item.split(":"))) for item in args.pairs]
        if args.pairs
        else expected_pairs
    )
    assert pairs and len(pairs) == len(set(pairs))
    assert all(pair in expected_pairs for pair in pairs)

    started = time.perf_counter()
    current_source_hash = sha256(Path(__file__))
    use_checkpoint = not args.pairs and not args.test_only
    rows = []
    completed_pairs = set()
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
    if use_checkpoint and not completed_pairs:
        seed = json.loads(THROUGH28.read_text(encoding="utf-8"))
        assert seed["status"] == "PASS_EXACT_RANK5_RATIO_PAYMENT_ORDER28_TREE_CELLS"
        rows = seed["cells"]
        grouped = {}
        for row in rows:
            key = (row["core_order"], row["sibling_isolates"])
            grouped.setdefault(key, []).append(row)
        assert len(grouped) == 28 and all(len(group) == 10 for group in grouped.values())
        completed_pairs = set(grouped)
        print("SEED_SEALED_THROUGH28_PAIRS", len(completed_pairs), flush=True)

    for core, siblings in pairs:
        if (core, siblings) in completed_pairs:
            continue
        for branch in ("zero", "cauchy"):
            rows.extend(certify_cell(core, siblings, branch, args.maximum_depth))
        if use_checkpoint:
            temporary = CHECKPOINT.with_suffix(CHECKPOINT.suffix + ".tmp")
            temporary.write_text(
                json.dumps({
                    "source_sha256": current_source_hash,
                    "maximum_depth": args.maximum_depth,
                    "cells": rows,
                }, indent=2) + "\n",
                encoding="utf-8",
            )
            os.replace(temporary, CHECKPOINT)

    assert all(sp.Rational(row["terminal_minimum"]) >= 0 for row in rows)
    if args.test_only:
        print("PASS_TEST_ONLY", len(rows))
        return 0
    assert pairs == expected_pairs and len(rows) == 910

    # The 28 overlapping pairs must reproduce the already sealed through-28
    # producer exactly, including every initial coefficient minimum.
    old = json.loads(THROUGH28.read_text(encoding="utf-8"))
    old_index = {
        (row["core_order"], row["sibling_isolates"], row["gamma_branch"], row["root_region"]): row
        for row in old["cells"]
    }
    overlap = 0
    for row in rows:
        key = (row["core_order"], row["sibling_isolates"], row["gamma_branch"], row["root_region"])
        if key in old_index:
            assert row == old_index[key]
            overlap += 1
    assert overlap == 280

    payload = {
        "schema": "rank5-ratio-payment-through34-large-core-grid-root-v1",
        "status": "PASS_EXACT_RANK5_RATIO_PAYMENT_THROUGH34_LARGE_CORE_GRID",
        "theorem": (
            "For every terminal core of order 20 through 32 and every sibling "
            "count producing a total tree order at most 34, "
            "M_s>=a_s*d_s*e_s*(a_s+d_s)."
        ),
        "core_sibling_pairs": [list(pair) for pair in pairs],
        "total_orders": sorted({core + siblings + 2 for core, siblings in pairs}),
        "coverage": {
            "core_sibling_pairs": len(pairs),
            "analytic_cells": len(rows),
            "negative_terminal_minima": 0,
            "matching_through28_cells": overlap,
        },
        "cells": rows,
        "total_Bernstein_coefficients": sum(row["Bernstein_coefficients"] for row in rows),
        "resources": {"elapsed_seconds": time.perf_counter() - started},
        "artifacts": {
            THROUGH28.name: sha256(THROUGH28),
            "certify_rank5_ratio_payment_order28_large_cores_root.py": sha256(
                HERE / "certify_rank5_ratio_payment_order28_large_cores_root.py"
            ),
            "certify_rank5_ratio_payment_order28_tree_cells_root.py": sha256(
                HERE / "certify_rank5_ratio_payment_order28_tree_cells_root.py"
            ),
        },
        "source_sha256": current_source_hash,
        "scope_warning": (
            "The complete through-34 induction also uses the order-11 base, "
            "the exact small-core grid, and stars."
        ),
    }
    temporary = OUTPUT.with_suffix(OUTPUT.suffix + ".tmp")
    temporary.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    os.replace(temporary, OUTPUT)
    print(payload["status"])
    print("CELLS", len(rows))
    print("SOURCE", current_source_hash)
    print("REPORT", sha256(OUTPUT))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
