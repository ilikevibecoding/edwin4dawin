#!/usr/bin/env python3
"""Probe all small/large subcubic component tensor seams."""

from __future__ import annotations

import networkx as nx
import sympy as sp

from probe_iso_n7_bundle_g1_sum0_subcubic_component_tensor_large_rank7_g4_piecewise import (
    certify,
    q,
    relaxed_rows,
)
from probe_iso_n7_bundle_g1_sum0_subcubic_component_tensor_rank7_g4_piecewise import (
    independence_polynomial,
)


def main() -> None:
    small = [(1, 0, (1, 1))]
    for order in range(2, 8):
        small.extend(
            (order, index, independence_polynomial(tree))
            for index, tree in enumerate(nx.nonisomorphic_trees(order))
            if max(dict(tree.degree()).values()) <= 3
        )
    m, tail = sp.symbols("m tail", nonnegative=True)
    x, y, z = sp.symbols("x y z", nonnegative=True)
    for order, index, polynomial in small:
        left = tuple(
            sp.Integer(polynomial[rank]) if rank < len(polynomial) else sp.Integer(0)
            for rank in range(9)
        )
        for label in ("path", "low", "high"):
            right = relaxed_rows(m, x, y, z, label)
            product = tuple(
                sp.expand(sum(left[j]*right[rank-j] for j in range(rank+1)))
                for rank in range(9)
            )
            gap = sp.expand(q(product)-q(left)-q(right))
            result = certify(
                sp.expand(gap.subs(m, tail+8)), (x, y, z), (tail,)
            )
            print(order, index, label, result["minimum_at_origin"], result["minimum_tail_scalar"])


if __name__ == "__main__":
    main()
