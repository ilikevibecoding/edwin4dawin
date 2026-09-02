#!/usr/bin/env python3
"""Inspect production matrices for the Jacobi/co-recursive coefficient arrays."""

from fractions import Fraction as F

from fast_bottom_forward import catalan, eye, matmul
from probe_confluent_transition_sections import inverse_matrix
from verify_newton_checker_offdiag_homotopy import jacobi_upper


def coefficient_arrays(size):
    u = jacobi_upper(size)
    r = [
        [F((-1) ** (j - i) * catalan(j - i + 1)) if j >= i else F(0)
         for j in range(size)]
        for i in range(size)
    ]
    p = [[eye(size)[i][j] - r[i][j] for j in range(size)] for i in range(size)]
    up = matmul(u, p)
    uu, hh = [], []
    top = size - 1
    for n in range(size):
        i = top - n
        scale = u[i][i]
        un = [value / scale for value in u[i][i:]]
        # H_n is the full co-recursive polynomial.  UP/z supplies all but its
        # last coefficient; recover that coefficient from the common Jacobi
        # recurrence below when needed.
        hn = [value / (2 * scale) for value in up[i][i + 1:]]
        if n == 0:
            hn = [F(1)]
        elif n == 1:
            hn.append(F(3, 10))
        else:
            a = F(2 * (4 * n * n + 8 * n + 9), (2 * n + 1) * (2 * n + 3))
            b = F((n - 1) * (n + 2) * (2 * n - 1) * (2 * n + 3),
                  n * (n + 1) * (2 * n + 1) ** 2)
            previous = hh[n - 1][:n]
            previous2 = hh[n - 2][:n - 1]
            full = [F(0)] * (n + 1)
            for k, value in enumerate(previous):
                full[k] += value
                full[k + 1] += a * value
            for k, value in enumerate(previous2):
                full[k + 2] -= b * value
            assert full[:n] == hn
            hn = full
        uu.append(un + [F(0)] * (size - len(un)))
        hh.append(hn + [F(0)] * (size - len(hn)))
    return uu, hh


def production(array):
    n = len(array) - 1
    return matmul(inverse_matrix([row[:n] for row in array[:n]]),
                  [row[:n] for row in array[1:n + 1]])


def main():
    uu, hh = coefficient_arrays(11)
    for name, array in (("U", uu), ("H", hh)):
        matrix = production(array)
        print(name)
        for i, row in enumerate(matrix):
            print(i, row)
        print("negative", [(i, j, x) for i, row in enumerate(matrix)
                           for j, x in enumerate(row) if x < 0])


if __name__ == "__main__":
    main()
