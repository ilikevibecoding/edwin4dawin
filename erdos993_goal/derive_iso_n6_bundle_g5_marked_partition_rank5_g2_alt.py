#!/usr/bin/env python3
"""Independent exact W/A/B/Z reconstruction of rank-six bundle g5."""

from __future__ import annotations

import hashlib
import json
from pathlib import Path

import sympy as sp

from derive_iso_n4_bundle_polynomial_root import (
    add_xd, binomial_basis, isolate_multiply, nested_rank,
)


HERE = Path(__file__).resolve().parent
OUTPUT = HERE / "iso_n6_bundle_g5_marked_partition_exact_rank5_g2_alt_20260830.json"
MARKER = "DERIVED_EXACT_ISO_N6_BUNDLE_G5_MARKED_PARTITION_RANK5_G2_ALT"


def derive_g5():
    rank = 6
    maximum = 7
    m, t = sp.symbols("M t", integer=True, nonnegative=True)
    crows = tuple(tuple(sp.symbols(f"c{name}0:{maximum + 1}")) for name in "EUVW")
    drows = tuple(tuple(sp.symbols(f"d{name}0:{maximum + 1}")) for name in "EUVW")
    bundled = add_xd(isolate_multiply(crows, m, maximum), drows)
    base = add_xd(crows, drows)
    lower = nested_rank(isolate_multiply(crows, t, rank), rank - 1)
    lower_polynomial = sp.Poly(lower, t)
    lower_sum = sp.expand(sum(
        coefficient
        * (sp.bernoulli(power + 1, m) - sp.bernoulli(power + 1, 0))
        / (power + 1)
        for (power,), coefficient in lower_polynomial.terms()
    ))
    gamma = sp.expand(nested_rank(bundled, rank) - nested_rank(base, rank) - lower_sum)
    coefficients = binomial_basis(gamma, m)
    return sp.expand(coefficients[5])


def marked_partition():
    n, q, eu, ev = sp.symbols("n q epsilon_u epsilon_v", integer=True, nonnegative=True)
    structural = {sp.Symbol(f"{prefix}{name}0"): 1 for prefix in ("c", "d") for name in "EUVW"}
    structural.update({
        sp.Symbol("cE1"): n, sp.Symbol("cU1"): n - 1,
        sp.Symbol("cV1"): n - 1, sp.Symbol("cW1"): n - 2,
        sp.Symbol("dE1"): q, sp.Symbol("dU1"): q - eu,
        sp.Symbol("dV1"): q - ev, sp.Symbol("dW1"): q - eu - ev,
    })
    g5 = sp.expand(derive_g5().subs(structural))
    rows = {
        name: {rank: sp.symbols(f"{name}{rank}", integer=True, nonnegative=True)
               for rank in range(2, 6)}
        for name in ("W", "A", "B", "Z")
    }
    partition = {}
    for rank in range(2, 6):
        w, a, b, z = (rows[name][rank] for name in ("W", "A", "B", "Z"))
        partition.update({
            sp.Symbol(f"cW{rank}"): w,
            sp.Symbol(f"cU{rank}"): w + a,
            sp.Symbol(f"cV{rank}"): w + b,
            sp.Symbol(f"cE{rank}"): w + a + b + z,
        })
    partitioned = sp.expand(g5.subs(partition))
    return g5, partitioned, rows


def main():
    g5, partitioned, rows = marked_partition()
    variables = tuple(sorted(partitioned.free_symbols, key=str))
    polynomial = sp.Poly(partitioned, *variables)
    terms = polynomial.terms()
    stream = "".join(f"{powers}:{value};" for powers, value in terms)
    negative = [(powers, value) for powers, value in terms if value < 0]
    report = {
        "marker": MARKER,
        "rank": 6, "coefficient": "g5",
        "raw_structural_expression": str(sp.factor(g5)),
        "partitioned_expression": str(sp.factor(partitioned)),
        "marked_partition": {
            "Wk": "sets containing neither marked vertex",
            "Ak": "sets containing v but not u, after removing v",
            "Bk": "sets containing u but not v, after removing u",
            "Zk": "sets containing both marks, after removing both",
            "row_identity": "cWk=Wk,cUk=Wk+Ak,cVk=Wk+Bk,cEk=Wk+Ak+Bk+Zk",
        },
        "summary": {
            "monomials": len(terms),
            "negative_scalar_coefficients": len(negative),
            "minimum_scalar_coefficient": str(min(polynomial.coeffs())),
            "ordered_term_stream_sha256": hashlib.sha256(stream.encode()).hexdigest().upper(),
            "free_symbols": [str(value) for value in variables],
        },
        "negative_terms": [
            {"powers": list(powers), "coefficient": str(value)}
            for powers, value in negative
        ],
        "status": "exact marked-partition reduction; sign not asserted",
        "scope": "Universal rank-six bundle g5 algebra only.",
        "source_sha256": hashlib.sha256(Path(__file__).read_bytes()).hexdigest().upper(),
    }
    raw = json.dumps(report, indent=2, sort_keys=True) + "\n"
    OUTPUT.write_text(raw, encoding="utf-8", newline="\n")
    print(json.dumps({
        "marker": MARKER, **report["summary"],
    }, indent=2, sort_keys=True))
    print("REPORT_SHA256", hashlib.sha256(raw.encode()).hexdigest().upper())
    print(MARKER)


if __name__ == "__main__":
    main()
