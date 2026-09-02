#!/usr/bin/env python3
"""Independent exact W/A/B/Z reconstruction of rank-seven bundle g4.

This is a fail-closed algebraic reduction.  It pins the literal fourth
forward difference of the bundle-payment polynomial, substitutes only the
universal order-one forest identities, and then partitions every C-row by
membership of the two marks.  No sign theorem is asserted here.
"""

from __future__ import annotations

import hashlib
import json
from pathlib import Path

import sympy as sp

from audit_iso_n7_bundle_g7_g12_independent_rank5_g2_alt import (
    reconstruct_coefficients,
)


HERE = Path(__file__).resolve().parent
OUTPUT = HERE / "iso_n7_bundle_g4_marked_partition_exact_rank7_terminal_20260831.json"
MARKER = "DERIVED_EXACT_ISO_N7_BUNDLE_G4_MARKED_PARTITION_RANK7_TERMINAL"
RECON_SOURCE = HERE / "audit_iso_n7_bundle_g7_g12_independent_rank5_g2_alt.py"
RECON_SOURCE_SHA = "E80E7C08A74E87F5B202A57BF4DE8E1960760A5443068CC8C07BC3C35A421E37"


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def main():
    assert sha256(RECON_SOURCE) == RECON_SOURCE_SHA
    coefficients = reconstruct_coefficients()
    assert len(coefficients) == 13 and coefficients[0] == 0
    g4_generic = coefficients[4]

    n, q, eu, ev = sp.symbols(
        "n q epsilon_u epsilon_v", integer=True, nonnegative=True
    )
    structural = {}
    for name in "EUVW":
        structural[sp.Symbol(f"c{name}0")] = 1
        structural[sp.Symbol(f"d{name}0")] = 1
    structural.update({
        sp.Symbol("cE1"): n,
        sp.Symbol("cU1"): n - 1,
        sp.Symbol("cV1"): n - 1,
        sp.Symbol("cW1"): n - 2,
        sp.Symbol("dE1"): q,
        sp.Symbol("dU1"): q - eu,
        sp.Symbol("dV1"): q - ev,
        sp.Symbol("dW1"): q - eu - ev,
    })
    raw = sp.factor(g4_generic.subs(structural))

    rows = {
        name: {
            rank: sp.Symbol(f"{name}{rank}", integer=True, nonnegative=True)
            for rank in range(2, 9)
        }
        for name in "WABZ"
    }
    partition = {}
    for rank in range(2, 9):
        w, a, b, z = (rows[name][rank] for name in "WABZ")
        partition.update({
            sp.Symbol(f"cW{rank}"): w,
            sp.Symbol(f"cU{rank}"): w + a,
            sp.Symbol(f"cV{rank}"): w + b,
            sp.Symbol(f"cE{rank}"): w + a + b + z,
        })
    partitioned = sp.factor(raw.subs(partition))
    assert not any(str(symbol).startswith("c") for symbol in partitioned.free_symbols)

    variables = tuple(sorted(partitioned.free_symbols, key=str))
    polynomial = sp.Poly(partitioned, *variables)
    terms = polynomial.terms()
    negative = [(powers, value) for powers, value in terms if value < 0]
    stream = "".join(f"{powers}:{value};" for powers, value in terms)
    d_symbols = sorted(
        (symbol for symbol in partitioned.free_symbols if str(symbol).startswith("d")),
        key=str,
    )
    d_coefficients = {
        str(symbol): str(sp.factor(sp.diff(partitioned, symbol)))
        for symbol in d_symbols
    }
    assert all(sp.diff(partitioned, symbol, 2) == 0 for symbol in d_symbols)

    report = {
        "marker": MARKER,
        "rank": 7,
        "coefficient": "g4",
        "raw_structural_expression": str(raw),
        "partitioned_expression": str(partitioned),
        "marked_partition": {
            "Wk": "independent k-sets containing neither mark",
            "Ak": "independent k-sets containing v but not u",
            "Bk": "independent k-sets containing u but not v",
            "Zk": "independent k-sets containing both marks",
            "identity": "cWk=Wk,cUk=Wk+Ak,cVk=Wk+Bk,cEk=Wk+Ak+Bk+Zk",
        },
        "summary": {
            "monomials": len(terms),
            "negative_scalar_coefficients": len(negative),
            "minimum_scalar_coefficient": str(min(polynomial.coeffs())),
            "ordered_term_stream_sha256": hashlib.sha256(stream.encode()).hexdigest().upper(),
            "free_symbols": [str(value) for value in variables],
            "D_symbols": [str(value) for value in d_symbols],
        },
        "D_coefficients": d_coefficients,
        "negative_terms": [
            {"powers": list(powers), "coefficient": str(value)}
            for powers, value in negative
        ],
        "status": "exact marked-partition reduction; no sign theorem asserted",
        "scope": "Universal rank-seven bundle g4 algebra only.",
        "dependencies_sha256": {RECON_SOURCE.name: RECON_SOURCE_SHA},
        "source_sha256": sha256(Path(__file__)),
    }
    encoded = json.dumps(report, indent=2, sort_keys=True) + "\n"
    OUTPUT.write_text(encoded, encoding="utf-8", newline="\n")
    print(json.dumps({"marker": MARKER, **report["summary"]}, indent=2, sort_keys=True))
    print("SOURCE_SHA256", report["source_sha256"])
    print("REPORT_SHA256", hashlib.sha256(encoded.encode()).hexdigest().upper())
    print(MARKER)


if __name__ == "__main__":
    main()
