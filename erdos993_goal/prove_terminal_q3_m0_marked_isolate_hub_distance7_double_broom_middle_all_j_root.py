#!/usr/bin/env python3
"""All-order middle theorem for hub-distance-seven double-broom remainders."""

from __future__ import annotations

import hashlib
import itertools
import json
from fractions import Fraction
from math import comb, factorial
from pathlib import Path

from sympy.polys.domains import QQ
from sympy.polys.fields import field


HERE = Path(__file__).resolve().parent
OUTPUT = HERE / (
    "terminal_q3_m0_marked_isolate_hub_distance7_double_broom_middle_all_j_"
    "exact_root_20260831.json"
)
NOTE = HERE / (
    "TERMINAL_Q3_M0_MARKED_ISOLATE_HUB_DISTANCE7_DOUBLE_BROOM_MIDDLE_"
    "ALL_J_ROOT_2026-08-31.md"
)
MARKER = (
    "PASS_EXACT_MIDDLE_ALL_TARGET_TERMINAL_Q3_M0_MARKED_ISOLATE_"
    "HUB_DISTANCE7_DOUBLE_BROOM_ROOT"
)

PINNED = {
    "retained_hprev": {
        "source": "prove_terminal_q3_m0_retained_hprev_decomposition_adversary.py",
        "source_sha256": "0982211C9A94754F22F74F29E37392DFA5AC03ABA7BEAAC875A888AC1C6E10DA",
        "report": "terminal_q3_m0_retained_hprev_decomposition_exact_adversary_20260829.json",
        "report_sha256": "CB72F4A59A716BD34BC938C7A09D44E2A150E186003E3EBAE82A8161B8881D11",
        "status": "PASS_EXACT_TERMINAL_M0_RETAINED_HPREV_DECOMPOSITION",
    },
}


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


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


def falling(value, rank: int):
    result = 1
    for offset in range(rank):
        result *= value - offset
    return result


def C(value, rank: int):
    if rank < 0:
        return value * 0
    if isinstance(value, int):
        return ci(value, rank)
    return falling(value, rank) / (value * 0 + factorial(rank))


def ci(value: int, rank: int) -> int:
    return comb(value, rank) if 0 <= rank <= value else 0


def f_coefficient(a, b, rank: int):
    n = a + b
    return (
        C(n, rank)
        + 6 * C(n, rank - 1)
        + 10 * C(n, rank - 2)
        + 4 * C(n, rank - 3)
        + C(a, rank - 1)
        + 5 * C(a, rank - 2)
        + 6 * C(a, rank - 3)
        + C(a, rank - 4)
        + C(b, rank - 1)
        + 5 * C(b, rank - 2)
        + 6 * C(b, rank - 3)
        + C(b, rank - 4)
        + (1 if rank == 2 else 0)
        + 4 * (1 if rank == 3 else 0)
        + 3 * (1 if rank == 4 else 0)
    )


def z_coefficient(a, b, rank: int):
    n = a + b
    return (
        5 * C(n, rank - 2)
        + 12 * C(n, rank - 3)
        + 3 * C(n, rank - 4)
        + (b + 1) * C(a, rank - 2)
        + (5 * b + 8) * C(a, rank - 3)
        + (6 * b + 9) * C(a, rank - 4)
        + b * C(a, rank - 5)
        + (a + 1) * C(b, rank - 2)
        + (5 * a + 8) * C(b, rank - 3)
        + (6 * a + 9) * C(b, rank - 4)
        + a * C(b, rank - 5)
        + (n + 2) * (1 if rank == 3 else 0)
        + (4 * n + 9) * (1 if rank == 4 else 0)
        + (3 * n + 4) * (1 if rank == 5 else 0)
    )


def anchor(a, b):
    order = a + b + 8
    f2 = f_coefficient(a, b, 2)
    f3 = f_coefficient(a, b, 3)
    z2 = z_coefficient(a, b, 2)
    z3 = z_coefficient(a, b, 3)
    z4 = z_coefficient(a, b, 4)
    p0 = f3 + 2 * f2 + order
    r0 = z4 + 2 * z3 + z2
    c0 = z3 + 2 * f2
    determinant = p0 * c0 - f2 * r0
    return f2, p0, r0, c0, determinant


def fixed_delta(a, b, target: int):
    f2, p0, r0, c0, determinant = anchor(a, b)
    fm1 = f_coefficient(a, b, target - 1)
    f0 = f_coefficient(a, b, target)
    fp1 = f_coefficient(a, b, target + 1)
    zp1 = z_coefficient(a, b, target + 1)
    return (
        (target + 1) * f2 * determinant * (fp1 + 2 * f0 + fm1)
        + f2
        * p0
        * (
            (target + 1) * f0 * (c0 + r0)
            - 3 * (p0 + f2) * (zp1 + 2 * f0)
        )
    )


F_TERMS = (
    ("n", 0, 1),
    ("n", 1, 6),
    ("n", 2, 10),
    ("n", 3, 4),
    ("a", 1, 1),
    ("a", 2, 5),
    ("a", 3, 6),
    ("a", 4, 1),
    ("b", 1, 1),
    ("b", 2, 5),
    ("b", 3, 6),
    ("b", 4, 1),
)


def z_terms(a, b):
    return (
        ("n", 2, 5),
        ("n", 3, 12),
        ("n", 4, 3),
        ("a", 2, b + 1),
        ("a", 3, 5 * b + 8),
        ("a", 4, 6 * b + 9),
        ("a", 5, b),
        ("b", 2, a + 1),
        ("b", 3, 5 * a + 8),
        ("b", 4, 6 * a + 9),
        ("b", 5, a),
    )


def ratio_from_base(side, base, difference: int):
    result = 1
    if difference >= 0:
        for offset in range(difference):
            result *= (side - base - offset) / (base + offset + 1)
    else:
        for offset in range(-difference):
            result *= (base - offset) / (side - base + offset + 1)
    return result


def normalized_row(terms, rank_offset, base, a, b, rho, tau):
    n = a + b
    total = 0
    for category, shift, weight in terms:
        difference = rank_offset - shift + 4
        if category == "n":
            total += weight * ratio_from_base(n, base, difference)
        elif category == "a":
            total += weight * rho * ratio_from_base(a, base, difference)
        elif category == "b":
            total += weight * tau * ratio_from_base(b, base, difference)
        else:
            raise AssertionError(category)
    return total


def normalized_recurrence(a, b, target, rho, tau):
    """(Delta_(j+1)-Delta_j)/C(a+b,j-4) on the recurrence domain."""
    base = target - 4
    f2, p0, r0, c0, determinant = anchor(a, b)
    fm1 = normalized_row(F_TERMS, -1, base, a, b, rho, tau)
    f0 = normalized_row(F_TERMS, 0, base, a, b, rho, tau)
    fp1 = normalized_row(F_TERMS, 1, base, a, b, rho, tau)
    fp2 = normalized_row(F_TERMS, 2, base, a, b, rho, tau)
    zlocal = z_terms(a, b)
    zp1 = normalized_row(zlocal, 1, base, a, b, rho, tau)
    zp2 = normalized_row(zlocal, 2, base, a, b, rho, tau)
    return (
        f2
        * determinant
        * (
            (target + 2) * fp2
            + (target + 3) * fp1
            - target * f0
            - (target + 1) * fm1
        )
        + f2
        * p0
        * (
            (c0 + r0) * ((target + 2) * fp1 - (target + 1) * f0)
            - 3
            * (p0 + f2)
            * (zp2 - zp1 + 2 * (fp1 - f0))
        )
    )


EXPECTED = {
    "j4_exact_base": {
        "numerator_terms": 90,
        "denominator_terms": 1,
        "numerator_total_degree": 12,
        "denominator_total_degree": 0,
        "negative_numerator_coefficients": 0,
        "negative_denominator_coefficients": 0,
        "minimum_numerator_coefficient": "1",
        "minimum_denominator_coefficient": "288",
    },
    "j5_exact_base": {
        "numerator_terms": 104,
        "denominator_terms": 1,
        "numerator_total_degree": 13,
        "denominator_total_degree": 0,
        "negative_numerator_coefficients": 0,
        "negative_denominator_coefficients": 0,
        "minimum_numerator_coefficient": "2",
        "minimum_denominator_coefficient": "2880",
    },
    "j6_exact_base": {
        "numerator_terms": 119,
        "denominator_terms": 1,
        "numerator_total_degree": 14,
        "denominator_total_degree": 0,
        "negative_numerator_coefficients": 0,
        "negative_denominator_coefficients": 0,
        "minimum_numerator_coefficient": "2",
        "minimum_denominator_coefficient": "17280",
    },
    "recurrence_origin": {
        "numerator_terms": 662,
        "denominator_terms": 6,
        "numerator_total_degree": 14,
        "denominator_total_degree": 5,
        "negative_numerator_coefficients": 0,
        "negative_denominator_coefficients": 0,
        "minimum_numerator_coefficient": "1",
        "minimum_denominator_coefficient": "24",
    },
    "recurrence_large_cap": {
        "numerator_terms": 1077,
        "denominator_terms": 44,
        "numerator_total_degree": 17,
        "denominator_total_degree": 8,
        "negative_numerator_coefficients": 0,
        "negative_denominator_coefficients": 0,
        "minimum_numerator_coefficient": "1",
        "minimum_denominator_coefficient": "24",
    },
    "recurrence_small_cap": {
        "numerator_terms": 1062,
        "denominator_terms": 37,
        "numerator_total_degree": 17,
        "denominator_total_degree": 8,
        "negative_numerator_coefficients": 0,
        "negative_denominator_coefficients": 0,
        "minimum_numerator_coefficient": "1",
        "minimum_denominator_coefficient": "24",
    },
    "recurrence_both_caps": {
        "numerator_terms": 1611,
        "denominator_terms": 124,
        "numerator_total_degree": 20,
        "denominator_total_degree": 11,
        "negative_numerator_coefficients": 0,
        "negative_denominator_coefficients": 0,
        "minimum_numerator_coefficient": "1",
        "minimum_denominator_coefficient": "24",
    },
}
EXPECTED_STREAMS = {
    "graph": "2BD914C42C7094ADA2E36C049CE5C9BAA9F473EA22957074DD8279D215D60376",
    "hypergeometric": "E331E922ABFAFB448A4D73603DFEB5E2569E5DC1B867D8EA005C202068F5C1A2",
    "coefficients": "0C77202E254AD8D624CAD7148A27EA9EBB9157E8E655DF932987C1294BA9F3BC",
    "identity": "831876467E1C236250E93717652A16D21E0486B61E78D304638F7824AEC562DA",
    "literal": "7D8A34DDB5A641A73344F5FB9D6A2231181296B0D556AA0373740C1BA3CABABB",
    "literal_minimum": (2774746040, 2, 2, 4),
}


def fraction_stats(expression, label: str, stream) -> dict:
    numerator_terms = expression.numer.terms()
    denominator_terms = expression.denom.terms()
    numerator_coefficients = [coefficient for _, coefficient in numerator_terms]
    denominator_coefficients = [coefficient for _, coefficient in denominator_terms]
    stats = {
        "numerator_terms": len(numerator_terms),
        "denominator_terms": len(denominator_terms),
        "numerator_total_degree": max(sum(monomial) for monomial, _ in numerator_terms),
        "denominator_total_degree": max(sum(monomial) for monomial, _ in denominator_terms),
        "negative_numerator_coefficients": sum(
            coefficient < 0 for coefficient in numerator_coefficients
        ),
        "negative_denominator_coefficients": sum(
            coefficient < 0 for coefficient in denominator_coefficients
        ),
        "minimum_numerator_coefficient": str(min(numerator_coefficients)),
        "minimum_denominator_coefficient": str(min(denominator_coefficients)),
    }
    if EXPECTED:
        assert stats == EXPECTED[label], (label, stats, EXPECTED[label])
    assert stats["negative_numerator_coefficients"] == 0
    assert stats["negative_denominator_coefficients"] == 0
    for kind, terms in (("N", numerator_terms), ("D", denominator_terms)):
        for monomial, coefficient in terms:
            stream.update(
                f"{label}|{kind}|{','.join(map(str, monomial))}|{coefficient}\n".encode()
            )
    return stats


def formula_rows(large: int, small: int) -> tuple[list[int], list[int]]:
    n = large + small
    maximum = n + 8
    independent = [0] * (maximum + 1)
    one_edge = [0] * (maximum + 1)
    for rank in range(maximum + 1):
        independent[rank] = int(f_coefficient(large, small, rank))
        one_edge[rank] = int(z_coefficient(large, small, rank))
    return independent, one_edge


def literal_subset_rows(large: int, small: int) -> tuple[list[int], list[int]]:
    # Hubs 0 and 7; path 0-1-2-3-4-5-6-7.
    edges = {(vertex, vertex + 1) for vertex in range(7)}
    next_vertex = 8
    for _ in range(large):
        edges.add((0, next_vertex))
        next_vertex += 1
    for _ in range(small):
        edges.add((7, next_vertex))
        next_vertex += 1
    edge_set = {tuple(sorted(edge)) for edge in edges}
    independent = [0] * (next_vertex + 1)
    one_edge = [0] * (next_vertex + 1)
    vertices = tuple(range(next_vertex))
    for rank in range(next_vertex + 1):
        for selected in itertools.combinations(vertices, rank):
            induced_edges = sum(
                tuple(sorted(edge)) in edge_set
                for edge in itertools.combinations(selected, 2)
            )
            if induced_edges == 0:
                independent[rank] += 1
            elif induced_edges == 1:
                one_edge[rank] += 1
    return independent, one_edge


def margin(independent: list[int], one_edge: list[int], target: int) -> int:
    order = len(independent) - 1
    f2 = independent[2]
    p0 = independent[3] + 2 * f2 + order
    r0 = one_edge[4] + 2 * one_edge[3] + one_edge[2]
    c0 = one_edge[3] + 2 * f2
    determinant = p0 * c0 - f2 * r0
    assert determinant > 0
    return (
        (target + 1)
        * f2
        * determinant
        * (
            independent[target + 1]
            + 2 * independent[target]
            + independent[target - 1]
        )
        + f2
        * p0
        * (
            (target + 1) * independent[target] * (c0 + r0)
            - 3
            * (p0 + f2)
            * (one_edge[target + 1] + 2 * independent[target])
        )
    )


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
    assert graph_cases == 14
    if EXPECTED_STREAMS:
        assert graph_stream.hexdigest().upper() == EXPECTED_STREAMS["graph"]

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
    assert hypergeometric_checks == 129600
    if EXPECTED_STREAMS:
        assert hypergeometric_stream.hexdigest().upper() == EXPECTED_STREAMS[
            "hypergeometric"
        ]

    coefficient_stream = hashlib.sha256()
    charts = {}
    for target in (4, 5, 6):
        _, q, v = field("q,v", QQ)
        b = q + target - 2
        a = q + v + target - 2
        label = f"j{target}_exact_base"
        charts[label] = fraction_stats(
            fixed_delta(a, b, target), label, coefficient_stream
        )

    _, q, v, y = field("q,v,y", QQ)
    target = y + 6
    b = q + y + 5
    a = q + v + y + 5
    base = target - 4
    cap_a = a / (a + base * b)
    cap_b = b / (b + base * a)
    recurrence_expressions = {}
    for label, rho, tau in (
        ("recurrence_origin", 0, 0),
        ("recurrence_large_cap", cap_a, 0),
        ("recurrence_small_cap", 0, cap_b),
        ("recurrence_both_caps", cap_a, cap_b),
    ):
        expression = normalized_recurrence(a, b, target, rho, tau)
        assert expression.denom.get((0, 0, 0), 0) > 0
        recurrence_expressions[label] = expression
        charts[label] = fraction_stats(expression, label, coefficient_stream)
    assert (
        recurrence_expressions["recurrence_both_caps"]
        - recurrence_expressions["recurrence_large_cap"]
        - recurrence_expressions["recurrence_small_cap"]
        + recurrence_expressions["recurrence_origin"]
    ) == 0
    if EXPECTED_STREAMS:
        assert coefficient_stream.hexdigest().upper() == EXPECTED_STREAMS[
            "coefficients"
        ]

    identity_checks = 0
    identity_stream = hashlib.sha256()
    for target_int in range(6, 19):
        for q_int in range(0, 9):
            for v_int in range(0, 9):
                b_int = q_int + target_int - 1
                a_int = b_int + v_int
                n_int = a_int + b_int
                base_int = target_int - 4
                denominator = comb(n_int, base_int)
                rho = Fraction(comb(a_int, base_int), denominator)
                tau = Fraction(comb(b_int, base_int), denominator)
                normalized = normalized_recurrence(
                    Fraction(a_int),
                    Fraction(b_int),
                    Fraction(target_int),
                    rho,
                    tau,
                )
                direct = int(fixed_delta(a_int, b_int, target_int + 1)) - int(
                    fixed_delta(a_int, b_int, target_int)
                )
                assert normalized * denominator == direct
                assert direct > 0
                identity_stream.update(
                    f"{a_int}|{b_int}|{target_int}|{denominator}|{direct}\n".encode()
                )
                identity_checks += 1
    assert identity_checks == 1053
    if EXPECTED_STREAMS:
        assert identity_stream.hexdigest().upper() == EXPECTED_STREAMS["identity"]

    literal_cells = 0
    literal_minimum = None
    literal_stream = hashlib.sha256()
    for small in range(2, 21):
        for large in range(small, 121):
            independent, one_edge = formula_rows(large, small)
            for target_int in range(4, small + 3):
                value = margin(independent, one_edge, target_int)
                assert independent[target_int] > 0
                assert value > 0
                record = (value, large, small, target_int)
                if literal_minimum is None or record < literal_minimum:
                    literal_minimum = record
                literal_stream.update(
                    f"{large}|{small}|{target_int}|"
                    f"{independent[target_int]}|{value}\n".encode()
                )
                literal_cells += 1
    assert literal_cells == 20330
    if EXPECTED_STREAMS:
        assert literal_minimum == EXPECTED_STREAMS["literal_minimum"]
        assert literal_stream.hexdigest().upper() == EXPECTED_STREAMS["literal"]

    exhaustive_partition = [
        "j=4 and b>=2: direct exact positive-coefficient base",
        "j=5 and b>=3: direct exact positive-coefficient base",
        "j=6 and b>=4: direct exact positive-coefficient base",
        (
            "j>=7 and b>=j-2: apply the positive same-tree recurrence at "
            "target j-1>=6, then descend inductively to the j=6 base"
        ),
    ]
    payload = {
        "status": MARKER,
        "theorem": (
            "For terminal-q3 Newton degree m=0 with an isolated marked root "
            "and the mandatory terminal leaf, the exact payment margin is "
            "positive for every middle target j>=4, b>=j-2, when the connected "
            "remainder is a sorted double broom T_(a,b,7), a>=b>=1."
        ),
        "dependencies": dependencies,
        "row_formulas": {
            "F_k": (
                "C(n,k)+6C(n,k-1)+10C(n,k-2)+4C(n,k-3)+C(a,k-1)+"
                "5C(a,k-2)+6C(a,k-3)+C(a,k-4)+C(b,k-1)+"
                "5C(b,k-2)+6C(b,k-3)+C(b,k-4)+[k=2]+4[k=3]+3[k=4]"
            ),
            "Z_k": (
                "5C(n,k-2)+12C(n,k-3)+3C(n,k-4)+(b+1)C(a,k-2)+"
                "(5b+8)C(a,k-3)+(6b+9)C(a,k-4)+bC(a,k-5)+"
                "(a+1)C(b,k-2)+(5a+8)C(b,k-3)+(6a+9)C(b,k-4)+"
                "aC(b,k-5)+(n+2)[k=3]+(4n+9)[k=4]+(3n+4)[k=5]"
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
        "recurrence": {
            "normalizer": "B=C(a+b,j-4)",
            "weights": "rho=C(a,j-4)/B, tau=C(b,j-4)/B",
            "domain": "j>=6, b>=j-1, a>=b",
            "claim": "Delta_(j+1)(a,b)-Delta_j(a,b)>0",
            "identity_checks": identity_checks,
            "identity_stream_sha256": identity_stream.hexdigest().upper(),
        },
        "charts": charts,
        "coefficient_stream_sha256": coefficient_stream.hexdigest().upper(),
        "exhaustive_partition": exhaustive_partition,
        "literal_guard": {
            "small_side_maximum": 20,
            "large_side_maximum": 120,
            "middle_cells": literal_cells,
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
            "This closes only the middle targets of one connected hub-distance-"
            "seven remainder family in the isolated-marked-root m=0 lane. Its "
            "tail, other remainder forests, nonisolated marked roots, the "
            "complete terminal payment, and Erdos Problem 993 remain separate."
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
    print(
        json.dumps(
            {
                "status": MARKER,
                "graph_audit_cases": graph_cases,
                "hypergeometric_checks": hypergeometric_checks,
                "charts": charts,
                "identity_checks": identity_checks,
                "literal_cells": literal_cells,
                "literal_minimum": literal_minimum,
                "coefficient_stream_sha256": coefficient_stream.hexdigest().upper(),
                "coverage_gap_within_scope": None,
            },
            indent=2,
            sort_keys=True,
        )
    )
    print("SOURCE_SHA256", payload["source_sha256"])
    print("REPORT_SHA256", sha256(OUTPUT))
    print(MARKER)


if __name__ == "__main__":
    main()
