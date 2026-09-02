#!/usr/bin/env python3
"""Exact ordered certificate for the Delta2/3 all-long e=2 branch-root cell.

The e=2 core is a double claw.  Its four pendant arms have lengths
A+7,B+7,C+7,D+7 and its branch-to-branch bridge has length G+8.  Through
independence grade eight, the two-arm states at either branch depend only on
SL=A+B and SR=C+D.  This script proves that compression symbolically, builds
the rooted residual from exact path-count formulas, and records the complete
ordered value and Newton-coefficient tensors for Delta2 and Delta3.

This is deliberately only a rooted-value cell.  It is not a leaf-extension
increment theorem and it does not cover short arms, a short bridge, or other
root positions.
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
OUTPUT = HERE / "rank8_delta23_e2_all_long_branch_root_value_exact_agent_20260825.json"
RANKS = (2, 3)
MAX_GRADE = 8
COORDINATES = ("SL", "SR", "G")

# These are safe coordinatewise degree bounds obtained from the canonical
# residual's weighted degrees.  The actual cell degrees are one smaller; the
# terminal zero slices are retained in the ordered certificate as a guard.
DEGREE_BOUNDS = {2: 27, 3: 26}
EXPECTED_ACTUAL_DEGREES = {2: 26, 3: 25}

PINNED = {
    "verify_rank8_q8_terminal_reduction.py":
        "389216D19951A28784C46E57393F1F9CD5BBE41625DCD317C664F701EC2EC4B7",
    "probe_rank8_delta2_e2_symmetric_long_cells.py":
        "4141749D3431C439510C1A35F5BA4509EC4236503104753D610E7FC777250A36",
    "probe_rank8_delta013_e2_symmetric_long_cells.py":
        "32CC4A331D388143640809AD4F07D18B002AB9A16C1F0C40769D9923F7DD0085",
    "rank8_delta2_e2_branch_symmetric_long_exact_20260820.json":
        "82A55E610EB145FF453FE164AD1452C99C61B5B2C71B4D8EB9C8E7BCD58BFFDD",
    "rank8_delta3_e2_branch_symmetric_long_exact_20260820.json":
        "189DDE9C64CF1A8A24F5DB6BDEA82F7C37CE853C6FEEF2C900D12752C5271913",
    "rank8_forest_q8_pgc_master_integration_ledger_agent_20260823.json":
        "D7D26156BCD56DA9A885FDBCF17DE73B2E5A9467C0D80B02357E97508E5D7DDF",
    "rank8_delta03_arbitrary_leaf_extension_dependency_ledger_agent_20260823.json":
        "3B6FF1685982C0F923C83E8D9CE8667966E050AED06A712C961D1021E63224BC",
}


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def atomic_json(path: Path, payload: dict[str, object]) -> None:
    temporary = path.with_suffix(path.suffix + ".tmp")
    temporary.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    os.replace(temporary, path)


def binomial(top: int, bottom: int) -> int:
    # The stable two-path identity is an inclusion/excision polynomial
    # identity.  Its terminal grade-zero term is 1 even when the formal path
    # order has crossed below zero (the only such boundary here is k=8,
    # total_order=14, selected_pairs=4).  All literal path_vector calls have
    # nonnegative order.
    if bottom == 0:
        return 1
    if bottom < 0 or top < bottom or top < 0:
        return 0
    return math.comb(top, bottom)


def path_count(order: int, grade: int) -> int:
    """Number of grade-sized independent sets of a path on ``order`` vertices."""
    if grade < 0:
        return 0
    return binomial(order - grade + 1, grade)


def path_vector(order: int) -> tuple[int, ...]:
    assert order >= 0
    return tuple(path_count(order, grade) for grade in range(MAX_GRADE + 1))


def two_long_paths(total_order: int, grade: int) -> int:
    """Two-path forest count in the stable, grade-eight long-arm range."""
    return sum(
        path_count(total_order - 4 * pairs, grade - 2 * pairs)
        for pairs in range(grade // 2 + 1)
    )


@lru_cache(maxsize=None)
def pair_states(offset_sum: int) -> tuple[tuple[int, ...], tuple[int, ...]]:
    """Excluded/included branch states for arms A+7,B+7, A+B=offset_sum."""
    assert offset_sum >= 0
    excluded = tuple(
        two_long_paths(offset_sum + 14, grade)
        for grade in range(MAX_GRADE + 1)
    )
    included = (0,) + tuple(
        two_long_paths(offset_sum + 12, grade - 1)
        for grade in range(1, MAX_GRADE + 1)
    )
    return excluded, included


def add(*polynomials: tuple[int, ...]) -> tuple[int, ...]:
    return tuple(sum(polynomial[index] for polynomial in polynomials) for index in range(MAX_GRADE + 1))


def multiply(left: tuple[int, ...], right: tuple[int, ...]) -> tuple[int, ...]:
    answer = [0] * (MAX_GRADE + 1)
    for left_grade, left_value in enumerate(left):
        if not left_value:
            continue
        for right_grade in range(MAX_GRADE + 1 - left_grade):
            right_value = right[right_grade]
            if right_value:
                answer[left_grade + right_grade] += left_value * right_value
    return tuple(answer)


def product(*polynomials: tuple[int, ...]) -> tuple[int, ...]:
    answer = (1,) + (0,) * MAX_GRADE
    for polynomial in polynomials:
        answer = multiply(answer, polynomial)
    return answer


@lru_cache(maxsize=131072)
def rooted_profile(SL: int, SR: int, G: int) -> tuple[tuple[int, ...], tuple[int, ...]]:
    """Core and left-branch-deletion profiles through grade eight."""
    assert SL >= 0 and SR >= 0 and G >= 0
    left0, left1 = pair_states(SL)
    right0, right1 = pair_states(SR)
    bridge = G + 8

    core = add(
        product(left0, right0, path_vector(bridge - 1)),
        product(left1, right0, path_vector(bridge - 2)),
        product(left0, right1, path_vector(bridge - 2)),
        product(left1, right1, path_vector(bridge - 3)),
    )
    right_claw = add(
        product(right0, path_vector(bridge - 1)),
        product(right1, path_vector(bridge - 2)),
    )
    deletion = product(left0, right_claw)
    order = 37 + SL + SR + G
    assert core[0] == deletion[0] == 1
    assert core[1] == order and deletion[1] == order - 1
    assert core[2] == binomial(order - 1, 2)
    assert core[3] == binomial(order - 2, 3) + 2
    return core, deletion


def rank_terms(rank: int) -> tuple[tuple[int, tuple[tuple[int, int], ...]], ...]:
    variables = (*c[:9], h[6], h[7])
    polynomial = sp.Poly(newton_coefficients(residual())[rank], *variables, domain=sp.QQ)
    raw = polynomial.terms()
    assert len(raw) == {2: 22, 3: 26}[rank]
    terms = []
    for monomial, coefficient in raw:
        assert coefficient.q == 1
        terms.append(
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
    weighted_degree = max(
        sum(weights[index] * exponent for index, exponent in factors)
        for _coefficient, factors in terms
    )
    assert weighted_degree == DEGREE_BOUNDS[rank]
    return tuple(terms)


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


@lru_cache(maxsize=131072)
def value(rank: int, SL: int, SR: int, G: int) -> int:
    core, deletion = rooted_profile(SL, SR, G)
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


def ordered_digest(values: np.ndarray) -> dict[str, object]:
    digest = hashlib.sha256()
    negative = zero = 0
    minimum = None
    first_negative = None
    nonzero_indices: list[tuple[int, ...]] = []
    for index in np.ndindex(values.shape):
        coefficient = int(values[index])
        digest.update(str(coefficient).encode("ascii"))
        digest.update(b"\n")
        if coefficient < 0:
            negative += 1
            if first_negative is None:
                first_negative = {"orders": list(index), "coefficient": str(coefficient)}
        elif coefficient == 0:
            zero += 1
        else:
            nonzero_indices.append(index)
        minimum = coefficient if minimum is None else min(minimum, coefficient)
    count = values.size
    actual_degrees = [
        max((index[axis] for index in nonzero_indices), default=-1)
        for axis in range(values.ndim)
    ]
    return {
        "entries": count,
        "negative": negative,
        "zero": zero,
        "positive": count - negative - zero,
        "minimum": str(minimum),
        "origin": str(int(values[(0,) * values.ndim])),
        "first_negative": first_negative,
        "actual_degrees": actual_degrees,
        "ordered_sha256": digest.hexdigest().upper(),
        "order": "numpy.ndindex/C order; G varies fastest, then SR, then SL",
    }


def symbolic_pair_sum_audit() -> list[dict[str, object]]:
    """Prove the long two-arm compression as an exact polynomial identity."""
    A, B = sp.symbols("A B", nonnegative=True, integer=True)

    def choose_polynomial(top: sp.Expr, bottom: int) -> sp.Expr:
        if bottom < 0:
            return sp.Integer(0)
        return sp.prod(top - shift for shift in range(bottom)) / sp.factorial(bottom)

    def path_polynomial(order: sp.Expr, grade: int) -> sp.Expr:
        if grade < 0:
            return sp.Integer(0)
        return choose_polynomial(order - grade + 1, grade)

    def two_path_polynomial(total: sp.Expr, grade: int) -> sp.Expr:
        if grade < 0:
            return sp.Integer(0)
        return sp.expand(
            sum(
                path_polynomial(total - 4 * pairs, grade - 2 * pairs)
                for pairs in range(grade // 2 + 1)
            )
        )

    rows = []
    for grade in range(MAX_GRADE + 1):
        direct_excluded = sp.expand(
            sum(
                path_polynomial(A + 7, left_grade)
                * path_polynomial(B + 7, grade - left_grade)
                for left_grade in range(grade + 1)
            )
        )
        expected_excluded = two_path_polynomial(A + B + 14, grade)
        assert sp.expand(direct_excluded - expected_excluded) == 0

        if grade == 0:
            direct_included = expected_included = sp.Integer(0)
        else:
            direct_included = sp.expand(
                sum(
                    path_polynomial(A + 6, left_grade)
                    * path_polynomial(B + 6, grade - 1 - left_grade)
                    for left_grade in range(grade)
                )
            )
            expected_included = two_path_polynomial(A + B + 12, grade - 1)
        assert sp.expand(direct_included - expected_included) == 0
        rows.append(
            {
                "grade": grade,
                "excluded_total_order": "A+B+14",
                "included_after_root_total_order": None if grade == 0 else "A+B+12",
                "excluded_identity_exact": True,
                "included_identity_exact": True,
            }
        )
    return rows


def certify_rank(rank: int) -> dict[str, object]:
    degree = DEGREE_BOUNDS[rank]
    width = degree + 1
    samples = np.empty((width, width, width), dtype=object)
    for SL, SR, G in itertools.product(range(width), repeat=3):
        samples[SL, SR, G] = value(rank, SL, SR, G)
    sample_record = ordered_digest(samples)
    minimum_sample = min(int(entry) for entry in samples.flat)
    assert minimum_sample == int(samples[0, 0, 0]) > 0

    newton = samples.copy()
    for axis in range(3):
        transform_axis(newton, axis)
    coefficient_record = ordered_digest(newton)
    assert coefficient_record["negative"] == 0
    assert int(coefficient_record["origin"]) > 0
    assert coefficient_record["actual_degrees"] == [EXPECTED_ACTUAL_DEGREES[rank]] * 3

    legacy_name = f"rank8_delta{rank}_e2_branch_symmetric_long_exact_20260820.json"
    legacy = json.loads((HERE / legacy_name).read_text(encoding="utf-8"))
    assert legacy["status"] == "PASS_POSITIVE_SYMMETRIC_COEFFICIENT_CELL"
    assert legacy["degrees"] == (
        [26, 0, 26, 0, 26] if rank == 2 else [25, 0, 25, 0, 25]
    )
    assert legacy["negative_coefficients"] == 0
    assert int(legacy["constant_coefficient"]) == int(coefficient_record["origin"])

    return {
        "rank": rank,
        "coordinatewise_degree_bound": degree,
        "grid_shape": [width, width, width],
        "sample_values": sample_record,
        "minimum_sampled_value": str(minimum_sample),
        "newton_coefficients": coefficient_record,
        "legacy_power_basis_crosscheck": {
            "report": legacy_name,
            "report_sha256": PINNED[legacy_name],
            "power_basis_degrees": legacy["degrees"],
            "power_basis_terms": legacy["terms"],
            "constant_coefficient": legacy["constant_coefficient"],
        },
    }


def main() -> None:
    actual_hashes = {name: sha256(HERE / name) for name in PINNED}
    assert actual_hashes == PINNED, (actual_hashes, PINNED)

    pair_rows = symbolic_pair_sum_audit()
    cases = [certify_rank(rank) for rank in RANKS]
    coefficient_count = sum(case["newton_coefficients"]["entries"] for case in cases)
    sample_count = sum(case["sample_values"]["entries"] for case in cases)
    assert coefficient_count == sample_count == 28 ** 3 + 27 ** 3
    assert all(case["newton_coefficients"]["negative"] == 0 for case in cases)
    assert all(int(case["newton_coefficients"]["origin"]) > 0 for case in cases)

    payload = {
        "schema": "rank8-delta23-e2-all-long-branch-root-value-ordered-v1",
        "status": "PASS_EXACT_DELTA23_E2_ALL_LONG_BRANCH_ROOT_VALUE",
        "scope": {
            "tree": "e=2 double claw",
            "lengths": "four pendant arms A+7,B+7,C+7,D+7 and bridge G+8",
            "offset_domain": "A,B,C,D,G are arbitrary nonnegative integers",
            "compressed_coordinates": "SL=A+B, SR=C+D, G",
            "root": "either of the two degree-3 branch vertices, by left-right relabeling",
            "ranks": [2, 3],
            "orders": "n=37+SL+SR+G, hence all n>=37 represented by this cell",
            "claim": "the rooted rank-eight residual values Delta2 and Delta3 are strictly positive",
        },
        "not_claimed": [
            "no arbitrary-leaf strict-increment gate",
            "no inserted-new-leaf gate",
            "no center/bridge-interior or pendant-root gate",
            "no arm length below 7 or bridge length below 8",
            "no complete e=2 layer or Problem 993 theorem",
        ],
        "ledger_selection": {
            "master_ledger_sha256": PINNED["rank8_forest_q8_pgc_master_integration_ledger_agent_20260823.json"],
            "arbitrary_leaf_dependency_ledger_sha256": PINNED["rank8_delta03_arbitrary_leaf_extension_dependency_ledger_agent_20260823.json"],
            "reason": "existing exact producer had positive aggregate power coefficients but no complete ordered tensor digest and no complete literal-DP replay",
        },
        "immutable_input_hashes": actual_hashes,
        "pair_sum_identity": {
            "grades": "0..8",
            "formula": "Q_k(N)=sum_{j=0}^{floor(k/2)} I(P_(N-4j),k-2j)",
            "excluded_pair": "Q_k(S+14)",
            "included_pair": "Q_(k-1)(S+12)",
            "symbolic_checks": pair_rows,
        },
        "basis": {
            "coordinates": list(COORDINATES),
            "newton_monomial": "binom(SL,i) binom(SR,j) binom(G,k)",
            "positivity_argument": "all Newton coefficients are nonnegative and the origin coefficient is strictly positive",
            "degree_guard": "canonical residual weighted degree bounds 27 for Delta2 and 26 for Delta3; terminal zero slices are included",
        },
        "cases": cases,
        "coverage_totals": {
            "ranks": len(RANKS),
            "branch_root_orbits": 1,
            "literal_branch_vertices_covered_by_relabeling": 2,
            "ordered_sample_values": sample_count,
            "ordered_newton_coefficients": coefficient_count,
            "negative_newton_coefficients": sum(case["newton_coefficients"]["negative"] for case in cases),
            "all_origins_strictly_positive": True,
        },
    }
    atomic_json(OUTPUT, payload)
    print(payload["status"], flush=True)
    for case in cases:
        print(
            "DELTA",
            case["rank"],
            "grid",
            case["grid_shape"],
            "newton",
            case["newton_coefficients"],
            flush=True,
        )
    print("source_sha256", sha256(Path(__file__)), flush=True)
    print("report_sha256", sha256(OUTPUT), flush=True)


if __name__ == "__main__":
    main()
