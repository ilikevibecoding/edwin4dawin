#!/usr/bin/env python3
"""Exact patterned rooted-product search around the gadget champions.

Two rooted gadget families repeatedly appear at the top of the exhaustive
small-gadget scan.

``depth1(a,b)``
    The root has ``a`` leaf neighbours and one non-leaf neighbour, which is
    the centre of a ``b``-leaf star.  Its rooted state is

        E = (1+x)^a ((1+x)^b + x),   J = (1+x)^b.

``depth2(a,b)``
    The root has ``a`` leaf neighbours and a length-two path to the centre
    of a ``b``-leaf star.  Its rooted state is

        E = (1+x)^a ((1+x)^(b+1) + x),
        J = (1+x)^b + x.

Identifying one copy of a gadget at every vertex of the certified
102-vertex non-log-concave tree again produces an explicit tree.  This
program evaluates and profiles its independence polynomial with exact
integer arithmetic.
"""

from __future__ import annotations

import argparse
import json
import sys
import time
from pathlib import Path

from flint import fmpz_poly as Poly

from pattern_family_valley_search import profile
from rooted_product_amplification_search import (
    BASE_ORDER,
    X,
    rooted_product_polynomial,
)


if hasattr(sys, "set_int_max_str_digits"):
    sys.set_int_max_str_digits(0)

ONE_PLUS_X = Poly([1, 1])


def gadget_state(family: str, a: int, b: int) -> tuple[Poly, Poly, int]:
    if family == "depth1":
        e_poly = ONE_PLUS_X**a * (ONE_PLUS_X**b + X)
        j_poly = ONE_PLUS_X**b
        order = a + b + 2
    elif family == "depth2":
        e_poly = ONE_PLUS_X**a * (ONE_PLUS_X ** (b + 1) + X)
        j_poly = ONE_PLUS_X**b + X
        order = a + b + 3
    else:
        raise ValueError(f"unknown family: {family}")
    return e_poly, j_poly, order


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
    parser.add_argument(
        "--families",
        nargs="+",
        choices=("depth1", "depth2"),
        default=("depth1", "depth2"),
    )
    parser.add_argument("--a-min", type=int, default=0)
    parser.add_argument("--a-max", type=int, default=20)
    parser.add_argument("--b-min", type=int, default=1)
    parser.add_argument("--b-max", type=int, default=40)
    parser.add_argument(
        "--output",
        type=Path,
        default=Path("rooted_product_pattern_search.json"),
    )
    args = parser.parse_args()
    parameters = {
        "families": args.families,
        "a": [args.a_min, args.a_max],
        "b": [args.b_min, args.b_max],
        "base_order": BASE_ORDER,
    }

    champion = None
    tested = 0
    started = time.time()

    for family in args.families:
        for a in range(args.a_min, args.a_max + 1):
            for b in range(args.b_min, args.b_max + 1):
                e_poly, j_poly, gadget_order = gadget_state(family, a, b)
                transformed = rooted_product_polynomial(e_poly, j_poly)
                result_profile = profile(transformed)
                tested += 1
                record = {
                    "family": family,
                    "a": a,
                    "b": b,
                    "gadget_order": gadget_order,
                    "E": [int(value) for value in e_poly],
                    "J": [int(value) for value in j_poly],
                    "rooted_product_order": BASE_ORDER * gadget_order,
                    "rooted_product_degree": len(transformed) - 1,
                    "profile": result_profile,
                }
                if better(record, champion):
                    champion = record
                    ratio = result_profile["best_post_descent_ratio"]
                    print(
                        f"champion tested={tested} family={family} "
                        f"a={a} b={b} ratio={ratio['decimal']:.15f} "
                        f"first_descent={result_profile['first_descent']}",
                        flush=True,
                    )

                if not result_profile["unimodal"]:
                    first_descent = result_profile["first_descent"]
                    ascent = result_profile["first_post_descent_ascent"]
                    relevant = sorted(
                        {
                            first_descent,
                            first_descent + 1,
                            ascent,
                            ascent + 1,
                        }
                    )
                    record["witness_coefficients"] = {
                        str(index): int(transformed[index])
                        for index in relevant
                    }
                    payload = {
                        "status": "counterexample",
                        "parameters": parameters,
                        "tested": tested,
                        "elapsed_seconds": time.time() - started,
                        "champion": champion,
                        "witness": record,
                    }
                    args.output.write_text(
                        json.dumps(payload, indent=2), encoding="utf-8"
                    )
                    print(
                        f"EXACT COUNTEREXAMPLE family={family} a={a} b={b}",
                        flush=True,
                    )
                    return 1

            payload = {
                "status": "running",
                "parameters": parameters,
                "tested": tested,
                "completed": {"family": family, "a": a},
                "elapsed_seconds": time.time() - started,
                "champion": champion,
            }
            args.output.write_text(
                json.dumps(payload, indent=2), encoding="utf-8"
            )
            print(
                f"completed family={family} a={a} tested={tested} "
                f"elapsed={time.time() - started:.3f}s",
                flush=True,
            )

    payload = {
        "status": "no_counterexample",
        "parameters": parameters,
        "tested": tested,
        "elapsed_seconds": time.time() - started,
        "champion": champion,
    }
    args.output.write_text(json.dumps(payload, indent=2), encoding="utf-8")
    print("no counterexample in requested grid", flush=True)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
