#!/usr/bin/env python3
"""Complete 14x13 total-slack proof of the simultaneous suffix-4/5 join."""

from __future__ import annotations

import ast
import hashlib
import json
import subprocess
import sys
import time
from pathlib import Path


ROOT = Path(__file__).resolve().parent
PROBE = ROOT / "probe_rank8_low_low_full_early_suffix45_redistribution_bernstein_cell.py"
IDENTITY_SOURCE = ROOT / "verify_rank8_low_low_suffix45_redistribution_identity.py"
IDENTITY_REPORT = ROOT / "rank8_low_low_suffix45_redistribution_identity_exact_20260822.json"
SUFFIX4_REPORT = ROOT / "rank8_low_low_full_early_suffix4_a4_b4_cells_exact_20260821.json"
SUFFIX4_AUDIT = ROOT / "rank8_low_low_full_early_suffix4_audit_20260822.json"
SUFFIX5_REPORT = ROOT / "rank8_low_low_full_early_suffix5_a5_b5_cells_exact_20260821.json"
SUFFIX5_AUDIT = ROOT / "rank8_low_low_full_early_suffix5_audit_20260821.json"
CHECKPOINT = ROOT / "rank8_low_low_full_early_suffix45_redistribution_checkpoint_20260822.json"
REPORT = ROOT / "rank8_low_low_full_early_suffix45_redistribution_exact_20260822.json"

EXPECTED_PROBE = "54631D4D2721F9208DC42C5BB1024FA7E6D199DEC5CF0FD52D173837BFC23159"
EXPECTED_IDENTITY_SOURCE = "FC954DCB651571B845274DFEE67FBF9B5D787B73652A6017FC23B07487C1F3A5"
EXPECTED_IDENTITY_REPORT = "DC5AC4905E04E14B4D628F90AD238809D4B58943A40404183FCCCD8366D4ECDD"
EXPECTED_SUFFIX4_REPORT = "7FE98FC820FFBEC01289AFDB7AE86913528D5C4E2DD90F3DEDD4B9F72803CA7E"
EXPECTED_SUFFIX4_AUDIT = "BA51DD8EDDA7A7D0D6425A6C795BA18C1542F350AB4F1376A7EA38419BA73F78"
EXPECTED_SUFFIX5_REPORT = "8993846F0A260DBEF8091D3617AF8EAAACED67AD274ADA8EA9C181B45D102F7F"
EXPECTED_SUFFIX5_AUDIT = "A4BCF6A78B23F84E7B07FAAED3C67C400111BC21F9B03D5C33ACEC92A7586AD4"

AUXILIARIES = (
    "curvature_middle_times_4", "curvature_far",
    "strong_middle_times_4", "strong_far",
)
NEW_POSITIONS = (
    (0, 1), (0, 2),
    (1, 0), (1, 1), (1, 2),
    (2, 0), (2, 1),
)


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def atomic_json(path: Path, payload) -> None:
    temporary = path.with_suffix(path.suffix + ".tmp")
    temporary.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    temporary.replace(path)


def cell_key(row):
    return row["u_exponent"], row["w_exponent"]


def position_key(row):
    return row["left_bernstein_index"], row["right_bernstein_index"]


def ordered_cells():
    cells = [(u, w) for u in range(14) for w in range(13)]
    priority = [(1, 1), (1, 0), (0, 1), (13, 0), (0, 12), (13, 12)]
    rest = sorted(
        (cell for cell in cells if cell not in priority and cell != (0, 0)),
        key=lambda cell: (sum(cell), cell[0], cell[1]),
    )
    return priority + rest + [(0, 0)]


def validate_inputs():
    expected = {
        PROBE: EXPECTED_PROBE,
        IDENTITY_SOURCE: EXPECTED_IDENTITY_SOURCE,
        IDENTITY_REPORT: EXPECTED_IDENTITY_REPORT,
        SUFFIX4_REPORT: EXPECTED_SUFFIX4_REPORT,
        SUFFIX4_AUDIT: EXPECTED_SUFFIX4_AUDIT,
        SUFFIX5_REPORT: EXPECTED_SUFFIX5_REPORT,
        SUFFIX5_AUDIT: EXPECTED_SUFFIX5_AUDIT,
    }
    for path, digest in expected.items():
        assert sha256(path) == digest, path
    identity = json.loads(IDENTITY_REPORT.read_text(encoding="utf-8"))
    assert identity["status"] == "PASS_EXACT_SUFFIX45_REDISTRIBUTION_IDENTITY"
    assert identity["auxiliary_bidegrees"] == {
        "margin": [2, 2],
        "derivative": [2, 2],
        "curvature": [2, 2],
        "strong": [2, 2],
    }
    suffix4 = json.loads(SUFFIX4_REPORT.read_text(encoding="utf-8"))
    suffix5 = json.loads(SUFFIX5_REPORT.read_text(encoding="utf-8"))
    assert suffix4["status"] == "PASS_EXACT_RANK8_LOW_LOW_FULL_EARLY_SUFFIX4_CELLS"
    assert suffix5["status"] == "PASS_EXACT_RANK8_LOW_LOW_FULL_EARLY_SUFFIX5_CELLS"


def origin_cell():
    return {
        "u_exponent": 0,
        "w_exponent": 0,
        "redistribution_degree": [2, 2],
        "bernstein_scaling": 4,
        "known_corner_rows_omitted": True,
        "rows": [
            {
                "left_bernstein_index": left,
                "right_bernstein_index": right,
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
                "pass": True,
            }
            for left, right in NEW_POSITIONS
        ],
        "origin_reference": {
            "explanation": (
                "When U=W=0 the redistribution coordinates disappear. "
                "Every tensor Bernstein row is four times the common origin "
                "residual already covered by either sealed coordinate-face theorem."
            ),
            "suffix4_report": SUFFIX4_REPORT.name,
            "suffix4_sha256": EXPECTED_SUFFIX4_REPORT,
            "suffix5_report": SUFFIX5_REPORT.name,
            "suffix5_sha256": EXPECTED_SUFFIX5_REPORT,
        },
        "pass": True,
        "elapsed_seconds": 0.0,
    }


def validate_probe_output(row, u, w):
    assert cell_key(row) == (u, w)
    assert row["redistribution_degree"] == [2, 2]
    assert row["bernstein_scaling"] == 4
    assert row["known_corner_rows_omitted"] is True
    assert row["pass"] and len(row["rows"]) == len(NEW_POSITIONS)
    assert {position_key(item) for item in row["rows"]} == set(NEW_POSITIONS)
    for position in row["rows"]:
        assert position["pass"] and set(position["rows"]) == set(AUXILIARIES)
        for label in AUXILIARIES:
            statistics = position["rows"][label]
            assert statistics["negative"] == 0
            assert statistics["first_negative"] is None
            if statistics["terms"]:
                assert statistics["minimum"] > 0
                assert statistics["maximum"] >= statistics["minimum"]
            else:
                assert statistics["minimum"] is None
                assert statistics["maximum"] is None


def run_cell(u, w):
    started = time.perf_counter()
    if (u, w) == (0, 0):
        return origin_cell()
    result = subprocess.run(
        [
            sys.executable, str(PROBE),
            "--u", str(u), "--w", str(w), "--new-only",
        ],
        cwd=ROOT, text=True, capture_output=True, check=False, timeout=7200,
    )
    if result.returncode != 0 or result.stderr:
        raise RuntimeError(
            f"cell {(u, w)} failed rc={result.returncode}; "
            f"stderr={result.stderr!r}"
        )
    lines = [line for line in result.stdout.splitlines() if line.strip()]
    if len(lines) != 1:
        raise RuntimeError(f"cell {(u, w)} unexpected output: {lines!r}")
    row = ast.literal_eval(lines[0])
    validate_probe_output(row, u, w)
    row["elapsed_seconds"] = time.perf_counter() - started
    return row


def main():
    validate_inputs()
    rows = []
    if CHECKPOINT.exists():
        saved = json.loads(CHECKPOINT.read_text(encoding="utf-8"))
        if (
            saved.get("probe_sha256") == EXPECTED_PROBE
            and saved.get("verifier_sha256") == sha256(Path(__file__))
            and saved.get("identity_report_sha256") == EXPECTED_IDENTITY_REPORT
        ):
            rows = saved["rows"]
    completed = {cell_key(row) for row in rows}
    for u, w in ordered_cells():
        if (u, w) in completed:
            continue
        row = run_cell(u, w)
        rows.append(row)
        rows.sort(key=cell_key)
        atomic_json(CHECKPOINT, {
            "status": "RUNNING_EXACT_RANK8_SUFFIX45_REDISTRIBUTION_GRID",
            "probe_sha256": EXPECTED_PROBE,
            "verifier_sha256": sha256(Path(__file__)),
            "identity_report_sha256": EXPECTED_IDENTITY_REPORT,
            "total_slack_support": {"U": [0, 13], "W": [0, 12]},
            "new_bernstein_positions": [list(item) for item in NEW_POSITIONS],
            "rows": rows,
        })
        terms = sum(
            statistics["terms"]
            for position in row["rows"]
            for statistics in position["rows"].values()
        )
        print(
            "PASS_TOTAL_CELL", u, w,
            "ROWS", len(row["rows"]), "TERMS", terms,
            f"{row['elapsed_seconds']:.3f}s", flush=True,
        )

    expected_cells = [(u, w) for u in range(14) for w in range(13)]
    assert len(rows) == 182 and list(map(cell_key, rows)) == expected_cells
    aggregates = {}
    for left, right in NEW_POSITIONS:
        position_name = f"left_{left}_right_{right}"
        aggregates[position_name] = {}
        for label in AUXILIARIES:
            items = []
            for cell in rows:
                if cell_key(cell) == (0, 0):
                    continue
                position = next(
                    item for item in cell["rows"]
                    if position_key(item) == (left, right)
                )
                statistics = position["rows"][label]
                if statistics["terms"]:
                    items.append(statistics)
            aggregates[position_name][label] = {
                "terms": sum(item["terms"] for item in items),
                "negative": 0,
                "minimum": min(item["minimum"] for item in items),
                "maximum": max(item["maximum"] for item in items),
            }

    payload = {
        "schema": "rank8-low-low-full-early-suffix45-redistribution-grid-v1",
        "status": "PASS_EXACT_RANK8_LOW_LOW_FULL_EARLY_SUFFIX45_REDISTRIBUTION_GRID",
        "theorem": (
            "All four pending low/low Bernstein auxiliaries are nonnegative "
            "for arbitrary h,ta,tb,a0,a2,a4,a5,a6,a7,b0,b2,b4,b5,b6,b7>=0, "
            "with a3=b3=0."
        ),
        "logical_reduction": (
            "Set U=a4+a5, W=b4+b5, x=a5/U, y=b5/W. The auxiliaries have "
            "bidegree at most (2,2) in (x,y). Their two known corners are the "
            "sealed suffix-4 and suffix-5 faces; every coefficient of the seven "
            "remaining tensor Bernstein rows is checked on the complete U,W grid."
        ),
        "outer_cells": len(rows),
        "new_bernstein_positions": [list(item) for item in NEW_POSITIONS],
        "known_corner_references": {
            "left_0_right_0": {
                "meaning": "four times the suffix-4 face residual",
                "report": SUFFIX4_REPORT.name,
                "sha256": EXPECTED_SUFFIX4_REPORT,
                "audit": SUFFIX4_AUDIT.name,
                "audit_sha256": EXPECTED_SUFFIX4_AUDIT,
            },
            "left_2_right_2": {
                "meaning": "four times the suffix-5 face residual",
                "report": SUFFIX5_REPORT.name,
                "sha256": EXPECTED_SUFFIX5_REPORT,
                "audit": SUFFIX5_AUDIT.name,
                "audit_sha256": EXPECTED_SUFFIX5_AUDIT,
            },
        },
        "rows": rows,
        "aggregates": aggregates,
        "immutable_inputs": {
            PROBE.name: EXPECTED_PROBE,
            IDENTITY_SOURCE.name: EXPECTED_IDENTITY_SOURCE,
            IDENTITY_REPORT.name: EXPECTED_IDENTITY_REPORT,
            SUFFIX4_REPORT.name: EXPECTED_SUFFIX4_REPORT,
            SUFFIX4_AUDIT.name: EXPECTED_SUFFIX4_AUDIT,
            SUFFIX5_REPORT.name: EXPECTED_SUFFIX5_REPORT,
            SUFFIX5_AUDIT.name: EXPECTED_SUFFIX5_AUDIT,
        },
        "source_sha256": sha256(Path(__file__)),
        "scope_warning": (
            "This closes the simultaneous suffix-4/5 lift over the full early "
            "core with suffix index 3 still zero. Index 3 must still be joined "
            "before the complete low/low cone follows."
        ),
    }
    atomic_json(REPORT, payload)
    print(payload["status"])
    print("SOURCE", payload["source_sha256"])
    print("REPORT", sha256(REPORT))


if __name__ == "__main__":
    main()
