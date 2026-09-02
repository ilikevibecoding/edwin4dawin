#!/usr/bin/env python3
"""Exact n=11 audit for all split isolated-root five-attachment patterns.

The audit enumerates every canonical isolate-free core forest, every permitted
number of unrelated isolates, every choice of distinct root components, every
root vertex, and every X/Y side union.  It evaluates the pinned universal
attachment-loss identity directly on the resulting nine-vertex W forest.
"""

from __future__ import annotations

import hashlib
import itertools
import json
from collections import Counter
from pathlib import Path

import networkx as nx
import sympy as sp

from probe_iso_n7_bundle_g3_adjacent_no_parent_five_attachment_split_mixed_isolated_rank7_g5_finish import CONFIG


HERE = Path(__file__).resolve().parent
IDENTITY_REPORT = HERE / "iso_n7_bundle_g3_adjacent_no_parent_general_attachment_losses_exact_rank7_g5_finish_20260831.json"
OUTPUT = HERE / "iso_n7_bundle_g3_adjacent_no_parent_five_attachment_split_isolated_n11_all_padding_exact_rank7_g5_finish_20260831.json"
MARKER = "PASS_EXACT_ISO_N7_BUNDLE_G3_ADJACENT_NO_PARENT_FIVE_ATTACHMENT_SPLIT_ISOLATED_N11_ALL_PADDING_RANK7_G5_FINISH"
FILES = {
    "identity_report": IDENTITY_REPORT.name,
    "config_source": "probe_iso_n7_bundle_g3_adjacent_no_parent_five_attachment_split_mixed_isolated_rank7_g5_finish.py",
}
EXPECTED = {
    "identity_report": "CB3E129A9F2E6EBF6F5AF6D70B917147121041505A312628A39BB4960C79F699",
    "config_source": "FB70065863699E1C941C53ADA69167C0C5312D90583CA721F543F69A26FF2D10",
}


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def integer_partitions_at_least_two(total: int, minimum: int = 2):
    if total == 0:
        yield ()
        return
    for first in range(minimum, total + 1):
        if first == total:
            yield (first,)
        elif total - first >= first:
            for rest in integer_partitions_at_least_two(total - first, first):
                yield (first,) + rest


def isolate_free_forests(order: int):
    """Generate one representative of every unlabeled isolate-free forest."""
    if order == 0:
        yield nx.empty_graph(0), ()
        return
    if order == 1:
        return
    tree_variants = {
        size: [nx.convert_node_labels_to_integers(tree, ordering="sorted") for tree in nx.nonisomorphic_trees(size)]
        for size in range(2, order + 1)
    }
    for partition in integer_partitions_at_least_two(order):
        counts = Counter(partition)
        grouped_choices = []
        grouped_sizes = []
        for size in sorted(counts):
            grouped_sizes.append(size)
            grouped_choices.append(itertools.combinations_with_replacement(range(len(tree_variants[size])), counts[size]))
        for group_selection in itertools.product(*grouped_choices):
            components = []
            for size, selected in zip(grouped_sizes, group_selection):
                components.extend(tree_variants[size][index].copy() for index in selected)
            forest = nx.disjoint_union_all(components)
            vertex_components = tuple(tuple(sorted(component)) for component in nx.connected_components(forest))
            assert forest.number_of_nodes() == order
            assert all(forest.degree(vertex) > 0 for vertex in forest)
            assert nx.is_forest(forest)
            yield forest, vertex_components


def evaluator():
    upstream = json.loads(IDENTITY_REPORT.read_text(encoding="utf-8"))
    m, a, b = sp.symbols("m a b")
    W = {k: sp.Symbol(f"W{k}") for k in range(2, 9)}
    P = {k: sp.Symbol(f"P{k}") for k in range(2, 8)}
    Q = {k: sp.Symbol(f"Q{k}") for k in range(2, 8)}
    expression = sp.expand(sp.sympify(upstream["identity"], locals={
        "m": m,
        "a": a,
        "b": b,
        **{f"W{k}": W[k] for k in W},
        **{f"P{k}": P[k] for k in P},
        **{f"Q{k}": Q[k] for k in Q},
    }))
    variables = (m, a, b, *(W[k] for k in range(2, 9)), *(P[k] for k in range(2, 8)), *(Q[k] for k in range(2, 8)))
    terms = sp.Poly(expression, *variables).terms()

    def evaluate(values):
        total = 0
        for powers, coefficient in terms:
            assert coefficient.q == 1
            term = int(coefficient)
            for value, power in zip(values, powers):
                term *= value**power
            total += term
        return total

    return expression, evaluate


def independent_masks(graph: nx.Graph):
    order = graph.number_of_nodes()
    edge_masks = [(1 << u) | (1 << v) for u, v in graph.edges()]
    rows = [0] * 9
    masks = [[] for _ in range(8)]
    for mask in range(1 << order):
        if any(mask & edge_mask == edge_mask for edge_mask in edge_masks):
            continue
        rank = mask.bit_count()
        if rank <= 8:
            rows[rank] += 1
        if rank <= 7:
            masks[rank].append(mask)
    return rows, masks


def rooted_unions(components, u_count: int, v_count: int):
    if u_count + v_count == 0:
        yield (), ()
        return
    indices = tuple(range(len(components)))
    for u_components in itertools.combinations(indices, u_count):
        remaining = tuple(index for index in indices if index not in u_components)
        for v_components in itertools.combinations(remaining, v_count):
            selected = u_components + v_components
            for roots in itertools.product(*(components[index] for index in selected)):
                yield roots[:u_count], roots[u_count:]


def main() -> None:
    for key, digest in EXPECTED.items():
        assert sha256(HERE / FILES[key]) == digest, key
    expression, evaluate = evaluator()
    stream = hashlib.sha256()
    pattern_reports = {}
    aggregate = 0
    global_minimum = None
    global_witness = None
    for config_key in sorted(CONFIG):
        config = CONFIG[config_key]
        assert config["isolated_total"] >= 1
        surviving = config["surviving_roots"]
        # At n=11, W has m=9.  After deleting the five attachment roots that
        # are isolated and r unrelated isolates, the canonical core order is
        # h = 9-z-r = 4+s-r.  Its surviving roots are nonisolated in distinct
        # components, so h>=2s.  Every r in this exact range is exhausted.
        maximum_unrelated = 4 - surviving
        assert maximum_unrelated >= 0
        local_count = 0
        local_minimum = None
        local_witness = None
        by_unrelated = {}
        for unrelated in range(maximum_unrelated + 1):
            h = 4 + surviving - unrelated
            unrelated_count = 0
            unrelated_minimum = None
            for core, components in isolate_free_forests(h):
                if len(components) < surviving:
                    continue
                isolates = config["isolated_total"] + unrelated
                graph = nx.disjoint_union(core, nx.empty_graph(isolates))
                assert graph.number_of_nodes() == 9 and nx.is_forest(graph)
                rows, masks = independent_masks(graph)
                isolated_start = h
                isolated_x = tuple(range(isolated_start, isolated_start + config["isolated_X"]))
                isolated_y_start = isolated_start + config["isolated_X"]
                isolated_y = tuple(range(isolated_y_start, isolated_y_start + config["isolated_Y"]))
                for u_roots, v_roots in rooted_unions(components, config["U_roots"], config["V_roots"]):
                    # U is the surviving Y-root union (P rows); V is the
                    # surviving X-root union (Q rows).
                    y_bits = sum(1 << root for root in isolated_y + tuple(u_roots))
                    x_bits = sum(1 << root for root in isolated_x + tuple(v_roots))
                    p_rows = [0] * 8
                    q_rows = [0] * 8
                    for rank in range(2, 8):
                        p_rows[rank] = sum(bool(mask & y_bits) for mask in masks[rank])
                        q_rows[rank] = sum(bool(mask & x_bits) for mask in masks[rank])
                    x_count, y_count = map(int, config["distribution"].split("+"))
                    value = evaluate([9, x_count, y_count, *rows[2:9], *p_rows[2:8], *q_rows[2:8]])
                    assert value >= 0
                    local_count += 1
                    unrelated_count += 1
                    aggregate += 1
                    stream.update(
                        f"{config_key}|r{unrelated}|h{h}|{nx.to_graph6_bytes(core, header=False).strip().decode()}|{u_roots}|{v_roots}|{rows[2:9]}|{p_rows[2:8]}|{q_rows[2:8]}|{value};".encode()
                    )
                    witness = {
                        "unrelated_isolates": unrelated,
                        "core_order": h,
                        "core_graph6": nx.to_graph6_bytes(core, header=False).strip().decode(),
                        "U_roots": list(u_roots),
                        "V_roots": list(v_roots),
                        "W2_through_W8": rows[2:9],
                        "P2_through_P7": p_rows[2:8],
                        "Q2_through_Q7": q_rows[2:8],
                    }
                    if local_minimum is None or value < local_minimum:
                        local_minimum, local_witness = value, witness
                    if unrelated_minimum is None or value < unrelated_minimum:
                        unrelated_minimum = value
                    if global_minimum is None or value < global_minimum:
                        global_minimum, global_witness = value, {"config": config_key, **witness}
            if unrelated_count == 0:
                # The sole formal empty case is s=0,r=3,h=1.  Its lone
                # vertex is itself an unrelated isolate, so the canonical
                # isolate-free-core decomposition is instead r=4,h=0.
                assert surviving == 0 and unrelated == 3 and h == 1
                continue
            assert unrelated_minimum is not None
            by_unrelated[str(unrelated)] = {
                "core_order": h,
                "instances": unrelated_count,
                "minimum": unrelated_minimum,
            }
        assert local_count > 0 and local_minimum is not None
        pattern_reports[config_key] = {
            "configuration": config,
            "instances": local_count,
            "minimum": local_minimum,
            "minimum_witness": local_witness,
            "by_unrelated_isolate_count": by_unrelated,
        }
    assert len(pattern_reports) == 20 and aggregate > 0 and global_minimum is not None
    report = {
        "marker": MARKER,
        "status": "proved exact",
        "theorem": "At total order n=11, every split exactly-five adjacent/no-parent G3 pattern with at least one isolated attachment root is nonnegative, for every possible number of unrelated isolates.",
        "exhaustive_method": {
            "full_W_order": 9,
            "total_graph_order_n": 11,
            "unlabeled_core_generation": "Every partition of h into component sizes >=2; every multiset of NetworkX nonisomorphic trees at each repeated size.",
            "root_choices": "Every selection of distinct core components for surviving Y/U and X/V roots, and every vertex choice in each selected component.",
            "unrelated_isolates": "Every canonical count r=0..4-s for s surviving nonisolated attachment roots; the formal s=0,r=3,h=1 decomposition is omitted because that lone vertex is another unrelated isolate and is canonically r=4,h=0.",
            "side_rows": "P counts independent sets meeting all Y attachment roots; Q counts those meeting all X attachment roots.",
        },
        "pattern_reports": pattern_reports,
        "aggregate": {
            "instances": aggregate,
            "negative_count": 0,
            "global_minimum": global_minimum,
            "global_minimum_witness": global_witness,
            "ordered_stream_sha256": stream.hexdigest().upper(),
        },
        "identity": str(expression),
        "coverage_gap_within_split_isolated_root_n11_all_unrelated_padding": None,
        "dependencies_sha256": EXPECTED,
        "scope": "All twenty split exactly-five patterns with at least one isolated attachment root at n=11, including every unrelated-isolate count; n>=12 and all-nonisolated branches are separate.",
        "source_sha256": sha256(Path(__file__)),
    }
    raw = json.dumps(report, indent=2, sort_keys=True) + "\n"
    OUTPUT.write_text(raw, encoding="utf-8", newline="\n")
    print(json.dumps({"marker": MARKER, **report["aggregate"], "patterns": len(pattern_reports)}, indent=2, sort_keys=True))
    print("SOURCE_SHA256", report["source_sha256"])
    print("REPORT_SHA256", hashlib.sha256(raw.encode()).hexdigest().upper())
    print(MARKER)


if __name__ == "__main__":
    main()
