#!/usr/bin/env python3
"""Exact graded path-transfer and Newton reduction for mixed e=2 cells."""

from __future__ import annotations

import hashlib
import json
import math
from pathlib import Path

import sympy as sp

from verify_rank8_q8_terminal_reduction import c, h, newton_coefficients, residual


HERE = Path(__file__).resolve().parent
OUTPUT = HERE / "rank8_delta01_e2_mixed_newton_reduction_exact_agent_20260823.json"
EXPECTED = {
    "verify_rank8_q8_terminal_reduction.py":
        "389216D19951A28784C46E57393F1F9CD5BBE41625DCD317C664F701EC2EC4B7",
    "rank8_stable_path_offset_transfer_exact_agent_20260822.json":
        "3F690BA0FC7CC82EBE40467016C848D53E458744BCFC1FA2CF1EB3C01B507D7D",
    "rank8_delta01_e2_root_segment_partition_exact_agent_20260823.json":
        "EBAF3FED1DF2D7ACF82F4476CCC1E892131A6A8AF8B0DBFFA8BEBE689083426C",
    "rank8_delta01_e2_root_segment_partition_independent_audit_agent_20260823.json":
        "AD5AE4EEF6DEB576DD2B0EC46CAFA9EF8BC6AC2D4F08231C4837CFBC7991EC61",
}


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def choose_poly(value, rank):
    return sp.prod(value - index for index in range(rank)) / sp.factorial(rank)


def symbolic_path_count(order, rank):
    return choose_poly(order - rank + 1, rank)


def product_count(left, right, rank):
    return sp.expand(sum(
        symbolic_path_count(left, index) * symbolic_path_count(right, rank - index)
        for index in range(rank + 1)
    ))


def literal_path_count(order, rank):
    if order == -1:
        return int(rank == 0)
    if order <= -2:
        return 0
    top = order - rank + 1
    return math.comb(top, rank) if top >= rank >= 0 else 0


def literal_product(left, right, rank):
    return sum(literal_path_count(left, j) * literal_path_count(right, rank - j) for j in range(rank + 1))


def main() -> None:
    actual = {name: sha256(HERE / name) for name in EXPECTED}
    assert actual == EXPECTED

    A, B = sp.symbols("A B", integer=True)
    graded_rows = []
    literal_checks = 0
    # An endpoint-state term containing t already-selected branch vertices
    # needs path coefficients only through K=8-t, while every variable path
    # in that term has at least 7-t=K-1 vertices.
    for selected_vertices in (0, 1, 2):
        rank_cap = 8 - selected_vertices
        minimum_order = rank_cap - 1
        symbolic_checks = 0
        for rank in range(rank_cap + 1):
            difference = sp.expand(product_count(A + 1, B, rank) - product_count(A, B + 1, rank))
            assert difference == 0
            symbolic_checks += 1
        for left in range(minimum_order, minimum_order + 9):
            for right in range(minimum_order, minimum_order + 9):
                for rank in range(rank_cap + 1):
                    assert literal_product(left + 1, right, rank) == literal_product(left, right + 1, rank)
                    literal_checks += 1
        graded_rows.append({
            "selected_branch_vertices": selected_vertices,
            "remaining_rank_cap": rank_cap,
            "minimum_variable_path_order": minimum_order,
            "symbolic_rank_identities": symbolic_checks,
        })

    source_symbols = (*c[:9], h[6], h[7])
    weights = tuple(range(9)) + (6, 7)
    degree_rows = {}
    for rank in (0, 1):
        expression = sp.Poly(sp.expand(newton_coefficients(residual())[rank]), *source_symbols)
        weighted_degrees = [sum(power * weight for power, weight in zip(powers, weights)) for powers, _ in expression.terms()]
        maximum = max(weighted_degrees)
        assert maximum == 28
        degree_rows[str(rank)] = {
            "source_terms": len(expression.terms()),
            "maximum_weighted_degree": maximum,
            "weight_rule": "weight(c_j)=j and weight(h_j)=j",
        }

    # Exact integer Newton inversion: 29 samples determine degree <=28.
    matrix = sp.Matrix([[sp.binomial(s, k) for k in range(29)] for s in range(29)])
    assert matrix.det() == 1
    assert matrix.inv() * matrix == sp.eye(29)

    payload = {
        "schema": "rank8-delta01-e2-mixed-newton-reduction-exact-agent-v1",
        "status": "PASS_EXACT_RANK8_DELTA01_E2_MIXED_GRADED_TRANSFER_NEWTON_REDUCTION",
        "graded_path_transfer": {
            "identity": "through remaining rank K, [x^k] I(P_(A+1))I(P_B)=[x^k] I(P_A)I(P_(B+1)) for every k<=K once A,B>=K-1",
            "rows": graded_rows,
            "literal_checks": literal_checks,
            "e2_state_guard": "in every core or root-deletion endpoint-state term, if t branch vertices are selected then the exterior x^t leaves rank cap K=8-t and each variable long path has at least 7-t=K-1 vertices",
            "root_types_checked_by_structure": {
                "branch": "core has t=left+right; branch deletion has t=far_branch",
                "pendant": "core selected-arm offsets already occur as their sum; deletion has t=left+right and separates near/tail only into graded-stable paths",
                "bridge_internal": "core bridge-gap offsets already occur as their sum; deletion has one claw state on each side with t=left+right",
            },
            "corollary": "every fixed mixed short/long quotient key depends on all long offsets only through their total S",
        },
        "degree_bound": {
            "component_rule": "after moving S to one long path, deg_S(c_j)<=j and deg_S(h_j)<=j",
            "ranks": degree_rows,
            "Delta0_and_Delta1_degree_at_most": 28,
        },
        "newton_certificate": {
            "samples": "P(0),...,P(28)",
            "identity": "P(S)=sum_{k=0}^{28} d_k binom(S,k), where d_k is the kth forward difference at 0",
            "sign_gate": "d0>0, d1>0, and d_k>=0 for 2<=k<=28",
            "conclusion": "P(S)>0 and P(S+1)>P(S) for every integer S>=0",
            "integer_newton_matrix_determinant": 1,
        },
        "immutable_input_hashes": actual,
        "source_sha256": sha256(Path(__file__)),
        "scope_guard": "This proves the ray and finite-difference reduction, not the signs of any unscanned ray. The e>=4 connected layer is separate.",
    }
    OUTPUT.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    print(payload["status"])
    print("GRADED", graded_rows, "LITERAL", literal_checks)
    print("DEGREES", degree_rows)
    print("SOURCE", payload["source_sha256"])
    print("REPORT", sha256(OUTPUT))


if __name__ == "__main__":
    main()
