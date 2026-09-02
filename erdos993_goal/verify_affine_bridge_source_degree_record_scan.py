#!/usr/bin/env python3
"""Exact coefficient scan on one complete required affine-bridge record.

The scan keeps the literal matched Q,R total-degree polarization from
verify_affine_bridge_source_degree_coupled_certificate.py.  It covers every
Euler-negative required window in the group/even record
(c,m,x)=(1,12,24), rather than selecting a single window.

This is a bounded exact certificate/counterexample search, not an all-order
proof of the affine bridge.
"""

from __future__ import annotations

import hashlib
import json
import math
import sys
from collections import defaultdict
from fractions import Fraction
from pathlib import Path

import sympy as sp

from probe_affine_bridge_reaggregated_boundary_layers import sources
from probe_path_isolate_p4_affine_target_rows import A, T, multiply, power
from probe_path_isolate_p4_group_affine_southwest_square_entry import evaluate
from verify_affine_bridge_laguerre_jensen_reduction import (
    A as A_expr,
    GENS,
    T as T_expr,
    reserve_core,
)


ROOT = Path(__file__).resolve().parent
SOURCE = ROOT / "affine_bridge_euler_transfer_blocks_probe_20260812.json"
OUTPUT = ROOT / "affine_bridge_source_degree_record_scan_exact_20260813.json"

if hasattr(sys, "set_int_max_str_digits"):
    sys.set_int_max_str_digits(100_000)


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def frac_record(value: Fraction) -> dict:
    return {
        "numerator": value.numerator,
        "denominator": value.denominator,
        "decimal": float(value),
    }


def multiply_by_linear(polynomial, linear):
    result = defaultdict(int)
    for monomial, coefficient in polynomial.items():
        for degree, value in linear.items():
            if value:
                result[tuple(sorted((*monomial, degree)))] += coefficient * value
    return {key: value for key, value in result.items() if value}


def product_of_linears(linears, scalar=1):
    result = {(): scalar}
    for linear in linears:
        result = multiply_by_linear(result, linear)
    return result


def min_component_ratio(numerator, denominator):
    return min(
        Fraction(numerator.get(degree, 0), value)
        for degree, value in denominator.items()
        if value > 0
    )


def main() -> None:
    hard = json.loads(SOURCE.read_text(encoding="utf-8"))
    record = next(
        item for item in hard["records"]
        if item["package"] == "group"
        and item["parity"] == 0
        and item["c"] == 1
        and item["m"] == 12
        and item["x"] == 24
    )

    package, parity = "group", 0
    c_value, m_value, x_value = 1, 12, 24
    outer_a = 2 * c_value + m_value + x_value - 3
    outer_b = 2 * m_value + parity - 4
    maximum_n = max(order["r"] + 1 for order in record["orders"])
    maximum_D = m_value + maximum_n + 4

    q_source, r_source = sources(package, parity)

    # The positive reserve has the advertised nine-class normalized core:
    # R=A^2*T^5*R_core with z,w degrees 8,...,16.  But the signed Q source
    # is not divisible even by (1+z), so the matched pair cannot both be
    # reduced to those nine classes by cancelling the reserve common factor.
    core = reserve_core(package, parity)
    core_degrees = sorted({monomial[0] + monomial[1] for monomial, _ in core.terms()})
    assert core_degrees == list(range(8, 17))
    reconstructed_r = core * sp.Poly(A_expr**2 * T_expr**5, *GENS, domain=sp.ZZ)
    assert dict(reconstructed_r.terms()) == r_source
    q_at_z_minus_one = defaultdict(int)
    for (p, q, c_power, m_power, x_power), coefficient in q_source.items():
        q_at_z_minus_one[q, c_power, m_power, x_power] += (-1) ** p * coefficient
    q_at_z_minus_one = {
        monomial: coefficient
        for monomial, coefficient in q_at_z_minus_one.items()
        if coefficient
    }
    assert q_at_z_minus_one
    q_nondivisibility_witness = min(q_at_z_minus_one.items())

    q_evaluated = evaluate(q_source, c_value, m_value, x_value, maximum_D)
    r_evaluated = evaluate(r_source, c_value, m_value, x_value, maximum_D)
    degrees = sorted(
        {p + q for p, q in q_evaluated} | {p + q for p, q in r_evaluated}
    )
    assert degrees == list(range(12, 32))

    outer = multiply(
        power(A, outer_a, maximum_D),
        power(T, outer_b, maximum_D),
        maximum_D,
    )

    def source_degree_row(source, n, j, D):
        result = defaultdict(int)
        binomial_n = math.comb(n, j)
        for (p, q), coefficient in source.items():
            value = sum(
                math.comb(j, u)
                * outer.get((D - p - u, D - q - j + u), 0)
                for u in range(j + 1)
            )
            if value:
                result[p + q] += binomial_n * coefficient * value
        return dict(result)

    windows = []
    coefficient_digest = hashlib.sha256()
    total_nonzero = 0
    total_negative = 0
    total_zero_after_cancellation = 0
    factor_bound_failures = 0
    minimum_factor_bound = None
    first_negative = None

    for order in record["orders"]:
        n = order["r"] + 1
        D = m_value + n + 4
        layers = order["layers"]
        for h in range(1, n - 1):
            if layers[h + 2]["e_h"] >= 0:
                continue
            if min(layers[j]["rho_h"] for j in range(h - 1, h + 3)) <= 0:
                continue

            reserve = {
                j: source_degree_row(r_evaluated, n, j, D)
                for j in range(h - 1, h + 3)
            }
            q_h_plus_2 = source_degree_row(q_evaluated, n, h + 2, D)
            e_h_plus_2 = {
                degree: q_h_plus_2.get(degree, 0)
                + (h + 2) * reserve[h + 2].get(degree, 0)
                for degree in degrees
            }

            for j in range(h - 1, h + 3):
                assert sum(reserve[j].values()) == math.comb(n, j) * layers[j]["rho_h"]
            assert sum(q_h_plus_2.values()) == math.comb(n, h + 2) * layers[h + 2]["q_h"]
            assert sum(e_h_plus_2.values()) == math.comb(n, h + 2) * layers[h + 2]["e_h"]

            positive = product_of_linears(
                [reserve[h], reserve[h], reserve[h], reserve[h + 2], reserve[h + 2]],
                h * n,
            )
            signed_source = {
                degree: e_h_plus_2.get(degree, 0)
                - h * n * reserve[h + 2].get(degree, 0)
                for degree in degrees
            }
            signed = product_of_linears(
                [signed_source, reserve[h - 1], reserve[h + 1], reserve[h + 1], reserve[h + 1]]
            )

            all_keys = set(positive) | set(signed)
            gamma = {
                key: positive.get(key, 0) + signed.get(key, 0)
                for key in all_keys
            }
            negative = {key: value for key, value in gamma.items() if value < 0}
            zero_count = sum(value == 0 for value in gamma.values())
            gamma = {key: value for key, value in gamma.items() if value}

            a = {j: sum(reserve[j].values()) for j in reserve}
            e = sum(e_h_plus_2.values())
            direct_gamma = (
                h * n * a[h + 2]
                * (a[h] ** 3 * a[h + 2] - a[h - 1] * a[h + 1] ** 3)
                + e * a[h - 1] * a[h + 1] ** 3
            )
            assert sum(gamma.values()) == direct_gamma
            assert direct_gamma > 0

            for monomial, coefficient in sorted(gamma.items()):
                coefficient_digest.update(
                    (f"n={n},h={h};" + ",".join(map(str, monomial))
                     + ":" + str(coefficient) + "\n").encode("ascii")
                )

            debt = {
                degree: max(-value, 0)
                for degree, value in signed_source.items()
                if value < 0
            }
            factor_bound = Fraction(h * n)
            factor_bound *= min_component_ratio(reserve[h], reserve[h - 1])
            factor_bound *= min_component_ratio(reserve[h], reserve[h + 1]) ** 2
            factor_bound *= min_component_ratio(reserve[h + 2], reserve[h + 1])
            factor_bound *= min_component_ratio(reserve[h + 2], debt)
            factor_bound_failures += factor_bound < 1
            if minimum_factor_bound is None or factor_bound < minimum_factor_bound[0]:
                minimum_factor_bound = (factor_bound, n, h)

            if negative and first_negative is None:
                monomial, coefficient = min(negative.items(), key=lambda item: item[1])
                first_negative = {
                    "n": n,
                    "h": h,
                    "source_degree_multiset": list(monomial),
                    "coefficient": coefficient,
                }

            total_nonzero += len(gamma)
            total_negative += len(negative)
            total_zero_after_cancellation += zero_count
            windows.append({
                "n": n,
                "h": h,
                "nonzero_coefficients": len(gamma),
                "negative_coefficients": len(negative),
                "zero_coefficients_after_cancellation": zero_count,
                "gamma_at_all_lambda_equal_one": direct_gamma,
                "natural_factor_bound": frac_record(factor_bound),
            })
            print(
                f"window {len(windows):02d}: n={n} h={h} "
                f"coeff={len(gamma)} neg={len(negative)}",
                flush=True,
            )

    assert len(windows) == 27
    report = {
        "status": (
            "EXACT_REQUIRED_WINDOW_COEFFICIENT_COUNTEREXAMPLE"
            if first_negative is not None
            else "PASS_EXACT_COMPLETE_RECORD_COEFFICIENT_SCAN"
        ),
        "scope": {
            "package": package,
            "parity": parity,
            "c": c_value,
            "m": m_value,
            "x": x_value,
            "required_windows": len(windows),
            "source_degree_support": degrees,
        },
        "nine_class_common_factor_no_go": {
            "reserve_normalized_degree_support": core_degrees,
            "reserve_normalized_degree_class_count": len(core_degrees),
            "exact_reserve_factorization": "R=A^2*T^5*R_core",
            "q_divisible_by_one_plus_z": False,
            "q_at_z_minus_one_witness": {
                "monomial_w_c_m_x": list(q_nondivisibility_witness[0]),
                "coefficient": q_nondivisibility_witness[1],
            },
            "conclusion": (
                "The reserve-only nine-class core cannot be used as a common "
                "Q,R source polarization: Q lacks even the factor (1+z), hence "
                "lacks the reserve factor A^2*T^5."
            ),
        },
        "total_nonzero_gamma_coefficients": total_nonzero,
        "total_negative_gamma_coefficients": total_negative,
        "total_zero_coefficients_after_cancellation": total_zero_after_cancellation,
        "first_negative_coefficient": first_negative,
        "coefficient_stream_sha256": coefficient_digest.hexdigest().upper(),
        "natural_factor_bound_failures": factor_bound_failures,
        "minimum_natural_factor_bound": {
            **frac_record(minimum_factor_bound[0]),
            "n": minimum_factor_bound[1],
            "h": minimum_factor_bound[2],
        },
        "windows": windows,
        "exact_interpretation": (
            "Each window expands the homogeneous degree-five Gamma_h(lambda) "
            "under matched literal Q_d,R_d total-degree scaling and checks every "
            "integer coefficient.  lambda_d=1 is independently cross-checked "
            "against the stored literal q,rho,e layer values."
        ),
        "scope_warning": (
            "This is a complete exact scan of one 27-window hard record, not an "
            "all-parameter theorem and not a scan of all 953 required windows."
        ),
        "input_sha256": {SOURCE.name: sha256(SOURCE)},
    }
    OUTPUT.write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    print(json.dumps({key: value for key, value in report.items() if key != "windows"}, indent=2))
    print("script_sha256", sha256(Path(__file__)))
    print("report_sha256", sha256(OUTPUT))


if __name__ == "__main__":
    main()
