#!/usr/bin/env python3
"""Exact transfer/Newton reduction for the four-cubic-path inner branch root."""

from __future__ import annotations

import hashlib
import itertools
import json
import math
from pathlib import Path

import sympy as sp

from verify_rank8_q8_terminal_reduction import c, h, newton_coefficients, residual


HERE = Path(__file__).resolve().parent
OUTPUT = HERE / "rank8_delta03_e4_four_cubic_path_inner_branch_newton_reduction_exact_agent_20260823.json"
EXPECTED = {
    "verify_rank8_q8_terminal_reduction.py": "389216D19951A28784C46E57393F1F9CD5BBE41625DCD317C664F701EC2EC4B7",
    "rank8_stable_path_offset_transfer_exact_agent_20260822.json": "3F690BA0FC7CC82EBE40467016C848D53E458744BCFC1FA2CF1EB3C01B507D7D",
    "rank8_delta03_e4_skeleton_root_partition_exact_agent_20260823.json": "E68D35E2CA3D5E061AACB7D45CD5B5D5A5ABA61FB0F8621111367E0CC1BA8F28",
    "rank8_delta03_e4_skeleton_root_partition_independent_audit_agent_20260823.json": "207813C6F056BA63945B0025A0E1E907117F2CD09DA88891BD0F7820636C065C",
    "rank8_delta03_e4_skeletons_order27_exact_agent_20260823.json": "257C7549AFEB4BB70ACAAA3DE416A27E5C14565EBEB4A56BC0E2343629498C8E",
    "rank8_delta03_e4_skeletons_order27_independent_audit_agent_20260823.json": "FFC1EE49014697148539AC7701DCA1446C33D483C491F96DE8E298B6B93DB4E6",
    "rank8_delta03_e4_bistar_complete_exact_agent_20260823.json": "67D0D9288F3C276523B6B2C91F68D0216E32C259C5D179E56F920E392D39E6A4",
    "rank8_delta03_e4_bistar_complete_independent_audit_agent_20260823.json": "094E8B7C13737C20037A0BB162A16D3351E5B4553D41EEC9914B9E46757CDF4F",
    "rank8_delta03_e4_four_cubic_star_center_outer_spine_internal_all_order_exact_agent_20260823.json": "8BBA631760C731225929EDEAE935268AF851B549BBFF994510734B836DE84AF7",
    "rank8_delta03_e4_four_cubic_star_center_outer_spine_internal_all_order_independent_audit_agent_20260823.json": "899A722A6D577A74A7AE669530496E5E2230C02B0008E3F4D2739195F098E26F",
}


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def choose_poly(value, rank):
    return sp.prod(value - index for index in range(rank)) / sp.factorial(rank)


def path_count(order, rank):
    return choose_poly(order - rank + 1, rank)


def pair_count(left, right, rank):
    return sp.expand(
        sum(
            path_count(left, index) * path_count(right, rank - index)
            for index in range(rank + 1)
        )
    )


def literal_path(order, rank):
    top = order - rank + 1
    return math.comb(top, rank) if top >= rank >= 0 else 0


def literal_pair(left, right, rank):
    return sum(
        literal_path(left, index) * literal_path(right, rank - index)
        for index in range(rank + 1)
    )


def main() -> None:
    actual = {name: sha256(HERE / name) for name in EXPECTED}
    assert actual == EXPECTED
    left, right = sp.symbols("LEFT RIGHT")
    rows = []
    literal_checks = 0
    # The core contains four cubic branch vertices.  Deleting the selected
    # inner cubic root leaves exactly three branch vertices across three forest
    # components, so the same graded caps as other branch-root orbits apply.
    for polynomial, initial_cap, maximum_selected in (
        ("core", 8, 4),
        ("root_deleted", 7, 3),
    ):
        for selected in range(maximum_selected + 1):
            cap = initial_cap - selected
            minimum = cap - 1
            for rank in range(cap + 1):
                assert sp.expand(
                    pair_count(left + 1, right, rank)
                    - pair_count(left, right + 1, rank)
                ) == 0
            for left_value in range(minimum, minimum + 9):
                for right_value in range(minimum, minimum + 9):
                    for rank in range(cap + 1):
                        assert literal_pair(left_value + 1, right_value, rank) == (
                            literal_pair(left_value, right_value + 1, rank)
                        )
                        literal_checks += 1
            rows.append(
                {
                    "polynomial": polynomial,
                    "selected_branch_vertices": selected,
                    "rank_cap": cap,
                    "minimum_path_order": minimum,
                }
            )

    symbols = (*c[:9], h[6], h[7])
    weights = tuple(range(9)) + (6, 7)
    degrees = {}
    for rank in range(4):
        polynomial = sp.Poly(sp.expand(newton_coefficients(residual())[rank]), *symbols)
        degree = max(
            sum(power * weight for power, weight in zip(monomial, weights))
            for monomial, _ in polynomial.terms()
        )
        assert degree == (28, 28, 27, 26)[rank]
        degrees[str(rank)] = {
            "terms": len(polynomial.terms()),
            "degree_bound": degree,
        }
    matrix = sp.Matrix(
        [[sp.binomial(sample, degree) for degree in range(29)] for sample in range(29)]
    )
    assert matrix.det() == 1

    short_pendants = range(1, 7)
    short_spines = range(1, 8)
    short_pairs = tuple(itertools.combinations_with_replacement(short_pendants, 2))
    all_short = (
        6 * len(short_pairs) * 7 * 6 * 7 * len(short_pairs) * 7
    )
    all_short_n27 = sum(
        1
        for root_pendant in short_pendants
        for left_pair in short_pairs
        for left_spine in short_spines
        for right_pendant in short_pendants
        for middle_spine in short_spines
        for far_pair in short_pairs
        for far_spine in short_spines
        if 1
        + root_pendant
        + sum(left_pair)
        + left_spine
        + right_pendant
        + middle_spine
        + sum(far_pair)
        + far_spine
        >= 27
    )
    total = 7 * 28 * 8 * 7 * 8 * 28 * 8
    assert (all_short, all_short_n27, total) == (
        5_445_468,
        4_950_075,
        19_668_992,
    )

    payload = {
        "schema": (
            "rank8-delta03-e4-four-cubic-path-inner-branch-newton-"
            "reduction-exact-agent-v1"
        ),
        "status": (
            "PASS_EXACT_RANK8_DELTA03_E4_FOUR_CUBIC_PATH_"
            "INNER_BRANCH_TRANSFER_NEWTON_REDUCTION"
        ),
        "root_orbit": "four_cubic_path:inner_branch",
        "quotient_formula": (
            "root pendant 7 * left outer pendant pair 28 * left spine 8 * "
            "right-inner pendant 7 * middle spine 8 * far outer pendant pair "
            "28 * far spine 8 = 19,668,992 keys"
        ),
        "coordinate_order": (
            "root pendant; left outer pendant pair; root-left spine; other-inner "
            "pendant; middle spine; far outer pendant pair; far spine"
        ),
        "order_formula": "n=1+sum(the nine stored coordinates)",
        "sectors": {
            "all_short": all_short,
            "all_short_n27_plus": all_short_n27,
            "mixed_rays": total - all_short - 1,
            "all_long_rays": 1,
            "non_all_short_rays": total - all_short,
        },
        "graded_path_transfer": {
            "rows": rows,
            "literal_checks": literal_checks,
            "state_guard": (
                "pendant bases are 7 and spine bases are 8; after selected cubic "
                "endpoints, every long path factor in the full tree and in each "
                "of the three root-deleted components remains in the stable "
                "rank range"
            ),
            "deleted_component_identity": (
                "deleting the inner cubic root gives the root-pendant path, the "
                "left outer branch, and the remaining two-cubic component; forest "
                "multiplication plus the exact path-pair transfer identity moves "
                "one unit between any two long coordinates"
            ),
            "conclusion": (
                "within each non-all-short key all nine long offsets enter the "
                "full-core and root-deleted coefficients only through total S"
            ),
        },
        "degree_bounds": degrees,
        "newton_gate": (
            "29 exact values; positive d0,d1, nonnegative higher coefficients "
            "through the rank-specific degree, zero above it"
        ),
        "integer_newton_matrix_determinant": 1,
        "immutable_input_hashes": actual,
        "source_sha256": sha256(Path(__file__)),
        "scope_guard": (
            "Reduction only; no sign claim until all 4,950,075 finite cells and "
            "14,223,524 rays pass a producer and independent literal audit."
        ),
    }
    OUTPUT.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    print(payload["status"])
    print("SECTORS", payload["sectors"])
    print("DEGREES", degrees, "LITERAL", literal_checks)
    print("SOURCE", payload["source_sha256"])
    print("REPORT", sha256(OUTPUT))


if __name__ == "__main__":
    main()
