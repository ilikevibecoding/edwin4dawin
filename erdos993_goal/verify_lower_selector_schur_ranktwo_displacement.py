"""Exact Schur--Cohn rank-two displacement and full-rank Gram obstruction."""

from __future__ import annotations

import hashlib
import json
from pathlib import Path

import sympy as sp

from audit_lower_selector_alpha0_duran_margins import duran_polynomial
from verify_lower_qsharp_reduction import selector_gamma


HERE = Path(__file__).resolve().parent
REPORT = HERE / "lower_selector_schur_ranktwo_displacement_exact_20260812.json"


def schur_form(coefficients: list[sp.Expr]) -> sp.Matrix:
    m = len(coefficients) - 1
    upper = sp.Matrix(m, m, lambda i, j: coefficients[i-j] if i >= j else 0)
    lower = sp.Matrix(m, m, lambda i, j: coefficients[m-i+j] if i >= j else 0)
    return upper.T * upper - lower.T * lower


def displacement_data(coefficients: list[sp.Expr]):
    m = len(coefficients) - 1
    H = schur_form(coefficients)
    J = sp.zeros(m)
    for index in range(m - 1):
        J[index, index + 1] = 1
    u = sp.Matrix([coefficients[m - 1 - index] for index in range(m)])
    v = sp.Matrix([coefficients[index + 1] for index in range(m)])
    assert H - J * H * J.T == u * u.T - v * v.T
    Cu = sp.Matrix.hstack(*[(J**power) * u for power in range(m)])
    Cv = sp.Matrix.hstack(*[(J**power) * v for power in range(m)])
    assert H == Cu * Cu.T - Cv * Cv.T
    assert sp.factor(Cu.det() - (-1) ** (m * (m - 1) // 2) * coefficients[0] ** m) == 0
    assert sp.factor(Cv.det() - (-1) ** (m * (m - 1) // 2) * coefficients[m] ** m) == 0
    return H, Cu, Cv


def main() -> None:
    # Fully generic symbolic identity through degree seven.
    generic_checks = 0
    for m in range(2, 8):
        coefficients = list(sp.symbols(f"c0:{m+1}"))
        displacement_data(coefficients)
        generic_checks += 1

    # Corrected lower-selector transcription checks.  Rational scaling by R
    # is unnecessary for rank/full-rank: use A powers after adjoining sqrt(A).
    path_checks = 0
    all_both_grams_full_rank = True
    for d in range(5, 13):
        for r in range(d - 4):
            N = d + r
            for row_s in range(r + 1, N + r + 1):
                gamma = selector_gamma(N, row_s)
                forced = max(0, row_s - N + 1)
                gamma_hat = gamma[forced:]
                m = len(gamma_hat) - 1
                P = d + row_s
                p = P - 2 * forced
                n = p // 2
                beta = sp.Rational(2 * (p % 2) - 1, 2)
                A = sp.Rational((n - m + 1) * (n - m + 1 + beta))
                R = sp.sqrt(A)
                q = duran_polynomial(P - forced, gamma_hat)
                coefficients = [q.nth(m - index) * R ** (m - index) for index in range(m + 1)]
                _, Cu, Cv = displacement_data(coefficients)
                assert Cu.det() != 0 and Cv.det() != 0
                all_both_grams_full_rank &= Cu.rank() == m and Cv.rank() == m
                path_checks += 1
    assert all_both_grams_full_rank

    payload = {
        "kind": "lower_selector_schur_ranktwo_displacement_exact",
        "date": "2026-08-12",
        "status": "PASS_EXACT_SCHUR_RANKTWO_DISPLACEMENT_AND_FULLRANK_GRAM_OBSTRUCTION",
        "identity": "H-JHJ^T=uu^T-vv^T; H=C_u C_u^T-C_v C_v^T",
        "vectors": "u_i=c_(m-1-i), v_i=c_(i+1)",
        "determinants": (
            "det C_u=(-1)^(m(m-1)/2)c_0^m and "
            "det C_v=(-1)^(m(m-1)/2)c_m^m"
        ),
        "generic_degree_checks": generic_checks,
        "path_checks": path_checks,
        "path_range": "5<=d<=12, 0<=r<=d-5, r<row_s<=d+2r",
        "all_path_positive_and_negative_controllability_grams_full_rank": True,
        "conclusion": (
            "The Schur form is a difference of two path-controllability moment "
            "Gramians with rank-two displacement, but neither Gram has rank m-2. "
            "A proof of negative inertia <=m-2 therefore needs a nontrivial "
            "two-direction cancellation/congruence, not the displacement identity alone."
        ),
    }
    REPORT.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    print(json.dumps({
        "status": payload["status"],
        "generic_degree_checks": generic_checks,
        "path_checks": path_checks,
        "source_sha256": hashlib.sha256(Path(__file__).read_bytes()).hexdigest().upper(),
        "report_sha256": hashlib.sha256(REPORT.read_bytes()).hexdigest().upper(),
        "report": str(REPORT),
    }, indent=2))


if __name__ == "__main__":
    main()
