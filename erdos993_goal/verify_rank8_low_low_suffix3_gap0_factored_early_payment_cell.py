#!/usr/bin/env python3
"""Exact cell check for the face-factored full-early suffix-3 payment lift."""

from __future__ import annotations

import argparse
import hashlib
import json
from pathlib import Path

from flint import fmpz_mpoly_ctx

from diagnose_rank8_low_low_suffix3_gap0_full_early_payment_cell import (
    full_early_payment_cell,
)
from probe_rank8_low_low_full_early_suffix45_cell_flint import (
    PAYMENT_MASKS,
    curvature_cell,
    stats,
    strong_cell,
)
from probe_rank8_low_low_suffix3_gap0_outer_cell_flint import INNER_NAMES, build_at


ROOT = Path(__file__).resolve().parent
FACTORED_REPORT = (
    ROOT / "rank8_low_low_full_early_core_factored_amgm_exact_20260822.json"
)
EXPECTED_FACTORED_REPORT = (
    "36673C44864659E3DAB2CC99071DAE2C306830B8B672A8C7F3E41ED5A2AFCFF6"
)


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--a3", type=int, choices=range(10), required=True)
    parser.add_argument("--b3", type=int, choices=range(9), required=True)
    parser.add_argument("--a0", type=int, choices=range(3), required=True)
    parser.add_argument("--b0", type=int, choices=range(3), required=True)
    parser.add_argument("--output", type=Path)
    args = parser.parse_args()
    assert sha256(FACTORED_REPORT) == EXPECTED_FACTORED_REPORT

    report = json.loads(FACTORED_REPORT.read_text(encoding="utf-8"))
    assert report["status"] == "PASS_EXACT_RANK8_LOW_LOW_FULL_EARLY_CORE_FACTORED_AMGM"
    allocation_rows = {
        row["bernstein_target"]: row["allocations"] for row in report["rows"]
    }
    target = (args.a3, args.b3, args.a0, args.b0)
    context = fmpz_mpoly_ctx.get(INNER_NAMES, "degrevlex")
    variables = dict(zip(INNER_NAMES, context.gens()))
    zero, one = context.constant(0), context.constant(1)
    built = {
        multiplier: build_at(variables, multiplier, target, one)
        for multiplier in (-1, 0, 1)
    }
    endpoints = {
        multiplier: {
            "curvature": curvature_cell(
                rows["v"], target, zero, variables["h"],
            ),
            "strong": strong_cell(rows, target, zero, variables["h"]),
        }
        for multiplier, rows in built.items()
    }
    auxiliaries = {
        "curvature_middle_times_4": (
            4 * endpoints[0]["curvature"]
            + endpoints[1]["curvature"]
            - endpoints[-1]["curvature"]
        ),
        "curvature_far": endpoints[1]["curvature"],
        "strong_middle_times_4": (
            4 * endpoints[0]["strong"]
            + endpoints[1]["strong"]
            - endpoints[-1]["strong"]
        ),
        "strong_far": endpoints[1]["strong"],
    }
    residuals = {}
    for label, polynomial in auxiliaries.items():
        masks = PAYMENT_MASKS[label]
        residuals[label] = polynomial - full_early_payment_cell(
            allocation_rows[label],
            (masks["left"], masks["right"]),
            variables,
            target,
            one,
        )
    statistics = {label: stats(poly) for label, poly in residuals.items()}
    passed = all(row["negative"] == 0 for row in statistics.values())
    output = {
        "schema": "rank8-low-low-suffix3-gap0-factored-early-payment-cell-v1",
        "status": "PASS_EXACT_FACTORED_EARLY_PAYMENT_CELL"
            if passed else "FAIL_EXACT_FACTORED_EARLY_PAYMENT_CELL",
        "outer_cell": list(target),
        "inner_variables": list(INNER_NAMES),
        "rows": statistics,
        "allocation_counts": {
            label: len(allocations)
            for label, allocations in allocation_rows.items()
        },
        "payment_masks": PAYMENT_MASKS,
        "immutable_inputs": {
            FACTORED_REPORT.name: EXPECTED_FACTORED_REPORT,
        },
        "source_sha256": sha256(Path(__file__)),
        "scope": (
            "One exact outer cell with suffix-4--7 variables retained; this "
            "does not by itself certify the complete suffix-3 face."
        ),
    }
    rendered = json.dumps(output, indent=2) + "\n"
    if args.output:
        args.output.write_text(rendered, encoding="utf-8")
    print(json.dumps(output), flush=True)


if __name__ == "__main__":
    main()
