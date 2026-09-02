#!/usr/bin/env python3
"""All-target tail theorem for hub-distance-six double-broom remainders."""

from __future__ import annotations

import hashlib
import json
from fractions import Fraction
from math import comb
from pathlib import Path

from sympy.polys.domains import QQ
from sympy.polys.fields import field

from prove_terminal_q3_m0_marked_isolate_hub_distance6_double_broom_middle_all_j_root import (
    F_TERMS,
    anchor,
    falling,
    fixed_delta,
    formula_rows,
    literal_subset_rows,
    margin,
    ratio_from_base,
    z_terms,
)


HERE = Path(__file__).resolve().parent
MIDDLE_SOURCE = HERE / (
    "prove_terminal_q3_m0_marked_isolate_hub_distance6_double_broom_"
    "middle_all_j_root.py"
)
MIDDLE_REPORT = HERE / (
    "terminal_q3_m0_marked_isolate_hub_distance6_double_broom_middle_"
    "all_j_exact_root_20260831.json"
)
OUTPUT = HERE / (
    "terminal_q3_m0_marked_isolate_hub_distance6_double_broom_tail_all_j_"
    "exact_root_20260831.json"
)
NOTE = HERE / (
    "TERMINAL_Q3_M0_MARKED_ISOLATE_HUB_DISTANCE6_DOUBLE_BROOM_TAIL_"
    "ALL_J_ROOT_2026-08-31.md"
)
MARKER = (
    "PASS_EXACT_TAIL_ALL_TARGET_TERMINAL_Q3_M0_MARKED_ISOLATE_"
    "HUB_DISTANCE6_DOUBLE_BROOM_ROOT"
)

PINNED_MIDDLE = {
    "source_sha256": "AF0564EC20CBD2523C66C18C9F58CBE168FC2C75A5BB50491910F110587B873C",
    "report_sha256": "1072A476ACADA3E7823886867746E2B07297A0853B11D548E70654B9D2D40D4F",
    "status": (
        "PASS_EXACT_MIDDLE_ALL_TARGET_TERMINAL_Q3_M0_MARKED_ISOLATE_"
        "HUB_DISTANCE6_DOUBLE_BROOM_ROOT"
    ),
}


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def verify_dependency() -> dict:
    assert sha256(MIDDLE_SOURCE) == PINNED_MIDDLE["source_sha256"]
    assert sha256(MIDDLE_REPORT) == PINNED_MIDDLE["report_sha256"]
    report = json.loads(MIDDLE_REPORT.read_text(encoding="utf-8"))
    assert report["status"] == PINNED_MIDDLE["status"]
    assert report["source_sha256"] == PINNED_MIDDLE["source_sha256"]
    assert report["coverage_gap_within_scope"] is None
    return dict(PINNED_MIDDLE)


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
            raise AssertionError(category)
    return total


def normalized_payment(a, b, target, rho, tau):
    """Delta_j/C(a+b,j-2), valid when j>=6 and j<=a+b+2."""
    base = target - 2
    f2, p0, r0, c0, determinant = anchor(a, b)
    fm1 = normalized_row(F_TERMS, -1, base, a, b, rho, tau)
    f0 = normalized_row(F_TERMS, 0, base, a, b, rho, tau)
    fp1 = normalized_row(F_TERMS, 1, base, a, b, rho, tau)
    zp1 = normalized_row(z_terms(a, b), 1, base, a, b, rho, tau)
    return (
        (target + 1) * f2 * determinant * (fp1 + 2 * f0 + fm1)
        + f2
        * p0
        * (
            (target + 1) * f0 * (c0 + r0)
            - 3 * (p0 + f2) * (zp1 + 2 * f0)
        )
    )


def endpoint_delta(a, b, fprev):
    n = a + b
    target = n + 3
    f2, p0, r0, c0, determinant = anchor(a, b)
    return (
        (target + 1) * f2 * determinant * (fprev + 2)
        + f2
        * p0
        * ((target + 1) * (c0 + r0) - 6 * (p0 + f2))
    )


def gap3_correction(side, other, target):
    """Exact omitted contribution when j-side=3 and its base weight is zero."""
    f2, p0, r0, c0, determinant = anchor(side, other)
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
    """Only 3*C(side,side) survives when j-side=4."""
    f2, _, _, _, determinant = anchor(side, other)
    return 3 * (target + 1) * f2 * determinant


EXPECTED = {
    "tail_j4_b1": {
        "numerator_terms": 12,
        "denominator_terms": 1,
        "numerator_total_degree": 11,
        "denominator_total_degree": 0,
        "negative_numerator_coefficients": 0,
        "negative_denominator_coefficients": 0,
        "minimum_numerator_coefficient": "5",
        "minimum_denominator_coefficient": "144",
    },
    "tail_j5_b1": {
        "numerator_terms": 13,
        "denominator_terms": 1,
        "numerator_total_degree": 12,
        "denominator_total_degree": 0,
        "negative_numerator_coefficients": 0,
        "negative_denominator_coefficients": 0,
        "minimum_numerator_coefficient": "12",
        "minimum_denominator_coefficient": "1440",
    },
    "tail_j5_b2": {
        "numerator_terms": 13,
        "denominator_terms": 1,
        "numerator_total_degree": 12,
        "denominator_total_degree": 0,
        "negative_numerator_coefficients": 0,
        "negative_denominator_coefficients": 0,
        "minimum_numerator_coefficient": "13",
        "minimum_denominator_coefficient": "1440",
    },
    "tail_zero_common_normalizer": {
        "numerator_terms": 545,
        "denominator_terms": 22,
        "numerator_total_degree": 13,
        "denominator_total_degree": 4,
        "negative_numerator_coefficients": 0,
        "negative_denominator_coefficients": 0,
        "minimum_numerator_coefficient": "1",
        "minimum_denominator_coefficient": "24",
    },
    "tail_zero_gap3_large_correction": {
        "numerator_terms": 55,
        "denominator_terms": 1,
        "numerator_total_degree": 9,
        "denominator_total_degree": 0,
        "negative_numerator_coefficients": 0,
        "negative_denominator_coefficients": 0,
        "minimum_numerator_coefficient": "6",
        "minimum_denominator_coefficient": "24",
    },
    "tail_active_origin_common_normalizer": {
        "numerator_terms": 543,
        "denominator_terms": 27,
        "numerator_total_degree": 13,
        "denominator_total_degree": 4,
        "negative_numerator_coefficients": 0,
        "negative_denominator_coefficients": 0,
        "minimum_numerator_coefficient": "1",
        "minimum_denominator_coefficient": "24",
    },
    "tail_active_cap_common_normalizer": {
        "numerator_terms": 1414,
        "denominator_terms": 216,
        "numerator_total_degree": 19,
        "denominator_total_degree": 10,
        "negative_numerator_coefficients": 0,
        "negative_denominator_coefficients": 0,
        "minimum_numerator_coefficient": "1",
        "minimum_denominator_coefficient": "24",
    },
    "tail_active_y0_origin_Cn3_payment": {
        "numerator_terms": 150,
        "denominator_terms": 12,
        "numerator_total_degree": 16,
        "denominator_total_degree": 4,
        "negative_numerator_coefficients": 0,
        "negative_denominator_coefficients": 0,
        "minimum_numerator_coefficient": "1",
        "minimum_denominator_coefficient": "144",
    },
    "tail_active_y0_cap_Cn3_payment": {
        "numerator_terms": 220,
        "denominator_terms": 35,
        "numerator_total_degree": 20,
        "denominator_total_degree": 8,
        "negative_numerator_coefficients": 0,
        "negative_denominator_coefficients": 0,
        "minimum_numerator_coefficient": "1",
        "minimum_denominator_coefficient": "144",
    },
    "tail_endpoint_bge2": {
        "numerator_terms": 55,
        "denominator_terms": 1,
        "numerator_total_degree": 9,
        "denominator_total_degree": 0,
        "negative_numerator_coefficients": 0,
        "negative_denominator_coefficients": 0,
        "minimum_numerator_coefficient": "1",
        "minimum_denominator_coefficient": "12",
    },
    "tail_endpoint_b1_age2": {
        "numerator_terms": 10,
        "denominator_terms": 1,
        "numerator_total_degree": 9,
        "denominator_total_degree": 0,
        "negative_numerator_coefficients": 0,
        "negative_denominator_coefficients": 0,
        "minimum_numerator_coefficient": "1",
        "minimum_denominator_coefficient": "12",
    },
}


def fraction_stats(expression, label, stream):
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


def main():
    dependency = verify_dependency()

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
    hypergeometric_stream = hashlib.sha256()
    for side in range(1, 81):
        for complement in range(1, 41):
            for selected in range(0, side + 1):
                left = comb(side, selected) * (side + selected * complement)
                right = comb(side + complement, selected) * side
                assert left <= right
                hypergeometric_stream.update(
                    f"{side}|{complement}|{selected}|{left}|{right}\n".encode()
                )
                hypergeometric_checks += 1

    coefficient_stream = hashlib.sha256()
    charts = {}

    _, u = field("u", QQ)
    for label, expression in (
        ("tail_j4_b1", fixed_delta(u + 1, 1, 4)),
        ("tail_j5_b1", fixed_delta(u + 1, 1, 5)),
        ("tail_j5_b2", fixed_delta(u + 2, 2, 5)),
    ):
        charts[label] = fraction_stats(expression, label, coefficient_stream)

    _, t, r, s = field("t,r,s", QQ)
    b = s + t + 1
    a = s + t + r + 1
    target = t + r + 2 * s + 4
    charts["tail_zero_common_normalizer"] = fraction_stats(
        normalized_payment(a, b, target, 0, 0),
        "tail_zero_common_normalizer",
        coefficient_stream,
    )

    # If the large zero side lies only three below the target, its lower
    # binomial rows survive.  Their complete correction is positive.  The
    # symmetric small-side gap-three case is the r=0 specialization.
    _, t, r = field("t,r", QQ)
    b = t + 1
    a = t + r + 1
    target = a + 3
    charts["tail_zero_gap3_large_correction"] = fraction_stats(
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
    u_a2 = falling(a, 2) / falling(n, 2)
    cap_a = u_a2 * (a - 2) / ((a - 2) + selected * b)
    active_origin = normalized_payment(a, b, target, 0, 0)
    active_cap = normalized_payment(a, b, target, cap_a, 0)
    assert normalized_payment(a, b, target, 2 * cap_a, 0) - 2 * active_cap + active_origin == 0
    expected_cap_denominator = (
        24
        * (u + 1)
        * (u + 2)
        * (q + u + 2)
        * (q + u + 3)
        * (q + y + 3)
        * (q + y + 4)
        * (2 * q + u + y + 2)
        * (2 * q + u + y + 3)
        * (q**2 + q * y + 2 * q + u + 2 * y)
    )
    assert active_cap.denom == expected_cap_denominator.numer
    for label, expression in (
        ("tail_active_origin_common_normalizer", active_origin),
        ("tail_active_cap_common_normalizer", active_cap),
    ):
        charts[label] = fraction_stats(expression, label, coefficient_stream)

    # At the tail start y=0, the small side has gap three and can contribute
    # negatively.  For j>=6 write q=w+2.  The common binomial normalizer is at
    # least C(n,3); these two affine endpoint charts pay that correction.
    _, w, u = field("w,u", QQ)
    q = w + 2
    b = q + 1
    target = q + 4
    a = q + u + 2
    n = a + b
    selected = target - 4
    u_a2 = falling(a, 2) / falling(n, 2)
    cap_a = u_a2 * (a - 2) / ((a - 2) + selected * b)
    correction = gap3_correction(b, a, target)
    lower_binomial = falling(n, 3) / 6
    y0_origin = lower_binomial * normalized_payment(a, b, target, 0, 0) + correction
    y0_cap = lower_binomial * normalized_payment(a, b, target, cap_a, 0) + correction
    assert (
        lower_binomial * normalized_payment(a, b, target, 2 * cap_a, 0)
        + correction
        - 2 * y0_cap
        + y0_origin
    ) == 0
    for label, expression in (
        ("tail_active_y0_origin_Cn3_payment", y0_origin),
        ("tail_active_y0_cap_Cn3_payment", y0_cap),
    ):
        charts[label] = fraction_stats(expression, label, coefficient_stream)

    _, q, u = field("q,u", QQ)
    b = q + 2
    a = b + u
    n = a + b
    charts["tail_endpoint_bge2"] = fraction_stats(
        endpoint_delta(a, b, n + 6),
        "tail_endpoint_bge2",
        coefficient_stream,
    )

    _, u = field("u", QQ)
    b = 1
    a = u + 2
    n = a + b
    charts["tail_endpoint_b1_age2"] = fraction_stats(
        endpoint_delta(a, b, n + 9),
        "tail_endpoint_b1_age2",
        coefficient_stream,
    )

    identity_checks = 0
    identity_classifications = {}
    identity_stream = hashlib.sha256()
    for small in range(1, 13):
        for large in range(small, 41):
            independent, one_edge = formula_rows(large, small)
            n_int = large + small
            for target_int in range(small + 3, n_int + 4):
                direct = margin(independent, one_edge, target_int)
                if target_int == 4:
                    classification = "tail_j4_b1"
                elif target_int == 5:
                    classification = f"tail_j5_b{small}"
                    assert small in (1, 2)
                elif target_int == n_int + 3:
                    if small == 1:
                        assert large >= 2
                        endpoint = endpoint_delta(large, small, n_int + 9)
                        classification = "tail_endpoint_b1_age2"
                    else:
                        endpoint = endpoint_delta(large, small, n_int + 6)
                        classification = "tail_endpoint_bge2"
                    assert endpoint == direct
                else:
                    assert 6 <= target_int <= n_int + 2
                    base_int = target_int - 2
                    normalizer = comb(n_int, base_int)
                    assert normalizer > 0
                    tau = Fraction(comb(small, base_int), normalizer)
                    assert tau == 0
                    if large < base_int:
                        rho = Fraction(0)
                        q_int = small - 1
                        r_int = large - small
                        y_int = target_int - q_int - 4
                        s_int = y_int - r_int
                        t_int = q_int - s_int
                        assert min(r_int, s_int, t_int) >= 0
                        classification = "tail_zero_common_normalizer"
                    else:
                        rho = Fraction(comb(large, base_int), normalizer)
                        q_int = small - 1
                        y_int = target_int - q_int - 4
                        u_int = large - (q_int + y_int + 2)
                        assert min(q_int, y_int, u_int) >= 0
                        selected_int = target_int - 4
                        cap = Fraction(
                            large * (large - 1), n_int * (n_int - 1)
                        ) * Fraction(
                            large - 2,
                            (large - 2) + selected_int * small,
                        )
                        assert rho <= cap
                        classification = "tail_active_cap_rectangle"
                    normalized = normalized_payment(
                        Fraction(large),
                        Fraction(small),
                        Fraction(target_int),
                        rho,
                        Fraction(0),
                    )
                    reconstructed = normalized * normalizer
                    if large < base_int:
                        # Both baseline weights vanish.  Only the two nearest
                        # lower-binomial boundary layers can survive.
                        for side, other in ((large, small), (small, large)):
                            gap = target_int - side
                            if gap == 3:
                                reconstructed += gap3_correction(
                                    side, other, target_int
                                )
                            elif gap == 4:
                                reconstructed += gap4_correction(
                                    side, other, target_int
                                )
                            else:
                                assert gap >= 5
                    else:
                        # The large-side contribution is already represented
                        # by rho.  The small side has zero baseline weight but
                        # may retain a gap-three or gap-four boundary payment.
                        gap = target_int - small
                        if gap == 3:
                            reconstructed += gap3_correction(
                                small, large, target_int
                            )
                            assert y_int == 0
                            assert normalizer >= comb(n_int, 3)
                        elif gap == 4:
                            reconstructed += gap4_correction(
                                small, large, target_int
                            )
                            assert y_int == 1
                        else:
                            assert gap >= 5
                    assert reconstructed == direct, (
                        large,
                        small,
                        target_int,
                        classification,
                        normalized,
                        normalizer,
                        reconstructed,
                        direct,
                    )
                assert direct > 0
                identity_classifications[classification] = (
                    identity_classifications.get(classification, 0) + 1
                )
                identity_stream.update(
                    f"{large}|{small}|{target_int}|{classification}|{direct}\n".encode()
                )
                identity_checks += 1

    literal_cells = 0
    literal_minimum = None
    literal_stream = hashlib.sha256()
    for small in range(1, 21):
        for large in range(small, 121):
            independent, one_edge = formula_rows(large, small)
            n_int = large + small
            for target_int in range(small + 3, n_int + 4):
                assert independent[target_int] > 0
                value = margin(independent, one_edge, target_int)
                assert value > 0
                record = (value, large, small, target_int)
                if literal_minimum is None or record < literal_minimum:
                    literal_minimum = record
                literal_stream.update(
                    f"{large}|{small}|{target_int}|"
                    f"{independent[target_int]}|{value}\n".encode()
                )
                literal_cells += 1

    exhaustive_partition = [
        "j=4: necessarily b=1; exact one-variable chart",
        "j=5: necessarily b=1 or b=2; two exact one-variable charts",
        (
            "j>=6, j<=n+2, a<j-2: exact rho=tau=0 common-normalizer "
            "chart with b=s+t+1, a=s+t+r+1, j=t+r+2s+4"
        ),
        (
            "j>=6, j<=n+2, a>=j-2: tau=0 and rho lies in the positive "
            "origin/depth-cap interval"
        ),
        "j>=6, j=n+3, b=1: exact endpoint chart with a>=2",
        "j>=6, j=n+3, b>=2: exact endpoint chart",
    ]
    payload = {
        "status": MARKER,
        "theorem": (
            "For terminal-q3 Newton degree m=0 with an isolated marked root "
            "and the mandatory terminal leaf, the exact payment margin is "
            "positive for every supported tail target j>=4, j>=b+3, when "
            "the connected remainder is a sorted double broom T_(a,b,6), "
            "a>=b>=1."
        ),
        "pinned_middle_dependency": dependency,
        "common_normalizer": "B=C(a+b,j-2)",
        "literal_graph_row_audit": {
            "cases": graph_cases,
            "ordered_stream_sha256": graph_stream.hexdigest().upper(),
        },
        "hypergeometric_cap": {
            "statement": "C(A,k)/C(A+B,k) <= A/(A+kB), including k=0 by equality",
            "audit_checks": hypergeometric_checks,
            "ordered_stream_sha256": hypergeometric_stream.hexdigest().upper(),
        },
        "charts": charts,
        "coefficient_stream_sha256": coefficient_stream.hexdigest().upper(),
        "identity_audit": {
            "checks": identity_checks,
            "classifications": identity_classifications,
            "ordered_stream_sha256": identity_stream.hexdigest().upper(),
        },
        "exhaustive_partition": exhaustive_partition,
        "literal_guard": {
            "small_side_maximum": 20,
            "large_side_maximum": 120,
            "tail_cells": literal_cells,
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
            "This closes only the tail targets of one connected hub-distance-"
            "six remainder family in the isolated-marked-root m=0 lane. Other "
            "remainder forests, nonisolated marked roots, the complete "
            "terminal payment, and Erdos Problem 993 remain separate."
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
                "charts": charts,
                "graph_audit_cases": graph_cases,
                "hypergeometric_checks": hypergeometric_checks,
                "identity_checks": identity_checks,
                "identity_classifications": identity_classifications,
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
