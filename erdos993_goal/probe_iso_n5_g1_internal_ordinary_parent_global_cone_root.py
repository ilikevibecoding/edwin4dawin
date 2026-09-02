#!/usr/bin/env python3
"""Exact global parent-cone probe for large internal-ordinary g1 cells.

For ``ell=8+h`` the ordinary-parent reduction has 28 nonzero Newton cells
in ``C(h,i)C(k,j)``.  This probe tests those parent forms against universally
nonnegative marked-forest generators:

* S(T), C5(T), and N4(T) for T=(E,P,V,W);
* the single-row HC, Q3, two-step, and rank-two companion reserves;
* coefficientwise inclusion-partition differences E-P, E-V, P-W, V-W,
  and E-P-V+W, multiplied by one nonnegative parent coefficient.

The final difference is the shifted row of independent sets containing both
marks and is zero when the marks are adjacent.  Only exact rational residual
checks count as certificates; unresolved cells make no sign claim.
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

from derive_iso_n5_g1_internal_endpoint_broom_parameters_root import (
    isolate_times_path,
    path_coefficient,
    tensor_binomial,
)
from derive_iso_n5_bundle_g12_canonical_configuration_g1_bernstein import raw_coefficients
from derive_iso_n5_g1_internal_ordinary_broom_factor_root import ordinary_expression
from probe_iso_n5_g1_internal_endpoint_boundary_global_payment_root import compact_forms
from prove_iso_n5_disconnected_m5_middle_interval_g1_nonadjacent import (
    H,
    P as ROOTED_P,
    interval_cells,
    unique_expressions,
)


HERE = Path(__file__).resolve().parent
OUTPUT = HERE / "iso_n5_g1_internal_ordinary_parent_global_cone_probe_root_20260830.json"
MARKER = "PROBE_EXACT_ISO_N5_G1_INTERNAL_ORDINARY_PARENT_GLOBAL_CONE_ROOT"
H_SHIFT = int(os.environ.get("ERDOS993_INTERNAL_ORDINARY_H_SHIFT", "0"))
K_SHIFT = int(os.environ.get("ERDOS993_INTERNAL_ORDINARY_K_SHIFT", "0"))


def vector(expression, variables, monomials):
    data = dict(sp.Poly(sp.expand(expression), *variables).terms())
    return [sp.Rational(data.get(monomial, 0)) for monomial in monomials]


def rationalize(values):
    return [
        sp.Rational(Fraction(float(value)).limit_denominator(4_000_000))
        for value in values
    ]


def shifted_coefficients(coefficients):
    answer = {}
    for a in range(7):
        for b in range(7):
            value = sp.expand(sum(
                sp.binomial(H_SHIFT, i - a)
                * sp.binomial(K_SHIFT, j - b)
                * coefficients.get((i, j), 0)
                for i in range(a, 7)
                for j in range(b, 7)
            ))
            if value != 0:
                answer[(a, b)] = value
    return answer


def main() -> None:
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
    assert degrees == (6, 6)
    coefficients = shifted_coefficients(coefficients)

    parent_rows = tuple(
        (sp.Integer(1), *rows[name][1:7])
        for name in ("E", "P", "V", "W")
    )
    variables = tuple(symbol for row in parent_rows for symbol in row[1:7])
    basis = []
    global_forms = compact_forms(parent_rows)
    for name in ("S_C", "C5_C", "N4_C"):
        basis.append((name.replace("_C", "_T"), global_forms[name]))

    generic_c, generic_d, raw_parent_g1, _raw_parent_g2 = raw_coefficients()

    def specialize_parent_g1(crows, drows):
        rules = {}
        for generic, actual in zip(generic_c + generic_d, crows + drows):
            rules.update(dict(zip(generic, actual)))
        return sp.expand(raw_parent_g1.subs(rules))

    e, p, v, w = parent_rows
    basis.extend([
        (
            "singleton_endpoint_parent_p_g1",
            specialize_parent_g1(parent_rows, (p, p, w, w)),
        ),
        (
            "singleton_endpoint_parent_v_g1",
            specialize_parent_g1(parent_rows, (v, w, v, w)),
        ),
    ])

    for name, row in zip(("E", "P", "V", "W"), parent_rows):
        basis.extend([
            (f"HC_{name}", row[3] ** 2 - row[1] * row[5]),
            (f"Q3_{name}", 6 * row[3] ** 2 - row[2] * row[3] - 8 * row[2] * row[4]),
            (f"two_step_{name}", 2 * row[2] * row[3] - row[1] * row[3] - 4 * row[1] * row[4]),
            (f"rank2_companion_{name}", 2 * row[2] ** 2 - 3 * row[1] * row[3] - 2 * row[2]),
        ])

    def add_isolates(row, amount):
        return tuple(sp.expand(sum(
            sp.binomial(amount, added) * row[rank - added]
            for added in range(rank + 1)
        )) for rank in range(7))

    # Every fixed isolate extension is again a forest/marked forest, so these
    # are legitimate nonnegative generators, not Newton-coefficient claims.
    for amount in range(1, 17):
        extended_rows = tuple(add_isolates(row, amount) for row in parent_rows)
        extended_global = compact_forms(extended_rows)
        for name in ("S_C", "C5_C", "N4_C"):
            basis.append((
                f"{name.replace('_C', '_T')}_plus_{amount}_isolates",
                extended_global[name],
            ))
        for name, row in zip(("E", "P", "V", "W"), extended_rows):
            basis.extend([
                (f"HC_{name}_plus_{amount}_isolates", row[3] ** 2 - row[1] * row[5]),
                (f"Q3_{name}_plus_{amount}_isolates", 6 * row[3] ** 2 - row[2] * row[3] - 8 * row[2] * row[4]),
                (f"two_step_{name}_plus_{amount}_isolates", 2 * row[2] * row[3] - row[1] * row[3] - 4 * row[1] * row[4]),
                (f"rank2_companion_{name}_plus_{amount}_isolates", 2 * row[2] ** 2 - 3 * row[1] * row[3] - 2 * row[2]),
            ])

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

    # Root recurrence at the ordinary parent p, before and after deleting v:
    # E=P+x Qp and V=W+x Qpv.  Both (P,Qp) and (W,Qpv) lie in the proved
    # componentwise-deletion interval domain.  Here Qp_j=E_(j+1)-P_(j+1).
    rooted_intervals = unique_expressions(interval_cells(ROOTED_P, H))[1:]

    def add_rooted_pair(pair_name, full_row, deleted_row, upper_row):
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
        for name, row in ((f"{pair_name}_Q", qrow),):
            basis.extend([
                (f"HC_{name}", row[3] ** 2 - row[1] * row[5]),
                (f"Q3_{name}", 6 * row[3] ** 2 - row[2] * row[3] - 8 * row[2] * row[4]),
                (f"two_step_{name}", 2 * row[2] * row[3] - row[1] * row[3] - 4 * row[1] * row[4]),
                (f"rank2_companion_{name}", 2 * row[2] ** 2 - 3 * row[1] * row[3] - 2 * row[2]),
            ])
        for rank in range(1, 6):
            difference = sp.expand(full_row[rank] - qrow[rank])
            for multiplier_name, multiplier in multipliers:
                basis.append((
                    f"{pair_name}_dominance_{rank}_times_{multiplier_name}",
                    sp.expand(difference * multiplier),
                ))
        return qrow

    _qp = add_rooted_pair("P_Qp", p, None, e)
    _qp_v = add_rooted_pair("W_Qpv", w, None, v)
    _qv = add_rooted_pair("V_Qv", v, None, e)
    _qv_p = add_rooted_pair("W_B", w, None, p)

    results = []
    for index, form in sorted(coefficients.items()):
        if form == 0:
            continue
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
            c=np.zeros(len(basis)),
            A_ub=matrix,
            b_ub=target,
            bounds=[(0, None)] * len(basis),
            method="highs",
            options={
                "dual_feasibility_tolerance": 1e-9,
                "primal_feasibility_tolerance": 1e-9,
            },
        )
        result = {
            "h_index": index[0],
            "k_index": index[1],
            "floating_feasible": bool(solution.success),
            "exact_rational_certificate": False,
            "parent_form_monomials": len(sp.Poly(form, *variables).terms()),
        }
        if solution.success:
            weights = rationalize(solution.x)
            residual = sp.expand(form - sum(
                weight * candidate for weight, (_label, candidate) in zip(weights, basis)
            ))
            residual_poly = sp.Poly(residual, *variables)
            if all(weight >= 0 for weight in weights) and all(
                value >= 0 for value in residual_poly.coeffs()
            ):
                stream = "".join(
                    f"{powers}:{value};" for powers, value in residual_poly.terms()
                )
                result.update({
                    "exact_rational_certificate": True,
                    "basis_weights": {
                        label: str(weight)
                        for weight, (label, _candidate) in zip(weights, basis)
                        if weight != 0
                    },
                    "residual_nonnegative_monomials": len(residual_poly.terms()),
                    "minimum_residual_scalar": str(min(residual_poly.coeffs())),
                    "residual_stream_sha256": hashlib.sha256(stream.encode()).hexdigest().upper(),
                })
        results.append(result)

    exact = sum(row["exact_rational_certificate"] for row in results)
    report = {
        "marker": MARKER,
        "degrees_h_k": list(degrees),
        "newton_shift_h_k": [H_SHIFT, K_SHIFT],
        "basis_size": len(basis),
        "parent_forms": len(results),
        "exact_decompositions": exact,
        "unresolved_forms": len(results) - exact,
        "forms": results,
        "scope": (
            "Exact cone probe for ell>=8 internal ordinary-parent g1.  A verified "
            "row is a sign proof from the named universal generators; unresolved "
            "rows make no sign claim."
        ),
        "source_sha256": hashlib.sha256(Path(__file__).read_bytes()).hexdigest().upper(),
    }
    raw = json.dumps(report, indent=2, sort_keys=True) + "\n"
    OUTPUT.write_text(raw, encoding="utf-8", newline="\n")
    print(json.dumps({
        "marker": MARKER,
        "basis_size": len(basis),
        "parent_forms": len(results),
        "exact_decompositions": exact,
        "unresolved_indices": [
            [row["h_index"], row["k_index"]]
            for row in results if not row["exact_rational_certificate"]
        ],
    }, indent=2, sort_keys=True))
    print("REPORT_SHA256", hashlib.sha256(raw.encode()).hexdigest().upper())
    print(MARKER)


if __name__ == "__main__":
    main()
