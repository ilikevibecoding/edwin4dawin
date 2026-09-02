#!/usr/bin/env python3
"""Probe a full Hall payment by deleting positive-surplus incidence components.

For every negative boundary Y, form the bipartite incidence forest between Y
and N_A(Y).  Delete the component containing p and, if that component has
zero A-minus-C surplus, also one canonical positive-surplus component.  The
remaining p-free row Z has positive rank-r capacity.  This probe tests the
resulting fibre inequality on atlas forests.  It is evidence only.
"""

from __future__ import annotations

import hashlib
import json
from collections import defaultdict
from math import ceil, comb
from pathlib import Path

import networkx as nx

from verify_pointed_hall_delta2_payment_agent import (
    independent_sets,
    maximum_sets,
    neighbors_in,
)


def incidence_components(
    graph: nx.Graph,
    yset: frozenset[int],
    aset: frozenset[int],
) -> list[tuple[frozenset[int], frozenset[int]]]:
    nset = neighbors_in(graph, yset, aset)
    incidence = nx.Graph()
    incidence.add_nodes_from(("c", c) for c in yset)
    incidence.add_nodes_from(("a", a) for a in nset)
    for c in yset:
        for a in graph[c]:
            if a in aset:
                incidence.add_edge(("c", c), ("a", a))
    assert nx.is_forest(incidence)
    result = []
    for vertices in nx.connected_components(incidence):
        cpart = frozenset(v for side, v in vertices if side == "c")
        apart = frozenset(v for side, v in vertices if side == "a")
        assert cpart
        assert len(apart) >= len(cpart)
        result.append((cpart, apart))
    return result


def main() -> None:
    cases = 0
    boundary_rows = 0
    target_fibres = 0
    bad_fibres = []
    closest = None
    stream = hashlib.sha256()
    for graph0 in nx.graph_atlas_g():
        if len(graph0) == 0 or not nx.is_forest(graph0):
            continue
        graph = nx.convert_node_labels_to_integers(graph0, ordering="sorted")
        maxsets = maximum_sets(graph)
        alpha = len(maxsets[0])
        if alpha % 3 not in (0, 2):
            continue
        rank = ceil((2 * alpha - 1) / 3)
        e0 = alpha - rank + 1
        for point in graph:
            for aset in maxsets:
                if point in aset:
                    continue
                cases += 1
                cover = frozenset(graph) - aset
                fibres: dict[frozenset[int], list[dict]] = defaultdict(list)
                for yset in independent_sets(graph, cover):
                    if point not in yset:
                        continue
                    n_y = neighbors_in(graph, yset, aset)
                    if len(n_y) - len(yset) != e0:
                        continue
                    components = incidence_components(graph, yset, aset)
                    assert sum(len(a) - len(c) for c, a in components) == e0
                    p_index = next(i for i, (c, _) in enumerate(components) if point in c)
                    selected = {p_index}
                    selected_surplus = len(components[p_index][1]) - len(components[p_index][0])
                    if selected_surplus == 0:
                        positive = [
                            i
                            for i, (cpart, apart) in enumerate(components)
                            if len(apart) > len(cpart)
                        ]
                        assert positive
                        chosen = min(positive, key=lambda i: tuple(sorted(components[i][0])))
                        selected.add(chosen)
                        selected_surplus += len(components[chosen][1]) - len(components[chosen][0])
                    assert selected_surplus >= 1
                    removed_c = frozenset().union(*(components[i][0] for i in selected))
                    removed_a = frozenset().union(*(components[i][1] for i in selected))
                    zset = yset - removed_c
                    assert point not in zset
                    n_z = neighbors_in(graph, zset, aset)
                    assert n_z == n_y - removed_a
                    free = alpha - len(n_z)
                    need = rank - len(zset)
                    capacity = rank * comb(free, need)
                    assert capacity >= rank
                    fibres[zset].append(
                        {
                            "y": tuple(sorted(yset)),
                            "removed_c": tuple(sorted(removed_c)),
                            "removed_a": tuple(sorted(removed_a)),
                            "surplus": selected_surplus,
                            "capacity": capacity,
                        }
                    )
                    boundary_rows += 1
                for zset, preimages in fibres.items():
                    target_fibres += 1
                    capacity = preimages[0]["capacity"]
                    assert all(item["capacity"] == capacity for item in preimages)
                    count = len(preimages)
                    record = {
                        "order": len(graph),
                        "alpha": alpha,
                        "rank": rank,
                        "point": point,
                        "maximum_set": tuple(sorted(aset)),
                        "target_z": tuple(sorted(zset)),
                        "fibre": count,
                        "capacity": capacity,
                        "preimages": preimages,
                    }
                    if closest is None or count * closest["capacity"] > closest["fibre"] * capacity:
                        closest = record
                    if count > capacity:
                        bad_fibres.append(record)
                    stream.update(f"{record}\n".encode())
    report = {
        "status": "FAIL" if bad_fibres else "PASS_FINITE_EVIDENCE_ONLY",
        "scope": "atlas probe only; the all-order fibre inequality is open",
        "pointed_maximum_set_cases": cases,
        "boundary_rows": boundary_rows,
        "target_fibres": target_fibres,
        "bad_fibres": len(bad_fibres),
        "closest": closest,
        "first_bad": bad_fibres[0] if bad_fibres else None,
        "value_stream_sha256": stream.hexdigest().upper(),
    }
    Path("pointed_hall_incidence_component_payment_probe_agent_20260829.json").write_text(
        json.dumps(report, indent=2) + "\n", encoding="utf-8"
    )
    print(json.dumps(report, indent=2))


if __name__ == "__main__":
    main()
