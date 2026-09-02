#!/usr/bin/env python3
"""Exact evidence for a top-coefficient payment proof of (106.15).

For D(t)=K*G_(N-2,s)(t)-G_(N-1,s)(t), this bounded audit checks that the
nonzero coefficient signs have at most one change, from negative to positive,
and compares the leading monomial at t=K with all negative monomials.
It is diagnostic evidence, not an all-order sign theorem.
"""

from __future__ import annotations

import hashlib
import json
from fractions import Fraction
from pathlib import Path
import sys

from probe_lower_selector_tail3_flint_full import path_gamma


HERE = Path(__file__).resolve().parent
REPORT = HERE / "lower_selector_near_sector_top_payment_exact_20260813.json"


def main(max_d: int = 50) -> None:
    cells = 0
    cells_with_debt = 0
    largest_unweighted_debt: tuple[Fraction, tuple[int, ...]] | None = None
    smallest_weighted_payment: tuple[Fraction, tuple[int, ...]] | None = None
    failures: list[dict[str, object]] = []

    for d in range(5, max_d + 1):
        for r in range(d - 4):
            N = d + r
            for row_s in range(r + 1, N + r + 1):
                a = max(0, row_s - N + 1)
                m = row_s // 2 + 2 - a
                if m < 7:
                    continue
                p_effective = d + row_s - 2 * a
                n = p_effective // 2
                x = n - m + 1
                twice_A = x * (2 * x + (1 if p_effective % 2 else -1))
                if not (2 * (m - 2) ** 2 < twice_A < 2 * (m - 1) ** 2):
                    continue

                K = d + row_s - a - 1
                G1 = path_gamma(N - 1, row_s)
                G2 = path_gamma(N - 2, row_s)
                degree = max(len(G1), len(G2)) - 1
                D = [
                    K * (G2[h] if h < len(G2) else 0)
                    - (G1[h] if h < len(G1) else 0)
                    for h in range(degree + 1)
                ]
                nonzero_signs = [1 if value > 0 else -1 for value in D if value]
                changes = sum(
                    nonzero_signs[j] != nonzero_signs[j - 1]
                    for j in range(1, len(nonzero_signs))
                )
                negative_indices = [h for h, value in enumerate(D) if value < 0]
                cell = (d, r, row_s, a, m, K, degree)
                if changes > 1 or nonzero_signs[-1] != 1:
                    failures.append({"cell": cell, "signs": nonzero_signs})
                if negative_indices:
                    cells_with_debt += 1
                    leading = D[degree]
                    unweighted_debt = Fraction(
                        sum(-D[h] for h in negative_indices), leading
                    )
                    payment = Fraction(
                        leading * K**degree,
                        sum(-D[h] * K**h for h in negative_indices),
                    )
                    if (
                        largest_unweighted_debt is None
                        or unweighted_debt > largest_unweighted_debt[0]
                    ):
                        largest_unweighted_debt = (unweighted_debt, cell)
                    if (
                        smallest_weighted_payment is None
                        or payment < smallest_weighted_payment[0]
                    ):
                        smallest_weighted_payment = (payment, cell)
                cells += 1

    assert cells == 3131
    assert not failures
    assert largest_unweighted_debt is not None
    assert smallest_weighted_payment is not None
    payload = {
        "kind": "lower_selector_near_sector_top_coefficient_payment",
        "date": "2026-08-13",
        "status": "PASS_EXACT_D50_NEAR_SECTOR_TOP_PAYMENT_AUDIT",
        "scope": "finite exact evidence, not an all-order theorem",
        "cells": cells,
        "cells_with_negative_coefficients": cells_with_debt,
        "sign_pattern_failures": failures,
        "largest_unweighted_negative_sum_over_leading": str(largest_unweighted_debt[0]),
        "largest_unweighted_negative_sum_over_leading_decimal": float(largest_unweighted_debt[0]),
        "largest_unweighted_negative_sum_cell": largest_unweighted_debt[1],
        "smallest_leading_monomial_payment_ratio": str(smallest_weighted_payment[0]),
        "smallest_leading_monomial_payment_ratio_decimal": float(smallest_weighted_payment[0]),
        "smallest_leading_monomial_payment_cell": smallest_weighted_payment[1],
    }
    payload["source_sha256"] = hashlib.sha256(Path(__file__).read_bytes()).hexdigest().upper()
    REPORT.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    print(payload["status"])
    print("cells", cells, "with_debt", cells_with_debt)
    print("largest_unweighted_debt", payload["largest_unweighted_negative_sum_over_leading_decimal"])
    print("smallest_payment", payload["smallest_leading_monomial_payment_ratio_decimal"])
    print("extremal_cell", payload["smallest_leading_monomial_payment_cell"])
    print("source_sha256", payload["source_sha256"])
    print("report", REPORT)


if __name__ == "__main__":
    main(int(sys.argv[1]) if len(sys.argv) > 1 else 50)
