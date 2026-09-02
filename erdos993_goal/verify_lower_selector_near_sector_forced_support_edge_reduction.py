#!/usr/bin/env python3
"""Replay the forced support-edge identity and exact one-term counterexample."""

from __future__ import annotations

from fractions import Fraction
import hashlib
import json
from pathlib import Path

from prove_lower_selector_near_sector_far_unforced_ceiling import active_weight, binom
from verify_lower_selector_near_sector_coefficient_response import response_coefficient


HERE = Path(__file__).resolve().parent
REPORT = HERE / "lower_selector_near_sector_forced_support_edge_exact_20260813.json"


def shifted_parts(m: int, a: int, ell: int) -> tuple[int, int, int]:
    R = 2 * m - 6
    s = 2 * m + 2 * a - 3
    h = a + 2 + ell
    j = R - 1 - 2 * ell
    V = 1 + 2 * ell
    old = sum(active_weight(j, h, v) * binom(R, j + v) for v in range(V + 1))
    common_new = sum(active_weight(j, h, v) * binom(R + 2, j + v) for v in range(V + 1))
    births = (R + 2) * active_weight(j, h, V + 1) + active_weight(j, h, V + 2)
    assert old == response_coefficient(R, s, h)
    assert common_new + births == response_coefficient(R + 2, s, h)
    return old, common_new, births


def identity_audit() -> dict[str, int]:
    checks = 0
    for m in range(7, 18):
        for a in range(1, 2 * m - 6):
            R = 2 * m - 6
            for ell in range((R - 1) // 2 + 1):
                shifted_parts(m, a, ell)
                checks += 2
    return {"exact_shifted_identity_checks": checks}


def counterexample() -> dict[str, object]:
    e, m, a = 2, 25, 22
    s, R, K = 2 * m + 2 * a - 3, 2 * m - 6, 4 * m + a - e - 4
    values = []
    for h in range(a + 1, s // 2 + 1):
        c = response_coefficient(R, s, h)
        c_plus = response_coefficient(R + 2, s, h)
        d = K * c - c_plus
        values.append((h, d * K**h))
    last_negative = max(h for h, value in values if value < 0)
    negative = -sum(value for _, value in values if value < 0)
    positives = [value for _, value in values if value > 0]
    ratio_one = Fraction(positives[0], negative)
    ratio_two = Fraction(positives[0] + positives[1], negative)
    assert last_negative == 26
    assert ratio_one == Fraction(349411583134491989015872, 507515110966978198229133) < 1
    assert ratio_two == Fraction(31410240722932191391840098838720, 169171703655659399409711) > 1
    return {
        "cell": {"e": e, "m": m, "a": a, "s": s, "R": R, "K": K},
        "last_negative_h": last_negative,
        "negative_weighted_head": str(negative),
        "first_positive_weighted_term": str(positives[0]),
        "second_positive_weighted_term": str(positives[1]),
        "first_over_head": str(ratio_one),
        "first_two_over_head": str(ratio_two),
        "full_weighted_response": str(sum(value for _, value in values)),
    }


def finite_diagnostic(max_m: int = 35) -> dict[str, object]:
    cells = one_sign_change = first_two_pay = 0
    minimum_two = None
    minimum_cell = None
    for e in (1, 2):
        for m in range(7, max_m + 1):
            R = 2 * m - 6
            for a in range(1, 2 * m - 2 * e - 2):
                s, K = 2 * m + 2 * a - 3, 4 * m + a - e - 4
                weighted = []
                signs = []
                for h in range(a + 1, s // 2 + 1):
                    c = response_coefficient(R, s, h)
                    c_plus = response_coefficient(R + 2, s, h)
                    d = K * c - c_plus
                    weighted.append(d * K**h)
                    if d:
                        signs.append(1 if d > 0 else -1)
                assert signs == sorted(signs)
                one_sign_change += 1
                negative = -sum(value for value in weighted if value < 0)
                positive = [value for value in weighted if value > 0]
                ratio = Fraction(sum(positive[:2]), negative)
                assert ratio > 1
                first_two_pay += 1
                cells += 1
                if minimum_two is None or ratio < minimum_two:
                    minimum_two = ratio
                    minimum_cell = {"e": e, "m": m, "a": a}
    return {
        "scope": f"bounded exact diagnostics through m<={max_m}; not an all-order proof",
        "cells": cells,
        "one_sign_change_cells": one_sign_change,
        "first_two_pay_cells": first_two_pay,
        "minimum_first_two_over_head": str(minimum_two),
        "minimum_cell": minimum_cell,
    }


def main() -> None:
    identities = identity_audit()
    exact_counterexample = counterexample()
    finite = finite_diagnostic()
    payload = {
        "kind": "lower_selector_near_sector_forced_support_edge_reduction",
        "date": "2026-08-13",
        "status": "PASS_EXACT_FORCED_SUPPORT_EDGE_REDUCTION_AND_COUNTEREXAMPLE_REPLAY",
        "all_order_result": "exact two-support-edge-birth decomposition",
        "exact_counterexample": exact_counterexample,
        "identity_audit": identities,
        "finite_diagnostic": finite,
        "scope_warning": "The forced selector ceiling remains unproved all-order.",
    }
    payload["source_sha256"] = hashlib.sha256(Path(__file__).read_bytes()).hexdigest().upper()
    REPORT.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    print(payload["status"])
    print("identity_audit", identities)
    print("counterexample", exact_counterexample)
    print("finite_diagnostic", finite)
    print("source_sha256", payload["source_sha256"])
    print("report", REPORT)


if __name__ == "__main__":
    main()
