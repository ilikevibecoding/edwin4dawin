#!/usr/bin/env python3
"""Certify the bottom two-layer lift at rank distances s=0,1,2.

This consumes the exact formulas produced by
``prove_path_isolate_p4_bottom_edge_first_rank_lifts.py`` and checks
R_epsilon(m+1,s,x)-R_epsilon(m,s,x) coefficientwise after m=3+k.
"""

from __future__ import annotations

import hashlib
import json
from pathlib import Path

import sympy as sp


def main() -> None:
    source_path = Path(
        "path_isolate_p4_bottom_edge_first_rank_lifts_"
        "20260730.json"
    )
    source = json.loads(source_path.read_text(encoding="utf-8"))
    k, x = sp.symbols(
        "k x", integer=True, nonnegative=True
    )
    certificates = []
    for item in source["group_certificates"]:
        formula = sp.sympify(
            item["expression"],
            locals={"k": k, "x": x},
        )
        difference = sp.factor(
            sp.cancel(formula.subs(k, k + 1) - formula)
        )
        numerator, denominator = map(
            sp.factor, sp.fraction(difference)
        )
        polynomial = sp.Poly(
            sp.expand(numerator), k, x
        )
        terms = polynomial.terms()
        negative = [
            (monomial, coefficient)
            for monomial, coefficient in terms
            if coefficient < 0
        ]
        assert not negative
        canonical = "\n".join(
            f"{monomial}:{coefficient}"
            for monomial, coefficient in terms
        )
        certificates.append(
            {
                "parity_epsilon": item[
                    "parity_epsilon"
                ],
                "rank_distance_s": item[
                    "rank_distance_s"
                ],
                "difference": str(difference),
                "positive_denominator": str(denominator),
                "numerator_degree_k_x": list(
                    polynomial.degree_list()
                ),
                "numerator_term_count": len(terms),
                "smallest_numerator_coefficient": min(
                    int(coefficient)
                    for _, coefficient in terms
                ),
                "negative_numerator_coefficient_count": len(
                    negative
                ),
                "numerator_sha256": hashlib.sha256(
                    canonical.encode("utf-8")
                ).hexdigest(),
            }
        )

    report = {
        "status": (
            "PASS_PATH_ISOLATE_P4_BOTTOM_FIRST_LAYER_LIFTS"
        ),
        "source_certificate": str(source_path),
        "domain": (
            "m>=3, epsilon in {0,1}, s in {0,1,2}, x>=0"
        ),
        "quantity": (
            "R_epsilon(m+1,s,x)-R_epsilon(m,s,x), "
            "where R=H/binom(2m+epsilon,m)"
        ),
        "certificates": certificates,
    }
    Path(
        "path_isolate_p4_bottom_first_layer_lifts_20260730.json"
    ).write_text(
        json.dumps(report, indent=2) + "\n",
        encoding="utf-8",
    )
    print(json.dumps(report, indent=2))


if __name__ == "__main__":
    main()
