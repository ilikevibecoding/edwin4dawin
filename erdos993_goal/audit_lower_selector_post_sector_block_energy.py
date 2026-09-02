"""Exact finite audit of a coarse block-energy route in the post-sector cone.

This is evidence for two all-order inequalities, not their proof.  In the
remaining lower-selector range m>=7 and A<=(m-1)^2, write

    s_j = A^(m-j) H_j^2,
    T   = s_(m-3)+s_(m-2)+s_(m-1),
    W   = A^4(H_(m-3)H_(m-1)-H_(m-2)^2)^2.

The replay checks exactly

    30 s_j <= s_(j+1)+s_(j+2)+s_(j+3),
    W > 3 T.

The first inequality implies sum_(j<=m-4)s_j <= T/9 by summing all
three-step bounds.  The second then has more than enough room to pay the
Schur moment debt, which is less than 2 sum_j s_j <= 20T/9.
"""

from __future__ import annotations

import hashlib
import json
from pathlib import Path
import sys

from flint import fmpq

from probe_lower_selector_tail3_flint_full import (
    duran_coefficients,
    selector_gamma,
)


HERE = Path(__file__).resolve().parent
REPORT = HERE / "lower_selector_post_sector_block_energy_exact_20260812.json"


def main(max_d: int = 30) -> None:
    cells = 0
    block_checks = 0
    minimum_block_margin: tuple[fmpq, tuple[int, ...]] | None = None
    minimum_tail_margin: tuple[fmpq, tuple[int, ...]] | None = None

    for d in range(5, max_d + 1):
        for r in range(d - 4):
            path_n = d + r
            for row_s in range(r + 1, path_n + r + 1):
                forced = max(0, row_s - path_n + 1)
                gamma_hat = selector_gamma(path_n, row_s)[forced:]
                m = len(gamma_hat) - 1
                if m < 7:
                    continue

                original_p = d + row_s
                effective_p = original_p - 2 * forced
                n = effective_p // 2
                x = n - m + 1
                beta_numerator = 1 if effective_p % 2 else -1
                A = fmpq(x) * fmpq(2 * x + beta_numerator, 2)
                if A > (m - 1) ** 2:
                    continue

                q = duran_coefficients(original_p - forced, gamma_hat)
                H: list[fmpq] = []
                for j in range(m):
                    value = q[m - j]
                    for shift in range(1, j + 1):
                        value -= q[shift] * A**shift * H[j - shift]
                    H.append(value / q[0])

                squares = [A ** (m - j) * H[j] ** 2 for j in range(m)]
                for j in range(m - 3):
                    margin = (
                        squares[j + 1] + squares[j + 2] + squares[j + 3]
                        - 30 * squares[j]
                    )
                    assert margin > 0
                    block_checks += 1
                    normalized = squares[j] / (
                        squares[j + 1] + squares[j + 2] + squares[j + 3]
                    )
                    cell = (d, r, row_s, forced, m, j)
                    if minimum_block_margin is None or normalized > minimum_block_margin[0]:
                        # Store the largest left/right ratio: the closest call.
                        minimum_block_margin = (normalized, cell)

                tail_energy = sum(squares[-3:], fmpq(0))
                W = A**4 * (H[-3] * H[-1] - H[-2] ** 2) ** 2
                tail_margin = W - 3 * tail_energy
                assert tail_margin > 0
                normalized_tail = W / tail_energy
                cell = (d, r, row_s, forced, m)
                if minimum_tail_margin is None or normalized_tail < minimum_tail_margin[0]:
                    minimum_tail_margin = (normalized_tail, cell)
                cells += 1

    assert minimum_block_margin is not None
    assert minimum_tail_margin is not None
    payload = {
        "kind": "lower_selector_post_sector_block_energy_exact",
        "date": "2026-08-12",
        "status": f"PASS_EXACT_D5_TO_D{max_d}_POST_SECTOR_BLOCK_ENERGY_AUDIT",
        "scope": "finite exact evidence, not an all-order theorem",
        "d_range": [5, max_d],
        "cells": cells,
        "block_checks": block_checks,
        "block_inequality": "30*s_j <= s_(j+1)+s_(j+2)+s_(j+3)",
        "tail_inequality": "W > 3*(s_(m-3)+s_(m-2)+s_(m-1))",
        "largest_block_ratio": str(minimum_block_margin[0]),
        "largest_block_ratio_decimal": float(minimum_block_margin[0]),
        "largest_block_ratio_cell": minimum_block_margin[1],
        "smallest_tail_ratio": str(minimum_tail_margin[0]),
        "smallest_tail_ratio_decimal": float(minimum_tail_margin[0]),
        "smallest_tail_ratio_cell": minimum_tail_margin[1],
        "summed_consequence": (
            "The block inequality gives early_energy<=tail_energy/9; hence "
            "the Schur debt is <20*tail_energy/9, while W>3*tail_energy."
        ),
    }
    REPORT.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    print(payload["status"])
    print("cells", cells, "block_checks", block_checks)
    print("largest_block_ratio_decimal", payload["largest_block_ratio_decimal"])
    print("largest_block_ratio_cell", payload["largest_block_ratio_cell"])
    print("smallest_tail_ratio_decimal", payload["smallest_tail_ratio_decimal"])
    print("smallest_tail_ratio_cell", payload["smallest_tail_ratio_cell"])
    print("source_sha256", hashlib.sha256(Path(__file__).read_bytes()).hexdigest().upper())
    print("report_sha256", hashlib.sha256(REPORT.read_bytes()).hexdigest().upper())


if __name__ == "__main__":
    main(int(sys.argv[1]) if len(sys.argv) > 1 else 30)
