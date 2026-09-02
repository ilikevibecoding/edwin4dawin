"""Exact last-three-coefficient certificate for the Schur moment 2-plane."""

from __future__ import annotations

import hashlib
import json
from pathlib import Path

import sympy as sp

from audit_lower_selector_alpha0_duran_margins import duran_polynomial
from verify_lower_qsharp_reduction import selector_gamma


HERE = Path(__file__).resolve().parent
REPORT = HERE / "lower_selector_schur_tail_minor_exact_20260812.json"


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
    c = [q.nth(m - j) * R ** (m - j) for j in range(m + 1)]
    h: list[sp.Expr] = []
    for degree in range(m):
        value = c[degree]
        for shift in range(1, degree + 1):
            value -= c[m - shift] * h[degree - shift]
        h.append(sp.cancel(value / c[m]))

    E = sp.factor(sum(value**2 for value in h[:-1]))
    F = sp.factor(E + h[-1] ** 2)
    C = sp.factor(sum(h[j] * h[j + 1] for j in range(m - 1)))
    all_minors = sp.factor(sum(
        (a_i * b_j - a_j * b_i) ** 2
        for i in range(m)
        for j in range(i + 1, m)
        for a_i, a_j, b_i, b_j in [(
            h[i] if i < m - 1 else sp.Integer(0),
            h[j] if j < m - 1 else sp.Integer(0),
            h[i + 1] if i < m - 1 else h[0],
            h[j + 1] if j < m - 1 else h[0],
        )]
    ))
    assert sp.factor(E * F - C**2 - all_minors) == 0

    if m >= 3:
        tail_energy = sp.factor(h[m - 3] ** 2 + h[m - 2] ** 2 - 1)
        last_minor = sp.factor(h[m - 3] * h[m - 1] - h[m - 2] ** 2)
        tail_margin = sp.factor(last_minor**2 - (E + F - 1))
        tail_pass = bool(tail_energy > 0 and tail_margin > 0)
        if m >= 4:
            assert tail_pass
    else:
        tail_energy = None
        last_minor = None
        tail_margin = None
        tail_pass = False

    return {
        "d": d,
        "r": r,
        "row_s": row_s,
        "m": m,
        "A": str(A),
        "gram_minor_sum_identity": True,
        "tail_certificate_applicable": tail_pass,
        "tail_energy_margin_decimal": None if tail_energy is None else str(sp.N(tail_energy, 18)),
        "tail_minor_margin_decimal": None if tail_margin is None else str(sp.N(tail_margin, 18)),
        "last_adjacent_minor_decimal": None if last_minor is None else str(sp.N(last_minor, 18)),
    }


def main() -> None:
    cases = []
    for d in range(5, 15):
        for r in range(d - 4):
            N = d + r
            for row_s in range(r + 1, N + r + 1):
                cases.append(one_case(d, r, row_s))
    assert len(cases) == 770
    high = [case for case in cases if case["m"] >= 4]
    low = [case for case in cases if case["m"] < 4]
    certified = [case for case in cases if case["tail_certificate_applicable"]]
    direct = [case for case in cases if not case["tail_certificate_applicable"]]
    assert len(high) == 713 and len(low) == 57
    assert all(case["tail_certificate_applicable"] for case in high)
    assert len(certified) == 753 and len(direct) == 17

    payload = {
        "kind": "lower_selector_schur_tail_minor_exact",
        "date": "2026-08-12",
        "status": "PASS_EXACT_753_CELL_LAST_THREE_QUOTIENT_COEFFICIENT_CERTIFICATE",
        "scope": "finite exact evidence for the all-order tail inequalities",
        "identity": (
            "For a=(h0,...,h_(m-2),0), b=(h1,...,h_(m-1),h0), "
            "EF-C^2=sum_(i<j)(a_i b_j-a_j b_i)^2."
        ),
        "tail_energy": "h_(m-3)^2+h_(m-2)^2>1 implies E>1",
        "tail_minor": (
            "(h_(m-3)h_(m-1)-h_(m-2)^2)^2>E+F-1; "
            "as one Gram-minor square this implies (E-1)(F-1)>C^2."
        ),
        "cases": len(cases),
        "degree_at_least_4_cases": len(high),
        "low_degree_cases": len(low),
        "tail_certified_cases": len(certified),
        "direct_theorem_cases_including_terminal": len(direct),
        "all_high_degree_tail_certificates": True,
        "cases_detail": cases,
        "remaining": (
            "Prove the two last-three quotient-coefficient inequalities "
            "uniformly from the path allocation and quotient recurrence."
        ),
    }
    REPORT.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    print(json.dumps({
        "status": payload["status"],
        "cases": payload["cases"],
        "degree_at_least_4_cases": payload["degree_at_least_4_cases"],
        "tail_certified_cases": payload["tail_certified_cases"],
        "source_sha256": hashlib.sha256(Path(__file__).read_bytes()).hexdigest().upper(),
        "report_sha256": hashlib.sha256(REPORT.read_bytes()).hexdigest().upper(),
        "report": str(REPORT),
    }, indent=2))


if __name__ == "__main__":
    main()
