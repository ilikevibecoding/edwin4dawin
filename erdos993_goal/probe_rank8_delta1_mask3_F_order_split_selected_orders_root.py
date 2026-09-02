#!/usr/bin/env python3
"""Replay the order-split Delta1 mask-3 probe at selected residual orders."""

from __future__ import annotations

import json
from pathlib import Path

import probe_rank8_delta1_mask3_order54_F_order_split_root as probe


HERE = Path(__file__).resolve().parent
OUTPUT = HERE / "rank8_delta1_mask3_F_order_split_selected_orders_probe_root_20260825.json"
ORDERS = (54, 60, 80, 100, 120, 150, 179)


def main() -> None:
    cached_endpoint = probe.corner.new_leaf_corner(1, 3)
    probe.corner.new_leaf_corner = lambda rank, mask: cached_endpoint
    reports = []
    for order in ORDERS:
        probe.N_VALUE = order
        probe.SMALL_F_MAX_ORDER = 7 * order // 10
        probe.main()
        report = json.loads(probe.OUTPUT.read_text(encoding="utf-8"))
        reports.append(report)
        negative = sum(row["negative"] for row in report["rows"])
        print(
            "N", order, "SMALL_F_MAX", probe.SMALL_F_MAX_ORDER,
            "NEG", negative, flush=True,
        )
    payload = {
        "schema": "rank8-delta1-mask3-F-order-split-selected-orders-probe-v1",
        "status": "DIAGNOSTIC_NO_THEOREM_CLAIM",
        "orders": list(ORDERS),
        "small_F_rule": "floor(7*N/10)",
        "reports": reports,
    }
    OUTPUT.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")


if __name__ == "__main__":
    main()
