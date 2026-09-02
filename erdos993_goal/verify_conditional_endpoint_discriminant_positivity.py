"""Exact symbolic discriminant audit for the conditional endpoint pencil."""

from __future__ import annotations

import hashlib
import json
from math import comb
from pathlib import Path

import sympy as sp


HERE = Path(__file__).resolve().parent
REPORT = HERE / "conditional_endpoint_discriminant_positivity_exact_20260812.json"
t, u, q, c = sp.symbols("t u q c")
r = q - 1


def p(M: int, i: int) -> sp.Integer:
    return sp.Integer(comb(2 * M - i - 1, i)) if 0 <= i < M else sp.Integer(0)


def gamma(row: list[sp.Expr]) -> list[sp.Expr]:
    degree = len(row) - 1
    rem = list(map(sp.expand, row))
    out = []
    for h in range(degree // 2 + 1):
        value = rem[h]
        out.append(value)
        for j in range(degree - 2 * h + 1):
            rem[h + j] = sp.expand(rem[h + j] - value * comb(degree - 2 * h, j))
    assert all(sp.expand(x) == 0 for x in rem)
    return out


def mixed(A: list[sp.Expr], B: list[sp.Expr], s: int) -> sp.Expr:
    row = [
        A[i] * B[s - i] if i < len(A) and 0 <= s - i < len(B) else 0
        for i in range(s + 1)
    ]
    symmetric = [(row[i] + row[s - i]) / 2 for i in range(s + 1)]
    return sp.expand(sum(value * t**i for i, value in enumerate(gamma(symmetric))))


def family(N: int, s: int) -> tuple[sp.Expr, int, int]:
    P = [[p(N - j, i) for i in range(N - j)] for j in range(3)]
    U = mixed(P[0], P[0], s) + u * mixed(P[1], P[1], s)
    X = mixed(P[0], P[1], s) + u * mixed(P[1], P[2], s)
    Y = mixed(P[1], P[1], s) + u * mixed(P[2], P[2], s)
    Z = sp.expand(X + c * (U + 2 * r * X + r * r * Y))
    forced = min(power[0] for power, _ in sp.Poly(Z, t).terms())
    core = sp.cancel(Z / t**forced)
    return core, forced, int(sp.degree(core, t))


def main() -> None:
    # Exhaust every core-degree-2/3/4/5 cell in the stated finite N range.
    audit_cells = []
    for N in range(5, 16):
        for s in range(2, 2 * N - 5):
            _, _, degree = family(N, s)
            if 2 <= degree <= 5:
                audit_cells.append((N, s))
    audit_cells = sorted(set(audit_cells))

    cells = []
    total_positive = 0
    first_obstruction = None
    obstruction_disc = None
    repaired_cells = []
    for N, s in audit_cells:
        Z, forced, degree = family(N, s)
        disc = sp.Poly(sp.discriminant(Z, t), c, q, u)
        coefficients = disc.coeffs()
        negative_terms = [(mon, value) for mon, value in disc.terms() if value < 0]
        if negative_terms:
            if (N, s) == (12, 13):
                obstruction_disc = disc
            if first_obstruction is None:
                first_obstruction = {
                    "N": N, "s": s, "forced_zero_order": forced,
                    "core_degree": degree, "term_count": len(coefficients),
                    "negative_terms": [
                        {"exponents_c_q_u": list(mon), "coefficient": str(value)}
                        for mon, value in negative_terms
                    ],
                }
            expected_negative_exponents = {
                4: [(6, 11, 5), (5, 10, 5)],
                5: [(8, 15, 7), (7, 14, 7)],
            }[degree]
            assert [mon for mon, _ in negative_terms] == expected_negative_exponents
            N1 = -int(negative_terms[0][1])
            N2 = -int(negative_terms[1][1])
            assert N1 == 2 * N2

            # The two negative exponents are midpoints of the shared positive
            # exponent A and the respective partner exponents B,C.
            if degree == 4:
                exp_A, exp_B, exp_C = (6, 12, 4), (6, 10, 6), (4, 8, 6)
            else:
                exp_A, exp_B, exp_C = (8, 16, 6), (8, 14, 8), (6, 12, 8)
            def local_coefficient(exponents: tuple[int, int, int]) -> int:
                i, j, k = exponents
                return int(disc.coeff_monomial(c**i * q**j * u**k))
            A, B, C = map(local_coefficient, (exp_A, exp_B, exp_C))
            margin1 = 2 * A * B - N1 * N1
            margin2 = 2 * A * C - N2 * N2
            assert min(A, B, C, margin1, margin2) > 0
            repaired_cells.append({
                "N": N, "s": s, "forced_zero_order": forced,
                "core_degree": degree,
                "negative_exponents": [list(x) for x in expected_negative_exponents],
                "negative_magnitudes": [str(N1), str(N2)],
                "shared_positive_exponents": list(exp_A),
                "partner_positive_exponents": [list(exp_B), list(exp_C)],
                "positive_coefficients_A_B_C": [str(A), str(B), str(C)],
                "squared_margins": [str(margin1), str(margin2)],
            })
            continue
        assert coefficients and all(value > 0 for value in coefficients)
        total_positive += len(coefficients)
        cells.append({
            "N": N,
            "s": s,
            "forced_zero_order": forced,
            "core_degree": degree,
            "positive_discriminant_coefficients": len(coefficients),
            "coefficient_sha256": hashlib.sha256(
                ",".join(map(str, coefficients)).encode("ascii")
            ).hexdigest().upper(),
        })

    assert first_obstruction == {
        "N": 12,
        "s": 13,
        "forced_zero_order": 2,
        "core_degree": 4,
        "term_count": 339,
        "negative_terms": [
            {
                "exponents_c_q_u": [6, 11, 5],
                "coefficient": "-12161104935239856960000000",
            },
            {
                "exponents_c_q_u": [5, 10, 5],
                "coefficient": "-6080552467619928480000000",
            },
        ],
    }
    assert len(repaired_cells) == 12

    # Exact AM--GM repair of the two negative monomials at (12,13).
    # Split the coefficient A of c^6 q^12 u^4 equally between two pairs:
    # sqrt((c^6 q^12 u^4)(c^6 q^10 u^6)) = c^6 q^11 u^5,
    # sqrt((c^6 q^12 u^4)(c^4 q^8 u^6))  = c^5 q^10 u^5.
    assert obstruction_disc is not None
    def coefficient(exponents: tuple[int, int, int]) -> int:
        i, j, k = exponents
        return int(obstruction_disc.coeff_monomial(c**i * q**j * u**k))

    A = coefficient((6, 12, 4))
    B = coefficient((6, 10, 6))
    C = coefficient((4, 8, 6))
    N1 = -coefficient((6, 11, 5))
    N2 = -coefficient((5, 10, 5))
    margin1 = 2 * A * B - N1 * N1
    margin2 = 2 * A * C - N2 * N2
    assert min(A, B, C, N1, N2, margin1, margin2) > 0

    # Exact first resultant-collision factor.
    Z, _, _ = family(5, 2)
    P = [[p(5 - j, i) for i in range(5 - j)] for j in range(3)]
    X = mixed(P[0], P[1], 2) + u * mixed(P[1], P[2], 2)
    K = sp.expand((Z - X) / c)
    resultant = sp.factor(sp.resultant(X, K, t))
    collision = (
        (16 * u**2 + 49 * u + 39) * q**2
        - 2 * (16 * u**2 + 49 * u + 39) * q
        + 13 * u**2 + 44 * u + 31
    )
    assert sp.cancel(resultant / collision).is_number

    report = {
        "status": "EXACT_DISCRIMINANT_AUDIT_ALL_OBSTRUCTIONS_AMGM_REPAIRED",
        "range": "all core-degree-2/3/4/5 cells for 5<=N<=15",
        "cells": len(cells),
        "am_gm_repaired_cells": len(repaired_cells),
        "total_fixed_cells_proved": len(cells) + len(repaired_cells),
        "total_strictly_positive_discriminant_coefficients": total_positive,
        "by_core_degree": {
            str(d): {
                "coefficientwise_positive_cells": sum(x["core_degree"] == d for x in cells),
                "am_gm_repaired_cells": sum(
                    x["core_degree"] == d for x in repaired_cells
                ),
                "positive_coefficients": sum(
                    x["positive_discriminant_coefficients"]
                    for x in cells if x["core_degree"] == d
                ),
            }
            for d in range(2, 6)
        },
        "cells_detail": cells,
        "am_gm_repaired_cells_detail": repaired_cells,
        "first_coefficientwise_obstruction": first_obstruction,
        "am_gm_repair_of_first_obstruction": {
            "shared_positive_exponents": [6, 12, 4],
            "shared_positive_coefficient_A": str(A),
            "first_partner_exponents": [6, 10, 6],
            "first_partner_coefficient_B": str(B),
            "first_negative_exponents": [6, 11, 5],
            "first_negative_magnitude_N1": str(N1),
            "first_squared_margin_2AB_minus_N1_squared": str(margin1),
            "second_partner_exponents": [4, 8, 6],
            "second_partner_coefficient_C": str(C),
            "second_negative_exponents": [5, 10, 5],
            "second_negative_magnitude_N2": str(N2),
            "second_squared_margin_2AC_minus_N2_squared": str(margin2),
            "argument": (
                "Allocate A/2 to each partner. Weighted AM-GM gives "
                "(A/2)mA+B mB >= sqrt(2AB)mN1 >= N1 mN1 and "
                "(A/2)mA+C mC >= sqrt(2AC)mN2 >= N2 mN2."
            ),
        },
        "first_resultant_collision_factor": str(collision),
        "scope": (
            "Each listed passing fixed (N,s) discriminant is an exact symbolic polynomial "
            "with strictly positive coefficients in (c,q,u). This proves the "
            "positive-pencil theorem for those fixed cells by continuity from a "
            "real-rooted base point. Every coefficientwise-obstructed cell has exactly "
            "the displayed two negative midpoint monomials, and its exact AM-GM "
            "certificate proves pointwise discriminant positivity as well."
        ),
    }
    REPORT.write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    print(json.dumps({k: v for k, v in report.items() if k != "cells_detail"}, indent=2))


if __name__ == "__main__":
    main()
