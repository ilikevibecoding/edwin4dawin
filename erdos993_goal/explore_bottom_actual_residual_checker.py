"""Inspect the checker inverse of the genuine balanced Schur residual."""

from __future__ import annotations

import sympy as sp

from verify_bottom_universal_schur_tp import (
    reverse_identity,
    schur_tail,
    universal_matrix,
)


def actual_residual(m: int) -> sp.Matrix:
    d = 2 * m + 3
    return -schur_tail(universal_matrix(d + m, d), d) * reverse_identity(m)


def checker_inverse(matrix: sp.Matrix) -> sp.Matrix:
    e = sp.diag(*[(-1) ** i for i in range(matrix.rows)])
    return sp.simplify(e * matrix.inv() * e)


def boundary_normalize(matrix: sp.Matrix) -> sp.Matrix:
    return sp.Matrix(
        matrix.rows,
        matrix.cols,
        lambda i, j: sp.factor(
            matrix[i, j] * matrix[0, 0] / (matrix[i, 0] * matrix[0, j])
        ),
    )


def shift(size: int) -> sp.Matrix:
    s = sp.zeros(size)
    for i in range(size - 1):
        s[i + 1, i] = 1
    return s


def main() -> None:
    for m in range(1, 9):
        r = actual_residual(m)
        h = checker_inverse(r)
        n = boundary_normalize(h)
        s = shift(m)
        displacements = {
            "toeplitz": h - s * h * s.T,
            "hankel": h - s * h * s,
            "normalized_toeplitz": n - s * n * s.T,
            "normalized_hankel": n - s * n * s,
        }
        print(
            f"m={m} checker_entries_positive={all(x > 0 for x in h)} "
            f"symmetric={h == h.T} persymmetric={h[::-1, ::-1] == h.T} "
            + "ranks={"
            + ", ".join(f"{name}:{value.rank()}" for name, value in displacements.items())
            + "}",
            flush=True,
        )
        if m <= 4:
            print("normalized=", n, flush=True)


if __name__ == "__main__":
    main()
