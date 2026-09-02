#!/usr/bin/env python3
"""Test simple relaxations for the component/branching-surplus candidate."""

from __future__ import annotations

import argparse
import math
from fractions import Fraction

import networkx as nx

from scan_fixed_rank_leaf_curvature_fast import all_root_states


def choose(n: int, k: int) -> int:
    return math.comb(n, k) if n >= k else 0


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--max-order", type=int, default=16)
    parser.add_argument("--min-surplus", type=int, default=0)
    args = parser.parse_args()
    for n in range(10, args.max_order + 1):
        W = choose(n - 2, 2)
        path_i5 = choose(n - 4, 5)
        minima = [None, None, None, None]
        witnesses = [None, None, None, None]
        maximum_negative_surplus = [None, None, None, None]
        maximum_negative_witness = [None, None, None, None]
        for index, tree in enumerate(nx.nonisomorphic_trees(n)):
            surplus = sum(
                choose(tree.degree(v) - 1, 2) for v in tree
            )
            if surplus < args.min_surplus:
                continue
            matching2 = W - surplus
            upper_r = sum(
                choose(n - tree.degree(u) - tree.degree(v), 4)
                for u, v in tree.edges()
            )
            _, poly = all_root_states(tree, 5)
            i4 = poly[4] if len(poly) > 4 else 0
            i5 = poly[5] if len(poly) > 5 else 0
            kappa = Fraction(n**3 - 8 * n**2 - 19 * n + 302, 6)
            quantitative_path_i5 = Fraction(
                (n - 7) * (n - 8) * choose(n - 3, 4), 5 * (n - 3)
            ) + Fraction(kappa * surplus, 5 * (n - 3))
            quantitative_exact_i4_i5 = Fraction(
                (n - 7) * (n - 8) * i4, 5 * (n - 3)
            ) + Fraction(kappa * surplus, 5 * (n - 3))
            values = (
                matching2 * 5 * path_i5 - W * upper_r,
                matching2 * 5 * i5 - W * upper_r,
                matching2 * 5 * quantitative_path_i5 - W * upper_r,
                matching2 * 5 * quantitative_exact_i4_i5 - W * upper_r,
            )
            for lane, value in enumerate(values):
                if minima[lane] is None or value < minima[lane]:
                    minima[lane] = value
                    witnesses[lane] = (
                        index,
                        surplus,
                        matching2,
                        upper_r,
                        i5,
                        nx.to_graph6_bytes(tree, header=False).decode().strip(),
                    )
                if value < 0 and (
                    maximum_negative_surplus[lane] is None
                    or surplus > maximum_negative_surplus[lane]
                ):
                    maximum_negative_surplus[lane] = surplus
                    maximum_negative_witness[lane] = (
                        value,
                        index,
                        surplus,
                        matching2,
                        upper_r,
                        i5,
                        nx.to_graph6_bytes(tree, header=False).decode().strip(),
                    )
        print(
            f"n={n} path_i5_relax={minima[0]} witness={witnesses[0]} "
            f"exact_i5_relax={minima[1]} witness={witnesses[1]} "
            f"quant_path_i5_relax={minima[2]} witness={witnesses[2]} "
            f"quant_exact_i4_relax={minima[3]} witness={witnesses[3]} "
            f"max_negative_e={maximum_negative_surplus} "
            f"max_negative_witness={maximum_negative_witness}",
            flush=True,
        )


if __name__ == "__main__":
    main()
