#!/usr/bin/env python3
"""Independent literal audit of the finite mask-0 quantitative-gap registry."""

from __future__ import annotations

import hashlib
import json
from pathlib import Path

import audit_rank8_delta0_new_leaf_mask0_quantitative_gap_tail_agent as literal


HERE = Path(__file__).resolve().parent
OUTPUT = HERE / "rank8_delta0_new_leaf_mask0_n26_39_quantitative_gap_registry_independent_audit_agent_20260823.json"

EXPECTED = {
    "assemble_rank8_delta0_new_leaf_mask0_n26_39_quantitative_gap_agent.py": "622D1A2E3AE8525DE1516904544AE319CF3FCB3FFF2308C9403081F5CAEF971E",
    "rank8_delta0_new_leaf_mask0_n26_39_quantitative_gap_registry_agent_20260823.json": "8551E3E7FDDC6EDBA78C4F68A300A6525CDD539BE957DE15033F2FFDED3FA753",
    "audit_rank8_delta0_new_leaf_mask0_quantitative_gap_tail_agent.py": "2669A0750A7E03CDBB9199257B5243EA21158550CF716C6C0AA1E4911005CD8D",
    "rank8_delta0_new_leaf_mask0_quantitative_gap_tail_independent_audit_agent_20260823.json": "08BF3CA4E81D1F78DDC369DD9E30D2F29F4E3906F6BD4DF64777D876B64FFBF9",
}


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def main() -> None:
    actual_hashes = {name: sha256(HERE / name) for name in EXPECTED}
    assert actual_hashes == EXPECTED, (actual_hashes, EXPECTED)
    registry = json.loads(
        (HERE / "rank8_delta0_new_leaf_mask0_n26_39_quantitative_gap_registry_agent_20260823.json").read_text()
    )
    base = literal.literal_base_polynomial()
    cleared, _ = literal.independently_clear_box(base)
    ring, power = literal.split_power(cleared)
    bernstein = literal.blossom_bernstein(ring, power)
    fingerprint = literal.sparse_sha256(sorted(bernstein.items()))
    assert fingerprint == registry["sparse_sha256"]["bernstein_coefficient_blocks_scaled_by_12_cubed"]

    independent_rows = []
    # Reverse both loop order and block order relative to the registry builder.
    blocks = list(sorted(bernstein.items(), reverse=True))
    for N in reversed(range(26, 40)):
        for r in reversed(range(10, N - 15)):
            values = [(index, int(polynomial(N, r))) for index, polynomial in blocks]
            negative = sorted([list(index) for index, value in values if value < 0])
            independent_rows.append(
                {
                    "N": N,
                    "r": r,
                    "m": N - r,
                    "status": "SEALED_MASK0" if not negative else "OPEN_BERNSTEIN_NEGATIVE",
                    "negative": len(negative),
                    "zero": sum(value == 0 for _, value in values),
                    "positive": sum(value > 0 for _, value in values),
                    "minimum": str(min(value for _, value in values)),
                    "negative_indices": negative,
                }
            )
    independent_rows.sort(key=lambda row: (row["N"], row["r"]))
    assert independent_rows == registry["rows"]
    sealed = sum(row["status"] == "SEALED_MASK0" for row in independent_rows)
    opened = len(independent_rows) - sealed
    assert (len(independent_rows), sealed, opened) == (105, 86, 19)

    payload = {
        "schema": "rank8-delta0-new-leaf-mask0-n26-39-quantitative-gap-registry-independent-audit-v1",
        "status": "PASS_INDEPENDENT_LITERAL_PARTIAL_MASK0_FINITE_REGISTRY_86_SEALED_19_OPEN",
        "hashes": actual_hashes,
        "bernstein_sparse_sha256": fingerprint,
        "counts": {"total": 105, "sealed": 86, "open": 19},
        "open_cells": registry["open_cells"],
        "proof_boundary": registry["proof_boundary"],
    }
    OUTPUT.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    print(payload["status"])
    print("TOTAL 105 SEALED 86 OPEN 19")
    print("SOURCE", sha256(Path(__file__)))
    print("REPORT", sha256(OUTPUT))


if __name__ == "__main__":
    main()
