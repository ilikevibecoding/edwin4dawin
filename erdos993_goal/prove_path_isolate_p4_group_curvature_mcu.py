#!/usr/bin/env python3
"""Verify the finite identities behind the all-power group MCU theorem."""

from __future__ import annotations

import hashlib
import json
from pathlib import Path

import sympy as sp


z, w = sp.symbols("z w")
e1 = z + w
q = z * w
p2 = z**2 + w**2
T = e1 + p2

CORE = (
    w**5 * z
    + w**5
    + 3 * w**4 * z
    + 3 * w**4
    + 2 * w**3 * z**3
    + 4 * w**3 * z**2
    + 5 * w**3 * z
    + 3 * w**3
    + 4 * w**2 * z**3
    + 8 * w**2 * z**2
    + 5 * w**2 * z
    + w**2
    + w * z**5
    + 3 * w * z**4
    + 5 * w * z**3
    + 5 * w * z**2
    + w * z
    + z**5
    + 3 * z**4
    + 3 * z**3
    + z**2
)


def schur(a: int, b: int) -> sp.Expr:
    assert a >= b >= 0
    return sum(z ** (a - i) * w ** (b + i) for i in range(a - b + 1))


def homogeneous_part(poly: sp.Expr, degree: int) -> sp.Expr:
    result = sp.Integer(0)
    for (power_z, power_w), coefficient in sp.Poly(poly, z, w).terms():
        if power_z + power_w == degree:
            result += coefficient * z**power_z * w**power_w
    return sp.expand(result)


def canonical_hash(poly: sp.Poly) -> str:
    payload = "\n".join(
        f"{monomial}:{coefficient}"
        for monomial, coefficient in poly.terms()
    )
    return hashlib.sha256(payload.encode("utf-8")).hexdigest()


def main() -> None:
    expected = {
        2: schur(2, 0),
        3: 3 * schur(3, 0) + 2 * schur(2, 1),
        4: 3 * schur(4, 0) + 2 * schur(3, 1) + 3 * schur(2, 2),
        5: schur(5, 0) + 2 * schur(4, 1) + schur(3, 2),
        6: q * p2**2,
    }
    layer_records = []
    reconstructed = sp.Integer(0)
    for degree, expression in expected.items():
        actual = homogeneous_part(CORE, degree)
        assert sp.expand(actual - expression) == 0
        reconstructed += expression
        layer_records.append(
            {
                "degree": degree,
                "identity": str(expression),
                "term_count": len(sp.Poly(actual, z, w).terms()),
                "sha256": canonical_hash(sp.Poly(actual, z, w)),
                "ordinary_schur_positive": degree < 6,
                "exceptional_form": "zw*(z^2+w^2)^2" if degree == 6 else None,
            }
        )
    assert sp.expand(CORE - reconstructed) == 0

    d0 = sp.expand(e1 * p2 * (1 + e1 + q) * CORE)
    expected_d0 = sp.expand((1 + z) * (1 + w) * (z + w) * p2 * CORE)
    assert sp.expand(d0 - expected_d0) == 0

    # A finite sanity audit supplements (but is not used in place of) the
    # all-R proof: every homogeneous row through R=40 is center-unimodal.
    audit_checks = 0
    audit_minimum_difference = None
    for power in range(41):
        poly = sp.Poly(sp.expand(T**power * d0), z, w)
        rows: dict[int, dict[int, int]] = {}
        for (power_z, power_w), coefficient in poly.terms():
            rows.setdefault(power_z + power_w, {})[power_z] = int(coefficient)
        for degree, row in rows.items():
            previous = 0
            for power_z in range(degree // 2 + 1):
                current = row.get(power_z, 0)
                difference = current - previous
                audit_checks += 1
                if audit_minimum_difference is None or difference < audit_minimum_difference:
                    audit_minimum_difference = difference
                assert difference >= 0
                previous = current

    report = {
        "status": "PASS_PATH_ISOLATE_P4_GROUP_CURVATURE_MCU",
        "identities": {
            "T": "e1+p2, e1=z+w, p2=z^2+w^2",
            "D0": "e1*p2*(1+e1+zw)*Core",
            "core_decomposition": "Core=C2+C3+C4+C5+zw*p2^2",
        },
        "core_layers": layer_records,
        "all_power_lemma": (
            "e1^a*p2^b is Schur-positive for every a>=1,b>=0; "
            "expand T^R and apply this to the four Schur-positive Core "
            "layers and separately to the exceptional zw*p2^2 layer"
        ),
        "closure_lemma": (
            "Products and nonnegative sums of Schur-positive symmetric "
            "polynomials are Schur-positive"
        ),
        "consequence": (
            "Every homogeneous coefficient row of T^R*D0 rises weakly "
            "from each edge to the center for every integer R>=0"
        ),
        "finite_sanity_audit": {
            "powers_R": [0, 40],
            "difference_checks": audit_checks,
            "minimum_difference": audit_minimum_difference,
        },
        "d0_term_count": len(sp.Poly(d0, z, w).terms()),
        "d0_sha256": canonical_hash(sp.Poly(d0, z, w)),
    }
    Path("path_isolate_p4_group_curvature_mcu_20260801.json").write_text(
        json.dumps(report, indent=2) + "\n", encoding="utf-8"
    )
    print(json.dumps(report, indent=2))


if __name__ == "__main__":
    main()
