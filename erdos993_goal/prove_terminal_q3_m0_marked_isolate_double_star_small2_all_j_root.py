#!/usr/bin/env python3
"""All-target terminal-q3 Newton m=0 theorem for D_(a,2) remainders."""

from __future__ import annotations

import hashlib
import json
from math import comb
from pathlib import Path

import sympy as sp


HERE = Path(__file__).resolve().parent
OUTPUT = HERE / (
    "terminal_q3_m0_marked_isolate_double_star_small2_all_j_"
    "exact_root_20260831.json"
)
NOTE = HERE / (
    "TERMINAL_Q3_M0_MARKED_ISOLATE_DOUBLE_STAR_SMALL2_ALL_J_ROOT_"
    "2026-08-31.md"
)
MARKER = (
    "PASS_EXACT_ALL_TARGET_TERMINAL_Q3_M0_MARKED_ISOLATE_"
    "DOUBLE_STAR_SMALL2_ROOT"
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
        observed[label] = pin
    return observed


def main() -> None:
    dependencies = verify_dependencies()

    # For the double star D_(a,2), with a>=2,
    #   F(x)=(1+x)^(a+2)+x(1+x)^a+x(1+x)^2,
    #   Z(x)=x^2(1+a(1+x)^2+2(1+x)^a).
    a, j, x, y = sp.symbols("a j x y", integer=True, nonnegative=True)
    cbin = choose_poly
    n = a + 2
    order = a + 4

    def f(rank: int):
        return cbin(n, rank) + cbin(a, rank - 1) + cbin(2, rank - 1)

    def z(rank: int):
        return (
            (1 if rank == 2 else 0)
            + a * cbin(2, rank - 2)
            + 2 * cbin(a, rank - 2)
        )

    f2, f3 = f(2), f(3)
    z2, z3, z4 = z(2), z(3), z(4)
    p0 = f3 + 2 * f2 + order
    r0 = z4 + 2 * z3 + z2
    c0 = z3 + 2 * f2
    determinant = sp.factor(p0 * c0 - f2 * r0)
    expected_determinant = (
        a**5 + 18 * a**4 + 107 * a**3
        + 291 * a**2 + 597 * a + 342
    ) / 6
    assert sp.simplify(determinant - expected_determinant) == 0

    # Target j=4 retains the final exceptional row from x(1+x)^2.  Its exact
    # margin is a positive polynomial after a=2+x.
    target4 = 4
    b4 = f(target4)
    u4 = f(target4 + 1) + 2 * b4 + f(target4 - 1)
    e4 = z(target4 + 1) + 2 * b4
    delta4 = sp.factor(
        (target4 + 1) * f2 * determinant * u4
        + f2 * p0 * (
            (target4 + 1) * b4 * (c0 + r0)
            - 3 * (p0 + f2) * e4
        )
    )
    delta4_shifted = sp.factor(delta4.subs(a, x + 2))
    delta4_poly = sp.Poly(sp.expand(delta4_shifted), x)
    assert all(value > 0 for value in delta4_poly.coeffs())

    # For j>=5, use B=C(n,j).  The other active high row is C(n-2,j-1).
    # Their fixed-codimension ratios give an exact rational expression.
    ratio = j * (n - j) / (n * (n - 1))
    b_over_B = 1 + ratio
    fprev_over_b = (
        j / (n - j + 1) + j * (j - 1) / (n * (n - 1))
    ) / b_over_B
    fnext_over_b = (
        (n - j) / (j + 1)
        + (n - j) * (n - j - 1) / (n * (n - 1))
    ) / b_over_B
    znext_over_b = 2 * ratio / b_over_B
    delta_over_b = sp.factor(
        (j + 1) * f2 * determinant * (fnext_over_b + 2 + fprev_over_b)
        + f2 * p0 * (
            (j + 1) * (c0 + r0)
            - 3 * (p0 + f2) * (znext_over_b + 2)
        )
    )

    # Support is n=a+2>=j.  Put n=j+x and j=5+y.
    shifted = sp.factor(delta_over_b.subs(a, j + x - 2).subs(j, y + 5))
    positive_prefactor = (
        (x + y + 5) * (x + y + 6)
        / (
            12 * (x + 1)
            * (x**2 + 3 * x * y + 14 * x + y**2 + 9 * y + 20)
        )
    )
    positive_core = sp.factor(shifted / positive_prefactor)
    assert sp.simplify(shifted - positive_prefactor * positive_core) == 0
    core_poly = sp.Poly(sp.expand(positive_core), x, y)
    core_coefficients = core_poly.coeffs()
    assert len(core_poly.terms()) == 54
    assert all(value > 0 for value in core_coefficients)
    assert min(core_coefficients) == 1

    coefficient_stream = hashlib.sha256()
    for monomial, coefficient in delta4_poly.terms():
        coefficient_stream.update(f"j4|{monomial}|{coefficient}\n".encode())
    for monomial, coefficient in core_poly.terms():
        coefficient_stream.update(f"j5plus|{monomial}|{coefficient}\n".encode())

    # Independent direct-row guard, including the pinned j=3 boundary.
    literal_cells = 0
    minimum = None
    literal_stream = hashlib.sha256()
    for large_side in range(2, 601):
        whole_order = large_side + 4

        def fi(rank: int) -> int:
            return (
                choose_int(large_side + 2, rank)
                + choose_int(large_side, rank - 1)
                + choose_int(2, rank - 1)
            )

        def zi(rank: int) -> int:
            if rank < 2:
                return 0
            return (
                (1 if rank == 2 else 0)
                + large_side * choose_int(2, rank - 2)
                + 2 * choose_int(large_side, rank - 2)
            )

        f2v, f3v = fi(2), fi(3)
        p0v = f3v + 2 * f2v + whole_order
        r0v = zi(4) + 2 * zi(3) + zi(2)
        c0v = zi(3) + 2 * f2v
        av = p0v * c0v - f2v * r0v
        for target in range(3, large_side + 3):
            bvalue = fi(target)
            assert bvalue > 0
            uv = fi(target + 1) + 2 * bvalue + fi(target - 1)
            ev = zi(target + 1) + 2 * bvalue
            delta = (
                (target + 1) * f2v * av * uv
                + f2v * p0v * (
                    (target + 1) * bvalue * (c0v + r0v)
                    - 3 * (p0v + f2v) * ev
                )
            )
            assert delta > 0
            literal_cells += 1
            record = (delta, large_side, target)
            if minimum is None or record < minimum:
                minimum = record
            literal_stream.update(
                f"{large_side}|{target}|{bvalue}|{delta}\n".encode()
            )

    payload = {
        "status": MARKER,
        "scope": (
            "Terminal-q3 Newton m=0 with an isolated marked root, the "
            "mandatory terminal leaf, remainder D_(a,2) for a>=2, and every "
            "supported target j>=3."
        ),
        "dependencies": dependencies,
        "row_formulas": {
            "F(x)": "(1+x)^(a+2)+x(1+x)^a+x(1+x)^2",
            "Z(x)": "x^2(1+a(1+x)^2+2(1+x)^a)",
        },
        "j3_boundary": PINNED["j3_universal"]["status"],
        "j4_shift": "a=2+x, x>=0",
        "j4_positive_coefficients": len(delta4_poly.terms()),
        "j5plus_cone_map": "a=j+x-2, j=5+y, x,y>=0",
        "j5plus_positive_prefactor": str(positive_prefactor),
        "j5plus_positive_core_monomials": len(core_poly.terms()),
        "minimum_j5plus_core_coefficient": str(min(core_coefficients)),
        "coefficient_stream_sha256": coefficient_stream.hexdigest().upper(),
        "literal_guard": {
            "maximum_large_side": 600,
            "cells": literal_cells,
            "minimum_delta": minimum[0],
            "minimum_witness": {"large_side": minimum[1], "j": minimum[2]},
            "ordered_stream_sha256": literal_stream.hexdigest().upper(),
        },
        "coverage_gap_within_scope": None,
        "scope_guard": (
            "This closes exactly the D_(a,2) remainder family for all targets. "
            "Other double stars, other nonmatching remainders at j>=4, "
            "nonisolated marked roots, the complete terminal payment, and "
            "Erdos Problem 993 remain separate."
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
        "j4_positive_coefficients": len(delta4_poly.terms()),
        "j5plus_positive_core_monomials": len(core_poly.terms()),
        "minimum_j5plus_core_coefficient": str(min(core_coefficients)),
        "literal_cells": literal_cells,
        "minimum_delta": minimum[0],
        "coverage_gap_within_scope": None,
    }, indent=2, sort_keys=True))
    print("SOURCE_SHA256", payload["source_sha256"])
    print("REPORT_SHA256", sha256(OUTPUT))
    print(MARKER)


if __name__ == "__main__":
    main()
