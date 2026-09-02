#!/usr/bin/env python3
"""Universal exactly-three-edge >=6-attachment adjacent/no-parent G3 theorem."""

from __future__ import annotations

import hashlib
import itertools
import json
from pathlib import Path

import networkx as nx
import sympy as sp

from probe_iso_n7_bundle_g3_sum0_dense_extension_threshold_rank7_g5_finish import choose_poly
from prove_iso_n7_bundle_g3_adjacent_no_parent_ge6_one_edge_all_distributions_rank7_g5_finish import bernstein_tail_certificate


HERE = Path(__file__).resolve().parent
INPUT = HERE / "iso_n7_bundle_g3_adjacent_no_parent_general_attachment_losses_exact_rank7_g5_finish_20260831.json"
INPUT_SHA = "CB3E129A9F2E6EBF6F5AF6D70B917147121041505A312628A39BB4960C79F699"
ONE_EDGE_SOURCE = HERE / "prove_iso_n7_bundle_g3_adjacent_no_parent_ge6_one_edge_all_distributions_rank7_g5_finish.py"
ONE_EDGE_SOURCE_SHA = "1DF08223EBECCBA9E5056BD52604D1342763E313D111CEF63568D4B285D6149E"
OUTPUT = HERE / "iso_n7_bundle_g3_adjacent_no_parent_ge6_three_edges_all_distributions_exact_rank7_g5_finish_20260831.json"
MARKER = "PASS_EXACT_ISO_N7_BUNDLE_G3_ADJACENT_NO_PARENT_GE6_THREE_EDGES_ALL_DISTRIBUTIONS_RANK7_G5_FINISH"


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def independent_counts(graph: nx.Graph, max_rank: int = 8):
    vertices = tuple(sorted(graph.nodes()))
    index = {vertex: position for position, vertex in enumerate(vertices)}
    edge_masks = [(1 << index[u]) | (1 << index[v]) for u, v in graph.edges()]
    rows = [0] * (max_rank + 1)
    for mask in range(1 << len(vertices)):
        if any(mask & edge_mask == edge_mask for edge_mask in edge_masks):
            continue
        rank = mask.bit_count()
        if rank <= max_rank:
            rows[rank] += 1
    return tuple(rows)


def convolved_row(core_rows, isolates, rank):
    return sp.expand(sum(
        core_rows[j] * choose_poly(isolates, rank - j)
        for j in range(min(rank, len(core_rows) - 1) + 1)
    ))


def core_graphs():
    graphs = {}
    matching = nx.Graph([(0, 1), (2, 3), (4, 5)])
    graphs["3K2"] = matching
    p3_k2 = nx.Graph([(0, 1), (1, 2), (3, 4)])
    graphs["P3_plus_K2"] = p3_k2
    graphs["P4"] = nx.path_graph(4)
    graphs["K1_3"] = nx.star_graph(3)
    return graphs


def rooted_patterns(graph: nx.Graph):
    components = [tuple(sorted(component)) for component in nx.connected_components(graph)]
    option_sets = []
    for component in components:
        options = [(None, None)]
        for vertex in component:
            options.extend(((vertex, "X"), (vertex, "Y")))
        option_sets.append(options)
    deduplicated = {}
    for choices in itertools.product(*option_sets):
        x_vertices = tuple(sorted(vertex for vertex, side in choices if side == "X"))
        y_vertices = tuple(sorted(vertex for vertex, side in choices if side == "Y"))
        x_deleted = graph.copy()
        x_deleted.remove_nodes_from(x_vertices)
        y_deleted = graph.copy()
        y_deleted.remove_nodes_from(y_vertices)
        x_rows = independent_counts(x_deleted)
        y_rows = independent_counts(y_deleted)
        signature = (len(x_vertices), len(y_vertices), x_rows, y_rows)
        deduplicated.setdefault(signature, {
            "X_core_vertices": x_vertices,
            "Y_core_vertices": y_vertices,
            "equivalent_raw_patterns": 0,
        })["equivalent_raw_patterns"] += 1
    return deduplicated


def main() -> None:
    assert sha256(INPUT) == INPUT_SHA
    assert sha256(ONE_EDGE_SOURCE) == ONE_EDGE_SOURCE_SHA
    upstream = json.loads(INPUT.read_text(encoding="utf-8"))
    m, a, b = sp.symbols("m a b", nonnegative=True)
    W = {k: sp.Symbol(f"W{k}") for k in range(2, 9)}
    P = {k: sp.Symbol(f"P{k}") for k in range(2, 8)}
    Q = {k: sp.Symbol(f"Q{k}") for k in range(2, 8)}
    identity = sp.expand(sp.sympify(upstream["identity"], locals={
        "m": m, "a": a, "b": b,
        **{f"W{k}": W[k] for k in W},
        **{f"P{k}": P[k] for k in P},
        **{f"Q{k}": Q[k] for k in Q},
    }))
    root_tail, unrelated_isolates, split = sp.symbols("root_tail unrelated_isolates split", nonnegative=True)
    roots = root_tail + 6
    certificates = {}
    classifier = {}
    for core_label, graph in core_graphs().items():
        assert graph.number_of_edges() == 3
        assert all(graph.degree(vertex) > 0 for vertex in graph)
        core_rows = independent_counts(graph)
        patterns = rooted_patterns(graph)
        classifier[core_label] = {
            "vertices": graph.number_of_nodes(),
            "components": nx.number_connected_components(graph),
            "deduplicated_root_patterns": len(patterns),
            "raw_root_patterns": sum(item["equivalent_raw_patterns"] for item in patterns.values()),
        }
        for pattern_index, (signature, witness) in enumerate(sorted(patterns.items(), key=lambda item: str(item[0]))):
            x_count, y_count, x_deleted_rows, y_deleted_rows = signature
            rooted_core_count = x_count + y_count
            b_value = y_count + (roots / 2 - y_count) * split
            a_value = roots - b_value
            base_isolates = roots - rooted_core_count + unrelated_isolates
            m_value = graph.number_of_nodes() + base_isolates
            w_rows = {k: convolved_row(core_rows, base_isolates, k) for k in W}
            avoid_y_isolates = sp.expand(base_isolates - (b_value - y_count))
            avoid_x_isolates = sp.expand(base_isolates - (a_value - x_count))
            p_rows = {k: w_rows[k] - convolved_row(y_deleted_rows, avoid_y_isolates, k) for k in P}
            q_rows = {k: w_rows[k] - convolved_row(x_deleted_rows, avoid_x_isolates, k) for k in Q}
            specialized = sp.cancel(identity.subs({
                m: m_value,
                a: a_value,
                b: b_value,
                **{W[k]: w_rows[k] for k in W},
                **{P[k]: p_rows[k] for k in P},
                **{Q[k]: q_rows[k] for k in Q},
            }, simultaneous=True))
            certificate = bernstein_tail_certificate(specialized, split, (root_tail, unrelated_isolates))
            assert certificate["negative_tail_scalar_coefficients"] == 0, (core_label, pattern_index, certificate["first_negative"])
            label = f"{core_label}_p{pattern_index:02d}_x{x_count}_y{y_count}"
            certificates[label] = {
                "core": core_label,
                "root_pattern": witness,
                "parameterization": {"m": str(m_value), "a": str(a_value), "b": str(b_value)},
                **certificate,
            }
    report = {
        "marker": MARKER,
        "status": "proved exact",
        "theorem": "For adjacent marks in no-parent mode, if W has exactly three edges and a+b>=6 attachment roots lie in distinct components, rank-seven G3 is nonnegative for every attachment distribution, root placement, and unrelated-isolate count.",
        "exhaustive_three_edge_classifier": {
            "unlabeled_nontrivial_cores": list(core_graphs()),
            "core_details": classifier,
            "deduplicated_certificate_count": len(certificates),
            "proof": "Deleting all isolated vertices leaves exactly one of 3K2, P3+K2, P4, or K1,3. Each nontrivial component contains at most one attachment root; every actual vertex placement was enumerated and only identical deleted-core row pairs were deduplicated.",
        },
        "certificates": certificates,
        "coverage_gap_within_three_edge_ge6_all_distributions": None,
        "remaining_ge6_scope": "Forests with at least four edges.",
        "dependencies_sha256": {INPUT.name: INPUT_SHA, ONE_EDGE_SOURCE.name: ONE_EDGE_SOURCE_SHA},
        "scope": "Exactly three edges in W; all >=6 attachment distributions, root placements, and unrelated-isolate counts.",
        "source_sha256": sha256(Path(__file__)),
    }
    raw = json.dumps(report, indent=2, sort_keys=True) + "\n"
    OUTPUT.write_text(raw, encoding="utf-8", newline="\n")
    print(json.dumps({
        "marker": MARKER,
        "cores": list(core_graphs()),
        "certificates": len(certificates),
        "minimum_coefficient": min(value["minimum_tail_scalar_coefficient"] for value in certificates.values()),
        "coverage_gap_within_stated_branch": None,
    }, indent=2, sort_keys=True))
    print("SOURCE_SHA256", report["source_sha256"])
    print("REPORT_SHA256", hashlib.sha256(raw.encode()).hexdigest().upper())
    print(MARKER)


if __name__ == "__main__":
    main()
