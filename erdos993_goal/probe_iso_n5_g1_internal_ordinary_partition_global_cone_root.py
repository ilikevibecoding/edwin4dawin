#!/usr/bin/env python3
"""Exact partition-coordinate cone for large internal-ordinary g1.

The parent four-row tuple is written in nonnegative mark-inclusion blocks

    W=A, P=A+xB, V=A+xC,
    E=A+xB+xC+epsilon*x^2D.

After this exact substitution, every nonnegative scalar monomial in the
coefficients of A,B,C,D is a valid residual.  The probe tests the 28
large-broom Newton cells on the adjacent (epsilon=0) and nonadjacent
(epsilon=1) faces against universal S, C5, N4 and single-row forest
reserves, plus the two rooted interval families at p before/after deleting
v.  Exact rational residuals are certificates; unresolved cells are not.
"""

from __future__ import annotations

from fractions import Fraction
import hashlib
import json
from pathlib import Path

import numpy as np
import sympy as sp
from scipy import sparse
from scipy.optimize import linprog

from derive_iso_n5_g1_internal_endpoint_broom_parameters_root import (
    isolate_times_path,
    path_coefficient,
    tensor_binomial,
)
from derive_iso_n5_g1_internal_endpoint_broom_factor_root import convolve
from derive_iso_n5_g1_internal_ordinary_broom_factor_root import ordinary_expression
from probe_iso_n5_g1_internal_endpoint_boundary_global_payment_root import compact_forms
from prove_iso_n5_disconnected_m5_middle_interval_g1_nonadjacent import (
    H,
    P as ROOTED_P,
    interval_cells,
    unique_expressions,
)


HERE = Path(__file__).resolve().parent
OUTPUT = HERE / "iso_n5_g1_internal_ordinary_partition_global_cone_probe_root_20260830.json"
MARKER = "PROBE_EXACT_ISO_N5_G1_INTERNAL_ORDINARY_PARTITION_GLOBAL_CONE_ROOT"


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


def main() -> None:
    expression, rows = ordinary_expression()
    h, k = sp.symbols("h k", integer=True, nonnegative=True)
    ell = 8 + h
    child_rules = {}
    for rank in range(1, 7):
        u_value = isolate_times_path(k, ell - 1, rank)
        x_value = sp.expand(u_value + path_coefficient(ell - 2, rank - 1))
        z_value = isolate_times_path(k, ell - 2, rank)
        y_value = sp.expand(z_value + path_coefficient(ell - 3, rank - 1))
        child_rules.update({
            rows["X"][rank]: x_value,
            rows["U"][rank]: u_value,
            rows["Y"][rank]: y_value,
            rows["Z"][rank]: z_value,
        })
    reduced = sp.expand(expression.subs(child_rules))
    degrees, coefficients = tensor_binomial(reduced, (h, k))
    assert degrees == (6, 6)

    e, p, v, w = tuple(
        (sp.Integer(1), *rows[name][1:7]) for name in ("E", "P", "V", "W")
    )
    parent_rows = (e, p, v, w)

    # Whole-forest payments coupled across all Newton cells.  The four
    # endpoint-deletion states and the actual bridged forest all retain the
    # two marks in the internal-ordinary sector, so universal S, C5 and N4
    # are valid nonnegative functions on every one of them.
    xrow, urow, yrow, zrow = tuple(
        (sp.Integer(1), *rows[name][1:7]) for name in ("X", "U", "Y", "Z")
    )

    def row_difference(full, deleted):
        return tuple(sp.expand(left - right) for left, right in zip(full, deleted))

    def bridge_row(child_full, child_deleted, parent_full, parent_deleted):
        product = convolve(child_full, parent_full)
        forbidden = convolve(
            row_difference(child_full, child_deleted),
            row_difference(parent_full, parent_deleted),
        )
        return tuple(
            sp.expand(value - removed)
            for value, removed in zip(product, forbidden)
        )

    composite_states = {
        "bridge_G": (
            bridge_row(xrow, yrow, e, p),
            bridge_row(urow, zrow, e, p),
            bridge_row(xrow, yrow, v, w),
            bridge_row(urow, zrow, v, w),
        ),
        "00_C": (
            convolve(xrow, e), convolve(urow, e),
            convolve(xrow, v), convolve(urow, v),
        ),
        "10_delete_a": (
            convolve(yrow, e), convolve(zrow, e),
            convolve(yrow, v), convolve(zrow, v),
        ),
        "01_delete_p": (
            convolve(xrow, p), convolve(urow, p),
            convolve(xrow, w), convolve(urow, w),
        ),
        "11_D": (
            convolve(yrow, p), convolve(zrow, p),
            convolve(yrow, w), convolve(zrow, w),
        ),
    }
    composite_payment_coefficients = {}
    for state_name, state_rows in composite_states.items():
        forms = compact_forms(state_rows)
        for form_name in ("S_C", "C5_C", "N4_C"):
            label = f"{form_name.replace('_C', '')}_{state_name}"
            _payment_degrees, payment_coefficients = tensor_binomial(
                sp.expand(forms[form_name].subs(child_rules)), (h, k)
            )
            assert all(degree <= 6 for degree in _payment_degrees)
            composite_payment_coefficients[label] = payment_coefficients

    ambient_basis = []
    global_forms = compact_forms(parent_rows)
    for name in ("S_C", "C5_C", "N4_C"):
        ambient_basis.append((name.replace("_C", "_T"), global_forms[name]))
    for name, row in zip(("E", "P", "V", "W"), parent_rows):
        ambient_basis.extend([
            (f"HC_{name}", row[3] ** 2 - row[1] * row[5]),
            (f"Q3_{name}", 6 * row[3] ** 2 - row[2] * row[3] - 8 * row[2] * row[4]),
            (f"two_step_{name}", 2 * row[2] * row[3] - row[1] * row[3] - 4 * row[1] * row[4]),
            (f"rank2_companion_{name}", 2 * row[2] ** 2 - 3 * row[1] * row[3] - 2 * row[2]),
        ])

    def isolate_extend(row, amount, maximum=6):
        return tuple(sp.expand(sum(
            sp.binomial(amount, added) * at(row, rank - added)
            for added in range(rank + 1)
        )) for rank in range(maximum + 1))

    for amount in range(1, 17):
        extended_rows = tuple(isolate_extend(row, amount) for row in parent_rows)
        extended_global = compact_forms(extended_rows)
        for name in ("S_C", "C5_C", "N4_C"):
            ambient_basis.append((
                f"{name.replace('_C', '_T')}_plus_{amount}_isolates",
                extended_global[name],
            ))
        for name, row in zip(("E", "P", "V", "W"), extended_rows):
            ambient_basis.extend([
                (f"HC_{name}_plus_{amount}_isolates", row[3] ** 2 - row[1] * row[5]),
                (f"Q3_{name}_plus_{amount}_isolates", 6 * row[3] ** 2 - row[2] * row[3] - 8 * row[2] * row[4]),
                (f"two_step_{name}_plus_{amount}_isolates", 2 * row[2] * row[3] - row[1] * row[3] - 4 * row[1] * row[4]),
                (f"rank2_companion_{name}_plus_{amount}_isolates", 2 * row[2] ** 2 - 3 * row[1] * row[3] - 2 * row[2]),
            ])

    rooted_intervals = unique_expressions(interval_cells(ROOTED_P, H))[1:]

    def add_composite_global_intervals(pair_name, deleted_row, full_row):
        qrow = (sp.Integer(1),) + tuple(
            sp.expand(full_row[index + 1] - deleted_row[index + 1])
            for index in range(5)
        )
        mapping = {
            ROOTED_P[0]: 1,
            H[0]: 1,
            **{ROOTED_P[index]: deleted_row[index] for index in range(1, 7)},
            **{H[index]: qrow[index] for index in range(1, 6)},
        }
        for label, interval in enumerate(rooted_intervals, 2):
            payment = sp.expand(interval.subs(mapping))
            payment_degrees, payment_coefficients = tensor_binomial(
                sp.expand(payment.subs(child_rules)), (h, k)
            )
            assert all(degree <= 6 for degree in payment_degrees)
            composite_payment_coefficients[
                f"{pair_name}_interval_sum_{label}"
            ] = payment_coefficients

    # Delete the child attachment endpoint a in each of the four marked-row
    # states.  These are four genuine rooted-forest deletion pairs and hence
    # inherit all sixteen pinned componentwise interval inequalities.
    for row_name, row_index in zip(("E", "U", "V", "W"), range(4)):
        add_composite_global_intervals(
            f"delete_a_C_{row_name}",
            composite_states["10_delete_a"][row_index],
            composite_states["00_C"][row_index],
        )
        add_composite_global_intervals(
            f"delete_p_C_{row_name}",
            composite_states["01_delete_p"][row_index],
            composite_states["00_C"][row_index],
        )

    def add_rooted_intervals(pair_name, full_row, upper_row):
        qrow = (sp.Integer(1),) + tuple(
            sp.expand(upper_row[index + 1] - full_row[index + 1])
            for index in range(5)
        )
        def add_isolates(row, amount, maximum):
            return tuple(sp.expand(sum(
                sp.binomial(amount, added) * at(row, rank - added)
                for added in range(rank + 1)
            )) for rank in range(maximum + 1))

        for amount in range(9):
            full_extended = add_isolates(full_row, amount, 6)
            q_extended = add_isolates(qrow, amount, 5)
            suffix = "" if amount == 0 else f"_plus_{amount}_isolates"
            mapping = {
                ROOTED_P[0]: 1,
                H[0]: 1,
                **{ROOTED_P[index]: full_extended[index] for index in range(1, 7)},
                **{H[index]: q_extended[index] for index in range(1, 6)},
            }
            for label, interval in enumerate(rooted_intervals, 2):
                ambient_basis.append((
                    f"{pair_name}_interval_sum_{label}{suffix}",
                    sp.expand(interval.subs(mapping)),
                ))
        for name, row in ((f"{pair_name}_Q", qrow),):
            ambient_basis.extend([
                (f"HC_{name}", row[3] ** 2 - row[1] * row[5]),
                (f"Q3_{name}", 6 * row[3] ** 2 - row[2] * row[3] - 8 * row[2] * row[4]),
                (f"two_step_{name}", 2 * row[2] * row[3] - row[1] * row[3] - 4 * row[1] * row[4]),
                (f"rank2_companion_{name}", 2 * row[2] ** 2 - 3 * row[1] * row[3] - 2 * row[2]),
            ])

    add_rooted_intervals("P_Qp", p, e)
    add_rooted_intervals("W_Qpv", w, v)
    add_rooted_intervals("V_Qv", v, e)
    add_rooted_intervals("W_B", w, p)

    a = (sp.Integer(1), *sp.symbols("a1:7"))
    b = (sp.Integer(1), *sp.symbols("b1:6"))
    c = (sp.Integer(1), *sp.symbols("c1:6"))
    d = (sp.Integer(1), *sp.symbols("d1:5"))

    face_reports = []
    for epsilon in (0, 1):
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

        # Transform, discard zero generators, and merge exact duplicates.
        transformed_basis = []
        seen = set()
        for label, candidate in ambient_basis:
            transformed = sp.expand(candidate.subs(rules))
            if transformed == 0:
                continue
            polynomial = sp.Poly(transformed, *variables)
            key = tuple(polynomial.terms())
            if key in seen:
                continue
            seen.add(key)
            transformed_basis.append((label, transformed))

        if epsilon == 1:
            m5_transformed = sp.expand(global_forms["M5_C"].subs(rules))
            transformed_basis.append(("M5_T_connected_nonadjacent", m5_transformed))

        # Every partition variable is a nonnegative coefficient block.  Hence
        # a valid parent inequality remains valid after multiplication by any
        # monomial in those variables.  The earlier probe used scalar weights
        # only, although the target has degree four.  For each target we add
        # precisely the monomial multiples that can pay one of its negative
        # coefficients, capped at the target degree.  This is an exact finite
        # closure: a multiplier is proposed only by exponentwise division of
        # a negative target monomial by a negative generator monomial.
        enable_target_monomial_multiples = False
        prepared_basis = []
        for label, candidate in transformed_basis:
            polynomial = sp.Poly(candidate, *variables)
            terms = tuple(polynomial.terms())
            prepared_basis.append((
                label,
                candidate,
                tuple(
                    powers for powers, value in terms if value < 0
                ) if enable_target_monomial_multiples else (),
                max(sum(powers) for powers, _value in terms),
            ))

        results = []
        hybrid_cells = []
        for index, form in sorted(coefficients.items()):
            if form == 0:
                continue
            target_form = sp.expand(form.subs(rules))
            target_polynomial = sp.Poly(target_form, *variables)
            target_terms = tuple(target_polynomial.terms())
            target_negative = tuple(
                powers for powers, value in target_terms if value < 0
            )
            target_degree = max(sum(powers) for powers, _value in target_terms)

            target_basis = [(label, candidate) for label, candidate, _negative, _degree in prepared_basis]
            seen_target = {
                tuple(sp.Poly(candidate, *variables).terms())
                for _label, candidate in target_basis
            }
            for label, candidate, negative_terms, candidate_degree in prepared_basis:
                multiplier_powers = set()
                for target_powers in target_negative:
                    for generator_powers in negative_terms:
                        if all(
                            target_power >= generator_power
                            for target_power, generator_power
                            in zip(target_powers, generator_powers)
                        ):
                            difference = tuple(
                                target_power - generator_power
                                for target_power, generator_power
                                in zip(target_powers, generator_powers)
                            )
                            # Permit degree-one/two multipliers even when a
                            # generator has higher-degree terms than the
                            # target.  Other valid generators may cancel that
                            # auxiliary leading slice; the LP records every
                            # such term and the final rational residual check
                            # still requires coefficientwise nonnegativity.
                            if (
                                0 < sum(difference) <= 2
                                and candidate_degree + sum(difference)
                                <= target_degree + 2
                            ):
                                multiplier_powers.add(difference)
                for powers in sorted(multiplier_powers, reverse=True):
                    multiplier = sp.prod(
                        variable ** power
                        for variable, power in zip(variables, powers)
                        if power
                    )
                    product = sp.expand(multiplier * candidate)
                    key = tuple(sp.Poly(product, *variables).terms())
                    if key in seen_target:
                        continue
                    seen_target.add(key)
                    multiplier_label = "*".join(
                        f"{variable}^{power}" if power != 1 else str(variable)
                        for variable, power in zip(variables, powers) if power
                    )
                    target_basis.append((f"({multiplier_label})*{label}", product))

            monomial_set = set(sp.Poly(target_form, *variables).monoms())
            for _label, candidate in target_basis:
                monomial_set.update(sp.Poly(candidate, *variables).monoms())
            monomials = sorted(monomial_set, reverse=True)
            target_vector = vector(target_form, variables, monomials)
            basis_vectors = [
                vector(candidate, variables, monomials)
                for _label, candidate in target_basis
            ]
            matrix = np.array([
                [float(candidate[row]) for candidate in basis_vectors]
                for row in range(len(monomials))
            ])
            target = np.array([float(value) for value in target_vector])
            solution = linprog(
                c=np.zeros(len(target_basis)),
                A_ub=matrix,
                b_ub=target,
                bounds=[(0, None)] * len(target_basis),
                method="highs",
                options={
                    "dual_feasibility_tolerance": 1e-9,
                    "primal_feasibility_tolerance": 1e-9,
                },
            )
            result = {
                "h_index": index[0],
                "k_index": index[1],
                "target_basis_size": len(target_basis),
                "floating_feasible": bool(solution.success),
                "exact_rational_certificate": False,
            }
            if solution.success:
                weights = rationalize(solution.x)
                residual = sp.expand(target_form - sum(
                    weight * candidate
                    for weight, (_label, candidate) in zip(weights, target_basis)
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
                            for weight, (label, _candidate)
                            in zip(weights, target_basis) if weight != 0
                        },
                        "residual_nonnegative_monomials": len(residual_poly.terms()),
                        "minimum_residual_scalar": str(min(residual_poly.coeffs())),
                        "residual_stream_sha256": hashlib.sha256(stream.encode()).hexdigest().upper(),
                    })
            global_candidates = [
                (
                    name,
                    sp.expand(
                        payment_rows.get(index, sp.Integer(0)).subs(rules)
                    ),
                )
                for name, payment_rows
                in sorted(composite_payment_coefficients.items())
            ]
            hybrid_monomial_set = set(target_polynomial.monoms())
            for _label, candidate in transformed_basis:
                hybrid_monomial_set.update(
                    sp.Poly(candidate, *variables).monoms()
                )
            for _label, candidate in global_candidates:
                hybrid_monomial_set.update(
                    sp.Poly(candidate, *variables).monoms()
                )
            hybrid_monomials = sorted(hybrid_monomial_set, reverse=True)
            hybrid_cells.append({
                "index": index,
                "monomials": hybrid_monomials,
                "target": vector(target_form, variables, hybrid_monomials),
                "local": [
                    vector(candidate, variables, hybrid_monomials)
                    for _label, candidate in transformed_basis
                ],
                "global": {
                    name: vector(candidate, variables, hybrid_monomials)
                    for name, candidate in global_candidates
                },
            })
            results.append(result)

        global_names = sorted(composite_payment_coefficients)
        local_count = len(transformed_basis)
        global_count = len(global_names)
        total_columns = global_count + len(hybrid_cells) * local_count
        matrix_rows = []
        matrix_columns = []
        matrix_values = []
        hybrid_target = []
        row_offset = 0
        for cell_number, cell in enumerate(hybrid_cells):
            width = len(cell["monomials"])
            hybrid_target.extend(float(value) for value in cell["target"])
            for global_column, name in enumerate(global_names):
                for local_row, value in enumerate(cell["global"][name]):
                    if value:
                        matrix_rows.append(row_offset + local_row)
                        matrix_columns.append(global_column)
                        matrix_values.append(float(value))
            column_offset = global_count + cell_number * local_count
            for local_column, candidate_vector in enumerate(cell["local"]):
                for local_row, value in enumerate(candidate_vector):
                    if value:
                        matrix_rows.append(row_offset + local_row)
                        matrix_columns.append(column_offset + local_column)
                        matrix_values.append(float(value))
            row_offset += width

        hybrid_matrix = sparse.coo_matrix(
            (matrix_values, (matrix_rows, matrix_columns)),
            shape=(row_offset, total_columns),
        ).tocsc()
        hybrid_solution = linprog(
            c=np.zeros(total_columns),
            A_ub=hybrid_matrix,
            b_ub=np.array(hybrid_target),
            bounds=[(0, None)] * total_columns,
            method="highs",
            options={
                "dual_feasibility_tolerance": 1e-9,
                "primal_feasibility_tolerance": 1e-9,
            },
        )
        hybrid_report = {
            "floating_feasible": bool(hybrid_solution.success),
            "exact_rational_certificate": False,
            "coefficient_rows": row_offset,
            "global_columns": global_count,
            "local_columns_per_cell": local_count,
            "total_columns": total_columns,
            "matrix_nonzeros": len(matrix_values),
        }
        if hybrid_solution.success:
            hybrid_weights = rationalize(hybrid_solution.x)
            global_weights = hybrid_weights[:global_count]
            exact_residual = []
            for cell_number, cell in enumerate(hybrid_cells):
                local_start = global_count + cell_number * local_count
                local_weights = hybrid_weights[
                    local_start:local_start + local_count
                ]
                for row_number, target_value in enumerate(cell["target"]):
                    value = target_value
                    value -= sum(
                        weight * cell["global"][name][row_number]
                        for weight, name in zip(global_weights, global_names)
                    )
                    value -= sum(
                        weight * candidate[row_number]
                        for weight, candidate in zip(local_weights, cell["local"])
                    )
                    exact_residual.append(value)
            if all(weight >= 0 for weight in hybrid_weights) and all(
                value >= 0 for value in exact_residual
            ):
                stream = "".join(
                    f"{index}:{value};"
                    for index, value in enumerate(exact_residual) if value
                )
                hybrid_report.update({
                    "exact_rational_certificate": True,
                    "global_weights": {
                        name: str(weight)
                        for name, weight in zip(global_names, global_weights)
                        if weight
                    },
                    "nonzero_local_weights_by_cell": {
                        f"{cell['index'][0]},{cell['index'][1]}": sum(
                            weight != 0 for weight in hybrid_weights[
                                global_count + cell_number * local_count:
                                global_count + (cell_number + 1) * local_count
                            ]
                        )
                        for cell_number, cell in enumerate(hybrid_cells)
                    },
                    "nonzero_residual_coefficients": sum(
                        value != 0 for value in exact_residual
                    ),
                    "minimum_residual_coefficient": str(min(exact_residual)),
                    "residual_stream_sha256": hashlib.sha256(
                        stream.encode()
                    ).hexdigest().upper(),
                })

        exact = sum(row["exact_rational_certificate"] for row in results)
        face_reports.append({
            "epsilon": epsilon,
            "geometry": "adjacent" if epsilon == 0 else "nonadjacent",
            "basis_size_after_partition": len(transformed_basis),
            "exact_decompositions": exact,
            "unresolved_forms": len(results) - exact,
            "coupled_global_local_cone": hybrid_report,
            "forms": results,
        })

    report = {
        "marker": MARKER,
        "degrees_h_k": list(degrees),
        "ambient_basis_size": len(ambient_basis),
        "faces": face_reports,
        "scope": (
            "Exact partition-coordinate cone probe for ell>=8.  Verified rows "
            "are sign certificates; unresolved rows make no sign claim."
        ),
        "source_sha256": hashlib.sha256(Path(__file__).read_bytes()).hexdigest().upper(),
    }
    raw = json.dumps(report, indent=2, sort_keys=True) + "\n"
    OUTPUT.write_text(raw, encoding="utf-8", newline="\n")
    print(json.dumps({
        "marker": MARKER,
        "faces": [
            {
                "epsilon": face["epsilon"],
                "basis_size": face["basis_size_after_partition"],
                "exact_decompositions": face["exact_decompositions"],
                "unresolved_indices": [
                    [row["h_index"], row["k_index"]]
                    for row in face["forms"] if not row["exact_rational_certificate"]
                ],
            }
            for face in face_reports
        ],
    }, indent=2, sort_keys=True))
    print("REPORT_SHA256", hashlib.sha256(raw.encode()).hexdigest().upper())
    print(MARKER)


if __name__ == "__main__":
    main()
