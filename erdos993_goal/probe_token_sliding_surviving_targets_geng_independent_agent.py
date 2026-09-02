#!/usr/bin/env python3
"""Exact geng census for the two surviving token-sliding targets on trees.

For every unlabelled tree in the requested order interval this independently
computes A_k = number of k-sets inducing zero edges and B_k = number inducing
exactly one edge.  Then i_r=A_r and s_r=B_(r+1).  It tests only:

  (1) r*m2*i_r >= W*s_r;
  (2) s_r/(r*i_r) <= s_2/(2*i_2) for r>=3.

The refuted adjacent-rank monotonicity and covariance shortcuts are not used.
"""

from __future__ import annotations

import argparse
import hashlib
import json
import math
from pathlib import Path
import subprocess

import networkx as nx


ROOT = Path(__file__).resolve().parent
GENG = ROOT / "nauty2_8_9" / "geng.exe"
PINNED_GENG_SHA256 = "53D8544CF73604C087730CFABA4FB1881A20D6B329B1F9B5B965546417D22DA4"


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def add(left: list[int], right: list[int]) -> list[int]:
    out = [0] * max(len(left), len(right))
    for index, value in enumerate(left):
        out[index] += value
    for index, value in enumerate(right):
        out[index] += value
    while len(out) > 1 and out[-1] == 0:
        out.pop()
    return out


def multiply(left: list[int], right: list[int]) -> list[int]:
    out = [0] * (len(left) + len(right) - 1)
    for i, a in enumerate(left):
        if not a:
            continue
        for j, b in enumerate(right):
            if b:
                out[i + j] += a * b
    return out


def zero_one_edge_dp(adjacency: list[list[int]]) -> tuple[list[int], list[int]]:
    def visit(vertex: int, parent: int):
        e0, e1 = [1], [0]
        p0, p1 = [1], [0]
        for child in adjacency[vertex]:
            if child == parent:
                continue
            ce0, ce1, ci0, ci1 = visit(child, vertex)

            f0, f1 = add(ce0, ci0), add(ce1, ci1)
            old0, old1 = e0, e1
            e0 = multiply(old0, f0)
            e1 = add(multiply(old1, f0), multiply(old0, f1))

            f0, f1 = ce0, add(ce1, ci0)
            old0, old1 = p0, p1
            p0 = multiply(old0, f0)
            p1 = add(multiply(old1, f0), multiply(old0, f1))
        return e0, e1, [0] + p0, [0] + p1

    e0, e1, i0, i1 = visit(0, -1)
    return add(e0, i0), add(e1, i1)


def adjacency_of(graph: nx.Graph) -> list[list[int]]:
    return [list(graph.neighbors(vertex)) for vertex in range(len(graph))]


def is_smaller_fraction(num: int, den: int, row: dict | None) -> bool:
    return row is None or num * row["denominator"] < row["margin"] * den


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--minimum-order", type=int, default=17)
    parser.add_argument("--maximum-order", type=int, default=18)
    args = parser.parse_args()
    assert 2 <= args.minimum_order <= args.maximum_order
    assert sha256(GENG) == PINNED_GENG_SHA256

    orders = []
    total_trees = 0
    actual_checks = 0
    q2_checks = 0
    actual_minimum = None
    q2_minimum = None
    actual_minimum_positive = None
    q2_minimum_positive = None
    actual_equalities = 0
    q2_equalities = 0
    failures = []

    for n in range(args.minimum_order, args.maximum_order + 1):
        process = subprocess.Popen(
            [str(GENG), "-cq", str(n), f"{n - 1}:{n - 1}"],
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
        )
        assert process.stdout is not None
        order_trees = 0
        order_actual = 0
        order_q2 = 0
        for raw in process.stdout:
            graph6 = raw.strip()
            if not graph6:
                continue
            graph = nx.from_graph6_bytes(graph6)
            adjacency = adjacency_of(graph)
            independent, one_edge = zero_one_edge_dp(adjacency)

            order_trees += 1
            total_trees += 1
            if order_trees % 25_000 == 0:
                print(
                    f"ORDER {n} TREES {order_trees} ACTUAL {order_actual} Q2 {order_q2}",
                    flush=True,
                )

            w = math.comb(n - 2, 2)
            degree_surplus = sum(
                math.comb(graph.degree(vertex) - 1, 2)
                for vertex in graph.nodes()
            )
            m2 = w - degree_surplus
            i2 = independent[2]
            s2 = one_edge[3] if len(one_edge) > 3 else 0
            assert i2 == math.comb(n - 1, 2)
            assert s2 == 2 * m2
            q2_numerator = s2
            q2_denominator = 2 * i2

            for rank in range(2, len(independent)):
                if not independent[rank]:
                    continue
                slides = one_edge[rank + 1] if rank + 1 < len(one_edge) else 0
                actual_margin = rank * m2 * independent[rank] - w * slides
                actual_denominator = w * rank * independent[rank]
                actual_checks += 1
                order_actual += 1
                if is_smaller_fraction(
                    actual_margin, actual_denominator, actual_minimum
                ):
                    actual_minimum = {
                        "order": n,
                        "rank": rank,
                        "margin": actual_margin,
                        "denominator": actual_denominator,
                        "normalized_slack": f"{actual_margin}/{actual_denominator}",
                        "W": w,
                        "m2": m2,
                        "i_rank": independent[rank],
                        "s_rank": slides,
                        "graph6": graph6.decode("ascii"),
                    }
                if actual_margin == 0:
                    actual_equalities += 1
                elif actual_margin > 0 and is_smaller_fraction(
                    actual_margin, actual_denominator, actual_minimum_positive
                ):
                    actual_minimum_positive = {
                        "order": n,
                        "rank": rank,
                        "margin": actual_margin,
                        "denominator": actual_denominator,
                        "normalized_slack": f"{actual_margin}/{actual_denominator}",
                        "W": w,
                        "m2": m2,
                        "i_rank": independent[rank],
                        "s_rank": slides,
                        "graph6": graph6.decode("ascii"),
                    }
                if actual_margin < 0:
                    failures.append({"target": "actual_averaged", **actual_minimum})
                    process.kill()
                    break

                if rank < 3:
                    continue
                q2_margin = (
                    q2_numerator * rank * independent[rank]
                    - slides * q2_denominator
                )
                q2_den = q2_denominator * rank * independent[rank]
                q2_checks += 1
                order_q2 += 1
                if is_smaller_fraction(q2_margin, q2_den, q2_minimum):
                    q2_minimum = {
                        "order": n,
                        "rank": rank,
                        "margin": q2_margin,
                        "denominator": q2_den,
                        "normalized_slack": f"{q2_margin}/{q2_den}",
                        "i_rank": independent[rank],
                        "s_rank": slides,
                        "q2_numerator": q2_numerator,
                        "q2_denominator": q2_denominator,
                        "graph6": graph6.decode("ascii"),
                    }
                if q2_margin == 0:
                    q2_equalities += 1
                elif q2_margin > 0 and is_smaller_fraction(
                    q2_margin, q2_den, q2_minimum_positive
                ):
                    q2_minimum_positive = {
                        "order": n,
                        "rank": rank,
                        "margin": q2_margin,
                        "denominator": q2_den,
                        "normalized_slack": f"{q2_margin}/{q2_den}",
                        "i_rank": independent[rank],
                        "s_rank": slides,
                        "q2_numerator": q2_numerator,
                        "q2_denominator": q2_denominator,
                        "graph6": graph6.decode("ascii"),
                    }
                if q2_margin < 0:
                    failures.append({"target": "q_r_at_most_q2", **q2_minimum})
                    process.kill()
                    break
            if failures:
                break

        _, stderr = process.communicate()
        if process.returncode not in (0, -9, 1) and not failures:
            raise RuntimeError(stderr.decode(errors="replace"))
        orders.append(
            {
                "order": n,
                "trees": order_trees,
                "actual_checks": order_actual,
                "q2_checks": order_q2,
            }
        )
        print(
            f"COMPLETE ORDER {n} TREES {order_trees} ACTUAL {order_actual} Q2 {order_q2}",
            flush=True,
        )
        if failures:
            break

    report = {
        "schema": "token-sliding-surviving-targets-geng-independent-agent-v1",
        "status": (
            "COUNTEREXAMPLE_EXACT_TOKEN_SLIDING_SURVIVING_TARGET"
            if failures
            else "PASS_EXACT_FINITE_TOKEN_SLIDING_SURVIVING_TARGETS_GENG_INDEPENDENT"
        ),
        "targets": {
            "actual_averaged": "r*m2(T)*i_r(T) >= W*s_r(T)",
            "initial_level_domination": "s_r/(r*i_r) <= s_2/(2*i_2) for r>=3",
        },
        "orders": orders,
        "tree_count": total_trees,
        "actual_checks": actual_checks,
        "q2_domination_checks": q2_checks,
        "actual_minimum_normalized_slack": actual_minimum,
        "actual_minimum_positive_normalized_slack": actual_minimum_positive,
        "actual_equality_checks": actual_equalities,
        "q2_minimum_normalized_slack": q2_minimum,
        "q2_minimum_positive_normalized_slack": q2_minimum_positive,
        "q2_equality_checks": q2_equalities,
        "failures": failures,
        "identities_checked_per_tree": [
            "i_r=A_r where A counts zero-induced-edge subsets",
            "s_r=B_(r+1) where B counts one-induced-edge subsets",
            "i_2=binom(n-1,2)",
            "s_2=2*m2",
        ],
        "geng_sha256": sha256(GENG),
        "source_sha256": sha256(Path(__file__)),
        "scope_warning": (
            "A PASS is a finite exhaustive census only, not an all-order proof. "
            "It does not revive adjacent-rank ratio monotonicity, which is false."
        ),
    }
    output = ROOT / (
        "token_sliding_surviving_targets_geng_independent_"
        f"{args.minimum_order}_{args.maximum_order}_20260828.json"
    )
    output.write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    print(report["status"])
    print("trees", total_trees, "actual", actual_checks, "q2", q2_checks)
    print("actual_minimum", actual_minimum)
    print("actual_minimum_positive", actual_minimum_positive)
    print("q2_minimum", q2_minimum)
    print("q2_minimum_positive", q2_minimum_positive)
    print("source_sha256", sha256(Path(__file__)))
    print("report_sha256", sha256(output))


if __name__ == "__main__":
    main()
