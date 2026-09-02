#!/usr/bin/env python3
"""Exact low-degree active balanced-cap forest-m1 cones for j=4 or j=5."""

from __future__ import annotations

import argparse
import hashlib
import json
from pathlib import Path

import sympy as sp

import probe_terminal_q3_m1_general_forest_j4j5_balanced_cap_fast_agent as probe
from prove_terminal_q3_m1_general_forest_j8plus_agent import sha256, tensor_bernstein


HERE = Path(__file__).resolve().parent
PINNED = {
    "probe_terminal_q3_m1_general_forest_j4j5_balanced_cap_fast_agent.py":
        "C544E4858929DB55B0B779DF98A0A42AA3698156188D590DC7A3F7A3C05BCF79",
    "prove_terminal_q3_m1_general_forest_j8plus_agent.py":
        "3854DA3117F6BB8653E1D98495866121D2C2DA92A077EA741C5FFBDF981D1BCE",
    "terminal_q3_m1_general_forest_j8plus_exact_agent_20260829.json":
        "60F970B393314511563BFA6D18CDFD27554659EB7EEAC0EFDE009ACE81FEB667",
    "derive_terminal_q3_m1_general_forest_agent.py":
        "348DB21007B705120538CBA087D67DA40C97295CEA522523A6105078074A1A4C",
    "FOREST_M1_ALLR_BALANCED_NEIGHBOR_SHADOW_CAP_ROOT_2026-08-29.md":
        "188CF568BB8B06A7DC30905C2C42251826C91A9561F6308198D4C0D04E304D57",
}


def verify_pins():
    for filename, expected in PINNED.items():
        actual = sha256(HERE / filename)
        assert actual == expected, (filename, actual, expected)


def run_target(target: int):
    assert target in (4, 5)
    records = {}
    stream = hashlib.sha256()
    totals = {
        "families": 0,
        "bernstein_coefficients": 0,
        "monomial_coefficients": 0,
        "zero_monomial_coefficients": 0,
    }
    global_minimum = None

    def recorder(name, expression, box_variables, unbounded_variables):
        nonlocal global_minimum
        assert name.startswith(f"j{target}_"), name
        if box_variables:
            degrees, coefficients = tensor_bernstein(expression, box_variables)
        else:
            degrees = ()
            coefficients = [sp.Poly(expression, *unbounded_variables).as_expr()]
        monomial_count = zero_count = 0
        local_minimum = None
        for index, coefficient in enumerate(coefficients):
            terms = sp.Poly(coefficient, *unbounded_variables).terms()
            assert terms
            for powers, value in terms:
                monomial_count += 1
                assert value >= 0, (name, index, powers, value)
                zero_count += value == 0
                if value > 0:
                    local_minimum = (
                        value if local_minimum is None
                        else min(local_minimum, value)
                    )
            stream.update(f"{name}|{index}|{coefficient}\n".encode())
        assert local_minimum is not None
        global_minimum = (
            local_minimum if global_minimum is None
            else min(global_minimum, local_minimum)
        )
        records[name] = {
            "box_degrees": list(degrees),
            "bernstein_coefficients": len(coefficients),
            "monomial_coefficients": monomial_count,
            "zero_monomial_coefficients": zero_count,
            "minimum_positive_coefficient": str(local_minimum),
        }
        totals["families"] += 1
        totals["bernstein_coefficients"] += len(coefficients)
        totals["monomial_coefficients"] += monomial_count
        totals["zero_monomial_coefficients"] += zero_count
        print(name, "PASS", len(coefficients), monomial_count, flush=True)

    original = probe.coefficient_check
    probe.coefficient_check = recorder
    try:
        probe.main((target,))
    finally:
        probe.coefficient_check = original

    expected_families = {4: 60, 5: 120}[target]
    assert totals["families"] == expected_families, totals
    assert totals["zero_monomial_coefficients"] == 0, totals
    return {
        "target": target,
        "domain": (
            "N>=13, 1<=d<=j, B=N-2h-1>0, "
            "R=dq+s with integers q>=0 and 0<=s<d"
        ),
        "active_partition": (
            "K=N-d-q=2h+(d-1)q+s+L >= 2j-2, where "
            "L=N-2h-d-R>=0"
        ),
        "parameterization": {
            "d=1_high_h": "h=j-1+H; q=Q; L>=0",
            "d=1_fixed_h": "1<=h<=j-2; L=2j-2-2h+E; q=Q",
            "d>=2_high_h": (
                "h=j-1+H; A=(d-1)q+L; "
                "q=A*u/(d-1), L=A(1-u)"
            ),
            "d>=2_fixed_h": (
                "A=max(0,2j-2-2h-s)+E; "
                "q=A*u/(d-1), L=A(1-u)"
            ),
        },
        "cap": (
            "y<=C(S,j)/[C(S,j)+(d-s)C(K-j+2,j-1)"
            "+sC(K-j+1,j-1)]"
        ),
        "denominator_signs": (
            "On K>=2j-2 the path-floor binomials are nonnegative and "
            "C(S,j)>0, so the cap denominator is positive. B>0 makes the "
            "cleared correlated-low denominator positive; B=0 is separate."
        ),
        "records": records,
        "totals": totals,
        "minimum_positive_coefficient": str(global_minimum),
        "ordered_coefficient_stream_sha256": stream.hexdigest().upper(),
    }


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--target", type=int, choices=(4, 5), required=True)
    args = parser.parse_args()
    verify_pins()
    certificate = run_target(args.target)
    output = HERE / (
        f"terminal_q3_m1_general_forest_j{args.target}_balanced_cap_active_"
        "exact_agent_20260829.json"
    )
    marker = (
        f"PASS_EXACT_ALL_ORDER_FOREST_M1_J{args.target}_LOW_DEGREE_"
        "ACTIVE_BALANCED_CAP_ENDPOINT"
    )
    report = {
        "schema": "terminal-q3-m1-general-forest-balanced-cap-active-exact-agent-v1",
        "date": "2026-08-29",
        "status": marker,
        "claim": (
            f"For target j={args.target}, N>=13, 1<=d<=j, B>0, and active "
            "K>=2j-2, the balanced-neighbor cap endpoint makes both exact "
            "square-dropped W boundaries of the Gap-retaining forest-m1 "
            "lower nonnegative."
        ),
        "pinned_sha256": PINNED,
        "certificate": certificate,
        "scope": (
            "Modular positive-y active endpoint only. The common W2/M/y0/B0 "
            "cone, inactive strips, finite order, and other targets are "
            "separate inputs."
        ),
        "source": Path(__file__).name,
        "source_sha256": sha256(Path(__file__).resolve()),
    }
    output.write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    print(marker)
    print("SOURCE", report["source_sha256"])
    print("REPORT", sha256(output))


if __name__ == "__main__":
    main()
