#!/usr/bin/env python3
"""Independent no-gap audit for the order-27 Delta0 leaf-frontier batch."""

from __future__ import annotations

import hashlib
import json
from pathlib import Path
import re

from verify_rank7_leaf_boundary_frontier_structure import all_rows, frontier


ROOT = Path(__file__).resolve().parent
BATCH = ROOT / "rank7_delta0_leaf_frontier_n27_exact_20260820.json"
STRUCTURE = ROOT / "rank7_delta0_leaf_boundary_frontier_n27_exact_20260820.json"
PROBE = ROOT / "probe_rank7_delta0_leaf_frontier_fixed_m.py"
OUTPUT = ROOT / "rank7_delta0_leaf_frontier_n27_audit_exact_20260820.json"


def sha(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def main() -> int:
    report = json.loads(BATCH.read_text(encoding="utf-8"))
    structure = json.loads(STRUCTURE.read_text(encoding="utf-8"))
    assert report["schema"] == "rank7-delta0-leaf-frontier-n27-batch-v1"
    assert report["status"] == "PASS"
    assert report["order"] == 27
    assert report["B2_floor"] == 6
    assert report["probe_sha256"] == sha(PROBE)
    assert report["structure_report_sha256"] == sha(STRUCTURE)
    assert structure["status"] == "PASS_EXACT_ORDER27_LEAF_BOUNDARY_FRONTIER_STRUCTURE"

    rows, _ = all_rows(27, 6)
    boundary = frontier(rows)
    assert len(boundary) == structure["frontier_rows"] == report["frontier_rows"] == 35
    assert [
        (row["B2_lower"], row["boundary_one_upper"])
        for row in structure["frontier"]
    ] == boundary

    expected = {
        f"{beta}:{boundary_one}:{m}:{region}"
        for beta, boundary_one in boundary
        for m in range(18, 26)
        for region in ("ratio", "badset")
    }
    actual = {row["key"] for row in report["cells"]}
    assert len(expected) == 560
    assert actual == expected
    assert len(report["cells"]) == report["completed"] == report["passed"] == report["total_cells"] == 560

    minima = []
    pieces = 0
    for row in report["cells"]:
        assert row["status"] == "PASS" and row["returncode"] == 0
        log = ROOT / row["log"]
        assert log.is_file() and sha(log) == row["sha256"]
        text = log.read_text(encoding="utf-8")
        marker = (
            "PASS_DELTA0_LEAF_FRONTIER_FIXED_M "
            f"27 {row['m']} {row['B2_lower']} {row['boundary_one_upper']} {row['region']}"
        )
        assert marker in text
        numerator_lines = [line for line in text.splitlines() if line.startswith("numerator ")]
        denominator_lines = [line for line in text.splitlines() if line.startswith("denominator ")]
        assert numerator_lines and len(numerator_lines) == len(denominator_lines)
        pieces += len(numerator_lines)
        # The exact prover aborts on a negative coefficient.  Independently
        # require every recorded rational minimum to have no leading minus.
        for line in numerator_lines + denominator_lines:
            match = re.search(r"\)\s+\d+\s+([^\s]+)\s+\(", line)
            assert match is not None and not match.group(1).startswith("-")
            minima.append(match.group(1))

    audited = {
        "status": "PASS_EXACT_RANK7_DELTA0_LEAF_FRONTIER_N27_NO_GAP_AUDIT",
        "order": 27,
        "frontier_rows": len(boundary),
        "m_values": list(range(18, 26)),
        "regions": ["ratio", "badset"],
        "cells": len(expected),
        "bernstein_pieces": pieces,
        "exact_recorded_minima": len(minima),
        "batch_sha256": sha(BATCH),
        "structure_sha256": sha(STRUCTURE),
        "probe_sha256": sha(PROBE),
        "log_hashes_checked": len(report["cells"]),
    }
    OUTPUT.write_text(json.dumps(audited, indent=2, sort_keys=True) + "\n", encoding="utf-8")
    print(audited["status"])
    print("cells", audited["cells"], "pieces", pieces, "log_hashes", audited["log_hashes_checked"])
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
