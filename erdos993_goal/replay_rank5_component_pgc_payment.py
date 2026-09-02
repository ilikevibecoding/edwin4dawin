#!/usr/bin/env python3
"""Exact replay for the all-forest rank-five pendant PGC theorem.

For a forest G with pendant edge lp, put P=I(G) and
B=I(G-{l,p}).  This replay proves

    H_5(P) >= H_4(B)

whenever alpha(G)>=9, exactly the range where rank five belongs to the
prefix pendant cascade.  The proof combines the already-certified forest
rank-five reserve, the forest two-extension inequality, and the sharp
rank-(3,4,5) defect ceiling.
"""

from __future__ import annotations

import argparse
import hashlib
import json
from fractions import Fraction
from pathlib import Path

import sympy as sp

from replay_rank4_component_schur_payment import (
    c_polynomial,
    coeff,
    enumerate_polynomials,
    frac,
    h_reserve,
    multiply,
)


Polynomial = tuple[int, ...]
ROOT = Path(__file__).resolve().parent


def q5(poly: Polynomial) -> int:
    p4, p5, p6 = (coeff(poly, rank) for rank in (4, 5, 6))
    return 10 * p5 * p5 - p4 * p5 - 12 * p4 * p6


def v5(poly: Polynomial) -> int:
    b3, b4, b5 = (coeff(poly, rank) for rank in (3, 4, 5))
    return 7 * b3 * b4 + 55 * b3 * b5 - 32 * b4 * b4


def symbolic_certificate() -> dict[str, object]:
    p4, p5, p6, b3, b4, b5, b6, c4, c5 = sp.symbols(
        "p4 p5 p6 b3 b4 b5 b6 c4 c5", positive=True
    )
    q = 10 * p5**2 - p4 * p5 - 12 * p4 * p6
    v = 7 * b3 * b4 + 55 * b3 * b5 - 32 * b4**2
    h5 = 25 * (p5**2 - p4 * p6) / p4 + 5 * (p5 - p6)
    h4 = 16 * (b4**2 - b3 * b5) / b3 + 4 * (b4 - b5)
    decomposition = sp.factor(
        h5 - h4
        - sp.Rational(5, 2) * q / p4
        - sp.Rational(15, 2) * c4
        - v / (2 * b3)
    ).subs({p5: b4 + b5 + c4, p6: b5 + b6 + c5})
    assert decomposition == 0

    # Every forest satisfies the two-extension inequality
    #   T=5 b3 b5-4 b4^2+3 b3 b4 >=0.
    # Every forest of order at least 16 satisfies the sharp defect bound
    #   D=3575 b3 b5-2016 b4^2 >=0.
    two_extension = 5 * b3 * b5 - 4 * b4**2 + 3 * b3 * b4
    defect = 3575 * b3 * b5 - 2016 * b4**2
    high_remainder = sp.factor(v - 11 * two_extension)
    low_remainder = sp.factor(v - sp.Rational(55, 3575) * defect)
    assert sp.expand(high_remainder - 2 * b4 * (6 * b4 - 13 * b3)) == 0
    assert sp.expand(
        low_remainder - b4 * (5005 * b3 - 704 * b4) / 715
    ) == 0
    overlap = 5005 * 6 - 704 * 13
    assert overlap == 20878 > 0
    return {
        "pendant_decomposition": (
            "H5(P)-H4(B)=5Q5(P)/(2p4)+15c4/2+V5(B)/(2b3)"
        ),
        "V5": "7*b3*b4+55*b3*b5-32*b4^2",
        "high_ratio_case": {
            "condition": "6*b4>=13*b3",
            "input": "5*b3*b5-4*b4^2+3*b3*b4>=0",
            "remainder": str(high_remainder),
        },
        "low_ratio_case": {
            "condition": "6*b4<13*b3",
            "input": "3575*b3*b5-2016*b4^2>=0",
            "remainder": str(low_remainder),
            "threshold_overlap": overlap,
        },
    }


def finite_v5_base(forests: list[set[Polynomial]]) -> dict[str, object]:
    checks = 0
    minimum: tuple[int, int, Polynomial] | None = None
    by_order = []
    for order in range(1, 16):
        local = []
        for polynomial in forests[order]:
            if len(polynomial) - 1 < 8:
                continue
            value = v5(polynomial)
            assert value >= 0
            checks += 1
            local.append(value)
            if minimum is None or value < minimum[0]:
                minimum = (value, order, polynomial)
        by_order.append(
            {
                "order": order,
                "forest_polynomials": len(forests[order]),
                "eligible_alpha_at_least_eight": len(local),
                "minimum": min(local) if local else None,
            }
        )
    assert checks == 25_996
    assert minimum == (
        43_120,
        8,
        (1, 8, 28, 56, 70, 56, 28, 8, 1),
    )
    return {
        "scope": "all distinct forest independence polynomials of order<=15",
        "eligible_checks": checks,
        "minimum": {
            "value": minimum[0],
            "order": minimum[1],
            "polynomial": minimum[2],
        },
        "by_order": by_order,
    }


def bounded_pendant_audit(
    pairs: list[set[tuple[Polynomial, Polynomial]]],
    forests: list[set[Polynomial]],
) -> dict[str, object]:
    checks = 0
    minimum: tuple[Fraction, dict[str, object]] | None = None
    for component_order in range(2, 17):
        for component, deletion in pairs[component_order]:
            for common_order in range(17 - component_order):
                for common in forests[common_order]:
                    full = multiply(component, common)
                    reduced = multiply(deletion, common)
                    if len(full) - 1 < 9:
                        continue
                    checks += 1
                    cpoly = c_polynomial(full, reduced)
                    margin = h_reserve(full, 5) - h_reserve(reduced, 4)
                    decomposition = (
                        Fraction(5 * q5(full), 2 * coeff(full, 4))
                        + Fraction(15 * coeff(cpoly, 4), 2)
                        + Fraction(v5(reduced), 2 * coeff(reduced, 3))
                    )
                    assert margin == decomposition
                    assert q5(full) >= 0 and v5(reduced) >= 0
                    assert margin >= 0
                    if minimum is None or margin < minimum[0]:
                        minimum = (
                            margin,
                            {
                                "total_order": component_order + common_order,
                                "component_order": component_order,
                                "common_order": common_order,
                                "alpha": len(full) - 1,
                                "full": full,
                                "reduced": reduced,
                                "C": cpoly,
                                "Q5": q5(full),
                                "V5": v5(reduced),
                                "margin": frac(margin),
                            },
                        )
    assert checks == 294_045
    assert minimum is not None
    assert minimum[0] == Fraction(2_552_316, 3_953)
    return {
        "max_order": 16,
        "rank_five_pendant_checks": checks,
        "minimum": minimum[1],
        "scope": "bounded consistency audit; theorem is all-order",
    }


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--output",
        type=Path,
        default=ROOT / "rank5_component_pgc_payment_exact_20260813.json",
    )
    args = parser.parse_args()

    symbolic = symbolic_certificate()
    tree_counts, _, pairs, forests = enumerate_polynomials(16, 16)
    finite = finite_v5_base(forests)
    audit = bounded_pendant_audit(pairs, forests)
    result = {
        "status": "PASS_ALL_FOREST_RANK5_PGC_PAYMENT_THEOREM",
        "theorem": {
            "scope": (
                "every forest G with pendant edge lp and alpha(G)>=9; "
                "B=G-{l,p}"
            ),
            "statement": "H5(I(G))>=H4(I(B))",
            "symbolic_certificate": symbolic,
            "dependencies": [
                "forest two-extension inequality",
                "FOREST_RANK345_DEFECT_CEILING_2026-07-28.md",
                "RANK5_FOREST_THREE_HALVES_THEOREM_2026-07-27.md",
            ],
            "finite_V5_base": finite,
        },
        "bounded_pendant_audit": audit,
        "unlabeled_tree_counts_through_16": tree_counts[1:],
    }
    args.output.write_text(json.dumps(result, indent=2) + "\n", encoding="utf-8")
    script_hash = hashlib.sha256(Path(__file__).read_bytes()).hexdigest().upper()
    output_hash = hashlib.sha256(args.output.read_bytes()).hexdigest().upper()
    print(result["status"])
    print(f"output={args.output}")
    print(f"script_sha256={script_hash}")
    print(f"output_sha256={output_hash}")
    print(
        f"finite_V5_checks={finite['eligible_checks']} "
        f"rank5_pendant_checks={audit['rank_five_pendant_checks']} "
        f"minimum_pgc={audit['minimum']['margin']['text']}"
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
