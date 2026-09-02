#!/usr/bin/env python3
"""Exact Delta2/3 value certificate for every all-long deep degree-2 root.

Two legacy all-long cells describe a root deep inside the branch bridge and a
root deep inside a pendant arm.  This producer proves, at the complete rooted
profile level through grade eight, that both cells are the same univariate
profile as a function of T=n-45.  It then records ordered sample, Newton, and
power-basis coefficient digests for Delta2 and Delta3.

No leaf-extension increment is considered here.
"""

from __future__ import annotations

import hashlib
import json
import os
from pathlib import Path

import sympy as sp

from verify_rank8_q8_terminal_reduction import c, h, newton_coefficients, residual


HERE = Path(__file__).resolve().parent
OUTPUT = HERE / "rank8_delta23_e2_all_long_deep_degree2_root_value_exact_agent_20260825.json"
MAX_GRADE = 8
RANKS = (2, 3)
DEGREE_BOUNDS = {2: 27, 3: 26}
ACTUAL_DEGREES = {2: 26, 3: 25}
PINNED = {
    "verify_rank8_q8_terminal_reduction.py":
        "389216D19951A28784C46E57393F1F9CD5BBE41625DCD317C664F701EC2EC4B7",
    "rank8_delta2_e2_bridge_interior_symmetric_long_exact_20260820.json":
        "82D505176D8CB949C2C93B9F9124470F7816B89EF0C35C7B438D494581DA1ABB",
    "rank8_delta3_e2_bridge_interior_symmetric_long_exact_20260820.json":
        "BE38D03793225600A374592CCB11AD529EAB7443E5C599231834C531DF336E93",
    "rank8_delta2_e2_pendant_symmetric_long_exact_20260820.json":
        "F53798E4748FA70D769BABA8AE4DD21A2D16BE8D2ADEF49E8D33F30F0247DE11",
    "rank8_delta3_e2_pendant_symmetric_long_exact_20260820.json":
        "E3DA855160CC5A4CEA00D6219C4C01CA466CD3E085BC62690A08D4E5D55BBE59",
    "rank8_delta23_e2_all_long_branch_root_value_gate_exact_agent_20260825.json":
        "F98877F5E1B91C5A64A77A3D97868FC37342DEEF92E74959E4BEA2A4ECEF0E5B",
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


def pair_states(offset_sum: sp.Expr) -> tuple[tuple[sp.Expr, ...], tuple[sp.Expr, ...]]:
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
        sp.expand(sum(left[i] * right[grade - i] for i in range(grade + 1)))
        for grade in range(MAX_GRADE + 1)
    )


def product(*polynomials: tuple[sp.Expr, ...]) -> tuple[sp.Expr, ...]:
    answer = (sp.Integer(1),) + (sp.Integer(0),) * MAX_GRADE
    for polynomial in polynomials:
        answer = multiply(answer, polynomial)
    return answer


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


def bridge_profiles() -> tuple[
    tuple[sp.Symbol, ...], tuple[sp.Expr, ...], tuple[sp.Expr, ...]
]:
    SL, SR, N, M = sp.symbols("SL SR N M", nonnegative=True, integer=True)
    left0, left1 = pair_states(SL)
    right0, right1 = pair_states(SR)
    bridge = N + M + 16
    core = double_core(left0, left1, right0, right1, bridge)
    deletion = product(claw(left0, left1, N + 7), claw(right0, right1, M + 7))
    return (SL, SR, N, M), core, deletion


def pendant_profiles() -> tuple[
    tuple[sp.Symbol, ...], tuple[sp.Expr, ...], tuple[sp.Expr, ...]
]:
    X, U, SR, G = sp.symbols("X U SR G", nonnegative=True, integer=True)
    left0, left1 = pair_states(X + U + 8)
    right0, right1 = pair_states(SR)
    bridge = G + 8
    core = double_core(left0, left1, right0, right1, bridge)

    central_left0, central_left1 = pair_states(X)
    central_right0, central_right1 = pair_states(SR)
    central = double_core(
        central_left0,
        central_left1,
        central_right0,
        central_right1,
        bridge,
    )
    deletion = product(path_vector(U + 7), central)
    return (X, U, SR, G), core, deletion


def profile_digest(T: sp.Symbol, core: tuple[sp.Expr, ...], deletion: tuple[sp.Expr, ...]) -> str:
    digest = hashlib.sha256()
    for label, expression in [
        *[(f"c{grade}", core[grade]) for grade in range(MAX_GRADE + 1)],
        ("h6", deletion[6]),
        ("h7", deletion[7]),
    ]:
        polynomial = sp.Poly(expression, T, domain=sp.QQ)
        for degree in range(MAX_GRADE + 1):
            digest.update(f"{label}|{degree}|{polynomial.nth(degree)}\n".encode("ascii"))
    return digest.hexdigest().upper()


def prove_translation() -> tuple[
    sp.Symbol,
    tuple[sp.Expr, ...],
    tuple[sp.Expr, ...],
    dict[str, object],
]:
    bridge_variables, bridge_core, bridge_deletion = bridge_profiles()
    pendant_variables, pendant_core, pendant_deletion = pendant_profiles()
    T = sp.symbols("T", nonnegative=True, integer=True)
    SL, SR, N, M = bridge_variables
    reference_substitution = {SL: T, SR: 0, N: 0, M: 0}
    reference_core = tuple(sp.expand(value.subs(reference_substitution)) for value in bridge_core)
    reference_deletion = tuple(
        sp.expand(value.subs(reference_substitution)) for value in bridge_deletion
    )

    rows = []
    for family, variables, core, deletion in (
        ("deep_bridge", bridge_variables, bridge_core, bridge_deletion),
        ("deep_pendant", pendant_variables, pendant_core, pendant_deletion),
    ):
        total = sum(variables)
        checks = []
        for label, actual, expected in [
            *[(f"c{grade}", core[grade], reference_core[grade]) for grade in range(MAX_GRADE + 1)],
            ("h6", deletion[6], reference_deletion[6]),
            ("h7", deletion[7], reference_deletion[7]),
        ]:
            difference = sp.Poly(
                sp.expand(actual - expected.subs(T, total)), *variables, domain=sp.QQ
            )
            assert difference.is_zero
            checks.append({"coordinate": label, "difference_is_zero": True})
        rows.append(
            {
                "family": family,
                "variables": [str(variable) for variable in variables],
                "total_offset": str(total),
                "checks": checks,
            }
        )

    order = 45 + T
    assert sp.expand(reference_core[0] - 1) == 0
    assert sp.expand(reference_core[1] - order) == 0
    assert sp.expand(reference_deletion[1] - (order - 1)) == 0
    assert sp.expand(reference_core[2] - choose_polynomial(order - 1, 2)) == 0
    assert sp.expand(reference_core[3] - (choose_polynomial(order - 2, 3) + 2)) == 0
    return T, reference_core, reference_deletion, {
        "families": rows,
        "profile_coordinates_checked_per_family": 11,
        "total_exact_zero_identities": 22,
        "reference_profile_power_sha256": profile_digest(T, reference_core, reference_deletion),
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
    weights = tuple(range(9)) + (6, 7)
    assert max(
        sum(weights[index] * exponent for index, exponent in factors)
        for _coefficient, factors in rows
    ) == DEGREE_BOUNDS[rank]
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


def digest_lines(lines: list[str]) -> str:
    digest = hashlib.sha256()
    for line in lines:
        digest.update(line.encode("ascii"))
        digest.update(b"\n")
    return digest.hexdigest().upper()


def forward_differences(values: list[int]) -> list[int]:
    work = list(values)
    coefficients = []
    while work:
        coefficients.append(work[0])
        work = [work[index + 1] - work[index] for index in range(len(work) - 1)]
    return coefficients


def certify_rank(
    rank: int,
    T: sp.Symbol,
    core: tuple[sp.Expr, ...],
    deletion: tuple[sp.Expr, ...],
) -> dict[str, object]:
    polynomial = residual_polynomial(rank, T, core, deletion)
    degree_bound = DEGREE_BOUNDS[rank]
    samples = [int(polynomial.eval(offset)) for offset in range(degree_bound + 1)]
    newton = forward_differences(samples)
    power = [sp.Rational(polynomial.nth(degree)) for degree in range(degree_bound + 1)]
    assert all(value >= 0 for value in newton)
    assert newton[0] > 0
    assert all(value >= 0 for value in power)
    assert power[0] > 0
    assert newton[-1] == 0 and power[-1] == 0

    legacy = {}
    for family in ("bridge_interior", "pendant"):
        name = f"rank8_delta{rank}_e2_{family}_symmetric_long_exact_20260820.json"
        report = json.loads((HERE / name).read_text(encoding="utf-8"))
        assert report["status"] == "PASS_POSITIVE_SYMMETRIC_COEFFICIENT_CELL"
        assert report["negative_coefficients"] == 0
        assert int(report["constant_coefficient"]) == newton[0]
        expected_degrees = (
            [26, 0, 26, 0, 26, 26]
            if family == "bridge_interior" and rank == 2
            else [25, 0, 25, 0, 25, 25]
            if family == "bridge_interior"
            else [26, 26, 26, 26]
            if rank == 2
            else [25, 25, 25, 25]
        )
        assert report["degrees"] == expected_degrees
        assert report["terms"] == ({2: 27405, 3: 23751}[rank])
        legacy[family] = {
            "report": name,
            "report_sha256": PINNED[name],
            "degrees": report["degrees"],
            "terms": report["terms"],
            "constant": report["constant_coefficient"],
        }

    return {
        "rank": rank,
        "coordinate": "T=n-45",
        "degree_bound": degree_bound,
        "actual_degree": polynomial.degree(),
        "entries": degree_bound + 1,
        "sample_values": {
            "negative": sum(value < 0 for value in samples),
            "zero": sum(value == 0 for value in samples),
            "positive": sum(value > 0 for value in samples),
            "minimum": str(min(samples)),
            "origin": str(samples[0]),
            "ordered_sha256": digest_lines([str(value) for value in samples]),
        },
        "newton_coefficients": {
            "negative": sum(value < 0 for value in newton),
            "zero": sum(value == 0 for value in newton),
            "positive": sum(value > 0 for value in newton),
            "minimum": str(min(newton)),
            "origin": str(newton[0]),
            "ordered_sha256": digest_lines([str(value) for value in newton]),
            "order": "increasing Newton order, including the terminal zero guard",
        },
        "power_coefficients": {
            "negative": sum(bool(value < 0) for value in power),
            "zero": sum(bool(value == 0) for value in power),
            "positive": sum(bool(value > 0) for value in power),
            "minimum": str(min(power)),
            "origin": str(power[0]),
            "ordered_sha256": digest_lines([str(value) for value in power]),
            "order": "increasing power degree, including the terminal zero guard",
        },
        "legacy_multivariate_crosschecks": legacy,
    }


def main() -> None:
    actual_hashes = {name: sha256(HERE / name) for name in PINNED}
    assert actual_hashes == PINNED, (actual_hashes, PINNED)
    T, core, deletion, translation = prove_translation()
    cases = [certify_rank(rank, T, core, deletion) for rank in RANKS]
    assert sum(case["entries"] for case in cases) == 55
    assert all(case["newton_coefficients"]["negative"] == 0 for case in cases)
    assert all(int(case["newton_coefficients"]["origin"]) > 0 for case in cases)

    payload = {
        "schema": "rank8-delta23-e2-all-long-deep-degree2-root-value-v1",
        "status": "PASS_EXACT_DELTA23_E2_ALL_LONG_DEEP_DEGREE2_ROOT_VALUE",
        "exact_scope": {
            "tree": "e=2 double claw with all four pendant arms at least 7",
            "deep_bridge_root": "degree-2 bridge root at edge-distance at least 8 from each degree-3 branch; full bridge length N+M+16",
            "deep_pendant_root": "degree-2 pendant-arm root at edge-distance at least 8 from its adjacent branch and at least 7 from its pendant leaf; the other arms are at least 7 and the branch bridge is at least 8",
            "orbit_multiplicity": "one bridge path and four pendant arms, with side/arm reversal",
            "ranks": [2, 3],
            "orders": "n=45+T with arbitrary integer T>=0",
            "claim": "strict positivity of the rooted rank-eight residual value",
        },
        "not_claimed": [
            "no leaf-extension increment",
            "no inserted-new-leaf value",
            "no root within seven edges of a leaf or degree-3 branch",
            "no leaf root",
            "no short-arm or short-bridge boundary outside the stated buffers",
            "no complete e=2 or Problem 993 theorem",
        ],
        "immutable_input_hashes": actual_hashes,
        "translation_identity": translation,
        "univariate_basis": {
            "coordinate": "T=n-45",
            "newton_monomial": "binom(T,k)",
            "strict_positivity": "all Newton coefficients nonnegative and the origin coefficient strictly positive",
            "degree_guards": DEGREE_BOUNDS,
        },
        "cases": cases,
        "coverage_totals": {
            "root_families": 2,
            "literal_path_orbits": 5,
            "rank_cells": 4,
            "exact_profile_translation_identities": 22,
            "ordered_sample_values": 55,
            "ordered_newton_coefficients": 55,
            "ordered_power_coefficients": 55,
            "negative_newton_coefficients": 0,
            "all_origins_strictly_positive": True,
        },
    }
    atomic_json(OUTPUT, payload)
    print(payload["status"], flush=True)
    print("profile_digest", translation["reference_profile_power_sha256"], flush=True)
    for case in cases:
        print(
            "DELTA",
            case["rank"],
            "newton",
            case["newton_coefficients"],
            "power",
            case["power_coefficients"],
            flush=True,
        )
    print("source_sha256", sha256(Path(__file__)), flush=True)
    print("report_sha256", sha256(OUTPUT), flush=True)


if __name__ == "__main__":
    main()
