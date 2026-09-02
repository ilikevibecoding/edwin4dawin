#!/usr/bin/env python3
"""Sparse exact symbolic split for isolated existing-block adjunction.

At fixed source order, adjoining an isolated F component to an existing root
replaces one empty D root and gives

    D_child = D_parent - x^2 W,     F_child = (1+x) F,

where W=B R (1+x)^(s-1).  For the pinned Delta2 numerator G this script
separates G(D,F)-G(D-x^2 W,(1+x)F) into its F-multiplication and D-defect
parts, using a bounded sparse dictionary rather than monolithic factoring.
"""

from __future__ import annotations

import hashlib
import json
import math
from collections import defaultdict
from pathlib import Path

import prove_rank8_forest16_f5_f6_ratio_agent as forest


HERE = Path(__file__).resolve().parent
TERMS_FILE = HERE / "rank8_delta2_new_leaf_upper_corner_sparse_terms_agent_20260823.json"
OUTPUT = HERE / "rank8_delta2_isolated_block_symbolic_transition_agent_20260823.json"
TERMS_SHA = "98C2F7E5EA52A0384AAD40485FDE1F9260F2004D0B326FBF1C127422459D623C"
VARIABLES = ("d3", "d4", "d5", "d6", "f2", "f3", "f4", "f5", "f6", "w1", "w2", "w3", "w4")
ZERO = (0,) * len(VARIABLES)


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def add_monomials(left, right):
    return tuple(a + b for a, b in zip(left, right))


def expand_linear_power(options, exponent):
    """Sparse expansion of (a+b)^exponent for signed unit monomials."""
    if exponent == 0:
        return {ZERO: 1}
    assert len(options) == 2
    (first_index, first_sign), (second_index, second_sign) = options
    answer = {}
    for second_power in range(exponent + 1):
        first_power = exponent - second_power
        monomial = [0] * len(VARIABLES)
        monomial[first_index] = first_power
        monomial[second_index] = second_power
        coefficient = math.comb(exponent, second_power) * first_sign**first_power * second_sign**second_power
        answer[tuple(monomial)] = coefficient
    return answer


def multiply_sparse(left, right):
    answer = defaultdict(int)
    for left_monomial, left_coefficient in left.items():
        for right_monomial, right_coefficient in right.items():
            answer[add_monomials(left_monomial, right_monomial)] += left_coefficient * right_coefficient
    return {monomial: coefficient for monomial, coefficient in answer.items() if coefficient}


def substitute(base_terms, d_defect, f_shift):
    # Base order: d3,d4,d5,d6,f3,f4,f5,f6.
    maps = []
    for index in range(4):
        maps.append(((index, 1), (9 + index, -1)) if d_defect else ((index, 1), (index, 0)))
    f_targets = ((5, 4), (6, 5), (7, 6), (8, 7))
    for current, previous in f_targets:
        maps.append(((current, 1), (previous, 1)) if f_shift else ((current, 1), (current, 0)))

    answer = defaultdict(int)
    peak_terms = 0
    for base_monomial, base_coefficient in base_terms:
        expanded = {ZERO: base_coefficient}
        for options, exponent in zip(maps, base_monomial):
            if exponent:
                # The duplicate zero-sign option is harmless but remove it to
                # keep unshifted variables one-term.
                if options[1][1] == 0:
                    factor = {tuple(1 if i == options[0][0] else 0 for i in range(len(VARIABLES))): 1}
                    power = {ZERO: 1}
                    for _ in range(exponent):
                        power = multiply_sparse(power, factor)
                else:
                    power = expand_linear_power(options, exponent)
                expanded = multiply_sparse(expanded, power)
        for monomial, coefficient in expanded.items():
            answer[monomial] += coefficient
        peak_terms = max(peak_terms, len(answer))
        forest.gate()
    return {monomial: coefficient for monomial, coefficient in answer.items() if coefficient}, peak_terms


def difference(left, right):
    answer = defaultdict(int, left)
    for monomial, coefficient in right.items():
        answer[monomial] -= coefficient
    return {monomial: coefficient for monomial, coefficient in answer.items() if coefficient}


def canonical_sha(polynomial):
    rows = [[list(monomial), str(polynomial[monomial])] for monomial in sorted(polynomial, reverse=True)]
    return hashlib.sha256(json.dumps(rows, separators=(",", ":")).encode()).hexdigest().upper()


def record(polynomial):
    coefficients = list(polynomial.values())
    by_w_degree = {}
    for degree in sorted({sum(monomial[9:]) for monomial in polynomial}):
        selected = [coefficient for monomial, coefficient in polynomial.items() if sum(monomial[9:]) == degree]
        by_w_degree[str(degree)] = {
            "terms": len(selected),
            "negative": sum(value < 0 for value in selected),
            "positive": sum(value > 0 for value in selected),
        }
    gcd = 0
    for coefficient in coefficients:
        gcd = math.gcd(gcd, abs(coefficient))
    common_monomial = [min(monomial[index] for monomial in polynomial) for index in range(len(VARIABLES))]
    negative_examples = [
        {"monomial": list(monomial), "coefficient": str(coefficient)}
        for monomial, coefficient in sorted(polynomial.items(), reverse=True)
        if coefficient < 0
    ][:5]
    positive_examples = [
        {"monomial": list(monomial), "coefficient": str(coefficient)}
        for monomial, coefficient in sorted(polynomial.items(), reverse=True)
        if coefficient > 0
    ][:5]
    return {
        "terms": len(polynomial),
        "negative": sum(value < 0 for value in coefficients),
        "positive": sum(value > 0 for value in coefficients),
        "coefficient_gcd": str(gcd),
        "common_monomial": common_monomial,
        "by_total_w_degree": by_w_degree,
        "negative_examples": negative_examples,
        "positive_examples": positive_examples,
        "sha256": canonical_sha(polynomial),
    }


def main() -> None:
    assert sha256(TERMS_FILE) == TERMS_SHA
    payload = json.loads(TERMS_FILE.read_text(encoding="utf-8"))
    base_terms = tuple((tuple(row[0]), int(row[1])) for row in payload["terms"])
    assert len(base_terms) == 281

    parent, peak_parent = substitute(base_terms, d_defect=False, f_shift=False)
    f_shifted, peak_f = substitute(base_terms, d_defect=False, f_shift=True)
    child, peak_child = substitute(base_terms, d_defect=True, f_shift=True)
    f_effect = difference(parent, f_shifted)
    d_effect = difference(f_shifted, child)
    total = difference(parent, child)
    assert difference(f_effect, difference(total, d_effect)) == {}

    records = {
        "F_multiplication_effect_G_D_F_minus_G_D_1plusxF": record(f_effect),
        "D_defect_effect_G_D_1plusxF_minus_G_Dminusx2W_1plusxF": record(d_effect),
        "total_parent_minus_child": record(total),
    }
    output = {
        "schema": "rank8-delta2-isolated-block-symbolic-transition-v1",
        "status": "PASS_EXACT_SYMBOLIC_SPLIT_SIGN_RECORDED_NO_THEOREM_CLAIM",
        "variables": list(VARIABLES),
        "identity": "D_child=D_parent-x^2 W and F_child=(1+x)F, hence G(D,F)-G(D_child,F_child)=[G(D,F)-G(D,(1+x)F)]+[G(D,(1+x)F)-G(D-x^2W,(1+x)F)].",
        "records": records,
        "construction_peak_sparse_terms": max(peak_parent, peak_f, peak_child),
        "input_sha256": {TERMS_FILE.name: sha256(TERMS_FILE)},
        "resources": {"abort_private_bytes": forest.ABORT_BYTES},
        "proof_boundary": "Coefficientwise signs here are on a relaxed polynomial ring in D,F,W. Mixed signs are only a method obstruction because realizable blocks impose strong compatibility. This does not prove or disprove the component-adjunction inequality and gives no Delta2 or global credit.",
    }
    OUTPUT.write_text(json.dumps(output, indent=2) + "\n", encoding="utf-8")
    print(output["status"])
    for name, row in records.items():
        print(name, row["terms"], row["negative"], row["positive"], row["sha256"])
    print("SOURCE", sha256(Path(__file__)))
    print("REPORT", sha256(OUTPUT))


if __name__ == "__main__":
    main()
