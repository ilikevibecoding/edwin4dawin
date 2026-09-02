#!/usr/bin/env python3
"""Probe the exact large-large connected-subcubic component tensor gap."""

from __future__ import annotations

import hashlib
import itertools

import sympy as sp

from probe_iso_n7_bundle_g5_threshold11_fast_rank7_g5_tail import (
    fast_tensor_bernstein,
)
from prove_iso_n7_bundle_g1_sum0_connected_subcubic_no_parent_universal_rank7_g4_piecewise import (
    choose,
)

START = 8


def q(rows):
    w3, w4, w5, w6, w7, w8 = (rows[index] for index in range(3, 9))
    return sp.expand(
        8*w3*w3+24*w3*w4-64*w3*w5-106*w3*w6-51*w3*w7
        -8*w3*w8+80*w4*w4+90*w4*w5-12*w4*w6-10*w4*w7
        +39*w5*w5+10*w5*w6
    )


def relaxed_rows(m, x, y, z, label):
    if label == "path":
        return tuple(choose(m-rank+1, rank) for rank in range(9))
    elif label == "low":
        cubic = 1+(m-4)*x/3
        p4_minimum = m+cubic-5
        p4_maximum = m+3*cubic-4
    else:
        cubic = (m-1)/3+(m-4)*x/6
        p4_minimum = 4*cubic-4
        p4_maximum = 2*m-8
    omega = m+cubic-2
    p4 = p4_minimum+(p4_maximum-p4_minimum)*y
    j4 = choose(m-1, 2)-omega-p4
    lower = omega*(m-3)-9*cubic-6*p4
    magnitude = lower+(j4*(m-4)-lower)*z
    d = {
        0: sp.Integer(1), 1: sp.Integer(0), 2: 1-m, 3: omega,
        4: j4-cubic, 5: -magnitude, 6: 3*magnitude,
        7: (
            omega*choose(m-3, 2)-(m-6)*(3*cubic+2*p4)
            +2*p4*(m-5)+80*cubic
        ),
        8: (
            choose(m-1, 4)-omega*choose(m-3, 2)/6
            +choose(cubic, 2)+40*cubic+8*omega+p4
        ),
    }
    return tuple(
        sp.expand(sum(d[v]*choose(m-v, rank-v) for v in range(rank+1)))
        for rank in range(9)
    )


def certify(expression, variables, tails):
    degrees, controls = fast_tensor_bernstein(expression, variables)
    minimum = None
    scalar_minimum = None
    scalar_count = 0
    stream = hashlib.sha256()
    for index in sorted(controls):
        value = controls[index]
        stream.update(f"{degrees}|{index}|{sp.srepr(value)};".encode())
        polynomial = sp.Poly(sp.expand(value), *tails)
        assert polynomial.free_symbols <= set(tails)
        coefficients = polynomial.coeffs()
        assert coefficients and all(coefficient >= 0 for coefficient in coefficients), (
            index, value, [(monomial, coefficient) for monomial, coefficient in polynomial.terms() if coefficient < 0][:10]
        )
        scalar_count += len(coefficients)
        local = min(coefficients)
        scalar_minimum = local if scalar_minimum is None else min(scalar_minimum, local)
        at_origin = value.subs({tail: 0 for tail in tails})
        minimum = at_origin if minimum is None else min(minimum, at_origin)
    return {
        "degree_profile": degrees,
        "controls": len(controls),
        "tail_scalars": scalar_count,
        "minimum_at_origin": minimum,
        "minimum_tail_scalar": scalar_minimum,
        "stream": stream.hexdigest().upper(),
    }


def main() -> None:
    m1, m2, t1, t2 = sp.symbols("m1 m2 t1 t2", nonnegative=True)
    x1, y1, z1, x2, y2, z2 = sp.symbols(
        "x1 y1 z1 x2 y2 z2", nonnegative=True
    )
    for left_label, right_label in itertools.product(("path", "low", "high"), repeat=2):
        left = relaxed_rows(m1, x1, y1, z1, left_label)
        right = relaxed_rows(m2, x2, y2, z2, right_label)
        product = tuple(
            sp.expand(sum(left[index]*right[rank-index] for index in range(rank+1)))
            for rank in range(9)
        )
        gap = sp.expand(q(product)-q(left)-q(right))
        shifted = sp.expand(gap.subs({m1: t1+START, m2: t2+START}))
        result = certify(shifted, (x1, y1, z1, x2, y2, z2), (t1, t2))
        print(left_label, right_label, result)


if __name__ == "__main__":
    main()
