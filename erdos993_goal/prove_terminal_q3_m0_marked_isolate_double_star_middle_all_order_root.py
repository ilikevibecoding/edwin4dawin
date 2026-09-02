#!/usr/bin/env python3
"""All-order middle-target terminal-q3 m=0 theorem for double stars.

For sorted D_(a,b), a>=b>=3, this closes 4<=j<=b+2.  Together with the
separate high-target tail and the j=3 theorem, this is the remaining analytic
piece needed for arbitrary double-star remainders.
"""

from __future__ import annotations

import hashlib
import json
from math import comb
from pathlib import Path

import sympy as sp


HERE = Path(__file__).resolve().parent
OUTPUT = HERE / (
    "terminal_q3_m0_marked_isolate_double_star_middle_all_order_"
    "exact_root_20260831.json"
)
NOTE = HERE / (
    "TERMINAL_Q3_M0_MARKED_ISOLATE_DOUBLE_STAR_MIDDLE_ALL_ORDER_ROOT_"
    "2026-08-31.md"
)
MARKER = (
    "PASS_EXACT_ALL_ORDER_TERMINAL_Q3_M0_MARKED_ISOLATE_"
    "DOUBLE_STAR_MIDDLE_ROOT"
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


def stats(expression, variables) -> dict:
    polynomial = sp.Poly(sp.expand(expression), *variables)
    coefficients = polynomial.coeffs()
    return {
        "terms": len(polynomial.terms()),
        "negative_coefficients": sum(
            value.is_negative is True for value in coefficients
        ),
        "minimum_coefficient": str(min(coefficients)),
    }


def stream_poly(stream, label: str, expression, variables) -> None:
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

    a, b, j, rho, tau = sp.symbols("a b j rho tau", nonnegative=True)
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
    determinant_poly = sp.Poly(sp.expand(determinant), a, b)
    assert len(determinant_poly.terms()) == 20
    assert all(value > 0 for value in determinant_poly.coeffs())

    # Middle regime 4<=j<=b+1.  Divide every row by B=C(n,j) and put
    # rho=C(a,j-1)/B, tau=C(b,j-1)/B.
    fj_over_B = 1 + rho + tau
    fprev_over_B = (
        j / (n - j + 1)
        + rho * (j - 1) / (a - j + 2)
        + tau * (j - 1) / (b - j + 2)
    )
    fnext_over_B = (
        (n - j) / (j + 1)
        + rho * (a - j + 1) / j
        + tau * (b - j + 1) / j
    )
    znext_over_B = b * rho + a * tau
    middle_delta_over_B = sp.factor(
        (j + 1) * f2 * determinant
        * (fnext_over_B + 2 * fj_over_B + fprev_over_B)
        + f2 * p0 * (
            (j + 1) * fj_over_B * (c0 + r0)
            - 3 * (p0 + f2) * (znext_over_B + 2 * fj_over_B)
        )
    )
    middle_poly = sp.Poly(sp.together(middle_delta_over_B), rho, tau)
    assert middle_poly.degree(rho) <= 1
    assert middle_poly.degree(tau) <= 1
    assert middle_poly.total_degree() == 1

    # Exact joint weight triangle:
    #   rho/u_a + tau/u_b <= 1,
    #   u_a=j*a/n^2, u_b=j*b/n^2.
    # Indeed the left side is n/(n-1) times the probability that a random
    # (j-2)-subset of (a-1)+(b-1) lies entirely in one side.  Since j-2>=2,
    # this pure event implies the first two sampled vertices lie in the same
    # side.  With A=a-1,B=b-1>=2 and N=A+B, its probability is at most
    # 1-2AB/(N(N-1)) <= 1-1/(N+2)=(n-1)/n.
    u_a = j * a / n**2
    u_b = j * b / n**2

    q, v, y = sp.symbols("q v y", nonnegative=True)
    middle_substitution = {
        j: y + 4,
        b: y + q + 3,
        a: y + q + v + 3,
    }
    middle_endpoints = {}
    endpoint_specs = {
        "origin": (0, 0),
        "large_side_vertex": (u_a, 0),
        "small_side_vertex": (0, u_b),
    }
    expected_middle = {
        "origin": {
            "denominator": 24 * (2 * q + v + y + 3),
            "stats": {"terms": 273, "negative_coefficients": 0, "minimum_coefficient": "1"},
        },
        "large_side_vertex": {
            "denominator": 24 * (q + v + 1) * (2 * q + v + y + 3) * (2 * q + v + 2 * y + 6),
            "stats": {"terms": 427, "negative_coefficients": 0, "minimum_coefficient": "1"},
        },
        "small_side_vertex": {
            "denominator": 24 * (q + 1) * (2 * q + v + y + 3) * (2 * q + v + 2 * y + 6),
            "stats": {"terms": 410, "negative_coefficients": 0, "minimum_coefficient": "1"},
        },
    }
    for label, (rho_value, tau_value) in endpoint_specs.items():
        expression = sp.factor(
            middle_delta_over_B
            .subs({rho: rho_value, tau: tau_value}, simultaneous=True)
            .subs(middle_substitution, simultaneous=True)
        )
        numerator, denominator = sp.fraction(expression)
        assert sp.simplify(
            denominator - expected_middle[label]["denominator"]
        ) == 0
        endpoint_stats = stats(numerator, (q, v, y))
        assert endpoint_stats == expected_middle[label]["stats"]
        middle_endpoints[label] = {
            "numerator": numerator,
            "denominator": denominator,
            "stats": endpoint_stats,
        }

    # Seam j=b+2, b>=3.  The small-side target row vanishes, while its
    # f_(j-1)=1 contribution is positive and may be omitted.  The remaining
    # expression is affine in rho=C(a,j-1)/B.
    seam_fj_over_B = 1 + rho
    seam_fprev_over_B = (
        j / (n - j + 1) + rho * (j - 1) / (a - j + 2)
    )
    seam_fnext_over_B = (
        (n - j) / (j + 1) + rho * (a - j + 1) / j
    )
    seam_znext_over_B = b * rho
    seam_delta_over_B = sp.factor(
        (j + 1) * f2 * determinant
        * (seam_fnext_over_B + 2 * seam_fj_over_B + seam_fprev_over_B)
        + f2 * p0 * (
            (j + 1) * seam_fj_over_B * (c0 + r0)
            - 3 * (p0 + f2)
            * (seam_znext_over_B + 2 * seam_fj_over_B)
        )
    )
    assert sp.Poly(sp.together(seam_delta_over_B), rho).degree() == 1

    s = sp.symbols("s", nonnegative=True)
    seam_lower_substitution = {b: q + 3, a: q + v + 3, j: q + 5}
    seam_lower = sp.factor(
        seam_delta_over_B.subs(rho, 0)
        .subs(seam_lower_substitution, simultaneous=True)
    )
    seam_lower_numerator, seam_lower_denominator = sp.fraction(seam_lower)
    expected_seam_lower_denominator = 24 * (q + v + 2)
    assert sp.simplify(
        seam_lower_denominator - expected_seam_lower_denominator
    ) == 0
    seam_lower_stats = stats(seam_lower_numerator, (q, v))
    assert seam_lower_stats == {
        "terms": 63,
        "negative_coefficients": 0,
        "minimum_coefficient": "1",
    }

    seam_upper_substitution = {b: q + 3, a: q + s + 4, j: q + 5}
    rho_upper = j * (n - j) / (n * (n - 1))
    seam_upper = sp.factor(
        seam_delta_over_B.subs(rho, rho_upper)
        .subs(seam_upper_substitution, simultaneous=True)
    )
    seam_upper_numerator, seam_upper_denominator = sp.fraction(seam_upper)
    expected_seam_upper_denominator = (
        24 * (s + 1) * (q + s + 3) * (2 * q + s + 6)
    )
    assert sp.simplify(
        seam_upper_denominator - expected_seam_upper_denominator
    ) == 0
    seam_upper_stats = stats(seam_upper_numerator, (q, s))
    assert seam_upper_stats == {
        "terms": 86,
        "negative_coefficients": 0,
        "minimum_coefficient": "1",
    }

    coefficient_stream = hashlib.sha256()
    stream_poly(coefficient_stream, "determinant", determinant, (a, b))
    for label, endpoint in middle_endpoints.items():
        stream_poly(
            coefficient_stream,
            f"middle_{label}",
            endpoint["numerator"],
            (q, v, y),
        )
    stream_poly(
        coefficient_stream, "seam_lower", seam_lower_numerator, (q, v)
    )
    stream_poly(
        coefficient_stream, "seam_upper", seam_upper_numerator, (q, s)
    )

    # Direct-row guard across both middle sectors.
    literal_cells = 0
    minimum = None
    literal_stream = hashlib.sha256()
    for small_side in range(3, 41):
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
            for target in range(4, small_side + 3):
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
            "mandatory terminal leaf, sorted double-star remainder D_(a,b) "
            "with a>=b>=3, and every target 4<=j<=b+2."
        ),
        "dependency": {
            "source": PIN_SOURCE,
            "source_sha256": PIN_SOURCE_SHA256,
            "report": PIN_REPORT,
            "report_sha256": PIN_REPORT_SHA256,
            "status": PIN_STATUS,
        },
        "joint_weight_triangle": {
            "rho": "C(a,j-1)/C(a+b,j)",
            "tau": "C(b,j-1)/C(a+b,j)",
            "u_a": "j*a/(a+b)^2",
            "u_b": "j*b/(a+b)^2",
            "bound": "rho/u_a+tau/u_b<=1",
            "proof": (
                "After cancelling binomial factors this is a pure-side "
                "(j-2)-subset probability. Pure-side implies the first two "
                "samples share a side; A,B>=2 gives "
                "2AB(N+2)>=N(N-1)."
            ),
            "endpoint_stats": {
                label: endpoint["stats"]
                for label, endpoint in middle_endpoints.items()
            },
        },
        "middle_cone_map": "j=4+y, b=j-1+q, a=b+v",
        "seam_j_eq_b_plus_2": {
            "omitted_positive_small_fprev_row": True,
            "rho_interval": "0<=rho<=j(a+b-j)/((a+b)(a+b-1))",
            "lower_stats": seam_lower_stats,
            "upper_stats": seam_upper_stats,
        },
        "coefficient_stream_sha256": coefficient_stream.hexdigest().upper(),
        "literal_guard": {
            "small_side_maximum": 40,
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
            "This closes 4<=j<=b+2 for double stars with b>=3. The j=3 "
            "boundary, b=1, b=2, j>=b+3 tail, arbitrary non-double-star "
            "remainders, nonisolated marked roots, the full terminal payment, "
            "and Erdos Problem 993 remain separate certificates."
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
        "middle_endpoint_terms": {
            label: endpoint["stats"]["terms"]
            for label, endpoint in middle_endpoints.items()
        },
        "seam_endpoint_terms": [
            seam_lower_stats["terms"], seam_upper_stats["terms"]
        ],
        "literal_cells": literal_cells,
        "minimum_delta": minimum[0],
        "coverage_gap_within_scope": None,
    }, indent=2, sort_keys=True))
    print("SOURCE_SHA256", payload["source_sha256"])
    print("REPORT_SHA256", sha256(OUTPUT))
    print(MARKER)


if __name__ == "__main__":
    main()
