#!/usr/bin/env python3
"""All-target terminal-q3 Newton m=0 theorem over a matching remainder."""

from __future__ import annotations

import hashlib
import json
from math import comb
from pathlib import Path

import sympy as sp


HERE = Path(__file__).resolve().parent
OUTPUT = HERE / "terminal_q3_m0_marked_isolate_matching_all_j_exact_root_20260831.json"
MARKER = "PASS_EXACT_ALL_TARGET_TERMINAL_Q3_M0_MARKED_ISOLATE_MATCHING_ROOT"
PIN_SOURCE = "prove_terminal_q3_m0_retained_hprev_decomposition_adversary.py"
PIN_SOURCE_SHA256 = "0982211C9A94754F22F74F29E37392DFA5AC03ABA7BEAAC875A888AC1C6E10DA"
PIN_REPORT = "terminal_q3_m0_retained_hprev_decomposition_exact_adversary_20260829.json"
PIN_REPORT_SHA256 = "CB72F4A59A716BD34BC938C7A09D44E2A150E186003E3EBAE82A8161B8881D11"


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def main() -> None:
    assert sha256(HERE / PIN_SOURCE) == PIN_SOURCE_SHA256
    assert sha256(HERE / PIN_REPORT) == PIN_REPORT_SHA256
    dependency = json.loads((HERE / PIN_REPORT).read_text(encoding="utf-8"))
    assert dependency["status"] == "PASS_EXACT_TERMINAL_M0_RETAINED_HPREV_DECOMPOSITION"
    assert dependency["source_sha256"] == PIN_SOURCE_SHA256

    # R=h K2 has F(x)=(1+2x)^h and exactly-one-edge row
    # Z(x)=h*x^2*(1+2x)^(h-1).
    h, j, x, y = sp.symbols("h j x y", integer=True, nonnegative=True)
    f2 = 2 * h * (h - 1)
    f3 = sp.Rational(4, 3) * h * (h - 1) * (h - 2)
    z3 = 2 * h * (h - 1)
    z4 = 2 * h * (h - 1) * (h - 2)
    order = 2 * h
    edges = h
    p0 = f3 + 2 * f2 + order
    r0 = z4 + 2 * z3 + edges
    c0 = z3 + 2 * f2
    determinant = sp.factor(p0 * c0 - f2 * r0)
    expected_determinant = 2 * h**2 * (h - 1) * (2 * h**2 + 2 * h + 1)
    assert sp.simplify(determinant - expected_determinant) == 0

    # Divide the exact coefficient by b=f_j>0.  Adjacent matching rows are
    # f_(j-1)/b=j/[2(h-j+1)], f_(j+1)/b=2(h-j)/(j+1), and
    # z_(j+1)/b=j/2.
    u_over_b = 2 + j / (2 * (h - j + 1)) + 2 * (h - j) / (j + 1)
    e_over_b = 2 + j / 2
    delta_over_b = sp.factor(
        (j + 1) * f2 * determinant * u_over_b
        + f2 * p0 * ((j + 1) * (c0 + r0) - 3 * (p0 + f2) * e_over_b)
    )
    positive_core = (
        4 * h**4 + 2 * h**3 * j + 10 * h**3
        + 12 * h**2 * j + 26 * h**2
        - 5 * h * j + 23 * h + 3 * j + 3
    )
    expected = (
        2 * h**3 * (h - 1) * (j - 2) * positive_core
        / (3 * (h - j + 1))
    )
    assert sp.simplify(delta_over_b - expected) == 0

    # Exhaust the supported cone h>=j>=3 with h=j+x, j=3+y.
    shifted_core = sp.Poly(
        sp.expand(positive_core.subs(h, j + x).subs(j, 3 + y)), x, y
    )
    coefficients = shifted_core.coeffs()
    assert len(shifted_core.terms()) == 15
    assert all(value > 0 for value in coefficients)
    assert min(coefficients) == 4
    stream = hashlib.sha256()
    for monomial, coefficient in shifted_core.terms():
        stream.update(f"{monomial}|{coefficient}\n".encode())

    # Independent integer evaluation guard over a large literal rectangle.
    literal_cells = 0
    minimum_numerator = None
    literal_stream = hashlib.sha256()
    for hv in range(3, 301):
        for jv in range(3, hv + 1):
            bvalue = (2**jv) * comb(hv, jv)
            f2v = 2 * hv * (hv - 1)
            f3v = 8 * comb(hv, 3)
            z3v = 2 * hv * (hv - 1)
            z4v = 4 * hv * comb(hv - 1, 2)
            p0v = f3v + 2 * f2v + 2 * hv
            r0v = z4v + 2 * z3v + hv
            c0v = z3v + 2 * f2v
            av = p0v * c0v - f2v * r0v
            fjm1 = (2 ** (jv - 1)) * comb(hv, jv - 1)
            fjp1 = (2 ** (jv + 1)) * comb(hv, jv + 1) if jv < hv else 0
            zj1 = hv * comb(hv - 1, jv - 1) * (2 ** (jv - 1))
            uv = fjp1 + 2 * bvalue + fjm1
            ev = zj1 + 2 * bvalue
            delta = (
                (jv + 1) * f2v * av * uv
                + f2v * p0v * (
                    (jv + 1) * bvalue * (c0v + r0v)
                    - 3 * (p0v + f2v) * ev
                )
            )
            assert delta > 0
            literal_cells += 1
            record = (delta, hv, jv)
            if minimum_numerator is None or record < minimum_numerator:
                minimum_numerator = record
            literal_stream.update(f"{hv}|{jv}|{delta}\n".encode())

    payload = {
        "status": MARKER,
        "scope": "Isolated marked root, mandatory terminal leaf, remainder h*K2, every supported h>=j>=3, Newton degree m=0.",
        "dependency": {
            "source_sha256": PIN_SOURCE_SHA256,
            "report_sha256": PIN_REPORT_SHA256,
            "status": dependency["status"],
        },
        "exact_factorization": str(expected),
        "cone_map": "h=j+x, j=3+y, x,y>=0",
        "positive_core_monomials": len(shifted_core.terms()),
        "minimum_core_coefficient": str(min(coefficients)),
        "core_coefficient_stream_sha256": stream.hexdigest().upper(),
        "literal_guard": {
            "h_maximum": 300,
            "cells": literal_cells,
            "minimum_delta": minimum_numerator[0],
            "minimum_witness": {"h": minimum_numerator[1], "j": minimum_numerator[2]},
            "ordered_stream_sha256": literal_stream.hexdigest().upper(),
        },
        "coverage_gap_within_scope": None,
        "scope_guard": "This closes the matching-remainder family for all targets. It does not close nonmatching remainders at j>=4, nonisolated marked roots, the full terminal payment, or Erdos Problem 993.",
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
        "minimum_delta": minimum_numerator[0],
        "coverage_gap_within_scope": None,
    }, indent=2, sort_keys=True))
    print("SOURCE_SHA256", payload["source_sha256"])
    print("REPORT_SHA256", sha256(OUTPUT))
    print(MARKER)


if __name__ == "__main__":
    main()
