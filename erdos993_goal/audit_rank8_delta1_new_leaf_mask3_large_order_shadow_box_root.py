#!/usr/bin/env python3
"""Independent replay of the Delta1 mask-3 large-order shadow certificate."""

from __future__ import annotations

import hashlib
import itertools
import json
import math
import os
from fractions import Fraction
from pathlib import Path

import sympy as sp

import audit_rank8_delta1_new_leaf_masks012_normalized_containment_box_root as transcript


HERE = Path(__file__).resolve().parent
OUTPUT = HERE / (
    "rank8_delta1_new_leaf_mask3_large_order_shadow_box_"
    "independent_audit_root_20260825.json"
)

EXPECTED = {
    "prove_rank8_delta1_new_leaf_mask3_large_order_shadow_box_root.py":
        "88A36B35F4025046F6F41ABD539C2F1A30EFFF32E2FFF7491E7EBDF6546AFF1C",
    "rank8_delta1_new_leaf_mask3_large_order_shadow_box_root_20260825.json":
        "3185E1FC1FC723CDD97E9B7B17B94583C5FDD5285D4BC26B0E9CD7CB7D082660",
    "audit_rank8_delta1_new_leaf_masks012_normalized_containment_box_root.py":
        "A96B75C97B37646912ECE5E8843D72616BBF6A2089E0A6C14D86F32E3C948289",
    "rank8_delta1_new_leaf_masks012_normalized_containment_box_independent_audit_root_20260825.json":
        "549141288E11B8BA0902E1A30E1211258A590180FD8AB9E6ED6398828AEE076A",
    "verify_uniform_vk_large_order_reduction.py":
        "F340C4C1C45B9F10B7794DD17139594E4EC9789CA988870A46BB11B1D0DFF5B8",
    "uniform_vk_large_order_reduction_exact_20260816.json":
        "6BE4C4D6E01C1EBE7F48CA9F70AF579E0036C47EB26B7F5415E8D5FF28D5B4C5",
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


def main() -> None:
    actual = {name: sha256(HERE / name) for name in EXPECTED}
    assert actual == EXPECTED, (actual, EXPECTED)
    primary = json.loads(
        (
            HERE / "rank8_delta1_new_leaf_mask3_large_order_shadow_box_root_20260825.json"
        ).read_text(encoding="utf-8")
    )
    assert primary["status"] == (
        "PASS_EXACT_DELTA1_NEW_LEAF_MASK3_FOR_D_ORDER_AT_LEAST_180"
    )
    assert primary["cutoff_D_order"] == 180
    assert len(primary["regions"]) == 2

    gate = transcript.delta1_new_leaf_gate()
    numerator, denominator = transcript.endpoint_numerator(gate, 3)
    raw = canonical_record(numerator)
    assert raw == primary["raw_endpoint_numerator"]
    assert raw["sha256"] == "5298C43C68E11DEA0072E4BF78AFB212FB32ACEC84C6FC25C492EEC4C050404E"
    assert str(denominator) == primary["positive_denominator"]

    N = sp.symbols("N", real=True)
    x = sp.cancel(6 * N / (N**2 - 15 * N + 10))
    y = sp.cancel(5 * N / (N**2 - 12 * N + 8))
    k4 = sp.factor(4 / ((N - 4) * y))
    k6 = sp.factor((N - 5) * x / 6)
    derivative_sign_numerators = [
        sp.factor(sp.together(sp.diff(value, N))).as_numer_denom()[0]
        for value in (x, y, k4, k6)
    ]
    assert derivative_sign_numerators == [
        60 - 6 * N**2,
        40 - 5 * N**2,
        32 * (N**2 - 2 * N + 4),
        -10 * (N**2 - 2 * N + 5),
    ]
    cutoff_values = [sp.cancel(value.subs(N, 180)) for value in (x, y, k4, k6)]
    assert cutoff_values == [
        sp.Rational(108, 2971), sp.Rational(225, 7562),
        sp.Rational(3781, 4950), sp.Rational(3150, 2971),
    ]

    X, Y, S, V4, V6 = sp.symbols("X Y S V4 V6", nonnegative=True)
    x_bound, y_bound, k4_bound, k6_bound = cutoff_values
    rows = []
    for index, region in enumerate(("low_u5", "high_u5")):
        if region == "low_u5":
            u5 = S / k6_bound
            u6 = S * V6
        else:
            u5 = 1 / k6_bound + (1 - 1 / k6_bound) * S
            u6 = V6
        u4 = (1 - k4_bound * (1 - u5)) * V4
        normalized = sp.expand(
            numerator.subs(
                {
                    transcript.d[6]: 1,
                    transcript.d[5]: x_bound * X,
                    transcript.d[4]: x_bound * y_bound * X * Y,
                    transcript.f[6]: u6,
                    transcript.f[5]: x_bound * X * u5,
                    transcript.f[4]: x_bound * y_bound * X * Y * u4,
                },
                simultaneous=True,
            )
        )
        polynomial = sp.Poly(normalized, X, Y, S, V4, V6, domain=sp.QQ)
        bernstein = bernstein_record(polynomial)
        reference = primary["regions"][index]
        assert reference["region"] == region
        assert reference["u5"] == str(u5)
        assert reference["u6"] == str(u6)
        assert reference["u4"] == str(u4)
        assert reference["normalized_power_terms"] == len(polynomial.terms())
        assert reference["bernstein"] == bernstein
        assert bernstein["negative"] == 0
        rows.append(
            {
                "region": region,
                "normalized_power_terms": len(polynomial.terms()),
                "bernstein": bernstein,
            }
        )
        print(
            "AUDIT_REGION", region, "TERMS", len(polynomial.terms()),
            "NEG", bernstein["negative"], flush=True,
        )

    payload = {
        "schema": (
            "rank8-delta1-new-leaf-mask3-large-order-shadow-box-"
            "independent-audit-v1"
        ),
        "status": (
            "PASS_INDEPENDENT_EXACT_DELTA1_NEW_LEAF_MASK3_"
            "FOR_D_ORDER_AT_LEAST_180"
        ),
        "independence": (
            "This audit does not import the primary mask-3 producer or its corner "
            "module. It reconstructs the raw numerator through the separately "
            "pinned terminal-residual transcript, then independently repeats the "
            "order arithmetic, region maps, and Bernstein transform."
        ),
        "incidence_proof_audit": [
            "Each independent 6-set of F has six independent 5-subsets; each independent 5-set has at most N-5 one-vertex extensions, giving 6f6<=(N-5)f5.",
            "Each independent 5-set of D meeting R=V(D)\\V(F) has at least four 4-subsets meeting R; each such 4-set has at most N-4 extensions, giving 4(d5-f5)<=(N-4)(d4-f4).",
        ],
        "monotonicity_sign_numerators": [str(value) for value in derivative_sign_numerators],
        "cutoff_values": [str(value) for value in cutoff_values],
        "rows": rows,
        "raw_endpoint_numerator": raw,
        "proof_boundary": primary["proof_boundary"],
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
