#!/usr/bin/env python3
"""Independent count/resource audit of alpha6 streaming design; no products."""

from __future__ import annotations

import hashlib
import json
from pathlib import Path


ROOT = Path(__file__).resolve().parent
DESIGNER = ROOT / "design_rank8_exceptional_first_crossing_alpha6_streaming.py"
DESIGN = ROOT / "rank8_exceptional_first_crossing_alpha6_streaming_design_exact_20260820.json"
PILOT_REPORT = ROOT / "rank8_exceptional_first_crossing_alpha5_s9_exact_20260820.json"
REST_REPORT = ROOT / "rank8_exceptional_first_crossing_alpha5_s10_13_exact_20260820.json"
REST_AUDIT = ROOT / "rank8_exceptional_first_crossing_alpha5_s10_13_audit_exact_20260820.json"
REST_DATABASE = ROOT / "rank8_exceptional_first_crossing_alpha5_s10_13_keys_exact_20260820.sqlite3"
OUTPUT = ROOT / "rank8_exceptional_first_crossing_alpha6_streaming_design_audit_exact_20260820.json"
EXPECTED_DESIGNER = "A7AF9F397AECFC209500E4737E1A16FF9E59A2049308EE6747E6A6D095A82B38"
EXPECTED_DESIGN = "4986E672D8CC853957C11E45D339DEE54D835E2AB1CD25A916A3695AD71BA06D"
TYPE_COUNTS = {1: 2, 2: 2, 3: 5, 4: 15, 5: 48}
ALPHA6_TYPES = 175
TARGET = 750_000
BASELINE = 32 * 1024**2
SAFETY_NUMERATOR = 5
SAFETY_DENOMINATOR = 4


def digest(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def ceil_ratio(numerator, denominator):
    return (numerator + denominator - 1) // denominator


def main() -> int:
    assert digest(DESIGNER) == EXPECTED_DESIGNER
    assert digest(DESIGN) == EXPECTED_DESIGN
    design = json.loads(DESIGN.read_text(encoding="utf-8"))
    assert (
        design["status"]
        == "PASS_EXACT_BOUNDED_DESIGN_RANK8_EXCEPTIONAL_FIRST_CROSSING_ALPHA6_NO_CENSUS_RUN"
    )
    assert design["products_enumerated"] == 0

    # Rebuild raw lower multiset coefficients by type-by-type unbounded
    # knapsack, independently of the design's closed formula.
    lower = [0] * 20
    lower[0] = 1
    for weight, count in TYPE_COUNTS.items():
        for _ in range(count):
            for alpha in range(weight, len(lower)):
                lower[alpha] += lower[alpha - weight]
    reported_lower = design["exact_counts"]["lower_raw_state_counts_by_alpha"]
    assert [reported_lower[str(alpha)] for alpha in range(14)] == lower[:14]

    full = lower[:14]
    for _ in range(ALPHA6_TYPES):
        for alpha in range(6, 14):
            full[alpha] += full[alpha - 6]
    assert full == [
        design["exact_counts"]["alpha6_raw_state_upper_bound_by_alpha"][str(alpha)]
        for alpha in range(14)
    ]
    assert sum(full) == design["exact_counts"]["alpha6_raw_state_upper_bound_total"] == 344802

    rest_audit = json.loads(REST_AUDIT.read_text(encoding="utf-8"))
    measured_peak = int(rest_audit["resources"]["peak_private_bytes"])
    measured_keys = int(rest_audit["cells"]["13"]["canonical_check_keys"])
    total_raw = 0
    total_shards = 0
    maximum_raw = 0
    maximum_projection = 0
    recomputed_cells = {}
    for source_alpha in range(8, 14):
        # dp_L counts source multisets using lower types and the first L
        # alpha6 types.  Deleting the canonical terminal copy of largest type
        # L gives exactly this source set.
        dp = lower[:14]
        per_type = []
        for _ in range(ALPHA6_TYPES):
            for alpha in range(6, 14):
                dp[alpha] += dp[alpha - 6]
            per_type.append(dp[source_alpha])
        cell = design["exact_counts"]["source_cells"][str(source_alpha)]
        assert sum(per_type) == cell["raw_multiset_crossing_count"]
        expected_next = 1
        cell_sum = 0
        for shard in cell["audit_shards"]:
            start = shard["largest_relative_type_start"]
            stop = shard["largest_relative_type_stop"]
            assert start == expected_next
            assert start <= stop <= ALPHA6_TYPES
            expected_next = stop + 1
            raw = sum(per_type[start - 1 : stop])
            assert raw == shard["raw_multiset_upper_bound"]
            assert raw <= TARGET
            projected = BASELINE + ceil_ratio(
                raw * measured_peak * SAFETY_NUMERATOR,
                measured_keys * SAFETY_DENOMINATOR,
            )
            assert projected == shard["projected_peak_private_bytes"]
            assert projected < design["bounded_streaming_design"][
                "operating_abort_limit_private_bytes"
            ]
            cell_sum += raw
            maximum_raw = max(maximum_raw, raw)
            maximum_projection = max(maximum_projection, projected)
        assert expected_next == ALPHA6_TYPES + 1
        assert cell_sum == sum(per_type)
        total_raw += cell_sum
        total_shards += len(cell["audit_shards"])
        recomputed_cells[str(source_alpha)] = {
            "raw_multisets": cell_sum,
            "shards": len(cell["audit_shards"]),
            "maximum_single_type_raw": max(per_type),
        }

    assert total_raw == design["exact_counts"]["raw_crossings_total"] == 39319350
    assert total_shards == design["bounded_streaming_design"]["audit_shards_total"] == 61
    assert maximum_raw == design["bounded_streaming_design"][
        "maximum_shard_raw_multisets"
    ] == 748113
    assert maximum_projection == design["bounded_streaming_design"][
        "maximum_projected_audit_shard_private_bytes"
    ] == 399710078
    assert design["resource_obstruction_to_current_audit"][
        "unsharded_source13_projected_peak_private_bytes"
    ] > design["bounded_streaming_design"]["hard_limit_private_bytes"]
    assert design["bounded_streaming_design"][
        "recurrence_state_plus_database_projected_private_bytes"
    ] < design["bounded_streaming_design"]["operating_abort_limit_private_bytes"]

    payload = {
        "schema": "rank8-exceptional-first-crossing-alpha6-streaming-design-audit-v1",
        "status": "PASS_INDEPENDENT_EXACT_RANK8_ALPHA6_STREAMING_DESIGN_AUDIT_NO_PRODUCTS",
        "products_enumerated": 0,
        "independent_method": (
            "rebuild lower coefficients by type-by-type unbounded knapsack, add "
            "175 alpha6 types incrementally, recover per-largest-type source counts "
            "from each intermediate DP, and recompute every shard sum and projection"
        ),
        "recomputed_cells": recomputed_cells,
        "raw_state_upper_bound_total": sum(full),
        "raw_crossings_total": total_raw,
        "audit_shards_total": total_shards,
        "maximum_shard_raw_multisets": maximum_raw,
        "maximum_projected_audit_shard_private_bytes": maximum_projection,
        "scope_warning": (
            "This audits a bounded design only.  It proves no alpha6 sign and "
            "enumerates no alpha6 product."
        ),
        "hashes": {
            DESIGNER.name: digest(DESIGNER),
            DESIGN.name: digest(DESIGN),
            PILOT_REPORT.name: digest(PILOT_REPORT),
            REST_REPORT.name: digest(REST_REPORT),
            REST_AUDIT.name: digest(REST_AUDIT),
            REST_DATABASE.name: digest(REST_DATABASE),
            Path(__file__).name: digest(Path(__file__)),
        },
    }
    OUTPUT.write_text(json.dumps(payload, indent=2, sort_keys=True) + "\n", encoding="utf-8")
    print(payload["status"])
    print(f"audit_sha256={digest(OUTPUT)}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
