#!/usr/bin/env python3
"""Compose all four endpoint masks using exact separate concavity."""

from __future__ import annotations

import hashlib
import json
from pathlib import Path


HERE = Path(__file__).resolve().parent
OUTPUT = HERE / "rank8_delta0_new_leaf_four_mask_complete_agent_20260823.json"
EXPECTED = {
    "analyze_rank8_delta03_arbitrary_leaf_extension_symbolic_agent.py": "CC1F0204C2CBE3B202E35CEB60EBD6FA847CBEF1BE74DD255023198AB3707BAA",
    "rank8_delta03_arbitrary_leaf_extension_symbolic_dependency_agent_20260823.json": "5F378D85698D363468C0D078EDBCD3EC56BE02A18E1D2A56D4497B8DEA0C72DD",
    "assemble_rank8_delta0_new_leaf_mask0_complete_agent.py": "E9051A00810185927B5D52176E8762B81645D47B06BEEA3E98F962B985157362",
    "rank8_delta0_new_leaf_mask0_complete_agent_20260823.json": "CCB6032DB58DB7ED6AB5AA5228842AF27D8892E88170E4099B0BCD1E9B6FA2D3",
    "audit_rank8_delta0_new_leaf_mask0_complete_agent.py": "4C32C133E91AF1533BBB932E68B50E197D01AC9D1C6D4043D163E42561CC3FE5",
    "rank8_delta0_new_leaf_mask0_complete_independent_audit_agent_20260823.json": "763B808F330A901FB8F22B323F8D01ABA8ECA04E68610807474A90098F03322F",
    "assemble_rank8_delta0_new_leaf_mask1_complete_agent.py": "392D03120ECDEDF5E20169485F018C915BC39D93DE9E5935949CD5520C03DEC2",
    "rank8_delta0_new_leaf_mask1_complete_agent_20260823.json": "86939F14C45B06B552BC3CDEAFF4B9906EAF859862FB249778E2638FFC5389E5",
    "audit_rank8_delta0_new_leaf_mask1_complete_agent.py": "3FD92A225EEAD6D95B30A051E1EB087DC5B11F9441A2374E1D4188A361E3B3EF",
    "rank8_delta0_new_leaf_mask1_complete_independent_audit_agent_20260823.json": "7BBD711650B24FCB4BD5A1DED8D713809655032FF99A966B76EFB2B51E5AC507",
    "assemble_rank8_delta0_new_leaf_mask2_complete_agent.py": "481FC574EA1C0E1FF3ACBBCC953544271C7E5C8F583DA587A7E3001741598377",
    "rank8_delta0_new_leaf_mask2_complete_agent_20260823.json": "74380C2537AEDD1C6388CCE6A4AD402D403505F6E4D282BD9B2F8D4E885FE7A6",
    "audit_rank8_delta0_new_leaf_mask2_complete_agent.py": "1C16B0FDC987D580F6B09DA334088D48567B05EB81F517881622929B73A7738A",
    "rank8_delta0_new_leaf_mask2_complete_independent_audit_agent_20260823.json": "DA7BA7D79E5BB2D39CB756D79DAE9602F94660539839250CA9083BDEA1625455",
    "assemble_rank8_delta0_new_leaf_mask3_complete_agent.py": "BB63E26826001F146D59D3AD3F88F692E61CB0326AC142C63781508221D4C504",
    "rank8_delta0_new_leaf_mask3_complete_agent_20260823.json": "54E39867A27798859403937DDFD5318CC3A3DA7C23228DA4C1382C25321B85D7",
    "audit_rank8_delta0_new_leaf_mask3_complete_agent.py": "EAA09FB121AC526970130F84988B91BB22EC5257A2076304B81A4D3DE3CFFE34",
    "rank8_delta0_new_leaf_mask3_complete_independent_audit_agent_20260823.json": "4E7B884477C1C6BC6D8A46E3444C7E4B462E35C133E6303B639DA9D5D6C88998",
}


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def load(name: str):
    return json.loads((HERE / name).read_text(encoding="utf-8"))


def main() -> None:
    hashes = {name: sha256(HERE / name) for name in EXPECTED}
    assert hashes == EXPECTED
    symbolic = load("rank8_delta03_arbitrary_leaf_extension_symbolic_dependency_agent_20260823.json")
    row = symbolic["families"]["new_leaf_root_raw"][0]
    assert row["rank"] == 0
    for variable in ("c8", "d7"):
        derivative = row["top_variable_derivatives"][variable]
        assert derivative["degree"] == 2
        assert derivative["second_derivative"]["orientation"] == "COEFFICIENTWISE_NONPOSITIVE"
    assert symbolic["separate_concavity_reduction"]["sharp_Q_endpoint_corner_counts_by_rank"]["new_leaf_root"][0] == 4
    masks = {
        index: load(f"rank8_delta0_new_leaf_mask{index}_complete_agent_20260823.json")
        for index in range(4)
    }
    audits = {
        index: load(f"rank8_delta0_new_leaf_mask{index}_complete_independent_audit_agent_20260823.json")
        for index in range(4)
    }
    assert masks[0]["status"] == "PASS_EXACT_ASSEMBLED_DELTA0_NEW_LEAF_MASK0_ALL_N_GE_26"
    for index in (1, 2, 3):
        assert "DELTA0_NEW_LEAF_MASK" + str(index) + "_ALL_N_GE_27" in masks[index]["status"]
    assert all(report["status"].startswith("PASS_INDEPENDENT") for report in audits.values())
    payload = {
        "schema": "rank8-delta0-new-leaf-four-mask-complete-v1",
        "status": "PASS_EXACT_INDEPENDENTLY_AUDITED_DELTA0_NEW_LEAF_GATE_ALL_N_GE_27",
        "theorem": "For every source tree A of order n>=27, every attachment vertex v, and the inserted leaf q in A+qv, the complete Delta0 new-leaf-root gate is nonnegative.",
        "admissible_rectangle": {
            "c8": "selected-degree lower endpoint <= c8 <= Q7(C) upper endpoint",
            "d7": "selected-degree lower endpoint <= d7 <= Q6(D) upper endpoint",
            "scope_guard": "n>=27 supplies the forest-Q endpoint hypotheses recorded in the symbolic dependency theorem.",
        },
        "corner_map": {
            "mask0": ["c8 lower", "d7 lower"],
            "mask1": ["c8 upper", "d7 lower"],
            "mask2": ["c8 lower", "d7 upper"],
            "mask3": ["c8 upper", "d7 upper"],
        },
        "composition_lemma": "A separately concave function on a rectangle is at least the minimum of its four corner values: apply the one-variable chord inequality first in c8 and then in d7. The exact gate has coefficientwise nonpositive second derivative in each top coordinate on compatible nonnegative tuples.",
        "corner_statuses": {str(index): masks[index]["status"] for index in range(4)},
        "dependency_manifest_sha256": hashes,
        "proof_boundary": "This closes only Delta0 at the inserted-leaf root. Delta1..3, q=v and other old roots, the complete arbitrary-leaf induction, connected/forest Q8, rank-eight PGC, forest unimodality, and Problem 993 remain open.",
    }
    OUTPUT.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    print(payload["status"])
    print("MASKS 4 CORNERS 4")
    print("SOURCE", sha256(Path(__file__)))
    print("REPORT", sha256(OUTPUT))


if __name__ == "__main__":
    main()
