#!/usr/bin/env python3
"""Independent exact/adversarial audit of the eight low Newton coefficients.

For a tree G with a marked vertex w, let F=G-w and H=G-N[w].  This
program reconstructs the terminal two-block payment directly from induced
zero-edge and one-edge subset counts.  It never imports the existing terminal
payment producers.

The bundle parameter is t=1+s.  For each supported target j+1, the program
evaluates the normalized payment polynomial delta at s=0,...,7 and takes
forward differences.  Thus the recorded integers are exactly the
coefficients of binom(s,m), 0<=m<=7; no interpolation or floating arithmetic
is involved.

The finite result is search/certificate evidence, not an all-order proof.
"""

from __future__ import annotations

import argparse
from collections import Counter
from dataclasses import dataclass
from fractions import Fraction
import hashlib
import json
from math import comb
from pathlib import Path
import random
from typing import Iterable

import networkx as nx


HERE = Path(__file__).resolve().parent
OUTPUT = HERE / "terminal_q3_low_newton_adversarial_independent_20260829.json"
LOW_DEGREES = 8


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def add(left: list[int], right: list[int]) -> list[int]:
    out = [0] * max(len(left), len(right))
    for k, value in enumerate(left):
        out[k] += value
    for k, value in enumerate(right):
        out[k] += value
    while len(out) > 1 and out[-1] == 0:
        out.pop()
    return out


def shift(row: list[int]) -> list[int]:
    return [0, *row]


def multiply(left: list[int], right: list[int]) -> list[int]:
    out = [0] * (len(left) + len(right) - 1)
    for p, a in enumerate(left):
        if a:
            for q, b in enumerate(right):
                if b:
                    out[p + q] += a * b
    while len(out) > 1 and out[-1] == 0:
        out.pop()
    return out


def pair_product(
    left_zero: list[int],
    left_one: list[int],
    right_zero: list[int],
    right_one: list[int],
) -> tuple[list[int], list[int]]:
    """Multiply subset enumerators, retaining induced-edge counts 0 and 1."""
    return (
        multiply(left_zero, right_zero),
        add(multiply(left_one, right_zero), multiply(left_zero, right_one)),
    )


State = tuple[list[int], list[int], list[int], list[int]]


class TreeMessages:
    """All directed-component subset messages for one tree.

    A message (u,parent) has four rows: root u excluded/included crossed with
    induced-edge count zero/one.  This is an independent state derivation of
    all rows used by the terminal formulas.
    """

    def __init__(self, tree: nx.Graph):
        assert nx.is_tree(tree) or tree.number_of_nodes() == 1
        self.tree = tree
        self.cache: dict[tuple[int, int], State] = {}

    def message(self, vertex: int, parent: int) -> State:
        key = (vertex, parent)
        if key in self.cache:
            return self.cache[key]

        excluded_zero, excluded_one = [1], [0]
        included_zero, included_one = [1], [0]
        for child in self.tree.neighbors(vertex):
            if child == parent:
                continue
            ce0, ce1, ci0, ci1 = self.message(child, vertex)

            child_zero = add(ce0, ci0)
            child_one = add(ce1, ci1)
            excluded_zero, excluded_one = pair_product(
                excluded_zero,
                excluded_one,
                child_zero,
                child_one,
            )

            # If vertex and child are both selected, their connecting edge is
            # the unique induced edge; the child's internal edge count is zero.
            allowed_zero = ce0
            allowed_one = add(ce1, ci0)
            included_zero, included_one = pair_product(
                included_zero,
                included_one,
                allowed_zero,
                allowed_one,
            )

        state = (
            excluded_zero,
            excluded_one,
            shift(included_zero),
            shift(included_one),
        )
        self.cache[key] = state
        return state

    @staticmethod
    def total(state: State) -> tuple[list[int], list[int]]:
        e0, e1, i0, i1 = state
        return add(e0, i0), add(e1, i1)

    def forest_after_deleting_root(self, root: int) -> tuple[list[int], list[int]]:
        zero, one = [1], [0]
        for neighbor in self.tree.neighbors(root):
            child_zero, child_one = self.total(self.message(neighbor, root))
            zero, one = pair_product(zero, one, child_zero, child_one)
        return zero, one

    def forest_after_closed_neighborhood(self, root: int) -> tuple[list[int], list[int]]:
        zero, one = [1], [0]
        for neighbor in self.tree.neighbors(root):
            e0, e1, _i0, _i1 = self.message(neighbor, root)
            zero, one = pair_product(zero, one, e0, e1)
        return zero, one

    def whole_tree(self) -> tuple[list[int], list[int]]:
        return self.total(self.message(0, -1))


def coeff(row: list[int], rank: int) -> int:
    return row[rank] if 0 <= rank < len(row) else 0


def with_isolates(row: list[int], rank: int, isolates: int) -> int:
    return sum(
        comb(isolates, used) * coeff(row, rank - used)
        for used in range(min(rank, isolates) + 1)
    )


def newton_coefficients(values: list[int]) -> list[int]:
    """Return Delta^m f(0), i.e. [binom(s,m)]f(s)."""
    current = values[:]
    output = []
    while current:
        output.append(current[0])
        current = [right - left for left, right in zip(current, current[1:])]
    return output


def direct_subset_rows(graph: nx.Graph) -> tuple[list[int], list[int]]:
    """Small-order brute force oracle used only to validate the message DP."""
    vertices = list(graph)
    order = len(vertices)
    edges = [(vertices.index(u), vertices.index(v)) for u, v in graph.edges()]
    zero = [0] * (order + 1)
    one = [0] * (order + 1)
    for mask in range(1 << order):
        induced = sum(((mask >> u) & 1) and ((mask >> v) & 1) for u, v in edges)
        if induced <= 1:
            size = mask.bit_count()
            (zero if induced == 0 else one)[size] += 1
    while len(zero) > 1 and zero[-1] == 0:
        zero.pop()
    while len(one) > 1 and one[-1] == 0:
        one.pop()
    return zero, one


def brute_force_dp_audit(max_order: int = 8) -> dict[str, int]:
    trees = roots = row_checks = 0
    for order in range(1, max_order + 1):
        family: Iterable[nx.Graph]
        family = [nx.empty_graph(1)] if order == 1 else nx.nonisomorphic_trees(order)
        for tree in family:
            tree = nx.convert_node_labels_to_integers(tree, ordering="sorted")
            messages = TreeMessages(tree)
            assert messages.whole_tree() == direct_subset_rows(tree)
            trees += 1
            row_checks += 2
            for root in tree:
                f = tree.copy()
                f.remove_node(root)
                h = tree.copy()
                h.remove_nodes_from({root, *tree.neighbors(root)})
                assert messages.forest_after_deleting_root(root) == direct_subset_rows(f)
                assert messages.forest_after_closed_neighborhood(root) == direct_subset_rows(h)
                roots += 1
                row_checks += 4
    return {"orders": max_order, "trees": trees, "roots": roots, "row_checks": row_checks}


@dataclass
class DegreeStats:
    checks: int = 0
    negatives: int = 0
    zeros: int = 0
    minimum: int | None = None
    minimum_witness: dict[str, object] | None = None
    minimum_positive: int | None = None
    minimum_positive_witness: dict[str, object] | None = None
    remainder_negatives: int = 0
    bracket_negatives: int = 0
    minimum_compensation_ratio: Fraction | None = None
    minimum_compensation_witness: dict[str, object] | None = None

    def observe(
        self,
        value: int,
        remainder: int,
        bracket: int,
        positive_part: int,
        witness: dict[str, object],
    ) -> None:
        self.checks += 1
        self.negatives += value < 0
        self.zeros += value == 0
        self.remainder_negatives += remainder < 0
        self.bracket_negatives += bracket < 0
        if self.minimum is None or value < self.minimum:
            self.minimum = value
            self.minimum_witness = {**witness, "coefficient": str(value)}
        if value > 0 and (self.minimum_positive is None or value < self.minimum_positive):
            self.minimum_positive = value
            self.minimum_positive_witness = {**witness, "coefficient": str(value)}
        if remainder < 0:
            ratio = Fraction(positive_part, -remainder)
            if self.minimum_compensation_ratio is None or ratio < self.minimum_compensation_ratio:
                self.minimum_compensation_ratio = ratio
                self.minimum_compensation_witness = {
                    **witness,
                    "positive_anchor_shadow_coefficient": str(positive_part),
                    "negative_remainder_coefficient": str(remainder),
                    "compensation_ratio": str(ratio),
                    "net_coefficient": str(value),
                }

    def as_json(self) -> dict[str, object]:
        return {
            "checks": self.checks,
            "negative_coefficients": self.negatives,
            "zero_coefficients": self.zeros,
            "minimum_coefficient": str(self.minimum),
            "minimum_witness": self.minimum_witness,
            "minimum_positive_coefficient": str(self.minimum_positive),
            "minimum_positive_witness": self.minimum_positive_witness,
            "negative_low_remainder_coefficients": self.remainder_negatives,
            "negative_inner_bracket_coefficients": self.bracket_negatives,
            "minimum_anchor_compensation_ratio_when_remainder_negative": (
                str(self.minimum_compensation_ratio)
                if self.minimum_compensation_ratio is not None
                else None
            ),
            "minimum_compensation_witness": self.minimum_compensation_witness,
        }


def shape(tree: nx.Graph) -> str:
    degrees = [degree for _, degree in tree.degree()]
    if len(tree) <= 2 or max(degrees) <= 2:
        return "path"
    if max(degrees) == len(tree) - 1:
        return "star"
    if sum(degree >= 3 for degree in degrees) == 2:
        hubs = [vertex for vertex, degree in tree.degree() if degree >= 3]
        if tree.has_edge(*hubs):
            return "double_star"
    return "other"


def terminal_rows(
    tree: nx.Graph,
    root: int,
    whole_zero: list[int],
    whole_one: list[int],
    messages: TreeMessages,
) -> Iterable[tuple[int, list[int], list[int], list[int], list[int], list[int], list[int]]]:
    """Yield j and eight-value rows for delta, positive part, remainder, bracket."""
    f, f_one = messages.forest_after_deleting_root(root)
    h, _h_one = messages.forest_after_closed_neighborhood(root)
    a = coeff(f, 2)
    z2 = coeff(f_one, 3)
    h2 = coeff(h, 2)

    for j in range(3, len(f)):
        b = coeff(f, j)
        if b == 0:
            continue
        zj = coeff(f_one, j + 1)
        hj = coeff(h, j)
        delta_values: list[int] = []
        positive_values: list[int] = []
        remainder_values: list[int] = []
        bracket_values: list[int] = []
        anchor_values: list[int] = []
        included_values: list[int] = []
        for s in range(LOW_DEGREES):
            t = s + 1
            P = with_isolates(whole_zero, 3, t)
            # A set contributing to R has exactly one edge and four vertices.
            R = with_isolates(whole_one, 4, t)
            U = with_isolates(whole_zero, j + 1, t)
            c = z2 + h2 + t * a
            e = zj + hj + t * b
            M = (j + 1) * b * c - 3 * a * e
            A = P * c - a * R
            W = P * b - a * U
            delta = P * (P + a) * M - (j + 1) * A * W

            d0, d1 = 3 * P, 3 * a
            D0, D1 = (j + 1) * U, (j + 1) * b
            original_margin = (
                (d0 + d1) * d0 * M
                - (c * d0 - R * d1) * (d0 * D1 - d1 * D0)
            )
            assert original_margin == 9 * delta

            # Independently expanded split.  B is the inner low bracket;
            # L=P*B and K=(j+1)*a*A*U.
            B = (P + a) * M - (j + 1) * b * A
            L = P * B
            K = (j + 1) * a * A * U
            assert delta == K + L
            # A second, cancellation-heavy form catches formula transposition.
            Q = (j + 1) * b * (c + R) - 3 * (P + a) * e
            assert B == a * Q

            delta_values.append(delta)
            positive_values.append(K)
            remainder_values.append(L)
            bracket_values.append(B)
            anchor_values.append(A)
            included_values.append(M)

        yield (
            j,
            newton_coefficients(delta_values),
            newton_coefficients(positive_values),
            newton_coefficients(remainder_values),
            newton_coefficients(bracket_values),
            newton_coefficients(anchor_values),
            newton_coefficients(included_values),
        )


def audit_tree_family(
    records: Iterable[tuple[str, nx.Graph, list[int] | None]],
    stats: list[DegreeStats],
    stream: hashlib._Hash,
    classification: Counter,
    negative_witnesses: list[dict[str, object]],
) -> dict[str, int]:
    trees = roots = ranks = coefficients = 0
    for label, source_tree, chosen_roots in records:
        tree = nx.convert_node_labels_to_integers(source_tree, ordering="sorted")
        tree_shape = shape(tree)
        graph6 = nx.to_graph6_bytes(tree, header=False).decode().strip()
        messages = TreeMessages(tree)
        whole_zero, whole_one = messages.whole_tree()
        roots_to_check = list(tree) if chosen_roots is None else chosen_roots
        trees += 1
        if trees % 1000 == 0:
            print(
                f"audit-progress trees={trees:,} roots={roots:,} "
                f"rank-cells={ranks:,}",
                flush=True,
            )
        for root in roots_to_check:
            roots += 1
            for j, delta, positive, remainder, bracket, anchor, included in terminal_rows(
                tree, root, whole_zero, whole_one, messages
            ):
                ranks += 1
                witness_base = {
                    "family": label,
                    "order": len(tree),
                    "graph6": graph6,
                    "marked_vertex": root,
                    "marked_degree": tree.degree(root),
                    "shape": tree_shape,
                    "j": j,
                    "target_rank": j + 1,
                }
                # Pinned anchor theorem and direct included-block reserve should
                # already make these manifestly nonnegative; verify independently.
                assert all(value >= 0 for value in anchor[:5]), (witness_base, anchor)
                assert all(value >= 0 for value in included[:2]), (witness_base, included)
                for degree in range(LOW_DEGREES):
                    witness = {**witness_base, "newton_degree": degree}
                    stats[degree].observe(
                        delta[degree],
                        remainder[degree],
                        bracket[degree],
                        positive[degree],
                        witness,
                    )
                    coefficients += 1
                    classification[
                        (
                            degree,
                            tree_shape,
                            "leaf" if tree.degree(root) == 1 else "internal",
                            "negative_remainder" if remainder[degree] < 0 else "nonnegative_remainder",
                        )
                    ] += 1
                    if delta[degree] < 0 and len(negative_witnesses) < 100:
                        negative_witnesses.append({
                            **witness,
                            "delta_coefficient": str(delta[degree]),
                            "positive_part": str(positive[degree]),
                            "remainder": str(remainder[degree]),
                            "bracket": str(bracket[degree]),
                        })
                    stream.update(
                        (
                            f"{label}|{len(tree)}|{graph6}|{root}|{j}|{degree}|"
                            f"{delta[degree]}|{positive[degree]}|{remainder[degree]}|"
                            f"{bracket[degree]}\n"
                        ).encode()
                    )
    return {"trees": trees, "roots": roots, "rank_cells": ranks, "coefficients": coefficients}


def finite_records(max_order: int) -> Iterable[tuple[str, nx.Graph, None]]:
    for order in range(1, max_order + 1):
        family: Iterable[nx.Graph]
        family = [nx.empty_graph(1)] if order == 1 else nx.nonisomorphic_trees(order)
        for tree_index, tree in enumerate(family):
            yield f"unlabelled_n{order}_i{tree_index}", tree, None


def adversarial_records(seed: int) -> Iterable[tuple[str, nx.Graph, list[int]]]:
    # Orbit representatives suffice for stars; paths include endpoints, central,
    # and asymmetric near-end roots.  The ranges are intentionally far beyond
    # the exhaustive base but remain exact integer audits.
    for order in range(15, 241):
        star = nx.star_graph(order - 1)
        yield f"star_n{order}", star, [0, 1]
        path = nx.path_graph(order)
        roots = sorted({0, 1, order // 4, order // 2})
        yield f"path_n{order}", path, roots

    # Double stars and brooms target high-degree/long-tail mixtures.
    for left in range(2, 31, 2):
        for right in range(2, 41, 3):
            graph = nx.Graph()
            graph.add_edge(0, 1)
            for vertex in range(2, left + 2):
                graph.add_edge(0, vertex)
            for vertex in range(left + 2, left + right + 2):
                graph.add_edge(1, vertex)
            yield f"double_star_{left}_{right}", graph, [0, 1, 2, left + 2]

    rng = random.Random(seed)
    for order in (20, 30, 40, 60, 80):
        for index in range(80):
            tree = nx.from_prufer_sequence([rng.randrange(order) for _ in range(order - 2)])
            degrees = sorted(tree, key=tree.degree, reverse=True)
            roots = sorted({degrees[0], degrees[-1], rng.randrange(order)})
            yield f"random_n{order}_i{index}", tree, roots


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--max-order", type=int, default=15)
    parser.add_argument("--skip-finite", action="store_true")
    parser.add_argument("--skip-adversarial", action="store_true")
    parser.add_argument("--seed", type=int, default=9930829)
    args = parser.parse_args()

    oracle = brute_force_dp_audit()
    stats = [DegreeStats() for _ in range(LOW_DEGREES)]
    stream = hashlib.sha256()
    classification: Counter = Counter()
    negative_witnesses: list[dict[str, object]] = []

    sections: dict[str, dict[str, int]] = {}
    if not args.skip_finite:
        sections["finite"] = audit_tree_family(
            finite_records(args.max_order),
            stats,
            stream,
            classification,
            negative_witnesses,
        )
    if not args.skip_adversarial:
        sections["adversarial"] = audit_tree_family(
            adversarial_records(args.seed),
            stats,
            stream,
            classification,
            negative_witnesses,
        )

    total_negatives = sum(item.negatives for item in stats)
    source_path = Path(__file__)
    report = {
        "schema": "terminal-q3-low-newton-adversarial-independent-v1",
        "date": "2026-08-29",
        "status": (
            "PASS_EXACT_FINITE_AND_ADVERSARIAL_LOW_NEWTON_M0_M7_NO_NEGATIVES_NOT_ALL_ORDER"
            if total_negatives == 0
            else "FAIL_NEGATIVE_LOW_NEWTON_WITNESS_FOUND"
        ),
        "claim_boundary": (
            "Exact finite and structured-family audit of Newton coefficients m=0..7 "
            "of the normalized untruncated terminal included-payment margin.  This "
            "is search/certificate evidence only and is not an all-order proof."
        ),
        "independent_reconstruction": {
            "parameter": "t=1+s",
            "normalization": (
                "delta=P(P+a)M-(j+1)(Pc-aR)(Pb-aU), with the original integer "
                "payment margin equal to 9*delta"
            ),
            "split": (
                "delta=K+L; K=(j+1)a(Pc-aR)U; "
                "L=P[(P+a)M-(j+1)b(Pc-aR)]"
            ),
            "second_split_check": (
                "L=aP*Q, Q=(j+1)b(c+R)-3(P+a)e"
            ),
            "newton_method": (
                "[binom(s,m)]delta=forward_difference^m(delta)(0), evaluated "
                "exactly at s=0,...,7"
            ),
            "brute_force_message_dp_oracle": oracle,
        },
        "coverage": sections,
        "newton_degrees": {str(degree): item.as_json() for degree, item in enumerate(stats)},
        "negative_witnesses": negative_witnesses,
        "classification": [
            {
                "newton_degree": key[0],
                "shape": key[1],
                "root_type": key[2],
                "remainder_sign": key[3],
                "cells": value,
            }
            for key, value in sorted(classification.items())
        ],
        "ordered_audit_stream_sha256": stream.hexdigest().upper(),
        "structural_inference": {
            "manifestly_nonnegative_term": (
                "K has nonnegative Newton coefficients from the coefficientwise "
                "anchor A=Pc-aR and Pascal's U_m=i_(j+1-m)(G)+i_(j-m)(G)."
            ),
            "only_possible_low_deficit": (
                "The degree-seven remainder L=aP*Q.  An all-order proof need only "
                "show K_m >= (-L_m)_+ for m=0,...,7; neither Q_m>=0 nor L_m>=0 "
                "should be assumed where the audit records negative coefficients."
            ),
            "minimum_needed_inequality": (
                "For each m<=7: (j+1)[binom(s,m)](A*U) >= "
                "-[binom(s,m)](P*Q), after dividing by a>0."
            ),
        },
        "scope": (
            "No finite audit proves the all-order terminal payment, the extension "
            "from terminal cells to all trees, unimodality, or Erdos Problem 993."
        ),
        "source": source_path.name,
        "source_sha256": sha256(source_path),
    }
    OUTPUT.write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    print(report["status"])
    print(json.dumps(sections, indent=2))
    for degree, item in enumerate(stats):
        print(
            f"m={degree} checks={item.checks:,} neg={item.negatives:,} "
            f"zero={item.zeros:,} rem_neg={item.remainder_negatives:,} "
            f"min={item.minimum} min_pos={item.minimum_positive} "
            f"comp={item.minimum_compensation_ratio}"
        )
    print(f"stream={report['ordered_audit_stream_sha256']}")
    print(f"report={OUTPUT}")


if __name__ == "__main__":
    main()
