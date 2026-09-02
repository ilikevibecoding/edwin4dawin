"""Exact derivative identities on the repeated-factor quartic locus."""

from __future__ import annotations

import hashlib
import json
from pathlib import Path

from verify_pf_length3_repeated_resultant_reduction import build


HERE = Path(__file__).resolve().parent
OUTPUT = HERE / "pf_length3_repeated_resultant_derivative_identity_exact_20260807.json"


def digest(poly) -> str:
    value = hashlib.sha256()
    for monomial, coefficient in poly.terms():
        value.update(
            (",".join(map(str, monomial)) + ":" + str(coefficient) + ";").encode(
                "ascii"
            )
        )
    return value.hexdigest()


def verify(parity):
    source = build(parity, return_polynomials=True)
    ambient = source["ring"]
    r, z, u, v, c = ambient.gens
    p = 2 * r + (17 if parity == "odd" else 18)
    delta = (1 + 4 * z) * (p - 8) * (p - 9)
    p0, s0 = source["constant0"], source["slope0"]
    p1, s1 = source["constant1"], source["slope1"]
    resultant = source["resultant"]

    # At T*=-P0/S0, J_i/S0 is the c-derivative of q_i.
    j0 = p0.diff(c) * s0 - s0.diff(c) * p0
    j1 = p1.diff(c) * s0 - s1.diff(c) * p0
    assert j1 + c * delta * j0 == 0

    # Determinant differentiation before restricting to R=0.
    identity = (
        resultant.diff(c) * s0
        - s1 * j0
        + s0 * j1
        - s0.diff(c) * resultant
    )
    assert identity == 0

    cubic_slope = s1 + c * delta * s0
    return {
        "parity": parity,
        "delta_term_count": len(delta.terms()),
        "J0_multidegree": list(j0.degrees()),
        "J1_multidegree": list(j1.degrees()),
        "cubic_slope_multidegree": list(cubic_slope.degrees()),
        "cubic_slope_term_count": len(cubic_slope.terms()),
        "digests": {
            "J0": digest(j0),
            "J1": digest(j1),
            "cubic_slope": digest(cubic_slope),
        },
    }


def main():
    records = [verify(parity) for parity in ("odd", "even")]
    report = {
        "status": "PASS_EXACT_PF_LENGTH3_REPEATED_RESULTANT_DERIVATIVE_IDENTITY",
        "records": records,
        "exact_statement": (
            "At T*=-P0/S0, J1=-c*Delta*J0 with Delta>0.  Moreover "
            "R_c*S0=S1*J0-S0*J1+S0_c*R.  Hence on R=0, "
            "R_c*S0=J0*(S1+c*Delta*S0)."
        ),
        "route_warning": (
            "The identity is exact, but the cubic slope is not globally "
            "positive on the positive resultant locus.  A close positive-root "
            "pair at the odd r=255, v=0 boundary has opposite cubic-slope "
            "signs while both orientations remain positive.  Therefore the "
            "identity is structural bookkeeping, not a standalone orientation "
            "certificate."
        ),
    }
    OUTPUT.write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    print(report["status"])
    print(OUTPUT)


if __name__ == "__main__":
    main()
