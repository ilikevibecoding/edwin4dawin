#!/usr/bin/env python3
"""Random exact stress test for the closed-hard Hall residue.

Generate matching-contraction images whose unit graph is a forest.  Directed
unit edges i->j mean c_i-a_j; inactive edges mean c_i-c_j.  After the proved
delta>=2 payment and the one-step covered-superset payment, test whether the
remaining closed hard boundary count fits in the unused empty interval.

This is finite/random evidence only.
"""

from __future__ import annotations

import argparse
import json
import random
from math import ceil, comb
from pathlib import Path


OUTPUT = Path("oriented_forest_closed_hard_empty_capacity_probe_root_20260829.json")


def popcount(value: int) -> int:
    return value.bit_count()


def make_instance(rng: random.Random, units: int) -> tuple[list[int], list[int], list[tuple]]:
    """Return outgoing-head masks, inactive-neighbor masks, and typed edges."""
    outgoing = [0] * units
    inactive = [0] * units
    edges: list[tuple] = []
    # A random labelled forest: each new vertex either starts a component or
    # attaches to one earlier vertex.  Bias toward attachment for hard cases.
    for vertex in range(1, units):
        if rng.random() < 0.12:
            continue
        other = rng.randrange(vertex)
        kind = rng.randrange(3)
        if kind == 0:
            outgoing[vertex] |= 1 << other
            edges.append((vertex, other, "directed"))
        elif kind == 1:
            outgoing[other] |= 1 << vertex
            edges.append((other, vertex, "directed"))
        else:
            inactive[vertex] |= 1 << other
            inactive[other] |= 1 << vertex
            edges.append((vertex, other, "inactive"))
    return outgoing, inactive, edges


def evaluate(
    outgoing: list[int], inactive: list[int], isolates_a: int, point: int
) -> dict:
    units = len(outgoing)
    alpha = units + isolates_a
    rank = ceil((2 * alpha - 1) / 3)
    excess0 = alpha - rank + 1
    full = (1 << units) - 1
    hard = extendable = closed = good = 0
    empty_used = 0
    boundary = 0

    # The A-neighborhood mask uses the matched heads plus directed heads.
    def neigh(chosen: int) -> int:
        result = chosen
        work = chosen
        while work:
            bit = work & -work
            index = bit.bit_length() - 1
            result |= outgoing[index]
            work -= bit
        return result

    for chosen in range(1 << units):
        if not (chosen >> point) & 1:
            continue
        independent = True
        work = chosen
        while work:
            bit = work & -work
            index = bit.bit_length() - 1
            if inactive[index] & chosen:
                independent = False
                break
            work -= bit
        if not independent:
            continue
        neighbors = neigh(chosen)
        if popcount(neighbors) - popcount(chosen) != excess0:
            continue
        boundary += 1
        reduced = chosen & ~(1 << point)
        delta = popcount(neighbors) - popcount(neigh(reduced))
        if delta >= 2:
            good += 1
            if reduced == 0:
                empty_used += 1
            continue
        hard += 1
        found = False
        available = full ^ chosen
        work = available
        while work:
            bit = work & -work
            index = bit.bit_length() - 1
            work -= bit
            if inactive[index] & chosen:
                continue
            if neigh(chosen | bit) == neighbors:
                found = True
                break
        if found:
            extendable += 1
        else:
            closed += 1

    empty_capacity = rank * comb(alpha, rank) - empty_used
    return {
        "units": units,
        "isolated_A": isolates_a,
        "alpha": alpha,
        "rank": rank,
        "excess": excess0,
        "point": point,
        "boundary": boundary,
        "delta_ge_2": good,
        "hard": hard,
        "one_step_extendable": extendable,
        "closed_hard": closed,
        "empty_used_by_delta_ge_2": empty_used,
        "empty_capacity_remaining": empty_capacity,
        "margin": empty_capacity - closed,
    }


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--samples", type=int, default=20000)
    parser.add_argument("--max-units", type=int, default=18)
    parser.add_argument("--seed", type=int, default=99308292026)
    args = parser.parse_args()
    rng = random.Random(args.seed)
    checks = 0
    minimum = None
    failures: list[dict] = []
    totals = {
        "boundary": 0,
        "delta_ge_2": 0,
        "hard": 0,
        "one_step_extendable": 0,
        "closed_hard": 0,
    }
    for sample in range(args.samples):
        units = rng.randint(1, args.max_units)
        outgoing, inactive, edges = make_instance(rng, units)
        isolates_a = rng.randint(0, max(0, args.max_units - units) // 2)
        for point in range(units):
            item = evaluate(outgoing, inactive, isolates_a, point)
            checks += 1
            for key in totals:
                totals[key] += item[key]
            if minimum is None or item["margin"] < minimum["margin"]:
                minimum = dict(item, sample=sample, typed_edges=edges)
            if item["margin"] < 0 and len(failures) < 10:
                failures.append(dict(item, sample=sample, typed_edges=edges))
    report = {
        "status": "FAIL" if failures else "PASS_RANDOM_EVIDENCE_ONLY",
        "scope": "Random matching-contraction forests only; no theorem claim.",
        "seed": args.seed,
        "samples": args.samples,
        "max_units": args.max_units,
        "pointed_checks": checks,
        "totals": totals,
        "minimum_margin": minimum,
        "failures": failures,
    }
    OUTPUT.write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(report, indent=2))


if __name__ == "__main__":
    main()
