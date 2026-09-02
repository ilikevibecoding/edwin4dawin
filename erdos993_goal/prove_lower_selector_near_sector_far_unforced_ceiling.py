#!/usr/bin/env python3
"""Exact replay for the far-unforced near-sector ceiling theorem.

The proof in the companion note is all-order.  This replay checks its exact
coefficient identities, the four natural-coordinate charts, and a bounded
transcription audit.  The bounded counts are evidence only; they are not used
as the proof of the theorem.
"""

from __future__ import annotations

from fractions import Fraction
import hashlib
import json
from math import comb
from pathlib import Path

from verify_lower_selector_near_sector_coefficient_response import (
    response_coefficient,
)


HERE = Path(__file__).resolve().parent
REPORT = HERE / "lower_selector_near_sector_far_unforced_ceiling_exact_20260813.json"


def binom(n: int, k: int) -> int:
    return comb(n, k) if n >= 0 and 0 <= k <= n else 0


def d_power_coeff(power: int, degree: int) -> int:
    """[x^degree] D(x)^power for D=x(3-x)/(1-x)^2.

    Since D(x)=sum_(n>=1)(2n+1)x^n, this recurrence is manifestly
    positive and avoids any cancellation.
    """
    if power == 0:
        return int(degree == 0)
    row = [0] * (degree + 1)
    row[0] = 1
    for _ in range(power):
        nxt = [0] * (degree + 1)
        for old_degree, value in enumerate(row):
            if not value:
                continue
            for added in range(1, degree - old_degree + 1):
                nxt[old_degree + added] += value * (2 * added + 1)
        row = nxt
    return row[degree]


def active_weight(j: int, h: int, ell: int) -> int:
    """The positive weight w_(j,h,ell) in the active-box expansion."""
    if not 0 <= ell <= h:
        return 0
    return binom(j + ell, j) * sum(
        d_power_coeff(ell, degree)
        * binom(2 * j + h - degree, h - degree)
        for degree in range(h + 1)
    )


def active_response_coefficient(R: int, s: int, h: int) -> int:
    """sum_ell w_(j,h,ell) binom(R,j+ell), j=s-2h."""
    j = s - 2 * h
    if not 0 <= j <= R:
        return 0
    return sum(
        active_weight(j, h, ell) * binom(R, j + ell)
        for ell in range(h + 1)
    )


def chart_values(m: int, e: int, sigma: int, g: int) -> tuple[int, int, int, int, int]:
    s = 2 * m - 4 + sigma
    R = s + 2 * g - 5
    kappa = 3 - sigma - e
    K = 2 * s + kappa
    y = 2 * g - 4
    return s, R, K, kappa, y


def phi(s: int, kappa: int, y: int) -> int:
    """Cleared form of K-q_0, with positive denominator y(y+1)."""
    return (2 * s + kappa - 1) * y * y + (kappa - 1) * y - s * (s + 1)


def exact_identity_audit() -> dict[str, int]:
    coefficient_checks = 0
    ratio_bound_checks = 0
    for R in range(4, 22):
        for s in range(0, R + 1):
            q0 = Fraction((R + 2) * (R + 1), (R + 2 - s) * (R + 1 - s))
            for h in range(s // 2 + 1):
                direct = response_coefficient(R, s, h)
                active = active_response_coefficient(R, s, h)
                assert direct == active
                direct_plus = response_coefficient(R + 2, s, h)
                active_plus = active_response_coefficient(R + 2, s, h)
                assert direct_plus == active_plus
                coefficient_checks += 2
                if direct:
                    assert Fraction(direct_plus, direct) <= q0
                    ratio_bound_checks += 1
    return {
        "active_box_coefficient_checks": coefficient_checks,
        "response_ratio_bound_checks": ratio_bound_checks,
    }


def finite_chart_audit(max_d: int = 50) -> dict[str, object]:
    charts = ((0, 0), (1, 0), (1, 1), (2, 1))
    near_unforced = 0
    theorem_cells = 0
    simple_corollary_cells = 0
    direct_response_checks = 0
    by_chart: dict[str, dict[str, int]] = {}

    for e, sigma in charts:
        chart_total = chart_theorem = 0
        for m in range(7, 1000):
            d = 2 * m - e
            if d > max_d:
                break
            g_min = 4 - e if sigma == 0 else 3 - e
            g_max = 2 * m - 2 * e - (1 if sigma == 0 else 2)
            for g in range(g_min, g_max + 1):
                s, R, K, kappa, y = chart_values(m, e, sigma, g)
                chart_total += 1
                near_unforced += 1
                if g < 3 or phi(s, kappa, y) <= 0:
                    continue

                # The theorem gives coefficientwise positivity.  Reconstruct
                # the complete response independently in exact integers.
                c = [response_coefficient(R, s, h) for h in range(s // 2 + 1)]
                c_plus = [
                    response_coefficient(R + 2, s, h)
                    for h in range(s // 2 + 1)
                ]
                assert all(K * left > right for left, right in zip(c, c_plus))
                assert sum((K * left - right) * K**h for h, (left, right) in enumerate(zip(c, c_plus))) > 0
                direct_response_checks += len(c)
                theorem_cells += 1
                chart_theorem += 1
                if y * y >= s:
                    simple_corollary_cells += 1

        by_chart[f"e={e},sigma={sigma}"] = {
            "near_unforced_cells": chart_total,
            "theorem_cells": chart_theorem,
        }

    assert max_d != 50 or (near_unforced, theorem_cells, simple_corollary_cells) == (
        2098,
        1947,
        1895,
    )
    return {
        "scope": f"finite exact transcription through d<={max_d}; not the proof",
        "near_unforced_cells": near_unforced,
        "theorem_cells": theorem_cells,
        "simple_y_squared_at_least_s_cells": simple_corollary_cells,
        "fraction_closed": str(Fraction(theorem_cells, near_unforced)),
        "direct_response_coefficient_checks": direct_response_checks,
        "by_chart": by_chart,
    }


def sharpened_bound_audit() -> dict[str, int]:
    """Check the all-order identities behind the remaining response route.

    These identities are proved coefficientwise in the note.  This audit is
    only a compact replay over small symbolic integer parameters.
    """
    ratio_checks = 0
    growth_checks = 0
    for R in range(4, 24):
        for s in range(R + 1):
            coefficients = [response_coefficient(R, s, h) for h in range(s // 2 + 1)]
            coefficients_plus = [
                response_coefficient(R + 2, s, h) for h in range(s // 2 + 1)
            ]
            for h, value in enumerate(coefficients):
                if not value:
                    continue
                upper = Fraction(
                    (R + 2) * (R + 1),
                    (R + 2 - s + h) * (R + 1 - s + h),
                )
                assert Fraction(coefficients_plus[h], value) <= upper
                ratio_checks += 1
                if h + 1 >= len(coefficients) or not coefficients[h + 1]:
                    continue
                j = s - 2 * h
                if j < 2:
                    continue
                lower = Fraction(
                    j * (j - 1) * (2 * R + 1),
                    (R - j + 2) * (R - j + 1) * (h + 1),
                )
                assert Fraction(coefficients[h + 1], value) >= lower
                growth_checks += 1
    return {
        "sharpened_response_ratio_checks": ratio_checks,
        "successive_coefficient_growth_checks": growth_checks,
    }


def main() -> None:
    identities = exact_identity_audit()
    sharpened = sharpened_bound_audit()
    finite = finite_chart_audit()
    payload = {
        "kind": "lower_selector_near_sector_far_unforced_ceiling_theorem",
        "date": "2026-08-13",
        "status": "PASS_EXACT_FAR_UNFORCED_NEAR_SECTOR_CEILING_THEOREM_REPLAY",
        "all_order_theorem": {
            "range": "unforced near-sector chart, m>=7, g>=3",
            "condition": "Phi=(2*s+kappa-1)*y^2+(kappa-1)*y-s*(s+1)>0",
            "parameters": "y=2*g-4, kappa=3-sigma-e, K=2*s+kappa",
            "conclusion": "every coefficient of K*G_(N-2,s)-G_(N-1,s) is positive",
            "simple_sufficient_condition": "y^2>=s",
        },
        "exact_identity_audit": identities,
        "sharpened_bound_audit": sharpened,
        "finite_audit": finite,
        "scope_warning": (
            "The theorem proves the selector ceiling and hence the real-anchor "
            "orientation in this subregion.  The rotating-sector continuation "
            "is a separate remaining obligation."
        ),
    }
    payload["source_sha256"] = hashlib.sha256(Path(__file__).read_bytes()).hexdigest().upper()
    REPORT.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    print(payload["status"])
    print("identity_checks", identities)
    print("finite_audit", finite)
    print("source_sha256", payload["source_sha256"])
    print("report", REPORT)


if __name__ == "__main__":
    main()
