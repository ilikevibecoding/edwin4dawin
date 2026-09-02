#!/usr/bin/env python3
"""Exact adversarial probe of the eight low terminal-payment Newton coefficients.

This is diagnostic only.  It enumerates unlabelled trees, marked vertices, and
supported target ranks, reconstructs the untruncated terminal q3 payment
polynomial at t=1+s, and records forward differences Delta^m p(0), 0<=m<=7.
"""

from __future__ import annotations

import argparse
import json
from fractions import Fraction
from pathlib import Path

import networkx as nx

from verify_terminal_q3_included_payment_finite_all_t_independent_agent import (
    closed_neighborhood,
    delete_vertices,
    isolate_convolution_coefficient,
    poly_add,
    poly_multiply,
    poly_scale,
    poly_subtract,
    rows,
    shifted_binomial_polynomials,
)


def evaluate(poly: list[Fraction], value: int) -> Fraction:
    result = Fraction(0)
    for coefficient in reversed(poly):
        result = result * value + coefficient
    return result


def low_newton(poly: list[Fraction], maximum: int = 7) -> list[Fraction]:
    values = [evaluate(poly, point) for point in range(maximum + 1)]
    output = []
    for _ in range(maximum + 1):
        output.append(values[0])
        values = [right - left for left, right in zip(values, values[1:])]
        if not values:
            break
    return output


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--order", type=int, default=15)
    parser.add_argument("--tree-start", type=int, default=0)
    parser.add_argument("--tree-stop", type=int)
    parser.add_argument("--output", type=Path)
    args = parser.parse_args()

    order = args.order
    binomials = shifted_binomial_polynomials(order + 3)
    minima: list[Fraction | None] = [None] * 8
    witnesses: list[dict[str, object] | None] = [None] * 8
    negatives = [0] * 8
    zeros = [0] * 8
    bprime_minima: list[Fraction | None] = [None] * 5
    bprime_witnesses: list[dict[str, object] | None] = [None] * 5
    bprime_negatives = [0] * 5
    full_minima: list[Fraction | None] = [None] * 8
    full_negatives = [0] * 8
    outside_minima: list[Fraction | None] = [None] * 8
    outside_negatives = [0] * 8
    compensation_ratio_minima: list[Fraction | None] = [None] * 8
    compensation_ratio_witnesses: list[dict[str, object] | None] = [None] * 8
    trees = marked = ranks = coefficient_checks = 0

    source = nx.nonisomorphic_trees(order)
    for tree_index, tree in enumerate(source):
        if tree_index < args.tree_start:
            continue
        if args.tree_stop is not None and tree_index >= args.tree_stop:
            break
        trees += 1
        tree = nx.convert_node_labels_to_integers(tree, ordering="sorted")
        independent_g, residual_g = rows(tree)
        A3 = isolate_convolution_coefficient(independent_g, 3, binomials)
        d0 = poly_scale(A3, 3)
        c0 = isolate_convolution_coefficient(residual_g, 2, binomials)
        graph6 = nx.to_graph6_bytes(tree, header=False).decode().strip()

        for root in tree.nodes():
            marked += 1
            F = delete_vertices(tree, {root})
            H = delete_vertices(tree, closed_neighborhood(tree, root))
            f, z = rows(F)
            h, _ = rows(H)
            f2 = f[2] if len(f) > 2 else 0
            if not f2:
                continue
            z2 = z[1] if len(z) > 1 else 0
            h2 = h[2] if len(h) > 2 else 0
            d1 = 3 * f2
            c1 = [Fraction(z2 + h2 + f2), Fraction(f2)]
            anchor_gap = poly_subtract(
                poly_multiply(c1, d0), poly_scale(c0, d1)
            )

            for index in range(3, len(f)):
                fj = f[index]
                if not fj:
                    continue
                zj = z[index - 1] if index - 1 < len(z) else 0
                hj = h[index] if index < len(h) else 0
                D1 = (index + 1) * fj
                C1 = [Fraction(zj + hj + fj), Fraction(fj)]
                M1 = poly_subtract(poly_scale(c1, D1), poly_scale(C1, d1))
                # In the exact tail split, the low remainder factors as
                #   L=a*P*B',
                #   B'=(j+1)b(c+R)-3(P+a)e.
                # Testing B' itself detects whether a manifestly Newton-positive
                # factorization can close all eight coefficients at once.
                bprime = poly_subtract(
                    poly_scale(poly_add(c1, c0), D1),
                    poly_scale(poly_multiply(poly_add(A3, [Fraction(f2)]), C1), 3),
                )
                bprime_coefficients = low_newton(bprime, 4)
                D0 = poly_scale(
                    isolate_convolution_coefficient(
                        independent_g, index + 1, binomials
                    ),
                    index + 1,
                )
                C0 = isolate_convolution_coefficient(residual_g, index, binomials)
                outside_margin = poly_subtract(
                    poly_multiply(c0, D0), poly_multiply(d0, C0)
                )
                full_margin = poly_subtract(
                    poly_multiply(poly_add(c0, c1), poly_add(D0, [Fraction(D1)])),
                    poly_multiply(poly_add(d0, [Fraction(d1)]), poly_add(C0, C1)),
                )
                outside_coefficients = low_newton(outside_margin)
                full_coefficients = low_newton(full_margin)
                weight_shift = poly_subtract(
                    poly_scale(d0, D1), poly_scale(D0, d1)
                )
                lhs = poly_multiply(
                    poly_multiply(poly_add(d0, [Fraction(d1)]), d0), M1
                )
                margin = poly_subtract(
                    lhs, poly_multiply(anchor_gap, weight_shift)
                )
                coefficients = low_newton(margin)
                main_payment = poly_scale(
                    poly_multiply(anchor_gap, D0), d1
                )
                low_remainder = poly_subtract(margin, main_payment)
                main_coefficients = low_newton(main_payment)
                low_coefficients = low_newton(low_remainder)
                assert all(
                    total == positive + low
                    for total, positive, low in zip(
                        coefficients, main_coefficients, low_coefficients
                    )
                )
                ranks += 1
                coefficient_checks += len(coefficients)
                for newton_rank, coefficient in enumerate(coefficients):
                    negatives[newton_rank] += coefficient < 0
                    zeros[newton_rank] += coefficient == 0
                    if minima[newton_rank] is None or coefficient < minima[newton_rank]:
                        minima[newton_rank] = coefficient
                        witnesses[newton_rank] = {
                            "order": order,
                            "tree_index": tree_index,
                            "graph6": graph6,
                            "root": root,
                            "target_rank": index + 1,
                            "newton_rank": newton_rank,
                            "coefficient": str(coefficient),
                        }
                for newton_rank, coefficient in enumerate(bprime_coefficients):
                    bprime_negatives[newton_rank] += coefficient < 0
                    if (
                        bprime_minima[newton_rank] is None
                        or coefficient < bprime_minima[newton_rank]
                    ):
                        bprime_minima[newton_rank] = coefficient
                        bprime_witnesses[newton_rank] = {
                            "order": order,
                            "tree_index": tree_index,
                            "graph6": graph6,
                            "root": root,
                            "target_rank": index + 1,
                            "newton_rank": newton_rank,
                            "coefficient": str(coefficient),
                        }
                for newton_rank, coefficient in enumerate(outside_coefficients):
                    outside_negatives[newton_rank] += coefficient < 0
                    if (
                        outside_minima[newton_rank] is None
                        or coefficient < outside_minima[newton_rank]
                    ):
                        outside_minima[newton_rank] = coefficient
                for newton_rank, coefficient in enumerate(full_coefficients):
                    full_negatives[newton_rank] += coefficient < 0
                    if (
                        full_minima[newton_rank] is None
                        or coefficient < full_minima[newton_rank]
                    ):
                        full_minima[newton_rank] = coefficient
                for newton_rank, (positive, low) in enumerate(
                    zip(main_coefficients, low_coefficients)
                ):
                    if low >= 0:
                        continue
                    ratio = positive / (-low)
                    if (
                        compensation_ratio_minima[newton_rank] is None
                        or ratio < compensation_ratio_minima[newton_rank]
                    ):
                        compensation_ratio_minima[newton_rank] = ratio
                        compensation_ratio_witnesses[newton_rank] = {
                            "order": order,
                            "tree_index": tree_index,
                            "graph6": graph6,
                            "root": root,
                            "target_rank": index + 1,
                            "newton_rank": newton_rank,
                            "positive_anchor_shadow": str(positive),
                            "negative_low_remainder": str(low),
                            "ratio": str(ratio),
                        }

        if trees % 100 == 0:
            print(
                f"trees={trees:,} last_index={tree_index:,} "
                f"ranks={ranks:,} negatives={sum(negatives):,}",
                flush=True,
            )

    report = {
        "status": (
            "PASS_DIAGNOSTIC_NO_NEGATIVE_LOW_NEWTON"
            if not any(negatives)
            else "FAIL_DIAGNOSTIC_NEGATIVE_LOW_NEWTON"
        ),
        "scope": "Diagnostic only; this is not an all-order proof.",
        "order": order,
        "tree_start": args.tree_start,
        "tree_stop": args.tree_stop,
        "counts": {
            "trees": trees,
            "marked": marked,
            "rank_polynomials": ranks,
            "coefficient_checks": coefficient_checks,
        },
        "negative_counts": negatives,
        "zero_counts": zeros,
        "minima": [str(value) for value in minima],
        "witnesses": witnesses,
        "low_remainder_inner_factor": {
            "identity": "B'=(j+1)b(c+R)-3(P+a)e and L=a*P*B'",
            "negative_counts": bprime_negatives,
            "minima": [str(value) for value in bprime_minima],
            "witnesses": bprime_witnesses,
        },
        "outside_block_margin": {
            "negative_counts": outside_negatives,
            "minima": [str(value) for value in outside_minima],
        },
        "full_q3_envelope_margin": {
            "negative_counts": full_negatives,
            "minima": [str(value) for value in full_minima],
        },
        "anchor_compensation_ratio": {
            "definition": "positive anchor-shadow Newton coefficient divided by the magnitude of a negative low-remainder coefficient",
            "minima": [str(value) for value in compensation_ratio_minima],
            "witnesses": compensation_ratio_witnesses,
        },
    }
    print(json.dumps(report, indent=2))
    if args.output:
        args.output.write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    if any(negatives):
        raise SystemExit(1)


if __name__ == "__main__":
    main()
