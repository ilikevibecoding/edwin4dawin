#!/usr/bin/env python3
"""Exact Delta2/3 all-long e=2 shallow degree-2 root certificate.

The root-position partition has 23 bridge patterns (up to side reversal) and
40 oriented pendant patterns.  Fixed short gaps are finite; every remaining
long offset translates into one total offset T.  This script proves all rooted
profile translations through grade eight and records complete ordered sample,
Newton, and power coefficient digests.
"""

from __future__ import annotations

import hashlib
import json
import os
from pathlib import Path

import sympy as sp
from sympy.core.cache import clear_cache

from verify_rank8_q8_terminal_reduction import c, h, newton_coefficients, residual


HERE = Path(__file__).resolve().parent
OUTPUT = HERE / "rank8_delta23_e2_all_long_shallow_degree2_root_value_exact_agent_20260825.json"
LONG = "L"
MAX_GRADE = 8
RANKS = (2, 3)
DEGREE_BOUNDS = {2: 27, 3: 26}
ACTUAL_DEGREES = {2: 26, 3: 25}
PINNED = {
    "verify_rank8_q8_terminal_reduction.py":
        "389216D19951A28784C46E57393F1F9CD5BBE41625DCD317C664F701EC2EC4B7",
    "rank8_delta23_e2_all_long_deep_degree2_root_value_gate_exact_agent_20260825.json":
        "9109C73747463308BD4FC03845CEF33A7DB350F7D5A758EDA58E10B86550F24B",
    "rank8_delta2_e2_bridge_all_long_arms_gap_cells_exact_20260820.json":
        "8826E88AB861F06731C7C8F6A913F6F27E54FC869EB8F48B53B8EE5053247C09",
    "rank8_delta2_e2_pendant_other_edges_long_root_position_cells_exact_20260820.json":
        "67DCD9E51D238DEDFDB29D51E4136E0542B46AB3D1073B8B2BD0DEE1E676F41D",
    "rank8_delta3_e2_bridge_internal_mixed_newton_exact_root_20260823.json":
        "17F42A1949352FBD9A0C2E48529F02730ABE772335E2235412D44D935A99291F",
    "rank8_delta3_e2_pendant_mixed_newton_exact_root_20260823.json":
        "AD7F2A669C7E6A4BAC2937D3C4E6A2B8BA52B8872D0C65B0C86899EC81B09D72",
}


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def atomic_json(path: Path, payload: dict[str, object]) -> None:
    temporary = path.with_suffix(path.suffix + ".tmp")
    temporary.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    os.replace(temporary, path)


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


def two_long_paths(total_order: sp.Expr, grade: int) -> sp.Expr:
    if grade < 0:
        return sp.Integer(0)
    return sp.expand(
        sum(
            path_count(total_order - 4 * selected_pairs, grade - 2 * selected_pairs)
            for selected_pairs in range(grade // 2 + 1)
        )
    )


def long_pair_states(offset_sum: sp.Expr) -> tuple[tuple[sp.Expr, ...], tuple[sp.Expr, ...]]:
    excluded = tuple(
        two_long_paths(offset_sum + 14, grade)
        for grade in range(MAX_GRADE + 1)
    )
    included = (sp.Integer(0),) + tuple(
        two_long_paths(offset_sum + 12, grade - 1)
        for grade in range(1, MAX_GRADE + 1)
    )
    return excluded, included


def add(*polynomials: tuple[sp.Expr, ...]) -> tuple[sp.Expr, ...]:
    return tuple(
        sp.expand(sum(polynomial[index] for polynomial in polynomials))
        for index in range(MAX_GRADE + 1)
    )


def multiply(
    left: tuple[sp.Expr, ...], right: tuple[sp.Expr, ...]
) -> tuple[sp.Expr, ...]:
    return tuple(
        sp.expand(sum(left[index] * right[grade - index] for index in range(grade + 1)))
        for grade in range(MAX_GRADE + 1)
    )


def product(*factors: tuple[sp.Expr, ...]) -> tuple[sp.Expr, ...]:
    answer = (sp.Integer(1),) + (sp.Integer(0),) * MAX_GRADE
    for factor in factors:
        answer = multiply(answer, factor)
    return answer


def shift(polynomial: tuple[sp.Expr, ...]) -> tuple[sp.Expr, ...]:
    return (sp.Integer(0),) + polynomial[:MAX_GRADE]


def direct_pair_states(
    first_length: sp.Expr, second_length: sp.Expr
) -> tuple[tuple[sp.Expr, ...], tuple[sp.Expr, ...]]:
    return (
        product(path_vector(first_length), path_vector(second_length)),
        shift(product(path_vector(first_length - 1), path_vector(second_length - 1))),
    )


def double_core(
    left0: tuple[sp.Expr, ...],
    left1: tuple[sp.Expr, ...],
    right0: tuple[sp.Expr, ...],
    right1: tuple[sp.Expr, ...],
    bridge: sp.Expr,
) -> tuple[sp.Expr, ...]:
    return add(
        product(left0, right0, path_vector(bridge - 1)),
        product(left1, right0, path_vector(bridge - 2)),
        product(left0, right1, path_vector(bridge - 2)),
        product(left1, right1, path_vector(bridge - 3)),
    )


def claw(
    pair0: tuple[sp.Expr, ...],
    pair1: tuple[sp.Expr, ...],
    third_arm: sp.Expr,
) -> tuple[sp.Expr, ...]:
    return add(
        product(pair0, path_vector(third_arm)),
        product(pair1, path_vector(third_arm - 1)),
    )


def bridge_patterns() -> list[tuple[int | str, int | str]]:
    states: tuple[int | str, ...] = (*range(7), LONG)
    rows = []
    for left_index, left in enumerate(states):
        for right in states[left_index:]:
            if left == right == LONG:
                continue
            left_base = 7 if left == LONG else int(left)
            right_base = 7 if right == LONG else int(right)
            if left_base + right_base >= 6:
                rows.append((left, right))
    assert len(rows) == 23
    return rows


def pendant_patterns() -> list[tuple[int | str, int | str]]:
    near_states: tuple[int | str, ...] = (*range(7), LONG)
    tail_states: tuple[int | str, ...] = (*range(1, 7), LONG)
    rows = []
    for near in near_states:
        for tail in tail_states:
            if near == tail == LONG:
                continue
            near_base = 7 if near == LONG else int(near)
            tail_base = 7 if tail == LONG else int(tail)
            if near_base + tail_base >= 6:
                rows.append((near, tail))
    assert len(rows) == 40
    return rows


def state_value(state: int | str, symbol: sp.Symbol) -> sp.Expr:
    return symbol + 7 if state == LONG else sp.Integer(state)


def bridge_profile(
    pattern: tuple[int | str, int | str]
) -> tuple[tuple[sp.Symbol, ...], tuple[sp.Expr, ...], tuple[sp.Expr, ...], int]:
    left_state, right_state = pattern
    SL, SR = sp.symbols("SL SR", nonnegative=True, integer=True)
    variables = [SL, SR]
    left_extra = sp.symbols("GL", nonnegative=True, integer=True)
    right_extra = sp.symbols("GR", nonnegative=True, integer=True)
    if left_state == LONG:
        variables.append(left_extra)
    if right_state == LONG:
        variables.append(right_extra)
    left_gap = state_value(left_state, left_extra)
    right_gap = state_value(right_state, right_extra)
    left0, left1 = long_pair_states(SL)
    right0, right1 = long_pair_states(SR)
    bridge = left_gap + right_gap + 2
    core = double_core(left0, left1, right0, right1, bridge)
    deletion = product(
        claw(left0, left1, left_gap),
        claw(right0, right1, right_gap),
    )
    baseline = 31 + int(7 if left_state == LONG else left_state) + int(
        7 if right_state == LONG else right_state
    )
    return tuple(variables), core, deletion, baseline


def pendant_profile(
    pattern: tuple[int | str, int | str]
) -> tuple[tuple[sp.Symbol, ...], tuple[sp.Expr, ...], tuple[sp.Expr, ...], int]:
    near_state, tail_state = pattern
    B, SR, G = sp.symbols("B SR G", nonnegative=True, integer=True)
    variables = [B, SR, G]
    near_extra = sp.symbols("N", nonnegative=True, integer=True)
    tail_extra = sp.symbols("U", nonnegative=True, integer=True)
    if near_state == LONG:
        variables.append(near_extra)
    if tail_state == LONG:
        variables.append(tail_extra)
    near = state_value(near_state, near_extra)
    tail = state_value(tail_state, tail_extra)
    selected_offset = near + tail - 6
    left0, left1 = long_pair_states(selected_offset + B)
    right0, right1 = long_pair_states(SR)
    bridge = G + 8
    core = double_core(left0, left1, right0, right1, bridge)

    central_left0, central_left1 = direct_pair_states(near, B + 7)
    central = double_core(
        central_left0, central_left1, right0, right1, bridge
    )
    deletion = product(path_vector(tail), central)
    baseline = 31 + int(7 if near_state == LONG else near_state) + int(
        7 if tail_state == LONG else tail_state
    )
    return tuple(variables), core, deletion, baseline


def prove_univariate_profile(
    family: str,
    pattern: tuple[int | str, int | str],
) -> tuple[sp.Symbol, tuple[sp.Expr, ...], tuple[sp.Expr, ...], dict[str, object]]:
    if family == "bridge":
        variables, core, deletion, baseline = bridge_profile(pattern)
    elif family == "pendant":
        variables, core, deletion, baseline = pendant_profile(pattern)
    else:
        raise ValueError(family)
    T = sp.symbols("T", nonnegative=True, integer=True)
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
    order = baseline + T
    assert sp.expand(reference_core[0] - 1) == 0
    assert sp.expand(reference_core[1] - order) == 0
    assert sp.expand(reference_deletion[1] - (order - 1)) == 0
    assert sp.expand(reference_core[2] - choose_polynomial(order - 1, 2)) == 0
    assert sp.expand(reference_core[3] - (choose_polynomial(order - 2, 3) + 2)) == 0
    return T, reference_core, reference_deletion, {
        "variables": [str(variable) for variable in variables],
        "total_offset": str(total),
        "baseline_order": baseline,
        "profile_zero_identities": checked,
    }


def rank_terms(rank: int) -> tuple[tuple[int, tuple[tuple[int, int], ...]], ...]:
    variables = (*c[:9], h[6], h[7])
    raw = sp.Poly(newton_coefficients(residual())[rank], *variables, domain=sp.QQ).terms()
    assert len(raw) == {2: 22, 3: 26}[rank]
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


def residual_polynomial(
    rank: int,
    T: sp.Symbol,
    core: tuple[sp.Expr, ...],
    deletion: tuple[sp.Expr, ...],
) -> sp.Poly:
    values = (*core, deletion[6], deletion[7])
    expression = sp.Integer(0)
    for coefficient, factors in TERMS[rank]:
        term = sp.Integer(coefficient)
        for index, exponent in factors:
            term *= values[index] ** exponent
        expression += term
    result = sp.Poly(sp.expand(expression), T, domain=sp.QQ)
    assert result.degree() == ACTUAL_DEGREES[rank]
    return result


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


def certify_case(
    family: str,
    pattern: tuple[int | str, int | str],
    rank: int,
    T: sp.Symbol,
    core: tuple[sp.Expr, ...],
    deletion: tuple[sp.Expr, ...],
    profile: dict[str, object],
) -> dict[str, object]:
    polynomial = residual_polynomial(rank, T, core, deletion)
    width = DEGREE_BOUNDS[rank] + 1
    samples = [int(polynomial.eval(offset)) for offset in range(width)]
    newton = forward_differences(samples)
    power = [sp.Rational(polynomial.nth(degree)) for degree in range(width)]
    assert all(value >= 0 for value in newton) and newton[0] > 0
    assert all(value >= 0 for value in power) and power[0] > 0
    assert newton[-1] == power[-1] == 0
    return {
        "family": family,
        "pattern": list(pattern),
        "cell_id": f"{family[0].upper()}:{pattern[0]},{pattern[1]}",
        "rank": rank,
        **profile,
        "degree_bound": DEGREE_BOUNDS[rank],
        "actual_degree": polynomial.degree(),
        "entries": width,
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


def main() -> None:
    actual_hashes = {name: sha256(HERE / name) for name in PINNED}
    assert actual_hashes == PINNED, (actual_hashes, PINNED)
    patterns = {
        "bridge": bridge_patterns(),
        "pendant": pendant_patterns(),
    }
    cases = []
    progress = 0
    for family in ("bridge", "pendant"):
        for pattern in patterns[family]:
            T, core, deletion, profile = prove_univariate_profile(family, pattern)
            for rank in RANKS:
                cases.append(
                    certify_case(family, pattern, rank, T, core, deletion, profile)
                )
            progress += 1
            print("SHALLOW_PROFILE", progress, 63, family, pattern, flush=True)
            clear_cache()

    assert len(cases) == 126
    assert all(case["newton_coefficients"]["negative"] == 0 for case in cases)
    assert all(int(case["newton_coefficients"]["origin"]) > 0 for case in cases)
    assert sum(case["entries"] for case in cases) == 63 * 55

    payload = {
        "schema": "rank8-delta23-e2-all-long-shallow-degree2-root-value-v1",
        "status": "PASS_EXACT_DELTA23_E2_ALL_LONG_SHALLOW_DEGREE2_ROOT_VALUE",
        "exact_scope": {
            "tree": "e=2 double claw with all four pendant arms >=7 and branch bridge >=8",
            "shallow_bridge": "degree-2 bridge root with at least one root-to-branch edge distance <=7",
            "shallow_pendant": "degree-2 pendant root with root-to-branch edge distance <=7 or root-to-leaf edge distance <=6",
            "ranks": [2, 3],
            "orders": "every admissible order n>=37 within these patterns",
            "claim": "strict positivity of the rooted rank-eight residual VALUE",
        },
        "partition": {
            "bridge_gap_definition": "gap=edge distance minus 1",
            "bridge_states": "fixed gaps 0..6 or long 7+X, unordered by side reversal; exclude long/long deep cell and impose gap sum>=6",
            "bridge_patterns": len(patterns["bridge"]),
            "pendant_near_definition": "near=root-to-branch distance minus 1",
            "pendant_tail_definition": "tail=root-to-leaf distance",
            "pendant_states": "near fixed 0..6 or long 7+N; tail fixed 1..6 or long 7+U; exclude long/long deep cell and impose near+tail>=6",
            "pendant_patterns": len(patterns["pendant"]),
            "total_patterns": 63,
            "pairwise_disjoint": True,
            "exhausts_shallow_degree2_roots": True,
        },
        "translation": {
            "profile_coordinates": "c0..c8,h6,h7",
            "zero_identities_per_pattern": 11,
            "total_zero_identities": 63 * 11,
            "ray_coordinate": "T=sum of all active long arm/gap offsets",
            "order_on_ray": "n=baseline_order+T",
        },
        "immutable_input_hashes": actual_hashes,
        "cases": cases,
        "coverage_totals": {
            "bridge_patterns": 23,
            "pendant_patterns": 40,
            "root_patterns": 63,
            "rank_cells": 126,
            "profile_translation_identities": 693,
            "ordered_sample_values": 3465,
            "ordered_newton_coefficients": 3465,
            "ordered_power_coefficients": 3465,
            "negative_newton_coefficients": 0,
            "all_origins_strictly_positive": True,
        },
        "not_claimed": [
            "no degree-1 leaf root",
            "no leaf-extension increment or inserted-new-leaf value",
            "no short pendant arm or branch bridge outside the all-long source class",
            "no complete e=2 layer or Problem 993 theorem",
        ],
    }
    atomic_json(OUTPUT, payload)
    print(payload["status"], flush=True)
    print("patterns", payload["coverage_totals"]["root_patterns"], flush=True)
    print("rank_cells", payload["coverage_totals"]["rank_cells"], flush=True)
    print("source_sha256", sha256(Path(__file__)), flush=True)
    print("report_sha256", sha256(OUTPUT), flush=True)


if __name__ == "__main__":
    main()
