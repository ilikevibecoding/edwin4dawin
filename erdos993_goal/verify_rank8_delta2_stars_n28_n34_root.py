#!/usr/bin/env python3
"""Exact literal Delta2 values for the finite star boundary n=28..34."""

from __future__ import annotations

import hashlib
import json
import math
import os
from pathlib import Path


HERE = Path(__file__).resolve().parent
OUTPUT = HERE / "rank8_delta2_stars_n28_n34_exact_root_20260826.json"
EXPECTED = {
    "verify_rank8_q8_terminal_reduction.py":
        "389216D19951A28784C46E57393F1F9CD5BBE41625DCD317C664F701EC2EC4B7",
    "verify_rank8_q8_terminal_delta2_reduction.py":
        "040A8556DA93BAD448802B9086DA2BE507C10A8836F4AE1ECC15DFFA24765C34",
    "rank8_q8_terminal_delta2_reduction_exact_20260820.json":
        "3808552D9ED786FAB5B87E217E10121275769144B6600FB2570B051CF8C0496D",
}


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def residual(c: list[int], h: list[int], siblings: int) -> int:
    p7 = h[6] + sum(c[7 - j] * math.comb(siblings, j) for j in range(8))
    p8 = h[7] + sum(c[8 - j] * math.comb(siblings, j) for j in range(9))
    open9 = sum(c[9 - j] * math.comb(siblings, j) for j in range(1, 10))
    q8 = 16 * p8 * p8 - p7 * p8 - 18 * p7 * open9
    cq = 16 * c[8] * c[8] - c[7] * c[8]
    hq = 14 * h[7] * h[7] - h[6] * h[7]
    return (
        8 * c[7] * h[6] * q8
        - 8 * h[6] * p7 * cq
        - 9 * c[7] * p7 * hq
    )


def delta2(c: list[int], h: list[int]) -> int:
    return residual(c, h, 3) - 2 * residual(c, h, 2) + residual(c, h, 1)


def main() -> None:
    actual = {name: sha256(HERE / name) for name in EXPECTED}
    assert actual == EXPECTED, (actual, EXPECTED)
    rows = []
    minimum = None
    minimum_witness = None
    for order in range(28, 35):
        c = [1, order] + [math.comb(order - 1, k) for k in range(2, 9)]
        deleted = {
            "center": [math.comb(order - 1, k) for k in range(9)],
            "leaf": [1, order - 1]
                + [math.comb(order - 2, k) for k in range(2, 9)],
        }
        assert c[2] == math.comb(order - 1, 2)
        for root_orbit, h in deleted.items():
            value = delta2(c, h)
            assert value > 0
            row = {
                "order": order,
                "root_orbit": root_orbit,
                "orbit_size": 1 if root_orbit == "center" else order - 1,
                "c7": c[7], "c8": c[8], "h6": h[6], "h7": h[7],
                "Delta2": str(value),
            }
            rows.append(row)
            witness = (value, order, root_orbit)
            if minimum_witness is None or witness < minimum_witness:
                minimum, minimum_witness = value, witness

    payload = {
        "schema": "rank8-delta2-stars-n28-n34-root-v1",
        "status": "PASS_EXACT_RANK8_DELTA2_ALL_ROOTED_STARS_N28_N34",
        "theorem": (
            "For every star K_{1,n-1}, 28<=n<=34, Delta2 R_1(A,q)>0 "
            "for both the center-root and leaf-root orbits."
        ),
        "coverage": {
            "orders": "28..34", "root_orbits_per_order": 2,
            "root_orbit_values": len(rows),
            "labeled_rooted_pairs": sum(row["orbit_size"] for row in rows),
        },
        "minimum": {
            "Delta2": str(minimum),
            "order": minimum_witness[1],
            "root_orbit": minimum_witness[2],
        },
        "values": rows,
        "method": (
            "The star independence coefficients and the two vertex-deletion "
            "polynomials are inserted directly into a fresh integer implementation "
            "of the pinned terminal residual and its second sibling difference."
        ),
        "immutable_inputs": actual,
        "source_sha256": sha256(Path(__file__)),
        "scope_warning": (
            "Finite stars only. Nonstars and orders n>=35 are certified separately."
        ),
    }
    temporary = OUTPUT.with_suffix(OUTPUT.suffix + ".tmp")
    temporary.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    os.replace(temporary, OUTPUT)
    print(payload["status"])
    print("MINIMUM", minimum_witness)
    print("SOURCE", payload["source_sha256"])
    print("REPORT", sha256(OUTPUT))


if __name__ == "__main__":
    main()
