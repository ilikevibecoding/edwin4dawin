#!/usr/bin/env python3
"""Fail-closed no-gap assembly of the two exact source-alpha9 shards."""

from __future__ import annotations

import hashlib
import json
from pathlib import Path


ROOT = Path(__file__).resolve().parent
LABELS = ("types73_246", "type247")
PROBE = ROOT / "probe_rank8_exceptional_first_crossing_alpha6_s9_shard_exact.py"
AUDITOR = ROOT / "audit_rank8_exceptional_first_crossing_alpha6_s9_shard.py"
OUTPUT = ROOT / "rank8_exceptional_first_crossing_alpha6_s9_complete_exact_20260820.json"


def digest(path):
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def artifacts(label):
    stem = f"rank8_exceptional_first_crossing_alpha6_s9_{label}"
    return {
        "report": ROOT / f"{stem}_exact_20260820.json",
        "database": ROOT / f"{stem}_keys_exact_20260820.sqlite3",
        "audit": ROOT / f"{stem}_audit_exact_20260820.json",
    }


def main():
    reports = []
    audits = []
    hashes = {PROBE.name: digest(PROBE), AUDITOR.name: digest(AUDITOR)}
    for label in LABELS:
        files = artifacts(label)
        report = json.loads(files["report"].read_text(encoding="utf-8"))
        audit = json.loads(files["audit"].read_text(encoding="utf-8"))
        assert report["status"] == f"PASS_EXACT_RESOURCE_GATED_RANK8_ALPHA6_S9_{label.upper()}"
        assert audit["status"] == f"PASS_INDEPENDENT_BIDIRECTIONAL_RANK8_ALPHA6_S9_{label.upper()}_AUDIT"
        assert report["hashes"][files["database"].name] == digest(files["database"])
        assert audit["hashes"][files["report"].name] == digest(files["report"])
        assert audit["hashes"][files["database"].name] == digest(files["database"])
        assert report["hashes"][PROBE.name] == digest(PROBE)
        assert audit["hashes"][AUDITOR.name] == digest(AUDITOR)
        reported = report["aggregate"]
        audited = audit["shard"]
        assert reported["ordered_covering_checks"] == audited["canonical_check_keys"]
        assert reported["distinct_crossing_jets"] == audited["distinct_crossing_jets"]
        assert reported["canonical_key_to_product_collisions"] == audited["canonical_key_to_product_collisions"]
        assert reported["negative_Q8"] == audited["negative_Q8"] == 0
        assert reported["zero_Q8"] == audited["zero_Q8"] == 0
        assert reported["minimum_Q8"] == audited["minimum_Q8"]
        assert reported["maximum_Q8"] == audited["maximum_Q8"]
        assert report["resources"]["peak_private_bytes"] < report["resources"]["abort_limit_private_bytes"]
        assert audit["resources"]["peak_private_bytes"] < audit["resources"]["abort_limit_private_bytes"]
        hashes[files["report"].name] = digest(files["report"])
        hashes[files["database"].name] = digest(files["database"])
        hashes[files["audit"].name] = digest(files["audit"])
        reports.append(report)
        audits.append(audit)

    ranges = [
        [report["aggregate"]["terminal_type_index_start"], report["aggregate"]["terminal_type_index_stop"]]
        for report in reports
    ]
    assert ranges == [[73, 246], [247, 247]]
    report_types = [row["terminal_type_index"] for report in reports for row in report["per_terminal_type"]]
    audit_types = [row["terminal_type_index"] for audit in audits for row in audit["shard"]["per_terminal_type"]]
    assert report_types == audit_types == list(range(73, 248))
    assert len(report_types) == len(set(report_types)) == 175
    for audit in audits:
        for row in audit["shard"]["per_terminal_type"]:
            relative = row["terminal_relative_alpha6_type"]
            assert row["independently_enumerated_multisets"] == 3162 + 13 * relative

    aggregate = {
        "source_alpha": 9, "terminal_alpha": 6, "total_alpha": 15,
        "terminal_type_index_start": 73, "terminal_type_index_stop": 247,
        "terminal_type_count": 175,
        "independently_enumerated_multisets": sum(audit["shard"]["independently_enumerated_multisets"] for audit in audits),
        "canonical_checks": sum(report["aggregate"]["ordered_covering_checks"] for report in reports),
        "distinct_shard_product_jets_sum": sum(report["aggregate"]["distinct_crossing_jets"] for report in reports),
        "multiset_to_key_collisions": sum(audit["shard"]["multiset_to_canonical_key_collisions"] for audit in audits),
        "key_to_product_collisions_within_shards": sum(report["aggregate"]["canonical_key_to_product_collisions"] for report in reports),
        "negative_Q8": 0, "zero_Q8": 0,
        "minimum_Q8": min(report["aggregate"]["minimum_Q8"] for report in reports),
        "maximum_Q8": max(report["aggregate"]["maximum_Q8"] for report in reports),
    }
    assert aggregate == {
        "source_alpha": 9, "terminal_alpha": 6, "total_alpha": 15,
        "terminal_type_index_start": 73, "terminal_type_index_stop": 247,
        "terminal_type_count": 175,
        "independently_enumerated_multisets": 753550,
        "canonical_checks": 625033,
        "distinct_shard_product_jets_sum": 516570,
        "multiset_to_key_collisions": 128517,
        "key_to_product_collisions_within_shards": 108463,
        "negative_Q8": 0, "zero_Q8": 0,
        "minimum_Q8": 37487421,
        "maximum_Q8": 2584714768416,
    }
    payload = {
        "schema": "rank8-exceptional-first-crossing-alpha6-s9-complete-v1",
        "status": "PASS_EXACT_NO_GAP_RANK8_ALPHA6_SOURCE9_COMPLETE",
        "theorem": "For every terminal exceptional alpha6 type73..247 and every source-alpha9 exceptional multiset using types at most the terminal type, the total-alpha15 product has Q8>0.",
        "coverage": {"shard_ranges": ranges, "exact_union": [73, 247], "overlaps": 0, "gaps": 0},
        "aggregate": aggregate,
        "shards": [
            {
                "label": label,
                "range": ranges[index],
                "report_status": reports[index]["status"],
                "audit_status": audits[index]["status"],
                "recurrence_peak_private_bytes": reports[index]["resources"]["peak_private_bytes"],
                "audit_peak_private_bytes": audits[index]["resources"]["peak_private_bytes"],
            }
            for index, label in enumerate(LABELS)
        ],
        "scope_warning": "This theorem is exactly source alpha9 for terminal alpha6. It excludes source alpha10 and higher.",
        "hashes": {**hashes, Path(__file__).name: digest(Path(__file__))},
    }
    OUTPUT.write_text(json.dumps(payload, indent=2, sort_keys=True) + "\n", encoding="utf-8")
    print(payload["status"])
    print(f"ranges={ranges} raw={aggregate['independently_enumerated_multisets']} checks={aggregate['canonical_checks']} negative=0 zero=0")
    print(f"assembly_sha256={digest(OUTPUT)}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
