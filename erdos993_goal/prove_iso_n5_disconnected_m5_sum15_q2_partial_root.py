#!/usr/bin/env python3
"""Fail-closed q=2 checkpoint for disconnected-M5 unique sum15."""

from __future__ import annotations

import hashlib
import json
from pathlib import Path

import networkx as nx
import sympy as sp

from probe_iso_leaf_cross_remainder_root import add, mul, poly_forest
from probe_iso_n5_disconnected_m5_sum15_q2_coarse_root import (
    generic_rows,
    mode_bounds,
)
from probe_iso_n5_disconnected_m5_sum16_q2_component_newton_g1_nonadjacent import shift
from prove_iso_n5_disconnected_m5_middle_interval_g1_nonadjacent import at


HERE = Path(__file__).resolve().parent
OUTPUT = HERE / "iso_n5_disconnected_m5_sum15_q2_partial_exact_root_20260830.json"
MARKER = "PASS_EXACT_PARTIAL_ISO_N5_DISCONNECTED_M5_SUM15_Q2_ROOT"
DEPENDENCIES = {
    "probe_iso_n5_disconnected_m5_sum15_q2_coarse_root.py":
        "702A53AB121AA2FC4609A5B2B030C6B30BA4F7E5BE2F9FA936B8712D612821D2",
    "probe_iso_n5_disconnected_m5_sum16_q2_component_newton_g1_nonadjacent.py":
        "B938A7416091632E8725B34A029FA3F9260163CDD57CD6334C71D91A11435F59",
    "probe_iso_leaf_cross_remainder_root.py":
        "A9C643C3A223E004365E5013A2433517BC60073D1B230D92477FFDC7E3B6A5F1",
    "prove_iso_n5_disconnected_m5_middle_interval_g1_nonadjacent.py":
        "079C32D829AA91F29B539B869FA57C946BE0DD101AE06E6B5A80A41207AECD31",
}


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def finite_certificate(x, h, rows):
    evaluator = sp.lambdify((*x, *h), rows, modules="math")
    minima = {mode: [None] * 6 for mode in ("distinct", "shared")}
    counts = {mode: 0 for mode in minima}
    cache = {}
    for order in range(1, 12):
        items = []
        candidates = [nx.empty_graph(1)] if order == 1 else nx.nonisomorphic_trees(order)
        for tree0 in candidates:
            tree = nx.convert_node_labels_to_integers(tree0)
            a = poly_forest(tree)
            for w in tree:
                lower = tree.copy()
                lower.remove_node(w)
                items.append((a, poly_forest(lower)))
        cache[order] = items
    order_rows = {}
    for total in range(2, 13):
        local = {mode: [None] * 6 for mode in minima}
        local_counts = {mode: 0 for mode in minima}
        for e1 in range(1, total):
            e2 = total - e1
            for a1, g1 in cache[e1]:
                for a2, g2 in cache[e2]:
                    hpoly = mul(a1, a2)
                    bases = {
                        "distinct": mul(add(a1, shift(g1)), add(a2, shift(g2))),
                        "shared": add(hpoly, shift(mul(g1, g2))),
                    }
                    for mode, xpoly in bases.items():
                        arguments = (
                            *(at(xpoly, rank) for rank in range(8)),
                            *(at(hpoly, rank) for rank in range(7)),
                        )
                        values = [int(round(value)) for value in evaluator(*arguments)]
                        assert all(value >= 0 for value in values), (mode, total, values)
                        for index, value in enumerate(values):
                            minima[mode][index] = (
                                value if minima[mode][index] is None
                                else min(minima[mode][index], value)
                            )
                            local[mode][index] = (
                                value if local[mode][index] is None
                                else min(local[mode][index], value)
                            )
                        counts[mode] += 1
                        local_counts[mode] += 1
        order_rows[str(total)] = {
            "H_order": total,
            "ordered_marked_component_pairs": local_counts,
            "minimum_R0_through_R5": local,
        }
    return {
        "H_orders": [2, 12],
        "ordered_marked_component_pairs": counts,
        "newton_row_checks": {mode: 6 * count for mode, count in counts.items()},
        "global_minimum_R0_through_R5": minima,
        "rows": order_rows,
    }


def main():
    for name, expected in DEPENDENCIES.items():
        assert sha256(HERE / name) == expected, name
    x, h, rows = generic_rows()
    finite = finite_certificate(x, h, rows)
    assert finite["ordered_marked_component_pairs"] == {
        "distinct": 30449,
        "shared": 30449,
    }
    assert finite["global_minimum_R0_through_R5"] == {
        "distinct": [28, 169, 363, 362, 172, 30],
        "shared": [6, 36, 131, 205, 142, 30],
    }
    coarse = {
        mode: mode_bounds(x, h, rows, mode)
        for mode in ("distinct", "shared")
    }
    for mode in coarse:
        assert all(
            coarse[mode][index]["negative_shifted_coefficients"] == 0
            for index in range(2, 6)
        )
        assert all(
            coarse[mode][index]["negative_shifted_coefficients"] > 0
            for index in range(2)
        )
    report = {
        "marker": MARKER,
        "theorem": (
            "For q=2 active rooted pairs, every Newton row R0,...,R5 of twice "
            "unique sum15 is positive for |H|<=12, and R2,...,R5 are strictly "
            "positive for every |H|>=13."
        ),
        "exact_q2_geometry": {
            "distinct": "P=(1+x)^t(A1+xG1)(A2+xG2), H=A1A2",
            "shared": "P=(1+x)^t(A1A2+xG1G2), H=A1A2",
            "definitions": "Gi=Ai-wi; the two positive selected degrees are 1+1 or 2",
        },
        "newton_expansion": {
            "identity": "2*sum15=sum_{j=0}^5 R_j*binom(t,j)",
            "R0_through_R5": [str(sp.factor(row)) for row in rows],
        },
        "finite_certificate": finite,
        "large_order_coarse_bounds": coarse,
        "remaining_obligation": (
            "Prove R0 and R1 for |H|>=13 in both exact q=2 component modes."
        ),
        "pinned_dependencies": DEPENDENCIES,
        "scope": (
            "Exact partial q=2 active-root theorem for unique sum15. It is not "
            "a proof of the two remaining large-order Newton rows, q>=3, all "
            "disconnected M5, g1, or Erdos Problem 993."
        ),
        "source_sha256": sha256(Path(__file__)),
    }
    raw = json.dumps(report, indent=2, sort_keys=True, default=str) + "\n"
    OUTPUT.write_text(raw, encoding="utf-8", newline="\n")
    print(json.dumps({
        "marker": MARKER,
        "ordered_pairs_per_mode": 30449,
        "finite_newton_checks_total": 365388,
        "large_order_rows_closed": [2, 3, 4, 5],
        "remaining_large_order_rows": [0, 1],
    }, indent=2), flush=True)
    print("REPORT_SHA256", hashlib.sha256(raw.encode()).hexdigest().upper(), flush=True)
    print(MARKER, flush=True)


if __name__ == "__main__":
    main()
