#!/usr/bin/env python3
"""Exact stress test for a curvature-reserve invariant on planted HIT trees.

A homeomorphically irreducible tree (HIT) has no vertex of degree two.  Root a
tree and, for every planted subtree at a vertex v, write

    E_v = product(T_c),       J_v = product(E_c),
    T_v = E_v + x J_v,

where c ranges over the children of v.  If e_k=[x^k]E_v and
j_k=[x^k]J_v, the candidate reserve inequality is

    e_k^2 - e_{k-1} e_{k+1}
      >= e_{k-1} j_k + e_{k+1} j_{k-2} - 2 e_k j_{k-1}.       (HIT-R)

Together with log-concavity of J_v, HIT-R implies log-concavity of T_v by
expanding the Turan determinant of E_v+xJ_v.

All arithmetic in this script is Python integer arithmetic.  The exhaustive
lane enumerates every unlabeled core tree and gives core vertex v exactly
max(0,3-deg(v)) pendant leaves.  This represents the minimally leaf-padded HIT
with that internal core.  Every internal core vertex is used as a root, so all
directed planted states are exercised.  The random lane adds arbitrary extra
pendant leaves.  A known degree-two broom is included as a negative control:
the invariant is not claimed for arbitrary trees.
"""

from __future__ import annotations

import argparse
import json
import random
import time
from dataclasses import dataclass
from pathlib import Path
from typing import Iterable

import networkx as nx


def trim(p: list[int]) -> list[int]:
    while len(p) > 1 and p[-1] == 0:
        p.pop()
    return p


def add(a: list[int], b: list[int]) -> list[int]:
    out = [0] * max(len(a), len(b))
    for i, x in enumerate(a):
        out[i] += x
    for i, x in enumerate(b):
        out[i] += x
    return trim(out)


def mul(a: list[int], b: list[int]) -> list[int]:
    out = [0] * (len(a) + len(b) - 1)
    for i, x in enumerate(a):
        if x:
            for j, y in enumerate(b):
                if y:
                    out[i + j] += x * y
    return trim(out)


def shift(p: list[int]) -> list[int]:
    return [0] + p


def coeff(p: list[int], k: int) -> int:
    return p[k] if 0 <= k < len(p) else 0


def lc_gap(p: list[int], k: int) -> int:
    return coeff(p, k) ** 2 - coeff(p, k - 1) * coeff(p, k + 1)


def reserve_gap(e: list[int], j: list[int], k: int) -> int:
    ek = coeff(e, k)
    return (
        lc_gap(e, k)
        - coeff(e, k - 1) * coeff(j, k)
        - coeff(e, k + 1) * coeff(j, k - 2)
        + 2 * ek * coeff(j, k - 1)
    )


def relative_gap(gap: int, scale_terms: Iterable[int]) -> float:
    scale = max(1, *(abs(x) for x in scale_terms))
    return gap / scale


@dataclass
class State:
    e: list[int]
    j: list[int]
    t: list[int]
    children: int


def rooted_states(graph: nx.Graph, root: int) -> tuple[dict[int, State], dict[int, int]]:
    parent = {root: -1}
    order = [root]
    for v in order:
        for w in graph[v]:
            if w == parent[v]:
                continue
            parent[w] = v
            order.append(w)

    states: dict[int, State] = {}
    for v in reversed(order):
        children = [w for w in graph[v] if parent.get(w) == v]
        e = [1]
        j = [1]
        for w in children:
            e = mul(e, states[w].t)
            j = mul(j, states[w].e)
        states[v] = State(e=e, j=j, t=add(e, shift(j)), children=len(children))
    return states, parent


def planted_state(
    graph: nx.Graph,
    vertex: int,
    parent: int | None,
    memo: dict[tuple[int, int | None], State],
) -> State:
    """State of the component at vertex after deleting the parent edge."""
    key = (vertex, parent)
    if key in memo:
        return memo[key]
    children = [w for w in graph[vertex] if w != parent]
    e = [1]
    j = [1]
    for w in children:
        child = planted_state(graph, w, vertex, memo)
        e = mul(e, child.t)
        j = mul(j, child.e)
    state = State(e=e, j=j, t=add(e, shift(j)), children=len(children))
    memo[key] = state
    return state


def tree_certificate(graph: nx.Graph) -> dict:
    return {
        "order": graph.number_of_nodes(),
        "size": graph.number_of_edges(),
        "is_tree": nx.is_tree(graph),
        "degrees": sorted(dict(graph.degree()).values()),
        "edges": sorted([sorted((int(u), int(v))) for u, v in graph.edges()]),
        "graph6": nx.to_graph6_bytes(graph, header=False).decode("ascii").strip(),
    }


def make_hit(core: nx.Graph, extra_leaves: list[int] | None = None) -> tuple[nx.Graph, list[int]]:
    """Pad every core vertex to degree at least three using pendant leaves."""
    h = core.number_of_nodes()
    extra = extra_leaves or [0] * h
    if len(extra) != h:
        raise ValueError("extra-leaves vector has the wrong length")
    graph = nx.convert_node_labels_to_integers(core, ordering="sorted")
    leaf_counts: list[int] = []
    nxt = h
    for v in range(h):
        count = max(0, 3 - graph.degree(v)) + extra[v]
        leaf_counts.append(count)
        for _ in range(count):
            graph.add_edge(v, nxt)
            nxt += 1
    assert nx.is_tree(graph)
    assert all(d != 2 for _, d in graph.degree())
    return graph, leaf_counts


def degree_two_broom(branches: int = 3, twigs: int = 4) -> nx.Graph:
    """T_{branches,twigs}: hub--branch--support--leaf."""
    graph = nx.Graph()
    graph.add_node(0)
    nxt = 1
    for _ in range(branches):
        w = nxt
        nxt += 1
        graph.add_edge(0, w)
        for _ in range(twigs):
            x = nxt
            y = nxt + 1
            nxt += 2
            graph.add_edge(w, x)
            graph.add_edge(x, y)
    return graph


def check_state_records(
    graph: nx.Graph,
    records: Iterable[tuple[int, int | None, State]],
    require_no_one_child: bool,
    context: dict,
) -> tuple[dict | None, dict]:
    stats = {
        "states": 0,
        "indices": 0,
        "one_child_states": 0,
        "min_relative_reserve": None,
        "min_relative_lc_e": None,
        "min_relative_lc_j": None,
        "min_relative_lc_t": None,
    }

    for v, parent, state in records:
        stats["states"] += 1
        if state.children == 1:
            stats["one_child_states"] += 1
            if require_no_one_child:
                return {
                    "kind": "unexpected_one_child_state",
                    "context": context,
                    "vertex": v,
                    "parent": parent,
                    "tree": tree_certificate(graph),
                }, stats

        max_k = max(len(state.e), len(state.j) + 1, len(state.t))
        for k in range(max_k + 1):
            stats["indices"] += 1
            egap = lc_gap(state.e, k)
            jgap = lc_gap(state.j, k)
            tgap = lc_gap(state.t, k)
            rgap = reserve_gap(state.e, state.j, k)
            e_scale = [
                coeff(state.e, k) ** 2,
                coeff(state.e, k - 1) * coeff(state.e, k + 1),
            ]
            j_scale = [
                coeff(state.j, k) ** 2,
                coeff(state.j, k - 1) * coeff(state.j, k + 1),
            ]
            t_scale = [
                coeff(state.t, k) ** 2,
                coeff(state.t, k - 1) * coeff(state.t, k + 1),
            ]
            r_scale = e_scale + [
                coeff(state.e, k - 1) * coeff(state.j, k),
                coeff(state.e, k + 1) * coeff(state.j, k - 2),
                2 * coeff(state.e, k) * coeff(state.j, k - 1),
            ]
            for key, value in (
                ("min_relative_lc_e", relative_gap(egap, e_scale)),
                ("min_relative_lc_j", relative_gap(jgap, j_scale)),
                ("min_relative_lc_t", relative_gap(tgap, t_scale)),
                ("min_relative_reserve", relative_gap(rgap, r_scale)),
            ):
                if stats[key] is None or value < stats[key]:
                    stats[key] = value

            if min(egap, jgap, tgap, rgap) < 0:
                failed = []
                if egap < 0:
                    failed.append("E_log_concavity")
                if jgap < 0:
                    failed.append("J_log_concavity")
                if tgap < 0:
                    failed.append("T_log_concavity")
                if rgap < 0:
                    failed.append("HIT-R")
                return {
                    "kind": "inequality_failure",
                    "failed": failed,
                    "context": context,
                    "vertex": v,
                    "parent": parent,
                    "children": state.children,
                    "k": k,
                    "gaps": {"E": egap, "J": jgap, "T": tgap, "reserve": rgap},
                    "E": state.e,
                    "J": state.j,
                    "T": state.t,
                    "tree": tree_certificate(graph),
                }, stats
    return None, stats


def check_root(
    graph: nx.Graph,
    root: int,
    require_no_one_child: bool,
    context: dict,
) -> tuple[dict | None, dict]:
    states, parents = rooted_states(graph, root)
    records = ((v, parents[v] if parents[v] != -1 else None, state) for v, state in states.items())
    return check_state_records(graph, records, require_no_one_child, context | {"root": root})


def check_all_hit_orientations(
    graph: nx.Graph,
    internal_vertices: Iterable[int],
    context: dict,
) -> tuple[dict | None, dict]:
    """Check every directed edge state and every possible internal root state.

    This is equivalent to recomputing the rooted DP at every internal root,
    but each directed component is evaluated only once.
    """
    memo: dict[tuple[int, int | None], State] = {}
    records: list[tuple[int, int | None, State]] = []
    for v in graph:
        for parent in graph[v]:
            records.append((v, parent, planted_state(graph, v, parent, memo)))
    for root in internal_vertices:
        records.append((root, None, planted_state(graph, root, None, memo)))
    return check_state_records(graph, records, True, context)


def merge_stats(total: dict, part: dict) -> None:
    for key in ("states", "indices", "one_child_states"):
        total[key] += part[key]
    for key in (
        "min_relative_reserve",
        "min_relative_lc_e",
        "min_relative_lc_j",
        "min_relative_lc_t",
    ):
        value = part[key]
        if value is not None and (total[key] is None or value < total[key]):
            total[key] = value


def empty_stats() -> dict:
    return {
        "trees": 0,
        "rootings": 0,
        "states": 0,
        "indices": 0,
        "one_child_states": 0,
        "min_relative_reserve": None,
        "min_relative_lc_e": None,
        "min_relative_lc_j": None,
        "min_relative_lc_t": None,
    }


def core_generator(h: int):
    if h == 1:
        yield nx.empty_graph(1)
    else:
        yield from nx.nonisomorphic_trees(h)


def exhaustive_lane(max_core: int) -> tuple[dict, dict | None]:
    total = empty_stats()
    per_order = []
    for h in range(1, max_core + 1):
        order_stats = empty_stats()
        for core_index, core in enumerate(core_generator(h)):
            graph, leaves = make_hit(core)
            order_stats["trees"] += 1
            internal = list(range(h))
            order_stats["rootings"] += len(internal)
            failure, part = check_all_hit_orientations(
                graph,
                internal,
                context={
                    "lane": "exhaustive_minimal_hit",
                    "core_order": h,
                    "core_index": core_index,
                    "leaf_counts": leaves,
                },
            )
            merge_stats(order_stats, part)
            if failure:
                merge_stats(total, order_stats)
                total["trees"] += order_stats["trees"]
                total["rootings"] += order_stats["rootings"]
                return {"summary": total, "per_core_order": per_order + [order_stats]}, failure
        merge_stats(total, order_stats)
        total["trees"] += order_stats["trees"]
        total["rootings"] += order_stats["rootings"]
        per_order.append({"core_order": h, **order_stats})
        print(
            f"exhaustive h={h}: trees={order_stats['trees']:,} "
            f"rootings={order_stats['rootings']:,} states={order_stats['states']:,}",
            flush=True,
        )
    return {"summary": total, "per_core_order": per_order}, None


def random_core(rng: random.Random, h: int) -> nx.Graph:
    if h == 1:
        return nx.empty_graph(1)
    # A Prufer sequence samples a labelled core and strongly diversifies shapes.
    return nx.from_prufer_sequence([rng.randrange(h) for _ in range(h - 2)])


def random_lane(
    count: int,
    max_core: int,
    max_extra: int,
    seed: int,
) -> tuple[dict, dict | None]:
    rng = random.Random(seed)
    total = empty_stats()
    for trial in range(count):
        h = rng.randint(1, max_core)
        core = random_core(rng, h)
        extras = [rng.randint(0, max_extra) for _ in range(h)]
        graph, leaves = make_hit(core, extras)
        total["trees"] += 1
        total["rootings"] += h
        failure, part = check_all_hit_orientations(
            graph,
            range(h),
            context={
                "lane": "random_hit",
                "trial": trial,
                "core_order": h,
                "leaf_counts": leaves,
                "seed": seed,
            },
        )
        merge_stats(total, part)
        if failure:
            return total, failure
        if (trial + 1) % 1000 == 0:
            print(
                f"random {trial + 1:,}/{count:,}: states={total['states']:,}",
                flush=True,
            )
    return total, None


def control_lane() -> dict:
    graph = degree_two_broom()
    totals = empty_stats()
    memo: dict[tuple[int, int | None], State] = {}
    records: list[tuple[int, int | None, State]] = []
    for v in graph:
        for parent in graph[v]:
            records.append((v, parent, planted_state(graph, v, parent, memo)))
        records.append((v, None, planted_state(graph, v, None, memo)))
    failure, part = check_state_records(
        graph,
        records,
        require_no_one_child=False,
        context={"lane": "degree_two_broom_control"},
    )
    merge_stats(totals, part)
    totals["rootings"] = graph.number_of_nodes()
    totals["trees"] = 1
    return {
        "tree": tree_certificate(graph),
        "summary": totals,
        "failure_count": int(failure is not None),
        "first_failure": failure,
    }


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--max-core", type=int, default=12)
    parser.add_argument("--random", type=int, default=5000)
    parser.add_argument("--random-max-core", type=int, default=50)
    parser.add_argument("--max-extra-leaves", type=int, default=4)
    parser.add_argument("--seed", type=int, default=993)
    parser.add_argument("--output", type=Path, required=True)
    args = parser.parse_args()

    started = time.time()
    exhaustive, failure = exhaustive_lane(args.max_core)
    random_result = None
    if failure is None and args.random:
        random_result, failure = random_lane(
            args.random,
            args.random_max_core,
            args.max_extra_leaves,
            args.seed,
        )
    control = control_lane()
    report = {
        "claim_tested": (
            "For every planted state in a homeomorphically irreducible tree, "
            "E, J, and T are log-concave and HIT-R is nonnegative."
        ),
        "exact_arithmetic": True,
        "parameters": vars(args) | {"output": str(args.output)},
        "elapsed_seconds": time.time() - started,
        "exhaustive_minimal_hit": exhaustive,
        "random_hit": random_result,
        "degree_two_negative_control": control,
        "hit_failure": failure,
        "status": "FAIL" if failure else "PASS_NOT_PROOF",
    }
    args.output.write_text(json.dumps(report, indent=2), encoding="utf-8")
    print(json.dumps({"status": report["status"], "failure": failure}, indent=2))


if __name__ == "__main__":
    main()
