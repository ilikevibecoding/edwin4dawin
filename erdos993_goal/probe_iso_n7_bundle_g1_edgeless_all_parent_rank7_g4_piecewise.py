#!/usr/bin/env python3
"""Exact edgeless-core reconnaissance for rank-seven G1 in all parent modes."""

from __future__ import annotations

import hashlib
import json
from pathlib import Path

import sympy as sp


HERE = Path(__file__).resolve().parent
INPUT = HERE / "iso_n7_bundle_g1_parent_modes_exact_rank7_g4_piecewise_20260831.json"
INPUT_SHA256 = "1662D04DD24AF51A71BD2BFA0ECEE7DE852A3CDD03D3B54A5C638AAA35CC4490"
OUTPUT = HERE / "iso_n7_bundle_g1_edgeless_all_parent_probe_rank7_g4_piecewise_20260831.json"
MARKER = "PROBE_EXACT_ISO_N7_BUNDLE_G1_EDGELESS_ALL_PARENT_RANK7_G4_PIECEWISE"
THRESHOLD = 11


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def choose(h, k):
    if k < 0:
        return sp.Integer(0)
    if k == 0:
        return sp.Integer(1)
    return sp.prod(h-j for j in range(k))/sp.factorial(k)


def main() -> None:
    assert sha256(INPUT) == INPUT_SHA256
    source = json.loads(INPUT.read_text(encoding="utf-8"))
    names = {
        f"{family}{rank}": sp.Symbol(f"{family}{rank}", nonnegative=True)
        for family in "WABZ" for rank in range(2, 9)
    }
    names.update({
        f"P{family}{rank}": sp.Symbol(f"P{family}{rank}", nonnegative=True)
        for family in "WABZ" for rank in range(3, 8)
    })
    n, tail = sp.symbols("n tail", integer=True, nonnegative=True)
    category = {}
    for k in range(2, 9):
        category.update({
            names[f"W{k}"]: choose(n-2, k),
            names[f"A{k}"]: choose(n-2, k-1),
            names[f"B{k}"]: choose(n-2, k-1),
            names[f"Z{k}"]: choose(n-2, k-2),
        })
    parent_ordinary = {}
    for k in range(3, 8):
        parent_ordinary.update({
            names[f"PW{k}"]: choose(n-3, k-1),
            names[f"PA{k}"]: choose(n-3, k-2),
            names[f"PB{k}"]: choose(n-3, k-2),
            names[f"PZ{k}"]: choose(n-3, k-3),
        })
    rows = {}
    for mode in ("no_parent", "endpoint_u", "endpoint_v", "ordinary_parent"):
        expression = sp.expand(sp.sympify(
            source["modes"][mode]["expression"], locals=names
        ))
        substitutions = dict(category)
        if mode == "ordinary_parent":
            substitutions.update(parent_ordinary)
        value = sp.factor(expression.subs(substitutions, simultaneous=True))
        numerator, denominator = sp.fraction(sp.cancel(value))
        shifted = sp.Poly(sp.expand(numerator.subs(n, tail+THRESHOLD)), tail)
        coefficients = shifted.all_coeffs()
        rows[mode] = {
            "expression": str(value),
            "denominator": str(denominator),
            "shifted_numerator": str(shifted.as_expr()),
            "shifted_coefficients": list(map(str, coefficients)),
            "negative_shifted_coefficients": sum(
                1 for value in coefficients if value.is_negative is True
            ),
            "minimum_shifted_coefficient": str(min(coefficients)),
        }
    report = {
        "marker": MARKER,
        "threshold": THRESHOLD,
        "rows": rows,
        "negative_shifted_coefficients": sum(
            row["negative_shifted_coefficients"] for row in rows.values()
        ),
        "semantics": (
            "C is the edgeless n-vertex forest.  The four parent modes use "
            "D=C, C-u, C-v, or C-p with p ordinary, respectively."
        ),
        "status": "diagnostic exact specialization; no theorem asserted",
        "scope": "Rank-seven G1 edgeless C, all canonical parent modes, n>=11.",
        "input_sha256": INPUT_SHA256,
        "source_sha256": sha256(Path(__file__)),
    }
    encoded = json.dumps(report, indent=2, sort_keys=True)+"\n"
    OUTPUT.write_text(encoded, encoding="utf-8", newline="\n")
    print(json.dumps({
        "marker": MARKER,
        "negative_shifted_coefficients": report["negative_shifted_coefficients"],
        "mode_minima": {
            key: value["minimum_shifted_coefficient"] for key, value in rows.items()
        },
        "expressions": {key: value["expression"] for key, value in rows.items()},
    }, indent=2, sort_keys=True))
    print("SOURCE_SHA256", report["source_sha256"])
    print("REPORT_SHA256", hashlib.sha256(encoded.encode()).hexdigest().upper())
    print(MARKER)


if __name__ == "__main__":
    main()
