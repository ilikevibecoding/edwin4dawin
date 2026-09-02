#!/usr/bin/env python3
"""Exact local search for a two-component forest counterexample.

The fixed component is the certified 102-vertex tree from
``verify_perfect_matching_lc_failure.py``.  The variable component is a
bouquet whose root is adjacent to:

* ``m`` copies of the t-legged subdivided star with all leg lengths 2;
* ``short`` copies with t-1 legs of length 2;
* ``mixed`` copies with one leg of length 1 and t-1 legs of length 2;
* optional root paths and root leaves.

The near-counterexample found in
``forest_factor_galvin408_local_evolution_20260724.json`` is

    t=12, m=409, short=1, mixed=1, paths=(1,3), leaves=0.

For a fixed m, the enormous common powers are computed once.  Candidate
coefficients near the two-phase crossing are then obtained by short exact
dot products, avoiding a full 5,000-degree multiplication for every point
in the local grid.  If a strict adjacent valley is found, the script builds
the full polynomial with FLINT and independently checks nonunimodality.
"""

from __future__ import annotations

import argparse
import json
import sys
import time
from pathlib import Path

from flint import fmpz_poly as Poly

from pattern_family_valley_search import profile
from verify_perfect_matching_lc_failure import decorated_polynomial


if hasattr(sys, "set_int_max_str_digits"):
    sys.set_int_max_str_digits(0)

X = Poly([0, 1])
ONE = Poly([1])
ONE_PLUS_X = Poly([1, 1])


def path_poly(length: int) -> Poly:
    if length < 0:
        raise ValueError("path length must be nonnegative")
    values = [ONE, ONE_PLUS_X]
    while len(values) <= length:
        values.append(values[-1] + X * values[-2])
    return values[length]


def gadget(legs: tuple[int, ...]) -> tuple[Poly, Poly]:
    """Return (root-excluded, root-included) at the gadget center."""
    excluded = ONE
    included = ONE
    for length in legs:
        excluded *= path_poly(length)
        included *= path_poly(length - 1)
    return excluded, X * included


def modifier_pair(
    t: int,
    short: int,
    mixed: int,
    paths: tuple[int, ...],
    leaves: int,
) -> tuple[Poly, Poly]:
    """Factors multiplying the common root-excluded/included powers."""
    excluded = ONE
    included = ONE

    short_e, short_i = gadget((2,) * (t - 1))
    mixed_e, mixed_i = gadget((1,) + (2,) * (t - 1))
    if short:
        excluded *= (short_e + short_i) ** short
        included *= short_e**short
    if mixed:
        excluded *= (mixed_e + mixed_i) ** mixed
        included *= mixed_e**mixed

    for length in paths:
        excluded *= path_poly(length)
        included *= path_poly(length - 1)
    if leaves:
        excluded *= ONE_PLUS_X**leaves
    return excluded, included


def mode(p: Poly) -> int:
    return max(range(len(p)), key=lambda k: p[k])


def exact_coefficient(
    base_excluded: Poly,
    base_included: Poly,
    mod_excluded: Poly,
    mod_included: Poly,
    k: int,
) -> int:
    value = 0
    for j in range(len(mod_excluded)):
        i = k - j
        if 0 <= i < len(base_excluded):
            value += int(base_excluded[i]) * int(mod_excluded[j])
    for j in range(len(mod_included)):
        i = k - j
        if 0 <= i < len(base_included):
            value += int(base_included[i]) * int(mod_included[j])
    return value


def scaled_pair(
    left: Poly,
    right: Poly,
    lo: int = 0,
    hi: int | None = None,
) -> tuple[list[float], list[float], int]:
    """Common power-of-two scaling, preserving the left/right magnitude."""
    if hi is None:
        hi = max(len(left), len(right)) - 1
    lo = max(0, lo)
    hi = max(lo, hi)
    left_values = [
        int(left[k]) if k < len(left) else 0 for k in range(lo, hi + 1)
    ]
    right_values = [
        int(right[k]) if k < len(right) else 0
        for k in range(lo, hi + 1)
    ]
    bits = max(
        1,
        *(value.bit_length() for value in left_values),
        *(value.bit_length() for value in right_values),
    )
    shift_bits = max(0, bits - 52)
    def scaled(value: int) -> float:
        return float(value >> shift_bits) if shift_bits else float(value)

    return (
        [scaled(value) for value in left_values],
        [scaled(value) for value in right_values],
        lo,
    )


def approximate_coefficient(
    base_excluded: list[float],
    base_included: list[float],
    base_offset: int,
    mod_excluded: list[float],
    mod_included: list[float],
    k: int,
) -> float:
    value = 0.0
    for j, coefficient in enumerate(mod_excluded):
        index = k - j - base_offset
        if 0 <= index < len(base_excluded):
            value += base_excluded[index] * coefficient
    for j, coefficient in enumerate(mod_included):
        index = k - j - base_offset
        if 0 <= index < len(base_included):
            value += base_included[index] * coefficient
    return value


def ratio_better(
    numerator: int,
    denominator: int,
    champion: dict | None,
) -> bool:
    if champion is None:
        return True
    return (
        numerator * champion["denominator"]
        > champion["numerator"] * denominator
    )


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--t", type=int, default=12)
    parser.add_argument("--m-min", type=int, default=395)
    parser.add_argument("--m-max", type=int, default=425)
    parser.add_argument("--short-max", type=int, default=5)
    parser.add_argument("--mixed-max", type=int, default=5)
    parser.add_argument(
        "--total-min",
        type=int,
        default=0,
        help="If positive, require m+short+mixed to be at least this.",
    )
    parser.add_argument(
        "--total-max",
        type=int,
        default=0,
        help="If positive, require m+short+mixed to be at most this.",
    )
    parser.add_argument("--leaves-max", type=int, default=2)
    parser.add_argument(
        "--paths",
        default="1,3",
        help="Comma-separated root-path lengths (fixed within one run).",
    )
    parser.add_argument(
        "--scan-radius",
        type=int,
        default=18,
        help="Exact ranks checked on each side of the predicted crossing.",
    )
    parser.add_argument(
        "--no-float-screen",
        action="store_true",
        help="Use exact dot products at every screened rank (much slower).",
    )
    parser.add_argument(
        "--output",
        type=Path,
        default=Path("forest_galvin_local_grid.json"),
    )
    args = parser.parse_args()
    if args.t < 2:
        raise ValueError("--t must be at least 2")
    paths = tuple(
        int(item) for item in args.paths.split(",") if item.strip()
    )

    fixed = Poly(decorated_polynomial())
    fixed_mode = mode(fixed)
    base_e, base_i = gadget((2,) * args.t)
    base_total = base_e + base_i
    widest_e, widest_i = modifier_pair(
        args.t,
        args.short_max,
        args.mixed_max,
        paths,
        args.leaves_max,
    )
    widest_degree = max(len(widest_e), len(widest_i)) - 1
    widest_mode = max(mode(widest_e), mode(widest_i))

    # Included-root contribution of the bouquet has one additional x.
    common_excluded = fixed * base_total**args.m_min
    common_included = fixed * X * base_e**args.m_min

    tested = 0
    coefficient_checks = 0
    champion = None
    witness = None
    started = time.time()

    for m in range(args.m_min, args.m_max + 1):
        if m > args.m_min:
            common_excluded *= base_total
            common_included *= base_e

        base_center = round(2 * args.t * m / 3) + fixed_mode
        base_float_e: list[float] | None = None
        base_float_i: list[float] | None = None
        base_float_offset = 0
        if not args.no_float_screen:
            (
                base_float_e,
                base_float_i,
                base_float_offset,
            ) = scaled_pair(
                common_excluded,
                common_included,
                base_center - widest_degree - args.scan_radius - 5,
                base_center + widest_mode + args.scan_radius + 5,
            )

        for short in range(args.short_max + 1):
            for mixed in range(args.mixed_max + 1):
                total_gadgets = m + short + mixed
                if args.total_min and total_gadgets < args.total_min:
                    continue
                if args.total_max and total_gadgets > args.total_max:
                    continue
                for leaves in range(args.leaves_max + 1):
                    mod_e, mod_i = modifier_pair(
                        args.t, short, mixed, paths, leaves
                    )
                    predicted = (
                        base_center
                        + max(mode(mod_e), mode(mod_i))
                    )
                    lo = max(1, predicted - args.scan_radius)
                    hi = min(
                        len(common_excluded)
                        + max(len(mod_e), len(mod_i))
                        - 2,
                        predicted + args.scan_radius,
                    )
                    screen_lo = lo - 2
                    screen_hi = hi + 2
                    if args.no_float_screen:
                        approximate_values = {
                            k: float(
                                exact_coefficient(
                                    common_excluded,
                                    common_included,
                                    mod_e,
                                    mod_i,
                                    k,
                                )
                            )
                            for k in range(screen_lo, screen_hi + 1)
                        }
                    else:
                        assert base_float_e is not None
                        assert base_float_i is not None
                        mod_float_e, mod_float_i, _ = scaled_pair(
                            mod_e, mod_i
                        )
                        approximate_values = {
                            k: approximate_coefficient(
                                base_float_e,
                                base_float_i,
                                base_float_offset,
                                mod_float_e,
                                mod_float_i,
                                k,
                            )
                            for k in range(screen_lo, screen_hi + 1)
                        }
                    coefficient_checks += len(approximate_values)
                    tested += 1

                    for k in range(lo, hi + 1):
                        approximate_middle = approximate_values[k]
                        approximate_flank = min(
                            approximate_values[k - 1],
                            approximate_values[k + 1],
                        )
                        approximate_ratio = (
                            approximate_flank / approximate_middle
                        )
                        champion_ratio = (
                            champion["ratio"] if champion else -1.0
                        )
                        if approximate_ratio <= champion_ratio + 1e-12:
                            continue

                        values = {
                            j: exact_coefficient(
                                common_excluded,
                                common_included,
                                mod_e,
                                mod_i,
                                j,
                            )
                            for j in range(k - 2, k + 3)
                        }
                        middle = values[k]
                        flank = min(values[k - 1], values[k + 1])
                        if ratio_better(flank, middle, champion):
                            champion = {
                                "t": args.t,
                                "m": m,
                                "short": short,
                                "mixed": mixed,
                                "paths": list(paths),
                                "leaves": leaves,
                                "rank": k,
                                "numerator": flank,
                                "denominator": middle,
                                "ratio": flank / middle,
                                "window": [
                                    values[k - 2],
                                    values[k - 1],
                                    values[k],
                                    values[k + 1],
                                    values[k + 2],
                                ],
                            }
                        if (
                            values[k - 1] > middle
                            and values[k + 1] > middle
                        ):
                            tree = (
                                base_total**m * mod_e
                                + X * base_e**m * mod_i
                            )
                            forest = fixed * tree
                            result_profile = profile(forest)
                            if result_profile["unimodal"]:
                                raise AssertionError(
                                    "local valley did not survive full check"
                                )
                            witness = {
                                "parameters": {
                                    "t": args.t,
                                    "m": m,
                                    "short": short,
                                    "mixed": mixed,
                                    "paths": list(paths),
                                    "leaves": leaves,
                                },
                                "construction": (
                                    "Disjoint union of the certified "
                                    "102-vertex tree and the stated rooted "
                                    "bouquet tree."
                                ),
                                "variable_tree_order": (
                                    1
                                    + m * (1 + 2 * args.t)
                                    + short * (1 + 2 * (args.t - 1))
                                    + mixed * (2 * args.t)
                                    + sum(paths)
                                    + leaves
                                ),
                                "forest_order": (
                                    102
                                    + 1
                                    + m * (1 + 2 * args.t)
                                    + short * (1 + 2 * (args.t - 1))
                                    + mixed * (2 * args.t)
                                    + sum(paths)
                                    + leaves
                                ),
                                "valley_rank": k,
                                "coefficient_window": [
                                    int(forest[j])
                                    for j in range(k - 2, k + 3)
                                ],
                                "profile": result_profile,
                                "factor_polynomial": [
                                    int(value) for value in tree
                                ],
                                "forest_polynomial": [
                                    int(value) for value in forest
                                ],
                            }
                            break
                    if witness is not None:
                        break
                if witness is not None:
                    break
            if witness is not None:
                break
        print(
            f"m={m} tested={tested:,} "
            f"best={champion['ratio']:.12f} "
            f"at k={champion['rank']} "
            f"(short={champion['short']}, mixed={champion['mixed']}, "
            f"leaves={champion['leaves']})",
            flush=True,
        )
        if witness is not None:
            break

    payload = {
        "status": "COUNTEREXAMPLE" if witness else "no_counterexample",
        "exact_integer_arithmetic": True,
        "parameters": vars(args) | {
            "output": str(args.output),
            "paths_parsed": list(paths),
        },
        "tested": tested,
        "coefficient_checks": coefficient_checks,
        "champion": champion,
        "witness": witness,
        "elapsed_seconds": time.time() - started,
    }
    args.output.write_text(
        json.dumps(payload, indent=2) + "\n", encoding="utf-8"
    )
    print(
        json.dumps(
            {
                "status": payload["status"],
                "tested": tested,
                "champion": champion,
                "witness": witness,
                "elapsed_seconds": payload["elapsed_seconds"],
            },
            indent=2,
        ),
        flush=True,
    )
    return 1 if witness else 0


if __name__ == "__main__":
    raise SystemExit(main())
