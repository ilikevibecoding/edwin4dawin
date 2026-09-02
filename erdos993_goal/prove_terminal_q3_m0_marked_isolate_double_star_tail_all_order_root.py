#!/usr/bin/env python3
"""All-order terminal-q3 Newton m=0 tail theorem for arbitrary double stars.

For a sorted double star D_(a,b), a>=b>=2, this proves every target
``j>=b+3``.  The proof keeps the exact low rows and encloses the only active
high-row mixture weight between two exact affine endpoints.
"""

from __future__ import annotations

import hashlib
import json
from math import comb
from pathlib import Path

import sympy as sp


HERE = Path(__file__).resolve().parent
OUTPUT = HERE / (
    "terminal_q3_m0_marked_isolate_double_star_tail_all_order_"
    "exact_root_20260831.json"
)
NOTE = HERE / (
    "TERMINAL_Q3_M0_MARKED_ISOLATE_DOUBLE_STAR_TAIL_ALL_ORDER_ROOT_"
    "2026-08-31.md"
)
MARKER = (
    "PASS_EXACT_ALL_ORDER_TERMINAL_Q3_M0_MARKED_ISOLATE_"
    "DOUBLE_STAR_TAIL_ROOT"
)

PIN_SOURCE = "prove_terminal_q3_m0_retained_hprev_decomposition_adversary.py"
PIN_SOURCE_SHA256 = "0982211C9A94754F22F74F29E37392DFA5AC03ABA7BEAAC875A888AC1C6E10DA"
PIN_REPORT = "terminal_q3_m0_retained_hprev_decomposition_exact_adversary_20260829.json"
PIN_REPORT_SHA256 = "CB72F4A59A716BD34BC938C7A09D44E2A150E186003E3EBAE82A8161B8881D11"
PIN_STATUS = "PASS_EXACT_TERMINAL_M0_RETAINED_HPREV_DECOMPOSITION"


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def choose_poly(value, rank: int):
    return sp.prod(value - offset for offset in range(rank)) / sp.factorial(rank)


def choose_int(value: int, rank: int) -> int:
    return comb(value, rank) if 0 <= rank <= value else 0


def poly_stats(expression, variables) -> dict:
    polynomial = sp.Poly(sp.expand(expression), *variables)
    coefficients = polynomial.coeffs()
    return {
        "terms": len(polynomial.terms()),
        "negative_coefficients": sum(
            value.is_negative is True for value in coefficients
        ),
        "minimum_coefficient": str(min(coefficients)),
    }


def update_stream(stream, label: str, expression, variables) -> None:
    polynomial = sp.Poly(sp.expand(expression), *variables)
    for monomial, coefficient in polynomial.terms():
        stream.update(
            f"{label}|{','.join(map(str, monomial))}|{coefficient}\n".encode()
        )


def main() -> None:
    assert sha256(HERE / PIN_SOURCE) == PIN_SOURCE_SHA256
    assert sha256(HERE / PIN_REPORT) == PIN_REPORT_SHA256
    dependency = json.loads((HERE / PIN_REPORT).read_text(encoding="utf-8"))
    assert dependency["status"] == PIN_STATUS
    assert dependency["source_sha256"] == PIN_SOURCE_SHA256

    # Exact low rows of D_(a,b):
    #   F=(1+x)^(a+b)+x(1+x)^a+x(1+x)^b,
    #   Z=x^2(1+a(1+x)^b+b(1+x)^a).
    a, b, j, rho = sp.symbols("a b j rho", nonnegative=True)
    n = a + b
    cbin = choose_poly
    f2 = cbin(n, 2) + n
    f3 = cbin(n, 3) + cbin(a, 2) + cbin(b, 2)
    z2 = n + 1
    z3 = 2 * a * b
    z4 = a * cbin(b, 2) + b * cbin(a, 2)
    p0 = f3 + 2 * f2 + n + 2
    r0 = z4 + 2 * z3 + z2
    c0 = z3 + 2 * f2
    determinant = sp.factor(p0 * c0 - f2 * r0)

    # A is manifestly positive for a,b>0.  This also pays the omitted
    # f_(j-1) boundary row when a=j-2 below.
    determinant_poly = sp.Poly(sp.expand(determinant), a, b)
    determinant_coefficients = determinant_poly.coeffs()
    assert len(determinant_poly.terms()) == 20
    assert all(value > 0 for value in determinant_coefficients)

    # For j>=b+3, every high row from the smaller centre vanishes.  With
    # B=C(n,j) and rho=C(a,j-1)/B, all rows divided by B are affine in rho.
    fj_over_B = 1 + rho
    fprev_over_B = j / (n - j + 1) + rho * (j - 1) / (a - j + 2)
    fnext_over_B = (n - j) / (j + 1) + rho * (a - j + 1) / j
    znext_over_B = b * rho
    delta_over_B = sp.factor(
        (j + 1) * f2 * determinant
        * (fnext_over_B + 2 * fj_over_B + fprev_over_B)
        + f2 * p0 * (
            (j + 1) * fj_over_B * (c0 + r0)
            - 3 * (p0 + f2) * (znext_over_B + 2 * fj_over_B)
        )
    )
    assert sp.Poly(sp.together(delta_over_B), rho).degree() == 1

    q, s, x, y = sp.symbols("q s x y", nonnegative=True)

    # Lower endpoint rho=0.  Put b=2+q, j=b+3+y, n=j+x, hence
    # a=3+y+x.  The resulting certificate is positive even before imposing
    # the extra sorted-side constraint a>=b.
    lower_substitution = {
        b: q + 2,
        j: q + y + 5,
        a: x + y + 3,
    }
    lower = sp.factor(
        delta_over_B.subs(rho, 0).subs(lower_substitution, simultaneous=True)
    )
    lower_numerator, lower_denominator = sp.fraction(lower)
    assert sp.simplify(lower_denominator - 24 * (x + 1)) == 0
    lower_stats = poly_stats(lower_numerator, (q, x, y))
    assert lower_stats == {
        "terms": 262,
        "negative_coefficients": 0,
        "minimum_coefficient": "1",
    }

    # If a>=j-1, write n-j=b-1+s.  The exact hypergeometric weight obeys
    #   0<=rho<=j(n-j)/(n(n-1))
    # for every b>=2: equality holds at b=2 and each additional product
    # factor lies in [0,1].  Parameterize the upper endpoint by
    # b=2+q, j=b+3+y, and a=b+2+y+s.
    upper_substitution = {
        b: q + 2,
        j: q + y + 5,
        a: q + y + s + 4,
    }
    rho_upper = j * (n - j) / (n * (n - 1))
    upper = sp.factor(
        delta_over_B.subs(rho, rho_upper)
        .subs(upper_substitution, simultaneous=True)
    )
    upper_numerator, upper_denominator = sp.fraction(upper)
    assert sp.simplify(
        upper_denominator
        - 24 * (s + 1) * (q + s + 2) * (2 * q + s + y + 5)
    ) == 0
    upper_stats = poly_stats(upper_numerator, (q, s, y))
    assert upper_stats == {
        "terms": 423,
        "negative_coefficients": 0,
        "minimum_coefficient": "1",
    }

    # Since delta/B is affine in rho, positivity at both endpoints proves it
    # on the complete interval.  If a<=j-3, rho=0 exactly.  If a=j-2,
    # rho=0 and the true f_(j-1) has one additional positive row; determinant
    # positivity shows the lower endpoint remains a valid lower bound.

    coefficient_stream = hashlib.sha256()
    update_stream(
        coefficient_stream, "determinant", determinant, (a, b)
    )
    update_stream(
        coefficient_stream, "rho_lower", lower_numerator, (q, x, y)
    )
    update_stream(
        coefficient_stream, "rho_upper", upper_numerator, (q, s, y)
    )

    # Independent literal guard over a wide finite subcone.
    literal_cells = 0
    minimum = None
    literal_stream = hashlib.sha256()
    for small_side in range(2, 31):
        for large_side in range(small_side, 201):
            whole_order = large_side + small_side

            def fi(rank: int) -> int:
                return (
                    choose_int(whole_order, rank)
                    + choose_int(large_side, rank - 1)
                    + choose_int(small_side, rank - 1)
                )

            def zi(rank: int) -> int:
                if rank < 2:
                    return 0
                return (
                    (1 if rank == 2 else 0)
                    + large_side * choose_int(small_side, rank - 2)
                    + small_side * choose_int(large_side, rank - 2)
                )

            f2v, f3v = fi(2), fi(3)
            p0v = f3v + 2 * f2v + whole_order + 2
            r0v = zi(4) + 2 * zi(3) + zi(2)
            c0v = zi(3) + 2 * f2v
            av = p0v * c0v - f2v * r0v
            for target in range(
                small_side + 3, whole_order + 1
            ):
                bvalue = fi(target)
                if bvalue == 0:
                    continue
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
                record = (delta, large_side, small_side, target)
                if minimum is None or record < minimum:
                    minimum = record
                literal_stream.update(
                    f"{large_side}|{small_side}|{target}|{bvalue}|{delta}\n".encode()
                )

    payload = {
        "status": MARKER,
        "scope": (
            "Terminal-q3 Newton m=0 with an isolated marked root, the "
            "mandatory terminal leaf, a sorted double-star remainder D_(a,b) "
            "with a>=b>=2, and every supported target j>=b+3."
        ),
        "dependency": {
            "source": PIN_SOURCE,
            "source_sha256": PIN_SOURCE_SHA256,
            "report": PIN_REPORT,
            "report_sha256": PIN_REPORT_SHA256,
            "status": PIN_STATUS,
        },
        "row_formulas": {
            "F(x)": "(1+x)^(a+b)+x(1+x)^a+x(1+x)^b",
            "Z(x)": "x^2(1+a(1+x)^b+b(1+x)^a)",
        },
        "mixture_weight": (
            "rho=C(a,j-1)/C(a+b,j); if active, "
            "0<=rho<=j(a+b-j)/((a+b)(a+b-1))"
        ),
        "affine_in_rho": True,
        "determinant_positive_monomials": len(determinant_poly.terms()),
        "rho_lower": {
            "cone_map": "b=2+q, j=b+3+y, a=3+y+x",
            "denominator": str(sp.factor(lower_denominator)),
            "numerator_stats": lower_stats,
        },
        "rho_upper": {
            "cone_map": "b=2+q, j=b+3+y, a=b+2+y+s",
            "denominator": str(sp.factor(upper_denominator)),
            "numerator_stats": upper_stats,
        },
        "boundary_a_eq_j_minus_2": (
            "rho=0; the omitted C(a,j-2)=1 contribution enters with positive "
            "coefficient (j+1)f2(Pc-f2R), so the lower endpoint is valid"
        ),
        "coefficient_stream_sha256": coefficient_stream.hexdigest().upper(),
        "literal_guard": {
            "small_side_maximum": 30,
            "large_side_maximum": 200,
            "cells": literal_cells,
            "minimum_delta": minimum[0],
            "minimum_witness": {
                "large_side": minimum[1],
                "small_side": minimum[2],
                "j": minimum[3],
            },
            "ordered_stream_sha256": literal_stream.hexdigest().upper(),
        },
        "coverage_gap_within_scope": None,
        "scope_guard": (
            "This closes the high-target tail of every double star with both "
            "sides nonempty. Targets 4<=j<=b+2 for b>=3, arbitrary other "
            "remainders, nonisolated marked roots, the full terminal payment, "
            "and Erdos Problem 993 remain separate."
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
        "determinant_positive_monomials": len(determinant_poly.terms()),
        "rho_lower_terms": lower_stats["terms"],
        "rho_upper_terms": upper_stats["terms"],
        "literal_cells": literal_cells,
        "minimum_delta": minimum[0],
        "coverage_gap_within_scope": None,
    }, indent=2, sort_keys=True))
    print("SOURCE_SHA256", payload["source_sha256"])
    print("REPORT_SHA256", sha256(OUTPUT))
    print(MARKER)


if __name__ == "__main__":
    main()
