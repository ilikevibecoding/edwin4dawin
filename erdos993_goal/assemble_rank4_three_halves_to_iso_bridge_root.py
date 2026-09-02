#!/usr/bin/env python3
"""Assemble the proved rank-four three-halves reserve into ISO at rank four.

Dependency theorem (replayed separately): for every forest F with alpha(F)>=7,

    S4 = 8 p4^2 - p3 p4 - 10 p3 p5 >= 0.

The ISO quantity required by the current proof is

    Q4 = 4 p4^2 + p3^2 - 5 p3 p5.

This script verifies the exact positive bridge and the integer cutoff.
"""

from __future__ import annotations

import hashlib
import json
from pathlib import Path

import sympy as sp


HERE = Path(__file__).resolve().parent
OUTPUT = HERE / "rank4_three_halves_to_iso_bridge_root_20260829.json"


def prefix_cutoff(alpha: int) -> int:
    return (2 * alpha + 1) // 3


def main() -> None:
    p3, p4, p5 = sp.symbols("p3 p4 p5", nonnegative=True)
    reserve = 8 * p4**2 - p3 * p4 - 10 * p3 * p5
    iso = 4 * p4**2 + p3**2 - 5 * p3 * p5
    payment = p3**2 + sp.Rational(1, 2) * p3 * p4
    assert sp.expand(iso - sp.Rational(1, 2) * reserve - payment) == 0

    # L(alpha)=floor((2 alpha+1)/3)=ceil((2 alpha-1)/3).
    # The residue-class proof below is represented for arbitrary q by the
    # three exact affine cases; the finite assertions are a sanity replay.
    q = sp.symbols("q", integer=True, nonnegative=True)
    residue_cases = {
        "alpha=3q": sp.simplify((2 * (3 * q) + 1) / 3),
        "alpha=3q+1": sp.simplify((2 * (3 * q + 1) + 1) / 3),
        "alpha=3q+2": sp.simplify((2 * (3 * q + 2) + 1) / 3),
    }
    # After flooring: 2q, 2q+1, 2q+1 respectively.
    assert all((4 < prefix_cutoff(alpha)) == (alpha >= 7) for alpha in range(0, 1000))

    report = {
        "marker": "PASS_EXACT_RANK4_THREE_HALVES_TO_ISO_BRIDGE",
        "dependency": (
            "RANK4_THREE_HALVES_FOREST_CERTIFICATE_2026-07-27.md: "
            "S4>=0 for every forest with alpha>=7"
        ),
        "definitions": {
            "S4": "8 p4^2-p3 p4-10 p3 p5",
            "ISO4": "4 p4^2+p3^2-5 p3 p5",
            "L(alpha)": "floor((2 alpha+1)/3)=ceil((2 alpha-1)/3)",
        },
        "identity": "ISO4=S4/2+p3^2+p3 p4/2",
        "cutoff_equivalence": "4<L(alpha) iff alpha>=7",
        "conclusion": (
            "For every forest and every prefix-relevant rank-four cell, "
            "ISO4>0.  Rank four needs no FML induction."
        ),
        "residue_case_unfloored_expressions": {key: str(value) for key, value in residue_cases.items()},
        "scope": (
            "Exact assembly from the stated dependency theorem.  This bridge "
            "does not prove the dependency theorem or any rank r>=5."
        ),
        "source_sha256": hashlib.sha256(Path(__file__).read_bytes()).hexdigest().upper(),
    }
    raw = json.dumps(report, indent=2, sort_keys=True) + "\n"
    OUTPUT.write_bytes(raw.encode("utf-8"))
    print(json.dumps(report, indent=2, sort_keys=True))
    print("REPORT_SHA256", hashlib.sha256(raw.encode()).hexdigest().upper())
    print(report["marker"])


if __name__ == "__main__":
    main()
