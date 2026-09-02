#!/usr/bin/env python3
"""Exact prefix test for rooted-bridge binomial centrality (RBC).

For a rooted tree T with

    E=I(T-q), J=I(T-N[q]), P=E+xJ,

the bivariate polynomial

    F(x,y)=E(x)E(y)+xJ(x)E(y)+yE(x)J(y)

counts independent sets in two copies of T joined at their roots.
This script checks that each homogeneous slice with midpoint below the
two-thirds cutoff is binomially normalized toward its centre.  It also
scans the tail, where the unrestricted statement is known to fail.
"""

from __future__ import annotations

import argparse
import json
import random
from fractions import Fraction
from pathlib import Path

from flint import fmpz_poly

from patternboost_corpus_audit import adjacency_from_prufer
from random_leaf_gsb_local_payment import coeff, tree_polynomial


def quotient_after_root_choice(
    total: fmpz_poly, deletion: fmpz_poly
) -> fmpz_poly:
    difference = total - deletion
    if difference.degree() < 1:
        return fmpz_poly([0])
    assert coeff(difference, 0) == 0
    return fmpz_poly(
        [
            difference[rank + 1]
            for rank in range(difference.degree())
        ]
    )


def stable_decimal(numerator: int, denominator: int) -> float:
    shift = max(
        0,
        max(numerator.bit_length(), denominator.bit_length()) - 52,
    )
    return (numerator >> shift) / (denominator >> shift)


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--corpus",
        type=Path,
        default=Path("patternboost60_polynomial_corpus_20260726.json"),
    )
    parser.add_argument("--samples", type=int, default=20_000)
    parser.add_argument("--seed", type=int, default=993_20260736)
    parser.add_argument(
        "--root-mode",
        choices=("random", "leaf"),
        default="random",
        help="choose an arbitrary root or a uniformly sampled leaf",
    )
    parser.add_argument(
        "--output",
        type=Path,
        default=Path(
            "rooted_bridge_binomial_central_prefix_20260729.json"
        ),
    )
    args = parser.parse_args()

    source = json.loads(args.corpus.read_text(encoding="utf-8"))
    records = source["records"]
    rng = random.Random(args.seed)

    prefix_checks = 0
    prefix_failures = 0
    tail_checks = 0
    tail_failures = 0
    first_prefix_failure = None
    first_tail_failure = None
    minimum_ratio: Fraction | None = None
    minimum_item = None

    for sample in range(args.samples):
        record_index = rng.randrange(len(records))
        record = records[record_index]
        adjacency = adjacency_from_prufer(
            record["prufer_code_one_based"]
        )
        if args.root_mode == "leaf":
            candidates = [
                vertex
                for vertex, neighbors in enumerate(adjacency)
                if len(neighbors) <= 1
            ]
            root = rng.choice(candidates)
        else:
            root = rng.randrange(len(adjacency))
        p = fmpz_poly(record["polynomial"])
        e = tree_polynomial(adjacency, deleted=root)
        j = quotient_after_root_choice(p, e)

        cutoff = (2 * p.degree() + 1) // 3
        maximum_degree = 2 * max(e.degree(), j.degree() + 1)

        def local(rank: int, total_degree: int):
            other = total_degree - rank
            return (
                coeff(e, rank) * coeff(e, other)
                + coeff(j, rank - 1) * coeff(e, other)
                + coeff(e, rank) * coeff(j, other - 1)
            )

        for total_degree in range(maximum_degree + 1):
            in_prefix = total_degree <= 2 * (cutoff - 1)
            for rank in range((total_degree + 1) // 2):
                current = local(rank, total_degree)
                following = local(rank + 1, total_degree)
                left = (total_degree - rank) * current
                right = (rank + 1) * following
                item = {
                    "sample": sample,
                    "record_index": record_index,
                    "source_line": record["first_line"],
                    "root": root,
                    "alpha": p.degree(),
                    "cutoff": cutoff,
                    "total_degree": total_degree,
                    "rank": rank,
                    "left": str(left),
                    "right": str(right),
                }

                if in_prefix:
                    prefix_checks += 1
                    if left > right:
                        prefix_failures += 1
                        if first_prefix_failure is None:
                            first_prefix_failure = item
                    if left > 0:
                        ratio = Fraction(int(right), int(left))
                        if minimum_ratio is None or ratio < minimum_ratio:
                            minimum_ratio = ratio
                            minimum_item = {
                                **item,
                                "ratio": {
                                    "numerator": str(ratio.numerator),
                                    "denominator": str(ratio.denominator),
                                    "decimal": stable_decimal(
                                        ratio.numerator,
                                        ratio.denominator,
                                    ),
                                },
                            }
                else:
                    tail_checks += 1
                    if left > right:
                        tail_failures += 1
                        if first_tail_failure is None:
                            first_tail_failure = item

    report = {
        "status": (
            "PASS_NOT_PROOF"
            if prefix_failures == 0 and tail_failures > 0
            else "FAIL"
        ),
        "samples": args.samples,
        "seed": args.seed,
        "root_mode": args.root_mode,
        "prefix_definition": "d <= 2*(floor((2*alpha+1)/3)-1)",
        "prefix_checks": prefix_checks,
        "prefix_failures": prefix_failures,
        "tail_checks": tail_checks,
        "tail_failures": tail_failures,
        "minimum_prefix_ratio": minimum_item,
        "first_prefix_failure": first_prefix_failure,
        "first_tail_failure": first_tail_failure,
    }
    args.output.write_text(
        json.dumps(report, indent=2) + "\n", encoding="utf-8"
    )
    print(json.dumps(report, indent=2))


if __name__ == "__main__":
    main()
