#!/usr/bin/env python3
"""Independently replay the path-plus-isolates terminal certificate.

The theorem certificate stores binomial-basis formulas.  This verifier
loads those formulas, evaluates them at a grid of path lengths and
isolate counts, and compares them with exact graph moment-DP values of
the recursive phase gap.
"""

from __future__ import annotations

import argparse
import json
from math import comb
from pathlib import Path

import networkx as nx
import sympy as sp

from stress_sibling_theta_core_recursive_phase_split import (
    recursive_blocks_fast,
)


def graph_value(rank_q: int, length: int, isolates: int) -> int:
    base = nx.path_graph(length + 1)
    next_vertex = length + 1
    base.add_nodes_from(range(next_vertex, next_vertex + isolates))
    return sum(
        recursive_blocks_fast(
            base,
            0,
            length,
            rank_q,
            subtract_lower=True,
        ).values()
    )


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--certificate",
        type=Path,
        default=Path(
            "path_isolate_terminal_fixed_rank_theorem_20260730.json"
        ),
    )
    parser.add_argument("--extra-lengths", type=int, default=5)
    parser.add_argument("--maximum-isolates", type=int, default=8)
    parser.add_argument(
        "--output",
        type=Path,
        default=Path(
            "path_isolate_terminal_fixed_rank_replay_20260730.json"
        ),
    )
    args = parser.parse_args()

    certificate = json.loads(
        args.certificate.read_text(encoding="utf-8")
    )
    length_symbol = sp.Symbol("L")
    failures: list[dict] = []
    checks = 0
    minima: dict[int, tuple[int, dict] | None] = {}

    for rank_certificate in certificate["certificates"]:
        rank_q = int(rank_certificate["rank_q"])
        threshold = int(
            rank_certificate["stable_path_threshold"]
        )
        stable = [
            sp.sympify(item["coefficient_in_L"])
            for item in rank_certificate["stable_coefficients"]
        ]
        boundary = {
            int(item["path_length"]): [
                sp.Integer(value)
                for value in item["binomial_coefficients"]
            ]
            for item in rank_certificate["boundary_certificates"]
        }
        minima[rank_q] = None
        for length in range(
            1, threshold + args.extra_lengths + 1
        ):
            coefficients = (
                boundary[length]
                if length < threshold
                else [
                    sp.Integer(
                        coefficient.subs(length_symbol, length)
                    )
                    for coefficient in stable
                ]
            )
            for isolates in range(args.maximum_isolates + 1):
                formula = sum(
                    int(coefficient) * comb(isolates, index)
                    for index, coefficient in enumerate(coefficients)
                    if index <= isolates
                )
                direct = graph_value(
                    rank_q, length, isolates
                )
                record = {
                    "rank_q": rank_q,
                    "path_length": length,
                    "isolates": isolates,
                    "formula": formula,
                    "direct": direct,
                }
                if formula != direct:
                    failures.append(record)
                current = minima[rank_q]
                if current is None or direct < current[0]:
                    minima[rank_q] = (direct, record)
                checks += 1

    report = {
        "status": (
            "PASS_PATH_ISOLATE_TERMINAL_FIXED_RANK_REPLAY"
            if not failures
            else "FAIL_PATH_ISOLATE_TERMINAL_FIXED_RANK_REPLAY"
        ),
        "certificate": str(args.certificate),
        "certified_ranks": certificate["certified_ranks"],
        "extra_lengths_beyond_stable_threshold": args.extra_lengths,
        "maximum_isolates": args.maximum_isolates,
        "exact_graph_checks": checks,
        "failure_count": len(failures),
        "failures": failures[:20],
        "minimum_direct_values": {
            str(rank): item[1] if item is not None else None
            for rank, item in minima.items()
        },
    }
    args.output.write_text(
        json.dumps(report, indent=2) + "\n", encoding="utf-8"
    )
    print(json.dumps(report, indent=2))


if __name__ == "__main__":
    main()
