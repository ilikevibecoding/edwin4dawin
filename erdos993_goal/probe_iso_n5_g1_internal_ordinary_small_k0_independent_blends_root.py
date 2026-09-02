#!/usr/bin/env python3
"""Search safe independent high-rank blends for literal short k=0 cells.

For every negative occurrence of a high independent-set coefficient, both the
edge-multiplicity upper bound and the two-term Bonferroni upper bound are
valid.  Earlier probes forced one global convex weight.  Here the convex
weight may be chosen independently by high coefficient (``GROUPING=variable``)
or by individual negative monomial (``GROUPING=term``).  This remains safe
because each negative summand is bounded separately.

The target is built from the literal truncated ``child_rows`` routine.  A row
counts only when rationalized weights reproduce nonnegative exact Bernstein
controls coefficient-by-coefficient.  Otherwise the output is diagnostic.
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
from scipy.sparse import coo_matrix, hstack

from derive_iso_n5_g1_internal_endpoint_broom_parameters_root import tensor_binomial
from derive_iso_n5_g1_internal_ordinary_broom_factor_root import ordinary_expression
from derive_iso_n5_g1_internal_ordinary_small_broom_parameters_root import child_rows
from probe_iso_n5_g1_internal_ordinary_low01_theta_interval_root import (
    tensor_bernstein_at_degrees,
)
from prove_iso_n5_g1_internal_ordinary_diagonal2_large_order_root import (
    at,
    bonferroni_upper,
    choose_polynomial,
    multiplicity_upper,
)


HERE = Path(__file__).resolve().parent
ELL = int(os.environ.get("ERDOS993_SMALL_K0_ELL", "1"))
EPSILON = int(os.environ.get("ERDOS993_SMALL_K0_EPSILON", "0"))
GROUPING = os.environ.get("ERDOS993_SMALL_K0_GROUPING", "variable")
CUTOFF = int(os.environ.get("ERDOS993_SMALL_K0_CUTOFF", "10"))
assert ELL in (1, 2, 3, 4, 5, 6, 7)
assert EPSILON in (0, 1)
assert GROUPING in ("variable", "term")
OUTPUT = HERE / (
    f"iso_n5_g1_internal_ordinary_small_k0_ell{ELL}_eps{EPSILON}_"
    f"independent_{GROUPING}_blends_probe_root_20260830.json"
)
MARKER = (
    f"PROBE_EXACT_ISO_N5_G1_INTERNAL_ORDINARY_SMALL_K0_ELL{ELL}_EPS{EPSILON}_"
    f"INDEPENDENT_{GROUPING.upper()}_BLENDS_ROOT"
)


def rationalize(value):
    return sp.Rational(Fraction(float(value)).limit_denominator(1_000_000))


def coefficient_vector(controls, t, maximum_degree):
    result = np.empty(controls.size * (maximum_degree + 1), dtype=float)
    cursor = 0
    for value in controls.flat:
        polynomial = sp.Poly(value, t)
        for power in range(maximum_degree + 1):
            result[cursor] = float(polynomial.coeff_monomial(t**power))
            cursor += 1
    assert cursor == len(result)
    return result


def main() -> None:
    expression, rows = ordinary_expression()
    k = sp.symbols("k", integer=True, nonnegative=True)
    xrow, urow, yrow, zrow = child_rows(ELL, k)
    child_rules = {}
    for rank in range(1, 7):
        child_rules.update({
            rows["X"][rank]: xrow[rank], rows["U"][rank]: urow[rank],
            rows["Y"][rank]: yrow[rank], rows["Z"][rank]: zrow[rank],
        })
    degrees, cells = tensor_binomial(sp.expand(expression.subs(child_rules)), (k,))
    assert degrees == (6,)
    target = cells[(0,)]

    a = (sp.Integer(1), *sp.symbols("a1:7"))
    b = (sp.Integer(1), *sp.symbols("b1:6"))
    c = (sp.Integer(1), *sp.symbols("c1:6"))
    d = (sp.Integer(1), *sp.symbols("d1:5"))
    partition_rules = {}
    for rank in range(1, 7):
        partition_rules.update({
            rows["W"][rank]: at(a, rank),
            rows["P"][rank]: at(a, rank) + at(b, rank - 1),
            rows["V"][rank]: at(a, rank) + at(c, rank - 1),
            rows["E"][rank]: (
                at(a, rank) + at(b, rank - 1) + at(c, rank - 1)
                + EPSILON * at(d, rank - 2)
            ),
        })

    n, nb, nc, nd = sp.symbols("n nb nc nd", nonnegative=True)
    ea, qa, eb, ec, ed = sp.symbols("ea qa eb ec ed", nonnegative=True)
    low_rules = {
        a[1]: n,
        a[2]: n * (n - 1) / 2 - ea,
        a[3]: n * (n - 1) * (n - 2) / 6 - (n - 2) * ea + qa,
        b[1]: nb,
        b[2]: nb * (nb - 1) / 2 - eb,
        c[1]: nc,
        c[2]: nc * (nc - 1) / 2 - ec,
        d[1]: nd,
        d[2]: nd * (nd - 1) / 2 - ed,
    }
    edge_by_row = {a: ea, b: eb, c: ec, d: ed}
    remaining = {}
    for row, order, start in ((a, n, 4), (b, nb, 3), (c, nc, 3), (d, nd, 3)):
        for rank in range(start, len(row)):
            remaining[row[rank]] = (order, edge_by_row[row], rank)
    remaining_variables = tuple(remaining)
    base_variables = (n, nb, nc, nd, ea, qa, eb, ec, ed)
    variables = (*base_variables, *remaining_variables)
    exact = sp.Poly(
        sp.expand(target.subs(partition_rules).subs(low_rules)), *variables
    )

    baseline = sp.Integer(0)
    deltas = {}
    negative_terms = []
    positive_high = 0
    for term_index, (powers, coefficient) in enumerate(exact.terms()):
        high_powers = powers[len(base_variables):]
        assert sum(high_powers) <= 1
        common = coefficient
        for variable, power in zip(base_variables, powers[:len(base_variables)]):
            common *= variable**power
        if not any(high_powers):
            baseline += common
            continue
        variable = remaining_variables[high_powers.index(1)]
        order, edges, rank = remaining[variable]
        if coefficient > 0:
            positive_high += 1
            lower = sp.expand(
                choose_polynomial(order, rank)
                - edges * choose_polynomial(order - 2, rank - 2)
            )
            baseline += common * lower
            continue
        wedges = qa if order == n else edges * (edges - 1) / 2
        bound_zero = bonferroni_upper(order, edges, wedges, rank)
        bound_one = multiplicity_upper(order, edges, rank)
        baseline += common * bound_zero
        key = str(variable) if GROUPING == "variable" else f"term_{term_index}_{variable}"
        deltas[key] = sp.expand(
            deltas.get(key, 0) + common * (bound_one - bound_zero)
        )
        negative_terms.append({
            "term_index": term_index,
            "high_variable": str(variable),
            "group": key,
        })

    x, y, z, u, v, s, w, r, t = sp.symbols(
        "x y z u v s w r t", nonnegative=True
    )
    normalization = {
        nb: n * x,
        nc: n * y,
        nd: n * z,
        ea: n * u,
        qa: n**2 * u**2 * v / 2,
        eb: n * x * s,
        ec: n * y * w,
        ed: n * z * r,
    }
    normalized_baseline = sp.expand(
        baseline.subs(normalization).subs(n, CUTOFF + t)
    )
    normalized_deltas = {
        key: sp.expand(value.subs(normalization).subs(n, CUTOFF + t))
        for key, value in deltas.items()
    }
    box = (x, y, u, v, s, w) if EPSILON == 0 else (x, y, z, u, v, s, w, r)
    expressions = [normalized_baseline, *normalized_deltas.values()]
    common_degrees = tuple(
        max(sp.Poly(value, *box).degree(variable) for value in expressions)
        for variable in box
    )
    maximum_t_degree = max(sp.Poly(value, t).degree() for value in expressions)
    baseline_controls = tensor_bernstein_at_degrees(
        normalized_baseline, box, common_degrees
    )
    base_vector = coefficient_vector(baseline_controls, t, maximum_t_degree)

    keys = tuple(normalized_deltas)
    row_parts = []
    column_parts = []
    data_parts = []
    for column, key in enumerate(keys):
        controls = tensor_bernstein_at_degrees(
            normalized_deltas[key], box, common_degrees
        )
        vector = coefficient_vector(controls, t, maximum_t_degree)
        nonzero = np.flatnonzero(vector)
        row_parts.extend(nonzero.tolist())
        column_parts.extend([column] * len(nonzero))
        data_parts.extend(vector[nonzero].tolist())
    delta_matrix = coo_matrix(
        (data_parts, (row_parts, column_parts)),
        shape=(len(base_vector), len(keys)),
    ).tocsr()
    eta_column = coo_matrix(np.ones((len(base_vector), 1)))
    aub = hstack((-delta_matrix, eta_column), format="csr")
    objective = np.zeros(len(keys) + 1)
    objective[-1] = -1.0
    solution = linprog(
        c=objective,
        A_ub=aub,
        b_ub=base_vector,
        bounds=[(0, 1)] * len(keys) + [(None, None)],
        method="highs",
        options={
            "dual_feasibility_tolerance": 1e-9,
            "primal_feasibility_tolerance": 1e-9,
        },
    )

    record = {
        "marker": MARKER,
        "ell": ELL,
        "epsilon": EPSILON,
        "geometry": "adjacent" if EPSILON == 0 else "nonadjacent",
        "grouping": GROUPING,
        "cutoff": CUTOFF,
        "literal_child_rows": {
            "X": [str(value.subs(k, 0)) for value in xrow],
            "U": [str(value.subs(k, 0)) for value in urow],
            "Y": [str(value.subs(k, 0)) for value in yrow],
            "Z": [str(value.subs(k, 0)) for value in zrow],
        },
        "positive_high_monomials": positive_high,
        "negative_high_monomials": len(negative_terms),
        "blend_variables": len(keys),
        "bernstein_degrees": list(common_degrees),
        "bernstein_controls": int(baseline_controls.size),
        "t_degree": maximum_t_degree,
        "coefficient_inequalities": len(base_vector),
        "floating_success": bool(solution.success),
        "floating_status": solution.message,
        "exact_rational_certificate": False,
    }
    if solution.success:
        record["floating_maximum_minimum_coefficient"] = format(float(solution.x[-1]), ".17g")
        weights = {
            key: rationalize(value) for key, value in zip(keys, solution.x[:-1])
        }
        combined = sp.expand(
            normalized_baseline
            + sum(weights[key] * normalized_deltas[key] for key in keys)
        )
        exact_controls = tensor_bernstein_at_degrees(combined, box, common_degrees)
        exact_coefficients = [
            coefficient
            for value in exact_controls.flat
            for coefficient in sp.Poly(value, t).all_coeffs()
        ]
        negatives = [value for value in exact_coefficients if value < 0]
        if not negatives:
            positive = [value for value in exact_coefficients if value > 0]
            stream = "".join(
                f"{position}:{sp.sstr(value)};"
                for position, value in enumerate(exact_controls.flat)
            )
            record.update({
                "exact_rational_certificate": True,
                "weights": {key: str(value) for key, value in weights.items()},
                "minimum_exact_power_coefficient": str(min(exact_coefficients)),
                "minimum_positive_exact_power_coefficient": str(min(positive)),
                "exact_power_coefficients": len(exact_coefficients),
                "bernstein_stream_sha256": hashlib.sha256(stream.encode()).hexdigest().upper(),
            })
        else:
            record.update({
                "rationalized_negative_coefficients": len(negatives),
                "rationalized_minimum_coefficient": str(min(negatives)),
            })

    record["status"] = (
        "exact rational independent-blend discovery certificate; theorem wrapper required"
        if record["exact_rational_certificate"] else
        "diagnostic independent-blend search; no sign theorem asserted"
    )
    record["source_sha256"] = hashlib.sha256(Path(__file__).read_bytes()).hexdigest().upper()
    raw = json.dumps(record, indent=2, sort_keys=True) + "\n"
    OUTPUT.write_text(raw, encoding="utf-8", newline="\n")
    print(json.dumps(record, indent=2, sort_keys=True))
    print("REPORT_SHA256", hashlib.sha256(raw.encode()).hexdigest().upper())
    print(MARKER)


if __name__ == "__main__":
    main()
