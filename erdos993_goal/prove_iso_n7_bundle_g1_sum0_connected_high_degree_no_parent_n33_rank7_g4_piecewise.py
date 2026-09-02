#!/usr/bin/env python3
"""Exact actual-topology closure of connected high-degree G1 at order 33.

This is the next-order application of the frozen P4-threshold batch method.
All above-threshold weighted cores are analytic.  The exact below-threshold
tail is evaluated in core-local integer batches; the SHA stream contains the
raw arrays of every ordered assignment, exact P4, polynomial, and G1 value.
"""

from __future__ import annotations

import collections
import functools
import hashlib
import json
import math
from pathlib import Path

import networkx as nx
import numba
import numpy as np
from numba import njit

import probe_iso_n7_bundle_g1_sum0_connected_high_degree_j4e5_profiles_rank7_g4_piecewise as cone
from prove_iso_n7_bundle_g1_sum0_connected_high_degree_no_parent_n34_36_batch_rank7_g4_piecewise import (
    accelerated_literal_g1,
    bundled_independence_polynomial,
    capacity_floor,
    controls_at,
    exact_p4,
    fraction_record,
    g1,
    rooted_core_arrays,
    threshold_certificate,
)


HERE = Path(__file__).resolve().parent
OUTPUT = HERE / (
    "iso_n7_bundle_g1_sum0_connected_high_degree_no_parent_n33_"
    "exact_rank7_g4_piecewise_20260831.json"
)
MARKER = (
    "PASS_EXACT_ISO_N7_BUNDLE_G1_SUM0_CONNECTED_HIGH_DEGREE_NO_PARENT_"
    "N33_RANK7_G4_PIECEWISE"
)
ORDER = 33
DEPENDENCIES = {
    "prove_iso_n7_bundle_g1_sum0_connected_high_degree_no_parent_n34_36_batch_rank7_g4_piecewise.py":
        "E7977003DAFE9707C913F5C05976F90EFB82FF4C52A09172D9287C0C86D91B1A",
    "iso_n7_bundle_g1_sum0_connected_high_degree_no_parent_n34_36_batch_exact_rank7_g4_piecewise_20260831.json":
        "56669CA72F57CC0BA85F53584BBD2CAE7EE9862E94C3B787F050519FC45A98E0",
}
ACCELERATOR_VERSIONS = {"numba": "0.63.1", "numpy": "2.3.5"}
EXPECTED = {
    "total_profiles": 6588,
    "profile_analytic": 2804,
    "profile_residual": 3784,
    "compatible_assignments": 4178179371,
    "literal_assignments": 20305507,
    "core_orders": tuple(range(4, 17)),
    "accelerator_crosschecks": 310,
    "literal_minimum": (
        452599977472,
        (7, 7, 7, 7, 1, 1, 1),
        0,
        (1, 7, 1, 7, 7, 1, 7),
        42,
        92,
        (1, 33, 496, 4579, 29605, 144717, 561674, 1787803, 4771476),
    ),
}
EXPECTED_PROFILE_STREAM = (
    "05C7FAF72D9574035F1AF71FB4EB26D58CC60C14C505B72847078BA3DAE2AFA6"
)
EXPECTED_TOPOLOGY_STREAM = (
    "776E671C95896F01DBF477D3FF39F2B06D7D03664DB2CEC07E05991CC4152FBD"
)


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


@functools.lru_cache(None)
def compatible_count(
    parts: tuple[int, ...], degree_multiset: tuple[int, ...]
) -> int:
    values = tuple(sorted(collections.Counter(parts), reverse=True))
    initial = tuple(parts.count(value) for value in values)
    required = tuple(value - 1 for value in degree_multiset)

    @functools.lru_cache(None)
    def visit(index: int, counts: tuple[int, ...]) -> int:
        if index == len(required):
            return 1
        answer = 0
        for slot, value in enumerate(values):
            if counts[slot] == 0 or value < required[index]:
                continue
            reduced = list(counts)
            reduced[slot] -= 1
            answer += visit(index + 1, tuple(reduced))
        return answer

    return visit(0, initial)


def low_ordered_assignments(
    degree: np.ndarray,
    parent: np.ndarray,
    parts: tuple[int, ...],
    threshold: int,
):
    """Generate every compatible BFS-ordered assignment with exact P4<P4*."""
    values = tuple(sorted(collections.Counter(parts), reverse=True))
    counts = {value: parts.count(value) for value in values}
    assignment = [0] * len(parts)
    base = ORDER - 3

    def visit(index: int, accumulated: int):
        if index == len(parts):
            yield tuple(assignment), base + accumulated
            return
        required = int(degree[index]) - 1
        for value in values:
            if counts[value] == 0 or value < required:
                continue
            increment = required * (value - 1)
            if parent[index] >= 0:
                increment += (
                    (value - 1) * (assignment[int(parent[index])] - 1)
                )
            if base + accumulated + increment >= threshold:
                continue
            counts[value] -= 1
            assignment[index] = value
            yield from visit(index + 1, accumulated + increment)
            counts[value] += 1

    yield from visit(0, 0)


@njit(cache=True)
def accelerated_batch(parent, degree, assignments):
    count = assignments.shape[0]
    values = np.empty(count, dtype=np.int64)
    polynomials = np.empty((count, 9), dtype=np.int64)
    for index in range(count):
        value, polynomial = accelerated_literal_g1(
            parent, degree, assignments[index]
        )
        values[index] = value
        polynomials[index] = polynomial
    return values, polynomials


def main() -> None:
    for name, digest in DEPENDENCIES.items():
        assert sha256(HERE / name) == digest, name
    assert numba.__version__ == ACCELERATOR_VERSIONS["numba"]
    assert np.__version__ == ACCELERATOR_VERSIONS["numpy"]
    inherited = json.loads(
        (HERE / "iso_n7_bundle_g1_sum0_connected_high_degree_no_parent_n34_36_batch_exact_rank7_g4_piecewise_20260831.json")
        .read_text(encoding="utf-8")
    )
    assert inherited["status"] == "proved exact"
    assert inherited["coverage_gap_within_stated_actual_n34_36_scope"] is None

    profile_stream = hashlib.sha256()
    topology_stream = hashlib.sha256()
    total_profiles = 0
    profile_analytic = 0
    controls_checked = 0
    derivative_controls_checked = 0
    residual = []
    thresholds = {}

    for raw_parts in cone.partitions(ORDER - 2):
        parts = tuple(raw_parts)
        if parts[0] < 3 or sum(value >= 2 for value in parts) < 3:
            continue
        floor = capacity_floor(parts)
        at_floor = controls_at(ORDER, parts, floor)
        total_profiles += 1
        controls_checked += 9
        if at_floor[0] >= 0:
            profile_analytic += 1
            profile_stream.update(
                f"A|{parts}|{floor}|{at_floor[2]}\n".encode("ascii")
            )
            continue
        threshold, upper, quadratic_data, floor_controls = (
            threshold_certificate(ORDER, parts, floor)
        )
        residual.append(parts)
        thresholds[parts] = threshold
        derivative_controls_checked += 9
        profile_stream.update(
            (
                f"R|{parts}|{floor}|{threshold}|{upper}|{floor_controls}|"
                f"{tuple(tuple(fraction_record(item) for item in row) for row in quadratic_data)}\n"
            ).encode("ascii")
        )

    core_orders = sorted({len(parts) for parts in residual})
    cores = {
        core_order: tuple(nx.nonisomorphic_trees(core_order))
        for core_order in core_orders
    }
    compatible_assignments = 0
    literal_assignments = 0
    literal_negative = 0
    literal_minimum = None
    accelerator_crosschecks = 0

    for profile_index, parts in enumerate(residual):
        threshold = thresholds[parts]
        for tree_index, core in enumerate(cores[len(parts)]):
            vertices, parent, degree = rooted_core_arrays(core)
            degree_multiset = tuple(sorted((int(item) for item in degree), reverse=True))
            raw_count = compatible_count(parts, degree_multiset)
            compatible_assignments += raw_count
            generated = list(
                low_ordered_assignments(degree, parent, parts, threshold)
            )
            count = len(generated)
            header = (
                ORDER,
                profile_index,
                parts,
                tree_index,
                vertices,
                threshold,
                raw_count,
                count,
            )
            topology_stream.update((repr(header) + "\n").encode("ascii"))
            if count == 0:
                continue
            ordered_assignments = np.asarray(
                [item[0] for item in generated], dtype=np.int64
            )
            p4_values = np.asarray(
                [item[1] for item in generated], dtype=np.int64
            )
            values, polynomials = accelerated_batch(
                parent, degree, ordered_assignments
            )
            assert np.all(p4_values < threshold)
            assert np.all(polynomials[:, 0] == 1)
            assert np.all(polynomials[:, 1] == ORDER)
            assert np.all(polynomials[:, 2] == math.comb(ORDER - 1, 2))
            expected_w3 = (
                math.comb(ORDER, 3)
                - (ORDER - 1) * (ORDER - 2)
                + sum(math.comb(item + 1, 2) for item in parts)
            )
            assert np.all(polynomials[:, 3] == expected_w3)
            topology_stream.update(ordered_assignments.tobytes(order="C"))
            topology_stream.update(p4_values.tobytes(order="C"))
            topology_stream.update(polynomials.tobytes(order="C"))
            topology_stream.update(values.tobytes(order="C"))

            negative = int(np.count_nonzero(values < 0))
            literal_negative += negative
            local_index = int(np.argmin(values))
            ordered_assignment = tuple(
                int(item) for item in ordered_assignments[local_index]
            )
            labeled_assignment = [0] * len(parts)
            for position, vertex in enumerate(vertices):
                labeled_assignment[vertex] = ordered_assignment[position]
            candidate = (
                int(values[local_index]),
                parts,
                tree_index,
                tuple(labeled_assignment),
                int(p4_values[local_index]),
                threshold,
                tuple(int(item) for item in polynomials[local_index]),
            )
            literal_minimum = (
                candidate
                if literal_minimum is None
                else min(literal_minimum, candidate)
            )

            first_global = literal_assignments
            last_global = literal_assignments + count - 1
            audit_global = ((first_global + 65535) // 65536) * 65536
            while audit_global <= last_global:
                audit_index = audit_global - first_global
                ordered_audit = tuple(
                    int(item) for item in ordered_assignments[audit_index]
                )
                labeled_audit = [0] * len(parts)
                for position, vertex in enumerate(vertices):
                    labeled_audit[vertex] = ordered_audit[position]
                slow_polynomial = bundled_independence_polynomial(
                    core, tuple(labeled_audit)
                )
                assert slow_polynomial == tuple(
                    int(item) for item in polynomials[audit_index]
                )
                assert g1(slow_polynomial) == int(values[audit_index])
                assert exact_p4(ORDER, core, tuple(labeled_audit)) == int(
                    p4_values[audit_index]
                )
                accelerator_crosschecks += 1
                audit_global += 65536
            literal_assignments += count

        if (profile_index + 1) % 300 == 0:
            print(
                "PROFILE",
                profile_index + 1,
                "OF",
                len(residual),
                "COMPATIBLE",
                compatible_assignments,
                "LITERAL",
                literal_assignments,
                flush=True,
            )

    assert total_profiles == EXPECTED["total_profiles"]
    assert profile_analytic == EXPECTED["profile_analytic"]
    assert len(residual) == EXPECTED["profile_residual"]
    assert compatible_assignments == EXPECTED["compatible_assignments"]
    assert literal_assignments == EXPECTED["literal_assignments"]
    assert tuple(core_orders) == EXPECTED["core_orders"]
    assert accelerator_crosschecks == EXPECTED["accelerator_crosschecks"]
    assert literal_negative == 0
    assert literal_minimum == EXPECTED["literal_minimum"]
    exact_p4_analytic = compatible_assignments - literal_assignments
    assert exact_p4_analytic >= 0
    assert profile_stream.hexdigest().upper() == EXPECTED_PROFILE_STREAM
    assert topology_stream.hexdigest().upper() == EXPECTED_TOPOLOGY_STREAM

    report = {
        "marker": MARKER,
        "status": "proved exact",
        "theorem": (
            "For every connected 33-vertex tree W with maximum degree at "
            "least four and at least three branching vertices, the exact "
            "rank-seven common0/sum0 no-parent coefficient G1 is nonnegative."
        ),
        "gapless_split": {
            "profile_floor_analytic": profile_analytic,
            "profile_residual": len(residual),
            "residual_compatible_assignments": compatible_assignments,
            "exact_P4_threshold_analytic_assignments": exact_p4_analytic,
            "literal_low_P4_assignments": literal_assignments,
            "literal_method": (
                "Every compatible nonleaf core below its exact monotone-P4 "
                "threshold, evaluated by exact bundled-leaf recurrence."
            ),
            "coverage_gap": None,
        },
        "certificate": {
            "total_profiles": total_profiles,
            "controls_checked": controls_checked,
            "derivative_controls_checked": derivative_controls_checked,
            "core_orders": core_orders,
            "literal_negative": literal_negative,
            "literal_minimum_G1": str(literal_minimum[0]),
            "literal_minimum_profile": list(literal_minimum[1]),
            "literal_minimum_core_index": literal_minimum[2],
            "literal_minimum_assignment": list(literal_minimum[3]),
            "literal_minimum_P4": literal_minimum[4],
            "literal_minimum_threshold": literal_minimum[5],
            "literal_minimum_independence_rows_0_8": list(literal_minimum[6]),
            "accelerator_crosschecks": accelerator_crosschecks,
            "profile_stream_sha256": profile_stream.hexdigest().upper(),
            "topology_stream_sha256": topology_stream.hexdigest().upper(),
        },
        "coverage_gap_within_stated_actual_n33_scope": None,
        "scope": (
            "Actual connected-tree G1 at unmarked order exactly 33, "
            "common0/sum0 no-parent, maximum degree>=4, and at least three "
            "branching vertices. Other orders and modes remain separate."
        ),
        "accelerator_versions": ACCELERATOR_VERSIONS,
        "dependencies_sha256": DEPENDENCIES,
        "source_sha256": sha256(Path(__file__)),
    }
    encoded = json.dumps(report, indent=2, sort_keys=True) + "\n"
    OUTPUT.write_text(encoded, encoding="utf-8", newline="\n")
    print(json.dumps({
        "marker": MARKER,
        "compatible_assignments": compatible_assignments,
        "literal_assignments": literal_assignments,
        "literal_negative": literal_negative,
        "literal_minimum_G1": str(literal_minimum[0]),
        "accelerator_crosschecks": accelerator_crosschecks,
        "profile_stream_sha256": profile_stream.hexdigest().upper(),
        "topology_stream_sha256": topology_stream.hexdigest().upper(),
        "coverage_gap_within_stated_actual_n33_scope": None,
    }, indent=2, sort_keys=True))
    print("SOURCE_SHA256", report["source_sha256"])
    print("REPORT_SHA256", hashlib.sha256(encoded.encode()).hexdigest().upper())
    print(MARKER)


if __name__ == "__main__":
    main()
