#!/usr/bin/env python3
"""Probe the internal-spine path coefficients in membership-atom variables.

For distinct parent-side marks v,p, every independent set belongs to one of
four nonnegative membership atoms: neither, v only, p only, or both.  This
script substitutes those exact coefficient partitions into every stable
path-length coefficient and inspects scalar signs.  It is a sign probe only;
negative scalar monomials would require further forest-specific payments.
"""

from __future__ import annotations

import hashlib
import json
from pathlib import Path

import sympy as sp


HERE = Path(__file__).resolve().parent
DEPENDENCY = HERE / "iso_n4_bundle_internal_spine_path_length_root_20260829.json"
OUTPUT = HERE / "iso_n4_internal_spine_membership_atoms_probe_root_20260829.json"


def main():
    dependency = json.loads(DEPENDENCY.read_text(encoding="utf-8"))
    assert dependency["marker"] == "DERIVED_EXACT_ISO_N4_BUNDLE_INTERNAL_SPINE_PATH_LENGTH_ROOT"
    substitutions = {}
    for rank in range(1, 6):
        w, a, b, c = sp.symbols(f"w{rank} a{rank} b{rank} c{rank}", nonnegative=True)
        substitutions.update({
            sp.symbols(f"r0_{rank}"): w + a + b + c,
            sp.symbols(f"rv_{rank}"): w + b,
            sp.symbols(f"rp_{rank}"): w + a,
            sp.symbols(f"rvp_{rank}"): w,
        })

    result = {}
    for name, block in dependency["coefficients"].items():
        entries = []
        for index, record in enumerate(block["binomial_coefficients"]):
            expression = sp.expand(sp.sympify(record["factor"]).subs(substitutions))
            symbols = sorted(expression.free_symbols, key=str)
            polynomial = sp.Poly(expression, *symbols) if symbols else sp.Poly(expression)
            coefficients = polynomial.coeffs()
            negatives = [str(value) for value in coefficients if value.is_negative is True]
            entries.append({
                "path_binomial_index": index,
                "monomials": len(coefficients),
                "negative_scalar_coefficients": len(negatives),
                "minimum_scalar_coefficient": str(min(coefficients)) if coefficients else "0",
                "factor": str(sp.factor(expression)),
            })
        result[name] = entries

    report = {
        "marker": "PROBE_EXACT_ISO_N4_INTERNAL_SPINE_MEMBERSHIP_ATOMS_ROOT",
        "substitution": (
            "rvp=w, rp=w+a, rv=w+b, r0=w+a+b+c at each positive rank; "
            "all atom counts are nonnegative for distinct v,p"
        ),
        "coefficients": result,
        "scope_guard": "Scalar-sign probe only; not a theorem unless every required expression is manifestly nonnegative.",
        "dependency_sha256": hashlib.sha256(DEPENDENCY.read_bytes()).hexdigest().upper(),
        "source_sha256": hashlib.sha256(Path(__file__).read_bytes()).hexdigest().upper(),
    }
    raw = json.dumps(report, indent=2, sort_keys=True) + "\n"
    OUTPUT.write_text(raw, encoding="utf-8")
    print(json.dumps({
        "marker": report["marker"],
        "summaries": {
            name: [
                {"j": item["path_binomial_index"], "monomials": item["monomials"], "negative": item["negative_scalar_coefficients"]}
                for item in entries
            ]
            for name, entries in result.items()
        },
        "report_sha256": hashlib.sha256(raw.encode()).hexdigest().upper(),
    }, indent=2, sort_keys=True))
    print(report["marker"])


if __name__ == "__main__":
    main()
