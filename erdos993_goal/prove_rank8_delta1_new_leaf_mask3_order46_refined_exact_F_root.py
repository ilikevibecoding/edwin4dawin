#!/usr/bin/env python3
"""Exact refined-F certificate for the Delta1 mask-3 endpoint at |D|=46."""

from __future__ import annotations

import hashlib
import json
import os
from pathlib import Path

import prove_rank8_delta1_new_leaf_mask3_order47_refined_exact_F_root as engine


HERE = Path(__file__).resolve().parent
OUTPUT = HERE / (
    "rank8_delta1_new_leaf_mask3_order46_refined_exact_F_root_20260825.json"
)
EXPECTED_ENGINE_SHA256 = (
    "3F60EC8F6565056131FBB2A54C59BB6738F4AB5EFB7BBBDD9A6EADE5378A843A"
)


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def main() -> None:
    assert sha256(HERE / engine.__file__) == EXPECTED_ENGINE_SHA256
    engine.N_VALUE = 46
    engine.SMALL_F_MAX_ORDER = 28
    engine.REFINED_F_ORDERS = tuple(range(29, 37))
    engine.SIMPLE_F_ORDERS = tuple(range(37, 46))
    engine.OUTPUT = OUTPUT
    engine.main()
    payload = json.loads(OUTPUT.read_text(encoding="utf-8"))
    assert payload["aggregate"]["negative"] == 0
    assert payload["aggregate"]["regions"] == 148
    assert payload["partition"] == {
        "small_F_max_order": 28,
        "refined_exact_F_orders": list(range(29, 37)),
        "simple_exact_F_orders": list(range(37, 46)),
        "refined_normalized_y_breaks": [str(value) for value in engine.Y_BREAKS],
    }
    assert all(row["negative"] == 0 for row in payload["rows"])
    payload.update(
        {
            "schema": "rank8-delta1-new-leaf-mask3-order46-refined-exact-F-v1",
            "status": "PASS_EXACT_DELTA1_NEW_LEAF_MASK3_FOR_D_ORDER_46",
            "theorem": (
                "Let A be a tree, v a vertex, D=A-v, F=A-N[v], and attach "
                "a new leaf w at v. If |D|=46, then the Delta1 new-leaf "
                "residual at c8=Q7(C)_upper and d7=Q6(D)_upper is nonnegative."
            ),
            "wrapped_engine": {
                "path": Path(engine.__file__).name,
                "sha256": EXPECTED_ENGINE_SHA256,
            },
            "source_sha256": sha256(Path(__file__)),
        }
    )
    temporary = OUTPUT.with_suffix(OUTPUT.suffix + ".tmp")
    temporary.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    os.replace(temporary, OUTPUT)
    print(payload["status"])
    print("REGIONS", payload["aggregate"]["regions"])
    print("COEFFICIENTS", payload["aggregate"]["coefficients"])
    print("SOURCE", sha256(Path(__file__)))
    print("REPORT", sha256(OUTPUT))


if __name__ == "__main__":
    main()
