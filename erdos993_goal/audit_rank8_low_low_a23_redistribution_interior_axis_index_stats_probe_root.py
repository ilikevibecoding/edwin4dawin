#!/usr/bin/env python3
"""Independent equivalence audit for the no-list axis statistics probe."""

from __future__ import annotations

import ast
import hashlib
import json
import subprocess
import sys
from pathlib import Path

from flint import fmpz_mpoly_ctx

from probe_rank8_low_low_a23_redistribution_bernstein_cell_fast_agent import (
    fast_stats,
)
from probe_rank8_low_low_a23_redistribution_interior_axis_index_stats_root import (
    index_stats,
)


ROOT = Path(__file__).resolve().parent
PROBE = ROOT / "probe_rank8_low_low_a23_redistribution_interior_axis_index_stats_root.py"
OLD_PROBE = ROOT / "probe_rank8_low_low_a23_redistribution_interior_axis_stream_root.py"
PREFIX = ROOT / "rank8_low_low_a23_redistribution_interior_fast_root_checkpoint_20260822.json"
OUTPUT = ROOT / "rank8_low_low_a23_redistribution_interior_axis_index_stats_probe_audit_20260823.json"
EXPECTED = {
    PROBE.name: "BC72176B26FAACE2DB3024047B6CA373D0ADEDCCE12EBAE5437C380DFA57820A",
    OLD_PROBE.name: "7D99C8D8AFB6FD08E708E7F61D805199F02DBC439EA8C943347621AFE04C47C8",
    PREFIX.name: "6F2EE89A1B12E1EBC533172BC89CAAAD1E99A4AA98954FDEFEEC0060D2F9E67C",
}
REPLAY = ((9, 0), (8, 0), (0, 8), (0, 7))


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def atomic_json(path: Path, payload) -> None:
    temporary = path.with_suffix(path.suffix + ".tmp")
    temporary.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    temporary.replace(path)


def parse_one(text: str):
    lines = [line for line in text.splitlines() if line.strip()]
    assert len(lines) == 1
    return ast.literal_eval(lines[0])


def main() -> None:
    assert {name: sha256(ROOT / name) for name in EXPECTED} == EXPECTED

    context = fmpz_mpoly_ctx.get(("x", "y", "z"), "degrevlex")
    synthetic = context.from_dict({
        (8, 0, 0): 17,
        (3, 2, 1): -11,
        (0, 7, 0): 29,
        (0, 0, 0): -3,
    })
    assert index_stats(synthetic) == fast_stats(synthetic)
    assert index_stats(context.constant(0)) == fast_stats(context.constant(0))

    prefix = json.loads(PREFIX.read_text(encoding="utf-8"))
    indexed = {
        (row["p_exponent"], row["q_exponent"]): row
        for row in prefix["rows"]
    }
    exact_replays = []
    for cell in REPLAY:
        result = subprocess.run(
            [sys.executable, str(PROBE), "--p", str(cell[0]), "--q", str(cell[1])],
            cwd=ROOT,
            text=True,
            capture_output=True,
            check=False,
            timeout=600,
        )
        assert result.returncode == 0 and not result.stderr
        candidate = parse_one(result.stdout)
        assert candidate["coefficient_scan"] == "flint_term_index_no_python_list"
        recorded = indexed[cell]
        assert candidate["positions"] == recorded["positions"]
        assert candidate["position_count"] == recorded["position_count"] == 1
        assert candidate["pass"] is recorded["pass"] is True
        exact_replays.append({
            "cell": list(cell),
            "exact_position_dictionary_equality": True,
            "terms": sum(
                item["terms"]
                for item in candidate["positions"][0]["rows"].values()
            ),
        })

    payload = {
        "schema": "rank8-low-low-a23-interior-axis-index-stats-probe-audit-v1",
        "status": "PASS_EXACT_A23_INTERIOR_AXIS_INDEX_STATS_PROBE_AUDIT",
        "synthetic_positive_negative_and_zero_equivalence": True,
        "sealed_axis_exact_replays": exact_replays,
        "immutable_inputs": EXPECTED,
        "source_sha256": sha256(Path(__file__)),
    }
    atomic_json(OUTPUT, payload)
    print(payload["status"])
    print("REPLAYS", len(exact_replays))
    print("SOURCE", payload["source_sha256"])
    print("OUTPUT", sha256(OUTPUT))


if __name__ == "__main__":
    main()
