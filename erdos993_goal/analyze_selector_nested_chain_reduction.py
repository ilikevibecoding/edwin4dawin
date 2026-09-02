#!/usr/bin/env python3
"""Exact replay and all-order reductions for the signed path selector.

For

    P_M(u) = sum_i binom(2M-i-1,i) u^i

let G_(M,s)(t) be defined by

    [U^s] P_M(aU)P_M(bU) = G_(M,s)(t),
    a+b=1, ab=t.

The forest selector is

    Gamma_(N,s)=G_(N,s)-2t G_(N-1,s)+t^2 G_(N-2,s).

This file records three useful facts.

1. A specialization of Whipple's quadratic 4F3 transformation gives an
   exact coefficient formula for G.  If r=(1+sqrt(1-u))/2 and

       F_(M,s)(u)=(1-u)^(s-2M) r^(2M)=sum_h S_(M,s,h)u^h,

   then

       [t^h]G_(M,s)=4^h binom(2M-s-1,s-2h) S_(M,s,h).       (W)

   In the Catalan coordinate u=4x/(1+x)^2,

       F_(M,s)=(1+x)^(2M-2s)(1-x)^(2s-4M),
       F_(M-1,s)/F_(M,s)=(1-x)^4/(1+x)^2.                  (C)

   Equations (W)--(C) are all-order algebraic identities.  They expose a
   fixed rational size-lowering factor behind the three signed terms.

2. Suppose the negative zeros a_i,b_i,c_i of G_N,G_(N-1),G_(N-2), in
   increasing order, satisfy

       a_i < b_i < c_i < a_(i+1),                           (I)

   with the evident last interval.  At c_i, the two nonzero summands in
   Gamma have the same alternating sign.  Gamma has the opposite sign at
   -infinity before c_1.  Hence Gamma has one negative zero in each of

       (-infinity,c_1),(c_1,c_2),...,(c_(k-1),c_k),

   where k=floor(s/2).  Thus (I) forces all k required negative roots;
   only two degrees remain.

3. The script independently checks (W), strict chain (I), coefficientwise
   first/second size differences, and the final selector root counts on a
   finite exact grid.  The finite grid is evidence, not the proof of (I).
"""

from __future__ import annotations

import argparse
import hashlib
import json
import math
from fractions import Fraction
from pathlib import Path

from flint import ctx, fmpq, fmpq_poly, fmpz_poly

from probe_group_selector_gamma_root_pattern import (
    gamma_coefficients,
    path_slice,
    root_count,
    sturm_chain,
)


HERE = Path(__file__).resolve().parent
REPORT = HERE / "selector_nested_chain_reduction_exact_20260809.json"


def choose(n: int, k: int) -> int:
    return math.comb(n, k) if 0 <= k <= n else 0


def convolve(left: list[Fraction], right: list[Fraction], limit: int) -> list[Fraction]:
    out = [Fraction(0) for _ in range(limit + 1)]
    for i, x in enumerate(left):
        for j, y in enumerate(right):
            if i + j <= limit:
                out[i + j] += x * y
    return out


def binomial_series(alpha: int, limit: int) -> list[Fraction]:
    """Coefficients of (1-u)^(-alpha), allowing any integer alpha."""
    if alpha >= 0:
        return [Fraction(choose(alpha + h - 1, h)) for h in range(limit + 1)]
    degree = -alpha
    return [
        Fraction((-1) ** h * choose(degree, h) if h <= degree else 0)
        for h in range(limit + 1)
    ]


def pochhammer(value: Fraction, order: int) -> Fraction:
    out = Fraction(1)
    for j in range(order):
        out *= value + j
    return out


def inner_whipple_coefficients(M: int, s: int, limit: int) -> list[Fraction]:
    """S_h in Whipple's formula, evaluated as one exact convolution."""
    # (1-u)^-(2M-s-1/2) * 2F1(1/2-M,1-M;1-2M;u)
    first = [
        pochhammer(Fraction(2 * M - s, 1) - Fraction(1, 2), h)
        / math.factorial(h)
        for h in range(limit + 1)
    ]
    second = [
        pochhammer(Fraction(1, 2) - M, h)
        * pochhammer(Fraction(1) - M, h)
        / (pochhammer(Fraction(1 - 2 * M), h) * math.factorial(h))
        for h in range(limit + 1)
    ]
    return convolve(first, second, limit)


def whipple_gamma(M: int, s: int) -> list[int]:
    degree = s // 2
    inner = inner_whipple_coefficients(M, s, degree)
    answer: list[int] = []
    for h, value in enumerate(inner):
        coefficient = Fraction(4**h * choose(2 * M - s - 1, s - 2 * h)) * value
        assert coefficient.denominator == 1
        answer.append(coefficient.numerator)
    return answer


def integer_poly(values: list[int]) -> fmpz_poly:
    while len(values) > 1 and values[-1] == 0:
        values.pop()
    return fmpz_poly(values)


def certified_real_roots(values: list[int]):
    roots = []
    nonreal = 0
    for root, multiplicity in integer_poly(list(values)).complex_roots():
        if root.imag.is_zero():
            roots.extend([root.real] * multiplicity)
        else:
            nonreal += multiplicity
    roots.sort(key=lambda item: float(item.mid()))
    return roots, nonreal


def selector(G0: list[int], G1: list[int], G2: list[int]) -> list[int]:
    out = []
    for h in range(max(len(G0), len(G1) + 1, len(G2) + 2)):
        out.append(
            (G0[h] if h < len(G0) else 0)
            - 2 * (G1[h - 1] if 0 <= h - 1 < len(G1) else 0)
            + (G2[h - 2] if 0 <= h - 2 < len(G2) else 0)
        )
    while len(out) > 1 and out[-1] == 0:
        out.pop()
    return out


def differences(values: list[list[int]]) -> tuple[list[int], list[int]]:
    current, previous, older = values
    first = [
        (current[h] if h < len(current) else 0)
        - (previous[h] if h < len(previous) else 0)
        for h in range(max(len(current), len(previous)))
    ]
    second = [
        (current[h] if h < len(current) else 0)
        - 2 * (previous[h] if h < len(previous) else 0)
        + (older[h] if h < len(older) else 0)
        for h in range(max(len(current), len(previous), len(older)))
    ]
    return first, second


def one_case(N: int, s: int) -> dict[str, object]:
    components = [gamma_coefficients(path_slice(M, s), s) for M in (N, N - 1, N - 2)]
    for shift, coefficients in enumerate(components):
        assert coefficients == whipple_gamma(N - shift, s)

    roots = [certified_real_roots(coefficients) for coefficients in components]
    assert all(nonreal == 0 for _, nonreal in roots)
    assert all(all(root < 0 for root in real) for real, _ in roots)
    root_lists = [real for real, _ in roots]
    degree = len(root_lists[0])
    assert all(len(real) == degree for real in root_lists)

    nested = True
    minimum_gap = None
    for i in range(degree):
        a, b, c = root_lists[0][i], root_lists[1][i], root_lists[2][i]
        comparisons = [float(b.mid()) - float(a.mid()), float(c.mid()) - float(b.mid())]
        if i + 1 < degree:
            comparisons.append(float(root_lists[0][i + 1].mid()) - float(c.mid()))
        nested = nested and all(gap > 0 for gap in comparisons)
        local = min(comparisons)
        minimum_gap = local if minimum_gap is None else min(minimum_gap, local)
    assert nested

    first, second = differences(components)
    assert all(value >= 0 for value in first) and any(value > 0 for value in first)
    assert all(value >= 0 for value in second) and any(value > 0 for value in second)

    signed = selector(*components)
    chain = sturm_chain(signed)
    polynomial = fmpq_poly(signed)
    negative = root_count(chain, "-inf", fmpq(0))
    below_one = root_count(chain, fmpq(0), fmpq(1))
    above_one = root_count(chain, fmpq(1), "+inf")
    total = root_count(chain, "-inf", "+inf")
    assert total == polynomial.degree()
    assert negative == degree
    assert below_one == 0
    assert above_one == polynomial.degree() - degree

    return {
        "N": N,
        "s": s,
        "component_degree": degree,
        "selector_degree": polynomial.degree(),
        "strict_nested_chain": nested,
        "minimum_midpoint_gap": minimum_gap,
        "coefficientwise_first_difference_nonnegative_nonzero": True,
        "coefficientwise_second_difference_nonnegative_nonzero": True,
        "selector_negative_roots": negative,
        "selector_roots_in_0_1": below_one,
        "selector_roots_above_1": above_one,
    }


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--max-layer", type=int, default=50)
    parser.add_argument("--output", type=Path, default=REPORT)
    args = parser.parse_args()
    ctx.prec = 160

    # The first point is the sharp forest-cone boundary N=2s+5.  The other
    # points add progressively larger amounts of the two nonnegative forest
    # slack parameters.
    forest_excesses = (0, 1, 17, 73)
    records = []
    for s in range(2, args.max_layer + 1):
        for excess in forest_excesses:
            records.append(one_case(2 * s + 5 + excess, s))

    source_hash = hashlib.sha256(Path(__file__).read_bytes()).hexdigest().upper()
    report = {
        "status": "PASS_EXACT_SELECTOR_NESTED_CHAIN_REDUCTION_REPLAY",
        "all_order_identities": [
            "Whipple coefficient formula (W)",
            "Catalan-coordinate size ratio (C)",
            "strict nested chain (I) implies one selector root in each negative interval",
            "coefficientwise convexity implies Gamma(t)>0 on 0<=t<=1 via the exact second-difference decomposition",
        ],
        "exact_replay_scope": {
            "layers": [2, args.max_layer],
            "N_rule": "N=2s+5+excess",
            "forest_excesses": list(forest_excesses),
            "cases": len(records),
            "maximum_component_degree": max(record["component_degree"] for record in records),
        },
        "finite_replay_conclusions": {
            "all_whipple_identities": True,
            "all_strict_nested_chains": True,
            "all_first_and_second_coefficient_differences_nonnegative_nonzero": True,
            "all_selectors_have_two_roots_above_one_and_all_other_roots_negative": True,
        },
        "remaining_proof_target": (
            "Promote the strict nested chain for G_(M,s), and preferably its "
            "coefficientwise size convexity, from this exact finite replay to "
            "an all-order theorem using the fixed Catalan-coordinate ratio."
        ),
        "source_sha256": source_hash,
        "records": records,
    }
    args.output.write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    report_hash = hashlib.sha256(args.output.read_bytes()).hexdigest().upper()
    print(json.dumps({
        "status": report["status"],
        "cases": len(records),
        "max_degree": report["exact_replay_scope"]["maximum_component_degree"],
        "source_sha256": source_hash,
        "report_sha256": report_hash,
        "report": str(args.output),
    }, indent=2))


if __name__ == "__main__":
    main()
