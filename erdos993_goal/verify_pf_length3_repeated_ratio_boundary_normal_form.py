"""Exact normal form at the inner repeated-collision ratio boundary.

For the primitive quartic resultant R and orientations M0,M1, put

    w = z(r-z),       c = z(2+D).

After the positive Laurent clearing used in the product chart, the boundary
z=0,D=0 is a double resultant branch.  This verifier constructs two
resultant-equivalent orientations A0,A1 and proves their first nonzero
weighted forms (weight(z)=2, weight(D)=1) have the same sign on both sides.
Everything is over QQ; no numerical approximation is used.
"""

from __future__ import annotations

import hashlib
import json
import math
from collections import defaultdict
from fractions import Fraction
from pathlib import Path

import sympy as sp

from certify_pf_length3_repeated_positive_root_orientation import (
    remove_positive_content,
)
from verify_pf_length3_repeated_resultant_reduction import build


HERE = Path(__file__).resolve().parent
OUTPUT = HERE / "pf_length3_repeated_ratio_boundary_normal_form_exact_20260807.json"

zz, dd, ww, uu, vv = sp.symbols("z D w u v")


def digest(poly) -> str:
    value = hashlib.sha256()
    for monomial, coefficient in poly.terms():
        value.update(
            (",".join(map(str, monomial)) + ":" + str(coefficient) + ";").encode(
                "ascii"
            )
        )
    return value.hexdigest()


def shifted_ratio_data(poly):
    """Return Laurent clearance, common z power, and shifted sparse terms."""

    clearance = max(monomial[0] - monomial[1] for monomial, _ in poly.terms())
    raw = defaultdict(Fraction)
    for monomial, coefficient in poly.terms():
        r_power, z_power, u_power, v_power, c_power = monomial
        coefficient = Fraction(int(coefficient.numerator), int(coefficient.denominator))
        for split in range(r_power + 1):
            raw[
                (
                    z_power + 2 * split - r_power + clearance + c_power,
                    r_power - split,
                    u_power,
                    v_power,
                    c_power,
                )
            ] += coefficient * math.comb(r_power, split)
    common_z = min(monomial[0] for monomial, coefficient in raw.items() if coefficient)
    shifted = defaultdict(Fraction)
    for (z_power, w_power, u_power, v_power, k_power), coefficient in raw.items():
        for d_power in range(k_power + 1):
            shifted[
                (z_power - common_z, d_power, w_power, u_power, v_power)
            ] += coefficient * math.comb(k_power, d_power) * 2 ** (k_power - d_power)
    return clearance, common_z, shifted


def weighted_lead(poly):
    clearance, common_z, shifted = shifted_ratio_data(poly)
    weight = min(
        2 * monomial[0] + monomial[1]
        for monomial, coefficient in shifted.items()
        if coefficient
    )
    expression = sum(
        sp.Rational(coefficient.numerator, coefficient.denominator)
        * zz**monomial[0]
        * dd**monomial[1]
        * ww**monomial[2]
        * uu**monomial[3]
        * vv**monomial[4]
        for monomial, coefficient in shifted.items()
        if coefficient and 2 * monomial[0] + monomial[1] == weight
    )
    return clearance, common_z, weight, sp.expand(expression)


def auxiliaries(parity, primitive):
    r, z, u, v, c = primitive["R"].ring.gens
    w = z * (r - z)
    uv = (2 * u + 1) * (2 * v + 1)
    if parity == "odd":
        uv_constant, single_constant, scalar_constant = 296, 192, 127
    else:
        uv_constant, single_constant, scalar_constant = 360, 224, 143
    quotient = (
        336 * u * v * w
        - uv_constant * u * v
        + 96 * u * w
        - single_constant * u
        + 96 * v * w
        - single_constant * v
        + 12 * w
        - scalar_constant
    )
    a0 = z**7 * primitive["M0"] - 128 * w**7 * uv * primitive["R"]
    a1 = (
        z**8 * primitive["M1"]
        + 1024 * w**8 * uv * primitive["R"]
        - 256 * w**7 * z * quotient * primitive["R"]
        - 1024 * (c - 2 * z) * w**8 * uv * primitive["R"]
    )
    return a0, a1


def verify(parity):
    source = build(parity, return_polynomials=True)
    primitive = {
        "R": remove_positive_content(source["resultant"])[0],
        "M0": remove_positive_content(source["orientation0"])[0],
        "M1": remove_positive_content(source["orientation1"])[0],
    }
    a0, a1 = auxiliaries(parity, primitive)
    uv = (2 * uu + 1) * (2 * vv + 1)
    expected = {
        "R": (7, 2, 2, -(2**22) * ww**6 * uv * (-dd**2 * ww + 3 * zz)),
        "M0": (
            14,
            2,
            2,
            -(2**29) * ww**13 * uv**2 * (-dd**2 * ww + 3 * zz),
        ),
        "M1": (
            15,
            2,
            2,
            2**32 * ww**14 * uv**2 * (-dd**2 * ww + 3 * zz),
        ),
        "A0": (7, 3, 1, -(2**30) * dd * ww**13 * uv**2),
        "A1": (7, 4, 1, -(2**32) * dd * ww**14 * uv**2),
    }
    polynomials = {**primitive, "A0": a0, "A1": a1}
    records = {}
    for name, polynomial in polynomials.items():
        actual = weighted_lead(polynomial)
        target = expected[name]
        assert actual[:3] == target[:3]
        assert sp.expand(actual[3] - target[3]) == 0
        records[name] = {
            "laurent_clearance": actual[0],
            "common_ratio_z_power": actual[1],
            "first_weight": actual[2],
            "term_count": len(polynomial.terms()),
            "digest": digest(polynomial),
        }
    return {"parity": parity, "records": records}


def main():
    records = [verify(parity) for parity in ("odd", "even")]
    report = {
        "status": "PASS_EXACT_PF_LENGTH3_REPEATED_RATIO_BOUNDARY_NORMAL_FORM",
        "records": records,
        "exact_statement": (
            "For both parities, at c/z=2 and z=0 the quartic has weighted "
            "lead proportional to w*D^2-3z.  After adding explicit multiples "
            "of R, the two orientations have weighted leads -D times positive "
            "factors.  Since A0=z^7*M0 and A1=z^8*M1 on R=0, these replacements "
            "preserve orientation signs for z>0."
        ),
        "remaining_obligation": (
            "Propagate the normal form through a finite exact neighborhood/atlas, "
            "or prove the global structural sign law sign(M0)=sign(M1)=-sign(R')."
        ),
    }
    OUTPUT.write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    print(report["status"])
    print(OUTPUT)


if __name__ == "__main__":
    main()
