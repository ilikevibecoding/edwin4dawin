#!/usr/bin/env python3
"""Exact supported high-degree forest-m1 cap endpoints for j=4,5.

This is one modular input to the final fixed-rank theorem.  It certifies the
adverse y-cap endpoint after the common nonnegative W^2 term is removed.
"""

from __future__ import annotations

import hashlib
import json
from pathlib import Path

import sympy as sp

from derive_terminal_q3_m1_general_forest_agent import C
from prove_terminal_q3_m1_general_forest_j8plus_agent import (
    certificate_expressions,
    sha256,
    tensor_bernstein,
)


HERE = Path(__file__).resolve().parent
OUTPUT = HERE / "terminal_q3_m1_general_forest_j4j5_relative_cap_exact_agent_20260829.json"
PINNED = {
    "prove_terminal_q3_m1_general_forest_j8plus_agent.py":
        "3854DA3117F6BB8653E1D98495866121D2C2DA92A077EA741C5FFBDF981D1BCE",
    "terminal_q3_m1_general_forest_j8plus_exact_agent_20260829.json":
        "60F970B393314511563BFA6D18CDFD27554659EB7EEAC0EFDE009ACE81FEB667",
    "derive_terminal_q3_m1_general_forest_agent.py":
        "348DB21007B705120538CBA087D67DA40C97295CEA522523A6105078074A1A4C",
    "FOREST_M1_ALLR_RELATIVE_SHADOW_CAP_ROOT_2026-08-29.md":
        "91777DB2843ABCDC1F0795FA2B01B1E2EF8995C559C3C444E79218FDBBCF2F5D",
}


def verify_pins():
    for filename, expected in PINNED.items():
        actual = sha256(HERE / filename)
        assert actual == expected, (filename, actual, expected)


def bernstein_nonnegative(expression, box, S):
    degrees, coefficients = tensor_bernstein(sp.expand(expression), box)
    power_count = zero_count = 0
    minimum = None
    stream_items = []
    for index, coefficient in enumerate(coefficients):
        powers = sp.Poly(coefficient, S).all_coeffs()
        assert powers and all(value >= 0 for value in powers), (
            index, coefficient
        )
        power_count += len(powers)
        zero_count += sum(value == 0 for value in powers)
        positives = [value for value in powers if value > 0]
        if positives:
            local = min(positives)
            minimum = local if minimum is None else min(minimum, local)
        stream_items.append((index, coefficient))
    assert minimum is not None
    return degrees, coefficients, power_count, zero_count, minimum, stream_items


def certificate():
    numerator, _den, _mnum, _mden, variables, _tests, _dens = (
        certificate_expressions()
    )
    j, r, h, d, R, W, y = variables
    N = j + r
    wpoly = sp.Poly(numerator, W)
    w2 = wpoly.coeff_monomial(W**2)
    linear = sp.expand(numerator - w2 * W**2)
    B = N - 2 * h - 1
    low = sp.factor((d - 1) * C(d, 2) / B + (1 - (d - 1) / B) * B)
    high = C(N - 2 * h, 2)
    rmax = N - 2 * h - d
    relative_cap = sp.factor(
        (N - d - j + 1) / (N - d - j + 1 + j * (d - j))
    )

    S, u, v = sp.symbols("S u v", nonnegative=True)
    records = {}
    stream = hashlib.sha256()
    totals = {
        "numerator_bernstein": 0,
        "numerator_power": 0,
        "numerator_zero": 0,
        "denominator_bernstein": 0,
        "denominator_power": 0,
        "denominator_zero": 0,
    }
    global_minimum = None
    for jvalue in (4, 5):
        Nv = 13 + S
        cases = []
        for hvalue in range(1, (jvalue + 1) // 2):
            cases.append((
                f"h{hvalue}", hvalue,
                jvalue + 1 + (Nv - 2 * jvalue - 1) * v,
                (v,),
            ))
        h0 = (jvalue + 1) // 2
        hmap = h0 + (Nv - jvalue - 2 * h0 - 1) * u / 2
        dmap = jvalue + 1 + (Nv - 2 * hmap - jvalue - 1) * v
        cases.append((f"h_ge_{h0}", hmap, dmap, (u, v)))

        for case, hcase, dcase, box in cases:
            substitution = {
                j: jvalue,
                r: Nv - jvalue,
                h: hcase,
                d: dcase,
            }
            for wname, wvalue in (("low", low), ("high", high)):
                for rname, rvalue in (("zero", 0), ("max", rmax)):
                    expression = linear.subs(W, wvalue).subs(R, rvalue).subs(
                        y, relative_cap
                    ).subs(substitution, simultaneous=True)
                    num, den = sp.together(sp.cancel(expression)).as_numer_denom()
                    reference = sp.factor(den.subs(
                        {S: 0, **{variable: 0 for variable in box}}
                    ))
                    assert reference.is_number and reference != 0
                    if reference < 0:
                        num, den = -num, -den
                    # Certify the cleared denominator itself positive on the
                    # entire mapped box; this makes the sign clearing explicit.
                    nd, nc, np, nz, nmin, nitems = bernstein_nonnegative(
                        num, box, S
                    )
                    dd, dc, dp, dz, dmin, ditems = bernstein_nonnegative(
                        den, box, S
                    )
                    name = f"j{jvalue}_{case}_{wname}_{rname}"
                    records[name] = {
                        "box_degrees": list(nd),
                        "numerator_bernstein_coefficients": len(nc),
                        "numerator_power_coefficients": np,
                        "numerator_zero_power_coefficients": nz,
                        "minimum_positive_numerator_coefficient": str(nmin),
                        "denominator_box_degrees": list(dd),
                        "denominator_bernstein_coefficients": len(dc),
                        "denominator_power_coefficients": dp,
                        "denominator_zero_power_coefficients": dz,
                        "minimum_positive_denominator_coefficient": str(dmin),
                    }
                    totals["numerator_bernstein"] += len(nc)
                    totals["numerator_power"] += np
                    totals["numerator_zero"] += nz
                    totals["denominator_bernstein"] += len(dc)
                    totals["denominator_power"] += dp
                    totals["denominator_zero"] += dz
                    global_minimum = (
                        nmin if global_minimum is None
                        else min(global_minimum, nmin)
                    )
                    for index, coefficient in nitems:
                        stream.update(f"{name}|N|{index}|{coefficient}\n".encode())
                    for index, coefficient in ditems:
                        stream.update(f"{name}|D|{index}|{coefficient}\n".encode())
                    print(name, "PASS", len(nc), np, flush=True)

    return {
        "partition": (
            "N=13+S. On y>0, S_H=N-d>=j. For fixed "
            "h<ceil(j/2), d=j+1+(N-2j-1)v; otherwise "
            "h=ceil(j/2)+(N-j-2ceil(j/2)-1)u/2 and "
            "d=j+1+(N-2h-j-1)v."
        ),
        "cap": "y<=(N-d-j+1)/(N-d-j+1+j(d-j)) for d>j",
        "endpoint_logic": (
            "The common W2>=0 certificate removes W^2.  The remainder is "
            "affine in W and, at each W boundary, affine in R; test both."
        ),
        "records": records,
        "totals": totals,
        "minimum_positive_numerator_coefficient": str(global_minimum),
        "ordered_coefficient_stream_sha256": stream.hexdigest().upper(),
    }


def main():
    verify_pins()
    result = certificate()
    report = {
        "schema": "terminal-q3-m1-general-forest-j4j5-relative-cap-exact-agent-v1",
        "date": "2026-08-29",
        "status": "PASS_EXACT_ALL_ORDER_FOREST_M1_J4J5_SUPPORTED_HIGH_DEGREE_CAP_ENDPOINT",
        "claim": (
            "For j in {4,5}, N>=13, d>j, and supported y>0, the exact "
            "balanced relative-shadow cap endpoint makes every square-dropped "
            "W/R boundary of the Gap-retaining forest-m1 lower nonnegative."
        ),
        "pinned_sha256": PINNED,
        "certificate": result,
        "scope": (
            "Modular endpoint theorem only. Promotion to the full m1 sign "
            "requires the separately certified W2>=0, M-coefficient, y=0, "
            "B=0, low-degree, inactive, and finite-order cases."
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
