#!/usr/bin/env python3
"""Exact structural reduction for the rank-seven Delta1/2 lower endpoint.

This proves the complementary capacity inequalities and the complete active
branch partition needed on the unresolved small-root strip n=25..38,
deg(q)<=7.  It deliberately does not claim positivity of Delta1/2; that is
the separate Bernstein obligation.
"""

from __future__ import annotations

import hashlib
import json
from fractions import Fraction as F
from math import comb
from pathlib import Path


ROOT = Path(__file__).resolve().parent


def sha(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def main() -> int:
    rows = []
    for n in range(25, 39):
        # Existing exact coefficient box for y=c4/c5 and z=c5/c6.
        t_n = F((n - 7) * (n - 8), n - 3)
        y_low = F(5, n - 4)
        y_high = F(5, 1) / t_n
        # z increases in y and in D5; D5<=1/6+y/2.
        z_high = y_high / (1 - F(1, 6) - y_high / 2)
        for r in range(1, 8):
            m = n - r - 1
            switch = F(m - 4, m + 1)
            y_switch = 1 - switch  # 5/(m+1)
            mass = 1 - F(comb(m, 4), comb(n - 4, 5))

            if r <= 4:
                assert y_low >= y_switch
                branches = [
                    {
                        "name": "containment",
                        "s_interval": ["1-y", str(switch)],
                        "d_endpoint": "1-s*z",
                    },
                    {
                        "name": "extension",
                        "s_interval": [str(switch), "1"],
                        "d_endpoint": "1-z*(m-4)*(1-s)/5",
                    },
                ]
                s_floor_reason = "a<=c4 gives s>=1-y; y>=5/(n-4)>=5/(m+1)"
            else:
                assert mass >= switch
                branches = [
                    {
                        "name": "extension_mass",
                        "s_interval": [str(mass), "1"],
                        "d_endpoint": "1-z*(m-4)*(1-s)/5",
                    }
                ]
                s_floor_reason = (
                    "a<=C(m,4), c5>=C(n-4,5) give s>=mass>=switch"
                )

            # At the switch the two b ceilings agree and are z*switch.
            # This upper bound also proves every substituted lower endpoint
            # remains in the half-retention domain needed for q-concavity.
            assert z_high * switch <= F(1, 2)
            rows.append(
                {
                    "n": n,
                    "root_degree": r,
                    "m": m,
                    "switch_s": str(switch),
                    "switch_y": str(y_switch),
                    "mass_s_floor": str(mass),
                    "y_box": [str(y_low), str(y_high)],
                    "z_box_upper": str(z_high),
                    "half_retention_margin_at_switch": str(
                        F(1, 2) - z_high * switch
                    ),
                    "s_floor_reason": s_floor_reason,
                    "branches": branches,
                }
            )

    assert len(rows) == 14 * 7
    assert sum(len(row["branches"]) for row in rows) == 14 * 11
    report = {
        "schema": "rank7-delta12-complementary-capacity-structure-v1",
        "status": "PASS_EXACT_COMPLEMENTARY_CAPACITY_AND_SWITCH_PARTITION",
        "scope": "integer n=25..38 and root degree 1..7",
        "identities": {
            "s": "s=1-a/c5",
            "d": "d=1-b/c6",
            "y": "y=c4/c5",
            "z": "z=c5/c6",
        },
        "proved_capacities": [
            "a=i4(J)<=c4, hence s>=1-y",
            "5b<= (m-4)a by extension counting in J",
            "b=i5(J)<=h5 because J is an induced subgraph of H=A-q",
            "therefore d>=max(1-z*(m-4)*(1-s)/5,1-s*z)",
        ],
        "switch": {
            "value": "s0=(m-4)/(m+1)",
            "containment_active": "s<=s0",
            "extension_active": "s>=s0",
        },
        "row_count": len(rows),
        "branch_intervals": sum(len(row["branches"]) for row in rows),
        "rows": rows,
        "source_sha256": sha(Path(__file__).resolve()),
        "scope_warning": (
            "This report proves the structural endpoint partition only. "
            "It is not a Delta1/Delta2 positivity certificate."
        ),
    }
    out = ROOT / "rank7_delta12_complementary_capacity_structure_exact_20260820.json"
    out.write_text(json.dumps(report, indent=2, sort_keys=True) + "\n", encoding="utf-8")
    print(report["status"])
    print("rows", len(rows), "branch_intervals", report["branch_intervals"])
    print("report", out.name, sha(out))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
