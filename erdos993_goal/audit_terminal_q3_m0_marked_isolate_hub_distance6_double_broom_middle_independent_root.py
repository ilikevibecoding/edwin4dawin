#!/usr/bin/env python3
"""Independent audit of the distance-six double-broom middle theorem."""

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
    "middle_all_j_root.py"
)
THEOREM_REPORT = HERE / (
    "terminal_q3_m0_marked_isolate_hub_distance6_double_broom_middle_"
    "all_j_exact_root_20260831.json"
)
THEOREM_NOTE = HERE / (
    "TERMINAL_Q3_M0_MARKED_ISOLATE_HUB_DISTANCE6_DOUBLE_BROOM_MIDDLE_"
    "ALL_J_ROOT_2026-08-31.md"
)
OUTPUT = HERE / (
    "terminal_q3_m0_marked_isolate_hub_distance6_double_broom_middle_"
    "independent_audit_root_20260831.json"
)
MARKER = (
    "PASS_INDEPENDENT_EXACT_MIDDLE_TERMINAL_Q3_M0_MARKED_ISOLATE_"
    "HUB_DISTANCE6_DOUBLE_BROOM_ROOT"
)

PINNED = {
    "source_sha256": "AF0564EC20CBD2523C66C18C9F58CBE168FC2C75A5BB50491910F110587B873C",
    "report_sha256": "1072A476ACADA3E7823886867746E2B07297A0853B11D548E70654B9D2D40D4F",
    "note_sha256": "CE4E858AB870340DD7BE02BD02BCC292D87EB536E64CB4CDAE4F28B8E24027DB",
    "coefficient_stream_sha256": "6AD0C3CE6E3CC594AC487BFB64878A337765563A915A6FD92D423543EDE13018",
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
    """Derive F/Z category terms directly from the seven-vertex path masks."""
    f_terms = []
    z_terms = []
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
            f_terms.append((category, size, 1))

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
                z_terms.append(
                    (
                        category,
                        size + left_shift + right_shift,
                        left_weight * right_weight,
                    )
                )
    return f_terms, z_terms


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


def fixed_delta(f_terms, z_terms, a, b, target):
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
    for offset in range(difference):
        result *= (side - base - offset) / (base + offset + 1)
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
            # Every finite-core shift is below the j>=6 recurrence rows.
            assert base + difference != 0
    return total


def normalized_recurrence(f_terms, z_terms, a, b, target, rho, tau):
    base = target - 4
    f2, p0, r0, c0, determinant = anchor(f_terms, z_terms, a, b)
    fm1 = normalized_row(f_terms, -1, base, a, b, rho, tau)
    f0 = normalized_row(f_terms, 0, base, a, b, rho, tau)
    fp1 = normalized_row(f_terms, 1, base, a, b, rho, tau)
    fp2 = normalized_row(f_terms, 2, base, a, b, rho, tau)
    zp1 = normalized_row(z_terms, 1, base, a, b, rho, tau)
    zp2 = normalized_row(z_terms, 2, base, a, b, rho, tau)
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
    """Core masks plus explicit leaf multiplicities, with no closed row formula."""
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
        "PASS_EXACT_MIDDLE_ALL_TARGET_TERMINAL_Q3_M0_MARKED_ISOLATE_"
        "HUB_DISTANCE6_DOUBLE_BROOM_ROOT"
    )
    assert theorem["source_sha256"] == PINNED["source_sha256"]
    assert theorem["note_sha256"] == PINNED["note_sha256"]
    assert theorem["coefficient_stream_sha256"] == PINNED[
        "coefficient_stream_sha256"
    ]
    assert theorem["coverage_gap_within_scope"] is None
    assert set(theorem["charts"]) == {
        "j4_exact_base",
        "j5_exact_base",
        "j6_exact_base",
        "recurrence_origin",
        "recurrence_large_cap",
        "recurrence_small_cap",
        "recurrence_both_caps",
    }

    # Rebuild every symbolic chart from path masks rather than the theorem's
    # hard-coded F/Z formulas.
    coefficient_stream = hashlib.sha256()
    rebuilt = {}
    for target in (4, 5, 6):
        _, q, v = field("q,v", QQ)
        b = q + target - 2
        a = q + v + target - 2
        f_terms, z_terms = core_terms(a, b)
        label = f"j{target}_exact_base"
        rebuilt[label] = chart_stats(
            fixed_delta(f_terms, z_terms, a, b, target),
            label,
            coefficient_stream,
        )

    _, q, v, y = field("q,v,y", QQ)
    target = y + 6
    b = q + y + 5
    a = q + v + y + 5
    base = target - 4
    f_terms, z_terms = core_terms(a, b)
    cap_a = a / (a + base * b)
    cap_b = b / (b + base * a)
    for label, rho, tau in (
        ("recurrence_origin", 0, 0),
        ("recurrence_large_cap", cap_a, 0),
        ("recurrence_small_cap", 0, cap_b),
        ("recurrence_both_caps", cap_a, cap_b),
    ):
        rebuilt[label] = chart_stats(
            normalized_recurrence(f_terms, z_terms, a, b, target, rho, tau),
            label,
            coefficient_stream,
        )
    assert rebuilt == theorem["charts"]
    assert coefficient_stream.hexdigest().upper() == PINNED[
        "coefficient_stream_sha256"
    ]

    cap_checks = 0
    cap_stream = hashlib.sha256()
    for side in range(1, 121):
        for complement in range(1, 61):
            for selected in range(1, side + 1):
                lhs = Fraction(comb(side, selected), comb(side + complement, selected))
                rhs = Fraction(side, side + selected * complement)
                assert lhs <= rhs
                cap_stream.update(
                    f"{side}|{complement}|{selected}|{lhs}|{rhs}\n".encode()
                )
                cap_checks += 1

    cells = 0
    classifications = {}
    minimum = None
    row_stream = hashlib.sha256()
    for small in range(2, 17):
        for large in range(small, 17):
            independent, one_edge = generic_rows(large, small)
            for target in range(4, small + 3):
                value = margin(independent, one_edge, target)
                assert value > 0
                if target <= 6:
                    classification = f"j{target}_exact_base"
                else:
                    step_target = target - 1
                    base_rank = step_target - 4
                    denominator = comb(large + small, base_rank)
                    rho = Fraction(comb(large, base_rank), denominator)
                    tau = Fraction(comb(small, base_rank), denominator)
                    cap_large = Fraction(
                        large, large + base_rank * small
                    )
                    cap_small = Fraction(
                        small, small + base_rank * large
                    )
                    assert rho <= cap_large
                    assert tau <= cap_small
                    recurrence = value - margin(
                        independent, one_edge, step_target
                    )
                    assert recurrence > 0
                    classification = "positive_same_tree_recurrence"
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
    assert minimum == (963407790, 2, 2, 4)
    assert set(classifications) == {
        "j4_exact_base",
        "j5_exact_base",
        "j6_exact_base",
        "positive_same_tree_recurrence",
    }

    payload = {
        "status": MARKER,
        "pinned_theorem": PINNED,
        "independent_method": (
            "Seven-vertex path masks independently reconstruct the symbolic "
            "F/Z category rows and all seven coefficient charts. A separate "
            "core-mask plus explicit leaf-multiplicity enumeration checks the "
            "actual middle payments, recurrence steps, and cap inequalities."
        ),
        "symbolic_chart_rebuild": {
            "charts": rebuilt,
            "coefficient_stream_sha256": coefficient_stream.hexdigest().upper(),
        },
        "cap_audit": {
            "checks": cap_checks,
            "ordered_stream_sha256": cap_stream.hexdigest().upper(),
        },
        "generic_graph_audit": {
            "maximum_side": 16,
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
            "This independently audits only the stated middle region of the "
            "distance-six double-broom family; it does not promote its tail, "
            "the complete terminal payment, or Erdos Problem 993."
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
