#!/usr/bin/env python3
"""Explore exact rooted-tree invariants at fugacity three.

This is a discovery aid, not a proof.  It enumerates every choice of root in
every unlabeled tree through the requested order and records the closest
states for several candidate inequalities used in the rooted induction.
"""

from __future__ import annotations

import argparse
import json
from dataclasses import dataclass
from fractions import Fraction
from pathlib import Path

import networkx as nx


@dataclass(frozen=True)
class State:
    z0: int
    z1: int
    m0: int
    m1: int
    alpha0: int
    alpha1: int

    @property
    def z(self) -> int:
        return self.z0 + self.z1

    @property
    def m(self) -> int:
        return self.m0 + self.m1

    @property
    def alpha(self) -> int:
        return max(self.alpha0, self.alpha1)

    @property
    def s(self) -> int:
        return self.alpha - self.alpha0

    @property
    def u(self) -> Fraction:
        return Fraction(self.z0, self.z)

    @property
    def d(self) -> Fraction:
        return Fraction(3 * self.m, self.z) - 2 * self.alpha

    @property
    def d0(self) -> Fraction:
        return Fraction(3 * self.m0, self.z0) - 2 * self.alpha0


def rooted_state(tree: nx.Graph, root: int) -> State:
    def visit(vertex: int, parent: int | None) -> State:
        children = [
            visit(child, vertex)
            for child in tree[vertex]
            if child != parent
        ]

        z0 = 1
        m0 = 0
        alpha0 = 0
        for child in children:
            child_z = child.z
            m0 = m0 * child_z + z0 * child.m
            z0 *= child_z
            alpha0 += child.alpha

        z1 = 3
        m1 = 3
        alpha1 = 1
        for child in children:
            m1 = m1 * child.z0 + z1 * child.m0
            z1 *= child.z0
            alpha1 += child.alpha0

        return State(z0, z1, m0, m1, alpha0, alpha1)

    return visit(root, None)


def ratio(num: Fraction, den: Fraction) -> Fraction | None:
    if den == 0:
        return None
    return num / den


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--max-order", type=int, default=15)
    parser.add_argument("--output", type=Path, required=True)
    args = parser.parse_args()

    candidates = {
        "s1_d_minus_quarter": None,
        "s0_d_over_minus_log_u_proxy": None,
        "s0_iii_margin": None,
        "s0_iii_plus_quadratic_margin": None,
        "s0_iii_margin_over_one_minus_u_squared": None,
    }
    witnesses: dict[str, dict[str, object]] = {}
    distinct_states: set[State] = set()
    total_rootings = 0

    for order in range(1, args.max_order + 1):
        trees = [nx.empty_graph(1)] if order == 1 else nx.nonisomorphic_trees(order)
        tree_count = 0
        for tree_index, tree in enumerate(trees):
            tree_count += 1
            graph6 = nx.to_graph6_bytes(tree, header=False).decode().strip()
            for root in tree:
                total_rootings += 1
                state = rooted_state(tree, root)
                if state in distinct_states:
                    continue
                distinct_states.add(state)

                u = state.u
                d = state.d
                d0 = state.d0
                if state.s == 1:
                    values = {
                        "s1_d_minus_quarter": d - Fraction(1, 4),
                    }
                else:
                    iii_margin = (
                        d + 3 * u * d0
                        - Fraction(9, 4) * (1 - u)
                    )
                    values = {
                        "s0_iii_margin": iii_margin,
                        "s0_iii_plus_quadratic_margin": (
                            iii_margin - Fraction(1, 8) * (1 - u) ** 2
                        ),
                        "s0_iii_margin_over_one_minus_u_squared": ratio(
                            iii_margin, (1 - u) ** 2
                        ),
                    }

                for name, value in values.items():
                    if value is None:
                        continue
                    if candidates[name] is None or value < candidates[name]:
                        candidates[name] = value
                        witnesses[name] = {
                            "order": order,
                            "tree_index": tree_index,
                            "graph6": graph6,
                            "root": root,
                            "s": state.s,
                            "u": [u.numerator, u.denominator],
                            "d": [d.numerator, d.denominator],
                            "d0": [d0.numerator, d0.denominator],
                            "value": [value.numerator, value.denominator],
                            "value_float": float(value),
                        }

        print(
            f"n={order}: trees={tree_count:,}, "
            f"rootings={total_rootings:,}, states={len(distinct_states):,}",
            flush=True,
        )

    report = {
        "max_order": args.max_order,
        "total_rootings": total_rootings,
        "distinct_states": len(distinct_states),
        "minima": witnesses,
    }
    args.output.write_text(json.dumps(report, indent=2) + "\n")
    print(json.dumps(report, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
