#!/usr/bin/env python3
"""Test the sealed full-early AM-GM payments on a suffix-3/gap-0 cell.

This is an independent boundary diagnostic.  It does not modify the running
suffix-3 verifier.  The original suffix-only payments and the proposed
full-early payments are both subtracted from the same exact far auxiliaries,
so the output identifies every old negative coefficient and certifies the
replacement coefficient-by-coefficient at the requested outer cell.
"""

from __future__ import annotations

import argparse
import hashlib
import json
from pathlib import Path

from flint import fmpz_mpoly_ctx

from probe_rank8_low_low_full_early_suffix45_cell_flint import (
    PAYMENT_MASKS,
    add,
    base,
    curvature_cell,
    multiply,
    power,
    scale,
    stats,
    strong_cell,
)
from probe_rank8_low_low_suffix3_gap0_outer_cell_flint import (
    INNER_NAMES,
    build_at,
    payment_cell as suffix_only_payment_cell,
)


ROOT = Path(__file__).resolve().parent
EARLY_REPORT = ROOT / "rank8_low_low_full_early_core_amgm_exact_20260821.json"
CURVATURE_REPORT = (
    ROOT / "rank8_low_low_tail_curvature_far_zero_slack_amgm_exact_20260821.json"
)
STRONG_REPORT = ROOT / "rank8_low_low_strong_payment_zero_slack_amgm_exact_20260821.json"
FAILURE_REPORT = ROOT / "rank8_low_low_suffix3_gap0_full_face_first_failure_20260822.json"
EXPECTED_INPUTS = {
    EARLY_REPORT.name:
        "B563CA6C6A7B18254CA17AA5B92DB67EA899BA4F3B2FA5D172301A8A0CD2ED96",
    CURVATURE_REPORT.name:
        "E90CD40EDDE350EFAF23DB9738964146C0C5358CB2893560313772D1A9CB1C4C",
    STRONG_REPORT.name:
        "8C390F8C24F663B551B63D0E80FA9DF8894A2759D06DE5EA181CFB1E26636911",
    FAILURE_REPORT.name:
        "838C0857AE0DBAFB321D7CBEA2480B52C145451E7F6990890D9E94F8BBFE6242",
}


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def full_early_terminal_monomial(
    exponents, variables, target, one, *, use_left_suffix, use_right_suffix,
):
    """Lift a seven-coordinate early-core monomial through suffix index 3.

    The early coordinates are (h,ta,tb,a0,a2,b0,b2).  This diagnostic is on
    the a2=b2=0 face, so allocations with positive a2 or b2 degree vanish.
    """

    h_power, ta_power, tb_power, a0_power, a2_power, b0_power, b2_power = map(
        int, exponents,
    )
    if a2_power or b2_power:
        return {}
    a3 = {(1, 0, 0, 0): one}
    b3 = {(0, 1, 0, 0): one}
    left_terminal = base(variables["ta"])
    right_terminal = base(variables["tb"])
    if use_left_suffix:
        left_terminal = add(
            base(
                variables["ta"] + variables["a4"] + variables["a5"]
                + variables["a6"] + variables["a7"]
            ),
            a3,
        )
    if use_right_suffix:
        right_terminal = add(
            base(
                variables["tb"] + variables["b4"] + variables["b5"]
                + variables["b6"] + variables["b7"]
            ),
            b3,
        )
    out = {
        (0, 0, a0_power, b0_power):
            variables["h"] ** h_power
    }
    out = multiply(out, power(left_terminal, ta_power, target, one), target)
    out = multiply(out, power(right_terminal, tb_power, target, one), target)
    return out


def full_early_payment_cell(
    allocations, masks, variables, target, one,
):
    out = {}
    left_mask, right_mask = masks
    for index, allocation in enumerate(allocations):
        kwargs = {
            "use_left_suffix": bool(left_mask & (1 << index)),
            "use_right_suffix": bool(right_mask & (1 << index)),
        }
        low = full_early_terminal_monomial(
            allocation["source_low"]["monomial"], variables, target, one,
            **kwargs,
        )
        high = full_early_terminal_monomial(
            allocation["source_high"]["monomial"], variables, target, one,
            **kwargs,
        )
        negative = full_early_terminal_monomial(
            allocation["negative_monomial"], variables, target, one, **kwargs,
        )
        out = add(out, scale(low, int(allocation["source_low"]["capacity"])))
        out = add(out, scale(high, int(allocation["source_high"]["capacity"])))
        out = add(out, scale(negative, -int(allocation["demand"])))
    return out.get(target, 0)


def negative_terms(polynomial):
    rows = []
    for monomial, coefficient in polynomial.terms():
        value = int(coefficient)
        if value < 0:
            rows.append({
                "monomial": list(map(int, monomial)),
                "coefficient": value,
            })
    return rows


def validate_allocations(rows):
    checked = 0
    for label in ("curvature_far", "strong_far"):
        for allocation in rows[label]["allocations"]:
            low = list(map(int, allocation["source_low"]["monomial"]))
            high = list(map(int, allocation["source_high"]["monomial"]))
            negative = list(map(int, allocation["negative_monomial"]))
            assert [a + b for a, b in zip(low, high)] == [2 * n for n in negative]
            low_capacity = int(allocation["source_low"]["capacity"])
            high_capacity = int(allocation["source_high"]["capacity"])
            demand = int(allocation["demand"])
            assert demand * demand <= 4 * low_capacity * high_capacity
            checked += 1
    return checked


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--a3", type=int, choices=range(10), required=True)
    parser.add_argument("--b3", type=int, choices=range(9), required=True)
    parser.add_argument("--a0", type=int, choices=range(3), required=True)
    parser.add_argument("--b0", type=int, choices=range(3), required=True)
    parser.add_argument("--output", type=Path)
    args = parser.parse_args()

    actual_inputs = {path.name: sha256(path) for path in (
        EARLY_REPORT, CURVATURE_REPORT, STRONG_REPORT, FAILURE_REPORT,
    )}
    assert actual_inputs == EXPECTED_INPUTS
    target = (args.a3, args.b3, args.a0, args.b0)
    context = fmpz_mpoly_ctx.get(INNER_NAMES, "degrevlex")
    variables = dict(zip(INNER_NAMES, context.gens()))
    zero, one = context.constant(0), context.constant(1)

    endpoint = build_at(variables, 1, target, one)
    raw = {
        "curvature_far": curvature_cell(
            endpoint["v"], target, zero, variables["h"],
        ),
        "strong_far": strong_cell(endpoint, target, zero, variables["h"]),
    }

    early = json.loads(EARLY_REPORT.read_text(encoding="utf-8"))
    early_rows = {row["bernstein_target"]: row for row in early["rows"]}
    curvature = json.loads(CURVATURE_REPORT.read_text(encoding="utf-8"))
    strong = json.loads(STRONG_REPORT.read_text(encoding="utf-8"))
    strong_rows = {row["bernstein_coefficient"]: row for row in strong["rows"]}
    old_allocations = {
        "curvature_far": curvature["allocations"],
        "strong_far": strong_rows["far"]["allocations"],
    }
    old_masks = {
        "curvature_far": (0, 3),
        "strong_far": (693, 330),
    }

    old_residual = {
        label: raw[label] - suffix_only_payment_cell(
            old_allocations[label], old_masks[label], variables, target, one,
        )
        for label in raw
    }
    replacement = {}
    for label in raw:
        masks = PAYMENT_MASKS[label]
        replacement[label] = raw[label] - full_early_payment_cell(
            early_rows[label]["allocations"],
            (masks["left"], masks["right"]),
            variables,
            target,
            one,
        )

    report = {
        "schema": "rank8-low-low-suffix3-gap0-full-early-payment-cell-v1",
        "status": "PASS_EXACT_FULL_EARLY_REPLACEMENT_PAYMENT"
            if all(stats(poly)["negative"] == 0 for poly in replacement.values())
            else "FAIL_EXACT_FULL_EARLY_REPLACEMENT_PAYMENT",
        "outer_cell": list(target),
        "inner_variables": list(INNER_NAMES),
        "old_payment": {
            label: {
                "statistics": stats(poly),
                "all_negative_terms": negative_terms(poly),
            }
            for label, poly in old_residual.items()
        },
        "replacement_payment": {
            label: stats(poly) for label, poly in replacement.items()
        },
        "replacement_masks": {
            label: PAYMENT_MASKS[label] for label in replacement
        },
        "amgm_allocations_checked": validate_allocations(early_rows),
        "immutable_inputs": actual_inputs,
        "source_sha256": sha256(Path(__file__)),
        "scope": (
            "Exact coefficient audit of the two paid far auxiliaries at one "
            "outer cell; this is not a proof of the complete suffix-3 face."
        ),
    }
    rendered = json.dumps(report, indent=2) + "\n"
    if args.output:
        args.output.write_text(rendered, encoding="utf-8")
    print(json.dumps(report), flush=True)


if __name__ == "__main__":
    main()
