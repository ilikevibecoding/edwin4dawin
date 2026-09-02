#!/usr/bin/env python3
"""Lightweight exact audit of reductions among the ten rank-six G1 cells.

This checks two universal algebraic symmetries and gives finite exact witnesses
against a tempting mode dominance.  It is deliberately not a positivity
producer and does not enumerate the mark-only residual queue.
"""

from __future__ import annotations

import hashlib
import json
from pathlib import Path

import networkx as nx
import sympy as sp

from explore_iso_n6_bundle_g2_marked_cone_g1_bernstein import reconstruct
from search_iso_n6_bundle_g1_random_g1_nonadjacent import rows


HERE = Path(__file__).resolve().parent
OUTPUT = HERE / "iso_n6_bundle_g1_ten_cell_reduction_audit_agent_20260831.json"
MARKER = "AUDIT_EXACT_ISO_N6_BUNDLE_G1_TEN_CELL_REDUCTION_AGENT"


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def evaluator(expression: sp.Expr):
    variables = tuple(sorted(expression.free_symbols, key=str))
    evaluate = sp.lambdify(variables, expression, "math")

    def value(crows, drows):
        data = {}
        for prefix, rowset in (("c", crows), ("d", drows)):
            for family, sequence in zip("EUVW", rowset):
                for rank, item in enumerate(sequence):
                    data[f"{prefix}{family}{rank}"] = item
        return int(evaluate(*(data[str(variable)] for variable in variables)))

    return value


def occupation_rules(expression: sp.Expr):
    names = {str(symbol): symbol for symbol in expression.free_symbols}
    categories = {}
    rules = {}
    for prefix in ("c", "d"):
        categories[prefix] = {
            family: sp.symbols(f"{prefix}{family}0:8") for family in "WABZ"
        }
        for rank in range(8):
            w, a, b, z = (
                categories[prefix][family][rank] for family in "WABZ"
            )
            values = {
                f"{prefix}W{rank}": w,
                f"{prefix}U{rank}": w + a,
                f"{prefix}V{rank}": w + b,
                f"{prefix}E{rank}": w + a + b + z,
            }
            rules.update({names[label]: item for label, item in values.items() if label in names})
    return rules, categories


def exact_nested_minor_witnesses(value):
    found = {}
    fixtures = {
        "negative": {
            "order": 10,
            "edges": ((0, 1), (1, 4), (3, 8)),
            "marks": (4, 9),
            "leaf": 8,
            "retained": {3, 7, 9},
            "expected_increment": -484,
        },
        "positive": {
            "order": 14,
            "edges": ((0, 2), (0, 9), (1, 10), (2, 5), (4, 6)),
            "marks": (3, 10),
            "leaf": 6,
            "retained": {0, 1, 4, 8, 11, 12, 13},
            "expected_increment": 115480,
        },
    }
    for sign, fixture in fixtures.items():
        graph = nx.Graph()
        graph.add_nodes_from(range(fixture["order"]))
        graph.add_edges_from(fixture["edges"])
        u, v = fixture["marks"]
        leaf = fixture["leaf"]
        retained = fixture["retained"]
        assert nx.is_forest(graph)
        assert graph.degree(leaf) == 1
        assert next(iter(graph.neighbors(leaf))) not in (u, v)
        d0 = graph.subgraph(retained).copy()
        d1 = graph.subgraph(retained | {leaf}).copy()
        crows = rows(graph, u, v)
        g0 = value(crows, rows(d0, u, v))
        g1 = value(crows, rows(d1, u, v))
        delta = g1 - g0
        assert delta == fixture["expected_increment"]
        found[sign] = {
                "order": fixture["order"],
                "graph6": nx.to_graph6_bytes(graph, header=False).decode().strip(),
                "edges": [list(edge) for edge in sorted(graph.edges())],
                "marks": [u, v],
                "added_leaf": leaf,
                "leaf_parent": next(iter(graph.neighbors(leaf)), None),
                "D0_vertices": sorted(retained),
                "D1_vertices": sorted(retained | {leaf}),
                "g1_C_D0": g0,
                "g1_C_D1": g1,
                "increment": delta,
        }
    assert set(found) == {"positive", "negative"}
    return found


def main() -> None:
    expression = reconstruct(1)
    names = {str(symbol): symbol for symbol in expression.free_symbols}

    swap = {}
    for prefix in ("c", "d"):
        for rank in range(8):
            u = names.get(f"{prefix}U{rank}")
            v = names.get(f"{prefix}V{rank}")
            if u is not None and v is not None:
                swap[u], swap[v] = v, u
    mark_swap_residual = sp.expand(expression.xreplace(swap) - expression)
    assert mark_swap_residual == 0

    rules, categories = occupation_rules(expression)
    occupation = sp.expand(expression.subs(rules))
    zvars = tuple(categories[prefix]["Z"][rank] for prefix in ("c", "d") for rank in range(8))
    adjacent_face = sp.expand(occupation.subs({variable: 0 for variable in zvars}))
    assert not any(variable in adjacent_face.free_symbols for variable in zvars)
    # Swapping marks exchanges A and B and fixes W,Z on the occupation face.
    occ_swap = {}
    for prefix in ("c", "d"):
        for rank in range(8):
            a = categories[prefix]["A"][rank]
            b = categories[prefix]["B"][rank]
            occ_swap[a], occ_swap[b] = b, a
    assert sp.expand(occupation.xreplace(occ_swap) - occupation) == 0

    witnesses = exact_nested_minor_witnesses(evaluator(expression))
    report = {
        "marker": MARKER,
        "rank": 6,
        "coefficient": "g1",
        "universal_algebraic_reductions": {
            "mark_swap": "g1(C,D;u,v)=g1(C,D;v,u)",
            "adjacent_face": (
                "In disjoint occupation coordinates E=W+A+B+Z, U=W+A, V=W+B, "
                "every adjacent-mark cell is the Z_C=Z_D=0 face of the same raw functional."
            ),
            "mode_independence_of_formula": (
                "All five canonical modes use the same raw g1(C,D); modes only constrain "
                "which actual induced minor pair (C,D) occurs."
            ),
        },
        "failed_dominance": {
            "claim_disproved": (
                "For fixed C, g1(C,D) is monotone in one universal direction under "
                "single-vertex enlargement of an actual induced minor D."
            ),
            "exact_witnesses": witnesses,
            "consequence": (
                "The five parent modes cannot be linearly ordered or collapsed merely by "
                "induced-minor inclusion."
            ),
        },
        "checks": {
            "raw_mark_swap_residual_zero": True,
            "occupation_mark_swap_residual_zero": True,
            "adjacent_face_has_no_Z_variables": True,
            "both_nested_minor_increment_signs_found": True,
        },
        "most_promising_master_lemma": (
            "For every marked forest C, every actual induced marked minor D, and every "
            "unmarked vertex ell of degree at most one, "
            "g1(C,D)>=g1(C-ell,D-ell)."
        ),
        "scope_guard": (
            "This audit proves only algebraic symmetry/face identities and disproves a "
            "simple D-inclusion dominance. It does not prove the leaf lemma, any open G1 "
            "cell, all-N6, higher-rank propagation, or Erdos Problem 993."
        ),
        "dependencies": {
            "raw_reconstruction": sha256(HERE / "explore_iso_n6_bundle_g2_marked_cone_g1_bernstein.py"),
            "row_evaluator": sha256(HERE / "search_iso_n6_bundle_g1_random_g1_nonadjacent.py"),
        },
        "source_sha256": sha256(Path(__file__)),
    }
    payload = (json.dumps(report, indent=2, sort_keys=True) + "\n").encode()
    OUTPUT.write_bytes(payload)
    print(json.dumps({
        "marker": MARKER,
        "checks": report["checks"],
        "witness_increments": {key: row["increment"] for key, row in witnesses.items()},
        "scope_guard": report["scope_guard"],
    }, indent=2, sort_keys=True))
    print("SOURCE_SHA256", report["source_sha256"])
    print("REPORT_SHA256", hashlib.sha256(payload).hexdigest().upper())
    print(MARKER)


if __name__ == "__main__":
    main()
