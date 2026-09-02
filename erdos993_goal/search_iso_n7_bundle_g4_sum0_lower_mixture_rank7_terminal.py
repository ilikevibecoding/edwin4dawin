#!/usr/bin/env python3
"""Search a fixed rigorous B5-lower-bound mixture for the exact-shift g4 branch.

Each of three B5 lower bounds is universally valid.  Any fixed convex
combination is therefore valid and yields one polynomial instead of a
piecewise maximum.  This deterministic sampled linear program searches such
a mixture.  Its result is diagnostic until an exact Bernstein replay is run.
"""

from __future__ import annotations

import hashlib
import json
from pathlib import Path

import numpy as np
from scipy.optimize import linprog
import sympy as sp


HERE = Path(__file__).resolve().parent
PROBE_SOURCE = HERE / "probe_iso_n7_bundle_g4_sum0_exact_shift_rank7_terminal.py"
PROBE_REPORT = HERE / "iso_n7_bundle_g4_sum0_exact_shift_probe_rank7_terminal_20260831.json"
OUTPUT = HERE / "iso_n7_bundle_g4_sum0_lower_mixture_search_rank7_terminal_20260831.json"
MARKER = "SEARCH_ISO_N7_BUNDLE_G4_SUM0_LOWER_MIXTURE_RANK7_TERMINAL"


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def build_candidates(report):
    n, ef, wf, tf, p5 = sp.symbols(
        "n edge_fraction wedge_fraction subtree3_fraction p5"
    )
    W = {rank: sp.Symbol(f"W{rank}") for rank in range(2, 6)}
    locals_map = {
        "n": n,
        "edge_fraction": ef,
        "wedge_fraction": wf,
        "subtree3_fraction": tf,
        "p5": p5,
        **{f"W{rank}": W[rank] for rank in W},
    }
    residual = sp.sympify(report["exact_shift_residual"], locals=locals_map)
    boxes = report["shared_edge_boxes"]["exact_B4_relaxed_T4"]
    candidates = {}
    for label, rows in boxes.items():
        substitution = {
            W[rank]: sp.sympify(rows[f"W{rank}"], locals=locals_map)
            for rank in range(2, 6)
        }
        candidates[label] = sp.factor(residual.subs(substitution, simultaneous=True))
    return (n, ef, wf, tf, p5), candidates


def sampled_matrix(arguments, candidates, seed, per_order):
    rng = np.random.default_rng(seed)
    orders = list(range(8, 61)) + [80, 100, 140, 200, 300, 500]
    labels = tuple(sorted(candidates))
    blocks = []
    for order in orders:
        points = rng.random((per_order, 4))
        columns = []
        for label in labels:
            value = sp.lambdify(arguments[1:], candidates[label].subs(arguments[0], order), "numpy")
            result = np.asarray(value(*points.T), dtype=float)
            if result.ndim == 0:
                result = np.full(per_order, float(result))
            columns.append(result / float(order**7))
        blocks.append(np.column_stack(columns))
    return labels, orders, np.vstack(blocks)


def solve_mixture(matrix):
    rows, columns = matrix.shape
    # Variables are lambda_1,...,lambda_c,t; maximize t.
    objective = np.zeros(columns + 1)
    objective[-1] = -1
    inequalities = np.column_stack((-matrix, np.ones(rows)))
    result = linprog(
        objective,
        A_ub=inequalities,
        b_ub=np.zeros(rows),
        A_eq=np.array([[1.0] * columns + [0.0]]),
        b_eq=np.array([1.0]),
        bounds=[(0.0, 1.0)] * columns + [(None, None)],
        method="highs",
    )
    assert result.success, result.message
    return result.x[:-1], result.x[-1]


def main():
    report = json.loads(PROBE_REPORT.read_text(encoding="utf-8"))
    assert report["marker"] == "PROBE_ISO_N7_BUNDLE_G4_SUM0_EXACT_SHIFT_RANK7_TERMINAL"
    assert sha256(PROBE_SOURCE) == report["source_sha256"]
    arguments, candidates = build_candidates(report)

    labels, orders, training = sampled_matrix(arguments, candidates, 993070404, 4000)
    weights, margin = solve_mixture(training)
    labels2, orders2, validation = sampled_matrix(arguments, candidates, 993070405, 8000)
    assert labels2 == labels
    validation_values = validation @ weights
    minimum_index = int(np.argmin(validation_values))
    per_order = 8000
    minimum_order = orders2[minimum_index // per_order]
    rational_weights = [sp.Rational(float(value)).limit_denominator(10000) for value in weights]
    rational_sum = sum(rational_weights)
    rational_weights = [sp.factor(value / rational_sum) for value in rational_weights]
    rational_vector = np.array([float(value) for value in rational_weights])
    rational_validation = validation @ rational_vector

    result = {
        "marker": MARKER,
        "candidate_labels": list(labels),
        "training": {
            "seed": 993070404,
            "orders": orders,
            "points": int(training.shape[0]),
            "optimal_weights": weights.tolist(),
            "normalized_margin": float(margin),
        },
        "rationalized_weights": {
            label: str(value) for label, value in zip(labels, rational_weights)
        },
        "validation": {
            "seed": 993070405,
            "orders": orders2,
            "points": int(validation.shape[0]),
            "minimum_normalized_value_float_weights": float(validation_values[minimum_index]),
            "minimum_order_float_weights": minimum_order,
            "minimum_normalized_value_rational_weights": float(np.min(rational_validation)),
            "negative_count_rational_weights": int(np.sum(rational_validation < -1e-10)),
        },
        "status": "sampled mixture search only; exact Bernstein certification still required",
        "dependencies_sha256": {
            PROBE_SOURCE.name: sha256(PROBE_SOURCE),
            PROBE_REPORT.name: sha256(PROBE_REPORT),
        },
        "source_sha256": sha256(Path(__file__)),
    }
    encoded = json.dumps(result, indent=2, sort_keys=True) + "\n"
    OUTPUT.write_text(encoded, encoding="utf-8", newline="\n")
    print(json.dumps({
        "marker": MARKER,
        "weights": result["rationalized_weights"],
        "training_margin": result["training"]["normalized_margin"],
        "validation": result["validation"],
        "source_sha256": result["source_sha256"],
        "report_sha256": hashlib.sha256(encoded.encode()).hexdigest().upper(),
    }, indent=2, sort_keys=True))
    print(MARKER)


if __name__ == "__main__":
    main()
