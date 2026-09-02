#!/usr/bin/env python3
"""Exact N<=13 finite cone probe for the isolated-mark common-forest slice."""

from __future__ import annotations

import hashlib

import sympy as sp

from probe_iso_leaf_cross_remainder_root import poly_forest
from probe_iso_n6_bundle_g1_singleton_ordinary_leaf_isolated_mark_common_forest_rank4_ratio_g1_nonadjacent import (
    common_expression,
)
from prove_iso_n5_c5_disconnected_nonadjacent_g1_nonadjacent import forest_graphs


KNOWN_FOREST_COUNTS = {
    0: 1, 1: 1, 2: 2, 3: 3, 4: 6, 5: 10, 6: 20,
    7: 37, 8: 76, 9: 153, 10: 329, 11: 710, 12: 1601, 13: 3658,
}
EXPECTED = {
    "collision": {
        "minimum": 0,
        "stream_sha256": "E50853546A694BA3EC28311F8C8BB2B2EBF942625807BEFA4BFCA680D9866FF8",
    },
    "distinct": {
        "minimum": 11970000000,
        "stream_sha256": "321BDF81EFA192AA29892B1F264744DFCB66410DCE8E3331090AC8ECAA42C2AC",
    },
}


def bernstein_rows(expression, variable, parameter):
    polynomial = sp.Poly(expression, variable)
    degree = polynomial.degree()
    power = [polynomial.coeff_monomial(variable ** rank) for rank in range(degree + 1)]
    bernstein = [
        sp.expand(sum(
            sp.binomial(index, rank) / sp.binomial(degree, rank) * power[rank]
            for rank in range(index + 1)
        ))
        for index in range(degree + 1)
    ]
    reconstructed = sp.expand(sum(
        bernstein[index] * sp.binomial(degree, index)
        * variable ** index * (1 - variable) ** (degree - index)
        for index in range(degree + 1)
    ))
    assert sp.expand(reconstructed - expression) == 0
    rows = []
    origins = []
    for index, value in enumerate(bernstein):
        in_parameter = sp.Poly(value, parameter)
        for power_value in range(in_parameter.degree() + 1):
            rows.append(in_parameter.coeff_monomial(parameter ** power_value))
            origins.append((index, power_value))
    return degree, rows, origins


def finite_certificate(mode, verbose=False):
    n = sp.Symbol("n", integer=True, positive=True)
    N, h, t = sp.symbols("N h t", integer=True, nonnegative=True)
    tau = sp.Symbol("tau", nonnegative=True)
    k = (sp.Integer(1), N, *sp.symbols(
        "k2:8", integer=True, nonnegative=True
    ))
    variables = (N, *k[2:])

    mark_count = 3 if mode == "collision" else 4
    expression = common_expression(mode, n, N, h, t, k)
    bounded = sp.expand(expression.subs(
        t, sp.Rational(11, 10) * (N + h + mark_count) * tau
    ))
    degree, rows, origins = bernstein_rows(bounded, tau, h)
    denominators = [
        sp.denom(coefficient)
        for row in rows
        for coefficient in sp.Poly(row, *variables).coeffs()
    ]
    scale = sp.ilcm(*denominators)
    scaled_rows = [sp.expand(scale * row) for row in rows]
    evaluate = sp.lambdify(variables, scaled_rows, modules="math", cse=True)
    stream = hashlib.sha256()
    total_forests = total_checks = 0
    minimum = None
    witness = None
    order_report = {}
    for order in range(14):
        forest_count = 0
        order_minimum = None
        for forest_index, graph in enumerate(forest_graphs(order)):
            forest_count += 1
            independence = poly_forest(graph)
            arguments = (
                order,
                *(independence[rank] if rank < len(independence) else 0
                  for rank in range(2, 8)),
            )
            values = tuple(int(value) for value in evaluate(*arguments))
            stream.update((",".join(map(str, values)) + "\n").encode())
            local = min(values)
            if local < 0:
                bad = values.index(local)
                raise AssertionError((
                    "negative finite isolated-mark row", mode, order,
                    forest_index, origins[bad], local,
                ))
            if order_minimum is None or local < order_minimum:
                order_minimum = local
            if minimum is None or local < minimum:
                minimum = local
                witness = (order, forest_index, origins[values.index(local)])
            total_checks += len(values)
        assert forest_count == KNOWN_FOREST_COUNTS[order]
        total_forests += forest_count
        order_report[str(order)] = {
            "forests": forest_count,
            "minimum_scaled_row": order_minimum,
        }
        if verbose:
            print("MODE", mode, "ORDER", order, "FORESTS", forest_count, "MINIMUM", order_minimum)
    digest = stream.hexdigest().upper()
    expected = EXPECTED[mode]
    assert total_forests == 6607
    assert total_checks == 422848
    assert degree == 7 and len(rows) == 64 and scale == 75600000000
    assert minimum == expected["minimum"]
    assert digest == expected["stream_sha256"]
    return {
        "mode": mode,
        "core_orders_N": [0, 13],
        "tau_bernstein_degree": degree,
        "coefficient_rows": len(rows),
        "integer_scale": int(scale),
        "unlabeled_forests": total_forests,
        "scaled_row_checks": total_checks,
        "minimum_scaled_row": minimum,
        "minimum_witness": list(witness),
        "value_stream_sha256": digest,
        "orders": order_report,
    }


def main():
    for mode in ("collision", "distinct"):
        result = finite_certificate(mode, verbose=True)
        print(
            "MODE", mode,
            "TAU_BERNSTEIN_DEGREE", result["tau_bernstein_degree"],
            "COEFFICIENT_ROWS", result["coefficient_rows"],
            "SCALE", result["integer_scale"],
            "FORESTS", result["unlabeled_forests"],
            "CHECKS", result["scaled_row_checks"],
            "MINIMUM", result["minimum_scaled_row"],
            "WITNESS", result["minimum_witness"],
            "VALUE_STREAM_SHA256", result["value_stream_sha256"],
        )
    print("PROBE_ONLY_NO_ISOLATED_MARK_COMMON_FOREST_THEOREM")


if __name__ == "__main__":
    main()
