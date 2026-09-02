#!/usr/bin/env python3
"""Derive the exact isolate recurrence hierarchy for N and R.

The compact nested-kernel identities give, under common multiplication of all
four minors by (1+x),

  N+ = (1+z)(1+w)N - (z-w)^2 R/2,
  R+ = (1+z)(1+w)R.

This script derives the induced recurrences for the adjacent nested invariant
M and the central R-curvature C.  It is an algebraic reduction only.
"""

from __future__ import annotations

import hashlib
import json
from pathlib import Path

import sympy as sp


HERE = Path(__file__).resolve().parent
OUTPUT = HERE / "iso_isolate_recurrence_hierarchy_symbolic_root_20260829.json"


def table(name: str) -> dict[tuple[int, int], sp.Symbol]:
    out: dict[tuple[int, int], sp.Symbol] = {}
    for a in range(-5, 2):
        for b in range(-5, 2):
            i, j = sorted((a, b))
            out[a, b] = sp.Symbol(f"{name}_{i:+d}_{j:+d}")
    return out


def at(values: dict[tuple[int, int], sp.Symbol], a: int, b: int):
    return values[a, b]


def pascal(values, a: int, b: int):
    return (
        at(values, a, b)
        + at(values, a - 1, b)
        + at(values, a, b - 1)
        + at(values, a - 1, b - 1)
    )


def delta(values, a: int, b: int):
    return (
        at(values, a - 2, b)
        + at(values, a, b - 2)
        - 2 * at(values, a - 1, b - 1)
    ) / 2


def main() -> None:
    N, R = table("N"), table("R")

    def nplus(a: int, b: int):
        return pascal(N, a, b) - delta(R, a, b)

    def rplus(a: int, b: int):
        return pascal(R, a, b)

    # Offsets are relative to r.  Symmetry is built into table().
    M = 2 * at(N, -1, 0)
    Mprev = 2 * at(N, -2, -1)
    Mplus = 2 * nplus(-1, 0)

    C = at(R, -1, -1) - at(R, -2, 0)
    Cprev = at(R, -2, -2) - at(R, -3, -1)
    Cplus = rplus(-1, -1) - rplus(-2, 0)

    J = at(R, -2, -1) - at(R, -3, 0)
    H = 2 * (at(N, -2, 0) + at(N, -1, -1)) + J

    assert sp.expand(Cplus - C - Cprev - J) == 0
    assert sp.expand(Mplus - M - Mprev - H) == 0
    assert sp.expand((Mplus + Cplus) - (M + C) - (Mprev + Cprev) - (H + J)) == 0
    assert sp.expand(H + J - 2 * (at(N, -2, 0) + at(N, -1, -1) + J)) == 0

    report = {
        "marker": "DERIVED_EXACT_ISO_ISOLATE_RECURRENCE_HIERARCHY",
        "polynomial_transform": {
            "N_plus": "(1+z)(1+w)N-(z-w)^2R/2",
            "R_plus": "(1+z)(1+w)R",
        },
        "definitions": {
            "M_r": "2N_(r-1,r)",
            "C_r": "R_(r-1,r-1)-R_(r-2,r)",
            "J_r": "R_(r-2,r-1)-R_(r-3,r)",
            "H_r": "2[N_(r-2,r)+N_(r-1,r-1)]+J_r",
            "G_r": "M_r+C_r",
        },
        "recurrences": {
            "C": "C_r(plus)-C_r-C_(r-1)=J_r",
            "M": "M_r(plus)-M_r-M_(r-1)=H_r",
            "G": (
                "G_r(plus)-G_r-G_(r-1)=H_r+J_r="
                "2[N_(r-2,r)+N_(r-1,r-1)+J_r]"
            ),
        },
        "scope": (
            "Exact coefficient algebra only. Positivity of J_r, H_r, or the "
            "displayed recurrences for every forest remains unproved."
        ),
    }
    raw = json.dumps(report, indent=2, sort_keys=True) + "\n"
    OUTPUT.write_text(raw, encoding="utf-8")
    print(json.dumps(report, indent=2, sort_keys=True))
    print("REPORT_SHA256", hashlib.sha256(raw.encode()).hexdigest().upper())


if __name__ == "__main__":
    main()
