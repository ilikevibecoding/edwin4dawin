"""Exact overlap identity for the two affine elimination pivots.

The repeated-collision rows are P0+S0*T and P1+S1*T.  The original
orientation chart substitutes T=-P0/S0 and clears by S0^2; the complementary
chart substitutes T=-P1/S1 and clears by S1^2.  This verifier proves the
universal polynomial identity showing that, on the resultant locus, the two
charts differ only by a positive square wherever both are defined.
"""

from __future__ import annotations

import hashlib
import json
from pathlib import Path

from sympy import QQ
from sympy.polys.rings import ring

from verify_pf_length3_repeated_resultant_reduction import build


HERE = Path(__file__).resolve().parent
OUTPUT = HERE / "pf_length3_repeated_two_pivot_atlas_exact_20260807.json"


def digest(poly):
    value = hashlib.sha256()
    for monomial, coefficient in poly.terms():
        value.update(
            (",".join(map(str, monomial)) + ":" + str(coefficient) + ";").encode("ascii")
        )
    return value.hexdigest()


def main():
    formal, a, b, d, p0, p1, s0, s1 = ring("a,b,d,p0,p1,s0,s1", QQ)
    resultant = p0 * s1 - p1 * s0
    first = a * s0**2 - b * p0 * s0 + d * p0**2
    second = a * s1**2 - b * p1 * s1 + d * p1**2
    quotient = b * s0 * s1 - d * (p1 * s0 + p0 * s1)
    assert second * s0**2 - first * s1**2 == resultant * quotient

    records = []
    for parity in ("odd", "even"):
        source = build(parity, return_polynomials=True)
        coefficients = source["directional_derivative_coefficients"]
        records.append(
            {
                "parity": parity,
                "directional_coefficient_degrees": [
                    [list(poly.degrees()) for poly in row] for row in coefficients
                ],
                "directional_coefficient_digests": [
                    [digest(poly) for poly in row] for row in coefficients
                ],
                "first_pivot_orientation_degrees": [
                    list(source["orientation0"].degrees()),
                    list(source["orientation1"].degrees()),
                ],
                "second_pivot_orientation_degrees": [
                    list(source["alternate_orientation0"].degrees()),
                    list(source["alternate_orientation1"].degrees()),
                ],
            }
        )

    report = {
        "status": "PASS_EXACT_PF_LENGTH3_REPEATED_TWO_PIVOT_ATLAS",
        "universal_identity": (
            "For D(T)=a+bT+dT^2, M=D(-P0/S0)S0^2 and "
            "N=D(-P1/S1)S1^2 satisfy "
            "N*S0^2-M*S1^2=(P0*S1-P1*S0)*"
            "(b*S0*S1-d*(P1*S0+P0*S1))."
        ),
        "consequence": (
            "On the collision resultant R=0, M and N have the same sign "
            "where S0 and S1 are both nonzero, since N*S0^2=M*S1^2. "
            "Either pivot can therefore certify the actual derivative sign; "
            "the second pivot removes the artificial zero caused by P0=S0=0."
        ),
        "records": records,
    }
    OUTPUT.write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    print(report["status"])
    print(OUTPUT)


if __name__ == "__main__":
    main()
