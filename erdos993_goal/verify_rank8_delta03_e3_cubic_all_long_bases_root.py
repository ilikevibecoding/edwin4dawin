#!/usr/bin/env python3
"""Exact base values for all seven all-long cubic e=3 root cells.

The existing stable-edge certificates prove strict positivity of every
subsequent stable extension.  This script supplies the logically separate
base-value obligation at offset S=0 for Delta0 through Delta3.
"""

from __future__ import annotations

import hashlib
import json
from pathlib import Path

from flint import fmpq

import verify_rank8_delta01_e3_cubic_stable_edge_extension_agent as d01
from verify_rank8_delta23_e3_cubic_stable_edge_extension_root import delta23


ROOT = Path(__file__).resolve().parent
OUTPUT = ROOT / "rank8_delta03_e3_cubic_all_long_bases_exact_root_20260823.json"
EXPECTED = {
    "verify_rank8_delta01_e3_cubic_stable_edge_extension_agent.py":
        "9BE0F22130E3CB20707AE610DB594A5DE073ACB27381C2B92087122A5B655F5D",
    "verify_rank8_delta23_e3_cubic_stable_edge_extension_root.py":
        "C01467A1C80DFCB6C9971063AF85498FCD9A2934537444A710343B53500D2493",
    "rank8_stable_path_offset_transfer_exact_agent_20260822.json":
        "3F690BA0FC7CC82EBE40467016C848D53E458744BCFC1FA2CF1EB3C01B507D7D",
}


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def constant(polynomial) -> int:
    assert polynomial.is_constant()
    value = polynomial[(0,)]
    assert value.denominator == 1
    return int(value.numerator)


def main() -> None:
    actual = {name: sha256(ROOT / name) for name in EXPECTED}
    assert actual == EXPECTED
    transfer = json.loads(
        (ROOT / "rank8_stable_path_offset_transfer_exact_agent_20260822.json")
        .read_text(encoding="utf-8")
    )
    assert transfer["status"] == "PASS_EXACT_RANK8_STABLE_PATH_OFFSET_TRANSFER"

    rows = []
    for label in d01.ROOT_CELLS:
        lengths, core, deleted, order = d01.cell_data(label, d01.ZERO)
        values01 = d01.delta_values(core, deleted)
        values23 = delta23(core, deleted)
        values = [constant(value) for value in (*values01, *values23)]
        assert all(value > 0 for value in values)
        rows.append({
            "root_location_orbit": label,
            "base_order": order,
            "stable_lengths": {key: str(value[(0,)]) for key, value in lengths.items()},
            "Delta0": str(values[0]),
            "Delta1": str(values[1]),
            "Delta2": str(values[2]),
            "Delta3": str(values[3]),
        })
        print("PASS", label, *values, flush=True)

    assert [row["base_order"] for row in rows] == [61, 61, 62, 62, 69, 69, 69]
    payload = {
        "schema": "rank8-delta03-e3-cubic-all-long-bases-exact-root-v1",
        "status": "PASS_EXACT_RANK8_DELTA03_E3_CUBIC_ALL_LONG_BASES",
        "theorem": (
            "At total stable offset S=0, every one of the seven all-long cubic "
            "e=3 root-location cells has Delta0, Delta1, Delta2, and Delta3 "
            "strictly positive."
        ),
        "base_cells": rows,
        "coverage": {
            "root_location_orbits": len(rows),
            "ranks_per_orbit": 4,
            "strictly_positive_values": 4 * len(rows),
            "orders": sorted({row["base_order"] for row in rows}),
        },
        "logical_use": (
            "Together with the separately audited positive stable-edge increments, "
            "these seven bases prove the entire all-long sector for all four ranks."
        ),
        "engine": "python-flint exact branch-state polynomials evaluated at S=0",
        "immutable_inputs": actual,
        "source_sha256": sha256(Path(__file__)),
        "scope_warning": (
            "This closes only the starting values for the all-long cubic e=3 cells. "
            "The finite, all-short, mixed, other connected, and forest sectors remain "
            "separately gated."
        ),
    }
    OUTPUT.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    print(payload["status"])
    print("SOURCE", payload["source_sha256"])
    print("OUTPUT", sha256(OUTPUT))


if __name__ == "__main__":
    main()
