#!/usr/bin/env python3
"""Exact diagnostic for interactions among three ordinary gap slacks.

This is a falsification/structure probe, not a theorem.  At a fixed rank and
fixed terminal translations it expands the uniform low/high strong auxiliary
in every selected triple of ordinary gap slacks.  A negative monomial
coefficient would obstruct the simplest coefficientwise monotonicity route,
but would not be a negative value or a counterexample to Erdos Problem 993.
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
from probe_uniform_low_high_two_gap_rays_root import coordinates, ratios


HERE = Path(__file__).resolve().parent
OUTPUT = HERE / "uniform_low_high_three_gap_rays_probe_root_20260827.json"


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def triples(rank: int):
    left, right = coordinates(rank)
    yield from itertools.combinations([*left, *right], 3)


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--rank", type=int, default=8)
    parser.add_argument("--terminals", type=int, nargs=2, default=[0, 0])
    parser.add_argument("--stop-on-first-negative", action="store_true")
    parser.add_argument("--output", type=Path, default=OUTPUT)
    args = parser.parse_args()
    assert args.rank >= 5
    assert all(value >= 0 for value in args.terminals)

    variables = sp.symbols("s t u", nonnegative=True)
    rows = []
    negative_rows = []
    complete_universe_size = sum(1 for _ in triples(args.rank))
    for selected in triples(args.rank):
        left_slacks: dict[int, sp.Expr] = {}
        right_slacks: dict[int, sp.Expr] = {}
        for (side, index), variable in zip(selected, variables, strict=True):
            target = left_slacks if side == "left" else right_slacks
            target[index] = target.get(index, 0) + variable
        left = ratios(args.rank, args.terminals[0], left_slacks)
        right = ratios(args.rank, args.terminals[1], right_slacks)
        polynomial = sp.Poly(
            strong_auxiliary(left, right, args.rank), *variables
        )
        terms = polynomial.terms()
        negative = [
            (list(power), str(value)) for power, value in terms if value < 0
        ]
        row = {
            "selected": [list(item) for item in selected],
            "total_degree": polynomial.total_degree(),
            "term_count": len(terms),
            "negative_coefficient_count": len(negative),
            "minimum_coefficient": str(min(value for _, value in terms)),
        }
        rows.append(row)
        if negative:
            negative_rows.append({**row, "negative_terms": negative})
            print("NEGATIVE", selected, len(negative), flush=True)
            if args.stop_on_first_negative:
                break
        elif len(rows) % 10 == 0:
            print("PASS_ROWS", len(rows), "OF", complete_universe_size, flush=True)

    payload = {
        "schema": "uniform-low-high-three-gap-rays-probe-root-v1",
        "status": (
            "NEGATIVE_MONOMIAL_COEFFICIENT_FOUND_NOT_VALUE_COUNTEREXAMPLE"
            if negative_rows else
            "PASS_EXACT_THREE_GAP_RAYS_COEFFICIENTWISE_ON_TESTED_GRID_EVIDENCE_ONLY"
        ),
        "rank": args.rank,
        "terminals": args.terminals,
        "tested_triples": len(rows),
        "complete_triple_universe_size": complete_universe_size,
        "complete_triple_universe": len(rows) == complete_universe_size,
        "negative_triple_count": len(negative_rows),
        "negative_rows": negative_rows,
        "rows": rows,
        "scope_warning": (
            "Fixed-rank, fixed-terminal, three-ray coefficient evidence only. "
            "A negative coefficient is not a negative value and is not a "
            "counterexample to the auxiliary or to Erdos Problem 993."
        ),
        "dependencies": {
            "probe_uniform_low_high_single_gap_rays_root.py": sha256(
                HERE / "probe_uniform_low_high_single_gap_rays_root.py"
            ),
            "probe_uniform_low_high_two_gap_rays_root.py": sha256(
                HERE / "probe_uniform_low_high_two_gap_rays_root.py"
            ),
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
