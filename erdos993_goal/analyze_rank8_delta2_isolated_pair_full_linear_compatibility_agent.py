#!/usr/bin/env python3
"""Test the isolated W-degree pairs on the strongest elementary linear cone.

Besides D_parent=Y+x^2W, the literal block factorization gives

    Y-xW = A R (1+x)^s >= F,

coefficientwise.  Hence for i=3,...,6 write

    d_i(parent)=z_i+f_i+w_(i-1)+w_(i-2),  z_i>=0.

Expand the four alternating W-degree pairs in these nonnegative coordinates.
"""

from __future__ import annotations

import hashlib
import json
from collections import defaultdict
from pathlib import Path

import analyze_rank8_delta2_isolated_block_symbolic_transition_agent as transition
import prove_rank8_forest16_f5_f6_ratio_agent as forest


HERE = Path(__file__).resolve().parent
OUTPUT = HERE / "rank8_delta2_isolated_pair_full_linear_compatibility_agent_20260823.json"
TERMS_FILE = HERE / "rank8_delta2_new_leaf_upper_corner_sparse_terms_agent_20260823.json"
EXPECTED_TRANSITION_SOURCE = "5E6A248F81643A40B034607A7A4A557AA276EA8C9FA70E2898B5B4EA1B3D646F"
VARIABLES = ("z3", "z4", "z5", "z6", "f2", "f3", "f4", "f5", "f6", "w1", "w2", "w3", "w4", "w5")
ZERO = (0,) * len(VARIABLES)


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def add_monomials(left, right):
    return tuple(a + b for a, b in zip(left, right))


def multiply(left, right):
    answer = defaultdict(int)
    for lm, lc in left.items():
        for rm, rc in right.items():
            answer[add_monomials(lm, rm)] += lc * rc
    return {monomial: coefficient for monomial, coefficient in answer.items() if coefficient}


def singleton(index):
    row = [0] * len(VARIABLES)
    row[index] = 1
    return tuple(row)


def linear_power(indices, exponent, cache):
    key = (indices, exponent)
    if key in cache:
        return cache[key]
    base = {singleton(index): 1 for index in indices}
    answer = {ZERO: 1}
    for _ in range(exponent):
        answer = multiply(answer, base)
    cache[key] = answer
    return answer


def substitute(polynomial):
    # Original variables d3,d4,d5,d6,f2,...,f6,w1,...,w4.
    # d_i = z_i + f_i + w_(i-2) + w_(i-1).
    d_maps = (
        (0, 5, 9, 10),
        (1, 6, 10, 11),
        (2, 7, 11, 12),
        (3, 8, 12, 13),
    )
    cache = {}
    answer = defaultdict(int)
    for monomial, coefficient in polynomial.items():
        expanded = {ZERO: coefficient}
        for d_index, indices in enumerate(d_maps):
            if monomial[d_index]:
                expanded = multiply(expanded, linear_power(indices, monomial[d_index], cache))
        unchanged = [0] * len(VARIABLES)
        for old_index in range(4, 9):
            unchanged[old_index] = monomial[old_index]
        for old_index in range(9, 13):
            unchanged[old_index] = monomial[old_index]
        unchanged = tuple(unchanged)
        for partial, value in expanded.items():
            answer[add_monomials(partial, unchanged)] += value
        forest.gate()
    return {monomial: coefficient for monomial, coefficient in answer.items() if coefficient}


def record(polynomial):
    rows = [[list(monomial), str(polynomial[monomial])] for monomial in sorted(polynomial, reverse=True)]
    return {
        "terms": len(polynomial),
        "negative": sum(value < 0 for value in polynomial.values()),
        "positive": sum(value > 0 for value in polynomial.values()),
        "minimum_coefficient": str(min(polynomial.values())),
        "sha256": hashlib.sha256(json.dumps(rows, separators=(",", ":")).encode()).hexdigest().upper(),
        "first_negative": next((
            {"monomial": list(monomial), "coefficient": str(coefficient)}
            for monomial, coefficient in sorted(polynomial.items(), reverse=True)
            if coefficient < 0
        ), None),
    }


def main() -> None:
    assert sha256(HERE / "analyze_rank8_delta2_isolated_block_symbolic_transition_agent.py") == EXPECTED_TRANSITION_SOURCE
    term_payload = json.loads(TERMS_FILE.read_text(encoding="utf-8"))
    base_terms = tuple((tuple(row[0]), int(row[1])) for row in term_payload["terms"])
    f_shifted, _ = transition.substitute(base_terms, d_defect=False, f_shift=True)
    child, _ = transition.substitute(base_terms, d_defect=True, f_shift=True)
    d_effect = transition.difference(f_shifted, child)
    groups = {
        degree: {monomial: coefficient for monomial, coefficient in d_effect.items() if sum(monomial[9:]) == degree}
        for degree in range(1, 10)
    }
    records = {}
    all_nonnegative = True
    for odd in (1, 3, 5, 7):
        pair = transition.difference(groups[odd], {monomial: -coefficient for monomial, coefficient in groups[odd + 1].items()})
        expanded = substitute(pair)
        row = record(expanded)
        records[f"degrees_{odd}_{odd + 1}"] = row
        all_nonnegative &= row["negative"] == 0
        print("PAIR", odd, odd + 1, row["terms"], row["negative"], row["positive"], flush=True)
    degree9 = substitute(groups[9])
    records["degree_9"] = record(degree9)
    all_nonnegative &= records["degree_9"]["negative"] == 0

    payload = {
        "schema": "rank8-delta2-isolated-pair-full-linear-compatibility-v1",
        "status": (
            "PASS_EXACT_D_DEFECT_PAIRING_ON_LINEAR_REALIZABILITY_CONE"
            if all_nonnegative else
            "OPEN_EXACT_LINEAR_REALIZABILITY_CONE_STILL_MIXED"
        ),
        "exact_compatibility": "D_parent=Y+x^2W and Y-xW=A R (1+x)^s >= F, so d_i=z_i+f_i+w_(i-2)+w_(i-1) with z_i>=0.",
        "variables": list(VARIABLES),
        "records": records,
        "all_nonnegative": all_nonnegative,
        "input_sha256": {
            TERMS_FILE.name: sha256(TERMS_FILE),
            "analyze_rank8_delta2_isolated_block_symbolic_transition_agent.py": sha256(HERE / "analyze_rank8_delta2_isolated_block_symbolic_transition_agent.py"),
        },
        "resources": {"abort_private_bytes": forest.ABORT_BYTES},
        "proof_boundary": "A PASS would control only the fixed-parameter D-defect pairs. A mixed result is a relaxed-cone obstruction, not a realized transition failure. F-multiplication and Newton-tail signs remain separate.",
    }
    OUTPUT.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    print(payload["status"])
    print("SOURCE", sha256(Path(__file__)))
    print("REPORT", sha256(OUTPUT))


if __name__ == "__main__":
    main()
