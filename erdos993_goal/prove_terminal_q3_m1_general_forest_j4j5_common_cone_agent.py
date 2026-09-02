#!/usr/bin/env python3
"""Exact common forest-m1 cone for fixed targets j=4,5.

This certifies the W-square, FQ32-margin coefficient, B=0 face, and y=0
endpoint families used by both the high- and low-root-degree cap sectors.
"""

from __future__ import annotations

import hashlib
import json
from pathlib import Path

import sympy as sp

from prove_terminal_q3_m1_general_forest_j8plus_agent import (
    certificate_expressions,
    generic_identities,
    sha256,
    tensor_bernstein,
)


HERE = Path(__file__).resolve().parent
OUTPUT = HERE / "terminal_q3_m1_general_forest_j4j5_common_cone_exact_agent_20260829.json"
PINNED = {
    "prove_terminal_q3_m1_general_forest_j8plus_agent.py":
        "3854DA3117F6BB8653E1D98495866121D2C2DA92A077EA741C5FFBDF981D1BCE",
    "terminal_q3_m1_general_forest_j8plus_exact_agent_20260829.json":
        "60F970B393314511563BFA6D18CDFD27554659EB7EEAC0EFDE009ACE81FEB667",
    "derive_terminal_q3_m1_general_forest_agent.py":
        "348DB21007B705120538CBA087D67DA40C97295CEA522523A6105078074A1A4C",
}


def verify_pins():
    for filename, expected in PINNED.items():
        actual = sha256(HERE / filename)
        assert actual == expected, (filename, actual, expected)


def certificate():
    (numerator, _den, mnum, _mden, variables, tests, endpoint_denominators) = (
        certificate_expressions()
    )
    j, r, h, d, _R, W, y = variables
    w2 = sp.Poly(numerator, W).coeff_monomial(W**2)
    assert sp.Poly(w2, y).degree() <= 1
    assert sp.Poly(mnum, y).degree() <= 1
    selected = (
        "W2_y0", "W2_y1",
        "M_coefficient_y0", "M_coefficient_y_slope",
        "Bzero_y0", "Bzero_y1",
        "y0_low_zero", "y0_low_max",
        "y0_high_zero", "y0_high_max",
    )
    S, u, v = sp.symbols("S u v", nonnegative=True)
    records = {}
    stream = hashlib.sha256()
    total_bernstein = total_power = total_zero = 0
    global_minimum = None
    for jvalue in (4, 5):
        substitution = {
            j: jvalue,
            r: 13 - jvalue + S,
            h: 1 + (10 + S) * u / 2,
            d: 1 + (10 + S) * (1 - u) * v,
        }
        for name in selected:
            expression = sp.expand(tests[name].subs(substitution, simultaneous=True))
            degrees, coefficients = tensor_bernstein(expression, (u, v))
            powers_all = []
            for index, coefficient in enumerate(coefficients):
                powers = sp.Poly(coefficient, S).all_coeffs()
                assert powers and all(value >= 0 for value in powers), (
                    jvalue, name, index, coefficient
                )
                powers_all.extend(powers)
                stream.update(f"j{jvalue}|{name}|{index}|{coefficient}\n".encode())
            positives = [value for value in powers_all if value > 0]
            assert positives
            local_minimum = min(positives)
            global_minimum = (
                local_minimum if global_minimum is None
                else min(global_minimum, local_minimum)
            )
            key = f"j{jvalue}_{name}"
            records[key] = {
                "degrees_u_v": list(degrees),
                "bernstein_coefficients": len(coefficients),
                "power_coefficients_in_S": len(powers_all),
                "zero_power_coefficients": sum(value == 0 for value in powers_all),
                "minimum_positive_power_coefficient": str(local_minimum),
            }
            total_bernstein += len(coefficients)
            total_power += len(powers_all)
            total_zero += sum(value == 0 for value in powers_all)
            print(key, "PASS", len(coefficients), len(powers_all), flush=True)
    return {
        "parameterization": (
            "N=13+S; h=1+(10+S)u/2; "
            "d=1+(10+S)(1-u)v; (u,v) in [0,1]^2"
        ),
        "mapping": {
            "B": "N-2h-1=(10+S)(1-u)>=0",
            "root_slack": "N-2h-d=(10+S)(1-u)(1-v)>=0",
            "lambda": "(d-1)/B=v on B>0",
        },
        "selected_families": list(selected),
        "endpoint_denominators": endpoint_denominators,
        "records": records,
        "total_bernstein_coefficients": total_bernstein,
        "total_power_coefficients_in_S": total_power,
        "zero_power_coefficients": total_zero,
        "minimum_positive_power_coefficient": str(global_minimum),
        "ordered_coefficient_stream_sha256": stream.hexdigest().upper(),
    }


def main():
    verify_pins()
    generic = generic_identities()
    result = certificate()
    report = {
        "schema": "terminal-q3-m1-general-forest-j4j5-common-cone-exact-agent-v1",
        "date": "2026-08-29",
        "status": "PASS_EXACT_ALL_ORDER_FOREST_M1_J4J5_COMMON_CONE",
        "claim": (
            "For j in {4,5} and N>=13, the W^2 coefficient is nonnegative "
            "for 0<=y<=1, the FQ32 margin coefficient is nonnegative for "
            "y>=0, and every B=0 and y=0 boundary needed by the fixed-rank "
            "forest-m1 reduction is nonnegative."
        ),
        "pinned_sha256": PINNED,
        "generic_and_domain": generic,
        "certificate": result,
        "scope": (
            "Modular common cone only. The adverse positive-y endpoint is "
            "supplied by separate high-degree relative-cap and low-degree "
            "balanced-neighbor-cap certificates."
        ),
        "source": Path(__file__).name,
        "source_sha256": sha256(Path(__file__).resolve()),
    }
    OUTPUT.write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    print(report["status"])
    print("SOURCE", report["source_sha256"])
    print("REPORT", sha256(OUTPUT))


if __name__ == "__main__":
    main()
