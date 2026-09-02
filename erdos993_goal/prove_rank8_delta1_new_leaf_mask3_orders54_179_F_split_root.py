#!/usr/bin/env python3
"""Exact finite-range theorem for Delta1 new-leaf endpoint mask 3.

For every residual order 54<=N<=179, split on M=|F| at floor(7N/10).
The large-F side uses the sharp forest rank-(4,5) ratio.  The small-F
side uses elementary binomial ceilings together with a forbidden-edge union
floor for D.  Exact tensor Bernstein expansions then cover every compatible
ratio/containment box.
"""

from __future__ import annotations

import hashlib
import json
import os
from pathlib import Path

import probe_rank8_delta1_mask3_order54_F_order_split_root as probe


HERE = Path(__file__).resolve().parent
OUTPUT = HERE / "rank8_delta1_new_leaf_mask3_orders54_179_F_split_root_20260825.json"
CHECKPOINT = HERE / "rank8_delta1_new_leaf_mask3_orders54_179_F_split_checkpoint_root_20260825.json"
ORDERS = tuple(range(54, 180))

PINNED = {
    "probe_rank8_delta1_mask3_order54_F_order_split_root.py":
        "4854A33999910FA5C07FD69DCC58A7431B31E883FDA1191C7FB0CC36DE178C2B",
    "probe_rank8_delta1_mask3_shadow_adaptive_subdivision_root.py":
        "15745DEC544D96B89C490BCCE82EBB9C492C91538D33527200A29CEF59D48E90",
    "analyze_rank8_delta03_arbitrary_leaf_extension_q_corner_agent.py":
        "D3A17F85CC3E31A229BED7E16201FCDA031E8C9D63ED5568AF0F90D0A66DBBBB",
    "analyze_rank8_delta03_arbitrary_leaf_extension_symbolic_agent.py":
        "CC1F0204C2CBE3B202E35CEB60EBD6FA847CBEF1BE74DD255023198AB3707BAA",
    "rank8_delta03_arbitrary_leaf_extension_new_leaf_r1_m03_q_corner_agent_20260823.json":
        "2ED841411515F64B53226DE715A98CB28182CA6CCD2EAC0858F7E59D0CC297AB",
    "FOREST_V6_ALPHA10_THEOREM_2026-08-13.md":
        "D6F2B1017B3C222167209AC00158423C98607CAE1804415C24ED82F2DC8F91FF",
    "prove_forest_v6_alpha10.py":
        "2B3620BEF00E761B857AAFBAA2BABB79A5419D0E0D26AB45C787CED2585DD947",
    "forest_v6_alpha10_exact_20260813.json":
        "5F3954C8E3CC8817376CE89685CF283BAEE2FF55214A8E9FCFE816D50A8E9AA4",
    "FOREST_V7_ORDER25_THEOREM_2026-08-13.md":
        "724A3804237E3C1D999E6ADA3FA5CEC6D90BFD9C51988C3716F3F828B3521C63",
    "prove_forest_v7_order25.py":
        "246D36938DAFDB3763D1FB7CB8A5A60EE0488DAC587260ADCB23BDE16B5EB2B9",
    "forest_v7_order25_exact_20260813.json":
        "DB992D316684E2A8EF354B19A0889B636E4EC4EC7917F809EFBF97B0C4BCF7F4",
}


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def atomic_json(path: Path, payload: dict[str, object]) -> None:
    temporary = path.with_suffix(path.suffix + ".tmp")
    temporary.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    os.replace(temporary, path)


def main() -> None:
    actual = {name: sha256(HERE / name) for name in PINNED}
    assert actual == PINNED, (actual, PINNED)
    v6 = json.loads((HERE / "forest_v6_alpha10_exact_20260813.json").read_text(encoding="utf-8"))
    v7 = json.loads((HERE / "forest_v7_order25_exact_20260813.json").read_text(encoding="utf-8"))
    assert v6["status"] == "PASS_EXACT_ALL_FOREST_V6_ALPHA_AT_LEAST_10"
    assert v7["status"] == "PASS_EXACT_ALL_FOREST_V7_ORDER_AT_LEAST_25"

    cached_endpoint = probe.corner.new_leaf_corner(1, 3)
    reference = json.loads(
        (
            HERE
            / "rank8_delta03_arbitrary_leaf_extension_new_leaf_r1_m03_"
              "q_corner_agent_20260823.json"
        ).read_text(encoding="utf-8")
    )
    assert probe.corner.polynomial_record(cached_endpoint[0]) == reference["cleared_numerator"]
    probe.corner.new_leaf_corner = lambda rank, mask: cached_endpoint

    reports = []
    total_regions = total_coefficients = total_zero = total_positive = 0
    for order in ORDERS:
        probe.N_VALUE = order
        probe.SMALL_F_MAX_ORDER = 7 * order // 10
        probe.main()
        report = json.loads(probe.OUTPUT.read_text(encoding="utf-8"))
        assert report["D_order"] == order
        assert report["F_order_split"]["small_max"] == 7 * order // 10
        assert report["F_order_split"]["large_min"] == 7 * order // 10 + 1
        assert report["rows"]
        for row in report["rows"]:
            assert row["negative"] == 0
            assert row["negative_vertices"] == 0
            assert row["zero"] + row["positive"] == row["coefficients"]
            assert "adaptive" not in row
            total_regions += 1
            total_coefficients += row["coefficients"]
            total_zero += row["zero"]
            total_positive += row["positive"]
        reports.append(report)
        checkpoint = {
            "schema": "rank8-delta1-mask3-orders54-179-F-split-checkpoint-v1",
            "status": "RUNNING_EXACT_FINITE_ORDER_SWEEP",
            "completed_orders": [entry["D_order"] for entry in reports],
            "last_completed_order": order,
            "reports": reports,
        }
        atomic_json(CHECKPOINT, checkpoint)
        print(
            "ORDER_PASS", order, "REGIONS", len(report["rows"]),
            "TOTAL_COEFFICIENTS", total_coefficients, flush=True,
        )

    assert [report["D_order"] for report in reports] == list(ORDERS)
    payload = {
        "schema": "rank8-delta1-new-leaf-mask3-orders54-179-F-split-v1",
        "status": "PASS_EXACT_DELTA1_NEW_LEAF_MASK3_FOR_D_ORDERS_54_THROUGH_179",
        "theorem": (
            "Let A be a tree, v a vertex, D=A-v, F=A-N[v], and attach a new "
            "leaf w at v. If 54<=|D|<=179, then the Delta1 new-leaf residual "
            "at c8=Q7(C)_upper and d7=Q6(D)_upper is nonnegative."
        ),
        "order_partition": {
            "first": ORDERS[0],
            "last": ORDERS[-1],
            "count": len(ORDERS),
            "small_F_rule": "M=|F|<=floor(7N/10)",
            "large_F_rule": "M=|F|>=floor(7N/10)+1",
        },
        "lemmas": {
            "D_ratio_bounds": [
                "5/(N-4)<=d4/d5<=5(N-3)/((N-7)(N-8))",
                "6/(N-5)<=d5/d6<=6/(mu4_floor-3+2/mu4_floor)",
            ],
            "large_F_ratio": (
                "mu4(F)>=((M-7)(M-8))/(M-3), hence "
                "U4/U5<=mu4(D)/mu4(F)"
            ),
            "small_F_absolute": (
                "fk<=C(M,k), while dk>=C(N,k)-(N-1)C(N-2,k-2) "
                "by the forbidden-edge union bound"
            ),
            "internal_F_shadow": "6f6<=(N-5)f5",
            "missing_from_F_shadow": "4(d5-f5)<=(N-4)(d4-f4)",
            "sign_engine": "exact tensor Bernstein coefficients on every split box",
        },
        "aggregate": {
            "orders": len(reports),
            "regions": total_regions,
            "coefficients": total_coefficients,
            "negative": 0,
            "zero": total_zero,
            "positive": total_positive,
        },
        "reports": reports,
        "dependency_sha256": actual,
        "source_sha256": sha256(Path(__file__)),
    }
    atomic_json(OUTPUT, payload)
    CHECKPOINT.unlink(missing_ok=True)
    print(payload["status"])
    print("ORDERS", len(reports), "REGIONS", total_regions, "COEFFICIENTS", total_coefficients)
    print("OUTPUT_SHA256", sha256(OUTPUT))


if __name__ == "__main__":
    main()
