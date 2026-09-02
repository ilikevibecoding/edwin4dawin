#!/usr/bin/env python3
"""Explore exact short-broom g2 transfer residuals against frozen-mode forms.

This is a structural diagnostic only.  It constructs the literal ell=1,2,
k=0 internal-ordinary targets over arbitrary parent rows E,P,V,W, constructs
the leaf/path transfer states used by the frozen g1 theorem, and tests exact
constant-coefficient spans of raw g1/g2 and universal N4/C5/S forms.
"""

from __future__ import annotations

import hashlib
import json
from pathlib import Path

import sympy as sp

from derive_iso_n5_bundle_g12_canonical_configuration_g1_bernstein import raw_coefficients
from probe_iso_n5_g1_internal_endpoint_boundary_global_payment_root import compact_forms


HERE = Path(__file__).resolve().parent
OUTPUT = HERE / "iso_n5_g2_internal_ordinary_short_transfer_residual_g2_structure_nonadjacent_20260830.json"
MARKER = "DERIVED_EXACT_ISO_N5_G2_INTERNAL_ORDINARY_SHORT_TRANSFER_RESIDUAL_G2_STRUCTURE_NONADJACENT"


def at(row, rank):
    return row[rank] if 0 <= rank < len(row) else sp.Integer(0)


def add(*rows):
    return tuple(sp.expand(sum(at(row, rank) for row in rows)) for rank in range(7))


def scale(row, value):
    return tuple(sp.expand(value * item) for item in row)


def shift(row):
    return tuple(at(row, rank - 1) for rank in range(7))


def specialize(expression, generic_c, generic_d, crows, drows):
    rules = {
        symbol: value
        for generic, actual in zip(generic_c + generic_d, crows + drows)
        for symbol, value in zip(generic, actual)
    }
    return sp.expand(expression.subs(rules))


def polynomial_terms(expression, variables):
    return dict(sp.Poly(sp.expand(expression), *variables).terms())


def exact_span(target, candidates):
    variables = tuple(sorted(
        set(target.free_symbols).union(*(form.free_symbols for form in candidates.values())),
        key=str,
    ))
    target_terms = polynomial_terms(target, variables)
    candidate_terms = {
        name: polynomial_terms(form, variables) for name, form in candidates.items()
    }
    monomials = sorted(
        set(target_terms).union(*(set(terms) for terms in candidate_terms.values())),
        reverse=True,
    )
    names = list(candidates)
    matrix = sp.Matrix([
        [candidate_terms[name].get(monomial, 0) for name in names]
        for monomial in monomials
    ])
    vector = sp.Matrix([target_terms.get(monomial, 0) for monomial in monomials])
    try:
        solution, parameters = sp.linsolve((matrix, vector)).args[0], None
    except (IndexError, ValueError):
        return {"in_span": False, "rank": matrix.rank(), "augmented_rank": matrix.row_join(vector).rank()}
    free = set().union(*(entry.free_symbols for entry in solution))
    substitutions = {symbol: 0 for symbol in free}
    concrete = [sp.simplify(entry.subs(substitutions)) for entry in solution]
    assert matrix * sp.Matrix(concrete) == vector
    return {
        "in_span": True,
        "weights": {name: str(value) for name, value in zip(names, concrete) if value},
        "rank": matrix.rank(),
        "basis_size": len(names),
    }


def record(expression):
    variables = tuple(sorted(expression.free_symbols, key=str))
    polynomial = sp.Poly(sp.expand(expression), *variables)
    stream = "".join(f"{powers}:{coefficient};" for powers, coefficient in polynomial.terms())
    return {
        "variables": len(variables),
        "monomials": len(polynomial.terms()),
        "negative_scalar_coefficients": sum(value.is_negative is True for value in polynomial.coeffs()),
        "term_stream_sha256": hashlib.sha256(stream.encode()).hexdigest().upper(),
    }


def main():
    generic_c, generic_d, raw_g1, raw_g2 = raw_coefficients()
    E = (sp.Integer(1), *sp.symbols("e1:7"))
    P = (sp.Integer(1), *sp.symbols("p1:7"))
    V = (sp.Integer(1), *sp.symbols("v1:7"))
    W = (sp.Integer(1), *sp.symbols("w1:7"))
    one_x = lambda row: add(row, shift(row))
    one_2x = lambda row: add(row, scale(shift(row), 2))

    parent = (E, P, V, W)
    base = (E, E, V, V)
    leaf = (add(E, shift(P)), E, add(V, shift(W)), V)
    path = (
        add(one_x(E), shift(P)), one_x(E),
        add(one_x(V), shift(W)), one_x(V),
    )
    original1_c = (one_x(E), E, one_x(V), V)
    original1_d = (P, P, W, W)
    original2_c = (one_2x(E), one_x(E), one_2x(V), one_x(V))
    original2_d = (one_x(P), P, one_x(W), W)

    targets = {
        "ell1": specialize(raw_g2, generic_c, generic_d, original1_c, original1_d),
        "ell2": specialize(raw_g2, generic_c, generic_d, original2_c, original2_d),
    }
    images = {
        "ell1": specialize(raw_g2, generic_c, generic_d, leaf, base),
        "ell2": specialize(raw_g2, generic_c, generic_d, path, leaf),
    }
    states = {"parent": parent, "base": base, "leaf": leaf, "path": path}

    candidates = {}
    for state_name, state in states.items():
        forms = compact_forms(state)
        for form_name in ("N4_C", "C5_C", "S_C", "M5_C", "no_parent_g1_C"):
            candidates[f"{form_name}_{state_name}"] = forms[form_name]
        candidates[f"g2_no_parent_{state_name}"] = specialize(
            raw_g2, generic_c, generic_d, state, state
        )
        candidates[f"g1_no_parent_{state_name}"] = specialize(
            raw_g1, generic_c, generic_d, state, state
        )
        se, su, sv, sw = state
        endpoint_u = (su, su, sw, sw)
        endpoint_v = (sv, sw, sv, sw)
        for orientation, deletion in (("u", endpoint_u), ("v", endpoint_v)):
            candidates[f"g2_endpoint_{orientation}_{state_name}"] = specialize(
                raw_g2, generic_c, generic_d, state, deletion
            )
            candidates[f"g1_endpoint_{orientation}_{state_name}"] = specialize(
                raw_g1, generic_c, generic_d, state, deletion
            )

    # Genuine ordinary deletion edges among the transfer states.
    for name, full, deleted in (
        ("leaf_to_base", leaf, base),
        ("path_to_leaf", path, leaf),
    ):
        candidates[f"g2_ordinary_{name}"] = specialize(raw_g2, generic_c, generic_d, full, deleted)
        candidates[f"g1_ordinary_{name}"] = specialize(raw_g1, generic_c, generic_d, full, deleted)

    report_targets = {}
    for name in ("ell1", "ell2"):
        residual = sp.expand(targets[name] - images[name])
        without_image = dict(candidates)
        # The transfer image itself is a frozen g2 mode, so test residual only.
        report_targets[name] = {
            "target": record(targets[name]),
            "transfer_image": record(images[name]),
            "residual": record(residual),
            "residual_zero": residual == 0,
            "residual_factored": str(sp.factor(residual)),
            "residual_constant_span": exact_span(residual, without_image),
        }
        print(name, report_targets[name]["residual"], report_targets[name]["residual_constant_span"], flush=True)

    report = {
        "marker": MARKER,
        "formal_parent_rows": "arbitrary normalized E,P,V,W",
        "transfers": {
            "ell1": "original minus singleton-endpoint leaf transfer",
            "ell2": "original minus singleton-ordinary two-edge-path transfer",
        },
        "targets": report_targets,
        "candidate_count": len(candidates),
        "status": "exact structural span diagnostic only; no sign asserted unless a nonnegative valid span is displayed",
        "scope": "Only ell=1,2, k=0 internal-ordinary raw g2 transfer algebra.",
        "source_sha256": hashlib.sha256(Path(__file__).read_bytes()).hexdigest().upper(),
    }
    raw = json.dumps(report, indent=2, sort_keys=True) + "\n"
    OUTPUT.write_text(raw, encoding="utf-8", newline="\n")
    print("REPORT_SHA256", hashlib.sha256(raw.encode()).hexdigest().upper())
    print(MARKER)


if __name__ == "__main__":
    main()
