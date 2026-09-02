#!/usr/bin/env python3
"""Random exact stress test of global rank-4 leaf-curvature monotonicity."""

from __future__ import annotations

import argparse
import json
import random
import time
from functools import lru_cache
from pathlib import Path

import networkx as nx

from leaf_addition_pendant_monotonicity_scan import coeff
from random_acwf_leaf_monotonicity_scan import random_tree, rooted_state
from verify_rank4_leaf_curvature_identities import (
    rank4_curvature_from_coefficients,
)


def subdivided_double_star_delta(a: int, b: int) -> int:
    """C4(T(a,b+1))-C4(T(a,b)); see the symbolic certificate."""
    return (
        9 * a**6
        + 42 * a**5 * b
        + 33 * a**5
        + 75 * a**4 * b**2
        + 33 * a**4 * b
        - 63 * a**4
        + 100 * a**3 * b**3
        + 174 * a**3 * b**2
        - 100 * a**3 * b
        - 33 * a**3
        + 105 * a**2 * b**4
        + 126 * a**2 * b**3
        - 252 * a**2 * b**2
        - 159 * a**2 * b
        + 54 * a**2
        + 54 * a * b**5
        + 195 * a * b**4
        + 32 * a * b**3
        - 9 * a * b**2
        + 160 * a * b
        + 7 * b**6
        + 63 * b**5
        + 55 * b**4
        - 135 * b**3
        + 10 * b**2
    )


@lru_cache(maxsize=None)
def subdivided_double_star_envelope(order: int) -> tuple[int, int, int]:
    values = [
        (subdivided_double_star_delta(a, order - 3 - a), a, order - 3 - a)
        for a in range(order - 2)
    ]
    return min(values)


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--trials", type=int, default=100_000)
    parser.add_argument("--min-order", type=int, default=16)
    parser.add_argument("--max-order", type=int, default=200)
    parser.add_argument("--seed", type=int, default=20260726)
    parser.add_argument("--out", type=Path, required=True)
    args = parser.parse_args()

    rng = random.Random(args.seed)
    started = time.time()
    minimum_increment = None
    minimum_witness = None
    first_failure = None
    first_below_double_star_envelope = None
    minimum_envelope_excess = None
    minimum_envelope_excess_witness = None

    for trial in range(args.trials):
        order = rng.randint(args.min_order, args.max_order)
        tree = random_tree(rng, order)
        p = rng.randrange(order)
        # The excluded-root state is exactly I(T-p), including all of its
        # forest components.
        root_excluded, _D, old_ip, _q = rooted_state(tree, p)
        new_ip = list(old_ip)
        if len(new_ip) < len(root_excluded) + 1:
            new_ip.extend([0] * (len(root_excluded) + 1 - len(new_ip)))
        for k, value in enumerate(root_excluded):
            new_ip[k + 1] += value

        old_curvature = rank4_curvature_from_coefficients(old_ip)
        new_curvature = rank4_curvature_from_coefficients(new_ip)
        increment = new_curvature - old_curvature
        envelope, envelope_a, envelope_b = subdivided_double_star_envelope(
            order
        )
        envelope_excess = increment - envelope
        if minimum_increment is None or increment < minimum_increment:
            minimum_increment = increment
            minimum_witness = {
                "trial": trial,
                "old_order": order,
                "attachment_vertex": p,
                "attachment_degree": tree.degree(p),
                "old_curvature": old_curvature,
                "new_curvature": new_curvature,
                "increment": increment,
                "prufer": nx.to_prufer_sequence(tree),
                "old_coefficients_2_to_5": [
                    coeff(old_ip, k) for k in range(2, 6)
                ],
                "new_coefficients_2_to_5": [
                    coeff(new_ip, k) for k in range(2, 6)
                ],
            }
        if (
            minimum_envelope_excess is None
            or envelope_excess < minimum_envelope_excess
        ):
            minimum_envelope_excess = envelope_excess
            minimum_envelope_excess_witness = {
                "trial": trial,
                "old_order": order,
                "attachment_vertex": p,
                "attachment_degree": tree.degree(p),
                "increment": increment,
                "double_star_envelope": envelope,
                "envelope_parameters": [envelope_a, envelope_b],
                "envelope_excess": envelope_excess,
                "prufer": nx.to_prufer_sequence(tree),
            }
        if envelope_excess < 0:
            first_below_double_star_envelope = (
                minimum_envelope_excess_witness
            )
            break
        if increment < 0:
            first_failure = minimum_witness
            break
        if (trial + 1) % 10_000 == 0:
            print(
                f"trials={trial + 1:,} min_delta={minimum_increment}",
                flush=True,
            )

    payload = {
        "status": (
            "rank4_leaf_monotonicity_failure"
            if first_failure is not None
            else "no_rank4_leaf_monotonicity_failure"
        ),
        "parameters": vars(args) | {"out": str(args.out)},
        "trials_completed": trial + 1,
        "minimum_increment": minimum_increment,
        "minimum_witness": minimum_witness,
        "first_failure": first_failure,
        "minimum_double_star_envelope_excess": minimum_envelope_excess,
        "minimum_double_star_envelope_excess_witness": (
            minimum_envelope_excess_witness
        ),
        "first_below_double_star_envelope": (
            first_below_double_star_envelope
        ),
        "elapsed_seconds": time.time() - started,
    }
    args.out.write_text(json.dumps(payload, indent=2), encoding="utf-8")
    print(json.dumps(payload, indent=2), flush=True)
    return 1 if first_failure is not None else 0


if __name__ == "__main__":
    raise SystemExit(main())
