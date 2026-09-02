#!/usr/bin/env python3
"""Exact forest-product search over every archived non-LC tree factor.

The public project archive contains the two order-26 and nineteen order-28
trees whose independence polynomials fail log-concavity, while
``verify_strong_lc_32_tree.py`` supplies a particularly strong order-32
factor.  This program fixes one copy of the order-32 tree and multiplies it
by every multiset of up to ``--max-extra-components`` factors drawn from all
22 available types.  Each product is the independence polynomial of an
explicit forest.
"""

from __future__ import annotations

import argparse
import itertools
import json
import sys
import time
from pathlib import Path

import networkx as nx
from flint import fmpz_poly as Poly

from pattern_family_valley_search import profile
from verify_perfect_matching_lc_failure import generic_tree_polynomial
from verify_strong_lc_32_tree import EXPECTED as STRONG_LC_32


if hasattr(sys, "set_int_max_str_digits"):
    sys.set_int_max_str_digits(0)

PUBLIC_RESULTS = Path(r"C:\Users\chris\tmp\erdos993_public\results")


def load_factors() -> list[tuple[str, Poly]]:
    order_26 = json.loads(
        (PUBLIC_RESULTS / "analysis_n26.json").read_text(encoding="utf-8")
    )
    factors = [
        (f"n26_{index}", Poly(item["poly"]))
        for index, item in enumerate(order_26["lc_failures"])
    ]

    order_28 = json.loads(
        (
            PUBLIC_RESULTS / "analysis_n28_modal_lc_nm.json"
        ).read_text(encoding="utf-8")
    )
    for index, item in enumerate(order_28["top_lc_failures"]):
        graph = nx.from_graph6_bytes(item["graph6"].encode("ascii"))
        adjacency = [
            sorted(graph.neighbors(vertex)) for vertex in range(len(graph))
        ]
        factors.append(
            (f"n28_{index}", Poly(generic_tree_polynomial(adjacency)))
        )

    factors.append(("n32_strong", Poly(STRONG_LC_32)))
    assert len(factors) == 22
    return factors


def better(left: dict, right: dict | None) -> bool:
    if right is None:
        return True
    left_ratio = left["profile"]["best_post_descent_ratio"]
    right_ratio = right["profile"]["best_post_descent_ratio"]
    if left_ratio is None:
        return False
    if right_ratio is None:
        return True
    return (
        left_ratio["numerator"] * right_ratio["denominator"]
        > right_ratio["numerator"] * left_ratio["denominator"]
    )


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--max-extra-components", type=int, default=6)
    parser.add_argument(
        "--output",
        type=Path,
        default=Path("known_lc_failure_product_search.json"),
    )
    args = parser.parse_args()

    factors = load_factors()
    fixed = Poly(STRONG_LC_32)
    champion = None
    tested = 0
    started = time.time()

    for count in range(args.max_extra_components + 1):
        for indices in itertools.combinations_with_replacement(
            range(len(factors)), count
        ):
            forest = fixed
            names = []
            for index in indices:
                names.append(factors[index][0])
                forest *= factors[index][1]
            result_profile = profile(forest)
            tested += 1
            record = {
                "extra_component_count": count,
                "extra_component_types": names,
                "forest_degree": len(forest) - 1,
                "profile": result_profile,
            }
            if better(record, champion):
                champion = record
            if not result_profile["unimodal"]:
                record["forest_polynomial"] = [int(value) for value in forest]
                payload = {
                    "status": "counterexample",
                    "tested": tested,
                    "elapsed_seconds": time.time() - started,
                    "witness": record,
                }
                args.output.write_text(
                    json.dumps(payload, indent=2), encoding="utf-8"
                )
                print(json.dumps(payload, indent=2), flush=True)
                return 1
        ratio = champion["profile"]["best_post_descent_ratio"]
        print(
            f"completed extra_count={count} tested={tested} "
            f"champion={ratio['decimal']:.12f} "
            f"types={champion['extra_component_types']}",
            flush=True,
        )

    payload = {
        "status": "no_counterexample",
        "parameters": {
            "max_extra_components": args.max_extra_components,
            "factor_type_count": len(factors),
            "fixed_component": "n32_strong",
        },
        "tested": tested,
        "elapsed_seconds": time.time() - started,
        "champion": champion,
    }
    args.output.write_text(json.dumps(payload, indent=2), encoding="utf-8")
    print(json.dumps(payload, indent=2), flush=True)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
