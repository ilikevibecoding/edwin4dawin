#!/usr/bin/env python3
"""Exact stable-interior Delta2/Delta3 extension theorem for cubic e=3."""

from __future__ import annotations

import hashlib
import json
import time
from pathlib import Path

from flint import fmpq

import verify_rank8_delta01_e3_cubic_stable_edge_extension_agent as base


ROOT = Path(__file__).resolve().parent
OUTPUT = ROOT / "rank8_delta23_e3_cubic_stable_edge_extension_exact_root_20260823.json"
EXPECTED = {
    "verify_rank8_delta01_e3_cubic_stable_edge_extension_agent.py": "9BE0F22130E3CB20707AE610DB594A5DE073ACB27381C2B92087122A5B655F5D",
    "verify_rank8_stable_path_offset_transfer_agent.py": "2EB0B6E4F073F0FC90FB023D2EC265D4C28CC58C5DF710EF45E17471085D578E",
    "rank8_stable_path_offset_transfer_exact_agent_20260822.json": "3F690BA0FC7CC82EBE40467016C848D53E458744BCFC1FA2CF1EB3C01B507D7D",
}


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def delta23(core_values, deleted):
    r1 = base.residual(core_values, deleted, 1)
    r2 = base.residual(core_values, deleted, 2)
    r3 = base.residual(core_values, deleted, 3)
    r4 = base.residual(core_values, deleted, 4)
    return r3 - 2 * r2 + r1, r4 - 3 * r3 + 3 * r2 - r1


def main() -> None:
    started = time.perf_counter()
    actual = {name: sha256(ROOT / name) for name in EXPECTED}
    assert actual == EXPECTED
    transfer = json.loads((ROOT / "rank8_stable_path_offset_transfer_exact_agent_20260822.json").read_text(encoding="utf-8"))
    assert transfer["status"] == "PASS_EXACT_RANK8_STABLE_PATH_OFFSET_TRANSFER"
    cells = []
    for label, extension_orbits in base.ROOT_CELLS.items():
        _, old_core, old_deleted, base_order = base.cell_data(label, base.S)
        _, new_core, new_deleted, new_base_order = base.cell_data(label, base.S + 1)
        assert new_base_order == base_order
        old_delta = delta23(old_core, old_deleted)
        new_delta = delta23(new_core, new_deleted)
        rank_rows = {
            str(rank): base.stats(new_delta[rank - 2] - old_delta[rank - 2])
            for rank in (2, 3)
        }
        assert all(
            row["negative_coefficients"] == 0
            and row["zero_coefficients"] == 0
            and fmpq(row["minimum_coefficient"]) > 0
            and fmpq(row["constant_coefficient"]) > 0
            for row in rank_rows.values()
        )
        cells.append({
            "root_location_orbit": label,
            "extension_edge_orbits": extension_orbits,
            "extension_edge_orbit_count": len(extension_orbits),
            "minimum_source_order_in_stable_cell": base_order,
            "offset_variable": "S=the sum of all stable path-length offsets",
            "ranks": rank_rows,
        })
        print("PASS", label, flush=True)

    payload = {
        "schema": "rank8-delta23-e3-cubic-stable-edge-extension-exact-root-v1",
        "status": "PASS_EXACT_RANK8_DELTA23_E3_CUBIC_STABLE_EDGE_EXTENSION_ALL_ROOT_ORBITS",
        "theorem": "In each of the seven stable root-location cells of the cubic e=3 skeleton, subdividing any skeleton edge once while preserving the root strictly increases Delta2 and Delta3.",
        "stable_guards": {
            "ordinary_pendant_edge": "length at least 8",
            "ordinary_spine_edge": "length at least 10",
            "root_at_outer_or_middle_leaf_incident_pendant": "length at least 9",
            "root_internal_to_pendant": "near component at least 8 and tail component at least 7",
            "root_internal_to_spine": "both root-side internal components at least 8",
            "reason": "every conditioned path order in the branch-state expansion is then at least seven",
        },
        "offset_collapse": "The pinned rank-at-most-eight transfer identity makes every stable edge extension the same one-variable shift S to S+1 inside a fixed root-location orbit.",
        "root_location_cells": cells,
        "totals": {
            "root_location_orbits": len(cells),
            "extension_edge_orbits": sum(cell["extension_edge_orbit_count"] for cell in cells),
            "rank_increment_polynomials": 2 * len(cells),
            "negative_coefficients": 0,
            "zero_coefficients": 0,
            "positive_coefficients": sum(
                row["positive_coefficients"]
                for cell in cells for row in cell["ranks"].values()
            ),
        },
        "runtime_seconds": time.perf_counter() - started,
        "engine": "python-flint exact fmpq univariate polynomials",
        "immutable_inputs": actual,
        "source_sha256": sha256(Path(__file__)),
        "scope_warning": "This proves only the stable all-long edge-extension interior for cubic Delta2/Delta3. Finite n=27..36, all-short, mixed cells, quartic-star e=3, other connected cases, forest Q8, PGC, and Problem 993 are separate obligations.",
    }
    OUTPUT.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    print(payload["status"])
    print("SOURCE", payload["source_sha256"])
    print("OUTPUT", sha256(OUTPUT))


if __name__ == "__main__":
    main()
