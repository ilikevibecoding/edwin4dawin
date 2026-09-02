#!/usr/bin/env python3
"""Independent integration and partition audit of the complete mask-2 seal."""

from __future__ import annotations

import hashlib
import json
from pathlib import Path


HERE = Path(__file__).resolve().parent
OUTPUT = HERE / "rank8_delta0_new_leaf_mask2_complete_independent_audit_agent_20260823.json"

EXPECTED_ASSEMBLER = {
    "assemble_rank8_delta0_new_leaf_mask2_complete_agent.py": "481FC574EA1C0E1FF3ACBBCC953544271C7E5C8F583DA587A7E3001741598377",
    "rank8_delta0_new_leaf_mask2_complete_agent_20260823.json": "74380C2537AEDD1C6388CCE6A4AD402D403505F6E4D282BD9B2F8D4E885FE7A6",
}


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def load(name: str):
    return json.loads((HERE / name).read_text(encoding="utf-8"))


def cells(name: str):
    report = load(name)
    return {(row["N"], row["r"], row["m"]) for row in report["rows"]}, report


def main() -> None:
    assembler_hashes = {name: sha256(HERE / name) for name in EXPECTED_ASSEMBLER}
    assert assembler_hashes == EXPECTED_ASSEMBLER, (assembler_hashes, EXPECTED_ASSEMBLER)
    master = load("rank8_delta0_new_leaf_mask2_complete_agent_20260823.json")
    assert master["status"] == "PASS_EXACT_INDEPENDENTLY_AUDITED_DELTA0_NEW_LEAF_MASK2_ALL_N_GE_27"
    manifest = master["dependency_manifest_sha256"]
    before = {name: sha256(HERE / name) for name in manifest}
    assert before == manifest
    low, low_report = cells("rank8_delta0_new_leaf_mask2_n26_39_r1_9_exact_agent_20260823.json")
    middle, middle_report = cells("rank8_delta0_new_leaf_mask2_n26_39_middle_exact_agent_20260823.json")
    small, small_report = cells("rank8_delta0_new_leaf_mask2_n26_39_m0_15_exact_agent_20260823.json")
    universe = {(N, r, N - r) for N in range(26, 40) for r in range(1, N + 1)}
    assert low == {cell for cell in universe if cell[1] <= 9}
    assert middle == {cell for cell in universe if cell[1] >= 10 and cell[2] >= 16}
    assert small == {cell for cell in universe if cell[2] <= 15}
    assert (len(universe), len(low), len(middle), len(small)) == (455, 126, 105, 224)
    assert not (low & middle or low & small or middle & small)
    assert low | middle | small == universe
    assert low_report["open_cells"] == middle_report["open_cells"] == small_report["open_cells"] == []
    assert all(row["status"] == "SEALED" for report in (low_report, middle_report, small_report) for row in report["rows"])
    finite_audits = [
        load("rank8_delta0_new_leaf_mask2_n26_39_r1_9_independent_audit_agent_20260823.json"),
        load("rank8_delta0_new_leaf_mask2_n26_39_middle_independent_audit_agent_20260823.json"),
        load("rank8_delta0_new_leaf_mask2_n26_39_m0_15_independent_audit_agent_20260823.json"),
    ]
    assert [report["status"] for report in finite_audits] == [
        "PASS_INDEPENDENT_LITERAL_DELTA0_NEW_LEAF_MASK2_N26_39_R1_9_ALL_126",
        "PASS_INDEPENDENT_LITERAL_DELTA0_NEW_LEAF_MASK2_N26_39_MIDDLE",
        "PASS_INDEPENDENT_LITERAL_DELTA0_NEW_LEAF_MASK2_N26_39_M0_15_ALL_224",
    ]
    tail_reports = [
        load("rank8_delta0_new_leaf_mask2_r1_9_tail_exact_agent_20260823.json"),
        load("rank8_delta0_new_leaf_mask2_quantitative_gap_tail_probe_agent_20260823.json"),
        load("rank8_delta0_new_leaf_mask2_m0_15_tail_exact_agent_20260823.json"),
    ]
    tail_audits = [
        load("rank8_delta0_new_leaf_mask2_r1_9_tail_independent_audit_agent_20260823.json"),
        load("rank8_delta0_new_leaf_mask2_quantitative_gap_tail_independent_audit_agent_20260823.json"),
        load("rank8_delta0_new_leaf_mask2_m0_15_tail_independent_audit_agent_20260823.json"),
    ]
    assert tail_reports[0]["open_rows"] == [] and tail_reports[1]["open_controls"] == 0
    assert tail_reports[2]["open_cells"] == tail_reports[2]["missing_tails"] == []
    assert all(report["status"].startswith("PASS_INDEPENDENT_LITERAL") for report in tail_audits)
    logic_counts = {"low_r": 0, "middle": 0, "small_m": 0}
    for N in range(40, 540):
        for r in range(1, N + 1):
            m = N - r
            labels = (["low_r"] if r <= 9 else []) + (["middle"] if r >= 10 and m >= 16 else []) + (["small_m"] if m <= 15 else [])
            assert len(labels) == 1
            logic_counts[labels[0]] += 1
    after = {name: sha256(HERE / name) for name in manifest}
    assert after == before == manifest
    payload = {
        "schema": "rank8-delta0-new-leaf-mask2-complete-independent-audit-v1",
        "status": "PASS_INDEPENDENT_INTEGRATION_DELTA0_NEW_LEAF_MASK2_ALL_N_GE_27",
        "assembler_hashes": assembler_hashes,
        "dependency_manifest_sha256": manifest,
        "dependency_rehash_stable_within_run": True,
        "finite_partition": {"universe": len(universe), "low_r": len(low), "middle": len(middle), "small_m": len(small), "overlap": 0, "gap": 0},
        "tail_logic_replay_N40_539": logic_counts,
        "unbounded_tail_logic": (
            "For r<=9 choose low-r. For r>=10 exactly one of m<=15,m>=16 "
            "holds. Low-r and small-m cannot overlap at N>=40 because N<=24."
        ),
        "proof_boundary": master["proof_boundary"],
    }
    OUTPUT.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    print(payload["status"])
    print("FINITE", payload["finite_partition"])
    print("DEPENDENCIES_REHASHED", len(manifest))
    print("SOURCE", sha256(Path(__file__)))
    print("REPORT", sha256(OUTPUT))


if __name__ == "__main__":
    main()
