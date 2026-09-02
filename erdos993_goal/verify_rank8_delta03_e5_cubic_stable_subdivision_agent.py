#!/usr/bin/env python3
"""Exact stable-cell subdivision certificate for the two cubic e=5 trees.

Condition on the five degree-three vertices.  Every remaining component is a
path, so the rank-eight independence data are exact products of path factors.
When every such path factor has order at least seven, the sealed path-transfer
identity moves all length offsets into one variable S.  Thus any eligible unit
subdivision is S -> S+1.  This script checks all 24 root-location orbits on the
five-cubic path and five-cubic T skeletons, for Delta_0 through Delta_3.

The certificate is deliberately limited to fully stable cells.  Mixed and
all-short boundary cells require separate finite certificates.
"""

from __future__ import annotations

import hashlib
import json
import math
import time
from dataclasses import dataclass
from pathlib import Path

from flint import fmpq, fmpq_poly


ROOT = Path(__file__).resolve().parent
OUTPUT = ROOT / "rank8_delta03_e5_cubic_stable_subdivision_exact_agent_20260825.json"
EXPECTED = {
    "verify_rank8_stable_path_offset_transfer_agent.py":
        "2EB0B6E4F073F0FC90FB023D2EC265D4C28CC58C5DF710EF45E17471085D578E",
    "rank8_stable_path_offset_transfer_exact_agent_20260822.json":
        "3F690BA0FC7CC82EBE40467016C848D53E458744BCFC1FA2CF1EB3C01B507D7D",
}
MAX_RANK = 8
RANKS = range(4)
X = fmpq_poly([0, 1])
ZERO = fmpq_poly([0])
ONE = fmpq_poly([1])


@dataclass(frozen=True)
class Skeleton:
    name: str
    branches: tuple[str, ...]
    spines: tuple[tuple[str, str, str], ...]
    pendants: tuple[tuple[str, str], ...]


@dataclass(frozen=True)
class Cell:
    orbit: str
    kind: str
    target: str


FIVE_CUBIC_PATH = Skeleton(
    "five_cubic_path",
    ("c", "li", "lo", "ri", "ro"),
    (
        ("c_li", "c", "li"),
        ("li_lo", "li", "lo"),
        ("c_ri", "c", "ri"),
        ("ri_ro", "ri", "ro"),
    ),
    (
        ("c_p", "c"),
        ("li_p", "li"),
        ("lo_p1", "lo"),
        ("lo_p2", "lo"),
        ("ri_p", "ri"),
        ("ro_p1", "ro"),
        ("ro_p2", "ro"),
    ),
)
PATH_CELLS = (
    Cell("center_branch", "branch", "c"),
    Cell("near_inner_branch", "branch", "li"),
    Cell("outer_branch", "branch", "lo"),
    Cell("center_leaf", "leaf", "c_p"),
    Cell("inner_leaf", "leaf", "li_p"),
    Cell("outer_leaf", "leaf", "lo_p1"),
    Cell("center_pendant_internal", "pendant_internal", "c_p"),
    Cell("inner_pendant_internal", "pendant_internal", "li_p"),
    Cell("outer_pendant_internal", "pendant_internal", "lo_p1"),
    Cell("inner_spine_internal", "spine_internal", "c_li"),
    Cell("outer_spine_internal", "spine_internal", "li_lo"),
)

FIVE_CUBIC_T = Skeleton(
    "five_cubic_t",
    ("c", "sl", "sr", "m", "o"),
    (
        ("c_sl", "c", "sl"),
        ("c_sr", "c", "sr"),
        ("c_m", "c", "m"),
        ("m_o", "m", "o"),
    ),
    (
        ("sl_p1", "sl"),
        ("sl_p2", "sl"),
        ("sr_p1", "sr"),
        ("sr_p2", "sr"),
        ("m_p", "m"),
        ("o_p1", "o"),
        ("o_p2", "o"),
    ),
)
T_CELLS = (
    Cell("center_branch", "branch", "c"),
    Cell("short_outer_branch", "branch", "sl"),
    Cell("middle_branch", "branch", "m"),
    Cell("long_outer_branch", "branch", "o"),
    Cell("short_outer_leaf", "leaf", "sl_p1"),
    Cell("middle_leaf", "leaf", "m_p"),
    Cell("long_outer_leaf", "leaf", "o_p1"),
    Cell("short_outer_pendant_internal", "pendant_internal", "sl_p1"),
    Cell("middle_pendant_internal", "pendant_internal", "m_p"),
    Cell("long_outer_pendant_internal", "pendant_internal", "o_p1"),
    Cell("center_short_outer_spine_internal", "spine_internal", "c_sl"),
    Cell("center_middle_spine_internal", "spine_internal", "c_m"),
    Cell("middle_long_outer_spine_internal", "spine_internal", "m_o"),
)


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def constant(value: int) -> fmpq_poly:
    return fmpq_poly([value])


def path_count(order: int | fmpq_poly, rank: int) -> fmpq_poly:
    if isinstance(order, int):
        if order == -1:
            return ONE if rank == 0 else ZERO
        if order <= -2:
            return ZERO
        top = order - rank + 1
        return constant(math.comb(top, rank) if top >= rank >= 0 else 0)
    value = ONE
    for index in range(rank):
        value *= order - rank + 1 - index
    return value / math.factorial(rank)


def path(order: int | fmpq_poly) -> list[fmpq_poly]:
    return [path_count(order, rank) for rank in range(MAX_RANK + 1)]


def product(factors: list[list[fmpq_poly]]) -> list[fmpq_poly]:
    values = [ONE] + [ZERO] * MAX_RANK
    for factor in factors:
        values = [
            sum(
                (values[index] * factor[rank - index] for index in range(rank + 1)),
                ZERO,
            )
            for rank in range(MAX_RANK + 1)
        ]
    return values


def shifted(vector: list[fmpq_poly], amount: int) -> list[fmpq_poly]:
    return [ZERO] * amount + vector[: MAX_RANK + 1 - amount]


def conditioned(
    skeleton: Skeleton,
    lengths: dict[str, fmpq_poly],
    cell: Cell | None = None,
    near: fmpq_poly | None = None,
    tail: fmpq_poly | None = None,
) -> list[fmpq_poly]:
    """Exact core (cell=None) or root-deleted independence coefficients."""

    branch_index = {name: index for index, name in enumerate(skeleton.branches)}
    rows: list[list[fmpq_poly]] = []
    omitted = cell.target if cell is not None and cell.kind == "branch" else None
    for mask in range(1 << len(skeleton.branches)):
        selected = {
            name: (mask >> branch_index[name]) & 1
            for name in skeleton.branches
        }
        if omitted is not None and selected[omitted]:
            continue
        factors: list[list[fmpq_poly]] = []
        for name, left, right in skeleton.spines:
            if cell is not None and cell.kind == "spine_internal" and cell.target == name:
                assert near is not None and tail is not None
                factors.append(path(near - selected[left]))
                factors.append(path(tail - selected[right]))
            else:
                factors.append(path(lengths[name] - 1 - selected[left] - selected[right]))
        for name, branch in skeleton.pendants:
            if cell is not None and cell.target == name and cell.kind == "leaf":
                factors.append(path(lengths[name] - 1 - selected[branch]))
            elif cell is not None and cell.target == name and cell.kind == "pendant_internal":
                assert near is not None and tail is not None
                factors.append(path(near - selected[branch]))
                factors.append(path(tail))
            else:
                factors.append(path(lengths[name] - selected[branch]))
        rows.append(shifted(product(factors), sum(selected.values())))
    return [
        sum((row[rank] for row in rows), ZERO)
        for rank in range(MAX_RANK + 1)
    ]


def residual(core: list[fmpq_poly], deleted: list[fmpq_poly], siblings: int) -> fmpq_poly:
    p7 = sum(
        (math.comb(siblings, index) * core[7 - index] for index in range(8)),
        ZERO,
    ) + deleted[6]
    p8 = sum(
        (math.comb(siblings, index) * core[8 - index] for index in range(9)),
        ZERO,
    ) + deleted[7]
    p9_open = sum(
        (math.comb(siblings, index) * core[9 - index] for index in range(1, 10)),
        ZERO,
    )
    return (
        8 * core[7] * deleted[6] * (16 * p8**2 - p7 * p8 - 18 * p7 * p9_open)
        - 8 * deleted[6] * p7 * (16 * core[8]**2 - core[7] * core[8])
        - 9 * core[7] * p7 * (14 * deleted[7]**2 - deleted[6] * deleted[7])
    )


def deltas03(core: list[fmpq_poly], deleted: list[fmpq_poly]) -> tuple[fmpq_poly, ...]:
    values = [residual(core, deleted, siblings) for siblings in range(1, 5)]
    out = [values[0]]
    for _ in range(3):
        values = [right - left for left, right in zip(values, values[1:])]
        out.append(values[0])
    return tuple(out)


def integer(value: fmpq) -> int:
    assert value.denom() == 1
    return int(value.numer())


def polynomial_digest(poly: fmpq_poly) -> str:
    body = "".join(f"{index}:{coefficient}\n" for index, coefficient in enumerate(poly.coeffs()))
    return hashlib.sha256(body.encode("ascii")).hexdigest().upper()


def newton_stats(poly: fmpq_poly) -> dict:
    degree = int(poly.degree())
    assert degree >= 0
    column = [integer(poly(point)) for point in range(degree + 1)]
    coefficients = []
    while column:
        coefficients.append(column[0])
        column = [right - left for left, right in zip(column, column[1:])]
    return {
        "degree": degree,
        "newton_coefficients": len(coefficients),
        "negative_newton_coefficients": sum(value < 0 for value in coefficients),
        "zero_newton_coefficients": sum(value == 0 for value in coefficients),
        "base_value": str(coefficients[0]),
        "first_newton_coefficient": str(coefficients[1] if len(coefficients) > 1 else 0),
        "minimum_newton_coefficient": str(min(coefficients)),
        "polynomial_sha256": polynomial_digest(poly),
    }


def cell_polynomials(skeleton: Skeleton, cell: Cell):
    lengths = {
        name: constant(10) for name, _left, _right in skeleton.spines
    } | {
        name: constant(8) for name, _branch in skeleton.pendants
    }
    near = None
    tail = None
    if cell.kind == "leaf":
        lengths[cell.target] = constant(9)
        first_spine = skeleton.spines[0][0]
        lengths[first_spine] += X
    elif cell.kind == "pendant_internal":
        near = constant(8) + X
        tail = constant(7)
        lengths[cell.target] = near + tail + 1
    elif cell.kind == "spine_internal":
        near = constant(8) + X
        tail = constant(8)
        lengths[cell.target] = near + tail + 2
    else:
        first_spine = skeleton.spines[0][0]
        lengths[first_spine] += X
    core = conditioned(skeleton, lengths)
    deleted = conditioned(skeleton, lengths, cell, near, tail)
    base_order = 1 + sum(integer(length(0)) for length in lengths.values())
    return lengths, near, tail, core, deleted, base_order


def int_poly_mul(left: list[int], right: list[int]) -> list[int]:
    out = [0] * (MAX_RANK + 1)
    for i, a in enumerate(left):
        for j, b in enumerate(right[: MAX_RANK + 1 - i]):
            out[i + j] += a * b
    return out


def literal_forest_poly(adjacency: list[list[int]], removed: frozenset[int] = frozenset()):
    seen = set(removed)

    def visit(vertex: int, parent: int):
        seen.add(vertex)
        excluded = [1] + [0] * MAX_RANK
        included = [0, 1] + [0] * (MAX_RANK - 1)
        for child in adjacency[vertex]:
            if child == parent or child in removed:
                continue
            child_excluded, child_included = visit(child, vertex)
            child_total = [a + b for a, b in zip(child_excluded, child_included)]
            excluded = int_poly_mul(excluded, child_total)
            included = int_poly_mul(included, child_excluded)
        return excluded, included

    result = [1] + [0] * MAX_RANK
    for vertex in range(len(adjacency)):
        if vertex in seen:
            continue
        excluded, included = visit(vertex, -1)
        result = int_poly_mul(result, [a + b for a, b in zip(excluded, included)])
    return result


def literal_tree(skeleton: Skeleton, lengths: dict[str, int]):
    adjacency = [[] for _ in skeleton.branches]
    branch_vertex = {name: index for index, name in enumerate(skeleton.branches)}
    paths: dict[str, list[int]] = {}

    def connect(name: str, left: int, right: int, distance: int):
        assert distance >= 1
        vertices = [left]
        current = left
        for _ in range(distance - 1):
            child = len(adjacency)
            adjacency.append([current])
            adjacency[current].append(child)
            current = child
            vertices.append(current)
        adjacency[current].append(right)
        adjacency[right].append(current)
        vertices.append(right)
        paths[name] = vertices

    def attach(name: str, branch: int, distance: int):
        vertices = [branch]
        current = branch
        for _ in range(distance):
            child = len(adjacency)
            adjacency.append([current])
            adjacency[current].append(child)
            current = child
            vertices.append(current)
        paths[name] = vertices

    for name, left, right in skeleton.spines:
        connect(name, branch_vertex[left], branch_vertex[right], lengths[name])
    for name, branch in skeleton.pendants:
        attach(name, branch_vertex[branch], lengths[name])
    assert sum(len(row) == 3 for row in adjacency) == 5
    return adjacency, branch_vertex, paths


def literal_root(cell: Cell, branches: dict[str, int], paths: dict[str, list[int]], near: int | None):
    if cell.kind == "branch":
        return branches[cell.target]
    if cell.kind == "leaf":
        return paths[cell.target][-1]
    assert near is not None
    return paths[cell.target][near + 1]


def literal_checks(
    skeleton: Skeleton,
    cell: Cell,
    lengths: dict[str, fmpq_poly],
    near: fmpq_poly | None,
    core: list[fmpq_poly],
    deleted: list[fmpq_poly],
) -> int:
    checks = 0
    for offset in (0, 3):
        numeric_lengths = {name: integer(value(offset)) for name, value in lengths.items()}
        adjacency, branches, paths = literal_tree(skeleton, numeric_lengths)
        numeric_near = integer(near(offset)) if near is not None else None
        root = literal_root(cell, branches, paths, numeric_near)
        exact_core = literal_forest_poly(adjacency)
        exact_deleted = literal_forest_poly(adjacency, frozenset({root}))
        assert exact_core == [integer(value(offset)) for value in core]
        assert exact_deleted == [integer(value(offset)) for value in deleted]
        checks += 2
    return checks


def main() -> None:
    started = time.perf_counter()
    actual = {name: sha256(ROOT / name) for name in EXPECTED}
    assert actual == EXPECTED
    transfer = json.loads(
        (ROOT / "rank8_stable_path_offset_transfer_exact_agent_20260822.json")
        .read_text(encoding="utf-8")
    )
    assert transfer["status"] == "PASS_EXACT_RANK8_STABLE_PATH_OFFSET_TRANSFER"
    assert transfer["literal_guard"] == (
        "For combinatorial path counts through rank eight, each path order must be at least seven before applying the transfer."
    )

    rows = []
    total_literal_checks = 0
    for skeleton, cells in ((FIVE_CUBIC_PATH, PATH_CELLS), (FIVE_CUBIC_T, T_CELLS)):
        for cell in cells:
            lengths, near, tail, core, deleted, base_order = cell_polynomials(skeleton, cell)
            total_literal_checks += literal_checks(
                skeleton, cell, lengths, near, core, deleted
            )
            values = deltas03(core, deleted)
            increments = tuple(value(X + 1) - value for value in values)
            rank_rows = {}
            for rank in RANKS:
                value_stats = newton_stats(values[rank])
                increment_stats = newton_stats(increments[rank])
                assert value_stats["negative_newton_coefficients"] == 0
                assert int(value_stats["base_value"]) > 0
                assert increment_stats["negative_newton_coefficients"] == 0
                assert int(increment_stats["base_value"]) > 0
                rank_rows[str(rank)] = {
                    "value": value_stats,
                    "unit_subdivision_increment": increment_stats,
                }
            row = {
                "skeleton": skeleton.name,
                "root_location_orbit": cell.orbit,
                "root_kind": cell.kind,
                "minimum_source_order_in_stable_cell": base_order,
                "offset_variable": "S=sum of all stable path-length offsets",
                "ranks": rank_rows,
            }
            rows.append(row)
            print("CELL_PASS", skeleton.name, cell.orbit, base_order, flush=True)

    assert len(rows) == 24
    assert total_literal_checks == 96
    payload = {
        "schema": "rank8-delta03-e5-cubic-stable-subdivision-exact-agent-v1",
        "status": "PASS_EXACT_RANK8_DELTA03_E5_CUBIC_STABLE_SUBDIVISION",
        "skeletons": [FIVE_CUBIC_PATH.name, FIVE_CUBIC_T.name],
        "root_location_orbits": len(rows),
        "ranks": list(RANKS),
        "literal_formula_checks": total_literal_checks,
        "stable_path_guard": "every conditioned path factor has order at least seven",
        "transfer_consequence": (
            "For each conditioned branch-selection term, all eligible length offsets enter through S; every unit subdivision is S->S+1."
        ),
        "conclusion": (
            "In every fully stable cubic e=5 root cell, Delta_0 through Delta_3 are positive and strictly increase under every eligible unit edge subdivision."
        ),
        "cells": rows,
        "immutable_input_hashes": actual,
        "source_sha256": sha256(Path(__file__)),
        "elapsed_seconds": time.perf_counter() - started,
        "scope_guard": (
            "Fully stable cells only. This does not certify mixed short/stable or all-short boundary cells and does not by itself close the e=5 layer."
        ),
    }
    OUTPUT.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    print(payload["status"])
    print("SOURCE", payload["source_sha256"])
    print("REPORT", sha256(OUTPUT))
    print("ELAPSED", f"{payload['elapsed_seconds']:.3f}")


if __name__ == "__main__":
    main()
