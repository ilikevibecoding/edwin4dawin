#!/usr/bin/env python3
"""Assemble the complete terminal-alpha-five first-crossing package."""

from __future__ import annotations

import hashlib
import json
import sqlite3
from pathlib import Path


ROOT = Path(__file__).resolve().parent
PILOT_REPORT = ROOT / "rank8_exceptional_first_crossing_alpha5_s9_exact_20260820.json"
PILOT_DATABASE = ROOT / "rank8_exceptional_first_crossing_alpha5_s9_keys_exact_20260820.sqlite3"
PILOT_AUDIT = ROOT / "rank8_exceptional_first_crossing_alpha5_s9_audit_exact_20260820.json"
REST_REPORT = ROOT / "rank8_exceptional_first_crossing_alpha5_s10_13_exact_20260820.json"
REST_DATABASE = ROOT / "rank8_exceptional_first_crossing_alpha5_s10_13_keys_exact_20260820.sqlite3"
REST_AUDIT = ROOT / "rank8_exceptional_first_crossing_alpha5_s10_13_audit_exact_20260820.json"
OUTPUT = ROOT / "rank8_exceptional_first_crossing_alpha5_complete_assembly_exact_20260820.json"
ABORT_LIMIT = 480 * 1024**2
HARD_LIMIT = 512 * 1024**2


def digest(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def load(path: Path) -> dict[str, object]:
    return json.loads(path.read_text(encoding="utf-8"))


def database_counts(path: Path) -> tuple[dict[str, int], dict[str, int]]:
    connection = sqlite3.connect(f"file:{path.as_posix()}?mode=ro", uri=True)
    try:
        keys = {
            str(source): count
            for source, count in connection.execute(
                "SELECT source_alpha,COUNT(*) FROM keys GROUP BY source_alpha ORDER BY source_alpha"
            )
        }
        products = {
            str(source): count
            for source, count in connection.execute(
                "SELECT source_alpha,COUNT(*) FROM products GROUP BY source_alpha ORDER BY source_alpha"
            )
        }
        assert connection.execute("SELECT COUNT(*) FROM meta").fetchone()[0] == 1
        return keys, products
    finally:
        connection.close()


def main() -> int:
    pilot = load(PILOT_REPORT)
    pilot_audit = load(PILOT_AUDIT)
    rest = load(REST_REPORT)
    rest_audit = load(REST_AUDIT)
    assert (
        pilot["status"]
        == "PASS_EXACT_RESOURCE_GATED_RANK8_EXCEPTIONAL_FIRST_CROSSING_ALPHA5_S9_PILOT"
    )
    assert (
        pilot_audit["status"]
        == "PASS_INDEPENDENT_BIDIRECTIONAL_RANK8_EXCEPTIONAL_FIRST_CROSSING_ALPHA5_S9_AUDIT"
    )
    assert (
        rest["status"]
        == "PASS_EXACT_RESOURCE_GATED_RANK8_EXCEPTIONAL_FIRST_CROSSING_ALPHA5_S10_13"
    )
    assert (
        rest_audit["status"]
        == "PASS_INDEPENDENT_BIDIRECTIONAL_RANK8_EXCEPTIONAL_FIRST_CROSSING_ALPHA5_S10_13_AUDIT"
    )
    assert pilot["hashes"][PILOT_DATABASE.name] == digest(PILOT_DATABASE)
    assert pilot_audit["hashes"][PILOT_REPORT.name] == digest(PILOT_REPORT)
    assert pilot_audit["hashes"][PILOT_DATABASE.name] == digest(PILOT_DATABASE)
    assert rest["hashes"][REST_DATABASE.name] == digest(REST_DATABASE)
    assert rest_audit["hashes"][REST_REPORT.name] == digest(REST_REPORT)
    assert rest_audit["hashes"][REST_DATABASE.name] == digest(REST_DATABASE)

    pilot_key_counts, pilot_product_counts = database_counts(PILOT_DATABASE)
    rest_key_counts, rest_product_counts = database_counts(REST_DATABASE)
    assert pilot_key_counts == {"9": pilot["cell"]["ordered_covering_checks"]}
    assert pilot_product_counts == {"9": pilot["cell"]["distinct_crossing_jets"]}
    assert set(rest_key_counts) == set(rest_product_counts) == {"10", "11", "12", "13"}
    for source in range(10, 14):
        assert rest_key_counts[str(source)] == rest["cells"][str(source)][
            "ordered_covering_checks"
        ]
        assert rest_product_counts[str(source)] == rest["cells"][str(source)][
            "distinct_crossing_jets"
        ]

    assert pilot["partial_state_counts_by_alpha_after_type72"] == rest[
        "partial_state_counts_by_alpha_after_type72"
    ]
    assert pilot["partial_states_total_after_type72"] == rest[
        "partial_states_total_after_type72"
    ] == 86180
    assert pilot["raw_multiset_state_upper_bound_by_alpha"] == rest[
        "raw_multiset_state_upper_bound_by_alpha"
    ]
    assert pilot["raw_multiset_state_upper_bound_total"] == rest[
        "raw_multiset_state_upper_bound_total"
    ] == 121152

    cells = {"9": {**pilot["cell"], **pilot_audit["cell"]}}
    for source in range(10, 14):
        recurrence_cell = rest["cells"][str(source)]
        audit_cell = rest_audit["cells"][str(source)]
        assert audit_cell["canonical_check_keys"] == recurrence_cell[
            "ordered_covering_checks"
        ]
        assert audit_cell["distinct_crossing_jets"] == recurrence_cell[
            "distinct_crossing_jets"
        ]
        assert audit_cell["negative_Q8"] == recurrence_cell["negative_Q8"] == 0
        assert audit_cell["zero_Q8"] == recurrence_cell["zero_Q8"] == 0
        cells[str(source)] = {**recurrence_cell, **audit_cell}

    assert set(cells) == {"9", "10", "11", "12", "13"}
    assert [cells[str(source)]["total_alpha"] for source in range(9, 14)] == [
        14,
        15,
        16,
        17,
        18,
    ]
    aggregate = {
        "independently_enumerated_multisets": sum(
            int(cell["independently_enumerated_multisets"]) for cell in cells.values()
        ),
        "canonical_check_keys": sum(
            int(cell["canonical_check_keys"]) for cell in cells.values()
        ),
        "distinct_cell_crossing_jets_sum": sum(
            int(cell["distinct_crossing_jets"]) for cell in cells.values()
        ),
        "multiset_to_canonical_key_collisions": sum(
            int(cell["multiset_to_canonical_key_collisions"]) for cell in cells.values()
        ),
        "canonical_key_to_product_collisions": sum(
            int(cell["canonical_key_to_product_collisions"]) for cell in cells.values()
        ),
        "negative_Q8": sum(int(cell["negative_Q8"]) for cell in cells.values()),
        "zero_Q8": sum(int(cell["zero_Q8"]) for cell in cells.values()),
        "minimum_Q8": min(int(cell["minimum_Q8"]) for cell in cells.values()),
        "maximum_Q8": max(int(cell["maximum_Q8"]) for cell in cells.values()),
    }
    assert aggregate == {
        "independently_enumerated_multisets": 3440952,
        "canonical_check_keys": 2548586,
        "distinct_cell_crossing_jets_sum": 1981028,
        "multiset_to_canonical_key_collisions": 892366,
        "canonical_key_to_product_collisions": 567558,
        "negative_Q8": 0,
        "zero_Q8": 0,
        "minimum_Q8": 9324000,
        "maximum_Q8": 105099639472256,
    }

    recurrence_resources = [pilot["resources"], rest["resources"]]
    audit_resources = [pilot_audit["resources"], rest_audit["resources"]]
    maximum_recurrence_peak = max(int(item["peak_private_bytes"]) for item in recurrence_resources)
    maximum_audit_peak = max(int(item["peak_private_bytes"]) for item in audit_resources)
    maximum_projection = max(
        int(item["maximum_projected_private_bytes"]) for item in recurrence_resources
    )
    assert maximum_recurrence_peak < ABORT_LIMIT
    assert maximum_audit_peak < ABORT_LIMIT
    assert maximum_projection < ABORT_LIMIT

    payload = {
        "schema": "rank8-exceptional-first-crossing-alpha5-complete-assembly-v1",
        "status": "PASS_EXACT_NO_GAP_RANK8_EXCEPTIONAL_FIRST_CROSSING_ALPHA5_COMPLETE",
        "theorem": (
            "Every exceptional-only first crossing whose unique largest sorted "
            "component type has alpha5 has literal Q8>0."
        ),
        "coverage": {
            "terminal_alpha": 5,
            "source_alpha_range": [9, 13],
            "crossing_total_range": [14, 18],
            "terminal_component_type_indices": [25, 72],
            "source_partition": {
                "pilot_database": [9, 9],
                "remaining_database": [10, 13],
            },
            "why_no_gap": (
                "At threshold14 a terminal-alpha5 first crossing has source alpha "
                "14-5=9 through13.  The two disjoint exact databases cover source9 "
                "and sources10..13, and every cell passed an independent bidirectional "
                "key/product-table equality audit."
            ),
        },
        "partial_state_counts_by_alpha_after_type72": pilot[
            "partial_state_counts_by_alpha_after_type72"
        ],
        "partial_states_total_after_type72": 86180,
        "raw_multiset_state_upper_bound_total": 121152,
        "cells": cells,
        "aggregate": aggregate,
        "resources": {
            "workers": 1,
            "abort_limit_private_bytes": ABORT_LIMIT,
            "hard_limit_private_bytes": HARD_LIMIT,
            "maximum_recurrence_peak_private_bytes": maximum_recurrence_peak,
            "maximum_recurrence_peak_private_MiB": maximum_recurrence_peak / 1024**2,
            "maximum_audit_peak_private_bytes": maximum_audit_peak,
            "maximum_audit_peak_private_MiB": maximum_audit_peak / 1024**2,
            "maximum_projected_private_bytes": maximum_projection,
            "maximum_projected_private_MiB": maximum_projection / 1024**2,
            "recurrence_elapsed_seconds_sum": sum(
                float(item["elapsed_seconds"]) for item in recurrence_resources
            ),
            "audit_elapsed_seconds_sum": sum(
                float(item["elapsed_seconds"]) for item in audit_resources
            ),
        },
        "scope_warning": (
            "This completes terminal alpha5 only. Terminal-alpha bands6 through9, "
            "full/full cones, connected Q8, and the other forest-lift inputs remain."
        ),
        "hashes": {
            PILOT_REPORT.name: digest(PILOT_REPORT),
            PILOT_DATABASE.name: digest(PILOT_DATABASE),
            PILOT_AUDIT.name: digest(PILOT_AUDIT),
            REST_REPORT.name: digest(REST_REPORT),
            REST_DATABASE.name: digest(REST_DATABASE),
            REST_AUDIT.name: digest(REST_AUDIT),
            Path(__file__).name: digest(Path(__file__)),
        },
    }
    OUTPUT.write_text(json.dumps(payload, indent=2, sort_keys=True) + "\n", encoding="utf-8")
    print(payload["status"])
    print(
        f"raw={aggregate['independently_enumerated_multisets']} "
        f"keys={aggregate['canonical_check_keys']} "
        f"products={aggregate['distinct_cell_crossing_jets_sum']} "
        f"negative=0 zero=0"
    )
    print(f"assembly_sha256={digest(OUTPUT)}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
