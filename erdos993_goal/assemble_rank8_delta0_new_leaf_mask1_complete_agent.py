#!/usr/bin/env python3
"""Fail-closed assembler for the complete Delta0/new-leaf mask-1 endpoint."""

from __future__ import annotations

import hashlib
import json
from pathlib import Path


HERE = Path(__file__).resolve().parent
OUTPUT = HERE / "rank8_delta0_new_leaf_mask1_complete_agent_20260823.json"

EXPECTED = {
    "analyze_rank8_delta0_new_leaf_mask1_selected_boundary_agent.py": "64B9399A1C9C6A9DA3AE569AC57080E8D3A8FEFCA0B474AA490370E2D569DE52",
    "rank8_delta0_new_leaf_mask1_selected_boundary_agent_20260823.json": "4851A6D37B2C68FD8FEECFDA2F94247C3B02CBF21EDEB035ED413FE427299DBF",
    "probe_rank8_delta0_new_leaf_mask1_quantitative_gap_tail_agent.py": "E940D77A3E2CDD947BFDC381C5655ABE09DC882ABF6B308E09BE44F92FED61D0",
    "rank8_delta0_new_leaf_mask1_quantitative_gap_tail_probe_agent_20260823.json": "BFA9D916DD89EEFA85F99B6778A5D72D886CA2671AD19AAE7F97591BD7ADE05A",
    "audit_rank8_delta0_new_leaf_mask1_quantitative_gap_tail_agent.py": "9486A9D826F1F326E2DF9E0CA102DE8030CAEBA5C18027E50344052A27DB9E40",
    "rank8_delta0_new_leaf_mask1_quantitative_gap_tail_independent_audit_agent_20260823.json": "C95CC2A571DD8156F9415D3EB37D057C05C6270C9DA3FB30C52687AE2FBF907D",
    "prove_rank8_delta0_new_leaf_mask1_r1_9_tail_agent.py": "6914E9A0C22A09DE8F09268610A77C70C10F9762BCFC2D20761D2A600D015ED3",
    "rank8_delta0_new_leaf_mask1_r1_9_tail_exact_agent_20260823.json": "7B71337C4B2B036692097276AD905743271FBBBFE696795961B5083B7CD4DDFF",
    "audit_rank8_delta0_new_leaf_mask1_r1_9_tail_agent.py": "69E7BC4C67D4597114CAAB0B0525ED010CD2FB19345DE2A2B9CCB0C7275FF994",
    "rank8_delta0_new_leaf_mask1_r1_9_tail_independent_audit_agent_20260823.json": "3F85C720747D6E897CFB797F809D7A5CC5D1296B777B2E8EF74E49B4AF5BC814",
    "prove_rank8_delta0_new_leaf_mask1_m0_15_tail_agent.py": "86EE6713FC6105280612E8252E91B31DCF1E92CD972BC0F1B5B046652EE14158",
    "rank8_delta0_new_leaf_mask1_m0_15_tail_exact_agent_20260823.json": "4856E32BE9CC08176F2FC354FA7586FCC5BAE663CC8D4304D1CA329D629E3D95",
    "audit_rank8_delta0_new_leaf_mask1_m0_15_tail_agent.py": "7F285099759E1E103C9F6AF6D72A12B98A224D07A3BC0EBDD0A2F4B48BEF35C9",
    "rank8_delta0_new_leaf_mask1_m0_15_tail_independent_audit_agent_20260823.json": "896076E36CFA0DF10373F7B3A8188B35F64374A9AE3A369C91DA5A03AE6E603D",
    "prove_rank8_delta0_new_leaf_mask1_n26_39_middle_agent.py": "2AB6AEE4888F633870C1E56E6D43AA26BAA799C9295737C4440C93CBFC3EA7D3",
    "rank8_delta0_new_leaf_mask1_n26_39_middle_exact_agent_20260823.json": "EADDEDDF23EE824C038A577E12A772A67BA0C7F429B69CE59CAF927A2A97C23E",
    "audit_rank8_delta0_new_leaf_mask1_n26_39_middle_agent.py": "83360CFE022C28DCEEE2645C8C583654924AC366F2C32C2AE4A300128ECE0167",
    "rank8_delta0_new_leaf_mask1_n26_39_middle_independent_audit_agent_20260823.json": "1DF68E6C3DD26F85F2CEE310C8298B3D93AD8BAE87BCDB1761E67F8865BF6BFB",
    "prove_rank8_delta0_new_leaf_mask1_n26_39_r1_9_agent.py": "DA6DDEA49673BF5B0931FC8660F675A7F67D755DA8522BC4768D93479D8807FF",
    "rank8_delta0_new_leaf_mask1_n26_39_r1_9_exact_agent_20260823.json": "4F0D074279A887D0E6A46DF7E502C779CC5C33C1D3E2F1CC6F935436B6EEDC8F",
    "audit_rank8_delta0_new_leaf_mask1_n26_39_r1_9_agent.py": "879011FF431DD2C1763C675F93B53A06AF850C0BF212DDF738A69181CC67B307",
    "rank8_delta0_new_leaf_mask1_n26_39_r1_9_independent_audit_agent_20260823.json": "DCB815B1C6DD5A1B24C2413979B619D6B80D5DC745B8A4D18DAF3A9A477E22AF",
    "prove_rank8_delta0_new_leaf_mask1_n26_39_m0_15_agent.py": "75374FA0811C2C97836DBB2C2C23BA378F879F4AC50ADACAFE5A41FDDBC6CCE3",
    "rank8_delta0_new_leaf_mask1_n26_39_m0_15_exact_agent_20260823.json": "6E2A5A22CDD7104B326A116A2EF6988E2A85528891EE9F4188301C71CDDD0FE8",
    "audit_rank8_delta0_new_leaf_mask1_n26_39_m0_15_agent.py": "E915AA710569374E11FEE42D706A68F9713EDF69FEA52CA9FD386E3C68760368",
    "rank8_delta0_new_leaf_mask1_n26_39_m0_15_independent_audit_agent_20260823.json": "E5846022E2A22F1513023050C833793452207F1D480A0D9F110EF73507AF9F51",
}


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def load(name: str):
    return json.loads((HERE / name).read_text(encoding="utf-8"))


def coordinates(report, order):
    return {
        tuple(row[key] for key in order)
        for row in report["rows"]
    }


def main() -> None:
    hashes = {name: sha256(HERE / name) for name in EXPECTED}
    assert hashes == EXPECTED, (hashes, EXPECTED)
    structural = load("rank8_delta0_new_leaf_mask1_selected_boundary_agent_20260823.json")
    middle_tail = load("rank8_delta0_new_leaf_mask1_quantitative_gap_tail_probe_agent_20260823.json")
    middle_tail_audit = load("rank8_delta0_new_leaf_mask1_quantitative_gap_tail_independent_audit_agent_20260823.json")
    low_tail = load("rank8_delta0_new_leaf_mask1_r1_9_tail_exact_agent_20260823.json")
    low_tail_audit = load("rank8_delta0_new_leaf_mask1_r1_9_tail_independent_audit_agent_20260823.json")
    small_tail = load("rank8_delta0_new_leaf_mask1_m0_15_tail_exact_agent_20260823.json")
    small_tail_audit = load("rank8_delta0_new_leaf_mask1_m0_15_tail_independent_audit_agent_20260823.json")
    finite_middle = load("rank8_delta0_new_leaf_mask1_n26_39_middle_exact_agent_20260823.json")
    finite_middle_audit = load("rank8_delta0_new_leaf_mask1_n26_39_middle_independent_audit_agent_20260823.json")
    finite_low = load("rank8_delta0_new_leaf_mask1_n26_39_r1_9_exact_agent_20260823.json")
    finite_low_audit = load("rank8_delta0_new_leaf_mask1_n26_39_r1_9_independent_audit_agent_20260823.json")
    finite_small = load("rank8_delta0_new_leaf_mask1_n26_39_m0_15_exact_agent_20260823.json")
    finite_small_audit = load("rank8_delta0_new_leaf_mask1_n26_39_m0_15_independent_audit_agent_20260823.json")

    assert structural["status"] == "PASS_EXACT_MASK1_STRUCTURAL_GATE_EXTRACTED_NO_SIGN_CLAIM"
    assert middle_tail["status"] == "PASS_EXACT_BERNSTEIN_METHOD_MASK1_MIDDLE_TAIL"
    assert middle_tail_audit["status"] == "PASS_INDEPENDENT_LITERAL_DELTA0_NEW_LEAF_MASK1_N40_R10_M16_TAIL"
    assert low_tail["status"] == "PASS_EXACT_DELTA0_NEW_LEAF_MASK1_N40_R1_9_TAIL"
    assert low_tail_audit["status"] == "PASS_INDEPENDENT_LITERAL_DELTA0_NEW_LEAF_MASK1_N40_R1_9_TAIL"
    assert small_tail["status"] == "PASS_EXACT_DELTA0_NEW_LEAF_MASK1_M0_15_COMPLETE"
    assert small_tail_audit["status"] == "PASS_INDEPENDENT_LITERAL_DELTA0_NEW_LEAF_MASK1_M0_15_COMPLETE"
    assert finite_middle["status"] == "PASS_EXACT_DELTA0_NEW_LEAF_MASK1_N26_39_MIDDLE"
    assert finite_middle_audit["status"] == "PASS_INDEPENDENT_LITERAL_DELTA0_NEW_LEAF_MASK1_N26_39_MIDDLE"
    assert finite_low["status"] == "PASS_EXACT_DELTA0_NEW_LEAF_MASK1_N26_39_R1_9_ALL_126"
    assert finite_low_audit["status"] == "PASS_INDEPENDENT_LITERAL_DELTA0_NEW_LEAF_MASK1_N26_39_R1_9_ALL_126"
    assert finite_small["status"] == "PASS_EXACT_DELTA0_NEW_LEAF_MASK1_N26_39_M0_15_ALL_224"
    assert finite_small_audit["status"] == "PASS_INDEPENDENT_LITERAL_DELTA0_NEW_LEAF_MASK1_N26_39_M0_15_ALL_224"

    universe = {(N, r, N - r) for N in range(26, 40) for r in range(1, N + 1)}
    low = coordinates(finite_low, ("N", "r", "m"))
    middle = coordinates(finite_middle, ("N", "r", "m"))
    small = coordinates(finite_small, ("N", "r", "m"))
    assert len(universe) == 455
    assert (len(low), len(middle), len(small)) == (126, 105, 224)
    assert not (low & middle or low & small or middle & small)
    assert low | middle | small == universe

    # Finite verification of the exact predicates over a much larger initial
    # segment supplements the two-line symbolic dichotomy recorded below.
    tail_counts = {"low_r": 0, "middle": 0, "small_m": 0}
    for N in range(40, 401):
        for r in range(1, N + 1):
            m = N - r
            labels = []
            if r <= 9:
                labels.append("low_r")
            if r >= 10 and m >= 16:
                labels.append("middle")
            if m <= 15:
                labels.append("small_m")
            assert len(labels) == 1
            tail_counts[labels[0]] += 1

    payload = {
        "schema": "rank8-delta0-new-leaf-mask1-complete-v1",
        "status": "PASS_EXACT_INDEPENDENTLY_AUDITED_DELTA0_NEW_LEAF_MASK1_ALL_N_GE_27",
        "theorem_scope": (
            "For every tree A of order n>=27 and attachment vertex v, at the "
            "new-leaf root q=w, the Delta0 gate is nonnegative at mask1: "
            "d7 is at its selected-degree lower endpoint and c8 at the Q7(C) upper endpoint."
        ),
        "endpoint": {
            "N": "n-1>=26",
            "d7": "(N^2-18N+12)d6/(7N)",
            "c8": "c7(14c7-c6)/(16c6)",
        },
        "finite_partition": {
            "universe": 455,
            "low_r": len(low),
            "middle_r10_m16": len(middle),
            "small_m": len(small),
            "pairwise_overlap": 0,
            "gaps": 0,
        },
        "tail_partition": {
            "pieces": ["r<=9", "r>=10 and m>=16", "m<=15"],
            "symbolic_exhaustion": (
                "If r<=9 use the first piece. Otherwise r>=10, and the integer "
                "dichotomy m<=15 or m>=16 gives exactly one of the last two pieces."
            ),
            "symbolic_disjointness": (
                "The middle piece conflicts with each side inequality. The two "
                "side pieces would imply N=r+m<=24, impossible for N>=40."
            ),
            "finite_logic_replay_N40_400": tail_counts,
        },
        "dependency_manifest_sha256": hashes,
        "proof_boundary": (
            "This closes exactly Delta0/q=new-leaf/mask1. Mask0 is a separate "
            "sealed endpoint theorem. Masks2 and 3, q=v and other old roots, "
            "Delta1..3, the full arbitrary-leaf induction, connected Q8, forest "
            "unimodality, and Problem 993 remain open."
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
