#!/usr/bin/env python3
"""Exact small-atlas sign census for the recursive-g2 leaf residual pieces.

This is falsification evidence only.  It evaluates the exact F/Q/T split on
every ordinary-parent leaf and actual induced D through order seven, but makes
no all-order claim.
"""

from __future__ import annotations

from collections import Counter
import hashlib
import itertools
import json
from pathlib import Path

import networkx as nx
import sympy as sp

from audit_iso_n6_bundle_g6_g2_transfer_audit import isolate_multiply
from derive_iso_n6_bundle_g1_ordinary_leaf_increment_identity_g1_nonadjacent import add_leaf, substitute
from explore_iso_n6_bundle_g2_marked_cone_g1_bernstein import reconstruct
from search_iso_n6_bundle_g1_random_g1_nonadjacent import rows


HERE = Path(__file__).resolve().parent
OUTPUT = HERE / (
    "iso_n6_bundle_g1_ordinary_leaf_recursive_g2_residual_small_census_exact_"
    "g1_nonadjacent_20260831.json"
)
MARKER = (
    "PROBE_EXACT_ISO_N6_BUNDLE_G1_ORDINARY_LEAF_RECURSIVE_G2_RESIDUAL_"
    "SMALL_G1_NONADJACENT"
)


def symbolic_rows(prefix):
    return tuple(tuple(sp.symbols(f"{prefix}{family}0:8")) for family in "EUVW")


def rename(expression, old, new):
    return sp.expand(expression.xreplace({
        sp.Symbol(f"{old}{family}{rank}"): sp.Symbol(f"{new}{family}{rank}")
        for family in "EUVW" for rank in range(8)
    }))


def build_expressions():
    g1, g2 = reconstruct(1), reconstruct(2)
    hrows, krows, jrows, lrows = (symbolic_rows(prefix) for prefix in "HKJL")
    zeros = tuple(tuple(sp.Integer(0) for _ in range(8)) for _ in "EUVW")
    arows = add_leaf(hrows, krows)
    crows = add_leaf(arows, hrows)
    recursive_g2 = substitute(g2, hrows, jrows)
    delta00 = sp.expand(substitute(g1, crows, jrows) - substitute(g1, arows, jrows))
    f_hk = sp.expand(delta00 - recursive_g2)
    brows = add_leaf(jrows, lrows)
    delta10 = sp.expand(substitute(g1, crows, brows) - substitute(g1, arows, brows))
    q_hl = sp.expand(delta10 - delta00)
    q_hj = rename(q_hl, "L", "J")
    q_kj = rename(rename(q_hl, "H", "K"), "L", "J")
    xjrows = add_leaf(zeros, jrows)
    t_hj = sp.expand(substitute(g1, hrows, xjrows) - substitute(g1, hrows, zeros))
    return {
        "g2": recursive_g2,
        "F": f_hk,
        "QHL": q_hl,
        "QHJ": q_hj,
        "QKJ": q_kj,
        "T": t_hj,
    }


def evaluator(expression):
    variables = tuple(sorted(expression.free_symbols, key=str))
    evaluate = sp.lambdify(variables, expression, "math")

    def value(**rowsets):
        data = {}
        for prefix, four in rowsets.items():
            for family, sequence in zip("EUVW", four):
                for rank in range(8):
                    data[f"{prefix}{family}{rank}"] = sequence[rank]
        return int(evaluate(*(data[str(variable)] for variable in variables)))

    return value


def sign(value):
    return "negative" if value < 0 else "positive" if value > 0 else "zero"


def main():
    expressions = build_expressions()
    values = {label: evaluator(expression) for label, expression in expressions.items()}
    counts = {label: Counter() for label in [
        "g2", "F", "QHL", "QHJ", "QKJ", "T",
        "base00", "parent_add", "leaf_add", "delta00", "delta01", "delta10", "delta11",
    ]}
    minima = {label: None for label in counts}
    stream = hashlib.sha256()
    cells = 0
    leaf_cells = 0
    for graph0 in nx.graph_atlas_g():
        if not (3 <= len(graph0) <= 7 and nx.is_forest(graph0)):
            continue
        graph = nx.convert_node_labels_to_integers(graph0)
        nodes = tuple(graph)
        code = nx.to_graph6_bytes(graph, header=False).decode().strip()
        for u, v in itertools.combinations(nodes, 2):
            for leaf in nodes:
                if leaf in (u, v) or graph.degree(leaf) != 1:
                    continue
                parent = next(iter(graph.neighbors(leaf)))
                if parent in (u, v):
                    continue
                agraph = graph.copy()
                agraph.remove_node(leaf)
                hgraph = agraph.copy()
                hgraph.remove_node(parent)
                kgraph = agraph.copy()
                kgraph.remove_nodes_from({parent, *agraph.neighbors(parent)})
                hrows = rows(hgraph, u, v)
                krows = rows(kgraph, u, v)
                f_value = values["F"](H=hrows, K=krows)
                leaf_cells += 1
                for mask in range(1 << len(nodes)):
                    retained = {node for index, node in enumerate(nodes) if mask & (1 << index)}
                    jnodes = retained - {leaf, parent}
                    lnodes = jnodes - set(agraph.neighbors(parent))
                    jrows = rows(hgraph.subgraph(jnodes).copy(), u, v)
                    lrows = rows(kgraph.subgraph(lnodes).copy(), u, v)
                    cell_values = {
                        "g2": values["g2"](H=hrows, J=jrows),
                        "F": f_value,
                        "QHL": values["QHL"](H=hrows, L=lrows),
                        "QHJ": values["QHJ"](H=hrows, J=jrows),
                        "QKJ": values["QKJ"](K=krows, J=jrows),
                        "T": values["T"](H=hrows, J=jrows),
                    }
                    cell_values["base00"] = cell_values["g2"] + cell_values["F"]
                    cell_values["parent_add"] = cell_values["QHL"]
                    cell_values["leaf_add"] = (
                        cell_values["QHJ"] + cell_values["QKJ"] + cell_values["T"]
                    )
                    cell_values["delta00"] = cell_values["base00"]
                    cell_values["delta01"] = cell_values["base00"] + cell_values["leaf_add"]
                    cell_values["delta10"] = cell_values["base00"] + cell_values["parent_add"]
                    cell_values["delta11"] = (
                        cell_values["base00"] + cell_values["parent_add"]
                        + cell_values["leaf_add"]
                    )
                    for label, number in cell_values.items():
                        counts[label][sign(number)] += 1
                        record = (number, len(nodes), code, u, v, leaf, parent, mask)
                        minima[label] = record if minima[label] is None or record < minima[label] else minima[label]
                    stream.update(
                        (f"{len(nodes)}|{code}|{u}|{v}|{leaf}|{parent}|{mask}|"
                         + "|".join(f"{label}:{cell_values[label]}" for label in sorted(cell_values))
                         + ";").encode()
                    )
                    cells += 1

    report = {
        "marker": MARKER,
        "atlas_orders": [3, 7],
        "ordinary_parent_marked_leaf_cells": leaf_cells,
        "ordinary_parent_actual_D_cells": cells,
        "signs": {label: dict(counts[label]) for label in counts},
        "minima": {label: list(minima[label]) for label in minima},
        "ordered_stream_sha256": stream.hexdigest().upper(),
        "role": "exact finite falsification census only; no universal sign theorem",
        "source_sha256": hashlib.sha256(Path(__file__).read_bytes()).hexdigest().upper(),
    }
    payload = (json.dumps(report, indent=2, sort_keys=True) + "\n").encode()
    OUTPUT.write_bytes(payload)
    print("LEAF_CELLS", leaf_cells, "ACTUAL_D_CELLS", cells)
    for label in counts:
        print(label, dict(counts[label]), "MIN", minima[label])
    print("ORDERED_STREAM_SHA256", stream.hexdigest().upper())
    print("SOURCE_SHA256", report["source_sha256"])
    print("REPORT_SHA256", hashlib.sha256(payload).hexdigest().upper())
    print(MARKER)


if __name__ == "__main__":
    main()
