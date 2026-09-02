#!/usr/bin/env python3
"""Small exact obstruction search for swapped-g2 superforest polarization.

Checks whether g2_6(J,C)-g2_6(J,0) is nonnegative merely from J being an
induced marked subforest of C.  This broader inclusion claim is not the
ordinary-leaf retention lemma.
"""

from __future__ import annotations

import hashlib
import itertools
import json
from pathlib import Path

import networkx as nx
import sympy as sp

from explore_iso_n6_bundle_g2_marked_cone_g1_bernstein import reconstruct
from search_iso_n6_bundle_g1_random_g1_nonadjacent import rows


HERE = Path(__file__).resolve().parent
OUTPUT = HERE / "iso_n6_bundle_g2_swapped_superforest_polarization_small_exact_agent_20260831.json"
MARKER = "DISPROVED_ISO_N6_BUNDLE_G2_SWAPPED_SUPERFOREST_POLARIZATION_AGENT"


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def evaluator():
    expression = reconstruct(2)
    variables = tuple(sorted(expression.free_symbols, key=str))
    evaluate = sp.lambdify(variables, expression, "math")

    def value(crows, drows):
        data = {}
        for prefix, four in (("c", crows), ("d", drows)):
            for family, sequence in zip("EUVW", four):
                for rank in range(8):
                    data[f"{prefix}{family}{rank}"] = sequence[rank]
        return int(evaluate(*(data[str(variable)] for variable in variables)))

    return value


def main() -> None:
    value = evaluator()
    zeros = tuple(tuple(0 for _ in range(8)) for _ in "EUVW")
    cells = 0
    witness = None
    for graph0 in nx.graph_atlas_g():
        if not (2 <= len(graph0) <= 5 and nx.is_forest(graph0)):
            continue
        graph = nx.convert_node_labels_to_integers(graph0)
        nodes = tuple(graph)
        code = nx.to_graph6_bytes(graph, header=False).decode().strip()
        for u, v in itertools.combinations(nodes, 2):
            crows = rows(graph, u, v)
            for mask in range(1 << len(nodes)):
                retained = {node for node in nodes if mask & (1 << node)}
                jgraph = graph.subgraph(retained).copy()
                jrows = rows(jgraph, u, v)
                full = value(jrows, crows)
                base = value(jrows, zeros)
                delta = full - base
                cells += 1
                if delta < 0:
                    witness = {
                        "order": len(nodes),
                        "graph6": code,
                        "edges": sorted(tuple(sorted(edge)) for edge in graph.edges()),
                        "marks": [u, v],
                        "retained_vertices_J": sorted(retained),
                        "g2_J_C": full,
                        "g2_J_0": base,
                        "polarization": delta,
                    }
                    break
            if witness:
                break
        if witness:
            break
    report = {
        "marker": MARKER if witness else "PROBE_EXACT_ISO_N6_BUNDLE_G2_SWAPPED_SUPERFOREST_POLARIZATION_SMALL_AGENT",
        "claim_tested": (
            "If J is an induced marked subforest of a marked forest C, then "
            "g2_6(J,C)-g2_6(J,0)>=0."
        ),
        "orders": [2, 5],
        "cells_until_stop": cells,
        "witness": witness,
        "effect": (
            "Mere inclusion J subset C cannot import the frozen actual-minor g2 theorem; "
            "ordinary-parent leaf structure may still force Lambda>=0."
            if witness else "No obstruction found in this bounded search; no universal claim follows."
        ),
        "scope_guard": (
            "This is not a counterexample to Lambda in ordinary-parent leaf geometry unless the "
            "witness also has C=(1+x)H+xK with J induced in H."
        ),
        "dependencies_sha256": {
            "explore_iso_n6_bundle_g2_marked_cone_g1_bernstein.py": sha256(
                HERE / "explore_iso_n6_bundle_g2_marked_cone_g1_bernstein.py"
            ),
            "search_iso_n6_bundle_g1_random_g1_nonadjacent.py": sha256(
                HERE / "search_iso_n6_bundle_g1_random_g1_nonadjacent.py"
            ),
        },
        "source_sha256": sha256(Path(__file__)),
    }
    payload = (json.dumps(report, indent=2, sort_keys=True) + "\n").encode()
    OUTPUT.write_bytes(payload)
    print(json.dumps(report, indent=2, sort_keys=True))
    print("REPORT_SHA256", hashlib.sha256(payload).hexdigest().upper())
    print(report["marker"])


if __name__ == "__main__":
    main()
