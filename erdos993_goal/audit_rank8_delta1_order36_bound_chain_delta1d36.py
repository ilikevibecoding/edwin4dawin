#!/usr/bin/env python3
"""Independent exact audit of every analytic bound used in the D=36 boxes."""

from __future__ import annotations

import hashlib
import json
import math
import os
from pathlib import Path

import sympy as sp


HERE = Path(__file__).resolve().parent
OUTPUT = HERE / "rank8_delta1_order36_bound_chain_independent_audit_delta1d36_20260825.json"
PINNED = {
    "FOREST_V6_ALPHA10_THEOREM_2026-08-13.md":
        "D6F2B1017B3C222167209AC00158423C98607CAE1804415C24ED82F2DC8F91FF",
    "prove_forest_v6_alpha10.py":
        "2B3620BEF00E761B857AAFBAA2BABB79A5419D0E0D26AB45C787CED2585DD947",
    "forest_v6_alpha10_exact_20260813.json":
        "5F3954C8E3CC8817376CE89685CF283BAEE2FF55214A8E9FCFE816D50A8E9AA4",
    "TREE_RANK45_PATH_RATIO_THEOREM_2026-07-28.md":
        "7FE34CDC7F02442ABB9665A0FDC093B78331C6B93CC0793F60B06259BB7B1528",
    "verify_tree_rank45_path_ratio.py":
        "AB5D6E395A13BE66276D45C25EB2F869B2410B2445F78A45F4A83648CE1CA86C",
    "RANK5_FOREST_THREE_HALVES_THEOREM_2026-07-27.md":
        "CA5323D8DF3110087228193C892F576F4814D4A813AE6FAB184887048377203D",
    "verify_rank5_three_halves_forest_certificate.py":
        "56B52DFE4FFA9BBE7273EF8EAA24AA737615338815DF0D41A5792C6728F17DBE",
    "verify_rank5_three_halves_convolution_cones.py":
        "06BD1AA9355B1C07DE5B9087AFEE0477D9C583E0ED943EA86FC332FB692A8194",
}


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def main() -> None:
    actual = {name: sha256(HERE / name) for name in PINNED}
    assert actual == PINNED, (actual, PINNED)

    n = sp.Integer(36)
    mu4 = sp.cancel((n - 7) * (n - 8) / (n - 3))
    assert mu4 == sp.Rational(812, 33)

    max_q = int(n - 4)
    h_values = [
        sp.Integer(0) if q_value <= 2
        else sp.binomial(q_value - 1, 2)
        for q_value in range(max_q + 1)
    ]
    for q_value, h_value in enumerate(h_values):
        maximum_forest_edges = max(q_value - 1, 0)
        independent_pair_floor = (
            sp.binomial(q_value, 2) - maximum_forest_edges
        )
        assert independent_pair_floor == h_value
    first_differences = [
        h_values[index + 1] - h_values[index]
        for index in range(max_q)
    ]
    assert first_differences == sorted(first_differences)
    assert sp.binomial(5, 4) == 5
    assert sp.binomial(6, 4) == 15

    q, r, t = sp.symbols("q r t", nonnegative=True)
    hq = (q - 1) * (q - 2) / 2
    hq1 = q * (q - 1) / 2
    phi = sp.expand((1 - r) * hq + r * hq1)
    smooth = sp.expand((q + r - 1) * (q + r - 2) / 2)
    interpolation_reserve = sp.factor(phi - smooth)
    assert sp.factor(interpolation_reserve - r * (1 - r) / 2) == 0

    mu4_integer = int(sp.floor(mu4))
    mu4_fraction = sp.cancel(mu4 - mu4_integer)
    phi_mu4 = sp.cancel(
        (1 - mu4_fraction) * h_values[mu4_integer]
        + mu4_fraction * h_values[mu4_integer + 1]
    )
    exact_mu5_transfer = sp.cancel(2 * phi_mu4 / mu4)
    assert phi_mu4 == sp.Rational(8809, 33)
    assert exact_mu5_transfer == sp.Rational(8809, 406)
    smooth_mu5_floor = sp.cancel(mu4 - 3 + 2 / mu4)
    assert smooth_mu5_floor == sp.Rational(290567, 13398)
    transfer_reserve = sp.cancel(exact_mu5_transfer - smooth_mu5_floor)
    assert transfer_reserve == sp.Rational(65, 6699) > 0
    derivative_numerator = sp.factor(t**2 * sp.diff(t - 3 + 2 / t, t))
    assert derivative_numerator == t**2 - 2
    assert mu4**2 - 2 > 0

    exact_transfer_derivatives = []
    z = sp.symbols("z", positive=True)
    for q_value in range(3, max_q):
        phi_piece = h_values[q_value] + (z - q_value) * (
            h_values[q_value + 1] - h_values[q_value]
        )
        transfer_piece = sp.cancel(2 * phi_piece / z)
        derivative_scaled = sp.factor(z**2 * sp.diff(transfer_piece, z))
        expected_derivative_scaled = sp.Integer(q_value - 1) * (q_value + 2)
        assert derivative_scaled == expected_derivative_scaled > 0
        exact_transfer_derivatives.append(str(derivative_scaled))
    mu5_floor = exact_mu5_transfer

    x_lower = sp.cancel(6 / (n - 5))
    x_upper = sp.cancel(6 / mu5_floor)
    y_lower = sp.cancel(5 / (n - 4))
    y_upper = sp.cancel(5 / mu4)
    assert (x_lower, x_upper, y_lower, y_upper) == (
        sp.Rational(6, 31), sp.Rational(2436, 8809),
        sp.Rational(5, 32), sp.Rational(165, 812),
    )
    x, y = sp.symbols("x y", positive=True)
    q5 = 10 * x**2 - x**2 * y - 12 * x * y
    assert sp.factor(q5 - x * (10 * x - y * (x + 12))) == 0
    q5_cap = 10 * x / (x + 12)
    assert sp.factor((x + 12) ** 2 * sp.diff(q5_cap, x)) == 120

    floors = {
        rank: math.comb(36, rank) - 19 * math.comb(34, rank - 2)
        for rank in (4, 5, 6)
    }
    assert [floors[rank] for rank in (4, 5, 6)] == [
        48246, 263296, 1066648
    ]
    caps = {
        rank: sp.Rational(math.comb(19, rank), floors[rank])
        for rank in (4, 5, 6)
    }
    assert [caps[rank] for rank in (4, 5, 6)] == [
        sp.Rational(38, 473),
        sp.Rational(171, 3872),
        sp.Rational(399, 15686),
    ]
    k4 = sp.cancel(4 * mu4 / (5 * (n - 4)))
    u4_switch = sp.cancel((caps[4] - (1 - k4)) / k4)
    assert k4 == sp.Rational(203, 330)
    assert u4_switch == sp.Rational(-149, 301) <= 0
    u6_switch = sp.cancel(caps[6] / (sp.Rational(19 - 5, 6) * x_upper))
    assert u6_switch == sp.Rational(21831, 553784)
    assert 0 < u6_switch < caps[5]

    expected_bridge_floors = {
        20: [47685, 257312, 1020272],
        21: [47124, 251328, 973896],
        22: [46563, 245344, 927520],
        23: [46002, 239360, 881144],
        24: [45441, 233376, 834768],
    }
    expected_bridge_caps = {
        20: [sp.Rational(19, 187), sp.Rational(57, 946), sp.Rational(285, 7502)],
        21: [sp.Rational(95, 748), sp.Rational(57, 704), sp.Rational(19, 341)],
        22: [sp.Rational(665, 4233), sp.Rational(1197, 11152), sp.Rational(399, 4960)],
        23: [sp.Rational(805, 4182), sp.Rational(3059, 21760), sp.Rational(483, 4216)],
        24: [sp.Rational(322, 1377), sp.Rational(161, 884), sp.Rational(3059, 18972)],
    }
    expected_bridge_ratios = {
        20: sp.Rational(85, 156),
        21: sp.Rational(45, 91),
        22: sp.Rational(19, 42),
        23: sp.Rational(5, 12),
        24: sp.Rational(105, 272),
    }
    expected_bridge_u6 = {
        20: sp.Rational(167371, 3045812),
        21: sp.Rational(167371, 2215136),
        22: sp.Rational(502113, 4890560),
        23: sp.Rational(202607, 1467168),
        24: sp.Rational(202607, 1100376),
    }
    bridge_records = {}
    for bridge_order in range(20, 25):
        bridge_floors = {
            rank: math.comb(36, rank)
            - bridge_order * math.comb(34, rank - 2)
            for rank in (4, 5, 6)
        }
        assert [bridge_floors[rank] for rank in (4, 5, 6)] == (
            expected_bridge_floors[bridge_order]
        )
        bridge_caps = {
            rank: sp.Rational(
                math.comb(bridge_order, rank), bridge_floors[rank]
            )
            for rank in (4, 5, 6)
        }
        assert [bridge_caps[rank] for rank in (4, 5, 6)] == (
            expected_bridge_caps[bridge_order]
        )
        bridge_mu4 = sp.cancel(
            (sp.Integer(bridge_order) - 7) * (bridge_order - 8)
            / (bridge_order - 3)
        )
        bridge_rank4_ratio = sp.cancel(5 / bridge_mu4)
        assert bridge_rank4_ratio == expected_bridge_ratios[bridge_order]
        bridge_u6_switch = sp.cancel(
            bridge_caps[6]
            / (sp.Rational(bridge_order - 5, 6) * x_upper)
        )
        assert bridge_u6_switch == expected_bridge_u6[bridge_order]
        assert 0 < bridge_u6_switch
        bridge_records[str(bridge_order)] = {
            "edge_floors": [
                bridge_floors[rank] for rank in (4, 5, 6)
            ],
            "absolute_caps": [
                str(bridge_caps[rank]) for rank in (4, 5, 6)
            ],
            "rank4_ratio_cap": str(bridge_rank4_ratio),
            "u6_switch": str(bridge_u6_switch),
        }

    x_breaks = (
        sp.Integer(0), sp.Rational(1, 8), sp.Rational(1, 4),
        sp.Rational(1, 2), sp.Integer(1),
    )
    y_breaks = (
        sp.Integer(0), sp.Rational(1, 4), sp.Rational(1, 2),
        sp.Rational(3, 4), sp.Rational(7, 8), sp.Rational(15, 16),
        sp.Rational(31, 32), sp.Rational(63, 64), sp.Integer(1),
    )
    switch_checks = 0
    switch_min = None
    switch_max = None
    for m_value in range(25, 36):
        m = sp.Integer(m_value)
        t_m = sp.cancel((m - 7) * (m - 8) / (m - 3))
        ratio_cap = sp.cancel(5 / t_m)
        for x_hi_norm in x_breaks[1:]:
            x_hi = x_lower + (x_upper - x_lower) * x_hi_norm
            y_cap = min(y_upper, sp.cancel(10 * x_hi / (x_hi + 12)))
            assert y_lower <= y_cap <= y_upper
            for y_lo_norm in y_breaks[:-1]:
                y0 = y_lower + (y_cap - y_lower) * y_lo_norm
                switch = sp.cancel(
                    (y0 - sp.Rational(1, 8))
                    / (ratio_cap - sp.Rational(1, 8))
                )
                assert 0 < switch < 1
                switch_checks += 1
                switch_min = switch if switch_min is None else min(switch_min, switch)
                switch_max = switch if switch_max is None else max(switch_max, switch)
    assert switch_checks == 11 * 4 * 8
    assert switch_min == sp.Rational(153, 1148)
    assert switch_max == sp.Rational(869589, 972544)

    payload = {
        "schema": "rank8-delta1-order36-bound-chain-independent-audit-v1",
        "status": "PASS_INDEPENDENT_EXACT_DELTA1_ORDER36_BOUND_CHAIN",
        "verified": [
            "pinned sharp tree and forest rank-(4,5) path-ratio chain",
            "pinned all-forest Q5 theorem chain",
            "forest residual independent-pair floor for every q=0..32",
            "convexity of the complete piecewise-linear two-extension envelope",
            "four-to-five and four-to-six double-counting multipliers",
            "exact and smooth two-extension interpolation reserves",
            "piecewise exact transfer 2*Phi(t)/t is increasing on every support interval",
            "mu4=812/33 implies the stronger exact bound mu5>=8809/406",
            "x and y interval endpoints and Q5 cap monotonicity",
            "small-F edge-union floors, absolute caps, and u6 switch",
            "exact-M=20..24 bridge floors, caps, forest ratios, and u6 switches",
            "all 352 exact-F rank4/missing-shadow switches for M=25..35 lie in (0,1)",
        ],
        "two_extension_interpolation_reserve": str(interpolation_reserve),
        "two_extension_h_support": [str(value) for value in h_values],
        "two_extension_first_differences": [
            str(value) for value in first_differences
        ],
        "two_extension_double_count_multipliers": [5, 15],
        "phi_at_mu4": str(phi_mu4),
        "exact_mu5_transfer": str(exact_mu5_transfer),
        "exact_transfer_derivatives_scaled_by_t_squared": exact_transfer_derivatives,
        "smooth_mu5_floor": str(smooth_mu5_floor),
        "smooth_transfer_reserve": str(transfer_reserve),
        "mu4_floor": str(mu4),
        "mu5_floor": str(mu5_floor),
        "x_bounds": [str(x_lower), str(x_upper)],
        "y_bounds": [str(y_lower), str(y_upper)],
        "small_edge_floors": [floors[rank] for rank in (4, 5, 6)],
        "small_absolute_caps": [str(caps[rank]) for rank in (4, 5, 6)],
        "small_u4_switch": str(u4_switch),
        "small_u6_switch": str(u6_switch),
        "exact_bridge_records": bridge_records,
        "exact_switch_checks": switch_checks,
        "exact_switch_range": [str(switch_min), str(switch_max)],
        "pinned_inputs": actual,
        "source_sha256": sha256(Path(__file__)),
    }
    temporary = OUTPUT.with_suffix(OUTPUT.suffix + ".tmp")
    temporary.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    os.replace(temporary, OUTPUT)
    print(payload["status"])
    print("SOURCE", sha256(Path(__file__)))
    print("REPORT", sha256(OUTPUT))


if __name__ == "__main__":
    main()
