#!/usr/bin/env python3
"""Fail-closed assembler for the complete Delta0/new-leaf mask-2 endpoint."""

from __future__ import annotations

import hashlib
import json
from pathlib import Path


HERE = Path(__file__).resolve().parent
OUTPUT = HERE / "rank8_delta0_new_leaf_mask2_complete_agent_20260823.json"

EXPECTED = {
    "analyze_rank8_delta0_new_leaf_mask2_selected_boundary_agent.py": "0BE8B2DA0E2604FE2997D4544CE1F98BCC972BBAAD6D87BEDAA46524A5FC0272",
    "rank8_delta0_new_leaf_mask2_selected_boundary_agent_20260823.json": "E32A7E2BE4B7D73A0823DA5D0583B385FA14F0D8F0BCAD38E8B774A92C329DB7",
    "probe_rank8_delta0_new_leaf_mask2_quantitative_gap_tail_agent.py": "45C845D8CBAED860A85B8077FF14B48A8D785F97ABE69CB319E1881FCECF1FC8",
    "rank8_delta0_new_leaf_mask2_quantitative_gap_tail_probe_agent_20260823.json": "BDE68AD666B6294BD266145D52D8F0433C2DF0385BCE6E76B911E9C1A912957A",
    "audit_rank8_delta0_new_leaf_mask2_quantitative_gap_tail_agent.py": "2ABD786B10A01DABCDA464F033924055D7D4AB893ADB2517421EC20F15F91CFA",
    "rank8_delta0_new_leaf_mask2_quantitative_gap_tail_independent_audit_agent_20260823.json": "5562AA56E4720D7E38B060C5172997514E416655CE1F10B28AC2AF7F3572D1A3",
    "prove_rank8_delta0_new_leaf_mask2_r1_9_tail_agent.py": "255BE721792311DEB3F5534FD850CF82C7E5CBAAC2BA8829197AD077F847998D",
    "rank8_delta0_new_leaf_mask2_r1_9_tail_exact_agent_20260823.json": "D7E291E033190D5B597B49631DBD6F9D7946BC968C4CE9A8B4307CAA93D81FB5",
    "audit_rank8_delta0_new_leaf_mask2_r1_9_tail_agent.py": "7A8150041D79AD53CE0208827012D4E7FC1DB231E8E18A6A81F9ACD7C3D9AF4F",
    "rank8_delta0_new_leaf_mask2_r1_9_tail_independent_audit_agent_20260823.json": "8F65487734B0D4E4D4E3E594C8EBCE018C715FBD8B3CC1A2214364FFA95B1E46",
    "prove_rank8_delta0_new_leaf_mask2_m0_15_tail_agent.py": "C43BB30E8FC685EB1972BB7D3CADBE37DE5016146BE8B9CF9DFA7299C43D0A47",
    "rank8_delta0_new_leaf_mask2_m0_15_tail_exact_agent_20260823.json": "0BF89B7911EF2771D7D55E5630876F5B1E712957AECBF094E30C13206999705B",
    "audit_rank8_delta0_new_leaf_mask2_m0_15_tail_agent.py": "D5B66B7AFF95B4F230B454C61905CE4F9DD07407FA50679DBAD039602C031C00",
    "rank8_delta0_new_leaf_mask2_m0_15_tail_independent_audit_agent_20260823.json": "E31E6B2A75C742034E77E4084CBA967C6F8ACC05A97B8E60C5B092F21DEFF15D",
    "prove_rank8_delta0_new_leaf_mask2_n26_39_middle_agent.py": "80ED28E1B45E6AF17171C3FD5B599EC7CCAEE21D79F54F550859EA6D28EA7FCA",
    "rank8_delta0_new_leaf_mask2_n26_39_middle_exact_agent_20260823.json": "DF5D8C45A4C7EC2FEE88553EC14B06EC501E29DC4BD0652484915FF4D7B005A9",
    "audit_rank8_delta0_new_leaf_mask2_n26_39_middle_agent.py": "BD2487FF35C54C37D08B7CD74450712103DD039D048DE244D638E2F2231A6660",
    "rank8_delta0_new_leaf_mask2_n26_39_middle_independent_audit_agent_20260823.json": "68D4104DA2E90F95D1B282CB1BB5B94CD6674E8ED1E38B1441395BAFB35870F1",
    "prove_rank8_delta0_new_leaf_mask2_n26_39_r1_9_agent.py": "235232E7EAD8D184EF141EC68AAB9E1AE7A1618D8F6EAE422392D34FEB4DFAD3",
    "rank8_delta0_new_leaf_mask2_n26_39_r1_9_exact_agent_20260823.json": "AE906C35B008A0D4C2D0115B78A95F064B4E1CD3E43B0C7249810E199E9B6E87",
    "audit_rank8_delta0_new_leaf_mask2_n26_39_r1_9_agent.py": "226D7ABCF56684E9AB06E89A69E33AD4B312B4615FEE768BEF9E41AE2FDC2382",
    "rank8_delta0_new_leaf_mask2_n26_39_r1_9_independent_audit_agent_20260823.json": "B4C6D797F6E9A892559D22583CC51F266EF757F987927574AF54295A3714C589",
    "prove_rank8_delta0_new_leaf_mask2_n26_39_m0_15_agent.py": "B56C9438D36DBF37306E6541B8E38311D55520C842CD07A2E20F00432FCD5202",
    "rank8_delta0_new_leaf_mask2_n26_39_m0_15_exact_agent_20260823.json": "CEE4F34F1BC00C2A763690E9C4F8C64A5FEEB1214930A90B784E3B6A8D668600",
    "audit_rank8_delta0_new_leaf_mask2_n26_39_m0_15_agent.py": "1B5E41C599215CF1943C88B75940221CEBC43647EE5EECF2EE6DBC027A9E69FE",
    "rank8_delta0_new_leaf_mask2_n26_39_m0_15_independent_audit_agent_20260823.json": "E74AADB92CFE5106455DC4280056175CFF5F72463988474DB177DAB13AB9201C",
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
    reports = {
        "structural": load("rank8_delta0_new_leaf_mask2_selected_boundary_agent_20260823.json"),
        "middle_tail": load("rank8_delta0_new_leaf_mask2_quantitative_gap_tail_probe_agent_20260823.json"),
        "middle_tail_audit": load("rank8_delta0_new_leaf_mask2_quantitative_gap_tail_independent_audit_agent_20260823.json"),
        "low_tail": load("rank8_delta0_new_leaf_mask2_r1_9_tail_exact_agent_20260823.json"),
        "low_tail_audit": load("rank8_delta0_new_leaf_mask2_r1_9_tail_independent_audit_agent_20260823.json"),
        "small_tail": load("rank8_delta0_new_leaf_mask2_m0_15_tail_exact_agent_20260823.json"),
        "small_tail_audit": load("rank8_delta0_new_leaf_mask2_m0_15_tail_independent_audit_agent_20260823.json"),
        "middle": load("rank8_delta0_new_leaf_mask2_n26_39_middle_exact_agent_20260823.json"),
        "middle_audit": load("rank8_delta0_new_leaf_mask2_n26_39_middle_independent_audit_agent_20260823.json"),
        "low": load("rank8_delta0_new_leaf_mask2_n26_39_r1_9_exact_agent_20260823.json"),
        "low_audit": load("rank8_delta0_new_leaf_mask2_n26_39_r1_9_independent_audit_agent_20260823.json"),
        "small": load("rank8_delta0_new_leaf_mask2_n26_39_m0_15_exact_agent_20260823.json"),
        "small_audit": load("rank8_delta0_new_leaf_mask2_n26_39_m0_15_independent_audit_agent_20260823.json"),
    }
    expected_statuses = {
        "structural": "PASS_EXACT_MASK2_STRUCTURAL_GATE_EXTRACTED_NO_SIGN_CLAIM",
        "middle_tail": "PASS_EXACT_BERNSTEIN_METHOD_MASK2_MIDDLE_TAIL",
        "middle_tail_audit": "PASS_INDEPENDENT_LITERAL_DELTA0_NEW_LEAF_MASK2_N40_R10_M16_TAIL",
        "low_tail": "PASS_EXACT_DELTA0_NEW_LEAF_MASK2_N40_R1_9_TAIL",
        "low_tail_audit": "PASS_INDEPENDENT_LITERAL_DELTA0_NEW_LEAF_MASK2_N40_R1_9_TAIL",
        "small_tail": "PASS_EXACT_DELTA0_NEW_LEAF_MASK2_M0_15_COMPLETE",
        "small_tail_audit": "PASS_INDEPENDENT_LITERAL_DELTA0_NEW_LEAF_MASK2_M0_15_COMPLETE",
        "middle": "PASS_EXACT_DELTA0_NEW_LEAF_MASK2_N26_39_MIDDLE",
        "middle_audit": "PASS_INDEPENDENT_LITERAL_DELTA0_NEW_LEAF_MASK2_N26_39_MIDDLE",
        "low": "PASS_EXACT_DELTA0_NEW_LEAF_MASK2_N26_39_R1_9_ALL_126",
        "low_audit": "PASS_INDEPENDENT_LITERAL_DELTA0_NEW_LEAF_MASK2_N26_39_R1_9_ALL_126",
        "small": "PASS_EXACT_DELTA0_NEW_LEAF_MASK2_N26_39_M0_15_ALL_224",
        "small_audit": "PASS_INDEPENDENT_LITERAL_DELTA0_NEW_LEAF_MASK2_N26_39_M0_15_ALL_224",
    }
    assert {key: report["status"] for key, report in reports.items()} == expected_statuses
    universe = {(N, r, N - r) for N in range(26, 40) for r in range(1, N + 1)}
    low, middle, small = cells(reports["low"]), cells(reports["middle"]), cells(reports["small"])
    assert (len(universe), len(low), len(middle), len(small)) == (455, 126, 105, 224)
    assert not (low & middle or low & small or middle & small)
    assert low | middle | small == universe
    tail_counts = {"low_r": 0, "middle": 0, "small_m": 0}
    for N in range(40, 401):
        for r in range(1, N + 1):
            m = N - r
            labels = (["low_r"] if r <= 9 else []) + (["middle"] if r >= 10 and m >= 16 else []) + (["small_m"] if m <= 15 else [])
            assert len(labels) == 1
            tail_counts[labels[0]] += 1
    payload = {
        "schema": "rank8-delta0-new-leaf-mask2-complete-v1",
        "status": "PASS_EXACT_INDEPENDENTLY_AUDITED_DELTA0_NEW_LEAF_MASK2_ALL_N_GE_27",
        "theorem_scope": (
            "For every tree A of order n>=27 and attachment vertex v, at the "
            "new-leaf root q=w, the Delta0 gate is nonnegative at mask2: c8 "
            "is at its selected-degree lower endpoint and d7 at the Q6(D) upper endpoint."
        ),
        "endpoint": {
            "N": "n-1>=26",
            "c8": "(N^2-19N-6)c7/(8(N+1))",
            "d7": "d6(12d6-d5)/(14d5)",
        },
        "finite_partition": {"universe": 455, "low_r": len(low), "middle_r10_m16": len(middle), "small_m": len(small), "pairwise_overlap": 0, "gaps": 0},
        "tail_partition": {
            "pieces": ["r<=9", "r>=10 and m>=16", "m<=15"],
            "symbolic_exhaustion": "If r<=9 use low-r; otherwise r>=10 and exactly one of m<=15,m>=16 holds.",
            "symbolic_disjointness": "Middle conflicts with each side; low-r plus small-m implies N<=24, impossible at N>=40.",
            "finite_logic_replay_N40_400": tail_counts,
        },
        "dependency_manifest_sha256": hashes,
        "proof_boundary": (
            "This closes exactly Delta0/q=new-leaf/mask2. Masks0 and 1 are "
            "separate sealed endpoints. Mask3, q=v and other roots, Delta1..3, "
            "full arbitrary-leaf induction, connected Q8, forest unimodality, "
            "and Problem 993 remain open."
        ),
    }
    OUTPUT.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    print(payload["status"])
    print("FINITE", payload["finite_partition"])
    print("DEPENDENCIES", len(hashes))
    print("SOURCE", sha256(Path(__file__)))
    print("REPORT", sha256(OUTPUT))


if __name__ == "__main__":
    main()
