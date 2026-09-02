"""Exact weighted normal form at the repeated-resultant infinite-reserve face.

Put

    B=c(c-2)+4z(c+1)^2,   q=1/r.

The direct compact chart becomes nontransversal where q=B=0.  Giving B
weight one and q weight two exposes a parity-independent initial form.  This
verifier computes that form exactly for R,M0,M1, cancels the common leading
multiple of R from the orientations, and checks the signs on the two
asymptotic resultant branches.
"""

from __future__ import annotations

import hashlib
import json
import math
from pathlib import Path

import sympy as sp

from certify_pf_length3_repeated_positive_root_orientation import remove_positive_content
from verify_pf_length3_repeated_resultant_reduction import build


HERE = Path(__file__).resolve().parent
OUTPUT = HERE / "pf_length3_repeated_infinite_reserve_normal_form_exact_20260807.json"


def r_coefficient(poly, power):
    reduced_ring = poly.evaluate(0, 0).ring
    return reduced_ring.from_dict(
        {monomial[1:]: coefficient for monomial, coefficient in poly.terms() if monomial[0] == power}
    ).as_expr()


def weighted_coefficient(poly, order, z, z0, h, dvar):
    """Coefficient of epsilon^order after r=epsilon^-2, B=epsilon*D."""

    reserve_degree = poly.degree(0)
    value = 0
    for reserve_gap in range(order // 2 + 1):
        z_order = order - 2 * reserve_gap
        reserve_power = reserve_degree - reserve_gap
        if reserve_power < 0:
            continue
        coefficient = r_coefficient(poly, reserve_power)
        value += (
            (dvar / h) ** z_order
            * sp.diff(coefficient, z, z_order).subs(z, z0)
            / math.factorial(z_order)
        )
    return sp.factor(sp.together(value))


def verify_parity(parity):
    source = build(parity, return_polynomials=True)
    ring = source["ring"]
    rr, zz, uu, vv, cc = ring.gens
    resultant = remove_positive_content(source["resultant"])[0]
    m0 = remove_positive_content(source["orientation0"])[0]
    m1 = remove_positive_content(source["orientation1"])[0]

    z, u, v, c, dvar = sp.symbols("z u v c D")
    h = 4 * (c + 1) ** 2
    z0 = c * (2 - c) / h
    au = c * u - 4 * c - 2 * u - 1
    av = c * v - 4 * c - 2 * v - 1
    branch = dvar**2 * (c + 1) ** 2 + 3 * c**2 * (4 * c + 1) * (2 * c - 1)

    lead_r = weighted_coefficient(resultant, 2, z, z0, h, dvar)
    lead_m0 = weighted_coefficient(m0, 2, z, z0, h, dvar)
    lead_m1 = weighted_coefficient(m1, 2, z, z0, h, dvar)
    expected_r = 2**20 * (c * u + 1) * (c * v + 1) * au * av * branch / (c + 1) ** 6
    expected_m0 = (
        -2**27
        * (2 * c - 1)
        * (c * u + 1)
        * (c * v + 1)
        * au**2
        * av**2
        * branch
        / (c + 1) ** 11
    )
    expected_m1 = (
        -2**29
        * (c - 2)
        * (2 * c - 1)
        * (c * u + 1)
        * (c * v + 1)
        * au**2
        * av**2
        * branch
        / (c + 1) ** 13
    )
    assert sp.factor(lead_r - expected_r) == 0
    assert sp.factor(lead_m0 - expected_m0) == 0
    assert sp.factor(lead_m1 - expected_m1) == 0

    # Cancel these leading multiples of R without changing signs on R=0.
    au_ring = cc * uu - 4 * cc - 2 * uu - 1
    av_ring = cc * vv - 4 * cc - 2 * vv - 1
    a0 = (cc + 1) ** 5 * m0 + 128 * (2 * cc - 1) * au_ring * av_ring * rr**7 * resultant
    a1 = (
        (cc + 1) ** 7 * m1
        + 512 * (cc - 2) * (2 * cc - 1) * au_ring * av_ring * rr**8 * resultant
    )
    lead_a0 = weighted_coefficient(a0, 3, z, z0, h, dvar)
    lead_a1 = weighted_coefficient(a1, 3, z, z0, h, dvar)
    p0 = sp.factor(
        lead_a0
        * (c + 1) ** 6
        / (-2**26 * dvar * (c * u + 1) * (c * v + 1) * au * av)
    )
    p1 = sp.factor(
        lead_a1
        * (c + 1) ** 6
        / (2**28 * dvar * (c * u + 1) * (c * v + 1) * au * av)
    )
    root_d2 = 3 * c**2 * (4 * c + 1) * (1 - 2 * c) / (c + 1) ** 2
    p0_on_root = sp.factor(sp.together(p0.subs(dvar**2, root_d2)))
    p1_on_root = sp.factor(sp.together(p1.subs(dvar**2, root_d2)))
    expected_p0 = c * (2 * c - 1) * (4 * c + 1) * (7 * c + 4) * au * av
    expected_p1 = c**2 * (c - 2) * (2 * c - 1) * (4 * c + 1) ** 2 * au * av
    assert sp.factor(p0_on_root - expected_p0) == 0
    assert sp.factor(p1_on_root - expected_p1) == 0

    payload = ";".join(str(value) for value in (lead_r, lead_m0, lead_m1, p0_on_root, p1_on_root))
    return {
        "parity": parity,
        "weighted_resultant_initial_form": str(sp.factor(lead_r)),
        "resultant_equivalent_orientation_root_remainders": {
            "A0": str(p0_on_root),
            "A1": str(p1_on_root),
        },
        "sha256": hashlib.sha256(payload.encode("utf-8")).hexdigest(),
    }


def main():
    records = [verify_parity(parity) for parity in ("odd", "even")]
    assert records[0]["weighted_resultant_initial_form"] == records[1]["weighted_resultant_initial_form"]
    assert (
        records[0]["resultant_equivalent_orientation_root_remainders"]
        == records[1]["resultant_equivalent_orientation_root_remainders"]
    )
    report = {
        "status": "PASS_EXACT_PF_LENGTH3_REPEATED_INFINITE_RESERVE_NORMAL_FORM",
        "coordinates": "q=1/r, B=c(c-2)+4z(c+1)^2; weight(q)=2, weight(B)=1",
        "records": records,
        "sign_consequences": [
            "For 1/2<c<2 the initial resultant is strictly positive, so the infinite-reserve face is collision-free.",
            "For 0<c<1/2 the two initial resultant branches have D!=0.  After subtracting explicit multiples of R, both orientation initial forms have sign(D), so both branches are benign.",
            "The transition c=1/2 and the endpoint c=0 require separate higher-order charts."
        ],
        "remaining_obligation": (
            "Turn the strict initial-form signs into finite exact blow-up "
            "covers near q=B=0, and resolve c=1/2 and c=0."
        ),
    }
    OUTPUT.write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    print(report["status"])
    print(OUTPUT)


if __name__ == "__main__":
    main()
