#!/usr/bin/env python3
"""Exact all-rank q3 envelope for uniformly subdivided stars."""

from __future__ import annotations

import hashlib
import itertools
import json
import os
from pathlib import Path

import sympy as sp


ROOT = Path(__file__).resolve().parent
OUTPUT = ROOT / "uniform_subdivided_star_q3_envelope_exact_root_20260828.json"


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def symbolic_proof() -> dict[str, str]:
    d, r, t = sp.symbols("d r t", integer=True, positive=True)
    q2 = 3 * (d - 1) / (4 * d - 2)
    q3 = 5 * (d - 2) / (8 * d - 13)
    q2_cross = sp.factor(
        3 * (d - 1) * (8 * d - 13) - 5 * (d - 2) * (4 * d - 2)
    )
    assert q2_cross == 4 * d**2 - 13 * d + 19
    # The discriminant is negative, so q2_cross is positive for all real d.
    assert sp.discriminant(q2_cross, d) == -135

    q_r = (2 ** (r - 1) + 1) * t / (2**r * t + r)
    d_substitution = t + r - 1
    q3_over_qr_cross = sp.expand(
        5 * (d_substitution - 2) * (2**r * t + r)
        - (8 * d_substitution - 13) * (2 ** (r - 1) + 1) * t
    )
    expected = (
        (2**r - 8) * t**2
        + (2 ** (r - 1) * (2 * r - 9) - 3 * r + 21) * t
        + 5 * r * (r - 3)
    )
    assert sp.expand(q3_over_qr_cross - expected) == 0
    assert sp.expand(expected.subs(r, 3)) == 0
    assert sp.expand(expected.subs(r, 4)) == 8 * t**2 + t + 20
    # For r>=5, all three displayed coefficients are strictly positive:
    # 2^r-8>0; 2^(r-1)(2r-9)-3r+21 >= 2^(r-1)-3r+21>0;
    # and 5r(r-3)>0.  The middle elementary lower bound increases from r=5.
    middle_lower = 2 ** (r - 1) - 3 * r + 21
    assert middle_lower.subs(r, 5) == 22
    assert sp.simplify(middle_lower.subs(r, r + 1) - middle_lower) == 2 ** (r - 1) - 3
    return {
        "q2": str(q2),
        "q3": str(q3),
        "q2_minus_q3_cross_numerator": str(q2_cross),
        "q2_cross_discriminant": "-135",
        "q_r_for_3_le_r_le_d_with_t_d_minus_r_plus_1": str(q_r),
        "q3_minus_qr_cross_numerator": str(sp.collect(expected, t)),
        "rank4_specialization": str(8 * t**2 + t + 20),
        "rank5plus_middle_coefficient_lower_bound": str(middle_lower),
    }


def literal_audit() -> dict[str, object]:
    cases = 0
    rank_checks = 0
    minimum_cross = None
    for d in range(2, 10):
        edges = []
        for arm in range(d):
            middle = 1 + arm
            leaf = 1 + d + arm
            edges.extend(((0, middle), (middle, leaf)))
        n = 2 * d + 1
        edge_sets = tuple(frozenset(edge) for edge in edges)

        def induced_edges(chosen: tuple[int, ...]) -> int:
            selected = frozenset(chosen)
            return sum(edge <= selected for edge in edge_sets)

        independent = [0] * (d + 2)
        one_edge = [0] * (d + 3)
        for size in range(d + 2):
            for chosen in itertools.combinations(range(n), size):
                induced = induced_edges(chosen)
                independent[size] += induced == 0
                if induced == 1 and size < len(one_edge):
                    one_edge[size] += 1
        q3_num = one_edge[4]
        q3_den = 3 * independent[3]
        for rank in range(2, d + 2):
            slides = one_edge[rank + 1] if rank + 1 < len(one_edge) else 0
            formula_i = sp.binomial(d, rank) * 2**rank + sp.binomial(d, rank - 1)
            formula_s = d * sp.binomial(d - 1, rank - 1) * (2 ** (rank - 1) + 1)
            assert independent[rank] == int(formula_i)
            assert slides == int(formula_s)
            if rank >= 3:
                cross = q3_num * rank * independent[rank] - q3_den * slides
                assert cross >= 0
                minimum_cross = cross if minimum_cross is None else min(minimum_cross, cross)
                rank_checks += 1
        cases += 1
    return {
        "arm_counts": [2, 9],
        "trees": cases,
        "rank_checks": rank_checks,
        "minimum_cross_margin": minimum_cross,
    }


def main() -> None:
    proof = symbolic_proof()
    audit = literal_audit()
    payload = {
        "schema": "uniform-subdivided-star-q3-envelope-root-v1",
        "status": "PASS_EXACT_ALL_RANK_UNIFORM_SUBDIVIDED_STAR_Q3_ENVELOPE_THEOREM",
        "theorem": (
            "For the tree obtained by subdividing every edge of K_{1,d} once, "
            "d>=2, every supported rank satisfies q_r<=q3<=q2."
        ),
        "generating_functions": {
            "A_zero_edge": "(1+2x)^d+x(1+x)^d",
            "B_one_edge": "d*x^2*((1+2x)^(d-1)+(1+x)^(d-1))",
        },
        "symbolic_proof": proof,
        "literal_audit": audit,
        "scope_warning": (
            "This is an all-rank theorem only for uniformly subdivided stars. "
            "It does not prove the q3 envelope for arbitrary trees or Erdos Problem 993."
        ),
        "source_sha256": sha256(Path(__file__)),
    }
    temporary = OUTPUT.with_suffix(OUTPUT.suffix + ".tmp")
    temporary.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    os.replace(temporary, OUTPUT)
    print(payload["status"])
    print("trees", audit["trees"], "rank_checks", audit["rank_checks"])
    print("source_sha256", payload["source_sha256"])
    print("report_sha256", sha256(OUTPUT))


if __name__ == "__main__":
    main()
