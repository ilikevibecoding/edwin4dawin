"""Probe a canonical alternating-tree augmentation for forest independent sets.

For a fixed maximum independent set A and an independent r-set S, every
component of G[A triangle S] has at least as many A-vertices as S-vertices.
A matching saturating the S-side exists.  Starting from an unmatched A-root,
the alternating closure has one more A-vertex than S-vertex, and toggling it
maps S to an independent (r+1)-set.

This probe makes all choices deterministic and measures the largest fibre of
the resulting map in the prefix r+1 <= floor(2 alpha / 3).  It is evidence
only: a bounded fibre would still need an all-order proof and a forest (not
just tree) product argument.
"""

from __future__ import annotations

import argparse
import itertools
import json
from collections import Counter, deque
from pathlib import Path

import networkx as nx


def canonical_maximum_independent_set(g: nx.Graph) -> frozenset[int]:
    """Return a maximum independent set, breaking ties by minimum bit mask."""
    nodes = sorted(g.nodes())
    if not nodes:
        return frozenset()
    root = nodes[0]
    parent = {root: None}
    order = [root]
    for v in order:
        for w in sorted(g.neighbors(v)):
            if w == parent[v]:
                continue
            parent[w] = v
            order.append(w)

    # state[v][take] = (size, bitmask); maximize size, then minimize bitmask.
    state: dict[int, dict[int, tuple[int, int]]] = {}
    for v in reversed(order):
        take_size, take_mask = 1, 1 << v
        skip_size, skip_mask = 0, 0
        for w in sorted(g.neighbors(v)):
            if parent.get(w) != v:
                continue
            sw = state[w]
            take_size += sw[0][0]
            take_mask |= sw[0][1]
            best = sw[0]
            if sw[1][0] > best[0] or (sw[1][0] == best[0] and sw[1][1] < best[1]):
                best = sw[1]
            skip_size += best[0]
            skip_mask |= best[1]
        state[v] = {1: (take_size, take_mask), 0: (skip_size, skip_mask)}
    best = state[root][0]
    alt = state[root][1]
    if alt[0] > best[0] or (alt[0] == best[0] and alt[1] < best[1]):
        best = alt
    return frozenset(v for v in nodes if best[1] & (1 << v))


def independent_sets_of_size(g: nx.Graph, r: int):
    nodes = sorted(g.nodes())
    for comb in itertools.combinations(nodes, r):
        s = frozenset(comb)
        if all(not (u in s and v in s) for u, v in g.edges()):
            yield s


def lex_saturating_matching(
    g: nx.Graph, s_side: tuple[int, ...], a_side: frozenset[int]
) -> dict[int, int]:
    """Lexicographically first matching saturating s_side."""
    nbrs = {s: tuple(sorted(v for v in g.neighbors(s) if v in a_side)) for s in s_side}
    assignment: dict[int, int] = {}
    used: set[int] = set()

    # Fail-first variable order is deterministic and much faster than label order.
    remaining = tuple(sorted(s_side, key=lambda s: (len(nbrs[s]), s)))

    def rec(i: int) -> bool:
        if i == len(remaining):
            return True
        s = remaining[i]
        for a in nbrs[s]:
            if a in used:
                continue
            used.add(a)
            assignment[s] = a
            if rec(i + 1):
                return True
            del assignment[s]
            used.remove(a)
        return False

    if not rec(0):
        raise AssertionError("maximum-set exchange Hall condition failed")
    return assignment


def canonical_augmentations(g: nx.Graph, a: frozenset[int], s: frozenset[int]) -> list[frozenset[int]]:
    if len(s) >= len(a):
        raise ValueError("augmentation requires |S| < alpha")
    sym = a ^ s
    h = g.subgraph(sym)
    s_side = tuple(sorted(s - a))
    a_side = frozenset(a - s)
    matching = lex_saturating_matching(h, s_side, a_side)
    matched_a = frozenset(matching.values())
    roots = sorted(a_side - matched_a)
    if not roots:
        raise AssertionError("no unmatched A-root")
    out = []
    for root in roots:
        closure_a = {root}
        closure_s: set[int] = set()
        queue = deque([root])
        while queue:
            av = queue.popleft()
            for sv in sorted(h.neighbors(av)):
                if sv not in s_side or sv in closure_s:
                    continue
                closure_s.add(sv)
                mv = matching[sv]
                if mv not in closure_a:
                    closure_a.add(mv)
                    queue.append(mv)

        if len(closure_a) != len(closure_s) + 1:
            raise AssertionError("alternating closure does not have surplus one")
        t = frozenset((s - closure_s) | closure_a)
        if len(t) != len(s) + 1:
            raise AssertionError("wrong augmented size")
        if any(u in t and v in t for u, v in g.edges()):
            raise AssertionError("augmentation is not independent")
        out.append(t)
    if len(set(out)) != len(out):
        raise AssertionError("distinct unmatched roots gave the same augmentation")
    return out


def canonical_augment(g: nx.Graph, a: frozenset[int], s: frozenset[int]) -> frozenset[int]:
    return canonical_augmentations(g, a, s)[0]


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--max-order", type=int, default=14)
    ap.add_argument("--output", type=Path, default=Path("canonical_alternating_augmentation_probe.json"))
    args = ap.parse_args()

    counts = Counter()
    worst = None
    worst_average = None
    for n in range(2, args.max_order + 1):
        for ti, g0 in enumerate(nx.generators.nonisomorphic_trees(n)):
            g = nx.convert_node_labels_to_integers(g0, ordering="sorted")
            a = canonical_maximum_independent_set(g)
            alpha = len(a)
            cutoff = (2 * alpha) // 3
            counts["trees"] += 1
            for target_rank in range(1, cutoff + 1):
                r = target_rank - 1
                fibres: Counter[frozenset[int]] = Counter()
                all_root_fibres: Counter[frozenset[int]] = Counter()
                domain = 0
                for s in independent_sets_of_size(g, r):
                    t = canonical_augment(g, a, s)
                    fibres[t] += 1
                    for tt in canonical_augmentations(g, a, s):
                        all_root_fibres[tt] += 1
                    domain += 1
                if not fibres:
                    continue
                counts["rank_maps"] += 1
                counts["domain_sets"] += domain
                max_fibre = max(fibres.values())
                counts[f"fibre_{max_fibre}"] += 1
                item = {
                    "n": n,
                    "tree_index": ti,
                    "alpha": alpha,
                    "target_rank": target_rank,
                    "domain": domain,
                    "image": len(fibres),
                    "max_fibre": max_fibre,
                    "average_fibre": domain / len(fibres),
                    "all_root_max_fibre": max(all_root_fibres.values()),
                    "all_root_degree_bound": max(all_root_fibres.values()) <= 3 * (alpha - r),
                    "all_root_wr_bound": max(all_root_fibres.values())
                    <= target_rank * (alpha - r),
                    "edges": sorted(tuple(sorted(e)) for e in g.edges()),
                }
                if not item["all_root_degree_bound"]:
                    counts["all_root_degree_failures"] += 1
                if not item["all_root_wr_bound"]:
                    counts["all_root_wr_failures"] += 1
                if worst is None or (max_fibre, domain / len(fibres)) > (
                    worst["max_fibre"], worst["domain"] / worst["image"]
                ):
                    worst = item
                if worst_average is None or item["average_fibre"] > worst_average["average_fibre"]:
                    worst_average = item

    report = {
        "status": "PASS_BOUNDED_PROBE_NOT_PROOF",
        "max_order": args.max_order,
        "counts": dict(counts),
        "worst": worst,
        "worst_average": worst_average,
    }
    args.output.write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(report, indent=2))


if __name__ == "__main__":
    main()
