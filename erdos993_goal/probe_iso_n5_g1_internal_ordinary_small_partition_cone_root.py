#!/usr/bin/env python3
"""Exact parent-cone probe for the 98 small-broom ordinary g1 rows.

For each fixed ``ell=1,...,7`` expand in the Newton basis ``binom(k,j)``.
On each parent-mark face use the exact partition

    W=A, P=A+xB, V=A+xC,
    E=A+xB+xC+epsilon*x^2D.

The cone contains only already established forest inequalities: universal
S/C5/N4, the low-rank one-row inequalities, and all componentwise rooted
deletion interval sums for the four genuine parent deletion pairs, also
after adjoining bounded numbers of isolates.  A row is credited only when
floating discovery recovers nonnegative rational weights and an exactly
coefficientwise-nonnegative residual.  Unresolved rows make no claim.
"""

from __future__ import annotations

from fractions import Fraction
import hashlib
import json
from pathlib import Path

import numpy as np
import sympy as sp
from scipy.optimize import linprog

from derive_iso_n5_g1_internal_endpoint_broom_parameters_root import tensor_binomial
from derive_iso_n5_g1_internal_ordinary_broom_factor_root import ordinary_expression
from derive_iso_n5_g1_internal_ordinary_small_broom_parameters_root import child_rows
from probe_iso_n5_g1_internal_endpoint_boundary_global_payment_root import compact_forms
from prove_iso_n5_disconnected_m5_all_componentwise_g1_nonadjacent import (
    H,
    P as ROOTED_P,
    interval_cells,
    unique_expressions,
)


HERE = Path(__file__).resolve().parent
OUTPUT = HERE / "iso_n5_g1_internal_ordinary_small_partition_cone_probe_root_20260830.json"
MARKER = "PROBE_EXACT_ISO_N5_G1_INTERNAL_ORDINARY_SMALL_PARTITION_CONE_ROOT"
LENGTHS = tuple(range(1, 8))
ISOLATE_EXTENSIONS = tuple(range(1, 17))
INTERVAL_EXTENSIONS = tuple(range(9))


def at(row, index):
    return row[index] if 0 <= index < len(row) else sp.Integer(0)


def vector(expression, variables, monomials):
    data = dict(sp.Poly(sp.expand(expression), *variables).terms())
    return [sp.Rational(data.get(monomial, 0)) for monomial in monomials]


def rationalize(values):
    return [
        sp.Rational(Fraction(float(value)).limit_denominator(4_000_000))
        for value in values
    ]


def isolate_extend(row, amount, maximum=6):
    return tuple(sp.expand(sum(
        sp.binomial(amount, added) * at(row, rank - added)
        for added in range(rank + 1)
    )) for rank in range(maximum + 1))


def target_forms(expression, rows):
    k = sp.symbols("k", integer=True, nonnegative=True)
    targets = {}
    degrees = {}
    for ell in LENGTHS:
        xrow, urow, yrow, zrow = child_rows(ell, k)
        rules = {}
        for rank in range(1, 7):
            rules.update({
                rows["X"][rank]: xrow[rank],
                rows["U"][rank]: urow[rank],
                rows["Y"][rank]: yrow[rank],
                rows["Z"][rank]: zrow[rank],
            })
        degree, coefficients = tensor_binomial(
            sp.expand(expression.subs(rules)), (k,)
        )
        degrees[ell] = degree[0]
        for index, form in coefficients.items():
            if form != 0:
                targets[(ell, index[0])] = form
    assert len(targets) == 49
    assert set(degrees.values()) == {6}
    return targets, degrees


def ambient_parent_basis(rows):
    e, p, v, w = tuple(
        (sp.Integer(1), *rows[name][1:7]) for name in ("E", "P", "V", "W")
    )
    parent_rows = (e, p, v, w)
    basis = []

    global_forms = compact_forms(parent_rows)
    for name in ("S_C", "C5_C", "N4_C"):
        basis.append((name.replace("_C", "_T"), global_forms[name]))
    for name, row in zip(("E", "P", "V", "W"), parent_rows):
        basis.extend([
            (f"HC_{name}", row[3] ** 2 - row[1] * row[5]),
            (f"Q3_{name}", 6 * row[3] ** 2 - row[2] * row[3] - 8 * row[2] * row[4]),
            (f"two_step_{name}", 2 * row[2] * row[3] - row[1] * row[3] - 4 * row[1] * row[4]),
            (f"rank2_companion_{name}", 2 * row[2] ** 2 - 3 * row[1] * row[3] - 2 * row[2]),
        ])

    for amount in ISOLATE_EXTENSIONS:
        extended_rows = tuple(isolate_extend(row, amount) for row in parent_rows)
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

    rooted_intervals = unique_expressions(interval_cells(ROOTED_P, H))[1:]
    assert len(rooted_intervals) == 15

    def add_rooted_intervals(pair_name, full_row, upper_row):
        qrow = (sp.Integer(1),) + tuple(
            sp.expand(upper_row[index + 1] - full_row[index + 1])
            for index in range(5)
        )
        for amount in INTERVAL_EXTENSIONS:
            full_extended = isolate_extend(full_row, amount, 6)
            q_extended = isolate_extend(qrow, amount, 5)
            suffix = "" if amount == 0 else f"_plus_{amount}_isolates"
            mapping = {
                ROOTED_P[0]: 1,
                H[0]: 1,
                **{ROOTED_P[index]: full_extended[index] for index in range(1, 7)},
                **{H[index]: q_extended[index] for index in range(1, 6)},
            }
            for label, interval in enumerate(rooted_intervals, 2):
                basis.append((
                    f"{pair_name}_interval_sum_{label}{suffix}",
                    sp.expand(interval.subs(mapping)),
                ))

    add_rooted_intervals("P_Qp", p, e)
    add_rooted_intervals("W_Qpv", w, v)
    add_rooted_intervals("V_Qv", v, e)
    add_rooted_intervals("W_B", w, p)
    return basis, global_forms


def transformed_basis(rows, epsilon, ambient, global_forms):
    a = (sp.Integer(1), *sp.symbols("a1:7"))
    b = (sp.Integer(1), *sp.symbols("b1:6"))
    c = (sp.Integer(1), *sp.symbols("c1:6"))
    d = (sp.Integer(1), *sp.symbols("d1:5"))
    rules = {}
    for rank in range(1, 7):
        rules.update({
            rows["W"][rank]: at(a, rank),
            rows["P"][rank]: at(a, rank) + at(b, rank - 1),
            rows["V"][rank]: at(a, rank) + at(c, rank - 1),
            rows["E"][rank]: (
                at(a, rank) + at(b, rank - 1) + at(c, rank - 1)
                + epsilon * at(d, rank - 2)
            ),
        })
    variables = tuple((*a[1:], *b[1:], *c[1:], *(d[1:] if epsilon else ())))
    transformed = []
    seen = set()
    for label, candidate in ambient:
        value = sp.expand(candidate.subs(rules))
        if value == 0:
            continue
        key = tuple(sp.Poly(value, *variables).terms())
        if key in seen:
            continue
        seen.add(key)
        transformed.append((label, value))
    if epsilon == 1:
        value = sp.expand(global_forms["M5_C"].subs(rules))
        key = tuple(sp.Poly(value, *variables).terms())
        if key not in seen:
            transformed.append(("M5_T_connected_nonadjacent", value))
    return rules, variables, transformed


def cone_row(target_form, variables, basis):
    target_polynomial = sp.Poly(sp.expand(target_form), *variables)
    if all(value >= 0 for value in target_polynomial.coeffs()):
        stream = "".join(
            f"{powers}:{value};" for powers, value in target_polynomial.terms()
        )
        return {
            "floating_feasible": True,
            "exact_rational_certificate": True,
            "basis_weights": {},
            "target_basis_size": len(basis),
            "residual_nonnegative_monomials": len(target_polynomial.terms()),
            "minimum_residual_scalar": str(min(target_polynomial.coeffs())),
            "residual_stream_sha256": hashlib.sha256(stream.encode()).hexdigest().upper(),
        }
    monomial_set = set(target_polynomial.monoms())
    for _label, candidate in basis:
        monomial_set.update(sp.Poly(candidate, *variables).monoms())
    monomials = sorted(monomial_set, reverse=True)
    target = vector(target_form, variables, monomials)
    basis_vectors = [
        vector(candidate, variables, monomials)
        for _label, candidate in basis
    ]
    matrix = np.array([
        [float(candidate[row]) for candidate in basis_vectors]
        for row in range(len(monomials))
    ])
    solution = linprog(
        c=np.zeros(len(basis)),
        A_ub=matrix,
        b_ub=np.array([float(value) for value in target]),
        bounds=[(0, None)] * len(basis),
        method="highs",
        options={
            "dual_feasibility_tolerance": 1e-9,
            "primal_feasibility_tolerance": 1e-9,
        },
    )
    result = {
        "floating_feasible": bool(solution.success),
        "exact_rational_certificate": False,
        "target_basis_size": len(basis),
    }
    if not solution.success:
        return result
    weights = rationalize(solution.x)
    residual = sp.expand(target_form - sum(
        weight * candidate
        for weight, (_label, candidate) in zip(weights, basis)
    ))
    residual_polynomial = sp.Poly(residual, *variables)
    if not (
        all(weight >= 0 for weight in weights)
        and all(value >= 0 for value in residual_polynomial.coeffs())
    ):
        return result
    stream = "".join(
        f"{powers}:{value};" for powers, value in residual_polynomial.terms()
    )
    result.update({
        "exact_rational_certificate": True,
        "basis_weights": {
            label: str(weight)
            for weight, (label, _candidate) in zip(weights, basis)
            if weight != 0
        },
        "residual_nonnegative_monomials": len(residual_polynomial.terms()),
        "minimum_residual_scalar": str(min(residual_polynomial.coeffs())),
        "residual_stream_sha256": hashlib.sha256(stream.encode()).hexdigest().upper(),
    })
    return result


def main() -> None:
    expression, rows = ordinary_expression()
    targets, degrees = target_forms(expression, rows)
    ambient, global_forms = ambient_parent_basis(rows)
    faces = []
    for epsilon in (0, 1):
        rules, variables, basis = transformed_basis(
            rows, epsilon, ambient, global_forms
        )
        results = []
        for (ell, k_index), form in sorted(targets.items()):
            result = cone_row(sp.expand(form.subs(rules)), variables, basis)
            results.append({"ell": ell, "k_index": k_index, **result})
        faces.append({
            "epsilon": epsilon,
            "geometry": "adjacent" if epsilon == 0 else "nonadjacent",
            "basis_size_after_partition": len(basis),
            "exact_decompositions": sum(
                row["exact_rational_certificate"] for row in results
            ),
            "unresolved_forms": sum(
                not row["exact_rational_certificate"] for row in results
            ),
            "forms": results,
        })
    report = {
        "marker": MARKER,
        "lengths": list(LENGTHS),
        "degree_k_by_length": {str(key): value for key, value in degrees.items()},
        "ambient_basis_size": len(ambient),
        "faces": faces,
        "status": "exact cone probe; only rationally replayed rows are certified",
        "scope": (
            "Internal-spine ordinary-parent g1, ell=1..7, integer k>=0.  "
            "Unresolved rows, the whole mode, other modes, and Erdos Problem "
            "993 remain separate."
        ),
        "source_sha256": hashlib.sha256(Path(__file__).read_bytes()).hexdigest().upper(),
    }
    raw = json.dumps(report, indent=2, sort_keys=True) + "\n"
    OUTPUT.write_text(raw, encoding="utf-8", newline="\n")
    print(json.dumps({
        "marker": MARKER,
        "ambient_basis_size": len(ambient),
        "faces": [
            {
                "epsilon": face["epsilon"],
                "basis_size_after_partition": face["basis_size_after_partition"],
                "exact_decompositions": face["exact_decompositions"],
                "unresolved": [
                    [row["ell"], row["k_index"]]
                    for row in face["forms"]
                    if not row["exact_rational_certificate"]
                ],
            }
            for face in faces
        ],
        "scope": report["scope"],
    }, indent=2, sort_keys=True))
    print("REPORT_SHA256", hashlib.sha256(raw.encode()).hexdigest().upper())
    print(MARKER)


if __name__ == "__main__":
    main()
