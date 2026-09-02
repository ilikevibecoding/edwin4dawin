#!/usr/bin/env python3
"""Exact connected-tree coupling between E4 and the negative E5 mass.

Write J4 for the number of induced 2K2 supports and

    L5 = #(induced P5) + #(induced (P3 disjoint union K2)).

The signed-support decomposition has E4=J4 and E5=-L5.  Connectivity
forces every induced 2K2 to acquire a fifth vertex of one of the two
negative types along the unique path between its two edges.  A negative
five-support contains at most two induced 2K2 supports, hence J4<=2L5.
"""

from __future__ import annotations

import hashlib
import itertools
import json
from pathlib import Path

import networkx as nx


HERE = Path(__file__).resolve().parent
OUTPUT = HERE / "iso_n7_bundle_g1_connected_j4_e5_coupling_exact_rank7_g4_piecewise_20260831.json"
MARKER = "PASS_EXACT_ISO_N7_BUNDLE_G1_CONNECTED_J4_E5_COUPLING_RANK7_G4_PIECEWISE"


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def induced_type(graph: nx.Graph, vertices) -> str:
    induced = graph.subgraph(vertices)
    degrees = sorted(dict(induced.degree()).values(), reverse=True)
    if len(vertices) == 4 and degrees == [1, 1, 1, 1] and induced.number_of_edges() == 2:
        return "2K2"
    if len(vertices) == 5 and degrees == [2, 2, 2, 1, 1] and nx.is_connected(induced):
        return "P5"
    if len(vertices) == 5 and degrees == [2, 1, 1, 1, 1] and induced.number_of_edges() == 3:
        components = sorted(len(component) for component in nx.connected_components(induced))
        if components == [2, 3]:
            return "P3+K2"
    return "other"


def exact_counts(tree: nx.Graph):
    vertices = tuple(tree)
    j4_sets = [
        frozenset(chosen)
        for chosen in itertools.combinations(vertices, 4)
        if induced_type(tree, chosen) == "2K2"
    ]
    negative5 = [
        frozenset(chosen)
        for chosen in itertools.combinations(vertices, 5)
        if induced_type(tree, chosen) in {"P5", "P3+K2"}
    ]
    incidences = []
    minimum_extensions = None
    for support in j4_sets:
        extensions = [
            support | {vertex}
            for vertex in vertices
            if vertex not in support
            and induced_type(tree, support | {vertex}) in {"P5", "P3+K2"}
        ]
        assert extensions
        minimum_extensions = (
            len(extensions) if minimum_extensions is None
            else min(minimum_extensions, len(extensions))
        )
        incidences.extend((support, extension) for extension in extensions)
    multiplicities = []
    for support5 in negative5:
        contained = sum(support4 < support5 for support4 in j4_sets)
        assert contained in (1, 2)
        expected = 1 if induced_type(tree, support5) == "P5" else 2
        assert contained == expected
        multiplicities.append(contained)
    assert len(incidences) == sum(multiplicities)
    assert len(j4_sets) <= len(incidences) <= 2*len(negative5)
    return len(j4_sets), len(negative5), len(incidences), minimum_extensions


def main() -> None:
    totals = {
        "trees": 0,
        "j4_supports": 0,
        "negative5_supports": 0,
        "extension_incidences": 0,
        "equality_J4_eq_2L5": 0,
    }
    per_order = []
    stream = hashlib.sha256()
    for order in range(2, 14):
        trees = 0
        order_j4 = 0
        order_l5 = 0
        minimum_extensions = None
        for index, raw in enumerate(nx.nonisomorphic_trees(order)):
            tree = nx.convert_node_labels_to_integers(raw)
            j4, l5, incidences, local_minimum = exact_counts(tree)
            code = nx.to_graph6_bytes(tree, header=False).decode().strip()
            stream.update(
                f"{order}|{index}|{code}|{j4}|{l5}|{incidences}|{local_minimum}\n".encode("ascii")
            )
            trees += 1
            order_j4 += j4
            order_l5 += l5
            totals["trees"] += 1
            totals["j4_supports"] += j4
            totals["negative5_supports"] += l5
            totals["extension_incidences"] += incidences
            totals["equality_J4_eq_2L5"] += j4 == 2*l5
            if local_minimum is not None:
                minimum_extensions = (
                    local_minimum if minimum_extensions is None
                    else min(minimum_extensions, local_minimum)
                )
        per_order.append({
            "order": order,
            "trees": trees,
            "j4_supports": order_j4,
            "negative5_supports": order_l5,
            "minimum_negative_extensions_per_j4": minimum_extensions,
        })

    report = {
        "marker": MARKER,
        "status": "proved exact",
        "theorem": (
            "For every finite connected tree W, if J4 is its number of induced "
            "2K2 supports and L5 is the number of induced P5 or P3+K2 supports, "
            "then J4<=2L5. In signed-support notation E4=J4 and E5=-L5, so "
            "-E5>=E4/2."
        ),
        "proof": {
            "forced_extension": (
                "For an induced 2K2, take the first vertex outside its four-set "
                "on the unique path joining the two selected edges. Adding it "
                "induces P3+K2 when the remaining path is nonempty and P5 when "
                "it joins the two selected-edge components. Thus every J4 "
                "support has at least one negative five-support extension."
            ),
            "fiber_bound": (
                "An induced P5 contains exactly one induced 2K2 four-subset; "
                "an induced P3+K2 contains exactly two. Therefore the extension "
                "incidence has lower projection size J4 and upper fiber size "
                "2 over the L5 negative supports."
            ),
            "signed_translation": "E4=J4 and E5=-L5, hence E5<=-E4/2.",
        },
        "bounded_independent_audit": {
            "orders": [2, 13],
            "totals": totals,
            "per_order": per_order,
            "ordered_stream_sha256": stream.hexdigest().upper(),
        },
        "coverage_gap_within_connected_tree_scope": None,
        "scope": (
            "Exact structural coupling for connected trees and signed support "
            "orders four/five. It is not by itself a G1 nonnegativity proof, "
            "and it does not apply componentwise to a disconnected forest."
        ),
        "source_sha256": sha256(Path(__file__)),
    }
    encoded = json.dumps(report, indent=2, sort_keys=True)+"\n"
    OUTPUT.write_text(encoded, encoding="utf-8", newline="\n")
    print(json.dumps({
        "marker": MARKER,
        "trees_audited": totals["trees"],
        "j4_supports": totals["j4_supports"],
        "negative5_supports": totals["negative5_supports"],
        "coverage_gap_within_connected_tree_scope": None,
    }, indent=2, sort_keys=True))
    print("SOURCE_SHA256", report["source_sha256"])
    print("REPORT_SHA256", hashlib.sha256(encoded.encode()).hexdigest().upper())
    print(MARKER)


if __name__ == "__main__":
    main()
