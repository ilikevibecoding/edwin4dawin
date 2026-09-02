#!/usr/bin/env python3
"""Independent exact replay of stored champions from the literal pendant search."""

from __future__ import annotations

import argparse
import hashlib
import json
from pathlib import Path


Poly = tuple[int, ...]


def add(a: Poly, b: Poly) -> Poly:
    out = [0] * max(len(a), len(b))
    for i, x in enumerate(a): out[i] += x
    for i, x in enumerate(b): out[i] += x
    while len(out) > 1 and out[-1] == 0: out.pop()
    return tuple(out)


def mul(a: Poly, b: Poly) -> Poly:
    out = [0] * (len(a) + len(b) - 1)
    for i, x in enumerate(a):
        for j, y in enumerate(b): out[i + j] += x * y
    return tuple(out)


def tree_pair(desc: dict) -> tuple[Poly, Poly]:
    n, root = desc["order"], desc["root"]
    adjacency = [[] for _ in range(n)]
    for u, v in desc["edges"]:
        adjacency[u].append(v); adjacency[v].append(u)
    assert sum(map(len, adjacency)) == 2 * (n - 1)
    parent = [-2] * n; parent[root] = -1; order = [root]
    for v in order:
        for u in adjacency[v]:
            if parent[u] == -2: parent[u] = v; order.append(u)
    assert len(order) == n
    no: dict[int, Poly] = {}; yes: dict[int, Poly] = {}
    for v in reversed(order):
        e, i = (1,), (0, 1)
        for u in adjacency[v]:
            if parent[u] == v:
                e = mul(e, add(no[u], yes[u])); i = mul(i, no[u])
        no[v], yes[v] = e, i
    return add(no[root], yes[root]), no[root]


def coeff(a: Poly, k: int) -> int: return a[k] if 0 <= k < len(a) else 0


def reserve(a: Poly, k: int) -> int:
    return k*coeff(a,k)**2 + coeff(a,k-1)*coeff(a,k) - (k+1)*coeff(a,k-1)*coeff(a,k+1)


def d3(a: Poly, k: int) -> int: return 3*coeff(a,k) - coeff(a,k-1)


def digest(a: Poly) -> str:
    return hashlib.sha256(json.dumps(list(a), separators=(",", ":")).encode("ascii")).hexdigest()


def replay(candidate: dict) -> dict:
    b = (1,); c = (1,); order_f = 0
    for desc in candidate["components"]:
        bi, ci = tree_pair(desc); b = mul(b, bi); c = mul(c, ci); order_f += desc["order"]
    p = add(mul((1,1), b), (0,) + c)
    stored = candidate["analysis"]
    assert order_f == candidate["forest_order"]
    assert {"B":digest(b),"C":digest(c),"P":digest(p)} == stored["polynomial_sha256"]
    pgc = stored["closest_pgc"]
    if pgc is not None:
        k = pgc["rank"]
        left = k*coeff(b,k-2)*reserve(p,k)
        right = (k-1)*coeff(p,k-1)*reserve(b,k-1)
        assert (left, right, left-right) == (pgc["left"], pgc["right"], pgc["margin"])
    boundary = stored["boundary_sm3"]
    if boundary is not None:
        r = boundary["rank"]
        assert d3(b,r+1)+d3(b,r)+d3(c,r) == boundary["margin"]
    descent = next((k for k in range(len(p)-1) if p[k+1] < p[k]), None)
    reascent = None if descent is None else next((k for k in range(descent+1,len(p)-1) if p[k+1] > p[k]), None)
    assert descent == stored["first_descent"] and reascent == stored["first_reascent"]
    return {"order_F":order_f,"degree_P":len(p)-1,"pgc_margin":None if pgc is None else pgc["margin"],"boundary_margin":None if boundary is None else boundary["margin"],"unimodal":reascent is None}


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("input", type=Path)
    ap.add_argument("--output", type=Path, default=Path("literal_pendant_adversarial_search_verified_20260813.json"))
    args = ap.parse_args()
    data = json.loads(args.input.read_text(encoding="utf-8"))
    results = {}
    for key in ("champion_pgc","champion_boundary_sm3","champion_rebound"):
        assert data[key] is not None
        results[key] = replay(data[key])
    if data["witness"] is not None:
        results["witness"] = replay(data["witness"]["candidate"])
    out = {"status":"PASS_INDEPENDENT_EXACT_LITERAL_PENDANT_REPLAY","source":args.input.name,"results":results}
    args.output.write_text(json.dumps(out,indent=2)+"\n",encoding="utf-8")
    print(out["status"])
    return 0


if __name__ == "__main__": raise SystemExit(main())
