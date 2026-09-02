#!/usr/bin/env python3
"""All-target m=0 theorem for hub-distance-five double-broom remainders."""

from __future__ import annotations

import hashlib
import itertools
import json
from math import comb, factorial
from pathlib import Path

from sympy.polys.domains import QQ
from sympy.polys.fields import field


HERE = Path(__file__).resolve().parent
OUTPUT = HERE / (
    "terminal_q3_m0_marked_isolate_hub_distance5_double_broom_all_j_"
    "exact_root_20260831.json"
)
NOTE = HERE / (
    "TERMINAL_Q3_M0_MARKED_ISOLATE_HUB_DISTANCE5_DOUBLE_BROOM_ALL_J_ROOT_"
    "2026-08-31.md"
)
MARKER = (
    "PASS_EXACT_ALL_TARGET_TERMINAL_Q3_M0_MARKED_ISOLATE_"
    "HUB_DISTANCE5_DOUBLE_BROOM_ROOT"
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


def falling(value, rank: int):
    result = 1
    for offset in range(rank):
        result *= value - offset
    return result


def C(value, rank: int):
    return falling(value, rank) / factorial(rank)


def ci(value: int, rank: int) -> int:
    return comb(value, rank) if 0 <= rank <= value else 0


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


def delta_for(a, b, j, rho, tau):
    """Exact normalized payment margin as a rational-function element."""
    n = a + b
    order = n + 6
    edges = n + 5
    wedges = C(a + 1, 2) + C(b + 1, 2) + 4
    connected_four = C(a + 1, 3) + C(b + 1, 3) + n + 3
    f2 = C(order, 2) - edges
    f3 = C(order, 3) - edges * (order - 2) + wedges
    z2 = edges
    z3 = edges * (order - 2) - 2 * wedges
    z4 = (
        edges * C(order - 2, 2)
        - 2 * C(edges, 2)
        - 2 * wedges * (order - 4)
        + 3 * connected_four
    )
    p0 = f3 + 2 * f2 + order
    r0 = z4 + 2 * z3 + z2
    c0 = z3 + 2 * f2
    determinant = p0 * c0 - f2 * r0

    nup1 = (n - j + 2) / (j - 1)
    nup2 = (n - j + 2) * (n - j + 1) / (j * (j - 1))
    nup3 = (
        (n - j + 2) * (n - j + 1) * (n - j)
        / ((j + 1) * j * (j - 1))
    )
    ndown1 = (j - 2) / (n - j + 3)
    aup1 = (a - j + 2) / (j - 1)
    bup1 = (b - j + 2) / (j - 1)
    aup2 = (a - j + 2) * (a - j + 1) / (j * (j - 1))
    bup2 = (b - j + 2) * (b - j + 1) / (j * (j - 1))
    adown1 = (j - 2) / (a - j + 3)
    bdown1 = (j - 2) / (b - j + 3)
    adown2 = (j - 2) * (j - 3) / ((a - j + 3) * (a - j + 4))
    bdown2 = (j - 2) * (j - 3) / ((b - j + 3) * (b - j + 4))

    fj = (
        3 + 4 * nup1 + nup2
        + rho * (3 + aup1 + adown1)
        + tau * (3 + bup1 + bdown1)
    )
    fprev = (
        3 * ndown1 + 4 + nup1
        + rho * (1 + 3 * adown1 + adown2)
        + tau * (1 + 3 * bdown1 + bdown2)
    )
    fnext = (
        3 * nup1 + 4 * nup2 + nup3
        + rho * (1 + 3 * aup1 + aup2)
        + tau * (1 + 3 * bup1 + bup2)
    )
    znext = (
        2 + 3 * nup1
        + rho * ((b + 1) * aup1 + (3 * b + 4) + b * adown1)
        + tau * ((a + 1) * bup1 + (3 * a + 4) + a * bdown1)
    )
    return (
        (j + 1) * f2 * determinant * (fnext + 2 * fj + fprev)
        + f2 * p0 * (
            (j + 1) * fj * (c0 + r0)
            - 3 * (p0 + f2) * (znext + 2 * fj)
        )
    )


def fraction_stats(expression, expected: dict, label: str, stream) -> dict:
    numerator_terms = expression.numer.terms()
    denominator_terms = expression.denom.terms()
    numerator_coefficients = [coefficient for _, coefficient in numerator_terms]
    denominator_coefficients = [coefficient for _, coefficient in denominator_terms]
    stats = {
        "numerator_terms": len(numerator_terms),
        "denominator_terms": len(denominator_terms),
        "total_degree": max(sum(monomial) for monomial, _ in numerator_terms),
        "negative_numerator_coefficients": sum(
            coefficient < 0 for coefficient in numerator_coefficients
        ),
        "negative_denominator_coefficients": sum(
            coefficient < 0 for coefficient in denominator_coefficients
        ),
        "minimum_numerator_coefficient": str(min(numerator_coefficients)),
        "minimum_denominator_coefficient": str(min(denominator_coefficients)),
    }
    assert stats == expected, (label, stats, expected)
    for kind, terms in (("N", numerator_terms), ("D", denominator_terms)):
        for monomial, coefficient in terms:
            stream.update(
                f"{label}|{kind}|{','.join(map(str, monomial))}|{coefficient}\n".encode()
            )
    return stats


def formula_rows(large: int, small: int) -> tuple[list[int], list[int]]:
    n = large + small
    maximum = n + 6
    f = [0] * (maximum + 1)
    z = [0] * (maximum + 1)
    for rank in range(maximum + 1):
        f[rank] = (
            ci(n, rank) + 4 * ci(n, rank - 1) + 3 * ci(n, rank - 2)
            + ci(large, rank - 1) + 3 * ci(large, rank - 2)
            + ci(large, rank - 3)
            + ci(small, rank - 1) + 3 * ci(small, rank - 2)
            + ci(small, rank - 3)
            + (1 if rank == 2 else 0) + 2 * (1 if rank == 3 else 0)
        )
        if rank >= 2:
            inner = rank - 2
            z[rank] = (
                (large + 1) * ci(small, inner)
                + (3 * large + 4) * ci(small, inner - 1)
                + large * ci(small, inner - 2)
                + (small + 1) * ci(large, inner)
                + (3 * small + 4) * ci(large, inner - 1)
                + small * ci(large, inner - 2)
                + 3 * ci(n, inner) + 2 * ci(n, inner - 1)
                + (n + 2) * (1 if inner == 1 else 0)
                + (2 * n + 3) * (1 if inner == 2 else 0)
            )
    return f, z


def literal_subset_rows(large: int, small: int) -> tuple[list[int], list[int]]:
    # Hubs 0,5 and path 0-1-2-3-4-5.
    edges = {(0, 1), (1, 2), (2, 3), (3, 4), (4, 5)}
    next_vertex = 6
    for _ in range(large):
        edges.add((0, next_vertex))
        next_vertex += 1
    for _ in range(small):
        edges.add((5, next_vertex))
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


EXPECTED = {
    "j4_exact_seam": {
        "numerator_terms": 90, "denominator_terms": 6, "total_degree": 12,
        "negative_numerator_coefficients": 0, "negative_denominator_coefficients": 0,
        "minimum_numerator_coefficient": "1", "minimum_denominator_coefficient": "144",
    },
    "tail_lower_zero": {
        "numerator_terms": 427, "denominator_terms": 12, "total_degree": 12,
        "negative_numerator_coefficients": 0, "negative_denominator_coefficients": 0,
        "minimum_numerator_coefficient": "1", "minimum_denominator_coefficient": "24",
    },
    "middle_origin": {
        "numerator_terms": 440, "denominator_terms": 10, "total_degree": 12,
        "negative_numerator_coefficients": 0, "negative_denominator_coefficients": 0,
        "minimum_numerator_coefficient": "1", "minimum_denominator_coefficient": "24",
    },
    "middle_large_cap": {
        "numerator_terms": 1264, "denominator_terms": 163, "total_degree": 18,
        "negative_numerator_coefficients": 0, "negative_denominator_coefficients": 0,
        "minimum_numerator_coefficient": "1", "minimum_denominator_coefficient": "24",
    },
    "middle_small_cap": {
        "numerator_terms": 1211, "denominator_terms": 140, "total_degree": 18,
        "negative_numerator_coefficients": 0, "negative_denominator_coefficients": 0,
        "minimum_numerator_coefficient": "1", "minimum_denominator_coefficient": "24",
    },
    "middle_both_caps": {
        "numerator_terms": 2073, "denominator_terms": 387, "total_degree": 22,
        "negative_numerator_coefficients": 0, "negative_denominator_coefficients": 0,
        "minimum_numerator_coefficient": "1", "minimum_denominator_coefficient": "24",
    },
    "tail_upper_cap": {
        "numerator_terms": 1213, "denominator_terms": 165, "total_degree": 18,
        "negative_numerator_coefficients": 0, "negative_denominator_coefficients": 0,
        "minimum_numerator_coefficient": "1", "minimum_denominator_coefficient": "24",
    },
}


def main() -> None:
    dependencies = verify_dependencies()

    graph_cases = 0
    graph_stream = hashlib.sha256()
    for small in range(1, 5):
        for large in range(small, 6):
            formula_f, formula_z = formula_rows(large, small)
            literal_f, literal_z = literal_subset_rows(large, small)
            assert formula_f[: len(literal_f)] == literal_f
            assert formula_z[: len(literal_z)] == literal_z
            graph_stream.update(f"{large}|{small}|{literal_f}|{literal_z}\n".encode())
            graph_cases += 1

    hypergeometric_checks = 0
    hypergeometric_equalities = 0
    hypergeometric_stream = hashlib.sha256()
    for side in range(1, 81):
        for complement in range(1, 41):
            for selected in range(1, side + 1):
                left = ci(side, selected) * (side + selected * complement)
                right = ci(side + complement, selected) * side
                assert left <= right
                hypergeometric_equalities += left == right
                hypergeometric_stream.update(
                    f"{side}|{complement}|{selected}|{left}|{right}\n".encode()
                )
                hypergeometric_checks += 1

    coefficient_stream = hashlib.sha256()
    charts = {}

    _, q, v = field("q,v", QQ)
    b = q + 2
    a = q + v + 2
    n = a + b
    u_a2 = falling(a, 2) / falling(n, 2)
    u_b2 = falling(b, 2) / falling(n, 2)
    charts["j4_exact_seam"] = fraction_stats(
        delta_for(a, b, 4, u_a2, u_b2),
        EXPECTED["j4_exact_seam"], "j4_exact_seam", coefficient_stream,
    )

    _, q, x, y = field("q,x,y", QQ)
    b = q + 1
    j = q + y + 4
    a = x + y + 1
    charts["tail_lower_zero"] = fraction_stats(
        delta_for(a, b, j, 0, 0),
        EXPECTED["tail_lower_zero"], "tail_lower_zero", coefficient_stream,
    )

    _, q, v, y = field("q,v,y", QQ)
    j = y + 5
    b = q + y + 3
    a = q + v + y + 3
    n = a + b
    k = j - 4
    u_a2 = falling(a, 2) / falling(n, 2)
    u_b2 = falling(b, 2) / falling(n, 2)
    cap_a = u_a2 * (a - 2) / ((a - 2) + k * b)
    cap_b = u_b2 * (b - 2) / ((b - 2) + k * a)
    for label, rho, tau in (
        ("middle_origin", 0, 0),
        ("middle_large_cap", cap_a, 0),
        ("middle_small_cap", 0, cap_b),
        ("middle_both_caps", cap_a, cap_b),
    ):
        charts[label] = fraction_stats(
            delta_for(a, b, j, rho, tau), EXPECTED[label], label, coefficient_stream
        )

    _, q, s, y = field("q,s,y", QQ)
    b = q + 1
    j = q + y + 4
    a = q + y + s + 2
    n = a + b
    k = j - 4
    u_a2 = falling(a, 2) / falling(n, 2)
    cap_a = u_a2 * (a - 2) / ((a - 2) + k * b)
    tail_upper_expression = delta_for(a, b, j, cap_a, 0)
    assert tail_upper_expression.denom.get((0, 0, 0), 0) == 0
    charts["tail_upper_cap"] = fraction_stats(
        tail_upper_expression,
        EXPECTED["tail_upper_cap"], "tail_upper_cap", coefficient_stream,
    )

    # The cap denominator vanishes only at q=s=y=0.  Check that unique graph
    # cell directly from the integer rows.
    degenerate_large, degenerate_small, degenerate_j = 2, 1, 4
    f, z = formula_rows(degenerate_large, degenerate_small)
    n0 = degenerate_large + degenerate_small
    f2v = f[2]
    p0v = f[3] + 2 * f2v + n0 + 6
    r0v = z[4] + 2 * z[3] + z[2]
    c0v = z[3] + 2 * f2v
    av = p0v * c0v - f2v * r0v
    degenerate_delta = (
        (degenerate_j + 1) * f2v * av
        * (f[degenerate_j + 1] + 2 * f[degenerate_j] + f[degenerate_j - 1])
        + f2v * p0v * (
            (degenerate_j + 1) * f[degenerate_j] * (c0v + r0v)
            - 3 * (p0v + f2v) * (z[degenerate_j + 1] + 2 * f[degenerate_j])
        )
    )
    assert degenerate_delta == 62963292

    literal_cells = 0
    literal_minimum = None
    literal_stream = hashlib.sha256()
    for small in range(1, 21):
        for large in range(small, 121):
            f, z = formula_rows(large, small)
            n0 = large + small
            f2v = f[2]
            p0v = f[3] + 2 * f2v + n0 + 6
            r0v = z[4] + 2 * z[3] + z[2]
            c0v = z[3] + 2 * f2v
            av = p0v * c0v - f2v * r0v
            assert av > 0
            for target in range(4, n0 + 3):
                assert f[target] > 0
                value = (
                    (target + 1) * f2v * av
                    * (f[target + 1] + 2 * f[target] + f[target - 1])
                    + f2v * p0v * (
                        (target + 1) * f[target] * (c0v + r0v)
                        - 3 * (p0v + f2v) * (z[target + 1] + 2 * f[target])
                    )
                )
                assert value > 0
                record = (value, large, small, target)
                if literal_minimum is None or record < literal_minimum:
                    literal_minimum = record
                literal_stream.update(
                    f"{large}|{small}|{target}|{f[target]}|{value}\n".encode()
                )
                literal_cells += 1
    assert literal_cells == 164200
    assert literal_minimum == (10051860, 1, 1, 4)

    exhaustive_partition = [
        "j=3: pinned arbitrary-forest boundary",
        "j=4 and b>=2: exact middle seam",
        "j>=4, j>=b+3, rho=0: tail lower endpoint",
        "j>=4, j>=b+3, rho>0: tail depth cap; (a,b,j)=(2,1,4) direct",
        "j>=5 and b>=j-2: middle depth-cap rectangle",
    ]
    payload = {
        "status": MARKER,
        "theorem": (
            "For terminal-q3 Newton degree m=0 with an isolated marked root "
            "and the mandatory terminal leaf, every supported target j>=3 "
            "has nonnegative exact payment margin when the connected remainder "
            "is a sorted double broom T_(a,b,5), a>=b>=1."
        ),
        "dependencies": dependencies,
        "row_formulas": {
            "F_k": (
                "C(n,k)+4C(n,k-1)+3C(n,k-2)+C(a,k-1)+3C(a,k-2)+"
                "C(a,k-3)+C(b,k-1)+3C(b,k-2)+C(b,k-3)+[k=2]+2[k=3]"
            ),
            "Z_k": (
                "for t=k-2: (a+1)C(b,t)+(3a+4)C(b,t-1)+aC(b,t-2)+"
                "(b+1)C(a,t)+(3b+4)C(a,t-1)+bC(a,t-2)+3C(n,t)+"
                "2C(n,t-1)+(n+2)[t=1]+(2n+3)[t=2]"
            ),
        },
        "literal_graph_row_audit": {
            "cases": graph_cases,
            "ordered_stream_sha256": graph_stream.hexdigest().upper(),
        },
        "hypergeometric_cap": {
            "statement": "C(A,k)/C(A+B,k) <= (A/(A+B))^k <= A/(A+kB)",
            "domain": "integers A>=k>=1, B>=1",
            "proof": (
                "Each without-replacement factor is at most A/(A+B); "
                "Bernoulli gives (1+B/A)^k>=1+kB/A."
            ),
            "audit_checks": hypergeometric_checks,
            "audit_equalities": hypergeometric_equalities,
            "ordered_stream_sha256": hypergeometric_stream.hexdigest().upper(),
        },
        "charts": charts,
        "coefficient_stream_sha256": coefficient_stream.hexdigest().upper(),
        "degenerate_tail_cell": {
            "large": degenerate_large,
            "small": degenerate_small,
            "j": degenerate_j,
            "exact_delta": degenerate_delta,
        },
        "exhaustive_partition": exhaustive_partition,
        "literal_guard": {
            "small_side_maximum": 20,
            "large_side_maximum": 120,
            "cells": literal_cells,
            "minimum_delta": literal_minimum[0],
            "minimum_witness": {
                "large_side": literal_minimum[1],
                "small_side": literal_minimum[2],
                "j": literal_minimum[3],
            },
            "ordered_stream_sha256": literal_stream.hexdigest().upper(),
        },
        "coverage_gap_within_scope": None,
        "scope_guard": (
            "This closes one connected hub-distance-five remainder family in "
            "the isolated-marked-root m=0 lane. Other remainder forests, "
            "nonisolated marked roots, the complete terminal payment, and "
            "Erdos Problem 993 remain separate."
        ),
        "note": NOTE.name,
        "note_sha256": sha256(NOTE),
        "source_sha256": sha256(Path(__file__).resolve()),
    }
    OUTPUT.write_text(
        json.dumps(payload, indent=2, sort_keys=True) + "\n",
        encoding="utf-8",
        newline="\n",
    )
    print(json.dumps({
        "status": MARKER,
        "graph_audit_cases": graph_cases,
        "hypergeometric_checks": hypergeometric_checks,
        "chart_numerator_terms": {
            label: stats["numerator_terms"] for label, stats in charts.items()
        },
        "literal_cells": literal_cells,
        "literal_minimum": literal_minimum,
        "coverage_gap_within_scope": None,
    }, indent=2, sort_keys=True))
    print("SOURCE_SHA256", payload["source_sha256"])
    print("REPORT_SHA256", sha256(OUTPUT))
    print(MARKER)


if __name__ == "__main__":
    main()
