#!/usr/bin/env python3
"""Component-resolved closure of four finite low-r mask-3 cells."""

from __future__ import annotations

import hashlib
import json
from pathlib import Path

import prove_rank8_delta0_new_leaf_mask3_5_component_residual_agent as component
from analyze_rank8_delta0_new_leaf_mask3_selected_boundary_agent import base_polynomial


HERE = Path(__file__).resolve().parent
OUTPUT = HERE / "rank8_delta0_new_leaf_mask3_n26_39_r1_9_4_component_exact_agent_20260823.json"
EXPECTED = {
    "prove_rank8_delta0_new_leaf_mask3_n26_39_r1_9_agent.py":
        "A3B4DE472F60284DE15FF2F56BDA50AE614A310CF3DDC4769305740EA8C4A89A",
    "rank8_delta0_new_leaf_mask3_n26_39_r1_9_exact_agent_20260823.json":
        "275EB56A82B6CD020C8D79E64415E21BE970BD883EB23A7CCF658A6363A262BB",
    "rank8_forest16_17_component_jet_bounds_exact_agent_20260823.json":
        "DC5A2F6F85E62D47EB0AA43FB8E92B2C33E04DF3DA828AFF179B9E61B52F032D",
    "rank8_forest16_17_component_jet_bounds_independent_audit_agent_20260823.json":
        "41C457BEB4BF565F3FCCF46BF374168AD7EA5683B115C3A50347AA72E811F9E1",
    "prove_rank8_forest18_19_component_jet_bounds_agent.py":
        "B20A97792E16E11A5FA8EC23DC72910B1E9779879423884234248FCAF9E2714E",
    "rank8_forest18_19_component_jet_bounds_exact_agent_20260823.json":
        "BB1F773A515E38A5E493286725858941143BFB255EDD1F3DC69748F3985F6E62",
    "audit_rank8_forest18_19_component_jet_bounds_agent.py":
        "8BCC65E53D87D2FE3AD0531FAE7187BAE07B0CEBA796107552297678FE9BA234",
    "rank8_forest18_19_component_jet_bounds_independent_audit_agent_20260823.json":
        "82283FD0808F138F0E8022C72367E546D50A961E7584510FB75377C709061BB1",
}


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def main() -> None:
    hashes = {name: sha256(HERE / name) for name in EXPECTED}
    assert hashes == EXPECTED, (hashes, EXPECTED)
    coarse = json.loads((HERE / "rank8_delta0_new_leaf_mask3_n26_39_r1_9_exact_agent_20260823.json").read_text(encoding="utf-8"))
    cells = [tuple(row) for row in coarse["open_cells"]]
    assert cells == [(26, 7, 19), (26, 8, 18), (26, 9, 17), (27, 9, 18)]
    catalogs = [
        json.loads((HERE / "rank8_forest16_17_component_jet_bounds_exact_agent_20260823.json").read_text(encoding="utf-8")),
        json.loads((HERE / "rank8_forest18_19_component_jet_bounds_exact_agent_20260823.json").read_text(encoding="utf-8")),
    ]
    component_rows = {
        (row["order"], row["components"]): row
        for catalog in catalogs for row in catalog["component_rows"]
    }
    base = base_polynomial()
    rows = []
    open_subboxes = []
    subboxes = 0
    for N, r, m in cells:
        current = []
        for components in range(1, m + 1):
            item = component_rows[(m, components)]
            cleared, metadata = component.clear_component(
                base,
                N,
                r,
                components,
                item["minimum_f0_to_f4"],
                component.parse_fraction(item["maximum_f5_over_f6"]),
            )
            sign = component.first.sign(cleared)
            current.append({"components": components, "status": "SEALED" if sign["negative"] == 0 else "OPEN_COMPONENT_BERNSTEIN_METHOD", "metadata": metadata, "bernstein": sign})
            if sign["negative"]:
                open_subboxes.append((N, r, m, components, sign["negative_indices"]))
            subboxes += 1
        rows.append({"N": N, "r": r, "m": m, "status": "SEALED" if all(row["status"] == "SEALED" for row in current) else "OPEN_COMPONENT_BERNSTEIN_METHOD", "component_subboxes": current})
    assert subboxes == 72
    payload = {
        "schema": "rank8-delta0-new-leaf-mask3-n26-39-r1-9-4-component-v1",
        "status": "PASS_EXACT_MASK3_N26_39_R1_9_ALL_4_COMPONENT_CLOSURE" if not open_subboxes else "PASS_EXACT_PARTIAL_MASK3_R1_9_4_COMPONENT_WITH_OPEN",
        "scope": "Exactly the four cells left open by the 126-cell low-r coarse registry.",
        "rows": rows,
        "open_subboxes": open_subboxes,
        "counts": {"cells": 4, "component_subboxes": 72, "open_subboxes": len(open_subboxes)},
        "hashes": hashes,
        "proof_boundary": "Only these four cells plus independent replay are in scope; the 126-cell assembler remains separate.",
    }
    OUTPUT.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    print(payload["status"])
    print("CELLS 4 SUBBOXES 72 OPEN", len(open_subboxes))
    print("SOURCE", sha256(Path(__file__)))
    print("REPORT", sha256(OUTPUT))


if __name__ == "__main__":
    main()
