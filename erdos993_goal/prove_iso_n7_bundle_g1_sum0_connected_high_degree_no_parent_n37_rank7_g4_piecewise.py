#!/usr/bin/env python3
"""Exact actual-topology closure of connected high-degree G1 at m=37."""

from __future__ import annotations

import hashlib
import itertools
import json
import math
from pathlib import Path

import networkx as nx

import probe_iso_n7_bundle_g1_sum0_connected_high_degree_j4e5_profiles_rank7_g4_piecewise as cone
from prove_iso_n7_bundle_g1_connected_core_p4_capacity_floor_rank7_g4_piecewise import (
    capacity_floor,
)
from prove_iso_n7_bundle_g1_sum0_connected_high_degree_no_parent_n38_rank7_g4_piecewise import (
    g1,
    polynomial_add,
    polynomial_multiply,
)


HERE = Path(__file__).resolve().parent
OUTPUT = HERE / (
    "iso_n7_bundle_g1_sum0_connected_high_degree_no_parent_n37_"
    "exact_rank7_g4_piecewise_20260831.json"
)
MARKER = (
    "PASS_EXACT_ISO_N7_BUNDLE_G1_SUM0_CONNECTED_HIGH_DEGREE_NO_PARENT_"
    "N37_RANK7_G4_PIECEWISE"
)
ORDER = 37
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
    "prove_iso_n7_bundle_g1_sum0_connected_high_degree_no_parent_n38_rank7_g4_piecewise.py":
        "DC16C099386992B8623A88E79DE5861E3157473FBCCE818CEBBF8E6252387541",
    "iso_n7_bundle_g1_sum0_connected_high_degree_no_parent_n38_exact_rank7_g4_piecewise_20260831.json":
        "0DB0368D88001EBAA801611F5E5AD7A0021DF5C20C1FAD48A5F764C92A2174EF",
}


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def bundled_independence_polynomial(core: nx.Graph, assignment):
    """Exact I(W) without explicitly materializing every pendant leaf."""
    one = (1,)+(0,)*8

    def rooted(vertex, parent):
        leaves = assignment[vertex]+1-core.degree(vertex)
        assert leaves >= 0
        excluded = tuple(
            math.comb(leaves, rank) if rank <= leaves else 0
            for rank in range(9)
        )
        included_product = one
        for child in core[vertex]:
            if child == parent:
                continue
            child_excluded, child_included = rooted(child, vertex)
            excluded = polynomial_multiply(
                excluded, polynomial_add(child_excluded, child_included)
            )
            included_product = polynomial_multiply(
                included_product, child_excluded
            )
        included = (0,)+included_product[:-1]
        return excluded, included

    excluded, included = rooted(0, None)
    return polynomial_add(excluded, included)


def main() -> None:
    for name, digest in DEPENDENCIES.items():
        assert sha256(HERE/name) == digest, name
    n38 = json.loads(
        (HERE/"iso_n7_bundle_g1_sum0_connected_high_degree_no_parent_n38_exact_rank7_g4_piecewise_20260831.json")
        .read_text(encoding="utf-8")
    )
    assert n38["marker"] == (
        "PASS_EXACT_ISO_N7_BUNDLE_G1_SUM0_CONNECTED_HIGH_DEGREE_NO_PARENT_N38_RANK7_G4_PIECEWISE"
    )
    assert n38["status"] == "proved exact"
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
    for profile_index, parts in enumerate(residual_profiles):
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
                polynomial = bundled_independence_polynomial(core, assignment)
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

    assert total_profiles == 14561
    assert analytic_profiles == 14349
    assert len(residual_profiles) == 212
    assert controls_checked == 131049
    assert core_orders == {4, 5, 6, 7, 8, 9}
    assert topology_assignments == 1161268
    assert topology_negative == 0
    assert topology_minimum == (
        1582442167314,
        (8, 8, 8, 8, 1, 1, 1),
        0,
        (1, 8, 1, 8, 8, 1, 8),
        (1, 37, 630, 6657, 49722, 282983, 1287321, 4832755, 15307765),
    )
    assert profile_stream.hexdigest().upper() == (
        "76C7A489916ADBAB954402EE5457B15099D3F6F13652916939D349C784A84160"
    )
    assert topology_stream.hexdigest().upper() == (
        "AB5D0FB7474BA508EC023C54CC8DB448BDDAFDE3024250000AB0B23795CD2FE6"
    )

    report = {
        "marker": MARKER,
        "status": "proved exact",
        "theorem": (
            "For every connected 37-vertex tree W with maximum degree at "
            "least four and at least three branching vertices, the exact "
            "rank-seven common0/sum0 no-parent coefficient G1 is nonnegative."
        ),
        "gapless_split": {
            "analytic_profiles": analytic_profiles,
            "analytic_method": (
                "Nonnegative strengthened-P4 controls plus the pinned exact "
                "support-cap and endpoint-movement promotion."
            ),
            "literal_residual_profiles": len(residual_profiles),
            "literal_core_orders": sorted(core_orders),
            "literal_method": (
                "Every unlabeled nonleaf core and compatible degree-excess "
                "assignment, evaluated by exact bundled-leaf rooted recurrence."
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
        "coverage_gap_within_stated_actual_n37_scope": None,
        "scope": (
            "Actual connected-tree G1 at unmarked order exactly 37, "
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
        "coverage_gap_within_stated_actual_n37_scope": None,
    }, indent=2, sort_keys=True))
    print("SOURCE_SHA256", report["source_sha256"])
    print("REPORT_SHA256", hashlib.sha256(encoded.encode()).hexdigest().upper())
    print(MARKER)


if __name__ == "__main__":
    main()
