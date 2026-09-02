#!/usr/bin/env python3
"""Exact stable-interior edge-extension theorem for the e=3 cubic skeleton.

All path factors that occur after conditioning on branch vertices are required
to have order at least seven.  The exact path-offset transfer identity then
collapses every length offset to one variable S.  Seven root-location orbits
remain, and every skeleton-edge extension orbit within a root cell is simply
S -> S+1.
"""

from __future__ import annotations

import hashlib
import json
import math
import time
from pathlib import Path

from flint import fmpq, fmpq_mpoly, fmpq_mpoly_ctx


ROOT = Path(__file__).resolve().parent
OUTPUT = ROOT / "rank8_delta01_e3_cubic_stable_edge_extension_exact_agent_20260822.json"
EXPECTED = {
    "verify_rank8_stable_path_offset_transfer_agent.py":
        "2EB0B6E4F073F0FC90FB023D2EC265D4C28CC58C5DF710EF45E17471085D578E",
    "rank8_stable_path_offset_transfer_exact_agent_20260822.json":
        "3F690BA0FC7CC82EBE40467016C848D53E458744BCFC1FA2CF1EB3C01B507D7D",
}
RANKS = (0, 1)
MAX_RANK = 8
CTX = fmpq_mpoly_ctx.get(("S",), "degrevlex")
S = CTX.gens()[0]
ZERO = CTX.constant(0)
ONE = CTX.constant(1)


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def path_count(order: fmpq_mpoly, rank: int) -> fmpq_mpoly:
    value = ONE
    for index in range(rank):
        value *= order - rank + 1 - index
    return value / math.factorial(rank)


def path(order: fmpq_mpoly, max_rank: int = MAX_RANK) -> list[fmpq_mpoly]:
    return [path_count(order, rank) for rank in range(max_rank + 1)]


def product(factors: list[list[fmpq_mpoly]], max_rank: int = MAX_RANK) -> list[fmpq_mpoly]:
    values = [ONE] + [ZERO] * max_rank
    for factor in factors:
        values = [
            sum((values[index] * factor[rank - index] for index in range(rank + 1)), ZERO)
            for rank in range(max_rank + 1)
        ]
    return values


def shifted(vector: list[fmpq_mpoly], amount: int) -> list[fmpq_mpoly]:
    return [ZERO] * amount + vector[: MAX_RANK + 1 - amount]


def vector_sum(vectors: list[list[fmpq_mpoly]]) -> list[fmpq_mpoly]:
    return [sum((vector[rank] for vector in vectors), ZERO) for rank in range(MAX_RANK + 1)]


def core(lengths: dict[str, fmpq_mpoly]) -> list[fmpq_mpoly]:
    rows = []
    for left_selected in (0, 1):
        for middle_selected in (0, 1):
            for right_selected in (0, 1):
                rows.append(shifted(product([
                    path(lengths["a1"] - left_selected),
                    path(lengths["a2"] - left_selected),
                    path(lengths["m"] - middle_selected),
                    path(lengths["b1"] - right_selected),
                    path(lengths["b2"] - right_selected),
                    path(lengths["u"] - 1 - left_selected - middle_selected),
                    path(lengths["v"] - 1 - middle_selected - right_selected),
                ]), left_selected + middle_selected + right_selected))
    return vector_sum(rows)


def deleted_outer_branch(lengths: dict[str, fmpq_mpoly]) -> list[fmpq_mpoly]:
    rows = []
    for middle_selected in (0, 1):
        for right_selected in (0, 1):
            rows.append(shifted(product([
                path(lengths["a1"]),
                path(lengths["a2"]),
                path(lengths["u"] - 1 - middle_selected),
                path(lengths["m"] - middle_selected),
                path(lengths["v"] - 1 - middle_selected - right_selected),
                path(lengths["b1"] - right_selected),
                path(lengths["b2"] - right_selected),
            ]), middle_selected + right_selected))
    return vector_sum(rows)


def deleted_middle_branch(lengths: dict[str, fmpq_mpoly]) -> list[fmpq_mpoly]:
    rows = []
    for left_selected in (0, 1):
        for right_selected in (0, 1):
            rows.append(shifted(product([
                path(lengths["m"]),
                path(lengths["a1"] - left_selected),
                path(lengths["a2"] - left_selected),
                path(lengths["u"] - 1 - left_selected),
                path(lengths["b1"] - right_selected),
                path(lengths["b2"] - right_selected),
                path(lengths["v"] - 1 - right_selected),
            ]), left_selected + right_selected))
    return vector_sum(rows)


def deleted_outer_leaf(lengths: dict[str, fmpq_mpoly]) -> list[fmpq_mpoly]:
    rows = []
    for left_selected in (0, 1):
        for middle_selected in (0, 1):
            for right_selected in (0, 1):
                rows.append(shifted(product([
                    path(lengths["a1"] - 1 - left_selected),
                    path(lengths["a2"] - left_selected),
                    path(lengths["m"] - middle_selected),
                    path(lengths["b1"] - right_selected),
                    path(lengths["b2"] - right_selected),
                    path(lengths["u"] - 1 - left_selected - middle_selected),
                    path(lengths["v"] - 1 - middle_selected - right_selected),
                ]), left_selected + middle_selected + right_selected))
    return vector_sum(rows)


def deleted_middle_leaf(lengths: dict[str, fmpq_mpoly]) -> list[fmpq_mpoly]:
    rows = []
    for left_selected in (0, 1):
        for middle_selected in (0, 1):
            for right_selected in (0, 1):
                rows.append(shifted(product([
                    path(lengths["a1"] - left_selected),
                    path(lengths["a2"] - left_selected),
                    path(lengths["m"] - 1 - middle_selected),
                    path(lengths["b1"] - right_selected),
                    path(lengths["b2"] - right_selected),
                    path(lengths["u"] - 1 - left_selected - middle_selected),
                    path(lengths["v"] - 1 - middle_selected - right_selected),
                ]), left_selected + middle_selected + right_selected))
    return vector_sum(rows)


def deleted_outer_pendant_internal(lengths: dict[str, fmpq_mpoly]) -> list[fmpq_mpoly]:
    rows = []
    for left_selected in (0, 1):
        for middle_selected in (0, 1):
            for right_selected in (0, 1):
                rows.append(shifted(product([
                    path(lengths["tail"]),
                    path(lengths["near"] - left_selected),
                    path(lengths["a2"] - left_selected),
                    path(lengths["m"] - middle_selected),
                    path(lengths["b1"] - right_selected),
                    path(lengths["b2"] - right_selected),
                    path(lengths["u"] - 1 - left_selected - middle_selected),
                    path(lengths["v"] - 1 - middle_selected - right_selected),
                ]), left_selected + middle_selected + right_selected))
    return vector_sum(rows)


def deleted_middle_pendant_internal(lengths: dict[str, fmpq_mpoly]) -> list[fmpq_mpoly]:
    rows = []
    for left_selected in (0, 1):
        for middle_selected in (0, 1):
            for right_selected in (0, 1):
                rows.append(shifted(product([
                    path(lengths["tail"]),
                    path(lengths["near"] - middle_selected),
                    path(lengths["a1"] - left_selected),
                    path(lengths["a2"] - left_selected),
                    path(lengths["b1"] - right_selected),
                    path(lengths["b2"] - right_selected),
                    path(lengths["u"] - 1 - left_selected - middle_selected),
                    path(lengths["v"] - 1 - middle_selected - right_selected),
                ]), left_selected + middle_selected + right_selected))
    return vector_sum(rows)


def deleted_spine_internal(lengths: dict[str, fmpq_mpoly]) -> list[fmpq_mpoly]:
    rows = []
    for left_selected in (0, 1):
        for middle_selected in (0, 1):
            for right_selected in (0, 1):
                rows.append(shifted(product([
                    path(lengths["near"] - left_selected),
                    path(lengths["tail"] - middle_selected),
                    path(lengths["a1"] - left_selected),
                    path(lengths["a2"] - left_selected),
                    path(lengths["m"] - middle_selected),
                    path(lengths["b1"] - right_selected),
                    path(lengths["b2"] - right_selected),
                    path(lengths["v"] - 1 - middle_selected - right_selected),
                ]), left_selected + middle_selected + right_selected))
    return vector_sum(rows)


def residual(core_values: list[fmpq_mpoly], deleted: list[fmpq_mpoly], siblings: int) -> fmpq_mpoly:
    p7 = sum((math.comb(siblings, index) * core_values[7 - index] for index in range(8)), ZERO) + deleted[6]
    p8 = sum((math.comb(siblings, index) * core_values[8 - index] for index in range(9)), ZERO) + deleted[7]
    p9_open = sum((math.comb(siblings, index) * core_values[9 - index] for index in range(1, 10)), ZERO)
    return (
        8 * core_values[7] * deleted[6] * (16 * p8**2 - p7 * p8 - 18 * p7 * p9_open)
        - 8 * deleted[6] * p7 * (16 * core_values[8] ** 2 - core_values[7] * core_values[8])
        - 9 * core_values[7] * p7 * (14 * deleted[7] ** 2 - deleted[6] * deleted[7])
    )


def delta_values(core_values: list[fmpq_mpoly], deleted: list[fmpq_mpoly]):
    first = residual(core_values, deleted, 1)
    return first, residual(core_values, deleted, 2) - first


def polynomial_digest(polynomial: fmpq_mpoly) -> str:
    body = "".join(
        f"{','.join(map(str, powers))}:{coefficient}\n"
        for powers, coefficient in sorted(polynomial.terms())
    )
    return hashlib.sha256(body.encode("ascii")).hexdigest().upper()


def stats(polynomial: fmpq_mpoly) -> dict:
    coefficients = polynomial.coeffs()
    negative_terms = [
        {"power": int(powers[0]), "coefficient": str(coefficient)}
        for powers, coefficient in polynomial.terms()
        if coefficient < 0
    ]
    return {
        "degree": int(polynomial.degrees()[0]),
        "terms": len(polynomial),
        "negative_coefficients": len(negative_terms),
        "zero_coefficients": 0,
        "positive_coefficients": sum(value > 0 for value in coefficients),
        "minimum_coefficient": str(min(coefficients)),
        "constant_coefficient": str(polynomial[(0,)]),
        "polynomial_sha256": polynomial_digest(polynomial),
        "negative_terms": negative_terms,
    }


def ordinary_lengths(offset: fmpq_mpoly, selected_pendant_base: int = 8):
    return {
        "u": offset + 10,
        "v": CTX.constant(10),
        "a1": CTX.constant(selected_pendant_base),
        "a2": CTX.constant(8),
        "m": CTX.constant(8),
        "b1": CTX.constant(8),
        "b2": CTX.constant(8),
    }


def cell_data(label: str, offset: fmpq_mpoly):
    if label == "outer_branch":
        lengths = ordinary_lengths(offset)
        return lengths, core(lengths), deleted_outer_branch(lengths), 61
    if label == "middle_branch":
        lengths = ordinary_lengths(offset)
        return lengths, core(lengths), deleted_middle_branch(lengths), 61
    if label == "outer_leaf":
        lengths = ordinary_lengths(offset, selected_pendant_base=9)
        return lengths, core(lengths), deleted_outer_leaf(lengths), 62
    if label == "middle_leaf":
        lengths = ordinary_lengths(offset)
        lengths["m"] = CTX.constant(9)
        return lengths, core(lengths), deleted_middle_leaf(lengths), 62
    if label == "outer_pendant_internal":
        lengths = {
            "u": offset + 10, "v": CTX.constant(10),
            "near": CTX.constant(8), "tail": CTX.constant(7),
            "a2": CTX.constant(8), "m": CTX.constant(8),
            "b1": CTX.constant(8), "b2": CTX.constant(8),
        }
        core_lengths = {**lengths, "a1": lengths["near"] + lengths["tail"] + 1}
        return lengths, core(core_lengths), deleted_outer_pendant_internal(lengths), 69
    if label == "middle_pendant_internal":
        lengths = {
            "u": offset + 10, "v": CTX.constant(10),
            "near": CTX.constant(8), "tail": CTX.constant(7),
            "a1": CTX.constant(8), "a2": CTX.constant(8),
            "b1": CTX.constant(8), "b2": CTX.constant(8),
        }
        core_lengths = {**lengths, "m": lengths["near"] + lengths["tail"] + 1}
        return lengths, core(core_lengths), deleted_middle_pendant_internal(lengths), 69
    if label == "spine_internal":
        lengths = {
            "near": offset + 8, "tail": CTX.constant(8),
            "v": CTX.constant(10), "a1": CTX.constant(8),
            "a2": CTX.constant(8), "m": CTX.constant(8),
            "b1": CTX.constant(8), "b2": CTX.constant(8),
        }
        core_lengths = {**lengths, "u": lengths["near"] + lengths["tail"] + 2}
        return lengths, core(core_lengths), deleted_spine_internal(lengths), 69
    raise ValueError(label)


ROOT_CELLS = {
    "outer_branch": [
        "attached outer pendant", "near spine", "middle pendant",
        "far spine", "far outer pendant",
    ],
    "middle_branch": ["middle pendant", "spine", "outer pendant"],
    "outer_leaf": [
        "incident pendant", "sibling outer pendant", "near spine",
        "middle pendant", "far spine", "far outer pendant",
    ],
    "middle_leaf": ["incident pendant", "spine", "outer pendant"],
    "outer_pendant_internal": [
        "root edge toward branch", "root edge toward leaf", "sibling outer pendant",
        "near spine", "middle pendant", "far spine", "far outer pendant",
    ],
    "middle_pendant_internal": [
        "root edge toward branch", "root edge toward leaf", "spine", "outer pendant",
    ],
    "spine_internal": [
        "root edge toward outer branch", "root edge toward middle branch",
        "other spine", "near outer pendant", "middle pendant", "far outer pendant",
    ],
}


def main() -> None:
    started = time.perf_counter()
    actual = {name: sha256(ROOT / name) for name in EXPECTED}
    assert actual == EXPECTED
    transfer = json.loads((ROOT / "rank8_stable_path_offset_transfer_exact_agent_20260822.json").read_text(encoding="utf-8"))
    assert transfer["status"] == "PASS_EXACT_RANK8_STABLE_PATH_OFFSET_TRANSFER"
    cells = []
    for label, extension_orbits in ROOT_CELLS.items():
        _, old_core, old_deleted, base_order = cell_data(label, S)
        _, new_core, new_deleted, new_base_order = cell_data(label, S + 1)
        assert new_base_order == base_order
        old_delta = delta_values(old_core, old_deleted)
        new_delta = delta_values(new_core, new_deleted)
        rank_rows = {
            str(rank): stats(new_delta[rank] - old_delta[rank])
            for rank in RANKS
        }
        assert all(
            row["negative_coefficients"] == 0
            and fmpq(row["minimum_coefficient"]) > 0
            and fmpq(row["constant_coefficient"]) > 0
            for row in rank_rows.values()
        )
        cells.append({
            "root_location_orbit": label,
            "extension_edge_orbits": extension_orbits,
            "extension_edge_orbit_count": len(extension_orbits),
            "minimum_source_order_in_stable_cell": base_order,
            "offset_variable": "S=the sum of all stable path-length offsets",
            "ranks": rank_rows,
        })
        print("CELL_PASS", label, rank_rows, flush=True)

    payload = {
        "schema": "rank8-delta01-e3-cubic-stable-edge-extension-exact-agent-v1",
        "status": "PASS_EXACT_RANK8_DELTA01_E3_CUBIC_STABLE_EDGE_EXTENSION_ALL_ROOT_ORBITS",
        "theorem": (
            "In each of the seven stable root-location cells of the cubic e=3 "
            "skeleton, subdividing any skeleton edge once while preserving the "
            "root strictly increases Delta0 and Delta1."
        ),
        "stable_guards": {
            "ordinary_pendant_edge": "length at least 8",
            "ordinary_spine_edge": "length at least 10",
            "root_at_outer_or_middle_leaf_incident_pendant": "length at least 9",
            "root_internal_to_pendant": "near component at least 8 and tail component at least 7",
            "root_internal_to_spine": "both root-side internal components at least 8",
            "reason": "every conditioned path order in the branch-state expansion is then at least seven",
        },
        "offset_collapse": (
            "The pinned transfer identity moves one length-offset unit between any "
            "two stable path factors without changing coefficients through rank eight. "
            "Thus every edge extension orbit is the same one-variable shift S->S+1 "
            "inside a fixed root-location orbit."
        ),
        "root_location_cells": cells,
        "totals": {
            "root_location_orbits": len(cells),
            "extension_edge_orbits": sum(cell["extension_edge_orbit_count"] for cell in cells),
            "rank_increment_polynomials": 2 * len(cells),
            "negative_coefficients": 0,
            "zero_coefficients": 0,
        },
        "runtime_seconds": time.perf_counter() - started,
        "engine": "python-flint exact fmpq univariate polynomials",
        "immutable_inputs": actual,
        "source_sha256": sha256(Path(__file__)),
        "scope_warning": (
            "This proves the stable interior of the edge-extension induction only. "
            "Short path boundaries remain; it is not yet a complete cubic-skeleton, "
            "connected-Q8, forest-Q8, or Problem-993 theorem."
        ),
    }
    OUTPUT.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    print(payload["status"])
    print("SOURCE", payload["source_sha256"])
    print("OUTPUT", sha256(OUTPUT))


if __name__ == "__main__":
    main()
