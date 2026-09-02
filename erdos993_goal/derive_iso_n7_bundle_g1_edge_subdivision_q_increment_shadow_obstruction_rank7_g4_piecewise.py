#!/usr/bin/env python3
"""Exact edge-contraction identity and fail-closed q-increment obstruction.

The exact polynomial identity reduces edge subdivision to the already derived
rank-seven leaf increment.  A separate integer point proves that the natural
coefficientwise-containment plus normalized-shadow relaxation is too weak to
certify its sign.  That point is explicitly infeasible as an independence
complex (it violates Kruskal--Katona), so it is not a tree counterexample.
"""

from __future__ import annotations

import hashlib
import json
import math
from pathlib import Path

import sympy as sp


HERE = Path(__file__).resolve().parent
OUTPUT = HERE / (
    "iso_n7_bundle_g1_edge_subdivision_q_increment_shadow_obstruction_exact_"
    "rank7_g4_piecewise_20260831.json"
)
MARKER = (
    "DERIVED_EXACT_ISO_N7_BUNDLE_G1_EDGE_SUBDIVISION_Q_INCREMENT_"
    "SHADOW_OBSTRUCTION_RANK7_G4_PIECEWISE"
)
DEPENDENCIES = {
    "explore_iso_n7_bundle_g1_sum0_leaf_increment_g2_split_rank7_g4_piecewise.py":
        "79658A600669E967E69B19E30A918998127278FA71BCC0C1948B0AF66866C657",
    "iso_n7_bundle_g1_sum0_leaf_increment_g2_split_exploration_rank7_g4_piecewise_20260831.json":
        "8D1EBE421917A9FE78BA74E2C421437A0E8238CF0D47C1F7330604092748C339",
    "iso_n7_bundle_g2_parent_modes_exact_rank7_g5_finish_20260831.json":
        "B5638922DC71C493ECB5A64EA174441CA696A8C0B243A0B8D671C730855D9ED4",
    "prove_iso_n7_bundle_g1_edge_subdivision_j4_l5_transfer_rank7_g4_piecewise.py":
        "B80888C18B74C4F94CAE1B543840AC5EDD8798BF0E5F9356DC40AD5A63610FB2",
    "iso_n7_bundle_g1_edge_subdivision_j4_l5_transfer_exact_rank7_g4_piecewise_20260831.json":
        "863AC3465251728F82DC1CBCFFE3DDE33486345DD3107C1533FAE23A6592D48F",
}


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def convolution(left, right, maximum=8):
    answer = [sp.Integer(0)]*(maximum + 1)
    for i, x in enumerate(left):
        for j, y in enumerate(right):
            if i + j <= maximum:
                answer[i + j] += x*y
    return tuple(map(sp.expand, answer))


def add(*rows):
    return tuple(sp.expand(sum(row[k] for row in rows)) for k in range(9))


def shift(row, amount):
    return (sp.Integer(0),)*amount + tuple(row[:9 - amount])


def q(row):
    w3, w4, w5, w6, w7, w8 = row[3:9]
    return sp.expand(
        8*w3*w3 + 24*w3*w4 - 64*w3*w5 - 106*w3*w6
        - 51*w3*w7 - 8*w3*w8 + 80*w4*w4 + 90*w4*w5
        - 12*w4*w6 - 10*w4*w7 + 39*w5*w5 + 10*w5*w6
    )


def normalized_shadow(row, ground_order, first, last):
    """Check f_k/C(n,k) is nonincreasing by exact cross multiplication."""
    return all(
        row[k]*math.comb(ground_order, k - 1)
        <= row[k - 1]*math.comb(ground_order, k)
        for k in range(first, last + 1)
    )


def kruskal_katona_shadow(size: int, rank: int):
    """Minimum (rank-1)-shadow and canonical binomial representation."""
    remaining = size
    upper = 10**9
    representation = []
    for level in range(rank, 0, -1):
        top = level
        while top + 1 < upper and math.comb(top + 1, level) <= remaining:
            top += 1
        if top >= upper:
            top = upper - 1
        value = math.comb(top, level)
        representation.append((top, level))
        remaining -= value
        upper = top
    assert remaining == 0
    return (
        sum(math.comb(top, level - 1) for top, level in representation),
        representation,
    )


def main() -> None:
    for name, digest in DEPENDENCIES.items():
        assert sha256(HERE / name) == digest, name

    # Let deleting uv split T into rooted sides.  A,C are the polynomials
    # after deleting u,v; B,D after deleting their closed neighborhoods.
    A = tuple(sp.Symbol(f"a{k}") for k in range(9))
    B = tuple(sp.Symbol(f"b{k}") for k in range(9))
    C = tuple(sp.Symbol(f"c{k}") for k in range(9))
    D = tuple(sp.Symbol(f"d{k}") for k in range(9))
    AC, BC = convolution(A, C), convolution(B, C)
    AD, BD = convolution(A, D), convolution(B, D)
    H = add(AC, shift(BD, 1))
    G = add(BC, AD, tuple(-item for item in BD))
    old = add(AC, shift(BC, 1), shift(AD, 1))
    subdivided = add(old, shift(AC, 1), shift(BD, 2))
    assert all(sp.expand(old[k] - add(H, shift(G, 1))[k]) == 0 for k in range(9))
    assert all(
        sp.expand(subdivided[k] - add(H, shift(add(H, G), 1))[k]) == 0
        for k in range(9)
    )
    assert all(
        sp.expand(subdivided[k] - old[k] - (H[k - 1] if k else 0)) == 0
        for k in range(9)
    )

    # Reconstruct the leaf increment on abstract H,G rows and independently
    # match its pinned symbolic hash and G2+F decomposition.
    h = tuple(sp.Symbol(f"h{k}") for k in range(9))
    g = tuple(sp.Symbol(f"k{k}") for k in range(9))
    base = add(h, shift(g, 1))
    raised = add(base, shift(h, 1))
    delta = sp.expand(q(raised) - q(base))
    delta_hash = hashlib.sha256(sp.srepr(delta).encode()).hexdigest().upper()
    leaf_report = json.loads(
        (HERE / list(DEPENDENCIES)[1]).read_text(encoding="utf-8")
    )
    assert delta_hash == leaf_report["summaries"]["leaf_increment"][
        "polynomial_sha256"
    ] == "75352C8D33410BEA12012F2735F246EAAB6F2780D48739D0F1675E1EA966BA2D"
    locals_map = {f"h{k}": h[k] for k in range(9)} | {
        f"k{k}": g[k] for k in range(9)
    }
    residual = sp.expand(sp.sympify(
        leaf_report["expressions"]["residual_F_H_K"], locals=locals_map
    ))
    g2_report = json.loads(
        (HERE / "iso_n7_bundle_g2_parent_modes_exact_rank7_g5_finish_20260831.json")
        .read_text(encoding="utf-8")
    )
    names = {
        f"{family}{rank}": sp.Symbol(f"{family}{rank}")
        for family in "WABZ" for rank in range(2, 9)
    }
    g2 = sp.expand(sp.sympify(
        g2_report["modes"]["no_parent"]["expression"], locals=names
    ))
    substitutions = {
        names[f"W{rank}"]: h[rank] for rank in range(2, 9)
    }
    substitutions.update({
        names[f"A{rank}"]: h[rank - 1] for rank in range(3, 9)
    })
    substitutions.update({
        names[f"B{rank}"]: h[rank - 1] for rank in range(3, 9)
    })
    substitutions.update({
        names[f"Z{rank}"]: h[rank - 2] for rank in range(4, 9)
    })
    g2_isolated = sp.expand(g2.subs(substitutions, simultaneous=True))
    assert sp.expand(delta - g2_isolated - residual) == 0

    # Exact integer failure of the elementary relaxation at the relevant
    # contracted order 24.  H obeys normalized shadows and the fixed tree
    # h2/wedge-floor rows; G is itself the full 2-skeleton on 23 points,
    # obeys normalized shadows, and is coefficientwise below H.  H is not a
    # valid complex, as the explicit Kruskal--Katona violation proves.
    h_witness = (1, 24, 253, 1540, 5313, 10626, 33649, 86526, 183867)
    g_witness = (1, 23, 253, 0, 0, 0, 0, 0, 0)
    assert normalized_shadow(h_witness, 24, 1, 8)
    assert normalized_shadow(g_witness, 23, 1, 8)
    assert all(g_witness[k] <= h_witness[k] for k in range(9))
    assert h_witness[2] == math.comb(23, 2)
    # For a 24-vertex tree, h3=1518+Omega and Omega>=22.
    assert h_witness[3] == 1518 + 22
    witness_value = int(delta.subs({
        **{h[k]: h_witness[k] for k in range(9)},
        **{g[k]: g_witness[k] for k in range(9)},
    }))
    assert witness_value == -274_744_349
    kk_shadow, kk_representation = kruskal_katona_shadow(
        h_witness[6], 6
    )
    assert kk_shadow == 14_173 > h_witness[5] == 10_626

    report = {
        "marker": MARKER,
        "status": (
            "exact identity and exact relaxation obstruction; q sign open"
        ),
        "edge_subdivision_identity": {
            "rooted_side_definitions": (
                "A=I(U-u), B=I(U-N[u]), C=I(V-v), D=I(V-N[v])"
            ),
            "contracted_tree": "H=I(T/uv)=AC+xBD",
            "auxiliary_downset": "G=BC+AD-BD; set-theoretically AD union BC inside AC",
            "old_tree": "I(T)=H+xG=AC+xBC+xAD",
            "subdivided_tree": "I(T')=(1+x)H+xG",
            "increment": "I(T')-I(T)=xI(T/uv)",
            "q_increment": "q((1+x)H+xG)-q(H+xG)",
            "leaf_increment_polynomial_sha256": delta_hash,
        },
        "exact_split": {
            "identity": (
                "Delta q=G2_7^{isolated,no-parent}(H)+F(H,G)"
            ),
            "symbolically_reconstructed": True,
            "unavailable_sign_input": (
                "No universal rank-seven isolated/no-parent G2 theorem is "
                "pinned for arbitrary contracted trees H; the current exact "
                "G2 boundary covers only e(H)<=4 and finite n<=10."
            ),
        },
        "shadow_relaxation_obstruction": {
            "contracted_order": 24,
            "H_rows_0_8": list(h_witness),
            "G_rows_0_8": list(g_witness),
            "constraints_satisfied": [
                "H_k/C(24,k) nonincreasing",
                "G_k/C(23,k) nonincreasing",
                "0<=G_k<=H_k",
                "H2=C(23,2)=253",
                "H3=1518+Omega with the tree floor Omega=22",
            ],
            "exact_q_increment": witness_value,
            "infeasibility_certificate": {
                "statement": (
                    "This H is not even a simplicial-complex f-vector: its "
                    "33,649 six-faces force at least 14,173 five-faces by "
                    "Kruskal--Katona, but H5=10,626."
                ),
                "six_face_binomial_representation": [
                    list(item) for item in kk_representation
                ],
                "minimum_five_shadow": kk_shadow,
                "listed_H5": h_witness[5],
            },
            "conclusion": (
                "Coefficientwise containment, normalized shadow monotonicity, "
                "and the fixed low tree rows do not prove Delta q>=0. Stronger "
                "actual-tree/topology constraints or universal rank-seven G2 "
                "are necessary. This is not a tree counterexample."
            ),
        },
        "coverage_gap": (
            "The sign of the exact q increment for actual tree edge "
            "subdivision remains open; therefore orders 26..31 are not closed "
            "by this bridge."
        ),
        "scope_guard": (
            "The negative witness belongs only to a deliberately enlarged "
            "relaxation and is explicitly infeasible. It must never be cited "
            "as a graph/tree counterexample or as evidence that q subdivision "
            "monotonicity is false."
        ),
        "dependencies_sha256": DEPENDENCIES,
        "source_sha256": sha256(Path(__file__)),
    }
    encoded = json.dumps(report, indent=2, sort_keys=True) + "\n"
    OUTPUT.write_text(encoded, encoding="utf-8", newline="\n")
    print(json.dumps({
        "marker": MARKER,
        "leaf_increment_polynomial_sha256": delta_hash,
        "relaxation_witness_value": witness_value,
        "witness_is_actual_tree": False,
        "q_subdivision_sign": "open",
    }, indent=2, sort_keys=True))
    print("SOURCE_SHA256", report["source_sha256"])
    print("REPORT_SHA256", hashlib.sha256(encoded.encode()).hexdigest().upper())
    print(MARKER)


if __name__ == "__main__":
    main()
