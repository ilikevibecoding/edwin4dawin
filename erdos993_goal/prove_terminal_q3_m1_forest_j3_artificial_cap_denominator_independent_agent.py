#!/usr/bin/env python3
"""Exact positivity of the conservative j=3 artificial-cap denominator.

This is an independent auxiliary theorem for the forest m=1 tail.  It proves
only U3+B>0 on the structural N>=31 cone; it does not prove the payment.
"""

from __future__ import annotations

import hashlib
import json
import os
from pathlib import Path

import sympy as sy


HERE = Path(__file__).resolve().parent
OUTPUT = HERE / "terminal_q3_m1_forest_j3_artificial_cap_denominator_independent_20260829.json"


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def choose(x, k):
    ans = sy.Integer(1)
    for q in range(k):
        ans *= x - q
    return sy.cancel(ans / sy.factorial(k))


def main() -> None:
    H, D, R, L = sy.symbols("H D R L", integer=True, nonnegative=True)
    h = 1 + H
    d = 1 + D
    N = 2 * h + d + R + L
    S = N - d
    eH = N - h - d - R
    U3 = sy.expand(choose(S, 3) - eH * (S - 2) + choose(eH, 2))
    B = sy.expand(
        d * choose(S - 1, 2) - R * (S - 2)
        + choose(d, 2) * S - (d - 1) * R + choose(d, 3)
    )
    total = sy.expand(6 * (U3 + B))

    # Isolate the sole negative monomial in the ordinary power expansion as
    # the nonnegative integer binomial block R(R-1)(R+1)=6*C(R+1,3).
    binomial_block = sy.expand(R * (R - 1) * (R + 1))
    remainder = sy.Poly(sy.expand(total - binomial_block), H, D, R, L)
    terms = sorted(remainder.terms())
    assert len(terms) == 29
    assert all(coefficient > 0 for _powers, coefficient in terms)
    assert min(remainder.coeffs()) == 1
    assert sy.expand(total - binomial_block - remainder.as_expr()) == 0

    # Strictness on N>=31: if R>=2 the binomial block is positive.  If
    # R<=1, 2H+D+R+L=N-3>=28 forces at least one of H,D,L positive; the
    # remainder contains H+5D+2L and has no negative terms.
    assert remainder.coeff_monomial(H) == 1
    assert remainder.coeff_monomial(D) == 5
    assert remainder.coeff_monomial(L) == 2

    stream = hashlib.sha256()
    stream.update(f"BINOMIAL|{sy.sstr(binomial_block)}\n".encode())
    for powers, coefficient in terms:
        stream.update(f"{powers}|{coefficient}\n".encode())

    source = Path(__file__).resolve()
    report = {
        "schema": "terminal-q3-m1-forest-j3-artificial-cap-denominator-independent-v1",
        "date": "2026-08-29",
        "status": "PASS_INDEPENDENT_EXACT_FOREST_M1_J3_N31_PLUS_ARTIFICIAL_CAP_DENOMINATOR",
        "claim": (
            "On the integer structural cone N>=31, h=1+H, d=1+D, "
            "N=2h+d+R+L with H,D,R,L>=0, the fixed-edge quantity U3 "
            "and coarse root-class quantity B satisfy U3+B>0."
        ),
        "identity": "6(U3+B)=R(R-1)(R+1)+P(H,D,R,L)",
        "positive_remainder_coefficients": len(terms),
        "minimum_positive_remainder_coefficient": str(min(remainder.coeffs())),
        "coefficient_stream_sha256": stream.hexdigest().upper(),
        "replay": "PYTHONHASHSEED=0 python prove_terminal_q3_m1_forest_j3_artificial_cap_denominator_independent_agent.py",
        "scope": (
            "This proves only positivity of the conservative artificial-cap "
            "denominator for the N>=31 forest m=1,j=3 reduction. It does not "
            "prove the branch cover, m=0, the full payment, unimodality, or "
            "Erdos Problem 993."
        ),
        "source": source.name,
        "source_sha256": sha256(source),
    }
    temporary = OUTPUT.with_suffix(OUTPUT.suffix + ".tmp")
    temporary.write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    os.replace(temporary, OUTPUT)
    print(report["status"])
    print("SOURCE", report["source_sha256"])
    print("REPORT", sha256(OUTPUT))


if __name__ == "__main__":
    main()
