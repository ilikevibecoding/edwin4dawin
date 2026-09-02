#!/usr/bin/env python3
"""Exact count/shard design for the 2,159 remaining exceptional crossings.

This script enumerates no product jets.  It derives the raw multiset fibers
for terminal alpha eight and nine from the sealed exceptional-jet catalogue,
then produces consecutive resource-bounded shard ranges.
"""

from __future__ import annotations

import csv
import hashlib
import json
from pathlib import Path


ROOT = Path(__file__).resolve().parent
JETS = ROOT / "rank8_exceptional_tree_jets_exact_20260820.tsv"
CLASSIFICATION = ROOT / "rank8_exceptional_tree_jets_exact_20260820.json"
ALPHA7_COMPLETE = ROOT / "rank8_exceptional_first_crossing_alpha7_sources7_13_complete_exact_20260820.json"
ALPHA7_AUDIT = ROOT / "rank8_exceptional_first_crossing_alpha7_sources7_13_complete_audit_exact_20260820.json"
ALPHA7_S13 = ROOT / "rank8_exceptional_first_crossing_alpha7_s13_complete_exact_20260820.json"
OUTPUT = ROOT / "rank8_exceptional_first_crossing_alpha8_alpha9_streaming_design_agent_20260823.json"

THRESHOLD = 14
RAW_TARGET = 550_000
BASELINE = 32 * 1024**2
BYTES_PER_ADDITIONAL_LOWER_RAW_STATE = 256
SAFETY_NUMERATOR = 5
SAFETY_DENOMINATOR = 4
ABORT_LIMIT = 448 * 1024**2
HARD_LIMIT = 512 * 1024**2

EXPECTED_JETS_SHA256 = "B4558C561CE1C13C74C4AFB2DA25CD0E0265AB7AD6C9AC1C283EC54133D1F17A"
EXPECTED_CLASSIFICATION_SHA256 = "BFE580BFED487B75D8C4A188AA56770D06EED3C6F4C351F4E093998F3CF0B0C4"
EXPECTED_ALPHA7_COMPLETE_SHA256 = "7CF5B21D18CD0D9B208F1D36ABC2E8FEF4947F942CBC291872705B99AB1E5768"
EXPECTED_ALPHA7_AUDIT_SHA256 = "9B9CA836AB13AE52D969F681C6DFF8E0CD9FB01B74E85E32E7165076E80F2E0E"


def digest(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def ceil_ratio(numerator: int, denominator: int) -> int:
    return (numerator + denominator - 1) // denominator


def raw_coefficients(type_counts: dict[int, int]) -> list[int]:
    coefficients = [0] * THRESHOLD
    coefficients[0] = 1
    for weight in sorted(type_counts):
        for _ in range(type_counts[weight]):
            for alpha in range(weight, THRESHOLD):
                coefficients[alpha] += coefficients[alpha - weight]
    return coefficients


def greedy_shards(
    per_type: list[int], type_start: int, baseline_lower_raw: int, measured: dict
) -> list[dict]:
    shards: list[tuple[int, int, int]] = []
    relative_start = 1
    running = 0
    for relative, count in enumerate(per_type, 1):
        assert count <= RAW_TARGET
        if running and running + count > RAW_TARGET:
            shards.append((relative_start, relative - 1, running))
            relative_start = relative
            running = 0
        running += count
    if running:
        shards.append((relative_start, len(per_type), running))

    result = []
    for relative_start, relative_stop, raw in shards:
        measured_dynamic = measured["peak_private_bytes"] - BASELINE
        projection = BASELINE + ceil_ratio(
            raw * measured_dynamic * SAFETY_NUMERATOR,
            measured["raw_multisets"] * SAFETY_DENOMINATOR,
        )
        projection += max(0, baseline_lower_raw - measured["lower_raw_states"]) * BYTES_PER_ADDITIONAL_LOWER_RAW_STATE
        result.append(
            {
                "relative_terminal_type_start": relative_start,
                "relative_terminal_type_stop": relative_stop,
                "terminal_type_index_start": type_start + relative_start - 1,
                "terminal_type_index_stop": type_start + relative_stop - 1,
                "raw_multiset_count": raw,
                "projected_peak_private_bytes": projection,
                "projected_peak_private_MiB": projection / 1024**2,
                "projection_below_abort_gate": projection < ABORT_LIMIT,
            }
        )
    return result


def terminal_band(
    terminal_alpha: int,
    type_start: int,
    type_stop: int,
    source_start: int,
    lower_counts: list[int],
    measured: dict,
) -> dict:
    terminal_type_count = type_stop - type_start + 1
    cells = {}
    raw_total = 0
    shard_total = 0
    max_fiber = 0
    max_projection = 0
    all_projections_below_gate = True
    for source_alpha in range(source_start, THRESHOLD):
        per_type = [
            lower_counts[source_alpha]
            + relative * lower_counts[source_alpha - terminal_alpha]
            if source_alpha >= terminal_alpha
            else lower_counts[source_alpha]
            for relative in range(1, terminal_type_count + 1)
        ]
        coefficient = lower_counts[source_alpha - terminal_alpha] if source_alpha >= terminal_alpha else 0
        shards = greedy_shards(per_type, type_start, lower_counts[source_alpha], measured)
        expected = type_start
        for shard in shards:
            assert shard["terminal_type_index_start"] == expected
            expected = shard["terminal_type_index_stop"] + 1
            max_projection = max(max_projection, int(shard["projected_peak_private_bytes"]))
            all_projections_below_gate &= bool(shard["projection_below_abort_gate"])
        assert expected == type_stop + 1
        raw = sum(per_type)
        assert raw == terminal_type_count * lower_counts[source_alpha] + coefficient * terminal_type_count * (terminal_type_count + 1) // 2
        cells[str(source_alpha)] = {
            "source_alpha": source_alpha,
            "terminal_alpha": terminal_alpha,
            "total_alpha": source_alpha + terminal_alpha,
            "terminal_type_indices": [type_start, type_stop],
            "terminal_type_count": terminal_type_count,
            "per_relative_terminal_formula": f"{lower_counts[source_alpha]} + L*{coefficient}",
            "lower_source_raw_count": lower_counts[source_alpha],
            "lower_prefix_base_raw_count": coefficient,
            "raw_multiset_crossing_count": raw,
            "maximum_single_type_raw_count": max(per_type),
            "shard_count": len(shards),
            "shards": shards,
        }
        raw_total += raw
        shard_total += len(shards)
        max_fiber = max(max_fiber, max(per_type))
    return {
        "terminal_alpha": terminal_alpha,
        "terminal_type_indices": [type_start, type_stop],
        "terminal_type_count": terminal_type_count,
        "source_alpha_range": [source_start, 13],
        "source_type_cells": (14 - source_start) * terminal_type_count,
        "raw_multisets_total": raw_total,
        "shard_count": shard_total,
        "maximum_single_type_raw_count": max_fiber,
        "maximum_projected_peak_private_bytes": max_projection,
        "all_design_projections_below_abort_gate": all_projections_below_gate,
        "source_cells": cells,
    }


def main() -> int:
    assert digest(JETS) == EXPECTED_JETS_SHA256
    assert digest(CLASSIFICATION) == EXPECTED_CLASSIFICATION_SHA256
    assert digest(ALPHA7_COMPLETE) == EXPECTED_ALPHA7_COMPLETE_SHA256
    assert digest(ALPHA7_AUDIT) == EXPECTED_ALPHA7_AUDIT_SHA256

    classification = json.loads(CLASSIFICATION.read_text(encoding="utf-8"))
    alpha7_complete = json.loads(ALPHA7_COMPLETE.read_text(encoding="utf-8"))
    alpha7_audit = json.loads(ALPHA7_AUDIT.read_text(encoding="utf-8"))
    alpha7_s13 = json.loads(ALPHA7_S13.read_text(encoding="utf-8"))
    assert classification["status"] == "PASS_EXACT_RANK8_EXCEPTIONAL_CONNECTED_TREE_JET_CLASSIFICATION"
    assert alpha7_complete["status"] == "PASS_EXACT_NO_GAP_RANK8_ALPHA7_SOURCES7_13_COMPLETE"
    assert alpha7_audit["status"] == "PASS_INDEPENDENT_NO_GAP_RANK8_ALPHA7_SOURCES7_13_ASSEMBLY_AUDIT"
    assert alpha7_s13["status"] == "PASS_EXACT_NO_GAP_RANK8_ALPHA7_SOURCE13_COMPLETE"

    with JETS.open(newline="", encoding="utf-8") as handle:
        rows = list(csv.DictReader(handle, delimiter="\t"))
    counts: dict[int, int] = {}
    for row in rows:
        counts[int(row["alpha"])] = counts.get(int(row["alpha"]), 0) + 1
    assert len(rows) == 1215
    assert counts == {1: 2, 2: 2, 3: 5, 4: 15, 5: 48, 6: 175, 7: 700, 8: 253, 9: 15}

    through_alpha7 = raw_coefficients({alpha: counts[alpha] for alpha in range(1, 8)})
    assert through_alpha7 == [1, 2, 5, 13, 39, 123, 431, 1625, 3609, 8937, 23147, 63379, 176560, 496731]
    through_alpha8 = raw_coefficients({alpha: counts[alpha] for alpha in range(1, 9)})
    assert through_alpha8 == [1, 2, 5, 13, 39, 123, 431, 1625, 3862, 9443, 24412, 66668, 186427, 527850]

    measured = {
        "artifact": ALPHA7_S13.name,
        "raw_multisets": 496_731,
        "lower_raw_states": 195_031,
        "peak_private_bytes": int(alpha7_s13["resources"]["maximum_audit_peak_private_bytes"]),
    }
    assert measured["peak_private_bytes"] == 254_820_352

    alpha8 = terminal_band(8, 948, 1200, 6, through_alpha7, measured)
    alpha9 = terminal_band(9, 1201, 1215, 5, through_alpha8, measured)
    assert alpha8["source_type_cells"] == 2024
    assert alpha8["raw_multisets_total"] == 201_807_980
    assert alpha9["source_type_cells"] == 135
    assert alpha9["raw_multisets_total"] == 12_319_815
    assert alpha8["source_cells"]["6"]["raw_multiset_crossing_count"] == 109_043
    assert alpha8["source_cells"]["13"]["raw_multiset_crossing_count"] == 129_625_056
    assert alpha9["source_cells"]["5"]["raw_multiset_crossing_count"] == 1_845
    assert alpha9["source_cells"]["13"]["raw_multiset_crossing_count"] == 7_922_430

    payload = {
        "schema": "rank8-exceptional-first-crossing-alpha8-alpha9-streaming-design-agent-v1",
        "status": "PASS_EXACT_NO_GAP_RESOURCE_DESIGN_REMAINING_2159_EXCEPTIONAL_FIRST_CROSSING_CELLS_NO_SIGN_RUN",
        "products_enumerated": 0,
        "scope": {
            "threshold_alpha": THRESHOLD,
            "terminal_alpha_range": [8, 9],
            "terminal_type_indices": [948, 1215],
            "source_type_cells": 2159,
            "warning": "Count, shard, and resource design only; no new Q8 sign is certified here.",
        },
        "exact_reduction": {
            "reason": "source alpha is at most 13, so after deleting the canonical terminal copy there is at most one additional component of terminal alpha 8 or 9",
            "fiber_formula": "c_s + L*c_(s-a), where a is terminal alpha, L is the inclusive terminal-type prefix length, and c is the lower-type raw multiset coefficient",
            "through_alpha7_raw_coefficients_alpha0_13": through_alpha7,
            "through_alpha8_raw_coefficients_alpha0_13": through_alpha8,
        },
        "bands": {"8": alpha8, "9": alpha9},
        "aggregate": {
            "remaining_source_type_cells": alpha8["source_type_cells"] + alpha9["source_type_cells"],
            "raw_multisets_total": alpha8["raw_multisets_total"] + alpha9["raw_multisets_total"],
            "shard_count": alpha8["shard_count"] + alpha9["shard_count"],
            "maximum_single_type_raw_count": max(alpha8["maximum_single_type_raw_count"], alpha9["maximum_single_type_raw_count"]),
            "maximum_projected_peak_private_bytes": max(alpha8["maximum_projected_peak_private_bytes"], alpha9["maximum_projected_peak_private_bytes"]),
            "all_design_projections_below_abort_gate": alpha8["all_design_projections_below_abort_gate"] and alpha9["all_design_projections_below_abort_gate"],
        },
        "resource_design": {
            "workers": 1,
            "fresh_process_per_shard_and_audit": True,
            "raw_target_per_shard": RAW_TARGET,
            "operating_abort_limit_private_bytes": ABORT_LIMIT,
            "hard_limit_private_bytes": HARD_LIMIT,
            "projection_is_a_gate_not_a_measurement": True,
            "measured_basis": measured,
            "projection_formula": "32MiB + 1.25*(raw/measured_raw)*(measured_peak-32MiB) + 256 bytes for each additional lower raw state",
            "pilot": {
                "terminal_alpha": 8,
                "source_alpha": 6,
                "terminal_type_indices": [948, 1200],
                "raw_multisets": 109_043,
                "special_abort_limit_private_bytes": 192 * 1024**2,
                "special_hard_limit_private_bytes": 256 * 1024**2,
            },
            "fail_closed_gates": [
                "abort before the operating private-memory limit",
                "preserve any nonpositive exact Q8 witness",
                "assemble only consecutive designed type unions with no gaps or overlaps",
                "require independent bidirectional SQLite key and product equality",
            ],
        },
        "proof_boundary": "Terminal alpha1..7 is sealed by prior packages. This design does not prove any terminal-alpha8/9 sign, full/full cone, connected Q8, forest Q8, rank8 PGC, or Problem 993.",
        "hashes": {
            JETS.name: digest(JETS),
            CLASSIFICATION.name: digest(CLASSIFICATION),
            ALPHA7_COMPLETE.name: digest(ALPHA7_COMPLETE),
            ALPHA7_AUDIT.name: digest(ALPHA7_AUDIT),
            ALPHA7_S13.name: digest(ALPHA7_S13),
            Path(__file__).name: digest(Path(__file__)),
        },
    }
    OUTPUT.write_text(json.dumps(payload, indent=2, sort_keys=True) + "\n", encoding="utf-8")
    print(payload["status"])
    print(
        f"cells={payload['aggregate']['remaining_source_type_cells']} "
        f"raw={payload['aggregate']['raw_multisets_total']} "
        f"shards={payload['aggregate']['shard_count']} "
        f"max_fiber={payload['aggregate']['maximum_single_type_raw_count']} "
        f"max_projected_MiB={payload['aggregate']['maximum_projected_peak_private_bytes']/1024**2:.6f}"
    )
    print(f"design_sha256={digest(OUTPUT)}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
