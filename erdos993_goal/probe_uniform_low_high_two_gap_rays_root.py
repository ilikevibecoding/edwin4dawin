#!/usr/bin/env python3
"""Exact diagnostic for interactions between two ordinary gap slacks.

This is a falsification/structure probe, not a theorem.  It expands the
uniform low/high strong auxiliary in two selected gap slacks and reports
whether a simple coefficientwise extension of the four-gap boundary can
work.  Negative monomials are not value counterexamples.
"""

from __future__ import annotations

import argparse
import hashlib
import itertools
import json
import os
from pathlib import Path

import sympy as sp

from probe_uniform_low_high_single_gap_rays_root import strong_auxiliary


HERE = Path(__file__).resolve().parent
OUTPUT = HERE / "uniform_low_high_two_gap_rays_probe_root_20260827.json"


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def ratios(rank: int, terminal: int, slacks: dict[int, sp.Expr]):
    result = [sp.Integer(terminal + rank + 1)]
    result.extend(sp.Integer(terminal + rank - index) for index in range(1, rank + 1))
    for gap_index, slack in slacks.items():
        for ratio_index in range(gap_index + 1):
            result[ratio_index] += slack
    return result


def coordinates(rank: int):
    left = [("left", index) for index in [0, *range(2, rank)]]
    right = [("right", index) for index in range(rank)]
    return left, right


def pairs(rank: int):
    left, right = coordinates(rank)
    yield from itertools.combinations(left, 2)
    yield from itertools.product(left, right)
    yield from itertools.combinations(right, 2)


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--rank", type=int, default=8)
    parser.add_argument("--terminals", type=int, nargs=2, default=[0, 0])
    parser.add_argument("--stop-on-first-negative", action="store_true")
    parser.add_argument("--output", type=Path, default=OUTPUT)
    args = parser.parse_args()
    assert args.rank >= 5
    assert all(value >= 0 for value in args.terminals)

    s, t = sp.symbols("s t", nonnegative=True)
    rows = []
    negative_rows = []
    for first, second in pairs(args.rank):
        left_slacks = {}
        right_slacks = {}
        for (side, index), variable in ((first, s), (second, t)):
            target = left_slacks if side == "left" else right_slacks
            target[index] = target.get(index, 0) + variable
        left = ratios(args.rank, args.terminals[0], left_slacks)
        right = ratios(args.rank, args.terminals[1], right_slacks)
        polynomial = sp.Poly(strong_auxiliary(left, right, args.rank), s, t)
        terms = polynomial.terms()
        negative = [(list(power), str(value)) for power, value in terms if value < 0]
        row = {
            "first": list(first),
            "second": list(second),
            "total_degree": polynomial.total_degree(),
            "term_count": len(terms),
            "negative_coefficient_count": len(negative),
            "minimum_coefficient": str(min(value for _, value in terms)),
        }
        rows.append(row)
        if negative:
            negative_rows.append({**row, "negative_terms": negative})
            print("NEGATIVE", first, second, len(negative), flush=True)
            if args.stop_on_first_negative:
                break
        elif len(rows) % 10 == 0:
            print("PASS_ROWS", len(rows), flush=True)

    payload = {
        "schema": "uniform-low-high-two-gap-rays-probe-root-v1",
        "status": (
            "NEGATIVE_MONOMIAL_COEFFICIENT_FOUND_NOT_VALUE_COUNTEREXAMPLE"
            if negative_rows else
            "PASS_EXACT_TWO_GAP_RAYS_COEFFICIENTWISE_ON_TESTED_GRID_EVIDENCE_ONLY"
        ),
        "rank": args.rank,
        "terminals": args.terminals,
        "tested_pairs": len(rows),
        "complete_pair_universe": len(rows) == sum(1 for _ in pairs(args.rank)),
        "negative_pair_count": len(negative_rows),
        "negative_rows": negative_rows,
        "rows": rows,
        "scope_warning": (
            "Fixed-rank, fixed-terminal, two-ray coefficient evidence only. "
            "A negative coefficient is not a negative value and is not a "
            "counterexample to the auxiliary or to Erdos Problem 993."
        ),
        "dependencies": {
            "probe_uniform_low_high_single_gap_rays_root.py": sha256(
                HERE / "probe_uniform_low_high_single_gap_rays_root.py"
            )
        },
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
