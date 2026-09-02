#!/usr/bin/env python3
"""Exact order-eight census for the H--K ordinary-parent lower classes.

K is restricted to the actual ordinary-parent relation: H minus a set that
contains at most one vertex from each component of H.  This is finite
falsification evidence, not an all-order sign proof.
"""

from __future__ import annotations

from collections import Counter
import hashlib
import itertools
import json
from pathlib import Path

import networkx as nx
import sympy as sp

from audit_rank8_forest_root_deletion_attachment_floor_root import (
    nonisomorphic_forests,
    tree_catalog,
)
from search_iso_n6_bundle_g1_random_g1_nonadjacent import categories, rows


HERE = Path(__file__).resolve().parent
INPUT = HERE / "iso_n6_bundle_g1_ordinary_parent_hk_lower_exact_root_20260901.json"
OUTPUT = HERE / "iso_n6_bundle_g1_ordinary_parent_hk_lower_n8_census_root_20260901.json"
EXPECTED_INPUT_SHA256 = "22F1F54F597B2CBA68CD24BC547D1C36075B2BE73DCC0416699CEADEF4E02CDF"
MARKER = "PASS_EXACT_N8_CENSUS_ISO_N6_BUNDLE_G1_ORDINARY_PARENT_HK_LOWER_ROOT"


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def attachable_deletion_sets(graph: nx.Graph):
    components = [tuple(sorted(component)) for component in nx.connected_components(graph)]
    for choices in itertools.product(*[(None, *component) for component in components]):
        yield tuple(vertex for vertex in choices if vertex is not None)


def main() -> None:
    input_hash = sha256(INPUT)
    if input_hash != EXPECTED_INPUT_SHA256:
        raise RuntimeError(f"input hash drift: {input_hash}")
    payload = json.loads(INPUT.read_text(encoding="utf-8"))
    classes = payload["classes"]
    branches = payload["branches"]
    evaluators = {}
    for digest, row in classes.items():
        expression = sp.sympify(row["lower_expression"])
        variables = tuple(sorted(expression.free_symbols, key=str))
        evaluators[digest] = (variables, sp.lambdify(variables, expression, "math"))
    applicable = {}
    for geometry in ("adjacent", "nonadjacent"):
        for ku, kv in itertools.product((0, 1), repeat=2):
            digests = set()
            for epsilon, eta, ju, jv in itertools.product((0, 1), repeat=4):
                label = f"{geometry}_e{epsilon}_t{eta}_k{ku}{kv}_j{ju}{jv}"
                digests.add(branches[label]["class_sha256"])
            applicable[(geometry, ku, kv)] = tuple(sorted(digests))

    counts = {digest: Counter() for digest in classes}
    minima = {digest: None for digest in classes}
    stream = hashlib.sha256()
    cells = 0
    forest_count = 0
    relation_instances = 0
    order = 8
    catalog = tree_catalog(order)
    for forest_index, graph in enumerate(nonisomorphic_forests(order, catalog)):
        forest_count += 1
        graph6 = nx.to_graph6_bytes(graph, header=False).decode().strip()
        hrows_by_pair = {}
        for u, v in itertools.combinations(tuple(graph), 2):
            geometry = "adjacent" if graph.has_edge(u, v) else "nonadjacent"
            hcategories = categories(rows(graph, u, v))
            hvalues = {"H" + name[1:]: value for name, value in hcategories.items()}
            hrows_by_pair[(u, v)] = (geometry, hvalues)
        for deleted in attachable_deletion_sets(graph):
            kgraph = graph.copy()
            kgraph.remove_nodes_from(deleted)
            relation_instances += 1
            deleted_set = set(deleted)
            for (u, v), (geometry, hvalues) in hrows_by_pair.items():
                ku = int(u not in deleted_set)
                kv = int(v not in deleted_set)
                kcategories = categories(rows(kgraph, u, v))
                values = {
                    **hvalues,
                    **{"K" + name[1:]: value for name, value in kcategories.items()},
                    "n": order,
                    "k": len(kgraph),
                }
                for digest in applicable[(geometry, ku, kv)]:
                    variables, evaluate = evaluators[digest]
                    value = int(evaluate(*(values[str(variable)] for variable in variables)))
                    sign = "negative" if value < 0 else "positive" if value > 0 else "zero"
                    counts[digest][sign] += 1
                    record = (value, graph6, u, v, list(deleted), forest_index)
                    if minima[digest] is None or tuple(record[:4]) < tuple(minima[digest][:4]):
                        minima[digest] = record
                    stream.update(
                        f"{forest_index}|{graph6}|{u}|{v}|{','.join(map(str, deleted))}|{digest}|{value};".encode()
                    )
                    cells += 1

    negative_cells = sum(counter["negative"] for counter in counts.values())
    report = {
        "marker": MARKER if negative_cells == 0 else "FAIL_EXACT_N8_CENSUS_ISO_N6_BUNDLE_G1_ORDINARY_PARENT_HK_LOWER_ROOT",
        "input_sha256": input_hash,
        "source_sha256": sha256(Path(__file__).resolve()),
        "order": order,
        "forest_count": forest_count,
        "attachable_relation_instances": relation_instances,
        "evaluated_class_cells": cells,
        "negative_cells": negative_cells,
        "counts": {digest: dict(counter) for digest, counter in counts.items()},
        "minima": {digest: value for digest, value in minima.items()},
        "ordered_stream_sha256": stream.hexdigest().upper(),
        "scope_guard": "Exact finite order-eight evidence only; no all-order sign theorem.",
    }
    OUTPUT.write_text(json.dumps(report, indent=2, sort_keys=True) + "\n", encoding="utf-8")
    print(json.dumps({
        "marker": report["marker"],
        "forest_count": forest_count,
        "attachable_relation_instances": relation_instances,
        "evaluated_class_cells": cells,
        "negative_cells": negative_cells,
        "global_minimum": min(value[0] for value in minima.values() if value is not None),
    }, indent=2, sort_keys=True))
    print("SOURCE_SHA256", report["source_sha256"])
    print("REPORT_SHA256", sha256(OUTPUT))
    print(report["marker"])


if __name__ == "__main__":
    main()
