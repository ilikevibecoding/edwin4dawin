#!/usr/bin/env python3
"""Numerically scout one exact singleton-ordinary simplex branch.

This file emits PROBE only.  It evaluates the mapped exact numerator on
random barycentric points in order to distinguish a merely weak homogeneous
basis from a genuinely negative point of the continuous relaxation.
"""

from __future__ import annotations

import argparse

import numpy as np
import sympy as sp

from probe_exact_iso_n5_bundle_g1_singleton_ordinary_strong_simplex_g1_bernstein import (
    mapped_polynomial,
    parse_bits,
    parse_endpoint_states,
)


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--degrees", default="110")
    parser.add_argument("--adjacency", default="000")
    parser.add_argument("--common", default="00")
    parser.add_argument("--endpoints", default="LL")
    parser.add_argument("--uv-common", type=int, choices=(0, 1), default=1)
    parser.add_argument("--parent-state", choices=("Z", "P"), default="P")
    parser.add_argument(
        "--target", choices=("polynomial", "parent-derivative"),
        default="polynomial",
    )
    parser.add_argument("--order", type=int, default=14)
    parser.add_argument("--samples", type=int, default=1_000_000)
    parser.add_argument("--seed", type=int, default=993)
    args = parser.parse_args()

    polynomial, variables = mapped_polynomial(
        parse_bits(args.degrees, 3),
        parse_bits(args.adjacency, 3),
        parse_bits(args.common, 2),
        parse_endpoint_states(args.endpoints),
        "centers", 1, 0, 0, args.uv_common, args.order,
        parent_state=args.parent_state,
    )
    N, X, Y, Z, R, T, L = variables
    expression = sp.expand(polynomial.as_expr().subs(N, 0))
    if args.target == "parent-derivative":
        expression = sp.expand(sp.diff(expression, L).subs(L, 0))
    evaluate = sp.lambdify((X, Y, Z, R, T, L), expression, "numpy", cse=True)

    rng = np.random.default_rng(args.seed)
    best_value = float("inf")
    best_point = None
    done = 0
    while done < args.samples:
        size = min(100_000, args.samples - done)
        barycentric = rng.exponential(1.0, size=(5, size))
        barycentric /= barycentric.sum(axis=0)
        interval = rng.random((2, size))
        arrays = (*barycentric[:4], *interval)
        values = np.asarray(evaluate(*arrays), dtype=float)
        if values.ndim == 0:
            values = np.full(size, float(values))
        index = int(np.argmin(values))
        if values[index] < best_value:
            best_value = float(values[index])
            best_point = {
                name: float(array[index])
                for name, array in zip(("X", "Y", "Z", "R", "T", "L"), arrays)
            }
            best_point["H"] = float(barycentric[4, index])
        done += size

    print({
        "marker": "PROBE_NUMERIC_ISO_N5_BUNDLE_G1_SINGLETON_ORDINARY_SIMPLEX_BRANCH_G1_BERNSTEIN",
        "branch": "/".join((args.degrees, args.adjacency, args.common, args.endpoints, str(args.uv_common))),
        "order": args.order,
        "samples": done,
        "minimum_numerator": best_value,
        "target": args.target,
        "minimizer": best_point,
        "scope": "Randomized continuous-relaxation scouting only; no theorem or counterexample claim.",
    }, flush=True)


if __name__ == "__main__":
    main()
