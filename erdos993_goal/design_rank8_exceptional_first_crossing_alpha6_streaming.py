#!/usr/bin/env python3
"""Exact count/resource design for alpha6 crossing; enumerates no products."""

from __future__ import annotations

import hashlib
import json
import math
from pathlib import Path


ROOT = Path(__file__).resolve().parent
PILOT_REPORT = ROOT / "rank8_exceptional_first_crossing_alpha5_s9_exact_20260820.json"
PILOT_AUDIT = ROOT / "rank8_exceptional_first_crossing_alpha5_s9_audit_exact_20260820.json"
REST_REPORT = ROOT / "rank8_exceptional_first_crossing_alpha5_s10_13_exact_20260820.json"
REST_AUDIT = ROOT / "rank8_exceptional_first_crossing_alpha5_s10_13_audit_exact_20260820.json"
REST_DATABASE = ROOT / "rank8_exceptional_first_crossing_alpha5_s10_13_keys_exact_20260820.sqlite3"
OUTPUT = ROOT / "rank8_exceptional_first_crossing_alpha6_streaming_design_exact_20260820.json"
ALPHA6_TYPES = 175
LOWER_TYPES = 72
THRESHOLD = 14
RAW_TARGET_PER_AUDIT_SHARD = 750_000
AUDIT_BASELINE_ALLOWANCE = 32 * 1024**2
RECURRENCE_DATABASE_ALLOWANCE = 64 * 1024**2
OPERATING_ABORT_LIMIT = 448 * 1024**2
HARD_LIMIT = 512 * 1024**2
SAFETY_NUMERATOR = 5
SAFETY_DENOMINATOR = 4


def digest(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def ceiling_ratio(numerator: int, denominator: int) -> int:
    return (numerator + denominator - 1) // denominator


def raw_source_count(lower_counts, source_alpha, largest_relative_type):
    # After deleting the canonical terminal copy, k additional alpha6 factors
    # are an unbounded multiset of the first L alpha6 types.
    return sum(
        math.comb(k + largest_relative_type - 1, k)
        * lower_counts[source_alpha - 6 * k]
        for k in range(source_alpha // 6 + 1)
    )


def greedy_shards(per_type_counts):
    shards = []
    start = 1
    running = 0
    for relative_type, count in enumerate(per_type_counts, 1):
        if running and running + count > RAW_TARGET_PER_AUDIT_SHARD:
            shards.append(
                {
                    "largest_relative_type_start": start,
                    "largest_relative_type_stop": relative_type - 1,
                    "raw_multiset_upper_bound": running,
                }
            )
            start = relative_type
            running = 0
        assert count <= RAW_TARGET_PER_AUDIT_SHARD
        running += count
    if running:
        shards.append(
            {
                "largest_relative_type_start": start,
                "largest_relative_type_stop": len(per_type_counts),
                "raw_multiset_upper_bound": running,
            }
        )
    return shards


def main() -> int:
    pilot = json.loads(PILOT_REPORT.read_text(encoding="utf-8"))
    pilot_audit = json.loads(PILOT_AUDIT.read_text(encoding="utf-8"))
    rest = json.loads(REST_REPORT.read_text(encoding="utf-8"))
    rest_audit = json.loads(REST_AUDIT.read_text(encoding="utf-8"))
    assert pilot["status"].startswith("PASS_EXACT_RESOURCE_GATED")
    assert pilot_audit["status"].startswith("PASS_INDEPENDENT_BIDIRECTIONAL")
    assert rest["status"].startswith("PASS_EXACT_RESOURCE_GATED")
    assert rest_audit["status"].startswith("PASS_INDEPENDENT_BIDIRECTIONAL")

    lower_counts = [
        int(pilot["raw_multiset_state_upper_bound_by_alpha"][str(alpha)])
        for alpha in range(THRESHOLD)
    ]
    assert lower_counts == [
        1,
        2,
        5,
        13,
        39,
        123,
        256,
        575,
        1334,
        3162,
        7222,
        14554,
        30260,
        63606,
    ]
    alpha6_state_upper = []
    for alpha in range(THRESHOLD):
        alpha6_state_upper.append(
            sum(
                math.comb(k + ALPHA6_TYPES - 1, k) * lower_counts[alpha - 6 * k]
                for k in range(alpha // 6 + 1)
            )
        )
    assert alpha6_state_upper == [
        1,
        2,
        5,
        13,
        39,
        123,
        431,
        925,
        2209,
        5437,
        14047,
        36079,
        90460,
        195031,
    ]
    alpha6_state_upper_total = sum(alpha6_state_upper)
    assert alpha6_state_upper_total == 344802

    measured_alpha5_keys = int(rest_audit["cells"]["13"]["canonical_check_keys"])
    measured_alpha5_audit_peak = int(rest_audit["resources"]["peak_private_bytes"])
    assert measured_alpha5_keys == 1273768
    assert measured_alpha5_audit_peak == 498745344
    measured_database_bytes = REST_DATABASE.stat().st_size
    measured_rest_keys = int(rest["aggregate"]["ordered_covering_checks"])
    assert measured_database_bytes == 479744000
    assert measured_rest_keys == 2458721

    cells = {}
    total_raw_crossings = 0
    total_shards = 0
    maximum_shard_raw = 0
    maximum_shard_projection = 0
    for source_alpha in range(8, 14):
        per_type = [
            raw_source_count(lower_counts, source_alpha, relative_type)
            for relative_type in range(1, ALPHA6_TYPES + 1)
        ]
        raw_total = sum(per_type)
        shards = greedy_shards(per_type)
        for shard in shards:
            raw = int(shard["raw_multiset_upper_bound"])
            projected = AUDIT_BASELINE_ALLOWANCE + ceiling_ratio(
                raw
                * measured_alpha5_audit_peak
                * SAFETY_NUMERATOR,
                measured_alpha5_keys * SAFETY_DENOMINATOR,
            )
            projected_disk = ceiling_ratio(
                raw * measured_database_bytes * SAFETY_NUMERATOR,
                measured_rest_keys * SAFETY_DENOMINATOR,
            )
            shard["terminal_type_index_start"] = 72 + int(
                shard["largest_relative_type_start"]
            )
            shard["terminal_type_index_stop"] = 72 + int(
                shard["largest_relative_type_stop"]
            )
            shard["projected_peak_private_bytes"] = projected
            shard["projected_peak_private_MiB"] = projected / 1024**2
            shard["projected_temporary_database_bytes"] = projected_disk
            assert projected < OPERATING_ABORT_LIMIT
            maximum_shard_raw = max(maximum_shard_raw, raw)
            maximum_shard_projection = max(maximum_shard_projection, projected)
        cells[str(source_alpha)] = {
            "source_alpha": source_alpha,
            "terminal_alpha": 6,
            "total_alpha": source_alpha + 6,
            "raw_multiset_crossing_count": raw_total,
            "per_largest_type_formula": (
                "sum_{k=0}^{floor(source/6)} C(k+L-1,k)*c[source-6k]"
            ),
            "audit_shards": shards,
            "audit_shard_count": len(shards),
            "maximum_single_type_raw_count": max(per_type),
        }
        total_raw_crossings += raw_total
        total_shards += len(shards)

    expected_raw = {
        "8": 310450,
        "9": 753550,
        "10": 1864450,
        "11": 4441150,
        "12": 10146500,
        "13": 21803250,
    }
    assert {source: cell["raw_multiset_crossing_count"] for source, cell in cells.items()} == expected_raw
    assert total_raw_crossings == 39319350

    scaled_state_projection = ceiling_ratio(
        int(pilot["resources"]["maximum_projected_private_bytes"])
        * alpha6_state_upper_total,
        int(pilot["raw_multiset_state_upper_bound_total"]),
    )
    recurrence_projection = scaled_state_projection + RECURRENCE_DATABASE_ALLOWANCE
    assert recurrence_projection < OPERATING_ABORT_LIMIT

    unsharded_source13_projection = AUDIT_BASELINE_ALLOWANCE + ceiling_ratio(
        expected_raw["13"]
        * measured_alpha5_audit_peak
        * SAFETY_NUMERATOR,
        measured_alpha5_keys * SAFETY_DENOMINATOR,
    )
    assert unsharded_source13_projection > HARD_LIMIT

    recurrence_seconds_projection = (
        total_raw_crossings
        * float(rest["resources"]["elapsed_seconds"])
        / measured_rest_keys
        * SAFETY_NUMERATOR
        / SAFETY_DENOMINATOR
    )
    audit_seconds_projection = (
        total_raw_crossings
        * float(rest_audit["resources"]["elapsed_seconds"])
        / int(rest_audit["aggregate"]["independently_enumerated_multisets"])
        * SAFETY_NUMERATOR
        / SAFETY_DENOMINATOR
    )
    disk_projection = ceiling_ratio(
        total_raw_crossings
        * measured_database_bytes
        * SAFETY_NUMERATOR,
        measured_rest_keys * SAFETY_DENOMINATOR,
    )

    payload = {
        "schema": "rank8-exceptional-first-crossing-alpha6-streaming-design-v1",
        "status": "PASS_EXACT_BOUNDED_DESIGN_RANK8_EXCEPTIONAL_FIRST_CROSSING_ALPHA6_NO_CENSUS_RUN",
        "products_enumerated": 0,
        "proof_status": (
            "design and exact combinatorial resource envelope only; no alpha6 sign "
            "certificate is claimed"
        ),
        "exact_counts": {
            "lower_alpha1_5_component_types": LOWER_TYPES,
            "alpha6_component_types": ALPHA6_TYPES,
            "alpha6_terminal_type_indices": [73, 247],
            "lower_raw_state_counts_by_alpha": {
                str(alpha): value for alpha, value in enumerate(lower_counts)
            },
            "alpha6_raw_state_upper_bound_by_alpha": {
                str(alpha): value for alpha, value in enumerate(alpha6_state_upper)
            },
            "alpha6_raw_state_upper_bound_total": alpha6_state_upper_total,
            "source_cells": cells,
            "raw_crossings_total": total_raw_crossings,
        },
        "resource_obstruction_to_current_audit": {
            "classification": (
                "source-cell-only audit is rejected by projection; this is a "
                "resource obstruction, not a sign or forest counterexample"
            ),
            "source13_raw_multisets": expected_raw["13"],
            "unsharded_source13_projected_peak_private_bytes": unsharded_source13_projection,
            "unsharded_source13_projected_peak_private_GiB": unsharded_source13_projection
            / 1024**3,
            "basis": (
                "alpha5 source13 measured peak per canonical key, pessimistically "
                "treating every alpha6 raw multiset as a distinct key, times1.25, "
                "plus32MiB baseline"
            ),
        },
        "bounded_streaming_design": {
            "workers": 1,
            "largest_type_raw_target_per_shard": RAW_TARGET_PER_AUDIT_SHARD,
            "source_cells_processed_separately": True,
            "fresh_process_per_audit_shard": True,
            "audit_shards_total": total_shards,
            "maximum_shard_raw_multisets": maximum_shard_raw,
            "maximum_projected_audit_shard_private_bytes": maximum_shard_projection,
            "maximum_projected_audit_shard_private_MiB": maximum_shard_projection
            / 1024**2,
            "recurrence_state_plus_database_projected_private_bytes": recurrence_projection,
            "recurrence_state_plus_database_projected_private_MiB": recurrence_projection
            / 1024**2,
            "operating_abort_limit_private_bytes": OPERATING_ABORT_LIMIT,
            "hard_limit_private_bytes": HARD_LIMIT,
            "recurrence_method": (
                "build the sorted-type partial-state closure once; at each alpha6 "
                "terminal type stream each source8..13 key into the current consecutive "
                "largest-type shard, using 2500-row batches and at most six 8MiB SQLite "
                "caches; close all six shard files at each type-block boundary"
            ),
            "audit_method": (
                "for each (source,largest-type block), independently enumerate only "
                "raw multisets assigned to that block, deconvolve the unique terminal "
                "copy, compare key/product tables bidirectionally, then delete the "
                "temporary audit database before the next fresh process"
            ),
            "fail_closed_gates": [
                "abort a shard at 448MiB actual or projected private memory",
                "never exceed the 512MiB hard cap",
                "preserve completed shard counts and the first sign/resource obstruction",
                "assemble only if every source8..13 block is present exactly once and both EXCEPT directions are empty",
            ],
        },
        "conservative_scale_projection": {
            "recurrence_elapsed_seconds": recurrence_seconds_projection,
            "audit_elapsed_seconds_before_shard_startup_overhead": audit_seconds_projection,
            "sealed_recurrence_database_bytes_upper": disk_projection,
            "safety_factor": 1.25,
            "warning": (
                "time and disk are scale projections from alpha5; memory bounds use "
                "the exact per-shard raw counts and measured alpha5 peak-per-key"
            ),
        },
        "recommendation": (
            "Do not use the current unsharded source-cell audit.  The consecutive "
            "largest-type streaming design is projected below448MiB and is the next "
            "bounded exact route; begin with the final source13 block as the worst-case pilot."
        ),
        "scope_warning": (
            "No alpha6 product, sign, tree census, full/full cone, or connected Delta0..3 "
            "case was run."
        ),
        "hashes": {
            PILOT_REPORT.name: digest(PILOT_REPORT),
            PILOT_AUDIT.name: digest(PILOT_AUDIT),
            REST_REPORT.name: digest(REST_REPORT),
            REST_AUDIT.name: digest(REST_AUDIT),
            REST_DATABASE.name: digest(REST_DATABASE),
            Path(__file__).name: digest(Path(__file__)),
        },
    }
    OUTPUT.write_text(json.dumps(payload, indent=2, sort_keys=True) + "\n", encoding="utf-8")
    print(payload["status"])
    print(
        f"raw_state_upper={alpha6_state_upper_total} raw_crossings={total_raw_crossings} "
        f"audit_shards={total_shards} max_shard_raw={maximum_shard_raw} "
        f"max_shard_projected_MiB={maximum_shard_projection/1024**2:.3f}"
    )
    print(f"design_sha256={digest(OUTPUT)}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
