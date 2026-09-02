#!/usr/bin/env python3
"""Search a constant conic routing through already-proved G2 mark modes."""

from __future__ import annotations

import hashlib
import json
from fractions import Fraction
from pathlib import Path

import numpy as np
import sympy as sp
from scipy.optimize import linprog


HERE = Path(__file__).resolve().parent
INPUT = HERE / "iso_n6_bundle_g2_adjacent_ordinary_marked_spine_identities_exact_rank7_g5_finish_20260831.json"
INPUT_SHA256 = "87DCC172FEDB037B47219774174E0AC8A842AE663039E90F9A97B172A166E983"
OUTPUT = HERE / "iso_n6_bundle_g2_adjacent_ordinary_marked_spine_routing_cone_search_rank7_g5_finish_20260831.json"
MARKER = "SEARCH_ISO_N6_BUNDLE_G2_ADJACENT_ORDINARY_MARKED_SPINE_ROUTING_CONE_RANK7_G5_FINISH"


def sha256(path):
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def main():
    assert sha256(INPUT) == INPUT_SHA256
    report = json.loads(INPUT.read_text(encoding="utf-8"))
    names = {"n": sp.Symbol("n")}
    for mask in (0, 1, 2, 4, 5):
        for rank in range(2, 8):
            names[f"R{mask}_{rank}"] = sp.Symbol(f"R{mask}_{rank}", nonnegative=True)
    target = sp.sympify(report["target"]["factored"], locals=names)
    references = {}
    # Proven all-order inputs: no-parent for every pair geometry and endpoint
    # deletion for either endpoint of either adjacent pair pu or uv.
    labels = (
        "marks_pu_delete_none", "marks_uv_delete_none", "marks_pv_delete_none",
        "marks_pu_delete_p", "marks_pu_delete_u",
        "marks_uv_delete_u", "marks_uv_delete_v",
    )
    for label in labels:
        difference = sp.sympify(
            report["comparisons_target_minus_reference"][label]["difference_factored"],
            locals=names,
        )
        references[label] = sp.expand(target - difference)

    n = names["n"]
    t = sp.Symbol("t", nonnegative=True)
    attempts = []
    for threshold in range(3, 61):
        shifted_target = sp.Poly(sp.expand(target.subs(n, t + threshold)), *sorted((target.free_symbols-{n})|{t}, key=str))
        generators = shifted_target.gens
        shifted_refs = {
            label: sp.Poly(sp.expand(value.subs(n, t + threshold)), *generators)
            for label, value in references.items()
        }
        monomials = sorted(set(shifted_target.monoms()).union(*(set(poly.monoms()) for poly in shifted_refs.values())))
        tv = np.array([float(shifted_target.coeff_monomial(m)) for m in monomials])
        matrix = np.array([
            [float(shifted_refs[label].coeff_monomial(m)) for label in labels]
            for m in monomials
        ])
        result = linprog(np.zeros(len(labels)), A_ub=matrix, b_ub=tv, bounds=[(0, None)]*len(labels), method="highs")
        row = {"threshold": threshold, "float_feasible": bool(result.success), "message": result.message}
        if result.success:
            fractions = [Fraction(float(x)).limit_denominator(10_000) for x in result.x]
            residual = sp.expand(target.subs(n, t+threshold) - sum(
                sp.Rational(x.numerator, x.denominator)*references[label].subs(n, t+threshold)
                for label, x in zip(labels, fractions)
            ))
            poly = sp.Poly(residual, *generators)
            bad = [c for c in poly.coeffs() if c < 0]
            row.update({
                "weights": {label: str(x) for label, x in zip(labels, fractions)},
                "exact_negative": len(bad),
                "exact_minimum": str(min(poly.coeffs())),
            })
            if not bad:
                row["exact_residual"] = str(sp.factor(residual))
                attempts.append(row)
                break
        attempts.append(row)
        print(threshold, result.success, row.get("exact_negative"), flush=True)

    out = {
        "marker": MARKER,
        "input": {"file": INPUT.name, "sha256": INPUT_SHA256},
        "reference_modes": list(labels),
        "attempts": attempts,
        "status": "exact routing cone found" if attempts[-1].get("exact_negative") == 0 else "no constant routing cone found through threshold 60",
        "source_sha256": hashlib.sha256(Path(__file__).read_bytes()).hexdigest().upper(),
    }
    raw = json.dumps(out, indent=2, sort_keys=True)+"\n"
    OUTPUT.write_text(raw, encoding="utf-8", newline="\n")
    print(json.dumps(out, indent=2, sort_keys=True))
    print("REPORT_SHA256", hashlib.sha256(raw.encode()).hexdigest().upper())
    print(MARKER)


if __name__ == "__main__":
    main()
