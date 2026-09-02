#!/usr/bin/env python3
"""Verify the balanced two-star obstruction to coarse down-link lifts."""

from __future__ import annotations

import json
from pathlib import Path

import sympy as sp


OUTPUT = Path(
    "double_star_rank2_lift_obstruction_certificate_20260729.json"
)


def main() -> None:
    t = sp.symbols("t", positive=True, integer=True)
    mass = 2 * (t + 1) * (2 * t + 1)
    mean_a = (
        t * (4 * t**2 + 3 * t - 4)
        / ((t + 1) * (2 * t + 1))
    )
    variance_a = (
        t
        * (2 * t**4 + 8 * t**3 + 2 * t**2 - 12 * t + 5)
        / ((t + 1) ** 2 * (2 * t + 1) ** 2)
    )
    mean_rank2_reserve = (
        10 * t**5
        + 25 * t**4
        + 28 * t**3
        + 14 * t**2
        + 7 * t
        + 2
    ) / (2 * (t + 1) ** 2 * (2 * t + 1) ** 2)
    mean_components = (
        2 * t**3 + 3 * t**2 + t + 1
    ) / ((t + 1) * (2 * t + 1))

    coarse_floor_slack = sp.factor(
        sp.Rational(99, 25) - variance_a
    )
    exact_iso_reserve = sp.factor(
        1 + 2 * mean_rank2_reserve - variance_a
    )
    component_slack = sp.factor(
        1 + mean_components - variance_a
    )
    assert exact_iso_reserve == (
        8 * t**5
        + 21 * t**4
        + 38 * t**3
        + 39 * t**2
        + 8 * t
        + 3
    ) / ((t + 1) ** 2 * (2 * t + 1) ** 2)
    assert component_slack == (
        2 * t**5
        + 8 * t**4
        + 23 * t**3
        + 33 * t**2
        + 5 * t
        + 2
    ) / ((t + 1) ** 2 * (2 * t + 1) ** 2)

    t_value = 8
    values = {
        "mass": sp.factor(mass.subs(t, t_value)),
        "mean_A": sp.factor(mean_a.subs(t, t_value)),
        "variance_A": sp.factor(
            variance_a.subs(t, t_value)
        ),
        "mean_rank2_reserve": sp.factor(
            mean_rank2_reserve.subs(t, t_value)
        ),
        "mean_components": sp.factor(
            mean_components.subs(t, t_value)
        ),
        "coarse_37_25_floor_slack": sp.factor(
            coarse_floor_slack.subs(t, t_value)
        ),
        "exact_global_ISO_reserve": sp.factor(
            exact_iso_reserve.subs(t, t_value)
        ),
        "component_variance_slack": sp.factor(
            component_slack.subs(t, t_value)
        ),
    }
    assert values["coarse_37_25_floor_slack"] < 0
    assert values["exact_global_ISO_reserve"] > 0
    assert values["component_variance_slack"] > 0

    report = {
        "status": (
            "PASS_EXACT_COUNTEREXAMPLE_TO_COARSE_RANK2_FLOOR_LIFT"
        ),
        "family": (
            "Two stars K_{1,t} whose centers are joined through one "
            "middle vertex; total order 2t+3; audited at global rank 3."
        ),
        "scope_warning": (
            "This refutes only the attempt to replace every local "
            "rank-two reserve by the constant 37/25. It is not an "
            "ISO, PFSR, NCL, unimodality, or Erdos #993 failure."
        ),
        "symbolic_formulas": {
            "downlink_mass": str(mass),
            "mean_A": str(mean_a),
            "variance_A": str(variance_a),
            "mean_rank2_reserve": str(mean_rank2_reserve),
            "mean_components": str(mean_components),
            "coarse_floor_slack": str(coarse_floor_slack),
            "exact_global_ISO_reserve": str(exact_iso_reserve),
            "component_variance_slack": str(component_slack),
        },
        "first_balanced_integer_obstruction": {
            "t": t_value,
            "tree_order": 2 * t_value + 3,
            **{key: str(value) for key, value in values.items()},
        },
        "assertions": {
            "coarse_floor_lift_fails": True,
            "exact_ISO_reserve_remains_positive": True,
            "component_variance_bound_remains_positive": True,
        },
    }
    OUTPUT.write_text(
        json.dumps(report, indent=2) + "\n", encoding="utf-8"
    )
    print(json.dumps(report, indent=2))


if __name__ == "__main__":
    main()
