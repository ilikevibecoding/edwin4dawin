#!/usr/bin/env python3
"""Exact all-order certificate for rank-eight terminal Delta^9--Delta^11."""

from __future__ import annotations

import hashlib
import json
from pathlib import Path

import networkx as nx
import sympy as sp
from flint import fmpz_poly as Poly

from scan_forest_iso_reserve_floor import tree_polynomial
from verify_rank8_q8_terminal_reduction import c, h, newton_coefficients, residual


n, x = sp.symbols("n x", integer=True, nonnegative=True)


def choose_poly(z: sp.Expr, k: int) -> sp.Expr:
    return sp.prod(z - j for j in range(k)) / sp.factorial(k)


def forest_polynomial(forest: nx.Graph) -> tuple[int, ...]:
    out = Poly([1])
    for vertices in nx.connected_components(forest):
        component = nx.convert_node_labels_to_integers(forest.subgraph(vertices).copy())
        out *= Poly(list(tree_polynomial(component)))
    return tuple(int(value) for value in out)


def main() -> None:
    coefficients = newton_coefficients(residual())
    exact_tree = {c[0]: 1, c[1]: n, c[2]: choose_poly(n - 1, 2)}

    # Delta^11 = 264*c7*h6*B11.  Successive extension bounds on c5,c4
    # leave a negative c3 coefficient, so c3<=C(n,3) gives the lower bound.
    b11 = sp.expand(coefficients[11] / (264 * c[7] * h[6])).subs(exact_tree)
    e11 = sp.expand(
        b11.subs(
            {
                c[4]: (n - 3) * x / 4,
                c[5]: (n - 4) * (n - 3) * x / 20,
                c[3]: x,
            },
            simultaneous=True,
        )
    )
    assert sp.expand(sp.diff(e11, x) + (385 * n + 2217) / 4) == 0
    lower11 = sp.factor(e11.subs(x, choose_poly(n, 3)))
    expected11 = (131 * n**4 + 714 * n**3 + 9037 * n**2 + 45222 * n + 19824) / 24
    assert sp.expand(lower11 - expected11) == 0
    assert all(value > 0 for value in sp.Poly(expected11, n).all_coeffs())

    # Delta^10 = 24*c7*h6*B10.  Bound c6,c5,c4 successively.  The remaining
    # quadratic in c3 is increasing from the path-minimal c3=C(n-2,3) for
    # n>=16, and its endpoint value is positive coefficientwise after shift.
    b10 = sp.expand(coefficients[10] / (24 * c[7] * h[6])).subs(exact_tree)
    e10 = sp.expand(b10.subs(c[6], (n - 5) * c[5] / 6))
    assert sp.expand(sp.diff(e10, c[5]) + 5 * (60 * n + 419)) == 0
    e10 = sp.expand(e10.subs(c[5], (n - 4) * c[4] / 5))
    assert sp.expand(sp.diff(e10, c[4]) + 56 * n**2 + 1303 * n + 5471) == 0
    e10 = sp.expand(e10.subs({c[4]: (n - 3) * x / 4, c[3]: x}, simultaneous=True))
    path_c3 = choose_poly(n - 2, 3)
    derivative10 = sp.factor(sp.diff(e10, x).subs(x, path_c3))
    assert sp.expand(derivative10 - (56 * n**3 - 419 * n**2 - 5646 * n - 22867) / 4) == 0
    shifted_derivative10 = sp.Poly(sp.expand(derivative10.subs(n, n + 16)), n)
    assert all(value > 0 for value in shifted_derivative10.all_coeffs())
    lower10 = sp.factor(e10.subs(x, path_c3))
    expected10 = (
        85 * n**5 + 4313 * n**4 + 37717 * n**3 + 65059 * n**2 - 98006 * n + 588792
    ) / 24
    assert sp.expand(lower10 - expected10) == 0
    shifted10 = sp.Poly(sp.expand(expected10.subs(n, n + 16)), n)
    assert all(value > 0 for value in shifted10.all_coeffs())

    # The normalized Delta^10 bracket is root-independent.  Exhaust every
    # free tree through order 15 for the finite complement.
    finite10_checked = 0
    finite10_minimum: tuple[int, int, tuple[int, ...]] | None = None
    b10_free = sp.lambdify(tuple(c[:7]), sp.expand(coefficients[10] / (24 * c[7] * h[6])), "math")
    for order in range(1, 16):
        trees = [nx.empty_graph(1)] if order == 1 else nx.nonisomorphic_trees(order)
        for tree in trees:
            p = tree_polynomial(tree)
            padded = p + (0,) * (9 - len(p))
            if padded[7] == 0:
                continue
            value = int(b10_free(*padded[:7]))
            assert value >= 0
            finite10_checked += 1
            candidate = (value, order, p)
            if finite10_minimum is None or candidate < finite10_minimum:
                finite10_minimum = candidate
    assert finite10_checked == 12909 and finite10_minimum is not None

    # Delta^9 = 24*c7*h6*B9.  First use h6<=c6, then extension bounds
    # c7,...,c4.  The c4 coefficient is negative over c3<=C(n,3).  The
    # remaining convex quadratic is increasing from the path endpoint for
    # n>=9 and has a positive shifted endpoint polynomial.
    b9 = sp.expand(coefficients[9] / (24 * c[7] * h[6])).subs(exact_tree).subs(h[6], c[6])
    e9 = sp.expand(b9.subs(c[7], (n - 6) * c[6] / 7))
    assert sp.expand(sp.diff(e9, c[6]) + 3 * (64 * n + 337)) == 0
    e9 = sp.expand(e9.subs(c[6], (n - 5) * c[5] / 6))
    assert sp.expand(sp.diff(e9, c[5]) + (140 * n**2 + 1905 * n + 6401) / 2) == 0
    e9 = sp.expand(e9.subs(c[5], (n - 4) * c[4] / 5))
    coefficient_c4 = sp.factor(sp.diff(e9, c[4]))
    assert sp.expand(
        coefficient_c4.subs(c[3], choose_poly(n, 3))
        + (1655 * n**2 + 20131 * n + 46816) / 10
    ) == 0
    e9 = sp.expand(e9.subs({c[4]: (n - 3) * x / 4, c[3]: x}, simultaneous=True))
    derivative9 = sp.factor(sp.diff(e9, x).subs(x, path_c3))
    expected_derivative9 = (
        140 * n**4 + 865 * n**3 - 14186 * n**2 - 6863 * n - 166432
    ) / 40
    assert sp.expand(derivative9 - expected_derivative9) == 0
    shifted_derivative9 = sp.Poly(sp.expand(expected_derivative9.subs(n, n + 9)), n)
    assert all(value > 0 for value in shifted_derivative9.all_coeffs())
    lower9 = sp.factor(e9.subs(x, path_c3))
    expected9 = (
        25 * n**6
        + 849 * n**5
        + 67281 * n**4
        + 73019 * n**3
        + 331034 * n**2
        - 1163720 * n
        + 3077088
    ) / 240
    assert sp.expand(lower9 - expected9) == 0
    shifted9 = sp.Poly(sp.expand(expected9.subs(n, n + 9)), n)
    assert all(value > 0 for value in shifted9.all_coeffs())

    # Only order 8 can have c7*h6>0 below the analytic threshold.  Check all
    # roots of every free tree there using literal root-deleted polynomials.
    finite9_checked = 0
    finite9_minimum: tuple[int, str] | None = None
    expression9 = coefficients[9]
    for tree in nx.nonisomorphic_trees(8):
        p = tree_polynomial(tree) + (0,) * 10
        for root in tree.nodes():
            root_deleted = tree.copy()
            root_deleted.remove_node(root)
            hp = forest_polynomial(root_deleted) + (0,) * 9
            if p[7] * hp[6] == 0:
                continue
            substitutions = {
                **{c[j]: p[j] for j in range(9)},
                **{h[j]: hp[j] for j in range(9)},
            }
            value = int(expression9.subs(substitutions))
            assert value >= 0
            finite9_checked += 1
            code = nx.to_graph6_bytes(tree, header=False).decode("ascii").strip()
            candidate = (value, code)
            if finite9_minimum is None or candidate < finite9_minimum:
                finite9_minimum = candidate
    assert finite9_checked == 8 and finite9_minimum is not None

    output = Path(__file__).with_name("rank8_q8_terminal_delta9_11_exact_20260816.json")
    payload = {
        "status": "PASS_EXACT_ALL_ORDER_RANK8_TERMINAL_DELTA9_11",
        "proved": "Delta^j R_1>=0 for j=9,10,11 for every rooted tree core",
        "Delta11_lower_normalized": str(lower11),
        "Delta10": {
            "analytic_from_order": 16,
            "analytic_lower_normalized": str(lower10),
            "finite_tree_rows_with_c7_positive": finite10_checked,
            "finite_minimum_normalized": finite10_minimum[0],
            "finite_minimum_order": finite10_minimum[1],
            "finite_minimum_polynomial": list(finite10_minimum[2]),
        },
        "Delta9": {
            "analytic_from_order": 9,
            "analytic_lower_normalized": str(lower9),
            "finite_rooted_rows_with_c7h6_positive": finite9_checked,
            "finite_minimum_actual_coefficient": finite9_minimum[0],
            "finite_minimum_graph6": finite9_minimum[1],
        },
        "warning": "Together with the separate Delta12--15 certificate this proves only Delta9--15, not the full terminal residual.",
    }
    output.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    print(payload["status"])
    print("script_sha256", hashlib.sha256(Path(__file__).read_bytes()).hexdigest().upper())
    print("report_sha256", hashlib.sha256(output.read_bytes()).hexdigest().upper())


if __name__ == "__main__":
    main()
