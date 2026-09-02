#!/usr/bin/env python3
"""Inspect the one-child induction decomposition behind the HIT CWF.

Suppose a root already has s>=2 children, with excluded/occupied pair
(U,D), and add a child with pair (E,S).  In factorial coordinates put

    P = U*E,  Q = U*S,  R = ((s-2)U+2sD)*E,

where * denotes ordinary polynomial multiplication before factorial
scaling.  For the new root r=s+1,

    U' = P+Q,
    W_r = r/s R + 2/s P + (r-2)Q.

The desired CWF is partial synchronization of U' and W_r.  This scanner
checks which of the constituent mixed minors are individually nonnegative
on exact homeomorphically irreducible tree states.  The purpose is to find
a decomposition that can be proved by known convolution closure lemmas.
"""

from __future__ import annotations

import argparse
import json
import time
from collections import Counter
from math import factorial
from pathlib import Path

from hit_curvature_reserve_stress import (
    add,
    core_generator,
    make_hit,
    mul,
    planted_state,
)
from synthetic_child_weighted_closure_search import coeff, mixed_minor


def scale(p: list[int], value: int) -> list[int]:
    return [value * x for x in p]


def factorial_transform(p: list[int]) -> list[int]:
    return [factorial(k) * x for k, x in enumerate(p)]


def state_parts(graph, vertex, parent, memo):
    children = sorted(w for w in graph[vertex] if w != parent)
    parts = []
    for child_vertex in children:
        child = planted_state(graph, child_vertex, vertex, memo)
        parts.append(
            {
                "vertex": child_vertex,
                "E": child.e,
                "S": [0] + child.j,
                "A": child.t,
            }
        )
    return parts


def first_negative(p: list[int], q: list[int]) -> dict | None:
    fp = factorial_transform(p)
    fq = factorial_transform(q)
    upper = max(len(fp), len(fq))
    for m in range(upper + 1):
        for n in range(m + 1):
            value = mixed_minor(fp, fq, m, n)
            if value < 0:
                return {"m": m, "n": n, "value": value}
    return None


def first_negative_rest(
    p: list[int], q: list[int], z: list[int], s: int, include_qq: bool
) -> dict | None:
    fp = factorial_transform(p)
    fq = factorial_transform(q)
    fz = factorial_transform(z)
    upper = max(len(fp), len(fq), len(fz))
    weight = s * (s - 1)
    for m in range(upper + 1):
        for n in range(m + 1):
            value = mixed_minor(fq, fz, m, n)
            value += weight * mixed_minor(fp, fq, m, n)
            if include_qq:
                value += weight * mixed_minor(fq, fq, m, n)
            if value < 0:
                return {"m": m, "n": n, "value": value}
    return None


def check_order(parts: list[dict], counts: Counter) -> dict:
    u = [1]
    j = [1]
    witnesses = {}
    for index, child in enumerate(parts):
        if index >= 2:
            s = index
            d = [0] + j
            w = add(scale(u, s - 2), scale(d, 2 * s))
            p = mul(u, child["E"])
            q = mul(u, child["S"])
            rseq = mul(w, child["E"])
            new_children = s + 1
            z = add(scale(rseq, new_children), scale(p, 2))
            w_new_scaled = add(z, scale(q, s * (s - 1)))
            pairs = {
                "P_R": (p, rseq),
                "P_Q": (p, q),
                "Q_R": (q, rseq),
                # If Q~Z also holds, then P,Q,Z are pairwise partially
                # synchronized and both U'=P+Q and
                # W'=Z/s+(s-1)Q are nonnegative linear combinations.
                "Q_Z": (q, z),
                "P_W": (p, w_new_scaled),
                "Q_W": (q, w_new_scaled),
            }
            for name, pair in pairs.items():
                counts[f"{name}_checks"] += 1
                failure = first_negative(*pair)
                if failure is not None:
                    counts[f"{name}_failures"] += 1
                    if name not in witnesses:
                        witnesses[name] = {
                            "pair": name,
                            "previous_children": s,
                            "parts": parts,
                            "P": p,
                            "Q": q,
                            "R": rseq,
                            "Z": z,
                            "Wscaled": w_new_scaled,
                            **failure,
                        }
            for name, include_qq in (
                ("REST_NO_QQ", False),
                ("REST", True),
            ):
                counts[f"{name}_checks"] += 1
                failure = first_negative_rest(
                    p, q, z, s, include_qq=include_qq
                )
                if failure is not None:
                    counts[f"{name}_failures"] += 1
                    if name not in witnesses:
                        witnesses[name] = {
                            "pair": name,
                            "previous_children": s,
                            "parts": parts,
                            "P": p,
                            "Q": q,
                            "R": rseq,
                            "Z": z,
                            "Wscaled": w_new_scaled,
                            **failure,
                        }
        u = mul(u, child["A"])
        j = mul(j, child["E"])
    return witnesses


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--max-core", type=int, default=12)
    parser.add_argument("--out", type=Path, required=True)
    args = parser.parse_args()
    started = time.time()
    counts: Counter = Counter()
    first_by_pair = {}

    for h in range(1, args.max_core + 1):
        order_counts: Counter = Counter()
        for core_index, core in enumerate(core_generator(h)):
            graph, leaf_counts = make_hit(core)
            memo = {}
            for vertex in graph:
                parent_choices = [None, *sorted(graph[vertex])]
                for parent in parent_choices:
                    # Only genuine planted orientations: a root orientation
                    # may omit one neighbor, while None uses all neighbors.
                    parts = state_parts(graph, vertex, parent, memo)
                    if len(parts) < 3:
                        continue
                    order_counts["root_orders"] += 1
                    # Test both deterministic directions.  This gives every
                    # child a chance to be the newly added factor.
                    for ordered in (parts, list(reversed(parts))):
                        witnesses = check_order(ordered, order_counts)
                        for name, witness in witnesses.items():
                            if name not in first_by_pair:
                                first_by_pair[name] = {
                                    "core_order": h,
                                    "core_index": core_index,
                                    "leaf_counts": leaf_counts,
                                    "vertex": vertex,
                                    "parent": parent,
                                    **witness,
                                }
        counts.update(order_counts)
        print(
            f"h={h}: roots={order_counts['root_orders']:,} "
            f"PRfail={order_counts['P_R_failures']:,} "
            f"PQfail={order_counts['P_Q_failures']:,} "
            f"QRfail={order_counts['Q_R_failures']:,} "
            f"QZfail={order_counts['Q_Z_failures']:,} "
            f"PWfail={order_counts['P_W_failures']:,} "
            f"QWfail={order_counts['Q_W_failures']:,} "
            f"R0fail={order_counts['REST_NO_QQ_failures']:,} "
            f"RESTfail={order_counts['REST_failures']:,}",
            flush=True,
        )

    payload = {
        "status": "completed",
        "parameters": vars(args) | {"out": str(args.out)},
        "counts": dict(counts),
        "first_failure_by_pair": first_by_pair,
        "elapsed_seconds": time.time() - started,
    }
    args.out.write_text(json.dumps(payload, indent=2), encoding="utf-8")
    print(json.dumps(payload, indent=2), flush=True)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
