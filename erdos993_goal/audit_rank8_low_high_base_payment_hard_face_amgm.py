#!/usr/bin/env python3
"""Independent algebra and allocation audit of the cumulative-X hard face."""

from __future__ import annotations

from fractions import Fraction
import hashlib
import json
import math
from pathlib import Path

from flint import fmpz_mpoly_ctx


ROOT = Path(__file__).resolve().parent
PRODUCER = ROOT / "verify_rank8_low_high_base_payment_hard_face_amgm.py"
INPUT = ROOT / "rank8_low_high_base_payment_hard_face_amgm_exact_20260820.json"
OUTPUT = ROOT / "rank8_low_high_base_payment_hard_face_amgm_independent_audit_20260820.json"
NAMES = ("h", "ta", "a3", "a4", "a5", "a6", "a7", "tb", "b0", "b1", "b2")


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def sequence(terminal, gaps, one):
    ratios = [None] * 9
    running = terminal
    for index in range(8, -1, -1):
        ratios[index] = running
        if index:
            running = running + gaps[index - 1]
    result = [one]
    for ratio in ratios:
        result.append(result[-1] * ratio)
    return result


def binomial_convolution(left, right, rank, zero):
    result = zero
    for index in range(rank + 1):
        result += math.comb(rank, index) * left[index] * right[rank - index]
    return result


def coefficient_map(polynomial):
    return {
        tuple(int(value) for value in monomial): int(coefficient)
        for monomial, coefficient in polynomial.terms()
    }


def main() -> int:
    report = json.loads(INPUT.read_text(encoding="utf-8"))
    assert report["status"] == "PASS_EXACT_BASE_PAYMENT_HARD_FACE_AMGM_NOT_FULL_CONE"
    assert tuple(report["variables"]) == NAMES
    assert report["source_sha256"] == sha256(PRODUCER)

    context = fmpz_mpoly_ctx.get(NAMES, "degrevlex")
    h, ta, a3, a4, a5, a6, a7, tb, b0, b1, b2 = context.gens()
    one = context.constant(1)
    zero = context.constant(0)
    left = sequence(
        ta,
        [2 * h, h, h, h + a3, h + a4, h + a5, h + a6, h + a7],
        one,
    )
    right = sequence(
        tb,
        [2 * h + b0, h + b1, h + b2, h, h, h, h, h],
        one,
    )
    c7 = binomial_convolution(left, right, 7, zero)
    c8 = binomial_convolution(left, right, 8, zero)
    c9 = binomial_convolution(left, right, 9, zero)
    base_margin = c8 * c8 - c7 * c9 - h * c7 * c8
    requested_payment = h * left[1] * left[2] * (
        196 * right[6] * right[6] - 168 * right[5] * right[7]
    )
    target = base_margin - requested_payment

    X = ta + a3 + a4 + a5 + a6 + a7
    S = tb + b2
    T = S + b1
    U = T + b0
    S0 = b2
    T0 = b2 + b1
    U0 = T0 + b0
    R1 = S**2 * T**2 * U**2
    R2 = S0**2 * T0**2 * U0**2
    expected_negative_polynomial = -7 * h * tb**6 * X**2 * (
        X * R1 + 2 * h * R2
    )
    expected_negative = coefficient_map(expected_negative_polynomial)
    assert expected_negative and all(value < 0 for value in expected_negative.values())

    source_polynomials = {
        "source1_low": h * X * tb**8 * R1,
        "source1_high": h * X**5 * tb**4 * R1,
        "source2_low": h**2 * X * tb**7 * R2,
        "source2_high": h**2 * X**3 * tb**5 * R2,
    }
    source_maps = {name: coefficient_map(poly) for name, poly in source_polynomials.items()}
    source_seen = {name: set() for name in source_maps}
    source_capacity = {name: None for name in source_maps}
    actual_negative = {}
    term_count = 0
    negative_count = 0
    for monomial, coefficient in target.terms():
        key = tuple(int(value) for value in monomial)
        value = int(coefficient)
        term_count += 1
        if value < 0:
            actual_negative[key] = value
            negative_count += 1
        for name, source in source_maps.items():
            unit = source.get(key)
            if unit is None:
                continue
            assert value > 0
            source_seen[name].add(key)
            ratio = Fraction(value, unit)
            current = source_capacity[name]
            source_capacity[name] = ratio if current is None or ratio < current else current

    assert actual_negative == expected_negative
    assert term_count == report["term_count"] == 3_304_270
    assert negative_count == report["negative_count"] == 3_332
    for name, source in source_maps.items():
        assert source_seen[name] == set(source)
        assert str(source_capacity[name]) == report["source_capacities"][name]

    blocks = report["allocations"]
    required_sources = {
        "block1": ("source1_low", "source1_high"),
        "block2": ("source2_low", "source2_high"),
    }
    for block_name, (low_name, high_name) in required_sources.items():
        block = blocks[block_name]
        assert source_capacity[low_name] >= block["low"]
        assert source_capacity[high_name] >= block["high"]
        assert 4 * block["low"] * block["high"] >= block["demand"] ** 2

    audit = {
        "schema": "rank8-low-high-base-payment-hard-face-amgm-independent-audit-v1",
        "status": "PASS_INDEPENDENT_AUDIT_RANK8_LOW_HIGH_BASE_PAYMENT_HARD_FACE_AMGM",
        "producer_sha256": sha256(PRODUCER),
        "input_sha256": sha256(INPUT),
        "audit_source_sha256": sha256(Path(__file__)),
        "term_count": term_count,
        "negative_count": negative_count,
        "source_capacities": {name: str(value) for name, value in source_capacity.items()},
        "allocations": blocks,
        "scope_warning": (
            "The cumulative-X hard face is proved independently. Off-face slacks "
            "a0,a2,b3..b7 remain outside this certificate."
        ),
    }
    OUTPUT.write_text(json.dumps(audit, indent=2) + "\n", encoding="utf-8")
    print(audit["status"])
    print("terms", term_count, "negative", negative_count)
    print("REPORT", sha256(OUTPUT))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
