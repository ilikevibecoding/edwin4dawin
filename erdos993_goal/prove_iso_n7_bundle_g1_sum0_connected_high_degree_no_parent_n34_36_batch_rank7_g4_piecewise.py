#!/usr/bin/env python3
"""Exact batch closure of connected high-degree G1 at orders 34 through 36.

For every degree-excess profile, first use the pinned strengthened P4 cone.
For a profile that is still loose at the universal capacity floor, every one
of the nine Bernstein controls is an exactly monotone quadratic in the actual
four-vertex path count P4.  This gives an exact integer threshold P4*.  The
nonleaf-core identity

    P4 = m-3 + sum_v (d_K(v)-1)(x_v-1)
             + sum_{uv in E(K)} (x_u-1)(x_v-1)

then splits every compatible weighted core: P4>=P4* is analytic, while the
strictly smaller side is generated gaplessly by a nonnegative-cost recursive
branch and evaluated with the literal independence polynomial.  Thus the
certificate avoids enumerating the enormous analytic side of the residual
profile families.
"""

from __future__ import annotations

import collections
import functools
import hashlib
import json
import math
from fractions import Fraction
from pathlib import Path

import networkx as nx
import numba
import numpy as np
from numba import njit

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
    "iso_n7_bundle_g1_sum0_connected_high_degree_no_parent_n34_36_batch_"
    "exact_rank7_g4_piecewise_20260831.json"
)
MARKER = (
    "PASS_EXACT_ISO_N7_BUNDLE_G1_SUM0_CONNECTED_HIGH_DEGREE_NO_PARENT_"
    "N34_36_BATCH_RANK7_G4_PIECEWISE"
)
ORDERS = (34, 35, 36)
ACCELERATOR_VERSIONS = {"numba": "0.63.1", "numpy": "2.3.5"}
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
    "prove_iso_n7_bundle_g1_sum0_connected_high_degree_no_parent_n38_rank7_g4_piecewise.py":
        "DC16C099386992B8623A88E79DE5861E3157473FBCCE818CEBBF8E6252387541",
    "iso_n7_bundle_g1_sum0_connected_high_degree_no_parent_n38_exact_rank7_g4_piecewise_20260831.json":
        "0DB0368D88001EBAA801611F5E5AD7A0021DF5C20C1FAD48A5F764C92A2174EF",
}
EXPECTED = {
    34: {
        "total_profiles": 8078,
        "profile_analytic": 4911,
        "profile_residual": 3167,
        "compatible_assignments": 1213147037,
        "literal_assignments": 3169579,
        "core_orders": tuple(range(4, 15)),
        "accelerator_crosschecks": 49,
        "literal_minimum": (
            628613428953,
            (8, 7, 7, 7, 1, 1, 1),
            7,
            (8, 1, 7, 1, 7, 1, 7),
            45,
            86,
            (1, 34, 528, 5051, 33929, 172698, 699257, 2326035, 6498924),
        ),
    },
    35: {
        "total_profiles": 9856,
        "profile_analytic": 7788,
        "profile_residual": 2068,
        "compatible_assignments": 194135300,
        "literal_assignments": 388207,
        "core_orders": tuple(range(4, 13)),
        "accelerator_crosschecks": 6,
        "literal_minimum": (
            863792163616,
            (8, 8, 7, 7, 1, 1, 1),
            0,
            (1, 8, 1, 7, 8, 1, 7),
            46,
            79,
            (1, 35, 561, 5554, 38704, 204792, 863485, 2995850, 8744235),
        ),
    },
    36: {
        "total_profiles": 12005,
        "profile_analytic": 11100,
        "profile_residual": 905,
        "compatible_assignments": 22910877,
        "literal_assignments": 37904,
        "core_orders": tuple(range(4, 12)),
        "accelerator_crosschecks": 1,
        "literal_minimum": (
            1174758962680,
            (8, 8, 8, 7, 1, 1, 1),
            0,
            (1, 8, 1, 7, 8, 1, 8),
            47,
            70,
            (1, 36, 595, 6089, 43958, 241402, 1058085, 3821850, 11631025),
        ),
    },
}
EXPECTED_PROFILE_STREAM = (
    "6DDF3441D3AEA320654812EBD21EAEB85D2BDFB44423D815CE9C39E8CCAA6025"
)
EXPECTED_TOPOLOGY_STREAM = (
    "DF458C904FBF1F5AC780BBCB8A5FB0D4073E053D71BE1E13B7E06966B7991D48"
)


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def controls_at(order: int, parts: tuple[int, ...], p4: int):
    cone.p4_floor = lambda _order, _parts: p4
    return cone.relaxed(order, parts)


def threshold_certificate(order: int, parts: tuple[int, ...], floor: int):
    """Return the first integral P4 with all controls nonnegative.

    Exact endpoint derivatives certify monotonicity of every quadratic control
    throughout the full feasible interval floor<=P4<=disjoint_edge_pairs.
    """
    at0 = controls_at(order, parts, floor)
    span = at0[4]
    assert span >= 2
    at1 = controls_at(order, parts, floor + 1)
    at2 = controls_at(order, parts, floor + 2)
    quadratic_data = []
    for y0, y1, y2 in zip(at0[2], at1[2], at2[2]):
        quadratic = (y2 - 2*y1 + y0) / 2
        linear = y1 - y0 - quadratic
        derivative_left = linear
        derivative_right = linear + 2*quadratic*span
        assert derivative_left >= 0
        assert derivative_right >= 0
        quadratic_data.append(
            (quadratic, linear, derivative_left, derivative_right)
        )

    upper = floor + span
    assert controls_at(order, parts, upper)[0] >= 0
    left, right = floor, upper
    while left < right:
        middle = (left + right) // 2
        if controls_at(order, parts, middle)[0] >= 0:
            right = middle
        else:
            left = middle + 1
    threshold = left
    assert threshold > floor
    assert controls_at(order, parts, threshold)[0] >= 0
    assert controls_at(order, parts, threshold - 1)[0] < 0
    return threshold, upper, tuple(quadratic_data), at0[2]


def exact_p4(order: int, core: nx.Graph, assignment: tuple[int, ...]) -> int:
    return (
        order - 3
        + sum(
            (core.degree(vertex) - 1) * (assignment[vertex] - 1)
            for vertex in core
        )
        + sum(
            (assignment[left] - 1) * (assignment[right] - 1)
            for left, right in core.edges()
        )
    )


def compatible_assignment_count(core: nx.Graph, parts: tuple[int, ...]) -> int:
    """Count all distinct labeled assignments satisfying x_v>=d_K(v)-1."""
    values = tuple(sorted(collections.Counter(parts), reverse=True))
    initial = tuple(parts.count(value) for value in values)
    vertices = tuple(
        sorted(core, key=lambda vertex: (-core.degree(vertex), vertex))
    )

    @functools.lru_cache(None)
    def visit(index: int, counts: tuple[int, ...]) -> int:
        if index == len(vertices):
            return 1
        vertex = vertices[index]
        required = core.degree(vertex) - 1
        answer = 0
        for slot, value in enumerate(values):
            if counts[slot] == 0 or value < required:
                continue
            reduced = list(counts)
            reduced[slot] -= 1
            answer += visit(index + 1, tuple(reduced))
        return answer

    return visit(0, initial)


def bfs_order(core: nx.Graph) -> tuple[int, ...]:
    degree = dict(core.degree())
    root = max(core, key=lambda vertex: (degree[vertex], -vertex))
    order = []
    queue = collections.deque([root])
    seen = {root}
    while queue:
        vertex = queue.popleft()
        order.append(vertex)
        for neighbor in sorted(core[vertex]):
            if neighbor not in seen:
                seen.add(neighbor)
                queue.append(neighbor)
    assert len(order) == len(core)
    return tuple(order)


def low_p4_assignments(
    order: int,
    core: nx.Graph,
    parts: tuple[int, ...],
    threshold: int,
):
    """Generate exactly the compatible assignments with P4<threshold."""
    values = tuple(sorted(collections.Counter(parts), reverse=True))
    counts = {value: parts.count(value) for value in values}
    assignment = [None] * len(parts)
    vertices = bfs_order(core)
    base = order - 3

    def visit(index: int, accumulated: int):
        if index == len(vertices):
            result = tuple(assignment)
            assert exact_p4(order, core, result) == base + accumulated
            assert base + accumulated < threshold
            yield result
            return
        vertex = vertices[index]
        required = core.degree(vertex) - 1
        for value in values:
            if counts[value] == 0 or value < required:
                continue
            increment = (core.degree(vertex) - 1) * (value - 1)
            increment += sum(
                (value - 1) * (assignment[neighbor] - 1)
                for neighbor in core[vertex]
                if assignment[neighbor] is not None
            )
            # All omitted vertex and edge costs are nonnegative.
            if base + accumulated + increment >= threshold:
                continue
            counts[value] -= 1
            assignment[vertex] = value
            yield from visit(index + 1, accumulated + increment)
            assignment[vertex] = None
            counts[value] += 1

    yield from visit(0, 0)


def bundled_independence_polynomial(
    core: nx.Graph, assignment: tuple[int, ...]
) -> tuple[int, ...]:
    """Compute exact I(W) through row eight without materializing leaves."""
    one = (1,) + (0,) * 8

    def rooted(vertex: int, parent: int | None):
        leaves = assignment[vertex] + 1 - core.degree(vertex)
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
        included = (0,) + included_product[:-1]
        return excluded, included

    excluded, included = rooted(0, None)
    return polynomial_add(excluded, included)


@njit(cache=True)
def int64_polynomial_multiply(left, right):
    result = np.zeros(9, dtype=np.int64)
    for first_rank in range(9):
        if left[first_rank] == 0:
            continue
        for second_rank in range(9 - first_rank):
            result[first_rank + second_rank] += (
                left[first_rank] * right[second_rank]
            )
    return result


@njit(cache=True)
def accelerated_literal_g1(parent, degree, assignment):
    """The same exact rooted recurrence, evaluated with signed int64 rows."""
    core_order = len(assignment)
    excluded = np.zeros((core_order, 9), dtype=np.int64)
    included = np.zeros((core_order, 9), dtype=np.int64)
    for vertex in range(core_order - 1, -1, -1):
        leaves = assignment[vertex] + 1 - degree[vertex]
        excluded[vertex, 0] = 1
        for rank in range(1, 9):
            if rank <= leaves:
                excluded[vertex, rank] = (
                    excluded[vertex, rank - 1] * (leaves - rank + 1) // rank
                )
        included_product = np.zeros(9, dtype=np.int64)
        included_product[0] = 1
        for child in range(vertex + 1, core_order):
            if parent[child] == vertex:
                excluded[vertex] = int64_polynomial_multiply(
                    excluded[vertex], excluded[child] + included[child]
                )
                included_product = int64_polynomial_multiply(
                    included_product, excluded[child]
                )
        for rank in range(1, 9):
            included[vertex, rank] = included_product[rank - 1]
    polynomial = excluded[0] + included[0]
    w3, w4, w5, w6, w7, w8 = polynomial[3:9]
    value = (
        8*w3*w3 + 24*w3*w4 - 64*w3*w5 - 106*w3*w6
        - 51*w3*w7 - 8*w3*w8 + 80*w4*w4 + 90*w4*w5
        - 12*w4*w6 - 10*w4*w7 + 39*w5*w5 + 10*w5*w6
    )
    return value, polynomial


def rooted_core_arrays(core: nx.Graph):
    vertices = bfs_order(core)
    position = {vertex: index for index, vertex in enumerate(vertices)}
    parent = [-1] * len(vertices)
    for index, vertex in enumerate(vertices[1:], start=1):
        earlier = [
            position[neighbor]
            for neighbor in core[vertex]
            if position[neighbor] < index
        ]
        assert len(earlier) == 1
        parent[index] = earlier[0]
    degree = [core.degree(vertex) for vertex in vertices]
    return (
        vertices,
        np.asarray(parent, dtype=np.int64),
        np.asarray(degree, dtype=np.int64),
    )


def fraction_record(value: Fraction) -> tuple[int, int]:
    return value.numerator, value.denominator


def main() -> None:
    for name, digest in DEPENDENCIES.items():
        assert sha256(HERE / name) == digest, name
    assert numba.__version__ == ACCELERATOR_VERSIONS["numba"]
    assert np.__version__ == ACCELERATOR_VERSIONS["numpy"]

    profile_stream = hashlib.sha256()
    topology_stream = hashlib.sha256()
    order_reports = {}

    for order in ORDERS:
        total_profiles = 0
        profile_analytic = 0
        residual = []
        thresholds = {}
        controls_checked = 0
        derivative_controls_checked = 0

        for raw_parts in cone.partitions(order - 2):
            parts = tuple(raw_parts)
            if parts[0] < 3 or sum(value >= 2 for value in parts) < 3:
                continue
            floor = capacity_floor(parts)
            at_floor = controls_at(order, parts, floor)
            total_profiles += 1
            controls_checked += len(at_floor[2])
            if at_floor[0] >= 0:
                profile_analytic += 1
                profile_stream.update(
                    f"A|{order}|{parts}|{floor}|{at_floor[2]}\n".encode("ascii")
                )
                continue
            threshold, upper, quadratic_data, floor_controls = (
                threshold_certificate(order, parts, floor)
            )
            thresholds[parts] = threshold
            residual.append(parts)
            derivative_controls_checked += len(quadratic_data)
            profile_stream.update(
                (
                    f"R|{order}|{parts}|{floor}|{threshold}|{upper}|"
                    f"{floor_controls}|"
                    f"{tuple(tuple(fraction_record(item) for item in row) for row in quadratic_data)}\n"
                ).encode("ascii")
            )

        compatible_assignments = 0
        literal_assignments = 0
        literal_negative = 0
        literal_minimum = None
        core_orders = set()
        accelerator_crosschecks = 0

        for profile_index, parts in enumerate(residual):
            core_order = len(parts)
            core_orders.add(core_order)
            threshold = thresholds[parts]
            for tree_index, core in enumerate(nx.nonisomorphic_trees(core_order)):
                assert set(core) == set(range(core_order))
                compatible_assignments += compatible_assignment_count(core, parts)
                vertices, parent, degree = rooted_core_arrays(core)
                for assignment in low_p4_assignments(
                    order, core, parts, threshold
                ):
                    p4 = exact_p4(order, core, assignment)
                    ordered_assignment = np.asarray(
                        [assignment[vertex] for vertex in vertices],
                        dtype=np.int64,
                    )
                    fast_value, fast_polynomial = accelerated_literal_g1(
                        parent, degree, ordered_assignment
                    )
                    value = int(fast_value)
                    polynomial = tuple(int(item) for item in fast_polynomial)
                    assert polynomial[0] == 1
                    assert polynomial[1] == order
                    assert polynomial[2] == math.comb(order - 1, 2)
                    assert polynomial[3] == (
                        math.comb(order, 3)
                        - (order - 1) * (order - 2)
                        + sum(math.comb(item + 1, 2) for item in parts)
                    )
                    # A sparse deterministic audit also replays the recurrence
                    # through the separate arbitrary-precision Python path.
                    if literal_assignments % 65536 == 0:
                        slow_polynomial = bundled_independence_polynomial(
                            core, assignment
                        )
                        assert polynomial == slow_polynomial
                        assert value == g1(slow_polynomial)
                        accelerator_crosschecks += 1
                    record = (
                        order,
                        parts,
                        profile_index,
                        tree_index,
                        assignment,
                        p4,
                        threshold,
                        polynomial,
                        value,
                    )
                    topology_stream.update((repr(record) + "\n").encode("ascii"))
                    literal_assignments += 1
                    literal_negative += value < 0
                    candidate = (
                        value,
                        parts,
                        tree_index,
                        assignment,
                        p4,
                        threshold,
                        polynomial,
                    )
                    literal_minimum = (
                        candidate
                        if literal_minimum is None
                        else min(literal_minimum, candidate)
                    )

        expected = EXPECTED[order]
        assert total_profiles == expected["total_profiles"]
        assert profile_analytic == expected["profile_analytic"]
        assert len(residual) == expected["profile_residual"]
        assert compatible_assignments == expected["compatible_assignments"]
        assert literal_assignments == expected["literal_assignments"]
        assert tuple(sorted(core_orders)) == expected["core_orders"]
        assert accelerator_crosschecks == expected["accelerator_crosschecks"]
        assert literal_negative == 0
        assert literal_minimum == expected["literal_minimum"]
        exact_p4_analytic = compatible_assignments - literal_assignments
        assert exact_p4_analytic >= 0

        order_reports[str(order)] = {
            "total_profiles": total_profiles,
            "profile_analytic": profile_analytic,
            "profile_residual": len(residual),
            "controls_checked": controls_checked,
            "derivative_controls_checked": derivative_controls_checked,
            "residual_core_orders": sorted(core_orders),
            "residual_compatible_assignments": compatible_assignments,
            "exact_p4_threshold_analytic_assignments": exact_p4_analytic,
            "literal_low_p4_assignments": literal_assignments,
            "literal_negative": literal_negative,
            "accelerator_crosschecks": accelerator_crosschecks,
            "literal_minimum_G1": str(literal_minimum[0]),
            "literal_minimum_profile": list(literal_minimum[1]),
            "literal_minimum_core_index": literal_minimum[2],
            "literal_minimum_assignment": list(literal_minimum[3]),
            "literal_minimum_P4": literal_minimum[4],
            "literal_minimum_threshold": literal_minimum[5],
            "literal_minimum_independence_rows_0_8": list(literal_minimum[6]),
        }
        print(
            order,
            "PROFILES",
            total_profiles,
            "RESIDUAL",
            len(residual),
            "COMPATIBLE",
            compatible_assignments,
            "LITERAL",
            literal_assignments,
            "MIN",
            literal_minimum[0],
            flush=True,
        )

    assert profile_stream.hexdigest().upper() == EXPECTED_PROFILE_STREAM
    assert topology_stream.hexdigest().upper() == EXPECTED_TOPOLOGY_STREAM

    report = {
        "marker": MARKER,
        "status": "proved exact",
        "theorem": (
            "For every connected tree W of order 34, 35, or 36 with maximum "
            "degree at least four and at least three branching vertices, the "
            "exact rank-seven common0/sum0 no-parent coefficient G1 is "
            "nonnegative."
        ),
        "gapless_batch_split": {
            "profile_floor": (
                "Profiles with nine nonnegative controls at the pinned exact "
                "capacity floor are promoted by the frozen support cone."
            ),
            "exact_P4_threshold": (
                "For each residual profile, exact endpoint derivatives prove "
                "all nine controls monotone in P4; every compatible weighted "
                "core at or above the first integral nonnegative threshold is "
                "therefore analytic."
            ),
            "literal_tail": (
                "The exact nonleaf-core P4 identity has nonnegative summands, "
                "so recursive cost pruning enumerates every and only weighted "
                "core below threshold; its exact bundled independence "
                "polynomial is evaluated literally."
            ),
            "coverage_gap": None,
        },
        "orders": order_reports,
        "profile_stream_sha256": profile_stream.hexdigest().upper(),
        "topology_stream_sha256": topology_stream.hexdigest().upper(),
        "coverage_gap_within_stated_actual_n34_36_scope": None,
        "scope": (
            "Actual connected-tree G1 at unmarked orders 34 through 36, "
            "common0/sum0 no-parent, maximum degree>=4, and at least three "
            "branching vertices. Other orders and parent/marked modes remain "
            "separate."
        ),
        "dependencies_sha256": DEPENDENCIES,
        "accelerator_versions": ACCELERATOR_VERSIONS,
        "source_sha256": sha256(Path(__file__)),
    }
    encoded = json.dumps(report, indent=2, sort_keys=True) + "\n"
    OUTPUT.write_text(encoded, encoding="utf-8", newline="\n")
    print(json.dumps({
        "marker": MARKER,
        "orders": order_reports,
        "profile_stream_sha256": report["profile_stream_sha256"],
        "topology_stream_sha256": report["topology_stream_sha256"],
        "coverage_gap_within_stated_actual_n34_36_scope": None,
    }, indent=2, sort_keys=True))
    print("SOURCE_SHA256", report["source_sha256"])
    print("REPORT_SHA256", hashlib.sha256(encoded.encode()).hexdigest().upper())
    print(MARKER)


if __name__ == "__main__":
    main()
