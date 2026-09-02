"""Random large-tree stress test for conditional one-root Boundary-SM3 payment."""

from __future__ import annotations

import argparse
import json
import random
from pathlib import Path

import networkx as nx


def add(a, b):
    n = max(len(a), len(b))
    return [(a[i] if i < len(a) else 0) + (b[i] if i < len(b) else 0) for i in range(n)]


def conv(a, b):
    out = [0] * (len(a) + len(b) - 1)
    for i, x in enumerate(a):
        for j, y in enumerate(b):
            out[i + j] += x * y
    return out


def forest_poly(g: nx.Graph, nodes: set[int]) -> list[int]:
    if not nodes:
        return [1]
    seen = set()
    total = [1]
    for root in sorted(nodes):
        if root in seen:
            continue
        parent = {root: None}
        order = [root]
        seen.add(root)
        for v in order:
            for w in g.neighbors(v):
                if w not in nodes or w == parent[v]:
                    continue
                parent[w] = v
                order.append(w)
                seen.add(w)
        take, skip = {}, {}
        for v in reversed(order):
            children = [w for w in g.neighbors(v) if parent.get(w) == v]
            sk = [1]
            tk = [0, 1]
            for w in children:
                sk = conv(sk, add(skip[w], take[w]))
                tk = conv(tk, skip[w])
            skip[v], take[v] = sk, tk
        total = conv(total, add(skip[root], take[root]))
    while total and total[-1] == 0:
        total.pop()
    return total


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--samples", type=int, default=5000)
    ap.add_argument("--min-order", type=int, default=20)
    ap.add_argument("--max-order", type=int, default=80)
    ap.add_argument("--seed", type=int, default=9930813)
    ap.add_argument("--output", type=Path, default=Path("random_boundary_one_root_payment.json"))
    args = ap.parse_args()
    rng = random.Random(args.seed)
    checks = 0
    conditional = 0
    first = None
    min_margin = None
    for sample in range(args.samples):
        n = rng.randint(args.min_order, args.max_order)
        seq = [rng.randrange(n) for _ in range(n - 2)]
        g = nx.from_prufer_sequence(seq)
        all_nodes = set(g)
        for p in rng.sample(range(n), min(n, 8)):
            f_nodes = all_nodes - {p}
            f = forest_poly(g, f_nodes)
            alpha = len(f) - 1
            full = forest_poly(g, all_nodes)
            if len(full) - 1 != alpha:
                continue
            h_nodes = all_nodes - ({p} | set(g.neighbors(p)))
            h = forest_poly(g, h_nodes)
            roots = set(g.neighbors(p))
            one = [0]
            for q in roots:
                allowed = f_nodes - (roots - {q}) - ({q} | set(g.neighbors(q)))
                row = forest_poly(g, allowed)
                if len(one) < len(row) + 1:
                    one.extend([0] * (len(row) + 1 - len(one)))
                for j, val in enumerate(row):
                    one[j + 1] += val
            for k in range(1, (2 * alpha) // 3 + 1):
                checks += 1
                hp = h[k - 1] if k - 1 < len(h) else 0
                hk = h[k] if k < len(h) else 0
                if hp <= 3 * hk:
                    continue
                conditional += 1
                margin = hk + (one[k] if k < len(one) else 0) - hp
                item = {"sample": sample, "n": n, "p": p, "alpha": alpha, "k": k,
                        "h_prev": hp, "h_k": hk, "one_root_k": one[k] if k < len(one) else 0,
                        "margin": margin, "prufer": seq}
                if min_margin is None or margin < min_margin["margin"]:
                    min_margin = item
                if margin < 0 and first is None:
                    first = item
                    break
            if first:
                break
        if first:
            break
    report = {"status": "PASS_RANDOM_NOT_PROOF" if first is None else "FAIL_ONE_ROOT_PAYMENT",
              "seed": args.seed, "samples_requested": args.samples,
              "rank_checks": checks, "conditional_checks": conditional,
              "minimum_margin": min_margin, "first_failure": first}
    args.output.write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(report, indent=2))


if __name__ == "__main__":
    main()
