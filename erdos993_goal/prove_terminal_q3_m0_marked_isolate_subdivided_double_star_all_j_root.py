#!/usr/bin/env python3
"""All-target terminal-q3 m=0 theorem for subdivided double stars.

The remainder has hubs u,v at distance two, with a,b pendant leaves at the
respective hubs.  For sorted a>=b>=0, the proof exhausts every target j>=3.
"""

from __future__ import annotations

import hashlib
import json
from math import comb
from pathlib import Path

import sympy as sp


HERE = Path(__file__).resolve().parent
OUTPUT = HERE / (
    "terminal_q3_m0_marked_isolate_subdivided_double_star_all_j_"
    "exact_root_20260831.json"
)
NOTE = HERE / (
    "TERMINAL_Q3_M0_MARKED_ISOLATE_SUBDIVIDED_DOUBLE_STAR_ALL_J_ROOT_"
    "2026-08-31.md"
)
MARKER = (
    "PASS_EXACT_ALL_TARGET_TERMINAL_Q3_M0_MARKED_ISOLATE_"
    "SUBDIVIDED_DOUBLE_STAR_ROOT"
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
    "b0_subdivided_star": {
        "source": "prove_terminal_q3_m0_marked_isolate_subdivided_star_all_j_root.py",
        "source_sha256": "2941BBF812AF08B29A7E5720B44E990F4D1281C881DE5976D6FD284993661B31",
        "report": "terminal_q3_m0_marked_isolate_subdivided_star_all_j_exact_root_20260831.json",
        "report_sha256": "8717CB21FF4F5793C03DB2A5B35A254ADAA6F899D9BB76F79E3BEDE9BDE46800",
        "status": "PASS_EXACT_ALL_TARGET_TERMINAL_Q3_M0_MARKED_ISOLATE_SUBDIVIDED_STAR_ROOT",
    },
}


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
            coefficient.is_negative is True for coefficient in coefficients
        ),
        "minimum_coefficient": str(min(coefficients)),
    }


def update_stream(stream, label: str, expression, variables) -> None:
    polynomial = sp.Poly(sp.expand(expression), *variables)
    for monomial, coefficient in polynomial.terms():
        stream.update(
            f"{label}|{','.join(map(str, monomial))}|{coefficient}\n".encode()
        )


def verify_dependencies() -> dict:
    observed = {}
    for label, pin in PINNED.items():
        assert sha256(HERE / pin["source"]) == pin["source_sha256"]
        assert sha256(HERE / pin["report"]) == pin["report_sha256"]
        report = json.loads((HERE / pin["report"]).read_text(encoding="utf-8"))
        assert report["status"] == pin["status"]
        assert report["source_sha256"] == pin["source_sha256"]
        observed[label] = dict(pin)
    return observed


def main() -> None:
    dependencies = verify_dependencies()

    # Exact rows.  Here n is two less than the remainder order.
    a, b, j, rho, tau = sp.symbols(
        "a b j rho tau", integer=True, nonnegative=True
    )
    n = a + b + 1
    cbin = choose_poly
    f2 = cbin(n, 2) + n
    f3 = cbin(n, 3) + cbin(a, 2) + cbin(b, 2)
    z2 = n + 1
    z3 = 2 * (a * b + a + b)
    z4 = (a + 1) * cbin(b, 2) + (b + 1) * cbin(a, 2)
    p0 = f3 + 2 * f2 + n + 2
    r0 = z4 + 2 * z3 + z2
    c0 = z3 + 2 * f2
    determinant = sp.factor(p0 * c0 - f2 * r0)
    determinant_stats = poly_stats(determinant, (a, b))
    assert determinant_stats == {
        "terms": 21,
        "negative_coefficients": 0,
        "minimum_coefficient": "1/6",
    }

    # All target expressions below are normalized by B=C(n,j).
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
    znext_over_B = (b + 1) * rho + (a + 1) * tau
    middle_delta_over_B = sp.factor(
        (j + 1) * f2 * determinant
        * (fnext_over_B + 2 * fj_over_B + fprev_over_B)
        + f2 * p0 * (
            (j + 1) * fj_over_B * (c0 + r0)
            - 3 * (p0 + f2) * (znext_over_B + 2 * fj_over_B)
        )
    )
    middle_affine = sp.Poly(sp.together(middle_delta_over_B), rho, tau)
    assert middle_affine.degree(rho) <= 1
    assert middle_affine.degree(tau) <= 1
    assert middle_affine.total_degree() == 1

    # The exact weight triangle is certified by a coefficientwise-positive
    # form of the same-side sampling inequality.
    A0, B0 = sp.symbols("A0 B0", integer=True, nonnegative=True)
    A = A0 + 2
    Bside = B0 + 2
    N = A + Bside + 1
    triangle_gap = sp.expand(
        (N + 1) * N * (N - 1)
        - (N + 2) * (A * (A - 1) + Bside * (Bside - 1))
    )
    triangle_gap_stats = poly_stats(triangle_gap, (A0, B0))
    assert triangle_gap_stats == {
        "terms": 8,
        "negative_coefficients": 0,
        "minimum_coefficient": "2",
    }

    u_a = j * a / n**2
    u_b = j * b / n**2
    q, v, y = sp.symbols("q v y", integer=True, nonnegative=True)
    middle_substitution = {
        j: y + 4,
        b: y + q + 3,
        a: y + q + v + 3,
    }
    middle_endpoint_specs = {
        "origin": (0, 0),
        "large_side_vertex": (u_a, 0),
        "small_side_vertex": (0, u_b),
    }
    expected_middle = {
        "origin": {
            "denominator": 24 * (2 * q + v + y + 4),
            "stats": {
                "terms": 273,
                "negative_coefficients": 0,
                "minimum_coefficient": "1",
            },
        },
        "large_side_vertex": {
            "denominator": (
                24 * (q + v + 1) * (2 * q + v + y + 4)
                * (2 * q + v + 2 * y + 7)
            ),
            "stats": {
                "terms": 427,
                "negative_coefficients": 0,
                "minimum_coefficient": "1",
            },
        },
        "small_side_vertex": {
            "denominator": (
                24 * (q + 1) * (2 * q + v + y + 4)
                * (2 * q + v + 2 * y + 7)
            ),
            "stats": {
                "terms": 410,
                "negative_coefficients": 0,
                "minimum_coefficient": "1",
            },
        },
    }
    middle_endpoints = {}
    for label, (rho_value, tau_value) in middle_endpoint_specs.items():
        expression = sp.factor(
            middle_delta_over_B
            .subs({rho: rho_value, tau: tau_value}, simultaneous=True)
            .subs(middle_substitution, simultaneous=True)
        )
        numerator, denominator = sp.fraction(expression)
        assert sp.simplify(
            denominator - expected_middle[label]["denominator"]
        ) == 0
        endpoint_stats = poly_stats(numerator, (q, v, y))
        assert endpoint_stats == expected_middle[label]["stats"]
        middle_endpoints[label] = {
            "numerator": numerator,
            "denominator": denominator,
            "stats": endpoint_stats,
        }

    # Seam j=b+2, b>=2.  The small-side fj and z_(j+1) terms vanish; its
    # remaining f_(j-1)=1 term is positive and is omitted.
    seam_fj_over_B = 1 + rho
    seam_fprev_over_B = (
        j / (n - j + 1) + rho * (j - 1) / (a - j + 2)
    )
    seam_fnext_over_B = (
        (n - j) / (j + 1) + rho * (a - j + 1) / j
    )
    seam_znext_over_B = (b + 1) * rho
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

    s = sp.symbols("s", integer=True, nonnegative=True)
    seam_lower_substitution = {b: q + 2, a: q + v + 2, j: q + 4}
    seam_lower = sp.factor(
        seam_delta_over_B.subs(rho, 0)
        .subs(seam_lower_substitution, simultaneous=True)
    )
    seam_lower_numerator, seam_lower_denominator = sp.fraction(seam_lower)
    assert sp.simplify(seam_lower_denominator - 24 * (q + v + 2)) == 0
    seam_lower_stats = poly_stats(seam_lower_numerator, (q, v))
    assert seam_lower_stats == {
        "terms": 63,
        "negative_coefficients": 0,
        "minimum_coefficient": "1",
    }

    rho_upper = j * (n - j) / (n * (n - 1))
    seam_upper_substitution = {b: q + 2, a: q + s + 3, j: q + 4}
    seam_upper = sp.factor(
        seam_delta_over_B.subs(rho, rho_upper)
        .subs(seam_upper_substitution, simultaneous=True)
    )
    seam_upper_numerator, seam_upper_denominator = sp.fraction(seam_upper)
    assert sp.simplify(
        seam_upper_denominator
        - 24 * (s + 1) * (q + s + 3) * (2 * q + s + 5)
    ) == 0
    seam_upper_stats = poly_stats(seam_upper_numerator, (q, s))
    assert seam_upper_stats == {
        "terms": 86,
        "negative_coefficients": 0,
        "minimum_coefficient": "1",
    }

    # Tail j>=b+3, b>=1.  Only rho remains active.
    tail_fj_over_B = 1 + rho
    tail_fprev_over_B = (
        j / (n - j + 1) + rho * (j - 1) / (a - j + 2)
    )
    tail_fnext_over_B = (
        (n - j) / (j + 1) + rho * (a - j + 1) / j
    )
    tail_znext_over_B = (b + 1) * rho
    tail_delta_over_B = sp.factor(
        (j + 1) * f2 * determinant
        * (tail_fnext_over_B + 2 * tail_fj_over_B + tail_fprev_over_B)
        + f2 * p0 * (
            (j + 1) * tail_fj_over_B * (c0 + r0)
            - 3 * (p0 + f2)
            * (tail_znext_over_B + 2 * tail_fj_over_B)
        )
    )
    assert sp.Poly(sp.together(tail_delta_over_B), rho).degree() == 1

    x = sp.symbols("x", integer=True, nonnegative=True)
    tail_lower_substitution = {
        b: q + 1,
        j: q + y + 4,
        a: x + y + 2,
    }
    tail_lower = sp.factor(
        tail_delta_over_B.subs(rho, 0)
        .subs(tail_lower_substitution, simultaneous=True)
    )
    tail_lower_numerator, tail_lower_denominator = sp.fraction(tail_lower)
    assert sp.simplify(tail_lower_denominator - 24 * (x + 1)) == 0
    tail_lower_stats = poly_stats(tail_lower_numerator, (q, x, y))
    assert tail_lower_stats == {
        "terms": 262,
        "negative_coefficients": 0,
        "minimum_coefficient": "1",
    }

    tail_upper_substitution = {
        b: q + 1,
        j: q + y + 4,
        a: q + y + s + 3,
    }
    tail_upper = sp.factor(
        tail_delta_over_B.subs(rho, rho_upper)
        .subs(tail_upper_substitution, simultaneous=True)
    )
    tail_upper_numerator, tail_upper_denominator = sp.fraction(tail_upper)
    assert sp.simplify(
        tail_upper_denominator
        - 24 * (s + 1) * (q + s + 2) * (2 * q + s + y + 4)
    ) == 0
    tail_upper_stats = poly_stats(tail_upper_numerator, (q, s, y))
    assert tail_upper_stats == {
        "terms": 423,
        "negative_coefficients": 0,
        "minimum_coefficient": "1",
    }

    coefficient_stream = hashlib.sha256()
    update_stream(coefficient_stream, "determinant", determinant, (a, b))
    update_stream(
        coefficient_stream, "triangle_gap", triangle_gap, (A0, B0)
    )
    for label, endpoint in middle_endpoints.items():
        update_stream(
            coefficient_stream,
            f"middle_{label}",
            endpoint["numerator"],
            (q, v, y),
        )
    update_stream(
        coefficient_stream, "seam_lower", seam_lower_numerator, (q, v)
    )
    update_stream(
        coefficient_stream, "seam_upper", seam_upper_numerator, (q, s)
    )
    update_stream(
        coefficient_stream, "tail_lower", tail_lower_numerator, (q, x, y)
    )
    update_stream(
        coefficient_stream, "tail_upper", tail_upper_numerator, (q, s, y)
    )

    # Direct exact-integer guard over all partition cells in a broad box.
    literal_cells = 0
    minimum = None
    literal_stream = hashlib.sha256()
    for small_side in range(0, 31):
        for large_side in range(max(1, small_side), 201):
            base_order = large_side + small_side + 1
            remainder_order = base_order + 2

            def fi(rank: int) -> int:
                return (
                    choose_int(base_order, rank)
                    + choose_int(large_side, rank - 1)
                    + choose_int(small_side, rank - 1)
                    + (1 if rank == 2 else 0)
                )

            def zi(rank: int) -> int:
                if rank < 2:
                    return 0
                return (
                    (large_side + 1)
                    * choose_int(small_side, rank - 2)
                    + (small_side + 1)
                    * choose_int(large_side, rank - 2)
                    + (large_side + small_side)
                    * (1 if rank == 3 else 0)
                )

            f2v, f3v = fi(2), fi(3)
            p0v = f3v + 2 * f2v + remainder_order
            r0v = zi(4) + 2 * zi(3) + zi(2)
            c0v = zi(3) + 2 * f2v
            av = p0v * c0v - f2v * r0v
            assert av > 0
            for target in range(3, base_order + 1):
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
                assert delta > 0, (large_side, small_side, target, delta)
                literal_cells += 1
                record = (delta, large_side, small_side, target)
                if minimum is None or record < minimum:
                    minimum = record
                literal_stream.update(
                    f"{large_side}|{small_side}|{target}|{bvalue}|{delta}\n".encode()
                )

    exhaustive_partition = [
        "j=3: pinned arbitrary-forest boundary",
        "b=0 and j>=4: pinned subdivided-star theorem",
        "b=1 and j>=4: tail",
        "b=2 and j=4: seam",
        "b=2 and j>=5: tail",
        "b>=3 and 4<=j<=b+1: middle triangle",
        "b>=3 and j=b+2: seam",
        "b>=3 and j>=b+3: tail",
    ]
    payload = {
        "status": MARKER,
        "theorem": (
            "For terminal-q3 Newton degree m=0 with an isolated marked root "
            "and the mandatory terminal leaf, every supported target j>=3 "
            "has nonnegative exact payment margin when the connected "
            "remainder is a sorted subdivided double star with hub distance "
            "two and leaf counts a>=b>=0."
        ),
        "dependencies": dependencies,
        "row_formulas": {
            "F(x)": "(1+x)^(a+b+1)+x(1+x)^a+x(1+x)^b+x^2",
            "Z(x)": (
                "x^2((a+1)(1+x)^b+(b+1)(1+x)^a+(a+b)x)"
            ),
        },
        "anchor_determinant_stats": determinant_stats,
        "middle_triangle": {
            "domain": "a>=b>=3, 4<=j<=b+1",
            "weight_bound": "rho/u_a+tau/u_b<=1",
            "sampling_gap_stats": triangle_gap_stats,
            "cone_map": "j=4+y, b=j-1+q, a=b+v",
            "endpoint_stats": {
                label: endpoint["stats"]
                for label, endpoint in middle_endpoints.items()
            },
        },
        "seam": {
            "domain": "a>=b>=2, j=b+2",
            "rho_interval": "0<=rho<=j(n-j)/(n(n-1))",
            "lower_stats": seam_lower_stats,
            "upper_stats": seam_upper_stats,
        },
        "tail": {
            "domain": "a>=b>=1, j>=b+3",
            "rho_interval": "0<=rho<=j(n-j)/(n(n-1))",
            "lower_stats": tail_lower_stats,
            "upper_stats": tail_upper_stats,
        },
        "exhaustive_partition": exhaustive_partition,
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
            "This closes one connected hub-distance-two remainder family in "
            "the isolated-marked-root m=0 lane. Disconnected remainders, "
            "other diameter-four trees, larger-diameter trees, nonisolated "
            "marked roots, the complete terminal payment, and Erdos Problem "
            "993 remain separate."
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
        "tail_endpoint_terms": [
            tail_lower_stats["terms"], tail_upper_stats["terms"]
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
