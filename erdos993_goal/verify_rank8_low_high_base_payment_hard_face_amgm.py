#!/usr/bin/env python3
"""Exact uniform AM-GM certificate for the base-margin payment hard face.

The certified face keeps all low tail slacks a3..a7 and high slacks b0..b2,
with a0=a2=b3=...=b7=0.  It does not certify off-face coefficients.
"""

from __future__ import annotations

from fractions import Fraction
import hashlib
import json
import math
from pathlib import Path

from explore_rank8_low_high_base_margin_payment_faces import build


ROOT = Path(__file__).resolve().parent
REPORT = ROOT / "rank8_low_high_base_payment_hard_face_amgm_exact_20260820.json"
LIVE = ("h", "ta", "a3", "a4", "a5", "a6", "a7", "tb", "b0", "b1", "b2")


def add(left, right):
    out = dict(left)
    for key, value in right.items():
        out[key] = out.get(key, 0) + value
        if not out[key]:
            del out[key]
    return out


def multiply(left, right):
    out = {}
    for a, av in left.items():
        for b, bv in right.items():
            key = tuple(x + y for x, y in zip(a, b))
            out[key] = out.get(key, 0) + av * bv
    return out


def power(poly, exponent):
    out = {(0, 0, 0, 0): 1}
    for _ in range(exponent):
        out = multiply(out, poly)
    return out


def shift_t(poly, exponent):
    return {(key[0] + exponent, *key[1:]): value for key, value in poly.items()}


def compositions(total, parts, prefix=()):
    if parts == 1:
        yield prefix + (total,)
        return
    for value in range(total + 1):
        yield from compositions(total - value, parts - 1, prefix + (value,))


def x_expansion(degree):
    out = {}
    for exponents in compositions(degree, 6):
        coefficient = math.factorial(degree)
        for exponent in exponents:
            coefficient //= math.factorial(exponent)
        out[exponents] = coefficient
    return out


def expected_terms(h_degree, x_degree, right):
    out = {}
    for left_key, left_value in x_expansion(x_degree).items():
        for right_key, right_value in right.items():
            key = (h_degree, *left_key, *right_key)
            out[key] = left_value * right_value
    return out


def main() -> None:
    t = {(1, 0, 0, 0): 1}
    b0 = {(0, 1, 0, 0): 1}
    b1 = {(0, 0, 1, 0): 1}
    b2 = {(0, 0, 0, 1): 1}
    S = add(t, b2)
    T = add(S, b1)
    U = add(T, b0)
    S0 = b2
    T0 = add(b2, b1)
    U0 = add(T0, b0)
    R1 = multiply(multiply(power(S, 2), power(T, 2)), power(U, 2))
    R2 = multiply(multiply(power(S0, 2), power(T0, 2)), power(U0, 2))

    negative1 = expected_terms(1, 3, shift_t(R1, 6))
    negative2 = expected_terms(2, 2, shift_t(R2, 6))
    source1_low = expected_terms(1, 1, shift_t(R1, 8))
    source1_high = expected_terms(1, 5, shift_t(R1, 4))
    source2_low = expected_terms(2, 1, shift_t(R2, 7))
    source2_high = expected_terms(2, 3, shift_t(R2, 5))
    source_maps = {
        "source1_low": source1_low,
        "source1_high": source1_high,
        "source2_low": source2_low,
        "source2_high": source2_high,
    }

    polynomial, names = build(LIVE)
    assert names == LIVE
    negative_seen = {}
    source_seen = {name: set() for name in source_maps}
    capacities = {name: None for name in source_maps}
    term_count = negative_count = 0
    for monomial, coefficient in polynomial.terms():
        key = tuple(int(value) for value in monomial)
        value = int(coefficient)
        term_count += 1
        if value < 0:
            negative_count += 1
            negative_seen[key] = value
        for name, expected in source_maps.items():
            unit = expected.get(key)
            if unit is None:
                continue
            source_seen[name].add(key)
            ratio = Fraction(value, unit)
            capacities[name] = ratio if capacities[name] is None else min(capacities[name], ratio)

    expected_negative = {key: -7 * value for key, value in negative1.items()}
    for key, value in negative2.items():
        expected_negative[key] = expected_negative.get(key, 0) - 14 * value
    assert negative_seen == expected_negative
    for name, expected in source_maps.items():
        assert source_seen[name] == set(expected)
        assert capacities[name] is not None and capacities[name] > 0

    # Allocate only tiny integer portions of the much larger source capacity.
    allocations = {
        "block1": {"low": 1, "high": 13, "demand": 7},
        "block2": {"low": 1, "high": 49, "demand": 14},
    }
    assert capacities["source1_low"] >= allocations["block1"]["low"]
    assert capacities["source1_high"] >= allocations["block1"]["high"]
    assert capacities["source2_low"] >= allocations["block2"]["low"]
    assert capacities["source2_high"] >= allocations["block2"]["high"]
    for block in allocations.values():
        assert 4 * block["low"] * block["high"] >= block["demand"] ** 2

    payload = {
        "schema": "rank8-low-high-base-payment-hard-face-amgm-v1",
        "status": "PASS_EXACT_BASE_PAYMENT_HARD_FACE_AMGM_NOT_FULL_CONE",
        "face": "a0=a2=b3=b4=b5=b6=b7=0; h,ta,a3..a7,tb,b0,b1,b2>=0",
        "target": "M0-7!*8!*h*p1*p2*K_q(1,2)>=0",
        "variables": list(names),
        "term_count": term_count,
        "negative_count": negative_count,
        "negative_factorization": (
            "-7*h*tb^6*X^2*(X*S^2*T^2*U^2+2*h*S0^2*T0^2*U0^2), "
            "X=ta+a3+...+a7, S=tb+b2, T=S+b1, U=T+b0, "
            "S0=b2, T0=b2+b1, U0=b2+b1+b0"
        ),
        "source_capacities": {name: str(value) for name, value in capacities.items()},
        "allocations": allocations,
        "amgm_checks": {
            "block1": "4*1*13=52>=49=7^2",
            "block2": "4*1*49=196=14^2",
        },
        "scope_warning": (
            "This certifies only the stated hard face of the proposed base-margin payment. "
            "No off-face coefficient claim, full strong auxiliary, low/high cone, Q8, PGC, "
            "or Problem 993 claim is made."
        ),
        "source_sha256": hashlib.sha256(Path(__file__).read_bytes()).hexdigest().upper(),
    }
    REPORT.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    print(payload["status"])
    print("terms", term_count, "negative", negative_count)
    print("capacities", payload["source_capacities"])
    print("SOURCE", payload["source_sha256"])
    print("REPORT", hashlib.sha256(REPORT.read_bytes()).hexdigest().upper())


if __name__ == "__main__":
    main()
