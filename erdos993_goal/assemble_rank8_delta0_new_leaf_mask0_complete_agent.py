#!/usr/bin/env python3
"""Fail-closed all-order assembler for the Delta0 new-leaf mask-0 theorem."""

from __future__ import annotations

import hashlib
import json
from pathlib import Path


HERE = Path(__file__).resolve().parent
OUTPUT = HERE / "rank8_delta0_new_leaf_mask0_complete_agent_20260823.json"
EXPECTED = {
    "prove_rank8_delta0_new_leaf_mask0_quantitative_gap_tail_agent.py": "72EC9021601A3AA83F72619DB7F101A710CBB3CA2704253D7CBE83C93019B8B8",
    "rank8_delta0_new_leaf_mask0_quantitative_gap_tail_exact_agent_20260823.json": "F819957E6ED732FF5BF1E571C7256D60BF6D9F6AAB493C1C787FABA8F5D745E2",
    "audit_rank8_delta0_new_leaf_mask0_quantitative_gap_tail_agent.py": "2669A0750A7E03CDBB9199257B5243EA21158550CF716C6C0AA1E4911005CD8D",
    "rank8_delta0_new_leaf_mask0_quantitative_gap_tail_independent_audit_agent_20260823.json": "08BF3CA4E81D1F78DDC369DD9E30D2F29F4E3906F6BD4DF64777D876B64FFBF9",
    "prove_rank8_delta0_new_leaf_mask0_r1_9_tail_agent.py": "12AE3CDC463B771A0DAE7CC444D641070DE49C78DF52D96132205160063ACA89",
    "rank8_delta0_new_leaf_mask0_r1_9_tail_exact_agent_20260823.json": "4254DFCEDAD08878FBC2EF95142A7BB5C5DD5F92D0D3FCCEA6DAC8ED5AD57812",
    "audit_rank8_delta0_new_leaf_mask0_r1_9_tail_agent.py": "942285AE638139CD82D6496641D4FEDFF5C9C5F0934B6C0D684597931F7F916A",
    "rank8_delta0_new_leaf_mask0_r1_9_tail_independent_audit_agent_20260823.json": "661CBCF1F532EA1F67D3FC57D1576698787E0D67096A287EEC25504977F226EC",
    "prove_rank8_delta0_new_leaf_mask0_m0_15_tail_agent.py": "9ED7D1BEE73B16DC4A2217183CC2D653496282398CF920671D663A924F6AB8F7",
    "rank8_delta0_new_leaf_mask0_m0_15_tail_exact_agent_20260823.json": "8C4393794E496FF8C592D7E1E2E5ACA580D3B047CE54C35F968039FA71107D8A",
    "audit_rank8_delta0_new_leaf_mask0_m0_15_tail_agent.py": "DB9673079FF73E5BEC463C940B7E9B2F74953BE3AA0128F9F9A3C142663E7E54",
    "rank8_delta0_new_leaf_mask0_m0_15_tail_independent_audit_agent_20260823.json": "95A57499E10C9B3D012121B93C7D32DBA70896BBFEBE9D7043D2894BC8F0FF32",
    "assemble_rank8_delta0_new_leaf_mask0_n26_39_quantitative_gap_agent.py": "622D1A2E3AE8525DE1516904544AE319CF3FCB3FFF2308C9403081F5CAEF971E",
    "rank8_delta0_new_leaf_mask0_n26_39_quantitative_gap_registry_agent_20260823.json": "8551E3E7FDDC6EDBA78C4F68A300A6525CDD539BE957DE15033F2FFDED3FA753",
    "audit_rank8_delta0_new_leaf_mask0_n26_39_quantitative_gap_agent.py": "7C5E1C47AFB227900C627D5E66A2C0EB8F14FF3156484E153B8762356561534D",
    "rank8_delta0_new_leaf_mask0_n26_39_quantitative_gap_registry_independent_audit_agent_20260823.json": "6E6872E615F74D207C2D6F3D192CDBB0D799437C15AE40DD7E2352F6BD83E232",
    "prove_rank8_delta0_new_leaf_mask0_19_diagonal_agent.py": "FB0A422F3E601B9C5757F8D740C1C17576322D46196B882D7141016804CE3338",
    "rank8_delta0_new_leaf_mask0_19_diagonal_exact_agent_20260823.json": "C7AD3BEB20A543F7D06EE84D6501F33454EEC2265C541570B42F0DE7CCBAC3B2",
    "audit_rank8_delta0_new_leaf_mask0_19_diagonal_agent.py": "FC0B6FC05F24186B29C4FF780D58349573BD65D010C3D93C90DA67325BECBC89",
    "rank8_delta0_new_leaf_mask0_19_diagonal_independent_audit_agent_20260823.json": "264DF9A4D588E0EF8779D4F1F7FFC9596F72B324C93CCE9A9C5829D82D83D0D8",
    "prove_rank8_delta0_new_leaf_mask0_n26_39_r1_9_agent.py": "F2E781BE981223EC4BCCCF270A2448A42913C0C4E5FBC411D11DAABB5B23227D",
    "rank8_delta0_new_leaf_mask0_n26_39_r1_9_exact_agent_20260823.json": "9F3E2DBF88F757B4AD4742607CF3A0C56E6A94D2B998E729397F85B1B59148CC",
    "audit_rank8_delta0_new_leaf_mask0_n26_39_r1_9_agent.py": "ACD653E5882C86DCA983D3DCE6FB2253C95B5EF20124186CBA48457CE4F2822C",
    "rank8_delta0_new_leaf_mask0_n26_39_r1_9_independent_audit_agent_20260823.json": "EF61C989DB862DF59B6C4A33875E52DFB2A6C1E49E6D8744BFFEA51735FEDF08",
    "prove_rank8_delta0_new_leaf_mask0_n26_39_m0_15_agent.py": "6FF89B861D52AA54F1F15F7525B6B1C39EAF5FC9FA21ED38DAF0E0E49F31DF73",
    "rank8_delta0_new_leaf_mask0_n26_39_m0_15_exact_agent_20260823.json": "6ABD067524A591FC0F9DA3C497EA8C85412AA4ECC4C04587097C01DFC841752F",
    "audit_rank8_delta0_new_leaf_mask0_n26_39_m0_15_agent.py": "0CCA91CFB7288CFF0DC355C9D2F9DE0CA1055789205EB4919B062E4210CD3DFC",
    "rank8_delta0_new_leaf_mask0_n26_39_m0_15_independent_audit_agent_20260823.json": "B13507A683D43BD9F58E7FD88E92AF15E596E3A174234AA9AC0607615C31CB7B",
}


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def load(name: str):
    return json.loads((HERE / name).read_text(encoding="utf-8"))


def coordinate(row):
    return (int(row["N"]), int(row["r"]), int(row["m"]))


def main() -> None:
    hashes = {name: sha256(HERE / name) for name in EXPECTED}
    assert hashes == EXPECTED, (hashes, EXPECTED)

    tail_large = load("rank8_delta0_new_leaf_mask0_quantitative_gap_tail_exact_agent_20260823.json")
    tail_large_audit = load("rank8_delta0_new_leaf_mask0_quantitative_gap_tail_independent_audit_agent_20260823.json")
    tail_r = load("rank8_delta0_new_leaf_mask0_r1_9_tail_exact_agent_20260823.json")
    tail_r_audit = load("rank8_delta0_new_leaf_mask0_r1_9_tail_independent_audit_agent_20260823.json")
    tail_m = load("rank8_delta0_new_leaf_mask0_m0_15_tail_exact_agent_20260823.json")
    tail_m_audit = load("rank8_delta0_new_leaf_mask0_m0_15_tail_independent_audit_agent_20260823.json")
    middle = load("rank8_delta0_new_leaf_mask0_n26_39_quantitative_gap_registry_agent_20260823.json")
    middle_audit = load("rank8_delta0_new_leaf_mask0_n26_39_quantitative_gap_registry_independent_audit_agent_20260823.json")
    diagonal = load("rank8_delta0_new_leaf_mask0_19_diagonal_exact_agent_20260823.json")
    diagonal_audit = load("rank8_delta0_new_leaf_mask0_19_diagonal_independent_audit_agent_20260823.json")
    low_r = load("rank8_delta0_new_leaf_mask0_n26_39_r1_9_exact_agent_20260823.json")
    low_r_audit = load("rank8_delta0_new_leaf_mask0_n26_39_r1_9_independent_audit_agent_20260823.json")
    small_m = load("rank8_delta0_new_leaf_mask0_n26_39_m0_15_exact_agent_20260823.json")
    small_m_audit = load("rank8_delta0_new_leaf_mask0_n26_39_m0_15_independent_audit_agent_20260823.json")

    assert tail_large["status"] == "PASS_EXACT_DELTA0_NEW_LEAF_MASK0_N40_R10_M16_TAIL"
    assert tail_large_audit["status"].startswith("PASS_INDEPENDENT_LITERAL")
    assert tail_r["status"] == "PASS_EXACT_DELTA0_NEW_LEAF_MASK0_N40_R1_9_TAIL"
    assert tail_r_audit["status"].startswith("PASS_INDEPENDENT_LITERAL")
    assert tail_m["status"] == "PASS_EXACT_DELTA0_NEW_LEAF_MASK0_M0_15_COMPLETE"
    assert tail_m_audit["status"].startswith("PASS_INDEPENDENT_LITERAL")
    assert middle["counts"] == {"total": 105, "sealed": 86, "open": 19}
    assert middle_audit["counts"] == {"total": 105, "sealed": 86, "open": 19}
    assert diagonal["counts"] == {
        "total": 19,
        "edge_concentration_d6_only": 17,
        "edge_concentration_plus_forest16_ratio": 2,
        "open": 0,
    }
    assert diagonal_audit["counts"]["open"] == 0
    assert low_r["counts"]["cells"] == low_r_audit["counts"]["cells"] == 126
    assert small_m["counts"]["cells"] == small_m_audit["counts"]["cells"] == 224

    low_coordinates = {coordinate(row) for row in low_r["rows"]}
    high_coordinates = {coordinate(row) for row in small_m["rows"]}
    middle_coordinates = {coordinate(row) for row in middle["rows"]}
    old_sealed = {
        coordinate(row) for row in middle["rows"] if row["status"] == "SEALED_MASK0"
    }
    old_open = middle_coordinates - old_sealed
    diagonal_coordinates = {coordinate(row) for row in diagonal["rows"]}
    assert (len(low_coordinates), len(high_coordinates), len(middle_coordinates)) == (126, 224, 105)
    assert (len(old_sealed), len(old_open), len(diagonal_coordinates)) == (86, 19, 19)
    assert old_open == diagonal_coordinates
    assert not (low_coordinates & high_coordinates)
    assert not (low_coordinates & middle_coordinates)
    assert not (high_coordinates & middle_coordinates)
    finite_union = low_coordinates | high_coordinates | middle_coordinates
    finite_universe = {
        (N, r, N - r) for N in range(26, 40) for r in range(1, N + 1)
    }
    assert finite_union == finite_universe and len(finite_union) == 455

    # Literal partition replay on a long finite prefix; the all-order reason is
    # the mutually exclusive inequalities displayed in tail_partition.
    tail_counts = {"r_le_9": 0, "r_ge_10_m_ge_16": 0, "m_le_15": 0}
    for N in range(40, 513):
        for r in range(1, N + 1):
            m = N - r
            labels = []
            if r <= 9:
                labels.append("r_le_9")
            if r >= 10 and m >= 16:
                labels.append("r_ge_10_m_ge_16")
            if m <= 15:
                labels.append("m_le_15")
            assert len(labels) == 1, (N, r, m, labels)
            tail_counts[labels[0]] += 1

    payload = {
        "schema": "rank8-delta0-new-leaf-mask0-complete-v1",
        "status": "PASS_EXACT_ASSEMBLED_DELTA0_NEW_LEAF_MASK0_ALL_N_GE_26",
        "theorem": (
            "For every source tree A of order n>=27 and attachment vertex v, "
            "put N=n-1, r=deg_A(v), D=A-v, and F=A-N_A[v].  At the simultaneous "
            "selected-degree lower endpoints for d7 and c8 (mask0), the exact "
            "Delta0 new-leaf-root residual is nonnegative."
        ),
        "finite_partition_N26_39": {
            "universe": 455,
            "r_le_9": 126,
            "r_ge_10_m_ge_16_old_sealed": 86,
            "r_ge_10_m_ge_16_diagonal_completion": 19,
            "m_le_15": 224,
            "gaps": 0,
            "overlaps": 0,
        },
        "tail_partition_N_ge_40": [
            "1<=r<=9",
            "r>=10 and m=N-r>=16",
            "0<=m<=15",
        ],
        "tail_prefix_partition_replay_N40_512": tail_counts,
        "hashes": hashes,
        "proof_boundary": (
            "This is a complete theorem only for Delta0, q equal to the newly "
            "added leaf, and endpoint mask0.  Masks1..3, q=v and other old roots, "
            "Delta1..3, the full arbitrary-leaf induction, connected Q8, and "
            "Problem 993 remain open."
        ),
    }
    OUTPUT.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    print(payload["status"])
    print("FINITE 455 GAPS 0 OVERLAPS 0")
    print("SOURCE", sha256(Path(__file__)))
    print("REPORT", sha256(OUTPUT))


if __name__ == "__main__":
    main()
