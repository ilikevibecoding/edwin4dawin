#!/usr/bin/env python3
"""Coefficientwise shifted-cone elimination of rank-four variables in g2.

The input already contains exact parent-mode lower bounds after ranks 7, 6,
and 5.  For n>=41, each coefficient of a rank-four variable is split in the
shifted power cone into P-Q.  P is discarded and Q is paid by a universal
consecutive-set cap.  The resulting identity is checked exactly.  This remains
a diagnostic lower cone until the final residual is certified.
"""

from __future__ import annotations

import hashlib
import json
from pathlib import Path

import sympy as sp


HERE = Path(__file__).resolve().parent
INPUT = HERE / "iso_n6_bundle_g2_mode_elimination_probe_root_20260831.json"
OUTPUT = HERE / "iso_n6_bundle_g2_high_mode_cone_probe_root_20260831.json"
MARKER = "PROBE_EXACT_ISO_N6_BUNDLE_G2_HIGH_MODE_CONE_ROOT"
THRESHOLD = 41


def shifted_split(expression, n, r):
    shifted = sp.expand(expression.subs(n, r + THRESHOLD))
    generators = tuple(sorted(shifted.free_symbols, key=str))
    if not generators:
        if shifted >= 0:
            return shifted, sp.Integer(0), shifted, sp.Integer(0)
        return sp.Integer(0), -shifted, sp.Integer(0), -shifted
    polynomial = sp.Poly(shifted, *generators)
    positive = sp.Integer(0)
    negative = sp.Integer(0)
    for powers, coefficient in polynomial.terms():
        monomial = sp.prod(
            generator ** power for generator, power in zip(generators, powers)
        )
        if coefficient >= 0:
            positive += coefficient * monomial
        else:
            negative += -coefficient * monomial
    positive = sp.expand(positive)
    negative = sp.expand(negative)
    positive_original = sp.expand(positive.subs(r, n - THRESHOLD))
    negative_original = sp.expand(negative.subs(r, n - THRESHOLD))
    assert sp.expand(expression - positive_original + negative_original) == 0
    return positive, negative, positive_original, negative_original


def eliminate(expression, variable, cap, n, r):
    polynomial = sp.Poly(expression, variable)
    lower = polynomial.coeff_monomial(1)
    payments = []
    reconstruction = lower
    for power in range(1, polynomial.degree() + 1):
        coefficient = polynomial.coeff_monomial(variable ** power)
        p_shift, q_shift, p_original, q_original = shifted_split(coefficient, n, r)
        lower -= q_original * cap ** power
        reconstruction += (
            p_original * variable ** power
            + q_original * (cap ** power - variable ** power)
            - q_original * cap ** power
        )
        payments.append({
            "power": power,
            "coefficient": str(sp.factor(coefficient)),
            "positive_shifted": str(sp.factor(p_shift)),
            "negative_shifted": str(sp.factor(q_shift)),
            "cap_power": str(sp.factor(cap ** power)),
        })
    lower = sp.expand(lower)
    assert sp.expand(expression - reconstruction) == 0
    assert variable not in lower.free_symbols
    return lower, payments


def main() -> None:
    source = json.loads(INPUT.read_text(encoding="utf-8"))
    assert source["marker"] == "PROBE_EXACT_ISO_N6_BUNDLE_G2_MODE_ELIMINATION_ROOT"
    assert source["rank5_split_threshold"] <= THRESHOLD
    symbols = {"n": sp.Symbol("n", nonnegative=True)}
    for family in "WABZ":
        for rank in range(2, 8):
            symbols[f"{family}{rank}"] = sp.Symbol(f"{family}{rank}", nonnegative=True)
    n = symbols["n"]
    r = sp.Symbol("r", nonnegative=True)
    cap_map = {
        "A4": (n - 4) * symbols["A3"] / 3,
        "B4": (n - 4) * symbols["B3"] / 3,
        "W4": (n - 5) * symbols["W3"] / 4,
        "Z4": (n - 3) * symbols["Z3"] / 2,
    }

    modes = {}
    for mode in ("no_parent", "endpoint_u", "endpoint_v"):
        original = sp.expand(sp.sympify(
            source["modes"][mode]["rank4_residual_n_at_least_27"],
            locals=symbols,
        ))
        current = original
        sequence = []
        for label in ("A4", "B4", "W4", "Z4"):
            current, payments = eliminate(
                current, symbols[label], cap_map[label], n, r
            )
            sequence.append({
                "variable": label, "cap": str(cap_map[label]),
                "power_payments": payments,
            })
        variables = tuple(sorted(current.free_symbols, key=str))
        polynomial = sp.Poly(current, *variables)
        shifted = sp.Poly(
            sp.expand(current.subs(n, r + THRESHOLD)),
            *sorted((current.free_symbols - {n}) | {r}, key=str),
        )
        modes[mode] = {
            "elimination_sequence": sequence,
            "low_rank_residual": str(sp.factor(current)),
            "summary": {
                "monomials": len(polynomial.terms()),
                "negative_scalar_coefficients": sum(
                    coefficient.is_negative is True for coefficient in polynomial.coeffs()
                ),
                "shifted_negative_coefficients": sum(
                    1 for coefficient in shifted.coeffs()
                    if coefficient.is_negative is True
                ),
                "shifted_minimum_coefficient": str(min(shifted.coeffs())),
                "free_symbols": [str(symbol) for symbol in variables],
            },
        }

    report = {
        "marker": MARKER,
        "threshold": THRESHOLD,
        "modes": modes,
        "status": "exact diagnostic lower cones; no final sign theorem asserted",
        "source_sha256": hashlib.sha256(Path(__file__).read_bytes()).hexdigest().upper(),
    }
    encoded = json.dumps(report, indent=2, sort_keys=True) + "\n"
    OUTPUT.write_text(encoded, encoding="utf-8", newline="\n")
    print(json.dumps({
        "marker": MARKER,
        "threshold": THRESHOLD,
        "summaries": {key: row["summary"] for key, row in modes.items()},
    }, indent=2, sort_keys=True))
    print("REPORT_SHA256", hashlib.sha256(encoded.encode()).hexdigest().upper())
    print(MARKER)


if __name__ == "__main__":
    main()
