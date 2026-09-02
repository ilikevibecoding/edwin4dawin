"""Expanded exact audit of the Cayley coefficient-variation bound.

For every corrected lower-selector Durán polynomial q in the lower diamond,
put

    C(w) = (w-1)^m q(sqrt(A) (w+1)/(w-1)).

This lightweight replay checks only the exact coefficient signs of C.  It
does not compute Schur or Sturm indices.  The all-order target suggested by
the established d<=14 equality is

    variation(coefficients(C)) <= m-2

outside the separately handled terminal degree-drop cell.

This is finite evidence, not a proof.
"""

from __future__ import annotations

import hashlib
import json
from collections import Counter
from math import comb
from pathlib import Path

from flint import fmpq

from probe_lower_selector_tail3_flint_full import (
    duran_coefficients,
    selector_gamma,
)


HERE = Path(__file__).resolve().parent
REPORT = HERE / "lower_selector_cayley_variation_bound_expanded_exact_20260812.json"


def sign_changes(signs: list[int]) -> int:
    return sum(first != second for first, second in zip(signs, signs[1:]))


def quadratic_sign(even_part: fmpq, odd_part: fmpq, a: fmpq) -> int:
    """Sign of even_part + sqrt(a)*odd_part, known to be nonzero."""

    if odd_part == 0:
        return 1 if even_part > 0 else -1
    if even_part == 0:
        return 1 if odd_part > 0 else -1
    if (even_part > 0) == (odd_part > 0):
        return 1 if even_part > 0 else -1
    norm = even_part * even_part - a * odd_part * odd_part
    assert norm != 0
    return (1 if even_part > 0 else -1) if norm > 0 else (1 if odd_part > 0 else -1)


def cayley_coefficient_signs(q: list[fmpq], a: fmpq) -> list[int]:
    """Signs in descending degree using exact arithmetic in Q(sqrt(a))."""

    m = len(q) - 1
    result: list[int] = []
    for power in range(m, -1, -1):
        even_part = fmpq(0)
        odd_part = fmpq(0)
        for k, q_k in enumerate(q):
            basis_coefficient = sum(
                comb(k, left)
                * comb(m - k, power - left)
                * (-1) ** (m - k - power + left)
                for left in range(
                    max(0, power - (m - k)),
                    min(k, power) + 1,
                )
            )
            if k % 2:
                odd_part += q_k * basis_coefficient * a ** ((k - 1) // 2)
            else:
                even_part += q_k * basis_coefficient * a ** (k // 2)
        result.append(quadratic_sign(even_part, odd_part, a))
    return result


def main() -> None:
    cases = 0
    nonterminal_cases = 0
    terminal_cases = 0
    failures: list[dict[str, int]] = []
    deficit_counts: Counter[int] = Counter()
    variation_counts: Counter[int] = Counter()

    for d in range(5, 31):
        for r in range(d - 4):
            path_n = d + r
            for row_s in range(r + 1, path_n + r + 1):
                gamma = selector_gamma(path_n, row_s)
                forced = max(0, row_s - path_n + 1)
                gamma_hat = gamma[forced:]
                m = len(gamma_hat) - 1
                outer_p = d + row_s
                effective_p = outer_p - 2 * forced
                half_p = effective_p // 2
                beta = fmpq(1 if effective_p % 2 else -1, 2)
                duran_s = half_p - m + 2
                a = fmpq(duran_s - 1) * (fmpq(duran_s - 1) + beta)
                assert a > 0

                q = duran_coefficients(outer_p - forced, gamma_hat)
                variation = sign_changes(cayley_coefficient_signs(q, a))
                cases += 1
                variation_counts[variation] += 1

                terminal = (d, r, row_s) == (5, 0, 5)
                if terminal:
                    terminal_cases += 1
                    continue

                nonterminal_cases += 1
                deficit = m - variation
                deficit_counts[deficit] += 1
                if variation > m - 2:
                    failures.append(
                        {
                            "d": d,
                            "r": r,
                            "row_s": row_s,
                            "forced": forced,
                            "m": m,
                            "variation": variation,
                        }
                    )

    assert cases == 10530
    assert terminal_cases == 1
    assert not failures
    assert min(deficit_counts) >= 2

    payload = {
        "kind": "lower_selector_cayley_variation_bound_expanded_exact",
        "date": "2026-08-12",
        "status": "PASS_EXACT_D5_TO_D30_CAYLEY_VARIATION_BOUND_AUDIT",
        "scope": "finite exact coefficient-sign evidence, not an all-order theorem",
        "d_range": [5, 30],
        "cases": cases,
        "nonterminal_cases": nonterminal_cases,
        "terminal_cases_excluded": terminal_cases,
        "bound": "variation(C)<=m-2",
        "failures": failures,
        "m_minus_variation_counts": dict(sorted(deficit_counts.items())),
        "variation_counts": dict(sorted(variation_counts.items())),
    }
    REPORT.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    source_hash = hashlib.sha256(Path(__file__).read_bytes()).hexdigest().upper()
    report_hash = hashlib.sha256(REPORT.read_bytes()).hexdigest().upper()
    print(payload["status"])
    print("source_sha256", source_hash)
    print("report_sha256", report_hash)


if __name__ == "__main__":
    main()
