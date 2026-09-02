#!/usr/bin/env python3
"""Fail-closed generic exact shard producer for one six-edge forest core."""

from __future__ import annotations

import argparse
import hashlib
import json
from pathlib import Path

import networkx as nx
import sympy as sp

from probe_iso_n7_bundle_g3_sum0_dense_extension_threshold_rank7_g5_finish import choose_poly
from prove_iso_n7_bundle_g3_adjacent_no_parent_ge6_one_edge_all_distributions_rank7_g5_finish import bernstein_tail_certificate
from prove_iso_n7_bundle_g3_adjacent_no_parent_ge6_three_edges_all_distributions_rank7_g5_finish import independent_counts, rooted_patterns


HERE = Path(__file__).resolve().parent
OUTPUT_TEMPLATE = (
    "iso_n7_bundle_g3_adjacent_no_parent_ge6_six_edges_core{core_index}_"
    "exact_rank7_g5_finish_20260831.json"
)
FAILURE_OUTPUT_TEMPLATE = (
    "iso_n7_bundle_g3_adjacent_no_parent_ge6_six_edges_core{core_index}_"
    "first_exact_negative_rank7_g5_finish_20260831.json"
)
MARKER = (
    "PASS_EXACT_ISO_N7_BUNDLE_G3_ADJACENT_NO_PARENT_GE6_"
    "SIX_EDGES_CORE_SHARD_RANK7_G5_FINISH"
)
FAILURE_MARKER = (
    "FOUND_EXACT_NEGATIVE_ISO_N7_BUNDLE_G3_ADJACENT_NO_PARENT_GE6_"
    "SIX_EDGES_CORE_SHARD_RANK7_G5_FINISH"
)
IDENTITY_SOURCE = HERE / (
    "derive_iso_n7_bundle_g3_adjacent_no_parent_"
    "general_attachment_losses_rank7_g5_finish.py"
)
IDENTITY_REPORT = HERE / (
    "iso_n7_bundle_g3_adjacent_no_parent_general_attachment_"
    "losses_exact_rank7_g5_finish_20260831.json"
)
CLASSIFIER_SOURCE = HERE / (
    "derive_iso_n7_bundle_g3_adjacent_no_parent_"
    "six_edge_core_classifier_exact_rank7_g5_finish.py"
)
CLASSIFIER_REPORT = HERE / (
    "iso_n7_bundle_g3_adjacent_no_parent_six_edge_core_"
    "classifier_exact_rank7_g5_finish_20260831.json"
)
CENSUS_SOURCE = HERE / (
    "derive_iso_n7_bundle_g3_adjacent_no_parent_"
    "six_edge_rooted_pattern_census_exact_rank7_g5_finish.py"
)
CENSUS_REPORT = HERE / (
    "iso_n7_bundle_g3_adjacent_no_parent_six_edge_rooted_pattern_"
    "census_exact_rank7_g5_finish_20260831.json"
)
DENSE_SOURCE = HERE / (
    "probe_iso_n7_bundle_g3_sum0_dense_extension_threshold_rank7_g5_finish.py"
)
ONE_EDGE_SOURCE = HERE / (
    "prove_iso_n7_bundle_g3_adjacent_no_parent_ge6_"
    "one_edge_all_distributions_rank7_g5_finish.py"
)
THREE_EDGE_SOURCE = HERE / (
    "prove_iso_n7_bundle_g3_adjacent_no_parent_ge6_"
    "three_edges_all_distributions_rank7_g5_finish.py"
)
EXPECTED = {
    IDENTITY_SOURCE.name: (
        "441AE5CB4936CB8F84AC0B064D07338AAAF708435A5F5032AB8A8820F667688A"
    ),
    IDENTITY_REPORT.name: (
        "CB3E129A9F2E6EBF6F5AF6D70B917147121041505A312628A39BB4960C79F699"
    ),
    CLASSIFIER_SOURCE.name: (
        "936DD8D10D1926E648EEEE9D736F9102EFA7F60B0F3D84DFDB04ACAC454018DE"
    ),
    CLASSIFIER_REPORT.name: (
        "21CF5ACEA04E0905230EA4B15A790E0B6775911EF7A038E68CF7893DABD23FD7"
    ),
    CENSUS_SOURCE.name: (
        "9D96F2AF7016ED693F02F7917A7AEEEA403E2720D2AF8BCD0A88D53F347A2BC8"
    ),
    CENSUS_REPORT.name: (
        "17A8FF817F1C8F612D66FD1C3962777EA0EAE604C91BED1A990A71FC7617108C"
    ),
    DENSE_SOURCE.name: (
        "3C775701FE66FEAAE27FE56F794A6BAED75BF3FB1F0253127A732F255AA03F11"
    ),
    ONE_EDGE_SOURCE.name: (
        "1DF08223EBECCBA9E5056BD52604D1342763E313D111CEF63568D4B285D6149E"
    ),
    THREE_EDGE_SOURCE.name: (
        "D0BAF4FC3BE88662DABB30D0759759FB07EF70749642D847ADC340C57407EBD3"
    ),
}


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def convolved_row(core_rows, isolates, rank):
    return sp.expand(
        sum(
            core_rows[index] * choose_poly(isolates, rank - index)
            for index in range(min(rank, len(core_rows) - 1) + 1)
        )
    )


def ordered_pattern_hash(patterns) -> str:
    stream = []
    for signature, witness in sorted(patterns.items(), key=lambda item: str(item[0])):
        x_count, y_count, x_rows, y_rows = signature
        stream.append(
            {
                "x_count": x_count,
                "y_count": y_count,
                "x_deleted_independent_rows": x_rows,
                "y_deleted_independent_rows": y_rows,
                "equivalent_raw_patterns": witness["equivalent_raw_patterns"],
            }
        )
    raw = json.dumps(stream, separators=(",", ":"), sort_keys=True).encode()
    return hashlib.sha256(raw).hexdigest().upper()


def write_failure(
    args,
    core,
    census_core,
    pattern_index,
    signature,
    witness,
    certificate,
    parameterization,
) -> None:
    output = HERE / FAILURE_OUTPUT_TEMPLATE.format(core_index=args.core_index)
    failure = {
        "marker": FAILURE_MARKER,
        "status": "exact negative found; positivity shard rejected",
        "core_index": args.core_index,
        "core_order": core["order"],
        "component_edge_partition": core["component_edge_partition"],
        "representative_edges": core["representative_edges"],
        "root_pattern_classifier": {
            "raw_patterns": census_core["raw_root_patterns"],
            "deduplicated_patterns": census_core[
                "deduplicated_deleted_row_patterns"
            ],
        },
        "first_negative_pattern_index": pattern_index,
        "first_negative_signature": str(signature),
        "root_pattern": witness,
        "parameterization": parameterization,
        "certificate": certificate,
        "dependencies_sha256": EXPECTED,
        "scope_guard": (
            "This rejects this exact six-edge core positivity shard only; it "
            "does not assert a graph counterexample without a feasible integer "
            "specialization of the negative tail coordinate."
        ),
        "source_sha256": sha256(Path(__file__)),
    }
    raw = json.dumps(failure, indent=2, sort_keys=True) + "\n"
    output.write_text(raw, encoding="utf-8", newline="\n")
    print(json.dumps(failure, indent=2, sort_keys=True))
    print("SOURCE_SHA256", failure["source_sha256"])
    print("REPORT_SHA256", hashlib.sha256(raw.encode()).hexdigest().upper())
    print(FAILURE_MARKER)


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--core-index", type=int, choices=range(34), required=True)
    args = parser.parse_args()
    paths = {
        path.name: path
        for path in (
            IDENTITY_SOURCE,
            IDENTITY_REPORT,
            CLASSIFIER_SOURCE,
            CLASSIFIER_REPORT,
            CENSUS_SOURCE,
            CENSUS_REPORT,
            DENSE_SOURCE,
            ONE_EDGE_SOURCE,
            THREE_EDGE_SOURCE,
        )
    }
    for filename, digest in EXPECTED.items():
        assert sha256(paths[filename]) == digest, filename
    identity_report = json.loads(IDENTITY_REPORT.read_text(encoding="utf-8"))
    classifier = json.loads(CLASSIFIER_REPORT.read_text(encoding="utf-8"))
    census = json.loads(CENSUS_REPORT.read_text(encoding="utf-8"))
    assert identity_report["marker"] == (
        "DERIVED_EXACT_ISO_N7_BUNDLE_G3_ADJACENT_NO_PARENT_"
        "GENERAL_ATTACHMENT_LOSSES_RANK7_G5_FINISH"
    )
    assert classifier["coverage_gap_within_six_edge_core_classifier"] is None
    assert classifier["exact_isomorphism_class_count"] == 34
    assert census["coverage_gap_within_six_edge_rooted_pattern_census"] is None
    assert census["total_core_count"] == 34
    core = classifier["isomorphism_classes"][args.core_index]
    census_core = census["cores"][args.core_index]
    assert core["core_index"] == args.core_index == census_core["core_index"]
    assert core["representative_edges"] == census_core["representative_edges"]
    graph = nx.Graph()
    graph.add_nodes_from(range(core["order"]))
    graph.add_edges_from(tuple(tuple(edge) for edge in core["representative_edges"]))
    assert graph.number_of_edges() == 6
    assert nx.is_forest(graph)
    assert all(graph.degree(vertex) > 0 for vertex in graph)
    assert nx.number_connected_components(graph) == core["components"]
    patterns = rooted_patterns(graph)
    assert len(patterns) == census_core["deduplicated_deleted_row_patterns"]
    assert (
        sum(witness["equivalent_raw_patterns"] for witness in patterns.values())
        == census_core["raw_root_patterns"]
    )
    assert (
        ordered_pattern_hash(patterns)
        == census_core["ordered_deleted_row_signature_sha256"]
    )
    m, a, b = sp.symbols("m a b", nonnegative=True)
    W = {rank: sp.Symbol(f"W{rank}") for rank in range(2, 9)}
    P = {rank: sp.Symbol(f"P{rank}") for rank in range(2, 8)}
    Q = {rank: sp.Symbol(f"Q{rank}") for rank in range(2, 8)}
    identity = sp.expand(
        sp.sympify(
            identity_report["identity"],
            locals={
                "m": m,
                "a": a,
                "b": b,
                **{f"W{rank}": W[rank] for rank in W},
                **{f"P{rank}": P[rank] for rank in P},
                **{f"Q{rank}": Q[rank] for rank in Q},
            },
        )
    )
    root_tail, unrelated_isolates, split = sp.symbols(
        "root_tail unrelated_isolates split", nonnegative=True
    )
    roots = root_tail + 6
    core_rows = independent_counts(graph)
    certificates = {}
    for pattern_index, (signature, witness) in enumerate(
        sorted(patterns.items(), key=lambda item: str(item[0]))
    ):
        x_count, y_count, x_deleted_rows, y_deleted_rows = signature
        rooted_core_count = x_count + y_count
        b_value = y_count + (roots / 2 - y_count) * split
        a_value = roots - b_value
        base_isolates = roots - rooted_core_count + unrelated_isolates
        m_value = graph.number_of_nodes() + base_isolates
        w_rows = {
            rank: convolved_row(core_rows, base_isolates, rank) for rank in W
        }
        avoid_y_isolates = sp.expand(base_isolates - (b_value - y_count))
        avoid_x_isolates = sp.expand(base_isolates - (a_value - x_count))
        p_rows = {
            rank: w_rows[rank]
            - convolved_row(y_deleted_rows, avoid_y_isolates, rank)
            for rank in P
        }
        q_rows = {
            rank: w_rows[rank]
            - convolved_row(x_deleted_rows, avoid_x_isolates, rank)
            for rank in Q
        }
        specialized = sp.cancel(
            identity.subs(
                {
                    m: m_value,
                    a: a_value,
                    b: b_value,
                    **{W[rank]: w_rows[rank] for rank in W},
                    **{P[rank]: p_rows[rank] for rank in P},
                    **{Q[rank]: q_rows[rank] for rank in Q},
                },
                simultaneous=True,
            )
        )
        certificate = bernstein_tail_certificate(
            specialized, split, (root_tail, unrelated_isolates)
        )
        parameterization = {
            "m": str(m_value),
            "a": str(a_value),
            "b": str(b_value),
        }
        if certificate["negative_tail_scalar_coefficients"] != 0:
            write_failure(
                args,
                core,
                census_core,
                pattern_index,
                signature,
                witness,
                certificate,
                parameterization,
            )
            raise SystemExit(2)
        label = f"p{pattern_index:03d}_x{x_count}_y{y_count}"
        certificates[label] = {
            "root_pattern": witness,
            "parameterization": parameterization,
            **certificate,
        }
    output = HERE / OUTPUT_TEMPLATE.format(core_index=args.core_index)
    report = {
        "marker": MARKER,
        "status": "proved exact",
        "core_index": args.core_index,
        "core_order": core["order"],
        "component_edge_partition": core["component_edge_partition"],
        "component_type_descriptor": core["component_type_descriptor"],
        "representative_edges": core["representative_edges"],
        "degree_sequence": core["degree_sequence"],
        "components": core["components"],
        "root_pattern_classifier": {
            "raw_patterns": census_core["raw_root_patterns"],
            "deduplicated_patterns": census_core[
                "deduplicated_deleted_row_patterns"
            ],
            "ordered_deleted_row_signature_sha256": census_core[
                "ordered_deleted_row_signature_sha256"
            ],
            "deduplication_rule": (
                "Equal X/Y root counts and exact X-deleted/Y-deleted independent-"
                "row tuples only."
            ),
        },
        "certificates": certificates,
        "coverage_gap_within_stated_six_edge_core": None,
        "core_list_guard": (
            "This is one of exactly thirty-four pairwise nonisomorphic isolate-"
            "free six-edge forest cores; universal e=6 requires all thirty-four "
            "shard reports."
        ),
        "dependencies_sha256": EXPECTED,
        "scope": (
            "One fixed isolate-free six-edge core, all >=6 attachment "
            "distributions, all permissible root placements, and arbitrary "
            "unrelated isolates."
        ),
        "source_sha256": sha256(Path(__file__)),
    }
    raw = json.dumps(report, indent=2, sort_keys=True) + "\n"
    output.write_text(raw, encoding="utf-8", newline="\n")
    print(
        json.dumps(
            {
                "marker": MARKER,
                "core_index": args.core_index,
                "core_order": core["order"],
                "component_edge_partition": core["component_edge_partition"],
                "certificates": len(certificates),
                "minimum_coefficient": str(
                    min(
                        sp.Rational(value["minimum_tail_scalar_coefficient"])
                        for value in certificates.values()
                    )
                ),
                "coverage_gap_within_stated_core": None,
            },
            indent=2,
            sort_keys=True,
        )
    )
    print("SOURCE_SHA256", report["source_sha256"])
    print("REPORT_SHA256", hashlib.sha256(raw.encode()).hexdigest().upper())
    print(MARKER)


if __name__ == "__main__":
    main()
