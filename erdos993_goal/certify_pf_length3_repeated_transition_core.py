"""Exact R>0 certificate for the c=1/2 infinite-reserve transition core.

The chart

    q=Q/1024,
    c=1/2+32*q*L,
    B=-16*q*D,

with Q,D,L in [0,1] covers q<=1/1024,
0<=(c-1/2)/q<=32, and 0<=-B/q<=16.  Its Q=0 initial form is the strictly
positive transition quadratic found by the weighted normal-form verifier.
"""

from __future__ import annotations

import json
import math
from pathlib import Path

import numpy as np
from sympy import QQ
from sympy.polys.rings import ring

from certify_pf_length3_repeated_positive_root_orientation import (
    domain_strict_positive,
    remove_positive_content,
)
from certify_pf_length3_uniform_inner_orientation import (
    integer_power_to_bernstein,
    midpoint_split_exact,
)
from verify_pf_length3_repeated_resultant_reduction import build


HERE = Path(__file__).resolve().parent
OUTPUT = HERE / "pf_length3_repeated_transition_core_exact_20260807.json"


def transform(poly):
    target, Q, D, u, v, L = ring("Q,D,u,v,L", QQ)
    q = Q / 1024
    c = QQ(1, 2) + Q * L / 32
    b_signed = -Q * D / 64
    h = 4 * (c + 1) ** 2
    z_numerator = c * (2 - c) + b_signed
    reserve_degree = poly.degree(0)
    z_degree = poly.degree(1)
    transformed = target.zero
    for monomial, coefficient in poly.terms():
        rp, zp, up, vp, cp = monomial
        transformed += (
            coefficient
            * q ** (reserve_degree - rp)
            * z_numerator**zp
            * h ** (z_degree - zp)
            * u**up
            * v**vp
            * c**cp
        )
    q_content = min(monomial[0] for monomial, _ in transformed.terms())
    assert q_content > 0
    transformed = transformed.exquo(Q**q_content)
    degrees = transformed.degrees()
    power = np.zeros(tuple(degree + 1 for degree in degrees), dtype=object)
    common = math.lcm(*(int(coefficient.denominator) for _, coefficient in transformed.terms()))
    for monomial, coefficient in transformed.terms():
        power[monomial] = int(coefficient * common)
    return power, q_content, degrees, len(transformed.terms())


def one(parity):
    resultant = remove_positive_content(build(parity, return_polynomials=True)["resultant"])[0]
    power, q_content, degrees, terms = transform(resultant)
    controls = integer_power_to_bernstein(power)
    included = ((False, True), (True, True), (True, True), (True, True), (True, True))
    # The positive transition quadratic has one negative global Bernstein
    # middle control; one midpoint split in D exposes its positive minimum.
    first_halves = midpoint_split_exact(controls, 1)
    halves = [quarter for half in first_halves for quarter in midpoint_split_exact(half, 1)]
    assert all(domain_strict_positive(half, included, exact=True) for half in halves)
    return {
        "parity": parity,
        "removed_positive_Q_power": q_content,
        "degrees_Q_D_u_v_L": list(degrees),
        "term_count": terms,
        "certified_D_quarter_leaves": 4,
        "half_signed_control_bounds": [
            [str(min(int(value) for value in half.flat)), str(max(int(value) for value in half.flat))]
            for half in halves
        ],
    }


def main():
    records = [one(parity) for parity in ("odd", "even")]
    report = {
        "status": "PASS_EXACT_PF_LENGTH3_REPEATED_TRANSITION_CORE",
        "chart": "q=Q/1024, c=1/2+32qL, B=-16qD, Q,D,L in [0,1]",
        "records": records,
        "theorem": (
            "For both parities the repeated resultant is strictly positive "
            "throughout the transition core, so no positive repeated-factor "
            "collision occurs there."
        ),
    }
    OUTPUT.write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    print(report["status"])
    print(OUTPUT)


if __name__ == "__main__":
    main()
