"""Targeted exact diagnostics for the post-sector all-pass quotient.

This is exploratory only.  It records denominator sign/ratio patterns and
the finite all-pass coefficient identities needed for a possible analytic
three-step energy proof.
"""

from __future__ import annotations

from flint import fmpq
import numpy as np

from probe_lower_selector_tail3_flint_full import duran_coefficients, selector_gamma


def data(d: int, r: int, row_s: int):
    path_n = d + r
    forced = max(0, row_s - path_n + 1)
    gamma_hat = selector_gamma(path_n, row_s)[forced:]
    m = len(gamma_hat) - 1
    p = d + row_s - 2 * forced
    n = p // 2
    beta_num = 1 if p % 2 else -1
    x = n - m + 1
    A = fmpq(x) * fmpq(2 * x + beta_num, 2)
    q = duran_coefficients(d + row_s - forced, gamma_hat)
    H = []
    for j in range(m + 1):
        value = q[m - j]
        for ell in range(1, j + 1):
            value -= q[ell] * A**ell * H[j - ell]
        H.append(value / q[0])
    # h_j=R^(m-j)H_j.  Work with squared/radical-free quantities.
    return forced, m, A, q, H


def signs(values):
    return "".join("+" if x > 0 else "-" if x < 0 else "0" for x in values)


def main():
    cases = [(9, 4, 11), (26, 5, 25), (19, 3, 8), (12, 6, 12)]
    for cell in cases:
        forced, m, A, q, H = data(*cell)
        squares = [A ** (m-j) * H[j]**2 for j in range(m)]
        print("cell", cell, "forced", forced, "m", m, "A", A)
        print("gamma", selector_gamma(cell[0]+cell[1], cell[2])[forced:])
        print("qsign", signs(q), "Hsign", signs(H[:m]))
        print("q ratios", [float(q[j+1]*A/q[j]) if q[j] else None for j in range(m)])
        print("block ratios", [float(squares[j]/sum(squares[j+1:j+4])) for j in range(m-3)])
        roots = np.roots([float(q[k]) for k in range(m, -1, -1)])
        print("q roots", sorted(roots, key=lambda z: (z.real, z.imag)))
        print("scaled x", sorted([float(A)**.5/z for z in roots], key=lambda z: (z.real, z.imag)))
        print("H_m", float(H[m]))


if __name__ == "__main__":
    main()
