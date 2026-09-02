#!/usr/bin/env python3
"""Exact Delta1 mask-3 certificate for D orders 51, 52, and 53.

The low-order refinement keeps the live d4/d5 and d5/d6 ratios inside the
rank-4 and rank-6 shadows of F.  It also uses coefficientwise path minimality
for forests on the small-F side.  All sign checks are exact tensor Bernstein
checks over rational boxes.
"""

from __future__ import annotations

import hashlib
import json
import os
from pathlib import Path

import probe_rank8_delta1_mask3_low_order_F_split_path_floor_root as probe


HERE = Path(__file__).resolve().parent
OUTPUT = HERE / (
    "rank8_delta1_new_leaf_mask3_orders51_53_coupled_F_root_20260825.json"
)
ORDERS = (51, 52, 53)

PINNED = {
    "probe_rank8_delta1_mask3_low_order_F_split_path_floor_root.py":
        "CA0A2D49A9F859537BB1A6AA0CA5CF69EC0CDADC6514AA59832457FBDC5B44E5",
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
    "forest_v6_alpha10_exact_20260813.json":
        "5F3954C8E3CC8817376CE89685CF283BAEE2FF55214A8E9FCFE816D50A8E9AA4",
    "FOREST_V7_ORDER25_THEOREM_2026-08-13.md":
        "724A3804237E3C1D999E6ADA3FA5CEC6D90BFD9C51988C3716F3F828B3521C63",
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
    v6 = json.loads(
        (HERE / "forest_v6_alpha10_exact_20260813.json").read_text(encoding="utf-8")
    )
    v7 = json.loads(
        (HERE / "forest_v7_order25_exact_20260813.json").read_text(encoding="utf-8")
    )
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
    assert probe.corner.polynomial_record(cached_endpoint[0]) == reference[
        "cleared_numerator"
    ]
    probe.corner.new_leaf_corner = lambda rank, mask: cached_endpoint
    probe.COUPLED_F_ORDER_F6_SHADOW = True
    probe.COUPLED_F6_USE_COUPLED_ABOVE_ONE = True
    probe.COUPLED_F_ORDER_F4_RATIO = True
    probe.COUPLED_F4_USE_RATIO_ABOVE_SWITCH = False

    reports = []
    totals = {key: 0 for key in ("regions", "coefficients", "negative", "zero", "positive")}
    for order in ORDERS:
        probe.N_VALUE = order
        probe.SMALL_F_MAX_ORDER = 2 * order // 3
        probe.main()
        report = json.loads(probe.OUTPUT.read_text(encoding="utf-8"))
        assert report["D_order"] == order
        assert report["F_order_split"]["small_max"] == 2 * order // 3
        assert report["F_order_split"]["large_min"] == 2 * order // 3 + 1
        assert report["F_order_split"]["coupled_F_order_F6_shadow"] is True
        assert report["F_order_split"]["coupled_F6_used_above_one"] is True
        assert report["F_order_split"]["coupled_F_order_F4_ratio"] is True
        assert report["F_order_split"]["coupled_F4_ratio_used_above_switch"] is False
        assert report["rows"]
        for row in report["rows"]:
            assert row["negative"] == 0
            assert row["negative_vertices"] == 0
            assert row["zero"] + row["positive"] == row["coefficients"]
            assert "adaptive" not in row
            totals["regions"] += 1
            for key in ("coefficients", "negative", "zero", "positive"):
                totals[key] += row[key]
        reports.append(report)
        print(
            "ORDER_PASS", order, "REGIONS", len(report["rows"]),
            "TOTAL_COEFFICIENTS", totals["coefficients"], flush=True,
        )

    assert [report["D_order"] for report in reports] == list(ORDERS)
    assert totals["negative"] == 0
    payload = {
        "schema": "rank8-delta1-new-leaf-mask3-orders51-53-coupled-F-v1",
        "status": (
            "PASS_EXACT_DELTA1_NEW_LEAF_MASK3_FOR_D_ORDERS_51_THROUGH_53"
        ),
        "theorem": (
            "Let A be a tree, v a vertex, D=A-v, F=A-N[v], and attach a new "
            "leaf w at v. If 51<=|D|<=53, then the Delta1 new-leaf residual "
            "at c8=Q7(C)_upper and d7=Q6(D)_upper is nonnegative."
        ),
        "order_partition": {
            "first": ORDERS[0],
            "last": ORDERS[-1],
            "count": len(ORDERS),
            "small_F_rule": "M=|F|<=floor(2N/3)",
            "large_F_rule": "M=|F|>=floor(2N/3)+1",
        },
        "lemmas": {
            "D_ratio_bounds": [
                "5/(N-4)<=d4/d5<=5(N-3)/((N-7)(N-8))",
                "6/(N-5)<=d5/d6<=6/(mu4_floor-3+2/mu4_floor)",
            ],
            "forest_path_floor": (
                "For every N-vertex forest D, dk>=i_k(P_N)=C(N-k+1,k); "
                "connect components and apply coefficientwise path minimality for trees."
            ),
            "large_F_coupled_rank4": (
                "mu4(F)>=tF and f5=x*u5 imply f4<=(5/tF)*x*u5, "
                "retaining y=d4/d5 rather than maximizing it first."
            ),
            "F_order_cap": "F=A-N[v] has M<=N-1.",
            "large_F_coupled_rank6": (
                "6f6<=(M-5)f5<=(N-6)f5, so "
                "u6<=((N-6)/6)*x*u5, retaining x=d5/d6."
            ),
            "small_F_coupled_rank6": (
                "For M<=M0, 6f6<=(M0-5)f5 and fk<=C(M0,k), "
                "combined with the path floors for dk."
            ),
            "missing_from_F_shadow": "4(d5-f5)<=(N-4)(d4-f4)",
            "sign_engine": "exact tensor Bernstein coefficients on every split box",
        },
        "aggregate": {"orders": len(reports), **totals},
        "reports": reports,
        "dependency_sha256": actual,
        "source_sha256": sha256(Path(__file__)),
    }
    atomic_json(OUTPUT, payload)
    print(payload["status"])
    print("ORDERS", len(reports), "REGIONS", totals["regions"], "COEFFICIENTS", totals["coefficients"])
    print("SOURCE", sha256(Path(__file__)))
    print("REPORT", sha256(OUTPUT))


if __name__ == "__main__":
    main()
