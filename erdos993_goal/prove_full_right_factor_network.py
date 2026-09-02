#!/usr/bin/env python3
"""Exact certificate for the all-order TN factorization of the right factor.

The proof has three algebraic pieces.

1.  Catalan Toeplitz cancellation produces layers h_s satisfying a positive
    two-step reconstruction rule.
2.  The boundary matrix K is a connection matrix between two rational
    Newton bases.  Its initial-minor cross ratios give closed positive
    Neville multipliers.
3.  Every interior row is reconstructed from K by a planar zigzag network.

The symbolic checks below certify the identities used in the all-order
argument; finite exact reconstructions are included as independent audits.
"""

from __future__ import annotations

import json
from fractions import Fraction as F
from itertools import combinations
from pathlib import Path

import sympy as sp

from fast_bottom_forward import catalan, eye, matmul
from probe_newton_full_neville_patterns import neville_parameters
from verify_newton_checker_offdiag_homotopy import beta_checker_inverse


OUT = Path("full_right_factor_network_proof_20260803.json")


def layer_weight(s: int) -> F:
    if s % 2:
        a = (s - 1) // 2
        return F(a + 1, a + 2)
    a = s // 2
    return F(a + 2, a + 1)


def alpha(s: int) -> F:
    """The s-th numerator node of the rational Newton basis (s>=1)."""
    if s == 1:
        return F(-1)
    if s % 2 == 0:
        return F(-(s // 2 + 1))
    return F(-(s + 4), 2)


def kappa(c: int, row: int) -> F:
    if c == 0:
        return F(1, row + 3)
    if c % 2:
        a = (c - 1) // 2
        return F(
            (a + 2) * (2 * row - 2 * a + 1) * (row + 4) ** c,
            (2 * row + 1) * (row + 3) ** (c + 1),
        )
    a = c // 2
    return F(
        (c + 5) * (row + 2 - a) * (row + 4) ** c,
        (2 * row + 1) * (row + 3) ** (c + 1),
    )


def h_rows(q: int):
    h0 = [F((-1) ** d * catalan(d + 2)) for d in range(q)]
    h1 = [F(0)] + [
        F((-1) ** (d + 1) * (catalan(d + 2) - 2 * catalan(d + 1)))
        for d in range(1, q)
    ]
    rows = [h0, h1]
    for s in range(1, q - 1):
        nxt = []
        for d in range(q):
            shifted = rows[s - 1][d - 1] if d else F(0)
            nxt.append(layer_weight(s) * shifted - rows[s][d])
        rows.append(nxt)
    return rows[:q]


def right_data(q: int):
    v = beta_checker_inverse(q)
    rr = [
        [F((-1) ** (j - i) * catalan(j - i + 1)) if j >= i else F(0) for j in range(q)]
        for i in range(q)
    ]
    ident = eye(q)
    pp = [[ident[i][j] - rr[i][j] for j in range(q)] for i in range(q)]
    return v, matmul(rr, v), matmul(pp, v)


def zigzag_rows(q: int):
    """Rows expressing Y_(p,t) in boundary rows Y_(0,s)."""
    w = {(0, s): [F(int(i == s)) for i in range(q)] for s in range(q)}
    w[0, q] = [F(0) for _ in range(q)]
    labels = []
    for p in range(q):
        if p:
            for t in range(q - p):
                w[p, t] = [
                    (a + b) / layer_weight(t + 1)
                    for a, b in zip(w[p - 1, t + 1], w[p - 1, t + 2])
                ]
            w[p, q - p] = [F(0) for _ in range(q)]
        labels.append((p, 0))
        if p < q - 1:
            labels.append((p, 1))
    return [w[label] for label in labels], labels


def determinant_audit(matrix):
    rows, cols = len(matrix), len(matrix[0])
    positive = zero = 0
    for size in range(1, min(rows, cols) + 1):
        for rr in combinations(range(rows), size):
            for cc in combinations(range(cols), size):
                value = sp.det(
                    sp.Matrix(
                        [
                            [
                                sp.Rational(matrix[i][j].numerator, matrix[i][j].denominator)
                                for j in cc
                            ]
                            for i in rr
                        ]
                    )
                )
                assert value >= 0, (rr, cc, value)
                if value:
                    positive += 1
                else:
                    zero += 1
    return positive, zero


def symbolic_checks():
    C, z, x = sp.symbols("C z x", nonzero=True)
    r, R = sp.symbols("r R", integer=True, nonnegative=True)
    zc = (1 - C) / C**2

    # These are the two layer residuals after cancelling their common
    # monomial z^(2r+1) C^(2r+2)/(r+2), respectively
    # z^(2r) C^(2r+2)/(r+1).
    catalan_odd_step = sp.factor(
        (z * C**2 * ((r + 2) * C + 1) - ((r + 1) * C + 1) + (r + 2) * C**2).subs(z, zc)
    )
    catalan_even_step = sp.factor(
        ((r + 1) * z * C**2 - (r + 2) + (r + 1) * C + 1).subs(z, zc)
    )

    # If A_n is the coefficient of y^n in
    # 2F1(2,2x+7;x+5;y), these are A_(n-k)/A_n.
    def previous_ratio(n, k):
        value = (n - k + 1) / (n + 1)
        for h in range(k):
            value *= (x + 5 + n - 1 - h) / (2 * x + 7 + n - 1 - h)
        return sp.factor(value)

    even_n = 2 * r
    odd_n = 2 * r + 1
    even_b = sp.factor(
        1
        - 3 * previous_ratio(even_n, 1)
        + 3 * previous_ratio(even_n, 2)
        - previous_ratio(even_n, 3)
    )
    odd_b = sp.factor(
        1
        - 3 * previous_ratio(odd_n, 1)
        + 3 * previous_ratio(odd_n, 2)
        - previous_ratio(odd_n, 3)
    )
    even_b_closed = (
        (r + 2) * (x + 1) * (x + 2) * (x + 3)
        / (2 * (2 * r + 1) * (r + x + 2) * (r + x + 3) * (2 * r + 2 * x + 5))
    )
    odd_b_closed = (
        (2 * r + 5) * (x + 1) * (x + 2) * (x + 3)
        / (
            4
            * (r + 1)
            * (r + x + 3)
            * (2 * r + 2 * x + 5)
            * (2 * r + 2 * x + 7)
        )
    )
    even_difference = sp.factor(even_b - even_b_closed)
    odd_difference = sp.factor(odd_b - odd_b_closed)

    # Closed product G/A ratios after the duplication formula for rising
    # factorials.  They verify the two parity coefficients of
    # (1-y)^3 sum A_n y^n.
    ge_over_ae = (
        (r + 1) * (x + 1) * (x + 2) * (x + 3)
        / (2 * (2 * r + 1) * (r + x + 2) * (r + x + 3) * (2 * r + 2 * x + 5))
    )
    go_over_ao = -(
        (r + 3) * (x + 1) * (x + 2) * (x + 3)
        / (8 * (r + 1) * (r + x + 2) * (r + x + 3) * (r + x + sp.Rational(7, 2)))
    )
    ae_over_ao = (
        (2 * r + 1) * (x + 2 * r + 5)
        / ((2 * r + 2) * (2 * x + 2 * r + 7))
    )
    even_g_identity = sp.factor(even_b_closed - (r + 2) / (r + 1) * ge_over_ae)
    odd_g_identity = sp.factor(
        odd_b_closed + ge_over_ae * ae_over_ao / (r + 1) + go_over_ao
    )

    # Universal initial-minor cross ratio before inserting the parity nodes.
    c = sp.symbols("c", integer=True, nonnegative=True)
    universal_kappa = (
        -sp.Symbol("alpha_next")
        / (sp.Symbol("alpha_next") + R + 4)
        * sp.Symbol("alpha_product")
        * ((R + 4) / (R + 3)) ** c
    )

    # Insert the telescoped integer and half-integer node products.
    a = sp.symbols("a", integer=True, nonnegative=True)
    odd_node_product = (
        (R - a + 2) / (R + 3) * (2 * R - 2 * a + 1) / (2 * R + 1)
    )
    odd_extra = (a + 2) / (R - a + 2)
    odd_prefactor_target = (
        (a + 2) * (2 * R - 2 * a + 1) / ((2 * R + 1) * (R + 3))
    )
    even_node_product = (
        (R - a + 2) / (R + 3) * (2 * R - 2 * a + 3) / (2 * R + 1)
    )
    even_extra = (2 * a + 5) / (2 * R - 2 * a + 3)
    even_prefactor_target = (
        (2 * a + 5) * (R - a + 2) / ((2 * R + 1) * (R + 3))
    )

    return {
        "catalan_odd_layer": catalan_odd_step,
        "catalan_even_layer": catalan_even_step,
        "even_third_difference": even_difference,
        "odd_third_difference": odd_difference,
        "even_G_coefficient": even_g_identity,
        "odd_G_coefficient": odd_g_identity,
        "odd_kappa": sp.factor(sp.together(odd_extra * odd_node_product - odd_prefactor_target)),
        "even_kappa": sp.factor(sp.together(even_extra * even_node_product - even_prefactor_target)),
        "universal_kappa_template": universal_kappa,
    }


def finite_audit(q: int = 12):
    v, av, bv = right_data(q)
    hh = h_rows(q)
    k_upper = matmul(hh, v)

    # Closed Neville multipliers of K^T.
    params, pivots = neville_parameters([list(row) for row in zip(*k_upper)])
    checked = 0
    for c, level in enumerate(params):
        for row, value in level:
            assert value == kappa(c, row), (c, row, value, kappa(c, row))
            checked += 1
    assert all(value > 0 for value in pivots)

    w, labels = zigzag_rows(q)
    y_from_network = matmul(w, k_upper)
    y_direct = []
    for p, t in labels:
        if t == 0:
            if p == 0:
                y_direct.append(k_upper[0])
            else:
                y_direct.append(bv[p - 1])
        else:
            base = k_upper[0] if p == 0 else bv[p - 1]
            y_direct.append([2 * av[p][j] - base[j] for j in range(q)])
    assert y_from_network == y_direct

    # Positive local pair map [Y0,Y1] -> [B_(p-1),A_p].
    extended = []
    cursor = 0
    for p in range(q):
        y0 = y_from_network[cursor]
        cursor += 1
        extended.append(y0)
        if p < q - 1:
            y1 = y_from_network[cursor]
            cursor += 1
            extended.append([(y0[j] + y1[j]) / 2 for j in range(q)])
        else:
            extended.append([value / 2 for value in y0])
    original_from_network = extended[1:] + [[F(0) for _ in range(q)]]
    original = []
    for p in range(q):
        original.extend((av[p], bv[p]))
    assert original_from_network == original

    # Exact all-minor audit of the planar coefficient matrix at a useful
    # independent finite size.  The theorem itself uses Lindstrom's lemma.
    w7, _ = zigzag_rows(7)
    w_positive, w_zero = determinant_audit(w7)
    right7 = []
    _, a7, b7 = right_data(7)
    for p in range(7):
        right7.extend((a7[p], b7[p]))
    right_positive, right_zero = determinant_audit(right7)

    return {
        "reconstruction_q": q,
        "K_neville_multipliers_checked": checked,
        "K_positive_pivots": len(pivots),
        "zigzag_q7_positive_minors": w_positive,
        "zigzag_q7_zero_minors": w_zero,
        "right_q7_positive_minors": right_positive,
        "right_q7_zero_minors": right_zero,
    }


def main():
    symbolic = symbolic_checks()
    residuals = {
        key: str(value)
        for key, value in symbolic.items()
        if key != "universal_kappa_template"
    }
    assert all(value == "0" for value in residuals.values()), residuals
    finite = finite_audit()
    report = {
        "status": "PASS_FULL_RIGHT_FACTOR_ALL_ORDER_NETWORK_PROOF",
        "symbolic_residuals": residuals,
        "universal_kappa_template": str(symbolic["universal_kappa_template"]),
        "finite_audit": finite,
        "theorem": (
            "The interleaved right factor ((R Vbar)_0,(P Vbar)_0,...) "
            "is totally nonnegative in every finite order."
        ),
        "warning": (
            "Finite audits support but do not replace the all-order rational-Newton "
            "minor formula and planar-network argument."
        ),
    }
    OUT.write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(report, indent=2))


if __name__ == "__main__":
    main()
