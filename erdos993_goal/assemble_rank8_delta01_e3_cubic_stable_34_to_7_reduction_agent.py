#!/usr/bin/env python3
"""Fail-closed assembly of the stable cubic 34-orbit-to-7-cell reduction.

This script does no new algebra.  It hash-pins the path-offset transfer lemma,
the seven-cell exact verifier, and the independent literal-tree interpolation
audit, then checks that their inventories and polynomial hashes agree.
"""

from __future__ import annotations

import hashlib
import json
from pathlib import Path


ROOT = Path(__file__).resolve().parent
OUTPUT = ROOT / "rank8_delta01_e3_cubic_stable_34_to_7_reduction_exact_agent_20260822.json"
EXPECTED = {
    "verify_rank8_stable_path_offset_transfer_agent.py":
        "2EB0B6E4F073F0FC90FB023D2EC265D4C28CC58C5DF710EF45E17471085D578E",
    "rank8_stable_path_offset_transfer_exact_agent_20260822.json":
        "3F690BA0FC7CC82EBE40467016C848D53E458744BCFC1FA2CF1EB3C01B507D7D",
    "verify_rank8_delta01_e3_cubic_stable_edge_extension_agent.py":
        "9BE0F22130E3CB20707AE610DB594A5DE073ACB27381C2B92087122A5B655F5D",
    "rank8_delta01_e3_cubic_stable_edge_extension_exact_agent_20260822.json":
        "49219FCD8766B4E584FEAC0281B491A0F0B70C5B85E4977BC2E1BB722A3CD7F7",
    "audit_rank8_delta01_e3_cubic_stable_edge_extension_agent.py":
        "5A1116481A40696E382BBCEF20AB78BD9E97DCA1F23DC417DD333C347BC768BF",
    "rank8_delta01_e3_cubic_stable_edge_extension_independent_audit_agent_20260822.json":
        "C325B2885173A3FFDB0F53E8259DA2E4825F65A4E232E358472BCC26B54104B0",
}


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def load(name: str) -> dict:
    return json.loads((ROOT / name).read_text(encoding="utf-8"))


def main() -> None:
    actual = {name: sha256(ROOT / name) for name in EXPECTED}
    assert actual == EXPECTED

    transfer = load("rank8_stable_path_offset_transfer_exact_agent_20260822.json")
    exact = load("rank8_delta01_e3_cubic_stable_edge_extension_exact_agent_20260822.json")
    audit = load("rank8_delta01_e3_cubic_stable_edge_extension_independent_audit_agent_20260822.json")
    assert transfer["status"] == "PASS_EXACT_RANK8_STABLE_PATH_OFFSET_TRANSFER"
    assert exact["status"] == "PASS_EXACT_RANK8_DELTA01_E3_CUBIC_STABLE_EDGE_EXTENSION_ALL_ROOT_ORBITS"
    assert audit["status"] == "PASS_INDEPENDENT_RANK8_DELTA01_E3_CUBIC_STABLE_EDGE_EXTENSION_AUDIT"

    cells = exact["root_location_cells"]
    assert len(cells) == 7
    assert sum(row["extension_edge_orbit_count"] for row in cells) == 34
    assert exact["totals"] == {
        "root_location_orbits": 7,
        "extension_edge_orbits": 34,
        "rank_increment_polynomials": 14,
        "negative_coefficients": 0,
        "zero_coefficients": 0,
    }
    assert all(
        rank_row["negative_coefficients"] == 0
        and rank_row["zero_coefficients"] == 0
        and rank_row["positive_coefficients"] == 27
        for cell in cells for rank_row in cell["ranks"].values()
    )

    exact_hashes = {
        cell["root_location_orbit"]: {
            rank: row["polynomial_sha256"]
            for rank, row in cell["ranks"].items()
        }
        for cell in cells
    }
    classes = {
        "branch_root": ["outer_branch", "middle_branch"],
        "leaf_root": ["outer_leaf", "middle_leaf"],
        "internal_root": [
            "outer_pendant_internal", "middle_pendant_internal", "spine_internal"
        ],
    }
    for labels in classes.values():
        assert len({tuple(sorted(exact_hashes[label].items())) for label in labels}) == 1
    audit_hashes = {
        row["root_profile"]: {
            rank: values["polynomial_sha256"]
            for rank, values in row["ranks"].items()
        }
        for row in audit["second_engine_interpolations"]
    }
    for profile, labels in classes.items():
        representative = labels[0]
        assert audit_hashes[profile.removesuffix("_root")] == exact_hashes[representative]

    inventory = [
        {
            "root_location_orbit": cell["root_location_orbit"],
            "extension_edge_orbit_count": cell["extension_edge_orbit_count"],
            "extension_edge_orbits": cell["extension_edge_orbits"],
            "minimum_source_order_in_stable_cell": cell["minimum_source_order_in_stable_cell"],
            "delta0_polynomial_sha256": cell["ranks"]["0"]["polynomial_sha256"],
            "delta1_polynomial_sha256": cell["ranks"]["1"]["polynomial_sha256"],
        }
        for cell in cells
    ]
    payload = {
        "schema": "rank8-delta01-e3-cubic-stable-34-to-7-reduction-agent-v1",
        "status": "PASS_EXACT_RANK8_DELTA01_E3_CUBIC_STABLE_34_ORBITS_TO_7_CELLS",
        "claim": (
            "For the stable path region of the e=3 cubic skeleton, all 34 joint "
            "(root-location, extended-edge) orbits reduce exactly to seven root-location "
            "cells.  In every cell and both ranks, the extension increment is a nonzero "
            "polynomial with all 27 coefficients positive."
        ),
        "logical_reduction": [
            "The rank-at-most-eight path-offset transfer identity is exact once every conditioned path order is at least seven.",
            "It moves one offset unit between stable path factors, so a fixed root-location cell depends only on their total offset S.",
            "Subdividing any edge orbit in that cell is therefore the same shift S to S+1.",
            "The literal-tree audit independently reconstructs constants and interpolates all increment polynomials, matching every FLINT hash.",
        ],
        "stable_guards": exact["stable_guards"],
        "orbit_inventory": inventory,
        "totals": {
            "root_location_orbits": 7,
            "joint_extension_orbits": 34,
            "distinct_polynomial_profiles": 3,
            "rank_increment_polynomials": 14,
            "negative_coefficients": 0,
            "zero_coefficients": 0,
            "positive_coefficients": 378,
        },
        "profile_classes": classes,
        "immutable_inputs": actual,
        "source_sha256": sha256(Path(__file__)),
        "scope_warning": (
            "This seals only the stable interior of the cubic-skeleton extension induction. "
            "The short-boundary complement is a separate obligation. It is not a complete "
            "cubic-skeleton, connected-Q8, forest-Q8, or Problem-993 theorem."
        ),
    }
    OUTPUT.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    print(payload["status"])
    print("SOURCE", payload["source_sha256"])
    print("OUTPUT", sha256(OUTPUT))


if __name__ == "__main__":
    main()
