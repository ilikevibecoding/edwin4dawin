#!/usr/bin/env python3
"""Exact diagnostic for a possible q-envelope -> component-payment bridge.

For a forest F and independent q-set residual-edge counts E_q, the exact
denominator-free payment is

  P_q/S^2 = q + x(x-y) + t(1-t-3z/2).

The all-rank envelope gives q_(q+2)<=q_3, hence the adverse z term is at
most 3*x*q_3.  The exact term t(1-t) must be retained: q_2 can exceed 1/2,
so t need not be at most one.  This probe checks the resulting sufficient
inequality q+x(x-y)+t(1-t)-3*x*q_3>=0 exactly.  A failure only refutes this
envelope-only bridge, not the component payment or the forest theorem.
"""

from __future__ import annotations

import argparse
from fractions import Fraction

import networkx as nx

from prove_terminal_q3_low_newton_m1_j3_general_root import TreeRows, coeff
from verify_edge_survival_payment_reduction import galvin_tree


def graph_audit(tree, label):
    independent, one_edge = TreeRows(tree).whole()
    if coeff(independent, 3) == 0:
        return label, None, None
    q3 = Fraction(coeff(one_edge, 4), 3 * coeff(independent, 3))
    minimum = None
    minimum_q5plus = None
    minimum_actual = None
    worst_slack_fraction = None
    worst_slack_fraction_q7plus = None
    for q in range(1, len(independent) - 3):
        if not all(
            coeff(independent, rank) for rank in (q + 1, q + 2, q + 3)
        ):
            continue
        x = Fraction(
            (q + 2) * coeff(independent, q + 2),
            coeff(independent, q + 1),
        )
        y = Fraction(
            (q + 3) * coeff(independent, q + 3),
            coeff(independent, q + 2),
        )
        t = Fraction(
            2 * coeff(one_edge, q + 2),
            (q + 1) * coeff(independent, q + 1),
        )
        margin = q + x * (x - y) + t * (1 - t) - 3 * x * q3
        q_next = Fraction(
            coeff(one_edge, q + 3),
            (q + 2) * coeff(independent, q + 2),
        )
        available = 3 * x * (q3 - q_next)
        actual = margin + available
        record = (margin, q, x, y, q3, t)
        if minimum is None or record < minimum:
            minimum = record
        if q >= 5 and (minimum_q5plus is None or record < minimum_q5plus):
            minimum_q5plus = record
        actual_record = (actual, q)
        if minimum_actual is None or actual_record < minimum_actual:
            minimum_actual = actual_record
        if margin < 0 and available > 0:
            fraction_record = (Fraction(-margin, available), q)
            if (
                worst_slack_fraction is None
                or fraction_record > worst_slack_fraction
            ):
                worst_slack_fraction = fraction_record
            if q >= 7 and (
                worst_slack_fraction_q7plus is None
                or fraction_record > worst_slack_fraction_q7plus
            ):
                worst_slack_fraction_q7plus = fraction_record
    compact = lambda record: None if record is None else tuple(
        float(value) if isinstance(value, Fraction) else value for value in record
    )
    return {
        "label": label,
        "minimum_envelope_bound": compact(minimum[:2] if minimum else None),
        "minimum_envelope_bound_q5plus": compact(
            minimum_q5plus[:2] if minimum_q5plus else None
        ),
        "minimum_actual_payment": compact(minimum_actual),
        "maximum_required_anchor_slack_fraction": compact(worst_slack_fraction),
        "maximum_required_anchor_slack_fraction_q7plus": compact(
            worst_slack_fraction_q7plus
        ),
    }


def audit(max_order: int):
    checks = 0
    minimum = None
    minimum_q4plus = None
    minima_by_q = {}
    self_minimum = None
    self_minimum_q2plus = None
    failures = []
    self_failures = []
    self_failures_q2plus = []
    for order in range(4, max_order + 1):
        for index, tree0 in enumerate(nx.nonisomorphic_trees(order)):
            tree = nx.convert_node_labels_to_integers(tree0, ordering="sorted")
            independent, one_edge = TreeRows(tree).whole()
            if coeff(independent, 3) == 0:
                continue
            q3 = Fraction(coeff(one_edge, 4), 3 * coeff(independent, 3))
            for q in range(1, len(independent) - 3):
                if not all(coeff(independent, rank) for rank in (q + 1, q + 2, q + 3)):
                    continue
                x = Fraction((q + 2) * coeff(independent, q + 2), coeff(independent, q + 1))
                y = Fraction((q + 3) * coeff(independent, q + 3), coeff(independent, q + 2))
                t = Fraction(
                    2 * coeff(one_edge, q + 2),
                    (q + 1) * coeff(independent, q + 1),
                )
                margin = q + x * (x - y) + t * (1 - t) - 3 * x * q3
                q_current = t / 2
                self_margin = (
                    q + x * (x - y) + t * (1 - t)
                    - 3 * x * q_current
                )
                record = (margin, order, index, q, x, y, q3, t)
                self_record = (
                    self_margin, order, index, q, x, y, q3, t
                )
                checks += 1
                if minimum is None or record < minimum:
                    minimum = record
                if q >= 4 and (minimum_q4plus is None or record < minimum_q4plus):
                    minimum_q4plus = record
                if q not in minima_by_q or record < minima_by_q[q]:
                    minima_by_q[q] = record
                if self_minimum is None or self_record < self_minimum:
                    self_minimum = self_record
                if q >= 2 and (
                    self_minimum_q2plus is None
                    or self_record < self_minimum_q2plus
                ):
                    self_minimum_q2plus = self_record
                if margin < 0 and len(failures) < 20:
                    failures.append(record)
                if self_margin < 0 and len(self_failures) < 20:
                    self_failures.append(self_record)
                if (
                    q >= 2 and self_margin < 0
                    and len(self_failures_q2plus) < 20
                ):
                    self_failures_q2plus.append(self_record)
    return (
        checks, minimum, minimum_q4plus, minima_by_q, failures,
        self_minimum, self_failures,
        self_minimum_q2plus, self_failures_q2plus,
    )


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--order", type=int, default=14)
    args = parser.parse_args()
    (
        checks, minimum, minimum_q4plus, minima_by_q, failures,
        self_minimum, self_failures,
        self_minimum_q2plus, self_failures_q2plus,
    ) = audit(args.order)
    print("checks", checks)
    print("minimum", minimum)
    print("minimum_q4plus", minimum_q4plus)
    print("minima_by_q", minima_by_q)
    print("failures", failures)
    print("self_anchor_minimum", self_minimum)
    print("self_anchor_failures", self_failures)
    print("self_anchor_minimum_q2plus", self_minimum_q2plus)
    print("self_anchor_failures_q2plus", self_failures_q2plus)
    for branches, arms in ((14, 8), (21, 11), (40, 20)):
        print(
            "hard_family",
            graph_audit(
                galvin_tree(branches, arms),
                f"Galvin_T_{branches}_{arms}",
            ),
        )


if __name__ == "__main__":
    main()
