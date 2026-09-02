#!/usr/bin/env python3
"""Exact source-degree certificate at the least direct-curvature window.

The full 953-window direct and Euler-coupled census is replayed first.  At
its least direct-curvature point we then split the literal evaluated Q and R sources
by total source degree d and introduce one common formal multiplier lambda_d
for the matched pair (Q_d,R_d).  The cleared joint-curvature polynomial is
expanded exactly in these formal multipliers.

This is a finite symbolic certificate at one required path window.  It is
not an all-parameter proof of the affine bridge.
"""

from __future__ import annotations

import hashlib
import json
import math
import sys
from collections import defaultdict
from fractions import Fraction
from pathlib import Path

from probe_affine_bridge_reaggregated_boundary_layers import sources
from probe_path_isolate_p4_affine_target_rows import A, T, multiply, power
from probe_path_isolate_p4_group_affine_southwest_square_entry import evaluate


ROOT = Path(__file__).resolve().parent
HARD_SOURCE = ROOT / "affine_bridge_euler_transfer_blocks_probe_20260812.json"
OUTPUT = ROOT / (
    "affine_bridge_source_degree_coupled_tight_window_exact_20260813.json"
)

if hasattr(sys, "set_int_max_str_digits"):
    sys.set_int_max_str_digits(100_000)


def frac_record(value: Fraction) -> dict:
    return {
        "numerator": value.numerator,
        "denominator": value.denominator,
        "decimal": float(value),
    }


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def global_window_audit(hard: dict) -> dict:
    """Replay (without source splitting) all Euler-negative four-layer windows."""
    windows = 0
    direct_failures = 0
    coupled_failures = 0
    least_direct = None
    least_coupled = None
    for record in hard["records"]:
        for order in record["orders"]:
            n = order["r"] + 1
            layers = order["layers"]
            for h in range(1, n - 1):
                if layers[h + 2]["e_h"] >= 0:
                    continue
                raw = [layers[j]["rho_h"] for j in range(h - 1, h + 3)]
                if min(raw) <= 0:
                    continue
                windows += 1
                weighted = [
                    math.comb(n, j) * layers[j]["rho_h"]
                    for j in range(h - 1, h + 3)
                ]
                quotient = Fraction(
                    weighted[1] ** 3 * weighted[3],
                    weighted[0] * weighted[2] ** 3,
                )
                minus_g = Fraction(
                    -layers[h + 2]["e_h"], layers[h + 2]["rho_h"]
                )
                coupled = Fraction(h * n) * (quotient - 1) / minus_g
                metadata = {
                    "package": record["package"],
                    "parity": record["parity"],
                    "c": record.get("c"),
                    "m": record["m"],
                    "x": record["x"],
                    "n": n,
                    "h": h,
                }
                direct_failures += quotient < 1
                coupled_failures += coupled < 1
                if least_direct is None or quotient < least_direct[0]:
                    least_direct = (quotient, metadata)
                if least_coupled is None or coupled < least_coupled[0]:
                    least_coupled = (coupled, metadata)
    assert windows == 953
    assert direct_failures == 0
    assert coupled_failures == 0
    return {
        "window_count": windows,
        "direct_failures": direct_failures,
        "coupled_failures": coupled_failures,
        "least_direct": {**least_direct[1], **frac_record(least_direct[0])},
        "least_coupled": {**least_coupled[1], **frac_record(least_coupled[0])},
    }


def multiply_by_linear(
    polynomial: dict[tuple[int, ...], int], linear: dict[int, int]
) -> dict[tuple[int, ...], int]:
    result: defaultdict[tuple[int, ...], int] = defaultdict(int)
    for monomial, coefficient in polynomial.items():
        for degree, value in linear.items():
            if value:
                result[tuple(sorted((*monomial, degree)))] += coefficient * value
    return {key: value for key, value in result.items() if value}


def product_of_linears(
    linears: list[dict[int, int]], scalar: int = 1
) -> dict[tuple[int, ...], int]:
    result: dict[tuple[int, ...], int] = {(): scalar}
    for linear in linears:
        result = multiply_by_linear(result, linear)
    return result


def min_component_ratio(
    numerator: dict[int, int], denominator: dict[int, int]
) -> Fraction:
    return min(
        Fraction(numerator.get(degree, 0), value)
        for degree, value in denominator.items()
        if value > 0
    )


def tight_window_certificate(hard: dict) -> dict:
    package = "bottom"
    parity = 1
    m_value = 30
    x_value = 60
    n = 50
    h = 11
    D = m_value + n + 4
    outer_a = m_value + x_value - 3
    outer_b = 2 * m_value + parity - 5

    q_source, r_source = sources(package, parity)
    q_evaluated = evaluate(q_source, 0, m_value, x_value, D)
    r_evaluated = evaluate(r_source, 0, m_value, x_value, D)
    degrees = sorted(
        {p + q for p, q in q_evaluated} | {p + q for p, q in r_evaluated}
    )
    assert degrees == list(range(14, 36))

    # One exact common outer polynomial is enough.  Source-degree labels are
    # retained while its coefficients are queried below.
    outer = multiply(power(A, outer_a, D), power(T, outer_b, D), D)

    def source_degree_row(source: dict, j: int) -> dict[int, int]:
        result: defaultdict[int, int] = defaultdict(int)
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

    reserve = {
        j: source_degree_row(r_evaluated, j) for j in range(h - 1, h + 3)
    }
    q_h_plus_2 = source_degree_row(q_evaluated, h + 2)
    e_h_plus_2 = {
        degree: q_h_plus_2.get(degree, 0)
        + (h + 2) * reserve[h + 2].get(degree, 0)
        for degree in degrees
    }

    # Cross-check every degree aggregation against the stored literal Q,R
    # reconstruction at this exact hard order.
    hard_record = next(
        record
        for record in hard["records"]
        if record["package"] == package
        and record["parity"] == parity
        and record["m"] == m_value
        and record["x"] == x_value
    )
    hard_order = next(order for order in hard_record["orders"] if order["r"] == n - 1)
    for j in range(h - 1, h + 3):
        layer = hard_order["layers"][j]
        assert sum(reserve[j].values()) == math.comb(n, j) * layer["rho_h"]
        if j == h + 2:
            assert sum(q_h_plus_2.values()) == math.comb(n, j) * layer["q_h"]
            assert sum(e_h_plus_2.values()) == math.comb(n, j) * layer["e_h"]

    # With a_j(lambda)=sum_d lambda_d a_(j,d) and similarly for e, expand
    # Gamma exactly.  The useful two-product form is
    #   hn*a_h^3*a_(h+2)^2
    #   +(e_(h+2)-hn*a_(h+2))*a_(h-1)*a_(h+1)^3.
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
        [
            signed_source,
            reserve[h - 1],
            reserve[h + 1],
            reserve[h + 1],
            reserve[h + 1],
        ]
    )
    gamma: defaultdict[tuple[int, ...], int] = defaultdict(int)
    for monomial, coefficient in positive.items():
        gamma[monomial] += coefficient
    for monomial, coefficient in signed.items():
        gamma[monomial] += coefficient
    gamma = defaultdict(int, {key: value for key, value in gamma.items() if value})

    negative = {key: value for key, value in gamma.items() if value < 0}
    zero_count = sum(value == 0 for value in gamma.values())
    assert not negative
    assert zero_count == 0
    assert len(gamma) == 63_756

    # lambda_d=1 recovers the literal cleared target exactly.
    a = {j: sum(reserve[j].values()) for j in reserve}
    e = sum(e_h_plus_2.values())
    direct_gamma = (
        h * n * a[h + 2] * (a[h] ** 3 * a[h + 2] - a[h - 1] * a[h + 1] ** 3)
        + e * a[h - 1] * a[h + 1] ** 3
    )
    assert sum(gamma.values()) == direct_gamma
    assert direct_gamma > 0

    # Record a reproducible digest of every exact coefficient without making
    # the JSON report tens of megabytes long.
    digest = hashlib.sha256()
    for monomial, coefficient in sorted(gamma.items()):
        digest.update(
            (",".join(map(str, monomial)) + ":" + str(coefficient) + "\n").encode(
                "ascii"
            )
        )
    least_monomial, least_coefficient = min(gamma.items(), key=lambda item: item[1])

    # A tempting factor-by-factor coefficient injection is insufficient.
    # Split the signed source into its negative part and pair the five linear
    # factors in the most natural local way.
    debt = {
        degree: max(-value, 0) for degree, value in signed_source.items() if value < 0
    }
    factor_bound = Fraction(h * n)
    factor_bound *= min_component_ratio(reserve[h], reserve[h - 1])
    factor_bound *= min_component_ratio(reserve[h], reserve[h + 1]) ** 2
    factor_bound *= min_component_ratio(reserve[h + 2], reserve[h + 1])
    factor_bound *= min_component_ratio(reserve[h + 2], debt)
    assert factor_bound < 1

    return {
        "parameters": {
            "package": package,
            "parity": parity,
            "m": m_value,
            "x": x_value,
            "n": n,
            "h": h,
            "D": D,
            "outer_a": outer_a,
            "outer_b": outer_b,
        },
        "formal_coupling": (
            "Q(lambda)=sum_d lambda_d Q_d and R(lambda)=sum_d lambda_d R_d, "
            "where d is total source degree; the same lambda_d multiplies the "
            "matched literal Q_d,R_d pair"
        ),
        "source_degree_support": degrees,
        "q_source_monomial_count_after_specialization": len(q_evaluated),
        "r_source_monomial_count_after_specialization": len(r_evaluated),
        "nonzero_gamma_coefficient_count": len(gamma),
        "strictly_positive_gamma_coefficient_count": sum(
            value > 0 for value in gamma.values()
        ),
        "negative_gamma_coefficient_count": len(negative),
        "zero_gamma_coefficient_count_among_nonzero_support": zero_count,
        "coefficient_stream_sha256": digest.hexdigest().upper(),
        "least_absolute_coefficient": {
            "source_degree_multiset": list(least_monomial),
            "coefficient": least_coefficient,
        },
        "gamma_at_all_lambda_equal_one": direct_gamma,
        "natural_factor_by_factor_injection_bound": frac_record(factor_bound),
        "natural_factor_by_factor_injection_passes": factor_bound >= 1,
        "conclusion": (
            "At the globally least direct-curvature path window, Gamma_h(lambda) is "
            "coefficientwise strictly positive under matched total-source-degree "
            "Q,R scaling.  The simpler factor-by-factor injection fails, so the "
            "certificate uses genuine joint coefficient cancellation."
        ),
    }


def main() -> None:
    hard = json.loads(HARD_SOURCE.read_text(encoding="utf-8"))
    global_audit = global_window_audit(hard)
    tight = tight_window_certificate(hard)
    assert global_audit["least_direct"]["package"] == "bottom"
    assert global_audit["least_direct"]["parity"] == 1
    assert global_audit["least_direct"]["m"] == 30
    assert global_audit["least_direct"]["x"] == 60
    assert global_audit["least_direct"]["n"] == 50
    assert global_audit["least_direct"]["h"] == 11

    report = {
        "status": "PASS_EXACT_TIGHT_WINDOW_SOURCE_DEGREE_COUPLED_CERTIFICATE",
        "global_required_window_replay": global_audit,
        "tight_window_symbolic_certificate": tight,
        "theorem_reduction": (
            "The cleared Euler-coupled target Gamma_h is exactly a homogeneous "
            "degree-five polynomial after a matched source-degree scaling of the "
            "literal Q,R packages.  Coefficientwise nonnegativity in these formal "
            "variables is sufficient for the original lambda_d=1 inequality."
        ),
        "scope_warning": (
            "The formal reduction is all-order algebra.  Coefficientwise positivity "
            "is certified here only at the globally least direct-curvature member "
            "of the existing 953-window hard census.  The 953 lambda_d=1 checks remain exact finite "
            "evidence, not an all-parameter theorem, and no allowed path-window "
            "counterexample was found."
        ),
        "input_sha256": {HARD_SOURCE.name: sha256(HARD_SOURCE)},
    }
    OUTPUT.write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(report, indent=2))
    print("script_sha256", sha256(Path(__file__)))
    print("report_sha256", sha256(OUTPUT))


if __name__ == "__main__":
    main()
