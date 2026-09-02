#!/usr/bin/env python3
"""Rigorous rational-interval certificate for a finite PIRD failure.

The polynomial has coefficients far too large to materialize (about
81 million decimal digits near the checked rank), but every needed
coefficient divided by one common binomial coefficient is a positive
rational series.  We sum its first terms exactly and bound the
remaining tail by an exact geometric majorant.

This verifies a counterexample to the ordinary rooted PIRD lemma, not
to independence-sequence unimodality or Erdős Problem 993.
"""

from __future__ import annotations

import hashlib
import json
import math
import sys
from fractions import Fraction
from pathlib import Path

sys.set_int_max_str_digits(0)


M = 23
T = (7 * 2**M) // 5
N = M * T
ROOT_LEAVES = 2
K = 135_056_574
TRUNCATION_J = 80
OUTPUT = Path(
    "star_fork_pird_counterexample_interval_certificate_20260729.json"
)
ASSERT_PIRD_TI = True

Interval = tuple[Fraction, Fraction]


def falling(value: int, length: int) -> int:
    result = 1
    for offset in range(length):
        result *= value - offset
    return result


def add(left: Interval, right: Interval) -> Interval:
    return left[0] + right[0], left[1] + right[1]


def subtract(left: Interval, right: Interval) -> Interval:
    return left[0] - right[1], left[1] - right[0]


def multiply(left: Interval, right: Interval) -> Interval:
    # Every coefficient interval passed here is nonnegative.
    if left[0] < 0 or right[0] < 0:
        candidates = [
            left[0] * right[0],
            left[0] * right[1],
            left[1] * right[0],
            left[1] * right[1],
        ]
        return min(candidates), max(candidates)
    return left[0] * right[0], left[1] * right[1]


def scale(value: Interval, scalar: int | Fraction) -> Interval:
    if scalar >= 0:
        return value[0] * scalar, value[1] * scalar
    return value[1] * scalar, value[0] * scalar


def exact(value: int | Fraction) -> Interval:
    item = Fraction(value)
    return item, item


def sum_intervals(values) -> Interval:
    result = exact(0)
    for value in values:
        result = add(result, value)
    return result


def stable_float(value: Fraction) -> float:
    # Fraction.__float__ scales large numerator/denominator integers
    # before division and also preserves very small nonzero ratios.
    return float(value)


def binomial_ratio_to_k(rank: int) -> Fraction:
    """Return binom(N,rank)/binom(N,K) exactly for nearby ranks."""
    result = Fraction(1)
    if rank > K:
        for current in range(K, rank):
            result *= Fraction(N - current, current + 1)
    elif rank < K:
        for current in range(K - 1, rank - 1, -1):
            result *= Fraction(current + 1, N - current)
    return result


def summand_ratio(rank: int, j: int) -> Fraction:
    """Return T_{j+1}/T_j in the exact binomial expansion."""
    component_order = M * (T - j)
    component_rank = rank - j
    numerator = (
        (T - j)
        * component_rank
        * falling(
            component_order - component_rank,
            M - 1,
        )
    )
    denominator = (
        (j + 1) * falling(component_order, M)
    )
    return Fraction(numerator, denominator)


def normalized_e_interval(rank: int) -> tuple[Interval, dict]:
    """Bound E_rank/binom(N,rank) with exact rationals."""
    maximum_j = min(
        T,
        rank,
        (N - rank) // (M - 1),
    )
    if TRUNCATION_J >= maximum_j:
        raise AssertionError("truncation unexpectedly reaches support end")

    term = Fraction(1)
    partial = term
    for j in range(TRUNCATION_J):
        term *= summand_ratio(rank, j)
        partial += term

    next_term = term * summand_ratio(rank, TRUNCATION_J)
    tail_start = TRUNCATION_J + 1

    # For j >= tail_start:
    #
    # q_j <= t/(j+1) * Nj/(Nj-m+1)
    #        * ((Nj-Kj)/(Nj-m+1))^(m-1).
    #
    # The middle factor is maximized at the final supported j, and
    # the last factor decreases with j in this central range.
    final_component_order = M * (T - maximum_j)
    order_factor = Fraction(
        final_component_order,
        final_component_order - M + 1,
    )
    start_component_order = M * (T - tail_start)
    start_component_rank = rank - tail_start
    complement_ratio = Fraction(
        start_component_order - start_component_rank,
        start_component_order - M + 1,
    )
    monotonicity_numerator = (
        M * (N - rank)
        - (M - 1) * (N - M + 1)
    )
    if monotonicity_numerator >= 0:
        raise AssertionError(
            "complement-ratio monotonicity has the wrong sign"
        )
    ratio_bound = (
        Fraction(T, tail_start + 1)
        * order_factor
        * complement_ratio ** (M - 1)
    )
    if not 0 <= ratio_bound < 1:
        raise AssertionError(f"invalid geometric bound {ratio_bound}")

    tail_bound = next_term / (1 - ratio_bound)
    interval = partial, partial + tail_bound
    diagnostics = {
        "rank": rank,
        "maximum_supported_j": maximum_j,
        "truncation_j": TRUNCATION_J,
        "geometric_ratio_bound_decimal": stable_float(ratio_bound),
        "relative_interval_width_decimal": stable_float(
            tail_bound / partial
        ),
        "monotonicity_numerator_sign": (
            -1 if monotonicity_numerator < 0 else 0
        ),
    }
    return interval, diagnostics


def interval_digest(value: Interval) -> str:
    material = (
        f"{value[0].numerator}/{value[0].denominator}|"
        f"{value[1].numerator}/{value[1].denominator}"
    )
    return hashlib.sha256(material.encode("ascii")).hexdigest()


def interval_summary(value: Interval) -> dict:
    return {
        "lower_decimal": stable_float(value[0]),
        "upper_decimal": stable_float(value[1]),
        "sign_certified": (
            1 if value[0] > 0 else (-1 if value[1] < 0 else 0)
        ),
        "sha256_exact_endpoints": interval_digest(value),
    }


def main() -> None:
    needed_ranks = range(K - ROOT_LEAVES - 4, K + 4)
    s_intervals = {}
    tail_diagnostics = []
    for rank in needed_ranks:
        interval, diagnostics = normalized_e_interval(rank)
        s_intervals[rank] = interval
        tail_diagnostics.append(diagnostics)

    l = {
        rank: exact(binomial_ratio_to_k(rank))
        for rank in needed_ranks
    }
    e = {
        rank: multiply(l[rank], s_intervals[rank])
        for rank in needed_ranks
    }

    def get(values: dict[int, Interval], rank: int) -> Interval:
        return values.get(rank, exact(0))

    # P=E+x(1+x)^N, with every coefficient normalized by binom(N,K).
    p = {
        rank: add(e[rank], get(l, rank - 1))
        for rank in needed_ranks
    }
    # C=P(1+x)^ROOT_LEAVES.  The original certificate used two
    # leaves, but keeping the leaf bundle explicit lets the same exact
    # interval engine replay the wider locator family.
    c = {
        rank: sum_intervals(
            scale(
                get(p, rank - offset),
                math.comb(ROOT_LEAVES, offset),
            )
            for offset in range(ROOT_LEAVES + 1)
        )
        for rank in range(K - 2, K + 4)
    }
    d = e
    h = {
        rank: add(
            add(get(c, rank), get(d, rank)),
            get(d, rank - 1),
        )
        for rank in range(K - 1, K + 2)
    }
    b = {
        rank: add(
            add(get(c, rank), get(c, rank - 1)),
            add(get(d, rank - 1), get(d, rank - 2)),
        )
        for rank in range(K - 2, K + 4)
    }
    # Add a new vertex p adjacent to q and to the formerly isolated
    # vertex z.  This turns F=R+z into a tree T with
    # I(T)=B+xC.
    tree_polynomial = {
        rank: add(get(b, rank), get(c, rank - 1))
        for rank in range(K - 1, K + 4)
    }
    tree_differences = {
        rank: subtract(
            tree_polynomial[rank + 1],
            tree_polynomial[rank],
        )
        for rank in range(K - 1, K + 3)
    }
    root_tree = {
        rank: add(get(c, rank), get(d, rank - 1))
        for rank in range(K - 2, K + 3)
    }
    terminal_deleted_leaf = {
        rank: add(get(root_tree, rank), get(c, rank - 1))
        for rank in range(K - 1, K + 3)
    }

    b_rise = subtract(b[K + 1], b[K])
    pird_minor = subtract(
        multiply(c[K], h[K]),
        multiply(c[K + 1], h[K - 1]),
    )
    terminal_rank = K + 1
    terminal_burden = add(
        add(
            multiply(b[K + 1], b[K]),
            scale(multiply(b[K + 1], c[K]), terminal_rank),
        ),
        add(
            scale(multiply(b[K], b[K]), -1),
            add(
                scale(
                    multiply(b[K], c[K + 1]),
                    -(terminal_rank + 1),
                ),
                multiply(b[K], c[K]),
            ),
        ),
    )

    # The interval form of v-w, useful as a scale diagnostic.
    # Division of positive intervals reverses endpoints in the
    # denominator.
    def divide_positive(
        numerator: Interval, denominator: Interval
    ) -> Interval:
        if denominator[0] <= 0:
            raise AssertionError("nonpositive denominator interval")
        return (
            numerator[0] / denominator[1],
            numerator[1] / denominator[0],
        )

    def tau(
        values: dict[int, Interval], rank: int
    ) -> Interval:
        q_value = add(
            exact(1),
            subtract(
                scale(
                    divide_positive(
                        values[rank], values[rank - 1]
                    ),
                    rank,
                ),
                scale(
                    divide_positive(
                        values[rank + 1], values[rank]
                    ),
                    rank + 1,
                ),
            ),
        )
        return scale(q_value, rank)

    v = scale(divide_positive(h[K], h[K - 1]), K + 1)
    w = scale(divide_positive(c[K + 1], c[K]), K + 1)
    pird_ratio_margin = subtract(v, w)
    c12_margin = subtract(
        scale(tau(tree_polynomial, K + 1), 2),
        tau(root_tree, K),
    )

    r_value = K
    k_value = K + 1
    terminal_u = scale(
        divide_positive(root_tree[K], root_tree[K - 1]),
        r_value,
    )
    terminal_deleted_root_mean = scale(
        divide_positive(c[K], c[K - 1]),
        r_value,
    )
    component_b_margin = subtract(
        add(terminal_u, exact(1)),
        terminal_deleted_root_mean,
    )
    terminal_w = scale(
        divide_positive(root_tree[K + 1], root_tree[K]),
        k_value,
    )
    terminal_v = scale(
        divide_positive(
            terminal_deleted_leaf[K + 1],
            terminal_deleted_leaf[K],
        ),
        k_value,
    )
    u_margin = subtract(add(terminal_u, exact(1)), terminal_v)
    f_decrease_margin = subtract(exact(r_value), terminal_u)
    t_decrease_margin = subtract(exact(k_value), terminal_v)
    q_f = add(
        exact(1), subtract(terminal_u, terminal_w)
    )
    terminal_h = scale(
        divide_positive(
            terminal_deleted_leaf[K + 2],
            terminal_deleted_leaf[K + 1],
        ),
        K + 2,
    )
    q_t = add(
        exact(1), subtract(terminal_v, terminal_h)
    )
    terminal_iso_reserve = add(
        subtract(exact(k_value), terminal_v),
        multiply(terminal_v, q_t),
    )
    curvature_h = subtract(
        scale(q_t, 2 * k_value),
        scale(q_f, r_value),
    )
    likelihood_deficit_raw = subtract(terminal_w, terminal_v)
    if likelihood_deficit_raw[1] <= 0:
        likelihood_deficit = exact(0)
    elif likelihood_deficit_raw[0] >= 0:
        likelihood_deficit = likelihood_deficit_raw
    else:
        likelihood_deficit = (
            Fraction(0),
            likelihood_deficit_raw[1],
        )
    compensated_linear_margin = subtract(
        multiply(terminal_v, curvature_h),
        scale(
            likelihood_deficit,
            2 * k_value * r_value,
        ),
    )
    x_value = scale(terminal_u, Fraction(1, r_value))
    cross_ratio_margin = subtract(
        scale(terminal_u, Fraction(k_value, r_value)),
        terminal_v,
    )
    if cross_ratio_margin[0] >= 0:
        upper_likelihood_defect = exact(0)
    elif cross_ratio_margin[1] <= 0:
        upper_likelihood_defect = scale(
            cross_ratio_margin, -1
        )
    else:
        upper_likelihood_defect = (
            Fraction(0),
            -cross_ratio_margin[0],
        )
    upper_unit_cross_margin = add(
        cross_ratio_margin, exact(1)
    )
    full_square_reserve_margin = subtract(
        terminal_iso_reserve,
        multiply(
            upper_likelihood_defect,
            upper_likelihood_defect,
        ),
    )
    two_sided_compensation_margin = subtract(
        compensated_linear_margin,
        scale(
            multiply(
                upper_likelihood_defect,
                upper_likelihood_defect,
            ),
            2 * k_value,
        ),
    )
    scalar_base = add(
        scale(q_f, r_value + 4),
        scale(subtract(x_value, exact(1)), 2),
    )
    s_value = divide_positive(
        root_tree[K], terminal_deleted_leaf[K]
    )
    m_value = add(
        add(x_value, q_f),
        exact(-1),
    )
    if m_value[0] >= 0:
        log_concavity_defect_delta = exact(0)
    elif m_value[1] <= 0:
        log_concavity_defect_delta = scale(m_value, -1)
    else:
        log_concavity_defect_delta = (
            Fraction(0),
            -m_value[0],
        )
    generalized_two_sided_margin = subtract(
        two_sided_compensation_margin,
        scale(
            multiply(s_value, log_concavity_defect_delta),
            2 * k_value,
        ),
    )
    theta_value = divide_positive(
        s_value, add(x_value, s_value)
    )
    negative_cross_margin = subtract(
        add(
            multiply(terminal_v, curvature_h),
            scale(
                multiply(s_value, q_f),
                k_value * (r_value + 2),
            ),
        ),
        scale(
            add(
                multiply(
                    s_value, log_concavity_defect_delta
                ),
                multiply(
                    theta_value,
                    multiply(
                        upper_likelihood_defect,
                        upper_likelihood_defect,
                    ),
                ),
            ),
            2 * k_value,
        ),
    )
    ncl_linear_coefficient = add(
        exact(r_value + 2),
        scale(
            divide_positive(exact(1), terminal_u),
            r_value * r_value,
        ),
    )
    ncl_square_absorption_surplus = multiply(
        upper_likelihood_defect,
        subtract(
            ncl_linear_coefficient,
            scale(
                multiply(
                    theta_value, upper_likelihood_defect
                ),
                2 * k_value,
            ),
        ),
    )
    unit_paid_linear_cascade = subtract(
        negative_cross_margin,
        ncl_square_absorption_surplus,
    )

    assertions = {
        "all_tail_bounds_below_one": all(
            item["geometric_ratio_bound_decimal"] < 1
            for item in tail_diagnostics
        ),
        "B_is_strictly_rising_at_k": b_rise[0] > 0,
        "ordinary_PIRD_minor_is_strictly_negative": (
            pird_minor[1] < 0
        ),
        "ratio_form_v_minus_w_is_strictly_negative": (
            pird_ratio_margin[1] < 0
        ),
        "terminal_isolate_burden_is_strictly_negative": (
            terminal_burden[1] < 0
        ),
        "full_C12_margin_for_outer_tree_is_positive": (
            c12_margin[0] > 0
        ),
    }
    if ASSERT_PIRD_TI and not all(assertions.values()):
        raise AssertionError(assertions)

    tree_order = 2 + ROOT_LEAVES + T * (M + 1)
    report = {
        "status": (
            "PASS_RIGOROUS_INTERVAL_COUNTEREXAMPLE_TO_PIRD_AND_TI"
            if ASSERT_PIRD_TI
            else "PASS_RIGOROUS_INTERVAL_DIAGNOSTIC"
        ),
        "scope_warning": (
            "This refutes rooted PIRD and terminal-isolate burden, "
            "not unimodality of the tree or forest independence "
            "sequence and not Erdos Problem 993. The full C12 margin "
            "for the corresponding outer tree is positive."
        ),
        "parameters": {
            "m": M,
            "t": T,
            "lambda_floor_definition": "t=floor((7/5)*2^m)",
            "N_equals_m_times_t": N,
            "root_leaves": ROOT_LEAVES,
            "rank_k": K,
            "tree_order_R": tree_order,
            "forest_order_R_plus_isolate": tree_order + 1,
            "truncation_j": TRUNCATION_J,
        },
        "assertions": assertions,
        "certified_intervals": {
            "B_k_plus_1_minus_B_k_normalized": interval_summary(
                b_rise
            ),
            "PIRD_minor_normalized": interval_summary(pird_minor),
            "v_minus_w": interval_summary(pird_ratio_margin),
            "restricted_terminal_burden": interval_summary(
                terminal_burden
            ),
            "C12_margin_two_tau_outer_minus_tau_inner": (
                interval_summary(c12_margin)
            ),
            "remaining_U_margin_u_plus_one_minus_v": (
                interval_summary(u_margin)
            ),
            "terminal_deleted_root_component_B_margin": (
                interval_summary(component_b_margin)
            ),
            "F_decrease_margin_r_minus_u": interval_summary(
                f_decrease_margin
            ),
            "T_decrease_margin_k_minus_v": interval_summary(
                t_decrease_margin
            ),
            "remaining_C_cross_ratio_margin": interval_summary(
                cross_ratio_margin
            ),
            "remaining_CL_margin": interval_summary(
                compensated_linear_margin
            ),
            "two_sided_BCL_margin": interval_summary(
                two_sided_compensation_margin
            ),
            "generalized_three_defect_GBCL_margin": (
                interval_summary(generalized_two_sided_margin)
            ),
            "negative_cross_NCL_margin": interval_summary(
                negative_cross_margin
            ),
            "NCL_linear_minus_square_absorption_surplus": (
                interval_summary(
                    ncl_square_absorption_surplus
                )
            ),
            "unit_paid_linear_cascade_margin": (
                interval_summary(unit_paid_linear_cascade)
            ),
            "terminal_theta": interval_summary(theta_value),
            "local_log_concavity_M": interval_summary(m_value),
            "local_log_concavity_defect_delta": interval_summary(
                log_concavity_defect_delta
            ),
            "upper_likelihood_defect_zeta": interval_summary(
                upper_likelihood_defect
            ),
            "upper_unit_cross_margin_one_minus_zeta": (
                interval_summary(upper_unit_cross_margin)
            ),
            "terminal_ISO_reserve_R_T": interval_summary(
                terminal_iso_reserve
            ),
            "terminal_full_square_reserve_R_T_minus_zeta2": (
                interval_summary(full_square_reserve_margin)
            ),
            "remaining_CL_likelihood_deficit": interval_summary(
                likelihood_deficit
            ),
            "remaining_CL_curvature_H": interval_summary(
                curvature_h
            ),
            "exact_scalar_base_A": interval_summary(scalar_base),
            "terminal_s": interval_summary(s_value),
            "outer_tree_consecutive_differences": {
                str(rank): interval_summary(value)
                for rank, value in tree_differences.items()
            },
        },
        "tail_diagnostics": tail_diagnostics,
    }
    OUTPUT.write_text(
        json.dumps(report, indent=2) + "\n", encoding="utf-8"
    )
    print(json.dumps(report, indent=2))


if __name__ == "__main__":
    main()
