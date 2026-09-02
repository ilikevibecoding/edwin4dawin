#!/usr/bin/env python3
"""Bounded independent audit of the exact all-root order-23 WROM census.

This does not repeat the 14,828,074-tree census.  It checks the pinned Rust
artifacts, independently translates and tests the WROM generator at small
orders, compares it with the NetworkX graph atlas, verifies the frozen n=22
boundary, establishes an explicit i128 safety bound, and reconstructs every
emitted counterexample plus the positive path-endpoint minima by generic tree
DP.
"""

from __future__ import annotations

import ast
import hashlib
import json
import math
import re
from pathlib import Path

import networkx as nx


HERE = Path(__file__).resolve().parent
REPORT = HERE / "rank8_terminal_delta03_finite_n23_independent_audit_exact_20260820.json"
PRIMARY_LOG = HERE / "rank8_terminal_delta03_finite_n23_primary_20260820.log"
PRIMARY_ERR = HERE / "rank8_terminal_delta03_finite_n23_primary_20260820.err.log"

EXPECTED_HASHES = {
    "verify_rank8_terminal_delta03_finite_n23.rs":
        "04637D9DAC26F23C0A7839C57D6BC3D7243D2A3D06240D17A5A18B84AE09788E",
    "verify_rank8_terminal_delta03_finite_n23.exe":
        "4C1EC4BFEA318F2B39910239F46B6A0E144A9AEA69D544E6FBF6745B3A7EEA79",
    "verify_rank8_terminal_delta5_finite.rs":
        "2C76D7E7C9312331F799AB252FC806056D0201BE25AFA18446B218515F2EE2D6",
    "verify_rank8_terminal_delta04_finite.rs":
        "C7A9A4E943ED8EBB1916BB7297A995FDF1AE0619EFE9FA6AA3E03DCD6F405393",
    "verify_rank8_terminal_delta04_finite.exe":
        "EC7F2402020486AE5BF06A0703F171109E60F43682FC1F48733F5918A0AC9F89",
    "rank8_terminal_delta04_finite_n22_exact_20260820.log":
        "2AE118B71081CC6B065329B9B201FD53C8BEA53B1F85192C2ADF10CF93D26CC5",
}

KNOWN_FREE_TREE_COUNTS = {
    1: 1, 2: 1, 3: 1, 4: 2, 5: 3, 6: 6, 7: 11,
    8: 23, 9: 47, 10: 106, 11: 235, 12: 551, 13: 1301,
    21: 2_144_505, 22: 5_623_756, 23: 14_828_074,
}
N22_MINIMA = [
    729_995_442_214_438_400,
    2_784_943_581_767_226_880,
    6_055_934_013_607_237_760,
    10_442_185_462_038_570_240,
    14_202_711_320_481_203_520,
]


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


# Independent literal translation of the WROM level-sequence successor.
def split_tree(layout: tuple[int, ...]) -> tuple[tuple[int, ...], tuple[int, ...]]:
    seen = False
    split = len(layout)
    for index, level in enumerate(layout):
        if level == 1:
            if seen:
                split = index
                break
            seen = True
    left = tuple(level - 1 for level in layout[1:split])
    rest = (0,) + layout[split:]
    return left, rest


def next_rooted(pre: tuple[int, ...], specified: int | None = None) -> tuple[int, ...] | None:
    if specified is None:
        p = len(pre) - 1
        while pre[p] == 1:
            p -= 1
    else:
        p = specified
    if p == 0:
        return None
    q = p - 1
    while pre[q] != pre[p] - 1:
        q -= 1
    out = list(pre)
    for index in range(p, len(out)):
        out[index] = out[index - p + q]
    return tuple(out)


def next_tree(current: tuple[int, ...]) -> tuple[int, ...] | None:
    left, rest = split_tree(current)
    left_height = max(left)
    right_height = max(rest)
    valid = (
        right_height > left_height
        or (
            right_height == left_height
            and (
                len(left) < len(rest)
                or (len(left) == len(rest) and left <= rest)
            )
        )
    )
    if valid:
        return current
    p = len(left)
    advanced = next_rooted(current, p)
    if advanced is None:
        return None
    out = list(advanced)
    if current[p] > 2:
        new_left, _ = split_tree(tuple(out))
        length = max(new_left) + 1
        start = len(out) - length
        for offset in range(length):
            out[start + offset] = offset + 1
    return tuple(out)


def generate_wrom(order: int) -> list[tuple[int, ...]]:
    if order == 1:
        return [(0,)]
    layout = tuple(range(order // 2 + 1)) + tuple(range(1, (order + 1) // 2))
    output: list[tuple[int, ...]] = []
    while layout is not None:
        layout = next_tree(layout)
        if layout is None:
            break
        valid = layout
        output.append(valid)
        layout = next_rooted(valid)
    return output


def adjacency_from_layout(layout: tuple[int, ...] | list[int]) -> list[list[int]]:
    adjacency = [[] for _ in layout]
    stack: list[int] = []
    for vertex, level in enumerate(layout):
        if stack:
            parent = stack[-1]
            while layout[parent] >= level:
                stack.pop()
                parent = stack[-1]
            adjacency[vertex].append(parent)
            adjacency[parent].append(vertex)
        stack.append(vertex)
    return adjacency


def nx_graph(adjacency: list[list[int]]) -> nx.Graph:
    graph = nx.Graph()
    graph.add_nodes_from(range(len(adjacency)))
    graph.add_edges_from((u, v) for u, row in enumerate(adjacency) for v in row if u < v)
    return graph


def small_generator_audit() -> dict:
    counts = {}
    for order in range(1, 14):
        layouts = generate_wrom(order)
        counts[str(order)] = len(layouts)
        assert len(layouts) == KNOWN_FREE_TREE_COUNTS[order]
        assert len(set(layouts)) == len(layouts)
        for layout in layouts:
            graph = nx_graph(adjacency_from_layout(layout))
            assert nx.is_tree(graph)

    atlas_counts = {}
    atlas = nx.graph_atlas_g()
    for order in range(1, 8):
        atlas_trees = [
            graph for graph in atlas
            if graph.number_of_nodes() == order and nx.is_tree(graph)
        ]
        generated = [nx_graph(adjacency_from_layout(layout)) for layout in generate_wrom(order)]
        assert len(atlas_trees) == len(generated) == KNOWN_FREE_TREE_COUNTS[order]
        unmatched = list(atlas_trees)
        for graph in generated:
            hits = [index for index, candidate in enumerate(unmatched) if nx.is_isomorphic(graph, candidate)]
            assert len(hits) == 1
            unmatched.pop(hits[0])
        assert not unmatched
        atlas_counts[str(order)] = len(generated)
    return {"known_sequence_through_13": counts, "graph_atlas_through_7": atlas_counts}


MAX_DEGREE = 9


def poly_add(left: list[int], right: list[int]) -> list[int]:
    return [left[index] + right[index] for index in range(MAX_DEGREE + 1)]


def poly_mul(left: list[int], right: list[int]) -> list[int]:
    out = [0] * (MAX_DEGREE + 1)
    for i in range(MAX_DEGREE + 1):
        for j in range(MAX_DEGREE + 1 - i):
            out[i + j] += left[i] * right[j]
    return out


def forest_poly(adjacency: list[list[int]], removed: set[int] | frozenset[int] = frozenset()) -> list[int]:
    removed = frozenset(removed)
    seen = set(removed)

    def visit(vertex: int, parent: int) -> tuple[list[int], list[int]]:
        seen.add(vertex)
        excluded = [1] + [0] * MAX_DEGREE
        included = [0, 1] + [0] * (MAX_DEGREE - 1)
        for child in adjacency[vertex]:
            if child == parent or child in removed:
                continue
            child_excluded, child_included = visit(child, vertex)
            excluded = poly_mul(excluded, poly_add(child_excluded, child_included))
            included = poly_mul(included, child_excluded)
        return excluded, included

    result = [1] + [0] * MAX_DEGREE
    for vertex in range(len(adjacency)):
        if vertex in seen:
            continue
        excluded, included = visit(vertex, -1)
        result = poly_mul(result, poly_add(excluded, included))
    return result


def smooth(coefficients: list[int], rank: int, t: int) -> int:
    return sum(math.comb(t, j) * coefficients[rank - j] for j in range(min(rank, t) + 1))


def residual(core: list[int], deleted: list[int], t: int) -> int:
    p7 = smooth(core, 7, t) + deleted[6]
    p8 = smooth(core, 8, t) + deleted[7]
    p9_open = sum(math.comb(t, j) * core[9 - j] for j in range(1, min(9, t) + 1))
    return (
        8 * core[7] * deleted[6] * (16 * p8 * p8 - p7 * p8 - 18 * p7 * p9_open)
        - 8 * deleted[6] * p7 * (16 * core[8] * core[8] - core[7] * core[8])
        - 9 * core[7] * p7 * (14 * deleted[7] * deleted[7] - deleted[6] * deleted[7])
    )


def deltas03(adjacency: list[list[int]], root: int) -> list[int]:
    core = forest_poly(adjacency)
    deleted = forest_poly(adjacency, {root})
    values = [residual(core, deleted, t) for t in range(1, 5)]
    output = [values[0]]
    for _ in range(3):
        values = [right - left for left, right in zip(values, values[1:])]
        output.append(values[0])
    return output


def path_minima(order: int) -> tuple[list[int], list[int]]:
    adjacency = [[] for _ in range(order)]
    for vertex in range(order - 1):
        adjacency[vertex].append(vertex + 1)
        adjacency[vertex + 1].append(vertex)
    values = [deltas03(adjacency, root) for root in range(order)]
    minima = [min(row[rank] for row in values) for rank in range(4)]
    roots = [next(root for root, row in enumerate(values) if row[rank] == minima[rank]) for rank in range(4)]
    return minima, roots


def i128_audit() -> dict:
    c7 = math.comb(23, 7)
    c8 = math.comb(23, 8)
    h6 = math.comb(22, 6)
    h7 = math.comb(22, 7)
    p7 = math.comb(27, 7) + h6
    p8 = math.comb(27, 8) + h7
    p9 = math.comb(27, 9)  # deliberately looser than the open-part bound
    term1 = 8 * c7 * h6 * (16 * p8 * p8 + p7 * p8 + 18 * p7 * p9)
    term2 = 8 * h6 * p7 * (16 * c8 * c8 + c7 * c8)
    term3 = 9 * c7 * p7 * (14 * h7 * h7 + h6 * h7)
    residual_bound = term1 + term2 + term3
    delta3_bound = 8 * residual_bound
    i128_max = 2**127 - 1
    assert delta3_bound < i128_max
    # Every DP coefficient is at most the number of independent sets of a
    # 23-vertex partial forest; its multiplication accumulators are no larger.
    assert 2**23 < i128_max
    return {
        "coefficient_bounds": {"c7": c7, "c8": c8, "h6": h6, "h7": h7},
        "derived_bounds": {"p7": p7, "p8": p8, "p9_open_loose": p9},
        "absolute_residual_bound": residual_bound,
        "absolute_delta3_bound": delta3_bound,
        "delta3_bound_bits": delta3_bound.bit_length(),
        "i128_positive_bits": 127,
        "integer_margin_floor": i128_max // delta3_bound,
    }


SUMMARY_RE = re.compile(
    r"core_n=23 trees=(\d+) roots=(\d+) active=(\d+) "
    r"minima=(\[[^\]]+\]) active_minima=(\[[^\]]+\]) "
    r"negative_counts=(\[[^\]]+\])"
)
WITNESS_RE = re.compile(
    r"(?:FIRST_NEGATIVE|MINIMUM_WITNESS) n=23 layout=(\[[^\]]+\]) "
    r"root=(\d+) delta=(\d+) value=(-?\d+)"
)


def parse_and_audit_primary() -> dict:
    stdout = PRIMARY_LOG.read_text(encoding="utf-8")
    stderr = PRIMARY_ERR.read_text(encoding="utf-8") if PRIMARY_ERR.exists() else ""
    summaries = SUMMARY_RE.findall(stdout)
    assert len(summaries) == 1, "primary log is incomplete or contains multiple summaries"
    trees_s, roots_s, active_s, minima_s, active_minima_s, negative_s = summaries[0]
    trees, roots, active = int(trees_s), int(roots_s), int(active_s)
    minima = list(ast.literal_eval(minima_s))
    active_minima = [int(value) for value in ast.literal_eval(active_minima_s)]
    negative_counts = list(ast.literal_eval(negative_s))
    assert "PASS_EXACT_RANK8_TERMINAL_DELTA0_3_CENSUS_N23" in stdout
    assert trees == KNOWN_FREE_TREE_COUNTS[23]
    assert roots == trees * 23 == 341_045_702
    assert active == roots
    assert negative_counts == [0, 0, 0, 0]
    assert active_minima == minima

    n22_path_minima, n22_path_roots = path_minima(22)
    assert n22_path_minima == N22_MINIMA[:4]
    assert n22_path_roots == [0, 0, 0, 0]
    n23_path_minima, n23_path_roots = path_minima(23)
    assert minima == n23_path_minima
    assert n23_path_roots == [0, 0, 0, 0]

    reconstructed = []
    for match in WITNESS_RE.finditer(stdout + "\n" + stderr):
        layout = list(ast.literal_eval(match.group(1)))
        root = int(match.group(2))
        rank = int(match.group(3))
        reported = int(match.group(4))
        actual = deltas03(adjacency_from_layout(layout), root)[rank]
        assert actual == reported
        reconstructed.append({
            "layout": layout, "root": root, "rank": rank,
            "reported": reported, "independent_value": actual,
        })

    return {
        "log_sha256": sha256(PRIMARY_LOG),
        "stderr_sha256": sha256(PRIMARY_ERR),
        "trees": trees,
        "roots": roots,
        "active_roots": active,
        "minima": minima,
        "active_minima": active_minima,
        "negative_counts": negative_counts,
        "path_endpoint_witness": {
            "layout": list(range(23)),
            "root": 0,
            "values": n23_path_minima,
            "matches_all_global_minima": True,
        },
        "emitted_negative_witnesses_reconstructed": reconstructed,
    }


def frozen_n22_audit() -> dict:
    text = (HERE / "rank8_terminal_delta04_finite_n22_exact_20260820.log").read_text(encoding="utf-8")
    match = re.search(
        r"core_n=22 trees=(\d+) roots=(\d+) active=(\d+) minima=(\[[^\]]+\]) .*"
        r"negative_counts=(\[[^\]]+\])",
        text,
    )
    assert match
    trees, roots, active = map(int, match.group(1, 2, 3))
    minima = list(ast.literal_eval(match.group(4)))
    negatives = list(ast.literal_eval(match.group(5)))
    assert trees == KNOWN_FREE_TREE_COUNTS[22]
    assert roots == active == trees * 22
    assert minima == N22_MINIMA
    assert negatives == [0, 0, 0, 0, 0]
    assert "PASS_EXACT_RANK8_TERMINAL_DELTA0_4_CENSUS_N22_THROUGH_N22" in text
    return {"trees": trees, "roots": roots, "active": active, "minima": minima}


def main() -> None:
    observed_hashes = {name: sha256(HERE / name) for name in EXPECTED_HASHES}
    assert observed_hashes == EXPECTED_HASHES
    source = (HERE / "verify_rank8_terminal_delta03_finite_n23.rs").read_text(encoding="utf-8")
    frozen = (HERE / "verify_rank8_terminal_delta04_finite.rs").read_text(encoding="utf-8")
    assert 'include!("verify_rank8_terminal_delta5_finite.rs");' in source
    assert 'include!("verify_rank8_terminal_delta5_finite.rs");' in frozen
    assert "let n: usize = 23;" in source
    assert "let expected: u64 = 14_828_074;" in source
    assert "for vertex in 0..n" in source
    assert "let values = deltas03(core, deleted);" in source

    report = {
        "status": "PASS_INDEPENDENT_AUDIT_EXACT_RANK8_TERMINAL_DELTA0_3_CENSUS_N23",
        "scope": {
            "core_order": 23,
            "free_trees": 14_828_074,
            "all_rooted_pairs": 341_045_702,
            "ranks": [0, 1, 2, 3],
            "claim": "finite exact order-23 census only",
        },
        "artifact_hashes": observed_hashes,
        "audit_source_sha256": sha256(Path(__file__)),
        "generator": small_generator_audit(),
        "frozen_n22": frozen_n22_audit(),
        "i128_safety": i128_audit(),
        "primary": parse_and_audit_primary(),
        "method": [
            "same hash-pinned base generator and polynomial arithmetic are included by n22 and n23 wrappers",
            "independent WROM translation reproduces the known free-tree sequence through n=13",
            "independent isomorphism matching gives a bijection with the graph atlas through n=7",
            "generic tree DP reconstructs the path-endpoint global minima and every emitted negative witness",
            "explicit binomial majorant bounds every rank-0..3 residual below i128 by over 7e11",
        ],
        "limitations": [
            "the independent audit intentionally does not repeat the full order-23 census",
            "this is a finite n=23 theorem and is not an all-order rank-eight theorem",
        ],
    }
    REPORT.write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    print(json.dumps({
        "status": report["status"],
        "report": REPORT.name,
        "report_sha256": sha256(REPORT),
        "audit_source_sha256": report["audit_source_sha256"],
        "minima": report["primary"]["minima"],
    }, indent=2))


if __name__ == "__main__":
    main()
