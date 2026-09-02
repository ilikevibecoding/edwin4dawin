#!/usr/bin/env python3
"""Exact search of phase-competing decorated-edge trees for Erdős #993.

The tree has a central edge uv.  Vertex u receives p copies of one rooted
tree A and v receives q copies of another rooted tree B.  If (E_A, I_A)
are the independent-set polynomials conditioned on the root of A being
excluded/included, then the two hub states are

    E_u = P_A^p,       I_u = x E_A^p,
    E_v = P_B^q,       I_v = x E_B^q,

and the central edge gives

    P_T = E_u E_v + I_u E_v + E_u I_v.

The A and B used here are complete b-ary rooted trees.  Alternating
hard-core phases at high branching make the I_u E_v and E_u I_v summands
natural candidates for separated, comparably high coefficient peaks.

All coefficient calculations and witness tests use Python integers.
"""

from __future__ import annotations

import argparse
import json
import sys
import time
from dataclasses import dataclass
from pathlib import Path

REPO = Path(r"C:\Users\chris\tmp\erdos993_public")
sys.path.insert(0, str(REPO))

from scripts.valley_scaling_probe import kadd, kmul, kpow, shift  # noqa: E402


@dataclass(frozen=True)
class RootedType:
    branching: int
    height: int
    n: int
    excluded: tuple[int, ...]
    included: tuple[int, ...]

    @property
    def total(self) -> list[int]:
        return kadd(list(self.excluded), list(self.included))

    @property
    def label(self) -> str:
        return f"B{self.branching}H{self.height}"


def make_complete_types(branchings: range, max_height: int,
                        max_type_n: int) -> list[RootedType]:
    out: list[RootedType] = []
    for branching in branchings:
        excluded = [1]
        included = [0, 1]
        n = 1
        out.append(RootedType(branching, 0, n, tuple(excluded),
                              tuple(included)))
        for height in range(1, max_height + 1):
            old_excluded = excluded
            total = kadd(excluded, included)
            excluded = kpow(total, branching)
            included = shift(kpow(old_excluded, branching))
            n = 1 + branching * n
            if n > max_type_n:
                break
            out.append(RootedType(branching, height, n, tuple(excluded),
                                  tuple(included)))
    return out


def metric(poly: list[int], theta_num: int = 1,
           theta_den: int = 1000) -> dict:
    """Exact valley and thresholded cross-gap metrics."""
    m = len(poly)
    prefix = [0] * m
    best = poly[0]
    for k in range(1, m):
        prefix[k] = best
        if poly[k] > best:
            best = poly[k]

    suffix = [0] * m
    suffix_index = [m - 1] * m
    best = poly[-1]
    best_index = m - 1
    for k in range(m - 2, -1, -1):
        suffix[k] = best
        suffix_index[k] = best_index
        if poly[k] > best:
            best = poly[k]
            best_index = k

    witness = None
    raw = None
    gap = None
    for k in range(1, m - 1):
        if min(prefix[k], suffix[k]) > poly[k] and witness is None:
            c = suffix_index[k]
            witness = {
                "a": max(range(k), key=poly.__getitem__),
                "b": k,
                "c": c,
                "coefficients": [prefix[k], poly[k], suffix[k]],
            }
        raw_num = min(prefix[k], suffix[k])
        if raw is None or raw_num * raw["den"] > raw["num"] * poly[k]:
            raw = {"num": raw_num, "den": poly[k], "b": k,
                   "c": suffix_index[k]}
        if prefix[k] * theta_den >= (theta_den + theta_num) * poly[k]:
            gap_num = suffix[k]
            if gap is None or gap_num * gap["den"] > gap["num"] * poly[k]:
                gap = {"num": gap_num, "den": poly[k], "b": k,
                       "c": suffix_index[k]}

    def finish(rec: dict | None) -> dict | None:
        if rec is None:
            return None
        return {
            **rec,
            "ratio": rec["num"] / rec["den"],
            "distance": rec["c"] - rec["b"],
        }

    return {"witness": witness, "raw": finish(raw), "rgap": finish(gap)}


def edge_poly(a: RootedType, p: int, b: RootedType,
              q: int) -> list[int]:
    """Independent-set polynomial of the decorated central-edge tree."""
    eu = kpow(a.total, p)
    iu = shift(kpow(list(a.excluded), p))
    ev = kpow(b.total, q)
    iv = shift(kpow(list(b.excluded), q))
    return kadd(kadd(kmul(eu, ev), kmul(iu, ev)), kmul(eu, iv))


def edge_poly_from_powers(
    a_power: tuple[list[int], list[int]],
    b_power: tuple[list[int], list[int]],
) -> list[int]:
    """As edge_poly, using cached (P^count, E^count) pairs."""
    eu, a_excluded_power = a_power
    ev, b_excluded_power = b_power
    iu = shift(a_excluded_power)
    iv = shift(b_excluded_power)
    return kadd(kadd(kmul(eu, ev), kmul(iu, ev)), kmul(eu, iv))


def make_tree_edges(a: RootedType, p: int, b: RootedType,
                    q: int) -> tuple[int, list[tuple[int, int]]]:
    """Materialize the exact tree encoded by a search specification."""
    edges: list[tuple[int, int]] = [(0, 1)]
    next_vertex = 2

    def add_complete(parent: int, branching: int, height: int) -> None:
        nonlocal next_vertex
        root = next_vertex
        next_vertex += 1
        edges.append((parent, root))
        frontier = [root]
        for _ in range(height):
            new_frontier: list[int] = []
            for vertex in frontier:
                for _ in range(branching):
                    child = next_vertex
                    next_vertex += 1
                    edges.append((vertex, child))
                    new_frontier.append(child)
            frontier = new_frontier

    for _ in range(p):
        add_complete(0, a.branching, a.height)
    for _ in range(q):
        add_complete(1, b.branching, b.height)
    return next_vertex, edges


def record_for(a: RootedType, p: int, b: RootedType, q: int,
               poly: list[int], score: dict) -> dict:
    return {
        "left_type": a.label,
        "left_count": p,
        "right_type": b.label,
        "right_count": q,
        "n": 2 + p * a.n + q * b.n,
        "degree": len(poly) - 1,
        "score": score,
    }


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--bmin", type=int, default=3)
    parser.add_argument("--bmax", type=int, default=9)
    parser.add_argument("--height", type=int, default=5)
    parser.add_argument("--max-type-n", type=int, default=500)
    parser.add_argument("--max-count", type=int, default=16)
    parser.add_argument("--max-n", type=int, default=3000)
    parser.add_argument("--top", type=int, default=30)
    parser.add_argument("--output", type=Path)
    args = parser.parse_args()

    types = make_complete_types(range(args.bmin, args.bmax + 1),
                                args.height, args.max_type_n)
    # Height zero is just a leaf independent of b; retain one copy.
    unique: dict[tuple[int, tuple[int, ...], tuple[int, ...]], RootedType] = {}
    for rooted in types:
        key = (rooted.n, rooted.excluded, rooted.included)
        unique.setdefault(key, rooted)
    types = list(unique.values())
    print("types:", ", ".join(f"{t.label}(n={t.n})" for t in types),
          flush=True)

    powers: dict[str, list[tuple[list[int], list[int]]]] = {}
    for rooted in types:
        total = rooted.total
        excluded = list(rooted.excluded)
        powers[rooted.label] = [([1], [1])]
        max_useful_count = min(args.max_count,
                               (args.max_n - 2) // rooted.n)
        total_power = [1]
        excluded_power = [1]
        for _ in range(1, max_useful_count + 1):
            total_power = kmul(total_power, total)
            excluded_power = kmul(excluded_power, excluded)
            powers[rooted.label].append((total_power, excluded_power))

    champions: list[dict] = []
    tested = 0
    started = time.time()
    for ai, a in enumerate(types):
        for b in types[ai:]:
            for p in range(1, args.max_count + 1):
                if 2 + p * a.n + b.n > args.max_n:
                    break
                if p >= len(powers[a.label]):
                    break
                for q in range(1, args.max_count + 1):
                    n = 2 + p * a.n + q * b.n
                    if n > args.max_n:
                        break
                    if q >= len(powers[b.label]):
                        break
                    poly = edge_poly_from_powers(
                        powers[a.label][p], powers[b.label][q])
                    score = metric(poly)
                    tested += 1
                    rec = record_for(a, p, b, q, poly, score)
                    if score["witness"] is not None:
                        vertex_count, edges = make_tree_edges(a, p, b, q)
                        assert vertex_count == n and len(edges) == n - 1
                        rec["edges"] = edges
                        rec["polynomial"] = poly
                        print("EXACT WITNESS", json.dumps(rec), flush=True)
                        if args.output:
                            args.output.write_text(json.dumps({
                                "tested": tested,
                                "witness": rec,
                            }, indent=2), encoding="utf-8")
                        return 0
                    if score["rgap"] is not None:
                        champions.append(rec)
                        champions.sort(
                            key=lambda x: (
                                x["score"]["rgap"]["distance"] > 1,
                                x["score"]["rgap"]["ratio"],
                            ),
                            reverse=True,
                        )
                        del champions[args.top:]
            print(f"pair {a.label:>5} {b.label:>5}: tested={tested} "
                  f"elapsed={time.time()-started:.1f}s", flush=True)

    result = {
        "parameters": vars(args) | {"output": str(args.output)
                                    if args.output else None},
        "tested": tested,
        "elapsed_seconds": time.time() - started,
        "witness": None,
        "champions": champions,
    }
    print(json.dumps(result, indent=2), flush=True)
    if args.output:
        args.output.write_text(json.dumps(result, indent=2), encoding="utf-8")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
