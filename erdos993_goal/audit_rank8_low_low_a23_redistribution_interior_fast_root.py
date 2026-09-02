#!/usr/bin/env python3
"""Audit the 377-position complement probe against sealed full-probe rows."""

from __future__ import annotations

import ast
import hashlib
import json
import subprocess
import sys
from pathlib import Path


ROOT = Path(__file__).resolve().parent
PROBE = ROOT / "probe_rank8_low_low_a23_redistribution_interior_fast_root.py"
FULL_PROBE = ROOT / "probe_rank8_low_low_a23_redistribution_bernstein_cell_fast_agent.py"
OUTPUT = ROOT / "rank8_low_low_a23_redistribution_interior_fast_root_audit_20260822.json"
SEALED = {
    (9, 0): ("rank8_a23_fast_agent_9_0_probe.tmp", "7E50765212C7A2DA02A8BDC7F4E75B10BEFD8455152316EA92D0838417BBBC76"),
    (0, 8): ("rank8_a23_fast_agent_0_8_probe.tmp", "8C1CF0C31CB9D06594078899313A4DBF403D10AC3A8FFC0C3DA1773B86FCBB7C"),
    (9, 7): ("rank8_a23_fast_agent_9_7_probe.tmp", "0CA81BF68453320C07EDAE173BCC0CB70B5259001CF056CB0143886ADB6E7018"),
    (8, 8): ("rank8_a23_fast_agent_8_8_probe.tmp", "47476B7E0EB3EBAC6BC22E15F95A1DBAEDE8B0E6A9F98CAAAD23B361497EC7E9"),
    (1, 1): ("rank8_a23_fast_agent_1_1_probe.tmp", "DC88F3803FD1776087DD28C44C755BF6100D584E3D595D99C017D23CE3D6492B"),
}
EXPECTED = {
    PROBE.name: "81EBE70417A47465AB3BFB995E178C8D84715DAFDB69FCA3E0EEB73B8B3781E8",
    FULL_PROBE.name: "9EF1B74971804AE64647D74F6F5C9FCC6F3082B3CC2A2780D7B6D761BDF6CD46",
    **{name: digest for name, digest in SEALED.values()},
}
MIXED = {(0, 2), (2, 0)}


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def parse_one(text: str):
    lines = [line for line in text.splitlines() if line.strip()]
    assert len(lines) == 1
    return ast.literal_eval(lines[0])


def retained(row):
    return [
        item for item in row["positions"]
        if (item["left_bernstein_index"], item["right_bernstein_index"]) not in MIXED
    ]


def main() -> None:
    assert {name: sha256(ROOT / name) for name in EXPECTED} == EXPECTED
    exact_replays = []
    dense_import = None
    for cell, (name, _) in SEALED.items():
        original = parse_one((ROOT / name).read_text(encoding="utf-8-sig"))
        assert (original["p_exponent"], original["q_exponent"]) == cell
        expected_positions = retained(original)
        assert expected_positions and all(row["pass"] for row in expected_positions)
        if cell == (1, 1):
            assert original["pass"] is False
            assert len(original["positions"]) == 7 and len(expected_positions) == 5
            dense_import = {
                "cell": list(cell),
                "full_row_pass": False,
                "retained_positions": 5,
                "retained_positions_all_pass": True,
                "full_output_sha256": EXPECTED[name],
            }
            continue
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
        assert candidate["positions"] == expected_positions
        assert candidate["position_count"] == len(expected_positions)
        assert candidate["pass"] is True
        assert candidate["excluded_mixed_endpoint_positions"] == [[0, 2], [2, 0]]
        exact_replays.append({
            "cell": list(cell),
            "positions": len(expected_positions),
            "exact_statistics_dictionary_equality": True,
            "power_cells_computed": candidate["power_cells_computed"],
        })

    assert dense_import is not None
    source_text = PROBE.read_text(encoding="utf-8")
    assert "build_cached_rows" in source_text
    assert "quadratic_auxiliaries" in source_text
    assert "fast_stats" in source_text
    assert "if left_weight and right_weight" in source_text
    assert "MIXED_ENDPOINT_POSITIONS = {(0, 2), (2, 0)}" in source_text

    payload = {
        "schema": "rank8-low-low-a23-redistribution-interior-fast-root-audit-v1",
        "status": "PASS_EXACT_A23_377_POSITION_COMPLEMENT_PROBE_AUDIT",
        "universe": {
            "both_positive_expansion_units": 72,
            "retained_positions_per_both_positive_unit": 5,
            "axis_positions": 17,
            "total_retained_positions": 377,
            "separate_mixed_endpoint_positions": 144,
            "original_new_position_universe": 521,
        },
        "exact_sealed_row_replays": exact_replays,
        "dense_failed_row_filtered_import": dense_import,
        "construction_reuse": (
            "The complement probe imports the audited cached row builder, quadratic "
            "auxiliaries, and exact statistics function from the full fast probe. It "
            "retains the identical Bernstein sum and omits only power cells unused by "
            "the retained positions."
        ),
        "immutable_inputs": EXPECTED,
        "source_sha256": sha256(Path(__file__)),
        "scope_warning": (
            "This validates the complement engine and sealed rows, not all 377 cells. "
            "The two mixed endpoint faces require their separate Young/factored proof."
        ),
    }
    temporary = OUTPUT.with_suffix(OUTPUT.suffix + ".tmp")
    temporary.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    temporary.replace(OUTPUT)
    print(payload["status"])
    print("EXACT_REPLAYS", len(exact_replays))
    print("SOURCE", payload["source_sha256"])
    print("OUTPUT", sha256(OUTPUT))


if __name__ == "__main__":
    main()
