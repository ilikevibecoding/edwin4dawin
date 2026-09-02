#!/usr/bin/env python3
"""Exhaustive bounded-coefficient test of pendant-cherry pair closure."""

from __future__ import annotations

import argparse
import itertools
import json
import time
from pathlib import Path

from toeplitz_pair_closure_search import (
    add,
    cherry_transform,
    invariant_failure,
    is_log_concave,
    shift,
    trim,
)


def sequences(degree: int, coefficient_max: int):
    for tail in itertools.product(range(coefficient_max + 1), repeat=degree):
        yield trim([1, *tail])


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--degree-e", type=int, default=3)
    parser.add_argument("--degree-j", type=int, default=3)
    parser.add_argument("--coefficient-max", type=int, default=10)
    parser.add_argument("--require-ej-lc", action="store_true")
    parser.add_argument("--r-values", type=int, nargs="+", default=[2, 3, 4])
    parser.add_argument(
        "--output",
        type=Path,
        default=Path("exhaustive_pair_closure_small_20260726.json"),
    )
    args = parser.parse_args()
    started = time.time()

    e_values = list(sequences(args.degree_e, args.coefficient_max))
    j_values = list(sequences(args.degree_j, args.coefficient_max))
    pairs = 0
    passed_component_lc = 0
    passed_a_lc = 0
    passed_invariant = 0
    checks = 0
    failure = None

    for e in e_values:
        if args.require_ej_lc and not is_log_concave(e):
            continue
        for j in j_values:
            pairs += 1
            if args.require_ej_lc and not is_log_concave(j):
                continue
            passed_component_lc += 1
            d = shift(j)
            a = add(e, d)
            if not is_log_concave(a):
                continue
            passed_a_lc += 1
            if invariant_failure(a, d):
                continue
            passed_invariant += 1
            for r in args.r_values:
                total, occupied = cherry_transform(a, d, r)
                checks += 1
                found = invariant_failure(total, occupied)
                if found:
                    failure = {
                        "E": e,
                        "J": j,
                        "A": a,
                        "D": d,
                        "r": r,
                        "A_prime": total,
                        "D_prime": occupied,
                        **found,
                    }
                    break
            if failure:
                break
        if failure:
            break

    result = {
        "status": "counterexample" if failure else "no_failure",
        "degree_E": args.degree_e,
        "degree_J": args.degree_j,
        "coefficient_max": args.coefficient_max,
        "require_EJ_log_concave": args.require_ej_lc,
        "r_values": args.r_values,
        "E_sequences": len(e_values),
        "J_sequences": len(j_values),
        "pairs_visited": pairs,
        "passed_component_lc": passed_component_lc,
        "passed_A_lc": passed_a_lc,
        "passed_input_invariant": passed_invariant,
        "output_pair_checks": checks,
        "first_failure": failure,
        "elapsed_seconds": time.time() - started,
    }
    args.output.write_text(json.dumps(result, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(result, indent=2))


if __name__ == "__main__":
    main()
