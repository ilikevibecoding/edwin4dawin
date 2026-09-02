#!/usr/bin/env python3
"""Exact finite census probe for the residual connected rank-7 G1 cell.

Every free tree of order 11..20 is generated once.  The stated cell keeps
maximum degree at least four and at least three branching vertices.  Its
independence rows through eight and literal G1 value are computed by the
pinned bundled-tree recurrence; periodic cases are replayed by the separate
pure-Python recurrence.  This first source is a sizing probe, not a theorem.
"""

from __future__ import annotations

import hashlib
import json
from pathlib import Path

import networkx as nx
import numba
import numpy as np

from prove_iso_n7_bundle_g1_sum0_connected_high_degree_no_parent_n34_36_batch_rank7_g4_piecewise import (
    accelerated_literal_g1,
    bundled_independence_polynomial,
    g1,
    rooted_core_arrays,
)


HERE = Path(__file__).resolve().parent
OUTPUT = HERE / (
    "probe_iso_n7_bundle_g1_sum0_connected_high_degree_no_parent_n11_20_"
    "census_rank7_g4_piecewise_20260831.json"
)
MARKER = (
    "PROBE_EXACT_ISO_N7_BUNDLE_G1_SUM0_CONNECTED_HIGH_DEGREE_NO_PARENT_"
    "N11_20_CENSUS_RANK7_G4_PIECEWISE"
)
TREE_COUNTS = {
    11: 235,
    12: 551,
    13: 1301,
    14: 3159,
    15: 7741,
    16: 19320,
    17: 48629,
    18: 123867,
    19: 317955,
    20: 823065,
}


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def main() -> None:
    stream = hashlib.sha256()
    order_reports = {}
    global_minimum = None
    eligible_total = 0
    crosschecks = 0
    for order in range(11, 21):
        trees = 0
        eligible = 0
        negative = 0
        local_minimum = None
        for tree_index, tree in enumerate(nx.nonisomorphic_trees(order)):
            trees += 1
            code = nx.to_graph6_bytes(tree, header=False).decode().strip()
            degrees = tuple(sorted((degree for _, degree in tree.degree()), reverse=True))
            active = degrees[0] >= 4 and sum(degree >= 3 for degree in degrees) >= 3
            stream.update(f"T|{order}|{tree_index}|{code}|{degrees}|{int(active)}\n".encode())
            if not active:
                continue
            eligible += 1
            eligible_total += 1
            vertices, parent, degree = rooted_core_arrays(tree)
            assignment = np.asarray(
                [int(degree[position]) - 1 for position in range(order)],
                dtype=np.int64,
            )
            value, polynomial = accelerated_literal_g1(parent, degree, assignment)
            polynomial_tuple = tuple(int(item) for item in polynomial)
            value = int(value)
            stream.update((repr((polynomial_tuple, value)) + "\n").encode())
            if value < 0:
                negative += 1
            candidate = (value, tree_index, code, degrees, polynomial_tuple)
            local_minimum = (
                candidate
                if local_minimum is None or candidate < local_minimum
                else local_minimum
            )
            global_candidate = (value, order, tree_index, code, degrees, polynomial_tuple)
            global_minimum = (
                global_candidate
                if global_minimum is None or global_candidate < global_minimum
                else global_minimum
            )
            if eligible_total % 4096 == 0:
                labeled_assignment = [0] * order
                for position, vertex in enumerate(vertices):
                    labeled_assignment[vertex] = int(assignment[position])
                slow = bundled_independence_polynomial(tree, tuple(labeled_assignment))
                assert slow == polynomial_tuple
                assert g1(slow) == value
                crosschecks += 1
        assert trees == TREE_COUNTS[order]
        assert negative == 0
        order_reports[str(order)] = {
            "free_trees": trees,
            "eligible_trees": eligible,
            "negative": negative,
            "minimum": local_minimum,
        }
        print(
            "ORDER", order, "TREES", trees, "ELIGIBLE", eligible,
            "MINIMUM", local_minimum[0] if local_minimum else None,
            flush=True,
        )

    report = {
        "marker": MARKER,
        "status": "exact sizing probe; expected stream not yet frozen",
        "scope": (
            "Actual connected trees of order 11..20, common0/sum0 no-parent, "
            "maximum degree>=4, and at least three branching vertices."
        ),
        "tree_counts": TREE_COUNTS,
        "order_reports": order_reports,
        "eligible_total": eligible_total,
        "negative_total": 0,
        "global_minimum": global_minimum,
        "crosschecks": crosschecks,
        "ordered_tree_value_stream_sha256": stream.hexdigest().upper(),
        "versions": {
            "networkx": nx.__version__,
            "numba": numba.__version__,
            "numpy": np.__version__,
        },
        "scope_guard": "Probe only; no theorem promoted before frozen replay.",
        "source_sha256": sha256(Path(__file__)),
    }
    encoded = json.dumps(report, indent=2, sort_keys=True) + "\n"
    OUTPUT.write_text(encoded, encoding="utf-8", newline="\n")
    print(json.dumps({
        "marker": MARKER,
        "eligible_total": eligible_total,
        "negative_total": 0,
        "global_minimum": global_minimum,
        "crosschecks": crosschecks,
        "ordered_tree_value_stream_sha256": stream.hexdigest().upper(),
    }, indent=2))
    print("SOURCE_SHA256", report["source_sha256"])
    print("REPORT_SHA256", hashlib.sha256(encoded.encode()).hexdigest().upper())
    print(MARKER)


if __name__ == "__main__":
    main()
