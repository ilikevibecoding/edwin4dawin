#!/usr/bin/env python3
"""Exact coefficient probe for one ordinary gap slack off the zero-slack face.

This is a falsification/structure probe, not a proof.  At fixed rank and fixed
terminal translations x,y it introduces one nonnegative gap slack s into
either row, expands the complete low/high strong auxiliary exactly in s, and
records any negative coefficients.
"""

from __future__ import annotations

import argparse
import hashlib
import json
import math
import os
from pathlib import Path

import sympy as sp


HERE = Path(__file__).resolve().parent
OUTPUT = HERE / "uniform_low_high_single_gap_rays_probe_root_20260827.json"


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def minimal_ratios(rank: int, terminal: int, slack, gap_index: int | None):
    ratios = [terminal + rank + 1]
    ratios.extend(terminal + rank - index for index in range(1, rank + 1))
    if gap_index is not None:
        for index in range(gap_index + 1):
            ratios[index] += slack
    return ratios


def coefficients(ratios):
    result = [sp.Integer(1)]
    for ratio in ratios:
        result.append(sp.expand(result[-1] * ratio))
    return result


def convolution_at(left, right, degree: int):
    return sp.expand(sum(
        math.comb(degree, index) * left[index] * right[degree - index]
        for index in range(degree + 1)
    ))


def strong_auxiliary(left_ratios, right_ratios, rank: int):
    left = coefficients(left_ratios)
    right = coefficients(right_ratios)
    tail = [sp.Integer(0), sp.Integer(0), sp.Integer(0), *left[3:]]
    c = [convolution_at(left, right, degree) for degree in (rank - 1, rank, rank + 1)]
    v = [convolution_at(tail, right, degree) for degree in (rank - 1, rank, rank + 1)]
    margin = sp.expand(c[1] ** 2 - c[0] * c[2] - c[0] * c[1])
    derivative = sp.expand(
        2 * c[1] * v[1] - c[0] * v[2] - v[0] * c[2]
        - c[0] * v[1] - v[0] * c[1]
    )
    return sp.expand(left_ratios[2] * margin + derivative)


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--minimum-rank", type=int, default=8)
    parser.add_argument("--maximum-rank", type=int, default=20)
    parser.add_argument("--terminals", type=int, nargs="+", default=[0, 1, 3, 11])
    parser.add_argument("--output", type=Path, default=OUTPUT)
    args = parser.parse_args()
    assert 5 <= args.minimum_rank <= args.maximum_rank
    assert all(value >= 0 for value in args.terminals)

    s = sp.Symbol("s", nonnegative=True)
    rows = []
    negative_rows = []
    global_minimum = None
    for rank in range(args.minimum_rank, args.maximum_rank + 1):
        rank_rows = 0
        for x in args.terminals:
            for y in args.terminals:
                for side in ("left", "right"):
                    allowed = (
                        [0, *range(2, rank)] if side == "left"
                        else list(range(rank))
                    )
                    for gap_index in allowed:
                        left_ratios = minimal_ratios(
                            rank, x, s if side == "left" else 0,
                            gap_index if side == "left" else None,
                        )
                        right_ratios = minimal_ratios(
                            rank, y, s if side == "right" else 0,
                            gap_index if side == "right" else None,
                        )
                        polynomial = sp.Poly(
                            strong_auxiliary(left_ratios, right_ratios, rank), s
                        )
                        coefficient_rows = [int(value) for value in polynomial.all_coeffs()]
                        minimum = min(coefficient_rows)
                        row = {
                            "rank": rank,
                            "x": x,
                            "y": y,
                            "side": side,
                            "gap_index": gap_index,
                            "degree": polynomial.degree(),
                            "coefficient_count": len(coefficient_rows),
                            "minimum_coefficient": minimum,
                            "negative_coefficient_count": sum(
                                value < 0 for value in coefficient_rows
                            ),
                        }
                        rows.append(row)
                        rank_rows += 1
                        if global_minimum is None or minimum < global_minimum:
                            global_minimum = minimum
                        if row["negative_coefficient_count"]:
                            negative_rows.append({
                                **row,
                                "coefficients_descending": coefficient_rows,
                            })
        print(
            "RANK", rank, "ROWS", rank_rows,
            "NEGATIVE_ROWS", sum(row["rank"] == rank for row in negative_rows),
            flush=True,
        )

    payload = {
        "schema": "uniform-low-high-single-gap-rays-probe-root-v1",
        "status": (
            "NEGATIVE_MONOMIAL_COEFFICIENT_FOUND_NOT_VALUE_COUNTEREXAMPLE"
            if negative_rows else
            "PASS_EXACT_SINGLE_GAP_RAYS_COEFFICIENTWISE_ON_TESTED_GRID_EVIDENCE_ONLY"
        ),
        "rank_range": [args.minimum_rank, args.maximum_rank],
        "terminal_grid": args.terminals,
        "tested_rows": len(rows),
        "negative_rows": negative_rows,
        "negative_row_count": len(negative_rows),
        "global_minimum_coefficient": global_minimum,
        "scope_warning": (
            "Finite fixed-terminal single-ray coefficient evidence only; it is "
            "not a proof for symbolic x,y or simultaneous gap slacks."
        ),
        "source_sha256": sha256(Path(__file__)),
    }
    output = args.output.resolve()
    temporary = output.with_suffix(output.suffix + ".tmp")
    temporary.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    os.replace(temporary, output)
    print(payload["status"], flush=True)
    print("REPORT", sha256(output), flush=True)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
