#!/usr/bin/env python3
"""Exact large-order certificate for the open Delta1 new-leaf mask 3.

For D=A-v and F=A-N[v], two elementary shadow counts couple the otherwise
independent containment coordinates.  At |D|=180 their resulting two-box
enclosure has a coefficientwise nonnegative tensor Bernstein expansion.
All four order-dependent bounds tighten monotonically, so the same enclosure
proves the endpoint numerator for every |D|>=180.
"""

from __future__ import annotations

import hashlib
import itertools
import json
import math
import os
from fractions import Fraction
from pathlib import Path

import sympy as sp

import analyze_rank8_delta03_arbitrary_leaf_extension_q_corner_agent as corner


HERE = Path(__file__).resolve().parent
OUTPUT = HERE / "rank8_delta1_new_leaf_mask3_large_order_shadow_box_root_20260825.json"
CUTOFF = 180

PINNED = {
    "analyze_rank8_delta03_arbitrary_leaf_extension_q_corner_agent.py":
        "D3A17F85CC3E31A229BED7E16201FCDA031E8C9D63ED5568AF0F90D0A66DBBBB",
    "analyze_rank8_delta03_arbitrary_leaf_extension_symbolic_agent.py":
        "CC1F0204C2CBE3B202E35CEB60EBD6FA847CBEF1BE74DD255023198AB3707BAA",
    "verify_rank8_q8_terminal_reduction.py":
        "389216D19951A28784C46E57393F1F9CD5BBE41625DCD317C664F701EC2EC4B7",
    "rank8_delta03_arbitrary_leaf_extension_new_leaf_r1_m03_q_corner_agent_20260823.json":
        "2ED841411515F64B53226DE715A98CB28182CA6CCD2EAC0858F7E59D0CC297AB",
    "verify_uniform_vk_large_order_reduction.py":
        "F340C4C1C45B9F10B7794DD17139594E4EC9789CA988870A46BB11B1D0DFF5B8",
    "uniform_vk_large_order_reduction_exact_20260816.json":
        "6BE4C4D6E01C1EBE7F48CA9F70AF579E0036C47EB26B7F5415E8D5FF28D5B4C5",
}

EXPECTED_REGIONS = {
    "low_u5": {
        "degrees": [8, 1, 5, 1, 4],
        "coefficients": 1080,
        "negative": 0,
        "zero": 120,
        "positive": 960,
        "minimum": "0",
        "first_negative": None,
        "ordered_sha256": "4EB666FFF1F9FE1D7A347D29972D697DCD5955DC7AAF463CC09D9744CD267BA9",
    },
    "high_u5": {
        "degrees": [8, 1, 4, 1, 4],
        "coefficients": 900,
        "negative": 0,
        "zero": 100,
        "positive": 800,
        "minimum": "0",
        "first_negative": None,
        "ordered_sha256": "50C706C54A01C8606D48E0C5BFEC8D3B43DFF90A1E062441E031DE7F770FBABE",
    },
}


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def canonical_record(expression: sp.Expr) -> dict[str, object]:
    generators = sorted(expression.free_symbols, key=str)
    polynomial = sp.Poly(sp.expand(expression), *generators)
    terms = polynomial.terms()
    serial = json.dumps(
        {
            "generators": [str(value) for value in generators],
            "terms": [
                [list(monomial), str(coefficient)]
                for monomial, coefficient in terms
            ],
        },
        sort_keys=True,
        separators=(",", ":"),
    ).encode()
    return {
        "generators": [str(value) for value in generators],
        "terms": len(terms),
        "negative": sum(1 for _, coefficient in terms if coefficient < 0),
        "positive": sum(1 for _, coefficient in terms if coefficient > 0),
        "sha256": hashlib.sha256(serial).hexdigest().upper(),
    }


def bernstein_record(polynomial: sp.Poly) -> dict[str, object]:
    degrees = tuple(polynomial.degree(variable) for variable in polynomial.gens)
    power = {
        monomial: Fraction(int(coefficient.p), int(coefficient.q))
        for monomial, coefficient in polynomial.terms()
    }
    count = negative = zero = positive = 0
    minimum: Fraction | None = None
    first_negative = None
    digest = hashlib.sha256()
    for index in itertools.product(*(range(degree + 1) for degree in degrees)):
        value = Fraction(0)
        for monomial, coefficient in power.items():
            if any(source > target for source, target in zip(monomial, index)):
                continue
            weight = Fraction(1)
            for source, target, degree in zip(monomial, index, degrees):
                weight *= Fraction(
                    math.comb(target, source), math.comb(degree, source)
                )
            value += coefficient * weight
        count += 1
        digest.update((",".join(map(str, index)) + ":" + str(value) + "\n").encode())
        minimum = value if minimum is None else min(minimum, value)
        if value < 0:
            negative += 1
            if first_negative is None:
                first_negative = {"index": list(index), "value": str(value)}
        elif value == 0:
            zero += 1
        else:
            positive += 1
    return {
        "degrees": list(degrees),
        "coefficients": count,
        "negative": negative,
        "zero": zero,
        "positive": positive,
        "minimum": str(minimum),
        "first_negative": first_negative,
        "ordered_sha256": digest.hexdigest().upper(),
    }


def monotonicity_record() -> dict[str, object]:
    N = sp.symbols("N", real=True)
    x = sp.cancel(6 * N / (N**2 - 15 * N + 10))
    y = sp.cancel(5 * N / (N**2 - 12 * N + 8))
    k4 = sp.factor(4 / ((N - 4) * y))
    k6 = sp.factor((N - 5) * x / 6)
    derivatives = [sp.factor(sp.diff(value, N)) for value in (x, y, k4, k6)]
    expected = [
        -6 * (N**2 - 10) / (N**2 - 15 * N + 10) ** 2,
        -5 * (N**2 - 8) / (N**2 - 12 * N + 8) ** 2,
        32 * (N**2 - 2 * N + 4) / (5 * N**2 * (N - 4) ** 2),
        -10 * (N**2 - 2 * N + 5) / (N**2 - 15 * N + 10) ** 2,
    ]
    assert all(sp.cancel(left - right) == 0 for left, right in zip(derivatives, expected))
    values = [sp.cancel(value.subs(N, CUTOFF)) for value in (x, y, k4, k6)]
    assert values == [
        sp.Rational(108, 2971), sp.Rational(225, 7562),
        sp.Rational(3781, 4950), sp.Rational(3150, 2971),
    ]
    return {
        "functions": {
            "x_upper_d5_over_d6": str(x),
            "y_upper_d4_over_d5": str(y),
            "k4_missing_shadow": str(k4),
            "k6_internal_shadow": str(k6),
        },
        "derivatives": {
            "x_upper": str(derivatives[0]),
            "y_upper": str(derivatives[1]),
            "k4": str(derivatives[2]),
            "k6": str(derivatives[3]),
        },
        "directions_for_N_ge_180": {
            "x_upper": "strictly_decreasing",
            "y_upper": "strictly_decreasing",
            "k4": "strictly_increasing",
            "k6": "strictly_decreasing",
        },
        "cutoff_values": {
            "x_upper": str(values[0]),
            "y_upper": str(values[1]),
            "k4": str(values[2]),
            "k6": str(values[3]),
        },
    }


def main() -> None:
    actual = {name: sha256(HERE / name) for name in PINNED}
    assert actual == PINNED, (actual, PINNED)
    theorem = json.loads(
        (HERE / "uniform_vk_large_order_reduction_exact_20260816.json").read_text(
            encoding="utf-8"
        )
    )
    assert theorem["status"] == "PASS_EXACT_UNIFORM_VK_LARGE_ORDER_REDUCTION"
    assert theorem["theorems"]["extension_mean"] == "mu_s >= n-3s+2s/n"
    numerator, metadata = corner.new_leaf_corner(1, 3)
    raw = canonical_record(numerator)
    raw_reference = json.loads(
        (
            HERE
            / "rank8_delta03_arbitrary_leaf_extension_new_leaf_r1_m03_"
              "q_corner_agent_20260823.json"
        ).read_text(encoding="utf-8")
    )
    assert raw == raw_reference["cleared_numerator"]
    assert raw["terms"] == 139
    assert raw["sha256"] == "5298C43C68E11DEA0072E4BF78AFB212FB32ACEC84C6FC25C492EEC4C050404E"
    monotonicity = monotonicity_record()

    X, Y, S, V4, V6 = sp.symbols("X Y S V4 V6", nonnegative=True)
    x_bound = sp.Rational(108, 2971)
    y_bound = sp.Rational(225, 7562)
    k4 = sp.Rational(3781, 4950)
    k6 = sp.Rational(3150, 2971)
    regions = []
    for region in ("low_u5", "high_u5"):
        if region == "low_u5":
            u5 = S / k6
            u6 = S * V6
        else:
            u5 = 1 / k6 + (1 - 1 / k6) * S
            u6 = V6
        u4 = (1 - k4 * (1 - u5)) * V4
        normalized = sp.expand(
            numerator.subs(
                {
                    corner.leaf.d[6]: 1,
                    corner.leaf.d[5]: x_bound * X,
                    corner.leaf.d[4]: x_bound * y_bound * X * Y,
                    corner.leaf.f[6]: u6,
                    corner.leaf.f[5]: x_bound * X * u5,
                    corner.leaf.f[4]: x_bound * y_bound * X * Y * u4,
                },
                simultaneous=True,
            )
        )
        polynomial = sp.Poly(normalized, X, Y, S, V4, V6, domain=sp.QQ)
        result = bernstein_record(polynomial)
        assert result == EXPECTED_REGIONS[region]
        regions.append(
            {
                "region": region,
                "u5": str(u5),
                "u6": str(u6),
                "u4": str(u4),
                "normalized_power_terms": len(polynomial.terms()),
                "bernstein": result,
            }
        )
        print(
            "REGION", region, "TERMS", len(polynomial.terms()),
            "NEG", result["negative"], "ZERO", result["zero"], flush=True,
        )

    payload = {
        "schema": "rank8-delta1-new-leaf-mask3-large-order-shadow-box-v1",
        "status": "PASS_EXACT_DELTA1_NEW_LEAF_MASK3_FOR_D_ORDER_AT_LEAST_180",
        "theorem": (
            "Let A be a tree, v a vertex, D=A-v, F=A-N[v], and attach a new "
            "leaf w at v. If |D|>=180, then the Delta1 new-leaf residual at the "
            "joint upper endpoint c8=Q7(C)_upper, d7=Q6(D)_upper is nonnegative."
        ),
        "shadow_lemmas": {
            "internal_F": (
                "Count pairs (T,S) with T an independent 5-set of F contained "
                "in an independent 6-set S of F: 6 f6 <= (N-5) f5."
            ),
            "missing_from_F": (
                "Put R=V(D)\\V(F). Every independent 5-set of D meeting R has "
                "at least four independent 4-subsets meeting R, while each such "
                "4-set has at most N-4 extensions: 4(d5-f5) <= "
                "(N-4)(d4-f4)."
            ),
            "normalized_consequences": [
                "U6 <= k6(N) U5",
                "U4 <= 1-k4(N)(1-U5)",
            ],
        },
        "selected_degree_inputs": [
            "d5/d6 <= x_upper(N)=6N/(N^2-15N+10)",
            "d4/d5 <= y_upper(N)=5N/(N^2-12N+8)",
        ],
        "monotonic_enclosure": monotonicity,
        "cutoff_D_order": CUTOFF,
        "source_A_order_cutoff": CUTOFF + 1,
        "regions": regions,
        "raw_endpoint_numerator": raw,
        "positive_denominator": metadata["positive_denominator"],
        "support_guard": (
            "For N>=180 the bipartite forest D has alpha(D)>=90, so d4,d5,d6 "
            "are positive and the endpoint denominator is strictly positive."
        ),
        "proof_boundary": (
            "This closes only mask 3 for |D|>=180. Together with the separate "
            "masks 0-2 certificate it closes the four Delta1 new-leaf endpoints "
            "only in that large-order range. Orders 26<=|D|<=179 and all old-root "
            "gates remain outside this theorem."
        ),
        "pinned_inputs": actual,
        "source_sha256": sha256(Path(__file__)),
    }
    temporary = OUTPUT.with_suffix(OUTPUT.suffix + ".tmp")
    temporary.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    os.replace(temporary, OUTPUT)
    print(payload["status"])
    print("SOURCE", sha256(Path(__file__)))
    print("REPORT", sha256(OUTPUT))


if __name__ == "__main__":
    main()
