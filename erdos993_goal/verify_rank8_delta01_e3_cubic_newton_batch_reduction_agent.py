#!/usr/bin/env python3
"""Exact degree and Newton-basis reduction for cubic mixed boundary cells."""

from __future__ import annotations

import hashlib
import json
import math
from pathlib import Path


ROOT = Path(__file__).resolve().parent
OUTPUT = ROOT / "rank8_delta01_e3_cubic_newton_batch_reduction_exact_agent_20260823.json"
EXPECTED = {
    "verify_rank8_stable_path_offset_transfer_agent.py":
        "2EB0B6E4F073F0FC90FB023D2EC265D4C28CC58C5DF710EF45E17471085D578E",
    "rank8_stable_path_offset_transfer_exact_agent_20260822.json":
        "3F690BA0FC7CC82EBE40467016C848D53E458744BCFC1FA2CF1EB3C01B507D7D",
    "probe_rank8_delta01_e3_cubic_mixed_univariate_cells_agent.py":
        "92C0D885106F7668FACC844CF4112659F1172E2C205DA76F2D4B9E69EE1DC156",
}
DEGREE_BOUND = 29


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def multiply(left, right):
    return [
        [sum(left[row][inner] * right[inner][column] for inner in range(len(right))) for column in range(len(right[0]))]
        for row in range(len(left))
    ]


def main():
    actual = {name: sha256(ROOT / name) for name in EXPECTED}
    assert actual == EXPECTED
    transfer = json.loads((ROOT / "rank8_stable_path_offset_transfer_exact_agent_20260822.json").read_text(encoding="utf-8"))
    assert transfer["status"] == "PASS_EXACT_RANK8_STABLE_PATH_OFFSET_TRANSFER"

    primitive_degrees = {
        "c7": 7, "c8": 8,
        "h6": 6, "h7": 7,
        "p7": 7, "p8": 8, "p9_open": 8,
    }
    q8_degree = max(2 * primitive_degrees["p8"], primitive_degrees["p7"] + primitive_degrees["p8"], primitive_degrees["p7"] + primitive_degrees["p9_open"])
    core_q_degree = max(2 * primitive_degrees["c8"], primitive_degrees["c7"] + primitive_degrees["c8"])
    deleted_q_degree = max(2 * primitive_degrees["h7"], primitive_degrees["h6"] + primitive_degrees["h7"])
    residual_term_degrees = [
        primitive_degrees["c7"] + primitive_degrees["h6"] + q8_degree,
        primitive_degrees["h6"] + primitive_degrees["p7"] + core_q_degree,
        primitive_degrees["c7"] + primitive_degrees["p7"] + deleted_q_degree,
    ]
    assert residual_term_degrees == [29, 29, 28]
    assert max(residual_term_degrees) == DEGREE_BOUND

    # D maps literal values P(0),...,P(29) to forward differences at zero.
    # V evaluates the Newton basis binom(S,k) at S=0,...,29.
    size = DEGREE_BOUND + 1
    difference = [
        [((-1) ** (row - column)) * math.comb(row, column) if column <= row else 0 for column in range(size)]
        for row in range(size)
    ]
    evaluation = [
        [math.comb(row, column) if column <= row else 0 for column in range(size)]
        for row in range(size)
    ]
    identity = multiply(evaluation, difference)
    assert identity == [[int(row == column) for column in range(size)] for row in range(size)]
    assert all(
        math.comb(s + 1, k) - math.comb(s, k) == (math.comb(s, k - 1) if k else 0)
        for s in range(100) for k in range(size)
    )

    payload = {
        "schema": "rank8-delta01-e3-cubic-newton-batch-reduction-exact-agent-v1",
        "status": "PASS_EXACT_RANK8_DELTA01_E3_CUBIC_MIXED_NEWTON_REDUCTION",
        "one_variable_reduction": (
            "In a fixed mixed short/long pattern, the sealed rank-at-most-eight path-offset identity moves every long offset to one distinguished long coordinate. Delta0 and Delta1 therefore depend only on the total nonnegative integer offset S."
        ),
        "degree_proof": {
            "raw_coefficient_rule": "deg_S(c_j)<=j and deg_S(h_j)<=j because only one path factor carries S and an independent set of total rank j uses at most rank j from it",
            "primitive_degree_bounds": primitive_degrees,
            "q8_degree": q8_degree,
            "core_q_degree": core_q_degree,
            "deleted_q_degree": deleted_q_degree,
            "three_residual_term_degree_bounds": residual_term_degrees,
            "Delta0_and_Delta1_degree_bound": DEGREE_BOUND,
        },
        "newton_identity": {
            "formula": "P(S)=sum_{k=0}^{29} forward_difference^k(P)(0)*binom(S,k)",
            "exact_matrix_inverse_order": size,
            "matrix_identity_verified": True,
            "extension_formula": "P(S+1)-P(S)=sum_{k=0}^{28} forward_difference^(k+1)(P)(0)*binom(S,k)",
        },
        "certificate_criterion": (
            "For each rank and cell, d0>0, d1>0, and d_k>=0 for 2<=k<=29 prove both P(S)>0 and P(S+1)-P(S)>0 for every integer S>=0. Exactly 30 literal values P(0)..P(29) determine all d_k."
        ),
        "immutable_inputs": actual,
        "source_sha256": sha256(Path(__file__)),
        "scope_warning": "This proves the reduction and sign criterion, not the signs of unexecuted cells.",
    }
    OUTPUT.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    print(payload["status"])
    print("SOURCE", payload["source_sha256"])
    print("OUTPUT", sha256(OUTPUT))


if __name__ == "__main__":
    main()
