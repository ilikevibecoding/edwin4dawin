#!/usr/bin/env python3
"""Actual connected high-degree G1 tail from the frozen profile cone."""

from __future__ import annotations

import hashlib
import json
from pathlib import Path

import sympy as sp


HERE = Path(__file__).resolve().parent
OUTPUT = HERE / (
    "iso_n7_bundle_g1_sum0_connected_high_degree_no_parent_n41plus_"
    "exact_rank7_g4_piecewise_20260831.json"
)
MARKER = (
    "PASS_EXACT_ISO_N7_BUNDLE_G1_SUM0_CONNECTED_HIGH_DEGREE_NO_PARENT_"
    "N41PLUS_RANK7_G4_PIECEWISE"
)
DEPENDENCIES = {
    "derive_iso_n7_bundle_g1_parent_modes_rank7_g4_piecewise.py":
        "3C4F8170E28763B85028C5B812B2305CCBC3DD3777258199D9A9AA51CE96AE8D",
    "iso_n7_bundle_g1_parent_modes_exact_rank7_g4_piecewise_20260831.json":
        "1662D04DD24AF51A71BD2BFA0ECEE7DE852A3CDD03D3B54A5C638AAA35CC4490",
    "prove_iso_n7_bundle_g1_sum0_signed_cluster_support_lemma_rank7_g4_piecewise.py":
        "184CE9F5D92F49DED58C3EE477BEA916FC7C624F9E84A234AECD318CCAECF846",
    "iso_n7_bundle_g1_sum0_signed_cluster_support_lemma_exact_rank7_g4_piecewise_20260831.json":
        "180026E94A87369CA46D3F58F0ACB18EB35ED550792BB0F04BE5167B06D9ED3B",
    "prove_iso_n7_bundle_g1_sum0_support_direction_monotonicity_rank7_g4_piecewise.py":
        "095BC0C3FF23ECBEA7AFF32AADE3347C1D2BA926156C431DECBD36B7DDE9B6DA",
    "iso_n7_bundle_g1_sum0_support_direction_monotonicity_exact_rank7_g4_piecewise_20260831.json":
        "AAD841A64F5F0FFB999AB5B26E299F77F2D03B29C5DC52CA3E51C255E30EA08E",
    "prove_iso_n7_bundle_g1_connected_j4_e5_coupling_rank7_g4_piecewise.py":
        "E70E9EA2333E98C89DCFE7C660B08FFBE008D4467DE0F6B1A75FC26073FEB284",
    "iso_n7_bundle_g1_connected_j4_e5_coupling_exact_rank7_g4_piecewise_20260831.json":
        "FE4AECAFC00B35F142C0F0B4BAD32D71D069FD19FBB3A2B8696E519BCBC7C256",
    "prove_iso_n7_bundle_g1_sum0_connected_high_degree_support_caps_rank7_g4_piecewise.py":
        "744618134C3D41A052345A237DA842941DC59D9F71937888321DD57216C647DD",
    "iso_n7_bundle_g1_sum0_connected_high_degree_support_caps_exact_rank7_g4_piecewise_20260831.json":
        "7267A522C6D5D729C762360B6B20CDF8B8FD93574D8FF6C977371542C79667C1",
    "assemble_iso_n7_bundle_g1_sum0_connected_high_degree_profiles_universal_rank7_g4_piecewise.py":
        "E4979CDCF10B135BB89510ABB04C2514DC2707C048E1F21CB0A339CCC9243B0D",
    "iso_n7_bundle_g1_sum0_connected_high_degree_profiles_universal_exact_rank7_g4_piecewise_20260831.json":
        "A2DCCD738816B422C2DBA61D498033848BB4C190CA3AD426A65A98947839B14E",
}
REPORT_MARKERS = {
    "iso_n7_bundle_g1_sum0_signed_cluster_support_lemma_exact_rank7_g4_piecewise_20260831.json":
        "PASS_EXACT_ISO_N7_BUNDLE_G1_SUM0_SIGNED_CLUSTER_SUPPORT_LEMMA_RANK7_G4_PIECEWISE",
    "iso_n7_bundle_g1_sum0_support_direction_monotonicity_exact_rank7_g4_piecewise_20260831.json":
        "PASS_EXACT_ISO_N7_BUNDLE_G1_SUM0_SUPPORT_DIRECTION_MONOTONICITY_RANK7_G4_PIECEWISE",
    "iso_n7_bundle_g1_connected_j4_e5_coupling_exact_rank7_g4_piecewise_20260831.json":
        "PASS_EXACT_ISO_N7_BUNDLE_G1_CONNECTED_J4_E5_COUPLING_RANK7_G4_PIECEWISE",
    "iso_n7_bundle_g1_sum0_connected_high_degree_support_caps_exact_rank7_g4_piecewise_20260831.json":
        "PASS_EXACT_ISO_N7_BUNDLE_G1_SUM0_CONNECTED_HIGH_DEGREE_SUPPORT_CAPS_RANK7_G4_PIECEWISE",
    "iso_n7_bundle_g1_sum0_connected_high_degree_profiles_universal_exact_rank7_g4_piecewise_20260831.json":
        "PASS_EXACT_ISO_N7_BUNDLE_G1_SUM0_CONNECTED_HIGH_DEGREE_PROFILES_UNIVERSAL_RANK7_G4_PIECEWISE",
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
    for name, digest in DEPENDENCIES.items():
        assert sha256(HERE/name) == digest, name
    for name, marker in REPORT_MARKERS.items():
        report = json.loads((HERE/name).read_text(encoding="utf-8"))
        assert report["marker"] == marker, name
        assert report["status"] == "proved exact", name

    # Re-derive the literal no-parent common0/sum0 quadratic from the pinned
    # parent-mode algebra, rather than merely copying the working formula.
    parent = json.loads(
        (HERE/"iso_n7_bundle_g1_parent_modes_exact_rank7_g4_piecewise_20260831.json")
        .read_text(encoding="utf-8")
    )
    assert parent["marker"] == (
        "DERIVED_EXACT_ISO_N7_BUNDLE_G1_PARENT_MODES_RANK7_G4_PIECEWISE"
    )
    symbols = {
        f"{family}{rank}": sp.Symbol(f"{family}{rank}", nonnegative=True)
        for family in "WABZ" for rank in range(2, 9)
    }
    expression = sp.expand(sp.sympify(
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
    reduced = sp.expand(expression.subs(shifts, simultaneous=True))
    w = {rank: symbols[f"W{rank}"] for rank in range(3, 9)}
    q = sp.expand(
        8*w[3]**2+24*w[3]*w[4]-64*w[3]*w[5]-106*w[3]*w[6]
        -51*w[3]*w[7]-8*w[3]*w[8]+80*w[4]**2+90*w[4]*w[5]
        -12*w[4]*w[6]-10*w[4]*w[7]+39*w[5]**2+10*w[5]*w[6]
    )
    assert sp.expand(reduced-q) == 0

    # Exact algebra behind the universal connected-core P4 floor.
    x_left, x_right = sp.symbols("x_left x_right", integer=True, positive=True)
    y_left, y_right = x_left-1, x_right-1
    assert sp.expand(
        x_left*x_right-(1+y_left+y_right+y_left*y_right)
    ) == 0

    # The frozen derivative theorem is locally stated.  Verify here that the
    # sequential E6,E7,E8 moves are global: each derivative is independent of
    # every row altered by its own or a later move.
    m = sp.Symbol("m", integer=True, positive=True)
    derivatives = {
        support: sp.factor(sum(
            sp.diff(q, w[rank])*choose(m-support, rank-support)
            for rank in range(support, 9)
        ))
        for support in (6, 7, 8)
    }
    assert derivatives[6].free_symbols <= {m, w[3], w[4], w[5]}
    assert derivatives[7].free_symbols <= {m, w[3], w[4]}
    assert derivatives[8].free_symbols <= {w[3]}

    report = {
        "marker": MARKER,
        "status": "proved exact",
        "theorem": (
            "Let W be a connected tree of order m>=41, maximum degree at "
            "least four, and with at least three vertices of degree at least "
            "three. In nonadjacent common0/sum0 geometry with no parent "
            "deleted, the exact rank-seven bundle coefficient G1 is "
            "nonnegative."
        ),
        "literal_reduction": {
            "sum0_shifts": "A_k=B_k=W_(k-1), Z_k=W_(k-2)",
            "exact_G1_quadratic": str(sp.factor(q)),
            "identity_replayed": True,
        },
        "connected_core_P4_floor": {
            "coordinates": (
                "On the nonleaf core K put x_v=d_W(v)-1 and y_v=x_v-1. "
                "Then sum_v x_v=m-2 and P4(W)=sum_(uv in E(K))x_u x_v."
            ),
            "identity": (
                "P4=(|K|-1)+sum_v d_K(v)y_v+sum_(uv)y_u y_v"
            ),
            "proof": (
                "The nonleaf core is a tree and d_K(v)>=1. Dropping the "
                "last nonnegative sum gives P4>=(|K|-1)+sum_v y_v=m-3."
            ),
        },
        "J4_L5_trapezoid": {
            "J4_range": (
                "0<=J4<=C(m-1,2)-sum_v C(d_v,2)-(m-3), because every "
                "disjoint edge pair induces either 2K2 or the end edges of "
                "an induced P4."
            ),
            "L5_lower": "J4/2<=L5, by the pinned connected J4-E5 coupling.",
            "L5_upper": (
                "L5<=(m-4)J4: each negative five-support contains at least "
                "one induced 2K2 and each 2K2 has at most m-4 five-set extensions."
            ),
            "unit_box": (
                "J4=Jmax*s and L5=J4*(1/2+(m-9/2)t), 0<=s,t<=1; "
                "if Jmax=0 then J4=L5=0."
            ),
        },
        "support_endpoint_replacement": {
            "caps": (
                "Use the pinned E6<=(m-5)L5/3 and exact E7/E8 degree-motif "
                "caps. Actual signed E6,E7,E8 may be lower."
            ),
            "global_move": (
                "Move E6, then E7, then E8 upward to their caps. The pinned "
                "directional derivatives are nonpositive at the actual row. "
                "The replayed derivative variable sets show D6 depends only "
                "on W3,W4,W5, D7 only on W3,W4, and D8 only on W3; hence "
                "each derivative is constant under its own and all later "
                "moves. Therefore the capped relaxation is no larger than "
                "the actual G1."
            ),
            "derivatives": {str(key): str(value) for key, value in derivatives.items()},
        },
        "profile_finish": (
            "The resulting capped expression is exactly the pinned nine-control "
            "degree-profile relaxation. Its universal theorem makes all tensor "
            "Bernstein controls nonnegative for m>=41, maximum increment at "
            "least three, and at least three increments at least two."
        ),
        "coverage_gap_within_stated_actual_tail_scope": None,
        "scope": (
            "Actual connected-tree G1 only for common0/sum0 no-parent, "
            "m>=41, maximum degree>=4, and at least three branching vertices. "
            "Orders m<=40, connected trees with at most two branching "
            "vertices, disconnected forests, endpoint/ordinary parents, and "
            "other marked geometries remain outside this theorem."
        ),
        "dependencies_sha256": DEPENDENCIES,
        "source_sha256": sha256(Path(__file__)),
    }
    encoded = json.dumps(report, indent=2, sort_keys=True)+"\n"
    OUTPUT.write_text(encoded, encoding="utf-8", newline="\n")
    print(json.dumps({
        "marker": MARKER,
        "minimum_unmarked_order": 41,
        "actual_connected_tree_G1": True,
        "coverage_gap_within_stated_actual_tail_scope": None,
        "finite_actual_topology_seam_remaining": "m<=40",
    }, indent=2, sort_keys=True))
    print("SOURCE_SHA256", report["source_sha256"])
    print("REPORT_SHA256", hashlib.sha256(encoded.encode()).hexdigest().upper())
    print(MARKER)


if __name__ == "__main__":
    main()
