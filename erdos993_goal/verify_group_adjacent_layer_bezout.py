"""Exact Bezout certificates for adjacent upper homogeneous layers.

For real polynomials f of degree n+1 and g of degree n, the Bezout matrix

    (f(x)g(y)-f(y)g(x))/(x-y)

is positive definite exactly when the roots are simple, real, and g strictly
interlaces f with the positive orientation.  This script applies Sylvester's
criterion over the integers to consecutive residual layer rows from
verify_group_general_homogeneous_layers.py.

This is a finite exact audit intended to expose an all-order Gram/Bezout
pattern; it is not itself the missing uniform proof.
"""

from __future__ import annotations

import hashlib
import json
from pathlib import Path

from flint import fmpz_mat

from verify_group_general_homogeneous_layers import residual_formula_row


HERE = Path(__file__).resolve().parent
REPORT = HERE / "group_adjacent_layer_bezout_20260804.json"


def bezout_matrix(f, g) -> fmpz_mat:
    assert f.degree() == g.degree() + 1
    size = f.degree()
    fc = [int(f.nth(k)) for k in range(size + 1)]
    gc = [int(g.nth(k)) if k <= g.degree() else 0 for k in range(size + 1)]
    entries = [[0 for _ in range(size)] for _ in range(size)]
    for a in range(1, size + 1):
        for b in range(a):
            coefficient = fc[a] * gc[b] - fc[b] * gc[a]
            for k in range(a - b):
                entries[a - 1 - k][b + k] += coefficient
    assert all(entries[i][j] == entries[j][i] for i in range(size) for j in range(size))
    return fmpz_mat(size, size, [entries[i][j] for i in range(size) for j in range(size)])


def leading_principal_determinants(matrix: fmpz_mat) -> list[int]:
    out: list[int] = []
    for size in range(1, matrix.nrows() + 1):
        leading = fmpz_mat(
            size,
            size,
            [int(matrix[i, j]) for i in range(size) for j in range(size)],
        )
        out.append(int(leading.det()))
    return out


def sign_digest(values: list[int]) -> str:
    normalized = [value // abs(value) if value else 0 for value in values]
    return hashlib.sha256(",".join(map(str, normalized)).encode()).hexdigest()


def main() -> None:
    report: dict[str, object] = {
        "status": "PASS_EXACT_FINITE_AUDIT",
        "checks": [],
        "scope": (
            "Every recorded interlacing certificate is exact.  The tested finite grid "
            "does not replace an all-order positivity proof for the Bezout matrices."
        ),
    }
    for d in range(5, 13):
        for r in range(0, d - 4):
            N = d + r
            rows = [residual_formula_row(N, d, s) for s in range(2 * N - d + 1)]
            for s in range(len(rows) - 1):
                lower, upper = (
                    (rows[s], rows[s + 1]) if rows[s + 1].degree() > rows[s].degree()
                    else (rows[s + 1], rows[s])
                )
                matrix = bezout_matrix(upper, lower)
                determinants = leading_principal_determinants(matrix)
                positive_definite = all(value > 0 for value in determinants)
                entrywise_positive = all(matrix[i, j] > 0 for i in range(matrix.nrows()) for j in range(matrix.ncols()))
                item = {
                    "N": N,
                    "d": d,
                    "r": r,
                    "s_to_s_plus_1": s,
                    "size": matrix.nrows(),
                    "positive_definite": positive_definite,
                    "entrywise_positive": entrywise_positive,
                    "leading_minor_sign_digest": sign_digest(determinants),
                    "leading_minor_bit_lengths": [abs(value).bit_length() for value in determinants],
                }
                report["checks"].append(item)
                if not positive_definite:
                    report["status"] = "FAIL"
                    item["leading_principal_determinants"] = [str(value) for value in determinants]

    REPORT.write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    print(f"{report['status']}: {len(report['checks'])} exact Bezout certificates")
    print(REPORT)


if __name__ == "__main__":
    main()
