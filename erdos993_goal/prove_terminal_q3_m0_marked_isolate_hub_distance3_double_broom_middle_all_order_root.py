#!/usr/bin/env python3
"""All-order middle-target terminal-q3 m=0 theorem for distance-3 brooms."""

from __future__ import annotations

import hashlib
import json
from math import comb
from pathlib import Path

import sympy as sp

from prove_terminal_q3_m0_marked_isolate_hub_distance3_double_broom_tail_all_order_root import (
    formula_rows,
)


HERE = Path(__file__).resolve().parent
OUTPUT = HERE / (
    "terminal_q3_m0_marked_isolate_hub_distance3_double_broom_middle_"
    "all_order_exact_root_20260831.json"
)
NOTE = HERE / (
    "TERMINAL_Q3_M0_MARKED_ISOLATE_HUB_DISTANCE3_DOUBLE_BROOM_MIDDLE_ROOT_"
    "2026-08-31.md"
)
MARKER = (
    "PASS_EXACT_ALL_ORDER_TERMINAL_Q3_M0_MARKED_ISOLATE_"
    "HUB_DISTANCE3_DOUBLE_BROOM_MIDDLE_ROOT"
)

PIN_SOURCE = (
    "prove_terminal_q3_m0_marked_isolate_"
    "hub_distance3_double_broom_tail_all_order_root.py"
)
PIN_SOURCE_SHA256 = "20B8A1D69AFA92C1103B9F7792948A1AEE17E9E8C83E1262AB3C5F36A7F45E1E"
PIN_REPORT = (
    "terminal_q3_m0_marked_isolate_hub_distance3_double_broom_tail_"
    "all_order_exact_root_20260831.json"
)
PIN_REPORT_SHA256 = "AF51011F85772AA8A066DFF8961DE25FAC479D348C66C4A82434775D49B21BFC"
PIN_STATUS = (
    "PASS_EXACT_ALL_ORDER_TERMINAL_Q3_M0_MARKED_ISOLATE_"
    "HUB_DISTANCE3_DOUBLE_BROOM_TAIL_ROOT"
)


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def choose_poly(value, rank: int):
    return sp.prod(value - offset for offset in range(rank)) / sp.factorial(rank)


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


def choose_int(value: int, rank: int) -> int:
    return comb(value, rank) if 0 <= rank <= value else 0


def main() -> None:
    assert sha256(HERE / PIN_SOURCE) == PIN_SOURCE_SHA256
    assert sha256(HERE / PIN_REPORT) == PIN_REPORT_SHA256
    dependency = json.loads((HERE / PIN_REPORT).read_text(encoding="utf-8"))
    assert dependency["status"] == PIN_STATUS
    assert dependency["source_sha256"] == PIN_SOURCE_SHA256
    assert dependency["coverage_gap_within_scope"] is None

    # Replay the exact binomial form of the joint triangle on a broad grid.
    triangle_checks = 0
    triangle_minimum_gap = None
    triangle_stream = hashlib.sha256()
    for left in range(2, 81):
        for right in range(2, left + 1):
            for rank in range(2, left + right):
                direct_gap = (
                    choose_int(left + right - 1, rank)
                    - choose_int(left, rank)
                    - choose_int(right, rank)
                )
                decomposed = (
                    (right - 1) * choose_int(left - 1, rank - 1)
                    + sum(
                        choose_int(left - 1, index)
                        * choose_int(right, rank - index)
                        for index in range(1, rank - 1)
                    )
                )
                assert direct_gap == decomposed
                assert direct_gap >= 0
                triangle_minimum_gap = (
                    direct_gap
                    if triangle_minimum_gap is None
                    else min(triangle_minimum_gap, direct_gap)
                )
                triangle_stream.update(
                    f"{left}|{right}|{rank}|{direct_gap}\n".encode()
                )
                triangle_checks += 1

    a, b, j, rho, tau = sp.symbols(
        "a b j rho tau", integer=True, nonnegative=True
    )
    n = a + b
    cbin = choose_poly
    f2 = cbin(n, 2) + 2 * n + (a + 1) + (b + 1) + 1
    f3 = cbin(n, 3) + 2 * cbin(n, 2) + cbin(a + 1, 2) + cbin(b + 1, 2)
    z2 = n + 3
    z3 = a * (b + 1) + b * (a + 1) + a + b + n + (n + 2)
    z4 = (
        a * cbin(b + 1, 2) + b * cbin(a + 1, 2)
        + cbin(b, 2) + cbin(a, 2) + cbin(n, 2)
    )
    p0 = f3 + 2 * f2 + n + 4
    r0 = z4 + 2 * z3 + z2
    c0 = z3 + 2 * f2
    determinant = sp.factor(p0 * c0 - f2 * r0)
    determinant_stats = poly_stats(determinant, (a, b))
    assert determinant_stats == {
        "terms": 21,
        "negative_coefficients": 0,
        "minimum_coefficient": "1/6",
    }

    fj_over_B = (n - j + 1) / j + 2 + rho + tau
    fprev_over_B = (
        1
        + 2 * (j - 1) / (n - j + 2)
        + rho * (j - 1) / (a - j + 3)
        + tau * (j - 1) / (b - j + 3)
    )
    fnext_over_B = (
        (n - j + 1) * (n - j) / (j * (j + 1))
        + 2 * (n - j + 1) / j
        + rho * (a - j + 2) / j
        + tau * (b - j + 2) / j
    )
    znext_over_B = (
        1
        + rho * (b + (a - j + 2) / (a + 1))
        + tau * (a + (b - j + 2) / (b + 1))
    )
    delta_over_B = sp.factor(
        (j + 1) * f2 * determinant
        * (fnext_over_B + 2 * fj_over_B + fprev_over_B)
        + f2 * p0 * (
            (j + 1) * fj_over_B * (c0 + r0)
            - 3 * (p0 + f2) * (znext_over_B + 2 * fj_over_B)
        )
    )
    affine = sp.Poly(sp.together(delta_over_B), rho, tau)
    assert affine.total_degree() == 1

    u_a = (a + 1) / n
    u_b = (b + 1) / n
    q, v, y = sp.symbols("q v y", integer=True, nonnegative=True)
    substitution = {
        j: y + 4,
        b: q + y + 2,
        a: q + v + y + 2,
    }
    endpoint_specs = {
        "origin": (0, 0),
        "large_side_vertex": (u_a, 0),
        "small_side_vertex": (0, u_b),
    }
    expected = {
        "origin": {
            "denominator": 24 * (y + 4) * (2 * q + v + y + 2),
            "stats": {
                "terms": 350,
                "negative_coefficients": 0,
                "minimum_coefficient": "1",
            },
        },
        "large_side_vertex": {
            "denominator": (
                24 * (y + 4) * (q + v + 1)
                * (2 * q + v + y + 2) * (2 * q + v + 2 * y + 4)
            ),
            "stats": {
                "terms": 530,
                "negative_coefficients": 0,
                "minimum_coefficient": "2",
            },
        },
        "small_side_vertex": {
            "denominator": (
                24 * (q + 1) * (y + 4)
                * (2 * q + v + y + 2) * (2 * q + v + 2 * y + 4)
            ),
            "stats": {
                "terms": 515,
                "negative_coefficients": 0,
                "minimum_coefficient": "1",
            },
        },
    }
    endpoints = {}
    for label, (rho_value, tau_value) in endpoint_specs.items():
        expression = sp.factor(
            delta_over_B.subs(
                {rho: rho_value, tau: tau_value}, simultaneous=True
            ).subs(substitution, simultaneous=True)
        )
        numerator, denominator = sp.fraction(expression)
        assert sp.simplify(denominator - expected[label]["denominator"]) == 0
        endpoint_stats = poly_stats(numerator, (q, v, y))
        assert endpoint_stats == expected[label]["stats"]
        endpoints[label] = {
            "numerator": numerator,
            "denominator": denominator,
            "stats": endpoint_stats,
        }

    coefficient_stream = hashlib.sha256()
    update_stream(coefficient_stream, "determinant", determinant, (a, b))
    for label, endpoint in endpoints.items():
        update_stream(
            coefficient_stream,
            label,
            endpoint["numerator"],
            (q, v, y),
        )

    literal_cells = 0
    minimum = None
    literal_stream = hashlib.sha256()
    for small in range(2, 31):
        for large in range(small, 201):
            f, z = formula_rows(large, small)
            n0 = large + small
            f2v, f3v = f[2], f[3]
            p0v = f3v + 2 * f2v + n0 + 4
            r0v = z[4] + 2 * z[3] + z[2]
            c0v = z[3] + 2 * f2v
            av = p0v * c0v - f2v * r0v
            assert av > 0
            for target in range(4, small + 3):
                bvalue = f[target]
                assert bvalue > 0
                uvalue = f[target + 1] + 2 * bvalue + f[target - 1]
                evalue = z[target + 1] + 2 * bvalue
                delta = (
                    (target + 1) * f2v * av * uvalue
                    + f2v * p0v * (
                        (target + 1) * bvalue * (c0v + r0v)
                        - 3 * (p0v + f2v) * evalue
                    )
                )
                assert delta > 0
                literal_cells += 1
                record = (delta, large, small, target)
                if minimum is None or record < minimum:
                    minimum = record
                literal_stream.update(
                    f"{large}|{small}|{target}|{bvalue}|{delta}\n".encode()
                )

    payload = {
        "status": MARKER,
        "scope": (
            "Terminal-q3 Newton m=0 with an isolated marked root, the "
            "mandatory terminal leaf, sorted hub-distance-three double-broom "
            "remainder T_(a,b,3) with a>=b>=2, and 4<=j<=b+2."
        ),
        "dependency": {
            "source": PIN_SOURCE,
            "source_sha256": PIN_SOURCE_SHA256,
            "report": PIN_REPORT,
            "report_sha256": PIN_REPORT_SHA256,
            "status": PIN_STATUS,
        },
        "normalization": "B=C(a+b,j-1)",
        "joint_weight_triangle": {
            "rho": "C(a+1,j-1)/B",
            "tau": "C(b+1,j-1)/B",
            "u_a": "(a+1)/(a+b)",
            "u_b": "(b+1)/(a+b)",
            "bound": "rho/u_a+tau/u_b<=1",
            "vandermonde_decomposition": (
                "C(a+b-1,r)-C(a,r)-C(b,r)="
                "(b-1)C(a-1,r-1)+sum_(i=1)^(r-2)"
                "C(a-1,i)C(b,r-i), r=j-2>=2"
            ),
            "audit_checks": triangle_checks,
            "minimum_audit_gap": triangle_minimum_gap,
            "audit_stream_sha256": triangle_stream.hexdigest().upper(),
        },
        "cone_map": "j=4+y, b=j-2+q, a=b+v",
        "anchor_determinant_stats": determinant_stats,
        "endpoint_stats": {
            label: endpoint["stats"] for label, endpoint in endpoints.items()
        },
        "affine_in_rho_tau": True,
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
            "This closes only 4<=j<=b+2 for the hub-distance-three "
            "double-broom family. The tail and j=3 are separate pinned "
            "certificates; other remainder forests, nonisolated marked roots, "
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
        "triangle_checks": triangle_checks,
        "endpoint_terms": {
            label: endpoint["stats"]["terms"]
            for label, endpoint in endpoints.items()
        },
        "literal_cells": literal_cells,
        "minimum_delta": minimum[0],
        "coverage_gap_within_scope": None,
    }, indent=2, sort_keys=True))
    print("SOURCE_SHA256", payload["source_sha256"])
    print("REPORT_SHA256", sha256(OUTPUT))
    print(MARKER)


if __name__ == "__main__":
    main()
