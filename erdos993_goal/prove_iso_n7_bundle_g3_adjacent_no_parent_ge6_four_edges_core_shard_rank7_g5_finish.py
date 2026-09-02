#!/usr/bin/env python3
"""Exact one-core shard for the universal four-edge >=6-attachment G3 layer."""

from __future__ import annotations

import argparse
import hashlib
import itertools
import json
from pathlib import Path

import networkx as nx
import sympy as sp

import audit_iso_n7_bundle_g3_adjacent_no_parent_attachment_increment_same_mark_small_rank7_g5_finish as forest_enum
from probe_iso_n7_bundle_g3_sum0_dense_extension_threshold_rank7_g5_finish import choose_poly
from prove_iso_n7_bundle_g3_adjacent_no_parent_ge6_one_edge_all_distributions_rank7_g5_finish import bernstein_tail_certificate
from prove_iso_n7_bundle_g3_adjacent_no_parent_ge6_three_edges_all_distributions_rank7_g5_finish import independent_counts, rooted_patterns


HERE = Path(__file__).resolve().parent
INPUT = HERE / "iso_n7_bundle_g3_adjacent_no_parent_general_attachment_losses_exact_rank7_g5_finish_20260831.json"
INPUT_SHA = "CB3E129A9F2E6EBF6F5AF6D70B917147121041505A312628A39BB4960C79F699"
FOREST_SOURCE = HERE / "audit_iso_n7_bundle_g3_adjacent_no_parent_attachment_increment_same_mark_small_rank7_g5_finish.py"
FOREST_SOURCE_SHA = "0A4C13FFB50EDB028069A3CE7BC700549628A98425EF41EBDD0049F39E3B71A5"
ONE_EDGE_SOURCE = HERE / "prove_iso_n7_bundle_g3_adjacent_no_parent_ge6_one_edge_all_distributions_rank7_g5_finish.py"
ONE_EDGE_SOURCE_SHA = "1DF08223EBECCBA9E5056BD52604D1342763E313D111CEF63568D4B285D6149E"
THREE_EDGE_SOURCE = HERE / "prove_iso_n7_bundle_g3_adjacent_no_parent_ge6_three_edges_all_distributions_rank7_g5_finish.py"
THREE_EDGE_SOURCE_SHA = "D0BAF4FC3BE88662DABB30D0759759FB07EF70749642D847ADC340C57407EBD3"
MARKER = "PASS_EXACT_ISO_N7_BUNDLE_G3_ADJACENT_NO_PARENT_GE6_FOUR_EDGES_CORE_SHARD_RANK7_G5_FINISH"


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def canonical_edges(graph: nx.Graph):
    vertices = tuple(sorted(graph.nodes()))
    best = None
    for image in itertools.permutations(range(len(vertices))):
        relabel = dict(zip(vertices, image))
        encoding = tuple(sorted(
            tuple(sorted((relabel[u], relabel[v]))) for u, v in graph.edges()
        ))
        if best is None or encoding < best:
            best = encoding
    return best


def four_edge_cores():
    cores = []
    for order in range(2, 9):
        for graph in forest_enum.unlabeled_forests(order):
            if graph.number_of_edges() != 4:
                continue
            if not all(graph.degree(vertex) > 0 for vertex in graph):
                continue
            cores.append(nx.convert_node_labels_to_integers(graph))
    assert len(cores) == 8
    assert all(
        not nx.is_isomorphic(cores[left], cores[right])
        for left in range(len(cores)) for right in range(left + 1, len(cores))
    )
    records = [(graph.number_of_nodes(), canonical_edges(graph), graph) for graph in cores]
    records.sort(key=lambda item: (item[0], item[1]))
    return records


def convolved_row(core_rows, isolates, rank):
    return sp.expand(sum(
        core_rows[j] * choose_poly(isolates, rank - j)
        for j in range(min(rank, len(core_rows) - 1) + 1)
    ))


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--core-index", type=int, choices=range(8), required=True)
    args = parser.parse_args()
    for path, digest in (
        (INPUT, INPUT_SHA),
        (FOREST_SOURCE, FOREST_SOURCE_SHA),
        (ONE_EDGE_SOURCE, ONE_EDGE_SOURCE_SHA),
        (THREE_EDGE_SOURCE, THREE_EDGE_SOURCE_SHA),
    ):
        assert sha256(path) == digest, path.name
    order, encoding, graph = four_edge_cores()[args.core_index]
    patterns = rooted_patterns(graph)
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
    root_tail, unrelated_isolates, split = sp.symbols(
        "root_tail unrelated_isolates split", nonnegative=True
    )
    roots = root_tail + 6
    core_rows = independent_counts(graph)
    certificates = {}
    for pattern_index, (signature, witness) in enumerate(sorted(patterns.items(), key=lambda item: str(item[0]))):
        x_count, y_count, x_deleted_rows, y_deleted_rows = signature
        rooted_core_count = x_count + y_count
        b_value = y_count + (roots / 2 - y_count) * split
        a_value = roots - b_value
        base_isolates = roots - rooted_core_count + unrelated_isolates
        m_value = order + base_isolates
        w_rows = {k: convolved_row(core_rows, base_isolates, k) for k in W}
        avoid_y_isolates = sp.expand(base_isolates - (b_value - y_count))
        avoid_x_isolates = sp.expand(base_isolates - (a_value - x_count))
        p_rows = {k: w_rows[k] - convolved_row(y_deleted_rows, avoid_y_isolates, k) for k in P}
        q_rows = {k: w_rows[k] - convolved_row(x_deleted_rows, avoid_x_isolates, k) for k in Q}
        specialized = sp.cancel(identity.subs({
            m: m_value, a: a_value, b: b_value,
            **{W[k]: w_rows[k] for k in W},
            **{P[k]: p_rows[k] for k in P},
            **{Q[k]: q_rows[k] for k in Q},
        }, simultaneous=True))
        certificate = bernstein_tail_certificate(
            specialized, split, (root_tail, unrelated_isolates)
        )
        assert certificate["negative_tail_scalar_coefficients"] == 0, (
            args.core_index, pattern_index, certificate["first_negative"]
        )
        label = f"p{pattern_index:02d}_x{x_count}_y{y_count}"
        certificates[label] = {
            "root_pattern": witness,
            "parameterization": {"m": str(m_value), "a": str(a_value), "b": str(b_value)},
            **certificate,
        }
    output = HERE / f"iso_n7_bundle_g3_adjacent_no_parent_ge6_four_edges_core{args.core_index}_exact_rank7_g5_finish_20260831.json"
    report = {
        "marker": MARKER,
        "status": "proved exact",
        "core_index": args.core_index,
        "core_order": order,
        "canonical_edges": encoding,
        "degree_sequence": sorted((degree for _vertex, degree in graph.degree()), reverse=True),
        "components": nx.number_connected_components(graph),
        "root_pattern_classifier": {
            "raw_patterns": sum(item["equivalent_raw_patterns"] for item in patterns.values()),
            "deduplicated_patterns": len(patterns),
            "deduplication_rule": "Identical X-deleted and Y-deleted core independent-row pairs with equal X/Y core-root counts only.",
        },
        "certificates": certificates,
        "coverage_gap_within_stated_four_edge_core": None,
        "core_list_guard": "This is one of exactly eight pairwise nonisomorphic four-edge isolate-free forest cores; universal e=4 requires all eight shard reports.",
        "dependencies_sha256": {
            INPUT.name: INPUT_SHA,
            FOREST_SOURCE.name: FOREST_SOURCE_SHA,
            ONE_EDGE_SOURCE.name: ONE_EDGE_SOURCE_SHA,
            THREE_EDGE_SOURCE.name: THREE_EDGE_SOURCE_SHA,
        },
        "scope": "One fixed isolate-free four-edge core, all >=6 attachment distributions, all permissible root placements, and arbitrary unrelated isolates.",
        "source_sha256": sha256(Path(__file__)),
    }
    raw = json.dumps(report, indent=2, sort_keys=True) + "\n"
    output.write_text(raw, encoding="utf-8", newline="\n")
    print(json.dumps({
        "marker": MARKER,
        "core_index": args.core_index,
        "core_order": order,
        "canonical_edges": encoding,
        "certificates": len(certificates),
        "minimum_coefficient": str(min(sp.Rational(value["minimum_tail_scalar_coefficient"]) for value in certificates.values())),
        "coverage_gap_within_stated_core": None,
    }, indent=2, sort_keys=True))
    print("SOURCE_SHA256", report["source_sha256"])
    print("REPORT_SHA256", hashlib.sha256(raw.encode()).hexdigest().upper())
    print(MARKER)


if __name__ == "__main__":
    main()
