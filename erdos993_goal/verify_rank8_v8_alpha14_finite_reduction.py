#!/usr/bin/env python3
"""Fast replay of the complete V8 alpha>=14 forest theorem certificate."""

from __future__ import annotations

from fractions import Fraction
import hashlib
import json
from math import comb
from pathlib import Path

import sympy as sp


HERE = Path(__file__).resolve().parent
SMALL = HERE / "rank8_v8_forest_polynomials_through_n20_exact_20260816.json"
MEDIUM = HERE / "rank8_v8_forest_orders21_24_exact_20260816.json"
HIGH = HERE / "rank8_v8_forest_orders25_29_exact_20260816.json"
REPORT = HERE / "rank8_v8_alpha14_finite_reduction_exact_20260816.json"


def h(q: int) -> Fraction:
    return Fraction(0) if q <= 2 else Fraction(comb(q - 1, 2))


def phi(t: Fraction) -> Fraction:
    q = t.numerator // t.denominator
    return h(q) + (t - q) * (h(q + 1) - h(q))


def transfer(t: Fraction) -> Fraction:
    return 2 * phi(t) / t


def symbolic() -> dict[str, str]:
    b6, b7, b8 = sp.symbols("b6 b7 b8", positive=True)
    u, variance, components = sp.symbols(
        "u variance components", positive=True
    )
    v = sp.symbols("v", positive=True)
    vk = 10 * b6 * b7 + 136 * b6 * b8 - 98 * b7**2
    normalized = sp.factor(
        vk.subs({b7: u * b6 / 7, b8: v * u * b6 / 56})
        / (b6 * (u * b6 / 7))
    )
    assert normalized == 17 * v - 14 * u + 10
    moment_v = (u**2 - 3 * u + variance + 2 * components) / u
    moment_form = sp.factor(normalized.subs(v, moment_v))
    assert moment_form == (3 * u**2 - 41 * u + 17 * variance + 34 * components) / u

    q, t = sp.symbols("q t", positive=True)
    g = 2 * (q - 1) - (q - 1) * (q + 2) / t
    derivative_floor = sp.factor(
        (17 * sp.diff(g, t) - 14).subs(t, q + 1)
    )
    assert derivative_floor == (3 * q**2 - 11 * q - 48) / (q + 1) ** 2
    assert 3 * 7**2 - 11 * 7 - 48 > 0
    return {
        "normalized_V8": str(normalized),
        "moment_form": str(moment_form),
        "transfer_piece": str(g),
        "final_derivative_floor": str(derivative_floor),
    }


def large_order() -> dict[str, str]:
    mu4 = Fraction(506, 27)
    mu5 = transfer(mu4)
    mu6 = transfer(mu5)
    mu7 = transfer(mu6)
    assert (mu5, mu6, mu7) == (
        Fraction(4012, 253), Fraction(1533, 118), Fraction(2222, 219)
    )
    margin = 10 + 17 * mu7 - 14 * mu6
    assert margin == Fraction(7787, 12921) > 0
    return {
        "n30_mu4": str(mu4),
        "n30_mu5": str(mu5),
        "n30_mu6": str(mu6),
        "n30_mu7": str(mu7),
        "n30_normalized_V8_margin": str(margin),
        "monotonic_conclusion": "V8>0 for every forest of order n>=30",
    }


def main() -> None:
    small = json.loads(SMALL.read_text(encoding="utf-8"))
    medium = json.loads(MEDIUM.read_text(encoding="utf-8"))
    high = json.loads(HIGH.read_text(encoding="utf-8"))
    assert small["status"] == "PASS_EXACT_V8_FOREST_POLYNOMIAL_CENSUS_THROUGH_ORDER_20"
    assert small["all_required_rows_nonnegative"]
    assert small["global_minimum"]["value"] == 175_207_032
    assert medium["status"] == "PASS_EXACT_FOREST_V8_ALPHA14_ORDERS21_24"
    assert medium["all_required_margins_positive"]
    assert [medium["orders"][str(n)]["minimum_V8"] for n in range(21, 25)] == [
        985_659_794, 1_487_037_358, 2_024_481_632, 2_961_176_736,
    ]
    assert high["status"] == "PASS_EXACT_FOREST_V8_ALPHA14_ORDERS25_29"
    assert high["all_completed_required_margins_positive"]
    assert high["remaining_orders"] == []
    assert [high["completed_orders"][str(n)]["eligible_total"] for n in range(25, 30)] == [
        233_492_567, 631_168_028, 1_686_705_630,
        4_514_955_632, 12_132_227_370,
    ]
    high_minima = [
        6_248_384_816, 16_005_146_410, 39_962_180_160,
        115_475_854_032, 293_387_717_238,
    ]
    assert [high["completed_orders"][str(n)]["minimum_V8"] for n in range(25, 30)] == high_minima
    for n in range(27, 30):
        row = high["completed_orders"][str(n)]
        assert row["eligible_total"] == row["independent_Euler_transform_forest_count"]

    payload = {
        "status": "PASS_PROOF_RANK8_V8_ALPHA14_ALL_FORESTS",
        "theorem_proved": [
            "V8>=0 for every forest with alpha>=14",
            "The exact finite margins are in fact strictly positive for orders 14..29",
            "V8>0 for every forest of order at least 30",
        ],
        "remaining_exact_band": None,
        "symbolic": symbolic(),
        "large_order": large_order(),
        "exact_high_band_minima_orders25_29": high_minima,
        "finite_sources": {
            "through20": SMALL.name,
            "orders21_24": MEDIUM.name,
            "completed_high_band": HIGH.name,
        },
    }
    REPORT.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    print(payload["status"])
    for path in (Path(__file__), SMALL, MEDIUM, HIGH, REPORT):
        print(path.name, hashlib.sha256(path.read_bytes()).hexdigest().upper())


if __name__ == "__main__":
    main()
