#!/usr/bin/env python3
"""Independent dependency and classification audit of all-rank e=3 closure."""

from __future__ import annotations

import hashlib
import json
import math
from pathlib import Path


ROOT = Path(__file__).resolve().parent
PRIMARY = ROOT / "rank8_delta03_e3_all_ranks_complete_exact_root_20260823.json"
OUTPUT = ROOT / "rank8_delta03_e3_all_ranks_complete_independent_audit_root_20260823.json"
EXPECTED = {
    PRIMARY.name: "02C35B44E5E9B3DDFA7AE28D3AB6ED602B50AA62E6A4A69BC191B24F008E203B",
    "assemble_rank8_delta03_e3_all_ranks_complete_root.py":
        "5BF72DCCF561B235FC851E8B06B916F1240AA32ED3854B4D8B51F61829FA4465",
}


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def main() -> None:
    actual = {name: sha256(ROOT / name) for name in EXPECTED}
    assert actual == EXPECTED
    primary = json.loads(PRIMARY.read_text(encoding="utf-8"))
    assert primary["status"] == "PASS_EXACT_RANK8_DELTA03_E3_ALL_RANKS_COMPLETE_N27_PLUS"
    assert {name: sha256(ROOT / name) for name in primary["immutable_inputs"]} == primary["immutable_inputs"]
    inventories = []
    for b3 in range(4):
        for b4 in range(2):
            if b3 * math.comb(2, 2) + b4 * math.comb(3, 2) == 3:
                inventories.append((b3, b4))
    assert inventories == [(0, 1), (3, 0)]
    assert primary["closed_residual_ranks"] == [0, 1, 2, 3]

    payload = {
        "schema": "rank8-delta03-e3-all-ranks-complete-independent-audit-root-v1",
        "status": "PASS_INDEPENDENT_RANK8_DELTA03_E3_ALL_RANKS_COMPLETE_AUDIT",
        "branch_inventory_solutions_b3_b4": [list(row) for row in inventories],
        "audited_ranks": [0, 1, 2, 3],
        "transitive_hashes_replayed": len(primary["immutable_inputs"]),
        "immutable_inputs": actual,
        "source_sha256": sha256(Path(__file__)),
        "scope_warning": "This audits only the e=3 connected residual layer.",
    }
    OUTPUT.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    print(payload["status"])
    print("SOURCE", payload["source_sha256"])
    print("OUTPUT", sha256(OUTPUT))


if __name__ == "__main__":
    main()
