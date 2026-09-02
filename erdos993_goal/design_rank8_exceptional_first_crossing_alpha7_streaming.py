#!/usr/bin/env python3
"""Exact no-census shard/resource design for terminal-alpha-seven crossing."""

from __future__ import annotations

import hashlib
import json
import math
from pathlib import Path


ROOT = Path(__file__).resolve().parent
JETS = ROOT / "rank8_exceptional_tree_jets_exact_20260820.tsv"
CLASSIFICATION = ROOT / "rank8_exceptional_tree_jets_exact_20260820.json"
MEASURED_AUDIT = ROOT / "rank8_exceptional_first_crossing_alpha6_s13_types84_93_audit_exact_20260820.json"
MEASURED_REPORT = ROOT / "rank8_exceptional_first_crossing_alpha6_s13_types84_93_exact_20260820.json"
OUTPUT = ROOT / "rank8_exceptional_first_crossing_alpha7_streaming_design_exact_20260820.json"

TYPE_COUNTS = {1: 2, 2: 2, 3: 5, 4: 15, 5: 48, 6: 175}
TERMINAL_ALPHA = 7
TERMINAL_TYPES = 700
TYPE_START = 248
TYPE_STOP = 947
THRESHOLD = 14
RAW_TARGET = 550_000
BASELINE = 32 * 1024**2
BYTES_PER_LOWER_RAW_STATE_ALLOWANCE = 256
SAFETY_NUMERATOR = 2
SAFETY_DENOMINATOR = 1
ABORT_LIMIT = 448 * 1024**2
HARD_LIMIT = 512 * 1024**2


def digest(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def ceil_ratio(numerator: int, denominator: int) -> int:
    return (numerator + denominator - 1) // denominator


def lower_coefficients() -> list[int]:
    coefficients = [0] * THRESHOLD
    coefficients[0] = 1
    for weight, count in TYPE_COUNTS.items():
        for _ in range(count):
            for alpha in range(weight, THRESHOLD):
                coefficients[alpha] += coefficients[alpha - weight]
    return coefficients


def full_coefficients(lower: list[int]) -> list[int]:
    coefficients = lower[:]
    for _ in range(TERMINAL_TYPES):
        for alpha in range(TERMINAL_ALPHA, THRESHOLD):
            coefficients[alpha] += coefficients[alpha - TERMINAL_ALPHA]
    return coefficients


def greedy_shards(per_type: list[int]) -> list[dict]:
    shards = []
    start = 1
    running = 0
    for relative, count in enumerate(per_type, 1):
        assert count <= RAW_TARGET
        if running and running + count > RAW_TARGET:
            shards.append((start, relative - 1, running))
            start = relative
            running = 0
        running += count
    if running:
        shards.append((start, len(per_type), running))
    return [
        {
            "largest_relative_type_start": start,
            "largest_relative_type_stop": stop,
            "terminal_type_index_start": TYPE_START + start - 1,
            "terminal_type_index_stop": TYPE_START + stop - 1,
            "raw_multiset_count": raw,
        }
        for start, stop, raw in shards
    ]


def main() -> int:
    classification = json.loads(CLASSIFICATION.read_text(encoding="utf-8"))
    measured_audit = json.loads(MEASURED_AUDIT.read_text(encoding="utf-8"))
    measured_report = json.loads(MEASURED_REPORT.read_text(encoding="utf-8"))
    assert classification["status"] == "PASS_EXACT_RANK8_EXCEPTIONAL_CONNECTED_TREE_JET_CLASSIFICATION"
    assert [classification["distinct_by_alpha"][str(alpha)] for alpha in range(1, 8)] == [2, 2, 5, 15, 48, 175, 700]
    assert classification["hashes"][JETS.name] == digest(JETS)
    assert measured_audit["status"].startswith("PASS_INDEPENDENT_BIDIRECTIONAL")
    assert measured_report["status"].startswith("PASS_EXACT_RESOURCE_GATED")

    lower = lower_coefficients()
    assert lower == [1, 2, 5, 13, 39, 123, 431, 925, 2209, 5437, 14047, 36079, 90460, 195031]
    full = full_coefficients(lower)
    assert full == [1, 2, 5, 13, 39, 123, 431, 1625, 3609, 8937, 23147, 63379, 176560, 496731]

    measured_raw = int(measured_audit["shard"]["independently_enumerated_multisets"])
    measured_peak = int(measured_audit["resources"]["peak_private_bytes"])
    assert measured_raw == 733905
    assert measured_peak == 176312320
    measured_dynamic = measured_peak - BASELINE
    assert measured_dynamic > 0

    cells = {}
    raw_total = 0
    shard_total = 0
    maximum_raw = 0
    maximum_projection = 0
    for source in range(7, 14):
        per_type = [lower[source] + relative * lower[source - TERMINAL_ALPHA] for relative in range(1, TERMINAL_TYPES + 1)]
        shards = greedy_shards(per_type)
        expected_next = TYPE_START
        for shard in shards:
            assert shard["terminal_type_index_start"] == expected_next
            expected_next = shard["terminal_type_index_stop"] + 1
            raw = int(shard["raw_multiset_count"])
            projected = (
                BASELINE
                + ceil_ratio(raw * measured_dynamic * SAFETY_NUMERATOR, measured_raw * SAFETY_DENOMINATOR)
                + lower[source] * BYTES_PER_LOWER_RAW_STATE_ALLOWANCE
            )
            shard["projected_peak_private_bytes"] = projected
            shard["projected_peak_private_MiB"] = projected / 1024**2
            assert projected < ABORT_LIMIT
            maximum_raw = max(maximum_raw, raw)
            maximum_projection = max(maximum_projection, projected)
        assert expected_next == TYPE_STOP + 1
        raw = sum(per_type)
        assert raw == TERMINAL_TYPES * lower[source] + (TERMINAL_TYPES * (TERMINAL_TYPES + 1) // 2) * lower[source - TERMINAL_ALPHA]
        cells[str(source)] = {
            "source_alpha": source,
            "terminal_alpha": TERMINAL_ALPHA,
            "total_alpha": source + TERMINAL_ALPHA,
            "per_relative_terminal_formula": f"{lower[source]} + L*{lower[source - TERMINAL_ALPHA]}",
            "lower_source_raw_count": lower[source],
            "lower_base_raw_count": lower[source - TERMINAL_ALPHA],
            "raw_multiset_crossing_count": raw,
            "maximum_single_type_raw_count": max(per_type),
            "shard_count": len(shards),
            "shards": shards,
        }
        raw_total += raw
        shard_total += len(shards)

    expected = {
        "7": 892850,
        "8": 2037000,
        "9": 5032650,
        "10": 13022450,
        "11": 34823950,
        "12": 93500050,
        "13": 242267550,
    }
    assert {source: cell["raw_multiset_crossing_count"] for source, cell in cells.items()} == expected

    payload = {
        "schema": "rank8-exceptional-first-crossing-alpha7-streaming-design-v1",
        "status": "PASS_EXACT_NO_GAP_RESOURCE_DESIGN_RANK8_EXCEPTIONAL_FIRST_CROSSING_ALPHA7_NO_SIGN_RUN",
        "products_enumerated": 0,
        "scope": {
            "terminal_alpha": TERMINAL_ALPHA,
            "terminal_type_indices": [TYPE_START, TYPE_STOP],
            "terminal_type_count": TERMINAL_TYPES,
            "source_alpha_range": [7, 13],
            "source_cell_count": 7,
            "warning": "Design and resource envelope only; it is not a sign certificate.",
        },
        "exact_counts": {
            "lower_component_type_counts_by_alpha": {str(k): v for k, v in TYPE_COUNTS.items()},
            "lower_raw_multiset_coefficients_alpha0_13": {str(alpha): value for alpha, value in enumerate(lower)},
            "through_alpha7_raw_state_upper_bounds_alpha0_13": {str(alpha): value for alpha, value in enumerate(full)},
            "through_alpha7_raw_state_upper_bound_total": sum(full),
            "source_cells": cells,
            "raw_crossings_total": raw_total,
            "audit_shards_total": shard_total,
        },
        "resource_design": {
            "workers": 1,
            "fresh_process_per_shard_and_mode": True,
            "raw_target_per_shard": RAW_TARGET,
            "maximum_shard_raw_multisets": maximum_raw,
            "maximum_projected_peak_private_bytes": maximum_projection,
            "maximum_projected_peak_private_MiB": maximum_projection / 1024**2,
            "operating_abort_limit_private_bytes": ABORT_LIMIT,
            "hard_limit_private_bytes": HARD_LIMIT,
            "measured_basis": {
                "audit_report": MEASURED_AUDIT.name,
                "raw_multisets": measured_raw,
                "peak_private_bytes": measured_peak,
                "baseline_private_bytes": BASELINE,
                "dynamic_memory_safety_factor": 2,
                "additional_bytes_per_lower_raw_state": BYTES_PER_LOWER_RAW_STATE_ALLOWANCE,
            },
            "rejected_enclosures": [
                {
                    "raw_target": 400000,
                    "classification": "infeasible type-block enclosure, not a sign or forest obstruction",
                    "exact_reason": "source13 terminal type947 alone has 496731 raw multisets",
                }
            ],
            "producer_method": "For one source/type block, build canonical lower-type source products at alpha s and s-7; adjoin the allowed alpha7 prefix, stream canonical source/product/Q8 rows to one SQLite database, then close the process.",
            "independent_audit_method": "Enumerate lower-type exponent multisets independently, adjoin zero or one prefix alpha7 source component, rebuild key/product tables with multiplicities, compare both SQLite EXCEPT directions, then delete the temporary audit database.",
            "fail_closed_gates": [
                "abort at 448 MiB actual or projected private memory",
                "never exceed the 512 MiB hard cap",
                "preserve the first resource checkpoint or nonpositive-Q8 witness",
                "assemble a source only if all designed consecutive shards occur exactly once and both EXCEPT directions are empty",
            ],
        },
        "pilot": {
            "source_alpha": 7,
            "representative_shard": cells["7"]["shards"][0],
            "continuation_gate": "Continue only the remaining source7 shard if the pilot and independent audit pass comfortably and every designed source7 shard projects below448 MiB.",
        },
        "scope_warning": "No terminal-alpha7 product/sign run, full/full cone, connected Delta0..3 case, master edit, order26 job, or e2 job is included.",
        "hashes": {
            JETS.name: digest(JETS),
            CLASSIFICATION.name: digest(CLASSIFICATION),
            MEASURED_AUDIT.name: digest(MEASURED_AUDIT),
            MEASURED_REPORT.name: digest(MEASURED_REPORT),
            Path(__file__).name: digest(Path(__file__)),
        },
    }
    OUTPUT.write_text(json.dumps(payload, indent=2, sort_keys=True) + "\n", encoding="utf-8")
    print(payload["status"])
    print(f"raw_total={raw_total} shards={shard_total} max_raw={maximum_raw} max_projected_MiB={maximum_projection/1024**2:.6f}")
    print(f"source7_shards={[(s['terminal_type_index_start'],s['terminal_type_index_stop'],s['raw_multiset_count']) for s in cells['7']['shards']]}")
    print(f"design_sha256={digest(OUTPUT)}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
