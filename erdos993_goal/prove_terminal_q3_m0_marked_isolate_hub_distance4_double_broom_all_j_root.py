#!/usr/bin/env python3
"""All-target terminal-q3 m=0 theorem for hub-distance-four double brooms."""

from __future__ import annotations

import hashlib
import itertools
import json
from math import comb
from pathlib import Path

import sympy as sp


HERE = Path(__file__).resolve().parent
OUTPUT = HERE / (
    "terminal_q3_m0_marked_isolate_hub_distance4_double_broom_all_j_"
    "exact_root_20260831.json"
)
NOTE = HERE / (
    "TERMINAL_Q3_M0_MARKED_ISOLATE_HUB_DISTANCE4_DOUBLE_BROOM_ALL_J_ROOT_"
    "2026-08-31.md"
)
MARKER = (
    "PASS_EXACT_ALL_TARGET_TERMINAL_Q3_M0_MARKED_ISOLATE_"
    "HUB_DISTANCE4_DOUBLE_BROOM_ROOT"
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


def formula_rows(large: int, small: int) -> tuple[list[int], list[int]]:
    n = large + small
    maximum = n + 5
    f = [0] * (maximum + 1)
    z = [0] * (maximum + 1)
    for rank in range(maximum + 1):
        f[rank] = (
            choose_int(n, rank)
            + 3 * choose_int(n, rank - 1)
            + choose_int(n, rank - 2)
            + choose_int(large, rank - 1)
            + 2 * choose_int(large, rank - 2)
            + choose_int(small, rank - 1)
            + 2 * choose_int(small, rank - 2)
            + (1 if rank in (2, 3) else 0)
        )
        if rank >= 2:
            inner = rank - 2
            z[rank] = (
                (large + 1)
                * (choose_int(small, inner) + 2 * choose_int(small, inner - 1))
                + (small + 1)
                * (choose_int(large, inner) + 2 * choose_int(large, inner - 1))
                + 2 * choose_int(n, inner)
                + (n + 2) * (1 if inner == 1 else 0)
                + n * (1 if inner == 2 else 0)
            )
    return f, z


def literal_subset_rows(large: int, small: int) -> tuple[list[int], list[int]]:
    # Hubs 0,4 and path 0-1-2-3-4.
    edges = {(0, 1), (1, 2), (2, 3), (3, 4)}
    next_vertex = 5
    for _ in range(large):
        edges.add((0, next_vertex))
        next_vertex += 1
    for _ in range(small):
        edges.add((4, next_vertex))
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
    dependencies = verify_dependencies()

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

    # Exact finite audit of the weighted-triangle counting identity.
    triangle_checks = 0
    triangle_minimum_gap = None
    triangle_stream = hashlib.sha256()
    for left in range(3, 81):
        for right in range(3, left + 1):
            for rank in range(1, right - 1):
                gap = (
                    choose_int(left + right - 2, rank)
                    - choose_int(left - 2, rank)
                    - choose_int(right - 2, rank)
                )
                assert gap >= 0
                triangle_minimum_gap = (
                    gap
                    if triangle_minimum_gap is None
                    else min(triangle_minimum_gap, gap)
                )
                triangle_stream.update(
                    f"{left}|{right}|{rank}|{gap}\n".encode()
                )
                triangle_checks += 1

    a, b, j, rho, tau = sp.symbols(
        "a b j rho tau", integer=True, nonnegative=True
    )
    n = a + b
    cbin = choose_poly
    f2 = cbin(n, 2) + 4 * n + 6
    f3 = (
        cbin(n, 3) + 3 * cbin(n, 2) + n
        + cbin(a, 2) + 2 * a + cbin(b, 2) + 2 * b + 1
    )
    z2 = n + 4
    z3 = (a + 1) * (b + 2) + (b + 1) * (a + 2) + 3 * n + 2
    z4 = (
        (a + 1) * (cbin(b, 2) + 2 * b)
        + (b + 1) * (cbin(a, 2) + 2 * a)
        + 2 * cbin(n, 2) + n
    )
    p0 = f3 + 2 * f2 + n + 5
    r0 = z4 + 2 * z3 + z2
    c0 = z3 + 2 * f2
    determinant = sp.factor(p0 * c0 - f2 * r0)
    determinant_stats = poly_stats(determinant, (a, b))
    assert determinant_stats == {
        "terms": 21,
        "negative_coefficients": 0,
        "minimum_coefficient": "1/6",
    }

    nup1 = (n - j + 2) / (j - 1)
    nup2 = (n - j + 2) * (n - j + 1) / (j * (j - 1))
    nup3 = (
        (n - j + 2) * (n - j + 1) * (n - j)
        / ((j + 1) * j * (j - 1))
    )
    ndown = (j - 2) / (n - j + 3)
    aup1 = (a - j + 2) / (j - 1)
    bup1 = (b - j + 2) / (j - 1)
    aup2 = (a - j + 2) * (a - j + 1) / (j * (j - 1))
    bup2 = (b - j + 2) * (b - j + 1) / (j * (j - 1))
    adown = (j - 2) / (a - j + 3)
    bdown = (j - 2) / (b - j + 3)

    fj_over_B = (
        1 + 3 * nup1 + nup2
        + rho * (2 + aup1) + tau * (2 + bup1)
    )
    fprev_over_B = (
        nup1 + 3 + ndown
        + rho * (1 + 2 * adown) + tau * (1 + 2 * bdown)
    )
    fnext_over_B = (
        nup1 + 3 * nup2 + nup3
        + rho * (aup2 + 2 * aup1) + tau * (bup2 + 2 * bup1)
    )
    znext_over_B = (
        2 * nup1
        + (b + 1) * rho * (2 + aup1)
        + (a + 1) * tau * (2 + bup1)
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

    u_a = a * (a - 1) / (n * (n - 1))
    u_b = b * (b - 1) / (n * (n - 1))
    q, v, x, y, s = sp.symbols(
        "q v x y s", integer=True, nonnegative=True
    )
    middle_substitution = {
        j: y + 4,
        b: q + y + 2,
        a: q + v + y + 2,
    }
    middle_specs = {
        "origin": (0, 0),
        "large_side_vertex": (u_a, 0),
        "small_side_vertex": (0, u_b),
    }
    expected_middle = {
        "origin": {
            "denominator": 24 * (y + 3) * (y + 4) * (2 * q + v + y + 3),
            "stats": {"terms": 440, "negative_coefficients": 0, "minimum_coefficient": "1"},
        },
        "large_side_vertex": {
            "denominator": (
                24 * (y + 3) * (y + 4) * (q + v + 1)
                * (2 * q + v + y + 3) * (2 * q + v + 2 * y + 3)
                * (2 * q + v + 2 * y + 4)
            ),
            "stats": {"terms": 795, "negative_coefficients": 0, "minimum_coefficient": "2"},
        },
        "small_side_vertex": {
            "denominator": (
                24 * (q + 1) * (y + 3) * (y + 4)
                * (2 * q + v + y + 3) * (2 * q + v + 2 * y + 3)
                * (2 * q + v + 2 * y + 4)
            ),
            "stats": {"terms": 780, "negative_coefficients": 0, "minimum_coefficient": "1"},
        },
    }
    middle_endpoints = {}
    for label, (rho_value, tau_value) in middle_specs.items():
        expression = sp.factor(
            delta_over_B.subs(
                {rho: rho_value, tau: tau_value}, simultaneous=True
            ).subs(middle_substitution, simultaneous=True)
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

    # j=4 exact weights.  The x^3 predecessor term from x^2(1+x) is
    # omitted; it enters with positive coefficient 5*f2*determinant.
    seam = sp.factor(
        delta_over_B.subs(
            {j: 4, rho: u_a, tau: u_b}, simultaneous=True
        ).subs({b: q + 2, a: q + v + 2}, simultaneous=True)
    )
    seam_numerator, seam_denominator = sp.fraction(seam)
    assert sp.simplify(
        seam_denominator - 144 * (2 * q + v + 3) * (2 * q + v + 4)
    ) == 0
    seam_stats = poly_stats(seam_numerator, (q, v))
    assert seam_stats == {
        "terms": 90,
        "negative_coefficients": 0,
        "minimum_coefficient": "1",
    }

    tail_lower_substitution = {
        b: q + 1,
        j: q + y + 4,
        a: x + y + 1,
    }
    tail_lower = sp.factor(
        delta_over_B.subs({rho: 0, tau: 0}, simultaneous=True)
        .subs(tail_lower_substitution, simultaneous=True)
    )
    tail_lower_numerator, tail_lower_denominator = sp.fraction(tail_lower)
    assert sp.simplify(
        tail_lower_denominator
        - 24 * (x + 1) * (q + y + 3) * (q + y + 4)
    ) == 0
    tail_lower_stats = poly_stats(tail_lower_numerator, (q, x, y))
    assert tail_lower_stats == {
        "terms": 427,
        "negative_coefficients": 0,
        "minimum_coefficient": "1",
    }

    tail_active_substitution = {
        b: q + 1,
        j: q + y + 4,
        a: q + y + s + 2,
    }
    tail_upper = sp.factor(
        delta_over_B.subs({rho: u_a, tau: 0}, simultaneous=True)
        .subs(tail_active_substitution, simultaneous=True)
    )
    tail_upper_numerator, tail_upper_denominator = sp.fraction(tail_upper)
    assert sp.simplify(
        tail_upper_denominator
        - 24 * (s + 1) * (q + s + 2) * (q + y + 3)
        * (q + y + 4) * (2 * q + s + y + 2)
        * (2 * q + s + y + 3)
    ) == 0
    tail_upper_stats = poly_stats(tail_upper_numerator, (q, s, y))
    assert tail_upper_stats == {
        "terms": 779,
        "negative_coefficients": 0,
        "minimum_coefficient": "1",
    }

    coefficient_stream = hashlib.sha256()
    update_stream(coefficient_stream, "determinant", determinant, (a, b))
    for label, endpoint in middle_endpoints.items():
        update_stream(
            coefficient_stream, label, endpoint["numerator"], (q, v, y)
        )
    update_stream(coefficient_stream, "j4_seam", seam_numerator, (q, v))
    update_stream(
        coefficient_stream, "tail_lower", tail_lower_numerator, (q, x, y)
    )
    update_stream(
        coefficient_stream, "tail_upper", tail_upper_numerator, (q, s, y)
    )

    literal_cells = 0
    minimum = None
    literal_stream = hashlib.sha256()
    for small in range(1, 26):
        for large in range(small, 151):
            f, z = formula_rows(large, small)
            n0 = large + small
            f2v, f3v = f[2], f[3]
            p0v = f3v + 2 * f2v + n0 + 5
            r0v = z[4] + 2 * z[3] + z[2]
            c0v = z[3] + 2 * f2v
            av = p0v * c0v - f2v * r0v
            assert av > 0
            for target in range(3, n0 + 3):
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

    exhaustive_partition = [
        "j=3: pinned arbitrary-forest boundary",
        "b=1 and j>=4: tail",
        "b>=2 and j=4: exact seam lower",
        "b>=3 and 5<=j<=b+2: middle weighted triangle",
        "b>=2 and j>=b+3: tail",
    ]
    payload = {
        "status": MARKER,
        "theorem": (
            "For terminal-q3 Newton degree m=0 with an isolated marked root "
            "and the mandatory terminal leaf, every supported target j>=3 "
            "has nonnegative exact payment margin when the connected "
            "remainder is a sorted double broom T_(a,b,4) whose hubs are at "
            "distance four and a>=b>=1."
        ),
        "dependencies": dependencies,
        "row_formulas": {
            "F(x)": (
                "(1+x)^(a+b)(1+3x+x^2)+x(1+x)^a(1+2x)+"
                "x(1+x)^b(1+2x)+x^2(1+x)"
            ),
            "Z(x)": (
                "x^2[(a+1)(1+2x)(1+x)^b+(b+1)(1+2x)(1+x)^a+"
                "2(1+x)^(a+b)+(a+b+2)x+(a+b)x^2]"
            ),
        },
        "literal_graph_row_audit": {
            "cases": graph_audit_cases,
            "ordered_stream_sha256": graph_audit_stream.hexdigest().upper(),
        },
        "anchor_determinant_stats": determinant_stats,
        "normalization": "B=C(a+b,j-2)",
        "j4_seam": {
            "exact_weights": "rho=u_a, tau=u_b",
            "omitted_positive_fprev_x3_row": True,
            "stats": seam_stats,
        },
        "middle_weighted_triangle": {
            "domain": "a>=b>=3, 5<=j<=b+2",
            "rho": "C(a,j-2)/B",
            "tau": "C(b,j-2)/B",
            "u_a": "a(a-1)/((a+b)(a+b-1))",
            "u_b": "b(b-1)/((a+b)(a+b-1))",
            "bound": "rho/u_a+tau/u_b<=1",
            "proof": (
                "After cancelling two selected vertices, the two terms count "
                "disjoint nonempty-subset events inside side sets of sizes "
                "a-2 and b-2 in an (a+b-2)-element universe."
            ),
            "audit_checks": triangle_checks,
            "minimum_audit_gap": triangle_minimum_gap,
            "audit_stream_sha256": triangle_stream.hexdigest().upper(),
            "endpoint_stats": {
                label: endpoint["stats"]
                for label, endpoint in middle_endpoints.items()
            },
        },
        "tail": {
            "domain": "a>=b>=1, j>=b+3",
            "rho_interval": "0<=rho<=u_a when active; tau=0",
            "lower_stats": tail_lower_stats,
            "upper_stats": tail_upper_stats,
        },
        "exhaustive_partition": exhaustive_partition,
        "coefficient_stream_sha256": coefficient_stream.hexdigest().upper(),
        "literal_guard": {
            "small_side_maximum": 25,
            "large_side_maximum": 150,
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
            "This closes one connected hub-distance-four remainder family in "
            "the isolated-marked-root m=0 lane. Other remainder forests, "
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
        "graph_audit_cases": graph_audit_cases,
        "triangle_checks": triangle_checks,
        "middle_endpoint_terms": {
            label: endpoint["stats"]["terms"]
            for label, endpoint in middle_endpoints.items()
        },
        "j4_terms": seam_stats["terms"],
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
