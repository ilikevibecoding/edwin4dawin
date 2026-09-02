#!/usr/bin/env python3
"""Exact sign probe for the internal-spine boundary p=v.

When the parent-side neighbour p equals the protected mark v, Rp=Rvp=Rv.
Writing R0=Rv+xQ with Q=I(F-N[v]) gives an exact nonnegative-coefficient
parameterization.  This script applies it to every stable path-length
binomial coefficient and reports whether scalar coefficient positivity alone
closes the branch.
"""

from __future__ import annotations

import hashlib
import json
from pathlib import Path

import sympy as sp


HERE = Path(__file__).resolve().parent
DEPENDENCY = HERE / "iso_n4_bundle_internal_spine_path_length_root_20260829.json"
OUTPUT = HERE / "iso_n4_internal_spine_parent_equals_mark_probe_root_20260829.json"


def main():
    dependency = json.loads(DEPENDENCY.read_text(encoding="utf-8"))
    assert dependency["marker"] == "DERIVED_EXACT_ISO_N4_BUNDLE_INTERNAL_SPINE_PATH_LENGTH_ROOT"
    substitutions = {}
    for rank in range(1, 6):
        r = sp.symbols(f"R{rank}", nonnegative=True)
        q_previous = sp.Integer(1) if rank == 1 else sp.symbols(f"Q{rank - 1}", nonnegative=True)
        substitutions.update({
            sp.symbols(f"rv_{rank}"): r,
            sp.symbols(f"rp_{rank}"): r,
            sp.symbols(f"rvp_{rank}"): r,
            sp.symbols(f"r0_{rank}"): r + q_previous,
        })

    results = {}
    all_nonnegative = True
    for name, block in dependency["coefficients"].items():
        entries = []
        for index, record in enumerate(block["binomial_coefficients"]):
            expression = sp.expand(sp.sympify(record["factor"]).subs(substitutions))
            symbols = sorted(expression.free_symbols, key=str)
            coefficients = sp.Poly(expression, *symbols).coeffs() if symbols else [expression]
            negative = [str(value) for value in coefficients if value.is_negative is True]
            all_nonnegative &= not negative
            entries.append({
                "j": index,
                "monomials": len(coefficients),
                "negative_scalar_coefficients": len(negative),
                "minimum_scalar_coefficient": str(min(coefficients)),
                "factor": str(sp.factor(expression)),
            })
        results[name] = entries

    report = {
        "marker": (
            "PASS_EXACT_ISO_N4_INTERNAL_SPINE_PARENT_EQUALS_MARK_STABLE_ROOT"
            if all_nonnegative
            else "PROBE_EXACT_ISO_N4_INTERNAL_SPINE_PARENT_EQUALS_MARK_ROOT"
        ),
        "stable_path": dependency["stable_shift"],
        "substitution": "Rp=Rvp=Rv=R and R0=R+xQ",
        "all_scalar_coefficients_nonnegative": all_nonnegative,
        "coefficients": results,
        "dependency_sha256": hashlib.sha256(DEPENDENCY.read_bytes()).hexdigest().upper(),
        "source_sha256": hashlib.sha256(Path(__file__).read_bytes()).hexdigest().upper(),
        "scope_guard": "Stable ell>=6 p=v branch only; ell=1..5 remain separate unless independently checked.",
    }
    raw = json.dumps(report, indent=2, sort_keys=True) + "\n"
    OUTPUT.write_text(raw, encoding="utf-8")
    print(json.dumps({
        "marker": report["marker"],
        "all_nonnegative": all_nonnegative,
        "summaries": {
            name: [{"j": e["j"], "monomials": e["monomials"], "negative": e["negative_scalar_coefficients"]} for e in entries]
            for name, entries in results.items()
        },
        "report_sha256": hashlib.sha256(raw.encode()).hexdigest().upper(),
    }, indent=2, sort_keys=True))
    print(report["marker"])


if __name__ == "__main__":
    main()
