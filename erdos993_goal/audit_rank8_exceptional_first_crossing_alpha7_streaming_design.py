#!/usr/bin/env python3
"""Independent coefficient/no-gap audit of the alpha7 streaming design."""

from __future__ import annotations

import csv
import hashlib
import json
from pathlib import Path


ROOT = Path(__file__).resolve().parent
DESIGNER = ROOT / "design_rank8_exceptional_first_crossing_alpha7_streaming.py"
DESIGN = ROOT / "rank8_exceptional_first_crossing_alpha7_streaming_design_exact_20260820.json"
JETS = ROOT / "rank8_exceptional_tree_jets_exact_20260820.tsv"
MEASURED_AUDIT = ROOT / "rank8_exceptional_first_crossing_alpha6_s13_types84_93_audit_exact_20260820.json"
OUTPUT = ROOT / "rank8_exceptional_first_crossing_alpha7_streaming_design_audit_exact_20260820.json"
TYPE_START = 248
TYPE_STOP = 947
TERMINAL_TYPES = 700
TARGET = 550_000
BASELINE = 32 * 1024**2
STATE_ALLOWANCE = 256
ABORT_LIMIT = 448 * 1024**2


def digest(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def ceil_ratio(numerator: int, denominator: int) -> int:
    return (numerator + denominator - 1) // denominator


def main() -> int:
    design = json.loads(DESIGN.read_text(encoding="utf-8"))
    measured = json.loads(MEASURED_AUDIT.read_text(encoding="utf-8"))
    assert design["status"] == "PASS_EXACT_NO_GAP_RESOURCE_DESIGN_RANK8_EXCEPTIONAL_FIRST_CROSSING_ALPHA7_NO_SIGN_RUN"
    assert design["products_enumerated"] == 0

    # Derive component counts from the TSV rather than trusting the designer's
    # constants, then use type-by-type unbounded knapsack.
    type_counts = {alpha: 0 for alpha in range(1, 8)}
    with JETS.open(newline="", encoding="utf-8") as handle:
        rows = list(csv.DictReader(handle, delimiter="\t"))
    assert len(rows) == 1215
    for row in rows:
        alpha = int(row["alpha"])
        if alpha <= 7:
            type_counts[alpha] += 1
    assert type_counts == {1: 2, 2: 2, 3: 5, 4: 15, 5: 48, 6: 175, 7: 700}

    lower = [0] * 14
    lower[0] = 1
    for row in rows[:247]:
        weight = int(row["alpha"])
        assert weight <= 6
        for alpha in range(weight, 14):
            lower[alpha] += lower[alpha - weight]
    assert lower == [design["exact_counts"]["lower_raw_multiset_coefficients_alpha0_13"][str(alpha)] for alpha in range(14)]

    full = lower[:]
    for _ in range(700):
        for alpha in range(7, 14):
            full[alpha] += full[alpha - 7]
    assert full == [design["exact_counts"]["through_alpha7_raw_state_upper_bounds_alpha0_13"][str(alpha)] for alpha in range(14)]
    assert sum(full) == design["exact_counts"]["through_alpha7_raw_state_upper_bound_total"]

    measured_raw = int(measured["shard"]["independently_enumerated_multisets"])
    measured_peak = int(measured["resources"]["peak_private_bytes"])
    measured_dynamic = measured_peak - BASELINE
    raw_total = shard_total = maximum_raw = maximum_projection = 0
    cells = {}
    for source in range(7, 14):
        dp = lower[:]
        per_type = []
        for _ in range(TERMINAL_TYPES):
            for alpha in range(7, 14):
                dp[alpha] += dp[alpha - 7]
            per_type.append(dp[source])
        cell = design["exact_counts"]["source_cells"][str(source)]
        assert per_type == [lower[source] + relative * lower[source - 7] for relative in range(1, TERMINAL_TYPES + 1)]
        assert sum(per_type) == cell["raw_multiset_crossing_count"]
        expected_type = TYPE_START
        cell_sum = 0
        for shard in cell["shards"]:
            start = int(shard["terminal_type_index_start"])
            stop = int(shard["terminal_type_index_stop"])
            assert start == expected_type and start <= stop <= TYPE_STOP
            expected_type = stop + 1
            raw = sum(per_type[start - TYPE_START : stop - TYPE_START + 1])
            assert raw == shard["raw_multiset_count"] and raw <= TARGET
            projected = BASELINE + ceil_ratio(raw * measured_dynamic * 2, measured_raw) + lower[source] * STATE_ALLOWANCE
            assert projected == shard["projected_peak_private_bytes"] < ABORT_LIMIT
            cell_sum += raw
            maximum_raw = max(maximum_raw, raw)
            maximum_projection = max(maximum_projection, projected)
        assert expected_type == TYPE_STOP + 1 and cell_sum == sum(per_type)
        raw_total += cell_sum
        shard_total += len(cell["shards"])
        cells[str(source)] = {
            "raw_multisets": cell_sum,
            "shards": len(cell["shards"]),
            "maximum_single_type_raw": max(per_type),
        }

    assert raw_total == design["exact_counts"]["raw_crossings_total"]
    assert shard_total == design["exact_counts"]["audit_shards_total"]
    assert maximum_raw == design["resource_design"]["maximum_shard_raw_multisets"]
    assert maximum_projection == design["resource_design"]["maximum_projected_peak_private_bytes"]
    assert design["resource_design"]["rejected_enclosures"] == [{
        "raw_target": 400000,
        "classification": "infeasible type-block enclosure, not a sign or forest obstruction",
        "exact_reason": "source13 terminal type947 alone has 496731 raw multisets",
    }]
    assert design["pilot"]["representative_shard"] == design["exact_counts"]["source_cells"]["7"]["shards"][0]

    payload = {
        "schema": "rank8-exceptional-first-crossing-alpha7-streaming-design-audit-v1",
        "status": "PASS_INDEPENDENT_EXACT_NO_GAP_RESOURCE_DESIGN_AUDIT_RANK8_ALPHA7",
        "products_enumerated": 0,
        "method": "derive type counts from TSV, rebuild lower/full unbounded-knapsack coefficients, derive every per-terminal raw count by a separate prefix DP, reconstruct each consecutive shard union, and recompute the resource envelope",
        "coverage": {
            "terminal_type_indices": [TYPE_START, TYPE_STOP],
            "source_alpha_range": [7, 13],
            "source_cells": 7,
            "gaps": 0,
            "overlaps": 0,
            "raw_crossings_total": raw_total,
            "shards_total": shard_total,
            "cells": cells,
        },
        "resources": {
            "maximum_shard_raw_multisets": maximum_raw,
            "maximum_projected_peak_private_bytes": maximum_projection,
            "maximum_projected_peak_private_MiB": maximum_projection / 1024**2,
            "abort_limit_private_bytes": ABORT_LIMIT,
        },
        "scope_warning": "Independent design audit only; no alpha7 sign/product census was run.",
        "hashes": {
            DESIGNER.name: digest(DESIGNER),
            DESIGN.name: digest(DESIGN),
            JETS.name: digest(JETS),
            MEASURED_AUDIT.name: digest(MEASURED_AUDIT),
            Path(__file__).name: digest(Path(__file__)),
        },
    }
    OUTPUT.write_text(json.dumps(payload, indent=2, sort_keys=True) + "\n", encoding="utf-8")
    print(payload["status"])
    print(f"raw_total={raw_total} shards={shard_total} max_raw={maximum_raw} max_projected_MiB={maximum_projection/1024**2:.6f}")
    print(f"audit_sha256={digest(OUTPUT)}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
