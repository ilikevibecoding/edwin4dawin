#!/usr/bin/env python3
"""Exact parent-loss normal form for nonadjacent ordinary-parent rank-six g2."""

from __future__ import annotations

import hashlib
import json
from pathlib import Path

import sympy as sp

from explore_iso_n6_bundle_g2_marked_cone_g1_bernstein import reconstruct
from explore_iso_n6_bundle_g3_marked_partition_g1_nonadjacent import (
    partition_substitution,
    structural_substitution,
)


HERE = Path(__file__).resolve().parent
OUTPUT = HERE / (
    "iso_n6_bundle_g2_nonadjacent_ordinary_parent_loss_exact_root_20260831.json"
)
MARKER = (
    "DERIVED_EXACT_ISO_N6_BUNDLE_G2_NONADJACENT_ORDINARY_PARENT_LOSS_ROOT"
)


def summary(value: sp.Expr) -> dict[str, object]:
    polynomial = sp.Poly(value, *sorted(value.free_symbols, key=str))
    coefficients = polynomial.coeffs()
    return {
        "terms": len(polynomial.terms()),
        "negative_scalar_coefficients": sum(
            1 for coefficient in coefficients if coefficient < 0
        ),
        "minimum_scalar_coefficient": str(min(coefficients)),
        "sha256": hashlib.sha256(sp.srepr(value).encode()).hexdigest().upper(),
    }


def main() -> None:
    structural, _ = structural_substitution()
    cp, _ = partition_substitution("C", "c", 7)
    dp, _ = partition_substitution("D", "d", 6)
    expression = sp.expand(reconstruct().subs(structural).subs(cp).subs(dp))
    names = {str(symbol): symbol for symbol in expression.free_symbols}
    dvars = tuple(sorted(
        (symbol for symbol in expression.free_symbols if str(symbol).startswith("D")),
        key=str,
    ))

    no_parent_rules = {
        variable: names["C" + str(variable)[1:]] for variable in dvars
    }
    no_parent = sp.expand(expression.subs(no_parent_rules))

    pvars = {}
    ordinary_rules = {}
    for variable in dvars:
        label = str(variable)[1:]
        pvar = sp.Symbol("P" + label, integer=True, nonnegative=True)
        pvars[label] = pvar
        ordinary_rules[variable] = names["C" + label] - pvar
    ordinary = sp.expand(expression.subs(ordinary_rules))
    correction = sp.expand(ordinary - no_parent)
    active_pvars = tuple(sorted(
        (symbol for symbol in correction.free_symbols if str(symbol).startswith("P")),
        key=str,
    ))
    assert sp.Poly(correction, *active_pvars).total_degree() == 1
    assert sp.expand(
        correction - sum(
            variable * sp.diff(correction, variable) for variable in active_pvars
        )
    ) == 0

    # Exact nonadjacent no-parent occupation coordinates:
    # CW_r=a_r, CA_r=b_(r-1), CB_r=c_(r-1), CZ_r=d_(r-2).
    a = sp.symbols("a0:8", integer=True, nonnegative=True)
    b = sp.symbols("b0:7", integer=True, nonnegative=True)
    c = sp.symbols("c0:7", integer=True, nonnegative=True)
    d = sp.symbols("d0:7", integer=True, nonnegative=True)
    occupation = {names["n"]: a[1] + 2}
    for rank in range(2, 8):
        for family, value in (
            ("W", a[rank]),
            ("A", b[rank - 1]),
            ("B", c[rank - 1]),
            ("Z", d[rank - 2]),
        ):
            label = f"C{family}{rank}"
            if label in names:
                occupation[names[label]] = value
    no_parent_occupation = sp.expand(no_parent.subs(occupation))
    ordinary_occupation = sp.expand(ordinary.subs(occupation))
    correction_occupation = sp.expand(correction.subs(occupation))
    coefficient_expr = {
        str(variable): sp.factor(sp.diff(correction_occupation, variable))
        for variable in active_pvars
    }

    # If p is adjacent to u, parent-containing categories CB,PZ vanish; if it
    # is adjacent to v, CA,PZ vanish.  These four masks are exhaustive for an
    # ordinary p distinct from the two marks.
    adjacency_masks = {}
    for epsilon_u, epsilon_v in ((0, 0), (1, 0), (0, 1), (1, 1)):
        zero_families = set()
        if epsilon_u:
            zero_families.update(("B", "Z"))
        if epsilon_v:
            zero_families.update(("A", "Z"))
        rules = {
            variable: 0
            for variable in active_pvars
            if str(variable)[1] in zero_families
        }
        masked = sp.expand(correction_occupation.subs(rules))
        adjacency_masks[f"u{epsilon_u}_v{epsilon_v}"] = {
            "zero_parent_loss_families": sorted(zero_families),
            "active_parent_loss_variables": [
                str(variable) for variable in active_pvars if variable not in rules
            ],
            "summary": summary(masked),
            "correction": str(sp.factor(masked)),
        }

    report = {
        "marker": MARKER,
        "rank": 6,
        "coefficient": "g2",
        "scope": (
            "nonadjacent marks u,v; ordinary deleted parent p distinct from u,v"
        ),
        "semantics": (
            "PFk counts C-category F independent k-sets containing p; "
            "DFk=CFk-PFk exactly"
        ),
        "identity": (
            "g2(C,C-p;u,v)=g2(C,C;u,v)+correction"
        ),
        "occupation_substitution": (
            "CW_r=a_r, CA_r=b_(r-1), CB_r=c_(r-1), CZ_r=d_(r-2)"
        ),
        "active_parent_loss_variables": [str(variable) for variable in active_pvars],
        "correction_coefficients_in_occupation_rows": {
            key: str(value) for key, value in coefficient_expr.items()
        },
        "adjacency_masks": adjacency_masks,
        "correction": str(sp.factor(correction_occupation)),
        "summaries": {
            "no_parent": summary(no_parent_occupation),
            "ordinary_parent": summary(ordinary_occupation),
            "correction": summary(correction_occupation),
        },
        "status": "exact nonadjacent ordinary-parent loss algebra; no sign theorem",
        "source_sha256": hashlib.sha256(Path(__file__).read_bytes()).hexdigest().upper(),
    }
    raw = json.dumps(report, indent=2, sort_keys=True) + "\n"
    OUTPUT.write_text(raw, encoding="utf-8", newline="\n")
    print(json.dumps({
        "marker": MARKER,
        "active": report["active_parent_loss_variables"],
        "coefficients": report["correction_coefficients_in_occupation_rows"],
        "mask_summaries": {
            label: row["summary"] for label, row in adjacency_masks.items()
        },
        "summaries": report["summaries"],
    }, indent=2, sort_keys=True))
    print("SOURCE_SHA256", report["source_sha256"])
    print("REPORT_SHA256", hashlib.sha256(raw.encode()).hexdigest().upper())
    print(MARKER)


if __name__ == "__main__":
    main()
