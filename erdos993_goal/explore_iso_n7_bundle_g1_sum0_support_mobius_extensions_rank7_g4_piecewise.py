#!/usr/bin/env python3
"""Classify the small support-Mobius corrections behind signed clusters.

For a forest H with no isolated vertices put

    mu(H) = sum_{F subset E(H), V(F)=V(H)} (-1)^|F|
          = (-1)^|V(H)| I_H(-1).

The exact support coefficient D_v is the sum of mu(W[U]) over v-sets U.
Stars provide the retained degree-moment term.  This finite classifier records
all remaining support types through v=8 and their vertex-deletion incidences.
It is diagnostic infrastructure, not a universal certificate.
"""

from __future__ import annotations

import hashlib
import itertools
import json
from pathlib import Path

import networkx as nx


HERE = Path(__file__).resolve().parent
OUTPUT = HERE / "iso_n7_bundle_g1_sum0_support_mobius_extensions_exploration_rank7_g4_piecewise_20260831.json"


def independence_at_minus_one(graph: nx.Graph) -> int:
    vertices = list(graph)
    total = 0
    for mask in range(1 << len(vertices)):
        chosen = [vertices[index] for index in range(len(vertices)) if mask >> index & 1]
        if all(not graph.has_edge(left, right) for left, right in itertools.combinations(chosen, 2)):
            total += -1 if len(chosen) % 2 else 1
    return total


def mobius(graph: nx.Graph) -> int:
    return (-1) ** graph.number_of_nodes() * independence_at_minus_one(graph)


def induced_2k2_count(graph: nx.Graph) -> int:
    count = 0
    for vertices in itertools.combinations(graph.nodes(), 4):
        induced = graph.subgraph(vertices)
        if sorted(dict(induced.degree()).values()) == [1, 1, 1, 1]:
            count += 1
    return count


def component_catalog(maximum: int) -> list[tuple[int, int, nx.Graph]]:
    catalog = []
    for order in range(2, maximum + 1):
        for index, tree in enumerate(nx.nonisomorphic_trees(order)):
            catalog.append((order, index, tree.copy()))
    return catalog


def forests_without_isolates(order: int):
    catalog = component_catalog(order)

    def extend(remaining: int, first: int, chosen: list[int]):
        if remaining == 0:
            yield nx.disjoint_union_all([catalog[index][2] for index in chosen])
            return
        for index in range(first, len(catalog)):
            component_order = catalog[index][0]
            if component_order > remaining:
                continue
            yield from extend(remaining - component_order, index, chosen + [index])

    yield from extend(order, 0, [])


def main() -> None:
    rows = []
    stream = hashlib.sha256()
    for order in range(2, 9):
        counts = {"negative": 0, "zero": 0, "positive": 0, "star": 0, "nonstar_nonzero": 0}
        types = []
        for index, graph in enumerate(forests_without_isolates(order)):
            value = mobius(graph)
            degrees = sorted(dict(graph.degree()).values(), reverse=True)
            is_star = nx.is_tree(graph) and degrees == [order - 1] + [1] * (order - 1)
            j4 = induced_2k2_count(graph)
            deletion_profile = {"negative": 0, "zero": 0, "positive": 0}
            for vertex in graph:
                deleted = graph.copy()
                deleted.remove_node(vertex)
                deleted_value = mobius(deleted)
                deletion_profile[
                    "negative" if deleted_value < 0 else "positive" if deleted_value > 0 else "zero"
                ] += 1
            record = {
                "index": index,
                "component_orders": sorted((len(component) for component in nx.connected_components(graph)), reverse=True),
                "degree_sequence": degrees,
                "mobius": value,
                "is_star": is_star,
                "induced_2K2": j4,
                "deletion_profile": deletion_profile,
            }
            stream.update((repr(record) + "\n").encode())
            types.append(record)
            counts["negative" if value < 0 else "positive" if value > 0 else "zero"] += 1
            counts["star"] += int(is_star)
            counts["nonstar_nonzero"] += int(value != 0 and not is_star)
            assert value in (-1, 0, 1)
            if value != 0 and not is_star:
                assert j4 > 0, record
        rows.append({"order": order, "counts": counts, "types": types})
        print(order, counts)
    report = {
        "marker": "EXPLORE_EXACT_ISO_N7_BUNDLE_G1_SUM0_SUPPORT_MOBIUS_EXTENSIONS_RANK7_G4_PIECEWISE",
        "status": "exact finite support classification; no universal theorem asserted",
        "identity": "mu(H)=(-1)^|H| I_H(-1)=sum_{edge covers F of H}(-1)^|F|",
        "orders": rows,
        "record_stream_sha256": stream.hexdigest().upper(),
    }
    encoded = json.dumps(report, indent=2, sort_keys=True) + "\n"
    OUTPUT.write_text(encoded, encoding="utf-8", newline="\n")
    print("REPORT_SHA256", hashlib.sha256(encoded.encode()).hexdigest().upper())


if __name__ == "__main__":
    main()
