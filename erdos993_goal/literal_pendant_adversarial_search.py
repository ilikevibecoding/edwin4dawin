#!/usr/bin/env python3
"""Exact adversarial search in the literal component-separated pendant form.

Every tested object is specified by rooted tree components (R_i, s_i).  Put

    B = product I(R_i),       C = product I(R_i-s_i),
    P = (1+x) B + x C.

Adding a new vertex p adjacent to every s_i and then a leaf ell adjacent to p
constructs a tree with independence polynomial P.  Thus this program never
optimizes over arbitrary PF rows.  It tests exact PGC, the exceptional unsplit
Boundary-SM3 margin, and ordinary unimodality.

The search is bounded and heuristic outside its explicit parameter grid.  It
is counterexample evidence, not a proof.
"""

from __future__ import annotations

import argparse
import hashlib
import json
import random
import time
from dataclasses import dataclass
from pathlib import Path


Poly = tuple[int, ...]


def trim(a: list[int]) -> Poly:
    while len(a) > 1 and a[-1] == 0:
        a.pop()
    return tuple(a)


def add(a: Poly, b: Poly) -> Poly:
    out = [0] * max(len(a), len(b))
    for i, v in enumerate(a):
        out[i] += v
    for i, v in enumerate(b):
        out[i] += v
    return trim(out)


def mul(a: Poly, b: Poly) -> Poly:
    out = [0] * (len(a) + len(b) - 1)
    for i, av in enumerate(a):
        if av:
            for j, bv in enumerate(b):
                out[i + j] += av * bv
    return trim(out)


def power(a: Poly, exponent: int) -> Poly:
    out = (1,)
    base = a
    e = exponent
    while e:
        if e & 1:
            out = mul(out, base)
        e >>= 1
        if e:
            base = mul(base, base)
    return out


def coeff(a: Poly, k: int) -> int:
    return a[k] if 0 <= k < len(a) else 0


def shift(a: Poly) -> Poly:
    return (0,) + a


def reserve(a: Poly, k: int) -> int:
    return (
        k * coeff(a, k) ** 2
        + coeff(a, k - 1) * coeff(a, k)
        - (k + 1) * coeff(a, k - 1) * coeff(a, k + 1)
    )


def d3(a: Poly, k: int) -> int:
    return 3 * coeff(a, k) - coeff(a, k - 1)


def tree_states(order: int, edges: tuple[tuple[int, int], ...], root: int) -> tuple[Poly, Poly]:
    adjacency = [[] for _ in range(order)]
    for u, v in edges:
        adjacency[u].append(v)
        adjacency[v].append(u)
    parent = [-2] * order
    parent[root] = -1
    traversal = [root]
    for v in traversal:
        for u in adjacency[v]:
            if parent[u] == -2:
                parent[u] = v
                traversal.append(u)
    if len(traversal) != order or len(edges) != order - 1:
        raise ValueError("component is not a tree")
    excluded: dict[int, Poly] = {}
    included: dict[int, Poly] = {}
    for v in reversed(traversal):
        e = (1,)
        i = (0, 1)
        for u in adjacency[v]:
            if parent[u] == v:
                e = mul(e, add(excluded[u], included[u]))
                i = mul(i, excluded[u])
        excluded[v] = e
        included[v] = i
    return add(excluded[root], included[root]), excluded[root]


@dataclass(frozen=True)
class Component:
    order: int
    edges: tuple[tuple[int, int], ...]
    root: int
    label: str
    b: Poly
    c: Poly

    def descriptor(self) -> dict:
        return {
            "order": self.order,
            "root": self.root,
            "label": self.label,
            "edges": [list(e) for e in self.edges],
        }


@dataclass
class Candidate:
    components: tuple[Component, ...]
    b: Poly
    c: Poly
    order_f: int
    analysis: dict


def support_bundle(m: int, leaves: int) -> tuple[int, tuple[tuple[int, int], ...]]:
    """Center root, m supports, and `leaves` leaves at every support."""
    edges: list[tuple[int, int]] = []
    nxt = 1
    for _ in range(m):
        support = nxt
        nxt += 1
        edges.append((0, support))
        for _ in range(leaves):
            edges.append((support, nxt))
            nxt += 1
    return nxt, tuple(edges)


def path_component(order: int, root: int) -> tuple[tuple[int, int], ...]:
    return tuple((i, i + 1) for i in range(order - 1))


def mutated_edges(
    order: int,
    edges: tuple[tuple[int, int], ...],
    root: int,
    rng: random.Random,
    moves: int,
) -> tuple[tuple[int, int], ...]:
    """Deterministic subtree-prune/reattach mutations preserving a tree."""
    current = {tuple(sorted(e)) for e in edges}
    for _ in range(moves):
        adjacency = [[] for _ in range(order)]
        for u, v in current:
            adjacency[u].append(v)
            adjacency[v].append(u)
        parent = [-2] * order
        parent[root] = -1
        traversal = [root]
        for v in traversal:
            for u in adjacency[v]:
                if parent[u] == -2:
                    parent[u] = v
                    traversal.append(u)
        child = rng.randrange(1, order)
        descendants = set()
        stack = [child]
        while stack:
            v = stack.pop()
            if v in descendants:
                continue
            descendants.add(v)
            stack.extend(u for u in adjacency[v] if u != parent[v])
        outside = [v for v in range(order) if v not in descendants]
        new_parent = rng.choice(outside)
        old = tuple(sorted((child, parent[child])))
        new = tuple(sorted((child, new_parent)))
        if new in current:
            continue
        current.remove(old)
        current.add(new)
    return tuple(sorted(current))


def make_component(order: int, edges: tuple[tuple[int, int], ...], root: int, label: str) -> Component:
    b, c = tree_states(order, edges, root)
    return Component(order, edges, root, label, b, c)


def sha_poly(poly: Poly) -> str:
    raw = json.dumps(list(poly), separators=(",", ":")).encode("ascii")
    return hashlib.sha256(raw).hexdigest()


def profile(b: Poly, c: Poly) -> dict:
    p = add(mul((1, 1), b), shift(c))
    beta = len(b) - 1
    alpha_p = len(p) - 1

    first_descent = None
    first_reascent = None
    best_after = None
    for k in range(len(p) - 1):
        if first_descent is None and p[k + 1] < p[k]:
            first_descent = k
        elif first_descent is not None and p[k + 1] > p[k] and first_reascent is None:
            first_reascent = k
        if first_descent is not None and k > first_descent and p[k] > 0:
            pair = (p[k + 1], p[k], k)
            if best_after is None or pair[0] * best_after[1] > best_after[0] * pair[1]:
                best_after = pair

    pgc_best = None
    cutoff = (2 * alpha_p + 1) // 3
    pgc_checks = 0
    for k in range(2, cutoff):
        rp = reserve(p, k)
        rb = reserve(b, k - 1)
        left = k * coeff(b, k - 2) * rp
        right = (k - 1) * coeff(p, k - 1) * rb
        margin = left - right
        pgc_checks += 1
        # The exact signed cross-multiplied margin is decisive.  The ratio is
        # only a ranking coordinate when its denominator is positive.
        ratio = (left / right) if right > 0 else float("inf")
        item = {
            "rank": k,
            "left": left,
            "right": right,
            "margin": margin,
            "ratio_decimal": ratio,
        }
        if pgc_best is None or margin < 0 or (
            pgc_best["margin"] >= 0 and ratio < pgc_best["ratio_decimal"]
        ):
            if pgc_best is None or pgc_best["margin"] >= 0 or margin < pgc_best["margin"]:
                pgc_best = item

    boundary = None
    t = add(b, shift(c))
    if beta % 3 == 2 and len(t) - 1 == beta:
        r = (2 * beta) // 3
        margin = d3(b, r + 1) + d3(b, r) + d3(c, r)
        scale = (
            abs(d3(b, r + 1)) + abs(d3(b, r)) + abs(d3(c, r)) + 1
        )
        boundary = {
            "rank": r,
            "margin": margin,
            "scale": scale,
            "normalized_decimal": margin / scale,
        }

    return {
        "beta": beta,
        "alpha_P": alpha_p,
        "pgc_checks": pgc_checks,
        "closest_pgc": pgc_best,
        "boundary_sm3": boundary,
        "unimodal": first_reascent is None,
        "first_descent": first_descent,
        "first_reascent": first_reascent,
        "best_post_descent_ratio": None if best_after is None else {
            "rank": best_after[2],
            "numerator": best_after[0],
            "denominator": best_after[1],
            "decimal": best_after[0] / best_after[1],
        },
        "polynomial_sha256": {"B": sha_poly(b), "C": sha_poly(c), "P": sha_poly(p)},
    }


def candidate(components: tuple[Component, ...]) -> Candidate:
    b = (1,)
    c = (1,)
    order = 0
    for item in components:
        b = mul(b, item.b)
        c = mul(c, item.c)
        order += item.order
    return Candidate(components, b, c, order, profile(b, c))


def record(item: Candidate) -> dict:
    return {
        "forest_order": item.order_f,
        "pendant_tree_order": item.order_f + 2,
        "component_count": len(item.components),
        "components": [c.descriptor() for c in item.components],
        "analysis": item.analysis,
    }


def pgc_key(item: Candidate) -> tuple[float, int]:
    p = item.analysis["closest_pgc"]
    return (p["ratio_decimal"] if p is not None else float("inf"), item.order_f)


def boundary_key(item: Candidate) -> tuple[float, int]:
    b = item.analysis["boundary_sm3"]
    return (b["normalized_decimal"] if b is not None else float("inf"), item.order_f)


def rebound_key(item: Candidate) -> tuple[float, int]:
    r = item.analysis["best_post_descent_ratio"]
    return (-(r["decimal"] if r is not None else 0.0), item.order_f)


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--max-m", type=int, default=72)
    parser.add_argument("--max-leaves", type=int, default=6)
    parser.add_argument("--max-isolates", type=int, default=24)
    parser.add_argument("--mutations-per-order", type=int, default=24)
    parser.add_argument("--beam-width", type=int, default=144)
    parser.add_argument("--beam-depth", type=int, default=6)
    parser.add_argument("--pool-width", type=int, default=72)
    parser.add_argument("--seed", type=int, default=9930813202610)
    parser.add_argument("--output", type=Path, default=Path("literal_pendant_adversarial_search_20260813.json"))
    args = parser.parse_args()
    started = time.time()
    rng = random.Random(args.seed)

    isolate = make_component(1, (), 0, "isolate")
    components: list[Component] = [isolate]
    state_seen = {(isolate.b, isolate.c)}
    parameter_components: dict[tuple[int, int], Component] = {}
    for leaves in range(1, args.max_leaves + 1):
        for m in range(1, args.max_m + 1):
            order, edges = support_bundle(m, leaves)
            item = make_component(order, edges, 0, f"support_bundle(m={m},leaves={leaves})")
            parameter_components[m, leaves] = item
            state = (item.b, item.c)
            if state not in state_seen:
                state_seen.add(state)
                components.append(item)

    # Rooted paths provide a very different occupation profile.
    for order in range(5, 61, 5):
        edges = path_component(order, 0)
        for root in sorted({0, order // 3, order // 2}):
            item = make_component(order, edges, root, f"path(n={order},root={root})")
            state = (item.b, item.c)
            if state not in state_seen:
                state_seen.add(state)
                components.append(item)

    # Mutate centered bundles at orders well above the old n<=16 census.
    mutation_bases = [(8, 2), (11, 2), (15, 2), (19, 2), (23, 2), (29, 2), (37, 2), (47, 2)]
    mutation_count = 0
    for m, leaves in mutation_bases:
        if (m, leaves) not in parameter_components:
            continue
        base = parameter_components[m, leaves]
        for rep in range(args.mutations_per_order):
            edges = mutated_edges(base.order, base.edges, 0, rng, 1 + rep % 9)
            item = make_component(base.order, edges, 0, f"mutated_bundle(base_m={m},moves={1 + rep % 9},rep={rep})")
            state = (item.b, item.c)
            if state not in state_seen:
                state_seen.add(state)
                components.append(item)
                mutation_count += 1

    tested = 0
    pgc_checks = 0
    boundary_checks = 0
    champion_pgc: Candidate | None = None
    champion_boundary: Candidate | None = None
    champion_rebound: Candidate | None = None
    witness: tuple[str, Candidate] | None = None
    maximum_tested_order = 0

    def inspect(item: Candidate) -> bool:
        nonlocal tested, pgc_checks, boundary_checks, champion_pgc, champion_boundary, champion_rebound, witness, maximum_tested_order
        tested += 1
        maximum_tested_order = max(maximum_tested_order, item.order_f)
        pgc_checks += item.analysis["pgc_checks"]
        if item.analysis["boundary_sm3"] is not None:
            boundary_checks += 1
        if champion_pgc is None or pgc_key(item) < pgc_key(champion_pgc):
            champion_pgc = item
        if item.analysis["boundary_sm3"] is not None and (
            champion_boundary is None or boundary_key(item) < boundary_key(champion_boundary)
        ):
            champion_boundary = item
        if champion_rebound is None or rebound_key(item) < rebound_key(champion_rebound):
            champion_rebound = item
        if not item.analysis["unimodal"]:
            witness = ("nonunimodal_independence_sequence", item)
        p = item.analysis["closest_pgc"]
        if p is not None and p["margin"] < 0:
            witness = ("PGC_failure", item)
        bnd = item.analysis["boundary_sm3"]
        if bnd is not None and bnd["margin"] < 0:
            witness = ("unsplit_Boundary_SM3_failure", item)
        return witness is not None

    # Exact rectangular family.  This contains the 57-vertex (m,t,q)=(17,2,3)
    # split-counterexample regression but tests the surviving unsplit margin.
    for leaves in range(1, args.max_leaves + 1):
        for m in range(1, args.max_m + 1):
            base = parameter_components[m, leaves]
            comps: tuple[Component, ...] = (base,)
            for q in range(args.max_isolates + 1):
                if q:
                    comps = comps + (isolate,)
                if inspect(candidate(comps)):
                    break
            if witness:
                break
        if witness:
            break

    # Score single rooted components, retain a diverse adversarial pool, and
    # then beam-search genuinely mixed component products.
    singles = [candidate((c,)) for c in components]
    if not witness:
        for item in singles:
            if inspect(item):
                break
    selected: dict[tuple[Poly, Poly], Component] = {(isolate.b, isolate.c): isolate}
    lane = max(1, args.pool_width // 3)
    for ordering in (pgc_key, boundary_key, rebound_key):
        for item in sorted(singles, key=ordering)[:lane]:
            c = item.components[0]
            selected[c.b, c.c] = c
    pool = list(selected.values())[: args.pool_width]

    beam = sorted(singles, key=pgc_key)[: args.beam_width]
    completed_depth = 1
    if not witness:
        for depth in range(2, args.beam_depth + 1):
            next_items: dict[tuple[Poly, Poly], Candidate] = {}
            for prior in beam:
                for c in pool:
                    item = candidate(prior.components + (c,))
                    key = (item.b, item.c)
                    if key in next_items:
                        continue
                    next_items[key] = item
                    if inspect(item):
                        break
                if witness:
                    break
            if witness:
                break
            values = list(next_items.values())
            keep: dict[tuple[Poly, Poly], Candidate] = {}
            each = max(1, args.beam_width // 3)
            for ordering in (pgc_key, boundary_key, rebound_key):
                for item in sorted(values, key=ordering)[:each]:
                    keep[item.b, item.c] = item
            beam = list(keep.values())[: args.beam_width]
            completed_depth = depth

    if (17, 2) in parameter_components:
        regression_base = parameter_components[17, 2]
    else:
        regression_order, regression_edges = support_bundle(17, 2)
        regression_base = make_component(
            regression_order, regression_edges, 0, "support_bundle(m=17,leaves=2)"
        )
    regression = candidate((regression_base, isolate, isolate, isolate))
    regression_boundary = regression.analysis["boundary_sm3"]
    assert regression.order_f == 55
    assert regression_boundary is not None
    assert regression_boundary["margin"] == 57_086_629_816

    status = "WITNESS" if witness else "PASS_BOUNDED_NO_WITNESS_NOT_PROOF"
    report = {
        "status": status,
        "scope": "exact bounded literal component-separated pendant search; not exhaustive and not a proof",
        "parameters": vars(args) | {"output": str(args.output)},
        "coverage": {
            "candidate_forests_tested": tested,
            "exact_pgc_rank_checks": pgc_checks,
            "exceptional_unsplit_boundary_checks": boundary_checks,
            "unique_rooted_component_states": len(components),
            "mutated_rooted_component_states": mutation_count,
            "completed_beam_depth": completed_depth,
            "maximum_tested_forest_order": maximum_tested_order,
        },
        "regression_57_vertex_split_family": {
            "forest_order": regression.order_f,
            "pendant_tree_order": regression.order_f + 2,
            "unsplit_Boundary_SM3_margin": regression_boundary["margin"],
            "survives": regression_boundary["margin"] >= 0,
        },
        "champion_pgc": record(champion_pgc) if champion_pgc else None,
        "champion_boundary_sm3": record(champion_boundary) if champion_boundary else None,
        "champion_rebound": record(champion_rebound) if champion_rebound else None,
        "witness": None if witness is None else {"kind": witness[0], "candidate": record(witness[1])},
        "elapsed_seconds": time.time() - started,
    }
    args.output.write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    print(status)
    print(json.dumps(report["coverage"], indent=2))
    return 1 if witness else 0


if __name__ == "__main__":
    raise SystemExit(main())
