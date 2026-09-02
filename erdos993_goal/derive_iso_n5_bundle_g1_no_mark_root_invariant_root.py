#!/usr/bin/env python3
"""Derive the exact motif-category invariant for rank-five bundle g1.

The mode is the canonical deepest support that is the root of a component
containing neither mark and has no parent.  In this mode D=C.  The script
starts from the defining rank-five Gamma_1, substitutes the exact forest
inclusion--exclusion rows through i6, and then applies Mobius inversion to
classify every edge motif by whether its vertex set contains neither mark,
u only, v only, or both marks.

This is an exact reduction artifact, not a sign theorem.
"""

from __future__ import annotations

import hashlib
import json
from pathlib import Path

import sympy as sp

from derive_iso_n5_bundle_g12_canonical_configuration_g1_bernstein import (
    forest_independent_row,
    raw_coefficients,
    substitute_rows,
)


HERE = Path(__file__).resolve().parent
OUTPUT = HERE / "iso_n5_bundle_g1_no_mark_root_invariant_root_20260829.json"
MARKER = "DERIVED_EXACT_ISO_N5_BUNDLE_G1_NO_MARK_ROOT_INVARIANT_ROOT"


MOTIFS = (
    "edges",
    "wedges",
    "connected_3_edges",
    "three_edges_two_components_five_vertices",
    "connected_4_edges",
    "four_edges_two_components_six_vertices",
    "connected_5_edges",
)


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def category_symbols(name: str) -> tuple[sp.Symbol, ...]:
    return sp.symbols(
        f"{name}_none {name}_u {name}_v {name}_both",
        nonnegative=True,
    )


def main() -> None:
    generic_c, generic_d, g1, _g2 = raw_coefficients()
    n = sp.symbols("n", integer=True, positive=True)

    rows = []
    row_invariants = []
    for prefix, order in zip(("CE", "CU", "CV", "CW"), (n, n - 1, n - 1, n - 2)):
        row, invariants = forest_independent_row(prefix, order)
        rows.append(row)
        row_invariants.append(invariants)

    crows = tuple(rows)
    ordinary = sp.expand(substitute_rows(g1, generic_c, generic_d, crows, crows))

    category_map: dict[str, tuple[sp.Symbol, ...]] = {
        motif: category_symbols(motif) for motif in MOTIFS
    }
    rules: dict[sp.Symbol, sp.Expr] = {}
    for motif in MOTIFS:
        none, only_u, only_v, both = category_map[motif]
        values = (
            none + only_u + only_v + both,
            none + only_v,
            none + only_u,
            none,
        )
        for invariants, value in zip(row_invariants, values):
            rules[invariants[motif]] = value

    categorized = sp.expand(ordinary.subs(rules))
    variables = [n] + [value for motif in MOTIFS for value in category_map[motif]]
    polynomial = sp.Poly(categorized, *variables)
    assert sp.expand(categorized.subs({value: rules[key] for key, value in []})) == categorized

    # Freeze the highest edge-subset layer separately.  Q46 and R5 are the
    # only motifs first appearing in i6.
    high_variables = tuple(
        category_map["four_edges_two_components_six_vertices"]
        + category_map["connected_5_edges"]
    )
    high_part = sp.expand(sum(
        variable * sp.diff(categorized, variable) for variable in high_variables
    ))
    assert all(sp.diff(categorized, variable, 2) == 0 for variable in high_variables)
    residual = sp.expand(categorized - high_part)
    assert not (set(residual.free_symbols) & set(high_variables))

    high_coefficients = {
        str(variable): str(sp.factor(sp.diff(categorized, variable)))
        for variable in high_variables
    }
    scalar_coefficients = polynomial.coeffs()
    negative_terms = [
        str(sp.Mul(coefficient, *(
            variable ** exponent
            for variable, exponent in zip(variables, powers)
            if exponent
        )))
        for powers, coefficient in polynomial.terms()
        if coefficient.is_negative is True
    ]

    compact_report_path = HERE / "iso_n5_bundle_g1_no_mark_root_compact_root_20260829.json"
    compact_report = json.loads(compact_report_path.read_text(encoding="utf-8"))
    assert compact_report["marker"] == (
        "PASS_EXACT_ISO_N5_BUNDLE_G1_NO_MARK_ROOT_COMPACT_IDENTITY_ROOT"
    )
    compact_components = {}
    categorized_components = {}
    for name in ("M5", "C5", "N4", "M5_plus_3C5"):
        raw_component = sp.sympify(compact_report["raw_forms"][name])
        row_component = substitute_rows(
            raw_component, generic_c, generic_d, crows, crows
        )
        category_component = sp.expand(row_component.subs(rules))
        categorized_components[name] = category_component
        component_poly = sp.Poly(category_component, *variables)
        compact_components[name] = {
            "expanded_term_count": len(component_poly.terms()),
            "negative_scalar_coefficient_count": sum(
                coefficient.is_negative is True for coefficient in component_poly.coeffs()
            ),
            "categorized_invariant": str(sp.factor(category_component)),
        }
    assert sp.expand(
        categorized_components["M5"]
        + 3 * categorized_components["C5"]
        + 2 * categorized_components["N4"]
        - categorized
    ) == 0
    assert sp.expand(
        categorized_components["M5_plus_3C5"]
        - categorized_components["M5"]
        - 3 * categorized_components["C5"]
    ) == 0

    report = {
        "marker": MARKER,
        "identity": "g1=Gamma_1=N5((1+x)C+xC)-N5(C+xC)-N4(C)",
        "mode": "no_mark_root_k0",
        "forest_order": "n=|C|, with marked-row orders n,n-1,n-1,n-2",
        "motif_categories": "none, u only, v only, both marks",
        "motif_meanings": list(MOTIFS),
        "raw_categorized_invariant": str(sp.factor(categorized)),
        "expanded_term_count": len(polynomial.terms()),
        "total_degree": polynomial.total_degree(),
        "negative_scalar_coefficient_count": sum(
            coefficient.is_negative is True for coefficient in scalar_coefficients
        ),
        "negative_scalar_terms": negative_terms,
        "highest_i6_motif_part": str(sp.factor(high_part)),
        "highest_i6_motif_coefficients": high_coefficients,
        "residual_without_q46_r5": str(sp.factor(residual)),
        "compact_component_invariants": compact_components,
        "compact_component_reconstruction": True,
        "exact_reconstruction": sp.expand(high_part + residual - categorized) == 0,
        "status": "exact invariant derived; sign not asserted",
        "scope": (
            "No-mark-root rank-five g1 reduction only. It does not prove g1>=0, "
            "the other canonical modes, all N5, or Erdos Problem 993."
        ),
        "dependencies": {
            "derive_iso_n5_bundle_g12_canonical_configuration_g1_bernstein.py": sha256(
                HERE / "derive_iso_n5_bundle_g12_canonical_configuration_g1_bernstein.py"
            ),
            "derive_iso_n5_bundle_g1_no_mark_root_compact_root.py": sha256(
                HERE / "derive_iso_n5_bundle_g1_no_mark_root_compact_root.py"
            ),
            "iso_n5_bundle_g1_no_mark_root_compact_root_20260829.json": sha256(
                compact_report_path
            ),
        },
        "source_sha256": sha256(Path(__file__)),
    }
    raw = json.dumps(report, indent=2, sort_keys=True) + "\n"
    OUTPUT.write_text(raw, encoding="utf-8")
    print(json.dumps({
        "marker": MARKER,
        "expanded_term_count": report["expanded_term_count"],
        "negative_scalar_coefficient_count": report["negative_scalar_coefficient_count"],
        "highest_i6_motif_coefficients": high_coefficients,
        "report_sha256": hashlib.sha256(raw.encode()).hexdigest().upper(),
    }, indent=2, sort_keys=True))
    print(MARKER)


if __name__ == "__main__":
    main()
