#!/usr/bin/env python3
"""Independent exact audit of the subdivided-star ratio obstruction.

The producer is hash-pinned but never imported or executed.  This auditor
reconstructs the zero/one-induced-edge tree DP, the closed forms, the raw
token-slide cross margins, and minimum d=18 inside the uniform family.
"""

from __future__ import annotations

from fractions import Fraction
import hashlib
import json
import math
from pathlib import Path


ROOT = Path(__file__).resolve().parent
PRODUCER = ROOT / "verify_token_sliding_ratio_subdivided_star_obstruction_root.py"
PRODUCER_REPORT = ROOT / "token_sliding_ratio_subdivided_star_obstruction_exact_root_20260828.json"
PRODUCER_NOTE = ROOT / "TOKEN_SLIDING_RATIO_SUBDIVIDED_STAR_OBSTRUCTION_2026-08-28.md"
OUTPUT = ROOT / "token_sliding_ratio_subdivided_star_obstruction_independent_audit_20260828.json"

PINNED = {
    PRODUCER: "5F93DF8BB70F39A9DE1D91B39C0905FA654DA1D36855C45A5A6D0D646BDC2C73",
    PRODUCER_REPORT: "5570DCBD4EC443B17861240AE38B2692D8E73EE9903207060DAB2EF85C22F19A",
    PRODUCER_NOTE: "0B11F1E57309FFE7945143E4BECE9BCB26F5C85D886C6FE68DFF48FBD176029C",
}
EXPECTED_PRODUCER_STATUS = (
    "COUNTEREXAMPLE_EXACT_TOKEN_SLIDING_RATIO_MONOTONICITY_SUBDIVIDED_STAR"
)


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def add(left: list[int], right: list[int]) -> list[int]:
    out = [0] * max(len(left), len(right))
    for index, value in enumerate(left):
        out[index] += value
    for index, value in enumerate(right):
        out[index] += value
    while len(out) > 1 and out[-1] == 0:
        out.pop()
    return out


def multiply(left: list[int], right: list[int]) -> list[int]:
    out = [0] * (len(left) + len(right) - 1)
    for i, a in enumerate(left):
        for j, b in enumerate(right):
            out[i + j] += a * b
    return out


def subdivided_star(d: int) -> list[list[int]]:
    """Center 0, roots 1..d, leaves d+1..2d."""
    adjacency = [[] for _ in range(2 * d + 1)]
    for index in range(d):
        root = 1 + index
        leaf = 1 + d + index
        for left, right in ((0, root), (root, leaf)):
            adjacency[left].append(right)
            adjacency[right].append(left)
    return adjacency


def zero_one_edge_dp(adjacency: list[list[int]]) -> tuple[list[int], list[int]]:
    """Return counts A_k (zero induced edges) and B_k (one induced edge)."""

    def visit(vertex: int, parent: int):
        # E/I indicate whether the root is excluded/included.  The suffix 0/1
        # is the exact number of induced edges, truncating all terms above one.
        e0, e1 = [1], [0]
        i_product0, i_product1 = [1], [0]
        for child in adjacency[vertex]:
            if child == parent:
                continue
            ce0, ce1, ci0, ci1 = visit(child, vertex)

            # Root excluded: the child may be excluded or included, and no
            # connecting edge is created.
            factor0 = add(ce0, ci0)
            factor1 = add(ce1, ci1)
            old0, old1 = e0, e1
            e0 = multiply(old0, factor0)
            e1 = add(multiply(old1, factor0), multiply(old0, factor1))

            # Root included: a child included with zero internal edges creates
            # the unique connecting edge; a child excluded may carry the one
            # internal edge.
            factor0 = ce0
            factor1 = add(ce1, ci0)
            old0, old1 = i_product0, i_product1
            i_product0 = multiply(old0, factor0)
            i_product1 = add(
                multiply(old1, factor0), multiply(old0, factor1)
            )

        return e0, e1, [0] + i_product0, [0] + i_product1

    e0, e1, i0, i1 = visit(0, -1)
    return add(e0, i0), add(e1, i1)


def binomial_polynomial(scale: int, degree: int) -> list[int]:
    return [scale**rank * math.comb(degree, rank) for rank in range(degree + 1)]


def closed_forms(d: int) -> tuple[list[int], list[int]]:
    # A=(1+2x)^d+x(1+x)^d.
    independence = binomial_polynomial(2, d)
    shifted = [0] + binomial_polynomial(1, d)
    independence = add(independence, shifted)

    # B=d*x^2*((1+2x)^(d-1)+(1+x)^(d-1)).
    core = add(binomial_polynomial(2, d - 1), binomial_polynomial(1, d - 1))
    one_edge = [0, 0] + [d * value for value in core]
    return independence, one_edge


def sign_factor(d: int, rank: int) -> int:
    t = d - rank + 1
    return (
        2 ** (rank - 1) * (2 * t * t - (rank + 1) * t + 2 * rank)
        + t
        + rank
    )


def comparison(d: int, rank: int, independence: list[int], one_edge: list[int]) -> dict:
    t = d - rank + 1
    s_lower = one_edge[rank + 1]
    s_upper = one_edge[rank + 2]
    lower_denominator = rank * independence[rank]
    upper_denominator = (rank + 1) * independence[rank + 1]
    cross = s_lower * upper_denominator - s_upper * lower_denominator
    factor = sign_factor(d, rank)
    factored_cross = Fraction(rank, t) * math.comb(d, rank) ** 2 * factor
    assert factored_cross.denominator == 1
    assert cross == factored_cross.numerator
    return {
        "lower_rank": rank,
        "upper_rank": rank + 1,
        "i_lower": independence[rank],
        "i_upper": independence[rank + 1],
        "s_lower": s_lower,
        "s_upper": s_upper,
        "lower_ratio": str(Fraction(s_lower, lower_denominator)),
        "upper_ratio": str(Fraction(s_upper, upper_denominator)),
        "difference": str(
            Fraction(s_lower, lower_denominator)
            - Fraction(s_upper, upper_denominator)
        ),
        "cross_margin": cross,
        "reduced_sign_factor": factor,
        "cross_factor_identity": (
            "C=(r/t)*binom(d,r)^2*P, "
            "P=2^(r-1)*(2t^2-(r+1)t+2r)+t+r"
        ),
    }


def brute_small(adjacency: list[list[int]]) -> tuple[list[int], list[int]]:
    n = len(adjacency)
    zero = [0] * (n + 1)
    one = [0] * (n + 1)
    for mask in range(1 << n):
        edges = 0
        for left in range(n):
            if not (mask >> left) & 1:
                continue
            for right in adjacency[left]:
                if left < right and (mask >> right) & 1:
                    edges += 1
                    if edges > 1:
                        break
            if edges > 1:
                break
        if edges == 0:
            zero[mask.bit_count()] += 1
        elif edges == 1:
            one[mask.bit_count()] += 1
    while len(zero) > 1 and zero[-1] == 0:
        zero.pop()
    while len(one) > 1 and one[-1] == 0:
        one.pop()
    return zero, one


def main() -> None:
    observed = {str(path.name): sha256(path) for path in PINNED}
    for path, expected in PINNED.items():
        assert observed[path.name] == expected
    producer_report = json.loads(PRODUCER_REPORT.read_text(encoding="utf-8"))
    assert producer_report["status"] == EXPECTED_PRODUCER_STATUS
    assert producer_report["source_sha256"] == PINNED[PRODUCER]

    # Literal subset replay for small family members, then an independent tree
    # DP versus the two closed forms well beyond the witness.
    brute_replays = 0
    for d in range(1, 7):
        adjacency = subdivided_star(d)
        assert brute_small(adjacency) == zero_one_edge_dp(adjacency)
        brute_replays += 1

    dp_replays = 0
    for d in range(1, 41):
        assert zero_one_edge_dp(subdivided_star(d)) == closed_forms(d)
        dp_replays += 1

    # Exact analytic minimum inside the family.  Put t=d-r+1.  The bracket
    # in P is F_d(t)=3t^2-(d+4)t+2d+2.  For d<=17,
    # F_d(t)=3(t-3)(t-4)+(17-d)(t-2)>=0 at every integer t>=2.
    for d in range(1, 18):
        for rank in range(2, d):
            assert sign_factor(d, rank) > 0
    failures_d18 = [
        rank for rank in range(2, 18) if sign_factor(18, rank) < 0
    ]
    assert failures_d18 == [15, 16]

    d = 18
    independence, one_edge = closed_forms(d)
    comparisons = [comparison(d, rank, independence, one_edge) for rank in failures_d18]
    assert [row["cross_margin"] for row in comparisons] == [
        -81_772_943_040,
        -4_088_647_152,
    ]

    n = 2 * d + 1
    w = math.comb(n - 2, 2)
    degree_surplus = math.comb(d - 1, 2)
    m2 = w - degree_surplus
    averaged = []
    for rank in (15, 16, 17):
        slides = one_edge[rank + 1]
        margin = rank * m2 * independence[rank] - w * slides
        assert margin > 0
        averaged.append(
            {
                "rank": rank,
                "W": w,
                "m2": m2,
                "i_rank": independence[rank],
                "s_rank": slides,
                "margin": margin,
            }
        )

    q2 = Fraction(one_edge[3], 2 * independence[2])
    assert q2 == Fraction(m2, independence[2])
    assert all(
        Fraction(one_edge[rank + 1], rank * independence[rank]) <= q2
        for rank in range(2, len(independence))
        if rank + 1 < len(one_edge) and independence[rank]
    )

    report = {
        "schema": "token-sliding-ratio-subdivided-star-obstruction-independent-audit-v1",
        "status": "PASS_INDEPENDENT_EXACT_TOKEN_SLIDING_RATIO_SUBDIVIDED_STAR_COUNTEREXAMPLE_AUDIT",
        "audit_source_sha256": sha256(Path(__file__)),
        "pinned_inputs": observed,
        "producer_status": producer_report["status"],
        "independent_replays": {
            "literal_subset_family_members": brute_replays,
            "zero_one_edge_dp_family_members": dp_replays,
        },
        "closed_forms": {
            "A": "(1+2x)^d+x(1+x)^d",
            "B": "d*x^2*((1+2x)^(d-1)+(1+x)^(d-1))",
            "s_r": "B_[r+1]=d*(1+2^(r-1))*binom(d-1,r-1)",
            "q_r": "(2^(r-1)+1)/(2^r+r/(d-r+1))",
            "cross": (
                "C_(d,r)=(r/t)*binom(d,r)^2*P_(d,r), t=d-r+1, "
                "P=2^(r-1)*(2t^2-(r+1)t+2r)+t+r"
            ),
        },
        "minimum_within_uniform_family": {
            "proof": (
                "For d<=17 and integer t>=2, the bracket "
                "F_d(t)=3t^2-(d+4)t+2d+2 equals "
                "3(t-3)(t-4)+(17-d)(t-2)>=0. Thus P>0. "
                "At d=18, precisely t=4,3 (r=15,16) give P=-32749."
            ),
            "no_failure_through_d": 17,
            "first_failure_d": 18,
            "first_failure_order": 37,
            "failure_ranks": failures_d18,
        },
        "witness": {
            "d": d,
            "order": n,
            "independence_sequence": independence,
            "one_induced_edge_sequence": one_edge,
            "comparisons": comparisons,
            "actual_averaged_checks": averaged,
            "q2": str(q2),
            "all_supported_qr_at_most_q2": True,
        },
        "scope_warning": (
            "This exactly refutes adjacent-rank monotonicity of "
            "s_r/(r*i_r), and only that auxiliary route. The witness passes "
            "the actual averaged component-surplus inequalities at the failed "
            "ranks, satisfies q_r<=q_2 at every supported rank, and is not a "
            "counterexample to forest independence unimodality or Erdos 993."
        ),
    }
    OUTPUT.write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    print(report["status"])
    print("cross_margins", [row["cross_margin"] for row in comparisons])
    print("averaged_margins", [row["margin"] for row in averaged])
    print("audit_source_sha256", sha256(Path(__file__)))
    print("audit_report_sha256", sha256(OUTPUT))


if __name__ == "__main__":
    main()
