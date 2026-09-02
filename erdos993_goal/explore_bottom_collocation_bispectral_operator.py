"""Search for a low-bandwidth difference operator diagonalized by p_j(x)."""

from __future__ import annotations

import sympy as sp

from verify_bottom_schur_chebyshev_coefficients import X, maximal_tail_data


A = sp.symbols("a")


def collocation(d: int) -> sp.Matrix:
    q = d - 1
    _, polynomials, _ = maximal_tail_data(d)
    return sp.Matrix(q, q, lambda x, j: polynomials[j].eval(x))


def shape(matrix: sp.Matrix) -> list[str]:
    return [
        "".join("+" if value > 0 else "-" if value < 0 else "." for value in matrix.row(i))
        for i in range(matrix.rows)
    ]


def main() -> None:
    for d in range(3, 10):
        q = d - 1
        values = collocation(d)
        inverse = values.inv()
        candidates = {
            "linear": list(range(q)),
            "quadratic_j(j+1)": [j * (j + 1) for j in range(q)],
            "reversed_linear": [q - 1 - j for j in range(q)],
            "alternating_step": [j // 2 for j in range(q)],
        }
        print(f"d={d} q={q}", flush=True)
        for name, eigenvalues in candidates.items():
            operator = sp.simplify(values * sp.diag(*eigenvalues) * inverse)
            bandwidth = max(
                (abs(i - j) for i in range(q) for j in range(q) if operator[i, j] != 0),
                default=0,
            )
            offband = sum(
                int(bool(operator[i, j] != 0 and abs(i - j) > 2))
                for i in range(q)
                for j in range(q)
            )
            print(
                f" {name}: bandwidth={bandwidth} entries_beyond_2={offband} "
                f"shape={shape(operator) if d<=6 else 'omitted'}",
                flush=True,
            )
        # Solve linearly for all spectra that yield a banded operator.  The
        # constant spectrum always gives a scalar identity; dimension >1
        # detects a genuine bispectral difference operator.
        for band in (1, 2, 3):
            equations = []
            for i in range(q):
                for k in range(q):
                    if abs(i - k) > band:
                        equations.append(
                            [sp.factor(values[i, j] * inverse[j, k]) for j in range(q)]
                        )
            constraint = sp.Matrix(equations) if equations else sp.zeros(0, q)
            nullity = q - constraint.rank()
            print(f" band={band} spectral_nullity={nullity}", flush=True)


if __name__ == "__main__":
    main()
