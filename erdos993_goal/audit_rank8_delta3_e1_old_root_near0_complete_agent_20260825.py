#!/usr/bin/env python3
"""Independent generic-tree-DP replay of the new Delta3 near=0 refinements.

This audit does not import any of the producer/refinement modules or their
path-product formulas.  It constructs each subdivided claw as an adjacency
list, computes independence polynomials by a generic forest recursion, and
rebuilds every refined Newton tensor from the canonical terminal residual.
"""

from __future__ import annotations

import hashlib
import json
import os
from functools import cache
from pathlib import Path

import numpy as np
import sympy as sp

from verify_rank8_q8_terminal_reduction import c, h, newton_coefficients, residual


HERE = Path(__file__).resolve().parent
OUTPUT = HERE / "rank8_delta3_e1_old_root_near0_complete_independent_audit_agent_20260825.json"
MAX_RANK = 8
DEGREE = 26
PINNED = {
    "verify_rank8_q8_terminal_reduction.py":
        "389216D19951A28784C46E57393F1F9CD5BBE41625DCD317C664F701EC2EC4B7",
    "audit_rank8_delta013_e1_leaf_extension_package.py":
        "D9B836E7A1237747993A6084037A44BE6E023560CDF797577B4194C90CC12DA4",
    "rank8_delta013_e1_leaf_extension_independent_audit_20260820.json":
        "857D122C864C9223D0DCC9981DD138BA09788D51FFE5B40AEDB5C33A07D309E7",
    "prove_rank8_delta3_e1_old_root_near0_univariate_refinement_agent_20260825.py":
        "5AEF4E1B84BA5CFDF4089B95EB91784C07EA3EA9B33C892C54B0043961D7D91C",
    "rank8_delta3_e1_old_root_near0_univariate_refinement_exact_agent_20260825.json":
        "0B1D9CD86342ADF42B20CFDD9C4BD430CDAF8313B92E04932B6855E9D7333720",
    "prove_rank8_delta3_e1_old_root_near0_bivariate_refinement_agent_20260825.py":
        "DEA9F19F7E287D0D2C7F294B971BD7A619EEDAE63BC3D2FC78EF7AFE668FA3CF",
    "rank8_delta3_e1_old_root_near0_bivariate_refinement_exact_agent_20260825.json":
        "F9882287EA8FC1C53092A74F73FA85FACEC1404C5D54BE49F25FD2433702250C",
    "probe_rank8_delta3_e1_old_root_near0_trivariate_partition_agent_20260825.py":
        "E36870C886CA7EED1D80BD124AE2623B67592E7A74BB8996520C84D362FB0CA3",
    "rank8_delta3_e1_old_root_near0_trivariate_partition_probe_agent_20260825.json":
        "1682DE8796B348A077D6CC1BA3570AB139B84BD43A6B7938B80571065A498E55",
    "seal_rank8_delta3_e1_old_root_near0_trivariate_partition_agent_20260825.py":
        "35EBEDB859E38F2C0AD821A6B409F739B590D6806DE0651E477561A37A9829B0",
    "rank8_delta3_e1_old_root_near0_trivariate_partition_exact_agent_20260825.json":
        "4433216055285ACCE541C2256F5A8EB549336A6B8FD2A6ACF38794856BC3D97A",
    "assemble_rank8_delta3_e1_old_root_near0_complete_agent_20260825.py":
        "9CAD7220DA0EDA8C77E44552AB3661E23AF26C4129F812F32E32E6395BD99F58",
    "rank8_delta3_e1_old_root_near0_complete_exact_agent_20260825.json":
        "AA4661167937F5D5FA484132C0D3739449D9AB261685534BE6FA181C9218618B",
}


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def load(name: str) -> dict[str, object]:
    return json.loads((HERE / name).read_text(encoding="utf-8"))


def poly_add(left: tuple[int, ...], right: tuple[int, ...]) -> tuple[int, ...]:
    return tuple(left[index] + right[index] for index in range(MAX_RANK + 1))


def poly_mul(left: tuple[int, ...], right: tuple[int, ...]) -> tuple[int, ...]:
    out = [0] * (MAX_RANK + 1)
    for first, left_value in enumerate(left):
        if not left_value:
            continue
        for second, right_value in enumerate(right[: MAX_RANK + 1 - first]):
            if right_value:
                out[first + second] += left_value * right_value
    return tuple(out)


def shift(polynomial: tuple[int, ...]) -> tuple[int, ...]:
    return (0,) + polynomial[:MAX_RANK]


def build_graph(arms: tuple[int, int, int]) -> tuple[tuple[tuple[int, ...], ...], int]:
    adjacency: list[list[int]] = [[]]
    root = -1
    for arm, length in enumerate(arms):
        previous = 0
        for distance in range(1, length + 1):
            vertex = len(adjacency)
            adjacency.append([])
            adjacency[previous].append(vertex)
            adjacency[vertex].append(previous)
            if arm == 0 and distance == 1:
                root = vertex
            previous = vertex
    assert root > 0
    assert sum(len(row) for row in adjacency) // 2 == len(adjacency) - 1
    return tuple(tuple(row) for row in adjacency), root


def generic_forest_polynomial(adjacency: tuple[tuple[int, ...], ...], deleted: int | None) -> tuple[int, ...]:
    seen = set() if deleted is None else {deleted}

    def visit(vertex: int, parent: int) -> tuple[tuple[int, ...], tuple[int, ...]]:
        seen.add(vertex)
        excluded = (1,) + (0,) * MAX_RANK
        included = (1,) + (0,) * MAX_RANK
        for neighbor in adjacency[vertex]:
            if neighbor == parent or neighbor == deleted:
                continue
            child_excluded, child_included = visit(neighbor, vertex)
            excluded = poly_mul(excluded, poly_add(child_excluded, child_included))
            included = poly_mul(included, child_excluded)
        return excluded, shift(included)

    factors = []
    for vertex in range(len(adjacency)):
        if vertex in seen:
            continue
        excluded, included = visit(vertex, -1)
        factors.append(poly_add(excluded, included))
    out = (1,) + (0,) * MAX_RANK
    for factor in factors:
        out = poly_mul(out, factor)
    return out


@cache
def profile(arms: tuple[int, int, int]) -> tuple[tuple[int, ...], tuple[int, ...]]:
    adjacency, root = build_graph(arms)
    core = generic_forest_polynomial(adjacency, None)
    deleted = generic_forest_polynomial(adjacency, root)
    order = 1 + sum(arms)
    assert core[0] == 1 and core[1] == order
    assert core[2] == (order - 1) * (order - 2) // 2
    return core, deleted


def build_evaluator():
    variables = (*c[:9], h[6], h[7])
    terms = sp.Poly(newton_coefficients(residual())[3], *variables, domain=sp.QQ).terms()

    def evaluate(values: tuple[int, ...]) -> int:
        total = sp.S.Zero
        for monomial, coefficient in terms:
            term = coefficient
            for value, exponent in zip(values, monomial):
                if exponent:
                    term *= value**exponent
            total += term
        assert total.q == 1
        return int(total)

    return evaluate, len(terms)


EVALUATE = None


@cache
def increment(extension: str, tail: int, short: int, difference: int) -> int:
    old_arms = (tail + 1, short + 1, short + difference + 1)
    new_arms = list(old_arms)
    new_arms[{"root": 0, "short": 1, "long": 2}[extension]] += 1
    old_core, old_deleted = profile(old_arms)
    new_core, new_deleted = profile(tuple(new_arms))
    assert EVALUATE is not None
    old_value = EVALUATE((*old_core[:9], old_deleted[6], old_deleted[7]))
    new_value = EVALUATE((*new_core[:9], new_deleted[6], new_deleted[7]))
    return new_value - old_value


def differences(line: list[int]) -> list[int]:
    answer = []
    current = line
    while current:
        answer.append(current[0])
        current = [current[index + 1] - current[index] for index in range(len(current) - 1)]
    return answer


def transform(values: np.ndarray, axis: int) -> None:
    moved = np.moveaxis(values, axis, 0)
    for index in np.ndindex(moved.shape[1:]):
        line = [int(moved[(position,) + index]) for position in range(moved.shape[0])]
        for position, value in enumerate(differences(line)):
            moved[(position,) + index] = value


def array_record(values: np.ndarray) -> dict[str, object]:
    coefficients = [int(entry) for entry in values.flat]
    ordered = hashlib.sha256()
    for index in np.ndindex(values.shape):
        ordered.update((",".join(map(str, index)) + ":" + str(int(values[index])) + "\n").encode())
    return {
        "shape": list(values.shape),
        "coefficients": len(coefficients),
        "negative": sum(entry < 0 for entry in coefficients),
        "zero": sum(entry == 0 for entry in coefficients),
        "positive": sum(entry > 0 for entry in coefficients),
        "minimum": str(min(coefficients)),
        "origin": str(int(values[(0,) * values.ndim])),
        "ordered_sha256": ordered.hexdigest().upper(),
    }


def replay_array(extension: str, shifts: tuple[int, int, int], active: tuple[int, ...]) -> tuple[int, dict[str, object]]:
    shape = (DEGREE + 1,) * len(active)
    values = np.empty(shape, dtype=object)
    for index in np.ndindex(shape):
        parameters = list(shifts)
        for axis, coordinate in enumerate(active):
            parameters[coordinate] += index[axis]
        values[index] = increment(extension, *parameters)
    minimum_sampled = min(int(entry) for entry in values.flat)
    for axis in range(len(active)):
        transform(values, axis)
    return minimum_sampled, array_record(values)


def compare_record(actual: dict[str, object], expected: dict[str, object]) -> None:
    for key, value in expected.items():
        assert actual[key] == value, (key, actual[key], value)


def atomic_json(path: Path, payload: dict[str, object]) -> None:
    temporary = path.with_suffix(path.suffix + ".tmp")
    temporary.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    os.replace(temporary, path)


def main() -> None:
    global EVALUATE
    actual_hashes = {name: sha256(HERE / name) for name in PINNED}
    assert actual_hashes == PINNED, (actual_hashes, PINNED)
    EVALUATE, source_terms = build_evaluator()
    univariate = load("rank8_delta3_e1_old_root_near0_univariate_refinement_exact_agent_20260825.json")
    bivariate = load("rank8_delta3_e1_old_root_near0_bivariate_refinement_exact_agent_20260825.json")
    trivariate = load("rank8_delta3_e1_old_root_near0_trivariate_partition_exact_agent_20260825.json")
    assembled = load("rank8_delta3_e1_old_root_near0_complete_exact_agent_20260825.json")
    assert assembled["status"] == "PASS_EXACT_DELTA3_E1_OLD_ROOT_NEAR0_ALL_ORDER_ALL_EXTENSIONS"

    uni_replayed = 0
    for row in univariate["rows"]:
        extension = row["extension"]
        tail = row["tail"]
        short = row["short"]
        lower = row["original_difference_lower"]
        shifted = row["tail_difference_lower"]
        prefix = [increment(extension, tail, short, value) for value in range(lower, shifted)]
        samples = [increment(extension, tail, short, shifted + offset) for offset in range(DEGREE + 1)]
        coefficients = differences(samples)
        assert [str(entry) for entry in prefix] == row["finite_prefix_values"]
        assert [str(entry) for entry in coefficients] == row["tail_newton_coefficients"]
        assert all(entry > 0 for entry in prefix)
        assert coefficients[0] > 0 and min(coefficients) >= 0
        uni_replayed += 1
    print("AUDIT_UNIVARIATE", uni_replayed, flush=True)

    bi_bulk_replayed = bi_strip_replayed = 0
    for row in bivariate["rows"]:
        extension = row["extension"]
        tail = row["tail"]
        minimum_sampled, record = replay_array(extension, (tail, 5, 0), (1, 2))
        compare_record(record, row["bulk_short5"]["newton"])
        assert str(minimum_sampled) == row["bulk_short5"]["minimum_sampled_increment"]
        assert minimum_sampled > 0 and record["negative"] == 0
        bi_bulk_replayed += 1
        for strip in row["fixed_short_strips"]:
            short = strip["short"]
            shifted = strip["tail_difference_lower"]
            prefix = [increment(extension, tail, short, value) for value in range(shifted)]
            samples = [increment(extension, tail, short, shifted + offset) for offset in range(DEGREE + 1)]
            coefficients = differences(samples)
            assert [str(entry) for entry in prefix] == strip["finite_prefix_values"]
            assert [str(entry) for entry in coefficients] == strip["tail_newton_coefficients"]
            assert all(entry > 0 for entry in prefix)
            assert coefficients[0] > 0 and min(coefficients) >= 0
            bi_strip_replayed += 1
    print("AUDIT_BIVARIATE", bi_bulk_replayed, bi_strip_replayed, flush=True)

    coordinate = {"tail": 0, "short": 1, "difference": 2}
    tri_replayed = 0
    for row in trivariate["row_digests"]:
        active = tuple(coordinate[name] for name in row["active_coordinates"])
        shifts = tuple(row["shifts_tail_short_difference"])
        minimum_sampled, record = replay_array(row["extension"], shifts, active)
        expected = row["newton"]
        compare_record(record, expected)
        assert str(minimum_sampled) == row["minimum_sampled_increment"]
        assert minimum_sampled > 0 and record["negative"] == 0
        tri_replayed += 1
        if tri_replayed % 10 == 0:
            print("AUDIT_TRIVARIATE_PROGRESS", tri_replayed, flush=True)
    assert tri_replayed == 93

    legacy = load("rank8_delta013_e1_leaf_extension_independent_audit_20260820.json")
    assert legacy["status"].startswith("PASS")
    payload = {
        "schema": "rank8-delta3-e1-old-root-near0-complete-independent-audit-agent-v1",
        "status": "PASS_INDEPENDENT_GENERIC_TREE_DP_DELTA3_E1_OLD_ROOT_NEAR0_COMPLETE",
        "audited_theorem_status": assembled["status"],
        "independence": {
            "imports_any_20260825_producer": False,
            "graph_model": "fresh adjacency-list subdivided claws",
            "coefficient_engine": "generic rooted forest include/exclude DP truncated at rank 8",
            "sign_engine": "fresh multidimensional forward differences",
            "shared_definition_only": "canonical rank-eight terminal residual from verify_rank8_q8_terminal_reduction.py",
        },
        "source_expression_terms": source_terms,
        "replayed": {
            "univariate_original_cells": uni_replayed,
            "bivariate_bulk_cells": bi_bulk_replayed,
            "bivariate_fixed_short_rays": bi_strip_replayed,
            "trivariate_partition_regions": tri_replayed,
            "all_stored_ordered_coefficient_digests_matched": True,
            "all_stored_literal_prefixes_matched": True,
            "all_newton_coefficients_nonnegative": True,
            "all_origins_positive": True,
        },
        "legacy_101_cells": {
            "role": "hash-pinned 2026-08-20 cells already covered by the prior independent package audit",
            "audit_status": legacy["status"],
            "audit_sha256": actual_hashes["rank8_delta013_e1_leaf_extension_independent_audit_20260820.json"],
        },
        "dependency_sha256": actual_hashes,
        "proof_boundary": assembled["proof_boundary"],
        "source_sha256": sha256(Path(__file__)),
    }
    atomic_json(OUTPUT, payload)
    print(payload["status"])
    print("SOURCE", sha256(Path(__file__)))
    print("REPORT", sha256(OUTPUT))


if __name__ == "__main__":
    main()
