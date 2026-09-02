#!/usr/bin/env python3
"""Exact parent-global cone probe for stable internal-ordinary g2.

The target is the 21 Newton coefficient forms obtained after writing the
stable broom length as ``ell=8+h``.  The parent rows are

    E=I(F), P=I(F-p), V=I(F-v), W=I(F-{p,v}).

Every cone generator below is a previously proved nonnegative forest form,
an induced-subforest coefficient difference times a nonnegative coefficient,
or a componentwise-deletion interval form.  A row is accepted only after the
floating LP weights have been rationalized and the residual has literally
nonnegative monomial coefficients.  Unresolved rows make no sign claim.
"""

from __future__ import annotations

from fractions import Fraction
import hashlib
import json
import os
from pathlib import Path

import numpy as np
import sympy as sp
from scipy.optimize import linprog

from derive_iso_n5_bundle_g12_canonical_configuration_g1_bernstein import (
    binomial_polynomial,
    raw_coefficients,
)
from derive_iso_n5_g1_internal_endpoint_broom_parameters_root import (
    isolate_times_path,
    path_coefficient,
    tensor_binomial,
)
from derive_iso_n5_g2_internal_ordinary_broom_factor_rank5_g2_alt import ordinary_expression
from probe_iso_n5_g1_internal_endpoint_boundary_global_payment_root import compact_forms
from prove_iso_n5_disconnected_m5_middle_interval_g1_nonadjacent import (
    H,
    P as ROOTED_P,
    interval_cells,
    unique_expressions,
)


HERE = Path(__file__).resolve().parent
MARKER = "PROBE_EXACT_ISO_N5_G2_INTERNAL_ORDINARY_PARENT_GLOBAL_CONE_RANK5_G2_ALT"
H_SHIFT = int(os.environ.get("ERDOS993_G2_INTERNAL_ORDINARY_H_SHIFT", "0"))
K_SHIFT = int(os.environ.get("ERDOS993_G2_INTERNAL_ORDINARY_K_SHIFT", "0"))
MAX_ISOLATES = int(os.environ.get("ERDOS993_G2_INTERNAL_ORDINARY_MAX_ISOLATES", "0"))
PARENT_ORDER_SHIFT = int(os.environ.get("ERDOS993_G2_INTERNAL_ORDINARY_PARENT_ORDER_SHIFT", "13"))
OUTPUT = HERE / (
    "iso_n5_g2_internal_ordinary_parent_global_cone_probe_"
    f"h{H_SHIFT}_k{K_SHIFT}_n{PARENT_ORDER_SHIFT}_iso{MAX_ISOLATES}_rank5_g2_alt_20260830.json"
)


def vector(expression, variables, monomials):
    data = dict(sp.Poly(sp.expand(expression), *variables).terms())
    return [sp.Rational(data.get(monomial, 0)) for monomial in monomials]


def rationalize(values):
    return [
        sp.Rational(Fraction(float(value)).limit_denominator(8_000_000))
        for value in values
    ]


def shifted_coefficients(coefficients):
    answer = {}
    maximum_h = max(index[0] for index in coefficients)
    maximum_k = max(index[1] for index in coefficients)
    for a in range(maximum_h + 1):
        for b in range(maximum_k + 1):
            value = sp.expand(sum(
                sp.binomial(H_SHIFT, i - a)
                * sp.binomial(K_SHIFT, j - b)
                * coefficients.get((i, j), 0)
                for i in range(a, maximum_h + 1)
                for j in range(b, maximum_k + 1)
            ))
            if value != 0:
                answer[(a, b)] = value
    return answer


def add_isolates(row, amount):
    return tuple(sp.expand(sum(
        sp.binomial(amount, added) * row[rank - added]
        for added in range(rank + 1)
    )) for rank in range(7))


def specialize(raw_form, generic_c, generic_d, crows, drows):
    rules = {}
    for generic, actual in zip(generic_c + generic_d, crows + drows):
        rules.update(dict(zip(generic, actual)))
    return sp.expand(raw_form.subs(rules))


def row_reserves(label, row):
    return [
        (f"HC_{label}", row[3] ** 2 - row[1] * row[5]),
        (f"Q3_{label}", 6 * row[3] ** 2 - row[2] * row[3] - 8 * row[2] * row[4]),
        (f"two_step_{label}", 2 * row[2] * row[3] - row[1] * row[3] - 4 * row[1] * row[4]),
        (f"rank2_companion_{label}", 2 * row[2] ** 2 - 3 * row[1] * row[3] - 2 * row[2]),
    ]


def build_parent_basis(rows):
    parent_rows = tuple(
        (sp.Integer(1), *rows[name][1:7])
        for name in ("E", "P", "V", "W")
    )
    variables = tuple(symbol for row in parent_rows for symbol in row[1:7])
    e, p, v, w = parent_rows
    generic_c, generic_d, _raw_g1, raw_g2 = raw_coefficients()
    basis = []

    def add_global_generators(tag, current_rows):
        ce, cp, cv, cw = current_rows
        global_forms = compact_forms(current_rows)
        for name in ("S_C", "C5_C", "N4_C"):
            basis.append((f"{name.replace('_C', '_T')}{tag}", global_forms[name]))
        # These three g2 forms are exact all-forest theorems already frozen:
        # D=C (no-parent) and p=u / p=v (singleton endpoint).
        basis.extend([
            (f"no_parent_g2{tag}", specialize(
                raw_g2, generic_c, generic_d, current_rows, current_rows,
            )),
            (f"singleton_endpoint_p_g2{tag}", specialize(
                raw_g2, generic_c, generic_d, current_rows, (cp, cp, cw, cw),
            )),
            (f"singleton_endpoint_v_g2{tag}", specialize(
                raw_g2, generic_c, generic_d, current_rows, (cv, cw, cv, cw),
            )),
        ])
        for name, row in zip(("E", "P", "V", "W"), current_rows):
            basis.extend(row_reserves(f"{name}{tag}", row))

    add_global_generators("", parent_rows)
    for amount in range(1, MAX_ISOLATES + 1):
        add_global_generators(
            f"_plus_{amount}_isolates",
            tuple(add_isolates(row, amount) for row in parent_rows),
        )

    differences = {
        "E_minus_P": tuple(e[index] - p[index] for index in range(1, 7)),
        "E_minus_V": tuple(e[index] - v[index] for index in range(1, 7)),
        "P_minus_W": tuple(p[index] - w[index] for index in range(1, 7)),
        "V_minus_W": tuple(v[index] - w[index] for index in range(1, 7)),
        "both_marks": tuple(
            e[index] - p[index] - v[index] + w[index]
            for index in range(1, 7)
        ),
    }
    multipliers = [("one", sp.Integer(1))] + [
        (str(symbol), symbol) for symbol in variables
    ]
    for difference_name, difference_row in differences.items():
        for rank, difference in enumerate(difference_row, 1):
            for multiplier_name, multiplier in multipliers:
                basis.append((
                    f"{difference_name}_{rank}_times_{multiplier_name}",
                    sp.expand(difference * multiplier),
                ))

    rooted_intervals = unique_expressions(interval_cells(ROOTED_P, H))[1:]

    def add_rooted_pair(pair_name, full_row, upper_row):
        qrow = (sp.Integer(1),) + tuple(
            sp.expand(upper_row[index + 1] - full_row[index + 1])
            for index in range(5)
        )
        mapping = {
            ROOTED_P[0]: 1,
            H[0]: 1,
            **{ROOTED_P[index]: full_row[index] for index in range(1, 7)},
            **{H[index]: qrow[index] for index in range(1, 6)},
        }
        for label, interval in enumerate(rooted_intervals, 2):
            basis.append((
                f"{pair_name}_interval_sum_{label}",
                sp.expand(interval.subs(mapping)),
            ))
        basis.extend(row_reserves(f"{pair_name}_Q", qrow))
        for rank in range(1, 6):
            difference = sp.expand(full_row[rank] - qrow[rank])
            for multiplier_name, multiplier in multipliers:
                basis.append((
                    f"{pair_name}_dominance_{rank}_times_{multiplier_name}",
                    sp.expand(difference * multiplier),
                ))
        return qrow

    add_rooted_pair("P_Qp", p, e)
    add_rooted_pair("W_Qpv", w, v)
    add_rooted_pair("V_Qv", v, e)
    add_rooted_pair("W_B", w, p)
    return variables, basis


def add_parent_order_boxes(rows, basis, parent_order_shift=PARENT_ORDER_SHIFT):
    """Impose exact rank-one orders and path/edgeless row boxes."""
    n0 = sp.symbols("n0", integer=True, nonnegative=True)
    order_rules = {
        rows["E"][1]: n0 + parent_order_shift,
        rows["P"][1]: n0 + parent_order_shift - 1,
        rows["V"][1]: n0 + parent_order_shift - 1,
        rows["W"][1]: n0 + parent_order_shift - 2,
    }
    basis = [(label, sp.expand(value.subs(order_rules))) for label, value in basis]
    variables = (n0,) + tuple(
        rows[name][rank]
        for name in ("E", "P", "V", "W")
        for rank in range(2, 7)
    )
    box_multipliers = [("one", sp.Integer(1))] + [
        (str(symbol), symbol) for symbol in variables
    ]
    row_orders = {
        "E": n0 + parent_order_shift,
        "P": n0 + parent_order_shift - 1,
        "V": n0 + parent_order_shift - 1,
        "W": n0 + parent_order_shift - 2,
    }
    for name in ("E", "P", "V", "W"):
        order = row_orders[name]
        for rank in range(2, 7):
            value = rows[name][rank]
            floor = binomial_polynomial(order - rank + 1, rank)
            ceiling = binomial_polynomial(order, rank)
            for bound_name, gap in (
                ("path_floor", sp.expand(value - floor)),
                ("edgeless_ceiling", sp.expand(ceiling - value)),
            ):
                for multiplier_name, multiplier in box_multipliers:
                    basis.append((
                        f"{name}_{rank}_{bound_name}_times_{multiplier_name}",
                        sp.expand(gap * multiplier),
                    ))
    return variables, basis, order_rules


def cone_row(form, variables, basis):
    form = sp.expand(form)
    monomial_set = set(sp.Poly(form, *variables).monoms())
    for _label, candidate in basis:
        monomial_set.update(sp.Poly(candidate, *variables).monoms())
    monomials = sorted(monomial_set, reverse=True)
    target_vector = vector(form, variables, monomials)
    basis_vectors = [vector(candidate, variables, monomials) for _label, candidate in basis]
    matrix = np.array([
        [float(candidate[row]) for candidate in basis_vectors]
        for row in range(len(monomials))
    ])
    target = np.array([float(value) for value in target_vector])
    solution = linprog(
        c=np.zeros(len(basis)), A_ub=matrix, b_ub=target,
        bounds=[(0, None)] * len(basis), method="highs",
        options={"dual_feasibility_tolerance": 1e-9, "primal_feasibility_tolerance": 1e-9},
    )
    result = {
        "floating_feasible": bool(solution.success),
        "exact_rational_certificate": False,
        "parent_form_monomials": len(sp.Poly(form, *variables).terms()),
    }
    if not solution.success:
        return result
    weights = rationalize(solution.x)
    residual = sp.expand(form - sum(
        weight * candidate for weight, (_label, candidate) in zip(weights, basis)
    ))
    residual_poly = sp.Poly(residual, *variables)
    if not (all(weight >= 0 for weight in weights)
            and all(value >= 0 for value in residual_poly.coeffs())):
        return result
    stream = "".join(f"{powers}:{value};" for powers, value in residual_poly.terms())
    result.update({
        "exact_rational_certificate": True,
        "basis_weights": {
            label: str(weight)
            for weight, (label, _candidate) in zip(weights, basis) if weight != 0
        },
        "residual_nonnegative_monomials": len(residual_poly.terms()),
        "minimum_residual_scalar": str(min(residual_poly.coeffs())),
        "residual_stream_sha256": hashlib.sha256(stream.encode()).hexdigest().upper(),
    })
    return result


def main():
    expression, rows = ordinary_expression()
    h, k = sp.symbols("h k", integer=True, nonnegative=True)
    ell = 8 + h
    substitutions = {}
    for rank in range(1, 7):
        u_value = isolate_times_path(k, ell - 1, rank)
        x_value = sp.expand(u_value + path_coefficient(ell - 2, rank - 1))
        z_value = isolate_times_path(k, ell - 2, rank)
        y_value = sp.expand(z_value + path_coefficient(ell - 3, rank - 1))
        substitutions.update({
            rows["X"][rank]: x_value,
            rows["U"][rank]: u_value,
            rows["Y"][rank]: y_value,
            rows["Z"][rank]: z_value,
        })
    reduced = sp.expand(expression.subs(substitutions))
    degrees, coefficients = tensor_binomial(reduced, (h, k))
    assert degrees == (5, 5)
    coefficients = shifted_coefficients(coefficients)
    _variables, basis = build_parent_basis(rows)
    variables, basis, order_rules = add_parent_order_boxes(rows, basis)

    results = []
    for index, form in sorted(coefficients.items()):
        if form == 0:
            continue
        row = {
            "h_index": index[0], "k_index": index[1],
            **cone_row(sp.expand(form.subs(order_rules)), variables, basis),
        }
        results.append(row)
        print(index, row["exact_rational_certificate"], flush=True)

    exact = sum(row["exact_rational_certificate"] for row in results)
    report = {
        "marker": MARKER,
        "degrees_h_k": list(degrees),
        "newton_shift_h_k": [H_SHIFT, K_SHIFT],
        "maximum_isolate_extension": MAX_ISOLATES,
        "parent_order_shift": PARENT_ORDER_SHIFT,
        "basis_size": len(basis),
        "parent_forms": len(results),
        "exact_decompositions": exact,
        "unresolved_forms": len(results) - exact,
        "forms": results,
        "scope": (
            "Exact cone probe for ell>=8 internal ordinary-parent g2.  A row with "
            "exact_rational_certificate=true is proved from named universal forest "
            "generators; unresolved rows make no sign claim."
        ),
        "source_sha256": hashlib.sha256(Path(__file__).read_bytes()).hexdigest().upper(),
    }
    raw = json.dumps(report, indent=2, sort_keys=True) + "\n"
    OUTPUT.write_text(raw, encoding="utf-8", newline="\n")
    print(json.dumps({
        "marker": MARKER, "basis_size": len(basis), "parent_forms": len(results),
        "exact_decompositions": exact,
        "unresolved_indices": [[r["h_index"], r["k_index"]] for r in results
                               if not r["exact_rational_certificate"]],
    }, indent=2, sort_keys=True))
    print("REPORT_SHA256", hashlib.sha256(raw.encode()).hexdigest().upper())
    print(MARKER)


if __name__ == "__main__":
    main()
