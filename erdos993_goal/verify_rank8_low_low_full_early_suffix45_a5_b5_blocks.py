#!/usr/bin/env python3
"""Fail-closed 182-block proof of the simultaneous suffix-4/suffix-5 lift."""

from __future__ import annotations

import ast
import hashlib
import json
import subprocess
import sys
import time
from pathlib import Path


ROOT = Path(__file__).resolve().parent
PROBE = ROOT / "probe_rank8_low_low_full_early_suffix45_a5_b5_block_flint.py"
SUFFIX4_REPORT = ROOT / "rank8_low_low_full_early_suffix4_a4_b4_cells_exact_20260821.json"
SUFFIX4_AUDIT = ROOT / "rank8_low_low_full_early_suffix4_audit_20260822.json"
SUFFIX5_REPORT = ROOT / "rank8_low_low_full_early_suffix5_a5_b5_cells_exact_20260821.json"
SUFFIX5_AUDIT = ROOT / "rank8_low_low_full_early_suffix5_audit_20260821.json"
CHECKPOINT = ROOT / "rank8_low_low_full_early_suffix45_a5_b5_blocks_checkpoint_20260822.json"
REPORT = ROOT / "rank8_low_low_full_early_suffix45_a5_b5_blocks_exact_20260822.json"
EXPECTED_PROBE = "BC9988E35FFC95E406C4CFF7D8347DF2AACAC398FA4B1A2BC5E4D13CB5AB5A23"
EXPECTED_SUFFIX4_REPORT = "7FE98FC820FFBEC01289AFDB7AE86913528D5C4E2DD90F3DEDD4B9F72803CA7E"
EXPECTED_SUFFIX4_AUDIT = "BA51DD8EDDA7A7D0D6425A6C795BA18C1542F350AB4F1376A7EA38419BA73F78"
EXPECTED_SUFFIX5_REPORT = "8993846F0A260DBEF8091D3617AF8EAAACED67AD274ADA8EA9C181B45D102F7F"
EXPECTED_SUFFIX5_AUDIT = "A4BCF6A78B23F84E7B07FAAED3C67C400111BC21F9B03D5C33ACEC92A7586AD4"
AUXILIARIES = (
    "curvature_middle_times_4", "curvature_far",
    "strong_middle_times_4", "strong_far",
)


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def atomic_json(path: Path, payload) -> None:
    temporary = path.with_suffix(path.suffix + ".tmp")
    temporary.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    temporary.replace(path)


def key(row):
    return row["a5_exponent"], row["b5_exponent"]


def ordered_blocks():
    blocks = [(a5, b5) for a5 in range(14) for b5 in range(13)]
    priority = [(1, 1), (1, 0), (0, 1), (13, 0), (0, 12), (13, 12)]
    rest = sorted(
        (block for block in blocks if block not in priority and block != (0, 0)),
        key=lambda block: (sum(block), block[0], block[1]),
    )
    return priority + rest + [(0, 0)]


def load_inputs():
    assert sha256(SUFFIX4_REPORT) == EXPECTED_SUFFIX4_REPORT
    assert sha256(SUFFIX4_AUDIT) == EXPECTED_SUFFIX4_AUDIT
    assert sha256(SUFFIX5_REPORT) == EXPECTED_SUFFIX5_REPORT
    assert sha256(SUFFIX5_AUDIT) == EXPECTED_SUFFIX5_AUDIT
    suffix4 = json.loads(SUFFIX4_REPORT.read_text(encoding="utf-8"))
    suffix4_audit = json.loads(SUFFIX4_AUDIT.read_text(encoding="utf-8"))
    suffix5 = json.loads(SUFFIX5_REPORT.read_text(encoding="utf-8"))
    suffix5_audit = json.loads(SUFFIX5_AUDIT.read_text(encoding="utf-8"))
    assert suffix4["status"] == "PASS_EXACT_RANK8_LOW_LOW_FULL_EARLY_SUFFIX4_CELLS"
    assert suffix4_audit["status"] == "PASS_INDEPENDENT_STRUCTURAL_MASK_SAMPLE_AUDIT_SUFFIX4"
    assert suffix5["status"] == "PASS_EXACT_RANK8_LOW_LOW_FULL_EARLY_SUFFIX5_CELLS"
    assert suffix5_audit["status"] == "PASS_INDEPENDENT_STRUCTURAL_MASK_SAMPLE_AUDIT_SUFFIX5"
    face_by_key = {key(row): row for row in suffix5["rows"]}
    assert sorted(face_by_key) == [(a5, b5) for a5 in range(14) for b5 in range(13)]
    return suffix4, face_by_key


def origin_block(suffix4):
    return {
        "a5_exponent": 0,
        "b5_exponent": 0,
        "rows": {
            label: {
                "terms": 0,
                "negative": 0,
                "minimum": None,
                "maximum": None,
                "first_negative": None,
                "reference_only": True,
            }
            for label in AUXILIARIES
        },
        "suffix5_face_rows": {
            label: {
                "terms": 0,
                "negative": 0,
                "minimum": None,
                "maximum": None,
                "first_negative": None,
                "reference_only": True,
            }
            for label in AUXILIARIES
        },
        "origin_reference": {
            "report": SUFFIX4_REPORT.name,
            "sha256": EXPECTED_SUFFIX4_REPORT,
            "status": suffix4["status"],
            "independent_audit": SUFFIX4_AUDIT.name,
            "independent_audit_sha256": EXPECTED_SUFFIX4_AUDIT,
            "covers_all_a4_b4_coefficients_at_a5_b5_zero": True,
            "statistics_excluded_from_new_block_aggregates": True,
        },
        "pass": True,
        "elapsed_seconds": 0.0,
    }


def run_block(a5: int, b5: int, suffix4, face_by_key) -> dict:
    started = time.perf_counter()
    if (a5, b5) == (0, 0):
        return origin_block(suffix4)
    result = subprocess.run(
        [sys.executable, str(PROBE), "--a5", str(a5), "--b5", str(b5)],
        cwd=ROOT, text=True, capture_output=True, check=False, timeout=7200,
    )
    if result.returncode != 0 or result.stderr:
        raise RuntimeError(
            f"block {(a5, b5)} failed rc={result.returncode}; stderr={result.stderr!r}"
        )
    lines = [line for line in result.stdout.splitlines() if line.strip()]
    if len(lines) != 1:
        raise RuntimeError(f"block {(a5, b5)} unexpected output: {lines!r}")
    row = ast.literal_eval(lines[0])
    assert key(row) == (a5, b5)
    assert row["pass"]
    assert set(row["rows"]) == set(AUXILIARIES)
    assert set(row["suffix5_face_rows"]) == set(AUXILIARIES)
    assert row["suffix5_face_rows"] == face_by_key[(a5, b5)]["rows"]
    for auxiliary in AUXILIARIES:
        statistics = row["rows"][auxiliary]
        assert statistics["negative"] == 0 and statistics["first_negative"] is None
        if statistics["terms"]:
            assert statistics["minimum"] > 0
            assert statistics["maximum"] >= statistics["minimum"]
        else:
            assert statistics["minimum"] is None and statistics["maximum"] is None
    row["suffix5_face_match"] = True
    row["elapsed_seconds"] = time.perf_counter() - started
    return row


def main() -> None:
    if sha256(PROBE) != EXPECTED_PROBE:
        raise SystemExit("probe hash changed; refusing to run")
    suffix4, face_by_key = load_inputs()
    rows = []
    if CHECKPOINT.exists():
        saved = json.loads(CHECKPOINT.read_text(encoding="utf-8"))
        if (saved.get("probe_sha256") == EXPECTED_PROBE
                and saved.get("verifier_sha256") == sha256(Path(__file__))):
            rows = saved["rows"]
    completed = {key(row) for row in rows}
    for a5, b5 in ordered_blocks():
        if (a5, b5) in completed:
            continue
        row = run_block(a5, b5, suffix4, face_by_key)
        rows.append(row)
        rows.sort(key=key)
        atomic_json(CHECKPOINT, {
            "status": "RUNNING_EXACT_RANK8_LOW_LOW_FULL_EARLY_SUFFIX45_BLOCKS",
            "probe_sha256": EXPECTED_PROBE,
            "verifier_sha256": sha256(Path(__file__)),
            "outer_degree_support": {"a5": [0, 13], "b5": [0, 12]},
            "inner_retained_slacks": ["a4", "b4"],
            "rows": rows,
        })
        totals = {name: row["rows"][name]["terms"] for name in AUXILIARIES}
        print("PASS_BLOCK", a5, b5, totals, f"{row['elapsed_seconds']:.3f}s", flush=True)

    expected = [(a5, b5) for a5 in range(14) for b5 in range(13)]
    assert len(rows) == len(expected)
    assert sorted(map(key, rows)) == expected
    aggregates = {}
    for auxiliary in AUXILIARIES:
        nonempty = [
            row["rows"][auxiliary] for row in rows
            if key(row) != (0, 0) and row["rows"][auxiliary]["terms"]
        ]
        aggregates[auxiliary] = {
            "terms": sum(item["terms"] for item in nonempty),
            "negative": 0,
            "minimum": min(item["minimum"] for item in nonempty),
            "maximum": max(item["maximum"] for item in nonempty),
        }
    probe_module = __import__("probe_rank8_low_low_full_early_suffix45_a5_b5_block_flint")
    payload = {
        "schema": "rank8-low-low-full-early-suffix45-a5-b5-blocks-v1",
        "status": "PASS_EXACT_RANK8_LOW_LOW_FULL_EARLY_SUFFIX45_BLOCKS",
        "theorem": (
            "All four pending low/low Bernstein auxiliaries are nonnegative "
            "for arbitrary h,ta,tb,a0,a2,a4,a5,a6,a7,b0,b2,b4,b5,b6,b7>=0, "
            "with adjusted gap slacks a3=b3=0."
        ),
        "block_method": (
            "The complete 14 by 13 outer grid in a5,b5 is checked while "
            "a4,b4 remain ordinary FLINT polynomial variables. Coefficientwise "
            "nonnegativity inside each block therefore proves every a4,b4 "
            "coefficient without a 24,024-process four-dimensional sweep."
        ),
        "ordered_blocks": len(rows),
        "rows": rows,
        "aggregates": aggregates,
        "aggregate_scope": (
            "Exact coefficient statistics for the 181 genuinely new non-origin "
            "a5,b5 blocks. The complete a5=b5=0 block is supplied by the "
            "immutable suffix-4 face theorem and is not double-counted."
        ),
        "suffix5_face_consistency": {
            "matched_non_origin_blocks": 181,
            "reference_report": SUFFIX5_REPORT.name,
            "reference_sha256": EXPECTED_SUFFIX5_REPORT,
        },
        "payment_masks": {
            label: {side: str(mask) for side, mask in probe_module.PAYMENT_MASKS[label].items()}
            for label in AUXILIARIES
        },
        "immutable_inputs": {
            PROBE.name: EXPECTED_PROBE,
            SUFFIX4_REPORT.name: EXPECTED_SUFFIX4_REPORT,
            SUFFIX4_AUDIT.name: EXPECTED_SUFFIX4_AUDIT,
            SUFFIX5_REPORT.name: EXPECTED_SUFFIX5_REPORT,
            SUFFIX5_AUDIT.name: EXPECTED_SUFFIX5_AUDIT,
        },
        "source_sha256": sha256(Path(__file__)),
        "scope_warning": (
            "This closes the full early core lifted simultaneously through "
            "suffix indices 4 and 5, with index 3 still zero. Joining suffix "
            "index 3 is still required for the full low/low cone."
        ),
    }
    atomic_json(REPORT, payload)
    print(payload["status"])
    print("SOURCE", payload["source_sha256"])
    print("REPORT", sha256(REPORT))


if __name__ == "__main__":
    main()
