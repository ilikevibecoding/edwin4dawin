#!/usr/bin/env python3
"""Exact finite extremal probe for the all-tree q3 envelope.

This is diagnostic evidence, not an all-order proof.  It scans every
unlabelled tree in a requested order interval and records the smallest
normalized slack in

    q_r <= q_3,  equivalently r*i_r*s_3 - 3*i_3*s_r >= 0.
"""

from __future__ import annotations

import argparse
import hashlib
import heapq
import json
from pathlib import Path
import subprocess

import networkx as nx


ROOT = Path(__file__).resolve().parent
GENG = ROOT / "nauty2_8_9" / "geng.exe"


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
        excluded_zero, excluded_one = [1], [0]
        included_zero, included_one = [1], [0]
        for child in adjacency[vertex]:
            if child == parent:
                continue
            ce0, ce1, ci0, ci1 = visit(child, vertex)

            free_zero, free_one = add(ce0, ci0), add(ce1, ci1)
            old_zero, old_one = excluded_zero, excluded_one
            excluded_zero = multiply(old_zero, free_zero)
            excluded_one = add(
                multiply(old_one, free_zero), multiply(old_zero, free_one)
            )

            # If the parent is included, including this child creates the
            # unique induced edge and no prior edge may already be present.
            old_zero, old_one = included_zero, included_one
            included_zero = multiply(old_zero, ce0)
            included_one = add(
                multiply(old_one, ce0), multiply(old_zero, add(ce1, ci0))
            )
        return (
            excluded_zero,
            excluded_one,
            [0] + included_zero,
            [0] + included_one,
        )

    e0, e1, i0, i1 = visit(0, -1)
    return add(e0, i0), add(e1, i1)


def structure(graph: nx.Graph) -> dict[str, object]:
    degrees = sorted((degree for _, degree in graph.degree()), reverse=True)
    eccentricities = nx.eccentricity(graph)
    radius = min(eccentricities.values())
    centers = [vertex for vertex, value in eccentricities.items() if value == radius]
    depth2_center = None
    for center in centers:
        if max(nx.single_source_shortest_path_length(graph, center).values()) <= 2:
            depth2_center = center
            break
    arm_multiplicities = None
    if depth2_center is not None:
        arm_multiplicities = sorted(
            (graph.degree(neighbor) - 1 for neighbor in graph[depth2_center]),
            reverse=True,
        )
    return {
        "degree_sequence": degrees,
        "leaves": sum(degree == 1 for degree in degrees),
        "degree_two": sum(degree == 2 for degree in degrees),
        "branch_vertices": sum(degree >= 3 for degree in degrees),
        "diameter": nx.diameter(graph),
        "radius": radius,
        "is_depth2_star": depth2_center is not None,
        "depth2_arm_multiplicities": arm_multiplicities,
    }


def better(row: dict[str, object], old: dict[str, object] | None) -> bool:
    if old is None:
        return True
    return (
        int(row["margin"]) * int(old["denominator"])
        < int(old["margin"]) * int(row["denominator"])
    )


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--minimum-order", type=int, default=4)
    parser.add_argument("--maximum-order", type=int, default=16)
    parser.add_argument("--top", type=int, default=30)
    args = parser.parse_args()
    assert 4 <= args.minimum_order <= args.maximum_order

    total_trees = 0
    checks = 0
    failures = []
    global_best = None
    per_rank: dict[int, dict[str, object]] = {}
    per_order = []
    top_rows: list[tuple[float, int, dict[str, object]]] = []
    serial = 0

    for order in range(args.minimum_order, args.maximum_order + 1):
        process = subprocess.Popen(
            [str(GENG), "-cq", str(order), f"{order - 1}:{order - 1}"],
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
        )
        assert process.stdout is not None
        order_trees = 0
        order_checks = 0
        order_best = None
        for raw in process.stdout:
            graph6 = raw.strip()
            if not graph6:
                continue
            graph = nx.from_graph6_bytes(graph6)
            adjacency = [list(graph.neighbors(vertex)) for vertex in range(order)]
            independent, one_edge = zero_one_edge_dp(adjacency)
            if len(independent) <= 3 or not independent[3]:
                order_trees += 1
                total_trees += 1
                continue
            i3 = independent[3]
            s3 = one_edge[4] if len(one_edge) > 4 else 0
            if not s3:
                order_trees += 1
                total_trees += 1
                continue

            cached_structure = None
            for rank in range(4, len(independent)):
                if not independent[rank]:
                    continue
                sr = one_edge[rank + 1] if rank + 1 < len(one_edge) else 0
                margin = rank * independent[rank] * s3 - 3 * i3 * sr
                denominator = rank * independent[rank] * s3
                if margin < 0:
                    failures.append(
                        {
                            "order": order,
                            "rank": rank,
                            "margin": margin,
                            "graph6": graph6.decode("ascii"),
                        }
                    )
                row = {
                    "order": order,
                    "rank": rank,
                    "margin": margin,
                    "denominator": denominator,
                    "normalized_slack": f"{margin}/{denominator}",
                    "q_ratio_numerator": 3 * i3 * sr,
                    "q_ratio_denominator": denominator,
                    "i3": i3,
                    "s3": s3,
                    "i_rank": independent[rank],
                    "s_rank": sr,
                    "graph6": graph6.decode("ascii"),
                }
                if better(row, global_best) or better(row, order_best) or better(
                    row, per_rank.get(rank)
                ):
                    if cached_structure is None:
                        cached_structure = structure(graph)
                    row |= cached_structure
                if better(row, global_best):
                    global_best = row
                if better(row, order_best):
                    order_best = row
                if better(row, per_rank.get(rank)):
                    per_rank[rank] = row

                # Keep rows with the largest exact q_r/q3 ratio.  The float is
                # only a heap key; all reported comparisons above are exact.
                ratio = (3 * i3 * sr) / denominator
                serial += 1
                heap_row = (ratio, serial, row)
                if len(top_rows) < args.top:
                    heapq.heappush(top_rows, heap_row)
                elif ratio > top_rows[0][0]:
                    heapq.heapreplace(top_rows, heap_row)
                checks += 1
                order_checks += 1

            order_trees += 1
            total_trees += 1
        _, stderr = process.communicate()
        if process.returncode != 0:
            raise RuntimeError(stderr.decode(errors="replace"))
        per_order.append(
            {
                "order": order,
                "trees": order_trees,
                "checks": order_checks,
                "closest": order_best,
            }
        )
        print(
            f"ORDER {order} TREES {order_trees} CHECKS {order_checks}",
            flush=True,
        )

    report = {
        "schema": "general-tree-q3-envelope-extremal-probe-root-v1",
        "status": (
            "COUNTEREXAMPLE_EXACT_GENERAL_TREE_Q3_ENVELOPE"
            if failures
            else "PASS_EXACT_FINITE_GENERAL_TREE_Q3_ENVELOPE_EXTREMAL_PROBE"
        ),
        "candidate": "r*i_r*s3-3*i3*s_r>=0 for every tree and r>=4",
        "orders": [args.minimum_order, args.maximum_order],
        "trees": total_trees,
        "rank_checks": checks,
        "failures": failures[:25],
        "global_closest": global_best,
        "closest_by_rank": [per_rank[key] for key in sorted(per_rank)],
        "closest_by_order": per_order,
        "top_rows_by_qr_over_q3": [
            row for _, _, row in sorted(top_rows, reverse=True)
        ],
        "geng_sha256": sha256(GENG),
        "source_sha256": sha256(Path(__file__)),
        "scope_warning": (
            "A finite exhaustive pass is evidence only and does not prove the "
            "all-order q3 envelope or Erdos Problem 993."
        ),
    }
    output = ROOT / "general_tree_q3_envelope_extremal_probe_root_20260828.json"
    output.write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    print(report["status"])
    print("TREES", total_trees, "CHECKS", checks, "FAILURES", len(failures))
    print("SOURCE", report["source_sha256"])
    print("REPORT", sha256(output))


if __name__ == "__main__":
    main()
