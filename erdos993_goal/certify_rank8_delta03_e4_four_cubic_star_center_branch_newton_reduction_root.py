#!/usr/bin/env python3
"""Exact transfer/Newton reduction for the four-cubic-star center root."""

from __future__ import annotations

import hashlib
import itertools
import json
import math
from pathlib import Path

import sympy as sp

from verify_rank8_q8_terminal_reduction import c, h, newton_coefficients, residual


ROOT = Path(__file__).resolve().parent
OUTPUT = ROOT / "rank8_delta03_e4_four_cubic_star_center_branch_newton_reduction_exact_root_20260823.json"
EXPECTED = {
    "verify_rank8_q8_terminal_reduction.py":
        "389216D19951A28784C46E57393F1F9CD5BBE41625DCD317C664F701EC2EC4B7",
    "rank8_stable_path_offset_transfer_exact_agent_20260822.json":
        "3F690BA0FC7CC82EBE40467016C848D53E458744BCFC1FA2CF1EB3C01B507D7D",
    "rank8_delta03_e4_skeleton_root_partition_exact_agent_20260823.json":
        "E68D35E2CA3D5E061AACB7D45CD5B5D5A5ABA61FB0F8621111367E0CC1BA8F28",
    "rank8_delta03_e4_skeleton_root_partition_independent_audit_agent_20260823.json":
        "207813C6F056BA63945B0025A0E1E907117F2CD09DA88891BD0F7820636C065C",
    "rank8_delta03_e4_skeletons_order27_exact_agent_20260823.json":
        "257C7549AFEB4BB70ACAAA3DE416A27E5C14565EBEB4A56BC0E2343629498C8E",
    "rank8_delta03_e4_skeletons_order27_independent_audit_agent_20260823.json":
        "FFC1EE49014697148539AC7701DCA1446C33D483C491F96DE8E298B6B93DB4E6",
}


def sha256(path_value: Path) -> str:
    return hashlib.sha256(path_value.read_bytes()).hexdigest().upper()


def choose_poly(value, rank):
    return sp.prod(value - index for index in range(rank)) / sp.factorial(rank)


def path_count(order, rank):
    return choose_poly(order - rank + 1, rank)


def pair_count(left, right, rank):
    return sp.expand(sum(
        path_count(left, index) * path_count(right, rank - index)
        for index in range(rank + 1)
    ))


def literal_path(order, rank):
    top = order - rank + 1
    return math.comb(top, rank) if top >= rank >= 0 else 0


def literal_pair(left, right, rank):
    return sum(
        literal_path(left, index) * literal_path(right, rank - index)
        for index in range(rank + 1)
    )


def main() -> None:
    actual = {name: sha256(ROOT / name) for name in EXPECTED}
    assert actual == EXPECTED
    left_symbol, right_symbol = sp.symbols("A B")
    graded = []
    literal_checks = 0
    for selected in range(5):
        cap = 8 - selected
        minimum = cap - 1
        for rank in range(cap + 1):
            assert sp.expand(
                pair_count(left_symbol + 1, right_symbol, rank)
                - pair_count(left_symbol, right_symbol + 1, rank)
            ) == 0
        for left in range(minimum, minimum + 9):
            for right in range(minimum, minimum + 9):
                for rank in range(cap + 1):
                    assert literal_pair(left + 1, right, rank) == literal_pair(left, right + 1, rank)
                    literal_checks += 1
        graded.append({
            "selected_branch_vertices": selected,
            "rank_cap": cap,
            "minimum_path_order": minimum,
        })

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
        degrees[str(rank)] = {"terms": len(polynomial.terms()), "degree_bound": degree}

    matrix = sp.Matrix([
        [sp.binomial(sample, degree) for degree in range(29)]
        for sample in range(29)
    ])
    assert matrix.det() == 1 and matrix.inv() * matrix == sp.eye(29)

    short_modules = [
        (arm_a, arm_b, spine)
        for arm_a in range(1, 7)
        for arm_b in range(arm_a, 7)
        for spine in range(1, 8)
    ]
    all_short = math.comb(len(short_modules) + 2, 3)
    all_short_n27 = sum(
        1
        for modules in itertools.combinations_with_replacement(short_modules, 3)
        if 1 + sum(sum(module) for module in modules) >= 27
    )
    all_modules = math.comb(28 * 8 + 2, 3)
    assert (len(short_modules), all_short, all_short_n27, all_modules) == (
        147, 540274, 488801, 1898400
    )

    payload = {
        "schema": "rank8-delta03-e4-four-cubic-star-center-branch-newton-reduction-exact-root-v1",
        "status": "PASS_EXACT_RANK8_DELTA03_E4_FOUR_CUBIC_STAR_CENTER_BRANCH_TRANSFER_NEWTON_REDUCTION",
        "root_orbit": "four_cubic_star:center_branch",
        "quotient_formula": "each outer module is an unordered pendant-arm pair times one center-to-outer spine state (28*8=224); the center-root automorphism makes the three modules unordered, giving C(226,3)=1,898,400 keys",
        "sectors": {
            "all_short": all_short,
            "all_short_n27_plus": all_short_n27,
            "non_all_short_rays": all_modules - all_short,
            "mixed_rays": all_modules - all_short - 1,
            "all_long_rays": 1,
        },
        "graded_path_transfer": {
            "rows": graded,
            "literal_checks": literal_checks,
            "state_guard": "a pendant path has base 7 and at most one selected branch endpoint; a spine has base 8 and at most two selected branch endpoints, so after t selected branch vertices every variable path has at least (8-t)-1 vertices",
            "conclusion": "within each non-all-short key all nine long offsets enter the center-root core and deletion coefficients only through total S",
        },
        "degree_bounds": degrees,
        "newton_gate": "29 exact values P(0)..P(28); d0>0 and d1..d28>=0 prove positivity for every integer S>=0 (unused coefficients above the rank-specific degree vanish)",
        "integer_newton_matrix_determinant": 1,
        "immutable_input_hashes": actual,
        "source_sha256": sha256(Path(__file__)),
        "scope_guard": "Reduction and exact quotient count only; no sign claim until all 488,801 finite cells and 1,358,126 rays pass primary and independent audits.",
    }
    OUTPUT.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    print(payload["status"])
    print("SECTORS", payload["sectors"])
    print("DEGREES", degrees, "LITERAL", literal_checks)
    print("SOURCE", payload["source_sha256"])
    print("REPORT", sha256(OUTPUT))


if __name__ == "__main__":
    main()
