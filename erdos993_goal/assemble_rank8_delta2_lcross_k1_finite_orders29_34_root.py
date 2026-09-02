#!/usr/bin/env python3
"""Assemble the exact and independently audited n=29..34 finite cells."""

from __future__ import annotations

import hashlib
import json
import math
import os
from fractions import Fraction
from pathlib import Path


HERE = Path(__file__).resolve().parent
OUTPUT = HERE / "rank8_delta2_lcross_k1_finite_orders29_34_assembled_root_20260826.json"
BATCH = HERE / "rank8_delta2_lcross_k1_finite_orders_batch_exact_root_20260826.json"
AUDIT = HERE / "rank8_delta2_lcross_k1_finite_orders29_34_independent_audit_root_20260826.json"
STARS = HERE / "rank8_delta2_stars_n28_n34_exact_root_20260826.json"
STARS_AUDIT = HERE / "rank8_delta2_stars_n28_n34_independent_audit_root_20260826.json"
SPARSE = HERE / "rank8_delta2_lcross_k1_source_sparse_root_20260826.json"


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def load(path: Path):
    return json.loads(path.read_text(encoding="utf-8"))


def main() -> int:
    batch = load(BATCH)
    audit = load(AUDIT)
    stars = load(STARS)
    stars_audit = load(STARS_AUDIT)
    sparse = load(SPARSE)
    assert batch["status"] == "PASS_EXACT_DELTA2_LCROSS_K1_FINITE_ORDERS_BATCH"
    assert batch["orders"] == list(range(30, 35))
    assert audit["status"] == "PASS_INDEPENDENT_RANK8_DELTA2_LCROSS_K1_FINITE_ORDERS_29_TO_34_AUDIT"
    assert audit["coverage"]["cells"] == 12
    assert audit["coverage"]["negative_coefficients"] == 0
    assert stars["status"] == "PASS_EXACT_RANK8_DELTA2_ALL_ROOTED_STARS_N28_N34"
    assert stars_audit["status"] == "PASS_INDEPENDENT_RANK8_DELTA2_ALL_ROOTED_STARS_N28_N34_AUDIT"
    assert sparse["status"] == "PASS_EXACT_RANK8_DELTA2_LCROSS_K1_SOURCE_SPARSE"

    rows = []
    artifacts = {
        BATCH.name: sha256(BATCH),
        AUDIT.name: sha256(AUDIT),
        STARS.name: sha256(STARS),
        STARS_AUDIT.name: sha256(STARS_AUDIT),
        SPARSE.name: sha256(SPARSE),
    }
    for order in range(29, 35):
        cells = []
        for branch in ("low", "high"):
            path = HERE / f"rank8_delta2_lcross_k1_finite_surplus_n{order}_{branch}_exact_root_20260826.json"
            report = load(path)
            assert report["status"] == "PASS_EXACT_DELTA2_LCROSS_K1_FINITE_SURPLUS_CELL"
            assert report["order"] == order
            assert report["coefficient_sign_counts"]["negative"] == 0
            artifacts[path.name] = sha256(path)
            cells.append(report)
        threshold = Fraction(order - 2, 2)
        nonstar_maximum = Fraction(math.comb(order - 3, 2))
        low_interval = [Fraction(value) for value in cells[0]["degree_surplus_interval"]]
        high_interval = [Fraction(value) for value in cells[1]["degree_surplus_interval"]]
        assert low_interval == [Fraction(6), threshold]
        assert high_interval == [threshold, nonstar_maximum]
        rows.append({
            "order": order,
            "continuous_nonstar_interval": ["6", str(nonstar_maximum)],
            "common_split_endpoint": str(threshold),
            "low_report": f"rank8_delta2_lcross_k1_finite_surplus_n{order}_low_exact_root_20260826.json",
            "high_report": f"rank8_delta2_lcross_k1_finite_surplus_n{order}_high_exact_root_20260826.json",
            "low_minimum": cells[0]["minimum"],
            "high_minimum": cells[1]["minimum"],
            "missing_real_surplus_values": [],
        })

    payload = {
        "schema": "rank8-delta2-lcross-k1-finite-orders29-34-assembled-root-v1",
        "status": "PASS_EXACT_AND_INDEPENDENT_RANK8_DELTA2_LCROSS_K1_FINITE_ORDERS_29_TO_34",
        "theorem": (
            "For every order 29 through 34, the k=1 lower-cross Delta2 "
            "source is nonnegative on the complete nonstar degree-surplus "
            "interval e>=6; the star is positive in both root orbits."
        ),
        "coverage": {
            "orders": [29, 34],
            "continuous_cells": 12,
            "independently_recomputed_cells": 12,
            "star_root_orbit_values": 12,
            "missing_orders": [],
            "missing_nonstar_surplus_values": [],
        },
        "order_rows": rows,
        "artifacts": artifacts,
        "source_sha256": sha256(Path(__file__)),
        "scope_warning": (
            "Degree-surplus families 0 through 5 and the other three live "
            "Delta2 tensors remain separate proof components."
        ),
    }
    temporary = OUTPUT.with_suffix(OUTPUT.suffix + ".tmp")
    temporary.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    os.replace(temporary, OUTPUT)
    print(payload["status"])
    print("ORDERS", len(rows), "CELLS", 12)
    print("SOURCE", payload["source_sha256"])
    print("REPORT", sha256(OUTPUT))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
