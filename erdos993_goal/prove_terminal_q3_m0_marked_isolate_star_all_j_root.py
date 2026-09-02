#!/usr/bin/env python3
"""All-target terminal-q3 Newton m=0 theorem over a star remainder."""

from __future__ import annotations

import hashlib
import json
from math import comb
from pathlib import Path

import sympy as sp


HERE = Path(__file__).resolve().parent
OUTPUT = HERE / "terminal_q3_m0_marked_isolate_star_all_j_exact_root_20260831.json"
MARKER = "PASS_EXACT_ALL_TARGET_TERMINAL_Q3_M0_MARKED_ISOLATE_STAR_ROOT"
PIN_SOURCE = "prove_terminal_q3_m0_retained_hprev_decomposition_adversary.py"
PIN_SOURCE_SHA256 = "0982211C9A94754F22F74F29E37392DFA5AC03ABA7BEAAC875A888AC1C6E10DA"
PIN_REPORT = "terminal_q3_m0_retained_hprev_decomposition_exact_adversary_20260829.json"
PIN_REPORT_SHA256 = "CB72F4A59A716BD34BC938C7A09D44E2A150E186003E3EBAE82A8161B8881D11"


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def choose_poly(value, rank: int):
    return sp.prod(value - offset for offset in range(rank)) / sp.factorial(rank)


def main() -> None:
    assert sha256(HERE / PIN_SOURCE) == PIN_SOURCE_SHA256
    assert sha256(HERE / PIN_REPORT) == PIN_REPORT_SHA256
    dependency = json.loads((HERE / PIN_REPORT).read_text(encoding="utf-8"))
    assert dependency["status"] == "PASS_EXACT_TERMINAL_M0_RETAINED_HPREV_DECOMPOSITION"
    assert dependency["source_sha256"] == PIN_SOURCE_SHA256

    # R=K_(1,L) has F(x)=(1+x)^L+x and Z(x)=L*x^2.  Thus for every
    # supported target L>=j>=3, f_j=C(L,j) and z_(j+1)=0.
    L, j, x, y = sp.symbols("L j x y", integer=True, nonnegative=True)
    f2 = choose_poly(L, 2)
    f3 = choose_poly(L, 3)
    p0 = f3 + 2 * f2 + L + 1
    r0 = L
    c0 = 2 * f2
    determinant = sp.factor(p0 * c0 - f2 * r0)
    expected_determinant = L * (L - 1) * (L**3 + 3 * L**2 - L + 6) / 6
    assert sp.simplify(determinant - expected_determinant) == 0

    # Divide by b=f_j.  Adjacent binomial rows give
    # f_(j-1)/b=j/(L-j+1), f_(j+1)/b=(L-j)/(j+1).
    u_over_b = 2 + j / (L - j + 1) + (L - j) / (j + 1)
    e_over_b = 2
    delta_over_b = sp.factor(
        (j + 1) * f2 * determinant * u_over_b
        + f2 * p0 * ((j + 1) * (c0 + r0) - 3 * (p0 + f2) * e_over_b)
    )

    # Exhaust L>=j>=3 via L=j+x, j=3+y.  The exact result is a positive
    # rational prefactor times a coefficientwise-positive polynomial.
    shifted = sp.factor(delta_over_b.subs(L, j + x).subs(j, y + 3))
    prefactor = (x + y + 2) * (x + y + 3) / (12 * (x + 1))
    positive_core = sp.factor(shifted / prefactor)
    assert sp.simplify(shifted - prefactor * positive_core) == 0
    core_poly = sp.Poly(sp.expand(positive_core), x, y)
    coefficients = core_poly.coeffs()
    assert len(core_poly.terms()) == 35
    assert all(value > 0 for value in coefficients)
    assert min(coefficients) == 1
    coefficient_stream = hashlib.sha256()
    for monomial, coefficient in core_poly.terms():
        coefficient_stream.update(f"{monomial}|{coefficient}\n".encode())

    # Literal direct-row guard, separate from the all-order factorization.
    literal_cells = 0
    minimum = None
    literal_stream = hashlib.sha256()
    for leaves in range(3, 501):
        f2v = comb(leaves, 2)
        f3v = comb(leaves, 3)
        p0v = f3v + 2 * f2v + leaves + 1
        r0v = leaves
        c0v = 2 * f2v
        av = p0v * c0v - f2v * r0v
        for target in range(3, leaves + 1):
            bvalue = comb(leaves, target)
            fjm1 = comb(leaves, target - 1)
            fjp1 = comb(leaves, target + 1) if target < leaves else 0
            uv = fjp1 + 2 * bvalue + fjm1
            ev = 2 * bvalue
            delta = (
                (target + 1) * f2v * av * uv
                + f2v * p0v * (
                    (target + 1) * bvalue * (c0v + r0v)
                    - 3 * (p0v + f2v) * ev
                )
            )
            assert delta > 0
            literal_cells += 1
            record = (delta, leaves, target)
            if minimum is None or record < minimum:
                minimum = record
            literal_stream.update(f"{leaves}|{target}|{delta}\n".encode())

    payload = {
        "status": MARKER,
        "scope": "Isolated marked root, mandatory terminal leaf, remainder K_(1,L), every supported L>=j>=3, Newton degree m=0.",
        "dependency": {
            "source_sha256": PIN_SOURCE_SHA256,
            "report_sha256": PIN_REPORT_SHA256,
            "status": dependency["status"],
        },
        "cone_map": "L=j+x, j=3+y, x,y>=0",
        "positive_prefactor": str(prefactor),
        "positive_core_monomials": len(core_poly.terms()),
        "minimum_core_coefficient": str(min(coefficients)),
        "core_coefficient_stream_sha256": coefficient_stream.hexdigest().upper(),
        "literal_guard": {
            "maximum_leaves": 500,
            "cells": literal_cells,
            "minimum_delta": minimum[0],
            "minimum_witness": {"leaves": minimum[1], "j": minimum[2]},
            "ordered_stream_sha256": literal_stream.hexdigest().upper(),
        },
        "coverage_gap_within_scope": None,
        "scope_guard": "This closes the pure-star remainder family for all targets. Star-plus-matching padding, other nonmatching remainders at j>=4, nonisolated marked roots, the full terminal payment, and Erdos Problem 993 remain separate.",
        "source_sha256": sha256(Path(__file__)),
    }
    OUTPUT.write_text(
        json.dumps(payload, indent=2, sort_keys=True) + "\n",
        encoding="utf-8",
        newline="\n",
    )
    print(json.dumps({
        "status": payload["status"],
        "literal_cells": literal_cells,
        "minimum_delta": minimum[0],
        "coverage_gap_within_scope": None,
    }, indent=2, sort_keys=True))
    print("SOURCE_SHA256", payload["source_sha256"])
    print("REPORT_SHA256", sha256(OUTPUT))
    print(MARKER)


if __name__ == "__main__":
    main()
