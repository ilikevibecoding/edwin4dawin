#!/usr/bin/env python3
"""Exact actual-topology closure of connected high-degree G1 at m=38."""

from __future__ import annotations

import hashlib
import itertools
import json
from pathlib import Path

import networkx as nx

import probe_iso_n7_bundle_g1_sum0_connected_high_degree_j4e5_profiles_rank7_g4_piecewise as cone
from prove_iso_n7_bundle_g1_connected_core_p4_capacity_floor_rank7_g4_piecewise import (
    capacity_floor,
)


HERE = Path(__file__).resolve().parent
OUTPUT = HERE / (
    "iso_n7_bundle_g1_sum0_connected_high_degree_no_parent_n38_"
    "exact_rank7_g4_piecewise_20260831.json"
)
MARKER = (
    "PASS_EXACT_ISO_N7_BUNDLE_G1_SUM0_CONNECTED_HIGH_DEGREE_NO_PARENT_"
    "N38_RANK7_G4_PIECEWISE"
)
ORDER = 38
DEPENDENCIES = {
    "probe_iso_n7_bundle_g1_sum0_connected_high_degree_profiles_rank7_g4_piecewise.py":
        "300C8AF1CF91E42047B2A888908DFCC21E765778D1AD3B0E650B0713B8E64B92",
    "probe_iso_n7_bundle_g1_sum0_connected_high_degree_profiles_p4_rank7_g4_piecewise.py":
        "005A3CF6E2A5F7B67D0B2EB2A0E9D63C5F9E8DD959EDAE82DA9BCBFE8BE78AF4",
    "probe_iso_n7_bundle_g1_sum0_connected_high_degree_j4e5_profiles_rank7_g4_piecewise.py":
        "5C45A8CA7DC0C7DABD6BD146FFC8D9B65B48CDC1D7605BE26A358665E6B8CAE1",
    "prove_iso_n7_bundle_g1_connected_core_p4_capacity_floor_rank7_g4_piecewise.py":
        "82CBE5C8366AAAE5AB85712E49604A93609D210DB84F2E73D2BBB873BE9C9556",
    "iso_n7_bundle_g1_connected_core_p4_capacity_floor_exact_rank7_g4_piecewise_20260831.json":
        "EDD286C46DBE25DCB3C82D8E4E7F89460BCA7F71165A2413F151E3DFA7D0573D",
    "prove_iso_n7_bundle_g1_sum0_signed_cluster_support_lemma_rank7_g4_piecewise.py":
        "184CE9F5D92F49DED58C3EE477BEA916FC7C624F9E84A234AECD318CCAECF846",
    "iso_n7_bundle_g1_sum0_signed_cluster_support_lemma_exact_rank7_g4_piecewise_20260831.json":
        "180026E94A87369CA46D3F58F0ACB18EB35ED550792BB0F04BE5167B06D9ED3B",
    "prove_iso_n7_bundle_g1_sum0_support_direction_monotonicity_rank7_g4_piecewise.py":
        "095BC0C3FF23ECBEA7AFF32AADE3347C1D2BA926156C431DECBD36B7DDE9B6DA",
    "iso_n7_bundle_g1_sum0_support_direction_monotonicity_exact_rank7_g4_piecewise_20260831.json":
        "AAD841A64F5F0FFB999AB5B26E299F77F2D03B29C5DC52CA3E51C255E30EA08E",
    "prove_iso_n7_bundle_g1_connected_j4_e5_coupling_rank7_g4_piecewise.py":
        "E70E9EA2333E98C89DCFE7C660B08FFBE008D4467DE0F6B1A75FC26073FEB284",
    "iso_n7_bundle_g1_connected_j4_e5_coupling_exact_rank7_g4_piecewise_20260831.json":
        "FE4AECAFC00B35F142C0F0B4BAD32D71D069FD19FBB3A2B8696E519BCBC7C256",
    "prove_iso_n7_bundle_g1_sum0_connected_high_degree_support_caps_rank7_g4_piecewise.py":
        "744618134C3D41A052345A237DA842941DC59D9F71937888321DD57216C647DD",
    "iso_n7_bundle_g1_sum0_connected_high_degree_support_caps_exact_rank7_g4_piecewise_20260831.json":
        "7267A522C6D5D729C762360B6B20CDF8B8FD93574D8FF6C977371542C79667C1",
}


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def polynomial_add(left, right):
    return tuple(left[index]+right[index] for index in range(9))


def polynomial_multiply(left, right):
    result = [0]*9
    for i, first in enumerate(left):
        if first == 0:
            continue
        for j, second in enumerate(right[:9-i]):
            result[i+j] += first*second
    return tuple(result)


def independence_polynomial(tree: nx.Graph):
    def rooted(vertex, parent):
        excluded = (1,)+(0,)*8
        included_product = (1,)+(0,)*8
        for child in tree[vertex]:
            if child == parent:
                continue
            child_excluded, child_included = rooted(child, vertex)
            excluded = polynomial_multiply(
                excluded, polynomial_add(child_excluded, child_included)
            )
            included_product = polynomial_multiply(included_product, child_excluded)
        included = (0,)+included_product[:-1]
        return excluded, included

    excluded, included = rooted(0, None)
    return polynomial_add(excluded, included)


def g1(polynomial):
    w3, w4, w5, w6, w7, w8 = polynomial[3:9]
    return (
        8*w3*w3+24*w3*w4-64*w3*w5-106*w3*w6-51*w3*w7
        -8*w3*w8+80*w4*w4+90*w4*w5-12*w4*w6-10*w4*w7
        +39*w5*w5+10*w5*w6
    )


def actual_tree(core: nx.Graph, assignment):
    tree = core.copy()
    next_vertex = len(core)
    for vertex, excess in enumerate(assignment):
        leaves = excess+1-core.degree(vertex)
        assert leaves >= 0
        for _ in range(leaves):
            tree.add_edge(vertex, next_vertex)
            next_vertex += 1
    assert tree.number_of_nodes() == ORDER
    assert nx.is_tree(tree)
    return tree


def main() -> None:
    for name, digest in DEPENDENCIES.items():
        assert sha256(HERE/name) == digest, name
    cone.p4_floor = lambda order, parts: capacity_floor(tuple(parts))

    profile_stream = hashlib.sha256()
    topology_stream = hashlib.sha256()
    total_profiles = 0
    analytic_profiles = 0
    residual_profiles = []
    controls_checked = 0
    for parts in cone.partitions(ORDER-2):
        if parts[0] < 3 or sum(value >= 2 for value in parts) < 3:
            continue
        value, degrees, controls, p4, jmax = cone.relaxed(ORDER, parts)
        for index, control in enumerate(controls):
            profile_stream.update(
                f"{parts}|{index}|{p4}|{jmax}|{control}\n".encode("ascii")
            )
            controls_checked += 1
        total_profiles += 1
        if value >= 0:
            analytic_profiles += 1
        else:
            residual_profiles.append(parts)

    topology_assignments = 0
    topology_negative = 0
    topology_minimum = None
    core_orders = set()
    for parts in residual_profiles:
        core_order = len(parts)
        core_orders.add(core_order)
        assignments = sorted(set(itertools.permutations(parts)))
        for tree_index, core in enumerate(nx.nonisomorphic_trees(core_order)):
            assert set(core) == set(range(core_order))
            for assignment in assignments:
                if any(
                    assignment[vertex] < core.degree(vertex)-1
                    for vertex in range(core_order)
                ):
                    continue
                tree = actual_tree(core, assignment)
                polynomial = independence_polynomial(tree)
                value = g1(polynomial)
                record = (parts, tree_index, assignment, polynomial, value)
                topology_stream.update((repr(record)+"\n").encode("ascii"))
                topology_assignments += 1
                topology_negative += value < 0
                candidate = (value, parts, tree_index, assignment, polynomial)
                topology_minimum = (
                    candidate if topology_minimum is None
                    else min(topology_minimum, candidate)
                )

    assert total_profiles == 17636
    assert analytic_profiles == 17604
    assert len(residual_profiles) == 32
    assert controls_checked == 158724
    assert core_orders == {5, 6, 7}
    assert topology_assignments == 44486
    assert topology_negative == 0
    assert topology_minimum == (
        2118319503976,
        (9, 9, 8, 7, 1, 1, 1),
        0,
        (1, 9, 1, 7, 9, 1, 8),
        (1, 38, 666, 7261, 56078, 330603, 1560155, 6083501, 20037879),
    )
    assert profile_stream.hexdigest().upper() == (
        "F1DEAE3FB990B06A5E23D0DB3137F6B27E56BE0798F65A3B1892E1284736C225"
    )
    assert topology_stream.hexdigest().upper() == (
        "4840D677DA02DEBDB5972F0E749C998184C1BF0C8AA35C8F01D98A39269AD07D"
    )

    report = {
        "marker": MARKER,
        "status": "proved exact",
        "theorem": (
            "For every connected 38-vertex tree W with maximum degree at "
            "least four and at least three branching vertices, the exact "
            "rank-seven common0/sum0 no-parent coefficient G1 is nonnegative."
        ),
        "gapless_split": {
            "analytic_profiles": analytic_profiles,
            "analytic_method": (
                "All nine strengthened-P4 cone controls are nonnegative; the "
                "pinned support caps and global endpoint moves promote the cone "
                "bound to actual G1."
            ),
            "literal_residual_profiles": len(residual_profiles),
            "literal_core_orders": sorted(core_orders),
            "literal_method": (
                "For each residual degree profile, enumerate every unlabeled "
                "nonleaf core and every compatible assignment of its degree "
                "excesses. Attach the forced number of leaves, compute the "
                "exact truncated independence polynomial by rooted recurrence, "
                "and evaluate the literal G1 quadratic."
            ),
            "coverage_gap": None,
        },
        "certificate": {
            "total_profiles": total_profiles,
            "controls_checked": controls_checked,
            "profile_stream_sha256": profile_stream.hexdigest().upper(),
            "topology_assignments": topology_assignments,
            "topology_negative": topology_negative,
            "topology_minimum_G1": str(topology_minimum[0]),
            "topology_minimum_profile": list(topology_minimum[1]),
            "topology_minimum_core_index": topology_minimum[2],
            "topology_minimum_assignment": list(topology_minimum[3]),
            "topology_minimum_independence_rows_0_8": list(topology_minimum[4]),
            "topology_stream_sha256": topology_stream.hexdigest().upper(),
        },
        "coverage_gap_within_stated_actual_n38_scope": None,
        "scope": (
            "Actual connected-tree G1 at unmarked order exactly 38, "
            "common0/sum0 no-parent, maximum degree>=4, and at least three "
            "branching vertices. Other orders and modes remain separate."
        ),
        "dependencies_sha256": DEPENDENCIES,
        "source_sha256": sha256(Path(__file__)),
    }
    encoded = json.dumps(report, indent=2, sort_keys=True)+"\n"
    OUTPUT.write_text(encoded, encoding="utf-8", newline="\n")
    print(json.dumps({
        "marker": MARKER,
        "analytic_profiles": analytic_profiles,
        "literal_residual_profiles": len(residual_profiles),
        "topology_assignments": topology_assignments,
        "topology_negative": topology_negative,
        "topology_minimum_G1": str(topology_minimum[0]),
        "profile_stream_sha256": profile_stream.hexdigest().upper(),
        "topology_stream_sha256": topology_stream.hexdigest().upper(),
        "coverage_gap_within_stated_actual_n38_scope": None,
    }, indent=2, sort_keys=True))
    print("SOURCE_SHA256", report["source_sha256"])
    print("REPORT_SHA256", hashlib.sha256(encoded.encode()).hexdigest().upper())
    print(MARKER)


if __name__ == "__main__":
    main()
