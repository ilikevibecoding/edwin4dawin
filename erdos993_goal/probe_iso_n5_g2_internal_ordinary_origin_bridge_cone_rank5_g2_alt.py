#!/usr/bin/env python3
"""Exact actual-deletion bridge cone for the internal-ordinary g2 origin.

This is the sole stable Newton row not closed by parent path-floor/ceiling
boxes.  We split the marked parent forest into the exact selection partition
``E=A+xB+yC+epsilon*xyD``, ``P=A+yB``, ``V=A+xC``, ``W=A`` and use the
four genuine componentwise-deletion interval systems.  Only a literal exact
rational reconstruction is accepted.
"""

from __future__ import annotations

import hashlib
import json
import os
from pathlib import Path

import numpy as np
import sympy as sp
from scipy.optimize import linprog

from derive_iso_n5_bundle_g12_canonical_configuration_g1_bernstein import raw_coefficients
from derive_iso_n5_g1_internal_endpoint_broom_factor_root import convolve
from derive_iso_n5_g1_internal_ordinary_small_broom_parameters_root import child_rows
from derive_iso_n5_g2_internal_ordinary_broom_factor_rank5_g2_alt import ordinary_expression
from probe_iso_n5_g1_internal_endpoint_boundary_global_payment_root import compact_forms
from probe_iso_n5_g1_internal_ordinary_low00_parent_interval_cone_root import (
    at,
    interval_basis,
    rationalize,
    recover_exact_basic_solution,
    universal_row_basis,
)
from probe_iso_n5_g2_internal_ordinary_parent_global_cone_rank5_g2_alt import (
    PARENT_ORDER_SHIFT,
    add_parent_order_boxes,
)


HERE = Path(__file__).resolve().parent
ELL = int(os.environ.get("ERDOS993_G2_INTERNAL_ORDINARY_BRIDGE_ELL", "8"))
OUTPUT = HERE / (
    f"iso_n5_g2_internal_ordinary_ell{ELL}_k0_bridge_cone_probe_"
    "rank5_g2_alt_20260830.json"
)
MARKER = "PROBE_EXACT_ISO_N5_G2_INTERNAL_ORDINARY_ORIGIN_BRIDGE_CONE_RANK5_G2_ALT"


def specialize(raw_form, generic_c, generic_d, crows, drows):
    rules = {}
    for generic, actual in zip(generic_c + generic_d, crows + drows):
        rules.update(dict(zip(generic, actual)))
    return sp.expand(raw_form.subs(rules))


def main():
    expression, rows = ordinary_expression()
    x_actual, u_actual, y_actual, z_actual = child_rows(ELL, sp.Integer(0))
    origin_rules = {}
    for rank in range(1, 7):
        origin_rules.update({
            rows["X"][rank]: x_actual[rank], rows["U"][rank]: u_actual[rank],
            rows["Y"][rank]: y_actual[rank], rows["Z"][rank]: z_actual[rank],
        })
    target = sp.expand(expression.subs(origin_rules))

    x, urow, y, zrow = (rows[name] for name in ("X", "U", "Y", "Z"))
    e, p, vrow, wrow = (rows[name] for name in ("E", "P", "V", "W"))
    constants = {row[0]: 1 for row in (x, urow, y, zrow, e, p, vrow, wrow)}
    x0 = tuple(sp.Integer(1) if r == 0 else origin_rules[x[r]] for r in range(7))
    u0 = tuple(sp.Integer(1) if r == 0 else origin_rules[urow[r]] for r in range(7))
    y0 = tuple(sp.Integer(1) if r == 0 else origin_rules[y[r]] for r in range(7))
    z0 = tuple(sp.Integer(1) if r == 0 else origin_rules[zrow[r]] for r in range(7))

    def row_difference(full, deleted):
        return tuple(sp.expand(left - right) for left, right in zip(full, deleted))

    def bridge_row(child_full, child_deleted, parent_full, parent_deleted):
        product = convolve(child_full, parent_full)
        forbidden = convolve(
            row_difference(child_full, child_deleted),
            row_difference(parent_full, parent_deleted),
        )
        return tuple(sp.expand(value - removed) for value, removed in zip(product, forbidden))

    states = {
        "bridge_G": (
            bridge_row(x0, y0, e, p), bridge_row(u0, z0, e, p),
            bridge_row(x0, y0, vrow, wrow), bridge_row(u0, z0, vrow, wrow),
        ),
        "00_C": (
            convolve(x0, e), convolve(u0, e),
            convolve(x0, vrow), convolve(u0, vrow),
        ),
        "10_delete_a": (
            convolve(y0, e), convolve(z0, e),
            convolve(y0, vrow), convolve(z0, vrow),
        ),
        "01_delete_p": (
            convolve(x0, p), convolve(u0, p),
            convolve(x0, wrow), convolve(u0, wrow),
        ),
        "11_D": (
            convolve(y0, p), convolve(z0, p),
            convolve(y0, wrow), convolve(z0, wrow),
        ),
    }
    generic_c, generic_d, _raw_g1, raw_g2 = raw_coefficients()
    global_payments = {}
    for state_name, state_rows in states.items():
        forms = compact_forms(state_rows)
        for form_name in ("S_C", "C5_C", "N4_C"):
            global_payments[f"global_{form_name.replace('_C', '')}_{state_name}"] = (
                sp.expand(forms[form_name].subs(constants))
            )
        se, sp_, sv, sw = state_rows
        for form_name, drows in (
            ("g2_no_parent", state_rows),
            ("g2_endpoint_first", (sp_, sp_, sw, sw)),
            ("g2_endpoint_second", (sv, sw, sv, sw)),
        ):
            global_payments[f"global_{form_name}_{state_name}"] = sp.expand(
                specialize(raw_g2, generic_c, generic_d, state_rows, drows).subs(constants)
            )

    a = (sp.Integer(1), *sp.symbols("a1:7"))
    b = (sp.Integer(1), *sp.symbols("b1:6"))
    c = (sp.Integer(1), *sp.symbols("c1:6"))
    d = (sp.Integer(1), *sp.symbols("d1:5"))
    _parent_variables, parent_basis, _parent_order_rules = add_parent_order_boxes(
        rows, [], PARENT_ORDER_SHIFT
    )
    n0 = sp.symbols("n0", integer=True, nonnegative=True)
    faces = []
    for epsilon in (0, 1):
        partition_rules = {}
        for rank in range(1, 7):
            partition_rules.update({
                rows["W"][rank]: at(a, rank),
                rows["P"][rank]: at(a, rank) + at(b, rank - 1),
                rows["V"][rank]: at(a, rank) + at(c, rank - 1),
                rows["E"][rank]: (
                    at(a, rank) + at(b, rank - 1) + at(c, rank - 1)
                    + epsilon * at(d, rank - 2)
                ),
            })
        active_rows = (("A", a), ("B", b), ("C", c)) + (("D", d),) * epsilon
        a_order_rule = {a[1]: n0 + PARENT_ORDER_SHIFT - 2}
        variables = (n0,) + tuple(
            symbol for _name, row in active_rows for symbol in row[1:]
            if symbol != a[1]
        )
        basis = []
        basis.extend(interval_basis(a, b, "A_B"))
        basis.extend(interval_basis(a, c, "A_C"))
        if epsilon:
            basis.extend(interval_basis(b, d, "B_D"))
            basis.extend(interval_basis(c, d, "C_D"))
        for name, row in active_rows:
            basis.extend(universal_row_basis(row, name))
        basis = [
            (label, sp.expand(candidate.subs(a_order_rule)))
            for label, candidate in basis
        ]
        basis.extend([
            (label, sp.expand(candidate.subs(partition_rules).subs(a_order_rule)))
            for label, candidate in global_payments.items()
        ])
        basis.extend([
            (
                f"parent_box_{label}",
                sp.expand(candidate.subs(partition_rules).subs(a_order_rule)),
            )
            for label, candidate in parent_basis
        ])

        multipliers = [("one", sp.Integer(1))] + [(str(symbol), symbol) for symbol in variables]
        deletion_pairs = [("A_B", a, b), ("A_C", a, c)]
        if epsilon:
            deletion_pairs.extend([("B_D", b, d), ("C_D", c, d)])
        for pair_name, full, deleted in deletion_pairs:
            for rank in range(1, min(len(full), len(deleted))):
                difference = full[rank] - deleted[rank]
                for multiplier_name, multiplier in multipliers:
                    basis.append((
                        f"dominance_{pair_name}_{rank}_times_{multiplier_name}",
                        sp.expand((difference * multiplier).subs(a_order_rule)),
                    ))

        target_poly = sp.Poly(
            sp.expand(target.subs(partition_rules).subs(a_order_rule)), *variables
        )
        target_terms = dict(target_poly.terms())
        basis_terms = {
            label: dict(sp.Poly(candidate, *variables).terms())
            for label, candidate in basis
        }
        universe = sorted(
            set(target_terms).union(*(set(terms) for terms in basis_terms.values())),
            reverse=True,
        )
        labels = list(basis_terms)
        target_vector = [sp.Rational(target_terms.get(powers, 0)) for powers in universe]
        basis_vectors = {
            label: [sp.Rational(basis_terms[label].get(powers, 0)) for powers in universe]
            for label in labels
        }
        matrix = np.array([
            [float(basis_vectors[label][row]) for label in labels]
            for row in range(len(universe))
        ])
        rhs = np.array([float(value) for value in target_vector])
        solution = linprog(
            c=np.zeros(len(labels)), A_ub=matrix, b_ub=rhs,
            bounds=[(0, None)] * len(labels), method="highs",
            options={"dual_feasibility_tolerance": 1e-9, "primal_feasibility_tolerance": 1e-9},
        )
        face = {
            "epsilon": epsilon,
            "geometry": "adjacent" if epsilon == 0 else "nonadjacent",
            "target_monomials": len(target_poly.terms()),
            "coefficient_rows": len(universe), "basis_size": len(basis),
            "floating_feasible": bool(solution.success),
            "exact_rational_certificate": False,
        }
        if solution.success:
            weights, residual, recovery = recover_exact_basic_solution(
                solution, matrix, rhs, labels, target_vector, basis_vectors
            )
            face["exact_recovery"] = recovery
            if weights is None:
                weights = rationalize(solution.x)
                residual = [
                    target_vector[row] - sum(
                        weight * basis_vectors[label][row]
                        for weight, label in zip(weights, labels)
                    ) for row in range(len(universe))
                ]
            if all(weight >= 0 for weight in weights) and all(value >= 0 for value in residual):
                stream = "".join(
                    f"{powers}:{value};" for powers, value in zip(universe, residual) if value
                )
                face.update({
                    "exact_rational_certificate": True,
                    "weights": {label: str(weight) for label, weight in zip(labels, weights) if weight},
                    "nonzero_residual_coefficients": sum(value != 0 for value in residual),
                    "minimum_residual_coefficient": str(min(residual)),
                    "residual_stream_sha256": hashlib.sha256(stream.encode()).hexdigest().upper(),
                })
        faces.append(face)
        print(epsilon, face["floating_feasible"], face["exact_rational_certificate"], flush=True)

    report = {
        "marker": MARKER, "cell": {"ell": ELL, "k_index": 0}, "faces": faces,
        "status": (
            "exact theorem certificate" if all(f["exact_rational_certificate"] for f in faces)
            else "diagnostic cone search; unresolved face makes no sign claim"
        ),
        "scope": f"Internal-ordinary g2 ell={ELL}, k-index zero only.",
        "source_sha256": hashlib.sha256(Path(__file__).read_bytes()).hexdigest().upper(),
    }
    raw = json.dumps(report, indent=2, sort_keys=True) + "\n"
    OUTPUT.write_text(raw, encoding="utf-8", newline="\n")
    print(json.dumps({
        "marker": MARKER,
        "faces": [{k: f[k] for k in ("epsilon", "floating_feasible", "exact_rational_certificate", "basis_size")} for f in faces],
        "status": report["status"],
    }, indent=2, sort_keys=True))
    print("REPORT_SHA256", hashlib.sha256(raw.encode()).hexdigest().upper())
    print(MARKER)


if __name__ == "__main__":
    main()
