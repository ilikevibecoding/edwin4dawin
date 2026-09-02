#!/usr/bin/env python3
"""Exact obstruction to the edge-slack + ratio-cone route for sum16.

This script does *not* exhibit a tree or forest counterexample.  It gives a
rational point satisfying every hypothesis of a proposed coefficient
relaxation (exact edge identity, the pinned high/low ratio-gap cone, the
universal extension ceiling on rho5, and the r=e-q deletion bounds) at which
the resulting lower bound is negative.  Thus that relaxation cannot prove
sum16 without another constraint coupling P to H.
"""

from __future__ import annotations

import hashlib
import json
from pathlib import Path

import sympy as sp

from prove_iso_n5_disconnected_m5_middle_interval_g1_nonadjacent import P, choose


HERE = Path(__file__).resolve().parent
OUTPUT = HERE / "iso_n5_disconnected_m5_sum16_edge_slack_ratio_obstruction_g1_nonadjacent_20260830.json"
MARKER = "OBSTRUCTED_EXACT_ISO_N5_DISCONNECTED_M5_SUM16_EDGE_SLACK_RATIO_G1_NONADJACENT"
DEPENDENCIES = {
    "prove_iso_n5_disconnected_m5_middle_interval_g1_nonadjacent.py":
        "079C32D829AA91F29B539B869FA57C946BE0DD101AE06E6B5A80A41207AECD31",
    "prove_iso_n5_disconnected_m5_sum16_sparse_active_root_g1_nonadjacent.py":
        "5DDEF125CA6AE44F3D92AD5CD69F688A85FBD4E74AA074CFA8ECECE01EDD50EE",
}


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def derive_relaxed_lower():
    n, e, r = sp.symbols("n e r", nonnegative=True)
    s = n - e
    q = e - r
    p2, p3, p4, p5, p6 = P[2:7]
    base = sp.Rational(1, 2) * (
        2 * n * p3 + n * p4 - 13 * n * p5 - 6 * n * p6
        + 2 * p2**2 + 3 * p2 * p3 - 4 * p2 * p4
        - 8 * p2 * p5 + 9 * p3**2 + 6 * p3 * p4
    )

    # H=P-S has e vertices and r=e-q edges.  If a_i are the root degrees,
    # its q attachment vertices contain one vertex from each H-component.
    # Counting d3=p3-h3 and using sum C(a_i,2)<=C(q,2), while each H-edge
    # meets at most one attachment vertex, gives the displayed upper bound.
    d3_upper = (
        choose(s, 3) + choose(s, 2) * e - (s - 1) * q
        + s * choose(e, 2) - q * (e - 1) + choose(q, 2)
        - (s - 1) * r
    )
    wedge_form = (
        choose(n, 3) - e * (n - 2) + choose(e, 2)
        - choose(e, 3) + choose(r, 2)
    )
    assert sp.expand(d3_upper - wedge_form) == 0
    d4_lower = (
        choose(s, 4) + choose(s, 3) * e - choose(s - 1, 2) * q
    )
    d5_lower = (
        choose(s, 5) + choose(s, 4) * e - choose(s - 1, 3) * q
    )
    lower = sp.expand(
        base - (n + 8 * p3) * d3_upper / 2
        + p2 * d4_lower + 3 * n * d5_lower
    )
    return (n, e, r), (base, d3_upper, d4_lower, d5_lower), lower


def main():
    for name, expected in DEPENDENCIES.items():
        assert sha256(HERE / name) == expected, name

    (n, e, r), (base, d3_upper, d4_lower, d5_lower), lower = derive_relaxed_lower()
    values = {n: 13, e: 7, r: 6}
    s_value = values[n] - values[e]
    q_value = values[e] - values[r]
    assert (s_value, q_value) == (6, 1)

    rho = tuple(sp.Rational(value, 13) for value in (284, 271, 258, 245, 208))
    products = 1
    coefficient_values = {}
    for rank, ratio in zip(range(2, 7), rho):
        products *= ratio
        coefficient_values[P[rank]] = sp.factor(
            values[n] * products / (2 ** (rank - 1) * sp.factorial(rank))
        )
    expected_coefficients = {
        P[2]: 71,
        P[3]: sp.Rational(19241, 78),
        P[4]: sp.Rational(827363, 1352),
        P[5]: sp.Rational(40540787, 35152),
        P[6]: sp.Rational(40540787, 26364),
    }
    assert coefficient_values == expected_coefficients
    assert coefficient_values[P[2]] == choose(13, 2) - 7

    deltas = tuple(sp.factor(rho[index] - rho[index + 1]) for index in range(4))
    assert deltas == (1, 1, 1, sp.Rational(37, 13))
    assert all(delta >= 1 for delta in deltas)  # pinned high cone
    # It is simultaneously on the low cone with alpha=1:
    # delta1=alpha, delta2=2-alpha, delta3,delta4>=1.
    assert deltas[0] == 1 and deltas[1] == 2 - 1
    assert rho[4] == 2 * (13 - 5)  # universal extension ceiling

    deletion_values = tuple(sp.factor(expression.subs(values)) for expression in (
        d3_upper, d4_lower, d5_lower
    ))
    assert deletion_values == (210, 145, 101)
    obstruction = sp.factor(lower.subs({**values, **coefficient_values}))
    assert obstruction == -sp.Rational(212245153, 210912)
    assert obstruction < 0

    report = {
        "marker": MARKER,
        "status": "EXACT_RELAXATION_OBSTRUCTION_NOT_A_GRAPH_COUNTEREXAMPLE",
        "proposed_lower_bound": str(sp.factor(lower)),
        "sum16_base": str(sp.factor(base)),
        "structural_slack": {
            "identity": "r=e-q=e(H)",
            "d3_upper": str(sp.factor(d3_upper)),
            "d4_lower": str(sp.factor(d4_lower)),
            "d5_lower": str(sp.factor(d5_lower)),
        },
        "rational_obstruction_point": {
            "n": 13,
            "e_P": 7,
            "s_components": 6,
            "r_eH": 6,
            "q_attachments": 1,
            "rho1_through_rho5": [str(value) for value in rho],
            "delta1_through_delta4": [str(value) for value in deltas],
            "p2_through_p6": [str(coefficient_values[P[index]]) for index in range(2, 7)],
            "d3_upper_d4_lower_d5_lower": [str(value) for value in deletion_values],
            "relaxed_lower_value": str(obstruction),
        },
        "satisfied_hypotheses": [
            "p2=binom(n,2)-e(P)",
            "rho1-rho2>=1, rho2-rho3>=1, rho3-rho4>=1, rho4-rho5>=1",
            "also the low cone with alpha=1",
            "rho5<=2(n-5), with equality",
            "0<=r=e-q<=e-1",
            "the exact r-coupled d3 upper and d4,d5 lower bounds",
        ],
        "strict_warning": (
            "The rational p3,...,p6 values are not asserted to be the independent-"
            "set coefficients of any forest.  This is not a counterexample to sum16, "
            "M5, g1, N5, or Erdos Problem 993.  It proves only that the listed "
            "relaxation is too broad.  At q=1 the actual geometry forces P to be "
            "one rooted tree on e+1 vertices together with s-1 isolated vertices, "
            "a coupling absent from this coefficient box."
        ),
        "pinned_dependencies": DEPENDENCIES,
        "source_sha256": sha256(Path(__file__)),
    }
    raw = json.dumps(report, indent=2, sort_keys=True) + "\n"
    OUTPUT.write_text(raw, encoding="utf-8", newline="\n")
    print(json.dumps({
        "marker": MARKER,
        "relaxed_lower_value": str(obstruction),
        "source_sha256": report["source_sha256"],
        "report_sha256": sha256(OUTPUT),
    }, indent=2), flush=True)
    print(MARKER, flush=True)


if __name__ == "__main__":
    main()
