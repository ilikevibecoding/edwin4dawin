#!/usr/bin/env python3
"""Fail-closed universal assembler for the five rank-seven g4 geometries."""

from __future__ import annotations

import hashlib
import json
from pathlib import Path


HERE = Path(__file__).resolve().parent
OUTPUT = HERE / "iso_n7_bundle_g4_universal_piecewise_assembled_exact_rank7_g4_piecewise_20260831.json"
MARKER = "PASS_EXACT_ISO_N7_BUNDLE_G4_UNIVERSAL_PIECEWISE_ASSEMBLED_RANK7_G4_PIECEWISE"

CONTAINMENT_SOURCE = HERE / "probe_iso_n7_bundle_g4_containment_elimination_rank7_terminal.py"
CONTAINMENT_REPORT = HERE / "iso_n7_bundle_g4_containment_elimination_probe_rank7_terminal_20260831.json"
CONTAINMENT_SOURCE_SHA = "5F3CB5E9D0ED0C6E804AEE556EC26A6F6341AADAA97841282A1AAEC5BA52121D"
CONTAINMENT_REPORT_SHA = "D987050A325813DDC500CCFBCE07B78C3F5744822D70FEAE8E4F643DF0628DDB"

BRANCHES = {
    "nonadjacent_common0_sum0": {
        "source": HERE / "prove_iso_n7_bundle_g4_sum0_piecewise_bernstein_rank7_g4_piecewise.py",
        "source_sha": "24E9538B8DA863D884BA2522E6D10316181F21206BE53A5C472D80C9DCE62FB5",
        "report": HERE / "iso_n7_bundle_g4_sum0_piecewise_bernstein_exact_rank7_g4_piecewise_20260831.json",
        "report_sha": "E602040E714BF069F56DFB6C2BE94728595B087C530FF77371777662550E99C1",
        "marker": "PASS_EXACT_ISO_N7_BUNDLE_G4_SUM0_PIECEWISE_BERNSTEIN_RANK7_G4_PIECEWISE",
        "certificate_kind": "specialized_two_endpoint_piecewise_cover",
    },
    "nonadjacent_common0_sum1": {
        "source": HERE / "prove_iso_n7_bundle_g4_sum1_coupled_moment_bernstein_rank7_g4_piecewise.py",
        "source_sha": "501E9E7F12781A5A3B2F821C78A8B251EC7A39EC72D47E0522AFE466AF7C136B",
        "report": HERE / "iso_n7_bundle_g4_sum1_coupled_moment_bernstein_exact_rank7_g4_piecewise_20260831.json",
        "report_sha": "7A3969BBCA7B945D72E33BB8A036F3C6747CEA960BA76CF1C51FD81A5C92844C",
        "marker": "PASS_EXACT_ISO_N7_BUNDLE_G4_SUM1_COUPLED_MOMENT_BERNSTEIN_RANK7_G4_PIECEWISE",
        "certificate_kind": "specialized_two_endpoint_piecewise_cover",
    },
    "nonadjacent_common0_sum_ge2": {
        "source": HERE / "prove_iso_n7_bundle_g4_sumge2_triple134_piecewise_bernstein_rank7_g4_piecewise.py",
        "source_sha": "D43947DFE700BB0286032A874A460FCCBC5E7153D59D0F6EFA697C1D84B4E556",
        "report": HERE / "iso_n7_bundle_g4_sumge2_triple134_piecewise_bernstein_exact_rank7_g4_piecewise_20260831.json",
        "report_sha": "85BEB1062353078F388D785387F3A615B33E09F7D1ECDCCFCF464DB412DE70C1",
        "marker": "PASS_EXACT_ISO_N7_BUNDLE_G4_SUMGE2_TRIPLE134_PIECEWISE_BERNSTEIN_RANK7_G4_PIECEWISE",
        "certificate_kind": "four_incidence_endpoint_pairs",
    },
    "nonadjacent_common1": {
        "source": HERE / "prove_iso_n7_bundle_g4_common1_triple134_piecewise_bernstein_rank7_g4_piecewise.py",
        "source_sha": "CB7FBEEA9FD7D416AA9B2FABF9AB307E3BB4435475909FE6E58FF1C6F80CCFCC",
        "report": HERE / "iso_n7_bundle_g4_common1_triple134_piecewise_bernstein_exact_rank7_g4_piecewise_20260831.json",
        "report_sha": "3CE0A3136B008B6453E7AA6DB85F9C4FEBCEA6A46B9B042456DA363CC71CFD53",
        "marker": "PASS_EXACT_ISO_N7_BUNDLE_G4_COMMON1_TRIPLE134_PIECEWISE_BERNSTEIN_RANK7_G4_PIECEWISE",
        "certificate_kind": "four_incidence_endpoint_pairs",
    },
    "adjacent": {
        "source": HERE / "prove_iso_n7_bundle_g4_adjacent_triple134_piecewise_bernstein_rank7_g4_piecewise.py",
        "source_sha": "14F7A51D4116FEC2CF22D6DD1D1F1802732E4AE331178B0CEB90A3F09DB3DEC7",
        "report": HERE / "iso_n7_bundle_g4_adjacent_triple134_piecewise_bernstein_exact_rank7_g4_piecewise_20260831.json",
        "report_sha": "8AC50DFD707656678A18033CBEF1A5723A6342F5D39504216C2ACF15BAD8765F",
        "marker": "PASS_EXACT_ISO_N7_BUNDLE_G4_ADJACENT_TRIPLE134_PIECEWISE_BERNSTEIN_RANK7_G4_PIECEWISE",
        "certificate_kind": "four_incidence_endpoint_pairs",
    },
}


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def main():
    assert sha256(CONTAINMENT_SOURCE) == CONTAINMENT_SOURCE_SHA
    assert sha256(CONTAINMENT_REPORT) == CONTAINMENT_REPORT_SHA
    containment = json.loads(CONTAINMENT_REPORT.read_text(encoding="utf-8"))
    assert containment["marker"] == (
        "PROBE_EXACT_ISO_N7_BUNDLE_G4_CONTAINMENT_ELIMINATION_RANK7_TERMINAL"
    )

    expected_labels = {
        "nonadjacent_common0_sum0",
        "nonadjacent_common0_sum1",
        "nonadjacent_common0_sum_ge2",
        "nonadjacent_common1",
        "adjacent",
    }
    assert set(BRANCHES) == expected_labels
    branch_reports = {}
    exact_endpoint_pairs = 0
    for label, record in BRANCHES.items():
        assert sha256(record["source"]) == record["source_sha"]
        assert sha256(record["report"]) == record["report_sha"]
        report = json.loads(record["report"].read_text(encoding="utf-8"))
        assert report["marker"] == record["marker"]
        assert report["source_sha256"] == record["source_sha"]
        assert report["verdict"].startswith("complete exact all-order")

        if label == "nonadjacent_common0_sum0":
            assert report["p5_endpoint_0_pointwise_max_cover"]["complete"]
            assert report["p5_endpoint_1_common_cover"]["complete"]
            certified_units = 2
        elif label == "nonadjacent_common0_sum1":
            assert report["p0_cover"]["complete"]
            assert report["p1_cover"]["complete"]
            certified_units = 2
        else:
            endpoints = report["endpoint_reports"]
            assert len(endpoints) == 4
            assert all(endpoint["complete"] for endpoint in endpoints.values())
            certified_units = 4
            exact_endpoint_pairs += 4

        branch_reports[label] = {
            "complete": True,
            "certificate_kind": record["certificate_kind"],
            "certified_units": certified_units,
            "scope": report["scope"],
            "source": record["source"].name,
            "source_sha256": record["source_sha"],
            "report": record["report"].name,
            "report_sha256": record["report_sha"],
            "marker": record["marker"],
        }

    assert len(branch_reports) == 5
    assert all(record["complete"] for record in branch_reports.values())
    assert exact_endpoint_pairs == 12

    dependencies = {
        CONTAINMENT_SOURCE.name: CONTAINMENT_SOURCE_SHA,
        CONTAINMENT_REPORT.name: CONTAINMENT_REPORT_SHA,
    }
    for record in BRANCHES.values():
        dependencies[record["source"].name] = record["source_sha"]
        dependencies[record["report"].name] = record["report_sha"]

    report = {
        "marker": MARKER,
        "rank": 7,
        "coefficient": "g4",
        "verdict": "complete exact universal marked-geometry certificate after the pinned containment reduction",
        "scope": "All five marked geometries in the rank-seven g4 reduction, all m>=6.",
        "geometry_partition": {
            "first_split": "The marks are adjacent or nonadjacent.",
            "nonadjacent_common_bound": (
                "Two distinct common W-neighbours would form a four-cycle, so a "
                "forest has common-neighbour count zero or one."
            ),
            "common0_degree_sum_split": (
                "For common-neighbour count zero, the nonnegative integer "
                "|N_W(u)|+|N_W(v)| is zero, one, or at least two."
            ),
            "pieces": list(BRANCHES),
            "piece_count": 5,
            "exhaustive": True,
            "pairwise_disjoint": True,
        },
        "branch_reports": branch_reports,
        "certificate_accounting": {
            "closed_geometries": 5,
            "total_geometries": 5,
            "literal_A5_B5_endpoint_pairs": 12,
            "specialized_sum0_cover_units": 2,
            "specialized_sum1_cover_units": 2,
        },
        "proof_boundary": (
            "This closes the universal rank-seven g4 residual within the pinned "
            "containment/ranks8-6 reduction.  It does not by itself close other "
            "ranks, other g-coefficients, or the full theorem."
        ),
        "dependencies_sha256": dependencies,
        "source_sha256": sha256(Path(__file__)),
    }
    OUTPUT.write_text(
        json.dumps(report, indent=2, sort_keys=True) + "\n",
        encoding="utf-8",
        newline="\n",
    )
    print(MARKER)


if __name__ == "__main__":
    main()
