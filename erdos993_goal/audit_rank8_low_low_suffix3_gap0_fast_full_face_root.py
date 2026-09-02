#!/usr/bin/env python3
"""Independent structural/arithmetic audit of the completed fast face scan."""

from __future__ import annotations

import hashlib
import json
from pathlib import Path


ROOT = Path(__file__).resolve().parent
REPORT = ROOT / "rank8_low_low_suffix3_gap0_fast_agent_full_face_exact_20260822.json"
CHECKPOINT = ROOT / "rank8_low_low_suffix3_gap0_fast_agent_full_face_checkpoint_20260822.json"
ORIGINAL_CHECKPOINT = ROOT / "rank8_low_low_suffix3_gap0_factored_full_face_checkpoint_20260822.json"
DRIVER = ROOT / "verify_rank8_low_low_suffix3_gap0_fast_agent_full_face.py"
SUFFIX = ROOT / "rank8_low_low_both_suffix3_a3_b3_cells_exact_20260821.json"
OUTPUT = ROOT / "rank8_low_low_suffix3_gap0_fast_full_face_root_audit_exact_20260822.json"

EXPECTED_FILES = {
    REPORT.name: "E63F12DCBFC9ACF7874A241A6DF48D7DD6CE4CE136F0AEF5413477F867F3EBFD",
    CHECKPOINT.name: "4A03549E04E11595D56C1251ED02C7517C86009019B2D7331C97D7A4C8F449DE",
    ORIGINAL_CHECKPOINT.name: "4C5D69FD26B64B4F55A7323418B4FF578EF65320F672E29D12DFCD45450DF59A",
    DRIVER.name: "862B012BA113FE452E4FC01BE0478D237A41416A0A9CC412B9849F6F702E5F76",
    SUFFIX.name: "0D3D1EA8951F355B33EE5EC0563FC06BF20BEE54652D8F50BF88E1130161452F",
}
EXPECTED_IMMUTABLE = {
    "probe_rank8_low_low_suffix3_gap0_factored_payment_outer_cell_fast_agent_v3.py":
        "72149062A17FF2A0FEB427BE2D15AD66E532387DDB138CB9E3C3C150615B8F89",
    "rank8_low_low_full_early_core_factored_amgm_exact_20260822.json":
        "36673C44864659E3DAB2CC99071DAE2C306830B8B672A8C7F3E41ED5A2AFCFF6",
    "rank8_low_low_suffix3_gap0_factored_suffix_face_identity_exact_20260822.json":
        "B851B069B42BE5646B5101CDE471D937C8A4D033E3A99DAB44BACAD50A380574",
    SUFFIX.name: EXPECTED_FILES[SUFFIX.name],
    "rank8_low_low_suffix3_gap0_factored_early_payment_cell_0_0_1_0_exact_20260822.json":
        "EB62BF83E26F4F5E93B166829652D5E9996FBA13BF29731A644399B74A94529E",
    "rank8_low_low_suffix3_gap0_fast_agent_symbolic_identity_audit_20260822.json":
        "B3388F03E9AE5A535E4A354D861364C17B31F4F92F7F0E31F27154261D47AA0E",
    "rank8_low_low_suffix3_gap0_fast_agent_stats_audit_20260822.json":
        "873F614E422095C78F7F3D314A4BBE235FB1464BA9AB7EEBC1E9B42642FDE752",
    "rank8_low_low_suffix3_gap0_fast_agent_equivalence_exact_20260822.json":
        "BE61D408243103741D40C466DC38DA6661BDC744CCDF8AA2DACE37E26B100601",
    "verify_rank8_low_low_suffix3_gap0_factored_full_face.py":
        "D69E82977383005D981A72A711FC998116B6A43C86A1EB3D5861A5D1D8F35D8A",
    "verify_rank8_low_low_suffix3_gap0_factored_full_face_parallel_root.py":
        "DA75F8278A5FF1BDA08BB05AF179CB94188C2E451219FECF2962C6437D21E003",
}
LABELS = (
    "curvature_middle_times_4", "curvature_far",
    "strong_middle_times_4", "strong_far",
)
SUFFIX_LABELS = {
    "curvature_middle_times_4": "curvature_middle",
    "curvature_far": "curvature_far",
    "strong_middle_times_4": "strong_middle",
    "strong_far": "strong_far",
}


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def atomic_json(path: Path, payload) -> None:
    temporary = path.with_suffix(path.suffix + ".tmp")
    temporary.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    temporary.replace(path)


def key(row):
    return (
        int(row["a3_exponent"]), int(row["b3_exponent"]),
        int(row["a0_exponent"]), int(row["b0_exponent"]),
    )


def certificate(row):
    return {
        "a3_exponent": row["a3_exponent"],
        "b3_exponent": row["b3_exponent"],
        "a0_exponent": row["a0_exponent"],
        "b0_exponent": row["b0_exponent"],
        "rows": row["rows"],
        "pass": row["pass"],
    }


def check_stats(stats):
    assert set(stats) == {
        "terms", "negative", "minimum", "maximum", "first_negative",
    }
    assert isinstance(stats["terms"], int) and stats["terms"] >= 0
    assert stats["negative"] == 0
    assert stats["first_negative"] is None
    if stats["terms"]:
        assert isinstance(stats["minimum"], int) and stats["minimum"] > 0
        assert isinstance(stats["maximum"], int)
        assert stats["maximum"] >= stats["minimum"]
    else:
        assert stats["minimum"] is None and stats["maximum"] is None


def aggregate(items):
    nonempty = [item for item in items if item["terms"]]
    return {
        "terms": sum(item["terms"] for item in items),
        "negative": sum(item["negative"] for item in items),
        "minimum": min(item["minimum"] for item in nonempty) if nonempty else None,
        "maximum": max(item["maximum"] for item in nonempty) if nonempty else None,
    }


def main():
    actual_files = {
        path.name: sha256(path)
        for path in (REPORT, CHECKPOINT, ORIGINAL_CHECKPOINT, DRIVER, SUFFIX)
    }
    assert actual_files == EXPECTED_FILES
    report = json.loads(REPORT.read_text(encoding="utf-8"))
    checkpoint = json.loads(CHECKPOINT.read_text(encoding="utf-8"))
    original = json.loads(ORIGINAL_CHECKPOINT.read_text(encoding="utf-8"))
    suffix = json.loads(SUFFIX.read_text(encoding="utf-8"))

    assert report["status"] == "PASS_EXACT_FAST_AGENT_SUFFIX3_GAP0_FULL_FACE"
    assert report["source_sha256"] == EXPECTED_FILES[DRIVER.name]
    assert report["immutable_inputs"] == EXPECTED_IMMUTABLE
    assert checkpoint["source_sha256"] == EXPECTED_FILES[DRIVER.name]
    assert checkpoint["immutable_inputs"] == EXPECTED_IMMUTABLE
    assert checkpoint["computed_cells"] == checkpoint["computed_cells_total"] == 558

    targets = {
        (a3, b3, a0, b0)
        for a0 in range(3) for a3 in range(10 - a0)
        for b0 in range(3) for b3 in range(9 - b0)
        if (a0, b0) != (0, 0)
    }
    assert len(targets) == 558
    report_rows = {key(row): row for row in report["rows"]}
    checkpoint_rows = {key(row): row for row in checkpoint["rows"]}
    assert len(report_rows) == len(checkpoint_rows) == 558
    assert set(report_rows) == set(checkpoint_rows) == targets
    for target in targets:
        assert report_rows[target] == checkpoint_rows[target]
        row = report_rows[target]
        assert row["pass"] is True and set(row["rows"]) == set(LABELS)
        for stats in row["rows"].values():
            check_stats(stats)

    imported = {tuple(map(int, item)) for item in checkpoint["imported_original_keys"]}
    fast = {tuple(map(int, item)) for item in checkpoint["fast_agent_keys"]}
    assert imported.isdisjoint(fast)
    assert imported | fast == targets
    assert len(imported) == report["imported_original_oracle_cells"] == 64
    assert len(fast) == report["fast_agent_cells"] == 494
    assert report["computed_positive_early_support_cells"] == 558
    assert report["inherited_suffix_cells"] == 90
    assert report["total_disjoint_outer_cells"] == 648

    original_rows = {key(row): row for row in original["rows"]}
    assert len(original_rows) == 64 and set(original_rows) == imported
    for target in imported:
        assert certificate(original_rows[target]) == certificate(report_rows[target])
    assert checkpoint["oracle_snapshots"][-1]["checkpoint_sha256"] \
        == EXPECTED_FILES[ORIGINAL_CHECKPOINT.name]
    assert checkpoint["oracle_snapshots"][-1]["rows_seen"] == 64
    assert report["oracle_snapshots"] == checkpoint["oracle_snapshots"]

    suffix_rows = {
        (int(row["a3_exponent"]), int(row["b3_exponent"])): row
        for row in suffix["rows"]
    }
    assert len(suffix_rows) == 90
    assert set(suffix_rows) == {(a3, b3) for a3 in range(10) for b3 in range(9)}
    all_stats = {label: [] for label in LABELS}
    for row in report_rows.values():
        for label in LABELS:
            all_stats[label].append(row["rows"][label])
    for row in suffix_rows.values():
        assert row["pass"] is True
        for label, old_label in SUFFIX_LABELS.items():
            stats = row["rows"][old_label]
            check_stats(stats)
            all_stats[label].append(stats)
    recomputed = {label: aggregate(items) for label, items in all_stats.items()}
    assert recomputed == report["global_aggregates"]
    total = sum(item["terms"] for item in recomputed.values())
    assert total == report["total_exact_coefficients"] == 558_344_822

    payload = {
        "schema": "rank8-low-low-suffix3-gap0-fast-full-face-root-audit-v1",
        "status": "PASS_INDEPENDENT_EXACT_FAST_SUFFIX3_GAP0_FULL_FACE_AUDIT",
        "complete_target_universe": len(targets),
        "imported_original_oracle_cells_exactly_replayed": len(imported),
        "fast_agent_cells": len(fast),
        "inherited_suffix_cells": len(suffix_rows),
        "total_disjoint_outer_cells": len(targets) + len(suffix_rows),
        "recomputed_global_aggregates": recomputed,
        "recomputed_total_exact_coefficients": total,
        "immutable_files": actual_files,
        "source_sha256": sha256(Path(__file__)),
    }
    atomic_json(OUTPUT, payload)
    print(payload["status"])
    print("TARGETS", payload["complete_target_universe"])
    print("TOTAL_EXACT_COEFFICIENTS", total)
    print("SOURCE", payload["source_sha256"])
    print("REPORT", sha256(OUTPUT))


if __name__ == "__main__":
    main()
