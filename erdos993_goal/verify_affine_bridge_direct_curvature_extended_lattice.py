#!/usr/bin/env python3
"""Extended exact path audit and a strict-interlacing Euler no-go.

The path part checks the direct adjacent-curvature target and the stronger
Euler-coupled target on every genuine reflection window in the 208-record
parameter lattice used by the earlier local-reflection replay.  The abstract
part strengthens the previous PF-infinity warning: the Euler companion is
the literal differential pencil y*R'(y)-8*R(y), and it strictly interlaces R.
"""

from __future__ import annotations

import hashlib
import json
import math
import sys
from fractions import Fraction
from pathlib import Path

from probe_affine_bridge_euler_transfer_large_ray import targeted_outer
from probe_affine_bridge_reaggregated_boundary_layers import sources
from probe_path_isolate_p4_group_affine_southwest_square_entry import evaluate


ROOT = Path(__file__).resolve().parent
OUTPUT = ROOT / "affine_bridge_direct_curvature_extended_lattice_exact_20260813.json"

if hasattr(sys, "set_int_max_str_digits"):
    sys.set_int_max_str_digits(100_000)


def choose(n: int, k: int) -> int:
    return math.comb(n, k) if 0 <= k <= n else 0


def homogeneous(poly: dict[tuple[int, int], int], target: int, h: int) -> int:
    return sum(
        choose(h, p) * poly.get((target - p, target - h + p), 0)
        for p in range(h + 1)
    )


def fraction_record(value: Fraction, metadata: dict | None = None) -> dict:
    return {
        "numerator": value.numerator,
        "denominator": value.denominator,
        "decimal": float(value),
        **(metadata or {}),
    }


def convolve_linear(coefficients: list[Fraction], root_parameter: Fraction):
    result = [Fraction(0)] * (len(coefficients) + 1)
    for index, coefficient in enumerate(coefficients):
        result[index] += coefficient
        result[index + 1] += root_parameter * coefficient
    return result


def polynomial_value(coefficients: list[Fraction], argument: Fraction):
    result = Fraction(0)
    for coefficient in reversed(coefficients):
        result = result * argument + coefficient
    return result


def derivative(coefficients: list[Fraction]):
    return [index * coefficient for index, coefficient in enumerate(coefficients)][1:]


def audit_record(
    package: str,
    parity: int,
    parameters: tuple[int, ...],
    maximum_k: int,
    q_source,
    r_source,
):
    if package == "group":
        c_value, m_value, x_value = parameters
        a_value = 2 * c_value + m_value + x_value - 3
        b_value = 2 * m_value + parity - 4
        metadata = {
            "package": package,
            "parity": parity,
            "c": c_value,
            "m": m_value,
            "x": x_value,
        }
    else:
        m_value, x_value = parameters
        c_value = 0
        a_value = m_value + x_value - 3
        b_value = 2 * m_value + parity - 5
        metadata = {
            "package": package,
            "parity": parity,
            "c": None,
            "m": m_value,
            "x": x_value,
        }

    low = m_value + 4
    high = m_value + maximum_k + 5
    q_numeric = evaluate(q_source, c_value, m_value, x_value, high)
    r_numeric = evaluate(r_source, c_value, m_value, x_value, high)
    q_outer, _ = targeted_outer(q_numeric, a_value, b_value, low, high)
    r_outer, _ = targeted_outer(r_numeric, a_value, b_value, low, high)

    result = {
        "orders_with_negative_layers": 0,
        "required_window_count": 0,
        "direct_failure_count": 0,
        "coupled_failure_count": 0,
        "minimum_direct": None,
        "minimum_coupled_ratio": None,
    }

    for order in range(maximum_k + 1):
        n = order + 1
        target = m_value + order + 5
        layers = []
        for h in range(n + 1):
            rho_h = homogeneous(r_outer, target, h)
            q_h = homogeneous(q_outer, target, h)
            layers.append((q_h, rho_h, q_h + h * rho_h))

        negative = [h for h, (_, _, e_h) in enumerate(layers) if e_h < 0]
        if not negative:
            continue
        assert negative == list(range(max(negative) + 1))
        result["orders_with_negative_layers"] += 1
        terminal = max(negative)

        # The reflection range is h=t-ell-1, 1<=ell<t-1, equivalently
        # 1<=h<=t-2.  In particular e_(h+2)<0 in every such window.
        for h in range(1, terminal - 1):
            assert layers[h + 2][2] < 0
            raw_rho = [layers[j][1] for j in range(h - 1, h + 3)]
            assert min(raw_rho) > 0
            weighted = [choose(n, j) * layers[j][1] for j in range(h - 1, h + 3)]
            quotient = Fraction(
                weighted[1] ** 3 * weighted[3],
                weighted[0] * weighted[2] ** 3,
            )
            minus_g = Fraction(-layers[h + 2][2], layers[h + 2][1])
            coupled_ratio = Fraction(h * n, 1) * (quotient - 1) / minus_g
            window_metadata = {
                **metadata,
                "n": n,
                "h": h,
                "terminal_negative": terminal,
                "left_defect_n_minus_2h_minus_2": n - 2 * h - 2,
            }

            result["required_window_count"] += 1
            result["direct_failure_count"] += quotient < 1
            result["coupled_failure_count"] += coupled_ratio < 1
            if result["minimum_direct"] is None or quotient < result["minimum_direct"][0]:
                result["minimum_direct"] = (quotient, window_metadata)
            if (
                result["minimum_coupled_ratio"] is None
                or coupled_ratio < result["minimum_coupled_ratio"][0]
            ):
                result["minimum_coupled_ratio"] = (
                    coupled_ratio,
                    {
                        **window_metadata,
                        "direct_quotient": fraction_record(quotient),
                        "minus_g_h_plus_2": fraction_record(minus_g),
                    },
                )
    return result


def strict_interlacing_no_go() -> dict:
    # All parameters are distinct.  The first eight are a rational
    # perturbation of the earlier eight-root curvature reversal; the ten
    # small parameters fill the row to degree n=18 while preserving it.
    root_parameters = [
        Fraction(1),
        Fraction(101, 100),
        Fraction(3),
        Fraction(301, 100),
        Fraction(5),
        Fraction(10),
        Fraction(20),
        Fraction(2001, 100),
        *[Fraction(index, 1000) for index in range(1, 11)],
    ]
    assert len(root_parameters) == len(set(root_parameters)) == 18
    assert all(parameter > 0 for parameter in root_parameters)

    rho = [Fraction(1)]
    for parameter in root_parameters:
        rho = convolve_linear(rho, parameter)

    n = 18
    h = 5
    c = 8
    q = [-c * coefficient for coefficient in rho]
    e = [(index - c) * coefficient for index, coefficient in enumerate(rho)]
    g = [Fraction(index - c) for index in range(n + 1)]
    weighted = [choose(n, index) * rho[index] for index in range(n + 1)]
    quotient = Fraction(
        weighted[h] ** 3 * weighted[h + 2],
        weighted[h - 1] * weighted[h + 1] ** 3,
    )
    minus_g = -g[h + 2]
    coupled_ratio = Fraction(h * n, 1) * (quotient - 1) / minus_g

    assert q == [e[index] - index * rho[index] for index in range(n + 1)]
    assert [index for index, value in enumerate(e) if value < 0] == list(range(8))
    assert e[8] == 0 and all(value > 0 for value in e[9:])
    assert n == 2 * 7 + 4 and e[h + 2] < 0
    assert all(g[index + 1] > g[index] for index in range(n))
    assert all(g[index + 1] - 2 * g[index] + g[index - 1] == 0 for index in range(1, n))
    assert quotient < 1 and coupled_ratio < 1

    # Exact strict-interlacing certificate.  R has the distinct negative
    # roots alpha_i=-1/r_i.  For E=yR'-cR, E(alpha_i)=alpha_i R'(alpha_i).
    # The signs alternate at consecutive alpha_i, giving one E-root in each
    # negative gap.  E(0)<0 and its leading coefficient is positive, giving
    # the final positive root.  These n disjoint intervals exhaust degree n.
    r_derivative = derivative(rho)
    roots = sorted((-1 / parameter for parameter in root_parameters))
    e_at_roots = []
    for alpha in roots:
        r_prime_at_alpha = polynomial_value(r_derivative, alpha)
        value = alpha * r_prime_at_alpha
        assert value != 0
        e_at_roots.append(value)
    assert all(
        e_at_roots[index] * e_at_roots[index + 1] < 0
        for index in range(n - 1)
    )
    assert e[0] < 0 and e[-1] > 0

    return {
        "n": n,
        "h": h,
        "terminal_negative": 7,
        "endpoint_slack_n_minus_2t_minus_2": n - 2 * 7 - 2,
        "root_parameters": [str(parameter) for parameter in root_parameters],
        "reserve_polynomial": "R(y)=product_i(1+r_i*y), with distinct r_i>0",
        "euler_companion": "E(y)=y*R'(y)-8*R(y)",
        "coefficient_relation": "q_j=-8*rho_j and e_j=q_j+j*rho_j=(j-8)rho_j",
        "strict_interlacing_certificate": (
            "At alpha_i=-1/r_i, E(alpha_i)=alpha_i*R'(alpha_i) has alternating "
            "nonzero signs; hence E has one root in every consecutive negative "
            "R-root gap. E(0)<0 and LC(E)>0 give its remaining root on (0,infinity)."
        ),
        "direct_quotient": fraction_record(quotient),
        "coupled_ratio_hn_Qminus1_over_minus_g": fraction_record(coupled_ratio),
        "properties_retained": [
            "strictly positive PF-infinity reserve row",
            "distinct negative reserve roots",
            "strict Euler/reserve polynomial interlacing with one positive Euler root",
            "literal differential Euler coupling E=yR'-8R",
            "initial negative interval through t=7 and e_8=0",
            "endpoint equality n=2t+4",
            "strictly increasing affine g=e/rho",
            "zero discrete curvature of g",
        ],
        "conclusion": (
            "Even strict polynomial proper position and a literal Euler differential "
            "coupling do not imply the direct or strengthened curvature target."
        ),
    }


def main() -> None:
    maximum_k = 20
    records = []
    for package in ("group", "bottom"):
        for parity in (0, 1):
            q_source, r_source = sources(package, parity)
            points = (
                [
                    (c_value, m_value, x_value)
                    for c_value in range(1, 4)
                    for m_value in range(3, 9)
                    for x_value in (0, 1, 2, 2 * m_value)
                ]
                if package == "group"
                else [
                    (m_value, x_value)
                    for m_value in range(3, 11)
                    for x_value in (0, 1, 2, 2 * m_value)
                ]
            )
            for parameters in points:
                records.append(
                    {
                        "package": package,
                        "parity": parity,
                        "parameters": parameters,
                        **audit_record(
                            package,
                            parity,
                            parameters,
                            maximum_k,
                            q_source,
                            r_source,
                        ),
                    }
                )
            print(package, parity, "done", len(points), flush=True)

    window_count = sum(record["required_window_count"] for record in records)
    direct_failures = sum(record["direct_failure_count"] for record in records)
    coupled_failures = sum(record["coupled_failure_count"] for record in records)
    nonempty = [record for record in records if record["required_window_count"]]
    minimum_direct = min(nonempty, key=lambda record: record["minimum_direct"][0])
    minimum_coupled = min(
        nonempty, key=lambda record: record["minimum_coupled_ratio"][0]
    )
    minimum_direct_record = fraction_record(
        minimum_direct["minimum_direct"][0],
        minimum_direct["minimum_direct"][1],
    )
    minimum_coupled_record = fraction_record(
        minimum_coupled["minimum_coupled_ratio"][0],
        minimum_coupled["minimum_coupled_ratio"][1],
    )
    for record in records:
        if record["minimum_direct"] is not None:
            value, metadata = record["minimum_direct"]
            record["minimum_direct"] = fraction_record(value, metadata)
        if record["minimum_coupled_ratio"] is not None:
            value, metadata = record["minimum_coupled_ratio"]
            record["minimum_coupled_ratio"] = fraction_record(value, metadata)

    result = {
        "status": "PASS_EXACT_EXTENDED_PATH_LATTICE_AND_STRICT_INTERLACING_NO_GO",
        "path_scope": (
            "group 1<=c<=3, 3<=m<=8, x in {0,1,2,2m}; bottom "
            "3<=m<=10, x in {0,1,2,2m}; both parities; 0<=k<=20"
        ),
        "path_record_count": len(records),
        "genuine_required_window_count": window_count,
        "direct_curvature_failure_count": direct_failures,
        "coupled_candidate_failure_count": coupled_failures,
        "minimum_direct_quotient": minimum_direct_record,
        "minimum_coupled_ratio": minimum_coupled_record,
        "strict_interlacing_differential_no_go": strict_interlacing_no_go(),
        "records": records,
        "warning": (
            "The path lattice is exact finite evidence, not an all-order theorem. "
            "The strict-interlacing differential counterexample is theorem-level "
            "and rules out another abstract closure; it is not a path-source failure."
        ),
    }
    assert len(records) == 208
    assert window_count > 0
    assert direct_failures == coupled_failures == 0
    OUTPUT.write_text(json.dumps(result, indent=2) + "\n", encoding="utf-8")
    result["sha256"] = {
        Path(__file__).name: hashlib.sha256(Path(__file__).read_bytes()).hexdigest().upper(),
        OUTPUT.name: hashlib.sha256(OUTPUT.read_bytes()).hexdigest().upper(),
    }
    print(json.dumps({key: value for key, value in result.items() if key != "records"}, indent=2))


if __name__ == "__main__":
    main()
