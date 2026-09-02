#!/usr/bin/env python3
"""Exact all-order certificate for rank-eight terminal Delta^8."""

from __future__ import annotations

import hashlib
import json
from pathlib import Path

import networkx as nx
import sympy as sp
from flint import fmpz_poly as Poly

from explore_rank4_three_halves_grouped import minimum_with_index, tensor_bernstein_fast
from scan_forest_iso_reserve_floor import tree_polynomial
from verify_rank8_q8_terminal_reduction import c, h, newton_coefficients, residual


def choose_poly(z: sp.Expr, k: int) -> sp.Expr:
    return sp.prod(z - j for j in range(k)) / sp.factorial(k)


def forest_polynomial(forest: nx.Graph) -> tuple[int, ...]:
    out = Poly([1])
    for vertices in nx.connected_components(forest):
        component = nx.convert_node_labels_to_integers(forest.subgraph(vertices).copy())
        out *= Poly(list(tree_polynomial(component)))
    return tuple(int(value) for value in out)


def main() -> None:
    coefficient = newton_coefficients(residual())[8]
    normalized = sp.factor(coefficient / (8 * c[7] * h[6]))
    n = sp.symbols("n", integer=True, positive=True)
    s, d = sp.symbols("s d", nonnegative=True)

    # Put h6=s*c6 and h7=d*c7.  The actual coefficient, not merely its
    # normalized bracket, is increasing in d.  At d=0 it is concave in s,
    # so its minimum on [0,1]^2 occurs at s=0 (value zero) or (s,d)=(1,0).
    rooted = sp.expand(
        coefficient.subs({h[6]: s * c[6], h[7]: d * c[7]}, simultaneous=True)
    )
    assert sp.factor(sp.diff(rooted, d)) == 256 * c[0] * c[6] * c[7] ** 2 * s
    assert sp.factor(sp.diff(rooted.subs(d, 0), s, 2)) == -16 * c[6] ** 2 * c[7] * (
        19 * c[0] + 18 * c[1]
    )
    assert rooted.subs(s, 0) == 0

    endpoint = sp.expand(
        normalized.subs(
            {
                c[0]: 1,
                c[1]: n,
                c[2]: choose_poly(n - 1, 2),
                h[6]: c[6],
                h[7]: 0,
            },
            simultaneous=True,
        )
    )

    # First use ordinary extension counting 8*c8<=(n-7)*c7.  Thereafter
    # the endpoint is decreasing in c7 and c6, so the proved Q6 and Q5
    # reserve endpoints apply.
    after8 = sp.expand(endpoint.subs(c[8], (n - 7) * c[7] / 8))
    assert sp.expand(sp.diff(after8, c[7]) + 280 * n + 1041) == 0
    q6_endpoint = (12 * c[6] ** 2 - c[5] * c[6]) / (14 * c[5])
    after7 = sp.factor(after8.subs(c[7], q6_endpoint))
    derivative6 = sp.factor(sp.diff(after7, c[6]))
    expected6 = -(
        1792 * c[5] * n**2
        + 21672 * c[5] * n
        + 67643 * c[5]
        + 6720 * c[6] * n
        + 24984 * c[6]
    ) / (14 * c[5])
    assert sp.expand(derivative6 - expected6) == 0
    q5_endpoint = (10 * c[5] ** 2 - c[4] * c[5]) / (12 * c[4])
    after6 = sp.factor(after7.subs(c[6], q5_endpoint))

    # The c5 derivative is decreasing in r=c5/c4.  The all-order selected-
    # degree theorem gives 5r=mu4>=n-12+8/n.  Combining that lower bound
    # with c3<=C(n,3) makes the derivative strictly negative for n>=12.
    derivative5 = sp.factor(sp.diff(after6, c[5]))
    r = sp.symbols("r", nonnegative=True)
    derivative5_numerator = sp.factor(84 * c[4] ** 2 * derivative5)
    in_r = sp.expand(derivative5_numerator.subs(c[5], r * c[4]) / c[4] ** 2)
    assert all(value < 0 for value in sp.Poly(sp.diff(in_r, r), r, n, c[3]).coeffs())
    r_lower = (n - 12 + sp.Rational(8, 1) / n) / 5
    derivative5_upper = sp.factor(
        in_r.subs({c[3]: choose_poly(n, 3), r: r_lower}, simultaneous=True)
    )
    expected_upper = -(
        4872 * n**5
        + 6750 * n**4
        + 84762 * n**3
        + 327123 * n**2
        - 42736 * n
        + 399744
    ) / n**2
    assert sp.expand(derivative5_upper - expected_upper) == 0
    shifted_upper = sp.Poly(
        sp.expand((-n**2 * expected_upper).subs(n, n + 12)), n
    )
    assert all(value > 0 for value in shifted_upper.all_coeffs())

    q4_endpoint = (8 * c[4] ** 2 - c[3] * c[4]) / (10 * c[3])
    final_endpoint = sp.factor(after6.subs(c[5], q4_endpoint))

    # Map the sharp tree (c2/c3,c3/c4) interval and n>=12 to a unit cube.
    T, W, A = sp.symbols("T W A", nonnegative=True)
    order = sp.Rational(12, 1) / T
    w_low = 3 / (order - 3)
    w_high = 3 * (order - 1) / ((order - 3) * (order - 4))
    w = sp.factor(w_low + (w_high - w_low) * W)
    x_low = 8 * w / (6 - w)
    x_high = 4 * w / (3 * (1 - w))
    x = sp.factor(x_low + (x_high - x_low) * A)
    c2 = choose_poly(order - 1, 2)
    rational = sp.together(
        final_endpoint.subs(
            {n: order, c[3]: c2 / w, c[4]: c2 / (w * x)},
            simultaneous=True,
        )
    )
    numerator, denominator = sp.fraction(rational)
    midpoint = {T: sp.Rational(1, 2), W: sp.Rational(1, 2), A: sp.Rational(1, 2)}
    if denominator.subs(midpoint) < 0:
        numerator, denominator = -numerator, -denominator
    assert denominator.subs(midpoint) > 0
    first_denominator_factor = 3 * T * W - 4 * T + 12
    second_denominator_factor = (
        15 * A * T**2 * W
        - 20 * A * T**2
        + 60 * A * T
        - 18 * T**2 * W
        + 48 * T**2
        - 240 * T
        + 288
    )
    expected_denominator = (
        280 * T**8 * first_denominator_factor**5 * second_denominator_factor**4
    )
    assert sp.expand(denominator - expected_denominator) == 0
    # On the actual domain 0<T<=1 and W,A in [0,1], the first factor is at
    # least 8.  The A coefficient in the second is at least 40*T, while its
    # A=0 part is at least 30*T^2-240*T+288>=78.
    assert sp.expand(first_denominator_factor - 8 - (4 * (1 - T) + 3 * T * W)) == 0
    a_coefficient = sp.factor(sp.diff(second_denominator_factor, A))
    assert sp.expand(a_coefficient - T * (15 * T * W - 20 * T + 60)) == 0
    assert sp.expand(
        second_denominator_factor.subs(A, 0)
        - (30 * T**2 - 240 * T + 288)
        - 18 * T**2 * (1 - W)
    ) == 0
    numerator_degrees, numerator_coefficients = tensor_bernstein_fast(
        sp.expand(numerator), (T, W, A)
    )
    denominator_degrees, denominator_coefficients = tensor_bernstein_fast(
        sp.expand(denominator), (T, W, A)
    )
    numerator_minimum, numerator_index = minimum_with_index(numerator_coefficients)
    denominator_minimum, denominator_index = minimum_with_index(denominator_coefficients)
    assert numerator_minimum >= 0 and denominator_minimum >= 0

    # Exact finite complement: every free tree and every root through order
    # 11.  Only nonzero prefactors c7*h6 are counted in the minimum.
    finite_checked = 0
    finite_nonzero = 0
    finite_minimum: tuple[int, int, str, int] | None = None
    variables = (*c[:9], h[6], h[7])
    evaluator = sp.lambdify(variables, coefficient, "math")
    for order_value in range(1, 12):
        trees = [nx.empty_graph(1)] if order_value == 1 else nx.nonisomorphic_trees(order_value)
        for tree in trees:
            p = tree_polynomial(tree) + (0,) * 10
            graph6 = nx.to_graph6_bytes(tree, header=False).decode("ascii").strip()
            for root in tree.nodes():
                root_deleted = tree.copy()
                root_deleted.remove_node(root)
                hp = forest_polynomial(root_deleted) + (0,) * 10
                value = int(evaluator(*p[:9], hp[6], hp[7]))
                assert value >= 0
                finite_checked += 1
                if p[7] * hp[6] == 0:
                    continue
                finite_nonzero += 1
                candidate = (value, order_value, graph6, int(root))
                if finite_minimum is None or candidate < finite_minimum:
                    finite_minimum = candidate
    assert finite_checked == 4394 and finite_minimum is not None

    output = Path(__file__).with_name("rank8_q8_terminal_delta8_exact_20260817.json")
    payload = {
        "status": "PASS_EXACT_ALL_ORDER_RANK8_TERMINAL_DELTA8",
        "proved": "Delta^8 R_1>=0 for every rooted tree core",
        "analytic_from_order": 12,
        "root_reduction": "increasing in d=h7/c7; after d=0 concave in s=h6/c6, so endpoints s=0,1",
        "selected_degree_bound": "5*c5/c4=mu4>=n-12+8/n",
        "bernstein": {
            "variables": ["T=12/n", "W", "A"],
            "numerator_degrees": list(numerator_degrees),
            "numerator_coefficients": int(numerator_coefficients.size),
            "numerator_minimum": str(numerator_minimum),
            "numerator_minimum_index": [int(x) for x in numerator_index],
            "denominator_degrees": list(denominator_degrees),
            "denominator_minimum": str(denominator_minimum),
            "denominator_minimum_index": [int(x) for x in denominator_index],
            "denominator_factorization": str(sp.factor(denominator)),
        },
        "finite_complement": {
            "rooted_rows_through_order_11": finite_checked,
            "nonzero_prefactor_rows": finite_nonzero,
            "minimum_actual_coefficient": finite_minimum[0],
            "minimum_order": finite_minimum[1],
            "minimum_graph6": finite_minimum[2],
            "minimum_root": finite_minimum[3],
        },
        "warning": "This closes Delta8 only; Delta0 through Delta7 remain open.",
    }
    output.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    print(payload["status"])
    print("script_sha256", hashlib.sha256(Path(__file__).read_bytes()).hexdigest().upper())
    print("report_sha256", hashlib.sha256(output.read_bytes()).hexdigest().upper())


if __name__ == "__main__":
    main()
