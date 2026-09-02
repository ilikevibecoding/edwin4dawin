#!/usr/bin/env python3
"""Actual adjacent-component cone probe for ell=1,2, k=0 ordinary g2.

For the adjacent parent edge p-v we use the exact branch factorization

    W=AB, P=A(B+xB0), V=(A+xA0)B,
    E=AB+xAB0+xA0B,

where A->A0 and B->B0 are genuine rooted-branch deletions.  The cone uses
frozen whole-mode forms on literal deletion/bridge states and the genuine
branch-pair interval systems.  Floating feasibility remains discovery only.
"""

from __future__ import annotations

import hashlib
import json
from pathlib import Path

import numpy as np
import sympy as sp
from scipy.optimize import linprog
from scipy.sparse import coo_matrix

from derive_iso_n5_bundle_g12_canonical_configuration_g1_bernstein import raw_coefficients
from derive_iso_n5_g1_internal_endpoint_broom_factor_root import convolve
from derive_iso_n5_g1_internal_ordinary_small_broom_parameters_root import child_rows
from derive_iso_n5_g2_internal_ordinary_broom_factor_rank5_g2_alt import ordinary_expression
from probe_iso_n5_g1_internal_endpoint_boundary_global_payment_root import compact_forms
from probe_iso_n5_g1_internal_ordinary_low00_parent_interval_cone_root import (
    interval_basis,
    universal_row_basis,
)
from probe_iso_n5_g2_internal_ordinary_stable_origin_adjacent_modes_g2_structure_nonadjacent import (
    add,
    bridge_row,
    row_difference,
    shift,
    specialize,
    symbolic_row,
)


HERE = Path(__file__).resolve().parent
OUTPUT = HERE / "iso_n5_g2_internal_ordinary_short_k0_adjacent_component_cone_probe_g2_structure_nonadjacent_20260830.json"
MARKER = "PROBE_EXACT_ISO_N5_G2_INTERNAL_ORDINARY_SHORT_K0_ADJACENT_COMPONENT_CONE_G2_STRUCTURE_NONADJACENT"


def sparse_polynomial(expression, variables):
    return dict(sp.Poly(sp.expand(expression), *variables).terms())


def main():
    expression, rows = ordinary_expression()
    generic_c, generic_d, _raw_g1, raw_g2 = raw_coefficients()
    a, a0, b, b0 = (symbolic_row(prefix) for prefix in ("a", "c", "b", "d"))
    ab, ab0, a0b = convolve(a, b), convolve(a, b0), convolve(a0, b)
    parent = (
        add(ab, shift(ab0), shift(a0b)),
        add(ab, shift(ab0)),
        add(ab, shift(a0b)),
        ab,
    )
    parent_rules = {
        symbol: value
        for generic, actual in zip(
            (rows["E"], rows["P"], rows["V"], rows["W"]), parent
        )
        for symbol, value in zip(generic[1:], actual[1:])
    }
    variables = tuple(symbol for row in (a, a0, b, b0) for symbol in row[1:])
    pe, pp, pv, pw = tuple(
        (sp.Integer(1), *rows[name][1:7]) for name in ("E", "P", "V", "W")
    )

    primitive = []
    primitive.extend(interval_basis(a, a0, "A_A0"))
    primitive.extend(interval_basis(b, b0, "B_B0"))
    for name, row in (("A", a), ("A0", a0), ("B", b), ("B0", b0)):
        primitive.extend(universal_row_basis(row, name))
    for pair_name, full, deleted in (("A_A0", a, a0), ("B_B0", b, b0)):
        for rank in range(1, 7):
            primitive.append((f"dominance_{pair_name}_{rank}", full[rank] - deleted[rank]))

    results = []
    for ell in (1, 2):
        xrow, urow, yrow, zrow = child_rows(ell, sp.Integer(0))
        child_rules = {
            rows[name][rank]: actual[rank]
            for name, actual in zip(("X", "U", "Y", "Z"), (xrow, urow, yrow, zrow))
            for rank in range(1, 7)
        }
        target_parent = sp.expand(expression.subs(child_rules))
        target = sp.expand(target_parent.subs(parent_rules))
        target_terms = sparse_polynomial(target, variables)
        states = {
            "00": (
                convolve(xrow, pe), convolve(urow, pe),
                convolve(xrow, pv), convolve(urow, pv),
            ),
            "10": (
                convolve(yrow, pe), convolve(zrow, pe),
                convolve(yrow, pv), convolve(zrow, pv),
            ),
            "01": (
                convolve(xrow, pp), convolve(urow, pp),
                convolve(xrow, pw), convolve(urow, pw),
            ),
            "11": (
                convolve(yrow, pp), convolve(zrow, pp),
                convolve(yrow, pw), convolve(zrow, pw),
            ),
            "bridge": (
                bridge_row(xrow, yrow, pe, pp),
                bridge_row(urow, zrow, pe, pp),
                bridge_row(xrow, yrow, pv, pw),
                bridge_row(urow, zrow, pv, pw),
            ),
            "parent": (pe, pp, pv, pw),
        }
        basis = []
        for state_name, state in states.items():
            forms = compact_forms(state)
            for form_name in ("S_C", "C5_C", "N4_C"):
                basis.append((f"{form_name}_{state_name}", forms[form_name]))
            basis.extend([
                (f"g2_no_parent_{state_name}", specialize(raw_g2, generic_c, generic_d, state, state)),
                (f"g2_endpoint_u_{state_name}", specialize(
                    raw_g2, generic_c, generic_d, state,
                    (state[1], state[1], state[3], state[3]),
                )),
                (f"g2_endpoint_v_{state_name}", specialize(
                    raw_g2, generic_c, generic_d, state,
                    (state[2], state[3], state[2], state[3]),
                )),
            ])
        for name, source, deleted in (
            ("delete_a_before_p", states["00"], states["10"]),
            ("delete_p_before_a", states["00"], states["01"]),
            ("delete_p_after_a", states["10"], states["11"]),
            ("delete_a_after_p", states["01"], states["11"]),
        ):
            basis.append((f"g2_ordinary_{name}", specialize(raw_g2, generic_c, generic_d, source, deleted)))

        # Cross-length transfer image.  For ell=1 this duplicates endpoint_u
        # on bridge; for ell=2 it is the genuine singleton-ordinary path->leaf.
        if ell == 2:
            short_x, short_u, short_y, short_z = child_rows(1, sp.Integer(0))
            leaf_bridge = (
                bridge_row(short_x, short_y, pe, pp),
                bridge_row(short_u, short_z, pe, pp),
                bridge_row(short_x, short_y, pv, pw),
                bridge_row(short_u, short_z, pv, pw),
            )
            basis.append((
                "g2_ordinary_cross_length_bridge_ell2_to_ell1",
                specialize(raw_g2, generic_c, generic_d, states["bridge"], leaf_bridge),
            ))

        # Literal internal-endpoint states before/after p deletion.
        basis.extend([
            ("g2_internal_endpoint_v_full_parent", specialize(
                raw_g2, generic_c, generic_d, states["00"],
                (
                    convolve(yrow, pv), convolve(zrow, pv),
                    convolve(yrow, pv), convolve(zrow, pv),
                ),
            )),
            ("g2_internal_endpoint_v_after_p", specialize(
                raw_g2, generic_c, generic_d, states["01"],
                (
                    convolve(yrow, pw), convolve(zrow, pw),
                    convolve(yrow, pw), convolve(zrow, pw),
                ),
            )),
        ])

        unique = {}
        for label, candidate in basis:
            terms = sparse_polynomial(candidate.subs(parent_rules), variables)
            unique.setdefault(tuple(sorted(terms.items())), (label, terms))
        basis_terms = {label: terms for label, terms in unique.values()}

        negative_target_powers = [
            powers for powers, value in target_terms.items() if value.is_negative is True
        ]
        lifted = {}
        for label, generator in primitive:
            generator_terms = sparse_polynomial(generator, variables)
            negative_generator_powers = [
                powers for powers, value in generator_terms.items() if value.is_negative is True
            ]
            multipliers = set()
            for target_power in negative_target_powers:
                for generator_power in negative_generator_powers:
                    difference = tuple(x - y for x, y in zip(target_power, generator_power))
                    if min(difference) >= 0:
                        multipliers.add(difference)
            for multiplier in multipliers:
                terms = {
                    tuple(x + y for x, y in zip(powers, multiplier)): value
                    for powers, value in generator_terms.items()
                }
                lifted.setdefault(tuple(sorted(terms.items())), (f"{label}_lift_{len(lifted)}", terms))
        for _key, (label, terms) in lifted.items():
            basis_terms.setdefault(label, terms)

        universe = sorted(
            set(target_terms).union(*(set(terms) for terms in basis_terms.values())),
            reverse=True,
        )
        labels = list(basis_terms)
        row_index = {powers: index for index, powers in enumerate(universe)}
        sparse_rows, sparse_columns, sparse_values = [], [], []
        for column, label in enumerate(labels):
            for powers, value in basis_terms[label].items():
                sparse_rows.append(row_index[powers])
                sparse_columns.append(column)
                sparse_values.append(float(value))
        matrix = coo_matrix(
            (sparse_values, (sparse_rows, sparse_columns)),
            shape=(len(universe), len(labels)),
        ).tocsr()
        rhs = np.array([float(target_terms.get(powers, 0)) for powers in universe])
        solution = linprog(
            c=np.zeros(len(labels)), A_ub=matrix, b_ub=rhs,
            bounds=[(0, None)] * len(labels), method="highs",
            options={"dual_feasibility_tolerance": 1e-9, "primal_feasibility_tolerance": 1e-9},
        )
        result = {
            "ell": ell,
            "target_monomials": len(target_terms),
            "target_negative_scalar_coefficients": len(negative_target_powers),
            "abstract_generators": len(basis),
            "unique_mode_generators": len(unique),
            "primitive_generators": len(primitive),
            "targeted_lifts": len(lifted),
            "basis_size": len(labels),
            "coefficient_rows": len(universe),
            "floating_feasible": bool(solution.success),
            "floating_status": solution.message,
            "floating_support": [
                {"label": label, "weight": format(float(weight), ".17g")}
                for label, weight in zip(labels, solution.x if solution.success else ())
                if weight > 1e-9
            ],
        }
        results.append(result)
        print(json.dumps(result, sort_keys=True), flush=True)

    report = {
        "marker": MARKER,
        "geometry": "adjacent p-v exact two rooted-branch factorization",
        "cells": results,
        "status": "actual-structure floating cone probe only; no theorem asserted",
        "scope": "Only ell=1,2, k=0 adjacent-parent internal-ordinary raw g2.",
        "source_sha256": hashlib.sha256(Path(__file__).read_bytes()).hexdigest().upper(),
    }
    raw = json.dumps(report, indent=2, sort_keys=True) + "\n"
    OUTPUT.write_text(raw, encoding="utf-8", newline="\n")
    print("REPORT_SHA256", hashlib.sha256(raw.encode()).hexdigest().upper())
    print(MARKER)


if __name__ == "__main__":
    main()
