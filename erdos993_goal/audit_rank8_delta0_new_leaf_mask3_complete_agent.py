#!/usr/bin/env python3
"""Independent integration audit of the complete mask-3 endpoint theorem."""

from __future__ import annotations

import hashlib
import json
from pathlib import Path


HERE = Path(__file__).resolve().parent
OUTPUT = HERE / "rank8_delta0_new_leaf_mask3_complete_independent_audit_agent_20260823.json"
EXPECTED = {
    "assemble_rank8_delta0_new_leaf_mask3_complete_agent.py": "BB63E26826001F146D59D3AD3F88F692E61CB0326AC142C63781508221D4C504",
    "rank8_delta0_new_leaf_mask3_complete_agent_20260823.json": "54E39867A27798859403937DDFD5318CC3A3DA7C23228DA4C1382C25321B85D7",
}


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def load(name: str):
    return json.loads((HERE / name).read_text(encoding="utf-8"))


def cells(name: str):
    report = load(name)
    return {(row["N"], row["r"], row["m"]) for row in report["rows"]}, report


def main() -> None:
    assembler_hashes = {name: sha256(HERE / name) for name in EXPECTED}
    assert assembler_hashes == EXPECTED
    master = load("rank8_delta0_new_leaf_mask3_complete_agent_20260823.json")
    assert master["status"] == "PASS_EXACT_INDEPENDENTLY_AUDITED_DELTA0_NEW_LEAF_MASK3_ALL_N_GE_27"
    manifest = master["dependency_manifest_sha256"]
    before = {name: sha256(HERE / name) for name in manifest}
    assert before == manifest
    low, low_report = cells("rank8_delta0_new_leaf_mask3_n26_39_r1_9_complete_assembled_agent_20260823.json")
    middle, middle_report = cells("rank8_delta0_new_leaf_mask3_n26_39_middle_complete_assembled_agent_20260823.json")
    small, small_report = cells("rank8_delta0_new_leaf_mask3_n26_39_m0_15_complete_assembled_agent_20260823.json")
    universe = {(N, r, N - r) for N in range(26, 40) for r in range(1, N + 1)}
    assert low == {cell for cell in universe if cell[1] <= 9}
    assert middle == {cell for cell in universe if cell[1] >= 10 and cell[2] >= 16}
    assert small == {cell for cell in universe if cell[2] <= 15}
    assert (len(universe), len(low), len(middle), len(small)) == (455, 126, 105, 224)
    assert not (low & middle or low & small or middle & small)
    assert low | middle | small == universe
    assert low_report["status"].startswith("PASS_EXACT")
    assert middle_report["status"].startswith("PASS_EXACT")
    assert small_report["status"].startswith("PASS_EXACT") and small_report["open_cells"] == []
    finite_audits = [
        load("rank8_delta0_new_leaf_mask3_n26_39_r1_9_complete_independent_audit_agent_20260823.json"),
        load("rank8_delta0_new_leaf_mask3_n26_39_middle_complete_independent_audit_agent_20260823.json"),
        load("rank8_delta0_new_leaf_mask3_n26_39_m0_15_complete_independent_audit_agent_20260823.json"),
    ]
    assert all(report["status"].startswith("PASS_INDEPENDENT") for report in finite_audits)
    tails = [
        load("rank8_delta0_new_leaf_mask3_r1_9_tail_exact_agent_20260823.json"),
        load("rank8_delta0_new_leaf_mask3_quantitative_gap_tail_probe_agent_20260823.json"),
        load("rank8_delta0_new_leaf_mask3_m0_15_tail_exact_agent_20260823.json"),
    ]
    tail_audits = [
        load("rank8_delta0_new_leaf_mask3_r1_9_tail_independent_audit_agent_20260823.json"),
        load("rank8_delta0_new_leaf_mask3_quantitative_gap_tail_independent_audit_agent_20260823.json"),
        load("rank8_delta0_new_leaf_mask3_m0_15_tail_independent_audit_agent_20260823.json"),
    ]
    assert all(report["status"].startswith("PASS_") for report in tails + tail_audits)
    logic = {"low_r": 0, "middle": 0, "small_m": 0}
    for N in range(40, 540):
        for r in range(1, N + 1):
            m = N - r
            labels = (["low_r"] if r <= 9 else []) + (["middle"] if r >= 10 and m >= 16 else []) + (["small_m"] if m <= 15 else [])
            assert len(labels) == 1
            logic[labels[0]] += 1
    after = {name: sha256(HERE / name) for name in manifest}
    assert after == before
    payload = {
        "schema": "rank8-delta0-new-leaf-mask3-complete-independent-audit-v1",
        "status": "PASS_INDEPENDENT_INTEGRATION_DELTA0_NEW_LEAF_MASK3_ALL_N_GE_27",
        "finite_partition": {"universe": 455, "low_r": 126, "middle": 105, "small_m": 224, "overlap": 0, "gap": 0},
        "tail_logic_replay_N40_539": logic,
        "unbounded_tail_logic": "For r<=9 choose low-r. For r>=10 exactly one of m<=15,m>=16 holds. Low-r and small-m cannot overlap for N>=40 because N<=24.",
        "assembler_hashes": assembler_hashes,
        "dependency_manifest_sha256": manifest,
        "dependency_rehash_stable_within_run": True,
        "proof_boundary": master["proof_boundary"],
    }
    OUTPUT.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    print(payload["status"])
    print("FINITE", payload["finite_partition"])
    print("SOURCE", sha256(Path(__file__)))
    print("REPORT", sha256(OUTPUT))


if __name__ == "__main__":
    main()
