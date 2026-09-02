#!/usr/bin/env python3
"""Exact stable-transfer/Newton reduction for the e=4 bistar cubic leaf root."""

from __future__ import annotations

import hashlib
import json
import math
from pathlib import Path

import sympy as sp

from verify_rank8_q8_terminal_reduction import c, h, newton_coefficients, residual


HERE = Path(__file__).resolve().parent
OUTPUT = HERE / "rank8_delta03_e4_bistar_cubic_leaf_newton_reduction_exact_agent_20260823.json"
EXPECTED = {
    "verify_rank8_q8_terminal_reduction.py": "389216D19951A28784C46E57393F1F9CD5BBE41625DCD317C664F701EC2EC4B7",
    "rank8_stable_path_offset_transfer_exact_agent_20260822.json": "3F690BA0FC7CC82EBE40467016C848D53E458744BCFC1FA2CF1EB3C01B507D7D",
    "rank8_delta03_e4_skeleton_root_partition_exact_agent_20260823.json": "E68D35E2CA3D5E061AACB7D45CD5B5D5A5ABA61FB0F8621111367E0CC1BA8F28",
    "rank8_delta03_e4_skeleton_root_partition_independent_audit_agent_20260823.json": "207813C6F056BA63945B0025A0E1E907117F2CD09DA88891BD0F7820636C065C",
    "rank8_delta03_e4_skeletons_order27_exact_agent_20260823.json": "257C7549AFEB4BB70ACAAA3DE416A27E5C14565EBEB4A56BC0E2343629498C8E",
    "rank8_delta03_e4_skeletons_order27_independent_audit_agent_20260823.json": "FFC1EE49014697148539AC7701DCA1446C33D483C491F96DE8E298B6B93DB4E6",
    "rank8_delta03_e4_bistar_branch_all_order_exact_agent_20260823.json": "B89E22B84B7E457F5013761D0A35337F0046734868711F334EA3BF834810EC3F",
    "rank8_delta03_e4_bistar_branch_all_order_independent_audit_agent_20260823.json": "0348A1D2FFFE66A88437D7B8886E243283C04307F686B7D49B38CE03CA434B29",
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
    transfer_rows = []
    literal_checks = 0
    # A selected branch vertex contributes x and lowers the remaining rank cap.
    # The core has coefficient cap 8; the root-deleted forest only needs cap 7.
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
            transfer_rows.append({
                "polynomial": polynomial,
                "selected_branch_vertices": selected,
                "rank_cap": cap,
                "minimum_allowed_path_order": minimum,
            })

    # Verify the exact minimum path orders in every endpoint-state term.
    term_guards = []
    for q_selected in (0, 1):
        for c_selected in (0, 1):
            selected = q_selected + c_selected
            core_orders = {
                "quartic_ordinary_arm": 7 - q_selected,
                "cubic_ordinary_arm": 7 - c_selected,
                "root_incident_arm": 8 - c_selected,
                "central_spine": 7 - selected,
            }
            deleted_orders = {
                "quartic_ordinary_arm": 7 - q_selected,
                "cubic_ordinary_arm": 7 - c_selected,
                "root_incident_arm_after_root_deletion": 7 - c_selected,
                "central_spine": 7 - selected,
            }
            assert min(core_orders.values()) >= (8 - selected) - 1
            assert min(deleted_orders.values()) >= (7 - selected) - 1
            term_guards.append({
                "quartic_selected": q_selected,
                "cubic_selected": c_selected,
                "core_rank_cap": 8 - selected,
                "core_minimum_orders": core_orders,
                "deleted_rank_cap": 7 - selected,
                "deleted_minimum_orders": deleted_orders,
            })

    symbols = (*c[:9], h[6], h[7])
    weights = tuple(range(9)) + (6, 7)
    degrees = {}
    for rank in range(4):
        polynomial = sp.Poly(sp.expand(newton_coefficients(residual())[rank]), *symbols)
        degree = max(sum(power * weight for power, weight in zip(monomial, weights)) for monomial, _ in polynomial.terms())
        expected = (28, 28, 27, 26)[rank]
        assert degree == expected
        degrees[str(rank)] = {"terms": len(polynomial.terms()), "degree_bound": degree}

    matrix = sp.Matrix([[sp.binomial(sample, power) for power in range(29)] for sample in range(29)])
    assert matrix.det() == 1
    payload = {
        "schema": "rank8-delta03-e4-bistar-cubic-leaf-newton-reduction-exact-agent-v1",
        "status": "PASS_EXACT_RANK8_DELTA03_E4_BISTAR_CUBIC_LEAF_TRANSFER_NEWTON_REDUCTION",
        "root_orbit": "quartic_cubic_bistar:cubic_leaf",
        "quotient_formula": "unordered triple of quartic arms C(9,3), one ordinary cubic arm (7), one distinguished leaf-root incident arm (8), and central spine (8): 84*7*8*8=37632",
        "sectors": {"all_short": 16464, "all_short_n27_plus": 3850, "mixed": 21167, "all_long": 1},
        "stable_transfer": {
            "rows": transfer_rows,
            "endpoint_state_guards": term_guards,
            "literal_checks": literal_checks,
            "conclusion": "Every non-all-short key depends on all long offsets only through total S in both the core and the forest after deleting the distinguished terminal leaf.",
        },
        "degree_bounds": degrees,
        "newton_gate": "29 exact values P(0)..P(28); d0>0,d1>0,d_k>=0 for 2<=k<=degree and zero coefficients above degree",
        "integer_newton_matrix_determinant": 1,
        "immutable_input_hashes": actual,
        "source_sha256": sha256(Path(__file__)),
        "scope_guard": "Reduction only; no sign is credited before all 21168 rays and 3850 finite all-short n>=27 cells pass and receive an independent literal audit.",
    }
    OUTPUT.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    print(payload["status"])
    print("DEGREES", degrees, "LITERAL", literal_checks)
    print("SOURCE", payload["source_sha256"])
    print("REPORT", sha256(OUTPUT))


if __name__ == "__main__":
    main()
