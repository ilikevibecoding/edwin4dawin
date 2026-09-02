#!/usr/bin/env python3
"""Independent audit of the distance-six double-broom tail theorem."""

from __future__ import annotations

import hashlib
import json
from fractions import Fraction
from math import comb, factorial
from pathlib import Path

from sympy.polys.domains import QQ
from sympy.polys.fields import field


HERE = Path(__file__).resolve().parent
THEOREM_SOURCE = HERE / (
    "prove_terminal_q3_m0_marked_isolate_hub_distance6_double_broom_"
    "tail_all_j_root.py"
)
THEOREM_REPORT = HERE / (
    "terminal_q3_m0_marked_isolate_hub_distance6_double_broom_tail_all_j_"
    "exact_root_20260831.json"
)
THEOREM_NOTE = HERE / (
    "TERMINAL_Q3_M0_MARKED_ISOLATE_HUB_DISTANCE6_DOUBLE_BROOM_TAIL_"
    "ALL_J_ROOT_2026-08-31.md"
)
OUTPUT = HERE / (
    "terminal_q3_m0_marked_isolate_hub_distance6_double_broom_tail_"
    "independent_audit_root_20260831.json"
)
MARKER = (
    "PASS_INDEPENDENT_EXACT_TAIL_TERMINAL_Q3_M0_MARKED_ISOLATE_"
    "HUB_DISTANCE6_DOUBLE_BROOM_ROOT"
)

PINNED = {
    "source_sha256": "990F8D4D7042A80C0E1541605221635A2BC99396ECA79A79FB48B43811ED8F9D",
    "report_sha256": "A0FA9708CA733FF06BBC5EB3B7153D21E374D828E192553D0547469DA59F0122",
    "note_sha256": "CAEA8B6C49C111D7B5B426AAFF00332545D4FE6F49E743B0D84B0B3F013E8E40",
    "coefficient_stream_sha256": "FB39F70E67707B23284DC3201FE4727A799F657DBFC2ECD820BABE8D362E7F4C",
}

EXPECTED_AUDIT = {
    "cap_checks": 257500,
    "cap_stream_sha256": "334927C1462DF5971D1B99663817E1695C4C93DFDAC3B43E50DFDA038AAB5229",
    "gap3_lower_checks": 1599,
    "gap3_lower_stream_sha256": "C6B0813D7CABF30755EFE3573DBF6EA30F64E006D1D8F7DC436992BE3199ED83",
    "generic_cells": 8260,
    "generic_classifications": {
        "tail_active_cap_rectangle": 5118,
        "tail_endpoint_b1_age2": 33,
        "tail_endpoint_bge2": 351,
        "tail_j4_b1": 34,
        "tail_j5_b1": 34,
        "tail_j5_b2": 33,
        "tail_zero_common_normalizer": 2657,
    },
    "generic_minimum": (17883264, 1, 1, 5),
    "generic_stream_sha256": "EC346A751019BCE1CB7C77501912025AA5F245EE93E77D6652554478A9433E9B",
}


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def falling(value, rank: int):
    result = 1
    for offset in range(rank):
        result *= value - offset
    return result


def C(value, rank: int):
    if rank < 0:
        return value * 0
    if isinstance(value, int):
        return comb(value, rank) if rank <= value else 0
    return falling(value, rank) / (value * 0 + factorial(rank))


def core_terms(a, b):
    """Derive F/Z category rows directly from all seven-path masks."""
    independent_terms = []
    one_edge_terms = []
    for mask in range(1 << 7):
        size = mask.bit_count()
        core_edges = sum(
            bool(mask & (1 << vertex)) and bool(mask & (1 << (vertex + 1)))
            for vertex in range(6)
        )
        left_selected = bool(mask & 1)
        right_selected = bool(mask & (1 << 6))
        category = (
            "none"
            if left_selected and right_selected
            else "b"
            if left_selected
            else "a"
            if right_selected
            else "n"
        )
        if core_edges == 0:
            independent_terms.append((category, size, 1))

        left_states = (
            ((0, 0, 1), (1, 1, a)) if left_selected else ((0, 0, 1),)
        )
        right_states = (
            ((0, 0, 1), (1, 1, b)) if right_selected else ((0, 0, 1),)
        )
        for left_shift, left_edges, left_weight in left_states:
            for right_shift, right_edges, right_weight in right_states:
                if core_edges + left_edges + right_edges != 1:
                    continue
                one_edge_terms.append(
                    (
                        category,
                        size + left_shift + right_shift,
                        left_weight * right_weight,
                    )
                )
    return independent_terms, one_edge_terms


def fixed_coefficient(terms, rank, a, b):
    n = a + b
    total = 0
    for category, shift, weight in terms:
        residual = rank - shift
        if residual < 0:
            continue
        if category == "n":
            total += weight * C(n, residual)
        elif category == "a":
            total += weight * C(a, residual)
        elif category == "b":
            total += weight * C(b, residual)
        elif residual == 0:
            total += weight
    return total


def anchor(f_terms, z_terms, a, b):
    order = a + b + 7
    f2 = fixed_coefficient(f_terms, 2, a, b)
    f3 = fixed_coefficient(f_terms, 3, a, b)
    z2 = fixed_coefficient(z_terms, 2, a, b)
    z3 = fixed_coefficient(z_terms, 3, a, b)
    z4 = fixed_coefficient(z_terms, 4, a, b)
    p0 = f3 + 2 * f2 + order
    r0 = z4 + 2 * z3 + z2
    c0 = z3 + 2 * f2
    determinant = p0 * c0 - f2 * r0
    return f2, p0, r0, c0, determinant


def fixed_delta(a, b, target):
    f_terms, z_terms = core_terms(a, b)
    f2, p0, r0, c0, determinant = anchor(f_terms, z_terms, a, b)
    fm1 = fixed_coefficient(f_terms, target - 1, a, b)
    f0 = fixed_coefficient(f_terms, target, a, b)
    fp1 = fixed_coefficient(f_terms, target + 1, a, b)
    zp1 = fixed_coefficient(z_terms, target + 1, a, b)
    return (
        (target + 1) * f2 * determinant * (fp1 + 2 * f0 + fm1)
        + f2
        * p0
        * (
            (target + 1) * f0 * (c0 + r0)
            - 3 * (p0 + f2) * (zp1 + 2 * f0)
        )
    )


def ratio_from_base(side, base, difference):
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
        difference = rank_offset - shift + 2
        if category == "n":
            total += weight * ratio_from_base(n, base, difference)
        elif category == "a":
            if rho != 0:
                total += weight * rho * ratio_from_base(a, base, difference)
        elif category == "b":
            if tau != 0:
                total += weight * tau * ratio_from_base(b, base, difference)
        else:
            # No finite-core term reaches the j>=6 rows used here.
            continue
    return total


def normalized_payment(a, b, target, rho, tau):
    f_terms, z_terms = core_terms(a, b)
    base = target - 2
    f2, p0, r0, c0, determinant = anchor(f_terms, z_terms, a, b)
    fm1 = normalized_row(f_terms, -1, base, a, b, rho, tau)
    f0 = normalized_row(f_terms, 0, base, a, b, rho, tau)
    fp1 = normalized_row(f_terms, 1, base, a, b, rho, tau)
    zp1 = normalized_row(z_terms, 1, base, a, b, rho, tau)
    return (
        (target + 1) * f2 * determinant * (fp1 + 2 * f0 + fm1)
        + f2
        * p0
        * (
            (target + 1) * f0 * (c0 + r0)
            - 3 * (p0 + f2) * (zp1 + 2 * f0)
        )
    )


def gap3_correction(side, other, target):
    f_terms, z_terms = core_terms(side, other)
    f2, p0, r0, c0, determinant = anchor(
        f_terms, z_terms, side, other
    )
    return (
        (target + 1) * f2 * determinant * (3 * side + 10)
        + f2
        * p0
        * (
            3 * (target + 1) * (c0 + r0)
            - 9 * (p0 + f2) * (other + 3)
        )
    )


def gap4_correction(side, other, target):
    f_terms, z_terms = core_terms(side, other)
    f2, _, _, _, determinant = anchor(f_terms, z_terms, side, other)
    return 3 * (target + 1) * f2 * determinant


def endpoint_delta(a, b, fprev):
    f_terms, z_terms = core_terms(a, b)
    target = a + b + 3
    f2, p0, r0, c0, determinant = anchor(f_terms, z_terms, a, b)
    return (
        (target + 1) * f2 * determinant * (fprev + 2)
        + f2
        * p0
        * ((target + 1) * (c0 + r0) - 6 * (p0 + f2))
    )


def chart_stats(expression, label, stream):
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
    for kind, terms in (("N", numerator_terms), ("D", denominator_terms)):
        for monomial, coefficient in terms:
            stream.update(
                f"{label}|{kind}|{','.join(map(str, monomial))}|{coefficient}\n".encode()
            )
    return stats


def generic_rows(large, small):
    """Enumerate path masks and leaf multiplicities without a row formula."""
    order = large + small + 7
    independent = [0] * (order + 1)
    one_edge = [0] * (order + 1)
    for mask in range(1 << 7):
        core_size = mask.bit_count()
        core_edges = sum(
            bool(mask & (1 << vertex)) and bool(mask & (1 << (vertex + 1)))
            for vertex in range(6)
        )
        left_hub = bool(mask & 1)
        right_hub = bool(mask & (1 << 6))
        for left_leaves in range(large + 1):
            left_weight = comb(large, left_leaves)
            for right_leaves in range(small + 1):
                induced_edges = (
                    core_edges
                    + left_hub * left_leaves
                    + right_hub * right_leaves
                )
                if induced_edges > 1:
                    continue
                rank = core_size + left_leaves + right_leaves
                weight = left_weight * comb(small, right_leaves)
                if induced_edges == 0:
                    independent[rank] += weight
                else:
                    one_edge[rank] += weight
    return independent, one_edge


def margin(independent, one_edge, target):
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


def main():
    assert sha256(THEOREM_SOURCE) == PINNED["source_sha256"]
    assert sha256(THEOREM_REPORT) == PINNED["report_sha256"]
    assert sha256(THEOREM_NOTE) == PINNED["note_sha256"]
    theorem = json.loads(THEOREM_REPORT.read_text(encoding="utf-8"))
    assert theorem["status"] == (
        "PASS_EXACT_TAIL_ALL_TARGET_TERMINAL_Q3_M0_MARKED_ISOLATE_"
        "HUB_DISTANCE6_DOUBLE_BROOM_ROOT"
    )
    assert theorem["source_sha256"] == PINNED["source_sha256"]
    assert theorem["note_sha256"] == PINNED["note_sha256"]
    assert theorem["coefficient_stream_sha256"] == PINNED[
        "coefficient_stream_sha256"
    ]
    assert theorem["coverage_gap_within_scope"] is None

    coefficient_stream = hashlib.sha256()
    rebuilt = {}

    _, u = field("u", QQ)
    for label, expression in (
        ("tail_j4_b1", fixed_delta(u + 1, 1, 4)),
        ("tail_j5_b1", fixed_delta(u + 1, 1, 5)),
        ("tail_j5_b2", fixed_delta(u + 2, 2, 5)),
    ):
        rebuilt[label] = chart_stats(expression, label, coefficient_stream)

    _, t, r, s = field("t,r,s", QQ)
    b = s + t + 1
    a = s + t + r + 1
    target = t + r + 2 * s + 4
    rebuilt["tail_zero_common_normalizer"] = chart_stats(
        normalized_payment(a, b, target, 0, 0),
        "tail_zero_common_normalizer",
        coefficient_stream,
    )

    _, t, r = field("t,r", QQ)
    b = t + 1
    a = t + r + 1
    target = a + 3
    rebuilt["tail_zero_gap3_large_correction"] = chart_stats(
        gap3_correction(a, b, target),
        "tail_zero_gap3_large_correction",
        coefficient_stream,
    )

    _, q, u, y = field("q,u,y", QQ)
    b = q + 1
    target = q + y + 4
    a = q + y + u + 2
    n = a + b
    selected = target - 4
    cap_a = falling(a, 2) / falling(n, 2) * (a - 2) / (
        (a - 2) + selected * b
    )
    active_origin = normalized_payment(a, b, target, 0, 0)
    active_cap = normalized_payment(a, b, target, cap_a, 0)
    for label, expression in (
        ("tail_active_origin_common_normalizer", active_origin),
        ("tail_active_cap_common_normalizer", active_cap),
    ):
        rebuilt[label] = chart_stats(expression, label, coefficient_stream)

    _, w, u = field("w,u", QQ)
    q = w + 2
    b = q + 1
    target = q + 4
    a = q + u + 2
    n = a + b
    selected = target - 4
    cap_a = falling(a, 2) / falling(n, 2) * (a - 2) / (
        (a - 2) + selected * b
    )
    correction = gap3_correction(b, a, target)
    lower_binomial = falling(n, 3) / 6
    for label, expression in (
        (
            "tail_active_y0_origin_Cn3_payment",
            lower_binomial * normalized_payment(a, b, target, 0, 0)
            + correction,
        ),
        (
            "tail_active_y0_cap_Cn3_payment",
            lower_binomial * normalized_payment(a, b, target, cap_a, 0)
            + correction,
        ),
    ):
        rebuilt[label] = chart_stats(expression, label, coefficient_stream)

    _, q, u = field("q,u", QQ)
    b = q + 2
    a = b + u
    rebuilt["tail_endpoint_bge2"] = chart_stats(
        endpoint_delta(a, b, a + b + 6),
        "tail_endpoint_bge2",
        coefficient_stream,
    )

    _, u = field("u", QQ)
    b = 1
    a = u + 2
    rebuilt["tail_endpoint_b1_age2"] = chart_stats(
        endpoint_delta(a, b, a + b + 9),
        "tail_endpoint_b1_age2",
        coefficient_stream,
    )

    if rebuilt != theorem["charts"]:
        for label in sorted(set(rebuilt) | set(theorem["charts"])):
            if rebuilt.get(label) != theorem["charts"].get(label):
                print("CHART_MISMATCH", label)
                print("REBUILT", rebuilt.get(label))
                print("PINNED", theorem["charts"].get(label))
    assert rebuilt == theorem["charts"]
    assert coefficient_stream.hexdigest().upper() == PINNED[
        "coefficient_stream_sha256"
    ]

    cap_checks = 0
    cap_stream = hashlib.sha256()
    for side in range(1, 101):
        for complement in range(1, 51):
            for selected in range(0, side + 1):
                left = comb(side, selected) * (side + selected * complement)
                right = comb(side + complement, selected) * side
                assert left <= right
                cap_stream.update(
                    f"{side}|{complement}|{selected}|{left}|{right}\n".encode()
                )
                cap_checks += 1

    lower_checks = 0
    lower_stream = hashlib.sha256()
    for q_int in range(2, 41):
        for u_int in range(0, 41):
            small = q_int + 1
            large = q_int + u_int + 2
            target = q_int + 4
            n_int = large + small
            base = target - 2
            normalizer = comb(n_int, base)
            lower_binomial = comb(n_int, 3)
            assert normalizer >= lower_binomial
            rho = Fraction(comb(large, base), normalizer)
            selected = target - 4
            cap = Fraction(
                large * (large - 1), n_int * (n_int - 1)
            ) * Fraction(large - 2, (large - 2) + selected * small)
            assert 0 <= rho <= cap
            correction = gap3_correction(small, large, target)
            origin = (
                lower_binomial
                * normalized_payment(
                    Fraction(large), Fraction(small), Fraction(target), 0, 0
                )
                + correction
            )
            cap_value = (
                lower_binomial
                * normalized_payment(
                    Fraction(large),
                    Fraction(small),
                    Fraction(target),
                    cap,
                    0,
                )
                + correction
            )
            assert origin > 0 and cap_value > 0
            lower_stream.update(
                f"{q_int}|{u_int}|{normalizer}|{lower_binomial}|"
                f"{rho}|{cap}|{origin}|{cap_value}\n".encode()
            )
            lower_checks += 1

    cells = 0
    classifications = {}
    minimum = None
    row_stream = hashlib.sha256()
    for small in range(1, 15):
        for large in range(small, 35):
            independent, one_edge = generic_rows(large, small)
            n_int = large + small
            for target in range(small + 3, n_int + 4):
                value = margin(independent, one_edge, target)
                assert value > 0
                if target == 4:
                    classification = "tail_j4_b1"
                    assert fixed_delta(large, small, target) == value
                elif target == 5:
                    classification = f"tail_j5_b{small}"
                    assert small in (1, 2)
                    assert fixed_delta(large, small, target) == value
                elif target == n_int + 3:
                    if small == 1:
                        classification = "tail_endpoint_b1_age2"
                        assert large >= 2
                        reconstructed = endpoint_delta(large, small, n_int + 9)
                    else:
                        classification = "tail_endpoint_bge2"
                        reconstructed = endpoint_delta(large, small, n_int + 6)
                    assert reconstructed == value
                else:
                    base = target - 2
                    normalizer = comb(n_int, base)
                    assert normalizer > 0
                    if large < base:
                        classification = "tail_zero_common_normalizer"
                        rho = Fraction(0)
                        reconstructed = normalizer * normalized_payment(
                            Fraction(large),
                            Fraction(small),
                            Fraction(target),
                            rho,
                            Fraction(0),
                        )
                        for side, other in ((large, small), (small, large)):
                            gap = target - side
                            if gap == 3:
                                reconstructed += gap3_correction(side, other, target)
                            elif gap == 4:
                                correction = gap4_correction(side, other, target)
                                assert correction > 0
                                reconstructed += correction
                            else:
                                assert gap >= 5
                    else:
                        classification = "tail_active_cap_rectangle"
                        rho = Fraction(comb(large, base), normalizer)
                        selected = target - 4
                        cap = Fraction(
                            large * (large - 1), n_int * (n_int - 1)
                        ) * Fraction(
                            large - 2, (large - 2) + selected * small
                        )
                        assert 0 <= rho <= cap
                        reconstructed = normalizer * normalized_payment(
                            Fraction(large),
                            Fraction(small),
                            Fraction(target),
                            rho,
                            Fraction(0),
                        )
                        gap = target - small
                        if gap == 3:
                            assert target >= 6
                            assert normalizer >= comb(n_int, 3)
                            reconstructed += gap3_correction(
                                small, large, target
                            )
                        elif gap == 4:
                            correction = gap4_correction(small, large, target)
                            assert correction > 0
                            reconstructed += correction
                        else:
                            assert gap >= 5
                    assert reconstructed == value
                classifications[classification] = (
                    classifications.get(classification, 0) + 1
                )
                record = (value, large, small, target)
                if minimum is None or record < minimum:
                    minimum = record
                row_stream.update(
                    f"{large}|{small}|{target}|{classification}|{value}\n".encode()
                )
                cells += 1

    assert set(classifications) == set(theorem["identity_audit"]["classifications"])
    assert cap_checks == EXPECTED_AUDIT["cap_checks"]
    assert cap_stream.hexdigest().upper() == EXPECTED_AUDIT["cap_stream_sha256"]
    assert lower_checks == EXPECTED_AUDIT["gap3_lower_checks"]
    assert lower_stream.hexdigest().upper() == EXPECTED_AUDIT[
        "gap3_lower_stream_sha256"
    ]
    assert cells == EXPECTED_AUDIT["generic_cells"]
    assert classifications == EXPECTED_AUDIT["generic_classifications"]
    assert minimum == EXPECTED_AUDIT["generic_minimum"]
    assert row_stream.hexdigest().upper() == EXPECTED_AUDIT[
        "generic_stream_sha256"
    ]

    payload = {
        "status": MARKER,
        "pinned_theorem": PINNED,
        "independent_method": (
            "Seven-vertex path masks independently reconstruct all F/Z rows "
            "and eleven symbolic charts. A separate path-mask plus explicit "
            "leaf-multiplicity enumeration checks every tail partition, the "
            "common-normalizer identities, and both boundary corrections."
        ),
        "symbolic_chart_rebuild": {
            "charts": rebuilt,
            "coefficient_stream_sha256": coefficient_stream.hexdigest().upper(),
        },
        "cap_audit": {
            "checks": cap_checks,
            "ordered_stream_sha256": cap_stream.hexdigest().upper(),
        },
        "gap3_lower_payment_audit": {
            "checks": lower_checks,
            "ordered_stream_sha256": lower_stream.hexdigest().upper(),
        },
        "generic_graph_audit": {
            "maximum_small_side": 14,
            "maximum_large_side": 34,
            "cells": cells,
            "classifications": classifications,
            "minimum_delta": minimum[0],
            "minimum_witness": {
                "large": minimum[1],
                "small": minimum[2],
                "j": minimum[3],
            },
            "ordered_stream_sha256": row_stream.hexdigest().upper(),
        },
        "coverage_gap_within_theorem_scope": None,
        "scope_guard": (
            "This independently audits only the stated tail region of the "
            "distance-six double-broom family; it does not promote the "
            "complete terminal payment or Erdos Problem 993."
        ),
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
                "rebuilt_chart_count": len(rebuilt),
                "coefficient_stream_sha256": coefficient_stream.hexdigest().upper(),
                "cap_checks": cap_checks,
                "gap3_lower_checks": lower_checks,
                "generic_cells": cells,
                "classifications": classifications,
                "minimum": minimum,
                "coverage_gap_within_theorem_scope": None,
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
