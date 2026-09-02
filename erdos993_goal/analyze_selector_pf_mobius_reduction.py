#!/usr/bin/env python3
"""Exact replay for the Pólya-frequency Möbius reduction of the selector.

Let k=floor(s/2), d=k+2, and

    Gamma(t)=G_N(t)-2tG_(N-1)(t)+t^2G_(N-2)(t).

The Möbius map t=x/(1+x), equivalently x=t/(1-t), sends both target
intervals t<0 and t>1 onto x<0.  Define

    hat(P)(x)=(1+x)^k P(x/(1+x)),
    H(x)=(1+x)^d Gamma(x/(1+x)).

Then the exact finite-difference identity is

    H=(1+x)^2 hat(Delta^2 G_N)
       +2(1+x)hat(Delta G_(N-1))+hat(G_(N-2)).       (PF)

Coefficientwise monotonicity and convexity of G in N make every coefficient
on the right nonnegative (in fact H is strictly positive coefficientwise).
Thus the mixed selector root-location theorem is equivalent to the ordinary
statement that H is real-rooted: positive coefficients then force all its
roots to be negative.  The k roots in (-1,0) correspond to the negative
Gamma roots, while the two roots below -1 correspond to the roots above 1.

The all-order content here is the Möbius equivalence, identity (PF), and
coefficient positivity, using the already proved coefficient-convexity
theorem.  The real-rootedness and common-interlacing checks below are finite
evidence for the remaining PF-infinity theorem, not its proof.
"""

from __future__ import annotations

import argparse
import hashlib
import json
import math
from pathlib import Path

from flint import ctx

from analyze_selector_nested_chain_reduction import (
    certified_real_roots,
    selector,
    whipple_gamma,
)


HERE = Path(__file__).resolve().parent
REPORT = HERE / "selector_pf_mobius_reduction_exact_20260809.json"


def add(*polynomials: list[int]) -> list[int]:
    size = max(map(len, polynomials))
    return [sum(p[i] if i < len(p) else 0 for p in polynomials) for i in range(size)]


def scale(polynomial: list[int], factor: int) -> list[int]:
    return [factor * value for value in polynomial]


def convolve(left: list[int], right: list[int]) -> list[int]:
    out = [0] * (len(left) + len(right) - 1)
    for i, a in enumerate(left):
        for j, b in enumerate(right):
            out[i + j] += a * b
    return out


def mobius_hat(polynomial: list[int], target_degree: int | None = None) -> list[int]:
    degree = len(polynomial) - 1 if target_degree is None else target_degree
    assert degree >= len(polynomial) - 1
    out = [0] * (degree + 1)
    for i, value in enumerate(polynomial):
        for j in range(i, degree + 1):
            out[j] += value * math.comb(degree - i, j - i)
    return out


def difference(current: list[int], previous: list[int]) -> list[int]:
    return [
        (current[i] if i < len(current) else 0)
        - (previous[i] if i < len(previous) else 0)
        for i in range(max(len(current), len(previous)))
    ]


def one_case(layer: int, excess: int) -> dict[str, object]:
    N = 2 * layer + 5 + excess
    G0, G1, G2 = [whipple_gamma(N - shift, layer) for shift in range(3)]
    first_previous = difference(G1, G2)
    second = difference(difference(G0, G1), first_previous)
    assert all(value >= 0 for value in first_previous)
    assert all(value >= 0 for value in second)

    signed = selector(G0, G1, G2)
    d = len(signed) - 1
    k = len(G0) - 1
    assert d == k + 2
    H_direct = mobius_hat(signed, d)
    H_pf = add(
        convolve(mobius_hat(second, k), [1, 2, 1]),
        scale(convolve(mobius_hat(first_previous, k), [1, 1]), 2),
        mobius_hat(G2, k),
    )
    assert H_direct == H_pf
    assert all(value > 0 for value in H_direct)

    component_polynomials = [second, first_previous, G2]
    component_roots = []
    for polynomial in component_polynomials:
        transformed = mobius_hat(polynomial, k)
        roots, nonreal = certified_real_roots(transformed)
        assert nonreal == 0 and len(roots) == k
        # The second difference in the boundary layer s=2 drops degree and
        # acquires the padding root -1.  All non-padding roots are strict.
        assert all(-1 <= root < 0 for root in roots)
        component_roots.append(roots)

    strict_three_level_chain = True
    minimum_chain_gap = None
    for i in range(k):
        a, b, c = [roots[i] for roots in component_roots]
        gaps = [float(b.mid()) - float(a.mid()), float(c.mid()) - float(b.mid())]
        if i + 1 < k:
            gaps.append(float(component_roots[0][i + 1].mid()) - float(c.mid()))
        strict_three_level_chain &= all(gap > 0 for gap in gaps)
        local = min(gaps)
        minimum_chain_gap = local if minimum_chain_gap is None else min(minimum_chain_gap, local)
    assert strict_three_level_chain

    roots_H, nonreal_H = certified_real_roots(H_direct)
    below_minus_one = sum(root < -1 for root in roots_H)
    between_minus_one_zero = sum(-1 < root < 0 for root in roots_H)
    assert nonreal_H == 0 and len(roots_H) == d
    assert below_minus_one == 2
    assert between_minus_one_zero == k

    return {
        "layer": layer,
        "N": N,
        "forest_excess": excess,
        "selector_degree": d,
        "pf_identity_exact": True,
        "H_coefficients_strictly_positive": True,
        "finite_difference_components_negative_rooted_in_closed_minus_one_open_zero": True,
        "strict_three_level_component_chain": True,
        "minimum_chain_midpoint_gap": minimum_chain_gap,
        "H_roots_below_minus_one": below_minus_one,
        "H_roots_between_minus_one_and_zero": between_minus_one_zero,
    }


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--max-layer", type=int, default=100)
    parser.add_argument("--output", type=Path, default=REPORT)
    args = parser.parse_args()
    ctx.prec = 160

    excesses = (0, 1, 17, 73)
    records = [
        one_case(layer, excess)
        for layer in range(2, args.max_layer + 1)
        for excess in excesses
    ]
    source_hash = hashlib.sha256(Path(__file__).read_bytes()).hexdigest().upper()
    report = {
        "status": "PASS_EXACT_SELECTOR_PF_MOBIUS_REDUCTION_REPLAY",
        "all_order_reduction": [
            "x=t/(1-t) sends t<0 to -1<x<0 and t>1 to x<-1",
            "H=(1+x)^d Gamma(x/(1+x)) has the positive finite-difference decomposition (PF)",
            "coefficientwise monotonicity and convexity of G make H strictly coefficient-positive",
            "therefore the selector theorem is equivalent to ordinary negative real-rootedness of H",
        ],
        "finite_replay_scope": {
            "layers": [2, args.max_layer],
            "forest_excesses": list(excesses),
            "cases": len(records),
        },
        "finite_replay_conclusions": {
            "all_pf_identities_exact": True,
            "all_H_coefficients_strictly_positive": True,
            "all_three_component_chains_strict": True,
            "all_H_have_two_roots_below_minus_one_and_all_others_between_minus_one_and_zero": True,
        },
        "remaining_proof_target": (
            "Prove that the three transformed finite-difference components in (PF) "
            "form an all-order compatible/common-interlacing family; this would make "
            "their positive sum H negative-rooted and close the selector theorem."
        ),
        "source_sha256": source_hash,
        "records": records,
    }
    args.output.write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    report_hash = hashlib.sha256(args.output.read_bytes()).hexdigest().upper()
    print(json.dumps({
        "status": report["status"],
        "cases": len(records),
        "max_layer": args.max_layer,
        "source_sha256": source_hash,
        "report_sha256": report_hash,
        "report": str(args.output),
    }, indent=2))


if __name__ == "__main__":
    main()
