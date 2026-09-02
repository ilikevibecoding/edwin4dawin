#!/usr/bin/env python3
"""Independent structural, aggregate, mask, and sample-cell suffix-4 audit."""

from __future__ import annotations

import ast
import hashlib
import json
import subprocess
import sys
from pathlib import Path


ROOT = Path(__file__).resolve().parent
REPORT = ROOT / "rank8_low_low_full_early_suffix4_a4_b4_cells_exact_20260821.json"
PROBE = ROOT / "probe_rank8_low_low_full_early_suffix4_a4_b4_cell_flint.py"
EARLY = ROOT / "rank8_low_low_full_early_core_amgm_exact_20260821.json"
OUTPUT = ROOT / "rank8_low_low_full_early_suffix4_audit_20260822.json"
EXPECTED_REPORT = "7FE98FC820FFBEC01289AFDB7AE86913528D5C4E2DD90F3DEDD4B9F72803CA7E"
EXPECTED_PROBE = "D116602901A39024D304148BD1474CCF702FB325AC7BC2E9BDE1BD37515EE986"
EXPECTED_EARLY = "B563CA6C6A7B18254CA17AA5B92DB67EA899BA4F3B2FA5D172301A8A0CD2ED96"
AUXILIARIES = (
    "curvature_middle_times_4", "curvature_far",
    "strong_middle_times_4", "strong_far",
)
EXPECTED_MASKS = {
    "curvature_middle_times_4": {"left": 0, "right": 0},
    "curvature_far": {"left": 0, "right": 2251799813685247},
    "strong_middle_times_4": {
        "left": 298099384231146354114559, "right": 0,
    },
    "strong_far": {
        "left": 1404948308470744076022487503366212348792799231,
        "right": 2776704280227723509977738105707381762293760,
    },
}
SAMPLES = ((11, 0), (0, 10), (8, 8), (5, 9), (11, 10))


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def atomic_json(path: Path, payload) -> None:
    temporary = path.with_suffix(path.suffix + ".tmp")
    temporary.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    temporary.replace(path)


def key(row):
    return row["a4_exponent"], row["b4_exponent"]


def fresh_cell(a4: int, b4: int):
    result = subprocess.run(
        [sys.executable, str(PROBE), "--a4", str(a4), "--b4", str(b4)],
        cwd=ROOT, text=True, capture_output=True, check=False, timeout=120,
    )
    assert result.returncode == 0 and not result.stderr
    lines = [line for line in result.stdout.splitlines() if line.strip()]
    assert len(lines) == 1
    row = ast.literal_eval(lines[0])
    assert row["pass"] and key(row) == (a4, b4)
    return row


def main() -> None:
    assert sha256(REPORT) == EXPECTED_REPORT
    assert sha256(PROBE) == EXPECTED_PROBE
    assert sha256(EARLY) == EXPECTED_EARLY
    report = json.loads(REPORT.read_text(encoding="utf-8"))
    early = json.loads(EARLY.read_text(encoding="utf-8"))
    assert report["status"] == "PASS_EXACT_RANK8_LOW_LOW_FULL_EARLY_SUFFIX4_CELLS"
    assert report["degree_support_justification"]
    assert report["ordered_cells"] == 132
    assert report["immutable_inputs"] == {
        PROBE.name: EXPECTED_PROBE,
        EARLY.name: EXPECTED_EARLY,
    }

    rows = report["rows"]
    expected_keys = [(a4, b4) for a4 in range(12) for b4 in range(11)]
    assert len(rows) == 132 and sorted(map(key, rows)) == expected_keys
    by_key = {key(row): row for row in rows}
    origin = by_key[(0, 0)]
    assert origin["origin_reference"] == {
        "report": EARLY.name,
        "sha256": EXPECTED_EARLY,
        "status": "PASS_EXACT_RANK8_LOW_LOW_FULL_EARLY_CORE_AMGM",
        "statistics_excluded_from_lifted_cell_aggregates": True,
    }
    assert early["status"] == origin["origin_reference"]["status"]
    assert {row["bernstein_target"] for row in early["rows"]} == set(AUXILIARIES)

    for cell_key, row in by_key.items():
        assert row["pass"] and set(row["rows"]) == set(AUXILIARIES)
        for auxiliary in AUXILIARIES:
            statistics = row["rows"][auxiliary]
            assert statistics["negative"] == 0 and statistics["first_negative"] is None
            if cell_key == (0, 0):
                assert statistics["reference_only"] and statistics["terms"] == 0
            elif statistics["terms"]:
                assert statistics["minimum"] > 0
                assert statistics["maximum"] >= statistics["minimum"]
            else:
                assert statistics["minimum"] is None and statistics["maximum"] is None

    recomputed = {}
    for auxiliary in AUXILIARIES:
        nonempty = [
            row["rows"][auxiliary] for cell_key, row in by_key.items()
            if cell_key != (0, 0) and row["rows"][auxiliary]["terms"]
        ]
        recomputed[auxiliary] = {
            "terms": sum(item["terms"] for item in nonempty),
            "negative": 0,
            "minimum": min(item["minimum"] for item in nonempty),
            "maximum": max(item["maximum"] for item in nonempty),
        }
    assert recomputed == report["aggregates"]

    reported_masks = {
        label: {side: int(value) for side, value in sides.items()}
        for label, sides in report["payment_masks"].items()
    }
    assert reported_masks == EXPECTED_MASKS
    allocation_counts = {
        row["bernstein_target"]: len(row["allocations"])
        for row in early["rows"]
    }
    mask_checks = {}
    for label, sides in EXPECTED_MASKS.items():
        count = allocation_counts[label]
        mask_checks[label] = {}
        for side, mask in sides.items():
            assert mask >= 0 and mask.bit_length() <= count
            mask_checks[label][side] = {
                "allocation_count": count,
                "selected_count": mask.bit_count(),
                "highest_selected_index": mask.bit_length() - 1 if mask else None,
            }

    sample_checks = []
    for sample in SAMPLES:
        fresh = fresh_cell(*sample)
        stored = by_key[sample]
        assert fresh["rows"] == stored["rows"]
        sample_checks.append({
            "cell": list(sample),
            "terms": {label: fresh["rows"][label]["terms"] for label in AUXILIARIES},
            "pass": True,
        })

    payload = {
        "schema": "rank8-low-low-full-early-suffix4-audit-v1",
        "status": "PASS_INDEPENDENT_STRUCTURAL_MASK_SAMPLE_AUDIT_SUFFIX4",
        "audited_report_sha256": EXPECTED_REPORT,
        "grid_cells": len(rows),
        "non_origin_exact_coefficients": sum(item["terms"] for item in recomputed.values()),
        "aggregates": recomputed,
        "mask_checks": mask_checks,
        "fresh_sample_checks": sample_checks,
        "scope": (
            "Independent hash, grid, row-invariant, aggregate, mask-bound, "
            "origin-reference, and five-cell recomputation audit. This is "
            "not a second full recomputation of every lifted coefficient."
        ),
        "source_sha256": sha256(Path(__file__)),
    }
    atomic_json(OUTPUT, payload)
    print(payload["status"])
    print("SOURCE", payload["source_sha256"])
    print("REPORT", sha256(OUTPUT))


if __name__ == "__main__":
    main()
