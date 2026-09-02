#!/usr/bin/env python3
"""Adversarial scalar probe for the C12 pendant-curvature target.

This deliberately samples a relaxation of genuine forest data.  It is a
route falsifier, not a graph counterexample.  The relaxation retains two
adjacent lower-forest GSB reserves, the exact two-extension lower transfer,
and the observed root-avoidance bound q1 >= (3/4) min(q0,q2).
"""

from __future__ import annotations

import argparse
import json
import math
import random
from pathlib import Path


def c12_margin(
    k: int,
    extension0: float,
    extension1: float,
    extension2: float,
    q0: float,
    q1: float,
    q2: float,
) -> float:
    s = extension0 / (k - 1)
    u = extension1 / k
    v = extension2 / (k + 1)
    p_ratio0 = s * (1 + u + q1) / (1 + s + q0)
    p_ratio1 = u * (1 + v + q2) / (1 + u + q1)
    tau_p = k * (1 + k * p_ratio0 - (k + 1) * p_ratio1)
    tau_b = (k - 1) * (1 + extension0 - extension1)
    return 2 * tau_p - tau_b


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--samples", type=int, default=2_000_000)
    parser.add_argument("--seed", type=int, default=12099320260829)
    parser.add_argument("--output", type=Path)
    parser.add_argument(
        "--q-floor",
        choices=("minimum", "next", "maximum", "average", "next_rank"),
        default="minimum",
    )
    parser.add_argument("--q-constant", type=float, default=0.75)
    parser.add_argument("--c-gsb", action="store_true")
    args = parser.parse_args()
    rng = random.Random(args.seed)
    minimum = math.inf
    witness: dict[str, float | int] | None = None
    negatives = 0
    accepted = 0

    for _ in range(args.samples):
        k = rng.randint(3, 160)
        extension0 = 10 ** rng.uniform(-2, 3.5)
        transfer_floor = (
            extension0 - 3 + 2 / extension0 if extension0 >= 2 else 0
        )
        transfer_floor = max(0.0, transfer_floor)
        extension1 = rng.uniform(transfer_floor, extension0 + 1)
        extension2 = rng.uniform(0, extension1 + 1)
        q0 = rng.random()
        q2 = rng.random()
        q_reference = {
            "minimum": min(q0, q2),
            "next": q2,
            "maximum": max(q0, q2),
            "average": (q0 + q2) / 2,
            "next_rank": q2,
        }[args.q_floor]
        q_multiplier = k / (k + 1) if args.q_floor == "next_rank" else args.q_constant
        q1_floor = min(1.0, q_multiplier * q_reference)
        q1 = rng.uniform(q1_floor, 1)
        if args.c_gsb:
            if q0 == 0 or q1 == 0:
                continue
            extension_c0 = extension0 * q1 / q0
            extension_c1 = extension1 * q2 / q1
            if extension_c1 > extension_c0 + 1:
                continue
        accepted += 1
        margin = c12_margin(
            k, extension0, extension1, extension2, q0, q1, q2
        )
        if margin < 0:
            negatives += 1
        if margin < minimum:
            minimum = margin
            witness = {
                "k": k,
                "extension0": extension0,
                "extension1": extension1,
                "extension2": extension2,
                "q0": q0,
                "q1": q1,
                "q2": q2,
                "margin": margin,
                "lower_gsb_rank_k_minus_1": 1 + extension0 - extension1,
                "lower_gsb_rank_k": 1 + extension1 - extension2,
                "two_extension_floor": transfer_floor,
                "q1_floor": q1_floor,
            }

    report = {
        "status": "PASS_RELAXED_CONSTRAINTS" if negatives == 0 else "FAIL_RELAXED_CONSTRAINTS_NOT_GRAPH_COUNTEREXAMPLE",
        "samples": args.samples,
        "seed": args.seed,
        "q_floor": args.q_floor,
        "q_constant": args.q_constant,
        "negative_samples": negatives,
        "accepted_samples": accepted,
        "c_gsb": args.c_gsb,
        "minimum_margin": minimum,
        "minimum_witness": witness,
        "scope": "continuous relaxation only; a negative point is not a forest counterexample",
    }
    rendered = json.dumps(report, indent=2, sort_keys=True)
    if args.output:
        args.output.write_text(rendered + "\n", encoding="utf-8")
    print(rendered)


if __name__ == "__main__":
    main()
