#!/usr/bin/env python3
"""Exact replay for the 2026-07-24 Erdős #993 checkpoint."""

from __future__ import annotations

import json
from pathlib import Path

from bouquet_ratio_evolution import fast_poly, first_valley, ratio_score
from caterpillar_evolution import (
    exact_poly,
    exact_valley,
    specimen_n,
    tree_edges,
)

HERE = Path(__file__).resolve().parent


def verify_lobster() -> dict:
    data = json.loads((HERE / "lobster_run_995.json").read_text(
        encoding="utf-8"))
    loads = tuple(data["champion"]["loads"])
    poly = exact_poly(loads)
    n, edges = tree_edges(loads)
    score, detail = ratio_score(poly)
    assert n == specimen_n(loads) == 1000
    assert len(edges) == n - 1
    assert exact_valley(poly) is None
    assert first_valley(poly) is None
    assert detail["any_rebound_index"] == -1
    return {
        "n": n,
        "edges": len(edges),
        "degree": len(poly) - 1,
        "mode": detail["mode"],
        "first_descent_ratio_index": detail[
            "first_descent_ratio_index"],
        "adjacent_after_mode": detail["adjacent_after_mode"],
        "ratio_rebound": False,
        "valley": False,
        "score": score,
    }


def verify_bouquet() -> dict:
    data = json.loads((HERE / "bouquet_ratio_run_998.json").read_text(
        encoding="utf-8"))
    raw_spec = data["champion"]["spec"]
    spec = (
        tuple(tuple(leg for leg in gadget)
              for gadget in raw_spec[0]),
        tuple(raw_spec[1]),
        int(raw_spec[2]),
    )
    poly = fast_poly(spec)
    score, detail = ratio_score(poly)
    assert first_valley(poly) is None
    assert detail["legal_rebound_index"] == -1
    assert detail["boundary_gap"] == 5
    return {
        "tested": data["tested"],
        "n": data["champion"]["n"],
        "degree": len(poly) - 1,
        "tail_start": detail["tail_start"],
        "rebound_index": detail["any_rebound_index"],
        "boundary_gap": detail["boundary_gap"],
        "rebound_ratio": detail["any_rebound_ratio"],
        "rebound_factor": detail["any_rebound_factor"],
        "legal_rebound": False,
        "valley": False,
        "score": score,
    }


def main() -> None:
    result = {
        "lobster_champion": verify_lobster(),
        "bouquet_campaign": verify_bouquet(),
        "certificate": "passed",
    }
    print(json.dumps(result, indent=2))


if __name__ == "__main__":
    main()
