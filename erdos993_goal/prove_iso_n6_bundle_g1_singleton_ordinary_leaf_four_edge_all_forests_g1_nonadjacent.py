#!/usr/bin/env python3
"""Exact topology-exhaustive all-order theorem for four-edge forest cores."""

from __future__ import annotations

import hashlib
import itertools
import json
from pathlib import Path

import sympy as sp

from census_iso_n6_bundle_g1_ordinary_leaf_recursive_g2_residual_small_g1_nonadjacent import (
    build_expressions,
    symbolic_rows,
)
from derive_iso_n4_bundle_polynomial_root import isolate_multiply
from explore_iso_n6_bundle_g1_singleton_ordinary_leaf_four_edge_core_g1_nonadjacent import (
    EXPECTED_AUTOMORPHISMS,
    TOPOLOGIES,
    topology_orbits,
)
from prove_iso_n6_bundle_g1_singleton_ordinary_leaf_one_edge_core_g1_nonadjacent import (
    replace_rows,
    structural,
)
from prove_iso_n6_bundle_g1_singleton_ordinary_leaf_two_edge_core_g1_nonadjacent import (
    expression_sha256,
    graph_row_rules,
)


HERE = Path(__file__).resolve().parent
OUTPUT = HERE / (
    "iso_n6_bundle_g1_singleton_ordinary_leaf_four_edge_all_forests_exact_"
    "g1_nonadjacent_20260831.json"
)
MARKER = (
    "PASS_EXACT_ISO_N6_BUNDLE_G1_SINGLETON_ORDINARY_LEAF_FOUR_EDGE_"
    "ALL_FORESTS_G1_NONADJACENT"
)
PINNED = {
    "leaf_expression_source": (
        "census_iso_n6_bundle_g1_ordinary_leaf_recursive_g2_residual_small_g1_nonadjacent.py",
        "2474323FFAB6D3FBFAC99926E298C698F4C93398D5E0FC7467F18E97F8363126",
    ),
    "binomial_algebra_source": (
        "derive_iso_n4_bundle_polynomial_root.py",
        "F312FB481C76129380823CFC5E1FA6BB2B7D794846136A14477FCC9245D8870E",
    ),
    "row_substitution_source": (
        "prove_iso_n6_bundle_g1_singleton_ordinary_leaf_one_edge_core_g1_nonadjacent.py",
        "B7BA81669DF44F9ABAAD6DB5F38125F15039F28D040A87AADDB94871BA863724",
    ),
    "forest_row_source": (
        "prove_iso_n6_bundle_g1_singleton_ordinary_leaf_two_edge_core_g1_nonadjacent.py",
        "B36AB352389650652E85A3FED00B369E12615D83DB3DFA16D475A16E102D5B3E",
    ),
    "four_edge_orbit_source": (
        "explore_iso_n6_bundle_g1_singleton_ordinary_leaf_four_edge_core_g1_nonadjacent.py",
        "DAE91426E5905A707141ECAE18FDD8FF25F32D53D2C7ED5D5D0E5BFBDDDA8FBE",
    ),
}
EXPECTED = {
    "collision": {
        "matching4": (8, "90F5D6E3361F172135B9238E8E7A5D70AB7EBCCEB80CBE628021AE9F3E87CE17", "98C76D990C48E304EA3B921E13182523C48132EA00C75EB1E9190F29E94F1BED"),
        "wedge_plus_matching2": (32, "BF76409F8BE1906DEFE18724271841BD79884BF50AE6A2BD6209F23250DC08F4", "CCBEC09823682E3E361ACA285E619764BAE4CF698CB3C12D5C5ACC106D513180"),
        "wedge2": (25, "A36D9944B88901BDF0B3717FFFCAE8C5C8EB0EE9A5812ECEFE4453F5FD678905", "B703062D82905BF97B9BC8D4BABBB78E820B726210F5272920C09554AA8F9DEC"),
        "path4_plus_edge": (35, "57CA12AA250DD3CEC2832E191E685582181315A2E66ABF42573B078FCBEDD294", "B5A61D644C19945286DD037CB6CC53A73FEE35F68919D7354496270372E26912"),
        "star3_plus_edge": (26, "CDAAFADC45B5B662D7175BBCF604F460716445A01568669D8E879F0D22BF0EC8", "B17283831109C49B689CAF4E0251E7B1B4BC0370624DB46DE4DAC35FAFEA77A7"),
        "path5": (31, "76EC4FF79FB57EBC6C618CCF1A6F16FD48822C5D6EAFA0EA4716634E25BFB950", "23E966157B72ADB9306041DC0A4FF3B3A91E803C0274E78B9D01B858BB632A6C"),
        "star4": (11, "B84510D6606BC8EF144BA45F1755F862C06169DD24278DA859BB8B53C8067AA0", "13C181AC996110D7AA1BD649FCDD84B69098130D0D70447B363D515B004EF0CF"),
        "fork4": (37, "5E3461F974960BBA30491C24F21136F812E5F6CF07AFAAD0BACCDE158E09C951", "567C0DE1558F7181B4F363F669E37FB95DBB6A0B7F1763AB09969053D845414B"),
    },
    "distinct": {
        "matching4": (24, "7E075EEBD41FEE14D1E288A662ED5AAE7EC0462B63D0B39697DDF8777838B426", "661CC99F6C888DCD20A9784B4DF7331EB354866402C0A80756E31074B07D3D22"),
        "wedge_plus_matching2": (125, "AB9840ACCE7102E630D993415C0DBF57F7C8D8C872C0D5BFA7F525F3FC98C1FF", "1CEA263BB13C444EE59C7211B897471D31772B49DDE2F5D7A3153FD6F0C2C0EF"),
        "wedge2": (93, "8E0482581E0AA16F76A6E788775404688CCB5665E7080D94B99CAE2930B12960", "0BC37903FC612F472E081C838F9813E175B39BBF95EEB5FECAA4B84BE4491FBF"),
        "path4_plus_edge": (144, "59FC0B2BD80D5F241B4B5F063F953C6CB8FFC004BCE8543BD5B39E2AB87DD1DC", "2DCB408A60D91B9F3DE9DF0E67C091EF6163E80F972282157838EDC60426515D"),
        "star3_plus_edge": (89, "C8A4EE9EB1F628556A18781CACDA42DD210A1B76EDEC731006BF40E73935A064", "ECCE7A828A2B6B0B0F6F3E6D48DD8F7CBBDA4AA0192208D0B7A7ECB4AFC6C3D1"),
        "path5": (112, "DC928415898D6C00056BB00C0CA934AC0C235AD873B7EBAA369F37E0AB02271B", "F3596CB53B59E445CCD7235DA121CD8FF0D86E3E5FAF0EA91978FBEC08AEBFC4"),
        "star4": (28, "C7FEB6B9E43FD9663F8558FF1BE84133EFFAC0361577E4358DF361889784B302", "06F0507C59DA876CB72495AACAACB9CCF9C6CCDD5A47DCBC5701E94927E626F1"),
        "fork4": (132, "5377715A3BC8A33E2074B40CF3831CAB47C99C7EF31928A38EF7ADD15FFC3083", "05F561D6B6AC674A6D7EBAB3CA95C2E148D25409B07F31ECAE47AA221E9E83FE"),
    },
}
EXPECTED_TOPOLOGY_EXHAUSTION_SHA256 = (
    "31E0D3CD53358CF8626F9660C27752C3E7C4F5A737BADB7EE88BF86354418DD9"
)


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def prufer_tree(vertex_count: int, sequence: tuple[int, ...]):
    degree = [1] * vertex_count
    for vertex in sequence:
        degree[vertex] += 1
    edges = []
    for vertex in sequence:
        leaf = min(index for index, value in enumerate(degree) if value == 1)
        edges.append(tuple(sorted((leaf, vertex))))
        degree[leaf] -= 1
        degree[vertex] -= 1
    leaves = [index for index, value in enumerate(degree) if value == 1]
    edges.append(tuple(sorted(leaves)))
    return tuple(sorted(edges))


def canonical_tree(edges):
    vertices = tuple(sorted({vertex for edge in edges for vertex in edge}))
    relabelled = {vertex: index for index, vertex in enumerate(vertices)}
    raw = tuple(tuple(sorted((relabelled[a], relabelled[b]))) for a, b in edges)
    return min(
        tuple(sorted(tuple(sorted((permutation[a], permutation[b]))) for a, b in raw))
        for permutation in itertools.permutations(range(len(vertices)))
    )


def unlabeled_trees(vertex_count: int):
    return tuple(sorted({
        canonical_tree(prufer_tree(vertex_count, sequence))
        for sequence in itertools.product(range(vertex_count), repeat=vertex_count - 2)
    }))


def integer_partitions(total: int, maximum: int | None = None):
    maximum = total if maximum is None else min(maximum, total)
    if total == 0:
        yield ()
        return
    for first in range(maximum, 0, -1):
        for tail in integer_partitions(total - first, first):
            yield (first,) + tail


def component_signature(vertex_count, edges):
    adjacency = {vertex: set() for vertex in range(vertex_count)}
    for left, right in edges:
        adjacency[left].add(right)
        adjacency[right].add(left)
    components = []
    unseen = set(adjacency)
    while unseen:
        root = min(unseen)
        stack = [root]
        vertices = set()
        while stack:
            vertex = stack.pop()
            if vertex in vertices:
                continue
            vertices.add(vertex)
            unseen.discard(vertex)
            stack.extend(adjacency[vertex] - vertices)
        component_edges = tuple(
            edge for edge in edges if edge[0] in vertices and edge[1] in vertices
        )
        assert component_edges
        components.append(canonical_tree(component_edges))
    return tuple(sorted(components))


def topology_exhaustion():
    trees = {
        edge_count: unlabeled_trees(edge_count + 1)
        for edge_count in range(1, 5)
    }
    assert {key: len(value) for key, value in trees.items()} == {1: 1, 2: 1, 3: 2, 4: 3}
    derived = set()
    for partition in integer_partitions(4):
        for choices in itertools.product(*(trees[edge_count] for edge_count in partition)):
            derived.add(tuple(sorted(choices)))
    named = {
        name: component_signature(vertex_count, edges)
        for name, (vertex_count, edges) in TOPOLOGIES.items()
    }
    assert len(derived) == 8
    assert len(set(named.values())) == 8
    assert derived == set(named.values())
    payload = {
        "integer_partitions": [list(value) for value in integer_partitions(4)],
        "unlabeled_tree_counts_by_edges": {str(key): len(value) for key, value in trees.items()},
        "named_signatures": {
            name: [[list(edge) for edge in component] for component in signature]
            for name, signature in sorted(named.items())
        },
    }
    digest = hashlib.sha256(json.dumps(
        payload, separators=(",", ":"), sort_keys=True
    ).encode()).hexdigest().upper()
    return payload, digest


def main():
    for _label, (name, expected) in PINNED.items():
        assert sha256(HERE / name) == expected

    topology_payload, topology_digest = topology_exhaustion()
    assert topology_digest == EXPECTED_TOPOLOGY_EXHAUSTION_SHA256

    n = sp.Symbol("n", integer=True, positive=True)
    t = sp.Symbol("t", integer=True, nonnegative=True)
    h = sp.Symbol("h", nonnegative=True)
    components = build_expressions()
    complete = sp.expand(sum(components[label] for label in (
        "g2", "F", "QHL", "QHJ", "QKJ", "T"
    )))
    rrows, srows, xrows, yrows = (symbolic_rows(prefix) for prefix in "RSXY")
    expressions = {
        "collision": replace_rows(
            complete,
            H=isolate_multiply(rrows, t, 7), K=srows,
            J=isolate_multiply(srows, t, 7), L=srows,
        ).subs(structural(rrows, n) | structural(srows, n - 1)),
        "distinct": replace_rows(
            complete,
            H=isolate_multiply(rrows, t, 7), K=srows,
            J=isolate_multiply(xrows, t, 7), L=yrows,
        ).subs(
            structural(rrows, n) | structural(srows, n - 1)
            | structural(xrows, n - 1) | structural(yrows, n - 2)
        ),
    }

    certificates = {}
    total_orbits = 0
    for mode in ("collision", "distinct"):
        assert set(EXPECTED[mode]) == set(TOPOLOGIES)
        mode_records = {}
        distinguished_count = 3 if mode == "collision" else 4
        for topology, (vertex_count, _edges) in TOPOLOGIES.items():
            graphs = topology_orbits(mode, topology)
            expected_count, expected_orbit_hash, expected_record_hash = EXPECTED[mode][topology]
            assert len(graphs) == expected_count
            orbit_hash = hashlib.sha256(json.dumps(
                [[list(edge) for edge in graph] for graph in graphs],
                separators=(",", ":"), sort_keys=True,
            ).encode()).hexdigest().upper()
            assert orbit_hash == expected_orbit_hash
            records = []
            for index, graph in enumerate(graphs):
                rules = graph_row_rules(rrows, n, set(), graph)
                rules |= graph_row_rules(
                    srows, n - 1,
                    {"p" if mode == "collision" else "q"}, graph,
                )
                if mode == "distinct":
                    rules |= graph_row_rules(xrows, n - 1, {"p"}, graph)
                    rules |= graph_row_rules(yrows, n - 2, {"p", "q"}, graph)
                value = sp.expand(expressions[mode].xreplace(rules))
                anonymous_count = len({
                    vertex for edge in graph for vertex in edge
                    if vertex in tuple("abcdefgh")
                })
                assert anonymous_count == vertex_count - len({
                    vertex for edge in graph for vertex in edge
                    if vertex in ("p", "q", "u", "v")
                })
                first = distinguished_count + anonymous_count
                shifted = sp.expand(value.subs(n, first + h))
                polynomial = sp.Poly(shifted, h, t)
                coefficients = polynomial.coeffs()
                assert all(coefficient >= 0 for coefficient in coefficients)
                assert min(coefficients) == sp.Rational(17, 120)
                records.append({
                    "index": index,
                    "edges": [list(edge) for edge in graph],
                    "first": first,
                    "terms": len(polynomial.terms()),
                    "negative": 0,
                    "minimum": "17/120",
                    "raw_sha256": expression_sha256(value),
                    "shifted_sha256": expression_sha256(shifted),
                })
            record_hash = hashlib.sha256(json.dumps(
                {topology: records}, separators=(",", ":"), sort_keys=True
            ).encode()).hexdigest().upper()
            assert record_hash == expected_record_hash
            mode_records[topology] = {
                "orbits": len(records),
                "orbit_sha256": orbit_hash,
                "record_sha256": record_hash,
                "records": records,
            }
            total_orbits += len(records)
        certificates[mode] = mode_records
    assert total_orbits == 952

    report = {
        "marker": MARKER,
        "rank": 6,
        "coefficient": "g1",
        "canonical_mode": "singleton_ordinary ordinary-leaf reduction",
        "scope": (
            "every four-edge post-support forest core; every t>=0; both p=q "
            "and p!=q; all marked-vertex placements up to exact isomorphism"
        ),
        "topology_exhaustion": {
            **topology_payload,
            "sha256": topology_digest,
            "unlabeled_four_edge_forests": 8,
            "method": "all Prufer trees through five vertices crossed over every integer partition of four edges",
        },
        "orbit_counts": {
            mode: {
                **{name: EXPECTED[mode][name][0] for name in TOPOLOGIES},
                "total": sum(EXPECTED[mode][name][0] for name in TOPOLOGIES),
            }
            for mode in ("collision", "distinct")
        } | {"grand_total": total_orbits},
        "certificates": certificates,
        "checks": {
            "all_eight_unlabeled_topologies_exhausted": True,
            "all_952_marked_orbits_hash_locked": True,
            "all_952_shifted_polynomials_nonnegative": True,
            "all_minimum_coefficients_equal_17_over_120": True,
        },
        "theorem": (
            "The complete singleton-ordinary rank-six g1 leaf increment is "
            "nonnegative for every sibling count and every four-edge forest "
            "core, for every placement of the marks and p,q."
        ),
        "remaining_obligation": (
            "cores with at least five edges in 10t<11n; a universal dense-core "
            "forest-statistic/cutoff theorem is required"
        ),
        "scope_guard": (
            "This proves the entire four-edge layer but not the universal leaf "
            "lemma, rank-six g1, N6, or Problem 993."
        ),
        "pinned_dependencies": {
            label: {"file": name, "sha256": expected}
            for label, (name, expected) in PINNED.items()
        },
        "source_sha256": sha256(Path(__file__)),
    }
    raw = json.dumps(report, indent=2, sort_keys=True) + "\n"
    OUTPUT.write_text(raw, encoding="utf-8", newline="\n")
    print(json.dumps({
        "marker": MARKER,
        "orbit_counts": report["orbit_counts"],
        "checks": report["checks"],
        "remaining_obligation": report["remaining_obligation"],
    }, indent=2, sort_keys=True))
    print("SOURCE_SHA256", report["source_sha256"])
    print("REPORT_SHA256", hashlib.sha256(raw.encode()).hexdigest().upper())
    print(MARKER)


if __name__ == "__main__":
    main()
