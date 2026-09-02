#!/usr/bin/env python3
"""Exact audit and no-go for Euler-coupled direct affine curvature.

The useful direct target is the adjacent-curvature quotient of the complete
weighted reserve row, before any colour-fibre split or source-degree mixture
bound.  This replay checks the target on every positive four-layer window in
the hard Euler records and proves that the Euler sign by itself is not an
abstract implication, even with a PF-infinity reserve and the other elementary
sign/endpoint conditions.
"""

from __future__ import annotations

import hashlib
import json
import math
import sys
from fractions import Fraction
from pathlib import Path


ROOT = Path(__file__).resolve().parent
SOURCE = ROOT / "affine_bridge_euler_transfer_blocks_probe_20260812.json"
CHAMBER_COUNTEREXAMPLE = (
    ROOT / "affine_bridge_split_chamber_counterexample_exact_20260813.json"
)
OUTPUT = ROOT / "affine_bridge_euler_coupled_joint_curvature_exact_20260813.json"

if hasattr(sys, "set_int_max_str_digits"):
    sys.set_int_max_str_digits(100_000)


def frac_record(value: Fraction, metadata: dict | None = None) -> dict:
    return {
        "numerator": value.numerator,
        "denominator": value.denominator,
        "decimal": float(value),
        **(metadata or {}),
    }


def convolve_linear(coefficients: list[Fraction], root_parameter: Fraction):
    """Multiply sum c_j y^j by 1+root_parameter*y."""
    result = [Fraction(0)] * (len(coefficients) + 1)
    for j, coefficient in enumerate(coefficients):
        result[j] += coefficient
        result[j + 1] += root_parameter * coefficient
    return result


def main() -> None:
    hard = json.loads(SOURCE.read_text(encoding="utf-8"))

    positive_windows = 0
    euler_negative_windows = 0
    euler_nonnegative_windows = 0
    negative_direct_failures = 0
    nonnegative_direct_failures = 0
    negative_coupled_failures = 0
    minimum_negative_quotient = None
    minimum_nonnegative_quotient = None
    minimum_coupled_ratio = None

    for record in hard["records"]:
        for order in record["orders"]:
            n = order["r"] + 1
            layers = order["layers"]

            # The stored records have the observed initial sign interval.
            negative_indices = [
                j for j, layer in enumerate(layers) if layer["e_h"] < 0
            ]
            if negative_indices:
                assert negative_indices == list(range(max(negative_indices) + 1))

            for h in range(1, n - 1):
                raw_rho = [layers[j]["rho_h"] for j in range(h - 1, h + 3)]
                if min(raw_rho) <= 0:
                    continue
                positive_windows += 1
                weighted = [
                    math.comb(n, j) * layers[j]["rho_h"]
                    for j in range(h - 1, h + 3)
                ]
                quotient = Fraction(
                    weighted[1] ** 3 * weighted[3],
                    weighted[0] * weighted[2] ** 3,
                )
                metadata = {
                    "package": record["package"],
                    "parity": record["parity"],
                    "c": record.get("c") if record["package"] == "group" else None,
                    "m": record["m"],
                    "x": record["x"],
                    "n": n,
                    "h": h,
                    "e_h_plus_2": layers[h + 2]["e_h"],
                }

                if layers[h + 2]["e_h"] < 0:
                    euler_negative_windows += 1
                    negative_direct_failures += quotient < 1
                    if (
                        minimum_negative_quotient is None
                        or quotient < minimum_negative_quotient[0]
                    ):
                        minimum_negative_quotient = (quotient, metadata)

                    # Put g_j=e_j/rho_j.  The source-coupled strengthening
                    # Q_mix >= 1-g_(h+2)/(h*n) is equivalent to
                    # h*n*(Q_mix-1)/(-g_(h+2)) >= 1.
                    debt_ratio = Fraction(
                        -layers[h + 2]["e_h"], layers[h + 2]["rho_h"]
                    )
                    coupled_ratio = (quotient - 1) * h * n / debt_ratio
                    negative_coupled_failures += coupled_ratio < 1
                    coupled_metadata = {
                        **metadata,
                        "direct_full_mixture_quotient": frac_record(quotient),
                        "minus_g_h_plus_2": frac_record(debt_ratio),
                    }
                    if (
                        minimum_coupled_ratio is None
                        or coupled_ratio < minimum_coupled_ratio[0]
                    ):
                        minimum_coupled_ratio = (coupled_ratio, coupled_metadata)
                else:
                    euler_nonnegative_windows += 1
                    nonnegative_direct_failures += quotient < 1
                    if (
                        minimum_nonnegative_quotient is None
                        or quotient < minimum_nonnegative_quotient[0]
                    ):
                        minimum_nonnegative_quotient = (quotient, metadata)

    assert positive_windows == 17_970
    assert euler_negative_windows == 953
    assert euler_nonnegative_windows == 17_017
    assert negative_direct_failures == 0
    assert nonnegative_direct_failures == 9_077
    assert negative_coupled_failures == 0

    # The known literal path-fibre split counterexample is outside the Euler
    # source: t_-=3 whereas its failing h=4 would require e_6<0.
    chamber = json.loads(CHAMBER_COUNTEREXAMPLE.read_text(encoding="utf-8"))
    chamber_h = chamber["parameters"]["h"]
    chamber_t = chamber["terminal_negative"]
    assert chamber_h == 4 and chamber_t == 3
    assert chamber_h + 2 > chamber_t

    # Abstract no-go.  The raw reserve is the coefficient row of a polynomial
    # with only negative roots.  Ten tiny positive root parameters make all
    # layers through n=18 strictly positive without disturbing the curvature
    # reversal inherited from the eight-root example.
    root_parameters = [
        Fraction(1),
        Fraction(1),
        Fraction(3),
        Fraction(3),
        Fraction(5),
        Fraction(10),
        Fraction(20),
        Fraction(20),
        *([Fraction(1, 1000)] * 10),
    ]
    rho = [Fraction(1)]
    for root_parameter in root_parameters:
        rho = convolve_linear(rho, root_parameter)
    abstract_n = 18
    abstract_h = 5
    abstract_t = 7
    weighted = [math.comb(abstract_n, j) * rho[j] for j in range(abstract_n + 1)]
    abstract_quotient = Fraction(
        weighted[abstract_h] ** 3 * weighted[abstract_h + 2],
        weighted[abstract_h - 1] * weighted[abstract_h + 1] ** 3,
    )
    g = [Fraction(-1) if j <= abstract_t else Fraction(1) for j in range(19)]
    e = [g[j] * rho[j] for j in range(19)]
    q = [e[j] - j * rho[j] for j in range(19)]
    assert abstract_quotient < 1
    assert e[abstract_h + 2] < 0
    assert abstract_n == 2 * abstract_t + 4
    assert [j for j, value in enumerate(e) if value < 0] == list(
        range(abstract_t + 1)
    )
    assert all(g[j + 1] >= g[j] for j in range(18))
    assert all(g[j + 1] - 2 * g[j] + g[j - 1] >= 0 for j in range(1, abstract_t))
    assert all(q[j] + j * rho[j] == e[j] for j in range(19))

    result = {
        "status": "PASS_EXACT_EULER_COUPLED_WINDOWS_AND_ABSTRACT_NO_GO",
        "direct_identity": (
            "For a_j=binom(n,j)*rho_j, the unsplit full-reserve target is "
            "Q_mix=a_h^3*a_(h+2)/(a_(h-1)*a_(h+1)^3)>=1. It is exactly "
            "the full positive-mixture curvature quotient, so it bypasses "
            "both the per-fibre split bound and the covariance envelope."
        ),
        "source_coupled_candidate": (
            "With g_j=e_j/rho_j, every exact Euler-negative window satisfies "
            "Q_mix>=1-g_(h+2)/(h*n), equivalently "
            "h*n*a_(h+2)*(a_h^3*a_(h+2)-a_(h-1)*a_(h+1)^3)"
            "+binom(n,h+2)*e_(h+2)*a_(h-1)*a_(h+1)^3>=0."
        ),
        "all_positive_four_layer_windows": positive_windows,
        "e_h_plus_2_negative_windows": euler_negative_windows,
        "direct_curvature_failures_when_e_h_plus_2_negative": negative_direct_failures,
        "source_coupled_candidate_failures": negative_coupled_failures,
        "minimum_direct_quotient_when_e_h_plus_2_negative": {
            **frac_record(minimum_negative_quotient[0]),
            **minimum_negative_quotient[1],
        },
        "minimum_coupled_ratio_hn_Qminus1_over_minus_g": {
            **frac_record(minimum_coupled_ratio[0]),
            **minimum_coupled_ratio[1],
        },
        "e_h_plus_2_nonnegative_windows": euler_nonnegative_windows,
        "direct_curvature_failures_when_e_h_plus_2_nonnegative": (
            nonnegative_direct_failures
        ),
        "minimum_direct_quotient_when_e_h_plus_2_nonnegative": {
            **frac_record(minimum_nonnegative_quotient[0]),
            **minimum_nonnegative_quotient[1],
        },
        "known_path_split_counterexample_exclusion": {
            "h": chamber_h,
            "terminal_negative": chamber_t,
            "required_euler_index_h_plus_2": chamber_h + 2,
            "conclusion": "outside Euler-negative reflection scope",
        },
        "abstract_sign_constrained_counterexample": {
            "n": abstract_n,
            "h": abstract_h,
            "terminal_negative": abstract_t,
            "endpoint_slack_n_minus_2t_minus_2": abstract_n - 2 * abstract_t - 2,
            "raw_reserve_polynomial": (
                "product_(r in {1,1,3,3,5,10,20,20,"
                "1/1000 repeated 10})(1+r*y)"
            ),
            "reserve_property": (
                "strictly positive PF-infinity coefficient row of degree 18"
            ),
            "g_sequence": "g_j=-1 for j<=7 and g_j=1 for j>=8",
            "properties_retained": [
                "initial Euler-negative interval through t=7",
                "e_(h+2)<0 at h=5",
                "endpoint equality n=2t+4",
                "nondecreasing g=e/rho determinant orientation",
                "negative-block discrete convexity of g",
            ],
            "direct_full_mixture_quotient": frac_record(abstract_quotient),
            "conclusion": (
                "Euler sign, endpoint slack, PF-infinity, determinant "
                "orientation, and negative-side g convexity do not imply "
                "the direct reserve curvature inequality abstractly."
            ),
        },
        "warning": (
            "The 953 Euler-negative checks and the stronger coupled candidate "
            "are exact finite evidence, not an all-order proof. The abstract "
            "counterexample is theorem-level and shows that any proof must use "
            "the precise path relation between Q and R, not the sign of "
            "e=q+h*rho alone."
        ),
    }
    OUTPUT.write_text(json.dumps(result, indent=2) + "\n", encoding="utf-8")
    result["sha256"] = {
        SOURCE.name: hashlib.sha256(SOURCE.read_bytes()).hexdigest().upper(),
        CHAMBER_COUNTEREXAMPLE.name: hashlib.sha256(
            CHAMBER_COUNTEREXAMPLE.read_bytes()
        ).hexdigest().upper(),
        OUTPUT.name: hashlib.sha256(OUTPUT.read_bytes()).hexdigest().upper(),
    }
    print(json.dumps(result, indent=2))


if __name__ == "__main__":
    main()
