#!/usr/bin/env python3
"""Fail-closed assembly of the interrupted 112-shard endpoint replay.

The forced replay recomputed 111 shards byte-for-byte before the final shard
ran out of memory while materializing ``list(source.terms())`` only to count
terms.  A pinned constant-memory replay recomputes that final shard with the
equivalent ``len(source)`` and must reproduce the frozen canonical report
byte-for-byte.  This assembler verifies the complete resumed replay without
silently treating the original matrix reports as replay evidence.
"""

from __future__ import annotations

from datetime import datetime, timezone
import hashlib
import json
from pathlib import Path


HERE = Path(__file__).resolve().parent
MATRIX = HERE / (
    "iso_n6_bundle_g2_nonadjacent_endpoint_ratio_floor_matrix_"
    "exact_root_20260831.json"
)
MATRIX_SHA256 = (
    "4BCEF15A1A52E027A32BBFC02875B1E7B5D755792C23F48A90F4C77000FAA1D7"
)
RUNNER = HERE / (
    "run_iso_n6_bundle_g2_nonadjacent_endpoint_ratio_floor_matrix_root.py"
)
RUNNER_SHA256 = (
    "6100495A6121AD172EBC6B4B9587BFCF31E7F2D9DD4E1854B20822DE19F7CCDC"
)
ORIGINAL_REPLAY = HERE / (
    "replay_iso_n6_bundle_g2_nonadjacent_endpoint_ratio_floor_matrix_root.py"
)
ORIGINAL_REPLAY_SHA256 = (
    "9D6EB6FFA197F93E8B57A09BF77275527234EED27540BC215EF2729F18DA7FDA"
)
MEMORY_SAFE_REPLAY = HERE / (
    "replay_iso_n6_bundle_g2_nonadjacent_endpoint_final_shard_memory_safe_root.py"
)
MEMORY_SAFE_REPLAY_SHA256 = (
    "4337E9B67EE2BD46590E6E5960E5E4F68E36B904BB9CA031BA069218029898D6"
)
MEMORY_SAFE_REPORT = HERE / (
    "iso_n6_bundle_g2_nonadjacent_endpoint_ratio_floor_wedge_"
    "common0_high_far_B_ge_C_B1_C1_D21_N19_"
    "memory_safe_replay_root_20260831.json"
)
FAILED_CASE = (
    "common0",
    "high_far",
    "B_ge_C",
    1,
    1,
    1,
)
FAILED_CANONICAL_SHA256 = (
    "1D7ABA824B5B529A18D3D15B70BAB563CBA4DF7D0A582A2FFA257F99E3C998CA"
)
# The original forced replay began immediately after the matrix report was
# frozen at 11:46:13 local (EDT).  The first replay start was 11:46:18 EDT.
ORIGINAL_REPLAY_STARTED_UTC = datetime(
    2026, 8, 31, 15, 46, 18, tzinfo=timezone.utc
)
OUTPUT = HERE / (
    "iso_n6_bundle_g2_nonadjacent_endpoint_ratio_floor_matrix_"
    "resumed_replay_exact_root_20260831.json"
)
MARKER = (
    "PASS_REPLAY_EXACT_ISO_N6_BUNDLE_G2_NONADJACENT_ENDPOINT_"
    "RATIO_FLOOR_MATRIX_RESUMED_ROOT"
)


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def load(path: Path) -> dict:
    return json.loads(path.read_text(encoding="utf-8"))


def case_from_row(row: dict) -> tuple[str, str, str, int, int, int]:
    return (
        row["geometry"],
        row["order_chart"],
        row["orientation"],
        row["B_mask"],
        row["C_mask"],
        row["D2_mask"],
    )


def main() -> None:
    pins = {
        MATRIX.name: MATRIX_SHA256,
        RUNNER.name: RUNNER_SHA256,
        ORIGINAL_REPLAY.name: ORIGINAL_REPLAY_SHA256,
        MEMORY_SAFE_REPLAY.name: MEMORY_SAFE_REPLAY_SHA256,
    }
    observed = {name: sha256(HERE / name) for name in pins}
    assert observed == pins, (observed, pins)

    matrix = load(MATRIX)
    assert matrix["marker"] == (
        "PASS_EXACT_ISO_N6_BUNDLE_G2_NONADJACENT_ENDPOINT_"
        "RATIO_FLOOR_MATRIX_ROOT"
    )
    assert matrix["runner_source_sha256"] == RUNNER_SHA256
    assert matrix["shards"] == len(matrix["rows"]) == 112
    assert matrix["negative"] == 0
    assert matrix["bernstein_coefficients"] == 2_091_621_840

    safe_hash = sha256(MEMORY_SAFE_REPORT)
    assert safe_hash == FAILED_CANONICAL_SHA256
    safe_raw = MEMORY_SAFE_REPORT.read_bytes()

    cutoff = ORIGINAL_REPLAY_STARTED_UTC.timestamp()
    rows = []
    original_replayed = 0
    memory_safe_replayed = 0
    seen_cases: set[tuple[str, str, str, int, int, int]] = set()
    for matrix_row in matrix["rows"]:
        case = case_from_row(matrix_row)
        assert case not in seen_cases
        seen_cases.add(case)
        canonical = HERE / matrix_row["report"]
        canonical_hash = sha256(canonical)
        assert canonical_hash == matrix_row["report_sha256"]
        canonical_report = load(canonical)
        assert canonical_report["negative_controls"] == 0
        assert canonical_report["endpoint_lower_certificate"]["negative"] == 0

        if case == FAILED_CASE:
            assert canonical_hash == FAILED_CANONICAL_SHA256
            assert safe_raw == canonical.read_bytes()
            replay_artifact = MEMORY_SAFE_REPORT
            replay_hash = safe_hash
            replay_route = "memory-safe exact final-shard replay"
            memory_safe_replayed += 1
        else:
            # A matching hash alone is not enough here: the modification time
            # proves this canonical report was rewritten during the forced
            # replay attempt rather than merely inherited from the matrix run.
            assert canonical.stat().st_mtime >= cutoff, (
                canonical.name,
                canonical.stat().st_mtime,
                cutoff,
            )
            replay_artifact = canonical
            replay_hash = canonical_hash
            replay_route = "original forced replay before interruption"
            original_replayed += 1

        assert replay_hash == matrix_row["report_sha256"]
        rows.append({
            "case": list(case),
            "canonical_report": canonical.name,
            "canonical_sha256": canonical_hash,
            "replay_artifact": replay_artifact.name,
            "replay_sha256": replay_hash,
            "replay_route": replay_route,
            "byte_identical": True,
            "negative_controls": canonical_report["negative_controls"],
            "minimum": canonical_report["endpoint_lower_certificate"]["minimum"],
        })

    assert len(seen_cases) == len(rows) == 112
    assert original_replayed == 111
    assert memory_safe_replayed == 1
    assert all(row["byte_identical"] for row in rows)
    assert all(row["negative_controls"] == 0 for row in rows)

    report = {
        "schema": (
            "iso-n6-bundle-g2-nonadjacent-endpoint-ratio-floor-"
            "matrix-resumed-replay-v1"
        ),
        "date": "2026-08-31",
        "marker": MARKER,
        "status": (
            "PASS exact resumed byte-identical replay of all 112 endpoint shards"
        ),
        "coverage": matrix["coverage"],
        "matrix_report": MATRIX.name,
        "matrix_report_sha256": MATRIX_SHA256,
        "original_replay_started_utc": (
            ORIGINAL_REPLAY_STARTED_UTC.isoformat().replace("+00:00", "Z")
        ),
        "interruption": {
            "failed_case": list(FAILED_CASE),
            "stage": (
                "term-count reporting via list(source.terms()), after the exact "
                "source polynomial was built and before coefficient calculation"
            ),
            "mathematical_disposition": (
                "implementation-memory interruption only; final shard was "
                "recomputed from the pinned producer using equivalent len(source)"
            ),
        },
        "shards": len(rows),
        "original_forced_replay_shards": original_replayed,
        "memory_safe_final_shard_replay_shards": memory_safe_replayed,
        "byte_identical_shards": sum(row["byte_identical"] for row in rows),
        "negative_controls": 0,
        "bernstein_coefficients": matrix["bernstein_coefficients"],
        "minimum": matrix["minimum"],
        "pins": pins,
        "rows": rows,
        "source": Path(__file__).name,
        "source_sha256": sha256(Path(__file__).resolve()),
        "scope_guard": (
            "This certifies only the resumed replay integrity of the 112-shard "
            "large-order endpoint matrix. The all-order endpoint theorem requires "
            "a separate finite/small/large logical assembly."
        ),
    }
    raw = json.dumps(report, indent=2, sort_keys=True) + "\n"
    OUTPUT.write_text(raw, encoding="utf-8", newline="\n")
    print(MARKER)
    print("SOURCE_SHA256", report["source_sha256"])
    print("REPORT_SHA256", sha256(OUTPUT))
    print("REPLAY_SHARDS", original_replayed, "+", memory_safe_replayed)


if __name__ == "__main__":
    main()
