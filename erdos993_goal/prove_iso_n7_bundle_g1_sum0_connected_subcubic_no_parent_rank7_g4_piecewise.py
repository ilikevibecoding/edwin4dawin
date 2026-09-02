#!/usr/bin/env python3
"""Exact connected-subcubic tail theorem for common0/sum0 no-parent G1.

The signed-support decomposition is exact through the only ranks used by G1.
For a connected subcubic tree its entire degree sequence is controlled by the
number of cubic vertices.  The only remaining order-four parameter is P4.
The frozen support-direction lemma permits the actual D6,D7,D8 corrections to
be increased to their common induced-2K2 extension ceilings, which lowers G1.
The resulting three-variable lower polynomial has an exact tensor-Bernstein
certificate from order 320 onward.
"""

from __future__ import annotations

import hashlib
import json
from pathlib import Path

import sympy as sp

from prove_iso_n6_bundle_g4_marked_edge_bernstein_g1_bernstein import (
    certify_bernstein,
)


HERE = Path(__file__).resolve().parent
OUTPUT = HERE / (
    "iso_n7_bundle_g1_sum0_connected_subcubic_no_parent_exact_"
    "rank7_g4_piecewise_20260831.json"
)
MARKER = (
    "PASS_EXACT_ISO_N7_BUNDLE_G1_SUM0_CONNECTED_SUBCUBIC_NO_PARENT_"
    "RANK7_G4_PIECEWISE"
)
THRESHOLD_M = 320
FILES = {
    "parent_source": "derive_iso_n7_bundle_g1_parent_modes_rank7_g4_piecewise.py",
    "parent_report": "iso_n7_bundle_g1_parent_modes_exact_rank7_g4_piecewise_20260831.json",
    "support_source": "prove_iso_n7_bundle_g1_sum0_signed_cluster_support_lemma_rank7_g4_piecewise.py",
    "support_report": "iso_n7_bundle_g1_sum0_signed_cluster_support_lemma_exact_rank7_g4_piecewise_20260831.json",
    "direction_source": "prove_iso_n7_bundle_g1_sum0_support_direction_monotonicity_rank7_g4_piecewise.py",
    "direction_report": "iso_n7_bundle_g1_sum0_support_direction_monotonicity_exact_rank7_g4_piecewise_20260831.json",
    "bernstein_source": "prove_iso_n6_bundle_g4_marked_edge_bernstein_g1_bernstein.py",
}
EXPECTED = {
    "parent_source": "3C4F8170E28763B85028C5B812B2305CCBC3DD3777258199D9A9AA51CE96AE8D",
    "parent_report": "1662D04DD24AF51A71BD2BFA0ECEE7DE852A3CDD03D3B54A5C638AAA35CC4490",
    "support_source": "184CE9F5D92F49DED58C3EE477BEA916FC7C624F9E84A234AECD318CCAECF846",
    "support_report": "180026E94A87369CA46D3F58F0ACB18EB35ED550792BB0F04BE5167B06D9ED3B",
    "direction_source": "095BC0C3FF23ECBEA7AFF32AADE3347C1D2BA926156C431DECBD36B7DDE9B6DA",
    "direction_report": "AAD841A64F5F0FFB999AB5B26E299F77F2D03B29C5DC52CA3E51C255E30EA08E",
    "bernstein_source": "6B3106BCEE7F7ECA68C4C5B6861EF018E7E2023DFD8BA091CDAC1EA1FB0085A6",
}


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def choose(value, rank):
    if rank < 0:
        return sp.Integer(0)
    if rank == 0:
        return sp.Integer(1)
    return sp.prod(value-offset for offset in range(rank))/sp.factorial(rank)


def main() -> None:
    for key, digest in EXPECTED.items():
        assert sha256(HERE/FILES[key]) == digest, key
    parent = json.loads((HERE/FILES["parent_report"]).read_text(encoding="utf-8"))
    support = json.loads((HERE/FILES["support_report"]).read_text(encoding="utf-8"))
    direction = json.loads((HERE/FILES["direction_report"]).read_text(encoding="utf-8"))
    assert parent["marker"] == "DERIVED_EXACT_ISO_N7_BUNDLE_G1_PARENT_MODES_RANK7_G4_PIECEWISE"
    assert support["marker"] == "PASS_EXACT_ISO_N7_BUNDLE_G1_SUM0_SIGNED_CLUSTER_SUPPORT_LEMMA_RANK7_G4_PIECEWISE"
    assert direction["marker"] == "PASS_EXACT_ISO_N7_BUNDLE_G1_SUM0_SUPPORT_DIRECTION_MONOTONICITY_RANK7_G4_PIECEWISE"

    m, tail = sp.symbols("m tail", nonnegative=True)
    symbols = {
        f"{family}{rank}": sp.Symbol(f"{family}{rank}", nonnegative=True)
        for family in "WABZ" for rank in range(2, 9)
    }
    literal = sp.expand(sp.sympify(
        parent["modes"]["no_parent"]["expression"], locals=symbols
    ))
    shifts = {
        symbols[f"A{rank}"]: symbols[f"W{rank-1}"] for rank in range(4, 9)
    }
    shifts.update({
        symbols[f"B{rank}"]: symbols[f"W{rank-1}"] for rank in range(4, 9)
    })
    shifts.update({
        symbols[f"Z{rank}"]: symbols[f"W{rank-2}"] for rank in range(5, 9)
    })
    reduced = sp.expand(literal.subs(shifts, simultaneous=True))
    w = {rank: symbols[f"W{rank}"] for rank in range(3, 9)}
    expected_reduced = sp.expand(
        8*w[3]**2 + 24*w[3]*w[4] - 64*w[3]*w[5]
        - 106*w[3]*w[6] - 51*w[3]*w[7] - 8*w[3]*w[8]
        + 80*w[4]**2 + 90*w[4]*w[5] - 12*w[4]*w[6]
        - 10*w[4]*w[7] + 39*w[5]**2 + 10*w[5]*w[6]
    )
    assert sp.expand(reduced-expected_reduced) == 0

    # A connected subcubic tree with b cubic vertices has b+2 leaves and
    # m-2b-2 vertices of degree two.  Thus S2=m+b-2 and S3=b.
    branch_fraction, p4_fraction, e5_fraction = sp.symbols(
        "branch_fraction p4_fraction e5_fraction", nonnegative=True
    )
    branch = (m-2)*branch_fraction/2
    omega = m+branch-2
    p4 = 2*omega*p4_fraction
    j4 = choose(m-1, 2)-omega-p4
    # P4=sum_(uv in E)(d_u-1)(d_v-1)<=sum_(uv in E)
    # ((d_u-1)+(d_v-1))=2*Omega because each factor is in {0,1,2}.
    # Also J4>=(m-2)(m-10)/2 on the whole box, so the E5 fraction is valid.
    j4_floor = sp.factor(choose(m-1, 2)-3*sp.Rational(3, 2)*(m-2))
    assert j4_floor == (m-2)*(m-10)/2

    d = {
        0: sp.Integer(1),
        1: sp.Integer(0),
        2: 1-m,
        3: omega,
        4: j4-branch,
        5: -j4*(m-4)*e5_fraction,
        6: j4*choose(m-4, 2),
        7: j4*choose(m-4, 3),
        8: j4*choose(m-4, 4),
    }
    relaxed_rows = {
        rank: sp.expand(sum(
            d[v]*choose(m-v, rank-v) for v in range(rank+1)
        ))
        for rank in range(3, 9)
    }
    relaxed = sp.expand(reduced.subs({
        w[rank]: relaxed_rows[rank] for rank in range(3, 9)
    }, simultaneous=True))

    # The D6,D7,D8 coordinate derivatives are independent of all three of
    # those coordinates.  Hence the frozen nonpositive derivative theorem at
    # the actual row remains valid along the entire simultaneous increase to
    # the displayed support ceilings.
    direction_vectors = {
        v: {rank: choose(m-v, rank-v) for rank in range(3, 9)}
        for v in range(6, 9)
    }
    derivatives = {
        v: sp.factor(sum(
            sp.diff(reduced, w[rank])*direction_vectors[v][rank]
            for rank in range(3, 9)
        ))
        for v in range(6, 9)
    }
    direction_locals = {"m": m, **{str(value): value for value in w.values()}}
    assert all(
        sp.expand(derivatives[v]-sp.sympify(
            direction["directions"][str(v)], locals=direction_locals
        )) == 0
        for v in range(6, 9)
    )
    assert all(
        sp.expand(sum(
            sp.diff(derivatives[v], w[rank])*direction_vectors[u][rank]
            for rank in range(3, 9)
        )) == 0
        for v in range(6, 9) for u in range(6, 9)
    )

    shifted = sp.expand(relaxed.subs(m, tail+THRESHOLD_M))
    certificate = certify_bernstein(
        shifted,
        (branch_fraction, p4_fraction, e5_fraction),
        tail=tail,
    )
    assert certificate["degree_profile"] == [2, 2, 2]
    assert certificate["bernstein_coefficients"] == 27
    assert certificate["tail_power_coefficients"] == 297
    assert certificate["minimum_tail_power_coefficient"] == "143/100800"
    assert certificate["exact_power_inversion"] is True

    report = {
        "marker": MARKER,
        "status": "proved exact",
        "theorem": (
            "Let W be a connected subcubic tree of order m>=320. If C is "
            "obtained by adjoining two isolated marked vertices and no parent "
            "is deleted, then the exact rank-seven common0/sum0 bundle "
            "coefficient G1 is nonnegative."
        ),
        "geometry": "nonadjacent_common0_sum0",
        "mode": "no_parent",
        "family": "connected trees of maximum degree at most three",
        "threshold_unmarked_order": THRESHOLD_M,
        "threshold_total_order": THRESHOLD_M+2,
        "literal_reduced_expression": str(reduced),
        "support_parameterization": {
            "cubic_vertices": "b=(m-2)*branch_fraction/2",
            "degree_counts": "n1=b+2, n2=m-2b-2, n3=b",
            "Omega": "m+b-2",
            "P4": "2*Omega*p4_fraction",
            "J4": "C(m-1,2)-Omega-P4",
            "E5": "-J4*(m-4)*e5_fraction",
            "D6_D8": "increased to J4*C(m-4,v-4), v=6,7,8",
            "J4_box_floor": "(m-2)(m-10)/2",
        },
        "monotone_support_replacement": {
            "directions": [6, 7, 8],
            "derivatives_nonpositive": "imported frozen exact theorem",
            "all_cross_second_derivatives_zero": True,
            "consequence": "relaxed polynomial is a lower bound for actual G1",
        },
        "certificate": certificate,
        "coverage_gap_within_stated_connected_subcubic_tail_scope": None,
        "finite_residual": "connected subcubic trees with m<320",
        "scope": (
            "Rank-seven G1 only, common0/sum0, no-parent, connected subcubic "
            "W, m>=320. Disconnected forests, maximum degree at least four, "
            "endpoint/ordinary parents, and the explicit finite residual are "
            "outside this theorem."
        ),
        "dependencies_sha256": EXPECTED,
        "source_sha256": sha256(Path(__file__)),
    }
    encoded = json.dumps(report, indent=2, sort_keys=True)+"\n"
    OUTPUT.write_text(encoded, encoding="utf-8", newline="\n")
    print(json.dumps({
        "marker": MARKER,
        "threshold_unmarked_order": THRESHOLD_M,
        "bernstein_coefficients": certificate["bernstein_coefficients"],
        "tail_power_coefficients": certificate["tail_power_coefficients"],
        "minimum_tail_power_coefficient": certificate[
            "minimum_tail_power_coefficient"
        ],
        "coverage_gap_within_stated_connected_subcubic_tail_scope": None,
    }, indent=2, sort_keys=True))
    print("SOURCE_SHA256", report["source_sha256"])
    print("REPORT_SHA256", hashlib.sha256(encoded.encode()).hexdigest().upper())
    print(MARKER)


if __name__ == "__main__":
    main()
