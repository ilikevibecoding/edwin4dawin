#!/usr/bin/env python3
"""Independent exact replay of the retained prefix-2SB certificates."""

from __future__ import annotations

import json
import sys
from pathlib import Path

import networkx as nx

HERE = Path(__file__).resolve().parent
PUBLIC_REPO = Path(r"C:\Users\chris\tmp\erdos993_public")
sys.path.insert(0, str(HERE))
sys.path.insert(0, str(PUBLIC_REPO))

from bouquet_parity_search import (  # noqa: E402
    exact_two_step_extension_margin,
)
from indpoly import independence_poly  # noqa: E402
from scripts.valley_search import bouquet_poly  # noqa: E402
from two_step_extension_stress import tree_poly  # noqa: E402
from verify_galvin_ts_failure import closed_form  # noqa: E402


N28 = PUBLIC_REPO / "results" / "analysis_n28_modal_lc_nm.json"
FREEFORM = HERE / "two_step_freeform_prefix_gap_n200_20260724.json"
BOUQUET = HERE / "bouquet_two_step_prefix_gap_fixed_500_20260724.json"


def better(candidate: dict, incumbent: dict | None) -> bool:
    if incumbent is None:
        return True
    return (
        candidate["additive_numerator"]
        * incumbent["additive_denominator"]
        > incumbent["additive_numerator"]
        * candidate["additive_denominator"]
    )


def margin(poly: list[int]) -> dict:
    return exact_two_step_extension_margin(
        poly,
        min_index=3,
        ranking="additive-gap",
        scope="prefix",
    )


def verify_stored_margin(stored: dict, replayed: dict) -> None:
    for key in (
        "r",
        "left",
        "right",
        "difference",
        "additive_numerator",
        "additive_denominator",
    ):
        assert stored[key] == replayed[key], (key, stored[key], replayed[key])
    assert replayed["difference"] <= 0


def freeform_certificate() -> dict:
    data = json.loads(FREEFORM.read_text(encoding="utf-8"))
    champion = data["champions"][0]
    n = champion["order"]
    adjacency = [[] for _ in range(n)]
    for u, v in champion["edges"]:
        adjacency[u].append(v)
        adjacency[v].append(u)
    poly = independence_poly(n, adjacency)
    replayed = margin(poly)
    verify_stored_margin(champion["margin"], replayed)
    return {
        "trees_tested": data["tested"],
        "order": n,
        "alpha": len(poly) - 1,
        "margin": replayed,
    }


def bouquet_certificate() -> dict:
    data = json.loads(BOUQUET.read_text(encoding="utf-8"))
    champion = data["champions"][0]
    gadgets, paths, leaves = champion["spec"]
    poly = bouquet_poly(
        [tuple(legs) for legs in gadgets],
        tuple(paths),
        leaves,
    )
    replayed = margin(poly)
    verify_stored_margin(champion["margin"], replayed)
    return {
        "trees_tested": data["tested"],
        "order": champion["n"],
        "alpha": len(poly) - 1,
        "margin": replayed,
    }


def n28_corpus() -> dict:
    data = json.loads(N28.read_text(encoding="utf-8"))
    graph6_values = {
        item["graph6"]
        for item in data["top_near_misses"] + data["top_lc_failures"]
    }
    best = None
    best_graph6 = None
    for graph6 in sorted(graph6_values):
        graph = nx.from_graph6_bytes(graph6.encode("ascii"))
        adjacency = [
            sorted(graph.neighbors(vertex))
            for vertex in range(graph.number_of_nodes())
        ]
        replayed = margin(tree_poly(adjacency))
        assert replayed["difference"] <= 0
        if replayed["r"] is not None and better(replayed, best):
            best = replayed
            best_graph6 = graph6
    return {
        "distinct_trees": len(graph6_values),
        "best_graph6": best_graph6,
        "margin": best,
    }


def galvin_grid(max_parameter: int = 30, max_order: int = 1000) -> dict:
    checked = 0
    best = None
    parameters = None
    for m in range(1, max_parameter + 1):
        for t in range(1, max_parameter + 1):
            order = 1 + m * (1 + 2 * t)
            if order > max_order:
                continue
            replayed = margin(closed_form(m, t))
            assert replayed["difference"] <= 0
            if replayed["r"] is None:
                continue
            checked += 1
            if better(replayed, best):
                best = replayed
                parameters = {"m": m, "t": t, "order": order}
    return {
        "parameter_pairs": checked,
        "best_parameters": parameters,
        "margin": best,
    }


def main() -> int:
    result = {
        "definition": "mu[k+2] - mu[k] - 2 <= 0",
        "scope": "k <= ceil((2 alpha - 1)/3) - 2",
        "freeform_certificate": freeform_certificate(),
        "bouquet_certificate": bouquet_certificate(),
        "order_28_hard_corpus": n28_corpus(),
        "galvin_grid": galvin_grid(),
        "status": "all exact replay checks passed; finite evidence only",
    }
    print(json.dumps(result, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
