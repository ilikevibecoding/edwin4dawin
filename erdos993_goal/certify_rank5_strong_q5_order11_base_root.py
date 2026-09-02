#!/usr/bin/env python3
"""Exact finite base for Q5(T) >= i4(T)i5(T)/5 at order 11."""

from __future__ import annotations

import hashlib
import json
from pathlib import Path

import networkx as nx

from scan_fixed_rank_leaf_curvature_fast import all_root_states
from verify_rank5_leaf_induction_reduction import q5


HERE = Path(__file__).resolve().parent
OUTPUT = HERE / "rank5_strong_q5_order11_base_exact_root_20260826.json"


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def coefficient(poly, rank):
    return poly[rank] if rank < len(poly) else 0


def main():
    order = 11
    count = 0
    negative = 0
    minimum = None
    witness = None
    for index, tree in enumerate(nx.nonisomorphic_trees(order)):
        _, polynomial = all_root_states(tree, 6)
        i4 = coefficient(polynomial, 4)
        i5 = coefficient(polynomial, 5)
        reserve5 = 5 * q5(polynomial) - i4 * i5
        count += 1
        negative += reserve5 < 0
        if minimum is None or reserve5 < minimum:
            minimum = reserve5
            witness = {
                "tree_index": index,
                "graph6": nx.to_graph6_bytes(tree, header=False).decode().strip(),
                "coefficients_0_to_6": list(polynomial),
                "Q5": q5(polynomial),
                "five_Q5_minus_i4_i5": reserve5,
                "Q5_over_i4_i5": f"{q5(polynomial)}/{i4 * i5}",
            }
    assert count == 235
    assert negative == 0
    assert minimum is not None and minimum > 0
    assert witness is not None
    poly = witness["coefficients_0_to_6"]
    assert 5 * q5(poly) - poly[4] * poly[5] == minimum
    payload = {
        "schema": "rank5-strong-q5-order11-base-root-v1",
        "status": "PASS_EXACT_RANK5_STRONG_Q5_ORDER11_BASE",
        "theorem": (
            "Every unlabeled tree T of order 11 satisfies "
            "Q5(T)>=i4(T)i5(T)/5."
        ),
        "order": order,
        "unlabeled_trees": count,
        "negative_reserves": negative,
        "minimum_five_Q5_minus_i4_i5": str(minimum),
        "minimum_witness": witness,
        "source_sha256": sha256(Path(__file__)),
        "scope_warning": (
            "This is the induction base only; higher orders require the exact "
            "terminal-payment cells and leaf identity."
        ),
    }
    temporary = OUTPUT.with_suffix(OUTPUT.suffix + ".tmp")
    temporary.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    temporary.replace(OUTPUT)
    print(payload["status"])
    print("TREES", count)
    print("MINIMUM", minimum)
    print("SOURCE", payload["source_sha256"])
    print("REPORT", sha256(OUTPUT))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
