#!/usr/bin/env python3
"""Independent exact audit of every analytic bound used in the D=41 boxes."""

from __future__ import annotations

import hashlib
import json
import math
import os
from pathlib import Path

import sympy as sp


HERE = Path(__file__).resolve().parent
OUTPUT = HERE / "rank8_delta1_order41_bound_chain_independent_audit_delta1d41_20260825.json"
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

    n = sp.Integer(41)
    mu4 = sp.cancel((n - 7) * (n - 8) / (n - 3))
    assert mu4 == sp.Rational(561, 19)
    # For q>=2, linear interpolation of h(q)=C(q-1,2) exceeds its
    # quadratic continuation by r(1-r)/2 on q+r, 0<=r<=1.
    q, r, t = sp.symbols("q r t", nonnegative=True)
    hq = (q - 1) * (q - 2) / 2
    hq1 = q * (q - 1) / 2
    phi = sp.expand((1 - r) * hq + r * hq1)
    smooth = sp.expand((q + r - 1) * (q + r - 2) / 2)
    interpolation_reserve = sp.factor(phi - smooth)
    assert sp.factor(interpolation_reserve - r * (1 - r) / 2) == 0
    # Thus mu5 >= 2 Phi(mu4)/mu4 >= mu4-3+2/mu4.
    mu5_floor = sp.cancel(mu4 - 3 + 2 / mu4)
    assert mu5_floor == sp.Rational(283466, 10659)
    derivative_numerator = sp.factor(t**2 * sp.diff(t - 3 + 2 / t, t))
    assert derivative_numerator == t**2 - 2
    assert mu4**2 - 2 > 0

    x_lower = sp.cancel(6 / (n - 5))
    x_upper = sp.cancel(6 / mu5_floor)
    y_lower = sp.cancel(5 / (n - 4))
    y_upper = sp.cancel(5 / mu4)
    assert (x_lower, x_upper, y_lower, y_upper) == (
        sp.Rational(1, 6), sp.Rational(31977, 141733),
        sp.Rational(5, 37), sp.Rational(95, 561),
    )
    x, y = sp.symbols("x y", positive=True)
    q5 = 10 * x**2 - x**2 * y - 12 * x * y
    assert sp.factor(q5 - x * (10 * x - y * (x + 12))) == 0
    q5_cap = 10 * x / (x + 12)
    assert sp.factor((x + 12) ** 2 * sp.diff(q5_cap, x)) == 120

    floors = {
        rank: math.comb(41, rank) - 25 * math.comb(39, rank - 2)
        for rank in (4, 5, 6)
    }
    assert [floors[rank] for rank in (4, 5, 6)] == [
        82745, 520923, 2440113
    ]
    caps = {
        rank: sp.Rational(math.comb(25, rank), floors[rank])
        for rank in (4, 5, 6)
    }
    assert [caps[rank] for rank in (4, 5, 6)] == [
        sp.Rational(2530, 16549),
        sp.Rational(17710, 173641),
        sp.Rational(177100, 2440113),
    ]
    u6_switch = sp.cancel(caps[6] / (sp.Rational(25 - 5, 6) * x_upper))
    assert u6_switch == sp.Rational(228190130, 2364469497)
    assert 0 < u6_switch < caps[5]

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
    for m_value in range(26, 41):
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
                    (y0 - sp.Rational(4, 37))
                    / (ratio_cap - sp.Rational(4, 37))
                )
                assert 0 < switch < 1
                switch_checks += 1
                switch_min = switch if switch_min is None else min(switch_min, switch)
                switch_max = switch if switch_max is None else max(switch_max, switch)
    assert switch_checks == 15 * 4 * 8

    payload = {
        "schema": "rank8-delta1-order41-bound-chain-independent-audit-v1",
        "status": "PASS_INDEPENDENT_EXACT_DELTA1_ORDER41_BOUND_CHAIN",
        "verified": [
            "pinned sharp tree and forest rank-(4,5) path-ratio chain",
            "pinned all-forest Q5 theorem chain",
            "piecewise-linear two-extension interpolation reserve",
            "mu4=561/19 implies mu5>=283466/10659 by exact monotonicity",
            "x and y interval endpoints and Q5 cap monotonicity",
            "small-F edge-union floors, absolute caps, and u6 switch",
            "all 480 exact-F rank4/missing-shadow switches lie in (0,1)",
        ],
        "two_extension_interpolation_reserve": str(interpolation_reserve),
        "mu4_floor": str(mu4),
        "mu5_floor": str(mu5_floor),
        "x_bounds": [str(x_lower), str(x_upper)],
        "y_bounds": [str(y_lower), str(y_upper)],
        "small_edge_floors": [floors[rank] for rank in (4, 5, 6)],
        "small_absolute_caps": [str(caps[rank]) for rank in (4, 5, 6)],
        "small_u6_switch": str(u6_switch),
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




