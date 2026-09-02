#!/usr/bin/env python3
"""Independent lightweight audit of the complete alpha5 assembly."""

from __future__ import annotations

import hashlib
import json
import sqlite3
from pathlib import Path


ROOT = Path(__file__).resolve().parent
ASSEMBLER = ROOT / "assemble_rank8_exceptional_first_crossing_alpha5.py"
ASSEMBLY = ROOT / "rank8_exceptional_first_crossing_alpha5_complete_assembly_exact_20260820.json"
PILOT_REPORT = ROOT / "rank8_exceptional_first_crossing_alpha5_s9_exact_20260820.json"
PILOT_DATABASE = ROOT / "rank8_exceptional_first_crossing_alpha5_s9_keys_exact_20260820.sqlite3"
PILOT_AUDIT = ROOT / "rank8_exceptional_first_crossing_alpha5_s9_audit_exact_20260820.json"
REST_REPORT = ROOT / "rank8_exceptional_first_crossing_alpha5_s10_13_exact_20260820.json"
REST_DATABASE = ROOT / "rank8_exceptional_first_crossing_alpha5_s10_13_keys_exact_20260820.sqlite3"
REST_AUDIT = ROOT / "rank8_exceptional_first_crossing_alpha5_s10_13_audit_exact_20260820.json"
OUTPUT = ROOT / "rank8_exceptional_first_crossing_alpha5_complete_assembly_audit_exact_20260820.json"


def digest(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def load(path: Path):
    return json.loads(path.read_text(encoding="utf-8"))


def counts(path: Path):
    connection = sqlite3.connect(f"file:{path.as_posix()}?mode=ro", uri=True)
    try:
        return {
            str(source): {
                "keys": connection.execute(
                    "SELECT COUNT(*) FROM keys WHERE source_alpha=?", (source,)
                ).fetchone()[0],
                "products": connection.execute(
                    "SELECT COUNT(*) FROM products WHERE source_alpha=?", (source,)
                ).fetchone()[0],
            }
            for source in [row[0] for row in connection.execute(
                "SELECT DISTINCT source_alpha FROM keys ORDER BY source_alpha"
            )]
        }
    finally:
        connection.close()


def main() -> int:
    assembly = load(ASSEMBLY)
    pilot = load(PILOT_REPORT)
    pilot_audit = load(PILOT_AUDIT)
    rest = load(REST_REPORT)
    rest_audit = load(REST_AUDIT)
    assert (
        assembly["status"]
        == "PASS_EXACT_NO_GAP_RANK8_EXCEPTIONAL_FIRST_CROSSING_ALPHA5_COMPLETE"
    )
    assert assembly["coverage"] == {
        "terminal_alpha": 5,
        "source_alpha_range": [9, 13],
        "crossing_total_range": [14, 18],
        "terminal_component_type_indices": [25, 72],
        "source_partition": {
            "pilot_database": [9, 9],
            "remaining_database": [10, 13],
        },
        "why_no_gap": assembly["coverage"]["why_no_gap"],
    }
    assert set(assembly["cells"]) == {str(source) for source in range(9, 14)}
    assert [assembly["cells"][str(source)]["total_alpha"] for source in range(9, 14)] == [
        14,
        15,
        16,
        17,
        18,
    ]
    assert assembly["hashes"] == {
        PILOT_REPORT.name: digest(PILOT_REPORT),
        PILOT_DATABASE.name: digest(PILOT_DATABASE),
        PILOT_AUDIT.name: digest(PILOT_AUDIT),
        REST_REPORT.name: digest(REST_REPORT),
        REST_DATABASE.name: digest(REST_DATABASE),
        REST_AUDIT.name: digest(REST_AUDIT),
        ASSEMBLER.name: digest(ASSEMBLER),
    }
    database_counts = {**counts(PILOT_DATABASE), **counts(REST_DATABASE)}
    assert set(database_counts) == {str(source) for source in range(9, 14)}
    for source in range(9, 14):
        cell = assembly["cells"][str(source)]
        assert database_counts[str(source)]["keys"] == cell["canonical_check_keys"]
        assert database_counts[str(source)]["products"] == cell["distinct_crossing_jets"]
        assert cell["negative_Q8"] == cell["zero_Q8"] == 0
        assert cell["minimum_Q8"] > 0

    recomputed = {
        "independently_enumerated_multisets": sum(
            int(cell["independently_enumerated_multisets"])
            for cell in assembly["cells"].values()
        ),
        "canonical_check_keys": sum(
            int(cell["canonical_check_keys"]) for cell in assembly["cells"].values()
        ),
        "distinct_cell_crossing_jets_sum": sum(
            int(cell["distinct_crossing_jets"]) for cell in assembly["cells"].values()
        ),
        "multiset_to_canonical_key_collisions": sum(
            int(cell["multiset_to_canonical_key_collisions"])
            for cell in assembly["cells"].values()
        ),
        "canonical_key_to_product_collisions": sum(
            int(cell["canonical_key_to_product_collisions"])
            for cell in assembly["cells"].values()
        ),
        "negative_Q8": 0,
        "zero_Q8": 0,
        "minimum_Q8": min(
            int(cell["minimum_Q8"]) for cell in assembly["cells"].values()
        ),
        "maximum_Q8": max(
            int(cell["maximum_Q8"]) for cell in assembly["cells"].values()
        ),
    }
    assert recomputed == assembly["aggregate"] == {
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
    assert pilot["partial_state_counts_by_alpha_after_type72"] == rest[
        "partial_state_counts_by_alpha_after_type72"
    ] == assembly["partial_state_counts_by_alpha_after_type72"]
    for key, value in pilot_audit["cell"].items():
        assert assembly["cells"]["9"][key] == value
    for source in range(10, 14):
        for key, value in rest_audit["cells"][str(source)].items():
            assert assembly["cells"][str(source)][key] == value
    assert assembly["resources"]["maximum_recurrence_peak_private_bytes"] < 480 * 1024**2
    assert assembly["resources"]["maximum_audit_peak_private_bytes"] < 480 * 1024**2
    assert assembly["resources"]["maximum_projected_private_bytes"] < 480 * 1024**2

    payload = {
        "schema": "rank8-exceptional-first-crossing-alpha5-complete-assembly-audit-v1",
        "status": "PASS_INDEPENDENT_EXACT_NO_GAP_RANK8_EXCEPTIONAL_FIRST_CROSSING_ALPHA5_ASSEMBLY_AUDIT",
        "coverage": {
            "source_alphas": list(range(9, 14)),
            "crossing_totals": list(range(14, 19)),
            "missing_sources": [],
            "duplicate_source_partitions": [],
        },
        "aggregate": recomputed,
        "database_counts": database_counts,
        "scope_warning": (
            "This audits complete terminal alpha5 only; terminal alpha6 through9 "
            "and the other forest-lift dependencies remain."
        ),
        "hashes": {
            ASSEMBLY.name: digest(ASSEMBLY),
            ASSEMBLER.name: digest(ASSEMBLER),
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
    print(f"audit_sha256={digest(OUTPUT)}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
