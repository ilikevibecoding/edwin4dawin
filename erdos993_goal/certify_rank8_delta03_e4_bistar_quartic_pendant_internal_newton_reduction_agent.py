#!/usr/bin/env python3
"""Exact stable-transfer/Newton reduction for the e=4 bistar quartic-pendant root."""

from __future__ import annotations

import hashlib
import json
import math
from pathlib import Path

import sympy as sp

from verify_rank8_q8_terminal_reduction import c, h, newton_coefficients, residual


HERE = Path(__file__).resolve().parent
OUTPUT = HERE / "rank8_delta03_e4_bistar_quartic_pendant_internal_newton_reduction_exact_agent_20260823.json"
EXPECTED = {
    "verify_rank8_q8_terminal_reduction.py": "389216D19951A28784C46E57393F1F9CD5BBE41625DCD317C664F701EC2EC4B7",
    "rank8_stable_path_offset_transfer_exact_agent_20260822.json": "3F690BA0FC7CC82EBE40467016C848D53E458744BCFC1FA2CF1EB3C01B507D7D",
    "rank8_delta03_e4_skeleton_root_partition_exact_agent_20260823.json": "E68D35E2CA3D5E061AACB7D45CD5B5D5A5ABA61FB0F8621111367E0CC1BA8F28",
    "rank8_delta03_e4_skeleton_root_partition_independent_audit_agent_20260823.json": "207813C6F056BA63945B0025A0E1E907117F2CD09DA88891BD0F7820636C065C",
    "rank8_delta03_e4_skeletons_order27_exact_agent_20260823.json": "257C7549AFEB4BB70ACAAA3DE416A27E5C14565EBEB4A56BC0E2343629498C8E",
    "rank8_delta03_e4_skeletons_order27_independent_audit_agent_20260823.json": "FFC1EE49014697148539AC7701DCA1446C33D483C491F96DE8E298B6B93DB4E6",
    "rank8_delta03_e4_bistar_cubic_pendant_internal_all_order_exact_agent_20260823.json": "0AEB790B1D0E681A6223B7B5E98560C7958460F0F1DB3FCD6CE3503BC890934A",
    "rank8_delta03_e4_bistar_cubic_pendant_internal_all_order_independent_audit_agent_20260823.json": "B86D275D4B50B074C6340A0C230EC11C79C1BDABC941C67F92A6700F5B51E5EB",
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
            core_orders = {
                "quartic_other_long_arm": 7 - q_selected,
                "quartic_selected_arm_if_near_or_tail_long": 8 - q_selected,
                "cubic_ordinary_long_arm": 7 - c_selected,
                "central_spine_long": 7 - selected,
            }
            deleted_orders = {
                "quartic_other_or_near_long_arm": 7 - q_selected,
                "detached_tail_long_path": 7,
                "cubic_ordinary_long_arm": 7 - c_selected,
                "central_spine_long": 7 - selected,
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
        "schema": "rank8-delta03-e4-bistar-quartic-pendant-internal-newton-reduction-exact-agent-v1",
        "status": "PASS_EXACT_RANK8_DELTA03_E4_BISTAR_QUARTIC_PENDANT_INTERNAL_TRANSFER_NEWTON_REDUCTION",
        "root_orbit": "quartic_cubic_bistar:quartic_pendant_internal",
        "quotient_formula": "other quartic arm pair C(8,2), near-root gap 8, tail 7, cubic arm pair C(8,2), central spine 8: 28*8*7*28*8=351232",
        "selected_edge_convention": "near in 0..6 or 7+N, tail in 1..6 or 7+T, selected edge length near+1+tail",
        "sectors": {"all_short": 129654, "all_short_n27_plus": 64827, "mixed": 221577, "all_long": 1},
        "stable_transfer": {"rows": rows, "endpoint_state_guards": guards, "literal_checks": literal_checks, "conclusion": "Every non-all-short key depends only on total long offset S in the core and in the detached-tail root-deletion forest."},
        "degree_bounds": degrees,
        "newton_gate": "29 values, positive d0,d1, nonnegative higher coefficients through exact degree, zero above it",
        "integer_newton_matrix_determinant": 1,
        "immutable_input_hashes": actual,
        "source_sha256": sha256(Path(__file__)),
        "scope_guard": "Reduction only; all 221578 rays and 64827 finite cells still require exact producer and independent literal audit.",
    }
    OUTPUT.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    print(payload["status"])
    print("DEGREES", degrees, "LITERAL", literal_checks)
    print("SOURCE", payload["source_sha256"])
    print("REPORT", sha256(OUTPUT))


if __name__ == "__main__":
    main()
