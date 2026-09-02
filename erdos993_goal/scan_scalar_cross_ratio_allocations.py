#!/usr/bin/env python3
"""Probe exact allocations in the cross-ratio form of Q-Cascade.

This is a falsifier, not a proof.  For each pendant edge and each
required prefix rank it decomposes (CR) as

    A + B + C >= R,

where A=v*delta_T, B=2*s*delta_F,
C=s*u/(k-1)+s/2, and
R=theta*(v-k*u/(k-1))^2.
"""

from __future__ import annotations

import argparse
import json
from fractions import Fraction
from pathlib import Path

import networkx as nx

from leaf_addition_pendant_monotonicity_scan import (
    MaskIndependencePolynomial,
    graph6,
)


def coeff(poly: tuple[int, ...] | list[int], rank: int) -> int:
    return poly[rank] if 0 <= rank < len(poly) else 0


def encoded(value: Fraction) -> dict[str, str | float]:
    return {"exact": str(value), "decimal": float(value)}


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--max-order", type=int, default=16)
    parser.add_argument("--min-rank", type=int, default=5)
    parser.add_argument("--terminal-only", action="store_true")
    parser.add_argument("--out", type=Path, required=True)
    args = parser.parse_args()

    checks = 0
    terminal_checks = 0
    minima: dict[str, tuple[Fraction, dict] | None] = {
        "full": None,
        "without_T_curvature": None,
        "without_F_curvature": None,
        "incidence_only": None,
        "gap": None,
        "s": None,
        "previous_absence": None,
        "next_absence": None,
        "C12_full_scalar": None,
        "C12_half_local": None,
    }
    maxima: dict[str, tuple[Fraction, dict] | None] = {
        "gap": None,
        "R_over_total_payment": None,
        "R_over_A_plus_C": None,
        "R_over_B_plus_C": None,
        "curvature_fraction_needed": None,
        "T_curvature_fraction_needed": None,
        "C12_same_rank_fraction_needed": None,
    }
    best_full_by_instance: dict[
        tuple[int, int, int], tuple[Fraction, dict]
    ] = {}
    best_ratio_by_instance: dict[
        tuple[int, int, int], tuple[Fraction, dict]
    ] = {}
    best_t_fraction_by_instance: dict[
        tuple[int, int, int], tuple[Fraction, dict]
    ] = {}
    best_any_t_fraction_by_instance: dict[
        tuple[int, int, int], tuple[Fraction, dict]
    ] = {}
    best_c12_fraction_by_instance: dict[
        tuple[int, int, int], tuple[Fraction, dict]
    ] = {}

    def update_min(name: str, value: Fraction, item: dict) -> None:
        old = minima[name]
        if old is None or value < old[0]:
            minima[name] = (value, item)

    def update_max(name: str, value: Fraction, item: dict) -> None:
        old = maxima[name]
        if old is None or value > old[0]:
            maxima[name] = (value, item)

    for order in range(2, args.max_order + 1):
        tree_count = 0
        for tree_index, tree in enumerate(nx.nonisomorphic_trees(order)):
            tree_count += 1
            engine = MaskIndependencePolynomial(tree)
            full_mask = (1 << order) - 1
            full = engine.polynomial(full_mask)
            alpha = len(full) - 1
            cutoff = (2 * alpha + 1) // 3
            code = None
            for leaf in (v for v in tree if tree.degree(v) == 1):
                support = next(iter(tree[leaf]))
                terminal = (
                    sum(
                        tree.degree(neighbor) > 1
                        for neighbor in tree[support]
                    )
                    <= 1
                )
                if args.terminal_only and not terminal:
                    continue
                t_mask = full_mask ^ (1 << engine.position[leaf])
                f_mask = t_mask ^ (1 << engine.position[support])
                t_poly = engine.polynomial(t_mask)
                f_poly = engine.polynomial(f_mask)
                for k in range(args.min_rank, cutoff):
                    r = k - 1
                    a = coeff(t_poly, r)
                    ap = coeff(t_poly, r + 1)
                    app = coeff(t_poly, r + 2)
                    bm = coeff(f_poly, r - 1)
                    b = coeff(f_poly, r)
                    bp = coeff(f_poly, r + 1)
                    if min(a, ap, bm, b) <= 0:
                        continue
                    s = Fraction(b, a)
                    u = Fraction(r * b, bm)
                    w = Fraction(k * bp, b)
                    v = Fraction(k * ap, a)
                    y = Fraction((k + 1) * app, ap)
                    delta_t = v - y - Fraction(1, 2)
                    delta_f = u - w - Fraction(1, 2)
                    theta = Fraction(bm, a + bm)
                    gap = v - Fraction(k, r) * u
                    A = v * delta_t
                    B = 2 * s * delta_f
                    C = s * u / r + s / 2
                    R = theta * gap * gap
                    full_margin = A + B + C - R
                    checks += 1
                    terminal_checks += int(terminal)
                    if code is None:
                        code = graph6(tree)
                    item = {
                        "order": order,
                        "tree_index": tree_index,
                        "graph6": code,
                        "leaf": leaf,
                        "support": support,
                        "terminal": terminal,
                        "alpha": alpha,
                        "cutoff": cutoff,
                        "rank": k,
                        "full": list(full),
                        "T": list(t_poly),
                        "F": list(f_poly),
                        "A": str(A),
                        "B": str(B),
                        "C": str(C),
                        "R": str(R),
                        "gap": str(gap),
                    }
                    sigma_t_ordinary = delta_t + Fraction(3, 2)
                    sigma_f_ordinary = delta_f + Fraction(3, 2)
                    ordinary_scalar = (
                        v * sigma_t_ordinary
                        + 2 * s * sigma_f_ordinary
                        + s * u / r
                        - s
                        - R
                    )
                    c12_same_rank = (
                        2 * k * v * sigma_t_ordinary
                    )
                    c12_local = (
                        2
                        * k
                        * (
                            ordinary_scalar
                            - v * sigma_t_ordinary
                        )
                        + r * (k * s - v) * sigma_f_ordinary
                    )
                    c12_full = c12_same_rank + c12_local
                    c12_half_local = (
                        c12_local + c12_same_rank / 2
                    )
                    item.update(
                        {
                            "C12_same_rank": str(c12_same_rank),
                            "C12_local": str(c12_local),
                            "C12_full_scalar": str(c12_full),
                            "C12_half_local": str(c12_half_local),
                        }
                    )
                    update_min("full", full_margin, item)
                    update_min("without_T_curvature", B + C - R, item)
                    update_min("without_F_curvature", A + C - R, item)
                    update_min("incidence_only", C - R, item)
                    update_min("gap", gap, item)
                    update_max("gap", gap, item)
                    update_min("s", s, item)
                    update_min("C12_full_scalar", c12_full, item)
                    update_min(
                        "C12_half_local", c12_half_local, item
                    )
                    if c12_local < 0 and c12_same_rank > 0:
                        c12_fraction = (
                            -c12_local / c12_same_rank
                        )
                        update_max(
                            "C12_same_rank_fraction_needed",
                            c12_fraction,
                            item,
                        )
                        if terminal:
                            key = (order, tree_index, k)
                            old_c12_fraction = (
                                best_c12_fraction_by_instance.get(key)
                            )
                            if (
                                old_c12_fraction is None
                                or c12_fraction
                                < old_c12_fraction[0]
                            ):
                                best_c12_fraction_by_instance[key] = (
                                    c12_fraction,
                                    item,
                                )
                    elif terminal and c12_same_rank > 0:
                        key = (order, tree_index, k)
                        zero_fraction = Fraction(0)
                        old_c12_fraction = (
                            best_c12_fraction_by_instance.get(key)
                        )
                        if (
                            old_c12_fraction is None
                            or zero_fraction < old_c12_fraction[0]
                        ):
                            best_c12_fraction_by_instance[key] = (
                                zero_fraction,
                                item,
                            )

                    am = coeff(t_poly, r - 1)
                    if am:
                        update_min(
                            "previous_absence",
                            Fraction(bm, am),
                            item,
                        )
                    if ap:
                        update_min(
                            "next_absence",
                            Fraction(bp, ap),
                            item,
                        )

                    total = A + B + C
                    if total > 0:
                        if terminal:
                            key = (order, tree_index, k)
                            old_full = best_full_by_instance.get(key)
                            if (
                                old_full is None
                                or full_margin > old_full[0]
                            ):
                                best_full_by_instance[key] = (
                                    full_margin,
                                    item,
                                )
                            ratio_here = R / total
                            old_ratio = best_ratio_by_instance.get(key)
                            if (
                                old_ratio is None
                                or ratio_here < old_ratio[0]
                            ):
                                best_ratio_by_instance[key] = (
                                    ratio_here,
                                    item,
                                )
                        update_max(
                            "R_over_total_payment",
                            R / total,
                            item,
                        )
                    if A + C > 0:
                        update_max(
                            "R_over_A_plus_C",
                            R / (A + C),
                            item,
                        )
                    if B + C > 0:
                        update_max(
                            "R_over_B_plus_C",
                            R / (B + C),
                            item,
                        )
                    if R > C and A + B > 0:
                        update_max(
                            "curvature_fraction_needed",
                            (R - C) / (A + B),
                            item,
                        )
                    if R > B + C and A > 0:
                        t_fraction = (R - B - C) / A
                        update_max(
                            "T_curvature_fraction_needed",
                            t_fraction,
                            item,
                        )
                        if terminal:
                            key = (order, tree_index, k)
                            old_t_fraction = (
                                best_t_fraction_by_instance.get(key)
                            )
                            if (
                                old_t_fraction is None
                                or t_fraction < old_t_fraction[0]
                            ):
                                best_t_fraction_by_instance[key] = (
                                    t_fraction,
                                    item,
                                )
                        key = (order, tree_index, k)
                        old_any_t_fraction = (
                            best_any_t_fraction_by_instance.get(key)
                        )
                        if (
                            old_any_t_fraction is None
                            or t_fraction < old_any_t_fraction[0]
                        ):
                            best_any_t_fraction_by_instance[key] = (
                                t_fraction,
                                item,
                            )
                    elif terminal and A > 0:
                        key = (order, tree_index, k)
                        zero_fraction = Fraction(0)
                        old_t_fraction = (
                            best_t_fraction_by_instance.get(key)
                        )
                        if (
                            old_t_fraction is None
                            or zero_fraction < old_t_fraction[0]
                        ):
                            best_t_fraction_by_instance[key] = (
                                zero_fraction,
                                item,
                            )
                        old_any_t_fraction = (
                            best_any_t_fraction_by_instance.get(key)
                        )
                        if (
                            old_any_t_fraction is None
                            or zero_fraction < old_any_t_fraction[0]
                        ):
                            best_any_t_fraction_by_instance[key] = (
                                zero_fraction,
                                item,
                            )
                    elif A > 0:
                        key = (order, tree_index, k)
                        zero_fraction = Fraction(0)
                        old_any_t_fraction = (
                            best_any_t_fraction_by_instance.get(key)
                        )
                        if (
                            old_any_t_fraction is None
                            or zero_fraction < old_any_t_fraction[0]
                        ):
                            best_any_t_fraction_by_instance[key] = (
                                zero_fraction,
                                item,
                            )
        print(f"n={order} trees={tree_count:,}", flush=True)

    def materialize(
        source: dict[str, tuple[Fraction, dict] | None]
    ) -> dict:
        result = {}
        for name, entry in source.items():
            if entry is None:
                result[name] = None
            else:
                value, item = entry
                result[name] = {"value": encoded(value), "witness": item}
        return result

    payload = {
        "status": "PASS_NOT_PROOF"
        if minima["full"] is not None and minima["full"][0] >= 0
        else "FAILURE",
        "max_order": args.max_order,
        "min_rank": args.min_rank,
        "terminal_only": args.terminal_only,
        "checks": checks,
        "terminal_checks": terminal_checks,
        "minima": materialize(minima),
        "maxima": materialize(maxima),
        "existential_terminal": {
            "minimum_best_full_margin": None,
            "maximum_best_R_over_total": None,
            "maximum_best_T_curvature_fraction": None,
            "maximum_best_any_leaf_T_curvature_fraction": None,
            "maximum_best_C12_same_rank_fraction": None,
        },
    }
    if best_full_by_instance:
        value, item = min(
            best_full_by_instance.values(),
            key=lambda entry: entry[0],
        )
        payload["existential_terminal"][
            "minimum_best_full_margin"
        ] = {"value": encoded(value), "witness": item}
    if best_ratio_by_instance:
        value, item = max(
            best_ratio_by_instance.values(),
            key=lambda entry: entry[0],
        )
        payload["existential_terminal"][
            "maximum_best_R_over_total"
        ] = {"value": encoded(value), "witness": item}
    if best_t_fraction_by_instance:
        value, item = max(
            best_t_fraction_by_instance.values(),
            key=lambda entry: entry[0],
        )
        payload["existential_terminal"][
            "maximum_best_T_curvature_fraction"
        ] = {"value": encoded(value), "witness": item}
    if best_any_t_fraction_by_instance:
        value, item = max(
            best_any_t_fraction_by_instance.values(),
            key=lambda entry: entry[0],
        )
        payload["existential_terminal"][
            "maximum_best_any_leaf_T_curvature_fraction"
        ] = {"value": encoded(value), "witness": item}
    if best_c12_fraction_by_instance:
        value, item = max(
            best_c12_fraction_by_instance.values(),
            key=lambda entry: entry[0],
        )
        payload["existential_terminal"][
            "maximum_best_C12_same_rank_fraction"
        ] = {"value": encoded(value), "witness": item}
    args.out.write_text(
        json.dumps(payload, indent=2) + "\n",
        encoding="utf-8",
    )
    print(json.dumps(payload, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
