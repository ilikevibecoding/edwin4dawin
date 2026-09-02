#!/usr/bin/env python3
"""Independent exact audit of the rank-eight low/low two-tail reduction."""

from __future__ import annotations

import hashlib
import json
from pathlib import Path

import sympy as sp


ROOT = Path(__file__).resolve().parent
INPUT = ROOT / "rank8_low_low_double_tail_reduction_exact_20260820.json"
REPORT = ROOT / "rank8_low_low_double_tail_reduction_independent_audit_exact_20260820.json"
EXPECTED_SOURCE = "8B9ADCA8205AF3006F17851B5DD6715A99AF8223CA89395AA3221E15DD387428"
EXPECTED_INPUT = "1DB764EF5B9600A4C69550D26662A3B6C441B709BEC02484465923B9B4C566BC"


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def expression_sha256(expression: sp.Expr) -> str:
    canonical = sp.sstr(sp.expand(expression), order="lex")
    return hashlib.sha256(canonical.encode("utf-8")).hexdigest().upper()


def main() -> None:
    assert sha256(ROOT / "analyze_rank8_low_low_double_tail_reduction.py") == EXPECTED_SOURCE
    assert sha256(INPUT) == EXPECTED_INPUT
    stored = json.loads(INPUT.read_text(encoding="utf-8"))
    assert stored["status"] == "PASS_EXACT_LOW_LOW_REDUCTION_NOT_CONE_THEOREM"
    assert len(stored["new_exact_targets"]) == 4

    h, C, D, x, y = sp.symbols("h C D x y", positive=True)
    components = {
        rank: sp.symbols(f"hh{rank} lh{rank} rh{rank} tt{rank}")
        for rank in (7, 8, 9)
    }
    row = {
        rank: hh + (1 + x) * lh + (1 + y) * rh + (1 + x) * (1 + y) * tt
        for rank, (hh, lh, rh, tt) in components.items()
    }
    value = sp.expand(8 * row[8] ** 2 - 9 * row[7] * row[9] - h * row[7] * row[8])
    px = sp.Poly(value, x)
    edge = sp.expand(px.coeff_monomial(1))
    derivative = sp.expand(px.coeff_monomial(x))
    curvature = sp.expand(px.coeff_monomial(x**2))
    assert sp.expand(value - edge - x * derivative - x**2 * curvature) == 0
    assert sp.expand(edge - value.subs(x, 0)) == 0

    rebuilt = []
    L = h / D
    for label, auxiliary in (
        ("tail_curvature", curvature),
        ("strong_payment", sp.expand(C * edge + h * derivative)),
    ):
        py = sp.Poly(auxiliary, y)
        assert py.degree() == 2
        powers = [sp.expand(py.coeff_monomial(y**degree)) for degree in range(3)]
        bernstein = [
            powers[0],
            sp.expand(powers[0] + L * powers[1] / 2),
            sp.expand(powers[0] + L * powers[1] + L**2 * powers[2]),
        ]
        # Independent midpoint check: for degree two, the middle Bernstein
        # coefficient is 2*P(L/2)-(P(0)+P(L))/2.
        middle_from_values = sp.expand(
            2 * auxiliary.subs(y, L / 2)
            - (auxiliary.subs(y, 0) + auxiliary.subs(y, L)) / 2
        )
        assert sp.cancel(middle_from_values - bernstein[1]) == 0
        rebuilt.append(
            {
                "auxiliary": label,
                "power_coefficient_sha256": [expression_sha256(item) for item in powers],
                "bernstein_coefficient_sha256": [
                    expression_sha256(item) for item in bernstein
                ],
            }
        )

    stored_rows = stored["bernstein_reduction"]
    assert [row["auxiliary"] for row in stored_rows] == [
        "tail_curvature",
        "strong_payment",
    ]
    for actual, expected in zip(rebuilt, stored_rows):
        assert actual["auxiliary"] == expected["auxiliary"]
        assert actual["power_coefficient_sha256"] == expected["power_coefficient_sha256"]
        assert actual["bernstein_coefficient_sha256"] == expected["bernstein_coefficient_sha256"]
        assert expected["already_paid_coefficient"] == 0
        assert expected["new_coefficients"] == [1, 2]

    # Algebraic endpoint used when the x-derivative is negative.
    M0, d = sp.symbols("M0 d")
    assert sp.cancel(M0 + h * d / C - (C * M0 + h * d) / C) == 0

    payload = {
        "schema": "rank8-low-low-double-tail-reduction-independent-audit-v1",
        "status": "PASS_INDEPENDENT_AUDIT_LOW_LOW_REDUCTION_NOT_CONE_THEOREM",
        "checks": {
            "input_hashes": "exact",
            "bidegree": [sp.Poly(value, x, y).degree(x), sp.Poly(value, x, y).degree(y)],
            "x_quadratic_remainder": "0",
            "quadratic_auxiliaries": 2,
            "new_bernstein_targets": 4,
            "midpoint_conversion_remainders": ["0", "0"],
            "strong_endpoint_remainder": "0",
        },
        "scope_warning": (
            "The four new Bernstein auxiliaries remain unsigned.  This audit "
            "therefore does not claim the low/low cone or Problem 993."
        ),
        "immutable_inputs": {
            "analyze_rank8_low_low_double_tail_reduction.py": EXPECTED_SOURCE,
            INPUT.name: EXPECTED_INPUT,
        },
        "source_sha256": sha256(Path(__file__)),
    }
    REPORT.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    print(payload["status"])
    print("SOURCE", payload["source_sha256"])
    print("REPORT", sha256(REPORT))


if __name__ == "__main__":
    main()
