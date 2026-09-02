#!/usr/bin/env python3
"""Exact replay for the forced near-sector shift-pairing theorem.

The proof is the coefficient-ratio argument in the companion note.  The
finite computation below is only the exhaustive base m=7,8,9,10 plus a
larger diagnostic transcription; it is not used to extrapolate the theorem.
"""

from __future__ import annotations

from fractions import Fraction
import hashlib
import json
from pathlib import Path

import sympy as sp

from verify_lower_selector_near_sector_coefficient_response import response_coefficient


HERE = Path(__file__).resolve().parent
REPORT = HERE / "lower_selector_near_sector_forced_shift_pairing_exact_20260813.json"


def cell_checks(e: int, m: int, a: int) -> dict[str, object]:
    R = 2 * m - 6
    s = 2 * m + 2 * a - 3
    K = 4 * m + a - e - 4
    T = s // 2
    interior = []
    for h in range(a + 1, T - 1):
        left = response_coefficient(R + 2, s, h)
        right = K * K * response_coefficient(R, s, h + 1)
        assert 0 <= left < right
        interior.append(Fraction(left, right))
    c_top = response_coefficient(R, s, T)
    plus_previous = response_coefficient(R + 2, s, T - 1)
    plus_top = response_coefficient(R + 2, s, T)
    final_left = plus_previous + K * plus_top
    final_right = K * K * c_top
    assert 0 < final_left < final_right
    full_margin = sum(
        (K * response_coefficient(R, s, h)
         - response_coefficient(R + 2, s, h)) * K**h
        for h in range(a + 1, T + 1)
    )
    assert full_margin > 0
    return {
        "e": e,
        "m": m,
        "a": a,
        "maximum_interior_ratio": str(max(interior, default=Fraction(0))),
        "final_block_ratio": str(Fraction(final_left, final_right)),
        "full_margin": str(full_margin),
    }


def symbolic_checks() -> dict[str, object]:
    R = sp.symbols("R", real=True)
    final_polynomial = sp.expand(22 * R**2 - 242 * R - 1139)
    assert final_polynomial.subs(R, 16) == 621
    assert sp.diff(final_polynomial, R).subs(R, 16) > 0
    assert Fraction(5, 6) * Fraction(11, 6) ** 3 < Fraction(36, 7)
    assert Fraction(5, 4) * Fraction(11, 6) ** 2 * Fraction(8, 3) ** 2 < 30
    assert Fraction(4, 5) * Fraction(9, 5) ** 3 < 5
    return {
        "interior_multiplier_bound": str(Fraction(4, 5) * Fraction(9, 5) ** 3),
        "previous_top_multiplier_bound": str(Fraction(5, 6) * Fraction(11, 6) ** 3),
        "top_multiplier_bound": str(
            Fraction(5, 4) * Fraction(11, 6) ** 2 * Fraction(8, 3) ** 2
        ),
        "rank_threshold_polynomial_at_R16": 621,
    }


def finite_base() -> dict[str, object]:
    rows = []
    for e in (1, 2):
        for m in range(7, 11):
            for a in range(1, 2 * m - 2 * e - 2):
                rows.append(cell_checks(e, m, a))
    assert len(rows) == 88
    max_interior = max(Fraction(row["maximum_interior_ratio"]) for row in rows)
    max_final = max(Fraction(row["final_block_ratio"]) for row in rows)
    return {
        "scope": "exhaustive finite base m=7,8,9,10",
        "cells": len(rows),
        "maximum_interior_ratio": str(max_interior),
        "maximum_final_block_ratio": str(max_final),
    }


def diagnostic(max_m: int = 50) -> dict[str, object]:
    cells = 0
    maximum_interior = Fraction(0)
    maximum_final = Fraction(0)
    for e in (1, 2):
        for m in range(7, max_m + 1):
            for a in range(1, 2 * m - 2 * e - 2):
                row = cell_checks(e, m, a)
                cells += 1
                maximum_interior = max(
                    maximum_interior, Fraction(row["maximum_interior_ratio"])
                )
                maximum_final = max(maximum_final, Fraction(row["final_block_ratio"]))
    return {
        "scope": f"bounded exact diagnostic through m<={max_m}; not the proof",
        "cells": cells,
        "maximum_interior_ratio": str(maximum_interior),
        "maximum_final_block_ratio": str(maximum_final),
    }


def main() -> None:
    payload = {
        "kind": "lower_selector_near_sector_forced_shift_pairing_theorem",
        "date": "2026-08-13",
        "status": "PASS_EXACT_FORCED_NEAR_SECTOR_SHIFT_PAIRING_THEOREM_REPLAY",
        "theorem": (
            "For every forced near-sector chart cell, "
            "K*G_(N-2,s)(K)-G_(N-1,s)(K)>0 by the one-step coefficient pairing."
        ),
        "symbolic_checks": symbolic_checks(),
        "finite_base": finite_base(),
        "diagnostic": diagnostic(),
        "remaining_gap": "rotating half-angle continuation from the real anchor",
    }
    payload["source_sha256"] = hashlib.sha256(Path(__file__).read_bytes()).hexdigest().upper()
    REPORT.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    print(payload["status"])
    print("symbolic_checks", payload["symbolic_checks"])
    print("finite_base", payload["finite_base"])
    print("diagnostic", payload["diagnostic"])
    print("source_sha256", payload["source_sha256"])
    print("report", REPORT)


if __name__ == "__main__":
    main()
