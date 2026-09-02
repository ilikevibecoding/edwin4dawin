#!/usr/bin/env python3
"""Probe normalized continuous domains for a Bernstein-style certificate."""

from __future__ import annotations

import numpy as np
import sympy as sp

from derive_rank6_spider_cumulative_factors import (
    M,
    R,
    T,
    U,
    VARIABLES,
    increment,
    strong_polynomial,
)


S = sp.symbols("s", nonnegative=True)
B0, B1, B2 = sp.symbols("b0 b1 b2", nonnegative=True)
B3 = 1 - B0 - B1 - B2


def normalized_expression(poly, reserve=(0, 0, 0, 0)):
    degree = poly.total_degree()
    barycentric = [B0, B1, B2, B3]
    reserve_mass = sum(reserve)
    remainder = 1 - reserve_mass * S
    x = [
        remainder * value + amount * S
        for value, amount in zip(barycentric, reserve)
    ]

    # Weighted gap coordinates:
    # X0=a0/W, X1=2a1/W, X2=3a2/W, X3=R/W.
    g0 = x[0]
    g1 = x[1] / 2
    g2 = x[2] / 3
    fractions = (
        g0 + g1 + g2,
        g1 + g2,
        g2,
        x[3],
    )
    # Homogenize term by term.  This avoids creating a huge rational
    # expression and asking cancel() to rediscover that all denominators
    # disappear.
    expression = sp.Integer(0)
    for powers, coefficient in poly.terms():
        term = coefficient * S ** (degree - sum(powers))
        for power, fraction in zip(powers, fractions):
            term *= fraction**power
        expression += term
    return expression, degree


def random_minimum(expression, samples=20_000, seed=993):
    rng = np.random.default_rng(seed)
    bary = rng.dirichlet(np.ones(4), size=samples)
    # Include all vertices and the equal point at s endpoints.
    extra_bary = np.vstack((np.eye(4), np.full((1, 4), 0.25)))
    bary = np.vstack((bary, extra_bary, extra_bary))
    s = np.concatenate(
        (
            rng.random(samples) / 17,
            np.zeros(len(extra_bary)),
            np.full(len(extra_bary), 1 / 17),
        )
    )
    function = sp.lambdify((B0, B1, B2, S), expression, "numpy")
    values = np.asarray(function(bary[:, 0], bary[:, 1], bary[:, 2], s))
    index = int(np.argmin(values))
    return float(values[index]), tuple(bary[index]), float(s[index])


def main() -> int:
    values = {
        label: strong_polynomial(axis)
        for label, axis in {
            "L1": 0,
            "L2": 1,
            "L3": 2,
            "L4+": 3,
        }.items()
    }
    base = values["L1"]
    def arm_reserves(required_arm_type=None, extra_r=0):
        # Reserve three actual arms, partitioned among lengths 1, 2, and
        # at least 3.  Their contributions to the weighted barycentric
        # coordinates are 1, 2, and 3, respectively.
        out = []
        for c0 in range(4):
            for c1 in range(4 - c0):
                c2 = 3 - c0 - c1
                counts = (c0, c1, c2)
                if (
                    required_arm_type is not None
                    and counts[required_arm_type] == 0
                ):
                    continue
                out.append((c0, 2 * c1, 3 * c2, extra_r))
        return out

    targets = [
        ("Delta-M", increment(base, 0), arm_reserves()),
        # Validity reserves an arm of the preceding type.
        ("Delta-T", increment(base, 1), arm_reserves(0)),
        ("Delta-U", increment(base, 2), arm_reserves(1)),
        ("Delta-R", increment(base, 3), arm_reserves(2)),
        ("L2-L1", values["L2"] - base, arm_reserves(1)),
        ("L3-L1", values["L3"] - base, arm_reserves(2)),
        ("L4+-L1", values["L4+"] - base, arm_reserves(2, extra_r=1)),
    ]
    for index, (name, poly, reserves) in enumerate(targets):
        minimum = None
        witness = None
        degree = poly.total_degree()
        for reserve_index, reserve in enumerate(reserves):
            expression, _ = normalized_expression(poly, reserve)
            candidate = random_minimum(
                expression,
                seed=993 + 100 * index + reserve_index,
            )
            if minimum is None or candidate[0] < minimum:
                minimum = candidate[0]
                witness = (reserve, candidate)
        print(
            f"{name}: degree={degree} source_terms={len(poly.terms())} "
            f"cells={len(reserves)} random_min={minimum} witness={witness}",
            flush=True,
        )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
