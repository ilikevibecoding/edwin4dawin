#!/usr/bin/env python3
"""Certify V7 >= 0 for every forest of order at least 25.

The proof uses the certified sharp forest rank-(4,5) path ratio and a
discrete-convex two-extension bound.  Orders n >= 26 are uniform.  At
order 25, disconnected forests and trees with at least two units of
degree-excess curvature are still uniform; the path and the 48 three-arm
spiders are checked exactly.

This is an all-order large-order theorem, but it leaves orders 21--24
open in the alpha >= 12 range needed by the rank-seven PGC argument.
"""

from __future__ import annotations

import hashlib
import json
from fractions import Fraction
from math import comb
from pathlib import Path

import networkx as nx
import sympy as sp

from scan_forest_iso_reserve_floor import tree_polynomial


HERE = Path(__file__).resolve().parent
REPORT = HERE / "forest_v7_order25_exact_20260813.json"

PREREQUISITE_HASHES = {
    "TREE_RANK45_PATH_RATIO_THEOREM_2026-07-28.md":
        "7FE34CDC7F02442ABB9665A0FDC093B78331C6B93CC0793F60B06259BB7B1528",
    "verify_tree_rank45_path_ratio.py":
        "AB5D6E395A13BE66276D45C25EB2F869B2410B2445F78A45F4A83648CE1CA86C",
    "FOREST_V6_ALPHA10_THEOREM_2026-08-13.md":
        "D6F2B1017B3C222167209AC00158423C98607CAE1804415C24ED82F2DC8F91FF",
    "prove_forest_v6_alpha10.py":
        "2B3620BEF00E761B857AAFBAA2BABB79A5419D0E0D26AB45C787CED2585DD947",
}


def sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for block in iter(lambda: handle.read(1 << 20), b""):
            digest.update(block)
    return digest.hexdigest().upper()


def convex_phi(value: Fraction) -> Fraction:
    """Lower convex envelope of h(0)=h(1)=h(2)=0,
    h(q)=C(q-1,2) for integer q >= 3.
    """
    if value < 0:
        raise ValueError("extension mean must be nonnegative")
    q = value.numerator // value.denominator
    if q <= 1:
        return Fraction(0)
    # On [q,q+1], the slope is q-1.  This also gives zero on [1,2].
    return Fraction((q - 1) * (q - 2), 2) + (value - q) * (q - 1)


def transfer_mean(value: Fraction) -> Fraction:
    """Lower bound for the next extension mean: 2 Phi(value)/value."""
    if value == 0:
        return Fraction(0)
    return 2 * convex_phi(value) / value


def normalized_v7_lower(value: Fraction) -> Fraction:
    """(3/2)mu+5 Phi(mu)-2mu^2."""
    return Fraction(3, 2) * value + 5 * convex_phi(value) - 2 * value**2


def v7(polynomial: tuple[int, ...]) -> int:
    return (
        9 * polynomial[5] * polynomial[6]
        + 105 * polynomial[5] * polynomial[7]
        - 72 * polynomial[6] ** 2
    )


def spider(arms: tuple[int, int, int]) -> nx.Graph:
    graph = nx.Graph()
    graph.add_node(0)
    vertex = 1
    for length in arms:
        previous = 0
        for _ in range(length):
            graph.add_edge(previous, vertex)
            previous = vertex
            vertex += 1
    return graph


def verify_symbolic_core() -> dict[str, str]:
    n, mu, z = sp.symbols("n mu z", positive=True)

    # If S is a uniform independent k-set and X is its extension count,
    # then E X=(k+1)i_(k+1)/i_k.  If Y counts independent pairs in the
    # residual forest, E Y=C(k+2,2)i_(k+2)/i_k.  A q-vertex forest has
    # Y >= h(q), whose integer first differences are 0,0,1,2,... .
    first_differences = []
    h_values = []
    for q in range(0, 40):
        h = 0 if q == 0 else comb(q - 1, 2) if q >= 3 else 0
        h_values.append(h)
        if q:
            first_differences.append(h_values[q] - h_values[q - 1])
    assert first_differences == sorted(first_differences)

    # Rank-five normalization of V7.
    normalized = sp.Rational(3, 2) * mu + 5 * z - 2 * mu**2
    continuous_phi = (mu - 1) * (mu - 2) / 2
    continuous_lower = sp.factor(normalized.subs(z, continuous_phi))
    assert sp.simplify(
        continuous_lower - (mu**2 - 12 * mu + 10) / 2
    ) == 0

    # Certified forest rank-(4,5) path-ratio endpoint.
    rank45_mean = sp.factor((n - 7) * (n - 8) / (n - 3))
    assert sp.simplify(
        rank45_mean.subs(n, n + 1) - rank45_mean
        - (n - 7) * (n + 2) / ((n - 3) * (n - 2))
    ) == 0

    # Using Phi(t) >= (t-1)(t-2)/2 for t>=2 gives the first transfer
    # mu_5 >= t-3+2/t.  At n=26 this already exceeds 12, and both the
    # rank45 endpoint and t-3+2/t increase thereafter.
    endpoint_26 = Fraction(342, 23)
    transferred_26 = endpoint_26 - 3 + Fraction(2, 1) / endpoint_26
    assert endpoint_26 > 2
    assert transferred_26 > 12
    v7_continuous_26 = Fraction(1, 2) * (
        transferred_26**2 - 12 * transferred_26 + 10
    )
    assert v7_continuous_26 > 0

    return {
        "convex_integer_first_differences": str(first_differences),
        "normalized_V7": str(normalized),
        "continuous_V7_lower": str(continuous_lower),
        "forest_rank45_mean": str(rank45_mean),
        "forest_rank45_mean_increment": str(
            sp.factor(rank45_mean.subs(n, n + 1) - rank45_mean)
        ),
        "n26_rank45_endpoint": str(endpoint_26),
        "n26_transferred_rank56_mean_lower": str(transferred_26),
        "n26_normalized_V7_continuous_lower": str(v7_continuous_26),
    }


def verify_order25_uniform_cases() -> dict:
    order = 25
    choose_i4_ceiling = comb(order, 4)
    rank45_endpoint = Fraction((order - 7) * (order - 8), order - 3)
    assert rank45_endpoint == Fraction(153, 11)

    # Disconnected forests: at least one leaf-to-leaf bridge is needed.
    # Its residual forest has q>=21.  The sharp rank-(2,3) forest ratio
    # is at least 51/10, versus rho=(rank45 mean)/5=153/55.
    residual_i2_floor = comb(20, 2)
    residual_ratio_gap = Fraction(51, 10) - Fraction(153, 55)
    assert residual_ratio_gap == Fraction(51, 22)
    bridge_correction = residual_i2_floor * residual_ratio_gap
    disconnected_mu4 = (
        rank45_endpoint
        + 5 * bridge_correction / choose_i4_ceiling
    )
    disconnected_mu5 = transfer_mean(disconnected_mu4)
    disconnected_v7 = normalized_v7_lower(disconnected_mu5)
    assert disconnected_v7 > 0

    # For a tree, the quantitative rank45 proof gives
    # L >= 1742 B2 at n=25, where
    # mu4-rank45_endpoint = L/(22*i4).  If B2>=2, use i4<=C(25,4).
    rank45_curvature_coefficient = 1742
    curved_mu4 = (
        rank45_endpoint
        + Fraction(
            2 * rank45_curvature_coefficient,
            (order - 3) * choose_i4_ceiling,
        )
    )
    curved_mu5 = transfer_mean(curved_mu4)
    curved_v7 = normalized_v7_lower(curved_mu5)
    assert curved_v7 > 0

    return {
        "i4_universal_ceiling": choose_i4_ceiling,
        "rank45_extension_mean_endpoint": str(rank45_endpoint),
        "disconnected": {
            "residual_order_floor": 21,
            "residual_i2_floor": residual_i2_floor,
            "residual_rank32_ratio_gap": str(residual_ratio_gap),
            "one_bridge_correction_floor": str(bridge_correction),
            "mu4_floor": str(disconnected_mu4),
            "mu5_floor": str(disconnected_mu5),
            "normalized_V7_floor": str(disconnected_v7),
        },
        "tree_B2_at_least_2": {
            "rank45_L_per_B2": rank45_curvature_coefficient,
            "mu4_floor": str(curved_mu4),
            "mu5_floor": str(curved_mu5),
            "normalized_V7_floor": str(curved_v7),
        },
    }


def verify_order25_low_curvature_trees() -> dict:
    # B2=0 is the path.  B2=1 means exactly one degree-three vertex and
    # all other degrees at most two, hence a three-arm spider.  Its three
    # positive arm lengths are an unordered partition of 24.
    path_polynomial = tree_polynomial(nx.path_graph(25))
    path_value = v7(path_polynomial)
    assert path_value == 6_591_506_220

    records = []
    for first in range(1, 25):
        for second in range(first, 25):
            third = 24 - first - second
            if third < second:
                continue
            arms = (first, second, third)
            polynomial = tree_polynomial(spider(arms))
            records.append((v7(polynomial), arms, polynomial))
    assert len(records) == 48
    minimum = min(records)
    assert minimum[0] == 7_249_560_525
    assert minimum[1] == (2, 2, 20)

    return {
        "path": {
            "polynomial": list(path_polynomial),
            "V7": path_value,
        },
        "three_arm_spiders": {
            "unordered_arm_partitions": len(records),
            "minimum_V7": minimum[0],
            "minimizing_arms": list(minimum[1]),
            "minimizing_polynomial": list(minimum[2]),
            "all_positive": all(value > 0 for value, _, _ in records),
        },
    }


def verify_scalar_no_go() -> dict[str, str]:
    # At n=25, the sharp rank45 endpoint alone, followed by both exact
    # convex-envelope transfers, misses by exactly 19/289.  Therefore the
    # quantitative B2/bridge split above is genuinely needed, and the same
    # scalar chain cannot close orders 21--24 without a new structural input.
    mu4 = Fraction(153, 11)
    mu5 = transfer_mean(mu4)
    assert mu5 == Fraction(188, 17)
    lower = normalized_v7_lower(mu5)
    assert lower == Fraction(-19, 289)
    return {
        "n25_rank45_endpoint_mu4": str(mu4),
        "after_first_exact_convex_transfer_mu5": str(mu5),
        "after_second_exact_convex_transfer_normalized_V7": str(lower),
        "meaning": (
            "the rank45 endpoint plus the two scalar convex envelopes "
            "alone is insufficient even at order 25"
        ),
    }


def verify_prerequisite_hashes() -> dict[str, str]:
    actual = {}
    for name, expected in PREREQUISITE_HASHES.items():
        value = sha256(HERE / name)
        assert value == expected, (name, value, expected)
        actual[name] = value
    return actual


def main() -> int:
    report = {
        "status": "PASS_EXACT_ALL_FOREST_V7_ORDER_AT_LEAST_25",
        "theorem": (
            "For every forest F of order n>=25, "
            "9*i5*i6+105*i5*i7-72*i6^2 >= 0"
        ),
        "remaining_required_range": (
            "For alpha(F)>=12, only orders 21,22,23,24 remain beyond "
            "the prior exact census through order 20"
        ),
        "prerequisite_hashes": verify_prerequisite_hashes(),
        "symbolic_all_order_core": verify_symbolic_core(),
        "order25_uniform_cases": verify_order25_uniform_cases(),
        "order25_low_curvature_trees": verify_order25_low_curvature_trees(),
        "scalar_method_no_go": verify_scalar_no_go(),
    }
    REPORT.write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    print(report["status"])
    print("remaining", report["remaining_required_range"])
    print(
        "n25 path/spider minima",
        report["order25_low_curvature_trees"]["path"]["V7"],
        report["order25_low_curvature_trees"]["three_arm_spiders"]["minimum_V7"],
    )
    print(
        "scalar no-go",
        report["scalar_method_no_go"][
            "after_second_exact_convex_transfer_normalized_V7"
        ],
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
