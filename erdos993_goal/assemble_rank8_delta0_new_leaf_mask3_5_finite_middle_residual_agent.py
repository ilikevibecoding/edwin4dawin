#!/usr/bin/env python3
"""Fail-closed assembler for the five last finite-middle mask-3 cells."""

from __future__ import annotations

import hashlib
import json
from pathlib import Path


HERE = Path(__file__).resolve().parent
OUTPUT = HERE / "rank8_delta0_new_leaf_mask3_5_finite_middle_residual_assembled_agent_20260823.json"
EXPECTED = {
    "prove_rank8_delta0_new_leaf_mask3_9_ratio_lift_residual_agent.py":
        "7EF09D48838D6D991B5A755D2112F2205B066CC8F007B5301C1B9072C0A433C6",
    "rank8_delta0_new_leaf_mask3_9_ratio_lift_residual_exact_agent_20260823.json":
        "7417437EB9605542365D6C170378866EEF77030B417BB8019531E3F0F00B5378",
    "prove_rank8_delta0_new_leaf_mask3_5_component_residual_agent.py":
        "A165E44CA67F6622A38783502AF06179EE267BAAA6BDA975C43B0F5B4B01279A",
    "rank8_delta0_new_leaf_mask3_5_component_residual_exact_agent_20260823.json":
        "C9DCA4BF65A3787042AA7344EC7846613E9D51EA4B4EA511BAFBCED9A0D9372B",
    "audit_rank8_delta0_new_leaf_mask3_5_component_residual_agent.py":
        "CA0BFA2B1C5A5425E5E2849D9E73EE9CCF48D0AE83499CFA34ED4C247F03D495",
    "rank8_delta0_new_leaf_mask3_5_component_residual_independent_audit_agent_20260823.json":
        "00FBABA5383468D101BF55230D4DEEE608594E52076EC66E9C87FBCCC8A00A1E",
    "prove_rank8_delta0_new_leaf_mask3_n26_r10_m16_c1_2_joint_jet_agent.py":
        "2FD9E8F7740682D034C6214AA3CF2FAF06E3AC921068246DD3E94B60776F1A15",
    "rank8_delta0_new_leaf_mask3_n26_r10_m16_c1_2_joint_jet_exact_agent_20260823.json":
        "9DEEE1865A7538CA035D391D02721B0BB5CBBB7260C8383143A440740530736F",
    "audit_rank8_delta0_new_leaf_mask3_n26_r10_m16_c1_2_joint_jet_agent.py":
        "F672845D49F497A1758FE1659C103B000D5AB6C47B7E4BE748FC5050F2D124F1",
    "rank8_delta0_new_leaf_mask3_n26_r10_m16_c1_2_joint_jet_independent_audit_agent_20260823.json":
        "6F60AE3BB63BE2BD9050E469364E28AC158385506BD36E1D0CA592DC184EDAE7",
    "prove_rank8_delta0_new_leaf_mask3_n26_r10_m16_c1_2_literal_attachment_agent.py":
        "757EB1EDB26805A68C4260EF0F1470468F7F42E630627486BFA57DE32702251F",
    "rank8_delta0_new_leaf_mask3_n26_r10_m16_c1_2_literal_attachment_exact_agent_20260823.json":
        "4CEC3075CA99FA61DFD17E025B58345E979688B3384A602FB0289E9308533DFC",
    "audit_rank8_delta0_new_leaf_mask3_n26_r10_m16_c1_2_literal_attachment_agent.py":
        "F2615137AF91D18B3049B1988FD8B7E3ADA277EDF9DC486F9BF7D1B62AD64445",
    "rank8_delta0_new_leaf_mask3_n26_r10_m16_c1_2_literal_attachment_independent_audit_agent_20260823.json":
        "FFFF0A13D57B0B517977421EF361B2D9D12669FA49A0FED1EBD1D7DECC02D9DB",
}


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def load(name: str):
    return json.loads((HERE / name).read_text(encoding="utf-8"))


def main() -> None:
    hashes = {name: sha256(HERE / name) for name in EXPECTED}
    assert hashes == EXPECTED, (hashes, EXPECTED)
    prior = load("rank8_delta0_new_leaf_mask3_9_ratio_lift_residual_exact_agent_20260823.json")
    component = load("rank8_delta0_new_leaf_mask3_5_component_residual_exact_agent_20260823.json")
    component_audit = load("rank8_delta0_new_leaf_mask3_5_component_residual_independent_audit_agent_20260823.json")
    joint = load("rank8_delta0_new_leaf_mask3_n26_r10_m16_c1_2_joint_jet_exact_agent_20260823.json")
    joint_audit = load("rank8_delta0_new_leaf_mask3_n26_r10_m16_c1_2_joint_jet_independent_audit_agent_20260823.json")
    literal = load("rank8_delta0_new_leaf_mask3_n26_r10_m16_c1_2_literal_attachment_exact_agent_20260823.json")
    literal_audit = load("rank8_delta0_new_leaf_mask3_n26_r10_m16_c1_2_literal_attachment_independent_audit_agent_20260823.json")

    cells = [tuple(row) for row in prior["open_cells"]]
    assert cells == [
        (26, 10, 16),
        (27, 10, 17),
        (27, 11, 16),
        (28, 11, 17),
        (28, 12, 16),
    ]
    component_rows = {(row["N"], row["r"], row["m"]): row for row in component["rows"]}
    audit_rows = {(row["N"], row["r"], row["m"]): row for row in component_audit["rows"]}
    assert set(component_rows) == set(audit_rows) == set(cells)

    assembled_rows = []
    for cell in cells:
        row = component_rows[cell]
        audited = audit_rows[cell]
        if cell != (26, 10, 16):
            assert row["status"] == "SEALED"
            assert all(subbox["bernstein"]["negative"] == 0 for subbox in row["component_subboxes"])
            assert all(subbox["negative"] == 0 for subbox in audited["component_subboxes"])
            assembled_rows.append(
                {"N": cell[0], "r": cell[1], "m": cell[2], "status": "SEALED", "route": "COMPONENT_BOX_ALL_COUNTS"}
            )
            continue

        # Component counts 3..16 are already zero-negative. Counts 1 and 2
        # are replaced by exact joint-jet boxes, then the 14 remaining jets
        # by a literal exhaustive attachment partition.
        by_component = {subbox["components"]: subbox for subbox in row["component_subboxes"]}
        audited_by_component = {subbox["components"]: subbox for subbox in audited["component_subboxes"]}
        assert set(by_component) == set(audited_by_component) == set(range(1, 17))
        assert all(by_component[c]["bernstein"]["negative"] == audited_by_component[c]["negative"] == 0 for c in range(3, 17))
        assert all(by_component[c]["bernstein"]["negative"] == audited_by_component[c]["negative"] == 2 for c in (1, 2))

        assert joint["counts"] == {"joint_jets": 19472, "bernstein_controls": 1051488, "negative_joint_jets": 14}
        assert joint_audit["counts"] == joint["counts"]
        assert joint_audit["exact_method_obstructions"] == joint["exact_obstructions"]
        assert [row["negative_joint_jets"] for row in joint["rows"]] == [7, 7]
        assert literal["status"] == "PASS_EXACT_MASK3_N26_R10_M16_C1_2_LITERAL_ATTACHMENT_CLOSURE"
        assert literal_audit["status"] == "PASS_INDEPENDENT_GENG_LITERAL_DELETION_MASK3_N26_R10_M16_C1_2_CLOSURE"
        assert literal["counts"]["literal_gate_values"] == literal_audit["counts"]["literal_gate_values"] == 1146
        assert literal["counts"]["negative_gate_values"] == literal_audit["counts"]["negative_gate_values"] == 0
        assert literal["isomorphism_invariant_case_multiset_sha256"] == literal_audit["isomorphism_invariant_case_multiset_sha256"]
        assembled_rows.append(
            {
                "N": 26,
                "r": 10,
                "m": 16,
                "status": "SEALED",
                "route": "C3_16_COMPONENT_BOX_PLUS_C1_2_JOINT_JETS_PLUS_14_LITERAL_ATTACHMENT_CLASSES",
            }
        )

    assert len(assembled_rows) == 5 and all(row["status"] == "SEALED" for row in assembled_rows)
    payload = {
        "schema": "rank8-delta0-new-leaf-mask3-5-finite-middle-residual-assembled-v1",
        "status": "PASS_EXACT_DELTA0_NEW_LEAF_MASK3_ALL_5_FINITE_MIDDLE_RESIDUAL",
        "scope": "Exactly the five cells left open by the nine-cell ratio-lift mask3 registry.",
        "partition": [
            "Four cells: every component-count box is independently zero-negative.",
            "Cell (26,10,16), c=3..16: independently zero-negative component boxes.",
            "Cell (26,10,16), c=1,2: 19,472 exact joint jets split into 19,458 zero-negative boxes and 14 obstruction jets.",
            "The 14 obstruction jets: all 1,146 possible rooted attachment realizations are independently and strictly positive.",
        ],
        "rows": assembled_rows,
        "counts": {
            "cells": 5,
            "sealed": 5,
            "open": 0,
            "component_subboxes": 82,
            "zero_negative_component_subboxes": 80,
            "c1_c2_joint_jets": 19472,
            "zero_negative_joint_jet_boxes": 19458,
            "literal_attachment_cases": 1146,
        },
        "hashes": hashes,
        "proof_boundary": (
            "This seals exactly the five final finite-middle cells. The 92 coarse "
            "and earlier 4+4 refinement cells require their own audits and a "
            "105-cell assembler before the complete middle region receives credit."
        ),
    }
    OUTPUT.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    print(payload["status"])
    print("CELLS 5 SEALED 5 OPEN 0")
    print("SOURCE", sha256(Path(__file__)))
    print("REPORT", sha256(OUTPUT))


if __name__ == "__main__":
    main()
