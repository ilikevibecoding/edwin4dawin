#!/usr/bin/env python3
"""Exact transfer/Newton reduction for a root internal to a star center--outer spine."""

from __future__ import annotations

import hashlib
import itertools
import json
import math
from pathlib import Path

import sympy as sp

from verify_rank8_q8_terminal_reduction import c, h, newton_coefficients, residual


HERE = Path(__file__).resolve().parent
OUTPUT = HERE / "rank8_delta03_e4_four_cubic_star_center_outer_spine_internal_newton_reduction_exact_agent_20260823.json"
EXPECTED = {
    "verify_rank8_q8_terminal_reduction.py": "389216D19951A28784C46E57393F1F9CD5BBE41625DCD317C664F701EC2EC4B7",
    "rank8_stable_path_offset_transfer_exact_agent_20260822.json": "3F690BA0FC7CC82EBE40467016C848D53E458744BCFC1FA2CF1EB3C01B507D7D",
    "rank8_delta03_e4_skeleton_root_partition_exact_agent_20260823.json": "E68D35E2CA3D5E061AACB7D45CD5B5D5A5ABA61FB0F8621111367E0CC1BA8F28",
    "rank8_delta03_e4_skeleton_root_partition_independent_audit_agent_20260823.json": "207813C6F056BA63945B0025A0E1E907117F2CD09DA88891BD0F7820636C065C",
    "rank8_delta03_e4_skeletons_order27_exact_agent_20260823.json": "257C7549AFEB4BB70ACAAA3DE416A27E5C14565EBEB4A56BC0E2343629498C8E",
    "rank8_delta03_e4_skeletons_order27_independent_audit_agent_20260823.json": "FFC1EE49014697148539AC7701DCA1446C33D483C491F96DE8E298B6B93DB4E6",
    "rank8_delta03_e4_bistar_complete_exact_agent_20260823.json": "67D0D9288F3C276523B6B2C91F68D0216E32C259C5D179E56F920E392D39E6A4",
    "rank8_delta03_e4_bistar_complete_independent_audit_agent_20260823.json": "094E8B7C13737C20037A0BB162A16D3351E5B4553D41EEC9914B9E46757CDF4F",
    "rank8_delta03_e4_four_cubic_star_center_branch_all_order_exact_root_20260823.json": "0D9F29ACA9AD714C77841A91111A4542546E18190C6600EEBCA315EA8DC0508C",
    "rank8_delta03_e4_four_cubic_star_center_branch_all_order_independent_audit_root_20260823.json": "8043EEBCE2D48F340AAC9D99FB9ABCB10004933209F588AFDC407008BC3534C5",
    "rank8_delta03_e4_four_cubic_star_outer_branch_all_order_exact_agent_20260823.json": "1A14F2C8C8FEF0C26D2AFF04CAE430CF433984EA20DB2A90337A1C08614FAED0",
    "rank8_delta03_e4_four_cubic_star_outer_branch_all_order_independent_audit_agent_20260823.json": "FB87BF49A8F46C053A0E3097980A2909611357CEC1A4B7C99A79DF9E588E1BCD",
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
    # The full core has four selectable cubic vertices and rank cap eight.
    # Deleting an internal degree-two root preserves all four cubic vertices;
    # its forest is used only through rank seven in Delta0..Delta3.
    for polynomial, initial_cap in (("core", 8), ("root_deleted", 7)):
        for selected in range(5):
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

    ordinary_short_modules = [
        (arm_a, arm_b, spine)
        for arm_a in range(1, 7)
        for arm_b in range(arm_a, 7)
        for spine in range(1, 8)
    ]
    root_short_states = [
        (arm_a, arm_b, center_gap, outer_gap)
        for arm_a in range(1, 7)
        for arm_b in range(arm_a, 7)
        for center_gap in range(7)
        for outer_gap in range(7)
    ]
    all_short = len(root_short_states) * math.comb(len(ordinary_short_modules) + 1, 2)
    all_short_n27 = sum(
        1
        for root_state in root_short_states
        for other_modules in itertools.combinations_with_replacement(
            ordinary_short_modules, 2
        )
        if 3 + sum(root_state) + sum(map(sum, other_modules)) >= 27
    )
    total = (28 * 8 * 8) * math.comb(225, 2)
    assert (
        len(ordinary_short_modules),
        len(root_short_states),
        all_short,
        all_short_n27,
        total,
    ) == (147, 1029, 11_193_462, 10_888_155, 45_158_400)

    payload = {
        "schema": (
            "rank8-delta03-e4-four-cubic-star-center-outer-spine-internal-"
            "newton-reduction-exact-agent-v1"
        ),
        "status": (
            "PASS_EXACT_RANK8_DELTA03_E4_FOUR_CUBIC_STAR_"
            "CENTER_OUTER_SPINE_INTERNAL_TRANSFER_NEWTON_REDUCTION"
        ),
        "root_orbit": "four_cubic_star:center_outer_spine_internal",
        "quotient_formula": (
            "one distinguished root-side state C(8,2)*8*8=1,792 times an "
            "unordered pair of ordinary outer modules C(225,2)=25,200, giving "
            "45,158,400 keys"
        ),
        "coordinate_order": (
            "root pendant pair; center-side root gap; outer-side root gap; "
            "unordered pair of ordinary outer modules"
        ),
        "order_formula": "n=3+sum(the ten stored coordinates)",
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
                "pendant bases are 7, ordinary-spine bases are 8, and each "
                "root-gap base is 7; after selected branch endpoints every long "
                "path factor remains in the stable rank range for both components "
                "of the root-deleted forest"
            ),
            "root_gap_identity": (
                "after deleting the internal root, the two gap paths lie in "
                "different forest components, so their independence polynomials "
                "multiply; the exact path-pair transfer identity therefore moves "
                "one unit between them while preserving every needed coefficient"
            ),
            "conclusion": (
                "within each non-all-short key all ten long offsets enter both the "
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
            "Reduction only; no sign claim until all 10,888,155 finite cells and "
            "33,964,938 rays pass a producer and independent literal audit."
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
