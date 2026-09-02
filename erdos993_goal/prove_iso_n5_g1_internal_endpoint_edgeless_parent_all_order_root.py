#!/usr/bin/env python3
"""All-order g1 theorem for the edgeless-parent internal endpoint subfamily.

For ell=8+h, h>=0, collision-leaf count k>=0, and an endpoint parent side
with R=Q=(1+x)^n, substitute the exact broom/path coefficients into the
canonical endpoint factor.  After multiplying by 360, every coefficient in
h,k,n is strictly positive.  This is a genuine all-order subfamily theorem,
not a bounded extrapolation.
"""

from __future__ import annotations

import hashlib
import json
from math import factorial
from pathlib import Path

import sympy as sp

from derive_iso_n5_g1_internal_endpoint_broom_factor_root import endpoint_expression


HERE = Path(__file__).resolve().parent
OUTPUT = HERE / "iso_n5_g1_internal_endpoint_edgeless_parent_all_order_exact_root_20260830.json"
MARKER = "PASS_EXACT_ISO_N5_G1_INTERNAL_ENDPOINT_EDGELESS_PARENT_ALL_ORDER_ROOT"
PINS = {
    "derive_iso_n5_g1_internal_endpoint_broom_factor_root.py":
        "89324C9B5C2E80B4E365B208FB896F0DB7E57579CC3381EEA8798E6A34EDA4F0",
    "iso_n5_g1_internal_endpoint_broom_factor_root_20260830.json":
        "0FA4D58DD4C3624327843BB8A39E986145675DA0E475473E20F62D2B4F64DDBC",
}


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def choose(variable, rank):
    if rank < 0:
        return sp.Integer(0)
    if rank == 0:
        return sp.Integer(1)
    return sp.expand(
        sp.prod(variable - offset for offset in range(rank)) / sp.Integer(factorial(rank))
    )


def path_coefficient(order, rank):
    if rank < 0:
        return sp.Integer(0)
    return choose(order - rank + 1, rank)


def isolate_times_path(isolates, order, rank):
    return sp.expand(sum(
        choose(isolates, j) * path_coefficient(order, rank - j)
        for j in range(rank + 1)
    ))


def main() -> None:
    assert {name: sha256(HERE / name) for name in PINS} == PINS
    factor = json.loads(
        (HERE / "iso_n5_g1_internal_endpoint_broom_factor_root_20260830.json")
        .read_text(encoding="utf-8")
    )
    assert factor["marker"] == "DERIVED_EXACT_ISO_N5_G1_INTERNAL_ENDPOINT_BROOM_FACTOR_ROOT"

    expression, rows = endpoint_expression()
    h, k, n = sp.symbols("h k n", integer=True, nonnegative=True)
    ell = 8 + h
    substitutions = {}
    for rank in range(1, 7):
        u_value = isolate_times_path(k, ell - 1, rank)
        x_value = sp.expand(u_value + path_coefficient(ell - 2, rank - 1))
        z_value = isolate_times_path(k, ell - 2, rank)
        y_value = sp.expand(z_value + path_coefficient(ell - 3, rank - 1))
        substitutions.update({
            rows["X"][rank]: x_value,
            rows["U"][rank]: u_value,
            rows["Y"][rank]: y_value,
            rows["Z"][rank]: z_value,
            rows["R"][rank]: choose(n, rank),
            rows["Q"][rank]: choose(n, rank),
        })
    reduced = sp.expand(expression.subs(substitutions))
    scaled = sp.Poly(sp.expand(360 * reduced), h, k, n)
    coefficients = scaled.coeffs()
    assert len(scaled.terms()) == 84
    assert all(coefficient.is_Integer and coefficient > 0 for coefficient in coefficients)
    assert min(coefficients) == 91
    reconstructed = sp.expand(scaled.as_expr() / 360)
    assert sp.expand(reconstructed - reduced) == 0
    stream = "".join(
        f"{powers}:{coefficient};" for powers, coefficient in scaled.terms()
    )

    report = {
        "marker": MARKER,
        "theorem": (
            "In the internal-spine broom endpoint mode with ell>=8 and an "
            "edgeless parent remainder R=Q=(1+x)^n, g1 is strictly positive "
            "for every h=ell-8>=0, collision count k>=0, and n>=0."
        ),
        "exact_certificate": {
            "normalization": "360*g1 is a polynomial in h,k,n",
            "variables_domain": "h,k,n are arbitrary nonnegative integers",
            "nonzero_monomials": len(scaled.terms()),
            "negative_coefficients": 0,
            "minimum_positive_integer_coefficient": str(min(coefficients)),
            "coefficient_stream_sha256": hashlib.sha256(stream.encode()).hexdigest().upper(),
            "strict_positivity_reason": (
                "Every coefficient is positive and the constant coefficient is positive."
            ),
        },
        "dependencies_sha256": PINS,
        "scope": (
            "This closes only the ell>=8 edgeless-parent subfamily of the "
            "internal-spine endpoint g1 mode.  Non-edgeless parent forests, "
            "small ell, the full mode, g2, all N5, and Erdos Problem 993 remain open."
        ),
        "source_sha256": sha256(Path(__file__)),
    }
    raw = json.dumps(report, indent=2, sort_keys=True) + "\n"
    OUTPUT.write_text(raw, encoding="utf-8", newline="\n")
    print(json.dumps({
        "marker": MARKER,
        "monomials": len(scaled.terms()),
        "minimum_coefficient": str(min(coefficients)),
        "theorem": report["theorem"],
        "scope": report["scope"],
    }, indent=2, sort_keys=True))
    print("REPORT_SHA256", hashlib.sha256(raw.encode()).hexdigest().upper())
    print(MARKER)


if __name__ == "__main__":
    main()
