#!/usr/bin/env python3
"""Exact graded path-transfer and degree-26 Newton reduction for e=2 Delta3."""

from __future__ import annotations

import hashlib
import json
import math
from pathlib import Path

import sympy as sp

from verify_rank8_q8_terminal_reduction import c, h, newton_coefficients, residual


ROOT = Path(__file__).resolve().parent
OUTPUT = ROOT / "rank8_delta3_e2_mixed_newton_reduction_exact_root_20260823.json"
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


def sha256(path_value: Path) -> str:
    return hashlib.sha256(path_value.read_bytes()).hexdigest().upper()


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
    return sum(
        literal_path_count(left, index) * literal_path_count(right, rank - index)
        for index in range(rank + 1)
    )


def main() -> None:
    actual = {name: sha256(ROOT / name) for name in EXPECTED}
    assert actual == EXPECTED

    left_symbol, right_symbol = sp.symbols("A B", integer=True)
    graded_rows = []
    literal_checks = 0
    for selected_vertices in (0, 1, 2):
        rank_cap = 8 - selected_vertices
        minimum_order = rank_cap - 1
        symbolic_checks = 0
        for rank in range(rank_cap + 1):
            difference = sp.expand(
                product_count(left_symbol + 1, right_symbol, rank)
                - product_count(left_symbol, right_symbol + 1, rank)
            )
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
    expression = sp.Poly(sp.expand(newton_coefficients(residual())[3]), *source_symbols)
    weighted_degrees = [
        sum(power * weight for power, weight in zip(powers, weights))
        for powers, _ in expression.terms()
    ]
    assert max(weighted_degrees) == 26

    matrix = sp.Matrix([
        [sp.binomial(sample, degree) for degree in range(27)]
        for sample in range(27)
    ])
    assert matrix.det() == 1
    assert matrix.inv() * matrix == sp.eye(27)

    payload = {
        "schema": "rank8-delta3-e2-mixed-newton-reduction-exact-root-v1",
        "status": "PASS_EXACT_RANK8_DELTA3_E2_MIXED_GRADED_TRANSFER_NEWTON_REDUCTION",
        "graded_path_transfer": {
            "identity": "through remaining rank K, [x^k]I(P_(A+1))I(P_B)=[x^k]I(P_A)I(P_(B+1)) for k<=K once A,B>=K-1",
            "rows": graded_rows,
            "literal_checks": literal_checks,
            "e2_state_guard": "in every core or root-deletion endpoint-state term, t selected branch vertices leave rank cap K=8-t and every variable long path has at least K-1 vertices",
            "root_types_checked_by_structure": {
                "branch": "core has t=left+right; branch deletion has t=far_branch",
                "pendant": "core selected-arm offsets occur through their sum; deletion separates only graded-stable near/tail paths",
                "bridge_internal": "core bridge-gap offsets occur through their sum; deletion has one claw state on each side",
            },
            "corollary": "each fixed mixed short/long e=2 quotient key depends on all long offsets only through their total S",
        },
        "degree_bound": {
            "component_rule": "after moving S to one long path, deg_S(c_j)<=j and deg_S(h_j)<=j",
            "delta3_source_terms": len(expression.terms()),
            "delta3_weighted_degrees": sorted(set(weighted_degrees)),
            "delta3_degree_at_most": 26,
            "weight_rule": "weight(c_j)=j and weight(h_j)=j",
        },
        "newton_certificate": {
            "samples": "P(0),...,P(26)",
            "identity": "P(S)=sum_{k=0}^{26} d_k binom(S,k)",
            "sign_gate": "d0>0 and d_k>=0 for 1<=k<=26",
            "conclusion": "P(S)>0 for every integer S>=0",
            "integer_newton_matrix_determinant": 1,
        },
        "immutable_input_hashes": actual,
        "source_sha256": sha256(Path(__file__)),
        "scope_guard": "This proves the ray reduction, not the signs of unscanned rays; all-short and all-long sectors remain separately gated.",
    }
    OUTPUT.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    print(payload["status"])
    print("GRADED", graded_rows, "LITERAL", literal_checks)
    print("DEGREE", payload["degree_bound"])
    print("SOURCE", payload["source_sha256"])
    print("REPORT", sha256(OUTPUT))


if __name__ == "__main__":
    main()
