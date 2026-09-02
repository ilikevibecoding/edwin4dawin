#!/usr/bin/env python3
"""Independent literal replay of the 105 finite mask-2 middle cells."""

from __future__ import annotations

import hashlib
import json
from pathlib import Path

from audit_rank8_delta0_new_leaf_mask2_quantitative_gap_tail_agent import (
    blossom,
    independently_clear,
    literal_base,
    sparse_sha256,
    split_power,
)


HERE = Path(__file__).resolve().parent
OUTPUT = HERE / "rank8_delta0_new_leaf_mask2_n26_39_middle_independent_audit_agent_20260823.json"

EXPECTED = {
    "prove_rank8_delta0_new_leaf_mask2_n26_39_middle_agent.py": "80ED28E1B45E6AF17171C3FD5B599EC7CCAEE21D79F54F550859EA6D28EA7FCA",
    "rank8_delta0_new_leaf_mask2_n26_39_middle_exact_agent_20260823.json": "DF5D8C45A4C7EC2FEE88553EC14B06EC501E29DC4BD0652484915FF4D7B005A9",
    "audit_rank8_delta0_new_leaf_mask2_quantitative_gap_tail_agent.py": "2ABD786B10A01DABCDA464F033924055D7D4AB893ADB2517421EC20F15F91CFA",
}


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def main() -> None:
    actual = {name: sha256(HERE / name) for name in EXPECTED}
    assert actual == EXPECTED, (actual, EXPECTED)
    primary = json.loads(
        (HERE / "rank8_delta0_new_leaf_mask2_n26_39_middle_exact_agent_20260823.json").read_text(
            encoding="utf-8"
        )
    )
    assert primary["status"] == "PASS_EXACT_DELTA0_NEW_LEAF_MASK2_N26_39_MIDDLE"
    base = literal_base()
    cleared, _ = independently_clear(base)
    ring, power = split_power(cleared)
    degrees, controls = blossom(ring, power)
    assert degrees == (8, 4, 4) and len(controls) == 225
    assert sparse_sha256(sorted(controls.items())) == primary["bernstein_sha256"]
    coordinates = []
    minimum = None
    for N in range(26, 40):
        for r in range(10, N - 15):
            values = [int(polynomial(N, r)) for polynomial in controls.values()]
            assert all(value >= 0 for value in values)
            minimum = min(values) if minimum is None else min(minimum, min(values))
            coordinates.append((N, r, N - r))
    assert coordinates == [(row["N"], row["r"], row["m"]) for row in primary["rows"]]
    assert len(coordinates) == 105 and all(row["status"] == "SEALED" for row in primary["rows"])
    payload = {
        "schema": "rank8-delta0-new-leaf-mask2-n26-39-middle-independent-audit-v1",
        "status": "PASS_INDEPENDENT_LITERAL_DELTA0_NEW_LEAF_MASK2_N26_39_MIDDLE",
        "scope": primary["scope"],
        "hashes": actual,
        "literal_base_terms": len(base.terms()),
        "cells": len(coordinates),
        "controls_per_cell": len(controls),
        "exact_evaluations": len(coordinates) * len(controls),
        "minimum_control": str(minimum),
        "bernstein_sha256": primary["bernstein_sha256"],
        "proof_boundary": primary["proof_boundary"],
    }
    OUTPUT.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    print(payload["status"])
    print("CELLS", len(coordinates), "EVALUATIONS", payload["exact_evaluations"])
    print("SOURCE", sha256(Path(__file__)))
    print("REPORT", sha256(OUTPUT))


if __name__ == "__main__":
    main()
