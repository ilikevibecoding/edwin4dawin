#!/usr/bin/env python3
"""All-target terminal-q3 Newton m=0 theorem over a subdivided-star remainder.

The remainder is the double star D_(a,1): two adjacent centres, with ``a``
leaves at one centre and one leaf at the other.  Equivalently, it is a star
with one arm subdivided.  The marked root is isolated and the terminal leaf
is mandatory, so the excluded block is multiplied by (1+x)^2.
"""

from __future__ import annotations

import hashlib
import json
from math import comb
from pathlib import Path

import sympy as sp


HERE = Path(__file__).resolve().parent
OUTPUT = HERE / (
    "terminal_q3_m0_marked_isolate_subdivided_star_all_j_"
    "exact_root_20260831.json"
)
NOTE = HERE / (
    "TERMINAL_Q3_M0_MARKED_ISOLATE_SUBDIVIDED_STAR_ALL_J_ROOT_"
    "2026-08-31.md"
)
MARKER = (
    "PASS_EXACT_ALL_TARGET_TERMINAL_Q3_M0_MARKED_ISOLATE_"
    "SUBDIVIDED_STAR_ROOT"
)

PINNED = {
    "retained_hprev": {
        "source": "prove_terminal_q3_m0_retained_hprev_decomposition_adversary.py",
        "source_sha256": "0982211C9A94754F22F74F29E37392DFA5AC03ABA7BEAAC875A888AC1C6E10DA",
        "report": "terminal_q3_m0_retained_hprev_decomposition_exact_adversary_20260829.json",
        "report_sha256": "CB72F4A59A716BD34BC938C7A09D44E2A150E186003E3EBAE82A8161B8881D11",
        "status": "PASS_EXACT_TERMINAL_M0_RETAINED_HPREV_DECOMPOSITION",
    },
    "j3_universal": {
        "source": "prove_terminal_q3_m0_marked_isolate_j3_all_order_root.py",
        "source_sha256": "8D39EE9ECDD3075053833C14B4A4ACCEADFB7174AC92C64D0F375826CCD6B558",
        "report": "terminal_q3_m0_marked_isolate_j3_all_order_exact_root_20260831.json",
        "report_sha256": "0E9D2C9F7338A87645D4EF3BE00008F6370C8B77084A823D451F84C0F08EDCBD",
        "status": "PASS_EXACT_ALL_ORDER_TERMINAL_Q3_M0_MARKED_ISOLATE_J3_ROOT",
    },
}


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def choose_poly(value, rank: int):
    return sp.prod(value - offset for offset in range(rank)) / sp.factorial(rank)


def choose_int(value: int, rank: int) -> int:
    return comb(value, rank) if 0 <= rank <= value else 0


def verify_dependencies() -> dict:
    observed = {}
    for label, pin in PINNED.items():
        assert sha256(HERE / pin["source"]) == pin["source_sha256"]
        assert sha256(HERE / pin["report"]) == pin["report_sha256"]
        report = json.loads((HERE / pin["report"]).read_text(encoding="utf-8"))
        assert report["status"] == pin["status"]
        assert report["source_sha256"] == pin["source_sha256"]
        observed[label] = {
            "source": pin["source"],
            "source_sha256": pin["source_sha256"],
            "report": pin["report"],
            "report_sha256": pin["report_sha256"],
            "status": pin["status"],
        }
    return observed


def main() -> None:
    dependencies = verify_dependencies()

    # For D_(a,1), with a>=1,
    #   F(x)=(1+x)^(a+1)+x(1+x)^a+x(1+x),
    #   Z(x)=x^2(1+a(1+x)+(1+x)^a),
    # where F is the independence polynomial and Z is the exactly-one-edge
    # row.  Targets j>=4 avoid the exceptional degree-two term x(1+x).
    a, j, x, y = sp.symbols("a j x y", integer=True, nonnegative=True)
    cbin = choose_poly
    order = a + 3
    f2 = cbin(a + 2, 2)
    f3 = a * (a - 1) * (a + 4) / 6
    z2 = a + 2
    z3 = 2 * a
    z4 = cbin(a, 2)
    p0 = f3 + 2 * f2 + order
    r0 = z4 + 2 * z3 + z2
    c0 = z3 + 2 * f2
    determinant = sp.factor(p0 * c0 - f2 * r0)
    expected_determinant = (
        2 * a**5 + 25 * a**4 + 98 * a**3
        + 197 * a**2 + 290 * a + 96
    ) / 12
    assert sp.simplify(determinant - expected_determinant) == 0

    # Put C=C(a,j-1).  For j>=4, every required target row divided by
    # b=f_j=C(a,j)+2C(a,j-1) is the following exact rational function.
    c_over_b = j / (a + j + 1)
    fprev_over_b = (
        1 + 2 * (j - 1) / (a - j + 2)
    ) * c_over_b
    fnext_over_b = (
        (a - j + 1) * (a - j) / (j * (j + 1))
        + 2 * (a - j + 1) / j
    ) * c_over_b
    znext_over_b = c_over_b
    u_over_b = fnext_over_b + 2 + fprev_over_b
    e_over_b = znext_over_b + 2
    delta_over_b = sp.factor(
        (j + 1) * f2 * determinant * u_over_b
        + f2 * p0 * (
            (j + 1) * (c0 + r0)
            - 3 * (p0 + f2) * e_over_b
        )
    )

    # Support is a>=j-1.  Exhaust j>=4 by a=j-1+x and j=4+y.
    shifted = sp.factor(delta_over_b.subs(a, j - 1 + x).subs(j, y + 4))
    positive_prefactor = (
        (x + y + 4) * (x + y + 5)
        / (24 * (x + 1) * (x + 2 * y + 8))
    )
    positive_core = sp.factor(shifted / positive_prefactor)
    assert sp.simplify(shifted - positive_prefactor * positive_core) == 0
    core_poly = sp.Poly(sp.expand(positive_core), x, y)
    coefficients = core_poly.coeffs()
    assert len(core_poly.terms()) == 44
    assert all(value > 0 for value in coefficients)
    assert min(coefficients) == 4

    coefficient_stream = hashlib.sha256()
    for monomial, coefficient in core_poly.terms():
        coefficient_stream.update(f"{monomial}|{coefficient}\n".encode())

    # Direct integer-row guard includes j=3 and is independent of the
    # symbolic adjacent-row ratios above.  The all-order j=3 promotion is
    # supplied by the pinned arbitrary-forest theorem.
    literal_cells = 0
    minimum = None
    literal_stream = hashlib.sha256()
    for leaves in range(2, 601):
        n = leaves + 3

        def f(rank: int) -> int:
            return (
                choose_int(leaves + 1, rank)
                + choose_int(leaves, rank - 1)
                + choose_int(1, rank - 1)
            )

        def z(rank: int) -> int:
            if rank < 2:
                return 0
            return (
                (1 if rank == 2 else 0)
                + leaves * choose_int(1, rank - 2)
                + choose_int(leaves, rank - 2)
            )

        f2v, f3v = f(2), f(3)
        p0v = f3v + 2 * f2v + n
        r0v = z(4) + 2 * z(3) + z(2)
        c0v = z(3) + 2 * f2v
        av = p0v * c0v - f2v * r0v
        for target in range(3, leaves + 2):
            bvalue = f(target)
            assert bvalue > 0
            uv = f(target + 1) + 2 * bvalue + f(target - 1)
            ev = z(target + 1) + 2 * bvalue
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
            literal_stream.update(
                f"{leaves}|{target}|{bvalue}|{delta}\n".encode()
            )

    payload = {
        "status": MARKER,
        "scope": (
            "Terminal-q3 Newton m=0 with an isolated marked root, the "
            "mandatory terminal leaf, remainder D_(a,1), and every supported "
            "target j>=3."
        ),
        "dependencies": dependencies,
        "row_formulas": {
            "F(x)": "(1+x)^(a+1)+x(1+x)^a+x(1+x)",
            "Z(x)": "x^2(1+a(1+x)+(1+x)^a)",
        },
        "j3_boundary": PINNED["j3_universal"]["status"],
        "j4plus_cone_map": "a=j-1+x, j=4+y, x,y>=0",
        "positive_prefactor": str(positive_prefactor),
        "positive_core_monomials": len(core_poly.terms()),
        "minimum_core_coefficient": str(min(coefficients)),
        "core_coefficient_stream_sha256": coefficient_stream.hexdigest().upper(),
        "literal_guard": {
            "maximum_large_leaf_count": 600,
            "cells": literal_cells,
            "minimum_delta": minimum[0],
            "minimum_witness": {"large_leaf_count": minimum[1], "j": minimum[2]},
            "ordered_stream_sha256": literal_stream.hexdigest().upper(),
        },
        "coverage_gap_within_scope": None,
        "scope_guard": (
            "This closes the subdivided-star remainder family for all targets. "
            "Other nonmatching remainders at j>=4, nonisolated marked roots, "
            "the complete terminal payment, and Erdos Problem 993 remain separate."
        ),
        "note": NOTE.name,
        "note_sha256": sha256(NOTE),
        "source_sha256": sha256(Path(__file__)),
    }
    OUTPUT.write_text(
        json.dumps(payload, indent=2, sort_keys=True) + "\n",
        encoding="utf-8",
        newline="\n",
    )
    print(json.dumps({
        "status": MARKER,
        "positive_core_monomials": len(core_poly.terms()),
        "minimum_core_coefficient": str(min(coefficients)),
        "literal_cells": literal_cells,
        "minimum_delta": minimum[0],
        "coverage_gap_within_scope": None,
    }, indent=2, sort_keys=True))
    print("SOURCE_SHA256", payload["source_sha256"])
    print("REPORT_SHA256", sha256(OUTPUT))
    print(MARKER)


if __name__ == "__main__":
    main()
