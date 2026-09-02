#!/usr/bin/env python3
"""Exact replay for the near-sector coefficient-response reduction.

The formulas and chart parametrizations in the companion note are all-order.
The m>=7, d<=50 sweep is finite evidence only.
"""

from __future__ import annotations

import hashlib
import json
from fractions import Fraction
from math import comb
from pathlib import Path

from probe_lower_selector_tail3_flint_full import path_gamma


HERE = Path(__file__).resolve().parent
REPORT = HERE / "lower_selector_near_sector_coefficient_response_exact_20260813.json"


def binom(n: int, k: int) -> int:
    return comb(n, k) if n >= 0 and 0 <= k <= n else 0


def response_coefficient(R: int, s: int, h: int) -> int:
    """Equation (4)."""
    j = s - 2 * h
    if not 0 <= j <= R:
        return 0
    return binom(R, j) * sum(
        binom(R - j, k) * binom(2 * R + h - k, h - k)
        for k in range(h + 1)
    )


def euler_positive_coefficient(R: int, s: int, h: int) -> int:
    """Equation (6), expanded as a finite binomial convolution."""
    j = s - 2 * h
    if not 0 <= j <= R:
        return 0
    return binom(R, j) * sum(
        binom(R + s - h, k)
        * binom(R - s + 2 * h, h - k)
        * 2 ** (h - k)
        for k in range(h + 1)
    )


def audit_case(tag: tuple[object, ...], s: int, R: int, K: int) -> dict[str, object]:
    M = (R + s + 1) // 2
    direct_G2 = path_gamma(M, s)
    direct_G1 = path_gamma(M + 1, s)
    c2 = [response_coefficient(R, s, h) for h in range(s // 2 + 1)]
    c1 = [response_coefficient(R + 2, s, h) for h in range(s // 2 + 1)]
    assert c2 == direct_G2
    assert c1 == direct_G1
    assert c2 == [euler_positive_coefficient(R, s, h) for h in range(s // 2 + 1)]

    support = [h for h, value in enumerate(c2) if value]
    ratios = [Fraction(c1[h], c2[h]) for h in support]
    assert all(left > right for left, right in zip(ratios, ratios[1:]))

    differences = [K * left - right for left, right in zip(c2, c1)]
    signs = [1 if differences[h] > 0 else -1 for h in support if differences[h]]
    assert all(left <= right for left, right in zip(signs, signs[1:]))

    negative_unweighted = -sum(value for value in differences if value < 0)
    leading = differences[-1]
    assert leading > negative_unweighted

    negative_weighted = -sum(
        value * K**h for h, value in enumerate(differences) if value < 0
    )
    leading_weighted = leading * K ** (len(differences) - 1)
    full_margin = sum(value * K**h for h, value in enumerate(differences))
    assert full_margin > 0

    return {
        "tag": tag,
        "s": s,
        "R": R,
        "K": K,
        "negative_over_leading": str(Fraction(negative_unweighted, leading)),
        "leading_weighted_over_negative": (
            None
            if not negative_weighted
            else str(Fraction(leading_weighted, negative_weighted))
        ),
        "margin": str(full_margin),
    }


def finite_audit() -> dict[str, object]:
    cases: list[dict[str, object]] = []

    for e, sigma in ((0, 0), (1, 0), (1, 1), (2, 1)):
        for m in range(7, 100):
            d = 2 * m - e
            if d > 50:
                continue
            s = 2 * m - 4 + sigma
            K = 4 * m + sigma - e - 5
            g_min = 4 - e if sigma == 0 else 3 - e
            g_max = 2 * m - 2 * e - (1 if sigma == 0 else 2)
            for g in range(g_min, g_max + 1):
                R = s + 2 * g - 5
                cases.append(audit_case(("unforced", e, sigma, m, g), s, R, K))

    for e in (1, 2):
        for m in range(7, 100):
            d = 2 * m - e
            if d > 50:
                continue
            for a in range(1, 2 * m - 2 * e - 2):
                s = 2 * m + 2 * a - 3
                R = 2 * m - 6
                K = 4 * m + a - e - 4
                cases.append(audit_case(("forced", e, m, a), s, R, K))

    assert len(cases) == 3131
    sharp = max(cases, key=lambda case: Fraction(case["negative_over_leading"]))
    assert sharp["tag"] == ("forced", 1, 7, 9)
    assert sharp["negative_over_leading"] == "180043620/309540569"
    assert sharp["leading_weighted_over_negative"] == (
        "1298307246718976/626015709335"
    )
    return {
        "scope": "finite exact evidence, not an all-order theorem",
        "range": "m>=7 and d<=50",
        "cases": len(cases),
        "sharp_case": sharp,
    }


def main() -> None:
    payload = {
        "kind": "lower_selector_near_sector_coefficient_response_reduction",
        "date": "2026-08-13",
        "status": "PASS_EXACT_COEFFICIENT_IDENTITIES_AND_D50_RESPONSE_AUDIT",
        "all_order_content": [
            "positive response coefficient formulas (4)-(6)",
            "exact unforced and forced chart parametrizations",
            "conditional ratio-plus-response implication of the selector ceiling",
        ],
        "remaining_gaps": [
            "prove adjacent-exponent coefficient-ratio monotonicity in all chart families",
            "prove all-order weighted positive-tail domination",
        ],
        "finite_audit": finite_audit(),
    }
    payload["source_sha256"] = hashlib.sha256(Path(__file__).read_bytes()).hexdigest().upper()
    REPORT.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    print(payload["status"])
    print("cases", payload["finite_audit"]["cases"])
    print("sharp_case", payload["finite_audit"]["sharp_case"])
    print("source_sha256", payload["source_sha256"])
    print("report", REPORT)


if __name__ == "__main__":
    main()
