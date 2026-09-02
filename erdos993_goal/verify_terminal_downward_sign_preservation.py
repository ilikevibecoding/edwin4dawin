#!/usr/bin/env python3
"""Test terminal downward sign preservation exactly.

For a rooted tree R with root q, put

    C = I(R-q),  D = I(R-N[q]),
    F = I(R) = C + xD,
    T = F + xC.

The proposed terminal sign lemma is

    F_r < F_{r-1}  ==>  T_{r+1} < T_r                 (DP)

for r >= 6.  A disjoint forest component multiplies C,D,F,T by the
same independence polynomial, so the optional corpus scan tests those
common factors as well.
"""

from __future__ import annotations

import argparse
import json
import random
from pathlib import Path

import networkx as nx
from flint import fmpz_poly

from patternboost_corpus_audit import adjacency_from_prufer


X = fmpz_poly([0, 1])
ONE = fmpz_poly([1])


def coeff(poly: fmpz_poly, rank: int) -> int:
    return int(poly[rank]) if 0 <= rank <= poly.degree() else 0


def rooted_pair(
    adjacency: list[list[int]], root: int
) -> tuple[fmpz_poly, fmpz_poly]:
    """Return C=I(R-q) and D=I(R-N[q])."""

    def visit(vertex: int, parent: int) -> tuple[fmpz_poly, fmpz_poly]:
        excluded = ONE
        included_without_x = ONE
        for child in adjacency[vertex]:
            if child == parent:
                continue
            child_excluded, child_included = visit(child, vertex)
            excluded *= child_excluded + X * child_included
            included_without_x *= child_excluded
        return excluded, included_without_x

    return visit(root, -1)


def adjacency_from_graph(graph: nx.Graph) -> list[list[int]]:
    vertices = list(graph.nodes())
    relabel = {vertex: index for index, vertex in enumerate(vertices)}
    adjacency = [[] for _ in vertices]
    for left, right in graph.edges():
        a = relabel[left]
        b = relabel[right]
        adjacency[a].append(b)
        adjacency[b].append(a)
    return adjacency


def first_failure(
    c_poly: fmpz_poly,
    d_poly: fmpz_poly,
    minimum_rank: int,
    common_factor: fmpz_poly = ONE,
) -> dict | None:
    c_poly *= common_factor
    d_poly *= common_factor
    f_poly = c_poly + X * d_poly
    t_poly = f_poly + X * c_poly
    for r in range(minimum_rank, f_poly.degree() + 1):
        fm = coeff(f_poly, r - 1)
        f = coeff(f_poly, r)
        t = coeff(t_poly, r)
        tp = coeff(t_poly, r + 1)
        if f < fm and tp >= t:
            return {
                "rank_r": r,
                "F_r_minus_F_previous": f - fm,
                "T_next_minus_T_r": tp - t,
                "F_coefficients": [
                    coeff(f_poly, j)
                    for j in range(max(0, r - 2), r + 3)
                ],
                "T_coefficients": [
                    coeff(t_poly, j)
                    for j in range(max(0, r - 2), r + 3)
                ],
                "C_coefficients": [
                    coeff(c_poly, j)
                    for j in range(max(0, r - 2), r + 2)
                ],
                "D_coefficients": [
                    coeff(d_poly, j)
                    for j in range(max(0, r - 3), r + 1)
                ],
            }
    return None


def exhaustive_trees(max_order: int, minimum_rank: int) -> dict:
    trees = 0
    roots = 0
    rank_triggers = 0
    closest = None
    for order in range(2, max_order + 1):
        for graph_index, graph in enumerate(nx.nonisomorphic_trees(order)):
            trees += 1
            adjacency = adjacency_from_graph(graph)
            for root in range(order):
                roots += 1
                c_poly, d_poly = rooted_pair(adjacency, root)
                f_poly = c_poly + X * d_poly
                t_poly = f_poly + X * c_poly
                for r in range(minimum_rank, f_poly.degree() + 1):
                    fm = coeff(f_poly, r - 1)
                    f = coeff(f_poly, r)
                    if f >= fm:
                        continue
                    rank_triggers += 1
                    t = coeff(t_poly, r)
                    tp = coeff(t_poly, r + 1)
                    margin = t - tp
                    item = {
                        "order": order,
                        "graph_index": graph_index,
                        "root": root,
                        "rank_r": r,
                        "F_drop": fm - f,
                        "T_drop": margin,
                        "graph6": nx.to_graph6_bytes(
                            graph, header=False
                        ).decode().strip(),
                    }
                    if closest is None or margin < closest["T_drop"]:
                        closest = item
                    if margin <= 0:
                        failure = first_failure(
                            c_poly, d_poly, minimum_rank
                        )
                        assert failure is not None
                        return {
                            "passed": False,
                            "trees": trees,
                            "roots": roots,
                            "rank_triggers": rank_triggers,
                            "failure": item | failure,
                            "closest": closest,
                        }
    return {
        "passed": True,
        "trees": trees,
        "roots": roots,
        "rank_triggers": rank_triggers,
        "failure": None,
        "closest": closest,
    }


def corpus_scan(
    corpus_path: Path,
    samples: int,
    max_extra_components: int,
    minimum_rank: int,
    seed: int,
) -> dict:
    source = json.loads(corpus_path.read_text(encoding="utf-8"))
    records = source["records"]
    rng = random.Random(seed)
    triggers = 0
    closest = None
    for sample in range(samples):
        rooted_record_index = rng.randrange(len(records))
        rooted_record = records[rooted_record_index]
        adjacency = adjacency_from_prufer(
            rooted_record["prufer_code_one_based"]
        )
        root = rng.randrange(len(adjacency))
        c_poly, d_poly = rooted_pair(adjacency, root)
        common = ONE
        component_indices = []
        for _ in range(rng.randrange(max_extra_components + 1)):
            component_index = rng.randrange(len(records))
            component_indices.append(component_index)
            common *= fmpz_poly(records[component_index]["polynomial"])

        cf = c_poly * common
        df = d_poly * common
        f_poly = cf + X * df
        t_poly = f_poly + X * cf
        for r in range(minimum_rank, f_poly.degree() + 1):
            fm = coeff(f_poly, r - 1)
            f = coeff(f_poly, r)
            if f >= fm:
                continue
            triggers += 1
            t = coeff(t_poly, r)
            tp = coeff(t_poly, r + 1)
            margin = t - tp
            item = {
                "sample": sample,
                "rooted_record_index": rooted_record_index,
                "root": root,
                "component_indices": component_indices,
                "rank_r": r,
                "F_drop": fm - f,
                "T_drop": margin,
            }
            if closest is None or margin < closest["T_drop"]:
                closest = item
            if margin <= 0:
                failure = first_failure(
                    c_poly, d_poly, minimum_rank, common
                )
                assert failure is not None
                return {
                    "passed": False,
                    "samples": sample + 1,
                    "rank_triggers": triggers,
                    "failure": item | failure,
                    "closest": closest,
                }
    return {
        "passed": True,
        "samples": samples,
        "rank_triggers": triggers,
        "failure": None,
        "closest": closest,
    }


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--max-order", type=int, default=16)
    parser.add_argument("--minimum-rank", type=int, default=6)
    parser.add_argument("--samples", type=int, default=100_000)
    parser.add_argument("--max-extra-components", type=int, default=2)
    parser.add_argument("--seed", type=int, default=993_20260729)
    parser.add_argument(
        "--corpus",
        type=Path,
        default=Path("patternboost60_polynomial_corpus_20260726.json"),
    )
    parser.add_argument(
        "--output",
        type=Path,
        default=Path(
            "terminal_downward_sign_preservation_20260729.json"
        ),
    )
    args = parser.parse_args()

    result = {
        "claim": "F_r<F_(r-1) implies T_(r+1)<T_r",
        "minimum_rank": args.minimum_rank,
        "exhaustive_trees": exhaustive_trees(
            args.max_order, args.minimum_rank
        ),
        "patternboost_with_common_forest_factors": corpus_scan(
            args.corpus,
            args.samples,
            args.max_extra_components,
            args.minimum_rank,
            args.seed,
        ),
    }
    args.output.write_text(
        json.dumps(result, indent=2) + "\n", encoding="utf-8"
    )
    print(json.dumps(result, indent=2))


if __name__ == "__main__":
    main()
