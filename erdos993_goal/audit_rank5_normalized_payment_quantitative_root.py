#!/usr/bin/env python3
"""Independent exact Bernstein audit of Phi>=7X/25."""

from __future__ import annotations

import hashlib
import json
import math
from pathlib import Path

import sympy as sp

from verify_rank5_normalized_algebra_lemma import D, D0, PHI, X, q, r, rm, z


ROOT = Path(__file__).resolve().parent
PRIMARY = ROOT / "rank5_normalized_payment_quantitative_exact_root_20260823.json"
OUTPUT = ROOT / "rank5_normalized_payment_quantitative_independent_audit_root_20260823.json"
EXPECTED = {
    PRIMARY.name: "2E75DC3337EF9D1E16FD52992A1083602C862FA0881DF2726466C4EFA604A21C",
    "verify_rank5_normalized_payment_quantitative_root.py":
        "9BCDC87F64D47A3FE7E7A7F5283E8FB6F584974F4DB659D7D7B31B30C44CF30C",
    "verify_rank5_normalized_algebra_lemma.py":
        "DD519E717221D1E7BDCDED2B246C961E8C74980E77640B526479568783D8B22E",
}
C = sp.Rational(7, 25)


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def bernstein_coefficients(polynomial: sp.Expr):
    poly = sp.Poly(sp.expand(polynomial), X, z, domain=sp.QQ)
    dx, dz = poly.degree(X), poly.degree(z)
    power = {(px, pz): coefficient for (px, pz), coefficient in poly.terms()}
    result = []
    for i in range(dx + 1):
        for j in range(dz + 1):
            value = sp.S.Zero
            for px in range(i + 1):
                for pz in range(j + 1):
                    coefficient = power.get((px, pz), sp.S.Zero)
                    if not coefficient:
                        continue
                    bx = sp.Rational(math.comb(i, px), math.comb(dx, px))
                    bz = sp.Rational(math.comb(j, pz), math.comb(dz, pz)) if dz else 1
                    value += coefficient * bx * bz
            result.append(((i, j), sp.factor(value)))
    return (dx, dz), result


def endpoint_values():
    r_first = sp.Rational(1, 2) + z / 2
    r_between = sp.Rational(1, 2) + (rm - sp.Rational(1, 2)) * z
    r_last = rm + (1 - rm) * z
    rows = {
        "P1": PHI.subs({D: 1, q: sp.Rational(1, 2), r: r_first}, simultaneous=True),
        "P2": PHI.subs({D: D0, q: sp.Rational(1, 2), r: r_between}, simultaneous=True),
        "P3": PHI.subs({D: 2 * r_last - 1, q: sp.Rational(1, 2), r: r_last}, simultaneous=True),
        "C2": PHI.subs({D: D0, q: r_last - D0 / 2, r: r_last}, simultaneous=True),
    }
    for d_name, d_value in (("D0", D0), ("D1", sp.S.One)):
        for r_name, r_value in (("rhalf", sp.Rational(1, 2)), ("r1", sp.S.One)):
            rows[f"Q1_{d_name}_{r_name}"] = PHI.subs(
                {D: d_value, q: 1, r: r_value}, simultaneous=True
            )
    return {name: sp.factor(value) for name, value in rows.items()}


def main() -> None:
    actual = {name: sha256(ROOT / name) for name in EXPECTED}
    assert actual == EXPECTED
    primary = json.loads(PRIMARY.read_text(encoding="utf-8"))
    assert primary["status"] == "PASS_EXACT_RANK5_NORMALIZED_PAYMENT_PHI_GE_7X_OVER_25"

    # The affine subtraction does not alter any curvature used in the endpoint reduction.
    strengthened = PHI - C * X
    assert sp.diff(strengthened, q, 2) == sp.diff(PHI, q, 2)
    assert sp.diff(strengthened, D, 2) == sp.diff(PHI, D, 2)
    assert sp.diff(strengthened, r, 2) == sp.diff(PHI, r, 2)

    rows = []
    values = endpoint_values()
    for name, value in values.items():
        degrees, coefficients = bernstein_coefficients(value - C * X)
        negatives = [
            {"index": list(index), "value": str(coefficient)}
            for index, coefficient in coefficients if coefficient < 0
        ]
        assert not negatives
        minimum = min(coefficient for _, coefficient in coefficients)
        assert minimum == 0
        rows.append({
            "endpoint": name,
            "degrees": list(degrees),
            "Bernstein_coefficients": len(coefficients),
            "negative_coefficients": 0,
            "minimum_coefficient": str(minimum),
        })

    # Sharp on the normalized box: P2/X tends to 7/25 at X=0,z=1.
    sharp_limit = sp.factor(sp.limit(values["P2"] / X, X, 0).subs(z, 1))
    assert sharp_limit == C

    d, e = sp.symbols("d e", positive=True)
    assert sp.factor(5 * e**4 * C * (d / e) - sp.Rational(7, 5) * d * e**3) == 0

    payload = {
        "schema": "rank5-normalized-payment-quantitative-independent-audit-root-v1",
        "status": "PASS_INDEPENDENT_RANK5_NORMALIZED_PAYMENT_QUANTITATIVE_AUDIT",
        "method": (
            "Reconstruct the eight endpoint substitutions independently and convert "
            "power coefficients to tensor-Bernstein coefficients by the exact closed formula."
        ),
        "constant": str(C),
        "constant_is_sharp_on_normalized_box": True,
        "sharp_endpoint": "P2 at X->0,z=1",
        "endpoint_audits": rows,
        "immutable_inputs": actual,
        "source_sha256": sha256(Path(__file__)),
        "scope_warning": "This audits the large normalized terminal domain only.",
    }
    OUTPUT.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    print(payload["status"])
    print("SOURCE", payload["source_sha256"])
    print("OUTPUT", sha256(OUTPUT))


if __name__ == "__main__":
    main()
