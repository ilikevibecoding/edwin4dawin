#!/usr/bin/env python3
"""Exact all-order positivity of the j=3 exact-U1 FQ32 coefficient."""

from __future__ import annotations

import hashlib
import json
from pathlib import Path

import sympy as sp

from derive_terminal_q3_m1_general_forest_agent import C


HERE = Path(__file__).resolve().parent
OUTPUT = HERE / "terminal_q3_m1_forest_j3_exact_u1_coefficient_root_20260829.json"
WEDGE_NOTE = HERE / "FOREST_MARKED_COMPONENT_CORRELATED_WEDGE_UPPER_ROOT_2026-08-29.md"
WEDGE_NOTE_SHA = "3AFD1FFFEAEDE346C079F7438187F3BAC0F2591CFCC5D9D1681334FAFE4E5922"


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def main() -> None:
    assert sha256(WEDGE_NOTE) == WEDGE_NOTE_SHA
    N, h, d, R, W = sp.symbols("N h d R W", integer=True, nonnegative=True)
    m = N - h
    a = sp.expand(C(N, 2) - (m - d))
    p0 = sp.expand(C(N + 1, 3) - m * (N - 1) + W + C(N + 1, 2) - m)
    p1 = sp.expand(C(N + 1, 2) - m + N + 1)
    b = sp.expand(C(N, 3) - (m - d) * (N - 2) + W - C(d, 2) - R)

    # At target j=3, U1=p0 exactly, so the coefficient of the pinned
    # M=3*p0*R1-2*p1*R0 margin is (a*p0-p1*b)/b.
    cnum = sp.expand(a * p0 - p1 * b)
    assert sp.diff(cnum, W) == -(2 * N - d + 1)

    H, D, L = sp.symbols("H D L", integer=True, nonnegative=True)
    shifted = {
        h: 1 + H,
        d: 1 + D,
        N: 2 * (1 + H) + (1 + D) + R + L,
    }
    upper = sp.expand(C(d, 2) + C(R + 1, 2) + C(N - 2 * h - d - R + 1, 2))
    endpoint = sp.expand(12 * cnum.subs(W, upper).subs(shifted, simultaneous=True))
    poly = sp.Poly(endpoint, H, D, R, L)
    terms = sorted(poly.terms())
    coefficients = [sp.Integer(value) for _powers, value in terms]
    assert len(coefficients) == 70
    assert all(value > 0 for value in coefficients)
    assert min(coefficients) == 1
    stream = hashlib.sha256()
    for powers, value in terms:
        stream.update(f"{powers}|{value}\n".encode())

    # The supported target has b=i3(F)>0.  Since cnum decreases in W and
    # the pinned wedge lemma gives W<=upper, endpoint positivity proves
    # (a*p0-p1*b)/b>0 throughout the structural domain.
    source = Path(__file__).resolve()
    report = {
        "schema": "terminal-q3-m1-forest-j3-exact-u1-coefficient-v1",
        "date": "2026-08-29",
        "status": "PASS_EXACT_ALL_ORDER_FOREST_M1_J3_EXACT_U1_M_COEFFICIENT",
        "claim": (
            "For every supported no-isolate forest j=3 cell, the exact "
            "coefficient a*(U1/b)-p1=(a*p0-p1*b)/b of the all-forest "
            "q3<=q2 margin is strictly positive."
        ),
        "exact_identity": "U1=i3(G)+i2(G)=p0 at target j=3",
        "W_slope": str(sp.diff(cnum, W)),
        "correlated_W_upper": (
            "C(d,2)+C(R+1,2)+C(N-2h-d-R+1,2)"
        ),
        "parameter_shift": "h=1+H,d=1+D,N=2h+d+R+L",
        "clearing_factor": 12,
        "positive_power_coefficients": len(coefficients),
        "minimum_positive_power_coefficient": str(min(coefficients)),
        "coefficient_stream_sha256": stream.hexdigest().upper(),
        "pinned_wedge_note_sha256": WEDGE_NOTE_SHA,
        "scope": (
            "This proves only the sign allowing the FQ32 margin to be "
            "discarded in the exact-U1 j=3 forest reduction.  The remaining "
            "j=3 lower, forest m0, full terminal payment, and Erdos 993 are open."
        ),
        "source": source.name,
        "source_sha256": sha256(source),
    }
    OUTPUT.write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    print(report["status"])
    print("SOURCE", report["source_sha256"])
    print("REPORT", sha256(OUTPUT))


if __name__ == "__main__":
    main()
