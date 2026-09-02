#!/usr/bin/env python3
"""Exact pairwise coefficientwise-dominance search for distinct mark forests.

The 24 labelled distinct mark forests have fifteen exact expression classes;
the edgeless class is already frozen.  This probe compares every nonempty
target against all other nonempty classes and against the frozen edgeless seed.
A directed edge source->target is recorded only when every coefficient of
target-source is coefficientwise nonnegative.  Every rejected edge retains its
first exact negative or mixed-sign coefficient as a witness.  No class theorem
is promoted by this search alone.
"""

from __future__ import annotations

import hashlib
import json
from pathlib import Path

import sympy as sp

from explore_iso_n6_bundle_g1_singleton_ordinary_leaf_mark_only_common_forest_g1_nonadjacent import (
    coefficient_profile,
    exact_expression,
    mark_forests,
)
from explore_iso_n6_bundle_g1_singleton_ordinary_leaf_motif_ie_cutoff_g1_nonadjacent import (
    build_mode,
)
from probe_iso_n6_bundle_g1_singleton_ordinary_leaf_mark_only_common_forest_finite_g1_nonadjacent import (
    edge_label,
)


HERE = Path(__file__).resolve().parent
OUTPUT = HERE / (
    "iso_n6_bundle_g1_singleton_ordinary_leaf_distinct_mark_only_pairwise_"
    "dominance_probe_g1_nonadjacent_20260831.json"
)
MARKER = (
    "PROBE_EXACT_ISO_N6_BUNDLE_G1_SINGLETON_ORDINARY_LEAF_DISTINCT_"
    "MARK_ONLY_PAIRWISE_DOMINANCE_G1_NONADJACENT"
)
PINNED = {
    "mark_only_formula": (
        "explore_iso_n6_bundle_g1_singleton_ordinary_leaf_mark_only_common_forest_g1_nonadjacent.py",
        "DEA01339260C835DB8707D5549A624E8B0A47EEE174A82620E2AF194DBBD8BA7",
    ),
    "leaf_formula": (
        "explore_iso_n6_bundle_g1_singleton_ordinary_leaf_motif_ie_cutoff_g1_nonadjacent.py",
        "C0B8BD01DBE2B1C2D798C426B49A1F1B5DE4C4566A2B1B2C7C86068540820015",
    ),
    "class_exhaustion_source": (
        "certify_iso_n6_bundle_g1_singleton_ordinary_leaf_distinct_mark_only_expression_classes_root.py",
        "55920CD34ED9D9938DE0486121D9341C4FE30C37CE1F93181A81CEA40DF6CD67",
    ),
    "class_exhaustion_report": (
        "iso_n6_bundle_g1_singleton_ordinary_leaf_distinct_mark_only_expression_classes_exact_root_20260831.json",
        "A4E9CC944444473E378D443BCB53B0DA63337EB4654EE2D4A1593C206BC1DD2E",
    ),
}
REPRESENTATIVES = (
    "pq",
    "pu",
    "pq,pu",
    "pu,pv",
    "pq,pu,pv",
    "qu",
    "pq,qu",
    "pu,qu",
    "pv,qu",
    "pq,pv,qu",
    "pu,pv,qu",
    "qu,qv",
    "pq,qu,qv",
    "pu,qu,qv",
)
EXPECTED_EXPRESSION_SHA256 = {
    "edgeless": "24E326AF2419A66C2335938056A10DD824E582372799FBC4757AF2000BDEF5E1",
    "pq": "E25FCD2FEBA4085A452E4B0E540C61ADC3C60ACA66A2A1643467B70E6C865A6C",
    "pu": "D37D98AE001BF6EF68C6A24D2E8116EBC0D979EED02252BEB795CF36E884B62F",
    "pq,pu": "1E02282E60528CBC567D5F8C09F10F740745803C06B7A418530A195345FE008D",
    "pu,pv": "88B3DF4636B1E6171F8044E268E30CA4519DAB8D58DF463014BF1ACBE036D37C",
    "pq,pu,pv": "08D7D7D3661E866F0CBD89127826C9FD66B6CA73D5522EEC125C4ED16DB19394",
    "qu": "12F6739C612A79381E15BBF4E848BCB7F85439118155AE5536EC1C028DB2F345",
    "pq,qu": "6019EFECDB717EFC45FC01DC3C42B5D19F60AC1BD098C0A466428F7C0A11B353",
    "pu,qu": "D5621A149A98CE54A7FB08E7BAACBC0EFCDF09FEAD6ADE027F27D4B1C2B41641",
    "pv,qu": "EF72CE682AD3727145BF4BCD2A707235F1D06A43366069917876C6B474B4F6D9",
    "pq,pv,qu": "C6431991F7A341708A82A62838599AC6CDFE5BCCE4F38530A9B90CD557E3F199",
    "pu,pv,qu": "C03466DDF51C19ED7B07111B94358D2CA2F280CD4A19B246FC0CB7A1CC96CF46",
    "qu,qv": "4E004AB425DB65CD0C3C24833DDC906B96E53E3016779B18A85C979BCF01E7F7",
    "pq,qu,qv": "63DB8F457CE7C56264FFC31DF12113E3EA0C5B845D3325D1EAD0E1B2888F504A",
    "pu,qu,qv": "C615D0004D1D2BD11B11615217A604647F2972D9A51260FF36630C35F499F199",
}


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def main():
    for label, (name, expected) in PINNED.items():
        assert sha256(HERE / name) == expected, label
    all_classes = ("edgeless", *REPRESENTATIVES)
    assert set(all_classes) == set(EXPECTED_EXPRESSION_SHA256)
    n = sp.Symbol("n", integer=True, positive=True)
    N, h, t = sp.symbols("N h t", integer=True, nonnegative=True)
    base = (sp.Integer(1), N, *sp.symbols("k2:8", integer=True, nonnegative=True))
    raw = build_mode("distinct", n, t)
    wanted = set(all_classes)
    expressions = {}
    labelled_class_counts = {label: 0 for label in all_classes}
    digest_to_representative = {
        digest: label for label, digest in EXPECTED_EXPRESSION_SHA256.items()
    }
    labelled_forests = 0
    for marks, edges in mark_forests("distinct"):
        labelled_forests += 1
        label = edge_label(edges)
        expression = exact_expression(
            "distinct", raw, marks, edges, n, N, h, t, base
        )
        digest = hashlib.sha256(sp.srepr(expression).encode()).hexdigest().upper()
        representative = digest_to_representative[digest]
        labelled_class_counts[representative] += 1
        if representative in wanted and representative not in expressions:
            expressions[representative] = expression
    assert labelled_forests == 24
    assert set(expressions) == wanted
    assert sum(labelled_class_counts.values()) == 24

    k7_ceiling = sp.Rational(1, 7) * (N - 6) * base[6]
    lower = {
        label: sp.expand(expression.subs(base[7], k7_ceiling))
        for label, expression in expressions.items()
    }
    tau = sp.Symbol("tau", nonnegative=True)
    low = {
        label: sp.expand(expression.subs(
            t, sp.Rational(11, 10) * (N + h + 4) * tau
        ))
        for label, expression in lower.items()
    }
    M = sp.Symbol("M", integer=True, nonnegative=True)
    lower_n13 = {
        label: sp.expand(expression.subs(N, M + 13))
        for label, expression in lower.items()
    }
    low_n13 = {
        label: sp.expand(expression.subs(N, M + 13))
        for label, expression in low.items()
    }
    variants = {
        "raw": (expressions, base[2:], (N, h, t), "k2_through_k7"),
        "after_k7_extension_ceiling": (
            lower, base[2:7], (N, h, t), "k2_through_k6"
        ),
        "after_k7_ceiling_N13_shift": (
            lower_n13, base[2:7], (M, h, t), "k2_through_k6"
        ),
        "after_k7_ceiling_low_sibling_parameterization": (
            low, base[2:7], (N, h, tau), "k2_through_k6"
        ),
        "after_k7_ceiling_low_sibling_parameterization_N13_shift": (
            low_n13, base[2:7], (M, h, tau), "k2_through_k6"
        ),
    }
    searches = {}
    for variant, (family, polynomial_variables, coefficient_variables, power_label) in variants.items():
        dominance = []
        rejected = []
        for source in all_classes:
            for target in REPRESENTATIVES:
                if source == target:
                    continue
                difference = sp.expand(family[target] - family[source])
                profile = coefficient_profile(
                    difference, polynomial_variables, coefficient_variables
                )
                record = {
                    "source": source,
                    "target": target,
                    "terms": profile["terms"],
                    "signs": {
                        str(key): value for key, value in profile["signs"].items()
                    },
                    "difference_sha256": profile["sha256"],
                }
                if profile["signs"][-1] == 0 and profile["signs"][None] == 0:
                    dominance.append(record)
                else:
                    powers, coefficient, sign = profile["first_bad"]
                    rejected.append({
                        **record,
                        f"first_bad_{power_label}_powers": list(powers),
                        "first_bad_coefficient": coefficient,
                        "first_bad_sign": str(sign),
                    })
        assert len(dominance) + len(rejected) == 14 * 14
        searches[variant] = {
            "ordered_pair_count": 14 * 14,
            "dominance_count": len(dominance),
            "dominance": dominance,
            "rejected_count": len(rejected),
            "rejected_with_exact_first_witness": rejected,
        }

    report = {
        "marker": MARKER,
        "role": "exact dominance search only; no mark-only or rank-six G1 theorem",
        "labelled_distinct_mark_forests": labelled_forests,
        "nonempty_exact_expression_classes": 14,
        "representatives": list(REPRESENTATIVES),
        "frozen_seed_class_included_as_source": "edgeless",
        "labelled_class_counts": labelled_class_counts,
        "expression_sha256": EXPECTED_EXPRESSION_SHA256,
        "searches": searches,
        "scope_guard": (
            "Raw, common k7-ceiling, N>=13 shifted, and low-sibling-parameterized "
            "coefficientwise dominance are tested. A rejected comparison may still "
            "admit a stronger rank-six ratio-cone proof."
        ),
        "pinned_dependencies": {
            label: {"file": name, "sha256": expected}
            for label, (name, expected) in PINNED.items()
        },
        "source_sha256": sha256(Path(__file__)),
    }
    payload = (json.dumps(report, indent=2, sort_keys=True) + "\n").encode()
    OUTPUT.write_bytes(payload)
    print(json.dumps({
        "marker": MARKER,
        "dominance_counts": {
            key: value["dominance_count"] for key, value in searches.items()
        },
        "dominance": {
            key: value["dominance"] for key, value in searches.items()
        },
        "first_rejections": {
            key: value["rejected_with_exact_first_witness"][:4]
            for key, value in searches.items()
        },
    }, indent=2, sort_keys=True))
    print("SOURCE_SHA256", report["source_sha256"])
    print("REPORT_SHA256", hashlib.sha256(payload).hexdigest().upper())
    print(MARKER)


if __name__ == "__main__":
    main()
