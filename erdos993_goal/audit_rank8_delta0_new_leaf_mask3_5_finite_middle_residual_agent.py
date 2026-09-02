#!/usr/bin/env python3
"""Independent partition audit of the five-cell mask-3 residual package."""

from __future__ import annotations

import hashlib
import json
from pathlib import Path


HERE = Path(__file__).resolve().parent
OUTPUT = HERE / "rank8_delta0_new_leaf_mask3_5_finite_middle_residual_independent_audit_agent_20260823.json"
EXPECTED = {
    "assemble_rank8_delta0_new_leaf_mask3_5_finite_middle_residual_agent.py":
        "E6D02DCA9DC491FF97437E3A2C97DBF55939C34B132085E171FE021D929B8550",
    "rank8_delta0_new_leaf_mask3_5_finite_middle_residual_assembled_agent_20260823.json":
        "45821A4E8FDA537EA0CE099F34DB952D95D6A1033DB9824D4F92890132FDAA5E",
    "rank8_delta0_new_leaf_mask3_5_component_residual_independent_audit_agent_20260823.json":
        "00FBABA5383468D101BF55230D4DEEE608594E52076EC66E9C87FBCCC8A00A1E",
    "rank8_delta0_new_leaf_mask3_n26_r10_m16_c1_2_joint_jet_independent_audit_agent_20260823.json":
        "6F60AE3BB63BE2BD9050E469364E28AC158385506BD36E1D0CA592DC184EDAE7",
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
    assembled = load("rank8_delta0_new_leaf_mask3_5_finite_middle_residual_assembled_agent_20260823.json")
    component = load("rank8_delta0_new_leaf_mask3_5_component_residual_independent_audit_agent_20260823.json")
    joint = load("rank8_delta0_new_leaf_mask3_n26_r10_m16_c1_2_joint_jet_independent_audit_agent_20260823.json")
    literal = load("rank8_delta0_new_leaf_mask3_n26_r10_m16_c1_2_literal_attachment_independent_audit_agent_20260823.json")

    expected_cells = {
        (26, 10, 16),
        (27, 10, 17),
        (27, 11, 16),
        (28, 11, 17),
        (28, 12, 16),
    }
    assembled_cells = {(row["N"], row["r"], row["m"]) for row in assembled["rows"]}
    component_cells = {(row["N"], row["r"], row["m"]): row for row in component["rows"]}
    assert assembled_cells == set(component_cells) == expected_cells
    assert len(assembled["rows"]) == len(assembled_cells) == 5
    assert all(row["status"] == "SEALED" for row in assembled["rows"])

    ordinary = expected_cells - {(26, 10, 16)}
    for cell in ordinary:
        assert all(subbox["negative"] == 0 for subbox in component_cells[cell]["component_subboxes"])
    last = component_cells[(26, 10, 16)]
    last_by_c = {row["components"]: row for row in last["component_subboxes"]}
    assert set(last_by_c) == set(range(1, 17))
    assert all(last_by_c[c]["negative"] == 0 for c in range(3, 17))
    assert all(last_by_c[c]["negative_indices"] == [[7, 5, 4], [8, 5, 4]] for c in (1, 2))

    assert joint["counts"] == {"joint_jets": 19472, "bernstein_controls": 1051488, "negative_joint_jets": 14}
    obstruction_jets = {(row["components"], tuple(row["jet_f0_to_f6"])) for row in joint["exact_method_obstructions"]}
    assert len(obstruction_jets) == 14
    assert literal["counts"]["literal_gate_values"] == literal["counts"]["literal_D_formula_agreements"] == 1146
    assert literal["counts"]["negative_gate_values"] == 0
    assert FractionPositive(literal["minimum_gate_numerator"])

    payload = {
        "schema": "rank8-delta0-new-leaf-mask3-5-finite-middle-residual-independent-audit-v1",
        "status": "PASS_INDEPENDENT_PARTITION_DELTA0_NEW_LEAF_MASK3_ALL_5_FINITE_MIDDLE_RESIDUAL",
        "hashes": hashes,
        "partition_counts": {
            "cells": 5,
            "ordinary_all_component_box_cells": 4,
            "last_cell_component_counts_3_through_16": 14,
            "last_cell_joint_jets_c1_c2": 19472,
            "last_cell_joint_obstruction_jets": 14,
            "last_cell_literal_attachment_cases": 1146,
            "open": 0,
        },
        "proof_boundary": assembled["proof_boundary"],
    }
    OUTPUT.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    print(payload["status"])
    print("CELLS 5 OPEN 0")
    print("SOURCE", sha256(Path(__file__)))
    print("REPORT", sha256(OUTPUT))


def FractionPositive(value: str) -> bool:
    numerator, _, denominator = value.partition("/")
    return int(numerator) > 0 and (not denominator or int(denominator) > 0)


if __name__ == "__main__":
    main()
