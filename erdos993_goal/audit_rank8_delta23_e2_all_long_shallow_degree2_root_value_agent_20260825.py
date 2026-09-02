#!/usr/bin/env python3
"""Independent symbolic and literal-DP audit of shallow e=2 degree-2 roots."""

from __future__ import annotations

import hashlib
import itertools
import json
import math
import os
from functools import lru_cache
from pathlib import Path

import sympy as sp
from sympy.core.cache import clear_cache

from verify_rank8_q8_terminal_reduction import c, h, newton_coefficients, residual


HERE = Path(__file__).resolve().parent
CERTIFICATE = HERE / "rank8_delta23_e2_all_long_shallow_degree2_root_value_exact_agent_20260825.json"
OUTPUT = HERE / "rank8_delta23_e2_all_long_shallow_degree2_root_value_independent_audit_agent_20260825.json"
CERTIFICATE_SHA256 = "E174AC1AC8A97F92CB3F8AFBF2E0B9CE4CF5A37E9613C88F5E1F7AC822A2D5BA"
LONG = "L"
MAX_GRADE = 8
RANKS = (2, 3)
DEGREE_BOUNDS = {2: 27, 3: 26}
PINNED = {
    "verify_rank8_q8_terminal_reduction.py":
        "389216D19951A28784C46E57393F1F9CD5BBE41625DCD317C664F701EC2EC4B7",
    "prove_rank8_delta23_e2_all_long_shallow_degree2_root_value_agent_20260825.py":
        "C87690BB5FD14BF754A91C924B05FECF137C0EEA19DE7706A43CD082D24D904A",
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


def append_path(adjacency: list[list[int]], start: int, length: int) -> list[int]:
    assert length >= 1
    vertices = []
    previous = start
    for _ in range(length):
        vertex = len(adjacency)
        adjacency.append([])
        adjacency[previous].append(vertex)
        adjacency[vertex].append(previous)
        vertices.append(vertex)
        previous = vertex
    return vertices


def literal_double_claw(
    left_a: int,
    left_b: int,
    bridge: int,
    right_a: int,
    right_b: int,
) -> tuple[list[list[int]], dict[str, object]]:
    adjacency: list[list[int]] = [[]]
    left_root = 0
    left_a_path = append_path(adjacency, left_root, left_a)
    left_b_path = append_path(adjacency, left_root, left_b)
    bridge_path = append_path(adjacency, left_root, bridge)
    right_root = bridge_path[-1]
    right_a_path = append_path(adjacency, right_root, right_a)
    right_b_path = append_path(adjacency, right_root, right_b)
    return adjacency, {
        "left_root": left_root,
        "right_root": right_root,
        "left_a": left_a_path,
        "left_b": left_b_path,
        "bridge": bridge_path,
        "right_a": right_a_path,
        "right_b": right_b_path,
    }


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


def checked_profile(
    adjacency: list[list[int]], root: int, order: int
) -> tuple[tuple[int, ...], tuple[int, ...]]:
    assert len(adjacency) == order and len(adjacency[root]) == 2
    core = forest_polynomial(adjacency, None)
    deletion = forest_polynomial(adjacency, root)
    assert core[0] == deletion[0] == 1
    assert core[1] == order and deletion[1] == order - 1
    assert core[2] == math.comb(order - 1, 2)
    assert core[3] == math.comb(order - 2, 3) + 2
    return core, deletion


def base(state: int | str) -> int:
    return 7 if state == LONG else int(state)


def bridge_patterns() -> list[tuple[int | str, int | str]]:
    states: tuple[int | str, ...] = (*range(7), LONG)
    rows = []
    for left_index, left in enumerate(states):
        for right in states[left_index:]:
            if left == right == LONG:
                continue
            if base(left) + base(right) >= 6:
                rows.append((left, right))
    assert len(rows) == 23
    return rows


def pendant_patterns() -> list[tuple[int | str, int | str]]:
    rows = []
    for near in (*range(7), LONG):
        for tail in (*range(1, 7), LONG):
            if near == tail == LONG:
                continue
            if base(near) + base(tail) >= 6:
                rows.append((near, tail))
    assert len(rows) == 40
    return rows


def active_count(family: str, pattern: tuple[int | str, int | str]) -> int:
    return 4 + sum(state == LONG for state in pattern)


def axis_and_balanced(total: int, width: int) -> list[tuple[int, ...]]:
    rows = []
    for axis in range(width):
        row = [0] * width
        row[axis] = total
        rows.append(tuple(row))
    balanced = [total // width] * width
    for index in range(total % width):
        balanced[index] += 1
    rows.append(tuple(balanced))
    return rows


@lru_cache(maxsize=65536)
def literal_bridge_profile(
    left_state: int | str,
    right_state: int | str,
    parameters: tuple[int, ...],
    reversed_orientation: bool = False,
) -> tuple[tuple[int, ...], tuple[int, ...]]:
    width = active_count("bridge", (left_state, right_state))
    assert len(parameters) == width
    A, B, C, D = parameters[:4]
    cursor = 4
    left_gap = base(left_state)
    right_gap = base(right_state)
    if left_state == LONG:
        left_gap += parameters[cursor]
        cursor += 1
    if right_state == LONG:
        right_gap += parameters[cursor]
        cursor += 1
    assert cursor == width
    if reversed_orientation:
        A, B, C, D = C, D, A, B
        left_gap, right_gap = right_gap, left_gap
    adjacency, paths = literal_double_claw(
        A + 7, B + 7, left_gap + right_gap + 2, C + 7, D + 7
    )
    root = paths["bridge"][left_gap]
    order = 31 + left_gap + right_gap + A + B + C + D
    return checked_profile(adjacency, root, order)


@lru_cache(maxsize=262144)
def literal_pendant_profile(
    near_state: int | str,
    tail_state: int | str,
    parameters: tuple[int, ...],
    selected_orbit: int,
) -> tuple[tuple[int, ...], tuple[int, ...]]:
    width = active_count("pendant", (near_state, tail_state))
    assert len(parameters) == width and selected_orbit in range(4)
    B, C, D, G = parameters[:4]
    cursor = 4
    near = base(near_state)
    tail = base(tail_state)
    if near_state == LONG:
        near += parameters[cursor]
        cursor += 1
    if tail_state == LONG:
        tail += parameters[cursor]
        cursor += 1
    assert cursor == width
    selected = near + tail + 1
    paired = B + 7
    far_a = C + 7
    far_b = D + 7
    bridge = G + 8
    if selected_orbit == 0:
        lengths = (selected, paired, bridge, far_a, far_b)
        path_name = "left_a"
    elif selected_orbit == 1:
        lengths = (paired, selected, bridge, far_a, far_b)
        path_name = "left_b"
    elif selected_orbit == 2:
        lengths = (far_a, far_b, bridge, selected, paired)
        path_name = "right_a"
    else:
        lengths = (far_a, far_b, bridge, paired, selected)
        path_name = "right_b"
    adjacency, paths = literal_double_claw(*lengths)
    root = paths[path_name][near]
    order = 31 + near + tail + B + C + D + G
    return checked_profile(adjacency, root, order)


def choose_polynomial(top: sp.Expr, grade: int) -> sp.Expr:
    if grade < 0:
        return sp.Integer(0)
    return sp.prod(top - shift for shift in range(grade)) / sp.factorial(grade)


def path_count(order: sp.Expr, grade: int) -> sp.Expr:
    if isinstance(order, (int, sp.Integer)):
        literal = int(order)
        if literal == -1:
            return sp.Integer(1 if grade == 0 else 0)
        assert literal >= 0
        top = literal - grade + 1
        return sp.Integer(sp.binomial(top, grade) if top >= grade >= 0 else 0)
    if order == -1:
        return sp.Integer(1 if grade == 0 else 0)
    return choose_polynomial(order - grade + 1, grade)


def path_vector(order: sp.Expr) -> tuple[sp.Expr, ...]:
    return tuple(path_count(order, grade) for grade in range(MAX_GRADE + 1))


def symbolic_add(*polynomials: tuple[sp.Expr, ...]) -> tuple[sp.Expr, ...]:
    return tuple(
        sp.expand(sum(polynomial[index] for polynomial in polynomials))
        for index in range(MAX_GRADE + 1)
    )


def symbolic_multiply(
    left: tuple[sp.Expr, ...], right: tuple[sp.Expr, ...]
) -> tuple[sp.Expr, ...]:
    return tuple(
        sp.expand(sum(left[index] * right[grade - index] for index in range(grade + 1)))
        for grade in range(MAX_GRADE + 1)
    )


def symbolic_product(*factors: tuple[sp.Expr, ...]) -> tuple[sp.Expr, ...]:
    answer = (sp.Integer(1),) + (sp.Integer(0),) * MAX_GRADE
    for factor in factors:
        answer = symbolic_multiply(answer, factor)
    return answer


def symbolic_shift(polynomial: tuple[sp.Expr, ...]) -> tuple[sp.Expr, ...]:
    return (sp.Integer(0),) + polynomial[:MAX_GRADE]


def direct_pair_states(
    first: sp.Expr, second: sp.Expr
) -> tuple[tuple[sp.Expr, ...], tuple[sp.Expr, ...]]:
    return (
        symbolic_product(path_vector(first), path_vector(second)),
        symbolic_shift(symbolic_product(path_vector(first - 1), path_vector(second - 1))),
    )


def symbolic_double_core(
    left0: tuple[sp.Expr, ...],
    left1: tuple[sp.Expr, ...],
    right0: tuple[sp.Expr, ...],
    right1: tuple[sp.Expr, ...],
    bridge: sp.Expr,
) -> tuple[sp.Expr, ...]:
    return symbolic_add(
        symbolic_product(left0, right0, path_vector(bridge - 1)),
        symbolic_product(left1, right0, path_vector(bridge - 2)),
        symbolic_product(left0, right1, path_vector(bridge - 2)),
        symbolic_product(left1, right1, path_vector(bridge - 3)),
    )


def symbolic_claw(
    pair0: tuple[sp.Expr, ...], pair1: tuple[sp.Expr, ...], third: sp.Expr
) -> tuple[sp.Expr, ...]:
    return symbolic_add(
        symbolic_product(pair0, path_vector(third)),
        symbolic_product(pair1, path_vector(third - 1)),
    )


def direct_symbolic_profile(
    family: str, pattern: tuple[int | str, int | str]
) -> tuple[tuple[sp.Symbol, ...], tuple[sp.Expr, ...], tuple[sp.Expr, ...]]:
    if family == "bridge":
        left_state, right_state = pattern
        A, B, C, D = sp.symbols("aA aB aC aD", nonnegative=True, integer=True)
        variables = [A, B, C, D]
        GL, GR = sp.symbols("aGL aGR", nonnegative=True, integer=True)
        left_gap = sp.Integer(base(left_state))
        right_gap = sp.Integer(base(right_state))
        if left_state == LONG:
            variables.append(GL)
            left_gap += GL
        if right_state == LONG:
            variables.append(GR)
            right_gap += GR
        left0, left1 = direct_pair_states(A + 7, B + 7)
        right0, right1 = direct_pair_states(C + 7, D + 7)
        core = symbolic_double_core(
            left0, left1, right0, right1, left_gap + right_gap + 2
        )
        deletion = symbolic_product(
            symbolic_claw(left0, left1, left_gap),
            symbolic_claw(right0, right1, right_gap),
        )
        return tuple(variables), core, deletion

    if family == "pendant":
        near_state, tail_state = pattern
        B, C, D, G = sp.symbols("pB pC pD pG", nonnegative=True, integer=True)
        variables = [B, C, D, G]
        N, U = sp.symbols("pN pU", nonnegative=True, integer=True)
        near = sp.Integer(base(near_state))
        tail = sp.Integer(base(tail_state))
        if near_state == LONG:
            variables.append(N)
            near += N
        if tail_state == LONG:
            variables.append(U)
            tail += U
        left0, left1 = direct_pair_states(near + tail + 1, B + 7)
        right0, right1 = direct_pair_states(C + 7, D + 7)
        core = symbolic_double_core(left0, left1, right0, right1, G + 8)
        central_left0, central_left1 = direct_pair_states(near, B + 7)
        central = symbolic_double_core(
            central_left0, central_left1, right0, right1, G + 8
        )
        deletion = symbolic_product(path_vector(tail), central)
        return tuple(variables), core, deletion
    raise ValueError(family)


def audit_symbolic_translation(
    family: str, pattern: tuple[int | str, int | str]
) -> dict[str, object]:
    variables, core, deletion = direct_symbolic_profile(family, pattern)
    T = sp.symbols("audit_T", nonnegative=True, integer=True)
    substitution = {variable: 0 for variable in variables}
    substitution[variables[0]] = T
    reference_core = tuple(sp.expand(value.subs(substitution)) for value in core)
    reference_deletion = tuple(sp.expand(value.subs(substitution)) for value in deletion)
    total = sum(variables)
    checked = []
    for label, actual, expected in [
        *[(f"c{grade}", core[grade], reference_core[grade]) for grade in range(MAX_GRADE + 1)],
        ("h6", deletion[6], reference_deletion[6]),
        ("h7", deletion[7], reference_deletion[7]),
    ]:
        difference = sp.Poly(
            sp.expand(actual - expected.subs(T, total)), *variables, domain=sp.QQ
        )
        assert difference.is_zero, (family, pattern, label, difference.terms()[:3])
        checked.append(label)
    return {
        "family": family,
        "pattern": list(pattern),
        "original_variables": [str(variable) for variable in variables],
        "total_offset": str(total),
        "zero_profile_differences": checked,
    }


def rank_terms(rank: int) -> tuple[tuple[int, tuple[tuple[int, int], ...]], ...]:
    variables = (*c[:9], h[6], h[7])
    raw = sp.Poly(newton_coefficients(residual())[rank], *variables, domain=sp.QQ).terms()
    rows = []
    for monomial, coefficient in raw:
        assert coefficient.q == 1
        rows.append(
            (
                int(coefficient),
                tuple(
                    (index, exponent)
                    for index, exponent in enumerate(monomial)
                    if exponent
                ),
            )
        )
    return tuple(rows)


TERMS = {rank: rank_terms(rank) for rank in RANKS}


def evaluate(rank: int, profile: tuple[tuple[int, ...], tuple[int, ...]]) -> int:
    core, deletion = profile
    values = (*core, deletion[6], deletion[7])
    answer = 0
    for coefficient, factors in TERMS[rank]:
        term = coefficient
        for index, exponent in factors:
            term *= values[index] ** exponent
        answer += term
    return answer


def digest_lines(values: list[object]) -> str:
    digest = hashlib.sha256()
    for value in values:
        digest.update(str(value).encode("ascii"))
        digest.update(b"\n")
    return digest.hexdigest().upper()


def forward_differences(values: list[int]) -> list[int]:
    work = list(values)
    coefficients = []
    while work:
        coefficients.append(work[0])
        work = [work[index + 1] - work[index] for index in range(len(work) - 1)]
    return coefficients


def power_from_newton(newton: list[int]) -> list[sp.Rational]:
    T = sp.symbols("literal_T")
    expression = sum(
        coefficient * choose_polynomial(T, order)
        for order, coefficient in enumerate(newton)
    )
    polynomial = sp.Poly(sp.expand(expression), T, domain=sp.QQ)
    return [sp.Rational(polynomial.nth(degree)) for degree in range(len(newton))]


def stored_key(case: dict[str, object]) -> tuple[str, tuple[object, ...], int]:
    return case["family"], tuple(case["pattern"]), case["rank"]


def literal_reference(
    family: str, pattern: tuple[int | str, int | str], total: int
) -> tuple[tuple[int, ...], tuple[int, ...]]:
    width = active_count(family, pattern)
    parameters = (total,) + (0,) * (width - 1)
    if family == "bridge":
        return literal_bridge_profile(*pattern, parameters)
    return literal_pendant_profile(*pattern, parameters, 0)


def audit_literal_pattern(
    family: str,
    pattern: tuple[int | str, int | str],
    stored: dict[tuple[str, tuple[object, ...], int], dict[str, object]],
) -> dict[str, object]:
    width = active_count(family, pattern)
    comparisons = 0
    for total in range(28):
        reference = literal_reference(family, pattern, total)
        for parameters in axis_and_balanced(total, width):
            if family == "bridge":
                assert literal_bridge_profile(*pattern, parameters) == reference
                assert literal_bridge_profile(*pattern, parameters, True) == reference
                comparisons += 2
            else:
                for orbit in range(4):
                    assert literal_pendant_profile(*pattern, parameters, orbit) == reference
                    comparisons += 1

    replay_rows = []
    for rank in RANKS:
        case = stored[(family, pattern, rank)]
        sample_width = DEGREE_BOUNDS[rank] + 1
        samples = [
            evaluate(rank, literal_reference(family, pattern, total))
            for total in range(sample_width)
        ]
        newton = forward_differences(samples)
        power = power_from_newton(newton)
        records = {
            "sample_values": {
                "negative": sum(value < 0 for value in samples),
                "zero": sum(value == 0 for value in samples),
                "positive": sum(value > 0 for value in samples),
                "origin": str(samples[0]),
                "minimum": str(min(samples)),
                "ordered_sha256": digest_lines(samples),
            },
            "newton_coefficients": {
                "negative": sum(value < 0 for value in newton),
                "zero": sum(value == 0 for value in newton),
                "positive": sum(value > 0 for value in newton),
                "origin": str(newton[0]),
                "minimum": str(min(newton)),
                "ordered_sha256": digest_lines(newton),
            },
            "power_coefficients": {
                "negative": sum(bool(value < 0) for value in power),
                "zero": sum(bool(value == 0) for value in power),
                "positive": sum(bool(value > 0) for value in power),
                "origin": str(power[0]),
                "minimum": str(min(power)),
                "ordered_sha256": digest_lines(power),
            },
        }
        for name, record in records.items():
            assert record == case[name], (family, pattern, rank, name, record, case[name])
        replay_rows.append(
            {
                "rank": rank,
                "sample_sha256": records["sample_values"]["ordered_sha256"],
                "newton_sha256": records["newton_coefficients"]["ordered_sha256"],
                "power_sha256": records["power_coefficients"]["ordered_sha256"],
                "digest_match": True,
            }
        )
    return {
        "family": family,
        "pattern": list(pattern),
        "active_original_offsets": width,
        "literal_profile_comparisons": comparisons,
        "ordered_replay": replay_rows,
    }


def main() -> None:
    actual_hashes = {name: sha256(HERE / name) for name in PINNED}
    assert actual_hashes == PINNED, (actual_hashes, PINNED)
    assert sha256(CERTIFICATE) == CERTIFICATE_SHA256
    certificate = json.loads(CERTIFICATE.read_text(encoding="utf-8"))
    assert certificate["status"] == "PASS_EXACT_DELTA23_E2_ALL_LONG_SHALLOW_DEGREE2_ROOT_VALUE"
    assert certificate["coverage_totals"]["root_patterns"] == 63
    assert certificate["coverage_totals"]["rank_cells"] == 126
    stored = {stored_key(case): case for case in certificate["cases"]}
    assert len(stored) == 126

    symbolic_rows = []
    literal_rows = []
    progress = 0
    for family, patterns in (("bridge", bridge_patterns()), ("pendant", pendant_patterns())):
        for pattern in patterns:
            symbolic_rows.append(audit_symbolic_translation(family, pattern))
            literal_rows.append(audit_literal_pattern(family, pattern, stored))
            progress += 1
            print("AUDIT_SHALLOW", progress, 63, family, pattern, flush=True)
            clear_cache()

    assert len(symbolic_rows) == len(literal_rows) == 63
    comparisons = sum(row["literal_profile_comparisons"] for row in literal_rows)
    assert sum(len(row["zero_profile_differences"]) for row in symbolic_rows) == 693
    assert sum(len(row["ordered_replay"]) for row in literal_rows) == 126

    payload = {
        "schema": "rank8-delta23-e2-all-long-shallow-degree2-root-value-independent-audit-v1",
        "status": "PASS_INDEPENDENT_LITERAL_DP_AUDIT_DELTA23_E2_ALL_LONG_SHALLOW_DEGREE2_ROOT_VALUE",
        "certificate": CERTIFICATE.name,
        "certificate_sha256": CERTIFICATE_SHA256,
        "immutable_input_hashes": actual_hashes,
        "independence_boundary": {
            "producer": "long-pair sum compression and symbolic total-offset rays",
            "audit_symbolic": "direct original A,B,C,D path products with explicit short gaps",
            "audit_literal": "fresh adjacency lists, actual bridge/pendant root vertices, recursive include/exclude forest DP",
            "shared_only": "canonical residual and stored ordered digests",
        },
        "symbolic_translation_replay": symbolic_rows,
        "literal_orbit_and_digest_replay": literal_rows,
        "coverage_totals": {
            "bridge_patterns": 23,
            "pendant_patterns": 40,
            "root_patterns": 63,
            "rank_cells": 126,
            "exact_profile_translation_identities": 693,
            "literal_profile_comparisons": comparisons,
            "logical_literal_forest_dp_runs": 2 * comparisons,
            "ordered_samples_replayed": 3465,
            "ordered_newton_coefficients_replayed": 3465,
            "ordered_power_coefficients_replayed": 3465,
            "digest_mismatches": 0,
            "negative_coefficients": 0,
        },
        "scope_guard": "Only Delta2/3 rooted VALUE at all-long e=2 shallow degree-2 roots. Leaves, increments, short source edges, the full e=2 layer, and Problem 993 are not claimed.",
    }
    atomic_json(OUTPUT, payload)
    print(payload["status"], flush=True)
    print("profile_identities", payload["coverage_totals"]["exact_profile_translation_identities"], flush=True)
    print("literal_comparisons", comparisons, flush=True)
    print("source_sha256", sha256(Path(__file__)), flush=True)
    print("report_sha256", sha256(OUTPUT), flush=True)


if __name__ == "__main__":
    main()
