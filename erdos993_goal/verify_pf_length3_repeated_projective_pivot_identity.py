"""Exact overlap audit for the finite-T and U=1/T collision pivots.

For the first collision row q0(T)=P0+S0*T, let M_i be the orientation
obtained at T=-P0/S0 and I_i the projective orientation obtained at
U=-S0/P0.  The chart change gives

    S0*I0 + P0*M0 = 0,
    S0*I1 + P0*M1 = R*H,

where R=P0*S1-P1*S0.  Thus the two pairs have the same sign-agreement
criterion on R=0 throughout their overlap.  All arithmetic here is exact
over QQ[r,z,u,v,c].
"""

from __future__ import annotations

import argparse
import json
import time
from pathlib import Path

from verify_pf_length3_repeated_resultant_reduction import build


def metadata(poly):
    return {
        "degrees_r_z_u_v_c": list(poly.degrees()),
        "term_count": len(poly.terms()),
    }


def verify(parity: str):
    source = build(
        parity,
        return_polynomials=True,
        include_alternate=False,
        include_projective=True,
    )
    resultant = source["resultant"]
    slope0 = source["slope0"]
    constant0 = source["constant0"]
    finite = [source["orientation0"], source["orientation1"]]
    projective = [
        source["projective_orientation0"],
        source["projective_orientation1"],
    ]

    identities = [
        slope0 * projective[index] + constant0 * finite[index]
        for index in range(2)
    ]
    assert identities[0] == 0
    quotient = identities[1].exquo(resultant)
    assert identities[1] == resultant * quotient
    return {
        "parity": parity,
        "row0_identity_is_zero": True,
        "row1_identity_divisible_by_resultant": True,
        "row1_quotient": metadata(quotient),
    }


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--parity", choices=("odd", "even", "both"), default="both")
    parser.add_argument("--output", type=Path)
    args = parser.parse_args()
    started = time.monotonic()
    parities = ("odd", "even") if args.parity == "both" else (args.parity,)
    report = {
        "status": "PASS_EXACT_PF_LENGTH3_REPEATED_PROJECTIVE_PIVOT_IDENTITY",
        "results": [verify(parity) for parity in parities],
        "elapsed_seconds": round(time.monotonic() - started, 3),
    }
    encoded = json.dumps(report, indent=2) + "\n"
    if args.output:
        args.output.write_text(encoded, encoding="utf-8")
    print(encoded, end="")


if __name__ == "__main__":
    main()
