#!/usr/bin/env python3
"""All-target terminal-q3 Newton m=0 theorem over a path remainder."""

from __future__ import annotations

import hashlib
import json
from math import comb
from pathlib import Path

import sympy as sp


HERE = Path(__file__).resolve().parent
OUTPUT = HERE / "terminal_q3_m0_marked_isolate_path_all_j_exact_root_20260831.json"
MARKER = "PASS_EXACT_ALL_TARGET_TERMINAL_Q3_M0_MARKED_ISOLATE_PATH_ROOT"
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

    # For R=P_N, binary-string compression gives
    #   f_k=C(N-k+1,k),
    #   z_(j+1)=j*C(N-j,j).
    # The second identity compresses the unique adjacent 11 pair to one of
    # the j designated nonadjacent ones in a length-(N-1) string.
    N, j, s, y = sp.symbols("N j s y", integer=True, nonnegative=True)
    f2 = choose_poly(N - 1, 2)
    f3 = choose_poly(N - 2, 3)
    z3 = (N - 2) * (N - 3)
    z4 = 3 * choose_poly(N - 3, 3)
    edges = N - 1
    p0 = f3 + 2 * f2 + N
    r0 = z4 + 2 * z3 + edges
    c0 = z3 + 2 * f2
    determinant = sp.factor(p0 * c0 - f2 * r0)
    expected_determinant = (N - 2) * (N - 1) * (N**3 + 8*N**2 - 23*N + 18) / 12
    assert sp.simplify(determinant - expected_determinant) == 0

    # Divide by b=f_j=C(N-j+1,j).  These are exact adjacent-row ratios.
    fprev_over_b = j * (N - j + 2) / ((N - 2*j + 3) * (N - 2*j + 2))
    fnext_over_b = (N - 2*j + 1) * (N - 2*j) / ((j + 1) * (N - j + 1))
    znext_over_b = j * (N - 2*j + 1) / (N - j + 1)
    u_over_b = fnext_over_b + 2 + fprev_over_b
    e_over_b = znext_over_b + 2
    delta_over_b = sp.factor(
        (j + 1) * f2 * determinant * u_over_b
        + f2 * p0 * ((j + 1) * (c0 + r0) - 3 * (p0 + f2) * e_over_b)
    )

    # Support is N>=2j-1.  Put N=2j-1+s, j=3+y.
    shifted = sp.factor(delta_over_b.subs(N, 2*j - 1 + s).subs(j, y + 3))
    prefactor = (
        (y + 1)
        * (s + 2*y + 3)
        * (s + 2*y + 4)**2
        / (24 * (s + 1) * (s + 2) * (s + y + 3))
    )
    positive_core = sp.factor(shifted / prefactor)
    assert sp.simplify(shifted - prefactor * positive_core) == 0
    core_poly = sp.Poly(sp.expand(positive_core), s, y)
    coefficients = core_poly.coeffs()
    assert len(core_poly.terms()) == 41
    assert all(value > 0 for value in coefficients)
    assert min(coefficients) == 1
    coefficient_stream = hashlib.sha256()
    for monomial, coefficient in core_poly.terms():
        coefficient_stream.update(f"{monomial}|{coefficient}\n".encode())

    # Direct formula guard over a large literal range.
    literal_cells = 0
    minimum = None
    literal_stream = hashlib.sha256()
    for order in range(5, 1001):
        f2v = comb(order - 1, 2)
        f3v = comb(order - 2, 3)
        z3v = (order - 2) * (order - 3)
        z4v = 3 * comb(order - 3, 3)
        p0v = f3v + 2 * f2v + order
        r0v = z4v + 2 * z3v + order - 1
        c0v = z3v + 2 * f2v
        av = p0v * c0v - f2v * r0v
        for target in range(3, (order + 1)//2 + 1):
            bvalue = comb(order - target + 1, target)
            fjm1 = comb(order - target + 2, target - 1)
            fjp1 = comb(order - target, target + 1) if order - target >= target + 1 else 0
            zj1 = target * comb(order - target, target)
            uv = fjp1 + 2 * bvalue + fjm1
            ev = zj1 + 2 * bvalue
            delta = (
                (target + 1) * f2v * av * uv
                + f2v * p0v * (
                    (target + 1) * bvalue * (c0v + r0v)
                    - 3 * (p0v + f2v) * ev
                )
            )
            assert delta > 0
            literal_cells += 1
            record = (delta, order, target)
            if minimum is None or record < minimum:
                minimum = record
            literal_stream.update(f"{order}|{target}|{delta}\n".encode())

    payload = {
        "status": MARKER,
        "scope": "Isolated marked root, mandatory terminal leaf, remainder P_N, every supported N>=2j-1 and j>=3, Newton degree m=0.",
        "dependency": {
            "source_sha256": PIN_SOURCE_SHA256,
            "report_sha256": PIN_REPORT_SHA256,
            "status": dependency["status"],
        },
        "row_formulas": {
            "f_k": "C(N-k+1,k)",
            "z_(j+1)": "j*C(N-j,j)",
        },
        "cone_map": "N=2j-1+s, j=3+y, s,y>=0",
        "positive_prefactor": str(prefactor),
        "positive_core_monomials": len(core_poly.terms()),
        "minimum_core_coefficient": str(min(coefficients)),
        "core_coefficient_stream_sha256": coefficient_stream.hexdigest().upper(),
        "literal_guard": {
            "maximum_order": 1000,
            "cells": literal_cells,
            "minimum_delta": minimum[0],
            "minimum_witness": {"order": minimum[1], "j": minimum[2]},
            "ordered_stream_sha256": literal_stream.hexdigest().upper(),
        },
        "coverage_gap_within_scope": None,
        "scope_guard": "This closes the single-path remainder family for all targets. Disjoint path unions, other nonmatching remainders at j>=4, nonisolated marked roots, the full terminal payment, and Erdos Problem 993 remain separate.",
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
