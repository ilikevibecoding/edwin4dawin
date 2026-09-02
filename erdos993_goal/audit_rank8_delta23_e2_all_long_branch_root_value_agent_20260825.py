#!/usr/bin/env python3
"""Independent literal adjacency-list audit of the e=2 all-long branch cell.

Unlike the producer, this replay never uses the compressed two-path formulas
to generate certificate values.  Every tensor sample is reconstructed from a
literal double-claw adjacency list, twice running the include/exclude forest
DP (with and without the selected branch root), and then evaluating the
canonical Delta2/3 residual.  Exact finite differences reproduce both full
ordered Newton tensors and their hashes.
"""

from __future__ import annotations

import hashlib
import itertools
import json
import math
import os
from functools import lru_cache
from pathlib import Path

import numpy as np
import sympy as sp

from verify_rank8_q8_terminal_reduction import c, h, newton_coefficients, residual


HERE = Path(__file__).resolve().parent
CERTIFICATE = HERE / "rank8_delta23_e2_all_long_branch_root_value_exact_agent_20260825.json"
OUTPUT = HERE / "rank8_delta23_e2_all_long_branch_root_value_independent_audit_agent_20260825.json"
CERTIFICATE_SHA256 = "1AECB3C08F2C4BDCE12F3AB3151AB32F00024D15F3168134C01645A5C94CB3A5"
RANKS = (2, 3)
MAX_GRADE = 8
DEGREE_BOUNDS = {2: 27, 3: 26}
EXPECTED_PROFILES = 28 ** 3
PINNED = {
    "verify_rank8_q8_terminal_reduction.py":
        "389216D19951A28784C46E57393F1F9CD5BBE41625DCD317C664F701EC2EC4B7",
    "prove_rank8_delta23_e2_all_long_branch_root_value_agent_20260825.py":
        "DD99C567F24BC7970EDABE1FBF335FC639E18BE742C39848D75A2C699C377E58",
}


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def atomic_json(path: Path, payload: dict[str, object]) -> None:
    temporary = path.with_suffix(path.suffix + ".tmp")
    temporary.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    os.replace(temporary, path)


ZERO = (0,) * (MAX_GRADE + 1)
ONE = (1,) + (0,) * MAX_GRADE


def add(left: tuple[int, ...], right: tuple[int, ...]) -> tuple[int, ...]:
    return tuple(left[index] + right[index] for index in range(MAX_GRADE + 1))


def multiply(left: tuple[int, ...], right: tuple[int, ...]) -> tuple[int, ...]:
    answer = [0] * (MAX_GRADE + 1)
    for left_grade, left_value in enumerate(left):
        if not left_value:
            continue
        for right_grade, right_value in enumerate(right[: MAX_GRADE + 1 - left_grade]):
            if right_value:
                answer[left_grade + right_grade] += left_value * right_value
    return tuple(answer)


def times_x(polynomial: tuple[int, ...]) -> tuple[int, ...]:
    return (0,) + polynomial[:MAX_GRADE]


def add_path(adjacency: list[list[int]], start: int, length: int) -> int:
    assert length >= 1
    previous = start
    for _ in range(length):
        vertex = len(adjacency)
        adjacency.append([])
        adjacency[previous].append(vertex)
        adjacency[vertex].append(previous)
        previous = vertex
    return previous


def literal_double_claw(
    left_a: int,
    left_b: int,
    bridge: int,
    right_a: int,
    right_b: int,
) -> tuple[list[list[int]], int, int]:
    adjacency: list[list[int]] = [[]]
    left_root = 0
    add_path(adjacency, left_root, left_a)
    add_path(adjacency, left_root, left_b)
    right_root = add_path(adjacency, left_root, bridge)
    add_path(adjacency, right_root, right_a)
    add_path(adjacency, right_root, right_b)
    assert len(adjacency[left_root]) == len(adjacency[right_root]) == 3
    assert len(adjacency) == 1 + left_a + left_b + bridge + right_a + right_b
    return adjacency, left_root, right_root


def forest_polynomial(
    adjacency: list[list[int]], removed: int | None
) -> tuple[int, ...]:
    seen = set() if removed is None else {removed}

    def visit(vertex: int, parent: int) -> tuple[tuple[int, ...], tuple[int, ...]]:
        seen.add(vertex)
        excluded = ONE
        included_children = ONE
        for child in adjacency[vertex]:
            if child == parent or child in seen:
                continue
            child_excluded, child_included = visit(child, vertex)
            excluded = multiply(excluded, add(child_excluded, child_included))
            included_children = multiply(included_children, child_excluded)
        return excluded, times_x(included_children)

    answer = ONE
    for vertex in range(len(adjacency)):
        if vertex in seen:
            continue
        excluded, included = visit(vertex, -1)
        answer = multiply(answer, add(excluded, included))
    return answer


@lru_cache(maxsize=32768)
def literal_profile(
    SL: int, SR: int, G: int
) -> tuple[tuple[int, ...], tuple[int, ...]]:
    """Literal representative A=SL,B=0,C=SR,D=0 of the compressed cell."""
    assert SL >= 0 and SR >= 0 and G >= 0
    adjacency, left_root, _right_root = literal_double_claw(
        SL + 7, 7, G + 8, SR + 7, 7
    )
    core = forest_polynomial(adjacency, None)
    deletion = forest_polynomial(adjacency, left_root)
    order = 37 + SL + SR + G
    assert len(adjacency) == order
    assert core[0] == deletion[0] == 1
    assert core[1] == order and deletion[1] == order - 1
    assert core[2] == math.comb(order - 1, 2)
    assert core[3] == math.comb(order - 2, 3) + 2
    return core, deletion


def literal_split_profile(
    A: int, B: int, C: int, D: int, G: int
) -> tuple[tuple[int, ...], tuple[int, ...]]:
    adjacency, left_root, _right_root = literal_double_claw(
        A + 7, B + 7, G + 8, C + 7, D + 7
    )
    return forest_polynomial(adjacency, None), forest_polynomial(adjacency, left_root)


def rank_terms(rank: int) -> tuple[tuple[int, tuple[tuple[int, int], ...]], ...]:
    variables = (*c[:9], h[6], h[7])
    polynomial = sp.Poly(newton_coefficients(residual())[rank], *variables, domain=sp.QQ)
    raw = polynomial.terms()
    assert len(raw) == {2: 22, 3: 26}[rank]
    answer = []
    for monomial, coefficient in raw:
        assert coefficient.q == 1
        answer.append(
            (
                int(coefficient),
                tuple(
                    (index, exponent)
                    for index, exponent in enumerate(monomial)
                    if exponent
                ),
            )
        )
    weights = tuple(range(9)) + (6, 7)
    assert max(
        sum(weights[index] * exponent for index, exponent in factors)
        for _coefficient, factors in answer
    ) == DEGREE_BOUNDS[rank]
    return tuple(answer)


TERMS = {rank: rank_terms(rank) for rank in RANKS}


def evaluate(rank: int, core: tuple[int, ...], deletion: tuple[int, ...]) -> int:
    variables = (*core, deletion[6], deletion[7])
    answer = 0
    for coefficient, factors in TERMS[rank]:
        term = coefficient
        for index, exponent in factors:
            term *= variables[index] ** exponent
        answer += term
    return answer


@lru_cache(maxsize=65536)
def literal_value(rank: int, SL: int, SR: int, G: int) -> int:
    core, deletion = literal_profile(SL, SR, G)
    return evaluate(rank, core, deletion)


def transform_axis(values: np.ndarray, axis: int) -> None:
    moved = np.moveaxis(values, axis, 0)
    width = moved.shape[0]
    for trailing in np.ndindex(moved.shape[1:]):
        work = [int(moved[(position,) + trailing]) for position in range(width)]
        for order in range(width):
            moved[(order,) + trailing] = work[0]
            for position in range(width - order - 1):
                work[position] = work[position + 1] - work[position]


def digest(values: np.ndarray) -> dict[str, object]:
    ordered = hashlib.sha256()
    negative = zero = 0
    minimum = None
    first_negative = None
    nonzero_indices: list[tuple[int, ...]] = []
    for index in np.ndindex(values.shape):
        value = int(values[index])
        ordered.update(str(value).encode("ascii"))
        ordered.update(b"\n")
        if value < 0:
            negative += 1
            if first_negative is None:
                first_negative = {"orders": list(index), "coefficient": str(value)}
        elif value == 0:
            zero += 1
        else:
            nonzero_indices.append(index)
        minimum = value if minimum is None else min(minimum, value)
    count = values.size
    return {
        "entries": count,
        "negative": negative,
        "zero": zero,
        "positive": count - negative - zero,
        "minimum": str(minimum),
        "origin": str(int(values[(0,) * values.ndim])),
        "first_negative": first_negative,
        "actual_degrees": [
            max((index[axis] for index in nonzero_indices), default=-1)
            for axis in range(values.ndim)
        ],
        "ordered_sha256": ordered.hexdigest().upper(),
        "order": "numpy.ndindex/C order; G varies fastest, then SR, then SL",
    }


def symbolic_pair_identity() -> list[dict[str, object]]:
    """Independent algebraic derivation of the all-splits compression."""
    A, B = sp.symbols("audit_A audit_B", nonnegative=True, integer=True)

    def falling_choose(top: sp.Expr, grade: int) -> sp.Expr:
        if grade < 0:
            return sp.Integer(0)
        return sp.prod(top - shift for shift in range(grade)) / sp.factorial(grade)

    def path(order: sp.Expr, grade: int) -> sp.Expr:
        return falling_choose(order - grade + 1, grade)

    def compressed(total: sp.Expr, grade: int) -> sp.Expr:
        if grade < 0:
            return sp.Integer(0)
        terms = []
        remaining = grade
        removed = 0
        while remaining >= 0:
            terms.append(path(total - removed, remaining))
            remaining -= 2
            removed += 4
        return sp.expand(sum(terms))

    rows = []
    for grade in range(MAX_GRADE + 1):
        excluded_direct = sp.expand(
            sum(
                path(A + 7, left_grade) * path(B + 7, grade - left_grade)
                for left_grade in range(grade + 1)
            )
        )
        excluded_compressed = compressed(A + B + 14, grade)
        excluded_difference = sp.Poly(
            sp.expand(excluded_direct - excluded_compressed), A, B
        )
        assert excluded_difference.is_zero

        if grade == 0:
            included_direct = included_compressed = sp.Integer(0)
        else:
            included_direct = sp.expand(
                sum(
                    path(A + 6, left_grade)
                    * path(B + 6, grade - 1 - left_grade)
                    for left_grade in range(grade)
                )
            )
            included_compressed = compressed(A + B + 12, grade - 1)
        included_difference = sp.Poly(
            sp.expand(included_direct - included_compressed), A, B
        )
        assert included_difference.is_zero
        rows.append(
            {
                "grade": grade,
                "excluded_difference_terms": len(excluded_difference.terms()),
                "included_difference_terms": len(included_difference.terms()),
            }
        )
    return rows


def split_checks() -> list[dict[str, object]]:
    """Literal nontrivial-split checks for both arm pairs and side reversal."""
    rows = []
    sums = (0, 1, 2, 7, 13, 26, 27)
    bridges = (0, 5, 13, 27)
    for SL, SR, G in itertools.product(sums, sums, bridges):
        splits_left = {(SL, 0), (0, SL), (SL // 2, SL - SL // 2)}
        splits_right = {(SR, 0), (0, SR), (SR // 2, SR - SR // 2)}
        reference = literal_profile(SL, SR, G)
        comparisons = 0
        for (A, B), (C, D) in itertools.product(splits_left, splits_right):
            assert literal_split_profile(A, B, C, D, G) == reference
            comparisons += 1

        # Rooting at the right branch is the same left-root profile after
        # reversing the two sides.  Check this directly on one nontrivial split.
        adjacency, left_root, right_root = literal_double_claw(
            SL // 2 + 7,
            SL - SL // 2 + 7,
            G + 8,
            SR // 2 + 7,
            SR - SR // 2 + 7,
        )
        core = forest_polynomial(adjacency, None)
        right_deletion = forest_polynomial(adjacency, right_root)
        reversed_core, reversed_deletion = literal_split_profile(
            SR // 2,
            SR - SR // 2,
            SL // 2,
            SL - SL // 2,
            G,
        )
        assert core == reversed_core and right_deletion == reversed_deletion
        assert left_root == 0
        rows.append(
            {
                "SL": SL,
                "SR": SR,
                "G": G,
                "literal_split_comparisons": comparisons,
                "right_root_reversal": True,
            }
        )
    return rows


def replay_rank(rank: int, stored: dict[str, object]) -> dict[str, object]:
    width = DEGREE_BOUNDS[rank] + 1
    assert stored["rank"] == rank
    assert stored["grid_shape"] == [width, width, width]
    samples = np.empty((width, width, width), dtype=object)
    for SL, SR, G in itertools.product(range(width), repeat=3):
        samples[SL, SR, G] = literal_value(rank, SL, SR, G)
    sample_record = digest(samples)
    assert sample_record == stored["sample_values"], (rank, sample_record, stored["sample_values"])
    assert str(min(int(value) for value in samples.flat)) == stored["minimum_sampled_value"]

    newton = samples.copy()
    for axis in range(3):
        transform_axis(newton, axis)
    coefficient_record = digest(newton)
    assert coefficient_record == stored["newton_coefficients"], (
        rank,
        coefficient_record,
        stored["newton_coefficients"],
    )
    assert coefficient_record["negative"] == 0
    assert int(coefficient_record["origin"]) > 0
    return {
        "rank": rank,
        "literal_sample_values": sample_record,
        "literal_newton_coefficients": coefficient_record,
        "ordered_sample_digest_matches": True,
        "ordered_newton_digest_matches": True,
    }


def main() -> None:
    actual_hashes = {name: sha256(HERE / name) for name in PINNED}
    assert actual_hashes == PINNED, (actual_hashes, PINNED)
    assert sha256(CERTIFICATE) == CERTIFICATE_SHA256
    certificate = json.loads(CERTIFICATE.read_text(encoding="utf-8"))
    assert certificate["status"] == "PASS_EXACT_DELTA23_E2_ALL_LONG_BRANCH_ROOT_VALUE"
    assert certificate["coverage_totals"]["ordered_newton_coefficients"] == 28 ** 3 + 27 ** 3
    assert certificate["coverage_totals"]["negative_newton_coefficients"] == 0
    assert certificate["coverage_totals"]["all_origins_strictly_positive"] is True
    stored = {case["rank"]: case for case in certificate["cases"]}
    assert set(stored) == set(RANKS)

    identity_rows = symbolic_pair_identity()
    split_rows = split_checks()
    replay_rows = [replay_rank(rank, stored[rank]) for rank in RANKS]
    coefficient_count = sum(row["literal_newton_coefficients"]["entries"] for row in replay_rows)
    assert coefficient_count == 28 ** 3 + 27 ** 3
    assert literal_profile.cache_info().currsize == EXPECTED_PROFILES

    payload = {
        "schema": "rank8-delta23-e2-all-long-branch-root-value-independent-audit-v1",
        "status": "PASS_INDEPENDENT_LITERAL_DP_AUDIT_DELTA23_E2_ALL_LONG_BRANCH_ROOT_VALUE",
        "certificate": CERTIFICATE.name,
        "certificate_sha256": CERTIFICATE_SHA256,
        "immutable_input_hashes": actual_hashes,
        "independence_boundary": {
            "producer_engine": "closed two-long-path grade formulas plus compressed branch messages",
            "audit_engine": "fresh literal double-claw adjacency lists and recursive include/exclude forest DP",
            "shared_only": "canonical residual definition and claimed tensor layout/hash",
            "full_replay": "every ordered sample and every ordered Newton coefficient at both ranks",
        },
        "pair_sum_symbolic_rederivation": {
            "grades": "0..8",
            "rows": identity_rows,
            "all_exact_zero_differences": True,
        },
        "literal_split_and_side_reversal_checks": {
            "parameter_rows": len(split_rows),
            "literal_split_comparisons": sum(row["literal_split_comparisons"] for row in split_rows),
            "rows": split_rows,
        },
        "literal_tensor_replay": replay_rows,
        "coverage_totals": {
            "ranks": len(RANKS),
            "unique_literal_adjacency_profiles": literal_profile.cache_info().currsize,
            "literal_forest_dp_runs": 2 * literal_profile.cache_info().currsize,
            "ordered_sample_values_replayed": coefficient_count,
            "ordered_newton_coefficients_replayed": coefficient_count,
            "digest_mismatches": 0,
            "negative_newton_coefficients": 0,
        },
        "scope_guard": "Only Delta2/3 rooted values for either branch of an e=2 double claw with every pendant arm >=7 and bridge >=8. No leaf increment, new-leaf root, other root placement, short boundary, full e=2, or Problem 993 claim.",
    }
    atomic_json(OUTPUT, payload)
    print(payload["status"], flush=True)
    print("literal_profiles", literal_profile.cache_info().currsize, flush=True)
    print("ordered_coefficients", coefficient_count, flush=True)
    for row in replay_rows:
        print(
            "DELTA",
            row["rank"],
            row["literal_newton_coefficients"]["ordered_sha256"],
            flush=True,
        )
    print("source_sha256", sha256(Path(__file__)), flush=True)
    print("report_sha256", sha256(OUTPUT), flush=True)


if __name__ == "__main__":
    main()
