#!/usr/bin/env python3
"""Exact diagnostic for Section 107 after removing the near-sector strip.

This bounded replay is evidence only.  It measures whether the cells covered
conditionally by LOWER_SELECTOR_NEAR_SECTOR_QUASI_JACOBI_REDUCTION_2026-08-13.md
are responsible for the sharp three-step block constant.
"""

from __future__ import annotations

import hashlib
import json
from pathlib import Path
import sys

from flint import fmpq

from search_lower_selector_block_energy_large import (
    normalized_duran_coefficients,
    selector_gamma,
)


HERE = Path(__file__).resolve().parent
REPORT = HERE / "lower_selector_block_energy_after_near_sector_split_exact_20260813.json"


def main(max_d: int = 30) -> None:
    cells = checks = near_sector_skipped = 0
    largest_ratio: tuple[fmpq, tuple[int, ...]] | None = None
    for d in range(5, max_d + 1):
        for r in range(d - 4):
            path_n = d + r
            for row_s in range(r + 1, path_n + r + 1):
                forced = max(0, row_s - path_n + 1)
                gamma = selector_gamma(path_n, row_s)[forced:]
                m = len(gamma) - 1
                if m < 7:
                    continue
                p_effective = d + row_s - 2 * forced
                n = p_effective // 2
                x = n - m + 1
                A = fmpq(x) * fmpq(
                    2 * x + (1 if p_effective % 2 else -1), 2
                )
                if A > (m - 1) ** 2:
                    continue
                if (m - 2) ** 2 < A:
                    near_sector_skipped += 1
                    continue

                q = normalized_duran_coefficients(
                    d + row_s - forced, tuple(gamma)
                )
                H: list[fmpq] = []
                for j in range(m):
                    value = q[m - j]
                    for ell in range(1, j + 1):
                        value -= q[ell] * A**ell * H[j - ell]
                    H.append(value)
                squares = [A ** (m - j) * H[j] ** 2 for j in range(m)]
                for j in range(m - 3):
                    denominator = sum(squares[j + 1 : j + 4], fmpq(0))
                    ratio = squares[j] / denominator
                    cell = (d, r, row_s, forced, m, j)
                    if largest_ratio is None or ratio > largest_ratio[0]:
                        largest_ratio = (ratio, cell)
                    checks += 1
                cells += 1

    assert largest_ratio is not None
    payload = {
        "kind": "lower_selector_block_energy_after_near_sector_split",
        "date": "2026-08-13",
        "status": f"PASS_EXACT_D5_TO_D{max_d}_POST_SPLIT_DIAGNOSTIC",
        "scope": "finite exact evidence, not an all-order theorem",
        "remaining_cells": cells,
        "near_sector_cells_skipped": near_sector_skipped,
        "block_checks": checks,
        "largest_block_ratio": str(largest_ratio[0]),
        "largest_block_ratio_decimal": float(largest_ratio[0]),
        "largest_block_ratio_cell": largest_ratio[1],
    }
    payload["source_sha256"] = hashlib.sha256(Path(__file__).read_bytes()).hexdigest().upper()
    REPORT.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    print(payload["status"])
    print("remaining_cells", cells, "near_sector_cells_skipped", near_sector_skipped)
    print("block_checks", checks)
    print("largest_block_ratio_decimal", payload["largest_block_ratio_decimal"])
    print("largest_block_ratio_cell", payload["largest_block_ratio_cell"])
    print("source_sha256", payload["source_sha256"])
    print("report", REPORT)


if __name__ == "__main__":
    main(int(sys.argv[1]) if len(sys.argv) > 1 else 30)
