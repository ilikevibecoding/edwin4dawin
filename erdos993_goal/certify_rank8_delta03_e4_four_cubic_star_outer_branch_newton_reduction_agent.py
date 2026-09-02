#!/usr/bin/env python3
"""Exact transfer/Newton reduction for the four-cubic-star outer branch root."""

from __future__ import annotations

import hashlib
import itertools
import json
import math
from pathlib import Path

import sympy as sp

from verify_rank8_q8_terminal_reduction import c, h, newton_coefficients, residual


HERE = Path(__file__).resolve().parent
OUTPUT = HERE / "rank8_delta03_e4_four_cubic_star_outer_branch_newton_reduction_exact_agent_20260823.json"
EXPECTED = {
    "verify_rank8_q8_terminal_reduction.py": "389216D19951A28784C46E57393F1F9CD5BBE41625DCD317C664F701EC2EC4B7",
    "rank8_stable_path_offset_transfer_exact_agent_20260822.json": "3F690BA0FC7CC82EBE40467016C848D53E458744BCFC1FA2CF1EB3C01B507D7D",
    "rank8_delta03_e4_skeleton_root_partition_exact_agent_20260823.json": "E68D35E2CA3D5E061AACB7D45CD5B5D5A5ABA61FB0F8621111367E0CC1BA8F28",
    "rank8_delta03_e4_skeleton_root_partition_independent_audit_agent_20260823.json": "207813C6F056BA63945B0025A0E1E907117F2CD09DA88891BD0F7820636C065C",
    "rank8_delta03_e4_skeletons_order27_exact_agent_20260823.json": "257C7549AFEB4BB70ACAAA3DE416A27E5C14565EBEB4A56BC0E2343629498C8E",
    "rank8_delta03_e4_skeletons_order27_independent_audit_agent_20260823.json": "FFC1EE49014697148539AC7701DCA1446C33D483C491F96DE8E298B6B93DB4E6",
    "rank8_delta03_e4_bistar_complete_exact_agent_20260823.json": "67D0D9288F3C276523B6B2C91F68D0216E32C259C5D179E56F920E392D39E6A4",
    "rank8_delta03_e4_bistar_complete_independent_audit_agent_20260823.json": "094E8B7C13737C20037A0BB162A16D3351E5B4553D41EEC9914B9E46757CDF4F",
}


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def choose_poly(value, rank):
    return sp.prod(value - index for index in range(rank)) / sp.factorial(rank)


def path_count(order, rank):
    return choose_poly(order - rank + 1, rank)


def pair_count(left, right, rank):
    return sp.expand(sum(path_count(left, index) * path_count(right, rank - index) for index in range(rank + 1)))


def literal_path(order, rank):
    top = order - rank + 1
    return math.comb(top, rank) if top >= rank >= 0 else 0


def literal_pair(left, right, rank):
    return sum(literal_path(left, index) * literal_path(right, rank - index) for index in range(rank + 1))


def main() -> None:
    actual = {name: sha256(HERE / name) for name in EXPECTED}
    assert actual == EXPECTED
    A, B = sp.symbols("A B")
    rows = []
    literal_checks = 0
    for polynomial, initial_cap, max_selected in (("core", 8, 4), ("root_deleted", 7, 3)):
        for selected in range(max_selected + 1):
            cap = initial_cap - selected
            minimum = cap - 1
            for rank in range(cap + 1):
                assert sp.expand(pair_count(A + 1, B, rank) - pair_count(A, B + 1, rank)) == 0
            for left in range(minimum, minimum + 9):
                for right in range(minimum, minimum + 9):
                    for rank in range(cap + 1):
                        assert literal_pair(left + 1, right, rank) == literal_pair(left, right + 1, rank)
                        literal_checks += 1
            rows.append({"polynomial": polynomial, "selected_branch_vertices": selected, "rank_cap": cap, "minimum_path_order": minimum})

    symbols = (*c[:9], h[6], h[7])
    weights = tuple(range(9)) + (6, 7)
    degrees = {}
    for rank in range(4):
        polynomial = sp.Poly(sp.expand(newton_coefficients(residual())[rank]), *symbols)
        degree = max(sum(power * weight for power, weight in zip(monomial, weights)) for monomial, _ in polynomial.terms())
        assert degree == (28, 28, 27, 26)[rank]
        degrees[str(rank)] = {"terms": len(polynomial.terms()), "degree_bound": degree}
    matrix = sp.Matrix([[sp.binomial(sample, degree) for degree in range(29)] for sample in range(29)])
    assert matrix.det() == 1

    short_modules = [(a, b, spine) for a in range(1, 7) for b in range(a, 7) for spine in range(1, 8)]
    all_short = len(short_modules) * math.comb(len(short_modules) + 1, 2)
    all_short_n27 = sum(
        1
        for root_module in short_modules
        for other_modules in itertools.combinations_with_replacement(short_modules, 2)
        if 1 + sum(root_module) + sum(map(sum, other_modules)) >= 27
    )
    total = 224 * math.comb(225, 2)
    assert (len(short_modules), all_short, all_short_n27, total) == (147, 1599066, 1448115, 5644800)
    payload = {
        "schema": "rank8-delta03-e4-four-cubic-star-outer-branch-newton-reduction-exact-agent-v1",
        "status": "PASS_EXACT_RANK8_DELTA03_E4_FOUR_CUBIC_STAR_OUTER_BRANCH_TRANSFER_NEWTON_REDUCTION",
        "root_orbit": "four_cubic_star:outer_branch",
        "quotient_formula": "one distinguished root outer module (224 states) times an unordered pair of the other modules C(225,2), giving 5,644,800 keys",
        "sectors": {"all_short": all_short, "all_short_n27_plus": all_short_n27, "mixed_rays": total - all_short - 1, "all_long_rays": 1, "non_all_short_rays": total - all_short},
        "graded_path_transfer": {
            "rows": rows,
            "literal_checks": literal_checks,
            "state_guard": "pendant bases are 7 and spine bases are 8; after any selected branch endpoints, every long path factor retains at least rank_cap-1 vertices, including the detached root arms and center-facing residual spine after root deletion",
            "conclusion": "within each non-all-short key all nine long offsets enter the outer-root core and deletion coefficients only through total S",
        },
        "degree_bounds": degrees,
        "newton_gate": "29 exact values; positive d0,d1, nonnegative higher coefficients through the rank-specific degree, zero above it",
        "integer_newton_matrix_determinant": 1,
        "immutable_input_hashes": actual,
        "source_sha256": sha256(Path(__file__)),
        "scope_guard": "Reduction only; no sign claim until all 1,448,115 finite cells and 4,045,734 rays pass producer and independent literal audits.",
    }
    OUTPUT.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    print(payload["status"])
    print("SECTORS", payload["sectors"])
    print("DEGREES", degrees, "LITERAL", literal_checks)
    print("SOURCE", payload["source_sha256"])
    print("REPORT", sha256(OUTPUT))


if __name__ == "__main__":
    main()
