#!/usr/bin/env python3
"""Stress-test the closed hard Hall-boundary residue after two exact payments.

The unit model has one matched C--A pair per vertex.  An underlying forest
edge is either a directed nonmatching C--A edge or an inactive C--C edge.
Only C-subsets independent across inactive edges are admissible.  A boundary
set is closed when no outside C vertex can be added to its top Boolean-row
independent set.  This is exploratory evidence only.
"""

from __future__ import annotations

import argparse
import hashlib
import itertools
import json
import random
from math import comb
from pathlib import Path

import networkx as nx


def operative_excess(alpha: int) -> int | None:
    if alpha % 3 == 0:
        return alpha // 3 + 1
    if alpha % 3 == 2:
        return (alpha - 2) // 3 + 2
    return None


def audit_instance(
    alpha: int,
    edges: list[tuple[int, int]],
    states: tuple[int, ...],
    source_mask: int,
    points: list[int],
    tag: str,
    totals: dict,
) -> dict | None:
    excess = operative_excess(alpha)
    if excess is None or excess > alpha:
        return None
    out = [0] * alpha
    inactive = [0] * alpha
    arcs = []
    inactive_edges = []
    for (u, v), state in zip(edges, states):
        if state == 0:
            inactive[u] |= 1 << v
            inactive[v] |= 1 << u
            inactive_edges.append((u, v))
        elif state == 1:
            out[u] |= 1 << v
            arcs.append((u, v))
        else:
            out[v] |= 1 << u
            arcs.append((v, u))
    full = (1 << alpha) - 1
    capacity = excess * comb(alpha, excess)
    for point in points:
        closed = 0
        fibres: dict[int, int] = {}
        pbit = 1 << point
        subset = source_mask
        while True:
            if not subset & pbit:
                if subset == 0:
                    break
                subset = (subset - 1) & source_mask
                continue
            # Exact C--C independence restriction.
            if any(subset & (1 << u) and subset & (1 << v) for u, v in inactive_edges):
                if subset == 0:
                    break
                subset = (subset - 1) & source_mask
                continue
            boundary = 0
            active = subset
            while active:
                bit = active & -active
                boundary |= out[bit.bit_length() - 1]
                active ^= bit
            boundary &= full ^ subset
            if boundary.bit_count() != excess:
                if subset == 0:
                    break
                subset = (subset - 1) & source_mask
                continue
            top_units = subset | boundary
            extendable = False
            candidates = boundary & source_mask
            while candidates:
                bit = candidates & -candidates
                vertex = bit.bit_length() - 1
                if not (inactive[vertex] & subset) and not (out[vertex] & (full ^ top_units)):
                    extendable = True
                    break
                candidates ^= bit
            if extendable:
                if subset == 0:
                    break
                subset = (subset - 1) & source_mask
                continue
            closed += 1
            fibres[boundary] = fibres.get(boundary, 0) + 1
            if subset == 0:
                break
            subset = (subset - 1) & source_mask
        totals["pointed_cases"] += 1
        totals["closed_rows"] += closed
        totals["stream"].update(f"{alpha}|{tag}|{point}|{closed}|{capacity}|{sorted(fibres.items())}\n".encode())
        max_fibre = max(fibres.values(), default=0)
        record = {
            "alpha": alpha,
            "tag": tag,
            "point": point,
            "excess": excess,
            "closed_boundary_sets": closed,
            "empty_capacity": capacity,
            "max_fixed_boundary_fibre": max_fibre,
            "fibre_bound_e": excess,
            "matched_source_units": [i for i in range(alpha) if source_mask >> i & 1],
            "arcs": arcs,
            "inactive_edges": inactive_edges,
        }
        ratio = closed / capacity if capacity else 0
        if ratio > totals["closest_ratio"]:
            totals["closest_ratio"] = ratio
            totals["closest"] = record
        if max_fibre > totals["max_fibre"]:
            totals["max_fibre"] = max_fibre
            totals["max_fibre_record"] = record
        if closed > capacity:
            return {"kind": "closed_count", **record}
        # The stronger fixed-boundary fibre bound can fail (and is recorded),
        # but is not required for the aggregate empty-capacity target.
    return None


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--exhaustive-alpha", type=int, default=7)
    parser.add_argument("--random-max-alpha", type=int, default=20)
    parser.add_argument("--random-instances", type=int, default=2000)
    parser.add_argument("--seed", type=int, default=99320260831)
    args = parser.parse_args()
    totals = {
        "underlying_forests": 0,
        "state_instances": 0,
        "pointed_cases": 0,
        "closed_rows": 0,
        "closest_ratio": -1.0,
        "closest": None,
        "max_fibre": -1,
        "max_fibre_record": None,
        "stream": hashlib.sha256(),
    }
    failure = None
    atlas = [
        nx.convert_node_labels_to_integers(g, ordering="sorted")
        for g in nx.graph_atlas_g()
        if 0 < len(g) <= args.exhaustive_alpha and nx.is_forest(g)
    ]
    for index, graph in enumerate(atlas):
        alpha = len(graph)
        if operative_excess(alpha) is None:
            continue
        totals["underlying_forests"] += 1
        edges = sorted(tuple(sorted(edge)) for edge in graph.edges())
        for source_mask in range(1, 1 << alpha):
            # A-only units form an independent set in the contracted forest;
            # every unit edge must have at least one matched C source.
            if any(not (source_mask >> u & 1) and not (source_mask >> v & 1) for u, v in edges):
                continue
            flexible = [
                edge_index
                for edge_index, (u, v) in enumerate(edges)
                if source_mask >> u & 1 and source_mask >> v & 1
            ]
            for state_index, choices in enumerate(itertools.product(range(3), repeat=len(flexible))):
                choice_at = dict(zip(flexible, choices))
                states_list = []
                for edge_index, (u, v) in enumerate(edges):
                    if edge_index in choice_at:
                        states_list.append(choice_at[edge_index])
                    elif source_mask >> u & 1:
                        states_list.append(1)
                    else:
                        assert source_mask >> v & 1
                        states_list.append(2)
                states = tuple(states_list)
                totals["state_instances"] += 1
                points = [i for i in range(alpha) if source_mask >> i & 1]
                failure = audit_instance(
                    alpha,
                    edges,
                    states,
                    source_mask,
                    points,
                    f"atlas{index}:m{source_mask}:s{state_index}",
                    totals,
                )
                if failure:
                    break
            if failure:
                break
        if failure:
            break

    rng = random.Random(args.seed)
    random_done = 0
    if failure is None:
        eligible = [n for n in range(2, args.random_max_alpha + 1) if operative_excess(n)]
        for sample in range(args.random_instances):
            alpha = rng.choice(eligible)
            graph = nx.random_labeled_tree(alpha, seed=rng.randrange(1 << 30))
            for edge in list(graph.edges()):
                if rng.random() < 0.2:
                    graph.remove_edge(*edge)
            edges = sorted(tuple(sorted(edge)) for edge in graph.edges())
            # Choose an independent A-only set, so its complement is the
            # matched-source cover of every unit edge.
            nonsource = 0
            for vertex in rng.sample(range(alpha), alpha):
                if all(not (nonsource >> neighbor & 1) for neighbor in graph[vertex]):
                    if rng.random() < 0.35:
                        nonsource |= 1 << vertex
            source_mask = ((1 << alpha) - 1) ^ nonsource
            if source_mask == 0:
                chosen_source = rng.randrange(alpha)
                source_mask |= 1 << chosen_source
                nonsource &= ~(1 << chosen_source)
            states_list = []
            for u, v in edges:
                if source_mask >> u & 1 and source_mask >> v & 1:
                    states_list.append(rng.randrange(3))
                elif source_mask >> u & 1:
                    states_list.append(1)
                else:
                    states_list.append(2)
            states = tuple(states_list)
            sources = [i for i in range(alpha) if source_mask >> i & 1]
            point = rng.choice(sources)
            failure = audit_instance(
                alpha, edges, states, source_mask, [point], f"random{sample}", totals
            )
            random_done += 1
            if failure:
                break

    report = {
        "status": "FAIL" if failure else "PASS_FINITE_EVIDENCE_ONLY",
        "scope": "finite/random matched-unit evidence only; no theorem claim",
        "exhaustive_alpha": args.exhaustive_alpha,
        "underlying_forests": totals["underlying_forests"],
        "state_instances": totals["state_instances"],
        "pointed_cases": totals["pointed_cases"],
        "closed_rows": totals["closed_rows"],
        "random_instances": random_done,
        "closest": totals["closest"],
        "max_fibre_record": totals["max_fibre_record"],
        "failure": failure,
        "value_stream_sha256": totals["stream"].hexdigest().upper(),
    }
    Path("pointed_hall_closed_boundary_probe_agent_20260829.json").write_text(
        json.dumps(report, indent=2) + "\n", encoding="utf-8"
    )
    print(json.dumps(report, indent=2))


if __name__ == "__main__":
    main()
