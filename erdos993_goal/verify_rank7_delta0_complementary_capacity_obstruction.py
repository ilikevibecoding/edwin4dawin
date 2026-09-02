#!/usr/bin/env python3
"""Exact obstruction to closing Delta0 with the two scalar b-capacities."""

from __future__ import annotations

import hashlib
import json
from math import comb
from pathlib import Path

import sympy as sp

from prove_rank7_terminal_broom_delta0_large import normalized_low


ROOT = Path(__file__).resolve().parent


def sha(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def main() -> int:
    n = 27
    root_degree = 1
    m = n - root_degree - 1
    z = sp.Rational(6, n - 6)  # connected extension floor
    q = (2 + z) / 14  # lower rank-six-defect endpoint
    s = 1 - sp.Rational(comb(m, 4), comb(n - 4, 5))
    switch = sp.Rational(m - 4, m + 1)
    assert s < switch

    containment_b_over_c6 = s * z
    extension_b_over_c6 = z * sp.Rational(m - 4, 5) * (1 - s)
    assert containment_b_over_c6 < extension_b_over_c6
    d = 1 - containment_b_over_c6
    assert d > sp.Rational(1, 2)

    # Check the retained rank-zero z interval exactly.
    t_n = sp.Rational((n - 7) * (n - 8), n - 3)
    mu6_lower = (t_n - 3 + 2 / t_n) / 6
    z_low_old = sp.Rational(6, n - 5)
    z_low_connected = sp.Rational(6, n - 6)
    z_high = 1 / mu6_lower
    assert z == z_low_connected
    assert z_low_old <= z <= z_high

    expression, (xv, yv, zv, qv, sv, dv) = normalized_low(0)
    value = sp.factor(
        expression.subs(
            {xv: 1, yv: 1, zv: z, qv: q, sv: s, dv: d},
            simultaneous=True,
        )
    )
    assert value < 0

    point = {
        "n": n,
        "root_degree": root_degree,
        "m": m,
        "z": str(z),
        "q6": str(q),
        "s": str(s),
        "switch_s": str(switch),
        "d": str(d),
        "normalized_delta0": str(value),
        "containment_b_over_c6": str(containment_b_over_c6),
        "extension_b_over_c6": str(extension_b_over_c6),
        "z_interval": [str(z_low_old), str(z_high)],
    }
    report = {
        "schema": "rank7-delta0-complementary-capacity-obstruction-v1",
        "status": "EXACT_ENCLOSURE_FAILURE_NOT_A_TREE_COUNTEREXAMPLE",
        "point": point,
        "conclusion": (
            "The path/root-mass s floor plus b<=min((m-4)a/5,h5), "
            "half retention, and the retained rank-zero z/q boxes do not "
            "prove Delta0.  A further joint rooted/core constraint is required."
        ),
        "source_sha256": sha(Path(__file__).resolve()),
    }
    out = ROOT / "rank7_delta0_complementary_capacity_obstruction_exact_20260820.json"
    out.write_text(json.dumps(report, indent=2, sort_keys=True) + "\n", encoding="utf-8")
    print(report["status"])
    print("normalized_delta0", value)
    print("report", out.name, sha(out))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
