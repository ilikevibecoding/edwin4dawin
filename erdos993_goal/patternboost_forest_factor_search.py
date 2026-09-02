#!/usr/bin/env python3
"""Exact forest-product search using the audited PatternBoost corpus.

Every corpus entry is the independence polynomial of a certified
60-vertex tree.  Products therefore certify explicit forests.  The search
tests each corpus factor against several independently reconstructed
non-log-concave tree factors, tests powers of individual corpus factors,
and optionally checks all pairs among the strongest distinct corpus
polynomials.
"""

from __future__ import annotations

import argparse
import json
import time
from pathlib import Path

from flint import fmpz_poly as Poly

from known_lc_failure_product_search import load_factors
from pattern_family_valley_search import profile
from verify_perfect_matching_lc_failure import decorated_polynomial


def better(candidate: dict, incumbent: dict | None) -> bool:
    if incumbent is None:
        return True
    left = candidate["profile"]["best_post_descent_ratio"]
    right = incumbent["profile"]["best_post_descent_ratio"]
    if left is None:
        return False
    if right is None:
        return True
    return (
        left["numerator"] * right["denominator"]
        > right["numerator"] * left["denominator"]
    )


def serializable_source(record: dict) -> dict:
    return {
        key: record[key]
        for key in (
            "first_line",
            "prufer_code_one_based",
            "order",
            "alpha",
            "mode",
            "strongest_relative_defect",
        )
    }


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("corpus", type=Path)
    parser.add_argument("--corpus-limit", type=int, default=0)
    parser.add_argument("--pair-top", type=int, default=500)
    parser.add_argument("--max-power", type=int, default=8)
    parser.add_argument("--output", type=Path, required=True)
    args = parser.parse_args()

    source = json.loads(args.corpus.read_text(encoding="utf-8"))
    records = source["records"]
    if args.corpus_limit:
        records = records[: args.corpus_limit]
    polynomials = [Poly(record["polynomial"]) for record in records]
    fixed = load_factors()
    fixed.append(("perfect_matching_102", Poly(decorated_polynomial())))

    started = time.time()
    tested = 0
    champion = None
    witness = None

    def consider(
        polynomial: Poly, description: dict, component_order: int
    ) -> None:
        nonlocal tested, champion, witness
        result = profile(polynomial)
        tested += 1
        candidate = {
            "description": description,
            "forest_order": component_order,
            "forest_degree": len(polynomial) - 1,
            "profile": result,
        }
        if better(candidate, champion):
            champion = candidate
        if not result["unimodal"] and witness is None:
            candidate["forest_polynomial"] = [
                int(value) for value in polynomial
            ]
            witness = candidate

    # Broad exact cross-products against every previously archived factor.
    for index, (record, polynomial) in enumerate(
        zip(records, polynomials, strict=True)
    ):
        for fixed_name, fixed_polynomial in fixed:
            consider(
                polynomial * fixed_polynomial,
                {
                    "kind": "corpus_x_fixed",
                    "corpus": serializable_source(record),
                    "fixed": fixed_name,
                },
                record["order"]
                + (
                    102
                    if fixed_name == "perfect_matching_102"
                    else int(fixed_name.split("_")[0][1:])
                ),
            )
            if witness is not None:
                break
        if witness is not None:
            break
        if (index + 1) % 2_000 == 0:
            ratio = champion["profile"]["best_post_descent_ratio"]["decimal"]
            print(
                f"cross corpus={index + 1:,}/{len(records):,} "
                f"tested={tested:,} ratio={ratio:.12f}",
                flush=True,
            )

    # Scaling lines can expose a defect missed by heterogeneous products.
    if witness is None:
        for index, (record, polynomial) in enumerate(
            zip(records, polynomials, strict=True)
        ):
            power = polynomial
            for exponent in range(2, args.max_power + 1):
                power *= polynomial
                consider(
                    power,
                    {
                        "kind": "corpus_power",
                        "exponent": exponent,
                        "corpus": serializable_source(record),
                    },
                    exponent * record["order"],
                )
                if witness is not None:
                    break
            if witness is not None:
                break
            if (index + 1) % 5_000 == 0:
                ratio = champion["profile"][
                    "best_post_descent_ratio"
                ]["decimal"]
                print(
                    f"powers corpus={index + 1:,}/{len(records):,} "
                    f"tested={tested:,} ratio={ratio:.12f}",
                    flush=True,
                )

    # Quadratic search is bounded to the strongest scale-free defects.
    pair_count = min(args.pair_top, len(records))
    if witness is None and pair_count:
        for left in range(pair_count):
            for right in range(left, pair_count):
                consider(
                    polynomials[left] * polynomials[right],
                    {
                        "kind": "corpus_pair",
                        "left": serializable_source(records[left]),
                        "right": serializable_source(records[right]),
                    },
                    records[left]["order"] + records[right]["order"],
                )
                if witness is not None:
                    break
            if witness is not None:
                break
            if (left + 1) % 50 == 0:
                ratio = champion["profile"][
                    "best_post_descent_ratio"
                ]["decimal"]
                print(
                    f"pairs row={left + 1:,}/{pair_count:,} "
                    f"tested={tested:,} ratio={ratio:.12f}",
                    flush=True,
                )

    payload = {
        "status": "COUNTEREXAMPLE" if witness else "NO_COUNTEREXAMPLE",
        "exact_integer_arithmetic": True,
        "source_corpus": str(args.corpus),
        "source_unique_polynomials": len(records),
        "parameters": {
            "pair_top": args.pair_top,
            "max_power": args.max_power,
            "corpus_limit": args.corpus_limit,
        },
        "tested_products": tested,
        "champion": witness or champion,
        "elapsed_seconds": time.time() - started,
    }
    args.output.write_text(
        json.dumps(payload, indent=2) + "\n", encoding="utf-8"
    )
    print(
        json.dumps(
            {
                key: payload[key]
                for key in (
                    "status",
                    "tested_products",
                    "champion",
                    "elapsed_seconds",
                )
            },
            indent=2,
        ),
        flush=True,
    )
    return 1 if witness else 0


if __name__ == "__main__":
    raise SystemExit(main())
