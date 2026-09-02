#!/usr/bin/env python3
"""Exact corollary: the component-surplus theorem gives a rank-five V floor."""

from __future__ import annotations

import argparse
import hashlib
import itertools
import json
import os
from fractions import Fraction
from pathlib import Path

import networkx as nx
import sympy as sp


HERE = Path(__file__).resolve().parent
THEOREM_SOURCE = HERE / "verify_rank5_component_surplus_all_order_theorem_root.py"
THEOREM_REPORT = HERE / "rank5_component_surplus_all_order_theorem_exact_20260825.json"
OUTPUT = HERE / "rank5_branching_surplus_v_floor_corollary_exact_20260825.json"


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def independent(tree: nx.Graph, chosen: tuple[int, ...]) -> bool:
    selected = set(chosen)
    return all(v not in selected for u in selected for v in tree[u])


def symbolic_audit() -> dict[str, str]:
    i4, i5, i6, cbar = sp.symbols("i4 i5 i6 cbar", positive=True)
    mu = 5 * i5 / i4
    ea2 = 30 * i6 / i4 + 3 * mu - 2 * cbar
    variance = ea2 - mu**2
    q5 = 10 * i5**2 - i4 * i5 - 12 * i4 * i6
    v_coefficient = 1 - q5 / (5 * i4 * i5)
    v_moment = 2 * (variance + 2 * cbar) / (5 * mu)
    assert sp.factor(v_coefficient - v_moment) == 0
    return {
        "mu": str(mu),
        "E_a2": str(ea2),
        "variance": str(sp.factor(variance)),
        "Q5": str(q5),
        "V_identity": "V=2(Var(a_S)+2E[C_S])/(5mu)",
        "component_surplus_step": "E[C_S]/mu=C4/A4>=e/C(n-2,2)",
        "corollary": "V>=8e/(5(n-2)(n-3))",
    }


def tree_row(tree: nx.Graph) -> dict[str, object] | None:
    vertices = tuple(tree)
    n = len(vertices)
    neighborhoods = {v: frozenset((v, *tree.neighbors(v))) for v in vertices}
    counts = {}
    sets4 = []
    for rank in (4, 5, 6):
        states = [
            chosen
            for chosen in itertools.combinations(vertices, rank)
            if independent(tree, chosen)
        ]
        counts[rank] = len(states)
        if rank == 4:
            sets4 = states
    i4, i5, i6 = counts[4], counts[5], counts[6]
    if not i4 or not i5:
        return None

    sum_a = 0
    sum_a2 = 0
    sum_components = 0
    sum_i2 = 0
    for chosen in sets4:
        removed = frozenset().union(*(neighborhoods[v] for v in chosen))
        residual = set(vertices) - removed
        a = len(residual)
        residual_edges = sum(
            u in residual and v in residual for u, v in tree.edges()
        )
        components = a - residual_edges
        sum_a += a
        sum_a2 += a * a
        sum_components += components
        sum_i2 += a * (a - 1) // 2 - residual_edges

    assert sum_a == 5 * i5
    assert sum_i2 == 15 * i6
    assert sum_i2 * 2 == sum_a2 - 3 * sum_a + 2 * sum_components

    mu = Fraction(sum_a, i4)
    variance = Fraction(sum_a2, i4) - mu * mu
    expected_components = Fraction(sum_components, i4)
    q5 = 10 * i5 * i5 - i4 * i5 - 12 * i4 * i6
    v_coefficient = Fraction(5 * i4 * i5 - q5, 5 * i4 * i5)
    v_moment = 2 * (variance + 2 * expected_components) / (5 * mu)
    assert v_coefficient == v_moment

    surplus = sum(
        (tree.degree(v) - 1) * (tree.degree(v) - 2) // 2 for v in vertices
    )
    floor = Fraction(8 * surplus, 5 * (n - 2) * (n - 3))
    component_margin = (
        ((n - 2) * (n - 3) // 2) * sum_components - surplus * sum_a
    )
    assert component_margin >= 0
    assert v_coefficient >= floor
    return {
        "order": n,
        "i4": i4,
        "i5": i5,
        "i6": i6,
        "degree_surplus": surplus,
        "sum_a": sum_a,
        "sum_components": sum_components,
        "component_margin": component_margin,
        "V": str(v_coefficient),
        "floor": str(floor),
        "floor_slack": str(v_coefficient - floor),
    }


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--min-order", type=int, default=6)
    parser.add_argument("--max-order", type=int, default=13)
    args = parser.parse_args()
    assert 6 <= args.min_order <= args.max_order

    theorem = json.loads(THEOREM_REPORT.read_text(encoding="utf-8"))
    assert theorem["status"] == (
        "PASS_EXACT_ALL_ORDER_RANK5_COMPONENT_SURPLUS_THEOREM_INDEPENDENT_CENSUS"
    )
    assert theorem["source_sha256"] == sha256(THEOREM_SOURCE)

    totals = {"trees": 0, "active_trees": 0, "negative_floor_slacks": 0}
    per_order = []
    minimum = None
    for n in range(args.min_order, args.max_order + 1):
        local_active = 0
        for index, tree in enumerate(nx.nonisomorphic_trees(n)):
            totals["trees"] += 1
            row = tree_row(tree)
            if row is None:
                continue
            totals["active_trees"] += 1
            local_active += 1
            slack = Fraction(row["floor_slack"])
            totals["negative_floor_slacks"] += slack < 0
            candidate = (
                slack,
                index,
                nx.to_graph6_bytes(tree, header=False).decode().strip(),
                row,
            )
            if minimum is None or candidate[:3] < minimum[:3]:
                minimum = candidate
        per_order.append({"order": n, "active_trees": local_active})
        print(f"V_FLOOR_ORDER {n} ACTIVE {local_active}", flush=True)

    assert totals["negative_floor_slacks"] == 0
    payload = {
        "schema": "rank5-branching-surplus-v-floor-corollary-v1",
        "status": "PASS_EXACT_ALL_ORDER_RANK5_BRANCHING_SURPLUS_V_FLOOR_COROLLARY",
        "theorem": (
            "For every tree T of order n with i4(T)i5(T)>0, the normalized "
            "rank-five coordinate V satisfies V>=8e(T)/(5(n-2)(n-3))."
        ),
        "symbolic_certificate": symbolic_audit(),
        "dependency": {
            "source": THEOREM_SOURCE.name,
            "source_sha256": sha256(THEOREM_SOURCE),
            "report": THEOREM_REPORT.name,
            "report_sha256": sha256(THEOREM_REPORT),
            "status": theorem["status"],
        },
        "independent_bounded_census": {
            "orders": [args.min_order, args.max_order],
            "totals": totals,
            "per_order": per_order,
            "minimum_floor_slack": None if minimum is None else {
                "slack": str(minimum[0]),
                "tree_index": minimum[1],
                "graph6": minimum[2],
                "row": minimum[3],
            },
        },
        "proof_boundary": (
            "The all-order implication is algebraic from the component-surplus "
            "theorem and nonnegativity of variance.  The tree census is a separate "
            "literal replay and not the reason the corollary holds all-order."
        ),
        "source_sha256": sha256(Path(__file__)),
    }
    temporary = OUTPUT.with_suffix(OUTPUT.suffix + ".tmp")
    temporary.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    os.replace(temporary, OUTPUT)
    print(payload["status"])
    print("SOURCE", sha256(Path(__file__)))
    print("REPORT", sha256(OUTPUT))


if __name__ == "__main__":
    main()
