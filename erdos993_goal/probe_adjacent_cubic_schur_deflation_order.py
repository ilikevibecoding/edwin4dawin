"""Numerical route probe for a rank-one-deflated Darboux comparison.

If A=L^T L is the Darboux partner of the current Jacobi matrix, eliminate
its final coordinate by a Schur complement S.  The spectrum of S direct-sum
zero interlaces that of A.  This probe tests whether J_H-S is positive
semidefinite, which would immediately give the missing root inequality.
"""

from fractions import Fraction
import json
from pathlib import Path
import random

import numpy as np

from verify_adjacent_cubic_trailing_minor_interlacer import exact_cubic_matrix_data


def matrix_from_data(diagonal, subdiagonal):
    n = len(diagonal)
    out = np.diag([float(x) for x in diagonal])
    for i in range(1, n):
        value = float(subdiagonal[i]) ** 0.5
        out[i - 1, i] = out[i, i - 1] = value
    return out


def main():
    rng = random.Random(993_20260806)
    cases = 0
    psd = 0
    inertia_counts = {}
    worst = None
    for p in (13, 14, 17, 20, 25, 32):
        a = p - 13
        for _ in range(2):
            u = Fraction(rng.randrange(0, 101), 100)
            v = Fraction(rng.randrange(0, 101), 100)
            c = Fraction(rng.randrange(1, 2501), 100)
            gamma = [c, 1 - c * (u + v), -(u + v) + c * u * v, u * v]
            d, q = exact_cubic_matrix_data(p, a, gamma)
            dh, qh = exact_cubic_matrix_data(p - 2, a + 1, gamma)
            m = matrix_from_data(d, q)
            jh = matrix_from_data(dh, qh)
            ell = np.linalg.cholesky(m)
            aa = ell.T @ ell
            schur = aa[:-1, :-1] - np.outer(aa[:-1, -1], aa[-1, :-1]) / aa[-1, -1]
            eig = np.linalg.eigvalsh(jh - schur)
            tol = 1e-9
            inertia = (
                int(np.sum(eig > tol)),
                int(np.sum(eig < -tol)),
                int(np.sum(np.abs(eig) <= tol)),
            )
            inertia_counts[str(inertia)] = inertia_counts.get(str(inertia), 0) + 1
            cases += 1
            if eig[0] >= -tol:
                psd += 1
            if worst is None or eig[0] < worst["minimum_eigenvalue"]:
                worst = {
                    "p": p,
                    "alpha": a,
                    "u": str(u),
                    "v": str(v),
                    "c": str(c),
                    "minimum_eigenvalue": float(eig[0]),
                    "inertia": inertia,
                }
    report = {
        "status": "uniform_psd" if psd == cases else "rejected",
        "cases": cases,
        "psd_cases": psd,
        "inertia_counts": inertia_counts,
        "worst": worst,
    }
    path = Path(__file__).with_name("adjacent_cubic_schur_deflation_order_probe_20260806.json")
    path.write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(report, indent=2))


if __name__ == "__main__":
    main()
