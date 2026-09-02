#!/usr/bin/env python3
"""Deterministic lightweight falsification search for the coupled payment lemma.

This checks only genuine ordinary-parent leaf-deletion configurations.  It is
not an exhaustive proof.  Every reported value is evaluated with exact integer
independence-polynomial rows and the pinned symbolic rank-six expressions.
"""

from __future__ import annotations

import hashlib
import json
import os
import random
from pathlib import Path

import networkx as nx

from census_iso_n6_bundle_g1_ordinary_leaf_recursive_g2_residual_small_g1_nonadjacent import (
    build_expressions,
    evaluator,
)
from search_iso_n6_bundle_g1_random_g1_nonadjacent import rows


HERE = Path(__file__).resolve().parent
OUTPUT = HERE / "iso_n6_bundle_g1_deleted_leaf_parent_square_payment_search_agent_20260831.json"
MARKER = "PROBE_EXACT_ISO_N6_BUNDLE_G1_DELETED_LEAF_PARENT_SQUARE_PAYMENT_AGENT"


def random_forest(rng: random.Random, order: int) -> nx.Graph:
    graph = nx.Graph()
    graph.add_nodes_from(range(order))
    edge_retention = rng.random()
    for vertex in range(1, order):
        if rng.random() < edge_retention:
            graph.add_edge(vertex, rng.randrange(vertex))
    assert nx.is_forest(graph)
    return graph


def main() -> None:
    trials = int(os.environ.get("PAYMENT_TRIALS", "5000"))
    seed = int(os.environ.get("PAYMENT_SEED", "993610"))
    rng = random.Random(seed)
    expressions = build_expressions()
    values = {label: evaluator(expression) for label, expression in expressions.items()}
    stream = hashlib.sha256()
    minima = {"epsilon0": None, "epsilon1": None}
    negatives = {"epsilon0": 0, "epsilon1": 0}
    completed = 0

    for trial in range(trials):
        # Build A first and then attach the distinguished leaf to p.  This
        # guarantees that ell is an ordinary leaf and that H,K,J,L have exactly
        # the geometry in the coupled-reduction report.
        a_order = rng.randrange(3, 121)
        agraph = random_forest(rng, a_order)
        parent = rng.randrange(a_order)
        leaf = a_order
        graph = agraph.copy()
        graph.add_node(leaf)
        graph.add_edge(leaf, parent)
        mark_candidates = [node for node in agraph if node != parent]
        if len(mark_candidates) < 2:
            continue
        u, v = rng.sample(mark_candidates, 2)

        hgraph = agraph.copy()
        hgraph.remove_node(parent)
        kgraph = agraph.copy()
        kgraph.remove_nodes_from({parent, *agraph.neighbors(parent)})

        # Bias the induced minor across sparse, dense, and componentwise deletion.
        mode = trial % 3
        if mode == 0:
            threshold = rng.random()
            retained = {node for node in graph if rng.random() < threshold}
        elif mode == 1:
            retained = {node for node in graph if rng.random() < rng.random()}
        else:
            retained = set(graph)
            for component in nx.connected_components(graph):
                if rng.random() < 0.9:
                    retained.discard(rng.choice(tuple(component)))

        jnodes = (retained & set(hgraph))
        lnodes = jnodes & set(kgraph)
        hrows = rows(hgraph, u, v)
        krows = rows(kgraph, u, v)
        jrows = rows(hgraph.subgraph(jnodes).copy(), u, v)
        lrows = rows(kgraph.subgraph(lnodes).copy(), u, v)
        g2 = values["g2"](H=hrows, J=jrows)
        f_hk = values["F"](H=hrows, K=krows)
        q_hl = values["QHL"](H=hrows, L=lrows)
        payment0 = g2 + f_hk
        payment1 = payment0 + q_hl
        graph6 = nx.to_graph6_bytes(graph, header=False).decode().strip()
        base_record = {
            "trial": trial,
            "order": len(graph),
            "graph6": graph6,
            "marks": [u, v],
            "leaf": leaf,
            "parent": parent,
            "retained_vertices": sorted(retained),
            "g2_H_J": g2,
            "F_H_K": f_hk,
            "Q_H_L": q_hl,
        }
        for label, number in (("epsilon0", payment0), ("epsilon1", payment1)):
            record = {**base_record, "value": number}
            if minima[label] is None or number < minima[label]["value"]:
                minima[label] = record
            negatives[label] += int(number < 0)
        stream.update(
            f"{trial}|{graph6}|{u}|{v}|{leaf}|{parent}|{','.join(map(str, sorted(retained)))}|"
            f"{g2}|{f_hk}|{q_hl}|{payment0}|{payment1};".encode()
        )
        completed += 1
        if payment0 < 0 or payment1 < 0:
            break

    report = {
        "marker": MARKER,
        "seed": seed,
        "requested_trials": trials,
        "completed_trials": completed,
        "negative_counts": negatives,
        "minima": minima,
        "ordered_stream_sha256": stream.hexdigest().upper(),
        "status": "exact genuine counterexample" if any(negatives.values()) else "finite falsification probe only",
        "scope_guard": (
            "Absent a negative witness, this report proves nothing beyond the enumerated deterministic sample. "
            "It does not prove the coupled payment lemma, the universal leaf lemma, rank-six G1, or Problem 993."
        ),
        "dependencies": {
            "coupled_reduction_report_sha256": "183EDA0B4E3030FC60C7960938ABD0B7341E7F10419A7D52220D4C41DD95C64B",
        },
        "source_sha256": hashlib.sha256(Path(__file__).read_bytes()).hexdigest().upper(),
    }
    payload = (json.dumps(report, indent=2, sort_keys=True) + "\n").encode()
    OUTPUT.write_bytes(payload)
    print(json.dumps({k: report[k] for k in ("marker", "completed_trials", "negative_counts", "minima", "ordered_stream_sha256", "status")}, indent=2))
    print("SOURCE_SHA256", report["source_sha256"])
    print("REPORT_SHA256", hashlib.sha256(payload).hexdigest().upper())
    print(MARKER)


if __name__ == "__main__":
    main()
