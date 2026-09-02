#!/usr/bin/env python3
"""Exact rooted unlabeled-forest census for the remaining ordinary G3 orders."""

from __future__ import annotations

import hashlib
import json
from pathlib import Path

import networkx as nx
import sympy as sp

from probe_iso_n7_bundle_g3_sum0_ordinary_safe_cap_moment_rank7_g5_finish import (
    ordinary_reduced,
)


HERE = Path(__file__).resolve().parent
OUTPUT = HERE / (
    "iso_n7_bundle_g3_sum0_ordinary_nonisolated_finite_n11_14_exact_"
    "rank7_g5_finish_20260831.json"
)
MARKER = (
    "PASS_EXACT_ISO_N7_BUNDLE_G3_SUM0_ORDINARY_NONISOLATED_"
    "FINITE_N11_14_RANK7_G5_FINISH"
)
FILES = {
    "parent_report": "iso_n7_bundle_g3_parent_modes_exact_rank7_g4_piecewise_20260831.json",
    "ordinary_reduction_source": "probe_iso_n7_bundle_g3_sum0_ordinary_safe_cap_moment_rank7_g5_finish.py",
    "finite_n2_10_source": "assemble_iso_n7_bundle_g123_finite_n2_10_rank7_g4_piecewise.py",
    "finite_n2_10_report": "iso_n7_bundle_g123_finite_n2_10_assembled_exact_rank7_g4_piecewise_20260831.json",
}
EXPECTED = {
    "parent_report": "6977AF4DC4A353F5520BF6ED4450F0594DDDB7F8541128D28D52B8E77A4EB132",
    "ordinary_reduction_source": "FB074FED9A5B0D53FEA383802DA55118B67FFB5DC4A5614390E6835D50E11583",
    "finite_n2_10_source": "B938DDCC0F798036EC1B01EA92169D4A5EF24A784754D42733CFA74C3240F5D9",
    "finite_n2_10_report": "12457F9ADFFCFD268F19375566E488A8C9D2A25CC581597D5196705DC08E94D5",
}
TREE_COUNTS = {
    2: 1, 3: 1, 4: 2, 5: 3, 6: 6, 7: 11,
    8: 23, 9: 47, 10: 106, 11: 235, 12: 551,
}


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def expected_forest_count(order: int) -> int:
    # Generating function product over every free-tree type: each type may be
    # used with arbitrary multiplicity as a forest component.
    counts = [0]*(order+1)
    counts[0] = 1
    for size in range(2, order+1):
        for _tree_type in range(TREE_COUNTS[size]):
            for total in range(size, order+1):
                counts[total] += counts[total-size]
    return counts[order]


def component_types(max_order: int):
    types = []
    for size in range(2, max_order+1):
        trees = list(nx.nonisomorphic_trees(size))
        assert len(trees) == TREE_COUNTS[size]
        for index, tree in enumerate(trees):
            types.append((size, index, nx.convert_node_labels_to_integers(tree)))
    return types


def forest_component_multisets(order: int, types):
    chosen = []

    def rec(remaining: int, start: int):
        if remaining == 0:
            yield tuple(chosen)
            return
        for type_index in range(start, len(types)):
            size = types[type_index][0]
            if size > remaining:
                break
            chosen.append(type_index)
            yield from rec(remaining-size, type_index)
            chosen.pop()

    yield from rec(order, 0)


def independent_rows(graph: nx.Graph):
    order = graph.number_of_nodes()
    neighbor_masks = [0]*order
    for u, v in graph.edges():
        neighbor_masks[u] |= 1 << v
        neighbor_masks[v] |= 1 << u
    independent = bytearray(1 << order)
    independent[0] = 1
    W = [0]*9
    rooted = [[0]*8 for _ in range(order)]
    for mask in range(1 << order):
        if mask:
            bit = mask & -mask
            vertex = bit.bit_length()-1
            rest = mask ^ bit
            independent[mask] = independent[rest] and not (neighbor_masks[vertex] & rest)
        if not independent[mask]:
            continue
        rank = mask.bit_count()
        if rank <= 8:
            W[rank] += 1
        if 1 <= rank <= 7:
            remaining = mask
            while remaining:
                bit = remaining & -remaining
                rooted[bit.bit_length()-1][rank] += 1
                remaining ^= bit
    return W, rooted


def exact_integer_evaluator():
    m, W, R, exact, _coefficients, _lower, _c3, _c5 = ordinary_reduced()
    variables = [m, *(W[rank] for rank in range(2, 9)), *(R[rank] for rank in range(3, 8))]
    polynomial = sp.Poly(exact, *variables)
    terms = polynomial.terms()

    def evaluate(values):
        total = 0
        for exponents, coefficient in terms:
            assert coefficient.q == 1
            term = int(coefficient)
            for value, exponent in zip(values, exponents):
                term *= value**exponent
            total += term
        return total

    return exact, evaluate


def main() -> None:
    for key, digest in EXPECTED.items():
        assert sha256(HERE / FILES[key]) == digest, key
    assert nx.__version__ == "3.6.1"
    exact, evaluate = exact_integer_evaluator()
    types = component_types(12)
    stream = hashlib.sha256()
    order_reports = {}
    aggregate_forests = aggregate_roots = aggregate_negative = 0
    global_minimum = None
    for m in range(9, 13):
        forest_count = root_count = negative_count = 0
        local_minimum = None
        minimum_witness = None
        for component_ids in forest_component_multisets(m, types):
            components = [types[index][2] for index in component_ids]
            graph = nx.disjoint_union_all(components)
            assert graph.number_of_nodes() == m
            assert nx.is_forest(graph)
            assert all(degree >= 1 for _, degree in graph.degree())
            W, rooted = independent_rows(graph)
            forest_count += 1
            encoding = tuple((types[index][0], types[index][1]) for index in component_ids)
            for parent in range(m):
                assert graph.degree(parent) >= 1
                R = rooted[parent]
                values = [m, *(W[rank] for rank in range(2, 9)), *(R[rank] for rank in range(3, 8))]
                value = evaluate(values)
                stream.update(f"{m}|{encoding}|{parent}|{W[2:9]}|{R[3:8]}|{value};".encode())
                root_count += 1
                if value < 0:
                    negative_count += 1
                if local_minimum is None or value < local_minimum:
                    local_minimum = value
                    minimum_witness = {
                        "component_types_size_and_index": encoding,
                        "parent_vertex": parent,
                        "parent_degree": graph.degree(parent),
                        "W2_through_W8": W[2:9],
                        "R3_through_R7": R[3:8],
                    }
        expected_count = expected_forest_count(m)
        assert forest_count == expected_count
        assert root_count == m*forest_count
        assert negative_count == 0 and local_minimum is not None and local_minimum >= 0
        order_reports[str(m+2)] = {
            "total_order_n": m+2,
            "unmarked_order_m": m,
            "unlabeled_isolate_free_forests": forest_count,
            "rooted_parent_rows_checked_including_automorphic_duplicates": root_count,
            "negative_count": negative_count,
            "minimum_G3": str(local_minimum),
            "minimum_witness": minimum_witness,
        }
        aggregate_forests += forest_count
        aggregate_roots += root_count
        aggregate_negative += negative_count
        global_minimum = local_minimum if global_minimum is None else min(global_minimum, local_minimum)

    report = {
        "marker": MARKER,
        "status": "proved exact",
        "theorem": (
            "For every isolate-free unmarked forest W of order 9<=m<=12 and "
            "every choice of nonisolated ordinary parent p in W, the exact "
            "rank-seven G3 coefficient in nonadjacent/common0/sum0 mask "
            "p_u0_v0 is nonnegative. Equivalently this closes total orders "
            "11<=n<=14."
        ),
        "method": (
            "Complete generation of each unlabeled forest as a multiset of "
            "NetworkX free-tree types of orders 2..12, followed by every vertex "
            "as the designated parent and literal independent-set enumeration."
        ),
        "tree_counts": TREE_COUNTS,
        "order_reports": order_reports,
        "aggregate": {
            "unlabeled_isolate_free_forests": aggregate_forests,
            "rooted_parent_rows_checked": aggregate_roots,
            "negative_count": aggregate_negative,
            "global_minimum_G3": str(global_minimum),
            "ordered_row_stream_sha256": stream.hexdigest().upper(),
            "forest_count_generating_function_checked": True,
        },
        "exact_expression": str(exact),
        "coverage_gap_within_nonisolated_ordinary_n11_14": None,
        "universal_ordinary_G3_guard": False,
        "dependencies_sha256": EXPECTED,
        "environment": {"networkx_version": nx.__version__},
        "scope": (
            "Only nonisolated ordinary-parent p_u0_v0 nonadjacent/common0/sum0 "
            "rank-seven G3 at n=11..14. Other orders, isolated parent, other "
            "geometries, and other modes are separate."
        ),
        "source_sha256": sha256(Path(__file__)),
    }
    raw = json.dumps(report, indent=2, sort_keys=True)+"\n"
    OUTPUT.write_text(raw, encoding="utf-8", newline="\n")
    print(json.dumps({
        "marker": MARKER,
        **report["aggregate"],
        "orders": [11, 14],
    }, indent=2, sort_keys=True))
    print("SOURCE_SHA256", report["source_sha256"])
    print("REPORT_SHA256", hashlib.sha256(raw.encode()).hexdigest().upper())
    print(MARKER)


if __name__ == "__main__":
    main()
