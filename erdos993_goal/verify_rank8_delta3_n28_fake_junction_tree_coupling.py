#!/usr/bin/env python3
"""Exclude the exact n=28 Delta3 scalar obstruction from the tree cone.

The exclusion uses the first two motif-sensitive independence coefficients.
It is exact and local, but it does not certify the rest of the Delta3 box.
"""

from __future__ import annotations

import hashlib
import json
from pathlib import Path

import sympy as sp


def choose_poly(value: sp.Expr, rank: int) -> sp.Expr:
    return sp.prod(value - j for j in range(rank)) / sp.factorial(rank)


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def path_independent_sets(order: int, rank: int) -> int:
    if rank < 0 or order - rank + 1 < rank:
        return 0
    return int(sp.binomial(order - rank + 1, rank))


def main() -> None:
    here = Path(__file__).resolve().parent
    n, excess, tau = sp.symbols("n excess tau", integer=True, nonnegative=True)

    # For a tree, W=sum_v C(d_v,2) counts adjacent edge pairs.  Inclusion-
    # exclusion over one, two, and three edges gives the i3/i4 identities.
    # Put excess=W-(n-2)=sum_v C(d_v-1,2).  Let T3 be the number of connected
    # three-edge subtrees and tau=T3-(n-3).
    i3_general = choose_poly(n, 3) - (n - 1) * (n - 2) + (n - 2 + excess)
    i3_reduced = choose_poly(n - 2, 3) + excess
    assert sp.expand(i3_general - i3_reduced) == 0

    i4_general = (
        choose_poly(n, 4)
        - (n - 1) * choose_poly(n - 2, 2)
        + choose_poly(n - 1, 2)
        + (n - 4) * (n - 2 + excess)
        - (n - 3 + tau)
    )
    i4_reduced = choose_poly(n - 3, 4) + (n - 4) * excess - tau
    assert sp.expand(i4_general - i4_reduced) == 0

    # The normalized fake jet has c0=1/2600.  Undo that normalization.
    order = sp.Integer(28)
    c0 = sp.Rational(1, 2600)
    c2 = sp.Rational(27, 200)
    c3 = sp.S.One
    c4 = sp.Rational(173, 36)
    I2 = sp.factor(c2 / c0)
    I3 = sp.factor(c3 / c0)
    I4 = sp.factor(c4 / c0)
    assert I2 == choose_poly(order - 1, 2)
    fake_excess = sp.factor(I3 - choose_poly(order - 2, 3))
    fake_tau = sp.factor(
        choose_poly(order - 3, 4) + (order - 4) * fake_excess - I4
    )
    assert fake_excess == 0
    assert fake_tau == sp.Rational(1400, 9)

    # excess=sum C(d_v-1,2)=0 forces every degree at most two.  A connected
    # tree with maximum degree two is P_n, for which tau=0 and
    # i_k=C(n-k+1,k).  The fake c4 is therefore impossible.
    path_I4 = choose_poly(order - 3, 4)
    path_x = sp.factor(I3 / path_I4)
    fake_x = sp.factor(c3 / c4)
    assert path_I4 == 12650
    assert path_x == sp.Rational(52, 253)
    assert fake_x == sp.Rational(36, 173)
    assert fake_x != path_x

    # The terminal identity uses h_j=i_j(A-q).  Once A=P28 is forced, deleting
    # a root q leaves P_l disjoint union P_(27-l).  Check all 28 placements by
    # the closed path formula, without a tree census.
    deletion_rows = []
    for left_order in range(int(order)):
        right_order = int(order) - 1 - left_order
        row = []
        for rank in (6, 7):
            value = sum(
                path_independent_sets(left_order, left_rank)
                * path_independent_sets(right_order, rank - left_rank)
                for left_rank in range(rank + 1)
            )
            row.append(value)
        deletion_rows.append(tuple(row))
    minimum_h6 = min(row[0] for row in deletion_rows)
    minimum_h7 = min(row[1] for row in deletion_rows)
    assert minimum_h6 == 74613
    assert minimum_h7 == 116280
    fake_h6 = sp.Rational(145810801, 9644670)
    fake_h7 = sp.S.Zero
    fake_H6 = sp.factor(fake_h6 / c0)
    fake_H7 = sp.factor(fake_h7 / c0)
    assert fake_H6 < minimum_h6
    assert fake_H7 < minimum_h7

    # Integrality gives a small but exact stability strip at this order: a
    # nonpath tree has excess>=1, hence w=i2/i3 is at most 351/2601.
    path_w = sp.factor(I2 / I3)
    next_w = sp.factor(I2 / (I3 + 1))
    stability_gap = sp.factor(path_w - next_w)
    assert path_w == sp.Rational(27, 200)
    assert next_w == sp.Rational(39, 289)
    assert stability_gap == sp.Rational(3, 57800)

    reduction_report = here / "rank8_q8_terminal_delta3_bounded_reduction_exact_20260820.json"
    reduction_hash = sha256(reduction_report)
    assert reduction_hash == "EBEF5AF8A1AF594C6C701C5A340F1F56595616F7A5EF0A53197CBE6D0DA9CC26"

    payload = {
        "status": "PASS_EXACT_TREE_COUPLING_EXCLUDES_N28_DELTA3_FAKE_JUNCTION",
        "scope": (
            "excludes the recorded n=28 scalar-relaxation point from actual tree "
            "coefficient jets; does not prove the surrounding Delta3 box"
        ),
        "tree_motif_identities": {
            "excess": "sum_v C(deg(v)-1,2) = W-(n-2)",
            "T3": (
                "sum_v C(deg(v),3) + sum_{uv in E}(deg(u)-1)(deg(v)-1)"
            ),
            "tau": "T3-(n-3)",
            "i3": "C(n-2,3)+excess",
            "i4": "C(n-3,4)+(n-4)*excess-tau",
        },
        "fake_unnormalized_coefficients": {
            "i2": str(I2),
            "i3": str(I3),
            "i4": str(I4),
            "inferred_excess": str(fake_excess),
            "inferred_tau": str(fake_tau),
        },
        "exclusion": {
            "reason": (
                "excess=0 forces maximum degree at most two, hence the tree is P28; "
                "P28 has i4=12650 and x=52/253, not the fake values"
            ),
            "path_i4": str(path_I4),
            "path_x": str(path_x),
            "fake_x": str(fake_x),
            "secondary_integrality_control": "fake inferred tau=1400/9 is not an integer motif count",
        },
        "root_deletion_strengthening": {
            "identity_input": "h_j=i_j(A-q)",
            "forced_core": "A=P28",
            "placement_formula": (
                "A-q=P_l disjoint union P_(27-l), with "
                "i_r(P_s)=C(s-r+1,r)"
            ),
            "placements_checked": len(deletion_rows),
            "minimum_actual_H6": str(minimum_h6),
            "minimum_actual_H7": str(minimum_h7),
            "fake_unnormalized_H6": str(fake_H6),
            "fake_unnormalized_H7": str(fake_H7),
            "consequence": (
                "every rooted placement is separated from the fake root jet; "
                "in particular H7 cannot vanish"
            ),
        },
        "n28_discrete_stability_strip": {
            "path_w": str(path_w),
            "largest_possible_nonpath_w_from_excess_integrality": str(next_w),
            "excluded_gap": str(stability_gap),
        },
        "dependency": {
            "report": reduction_report.name,
            "sha256": reduction_hash,
        },
        "warning": (
            "This removes one exact fake point, all 28 rooted path placements, and an "
            "endpoint strip. A quantitative joint bound on excess, tau, and the rooted "
            "deletion coefficients is still needed for the full lower junction."
        ),
    }
    output = here / "rank8_delta3_n28_fake_junction_tree_coupling_exact_20260820.json"
    output.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    print(payload["status"])
    print("script_sha256", sha256(Path(__file__)))
    print("report_sha256", sha256(output))


if __name__ == "__main__":
    main()
