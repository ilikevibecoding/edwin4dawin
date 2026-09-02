#!/usr/bin/env python3
"""Exhaustively test the proposed paired partial-convolution lemma."""

from __future__ import annotations

import argparse
import itertools
import json
import time
from math import comb
from pathlib import Path

from toeplitz_pair_closure_search import (
    is_log_concave,
    mul,
    partial_failure,
    trim,
)


def partial_input(u: list[int], v: list[int]) -> bool:
    return partial_failure(u, v) is None


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--degree", type=int, default=3)
    parser.add_argument("--coefficient-max", type=int, default=12)
    parser.add_argument("--no-order", action="store_true")
    parser.add_argument("--r-values", type=int, nargs="+", default=[2, 3, 4])
    parser.add_argument(
        "--output",
        type=Path,
        default=Path("exhaustive_paired_convolution.json"),
    )
    args = parser.parse_args()
    started = time.time()
    tails = list(
        itertools.product(
            range(args.coefficient_max + 1), repeat=args.degree
        )
    )
    visited = 0
    ordered = 0
    lc_pairs = 0
    partial_pairs = 0
    output_checks = 0
    failure = None

    for u_tail in tails:
        u = trim([1, *u_tail])
        for v_tail in tails:
            visited += 1
            v = trim([1, *v_tail])
            maximum = max(len(u), len(v))
            if not args.no_order and any(
                (u[k] if k < len(u) else 0)
                > (v[k] if k < len(v) else 0)
                for k in range(maximum)
            ):
                continue
            ordered += 1
            if not is_log_concave(u) or not is_log_concave(v):
                continue
            lc_pairs += 1
            if not partial_input(u, v):
                continue
            partial_pairs += 1
            for r in args.r_values:
                k = [comb(r, i) for i in range(r + 1)]
                ell = k[:]
                ell[1] += 2
                lu = mul(ell, u)
                kv = mul(k, v)
                output_checks += 1
                found = partial_failure(lu, kv)
                if found:
                    failure = {
                        "U": u,
                        "V": v,
                        "r": r,
                        "L_times_U": lu,
                        "K_times_V": kv,
                        **found,
                    }
                    break
            if failure:
                break
        if failure:
            break

    report = {
        "status": "counterexample" if failure else "no_failure",
        "degree": args.degree,
        "coefficient_max": args.coefficient_max,
        "r_values": args.r_values,
        "require_U_le_V": not args.no_order,
        "pairs_visited": visited,
        "coefficientwise_ordered": ordered,
        "log_concave_pairs": lc_pairs,
        "partial_pairs": partial_pairs,
        "output_checks": output_checks,
        "first_failure": failure,
        "elapsed_seconds": time.time() - started,
    }
    args.output.write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(report, indent=2))


if __name__ == "__main__":
    main()
