#!/usr/bin/env python3
"""Exact replay for the forced near-sector global-tail payment theorem.

The all-order proof is the coefficient-ratio/shift-pairing argument in the
companion note.  Computation is used only for the exhaustive base
m=7,8,9,10 and for transcription checks of the exact partition P-H=M.
"""

from __future__ import annotations

from fractions import Fraction
import hashlib
import json
from pathlib import Path

import sympy as sp

from verify_lower_selector_near_sector_coefficient_response import response_coefficient


HERE = Path(__file__).resolve().parent
NOTE = HERE / "LOWER_SELECTOR_NEAR_SECTOR_FORCED_GLOBAL_TAIL_PAYMENT_THEOREM_2026-08-13.md"
REPORT = HERE / "lower_selector_near_sector_forced_global_tail_payment_exact_20260813.json"


def cell(e: int, m: int, a: int) -> dict[str, object]:
    R = 2 * m - 6
    s = 2 * m + 2 * a - 3
    K = 4 * m + a - e - 4
    T = s // 2

    for h in range(a + 1, T - 1):
        c_plus = response_coefficient(R + 2, s, h)
        c_next = response_coefficient(R, s, h + 1)
        assert 0 <= c_plus < K * K * c_next

    c_top = response_coefficient(R, s, T)
    c_plus_previous = response_coefficient(R + 2, s, T - 1)
    c_plus_top = response_coefficient(R + 2, s, T)
    final_left = c_plus_previous + K * c_plus_top
    final_right = K * K * c_top
    assert 0 < final_left < final_right

    weighted = []
    for h in range(a + 1, T + 1):
        c_h = response_coefficient(R, s, h)
        c_plus_h = response_coefficient(R + 2, s, h)
        weighted.append((K * c_h - c_plus_h) * K**h)

    credit = sum(q for q in weighted if q > 0)
    debt = -sum(q for q in weighted if q < 0)
    margin = sum(weighted)
    assert margin == credit - debt
    assert margin > 0
    assert credit > debt
    return {
        "e": e,
        "m": m,
        "a": a,
        "final_block_ratio": str(Fraction(final_left, final_right)),
        "credit_over_debt": None if debt == 0 else str(Fraction(credit, debt)),
        "margin": str(margin),
    }


def symbolic_certificate() -> dict[str, object]:
    R = sp.symbols("R", real=True)
    p = 22 * R**2 - 242 * R - 1139
    assert sp.expand(p.subs(R, 16)) == 621
    assert sp.diff(p, R).subs(R, 16) > 0

    interior_multiplier = Fraction(4, 5) * Fraction(9, 5) ** 3
    previous_top_multiplier = Fraction(5, 6) * Fraction(11, 6) ** 3
    top_multiplier = Fraction(5, 4) * Fraction(11, 6) ** 2 * Fraction(8, 3) ** 2
    assert interior_multiplier < 5
    assert previous_top_multiplier < Fraction(36, 7)
    assert top_multiplier < 30

    return {
        "interior_multiplier": str(interior_multiplier),
        "previous_top_multiplier": str(previous_top_multiplier),
        "top_multiplier": str(top_multiplier),
        "threshold_numerator_at_R16": int(p.subs(R, 16)),
        "threshold_derivative_at_R16": int(sp.diff(p, R).subs(R, 16)),
    }


def exhaustive_base() -> dict[str, object]:
    rows = []
    for e in (1, 2):
        for m in range(7, 11):
            for a in range(1, 2 * m - 2 * e - 2):
                rows.append(cell(e, m, a))
    assert len(rows) == 88
    return {
        "scope": "exhaustive base m=7,8,9,10",
        "cells": len(rows),
        "maximum_final_block_ratio": str(
            max(Fraction(row["final_block_ratio"]) for row in rows)
        ),
        "minimum_credit_over_debt": str(
            min(
                Fraction(row["credit_over_debt"])
                for row in rows
                if row["credit_over_debt"] is not None
            )
        ),
    }


def bounded_transcription_check(max_m: int = 35) -> dict[str, object]:
    cells = 0
    minimum_payment = None
    minimum_cell = None
    for e in (1, 2):
        for m in range(7, max_m + 1):
            for a in range(1, 2 * m - 2 * e - 2):
                row = cell(e, m, a)
                cells += 1
                if row["credit_over_debt"] is None:
                    continue
                ratio = Fraction(row["credit_over_debt"])
                if minimum_payment is None or ratio < minimum_payment:
                    minimum_payment = ratio
                    minimum_cell = {"e": e, "m": m, "a": a}
    return {
        "scope": f"bounded transcription check through m<={max_m}; not the proof",
        "cells": cells,
        "minimum_credit_over_debt": str(minimum_payment),
        "minimum_cell": minimum_cell,
    }


def main() -> None:
    payload = {
        "kind": "lower_selector_near_sector_forced_global_tail_payment_theorem",
        "date": "2026-08-13",
        "status": "PASS_EXACT_FORCED_GLOBAL_TAIL_PAYMENT_THEOREM_REPLAY",
        "theorem": (
            "For every forced near-sector cell, the weighted positive part "
            "of d_h K^h strictly exceeds its weighted negative part."
        ),
        "proof_route": (
            "all-order one-step shift pairing; exact partition of every term; "
            "P-H equals the selector margin"
        ),
        "symbolic_certificate": symbolic_certificate(),
        "exhaustive_base": exhaustive_base(),
        "bounded_transcription_check": bounded_transcription_check(),
        "stronger_unproved_statement": (
            "the first two positive response terms alone pay the negative part"
        ),
    }
    payload["note_sha256"] = hashlib.sha256(NOTE.read_bytes()).hexdigest().upper()
    payload["source_sha256"] = hashlib.sha256(Path(__file__).read_bytes()).hexdigest().upper()
    REPORT.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    print(payload["status"])
    print("symbolic_certificate", payload["symbolic_certificate"])
    print("exhaustive_base", payload["exhaustive_base"])
    print("bounded_transcription_check", payload["bounded_transcription_check"])
    print("note_sha256", payload["note_sha256"])
    print("source_sha256", payload["source_sha256"])
    print("report", REPORT)


if __name__ == "__main__":
    main()

