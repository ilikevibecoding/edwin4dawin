#!/usr/bin/env python3
"""Exact symbolic parent-mode map for the rank-six bundle coefficient g2.

No-parent and the two endpoint-parent modes have literal D-row substitutions.
The ordinary-parent modes require a third-vertex loss partition and are left
open here.  This artifact is diagnostic, not a sign theorem.
"""

from __future__ import annotations

import hashlib
import json
from pathlib import Path

import sympy as sp

from explore_iso_n6_bundle_g2_marked_cone_g1_bernstein import reconstruct


HERE = Path(__file__).resolve().parent
OUTPUT = HERE / "iso_n6_bundle_g2_exact_parent_modes_probe_root_20260831.json"
MARKER = "PROBE_EXACT_ISO_N6_BUNDLE_G2_PARENT_MODES_ROOT"


def build_partitioned():
    generic = reconstruct()
    n, q, eu, ev = sp.symbols("n q epsilon_u epsilon_v")
    structural = {}
    for family in "EUVW":
        structural[sp.Symbol(f"c{family}0")] = 1
        structural[sp.Symbol(f"d{family}0")] = 1
    structural.update({
        sp.Symbol("cE1"): n, sp.Symbol("cU1"): n - 1,
        sp.Symbol("cV1"): n - 1, sp.Symbol("cW1"): n - 2,
        sp.Symbol("dE1"): q, sp.Symbol("dU1"): q - eu,
        sp.Symbol("dV1"): q - ev, sp.Symbol("dW1"): q - eu - ev,
    })
    raw = sp.expand(generic.subs(structural))
    rows = {
        family: {
            rank: sp.Symbol(f"{family}{rank}", nonnegative=True)
            for rank in range(2, 8)
        }
        for family in "WABZ"
    }
    rules = {}
    for rank in range(2, 8):
        w, a, b, z = (rows[family][rank] for family in "WABZ")
        rules.update({
            sp.Symbol(f"cW{rank}"): w,
            sp.Symbol(f"cU{rank}"): w + a,
            sp.Symbol(f"cV{rank}"): w + b,
            sp.Symbol(f"cE{rank}"): w + a + b + z,
        })
    return sp.expand(raw.subs(rules)), n, rows


def main() -> None:
    expression, n, rows = build_partitioned()
    names = {str(symbol): symbol for symbol in expression.free_symbols}
    S = lambda label: names[label]
    ranks = {
        "E": {rank: rows["W"][rank] + rows["A"][rank] + rows["B"][rank] + rows["Z"][rank] for rank in range(2, 8)},
        "U": {rank: rows["W"][rank] + rows["A"][rank] for rank in range(2, 8)},
        "V": {rank: rows["W"][rank] + rows["B"][rank] for rank in range(2, 8)},
        "W": {rank: rows["W"][rank] for rank in range(2, 8)},
    }
    dvariables = tuple(
        symbol for symbol in expression.free_symbols
        if str(symbol).startswith("d") and len(str(symbol)) >= 3
    )

    def mode_rules(parent: str | None):
        result = {}
        for variable in dvariables:
            label = str(variable)
            family, rank = label[1], int(label[2:])
            if parent is None:
                source_family = family
            elif parent == "u":
                source_family = {"E": "U", "U": "U", "V": "W", "W": "W"}[family]
            elif parent == "v":
                source_family = {"E": "V", "U": "W", "V": "V", "W": "W"}[family]
            else:
                raise AssertionError(parent)
            result[variable] = ranks[source_family][rank]
        return result

    reports = {}
    for label, parent in (("no_parent", None), ("endpoint_u", "u"), ("endpoint_v", "v")):
        value = sp.expand(expression.subs(mode_rules(parent)))
        variables = tuple(sorted(value.free_symbols, key=str))
        poly = sp.Poly(value, *variables)
        derivatives = {}
        for rank in (7, 6, 5, 4):
            for family in "ABWZ":
                variable = rows[family][rank]
                coefficient = sp.factor(sp.diff(value, variable))
                if coefficient != 0:
                    derivatives[str(variable)] = str(coefficient)
        reports[label] = {
            "expression": str(sp.factor(value)),
            "monomials": len(poly.terms()),
            "negative_scalar_coefficients": sum(
                coefficient.is_negative is True for coefficient in poly.coeffs()
            ),
            "minimum_scalar_coefficient": str(min(poly.coeffs())),
            "rank4_through_rank7_derivatives": derivatives,
        }
    swap = {}
    for rank in range(2, 8):
        swap[rows["A"][rank]] = rows["B"][rank]
        swap[rows["B"][rank]] = rows["A"][rank]
    assert sp.expand(
        sp.sympify(reports["endpoint_u"]["expression"], locals=names).xreplace(swap)
        - sp.sympify(reports["endpoint_v"]["expression"], locals=names)
    ) == 0

    report = {
        "marker": MARKER,
        "rank": 6,
        "coefficient": "g2",
        "modes": reports,
        "open_modes": ["ordinary_parent_no_mark", "ordinary_parent_marked_spine"],
        "status": "exact parent-mode algebra; no sign theorem asserted",
        "source_sha256": hashlib.sha256(Path(__file__).read_bytes()).hexdigest().upper(),
    }
    encoded = json.dumps(report, indent=2, sort_keys=True) + "\n"
    OUTPUT.write_text(encoded, encoding="utf-8", newline="\n")
    print(json.dumps({
        "marker": MARKER,
        "mode_summaries": {
            key: {name: row[name] for name in (
                "monomials", "negative_scalar_coefficients", "minimum_scalar_coefficient"
            )}
            for key, row in reports.items()
        },
    }, indent=2, sort_keys=True))
    print("SOURCE_SHA256", report["source_sha256"])
    print("REPORT_SHA256", hashlib.sha256(encoded.encode()).hexdigest().upper())
    print(MARKER)


if __name__ == "__main__":
    main()
