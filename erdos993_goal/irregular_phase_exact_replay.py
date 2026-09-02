#!/usr/bin/env python3
"""Exact coefficient replay for nonperiodic spherically symmetric trees.

The leaf-to-root branching word ``(d_1,...,d_h)`` is interpreted exactly as
in ``irregular_phase_moment_search.py``.  If ``E`` and ``B`` count rooted
independent sets with the current root respectively absent and present, then

    E_new = (E+B)^d,       B_new = x E^d.

All arithmetic is over FLINT integers.  The output reports exact unimodality,
the strongest post-descent rebound ratio, and the two-step-extension profile.
"""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

from flint import fmpz_poly as Poly

from pattern_family_valley_search import profile


if hasattr(sys, "set_int_max_str_digits"):
    sys.set_int_max_str_digits(0)

X = Poly([0, 1])


def rooted_polynomials(word: tuple[int, ...]) -> tuple[Poly, Poly, int]:
    absent = Poly([1])
    present = X
    order = 1
    for branching in word:
        total = absent + present
        absent, present = total**branching, X * absent**branching
        order = 1 + branching * order
    return absent, present, order


def two_step_profile(coefficients: list[int], alpha: int) -> dict:
    cutoff = (2 * alpha - 1 + 2) // 3 - 3
    worst = None
    for k in range(max(0, cutoff + 1)):
        if k + 3 >= len(coefficients):
            break
        a0, a1, a2, a3 = coefficients[k : k + 4]
        numerator = (k + 3) * a3 * a0
        denominator = ((k + 1) * a1 + 2 * a0) * a2
        record = {
            "k": k,
            "numerator": numerator,
            "denominator": denominator,
            "ratio": numerator / denominator,
            "holds": numerator <= denominator,
        }
        if worst is None or (
            numerator * worst["denominator"]
            > worst["numerator"] * denominator
        ):
            worst = record
    return {"cutoff": cutoff, "worst": worst}


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument(
        "--word",
        action="append",
        required=True,
        help="Comma-separated leaf-to-root branching word; repeatable.",
    )
    parser.add_argument(
        "--output",
        type=Path,
        default=Path("irregular_phase_exact_replay.json"),
    )
    args = parser.parse_args()

    records = []
    for text_word in args.word:
        word = tuple(int(piece) for piece in text_word.split(",") if piece)
        absent, present, order = rooted_polynomials(word)
        total = absent + present
        coefficients = [int(c) for c in total]
        result = profile(total)
        record = {
            "word_leaf_to_root": list(word),
            "order": order,
            "degree": len(total) - 1,
            "profile": result,
            "two_step": two_step_profile(coefficients, len(total) - 1),
        }
        records.append(record)
        rebound = result["best_post_descent_ratio"]
        rebound_text = (
            "none" if rebound is None else f"{rebound['decimal']:.12g}"
        )
        print(
            f"word={word} n={order} degree={len(total)-1} "
            f"unimodal={result['unimodal']} "
            f"rebound={rebound_text}",
            flush=True,
        )

    payload = {"status": "complete", "records": records}
    args.output.write_text(json.dumps(payload, indent=2), encoding="utf-8")
    return 1 if any(not x["profile"]["unimodal"] for x in records) else 0


if __name__ == "__main__":
    raise SystemExit(main())
