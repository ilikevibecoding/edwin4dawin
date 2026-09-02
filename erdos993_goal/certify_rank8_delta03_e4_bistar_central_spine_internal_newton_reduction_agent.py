#!/usr/bin/env python3
"""Exact stable-transfer/Newton reduction for the e=4 bistar central-spine root."""

from __future__ import annotations

import hashlib
import json
import math
from pathlib import Path

import sympy as sp

from verify_rank8_q8_terminal_reduction import c, h, newton_coefficients, residual


HERE = Path(__file__).resolve().parent
OUTPUT = HERE / "rank8_delta03_e4_bistar_central_spine_internal_newton_reduction_exact_agent_20260823.json"
EXPECTED = {
    "verify_rank8_q8_terminal_reduction.py": "389216D19951A28784C46E57393F1F9CD5BBE41625DCD317C664F701EC2EC4B7",
    "rank8_stable_path_offset_transfer_exact_agent_20260822.json": "3F690BA0FC7CC82EBE40467016C848D53E458744BCFC1FA2CF1EB3C01B507D7D",
    "rank8_delta03_e4_skeleton_root_partition_exact_agent_20260823.json": "E68D35E2CA3D5E061AACB7D45CD5B5D5A5ABA61FB0F8621111367E0CC1BA8F28",
    "rank8_delta03_e4_skeleton_root_partition_independent_audit_agent_20260823.json": "207813C6F056BA63945B0025A0E1E907117F2CD09DA88891BD0F7820636C065C",
    "rank8_delta03_e4_skeletons_order27_exact_agent_20260823.json": "257C7549AFEB4BB70ACAAA3DE416A27E5C14565EBEB4A56BC0E2343629498C8E",
    "rank8_delta03_e4_skeletons_order27_independent_audit_agent_20260823.json": "FFC1EE49014697148539AC7701DCA1446C33D483C491F96DE8E298B6B93DB4E6",
    "rank8_delta03_e4_bistar_quartic_leaf_all_order_exact_agent_20260823.json": "10A9E13D6B3C170998BA1C19B128536372C806C6819540D2221A0F5F1E4F7182",
    "rank8_delta03_e4_bistar_quartic_leaf_all_order_independent_audit_agent_20260823.json": "FEAEFFB163C1B9EC02691509DE2BDE5109C8F18D6AAA363941EB15BF3A75B4D0",
}


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def choose_poly(value, rank):
    return sp.prod(value - i for i in range(rank)) / sp.factorial(rank)


def path_count(order, rank):
    return choose_poly(order - rank + 1, rank)


def pair_count(a, b, rank):
    return sp.expand(sum(path_count(a, j) * path_count(b, rank - j) for j in range(rank + 1)))


def literal_path(order, rank):
    top = order - rank + 1
    return math.comb(top, rank) if top >= rank >= 0 else 0


def literal_pair(a, b, rank):
    return sum(literal_path(a, j) * literal_path(b, rank - j) for j in range(rank + 1))


def main() -> None:
    actual = {name: sha256(HERE / name) for name in EXPECTED}
    assert actual == EXPECTED
    A, B = sp.symbols("A B")
    rows = []
    literal_checks = 0
    for polynomial, initial_cap in (("core", 8), ("root_deleted", 7)):
        for selected in (0, 1, 2):
            cap = initial_cap - selected
            minimum = cap - 1
            for rank in range(cap + 1):
                assert sp.expand(pair_count(A + 1, B, rank) - pair_count(A, B + 1, rank)) == 0
            for a in range(minimum, minimum + 7):
                for b in range(minimum, minimum + 7):
                    for rank in range(cap + 1):
                        assert literal_pair(a + 1, b, rank) == literal_pair(a, b + 1, rank)
                        literal_checks += 1
            rows.append({"polynomial": polynomial, "selected_branch_vertices": selected, "rank_cap": cap, "minimum_allowed_path_order": minimum})

    guards = []
    for q_selected in (0, 1):
        for c_selected in (0, 1):
            selected = q_selected + c_selected
            # If either root gap is long (base 7), the bridge path in the core
            # has order left+right+1-selected >= 8-selected.
            core_orders = {
                "quartic_ordinary_long_arm": 7 - q_selected,
                "cubic_ordinary_long_arm": 7 - c_selected,
                "central_bridge_if_a_gap_is_long": 8 - selected,
            }
            # Deleting the root separates the sides.  A long gap becomes an arm
            # of order 7, lowered by one only when its branch vertex is selected.
            deleted_orders = {
                "quartic_ordinary_or_gap_long_arm": 7 - q_selected,
                "cubic_ordinary_or_gap_long_arm": 7 - c_selected,
            }
            assert min(core_orders.values()) >= 7 - selected
            assert min(deleted_orders.values()) >= 6 - selected
            guards.append({"quartic_selected": q_selected, "cubic_selected": c_selected, "core_rank_cap": 8 - selected, "core_orders": core_orders, "deleted_rank_cap": 7 - selected, "deleted_orders": deleted_orders})

    symbols = (*c[:9], h[6], h[7])
    weights = tuple(range(9)) + (6, 7)
    degrees = {}
    for rank in range(4):
        polynomial = sp.Poly(sp.expand(newton_coefficients(residual())[rank]), *symbols)
        degree = max(sum(power * weight for power, weight in zip(monomial, weights)) for monomial, _ in polynomial.terms())
        assert degree == (28, 28, 27, 26)[rank]
        degrees[str(rank)] = {"terms": len(polynomial.terms()), "degree_bound": degree}
    matrix = sp.Matrix([[sp.binomial(sample, power) for power in range(29)] for sample in range(29)])
    assert matrix.det() == 1
    payload = {
        "schema": "rank8-delta03-e4-bistar-central-spine-internal-newton-reduction-exact-agent-v1",
        "status": "PASS_EXACT_RANK8_DELTA03_E4_BISTAR_CENTRAL_SPINE_INTERNAL_TRANSFER_NEWTON_REDUCTION",
        "root_orbit": "quartic_cubic_bistar:central_spine_internal",
        "quotient_formula": "unordered quartic arm triple C(9,3), unordered cubic arm pair C(8,2), two distinguished root gaps (8 each): 84*28*8*8=150528",
        "root_gap_convention": "left,right in 0..6 short or 7+offset long; central spine edge length is left+right+2",
        "sectors": {"all_short": 57624, "all_short_n27_plus": 28812, "mixed": 92903, "all_long": 1},
        "stable_transfer": {"rows": rows, "endpoint_state_guards": guards, "literal_checks": literal_checks, "conclusion": "Every non-all-short key depends only on total long offset S, including after the internal root deletion splits the tree into two components."},
        "degree_bounds": degrees,
        "newton_gate": "29 values, positive d0,d1, nonnegative higher coefficients through exact degree, zero above it",
        "integer_newton_matrix_determinant": 1,
        "immutable_input_hashes": actual,
        "source_sha256": sha256(Path(__file__)),
        "scope_guard": "Reduction only; all 92904 rays and 28812 finite n>=27 cells require exact sign scan and independent literal audit.",
    }
    OUTPUT.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    print(payload["status"])
    print("DEGREES", degrees, "LITERAL", literal_checks)
    print("SOURCE", payload["source_sha256"])
    print("REPORT", sha256(OUTPUT))


if __name__ == "__main__":
    main()
