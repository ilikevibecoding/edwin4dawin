"""Exact Toeplitz-moment positive-plane audit for lower-selector Schur forms."""

from __future__ import annotations

import hashlib
import json
from pathlib import Path

import sympy as sp

from audit_lower_selector_alpha0_duran_margins import duran_polynomial
from verify_lower_qsharp_reduction import selector_gamma


HERE = Path(__file__).resolve().parent
REPORT = HERE / "lower_selector_schur_toeplitz_moment_plane_exact_20260812.json"


def one_case(d: int, r: int, row_s: int) -> dict[str, object]:
    N = d + r
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
    coefficients = [q.nth(m - j) * R ** (m - j) for j in range(m + 1)]
    assert coefficients[0] != 0 and coefficients[m] != 0

    # h is the truncation through degree m-1 of
    # (c0+c1 z+...+cm z^m)/(cm+c_(m-1)z+...+c0 z^m).
    h: list[sp.Expr] = []
    for degree in range(m):
        value = coefficients[degree]
        for shift in range(1, degree + 1):
            value -= coefficients[m - shift] * h[degree - shift]
        h.append(sp.cancel(value / coefficients[m]))

    top_energy = sp.factor(sum(value**2 for value in h[: m - 1]) - 1)
    full_energy = sp.factor(sum(value**2 for value in h) - 1)
    adjacent_moment = sp.factor(sum(h[j] * h[j + 1] for j in range(m - 1)))
    determinant = sp.factor(top_energy * full_energy - adjacent_moment**2)
    diagonal_dominance = bool(
        top_energy > abs(adjacent_moment) and full_energy > abs(adjacent_moment)
    )
    cauchy_sufficient = bool(
        top_energy > 0
        and sum(value**2 for value in h[: m - 1]) * (h[0] ** 2 - 1)
        > sum(value**2 for value in h) - 1
    )

    terminal = (d, r, row_s) == (5, 0, 5)
    if not terminal:
        assert top_energy > 0
        assert determinant > 0

    return {
        "d": d,
        "r": r,
        "row_s": row_s,
        "m": m,
        "A": str(A),
        "top_energy_minus_one_positive": bool(top_energy > 0),
        "moment_determinant_positive": bool(determinant > 0),
        "terminal_trivial_exception": terminal,
        "top_energy_minus_one_decimal": str(sp.N(top_energy, 18)),
        "moment_determinant_decimal": str(sp.N(determinant, 18)),
        "h_sha256": hashlib.sha256(";".join(map(str, h)).encode("ascii")).hexdigest().upper(),
        "last_top_h_abs_decimal": str(sp.N(abs(h[m - 2]), 18)),
        "strict_diagonal_dominance": diagonal_dominance,
        "simple_cauchy_sufficient": cauchy_sufficient,
    }


def main() -> None:
    cases = []
    for d in range(5, 15):
        for r in range(d - 4):
            N = d + r
            for row_s in range(r + 1, N + r + 1):
                cases.append(one_case(d, r, row_s))
    assert len(cases) == 770
    assert all(
        (case["top_energy_minus_one_positive"] and case["moment_determinant_positive"])
        or case["terminal_trivial_exception"]
        for case in cases
    )

    payload = {
        "kind": "lower_selector_schur_toeplitz_moment_plane_exact",
        "date": "2026-08-12",
        "status": "PASS_EXACT_770_CELL_SCHUR_TOEPLITZ_MOMENT_POSITIVE_PLANE",
        "scope": "finite exact evidence for the all-order moment inequalities",
        "congruence": (
            "For the scaled polynomial p(w)=q(Rw), H=C_v(VV^T-I)C_v^T, "
            "where V=C_v^-1 C_u is lower triangular Toeplitz with first "
            "column h=[z^0..z^(m-1)]p#(z)/p(z)."
        ),
        "positive_plane": (
            "The final two coordinate directions of VV^T-I have Gram matrix "
            "[[sum_0^(m-2)h_j^2-1, sum_0^(m-2)h_jh_(j+1)], "
            "[same, sum_0^(m-1)h_j^2-1]]."
        ),
        "consequence": (
            "Strict positivity of this 2x2 moment matrix gives at least two "
            "positive eigenvalues of H, hence at most m-2 roots outside the "
            "target disk by Schur--Cohn."
        ),
        "cases": len(cases),
        "all_nonterminal_positive_planes": True,
        "terminal_exception": [5, 0, 5],
        "cases_detail": cases,
        "remaining": (
            "Prove the two path-specific moment inequalities uniformly and "
            "prove equality with the negative-ray Sturm index."
        ),
    }
    REPORT.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    print(json.dumps({
        "status": payload["status"],
        "cases": payload["cases"],
        "source_sha256": hashlib.sha256(Path(__file__).read_bytes()).hexdigest().upper(),
        "report_sha256": hashlib.sha256(REPORT.read_bytes()).hexdigest().upper(),
        "report": str(REPORT),
    }, indent=2))


if __name__ == "__main__":
    main()
