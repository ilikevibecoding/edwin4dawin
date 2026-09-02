#!/usr/bin/env python3
"""Exact root-conditioned scalar-cone obstruction after both V lower bounds.

This is not a tree counterexample.  It identifies the next missing joint
quantity: the connected-four motif V on the correlation-equality face.
"""
from __future__ import annotations

import json
from math import comb
from pathlib import Path

import sympy as sp

from probe_rank7_root_conditioned_joint_cone import conditioned_records
from verify_rank7_terminal_broom_reduction import c, h, exact_decomposition, newton_coefficients


HERE = Path(__file__).resolve().parent
REPORT = HERE / "rank7_root_conditioned_b2_38_relaxed_cone_obstruction_exact_20260817.json"


def main() -> int:
    n, r, m, beta, xs = 23, 1, 21, 38, (4,)
    records = conditioned_records(n, beta, r, xs)
    tail_max = max(record[1] for record in records)
    supporting = [record for record in records if record[1] == tail_max]
    gamma = min(record[0] for record in supporting)
    witness = min(record[2] for record in supporting if record[0] == gamma)
    assert (gamma, tail_max, witness) == (61, 165, (8, 4, 3, 2, 1, 1, 1, 1))

    c2 = sp.Integer(comb(n - 1, 2))
    c3 = sp.Integer(comb(n - 2, 3) + beta)
    base = sp.Integer(comb(n - 3, 4) + (n - 5) * beta + (n - 3))
    c4 = base - tail_max
    assert c4 == 5384
    edge_excess = base - (n - 3) - gamma - c4
    assert edge_excess == 84

    kappa = sp.Rational(n**3 - 8 * n**2 - 19 * n + 302, 6)
    path_lower = ((n - 7) * (n - 8) * c4 + kappa * beta) / (5 * (n - 3))
    coefficient_edge = 4 * n**2 - 30 * n + 34
    joint_margin = (
        -sp.Rational(5, 2) * (n - 6) * (n - 3) ** 2 * beta
        + 10 * (n - 3) * gamma
        - coefficient_edge * (comb(n - 3, 4) - c4)
    )
    joint_lower = ((n - 7) * (n - 8) * c4 + joint_margin) / (5 * (n - 3))
    joint_edge_lower = joint_lower + edge_excess
    c5 = max(path_lower, joint_lower, joint_edge_lower)
    assert (path_lower, joint_lower, joint_edge_lower, c5) == (
        sp.Rational(67078, 5), sp.Integer(14453), sp.Integer(14537), sp.Integer(14537)
    )

    c6 = sp.factor((25 * c5**2 - 4 * c4 * c5) / (39 * c4))
    c7 = sp.factor((12 * c6**2 - c5 * c6) / (14 * c5))
    edge_e = m - sum(xs)
    edge_scale = comb(m - 2, 2)
    a = sp.Integer(comb(m, 4) - edge_e * edge_scale)
    assert (edge_e, a) == (17, 3078)
    single = sum(comb(m - value - 3, 4) for value in xs)
    b = c5 - a - single
    assert (single, b) == (1001, 10458)
    assert b <= sp.Rational(m - 4, 5) * a

    raw = newton_coefficients(exact_decomposition())[0]
    delta0 = sp.factor(
        raw.subs(
            {
                c[0]: 1, c[1]: n, c[2]: c2, c[3]: c3, c[4]: c4,
                c[5]: c5, c[6]: c6, c[7]: c7,
                h[5]: c5 - a, h[6]: c6 - b,
            },
            simultaneous=True,
        )
    )
    assert delta0 == sp.Rational(
        -20917326521364627511111322110726197,
        187492389698880032,
    ) < 0
    report = {
        "status": "PASS_EXACT_ROOT_CONDITIONED_SCALAR_CONE_OBSTRUCTION_NOT_A_TREE",
        "warning": "Exact failure of the current enclosure, not a tree counterexample.",
        "parameters": {"n": n, "r": r, "B2": beta, "xs": xs},
        "supporting_partition": witness,
        "B3": gamma,
        "tail_B3_plus_M_product": tail_max,
        "coefficients": {
            "c3": str(c3), "c4": str(c4), "c5": str(c5), "c6": str(c6),
            "c7": str(c7), "a": str(a), "b": str(b),
        },
        "delta0_R1": str(delta0),
        "delta0_decimal": float(delta0),
        "next_missing_coupling": "Retain the connected-four motif V (or an exact lower bound for V on the E=M(n-2-M) equality face).",
    }
    REPORT.write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(report, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
