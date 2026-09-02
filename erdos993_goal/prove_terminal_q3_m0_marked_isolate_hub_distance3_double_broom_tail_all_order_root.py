#!/usr/bin/env python3
"""All-order high-target terminal-q3 m=0 theorem for distance-3 brooms."""

from __future__ import annotations

import hashlib
import itertools
import json
from math import comb
from pathlib import Path

import sympy as sp


HERE = Path(__file__).resolve().parent
OUTPUT = HERE / (
    "terminal_q3_m0_marked_isolate_hub_distance3_double_broom_tail_"
    "all_order_exact_root_20260831.json"
)
NOTE = HERE / (
    "TERMINAL_Q3_M0_MARKED_ISOLATE_HUB_DISTANCE3_DOUBLE_BROOM_TAIL_ROOT_"
    "2026-08-31.md"
)
MARKER = (
    "PASS_EXACT_ALL_ORDER_TERMINAL_Q3_M0_MARKED_ISOLATE_"
    "HUB_DISTANCE3_DOUBLE_BROOM_TAIL_ROOT"
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


def formula_rows(large: int, small: int) -> tuple[list[int], list[int]]:
    n = large + small
    maximum = n + 4
    f = [0] * (maximum + 1)
    z = [0] * (maximum + 1)
    for rank in range(maximum + 1):
        f[rank] = (
            choose_int(n, rank)
            + 2 * choose_int(n, rank - 1)
            + choose_int(large + 1, rank - 1)
            + choose_int(small + 1, rank - 1)
            + (1 if rank == 2 else 0)
        )
        if rank >= 2:
            inner = rank - 2
            z[rank] = (
                large * choose_int(small + 1, inner)
                + small * choose_int(large + 1, inner)
                + choose_int(small, inner)
                + choose_int(large, inner)
                + choose_int(n, inner)
                + (n + 2) * (1 if inner == 1 else 0)
            )
    return f, z


def literal_subset_rows(large: int, small: int) -> tuple[list[int], list[int]]:
    # Hubs 0,3 and the internal path 0-1-2-3.
    edges = {(0, 1), (1, 2), (2, 3)}
    next_vertex = 4
    for _ in range(large):
        edges.add((0, next_vertex))
        next_vertex += 1
    for _ in range(small):
        edges.add((3, next_vertex))
        next_vertex += 1
    edge_set = {tuple(sorted(edge)) for edge in edges}
    f = [0] * (next_vertex + 1)
    z = [0] * (next_vertex + 1)
    vertices = tuple(range(next_vertex))
    for rank in range(next_vertex + 1):
        for selected in itertools.combinations(vertices, rank):
            induced_edges = sum(
                tuple(sorted(edge)) in edge_set
                for edge in itertools.combinations(selected, 2)
            )
            if induced_edges == 0:
                f[rank] += 1
            elif induced_edges == 1:
                z[rank] += 1
    return f, z


def main() -> None:
    assert sha256(HERE / PIN_SOURCE) == PIN_SOURCE_SHA256
    assert sha256(HERE / PIN_REPORT) == PIN_REPORT_SHA256
    dependency = json.loads((HERE / PIN_REPORT).read_text(encoding="utf-8"))
    assert dependency["status"] == PIN_STATUS
    assert dependency["source_sha256"] == PIN_SOURCE_SHA256

    graph_audit_cases = 0
    graph_audit_stream = hashlib.sha256()
    for small in range(1, 5):
        for large in range(small, 6):
            formula_f, formula_z = formula_rows(large, small)
            literal_f, literal_z = literal_subset_rows(large, small)
            assert formula_f[: len(literal_f)] == literal_f
            assert formula_z[: len(literal_z)] == literal_z
            graph_audit_stream.update(
                f"{large}|{small}|{literal_f}|{literal_z}\n".encode()
            )
            graph_audit_cases += 1

    a, b, j, rho = sp.symbols(
        "a b j rho", integer=True, nonnegative=True
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

    # Normalize by B=C(n,j-1).  The b-side term is zero for j>=b+3.
    fj_over_B = (n - j + 1) / j + 2 + rho
    fprev_over_B = (
        1
        + 2 * (j - 1) / (n - j + 2)
        + rho * (j - 1) / (a - j + 3)
    )
    fnext_over_B = (
        (n - j + 1) * (n - j) / (j * (j + 1))
        + 2 * (n - j + 1) / j
        + rho * (a - j + 2) / j
    )
    znext_over_B = 1 + rho * (b + (a - j + 2) / (a + 1))
    delta_over_B = sp.factor(
        (j + 1) * f2 * determinant
        * (fnext_over_B + 2 * fj_over_B + fprev_over_B)
        + f2 * p0 * (
            (j + 1) * fj_over_B * (c0 + r0)
            - 3 * (p0 + f2) * (znext_over_B + 2 * fj_over_B)
        )
    )
    assert sp.Poly(sp.together(delta_over_B), rho).degree() == 1

    q, x, y = sp.symbols("q x y", integer=True, nonnegative=True)
    lower_substitution = {b: q + 1, j: q + y + 4, a: x + y + 3}
    lower = sp.factor(
        delta_over_B.subs(rho, 0)
        .subs(lower_substitution, simultaneous=True)
    )
    lower_numerator, lower_denominator = sp.fraction(lower)
    assert sp.simplify(
        lower_denominator - 24 * (x + 2) * (q + y + 4)
    ) == 0
    lower_stats = poly_stats(lower_numerator, (q, x, y))
    assert lower_stats == {
        "terms": 338,
        "negative_coefficients": 0,
        "minimum_coefficient": "1",
    }

    # b=1 has rho=1 exactly.
    b1 = sp.factor(
        delta_over_B.subs(rho, 1)
        .subs({b: 1, j: y + 4, a: x + y + 3}, simultaneous=True)
    )
    b1_numerator, b1_denominator = sp.fraction(b1)
    assert sp.simplify(
        b1_denominator - 24 * (x + 2) * (y + 4) * (x + y + 4)
    ) == 0
    b1_stats = poly_stats(b1_numerator, (x, y))
    assert b1_stats == {
        "terms": 77,
        "negative_coefficients": 0,
        "minimum_coefficient": "4",
    }

    # Active b>=2 cone: b=2+r, j=b+3+y, a=j-2+s.
    r, s = sp.symbols("r s", integer=True, nonnegative=True)
    active_substitution = {
        b: r + 2,
        j: r + y + 5,
        a: r + s + y + 3,
    }
    rho_upper = (a + 1) / n
    active_upper = sp.factor(
        delta_over_B.subs(rho, rho_upper)
        .subs(active_substitution, simultaneous=True)
    )
    upper_numerator, upper_denominator = sp.fraction(active_upper)
    assert sp.simplify(
        upper_denominator
        - 24 * (s + 1) * (r + s + 2) * (r + y + 5)
        * (2 * r + s + y + 5)
    ) == 0
    upper_stats = poly_stats(upper_numerator, (r, s, y))
    assert upper_stats == {
        "terms": 527,
        "negative_coefficients": 0,
        "minimum_coefficient": "2",
    }

    coefficient_stream = hashlib.sha256()
    update_stream(coefficient_stream, "determinant", determinant, (a, b))
    update_stream(coefficient_stream, "rho_lower", lower_numerator, (q, x, y))
    update_stream(coefficient_stream, "b1_exact", b1_numerator, (x, y))
    update_stream(
        coefficient_stream, "rho_active_upper", upper_numerator, (r, s, y)
    )

    literal_cells = 0
    minimum = None
    literal_stream = hashlib.sha256()
    for small in range(1, 31):
        for large in range(small, 201):
            f, z = formula_rows(large, small)
            n0 = large + small
            f2v, f3v = f[2], f[3]
            p0v = f3v + 2 * f2v + n0 + 4
            r0v = z[4] + 2 * z[3] + z[2]
            c0v = z[3] + 2 * f2v
            av = p0v * c0v - f2v * r0v
            assert av > 0
            for target in range(small + 3, n0 + 2):
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
            "remainder T_(a,b,3) with a>=b>=1, and every target j>=b+3."
        ),
        "dependency": {
            "source": PIN_SOURCE,
            "source_sha256": PIN_SOURCE_SHA256,
            "report": PIN_REPORT,
            "report_sha256": PIN_REPORT_SHA256,
            "status": PIN_STATUS,
        },
        "row_formulas": {
            "F(x)": (
                "(1+x)^(a+b)(1+2x)+x(1+x)^(a+1)+"
                "x(1+x)^(b+1)+x^2"
            ),
            "Z(x)": (
                "x^2[a(1+x)^(b+1)+b(1+x)^(a+1)+(1+x)^b+"
                "(1+x)^a+(1+x)^(a+b)+(a+b+2)x]"
            ),
        },
        "literal_graph_row_audit": {
            "cases": graph_audit_cases,
            "ordered_stream_sha256": graph_audit_stream.hexdigest().upper(),
        },
        "anchor_determinant_stats": determinant_stats,
        "normalization": "B=C(a+b,j-1)",
        "rho": "C(a+1,j-1)/C(a+b,j-1)",
        "rho_zero_endpoint": {
            "cone_map": "b=1+q, j=b+3+y, a=3+x+y",
            "stats": lower_stats,
        },
        "b_equals_1_exact": {
            "rho": "1",
            "cone_map": "j=4+y, a=3+x+y",
            "stats": b1_stats,
        },
        "active_b_ge_2_upper": {
            "bound": "rho<=(a+1)/(a+b)",
            "probabilistic_proof": (
                "rho is the probability that a uniformly sampled "
                "(j-1)-subset avoids the b-1 complementary vertices; this "
                "event implies the first sample lies in the a+1 block"
            ),
            "cone_map": "b=2+r, j=b+3+y, a=j-2+s",
            "stats": upper_stats,
        },
        "affine_in_rho": True,
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
            "This closes only j>=b+3 for the hub-distance-three double-broom "
            "family. Middle targets, other remainder forests, nonisolated "
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
        "graph_audit_cases": graph_audit_cases,
        "determinant_terms": determinant_stats["terms"],
        "endpoint_terms": [
            lower_stats["terms"], b1_stats["terms"], upper_stats["terms"]
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
