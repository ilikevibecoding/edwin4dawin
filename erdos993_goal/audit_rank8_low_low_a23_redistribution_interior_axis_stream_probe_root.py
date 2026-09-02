#!/usr/bin/env python3
"""Audit the low-memory axis probe against four sealed full-probe rows."""

from __future__ import annotations

import ast
import hashlib
import json
import subprocess
import sys
from pathlib import Path


ROOT = Path(__file__).resolve().parent
PROBE = ROOT / "probe_rank8_low_low_a23_redistribution_interior_axis_stream_root.py"
CHECKPOINT = ROOT / "rank8_low_low_a23_redistribution_interior_fast_root_checkpoint_20260822.json"
OUTPUT = ROOT / "rank8_low_low_a23_redistribution_interior_axis_stream_probe_audit_20260822.json"
EXPECTED = {
    PROBE.name: "7D99C8D8AFB6FD08E708E7F61D805199F02DBC439EA8C943347621AFE04C47C8",
    CHECKPOINT.name: "6F2EE89A1B12E1EBC533172BC89CAAAD1E99A4AA98954FDEFEEC0060D2F9E67C",
}
REPLAY_CELLS = ((9, 0), (8, 0), (0, 8), (0, 7))


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def parse_one(text: str):
    lines = [line for line in text.splitlines() if line.strip()]
    assert len(lines) == 1
    return ast.literal_eval(lines[0])


def atomic_json(path: Path, payload) -> None:
    temporary = path.with_suffix(path.suffix + ".tmp")
    temporary.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    temporary.replace(path)


def main() -> None:
    assert {name: sha256(ROOT / name) for name in EXPECTED} == EXPECTED
    checkpoint = json.loads(CHECKPOINT.read_text(encoding="utf-8"))
    assert checkpoint["completed_expansion_units"] == 85
    assert checkpoint["completed_position_cells"] == 373
    indexed = {
        (row["p_exponent"], row["q_exponent"]): row
        for row in checkpoint["rows"]
    }
    exact_replays = []
    for cell in REPLAY_CELLS:
        result = subprocess.run(
            [sys.executable, str(PROBE), "--p", str(cell[0]), "--q", str(cell[1])],
            cwd=ROOT,
            text=True,
            capture_output=True,
            check=False,
            timeout=300,
        )
        assert result.returncode == 0 and not result.stderr
        candidate = parse_one(result.stdout)
        reference = indexed[cell]
        assert candidate["positions"] == reference["positions"]
        assert candidate["position_count"] == reference["position_count"] == 1
        assert candidate["pass"] is True
        exact_replays.append({
            "cell": list(cell),
            "exact_statistics_dictionary_equality": True,
            "terms": sum(
                item["terms"] for item in candidate["positions"][0]["rows"].values()
            ),
        })
    source_text = PROBE.read_text(encoding="utf-8")
    assert "for label in LABELS" in source_text
    assert "del polynomial" in source_text
    assert "assert len(needed) == 2" in source_text
    payload = {
        "schema": "rank8-low-low-a23-redistribution-interior-axis-stream-probe-audit-v1",
        "status": "PASS_EXACT_A23_INTERIOR_AXIS_LABEL_STREAM_PROBE_AUDIT",
        "exact_replays": exact_replays,
        "construction": (
            "For an axis unit the unique Bernstein position has exactly two power "
            "cells. The probe recomputes them once per auxiliary label and releases "
            "each exact polynomial after recording statistics."
        ),
        "immutable_inputs": EXPECTED,
        "source_sha256": sha256(Path(__file__)),
    }
    atomic_json(OUTPUT, payload)
    print(payload["status"])
    print("EXACT_REPLAYS", len(exact_replays))
    print("SOURCE", payload["source_sha256"])
    print("OUTPUT", sha256(OUTPUT))


if __name__ == "__main__":
    main()
