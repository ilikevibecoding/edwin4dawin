#!/usr/bin/env python3
"""Exact G2 row identity and finite profile-cone obstruction at old order 25.

This strengthens the frozen edge-contraction identity by fixing G2 from the
degrees at the split vertex.  It then replays the natural degree/P4/support
relaxation at contracted order 24.  The relaxation still has exact negative
Bernstein controls.  Its worst point exceeds the total number of eight-sets,
so it is explicitly not an actual independence row or a tree counterexample.
"""

from __future__ import annotations

import hashlib
import json
import math
from fractions import Fraction
from pathlib import Path

import sympy as sp

from probe_iso_n7_bundle_g1_sum0_connected_high_degree_profiles_rank7_g4_piecewise import (
    partitions,
)
from probe_iso_n7_bundle_g1_sum0_connected_high_degree_profiles_p4_rank7_g4_piecewise import (
    p4_floor,
)


HERE = Path(__file__).resolve().parent
OUTPUT = HERE / (
    "iso_n7_bundle_g1_edge_subdivision_g2_profile_cone_obstruction_exact_"
    "rank7_g4_piecewise_20260831.json"
)
MARKER = (
    "DERIVED_EXACT_ISO_N7_BUNDLE_G1_EDGE_SUBDIVISION_G2_PROFILE_CONE_"
    "OBSTRUCTION_RANK7_G4_PIECEWISE"
)
DEPENDENCIES = {
    "probe_iso_n7_bundle_g1_sum0_connected_high_degree_profiles_rank7_g4_piecewise.py":
        "300C8AF1CF91E42047B2A888908DFCC21E765778D1AD3B0E650B0713B8E64B92",
    "probe_iso_n7_bundle_g1_sum0_connected_high_degree_profiles_p4_rank7_g4_piecewise.py":
        "005A3CF6E2A5F7B67D0B2EB2A0E9D63C5F9E8DD959EDAE82DA9BCBFE8BE78AF4",
    "prove_iso_n7_bundle_g1_sum0_signed_cluster_support_lemma_rank7_g4_piecewise.py":
        "184CE9F5D92F49DED58C3EE477BEA916FC7C624F9E84A234AECD318CCAECF846",
    "iso_n7_bundle_g1_sum0_signed_cluster_support_lemma_exact_rank7_g4_piecewise_20260831.json":
        "180026E94A87369CA46D3F58F0ACB18EB35ED550792BB0F04BE5167B06D9ED3B",
    "prove_iso_n7_bundle_g1_connected_j4_e5_distance_coupling_rank7_g4_piecewise.py":
        "F587FAFF13DCC45832111CD6BA56D681DDA4EF20A10FE00768040D7709FC23FE",
    "iso_n7_bundle_g1_connected_j4_e5_distance_coupling_exact_rank7_g4_piecewise_20260831.json":
        "1CF3AAAA492265F252BD678EFF769E2858857751D075392FE945A192EEDDF389",
    "prove_iso_n7_bundle_g1_sum0_connected_high_degree_support_caps_rank7_g4_piecewise.py":
        "744618134C3D41A052345A237DA842941DC59D9F71937888321DD57216C647DD",
    "iso_n7_bundle_g1_sum0_connected_high_degree_support_caps_exact_rank7_g4_piecewise_20260831.json":
        "7267A522C6D5D729C762360B6B20CDF8B8FD93574D8FF6C977371542C79667C1",
    "derive_iso_n7_bundle_g1_edge_subdivision_q_increment_shadow_obstruction_rank7_g4_piecewise.py":
        "3337E701EAE2E534F78E013F93FE3AA2437978794A3849FA44E7D67C4A9C8DB9",
    "iso_n7_bundle_g1_edge_subdivision_q_increment_shadow_obstruction_exact_rank7_g4_piecewise_20260831.json":
        "84CFD187FD13E8445E40129C83B11A5FBC69E62B2EDBC2F9803E0E08F4381A90",
}
ORDER = 24                 # contracted tree H=T/uv
OLD_ORDER = ORDER + 1      # T before subdivision
EDGES = ORDER - 1
G_GROUND = ORDER - 1
G2_DENOMINATOR = math.comb(G_GROUND, 2)
EXPECTED = {
    "profiles": 1002,
    "bad_profiles": 497,
    "negative_controls": 1763,
    "worst_value": -1_983_847_014,
    "worst_profile": (7, 7, 6, 1, 1),
    "worst_g2": 238,
    "worst_prefix": 2,
    "worst_control": 6,
    "worst_jmax": 153,
    "certificate_stream_sha256": (
        "6FB887CFFA6E25EAF1AD43191851D04BC50634BCBC2857BE7335A4C1234DA8D2"
    ),
}


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def axis_controls(values):
    assert len(values) == 3
    return (
        values[0],
        2*values[1] - (values[0] + values[2])/2,
        values[2],
    )


def tensor_controls(grid):
    """Bidegree-(2,2) Bernstein controls from the 3x3 midpoint grid."""
    first_axis = [
        axis_controls([grid[i][j] for i in range(3)]) for j in range(3)
    ]
    return tuple(
        axis_controls([first_axis[j][i] for j in range(3)])[k]
        for i in range(3) for k in range(3)
    )


def prefix_values(row):
    """Worst normalized-shadow prefix values for the auxiliary downset G."""
    h2, h3, h4, h5, h6, h7, h8 = row[2:9]
    base = (
        8*h2*h2 + 40*h2*h3 - 40*h2*h4 - 170*h2*h5
        - 157*h2*h6 - 59*h2*h7 - 8*h2*h8 + 104*h3*h3
        + 186*h3*h4 - 28*h3*h5 - 73*h3*h6 - 18*h3*h7
        + 129*h4*h4 + 76*h4*h5 + 10*h5*h5
    )
    coefficients = (
        16*h2 + 24*h3 - 64*h4 - 106*h5 - 51*h6 - 8*h7,
        24*h2 + 160*h3 + 90*h4 - 12*h5 - 10*h6,
        -64*h2 + 90*h3 + 78*h4 + 10*h5,
        -106*h2 - 12*h3 + 10*h4,
        -51*h2 - 10*h3,
        -8*h2,
    )
    answer = [base]
    value = base
    for rank, coefficient in zip(range(2, 8), coefficients):
        value += coefficient*math.comb(G_GROUND, rank)
        answer.append(value)
    return tuple(answer)


def profile_data(increments):
    degrees = [value + 1 for value in increments]
    degrees += [1]*(ORDER - len(degrees))
    moments = {
        rank: sum(math.comb(degree, rank) for degree in degrees)
        for rank in range(2, 8)
    }
    squares = {
        rank: sum(math.comb(degree, rank)**2 for degree in degrees)
        for rank in range(2, 6)
    }
    star = {
        rank: (
            math.comb(ORDER, rank)
            - EDGES*math.comb(ORDER - 2, rank - 2)
            + sum(
                (-1)**support*moments[support]
                * math.comb(ORDER - support - 1, rank - support - 1)
                for support in range(2, rank)
            )
        )
        for rank in range(3, 9)
    }
    p4 = p4_floor(ORDER, increments) if len(increments) >= 2 else 0
    disjoint_edge_pairs = math.comb(EDGES, 2) - moments[2]
    jmax = disjoint_edge_pairs - p4
    assert jmax >= 0
    wedge_pairs = (moments[2]**2 - squares[2])//2
    upper7 = sum(
        math.comb(degree, 2)*math.comb(EDGES - degree, 2)
        for degree in degrees
    )
    upper8 = (
        sum(
            math.comb(degree, 5)*(EDGES - degree) for degree in degrees
        )
        + sum(
            math.comb(degree, 4)*(moments[2] - math.comb(degree, 2))
            for degree in degrees
        )
        + (moments[3]**2 - squares[3])//2
        + sum(
            math.comb(degree, 3)*math.comb(EDGES - degree, 2)
            for degree in degrees
        )
        + wedge_pairs*EDGES
        + disjoint_edge_pairs*math.comb(EDGES - 2, 2)//6
    )
    return degrees, moments, star, p4, jmax, upper7, upper8


def possible_g2_endpoints(degrees):
    values = []
    for contracted_degree in set(degrees):
        for left_degree in range(1, contracted_degree + 2):
            right_degree = contracted_degree + 2 - left_degree
            value = (
                G2_DENOMINATOR - (ORDER - 2)
                - (left_degree - 2)*(right_degree - 2)
            )
            assert 0 <= value <= G2_DENOMINATOR
            values.append(value)
    # Every Bernstein control below is affine in G2, so the two endpoints
    # cover every possible split of every vertex with this degree multiset.
    return min(values), max(values)


def main() -> None:
    for name, digest in DEPENDENCIES.items():
        assert sha256(HERE / name) == digest, name

    # Exact row-two identity.  Contracting uv replaces degrees a,b by
    # a+b-2, so Omega_H-Omega_T=(a-2)(b-2)-1.  Combining the exact tree i3
    # formulas gives the displayed G2=W3-H3 value.
    m, a, b = sp.symbols("m a b", integer=True)
    omega_change = sp.expand(
        sp.binomial(a + b - 2, 2) - sp.binomial(a, 2) - sp.binomial(b, 2)
    )
    assert sp.expand(sp.expand_func(omega_change) - ((a - 2)*(b - 2) - 1)) == 0
    g2_identity = sp.expand_func(
        sp.binomial(m, 3) - (m - 1)*(m - 2)
        - (sp.binomial(m - 1, 3) - (m - 2)*(m - 3))
        - omega_change
    )
    expected_g2 = sp.binomial(m - 2, 2) - (m - 3) - (a - 2)*(b - 2)
    assert sp.expand(sp.expand_func(g2_identity - expected_g2)) == 0

    bad_profiles = set()
    negative_controls = 0
    profile_count = 0
    interval_count = 0
    endpoint_cases = 0
    worst = None
    stream = hashlib.sha256()

    for increments in partitions(ORDER - 2):
        increments = tuple(increments)
        (
            degrees, moments, star, p4, jmax, upper7, upper8,
        ) = profile_data(increments)
        g2_endpoints = possible_g2_endpoints(degrees)
        breakpoints = {Fraction(0), Fraction(1)}
        if jmax:
            breakpoints.add(min(
                Fraction(1),
                Fraction(upper7, jmax*math.comb(ORDER - 4, 3)),
            ))
            breakpoints.add(min(
                Fraction(1),
                Fraction(upper8, jmax*math.comb(ORDER - 4, 4)),
            ))
        breakpoints = tuple(sorted(breakpoints))
        local_negative = 0
        profile_count += 1

        stream.update((repr((
            increments, tuple(degrees), tuple(sorted(moments.items())),
            tuple(sorted(star.items())), p4, jmax, upper7, upper8,
            g2_endpoints, breakpoints,
        )) + "\n").encode("ascii"))

        for g2 in g2_endpoints:
            endpoint_cases += 1
            for lower, upper in zip(breakpoints, breakpoints[1:]):
                if lower == upper:
                    continue
                interval_count += 1

                def at(local_s, t):
                    s = lower + (upper - lower)*local_s
                    j4 = jmax*s
                    l5 = j4*(1 + (ORDER - 5)*t)
                    correction = {
                        4: j4,
                        5: -l5,
                        6: Fraction(ORDER - 5, 3)*l5,
                        7: min(
                            upper7,
                            math.comb(ORDER - 4, 3)*j4,
                        ),
                        8: min(
                            upper8,
                            math.comb(ORDER - 4, 4)*j4,
                        ),
                    }
                    row = [0, 0, math.comb(ORDER - 1, 2)] + [
                        star[rank] + sum(
                            correction[support]
                            * math.comb(ORDER - support, rank - support)
                            for support in range(4, rank + 1)
                        )
                        for rank in range(3, 9)
                    ]
                    prefixes = prefix_values(row)
                    return tuple(
                        prefixes[0]
                        + Fraction(g2, G2_DENOMINATOR)
                        * (prefixes[index] - prefixes[0])
                        for index in range(7)
                    )

                grid = [
                    [at(Fraction(i, 2), Fraction(j, 2)) for j in range(3)]
                    for i in range(3)
                ]
                for prefix in range(7):
                    controls = tensor_controls([
                        [grid[i][j][prefix] for j in range(3)]
                        for i in range(3)
                    ])
                    stream.update((repr((
                        increments, g2, lower, upper, prefix, controls,
                    )) + "\n").encode("ascii"))
                    count = sum(control < 0 for control in controls)
                    local_negative += count
                    negative_controls += count
                    value = min(controls)
                    candidate = (
                        value, increments, g2, lower, upper, prefix,
                        controls.index(value), jmax, upper7, upper8, p4,
                    )
                    worst = candidate if worst is None else min(worst, candidate)

        if local_negative:
            bad_profiles.add(increments)

    assert profile_count == EXPECTED["profiles"]
    assert len(bad_profiles) == EXPECTED["bad_profiles"]
    assert negative_controls == EXPECTED["negative_controls"]
    assert worst[0] == EXPECTED["worst_value"]
    assert worst[1] == EXPECTED["worst_profile"]
    assert worst[2] == EXPECTED["worst_g2"]
    assert worst[5] == EXPECTED["worst_prefix"]
    assert worst[6] == EXPECTED["worst_control"]
    assert worst[7] == EXPECTED["worst_jmax"]
    assert stream.hexdigest().upper() == EXPECTED["certificate_stream_sha256"]

    # Reconstruct the worst endpoint itself (s=1,t=0).  Control 6 on the
    # final s-interval is exactly that endpoint, not merely an interior
    # Bernstein coefficient.
    worst_increments = EXPECTED["worst_profile"]
    degrees, moments, star, p4, jmax, upper7, upper8 = profile_data(
        worst_increments
    )
    corrections = {
        4: Fraction(jmax),
        5: Fraction(-jmax),
        6: Fraction(ORDER - 5, 3)*jmax,
        7: Fraction(upper7),
        8: Fraction(upper8),
    }
    worst_row = [0, 0, math.comb(ORDER - 1, 2)] + [
        star[rank] + sum(
            corrections[support]
            * math.comb(ORDER - support, rank - support)
            for support in range(4, rank + 1)
        )
        for rank in range(3, 9)
    ]
    worst_prefixes = prefix_values(worst_row)
    worst_endpoint = (
        worst_prefixes[0]
        + Fraction(EXPECTED["worst_g2"], G2_DENOMINATOR)
        * (worst_prefixes[EXPECTED["worst_prefix"]] - worst_prefixes[0])
    )
    assert worst_endpoint == EXPECTED["worst_value"]
    assert worst_row[8] == 1_045_170 > math.comb(ORDER, 8) == 735_471

    report = {
        "marker": MARKER,
        "status": (
            "exact row identity and exact relaxed-cone obstruction; no tree "
            "counterexample and no q-monotonicity theorem"
        ),
        "exact_G2_identity": {
            "formula": (
                "G2=C(m-2,2)-(m-3)-(a-2)(b-2), where m=|T| and "
                "a,b are the degrees of the subdivided edge endpoints in T"
            ),
            "derivation": (
                "G2=W3-H3 and contracting uv changes Omega=sum C(d,2) by "
                "(a-2)(b-2)-1."
            ),
            "old_order_25_specialization": "G2=231-(a-2)(b-2)",
        },
        "profile_cone": {
            "contracted_order": ORDER,
            "profiles": profile_count,
            "g2_endpoint_cases": endpoint_cases,
            "piecewise_endpoint_intervals": interval_count,
            "prefixes_per_case": 7,
            "bernstein_controls_per_prefix_interval": 9,
            "constraints": [
                "all degree-increment partitions of 22",
                "pinned degree-capacity P4 floor",
                "0<=J4<=C(23,2)-S2-P4_floor",
                "J4<=L5<=(m-4)J4",
                "E6<=(m-5)L5/3",
                "E7/E8 at the minimum of their pinned motif cap and the "
                "generic J4-extension cap",
                "exact G2 split-degree endpoints",
                "normalized-shadow prefix vertices for G3,...,G7",
            ],
            "bad_profiles": len(bad_profiles),
            "negative_bernstein_controls": negative_controls,
            "ordered_certificate_stream_sha256": stream.hexdigest().upper(),
        },
        "worst_relaxation_point": {
            "value": EXPECTED["worst_value"],
            "degree_increments": list(worst_increments),
            "degree_sequence": degrees,
            "P4_floor": p4,
            "J4_upper": jmax,
            "G2": EXPECTED["worst_g2"],
            "shadow_prefix": EXPECTED["worst_prefix"],
            "corrections_E4_through_E8": {
                str(rank): str(corrections[rank]) for rank in range(4, 9)
            },
            "relaxed_H_rows_2_through_8": [str(item) for item in worst_row[2:]],
            "infeasibility_certificate": (
                "The relaxed H8 row is 1,045,170, exceeding the absolute "
                "24-vertex ceiling C(24,8)=735,471. Thus the simultaneous "
                "support-cap corner is not an independence row."
            ),
        },
        "conclusion": (
            "The exact G2 degree identity removes the free-G2 defect but does "
            "not repair the independent E7/E8 profile cone: 497 profiles and "
            "1,763 controls remain negative. A joint actual-topology/support "
            "cap or a universal rank-seven G2 theorem is still required."
        ),
        "coverage_gap": (
            "Actual-tree q subdivision monotonicity remains open, so this "
            "does not close order 26 or the residual orders 26..31."
        ),
        "scope_guard": (
            "Every negative value here belongs to an enlarged relaxation. "
            "The worst point is proved infeasible. This report is neither a "
            "tree counterexample nor a proof that q monotonicity is false."
        ),
        "dependencies_sha256": DEPENDENCIES,
        "source_sha256": sha256(Path(__file__)),
    }
    encoded = json.dumps(report, indent=2, sort_keys=True) + "\n"
    OUTPUT.write_text(encoded, encoding="utf-8", newline="\n")
    print(json.dumps({
        "marker": MARKER,
        "profiles": profile_count,
        "bad_profiles": len(bad_profiles),
        "negative_controls": negative_controls,
        "worst_value": EXPECTED["worst_value"],
        "worst_is_actual_tree": False,
    }, indent=2, sort_keys=True))
    print("SOURCE_SHA256", report["source_sha256"])
    print("REPORT_SHA256", hashlib.sha256(encoded.encode()).hexdigest().upper())
    print(MARKER)


if __name__ == "__main__":
    main()
