#!/usr/bin/env python3
"""Search mixed products of adversarial tree independence polynomials.

The earlier exact product search covered every corpus factor against
fixed examples, pure powers, and all pairs from a strong subset.  This
search uses normalized floating-point convolution to explore products
of three or more *different* corpus factors.  The best state at each
depth is replayed with exact fmpz arithmetic, and any apparent
counterexample is accepted only after exact verification.
"""

from __future__ import annotations

import argparse
import json
import time
from dataclasses import dataclass
from pathlib import Path

import numpy as np
from flint import fmpz_poly

from pattern_family_valley_search import profile


@dataclass
class State:
    factors: tuple[int, ...]
    polynomial: np.ndarray
    score: float
    descent: int
    ratio_index: int


def normalized(values: list[int]) -> np.ndarray:
    output = np.asarray(values, dtype=np.float64)
    output /= output.sum()
    return output


def post_descent_score(values: np.ndarray) -> tuple[float, int, int]:
    """Return largest adjacent ratio after the first strict descent."""
    peak = float(values.max())
    floor = peak * 1e-250
    descent = -1
    for index in range(len(values) - 1):
        if values[index] > floor and values[index + 1] < values[index]:
            descent = index
            break
    if descent < 0:
        return 0.0, descent, -1
    best = 0.0
    best_index = -1
    for index in range(descent + 1, len(values) - 1):
        if values[index] <= floor:
            break
        ratio = float(values[index + 1] / values[index])
        if ratio > best:
            best = ratio
            best_index = index
    return best, descent, best_index


def convolve(left: np.ndarray, right: np.ndarray) -> np.ndarray:
    output = np.convolve(left, right)
    total = output.sum()
    if total:
        output /= total
    return output


def exact_product(
    records: list[dict], factors: tuple[int, ...]
) -> fmpz_poly:
    output = fmpz_poly([1])
    for index in factors:
        output *= fmpz_poly(records[index]["polynomial"])
    return output


def exact_record(
    records: list[dict], factors: tuple[int, ...]
) -> dict:
    polynomial = exact_product(records, factors)
    result = profile(polynomial)
    return {
        "factors": [
            {
                "corpus_index": index,
                "first_line": records[index]["first_line"],
                "prufer_code_one_based":
                    records[index]["prufer_code_one_based"],
                "polynomial": records[index]["polynomial"],
            }
            for index in factors
        ],
        "forest_order": sum(records[index]["order"] for index in factors),
        "profile": result,
        "forest_polynomial": (
            [int(value) for value in polynomial]
            if not result["unimodal"]
            else None
        ),
    }


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--corpus",
        type=Path,
        default=Path("patternboost60_polynomial_corpus_20260726.json"),
    )
    parser.add_argument("--candidate-count", type=int, default=500)
    parser.add_argument("--beam-width", type=int, default=80)
    parser.add_argument("--max-depth", type=int, default=16)
    parser.add_argument("--screen-power", type=int, default=8)
    parser.add_argument("--out", type=Path, required=True)
    args = parser.parse_args()

    started = time.time()
    source = json.loads(args.corpus.read_text(encoding="utf-8"))
    records = source["records"]
    bases = [normalized(record["polynomial"]) for record in records]

    # Pure-power behavior is a better screen for product valleys than
    # the source corpus's local log-concavity-defect ordering.
    screened: list[tuple[float, int]] = []
    for index, base in enumerate(bases):
        power = base
        best = 0.0
        for _exponent in range(2, args.screen_power + 1):
            power = convolve(power, base)
            score, _descent, _ratio_index = post_descent_score(power)
            best = max(best, score)
        screened.append((best, index))
    screened.sort(reverse=True)
    candidates = [
        index
        for _score, index in screened[: args.candidate_count]
    ]

    beam: list[State] = []
    for index in candidates:
        score, descent, ratio_index = post_descent_score(bases[index])
        beam.append(
            State((index,), bases[index], score, descent, ratio_index)
        )
    beam.sort(key=lambda state: state.score, reverse=True)
    beam = beam[: args.beam_width]

    depths = []
    champion = None
    witness = None
    tested = 0

    for depth in range(2, args.max_depth + 1):
        following: dict[tuple[int, ...], State] = {}
        for state in beam:
            for index in candidates:
                # Canonicalize the multiset.  Repeated components are
                # allowed; the tuple prevents duplicate products.
                factors = tuple(sorted((*state.factors, index)))
                if factors in following:
                    continue
                product = convolve(state.polynomial, bases[index])
                score, descent, ratio_index = post_descent_score(product)
                following[factors] = State(
                    factors, product, score, descent, ratio_index
                )
                tested += 1
        beam = sorted(
            following.values(),
            key=lambda state: state.score,
            reverse=True,
        )[: args.beam_width]
        best = beam[0]
        replay = exact_record(records, best.factors)
        exact_ratio = replay["profile"]["best_post_descent_ratio"]
        depth_item = {
            "depth": depth,
            "floating_score": best.score,
            "floating_descent": best.descent,
            "floating_ratio_index": best.ratio_index,
            "exact": replay,
        }
        depths.append(depth_item)
        if champion is None:
            champion = depth_item
        else:
            old = champion["exact"]["profile"][
                "best_post_descent_ratio"
            ]
            if (
                exact_ratio is not None
                and (
                    old is None
                    or exact_ratio["numerator"] * old["denominator"]
                    > old["numerator"] * exact_ratio["denominator"]
                )
            ):
                champion = depth_item
        print(
            f"depth={depth} tested={tested:,} "
            f"float={best.score:.12f} "
            f"exact={exact_ratio['decimal'] if exact_ratio else None}",
            flush=True,
        )
        if not replay["profile"]["unimodal"]:
            witness = depth_item
            break

    report = {
        "status": "COUNTEREXAMPLE" if witness else "NO_COUNTEREXAMPLE",
        "parameters": vars(args) | {
            "corpus": str(args.corpus),
            "out": str(args.out),
        },
        "screened_factors": len(records),
        "candidate_indices": candidates,
        "tested_mixed_products": tested,
        "depths": depths,
        "champion": witness or champion,
        "elapsed_seconds": time.time() - started,
    }
    args.out.write_text(
        json.dumps(report, indent=2) + "\n", encoding="utf-8"
    )
    print(
        json.dumps(
            {
                "status": report["status"],
                "tested_mixed_products": tested,
                "champion_depth": (
                    None if champion is None else champion["depth"]
                ),
                "champion_exact_ratio": (
                    None
                    if champion is None
                    else champion["exact"]["profile"][
                        "best_post_descent_ratio"
                    ]["decimal"]
                ),
                "elapsed_seconds": report["elapsed_seconds"],
                "report": str(args.out),
            },
            indent=2,
        ),
        flush=True,
    )
    return 1 if witness else 0


if __name__ == "__main__":
    raise SystemExit(main())
