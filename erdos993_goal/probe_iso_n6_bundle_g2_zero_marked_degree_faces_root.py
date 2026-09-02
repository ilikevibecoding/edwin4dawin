#!/usr/bin/env python3
"""Exact zero-unmarked-neighbour faces for rank-six bundle g2.

When a marked vertex has no neighbour in W, its marked-set category row is
an exact shift of the W independence row.  This probe substitutes those
equalities on the two faces where both marked vertices have zero W-degree:
u-v adjacent and u,v nonadjacent.  It is an exact reduction, not a theorem.
"""

from __future__ import annotations

import hashlib
import json
from pathlib import Path

import sympy as sp


HERE = Path(__file__).resolve().parent
INPUT = HERE / "iso_n6_bundle_g2_exact_parent_modes_probe_root_20260831.json"
OUTPUT = HERE / "iso_n6_bundle_g2_zero_marked_degree_faces_probe_root_20260831.json"
MARKER = "PROBE_EXACT_ISO_N6_BUNDLE_G2_ZERO_MARKED_DEGREE_FACES_ROOT"


def expression_summary(value: sp.Expr) -> dict[str, object]:
    variables = tuple(sorted(value.free_symbols, key=str))
    polynomial = sp.Poly(sp.expand(value), *variables)
    return {
        "terms": len(polynomial.terms()),
        "negative_scalar_coefficients": sum(
            coefficient.is_negative is True for coefficient in polynomial.coeffs()
        ),
        "minimum_scalar_coefficient": str(min(polynomial.coeffs())),
        "factored": str(sp.factor(value)),
    }


def main() -> None:
    source = json.loads(INPUT.read_text(encoding="utf-8"))
    assert source["marker"] == "PROBE_EXACT_ISO_N6_BUNDLE_G2_PARENT_MODES_ROOT"
    n = sp.Symbol("n", integer=True, positive=True)
    symbols = {"n": n}
    for family in "WABZ":
        for rank in range(2, 8):
            symbols[f"{family}{rank}"] = sp.Symbol(
                f"{family}{rank}", nonnegative=True
            )
    w = {0: sp.Integer(1), 1: n - 2}
    w.update({rank: symbols[f"W{rank}"] for rank in range(2, 8)})

    faces = {}
    for face in ("adjacent", "nonadjacent"):
        rules = {}
        for rank in range(2, 8):
            rules[symbols[f"A{rank}"]] = w[rank - 1]
            rules[symbols[f"B{rank}"]] = w[rank - 1]
            rules[symbols[f"Z{rank}"]] = (
                sp.Integer(0) if face == "adjacent" else w[rank - 2]
            )
        modes = {}
        for mode, row in source["modes"].items():
            expression = sp.sympify(row["expression"], locals=symbols)
            reduced = sp.expand(expression.subs(rules))
            modes[mode] = expression_summary(reduced)
        assert sp.expand(
            sp.sympify(source["modes"]["endpoint_u"]["expression"], locals=symbols).subs(rules)
            - sp.sympify(source["modes"]["endpoint_v"]["expression"], locals=symbols).subs(rules)
        ) == 0
        faces[face] = {
            "row_equalities": (
                "A_r=B_r=W_(r-1), Z_r=0" if face == "adjacent" else
                "A_r=B_r=W_(r-1), Z_r=W_(r-2)"
            ),
            "modes": modes,
        }

    report = {
        "marker": MARKER,
        "rank": 6,
        "coefficient": "g2",
        "faces": faces,
        "status": "exact boundary-face reductions; no sign theorem asserted",
        "source_sha256": hashlib.sha256(Path(__file__).read_bytes()).hexdigest().upper(),
    }
    encoded = json.dumps(report, indent=2, sort_keys=True) + "\n"
    OUTPUT.write_text(encoded, encoding="utf-8", newline="\n")
    print(json.dumps({
        "marker": MARKER,
        "summaries": {
            face: {
                mode: {
                    "terms": values["terms"],
                    "negative_scalar_coefficients": values["negative_scalar_coefficients"],
                }
                for mode, values in row["modes"].items()
            }
            for face, row in faces.items()
        },
    }, indent=2, sort_keys=True))
    print("SOURCE_SHA256", report["source_sha256"])
    print("REPORT_SHA256", hashlib.sha256(encoded.encode()).hexdigest().upper())
    print(MARKER)


if __name__ == "__main__":
    main()
