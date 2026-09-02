#!/usr/bin/env python3
"""Actual adjacent-component mode cone for the stable ordinary-g2 origin.

For an adjacent parent edge p-v, write A->A0 and B->B0 for the genuine
componentwise rooted-branch deletions on the p and v sides.  Then

    W=A B,
    P=A(B+xB0),
    V=(A+xA0)B,
    E=AB+xAB0+xA0B.

The sole unresolved stable Newton row (h,k)=(0,0) is specialized to these
exact factors.  The cone uses only already frozen whole-mode g2 theorems on
literal forest states (no-parent, singleton endpoint/ordinary, and internal
endpoint) plus universal S/C5/N4 reserves.  Floating feasibility is discovery
only; this file makes no theorem claim.
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
from derive_iso_n5_g1_internal_endpoint_broom_parameters_root import (
    isolate_times_path,
    path_coefficient,
    tensor_binomial,
)
from derive_iso_n5_g2_internal_ordinary_broom_factor_rank5_g2_alt import ordinary_expression
from probe_iso_n5_g1_internal_endpoint_boundary_global_payment_root import compact_forms
from probe_iso_n5_g1_internal_ordinary_low00_parent_interval_cone_root import (
    interval_basis,
    universal_row_basis,
)


HERE = Path(__file__).resolve().parent
OUTPUT = HERE / (
    "iso_n5_g2_internal_ordinary_stable_origin_adjacent_modes_"
    "probe_g2_structure_nonadjacent_20260830.json"
)
MARKER = (
    "PROBE_EXACT_ISO_N5_G2_INTERNAL_ORDINARY_STABLE_ORIGIN_"
    "ADJACENT_MODES_G2_STRUCTURE_NONADJACENT"
)


def at(row, rank):
    return row[rank] if 0 <= rank < len(row) else sp.Integer(0)


def add(*rows):
    return tuple(sp.expand(sum(values)) for values in zip(*rows))


def shift(row):
    return tuple(at(row, rank - 1) for rank in range(7))


def symbolic_row(prefix):
    return (sp.Integer(1), *sp.symbols(f"{prefix}1:7"))


def row_difference(full, deleted):
    return tuple(sp.expand(x - y) for x, y in zip(full, deleted))


def bridge_row(child_full, child_deleted, parent_full, parent_deleted):
    product = convolve(child_full, parent_full)
    forbidden = convolve(
        row_difference(child_full, child_deleted),
        row_difference(parent_full, parent_deleted),
    )
    return tuple(sp.expand(x - y) for x, y in zip(product, forbidden))


def specialize(raw, generic_c, generic_d, crows, drows):
    rules = {
        symbol: value
        for generic, actual in zip(generic_c + generic_d, crows + drows)
        for symbol, value in zip(generic, actual)
    }
    return sp.expand(raw.subs(rules))


def stable_origin(expression, rows):
    h, k = sp.symbols("h k", integer=True, nonnegative=True)
    ell = 8 + h
    rules = {}
    for rank in range(1, 7):
        u = isolate_times_path(k, ell - 1, rank)
        x = sp.expand(u + path_coefficient(ell - 2, rank - 1))
        z = isolate_times_path(k, ell - 2, rank)
        y = sp.expand(z + path_coefficient(ell - 3, rank - 1))
        rules.update({
            rows["X"][rank]: x, rows["U"][rank]: u,
            rows["Y"][rank]: y, rows["Z"][rank]: z,
        })
    degrees, forms = tensor_binomial(sp.expand(expression.subs(rules)), (h, k))
    assert degrees == (5, 5)
    return sp.expand(forms[(0, 0)])


def child_origin_rows():
    result = []
    for name in ("X", "U", "Y", "Z"):
        values = []
        for rank in range(7):
            if name == "U":
                value = isolate_times_path(0, 7, rank)
            elif name == "X":
                value = isolate_times_path(0, 7, rank) + path_coefficient(6, rank - 1)
            elif name == "Z":
                value = isolate_times_path(0, 6, rank)
            else:
                value = isolate_times_path(0, 6, rank) + path_coefficient(5, rank - 1)
            values.append(sp.Integer(value))
        result.append(tuple(values))
    return tuple(result)


def main():
    expression, rows = ordinary_expression()
    print("derived ordinary factor expression", flush=True)
    target_parent = stable_origin(expression, rows)
    print("derived stable origin", flush=True)
    xrow, urow, yrow, zrow = child_origin_rows()
    assert all(row[0] == 1 for row in (xrow, urow, yrow, zrow))

    a, a0, b, b0 = (symbolic_row(prefix) for prefix in ("a", "c", "b", "d"))
    ab, ab0, a0b = convolve(a, b), convolve(a, b0), convolve(a0, b)
    wrow = ab
    prow = add(ab, shift(ab0))
    vrow = add(ab, shift(a0b))
    erow = add(ab, shift(ab0), shift(a0b))
    parent = (erow, prow, vrow, wrow)
    parent_rules = {
        symbol: value
        for generic, actual in zip(
            (rows["E"], rows["P"], rows["V"], rows["W"]), parent
        )
        for symbol, value in zip(generic[1:], actual[1:])
    }
    target = sp.expand(target_parent.subs(parent_rules))
    print("factorized target", flush=True)
    variables = tuple(symbol for row in (a, a0, b, b0) for symbol in row[1:])

    # Build every theorem generator first in the small abstract parent chart;
    # only then substitute the branch products.  This avoids destructive
    # intermediate expansion inside the 24 factor variables.
    pe, pp, pv, pw = tuple(
        (sp.Integer(1), *rows[name][1:7]) for name in ("E", "P", "V", "W")
    )
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
    generic_c, generic_d, _raw_g1, raw_g2 = raw_coefficients()
    basis = []

    for state_name, state in states.items():
        print(f"building global modes for {state_name}", flush=True)
        forms = compact_forms(state)
        for form_name in ("S_C", "C5_C", "N4_C"):
            basis.append((f"{form_name}_{state_name}", sp.expand(forms[form_name])))
        basis.extend([
            (f"g2_no_parent_{state_name}", specialize(
                raw_g2, generic_c, generic_d, state, state,
            )),
            (f"g2_endpoint_first_{state_name}", specialize(
                raw_g2, generic_c, generic_d, state,
                (state[1], state[1], state[3], state[3]),
            )),
            (f"g2_endpoint_second_{state_name}", specialize(
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
        basis.append((
            f"g2_singleton_ordinary_{name}",
            specialize(raw_g2, generic_c, generic_d, source, deleted),
        ))

    # Frozen internal-endpoint mode with endpoint v, before and after p is
    # deleted.  The displayed D rows are its literal factorization.
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

    print(f"abstract theorem generators: {len(basis)}", flush=True)
    # Substitute and immediately sparsify one generator at a time.
    unique = {}
    for index, (label, candidate) in enumerate(basis):
        transformed = sp.expand(candidate.subs(parent_rules))
        terms = dict(sp.Poly(transformed, *variables).terms())
        key = tuple(sorted(terms.items()))
        unique.setdefault(key, (label, terms))
        if index % 8 == 7:
            print(f"factorized generators: {index + 1}/{len(basis)}", flush=True)
    basis_terms = {label: terms for label, terms in unique.values()}
    print(f"unique factorized generators: {len(basis_terms)}", flush=True)
    target_terms = dict(sp.Poly(target, *variables).terms())

    # Lift the genuine branch-pair interval and forest-row inequalities only
    # by coefficient monomials that can directly pay a negative target term.
    primitive = []
    primitive.extend(interval_basis(a, a0, "A_A0"))
    primitive.extend(interval_basis(b, b0, "B_B0"))
    for name, row in (("A", a), ("A0", a0), ("B", b), ("B0", b0)):
        primitive.extend(universal_row_basis(row, name))
    for pair_name, full, deleted in (("A_A0", a, a0), ("B_B0", b, b0)):
        for rank in range(1, 7):
            primitive.append((
                f"dominance_{pair_name}_{rank}", full[rank] - deleted[rank]
            ))
    negative_target_powers = [
        powers for powers, value in target_terms.items() if value.is_negative is True
    ]
    lifted = {}
    for label, generator in primitive:
        generator_terms = dict(sp.Poly(sp.expand(generator), *variables).terms())
        negative_generator_powers = [
            powers for powers, value in generator_terms.items()
            if value.is_negative is True
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
            key = tuple(sorted(terms.items()))
            lifted.setdefault(key, (f"{label}_lift_{len(lifted)}", terms))
    for _key, (label, terms) in lifted.items():
        basis_terms.setdefault(label, terms)
    print(
        f"primitive generators: {len(primitive)}; targeted lifts: {len(lifted)}; "
        f"total basis: {len(basis_terms)}",
        flush=True,
    )
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
    report = {
        "marker": MARKER,
        "geometry": (
            "adjacent p-v exact branch factorization with componentwise pairs "
            "A->A0 and B->B0"
        ),
        "target_monomials": len(target_terms),
        "target_negative_scalar_coefficients": sum(
            value.is_negative is True for value in target_terms.values()
        ),
        "basis_size": len(labels),
        "coefficient_rows": len(universe),
        "floating_feasible": bool(solution.success),
        "floating_status": solution.message,
        "floating_support": [
            {"label": label, "weight": format(float(weight), ".17g")}
            for label, weight in zip(labels, solution.x if solution.success else ())
            if weight > 1e-9
        ],
        "status": "actual-structure floating cone probe only; no theorem asserted",
        "scope": (
            "Stable (h,k)=(0,0) adjacent-parent internal-ordinary g2 only. "
            "No nonadjacent, small-length, all-g2, all-N5, or Problem 993 claim."
        ),
        "source_sha256": hashlib.sha256(Path(__file__).read_bytes()).hexdigest().upper(),
    }
    raw = json.dumps(report, indent=2, sort_keys=True) + "\n"
    OUTPUT.write_text(raw, encoding="utf-8", newline="\n")
    print(json.dumps(report, indent=2, sort_keys=True), flush=True)
    print("REPORT_SHA256", hashlib.sha256(raw.encode()).hexdigest().upper(), flush=True)
    print(MARKER, flush=True)


if __name__ == "__main__":
    main()
