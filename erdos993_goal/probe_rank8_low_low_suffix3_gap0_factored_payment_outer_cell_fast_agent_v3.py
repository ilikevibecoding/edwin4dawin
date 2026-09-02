#!/usr/bin/env python3
"""Bilinear-component fast exact factored-payment outer cell.

This version computes the multiplier quadratic as Q(X)+m B(X,Y)+m^2 Q(Y)
directly from the cached base row X and sparse direction row Y.  It therefore
avoids every dense multiplication involving the assembled endpoint X+Y.
"""

from __future__ import annotations

import argparse
import json
import sys
import time
from pathlib import Path

from flint import fmpz_mpoly_ctx

from probe_rank8_low_low_full_early_suffix45_cell_flint import PAYMENT_MASKS
from probe_rank8_low_low_suffix3_gap0_factored_payment_outer_cell_fast_agent import (
    build_cached_endpoints,
)
from probe_rank8_low_low_suffix3_gap0_factored_payment_outer_cell_fast_agent_v2 import (
    row_difference,
)
from probe_rank8_low_low_suffix3_gap0_factored_payment_outer_cell_flint import (
    EARLY,
    EXPECTED_EARLY,
    EXPECTED_FACTORED,
    EXPECTED_MASK_SOURCE,
    FACTORED,
    MASK_SOURCE,
    payment_cell,
    validate_payment_order,
)
from probe_rank8_low_low_suffix3_gap0_outer_cell_flint import (
    INNER_NAMES,
    coefficient_product,
    curvature_cell,
    derivative_cell,
    margin_cell,
    sha256,
)


ROOT = Path(__file__).resolve().parent
CACHED_HELPER = ROOT / "probe_rank8_low_low_suffix3_gap0_factored_payment_outer_cell_fast_agent.py"
POLARIZATION_HELPER = ROOT / "probe_rank8_low_low_suffix3_gap0_factored_payment_outer_cell_fast_agent_v2.py"
ORIGINAL_PROBE = ROOT / "probe_rank8_low_low_suffix3_gap0_factored_payment_outer_cell_flint.py"
EXPECTED_HELPERS = {
    CACHED_HELPER.name:
        "3205B7BF2C5FEBD6F9A28D9A091A3780E79AD63F856C69D7543C2DA453F229E9",
    POLARIZATION_HELPER.name:
        "D717BAC13AAFCB0D344B6102657ACE7618501839BC23E24F2861AD11DF9D71B5",
    ORIGINAL_PROBE.name:
        "00288AAF49B4A002240AD1DB153DA9195FDC763B84AA8BDDBCA036F70A1A8870",
}


def fast_stats(polynomial):
    """Return the same exact statistics without materializing monomial tuples.

    ``terms()`` constructs every exponent tuple even on a positive polynomial.
    ``coeffs()`` is sufficient to prove nonnegativity and obtain extrema.  The
    expensive term list is requested only on an actual failure, where it is
    needed to preserve the first negative monomial.
    """

    coefficients = polynomial.coeffs()
    if not coefficients:
        return {
            "terms": 0,
            "negative": 0,
            "minimum": None,
            "maximum": None,
            "first_negative": None,
        }
    minimum = min(coefficients)
    maximum = max(coefficients)
    if minimum >= 0:
        return {
            "terms": len(coefficients),
            "negative": 0,
            "minimum": int(minimum),
            "maximum": int(maximum),
            "first_negative": None,
        }
    negative = sum(coefficient < 0 for coefficient in coefficients)
    del coefficients
    first_negative = None
    for monomial, coefficient in polynomial.terms():
        if coefficient < 0:
            first_negative = {
                "monomial": list(map(int, monomial)),
                "coefficient": int(coefficient),
            }
            break
    assert first_negative is not None
    return {
        "terms": len(polynomial),
        "negative": negative,
        "minimum": int(minimum),
        "maximum": int(maximum),
        "first_negative": first_negative,
    }


def curvature_cross(base_v, direction_v, target, zero, h):
    return (
        2 * coefficient_product(base_v[8], direction_v[8], target, zero)
        - coefficient_product(base_v[7], direction_v[9], target, zero)
        - coefficient_product(direction_v[7], base_v[9], target, zero)
        - h * (
            coefficient_product(base_v[7], direction_v[8], target, zero)
            + coefficient_product(direction_v[7], base_v[8], target, zero)
        )
    )


def margin_cross(base_c, direction_c, target, zero, h):
    return (
        2 * coefficient_product(base_c[8], direction_c[8], target, zero)
        - coefficient_product(base_c[7], direction_c[9], target, zero)
        - coefficient_product(direction_c[7], base_c[9], target, zero)
        - h * (
            coefficient_product(base_c[7], direction_c[8], target, zero)
            + coefficient_product(direction_c[7], base_c[8], target, zero)
        )
    )


def derivative_cross(base_c, direction_c, base_v, direction_v, target, zero, h):
    return (
        2 * (
            coefficient_product(base_c[8], direction_v[8], target, zero)
            + coefficient_product(direction_c[8], base_v[8], target, zero)
        )
        - coefficient_product(base_v[7], direction_c[9], target, zero)
        - coefficient_product(direction_v[7], base_c[9], target, zero)
        - coefficient_product(base_c[7], direction_v[9], target, zero)
        - coefficient_product(direction_c[7], base_v[9], target, zero)
        - h * (
            coefficient_product(base_v[7], direction_c[8], target, zero)
            + coefficient_product(direction_v[7], base_c[8], target, zero)
            + coefficient_product(base_c[7], direction_v[8], target, zero)
            + coefficient_product(direction_c[7], base_v[8], target, zero)
        )
    )


def quadratic_auxiliaries(base_row, direction_row, target, zero, h):
    curvature_base = curvature_cell(base_row["v"], target, zero, h)
    curvature_direction = curvature_cell(direction_row["v"], target, zero, h)
    curvature_linear = curvature_cross(
        base_row["v"], direction_row["v"], target, zero, h,
    )

    margin_base_part = zero
    margin_linear_part = zero
    margin_direction_part = zero
    for degree, capacity in base_row["capacity"].items():
        remainder = tuple(bound - item for bound, item in zip(target, degree))
        if any(item < 0 for item in remainder):
            continue
        margin_base_part += capacity * margin_cell(
            base_row["c"], remainder, zero, h,
        )
        margin_linear_part += capacity * margin_cross(
            base_row["c"], direction_row["c"], remainder, zero, h,
        )
        margin_direction_part += capacity * margin_cell(
            direction_row["c"], remainder, zero, h,
        )
    derivative_base = derivative_cell(
        base_row["c"], base_row["v"], target, zero, h,
    )
    derivative_linear = derivative_cross(
        base_row["c"], direction_row["c"],
        base_row["v"], direction_row["v"], target, zero, h,
    )
    derivative_direction = derivative_cell(
        direction_row["c"], direction_row["v"], target, zero, h,
    )
    strong_base = margin_base_part + h * derivative_base
    strong_linear = margin_linear_part + h * derivative_linear
    strong_direction = margin_direction_part + h * derivative_direction
    return {
        "curvature_middle_times_4": 4 * curvature_base + 2 * curvature_linear,
        "curvature_far": curvature_base + curvature_linear + curvature_direction,
        "strong_middle_times_4": 4 * strong_base + 2 * strong_linear,
        "strong_far": strong_base + strong_linear + strong_direction,
    }


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--a3", type=int, choices=range(10), required=True)
    parser.add_argument("--b3", type=int, choices=range(9), required=True)
    parser.add_argument("--a0", type=int, choices=range(3), required=True)
    parser.add_argument("--b0", type=int, choices=range(3), required=True)
    parser.add_argument("--profile", action="store_true")
    args = parser.parse_args()
    started = time.perf_counter()
    assert sha256(FACTORED) == EXPECTED_FACTORED
    assert sha256(EARLY) == EXPECTED_EARLY
    assert sha256(MASK_SOURCE) == EXPECTED_MASK_SOURCE
    assert {
        path.name: sha256(path)
        for path in (CACHED_HELPER, POLARIZATION_HELPER, ORIGINAL_PROBE)
    } == EXPECTED_HELPERS
    factored = json.loads(FACTORED.read_text(encoding="utf-8"))
    early = json.loads(EARLY.read_text(encoding="utf-8"))
    factored_rows = {row["bernstein_target"]: row for row in factored["rows"]}
    early_rows = {row["bernstein_target"]: row for row in early["rows"]}
    validate_payment_order(factored_rows, early_rows)
    loaded = time.perf_counter()

    target = (args.a3, args.b3, args.a0, args.b0)
    context = fmpz_mpoly_ctx.get(INNER_NAMES, "degrevlex")
    variables = dict(zip(INNER_NAMES, context.gens()))
    zero, one = context.constant(0), context.constant(1)
    cached = build_cached_endpoints(variables, target, one)
    base_row = cached[0]
    direction_row = row_difference(cached[1], base_row)
    built_at = time.perf_counter()
    raw = quadratic_auxiliaries(
        base_row, direction_row, target, zero, variables["h"],
    )
    evaluated_at = time.perf_counter()
    residual = {
        label: polynomial - payment_cell(
            factored_rows[label]["allocations"], PAYMENT_MASKS[label],
            variables, target, one,
        )
        for label, polynomial in raw.items()
    }
    paid = time.perf_counter()
    rows = {
        label: fast_stats(polynomial) for label, polynomial in residual.items()
    }
    finished = time.perf_counter()
    output = {
        "a3_exponent": args.a3,
        "b3_exponent": args.b3,
        "a0_exponent": args.a0,
        "b0_exponent": args.b0,
        "rows": rows,
        "pass": all(row["negative"] == 0 for row in rows.values()),
    }
    if args.profile:
        profile = {
            "load_validate": loaded - started,
            "cached_factor_and_convolution": built_at - loaded,
            "bilinear_component_auxiliary_evaluation": evaluated_at - built_at,
            "payment": paid - evaluated_at,
            "statistics": finished - paid,
            "total": finished - started,
        }
        print(json.dumps(profile, sort_keys=True), file=sys.stderr, flush=True)
    print(output, flush=True)


if __name__ == "__main__":
    main()
