#!/usr/bin/env python3
"""Fail-closed assembler for the complete Delta0/new-leaf mask-3 endpoint."""

from __future__ import annotations

import hashlib
import json
from pathlib import Path


HERE = Path(__file__).resolve().parent
OUTPUT = HERE / "rank8_delta0_new_leaf_mask3_complete_agent_20260823.json"
EXPECTED = {
    "analyze_rank8_delta0_new_leaf_mask3_selected_boundary_agent.py": "817AD03F7B5DB8DDC1FF6D829F785A9255B89C8C36A0FB96A718549321FEDD8A",
    "rank8_delta0_new_leaf_mask3_selected_boundary_agent_20260823.json": "C955863A48FDB178D769762EE9AF8C01D7CB51087D6A0F5B0836E4BD1BFEDFC5",
    "assemble_rank8_delta0_new_leaf_mask3_n26_39_r1_9_complete_agent.py": "5E22D1EE126ACFFE40C5DA810C546E45DCE797CE59CA53F9BC8BFE799F53CCF1",
    "rank8_delta0_new_leaf_mask3_n26_39_r1_9_complete_assembled_agent_20260823.json": "434A2B05ABB203458F58BD49A3BE33AC4EC4DE54BA1E72628048E56C3ED70B3F",
    "audit_rank8_delta0_new_leaf_mask3_n26_39_r1_9_complete_agent.py": "4B342661E0BA7C1BC10D17A9C0555963FE67D966EF4A03AB21D2C4DD98D16A25",
    "rank8_delta0_new_leaf_mask3_n26_39_r1_9_complete_independent_audit_agent_20260823.json": "D7C52E13D22307127354DA22370CBA59EB9667F2E772672F325AF97B796243F8",
    "assemble_rank8_delta0_new_leaf_mask3_n26_39_middle_complete_agent.py": "B22AF06555FB70237C11C6AB312F6DB23754AC0FD802CE5B39747EC1168BBD65",
    "rank8_delta0_new_leaf_mask3_n26_39_middle_complete_assembled_agent_20260823.json": "86324524111FE152AB1856AC000D5DE9989E103ADC873D71B1B14D49DAA9FDA1",
    "audit_rank8_delta0_new_leaf_mask3_n26_39_middle_complete_agent.py": "7FFC3A97088CD5FBBFA7CA34E4DDC4536978C55CE1F1FB9CCE197B86D4F930D7",
    "rank8_delta0_new_leaf_mask3_n26_39_middle_complete_independent_audit_agent_20260823.json": "14A8E47DB52FE05A77F535AF0A32E689764E0DA1FB11435ADBDF46BCA648C7D8",
    "assemble_rank8_delta0_new_leaf_mask3_n26_39_m0_15_complete_agent.py": "17797B1EBE3B750E524602D2AC8A07DAD89BB6006D89D9D90A2BE7CD0ABCA8ED",
    "rank8_delta0_new_leaf_mask3_n26_39_m0_15_complete_assembled_agent_20260823.json": "582EE9A42AFC0F3B2F595B83CB2EEBE6CF302D7B03ACA6EA919F870C3D9EF047",
    "audit_rank8_delta0_new_leaf_mask3_n26_39_m0_15_complete_agent.py": "B114DAC1D7DBEF36525D08C34436EE3260E7E1CC0082477368A16383B9EDC7A9",
    "rank8_delta0_new_leaf_mask3_n26_39_m0_15_complete_independent_audit_agent_20260823.json": "660EB71BBF2DEB3F8434AE7E00DF7651858C2030869FC4E9FB5D9A71E12A441D",
    "prove_rank8_delta0_new_leaf_mask3_r1_9_tail_agent.py": "59FEA0C649A8793F476E100D72C807901EB03AA829652DAA610E7D1220ABADA5",
    "rank8_delta0_new_leaf_mask3_r1_9_tail_exact_agent_20260823.json": "436C02848EB9824B8FC392CFFE96246EF182F750EADB3E0631822C4F994360A5",
    "audit_rank8_delta0_new_leaf_mask3_r1_9_tail_agent.py": "0659B52EF89642FB1DE21DBC66BA211FA294CD5B40B0D610B308FCA307D31100",
    "rank8_delta0_new_leaf_mask3_r1_9_tail_independent_audit_agent_20260823.json": "B9C29730B98A97344FB9D9D019C9BB0B79407450E6A6ABA054799FE17BFFB8E2",
    "probe_rank8_delta0_new_leaf_mask3_quantitative_gap_tail_agent.py": "D2E1A1D6420B276B7AB2FA79E92EB1061FA7FB5DACE69855F850DC22BDCE4544",
    "rank8_delta0_new_leaf_mask3_quantitative_gap_tail_probe_agent_20260823.json": "20C6C73F47A4B2CACCBFF69125BC54F21C415AA7BB2E977314052DABD02599BF",
    "audit_rank8_delta0_new_leaf_mask3_quantitative_gap_tail_agent.py": "A907744740C12E53A07E9710B8E2BBC1DC44B255D4107B5DBEB639FB4F3998A3",
    "rank8_delta0_new_leaf_mask3_quantitative_gap_tail_independent_audit_agent_20260823.json": "C9354A2F3A9F70E6C72642C17DBF2D9002BC438E05773456B15DCF371430D26B",
    "prove_rank8_delta0_new_leaf_mask3_m0_15_tail_agent.py": "7CD1C84B014DA93ED2719C9F33666DCAAC714D44AA4D469AEDC4CC31CE608DD1",
    "rank8_delta0_new_leaf_mask3_m0_15_tail_exact_agent_20260823.json": "93CD5015D81BD1403820FF21FC39CBC209568D26FD62D872B3C376E364C60C73",
    "audit_rank8_delta0_new_leaf_mask3_m0_15_tail_agent.py": "D15C30D4BA63D39452885E056A6AFE8B8750C13B7B9207F0CE52446F2034D789",
    "rank8_delta0_new_leaf_mask3_m0_15_tail_independent_audit_agent_20260823.json": "A1C2B4EE73EE301921CBFCA9E1505E5A12394B538A9F1B5B23353E78C9D607A5",
}


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def load(name: str):
    return json.loads((HERE / name).read_text(encoding="utf-8"))


def cells(report):
    return {(row["N"], row["r"], row["m"]) for row in report["rows"]}


def main() -> None:
    hashes = {name: sha256(HERE / name) for name in EXPECTED}
    assert hashes == EXPECTED, (hashes, EXPECTED)
    structural = load("rank8_delta0_new_leaf_mask3_selected_boundary_agent_20260823.json")
    low = load("rank8_delta0_new_leaf_mask3_n26_39_r1_9_complete_assembled_agent_20260823.json")
    low_audit = load("rank8_delta0_new_leaf_mask3_n26_39_r1_9_complete_independent_audit_agent_20260823.json")
    middle = load("rank8_delta0_new_leaf_mask3_n26_39_middle_complete_assembled_agent_20260823.json")
    middle_audit = load("rank8_delta0_new_leaf_mask3_n26_39_middle_complete_independent_audit_agent_20260823.json")
    small = load("rank8_delta0_new_leaf_mask3_n26_39_m0_15_complete_assembled_agent_20260823.json")
    small_audit = load("rank8_delta0_new_leaf_mask3_n26_39_m0_15_complete_independent_audit_agent_20260823.json")
    assert structural["status"] == "PASS_EXACT_MASK3_STRUCTURAL_GATE_EXTRACTED_NO_SIGN_CLAIM"
    assert low["status"] == "PASS_EXACT_DELTA0_NEW_LEAF_MASK3_N26_39_R1_9_ALL_126"
    assert low_audit["status"] == "PASS_INDEPENDENT_NO_GAP_DELTA0_NEW_LEAF_MASK3_N26_39_R1_9_ALL_126"
    assert middle["status"] == "PASS_EXACT_DELTA0_NEW_LEAF_MASK3_N26_39_MIDDLE_ALL_105"
    assert middle_audit["status"] == "PASS_INDEPENDENT_NO_GAP_DELTA0_NEW_LEAF_MASK3_N26_39_MIDDLE_ALL_105"
    assert small["status"] == "PASS_EXACT_INDEPENDENTLY_AUDITED_MASK3_N26_39_SMALL_M_ALL_224"
    assert small_audit["status"] == "PASS_INDEPENDENT_NO_GAP_MASK3_N26_39_SMALL_M_ALL_224"
    tail_statuses = [
        load("rank8_delta0_new_leaf_mask3_r1_9_tail_exact_agent_20260823.json")["status"],
        load("rank8_delta0_new_leaf_mask3_r1_9_tail_independent_audit_agent_20260823.json")["status"],
        load("rank8_delta0_new_leaf_mask3_quantitative_gap_tail_probe_agent_20260823.json")["status"],
        load("rank8_delta0_new_leaf_mask3_quantitative_gap_tail_independent_audit_agent_20260823.json")["status"],
        load("rank8_delta0_new_leaf_mask3_m0_15_tail_exact_agent_20260823.json")["status"],
        load("rank8_delta0_new_leaf_mask3_m0_15_tail_independent_audit_agent_20260823.json")["status"],
    ]
    assert all(status.startswith("PASS_") for status in tail_statuses)
    universe = {(N, r, N - r) for N in range(26, 40) for r in range(1, N + 1)}
    low_cells, middle_cells, small_cells = cells(low), cells(middle), cells(small)
    assert (len(universe), len(low_cells), len(middle_cells), len(small_cells)) == (455, 126, 105, 224)
    assert not (low_cells & middle_cells or low_cells & small_cells or middle_cells & small_cells)
    assert low_cells | middle_cells | small_cells == universe
    tail_counts = {"low_r": 0, "middle": 0, "small_m": 0}
    for N in range(40, 401):
        for r in range(1, N + 1):
            m = N - r
            labels = (["low_r"] if r <= 9 else []) + (["middle"] if r >= 10 and m >= 16 else []) + (["small_m"] if m <= 15 else [])
            assert len(labels) == 1
            tail_counts[labels[0]] += 1
    payload = {
        "schema": "rank8-delta0-new-leaf-mask3-complete-v1",
        "status": "PASS_EXACT_INDEPENDENTLY_AUDITED_DELTA0_NEW_LEAF_MASK3_ALL_N_GE_27",
        "theorem_scope": "For every tree A of order n>=27 and attachment vertex v, at the inserted-leaf root q, the Delta0 gate is nonnegative at mask3 (Q7(C)-upper c8 and Q6(D)-upper d7).",
        "finite_partition": {"universe": 455, "low_r": 126, "middle_r10_m16": 105, "small_m": 224, "overlap": 0, "gap": 0},
        "tail_partition": {"pieces": ["r<=9", "r>=10 and m>=16", "m<=15"], "finite_logic_replay_N40_400": tail_counts, "unbounded_logic": "For r<=9 use low-r. Otherwise r>=10 and exactly one of m<=15,m>=16 holds; low-r and small-m would imply N<=24."},
        "dependency_manifest_sha256": hashes,
        "proof_boundary": "This closes exactly Delta0/q=new-leaf/mask3. Other masks are separate endpoint theorems; q=v, other old roots, Delta1..3, full arbitrary-leaf induction, connected Q8, forest unimodality, and Problem 993 remain open.",
    }
    OUTPUT.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    print(payload["status"])
    print("FINITE", payload["finite_partition"])
    print("SOURCE", sha256(Path(__file__)))
    print("REPORT", sha256(OUTPUT))


if __name__ == "__main__":
    main()
