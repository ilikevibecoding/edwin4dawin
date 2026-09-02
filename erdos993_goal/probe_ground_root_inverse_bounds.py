#!/usr/bin/env python3
"""Probe exact-structure lower bounds for the current ground root.

After the alternating-sign similarity, the current Jacobi matrix is a
positive definite tridiagonal M-matrix K.  Hence K^{-1} is entrywise
nonnegative and

    lambda_min(K) >= 1 / ||K^{-1}||_infinity
                  = 1 / max_i (K^{-1} 1)_i.

This script compares that rationally certifiable bound with the tail
threshold needed by the ground-deflated Weyl argument.
"""

from __future__ import annotations

import argparse
import json
import math
from pathlib import Path

import numpy as np
import sympy as sp
from scipy.linalg import eigh_tridiagonal, solve_banded


HERE = Path(__file__).resolve().parent
R, U, V, C = sp.symbols("r u v c")


def load_numeric(parity: str):
    local = {"r": R, "u": U, "v": V, "c": C}
    components_raw = json.loads(
        (HERE / f"ground_deflated_tail_endpoint_{parity}_symbolic_components_20260806.json").read_text(
            encoding="utf-8"
        )
    )["records"][0]["target_expressions"]
    tail_raw = json.loads(
        (HERE / f"one_sided_darboux_{parity}_tail_cache_20260806.json").read_text(
            encoding="utf-8"
        )
    )["current"]
    components = {
        name: sp.sympify(value, locals=local)
        for name, value in components_raw.items()
    }
    tail = {name: sp.sympify(value, locals=local) for name, value in tail_raw.items()}
    expression_raw = json.loads(
        (HERE / f"one_sided_darboux_{parity}_expression_cache_20260806.json").read_text(
            encoding="utf-8"
        )
    )["expressions"]
    expressions = {name: sp.sympify(value, locals=local) for name, value in expression_raw.items()}
    names = [
        "endpoint_margin_at_zero_shift",
        "shift_slope_denominator",
        "current_last_cholesky_pivot",
    ]
    component_function = sp.lambdify(
        (R, U, V, C), [components[name] for name in names], modules="numpy", cse=True
    )
    tail_names = ["d_previous", "d_last", "terminal", "b_previous"]
    tail_function = sp.lambdify(
        (R, U, V, C), [tail[name] for name in tail_names], modules="numpy", cse=True
    )
    pivot_function = sp.lambdify(
        (R, U, V, C), expressions["current_penultimate_cholesky_pivot"], modules="numpy", cse=True
    )
    return component_function, tail_function, pivot_function


def current_tridiagonal(
    parity: str,
    r: int,
    u: float,
    v: float,
    c: float,
    tail_function,
) -> tuple[np.ndarray, np.ndarray]:
    if parity == "odd":
        p, alpha, beta = 2 * r + 13, 2 * r, 0.5
    else:
        p, alpha, beta = 2 * r + 14, 2 * r + 1, -0.5
    degree = p // 2

    def top(k: int) -> tuple[float, float]:
        denominator = 2 * k + alpha + beta
        c0 = -k * (k + alpha) / denominator
        e0 = (
            k
            * (k - 1)
            * (k + alpha - 1)
            * (k + alpha)
            / (2 * (denominator - 1) * denominator)
        )
        return c0, e0

    diagonal = np.empty(degree)
    offdiagonal = np.empty(degree - 1)
    for k in range(degree):
        c0, e0 = top(k)
        c1, e1 = top(k + 1)
        diagonal[k] = c0 - c1
        if k:
            offdiagonal[k - 1] = math.sqrt(e0 - e1 - diagonal[k] * c0)
    d_previous, d_last, terminal, _ = tail_function(r, u, v, c)
    diagonal[-2:] = [float(d_previous), float(d_last)]
    offdiagonal[-1] = math.sqrt(float(terminal))
    return diagonal, offdiagonal


def one_case(parity: str, r: int, u: float, v: float, c: float, functions) -> dict[str, float | int | str]:
    component_function, tail_function, pivot_function = functions
    g0, slope, q2 = [float(x) for x in component_function(r, u, v, c)]
    threshold = -q2 * g0 / slope if g0 < 0.0 else 0.0
    diagonal, offdiagonal = current_tridiagonal(parity, r, u, v, c, tail_function)
    d_previous, d_last, terminal, b_previous = [
        float(x) for x in tail_function(r, u, v, c)
    ]
    q1 = float(pivot_function(r, u, v, c))
    m0 = (d_previous - q1) / b_previous
    lambda_bar = 0.25 if ((parity == "odd" and r >= 9) or (parity == "even" and r >= 8)) else 0.0
    resolvent_determinant_bound = float("nan")
    resolvent_a_bound = float("nan")
    if threshold < lambda_bar:
        m_bound = m0 / (1.0 - threshold / lambda_bar)
        resolvent_a_bound = d_previous - threshold - b_previous * m_bound
        resolvent_determinant_bound = (
            (d_last - threshold) * resolvent_a_bound - terminal
        )
    continued_fraction_success_depth = None
    continued_fraction_depth_records = []
    classical_length = len(diagonal) - 2
    if threshold < lambda_bar and classical_length > 0:
        classical_pivots = np.empty(classical_length)
        classical_pivots[0] = diagonal[0]
        for index in range(1, classical_length):
            classical_pivots[index] = (
                diagonal[index]
                - offdiagonal[index - 1] ** 2 / classical_pivots[index - 1]
            )
        for depth in range(min(32, classical_length - 1) + 1):
            cut = classical_length - depth
            endpoint_resolvent_upper = (
                1.0 / classical_pivots[cut - 1] / (1.0 - threshold / lambda_bar)
            )
            valid = True
            for index in range(cut, classical_length):
                denominator = (
                    diagonal[index]
                    - threshold
                    - offdiagonal[index - 1] ** 2 * endpoint_resolvent_upper
                )
                if denominator <= 0.0:
                    valid = False
                    break
                endpoint_resolvent_upper = 1.0 / denominator
            if valid:
                a_bound = (
                    d_previous - threshold - b_previous * endpoint_resolvent_upper
                )
                determinant_bound = (d_last - threshold) * a_bound - terminal
            else:
                a_bound = determinant_bound = float("-inf")
            continued_fraction_depth_records.append(
                [depth, a_bound, determinant_bound]
            )
            if a_bound > 0.0 and determinant_bound > 0.0:
                continued_fraction_success_depth = depth
                break
    tau = float(
        eigh_tridiagonal(
            diagonal,
            offdiagonal,
            select="i",
            select_range=(0, 0),
            check_finite=False,
            eigvals_only=True,
        )[0]
    )
    # K is the alternating-sign similarity of M and has negative offdiagonal.
    banded = np.zeros((3, len(diagonal)))
    banded[1] = diagonal
    banded[0, 1:] = -offdiagonal
    banded[2, :-1] = -offdiagonal
    ones = np.ones(len(diagonal))
    inverse_powers = []
    previous = ones
    collatz_bounds = []
    collatz_indices = []
    for _ in range(6):
        current = solve_banded((1, 1), banded, previous, check_finite=False)
        ratios = current / previous
        collatz_bounds.append(1.0 / float(np.max(ratios)))
        collatz_indices.append(int(np.argmax(ratios)))
        inverse_powers.append(current)
        previous = current
    # Tail-column start: K^{-1}e_last is already strictly positive, and its
    # power ratios are resolvent moments of the last-coordinate spectral
    # measure.  Those admit compact formulas from characteristic derivatives.
    tail_vector = np.zeros(len(diagonal))
    tail_vector[-1] = 1.0
    previous = solve_banded((1, 1), banded, tail_vector, check_finite=False)
    tail_collatz_bounds = []
    tail_collatz_indices = []
    for _ in range(6):
        current = solve_banded((1, 1), banded, previous, check_finite=False)
        ratios = current / previous
        tail_collatz_bounds.append(1.0 / float(np.max(ratios)))
        tail_collatz_indices.append(int(np.argmax(ratios)))
        previous = current
    # Rational nonsymmetric similarity: superdiagonal -1 and subdiagonal
    # -b_i.  Starting from 1 keeps every power rational in the matrix data,
    # which makes a symbolic all-order certificate conceivable.
    rational_banded = np.zeros((3, len(diagonal)))
    rational_banded[1] = diagonal
    rational_banded[0, 1:] = -1.0
    rational_banded[2, :-1] = -(offdiagonal * offdiagonal)
    rational_collatz_bounds = []
    rational_collatz_indices = []
    previous = np.ones(len(diagonal))
    for _ in range(8):
        current = solve_banded((1, 1), rational_banded, previous, check_finite=False)
        ratios = current / previous
        rational_collatz_bounds.append(1.0 / float(np.max(ratios)))
        rational_collatz_indices.append(int(np.argmax(ratios)))
        previous = current
    # A balanced rational similarity uses the zero-shift LDL pivots q_i:
    # split b_i as q_{i-1} * (b_i/q_{i-1}).  Both offdiagonals are rational
    # and of the natural scale of the diagonal.
    pivots = np.empty(len(diagonal))
    pivots[0] = diagonal[0]
    for index in range(1, len(diagonal)):
        pivots[index] = diagonal[index] - offdiagonal[index - 1] ** 2 / pivots[index - 1]
    balanced_rational_banded = np.zeros((3, len(diagonal)))
    balanced_rational_banded[1] = diagonal
    balanced_rational_banded[0, 1:] = -pivots[:-1]
    balanced_rational_banded[2, :-1] = -(offdiagonal * offdiagonal) / pivots[:-1]
    balanced_rational_collatz_bounds = []
    balanced_rational_collatz_indices = []
    previous = np.ones(len(diagonal))
    for _ in range(8):
        current = solve_banded((1, 1), balanced_rational_banded, previous, check_finite=False)
        ratios = current / previous
        balanced_rational_collatz_bounds.append(1.0 / float(np.max(ratios)))
        balanced_rational_collatz_indices.append(int(np.argmax(ratios)))
        previous = current
    swapped_balanced_banded = np.zeros((3, len(diagonal)))
    swapped_balanced_banded[1] = diagonal
    swapped_balanced_banded[0, 1:] = -(offdiagonal * offdiagonal) / pivots[:-1]
    swapped_balanced_banded[2, :-1] = -pivots[:-1]
    swapped_balanced_bounds = []
    swapped_balanced_indices = []
    previous = np.ones(len(diagonal))
    for _ in range(8):
        current = solve_banded((1, 1), swapped_balanced_banded, previous, check_finite=False)
        ratios = current / previous
        swapped_balanced_bounds.append(1.0 / float(np.max(ratios)))
        swapped_balanced_indices.append(int(np.argmax(ratios)))
        previous = current
    row_sums = inverse_powers[0]
    inverse_infimum_bound = collatz_bounds[0]
    maximum_index = collatz_indices[0]
    return {
        "parity": parity,
        "r": r,
        "degree": len(diagonal),
        "u": u,
        "v": v,
        "c": c,
        "g0": g0,
        "threshold": threshold,
        "tau": tau,
        "tau_minus_threshold": tau - threshold,
        "inverse_infimum_bound": inverse_infimum_bound,
        "bound_minus_threshold": inverse_infimum_bound - threshold,
        "bound_over_tau": inverse_infimum_bound / tau,
        "maximum_row_sum_index": maximum_index,
        "quarter_prefix_resolvent_a_bound": resolvent_a_bound,
        "quarter_prefix_resolvent_determinant_bound": resolvent_determinant_bound,
        "continued_fraction_success_depth": continued_fraction_success_depth,
        "continued_fraction_last_record": continued_fraction_depth_records[-1]
        if continued_fraction_depth_records
        else None,
        "collatz_bounds_through_power_6": collatz_bounds,
        "collatz_bound_6_minus_threshold": collatz_bounds[-1] - threshold,
        "collatz_maximum_indices": collatz_indices,
        "tail_column_collatz_bounds_through_power_6": tail_collatz_bounds,
        "tail_column_bound_6_minus_threshold": tail_collatz_bounds[-1] - threshold,
        "tail_column_collatz_maximum_indices": tail_collatz_indices,
        "rational_collatz_bounds_through_power_8": rational_collatz_bounds,
        "rational_bound_8_minus_threshold": rational_collatz_bounds[-1] - threshold,
        "rational_collatz_maximum_indices": rational_collatz_indices,
        "balanced_rational_collatz_bounds_through_power_8": balanced_rational_collatz_bounds,
        "balanced_rational_bound_8_minus_threshold": balanced_rational_collatz_bounds[-1] - threshold,
        "balanced_rational_collatz_maximum_indices": balanced_rational_collatz_indices,
        "swapped_balanced_collatz_bounds_through_power_8": swapped_balanced_bounds,
        "swapped_balanced_bound_8_minus_threshold": swapped_balanced_bounds[-1] - threshold,
        "swapped_balanced_collatz_maximum_indices": swapped_balanced_indices,
    }


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--parity", choices=("odd", "even"), default="odd")
    parser.add_argument("--random-cases", type=int, default=200)
    parser.add_argument("--max-r", type=int, default=20_000)
    parser.add_argument("--seed", type=int, default=993)
    args = parser.parse_args()
    functions = load_numeric(args.parity)
    cases = [
        one_case(args.parity, 9022, 0.023376677204156343, 0.0023847789529758707, 0.4079050597903485, functions),
        one_case(args.parity, 100, 0.0, 0.0, 0.001, functions),
    ] if args.parity == "odd" else []
    rng = np.random.default_rng(args.seed)
    attempts = 0
    while len(cases) < args.random_cases + (2 if args.parity == "odd" else 0) and attempts < 20 * args.random_cases:
        attempts += 1
        r = int(np.expm1(rng.uniform(0.0, np.log1p(args.max_r))))
        # Focus on the empirically thin g0<0 chamber.
        u, v = rng.uniform(0.0, 0.45, 2)
        c = float(np.expm1(rng.uniform(np.log1p(1e-8), np.log1p(3.0))))
        record = one_case(args.parity, r, float(u), float(v), c, functions)
        if record["g0"] < 0.0:
            cases.append(record)
    failures = [record for record in cases if record["bound_minus_threshold"] < -1e-9]
    power6_failures = [
        record for record in cases if record["collatz_bound_6_minus_threshold"] < -1e-9
    ]
    tail_power6_failures = [
        record for record in cases if record["tail_column_bound_6_minus_threshold"] < -1e-9
    ]
    rational_power8_failures = [
        record for record in cases if record["rational_bound_8_minus_threshold"] < -1e-9
    ]
    balanced_rational_power8_failures = [
        record for record in cases if record["balanced_rational_bound_8_minus_threshold"] < -1e-9
    ]
    swapped_balanced_power8_failures = [
        record for record in cases if record["swapped_balanced_bound_8_minus_threshold"] < -1e-9
    ]
    report = {
        "status": "GROUND_ROOT_INVERSE_NORM_BOUND_PROBE",
        "parity": args.parity,
        "conditional_cases": len(cases),
        "attempts": attempts,
        "bound_failures": len(failures),
        "power6_bound_failures": len(power6_failures),
        "tail_column_power6_bound_failures": len(tail_power6_failures),
        "rational_power8_bound_failures": len(rational_power8_failures),
        "balanced_rational_power8_bound_failures": len(balanced_rational_power8_failures),
        "swapped_balanced_power8_bound_failures": len(swapped_balanced_power8_failures),
        "worst_bound_margin": min(cases, key=lambda item: item["bound_minus_threshold"]),
        "least_sharp_bound": min(cases, key=lambda item: item["bound_over_tau"]),
        "worst_power6_bound_margin": min(
            cases, key=lambda item: item["collatz_bound_6_minus_threshold"]
        ),
        "worst_tail_column_power6_bound_margin": min(
            cases, key=lambda item: item["tail_column_bound_6_minus_threshold"]
        ),
        "worst_rational_power8_bound_margin": min(
            cases, key=lambda item: item["rational_bound_8_minus_threshold"]
        ),
        "worst_balanced_rational_power8_bound_margin": min(
            cases, key=lambda item: item["balanced_rational_bound_8_minus_threshold"]
        ),
        "worst_swapped_balanced_power8_bound_margin": min(
            cases, key=lambda item: item["swapped_balanced_bound_8_minus_threshold"]
        ),
        "maximum_row_sum_index_patterns": {
            str(index): sum(record["maximum_row_sum_index"] == index for record in cases)
            for index in sorted({record["maximum_row_sum_index"] for record in cases})
        },
        "first_failures": failures[:5],
        "continued_fraction_uncertified": sum(
            record["continued_fraction_success_depth"] is None for record in cases
        ),
        "maximum_continued_fraction_success_depth": max(
            (
                record["continued_fraction_success_depth"]
                for record in cases
                if record["continued_fraction_success_depth"] is not None
            ),
            default=None,
        ),
        "continued_fraction_depth_patterns": {
            str(depth): sum(record["continued_fraction_success_depth"] == depth for record in cases)
            for depth in sorted(
                {
                    record["continued_fraction_success_depth"]
                    for record in cases
                    if record["continued_fraction_success_depth"] is not None
                }
            )
        },
        "first_continued_fraction_uncertified": [
            record
            for record in cases
            if record["continued_fraction_success_depth"] is None
        ][:10],
    }
    output = HERE / f"ground_root_inverse_norm_bound_{args.parity}_probe_20260806.json"
    output.write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(report, indent=2))
    print(output)


if __name__ == "__main__":
    main()
