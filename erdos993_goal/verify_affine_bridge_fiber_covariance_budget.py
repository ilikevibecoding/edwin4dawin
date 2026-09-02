#!/usr/bin/env python3
"""Exact covariance budget after complete colour-fibre summation.

Individual v-branches can be born inside a required window.  This replay
also verifies that no *complete* binomial v-fibre is born there, so the
ordinary four-positive-layer mixture lemma applies to all 953 windows.
"""

from __future__ import annotations

import hashlib
import json
import sys
from collections import defaultdict
from fractions import Fraction
from pathlib import Path

from verify_affine_bridge_laguerre_jensen_reduction import (
    atom_weighted_value,
    choose,
    reserve_core,
)


ROOT = Path(__file__).resolve().parent
SOURCE = ROOT / "affine_bridge_euler_transfer_blocks_probe_20260812.json"
OUTPUT = ROOT / "affine_bridge_fiber_covariance_budget_exact_20260813.json"

if hasattr(sys, "set_int_max_str_digits"):
    sys.set_int_max_str_digits(100_000)


def frac_record(value: Fraction, metadata: dict | None = None) -> dict:
    return {
        "numerator": value.numerator,
        "denominator": value.denominator,
        "decimal": float(value),
        **(metadata or {}),
    }


def atom_value(n, j, A, B, alpha, beta):
    return atom_weighted_value(n, A, B, alpha, beta, j)


def main() -> None:
    hard = json.loads(SOURCE.read_text(encoding="utf-8"))
    cores = {
        (package, parity): reserve_core(package, parity)
        for package in ("group", "bottom")
        for parity in (0, 1)
    }
    window_count = 0
    internal_branch_birth_windows = 0
    full_fiber_birth_count = 0
    failures = 0
    positive_covariance_count = 0
    minimum_certificate = None
    minimum_by_family = {}

    for record in hard["records"]:
        package = record["package"]
        parity = record["parity"]
        c_value = record.get("c", 0)
        m_value = record["m"]
        x_value = record["x"]
        sources = defaultdict(int)
        for monomial, coefficient in cores[package, parity].terms():
            p, q, c_power, m_power, x_power = monomial
            value = (
                int(coefficient)
                * c_value**c_power
                * m_value**m_power
                * x_value**x_power
            )
            if value:
                sources[p, q] += value

        if package == "group":
            outer_a = 2 * c_value + m_value + x_value - 1
            outer_b = 2 * m_value + parity + 1
        else:
            outer_a = m_value + x_value - 1
            outer_b = 2 * m_value + parity

        for order in record["orders"]:
            if not order["negative_h"]:
                continue
            terminal_negative = max(order["negative_h"])
            if terminal_negative < 3:
                continue
            n = order["r"] + 1
            target = m_value + n + 4
            for ell in range(1, terminal_negative - 1):
                h = terminal_negative - ell - 1
                fibers = []
                has_internal_branch_birth = False
                for (p, q), source_weight in sources.items():
                    row = [0, 0, 0, 0]
                    for v in range(outer_b + 1):
                        A = outer_a + v
                        B = outer_a + outer_b - v
                        alpha = target - p - v
                        beta = target - q - outer_b + v
                        if alpha < 0 or beta < 0:
                            continue
                        branch = [
                            atom_value(n, j, A, B, alpha, beta)
                            for j in range(h - 1, h + 3)
                        ]
                        if not branch[0] and any(branch[1:]):
                            has_internal_branch_birth = True
                        branch_weight = choose(outer_b, v)
                        for index in range(4):
                            row[index] += branch_weight * branch[index]
                    if not row[0] and any(row[1:]):
                        full_fiber_birth_count += 1
                    if row[0]:
                        assert all(row)
                        fibers.append((source_weight, tuple(row)))

                window_count += 1
                if has_internal_branch_birth:
                    internal_branch_birth_windows += 1
                assert fibers

                totals = [
                    sum(weight * row[index] for weight, row in fibers)
                    for index in range(4)
                ]
                # The layer-(h-1) probability is pi=weight*row[0]/totals[0].
                # With x=row[1]/row[0] and y=row[2]/row[1],
                # E(y)=sum weight*row[0]*row[2]/row[1]/totals[0].
                mean_y = sum(
                    Fraction(weight * row[0] * row[2], row[1])
                    for weight, row in fibers
                ) / totals[0]
                mean_x = Fraction(totals[1], totals[0])
                mean_xy = Fraction(totals[2], totals[0])
                covariance_inflation = mean_xy / (mean_x * mean_y)
                if covariance_inflation > 1:
                    positive_covariance_count += 1

                # For a fibre Q=x*z/y^2 and xyz=Q*y^3.  Thus if all
                # Q>=lambda, E(xyz)>=lambda E(y^3)>=lambda E(y)^3.
                lambda_min = min(
                    Fraction(row[1] ** 3 * row[3], row[0] * row[2] ** 3)
                    for _, row in fibers
                )
                certificate = lambda_min / covariance_inflation**3
                if certificate < 1:
                    failures += 1

                full_quotient = Fraction(
                    totals[1] ** 3 * totals[3], totals[0] * totals[2] ** 3
                )
                assert full_quotient >= certificate
                metadata = {
                    "package": package,
                    "parity": parity,
                    "c": c_value if package == "group" else None,
                    "m": m_value,
                    "x": x_value,
                    "n": n,
                    "h": h,
                    "fiber_count": len(fibers),
                    "weakest_fiber_quotient": frac_record(lambda_min),
                    "covariance_inflation": frac_record(covariance_inflation),
                    "full_mixture_quotient": frac_record(full_quotient),
                }
                entry = (certificate, metadata)
                if minimum_certificate is None or certificate < minimum_certificate[0]:
                    minimum_certificate = entry
                family = f"{package}:{parity}"
                if (
                    family not in minimum_by_family
                    or certificate < minimum_by_family[family][0]
                ):
                    minimum_by_family[family] = entry

    assert window_count == 953
    assert internal_branch_birth_windows == 209
    assert full_fiber_birth_count == 0
    assert positive_covariance_count == 953
    assert failures == 0

    result = {
        "status": "PASS_EXACT_FIBER_COVARIANCE_BUDGET_ON_ALL_REQUIRED_WINDOWS",
        "all_order_lemma": (
            "For a positive four-layer mixture, let pi be proportional to "
            "omega*a_(h-1), x=a_h/a_(h-1), y=a_(h+1)/a_h, "
            "z=a_(h+2)/a_(h+1), and Q=x*z/y^2. If Q>=lambda for every "
            "component, then Q_mix >= lambda*(E(x)E(y)/E(xy))^3. This is "
            "xyz=Q*y^3 followed by Jensen E(y^3)>=E(y)^3."
        ),
        "required_windows_checked": window_count,
        "windows_with_internal_v_branch_births": internal_branch_birth_windows,
        "complete_v_fiber_birth_count": full_fiber_birth_count,
        "windows_with_strictly_positive_xy_covariance": positive_covariance_count,
        "sufficient_budget_failures": failures,
        "minimum_certificate_lambda_over_inflation_cubed": {
            **frac_record(minimum_certificate[0]),
            **minimum_certificate[1],
        },
        "minimum_certificate_by_family": {
            family: {**frac_record(value[0]), **value[1]}
            for family, value in sorted(minimum_by_family.items())
        },
        "warning": (
            "The displayed mixture lemma is all-order. The verification of its "
            "two hypotheses for the path source is exact but finite on all 953 "
            "currently required windows. Internal branch births are retained "
            "inside the complete v-fibre components."
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
