"""Exact certificate for an artificial zero of the first affine pivot.

At odd parity, u=v=1 and c=1/4, this verifier uses a rational
Poincare--Miranda box to prove that P0=S0=0 occurs for positive z and
nonintegral r.  The point is not claimed to be a bad source collision; it
explains why a continuous cover using only the T=-P0/S0 chart cannot close.
"""

from __future__ import annotations

import json
import math
from pathlib import Path

import numpy as np

from certify_pf_length3_uniform_inner_orientation import integer_power_to_bernstein
from verify_pf_length3_repeated_resultant_reduction import build


HERE = Path(__file__).resolve().parent
OUTPUT = HERE / "pf_length3_repeated_first_pivot_artificial_locus_exact_20260807.json"


def bernstein_on_interval(poly, low, high):
    """Exact integer Bernstein controls of a univariate QQ-ring polynomial."""

    degree = poly.degree()
    power = [poly.ring.domain.zero] * (degree + 1)
    width = high - low
    for (monomial,), coefficient in poly.terms():
        for target in range(monomial + 1):
            power[target] += (
                coefficient
                * math.comb(monomial, target)
                * low ** (monomial - target)
                * width**target
            )
    common = math.lcm(*(int(value.denominator) for value in power))
    integer = np.array([int(value * common) for value in power], dtype=object)
    return integer_power_to_bernstein(integer)


def sign_record(poly, low, high, expected):
    controls = bernstein_on_interval(poly, low, high)
    signed = expected * controls
    assert min(int(value) for value in signed.flat) > 0
    return {
        "degree": poly.degree(),
        "expected_sign": "+" if expected > 0 else "-",
        "signed_control_minimum": str(min(int(value) for value in signed.flat)),
        "signed_control_maximum": str(max(int(value) for value in signed.flat)),
    }


def main():
    source = build("odd", return_polynomials=True)
    # After u and then v are evaluated, c is generator 2 of QQ[r,z,c].
    p0 = source["constant0"].evaluate(2, 1).evaluate(2, 1).evaluate(2, source["ring"].domain(1, 4))
    s0 = source["slope0"].evaluate(2, 1).evaluate(2, 1).evaluate(2, source["ring"].domain(1, 4))
    auxiliary = s0 + source["ring"].domain(3068, 125) * p0

    domain = p0.ring.domain
    r_low = domain(4399820407051957121, 10**18)
    r_high = domain(4399820407051957122, 10**18)
    z_low = domain(26084882346817268, 10**18)
    z_high = domain(26084882346817269, 10**18)

    # P0 has opposite strict signs on the two z-faces.
    p_z_low = p0.evaluate(1, z_low)
    p_z_high = p0.evaluate(1, z_high)
    # G=S0+(3068/125)P0 has opposite strict signs on the two r-faces.
    g_r_low = auxiliary.evaluate(0, r_low)
    g_r_high = auxiliary.evaluate(0, r_high)
    faces = {
        "P0_at_z_low": sign_record(p_z_low, r_low, r_high, 1),
        "P0_at_z_high": sign_record(p_z_high, r_low, r_high, -1),
        "G_at_r_low": sign_record(g_r_low, z_low, z_high, 1),
        "G_at_r_high": sign_record(g_r_high, z_low, z_high, -1),
    }

    assert r_low > 4 and r_high < 5 and z_low > 0
    report = {
        "status": "PASS_EXACT_PF_LENGTH3_FIRST_PIVOT_ARTIFICIAL_LOCUS",
        "specialization": {"parity": "odd", "u": "1", "v": "1", "c": "1/4"},
        "r_interval": [str(r_low), str(r_high)],
        "z_interval": [str(z_low), str(z_high)],
        "auxiliary": "G=S0+(3068/125)P0",
        "face_certificates": faces,
        "consequence": (
            "Poincare--Miranda gives a point in the rational box with "
            "P0=G=0, hence P0=S0=0.  Because 4<r<5, this point is outside "
            "the integer-reserve set.  It is an artificial zero of the "
            "first-pivot orientation clearing, so a one-pivot continuous "
            "Bernstein cover cannot be complete."
        ),
    }
    OUTPUT.write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    print(report["status"])
    print(OUTPUT)


if __name__ == "__main__":
    main()
