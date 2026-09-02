#!/usr/bin/env python3
"""Independent literal-tree audit of the cubic e=5 stable certificate.

Unlike the primary certificate, this audit does not condition on branch
vertices and does not use symbolic path products.  It builds each subdivided
tree literally, computes its independence coefficients by rooted-tree DP, and
recovers the univariate Newton rows from 29 exact values.
"""

from __future__ import annotations

import hashlib
import json
import math
import time
from dataclasses import dataclass
from pathlib import Path


ROOT = Path(__file__).resolve().parent
PRIMARY = ROOT / "rank8_delta03_e5_cubic_stable_subdivision_exact_agent_20260825.json"
OUTPUT = ROOT / "rank8_delta03_e5_cubic_stable_subdivision_independent_audit_agent_20260825.json"
EXPECTED = {
    "verify_rank8_delta03_e5_cubic_stable_subdivision_agent.py":
        "92C7CC84DE4C85B44ACB53BF6F6A3632425B738084ED019149E76C538AC800FF",
    "rank8_delta03_e5_cubic_stable_subdivision_exact_agent_20260825.json":
        "87F9BF323D5BD317F87F1755257718C5E25692435F3453C531A4DD95C52D0221",
    "verify_rank8_stable_path_offset_transfer_agent.py":
        "2EB0B6E4F073F0FC90FB023D2EC265D4C28CC58C5DF710EF45E17471085D578E",
    "rank8_stable_path_offset_transfer_exact_agent_20260822.json":
        "3F690BA0FC7CC82EBE40467016C848D53E458744BCFC1FA2CF1EB3C01B507D7D",
}
MAX_RANK = 8
SAMPLES = 29
DEGREES = (27, 27, 26, 25)


@dataclass(frozen=True)
class Shape:
    name: str
    branches: tuple[str, ...]
    spines: tuple[tuple[str, str, str], ...]
    pendants: tuple[tuple[str, str], ...]


@dataclass(frozen=True)
class RootCell:
    orbit: str
    kind: str
    target: str


PATH = Shape(
    "five_cubic_path",
    ("c", "li", "lo", "ri", "ro"),
    (("c_li", "c", "li"), ("li_lo", "li", "lo"),
     ("c_ri", "c", "ri"), ("ri_ro", "ri", "ro")),
    (("c_p", "c"), ("li_p", "li"), ("lo_p1", "lo"),
     ("lo_p2", "lo"), ("ri_p", "ri"), ("ro_p1", "ro"),
     ("ro_p2", "ro")),
)
PATH_ROOTS = (
    RootCell("center_branch", "branch", "c"),
    RootCell("near_inner_branch", "branch", "li"),
    RootCell("outer_branch", "branch", "lo"),
    RootCell("center_leaf", "leaf", "c_p"),
    RootCell("inner_leaf", "leaf", "li_p"),
    RootCell("outer_leaf", "leaf", "lo_p1"),
    RootCell("center_pendant_internal", "pendant_internal", "c_p"),
    RootCell("inner_pendant_internal", "pendant_internal", "li_p"),
    RootCell("outer_pendant_internal", "pendant_internal", "lo_p1"),
    RootCell("inner_spine_internal", "spine_internal", "c_li"),
    RootCell("outer_spine_internal", "spine_internal", "li_lo"),
)

TEE = Shape(
    "five_cubic_t",
    ("c", "sl", "sr", "m", "o"),
    (("c_sl", "c", "sl"), ("c_sr", "c", "sr"),
     ("c_m", "c", "m"), ("m_o", "m", "o")),
    (("sl_p1", "sl"), ("sl_p2", "sl"), ("sr_p1", "sr"),
     ("sr_p2", "sr"), ("m_p", "m"), ("o_p1", "o"),
     ("o_p2", "o")),
)
TEE_ROOTS = (
    RootCell("center_branch", "branch", "c"),
    RootCell("short_outer_branch", "branch", "sl"),
    RootCell("middle_branch", "branch", "m"),
    RootCell("long_outer_branch", "branch", "o"),
    RootCell("short_outer_leaf", "leaf", "sl_p1"),
    RootCell("middle_leaf", "leaf", "m_p"),
    RootCell("long_outer_leaf", "leaf", "o_p1"),
    RootCell("short_outer_pendant_internal", "pendant_internal", "sl_p1"),
    RootCell("middle_pendant_internal", "pendant_internal", "m_p"),
    RootCell("long_outer_pendant_internal", "pendant_internal", "o_p1"),
    RootCell("center_short_outer_spine_internal", "spine_internal", "c_sl"),
    RootCell("center_middle_spine_internal", "spine_internal", "c_m"),
    RootCell("middle_long_outer_spine_internal", "spine_internal", "m_o"),
)


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def multiply(left: list[int], right: list[int]) -> list[int]:
    out = [0] * (MAX_RANK + 1)
    for i, a in enumerate(left):
        for j, b in enumerate(right[: MAX_RANK + 1 - i]):
            out[i + j] += a * b
    return out


def forest_poly(adjacency: list[list[int]], removed: frozenset[int] = frozenset()):
    visited = set(removed)

    def descend(vertex: int, parent: int):
        visited.add(vertex)
        without = [1] + [0] * MAX_RANK
        with_vertex = [0, 1] + [0] * (MAX_RANK - 1)
        for child in adjacency[vertex]:
            if child == parent or child in removed:
                continue
            child_without, child_with = descend(child, vertex)
            without = multiply(
                without,
                [a + b for a, b in zip(child_without, child_with)],
            )
            with_vertex = multiply(with_vertex, child_without)
        return without, with_vertex

    answer = [1] + [0] * MAX_RANK
    for vertex in range(len(adjacency)):
        if vertex not in visited:
            without, with_vertex = descend(vertex, -1)
            answer = multiply(answer, [a + b for a, b in zip(without, with_vertex)])
    return answer


def residual(core: list[int], deleted: list[int], siblings: int) -> int:
    p7 = sum(math.comb(siblings, j) * core[7 - j] for j in range(8)) + deleted[6]
    p8 = sum(math.comb(siblings, j) * core[8 - j] for j in range(9)) + deleted[7]
    p9_open = sum(math.comb(siblings, j) * core[9 - j] for j in range(1, 10))
    return (
        8 * core[7] * deleted[6] * (16 * p8 * p8 - p7 * p8 - 18 * p7 * p9_open)
        - 8 * deleted[6] * p7 * (16 * core[8] * core[8] - core[7] * core[8])
        - 9 * core[7] * p7 * (14 * deleted[7] * deleted[7] - deleted[6] * deleted[7])
    )


def deltas(core: list[int], deleted: list[int]) -> list[int]:
    column = [residual(core, deleted, siblings) for siblings in range(1, 5)]
    result = [column[0]]
    for _ in range(3):
        column = [right - left for left, right in zip(column, column[1:])]
        result.append(column[0])
    return result


def build(shape: Shape, lengths: dict[str, int]):
    graph = [[] for _ in shape.branches]
    branch_ids = {name: index for index, name in enumerate(shape.branches)}
    routes: dict[str, list[int]] = {}

    for name, left_name, right_name in shape.spines:
        left = branch_ids[left_name]
        right = branch_ids[right_name]
        route = [left]
        cursor = left
        for _ in range(lengths[name] - 1):
            vertex = len(graph)
            graph.append([cursor])
            graph[cursor].append(vertex)
            cursor = vertex
            route.append(vertex)
        graph[cursor].append(right)
        graph[right].append(cursor)
        route.append(right)
        routes[name] = route

    for name, branch_name in shape.pendants:
        cursor = branch_ids[branch_name]
        route = [cursor]
        for _ in range(lengths[name]):
            vertex = len(graph)
            graph.append([cursor])
            graph[cursor].append(vertex)
            cursor = vertex
            route.append(vertex)
        routes[name] = route

    assert len(graph) == 1 + sum(lengths.values())
    assert sum(len(row) == 3 for row in graph) == 5
    return graph, branch_ids, routes


def instance(shape: Shape, cell: RootCell, offset: int):
    lengths = {name: 10 for name, _left, _right in shape.spines}
    lengths.update({name: 8 for name, _branch in shape.pendants})
    root_position = None
    if cell.kind == "leaf":
        lengths[cell.target] = 9
        lengths[shape.spines[0][0]] += offset
    elif cell.kind == "pendant_internal":
        near = 8 + offset
        lengths[cell.target] = near + 7 + 1
        root_position = near + 1
    elif cell.kind == "spine_internal":
        near = 8 + offset
        lengths[cell.target] = near + 8 + 2
        root_position = near + 1
    else:
        lengths[shape.spines[0][0]] += offset
    graph, branches, routes = build(shape, lengths)
    if cell.kind == "branch":
        root = branches[cell.target]
    elif cell.kind == "leaf":
        root = routes[cell.target][-1]
    else:
        assert root_position is not None
        root = routes[cell.target][root_position]
    return graph, root


def forward(values: list[int]) -> list[int]:
    row = values[:]
    out = []
    while row:
        out.append(row[0])
        row = [right - left for left, right in zip(row, row[1:])]
    return out


def coefficient_digest(rows: list[list[int]]) -> str:
    body = "".join(
        f"{rank}:" + ",".join(map(str, row)) + "\n"
        for rank, row in enumerate(rows)
    )
    return hashlib.sha256(body.encode("ascii")).hexdigest().upper()


def check_primary_stats(primary_rank: dict, coefficients: list[int], degree: int):
    active = coefficients[: degree + 1]
    increment = coefficients[1: degree + 1]
    value_stats = primary_rank["value"]
    increment_stats = primary_rank["unit_subdivision_increment"]
    assert value_stats["degree"] == degree
    assert value_stats["newton_coefficients"] == len(active)
    assert value_stats["negative_newton_coefficients"] == sum(x < 0 for x in active)
    assert value_stats["zero_newton_coefficients"] == sum(x == 0 for x in active)
    assert value_stats["base_value"] == str(active[0])
    assert value_stats["first_newton_coefficient"] == str(active[1])
    assert value_stats["minimum_newton_coefficient"] == str(min(active))
    assert increment_stats["degree"] == degree - 1
    assert increment_stats["newton_coefficients"] == len(increment)
    assert increment_stats["negative_newton_coefficients"] == sum(x < 0 for x in increment)
    assert increment_stats["zero_newton_coefficients"] == sum(x == 0 for x in increment)
    assert increment_stats["base_value"] == str(increment[0])
    assert increment_stats["first_newton_coefficient"] == str(increment[1])
    assert increment_stats["minimum_newton_coefficient"] == str(min(increment))


def main() -> None:
    started = time.perf_counter()
    actual = {name: sha256(ROOT / name) for name in EXPECTED}
    assert actual == EXPECTED
    primary = json.loads(PRIMARY.read_text(encoding="utf-8"))
    assert primary["status"] == "PASS_EXACT_RANK8_DELTA03_E5_CUBIC_STABLE_SUBDIVISION"
    primary_rows = {
        (row["skeleton"], row["root_location_orbit"]): row
        for row in primary["cells"]
    }
    audit_rows = []
    literal_evaluations = 0
    for shape, cells in ((PATH, PATH_ROOTS), (TEE, TEE_ROOTS)):
        for cell in cells:
            samples = [[] for _ in range(4)]
            for offset in range(SAMPLES):
                graph, root = instance(shape, cell, offset)
                core = forest_poly(graph)
                deleted = forest_poly(graph, frozenset({root}))
                values = deltas(core, deleted)
                for rank, value in enumerate(values):
                    samples[rank].append(value)
                literal_evaluations += 1
            coefficients = [forward(row) for row in samples]
            primary_row = primary_rows[(shape.name, cell.orbit)]
            for rank, degree in enumerate(DEGREES):
                row = coefficients[rank]
                assert all(value == 0 for value in row[degree + 1:])
                assert row[0] > 0 and row[1] > 0
                assert all(value >= 0 for value in row[: degree + 1])
                check_primary_stats(primary_row["ranks"][str(rank)], row, degree)
                predicted_last = sum(
                    math.comb(SAMPLES - 1, power) * row[power]
                    for power in range(degree + 1)
                )
                assert predicted_last == samples[rank][-1]
            audit_rows.append({
                "skeleton": shape.name,
                "root_location_orbit": cell.orbit,
                "literal_orders": [len(instance(shape, cell, offset)[0]) for offset in (0, SAMPLES - 1)],
                "newton_rows_sha256": coefficient_digest(coefficients),
                "base_values": [str(row[0]) for row in coefficients],
                "first_differences": [str(row[1]) for row in coefficients],
            })
            print("AUDIT_PASS", shape.name, cell.orbit, flush=True)

    assert len(audit_rows) == 24
    assert literal_evaluations == 24 * SAMPLES
    payload = {
        "schema": "rank8-delta03-e5-cubic-stable-subdivision-independent-audit-agent-v1",
        "status": "PASS_INDEPENDENT_LITERAL_AUDIT_RANK8_DELTA03_E5_CUBIC_STABLE_SUBDIVISION",
        "method": (
            "Literal tree construction and rooted-tree independence DP at S=0..28; no symbolic branch conditioning from the primary engine."
        ),
        "root_location_orbits": len(audit_rows),
        "literal_tree_evaluations": literal_evaluations,
        "degree_bounds_by_delta": list(DEGREES),
        "cells": audit_rows,
        "immutable_input_hashes": actual,
        "source_sha256": sha256(Path(__file__)),
        "elapsed_seconds": time.perf_counter() - started,
        "scope_guard": "Independent audit of the fully stable certificate only.",
    }
    OUTPUT.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    print(payload["status"])
    print("SOURCE", payload["source_sha256"])
    print("REPORT", sha256(OUTPUT))
    print("ELAPSED", f"{payload['elapsed_seconds']:.3f}")


if __name__ == "__main__":
    main()
