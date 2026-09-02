#!/usr/bin/env python3
"""Probe the rank-uniform group-payment lemma for token-sliding surplus.

This isolates the only rank-dependent algebra in the low endpoint-degree
part of the edge-local route.  For a target rank R, c boundary-root groups,
a fixed nondistinguished independent s-set, and compatible distinguished
root counts x_i, it computes exactly the payment

    P = 2 Z + R E

from the generic edge decomposition and compares it with the worst-order
coefficient required by the edge-local inequality.  A finite PASS is only
diagnostic; a failure is an exact obstruction to this proposed uniform
pointwise lemma.
"""

from __future__ import annotations

import argparse
from fractions import Fraction
import hashlib
import itertools
import json
import math
from pathlib import Path
import random


ROOT = Path(__file__).resolve().parent


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def distribution(xs: tuple[int, ...], split: int, cap: int):
    # (selected roots, hit-left groups, hit-right groups) -> multiplicity.
    state = {(0, 0, 0): 1}
    for index, size in enumerate(xs):
        new = {}
        for (selected, hit_left, hit_right), multiplicity in state.items():
            for take in range(min(size, cap - selected) + 1):
                key = (
                    selected + take,
                    hit_left + (1 if take and index < split else 0),
                    hit_right + (1 if take and index >= split else 0),
                )
                new[key] = new.get(key, 0) + multiplicity * math.comb(size, take)
        state = new
    return state


def pointwise(rank: int, split: int, s: int, xs: tuple[int, ...]) -> dict | None:
    c = len(xs)
    cap = rank - 1 - s
    if cap < 0:
        return None
    dist = distribution(xs, split, cap)
    denominator = 0
    payment = 0
    for (selected, hit_left, hit_right), multiplicity in dist.items():
        size = s + selected
        if size > rank - 1:
            continue
        deficit = rank - size
        unhit_left = split - hit_left
        unhit_right = c - split - hit_right
        unhit = unhit_left + unhit_right
        if deficit == 1:
            denominator += multiplicity
            payment += multiplicity * (2 * selected + rank * unhit)
        elif deficit >= 2:
            weight = (
                math.comb(unhit, deficit)
                + math.comb(unhit_left, deficit - 1)
                + math.comb(unhit_right, deficit - 1)
            )
            payment += multiplicity * rank * weight
    if denominator == 0:
        return None
    required = Fraction(
        (rank - 1) * (rank + 2 * c - 4) + c * (c - 1),
        rank - 1,
    )
    ratio = Fraction(payment, denominator)
    return {
        "rank": rank,
        "groups": c,
        "split": split,
        "base_size": s,
        "compatible_counts": list(xs),
        "denominator": denominator,
        "payment": payment,
        "ratio": str(ratio),
        "required": str(required),
        "slack": str(ratio - required),
        "slack_fraction": ratio - required,
    }


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--rank-maximum", type=int, default=18)
    parser.add_argument("--groups-minimum", type=int, default=1)
    parser.add_argument("--exhaustive-x-maximum", type=int, default=2)
    parser.add_argument("--random-cases", type=int, default=20000)
    parser.add_argument("--continue-after-failure", action="store_true")
    parser.add_argument("--seed", type=int, default=993_20260828)
    args = parser.parse_args()
    rng = random.Random(args.seed)

    minimum = None
    failures = []
    checks = 0
    exhaustive_checks = 0
    random_checks = 0

    def consume(row: dict | None, lane: str) -> None:
        nonlocal minimum, checks, exhaustive_checks, random_checks
        if row is None:
            return
        checks += 1
        exhaustive_checks += lane == "exhaustive"
        random_checks += lane == "random"
        if minimum is None or row["slack_fraction"] < minimum["slack_fraction"]:
            minimum = row
        if row["slack_fraction"] < 0 and len(failures) < 50:
            failures.append({key: value for key, value in row.items() if key != "slack_fraction"})

    # Exhaust all small compatible-count boxes where their Cartesian size is modest.
    for rank in range(2, args.rank_maximum + 1):
        for c in range(max(1, args.groups_minimum), rank):
            if (args.exhaustive_x_maximum + 1) ** c > 200000:
                continue
            for split in range(c + 1):
                for s in range(rank):
                    for xs in itertools.product(range(args.exhaustive_x_maximum + 1), repeat=c):
                        consume(pointwise(rank, split, s, xs), "exhaustive")
                        if failures and not args.continue_after_failure:
                            break
                    if failures and not args.continue_after_failure:
                        break
                if failures and not args.continue_after_failure:
                    break
            if failures and not args.continue_after_failure:
                break
        if failures and not args.continue_after_failure:
            break

    if not failures or args.continue_after_failure:
        for _ in range(args.random_cases):
            rank = rng.randint(2, max(2, args.rank_maximum))
            c = rng.randint(max(1, args.groups_minimum), rank - 1)
            split = rng.randint(0, c)
            s = rng.randint(0, rank - 1)
            xs = tuple(
                rng.choice((0, 1, 2, 3, rng.randint(4, 40), rng.randint(50, 500)))
                for _ in range(c)
            )
            consume(pointwise(rank, split, s, xs), "random")
            if failures and not args.continue_after_failure:
                break

    serial_minimum = None if minimum is None else {
        key: value for key, value in minimum.items() if key != "slack_fraction"
    }
    report = {
        "schema": "uniform-edge-local-group-payment-probe-root-v1",
        "status": (
            "COUNTEREXAMPLE_EXACT_UNIFORM_EDGE_LOCAL_GROUP_PAYMENT"
            if failures else
            "PASS_EXACT_DIAGNOSTIC_UNIFORM_EDGE_LOCAL_GROUP_PAYMENT_NO_COUNTEREXAMPLE"
        ),
        "candidate": (
            "For 1<=c<R, every fixed-base group cell has "
            "(2Z+R E)/a_(R-1) >= R+2c-4+c(c-1)/(R-1)."
        ),
        "checks": checks,
        "exhaustive_checks": exhaustive_checks,
        "random_checks": random_checks,
        "rank_maximum": args.rank_maximum,
        "groups_minimum": args.groups_minimum,
        "exhaustive_x_maximum": args.exhaustive_x_maximum,
        "seed": args.seed,
        "minimum": serial_minimum,
        "failures": failures,
        "source_sha256": sha256(Path(__file__)),
        "scope_warning": "A PASS is finite algebraic evidence only, not a proof for unbounded ranks or compatible-root counts.",
    }
    output = ROOT / "uniform_edge_local_group_payment_probe_root_20260828.json"
    output.write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    print(report["status"])
    print("checks", checks, "exhaustive", exhaustive_checks, "random", random_checks)
    print("minimum", serial_minimum)
    print("failure_count", len(failures))
    print("source_sha256", report["source_sha256"])
    print("report_sha256", sha256(output))


if __name__ == "__main__":
    main()
