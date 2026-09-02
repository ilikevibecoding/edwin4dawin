#!/usr/bin/env python3
"""Exact symbolic probe for forest-cone selector discriminants.

For fixed layer s, construct the selector

    Gamma_(N,s)(t)=G_(N,s)(t)-2tG_(N-1,s)(t)+t^2G_(N-2,s)(t)

directly from the path-slice coefficients.  Substitute N=2s+5+q, compute
the exact discriminant in t, clear its positive rational denominator, and
check that every coefficient in q is strictly positive.

This is finite symbolic evidence for a possible all-order continuation
proof.  It is deliberately not labeled an all-order theorem.
"""

from __future__ import annotations

import argparse
import hashlib
import json
from pathlib import Path

import sympy as sp


HERE = Path(__file__).resolve().parent
REPORT = HERE / "selector_shifted_discriminant_positivity_exact_20260809.json"
N, q, t, z = sp.symbols("N q t z")


def polynomial_binomial(upper, lower: int):
    value = sp.Integer(1)
    for offset in range(lower):
        value *= upper - offset
    return sp.cancel(value / sp.factorial(lower))


def path_slice_symbolic(size, layer: int):
    return [
        sp.expand(
            polynomial_binomial(2 * size - i - 1, i)
            * polynomial_binomial(2 * size - layer + i - 1, layer - i)
        )
        for i in range(layer + 1)
    ]


def gamma_symbolic(size, layer: int):
    coefficients = path_slice_symbolic(size, layer)
    remainder = sum(value * z**i for i, value in enumerate(coefficients))
    gamma = []
    for h in range(layer // 2 + 1):
        value = sp.expand(remainder).coeff(z, h)
        gamma.append(value)
        remainder = sp.expand(remainder - value * z**h * (1 + z) ** (layer - 2 * h))
    assert sp.expand(remainder) == 0
    return gamma


def selector_symbolic(layer: int):
    current, previous, older = [gamma_symbolic(N - shift, layer) for shift in range(3)]
    return sp.expand(
        sum(value * t**h for h, value in enumerate(current))
        - 2 * t * sum(value * t**h for h, value in enumerate(previous))
        + t**2 * sum(value * t**h for h, value in enumerate(older))
    )


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--max-layer", type=int, default=10)
    parser.add_argument("--output", type=Path, default=REPORT)
    args = parser.parse_args()

    records = []
    total_coefficients = 0
    for layer in range(2, args.max_layer + 1):
        selector = selector_symbolic(layer)
        shifted = sp.together(sp.discriminant(selector, t).subs(N, q + 2 * layer + 5))
        numerator, denominator = shifted.as_numer_denom()
        denominator = sp.Integer(denominator)
        assert denominator > 0
        polynomial = sp.Poly(numerator, q)
        coefficients = polynomial.all_coeffs()
        assert all(coefficient.is_Integer and coefficient > 0 for coefficient in coefficients)
        total_coefficients += len(coefficients)
        records.append({
            "layer": layer,
            "selector_degree": int(sp.degree(selector, t)),
            "shifted_discriminant_degree": int(polynomial.degree()),
            "shifted_discriminant_coefficients": len(coefficients),
            "all_shifted_discriminant_coefficients_strictly_positive": True,
        })

    source_hash = hashlib.sha256(Path(__file__).read_bytes()).hexdigest().upper()
    report = {
        "status": "PASS_EXACT_FINITE_SELECTOR_SHIFTED_DISCRIMINANT_POSITIVITY",
        "parameterization": "N=2s+5+q with q>=0",
        "scope": {
            "layers": [2, args.max_layer],
            "symbolic_layers": len(records),
            "strictly_positive_exact_coefficients": total_coefficients,
        },
        "interpretation": (
            "For every checked layer, the exact selector discriminant is a "
            "positive rational multiple of a polynomial in q with strictly "
            "positive coefficients. This proves noncollision in those finite "
            "symbolic layers, but is not an all-order proof."
        ),
        "source_sha256": source_hash,
        "records": records,
    }
    args.output.write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    report_hash = hashlib.sha256(args.output.read_bytes()).hexdigest().upper()
    print(json.dumps({
        "status": report["status"],
        "layers": len(records),
        "positive_coefficients": total_coefficients,
        "source_sha256": source_hash,
        "report_sha256": report_hash,
        "report": str(args.output),
    }, indent=2))


if __name__ == "__main__":
    main()
