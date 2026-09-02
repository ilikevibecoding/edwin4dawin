#!/usr/bin/env python3
"""All-order merged payment and exact path audit of full-fibre split loss."""

from __future__ import annotations

import hashlib
import json
import sys
from collections import defaultdict
from fractions import Fraction
from pathlib import Path

import sympy as sp

from verify_affine_bridge_laguerre_jensen_reduction import (
    atom_weighted_value,
    choose,
    reserve_core,
)


ROOT = Path(__file__).resolve().parent
SOURCE = ROOT / "affine_bridge_euler_transfer_blocks_probe_20260812.json"
OUTPUT = ROOT / "affine_bridge_full_fiber_split_budget_exact_20260813.json"
if hasattr(sys, "set_int_max_str_digits"):
    sys.set_int_max_str_digits(100_000)


def fraction_record(value: Fraction, metadata: dict | None = None) -> dict:
    return {
        "numerator": value.numerator,
        "denominator": value.denominator,
        "decimal": float(value),
        **(metadata or {}),
    }


def main() -> None:
    # All-order merged-payment theorem.  The one-colour merged row is
    # M_j=binom(n,j)2^(j+b)binom(E,alpha-j).  Put
    # n=2h+2+s, alpha=2n-2+q-s, E=alpha+t.
    h, H, s, q, t = sp.symbols("h H s q t", nonnegative=True)
    n = 2 * h + 2 + s
    alpha = 2 * n - 2 + q - s
    E = alpha + t
    q_binomial = (
        (h + 1) ** 2
        * (n - h + 1)
        * (n - h - 1)
        / (h * (h + 2) * (n - h) ** 2)
    )
    q_raw = (
        ((alpha - h) ** 2 - 1)
        * (t + h + 1) ** 2
        / ((alpha - h) ** 2 * (t + h) * (t + h + 2))
    )
    merged_budget = sp.factor(q_binomial * q_raw * (1 - 1 / (h * E**2)) - 1)
    merged_numerator, merged_denominator = sp.fraction(merged_budget)

    # The t-dependent part is decreasing.  With r=t+h its logarithmic
    # derivative has the sign of
    # 1/[E(hE^2-1)]-1/[r(r+1)(r+2)].  Verify the denominator domination
    # coefficientwise after h=H+1, r=R+1, E=r+1+G.
    R, G = sp.symbols("R G", nonnegative=True)
    hh = H + 1
    rr = R + 1
    EE = rr + 1 + G
    derivative_denominator_gap = sp.Poly(
        sp.expand(EE * (hh * EE**2 - 1) - rr * (rr + 1) * (rr + 2)),
        H,
        R,
        G,
    )
    derivative_coefficients = [
        int(coefficient) for _, coefficient in derivative_denominator_gap.terms()
    ]
    assert all(coefficient >= 0 for coefficient in derivative_coefficients)

    # Hence the minimum on 0<=t<=2h+28s is the right endpoint.  Its
    # numerator is coefficientwise strictly positive after h=H+1.
    endpoint_numerator = sp.Poly(
        sp.expand(
            merged_numerator.subs(t, 2 * h + 28 * s).subs(h, H + 1)
        ),
        H,
        s,
        q,
    )
    endpoint_coefficients = [
        int(coefficient) for _, coefficient in endpoint_numerator.terms()
    ]
    assert all(coefficient > 0 for coefficient in endpoint_coefficients)
    denominator_at_one = sp.factor(
        merged_denominator.subs({h: 1, s: 0, q: 0, t: 0})
    )
    assert denominator_at_one > 0

    hard = json.loads(SOURCE.read_text(encoding="utf-8"))
    cores = {
        (package, parity): reserve_core(package, parity)
        for package in ("group", "bottom")
        for parity in (0, 1)
    }
    fiber_count = 0
    split_bound_failures = 0
    maximum_normalized_loss = None
    minimum_merged_candidate_payment = None

    for record in hard["records"]:
        package = record["package"]
        parity = record["parity"]
        c_value = record.get("c", 0)
        m_value = record["m"]
        x_value = record["x"]
        sources = defaultdict(int)
        for monomial, coefficient in cores[package, parity].terms():
            p, q0, c_power, m_power, x_power = monomial
            value = (
                int(coefficient)
                * c_value**c_power
                * m_value**m_power
                * x_value**x_power
            )
            if value:
                sources[p, q0] += value

        if package == "group":
            outer_a = 2 * c_value + m_value + x_value - 1
            outer_b = 2 * m_value + parity + 1
        else:
            outer_a = m_value + x_value - 1
            outer_b = 2 * m_value + parity
        merged_E = 2 * outer_a + outer_b

        for order in record["orders"]:
            if not order["negative_h"]:
                continue
            terminal_negative = max(order["negative_h"])
            if terminal_negative < 3:
                continue
            n_value = order["r"] + 1
            target = m_value + n_value + 4
            for ell in range(1, terminal_negative - 1):
                h_value = terminal_negative - ell - 1
                for p, q0 in sources:
                    row = [0, 0, 0, 0]
                    for v in range(outer_b + 1):
                        alpha_v = target - p - v
                        beta_v = target - q0 - outer_b + v
                        if alpha_v < 0 or beta_v < 0:
                            continue
                        branch_weight = choose(outer_b, v)
                        for index, layer in enumerate(
                            range(h_value - 1, h_value + 3)
                        ):
                            row[index] += branch_weight * atom_weighted_value(
                                n_value,
                                outer_a + v,
                                outer_a + outer_b - v,
                                alpha_v,
                                beta_v,
                                layer,
                            )
                    if not row[0]:
                        continue
                    assert all(row)
                    fiber_count += 1
                    q_fiber = Fraction(
                        row[1] ** 3 * row[3], row[0] * row[2] ** 3
                    )
                    degree = p + q0
                    merged_alpha = 2 * target - degree - outer_b
                    excess = merged_E - merged_alpha
                    q_merged = Fraction(
                        (h_value + 1) ** 2
                        * (n_value - h_value + 1)
                        * (n_value - h_value - 1),
                        h_value
                        * (h_value + 2)
                        * (n_value - h_value) ** 2,
                    ) * Fraction(
                        ((merged_alpha - h_value) ** 2 - 1)
                        * (excess + h_value + 1) ** 2,
                        (merged_alpha - h_value) ** 2
                        * (excess + h_value)
                        * (excess + h_value + 2),
                    )
                    correction = q_fiber / q_merged
                    candidate = 1 - Fraction(
                        1, h_value * merged_E * merged_E
                    )
                    if correction < candidate:
                        split_bound_failures += 1
                    normalized_loss = (
                        (1 - correction) * h_value * merged_E * merged_E
                    )
                    metadata = {
                        "package": package,
                        "parity": parity,
                        "c": c_value if package == "group" else None,
                        "m": m_value,
                        "x": x_value,
                        "n": n_value,
                        "h": h_value,
                        "p": p,
                        "q": q0,
                        "E": merged_E,
                        "fiber_quotient": fraction_record(q_fiber),
                        "merged_quotient": fraction_record(q_merged),
                        "split_correction": fraction_record(correction),
                    }
                    if (
                        maximum_normalized_loss is None
                        or normalized_loss > maximum_normalized_loss[0]
                    ):
                        maximum_normalized_loss = (normalized_loss, metadata)
                    payment = q_merged * candidate
                    if (
                        minimum_merged_candidate_payment is None
                        or payment < minimum_merged_candidate_payment[0]
                    ):
                        minimum_merged_candidate_payment = (payment, metadata)

    assert fiber_count == 97_608
    assert split_bound_failures == 0
    result = {
        "status": "PASS_ALL_ORDER_MERGED_PAYMENT_AND_EXACT_SPLIT_LOSS_AUDIT",
        "full_fiber_collapse": (
            "For fixed source z^p w^q, summing v with binom(b,v) gives "
            "F_h=[z^(D-p)w^(D-q)](z+w)^h A^a T^b. Its total-degree "
            "merge is S_h=2^(h+b)binom(E,alpha-h), where E=2a+b and "
            "alpha=2D-(p+q)-b."
        ),
        "exact_factorization": (
            "Q_fiber=Q_merged*C_h, C_h=P_h^3 P_(h+2)/"
            "(P_(h-1)P_(h+1)^3), P_h=F_h/S_h."
        ),
        "all_order_merged_payment": (
            "For h>=1,s,q>=0, n=2h+2+s, alpha=2n-2+q-s, "
            "E=alpha+t, and 0<=t<=2h+28s, "
            "Q_merged*(1-1/(hE^2))>=1."
        ),
        "monotonicity_gap_coefficient_count": len(derivative_coefficients),
        "monotonicity_gap_minimum_coefficient": min(derivative_coefficients),
        "endpoint_positive_monomial_count": len(endpoint_coefficients),
        "endpoint_minimum_coefficient": min(endpoint_coefficients),
        "full_fibers_checked": fiber_count,
        "candidate_split_bound": "C_h>=1-1/(hE^2)",
        "candidate_split_bound_failures": split_bound_failures,
        "maximum_normalized_split_loss_hE2_times_1_minus_C": {
            **fraction_record(maximum_normalized_loss[0]),
            **maximum_normalized_loss[1],
        },
        "minimum_merged_candidate_payment": {
            **fraction_record(minimum_merged_candidate_payment[0]),
            **minimum_merged_candidate_payment[1],
        },
        "warning": (
            "The merged payment theorem is all-order and coefficient-certified. "
            "The split-loss inequality is still an all-order conjecture; its "
            "97,608 checks are exact finite evidence on the required records."
        ),
    }
    OUTPUT.write_text(json.dumps(result, indent=2) + "\n", encoding="utf-8")
    result["sha256"] = {
        SOURCE.name: hashlib.sha256(SOURCE.read_bytes()).hexdigest().upper(),
        OUTPUT.name: hashlib.sha256(OUTPUT.read_bytes()).hexdigest().upper(),
    }
    print(json.dumps(result, indent=2))


if __name__ == "__main__":
    main()
