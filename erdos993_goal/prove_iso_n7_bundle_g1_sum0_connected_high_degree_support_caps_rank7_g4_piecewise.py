#!/usr/bin/env python3
"""Exact E6/E7/E8 support caps for the connected high-degree G1 cone."""

from __future__ import annotations

import hashlib
import itertools
import json
from pathlib import Path

import networkx as nx


HERE = Path(__file__).resolve().parent
OUTPUT = HERE / (
    "iso_n7_bundle_g1_sum0_connected_high_degree_support_caps_"
    "exact_rank7_g4_piecewise_20260831.json"
)
MARKER = (
    "PASS_EXACT_ISO_N7_BUNDLE_G1_SUM0_CONNECTED_HIGH_DEGREE_SUPPORT_CAPS_"
    "RANK7_G4_PIECEWISE"
)
DEPENDENCIES = {
    "prove_iso_n7_bundle_g1_sum0_signed_cluster_support_lemma_rank7_g4_piecewise.py":
        "184CE9F5D92F49DED58C3EE477BEA916FC7C624F9E84A234AECD318CCAECF846",
    "iso_n7_bundle_g1_sum0_signed_cluster_support_lemma_exact_rank7_g4_piecewise_20260831.json":
        "180026E94A87369CA46D3F58F0ACB18EB35ED550792BB0F04BE5167B06D9ED3B",
}
SIGNED_MARKER = (
    "PASS_EXACT_ISO_N7_BUNDLE_G1_SUM0_SIGNED_CLUSTER_SUPPORT_LEMMA_"
    "RANK7_G4_PIECEWISE"
)
EIGHT_PATTERNS = {
    (6, 2),
    (5, 3),
    (4, 4),
    (4, 2, 2),
    (3, 3, 2),
    (2, 2, 2, 2),
}


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def independence_at_minus_one(graph: nx.Graph) -> int:
    vertices = list(graph)
    total = 0
    for mask in range(1 << len(vertices)):
        selected = [vertices[i] for i in range(len(vertices)) if mask >> i & 1]
        if all(
            not graph.has_edge(left, right)
            for left, right in itertools.combinations(selected, 2)
        ):
            total += -1 if len(selected) % 2 else 1
    return total


def support_mobius(graph: nx.Graph) -> int:
    return (-1) ** graph.number_of_nodes() * independence_at_minus_one(graph)


def component_catalog(maximum: int):
    catalog = []
    for order in range(2, maximum+1):
        for index, tree in enumerate(nx.nonisomorphic_trees(order)):
            catalog.append((order, index, tree.copy()))
    return catalog


def forests_without_isolates(order: int):
    catalog = component_catalog(order)

    def extend(remaining: int, first: int, selected: tuple[int, ...]):
        if remaining == 0:
            yield nx.disjoint_union_all([catalog[index][2] for index in selected])
            return
        for index in range(first, len(catalog)):
            size = catalog[index][0]
            if size <= remaining:
                yield from extend(remaining-size, index, selected+(index,))

    yield from extend(order, 0, ())


def is_star(graph: nx.Graph) -> bool:
    order = graph.number_of_nodes()
    return (
        nx.is_tree(graph)
        and sorted(dict(graph.degree()).values(), reverse=True)
        == [order-1]+[1]*(order-1)
    )


def spanning_star_forest_patterns(graph: nx.Graph):
    """Component-order patterns of spanning star subforests of graph."""
    edges = list(graph.edges())
    patterns = set()
    for mask in range(1, 1 << len(edges)):
        selected = nx.Graph()
        selected.add_nodes_from(graph)
        selected.add_edges_from(
            edges[index] for index in range(len(edges)) if mask >> index & 1
        )
        if any(selected.degree(vertex) == 0 for vertex in selected):
            continue
        sizes = []
        valid = True
        for vertices in nx.connected_components(selected):
            component = selected.subgraph(vertices)
            size = len(vertices)
            if sorted(dict(component.degree()).values(), reverse=True) != (
                [size-1]+[1]*(size-1)
            ):
                valid = False
                break
            sizes.append(size)
        if valid:
            patterns.add(tuple(sorted(sizes, reverse=True)))
    return patterns


def canonical_record(order: int, index: int, graph: nx.Graph, extra):
    return (
        order,
        index,
        tuple(sorted(
            (len(vertices) for vertices in nx.connected_components(graph)),
            reverse=True,
        )),
        tuple(sorted(dict(graph.degree()).values(), reverse=True)),
        support_mobius(graph),
        extra,
    )


def main() -> None:
    for name, digest in DEPENDENCIES.items():
        assert sha256(HERE/name) == digest, name
    signed_report = json.loads((HERE/list(DEPENDENCIES)[1]).read_text(encoding="utf-8"))
    assert signed_report["status"] == "proved exact"
    assert signed_report["marker"] == SIGNED_MARKER
    assert signed_report["coverage_gap_within_support_orders_2_through_8"] is None

    stream = hashlib.sha256()

    # E6 incidence.  Each positive nonstar six-support has at least three
    # vertex deletions with negative five-support weight.
    positive6 = []
    for index, graph in enumerate(forests_without_isolates(6)):
        if support_mobius(graph) <= 0 or is_star(graph):
            continue
        negative_deletions = 0
        for vertex in graph:
            deleted = graph.copy()
            deleted.remove_node(vertex)
            negative_deletions += support_mobius(deleted) < 0
        assert negative_deletions >= 3
        record = canonical_record(6, index, graph, negative_deletions)
        stream.update((repr(record)+"\n").encode("ascii"))
        positive6.append(record)

    # E7 selector.  A positive nonstar seven-support contains a spanning
    # K1,2 + K2 + K2.  It is counted by sum_v C(d_v,2)C(e-d_v,2).
    positive7 = []
    for index, graph in enumerate(forests_without_isolates(7)):
        if support_mobius(graph) <= 0 or is_star(graph):
            continue
        patterns = spanning_star_forest_patterns(graph)
        assert (3, 2, 2) in patterns
        record = canonical_record(7, index, graph, tuple(sorted(patterns)))
        stream.update((repr(record)+"\n").encode("ascii"))
        positive7.append(record)

    # E8 selector.  Every positive nonstar eight-support has a spanning star
    # forest in one of the six component partitions of eight with parts >=2.
    positive8 = []
    pattern_counts = {pattern: 0 for pattern in sorted(EIGHT_PATTERNS)}
    for index, graph in enumerate(forests_without_isolates(8)):
        if support_mobius(graph) <= 0 or is_star(graph):
            continue
        patterns = spanning_star_forest_patterns(graph) & EIGHT_PATTERNS
        assert patterns
        for pattern in patterns:
            pattern_counts[pattern] += 1
        record = canonical_record(8, index, graph, tuple(sorted(patterns)))
        stream.update((repr(record)+"\n").encode("ascii"))
        positive8.append(record)

    assert len(positive6) == 4
    assert min(record[-1] for record in positive6) == 3
    assert len(positive7) == 3
    assert len(positive8) == 8
    assert pattern_counts == {
        (2, 2, 2, 2): 1,
        (3, 3, 2): 1,
        (4, 2, 2): 1,
        (4, 4): 3,
        (5, 3): 4,
        (6, 2): 2,
    }
    assert stream.hexdigest().upper() == (
        "376C96A7023AA972F7FB4F09C24FAEFA952C987943B33B79140B490FAAD6914A"
    )

    report = {
        "marker": MARKER,
        "status": "proved exact",
        "theorem": (
            "For every m-vertex forest W, write E_v for the nonstar signed "
            "support correction and L5=-E5. Then E6<=(m-5)L5/3; "
            "E7<=sum_x C(d_x,2)C(e-d_x,2); and E8 is at most the sum of "
            "the six pinned degree-motif selector counts used by the "
            "connected high-degree G1 cone."
        ),
        "E6_incidence_proof": {
            "positive_nonstar_six_types": len(positive6),
            "minimum_negative_five_deletions": min(record[-1] for record in positive6),
            "bound": "E6<=E6^+<=(m-5)L5/3",
            "double_count": (
                "Every positive six-support has at least three negative "
                "five-support deletions; every negative five-support has at "
                "most m-5 one-vertex extensions."
            ),
        },
        "E7_spanning_selector_proof": {
            "positive_nonstar_seven_types": len(positive7),
            "spanning_pattern": "K1,2 + K2 + K2",
            "bound": "E7<=sum_x C(d_x,2)C(e-d_x,2)",
            "injection": (
                "Choose one spanning selector canonically per positive "
                "support. Its four edges cover exactly that seven-set, so "
                "different supports cannot share the selector."
            ),
        },
        "E8_spanning_selector_proof": {
            "positive_nonstar_eight_types": len(positive8),
            "allowed_component_order_patterns": [list(pattern) for pattern in sorted(EIGHT_PATTERNS)],
            "type_pattern_incidence": {
                str(pattern): count for pattern, count in pattern_counts.items()
            },
            "six_selector_counts": {
                "(6,2)": "sum_x C(d_x,5)(e-d_x)",
                "(5,3)": "sum_x C(d_x,4)(S2-C(d_x,2))",
                "(4,4)": "(S3^2-T3)/2",
                "(4,2,2)": "sum_x C(d_x,3)C(e-d_x,2)",
                "(3,3,2)": "((S2^2-T2)/2)e",
                "(2,2,2,2)": "(C(e,2)-S2)C(e-2,2)/6",
            },
            "injection": (
                "For the first five patterns, choose one spanning star-forest "
                "selector per support; its vertices recover the support. For "
                "4K2, every matching contributes its six choices of a "
                "distinguished disjoint edge-pair to the numerator, exactly "
                "paying the factor 1/6."
            ),
        },
        "finite_type_classification": {
            "method": (
                "Independent enumeration of every unlabeled no-isolate forest "
                "type on 6, 7, and 8 vertices, with exact I_H(-1) support "
                "weight and exhaustive spanning-edge-subset search."
            ),
            "ordered_record_stream_sha256": stream.hexdigest().upper(),
            "coverage_gap": None,
        },
        "coverage_gap_within_support_cap_scope": None,
        "scope": (
            "Exact universal forest support caps through order eight. This "
            "validates the E6/E7/E8 numerical caps in the abstract profile "
            "cone, but does not by itself justify a simultaneous nonlinear "
            "endpoint replacement or promote actual connected-tree G1."
        ),
        "dependencies_sha256": DEPENDENCIES,
        "source_sha256": sha256(Path(__file__)),
    }
    encoded = json.dumps(report, indent=2, sort_keys=True)+"\n"
    OUTPUT.write_text(encoded, encoding="utf-8", newline="\n")
    print(json.dumps({
        "marker": MARKER,
        "positive_nonstar_types": {"6": len(positive6), "7": len(positive7), "8": len(positive8)},
        "minimum_negative_five_deletions": min(record[-1] for record in positive6),
        "ordered_record_stream_sha256": stream.hexdigest().upper(),
        "coverage_gap_within_support_cap_scope": None,
    }, indent=2, sort_keys=True))
    print("SOURCE_SHA256", report["source_sha256"])
    print("REPORT_SHA256", hashlib.sha256(encoded.encode()).hexdigest().upper())
    print(MARKER)


if __name__ == "__main__":
    main()
