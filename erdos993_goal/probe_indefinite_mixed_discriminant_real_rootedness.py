#!/usr/bin/env python3
"""Search for failures of coefficient real-rootedness for Hermitian pencils.

For random integer symmetric A and B, test every coefficient

    [t^d] det(z I - A + t B).

If all such coefficients were real-rooted for arbitrary Hermitian B, the
endpoint mixed-discriminant representation would immediately imply the
needed affine-line theorem.  Exact failures rule out that overgeneralization.
"""

from __future__ import annotations

import json
import random
from pathlib import Path

import sympy as sp
from flint import ctx, fmpz_poly


OUT = Path("indefinite_mixed_discriminant_real_rootedness_probe_20260802.json")
Z, T = sp.symbols("Z T")


def symmetric_matrix(rng: random.Random, n: int, bound: int) -> sp.Matrix:
    matrix = sp.zeros(n)
    for i in range(n):
        for j in range(i, n):
            value = rng.randint(-bound, bound)
            matrix[i, j] = value
            matrix[j, i] = value
    return matrix


def nonreal(poly: sp.Poly) -> int:
    coefficients = [int(value) for value in reversed(poly.all_coeffs())]
    return sum(
        multiplicity
        for root, multiplicity in fmpz_poly(coefficients).complex_roots()
        if not root.imag.is_zero()
    )


def main() -> None:
    ctx.prec = 160
    rng = random.Random(993_180_026)
    records = []
    witnesses = []

    for n in range(3, 8):
        failures = 0
        for model in range(30):
            a = symmetric_matrix(rng, n, 7)
            b = symmetric_matrix(rng, n, 5)
            determinant = sp.Poly((Z * sp.eye(n) - a + T * b).det(), Z, T)
            for d in range(1, n):
                expression = sum(
                    determinant.coeff_monomial(Z**j * T**d) * Z**j
                    for j in range(n - d + 1)
                )
                polynomial = sp.Poly(expression, Z)
                count = nonreal(polynomial) if not polynomial.is_zero else 0
                failures += bool(count)
                if count and len(witnesses) < 30:
                    witnesses.append(
                        {
                            "n": n,
                            "model": model,
                            "d": d,
                            "A": [[int(value) for value in row] for row in a.tolist()],
                            "B": [[int(value) for value in row] for row in b.tolist()],
                            "polynomial": str(polynomial.as_expr()),
                            "nonreal": count,
                        }
                    )
        record = {"n": n, "failures": failures}
        records.append(record)
        print(record, flush=True)

    report = {
        "kind": "indefinite_mixed_discriminant_real_rootedness_probe",
        "date": "2026-08-02",
        "status": "GENERAL_HERMITIAN_THEOREM_FALSE" if witnesses else "NO_FAILURE_FOUND",
        "records": records,
        "total_failures": sum(record["failures"] for record in records),
        "first_witnesses": witnesses,
    }
    OUT.write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    print(json.dumps({"status": report["status"], "total_failures": report["total_failures"], "output": str(OUT.resolve())}, indent=2))


if __name__ == "__main__":
    main()
