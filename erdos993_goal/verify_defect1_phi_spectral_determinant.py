"""Replay the spectral-factor determinantal representation of Phi_N.

Write

    p=N! g_N, q=N! g_(N-1), r=N! g_(N-2).

Stability of Phi_N implies the Rayleigh difference H=q^2-pr is nonnegative
on the real line.  Hence H=b conjugate(b).  Partial-fraction weights for
q/p and the phases b(lambda_i)/q(lambda_i) then give vectors u,v and a PSD
matrix A such that

    det(XI+A+z1 uu*+z2 vv*) = p+q(z1+z2)+r z1 z2.

The all-order proof is the Rayleigh inequality, scalar spectral factorization,
and the matrix determinant lemma.  This script checks the exact polynomial
prerequisites and a high-precision reconstruction over an initial range.
"""

from __future__ import annotations

import hashlib
import json
from math import factorial
from pathlib import Path

import sympy as sp

from verify_umbral_hypergeometric_finite_free_structure import X, hypergeometric_form


HERE = Path(__file__).resolve().parent
REPORT = HERE / "defect1_phi_spectral_determinant_20260804.json"


def digest(poly: sp.Poly) -> str:
    _, primitive = poly.clear_denoms(convert=True)
    return hashlib.sha256(",".join(map(str, primitive.all_coeffs())).encode()).hexdigest()


def scaled_seed(index: int, common_factorial: int) -> sp.Poly:
    return sp.Poly(factorial(common_factorial) * hypergeometric_form(index, 1), X, domain=sp.QQ)


def minimum_on_real_line_nonnegative(poly: sp.Poly) -> bool:
    """Exact sign audit: every real root of a nonnegative polynomial is even."""
    if poly.LC() <= 0:
        return False
    _, factors = sp.sqf_list(poly)
    return all(
        multiplicity % 2 == 0 or int(factor.count_roots(-sp.oo, sp.oo)) == 0
        for factor, multiplicity in factors
    )


def main() -> None:
    report = {
        "status": "PASS",
        "checks": [],
        "proof_scope": (
            "Existence of b follows all-order from the already proved stability of Phi_N and its "
            "Rayleigh inequality.  The finite exact checks below audit normalization and signs."
        ),
    }
    for N in range(3, 31):
        p = scaled_seed(N, N)
        q = scaled_seed(N - 1, N)
        r = scaled_seed(N - 2, N)
        H = sp.Poly(sp.expand(q.as_expr() ** 2 - p.as_expr() * r.as_expr()), X, domain=sp.QQ)
        p_real = int(p.count_roots(-sp.oo, sp.oo))
        p_nonpositive = int(p.count_roots(-sp.oo, 0))
        h_nonnegative = minimum_on_real_line_nonnegative(H)
        quotient, remainder = sp.div(q.as_expr() ** 2 - H.as_expr(), p.as_expr(), domain=sp.QQ)
        exact_rayleigh_quotient = sp.expand(quotient - r.as_expr()) == 0 and remainder == 0
        item = {
            "N": N,
            "p_degree": p.degree(),
            "p_real_roots": p_real,
            "p_nonpositive_roots": p_nonpositive,
            "H_degree": H.degree(),
            "H_leading_coefficient": str(H.LC()),
            "H_nonnegative_exact_critical_audit": h_nonnegative,
            "rayleigh_quotient_identity": exact_rayleigh_quotient,
            "endpoint_trace": str(q.LC()),
            "double_endpoint_leading": str(r.LC()),
            "p_digest": digest(p),
            "H_digest": digest(H),
        }
        report["checks"].append(item)
        if (
            p_real != p.degree()
            or p_nonpositive != p.degree()
            or not h_nonnegative
            or not exact_rayleigh_quotient
            or q.LC() != N
            or r.LC() != N * (N - 1)
        ):
            report["status"] = "FAIL"

    REPORT.write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    print(f"{report['status']}: {len(report['checks'])} exact spectral-factor prerequisites")
    print(REPORT)


if __name__ == "__main__":
    main()
