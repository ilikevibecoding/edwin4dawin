#!/usr/bin/env python3
"""Fail-closed no-gap assembly of the three exact source-alpha10 shards."""

from __future__ import annotations

import hashlib
import json
from pathlib import Path


ROOT = Path(__file__).resolve().parent
LABELS = ("types73_156", "types157_219", "types220_247")
PROBE = ROOT / "probe_rank8_exceptional_first_crossing_alpha6_s10_shard_exact.py"
AUDITOR = ROOT / "audit_rank8_exceptional_first_crossing_alpha6_s10_shard.py"
OUTPUT = ROOT / "rank8_exceptional_first_crossing_alpha6_s10_complete_exact_20260820.json"


def digest(path):
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def artifacts(label):
    stem = f"rank8_exceptional_first_crossing_alpha6_s10_{label}"
    return {
        "report": ROOT / f"{stem}_exact_20260820.json",
        "database": ROOT / f"{stem}_keys_exact_20260820.sqlite3",
        "audit": ROOT / f"{stem}_audit_exact_20260820.json",
    }


def main():
    reports, audits = [], []
    hashes = {PROBE.name: digest(PROBE), AUDITOR.name: digest(AUDITOR)}
    for label in LABELS:
        files = artifacts(label)
        report = json.loads(files["report"].read_text(encoding="utf-8"))
        audit = json.loads(files["audit"].read_text(encoding="utf-8"))
        assert report["status"] == f"PASS_EXACT_RESOURCE_GATED_RANK8_ALPHA6_S10_{label.upper()}"
        assert audit["status"] == f"PASS_INDEPENDENT_BIDIRECTIONAL_RANK8_ALPHA6_S10_{label.upper()}_AUDIT"
        assert report["hashes"][files["database"].name] == digest(files["database"])
        assert audit["hashes"][files["report"].name] == digest(files["report"])
        assert audit["hashes"][files["database"].name] == digest(files["database"])
        assert report["hashes"][PROBE.name] == digest(PROBE)
        assert audit["hashes"][AUDITOR.name] == digest(AUDITOR)
        reported, audited = report["aggregate"], audit["shard"]
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
        reports.append(report); audits.append(audit)

    ranges = [[r["aggregate"]["terminal_type_index_start"], r["aggregate"]["terminal_type_index_stop"]] for r in reports]
    assert ranges == [[73, 156], [157, 219], [220, 247]]
    report_types = [row["terminal_type_index"] for report in reports for row in report["per_terminal_type"]]
    audit_types = [row["terminal_type_index"] for audit in audits for row in audit["shard"]["per_terminal_type"]]
    assert report_types == audit_types == list(range(73, 248))
    assert len(report_types) == len(set(report_types)) == 175
    for audit in audits:
        for row in audit["shard"]["per_terminal_type"]:
            assert row["independently_enumerated_multisets"] == 7222 + 39 * row["terminal_relative_alpha6_type"]

    aggregate = {
        "source_alpha": 10, "terminal_alpha": 6, "total_alpha": 16,
        "terminal_type_index_start": 73, "terminal_type_index_stop": 247,
        "terminal_type_count": 175,
        "independently_enumerated_multisets": sum(a["shard"]["independently_enumerated_multisets"] for a in audits),
        "canonical_checks": sum(r["aggregate"]["ordered_covering_checks"] for r in reports),
        "distinct_shard_product_jets_sum": sum(r["aggregate"]["distinct_crossing_jets"] for r in reports),
        "multiset_to_key_collisions": sum(a["shard"]["multiset_to_canonical_key_collisions"] for a in audits),
        "key_to_product_collisions_within_shards": sum(r["aggregate"]["canonical_key_to_product_collisions"] for r in reports),
        "negative_Q8": 0, "zero_Q8": 0,
        "minimum_Q8": min(r["aggregate"]["minimum_Q8"] for r in reports),
        "maximum_Q8": max(r["aggregate"]["maximum_Q8"] for r in reports),
    }
    assert aggregate == {
        "source_alpha": 10, "terminal_alpha": 6, "total_alpha": 16,
        "terminal_type_index_start": 73, "terminal_type_index_stop": 247,
        "terminal_type_count": 175,
        "independently_enumerated_multisets": 1864450,
        "canonical_checks": 1496190,
        "distinct_shard_product_jets_sum": 1368629,
        "multiset_to_key_collisions": 368260,
        "key_to_product_collisions_within_shards": 127561,
        "negative_Q8": 0, "zero_Q8": 0,
        "minimum_Q8": 133044600,
        "maximum_Q8": 9698003143200,
    }
    payload = {
        "schema": "rank8-exceptional-first-crossing-alpha6-s10-complete-v1",
        "status": "PASS_EXACT_NO_GAP_RANK8_ALPHA6_SOURCE10_COMPLETE",
        "theorem": "For every terminal exceptional alpha6 type73..247 and every source-alpha10 exceptional multiset using types at most the terminal type, the total-alpha16 product has Q8>0.",
        "coverage": {"shard_ranges": ranges, "exact_union": [73, 247], "overlaps": 0, "gaps": 0},
        "aggregate": aggregate,
        "shards": [
            {"label": label, "range": ranges[i], "report_status": reports[i]["status"], "audit_status": audits[i]["status"],
             "recurrence_peak_private_bytes": reports[i]["resources"]["peak_private_bytes"], "audit_peak_private_bytes": audits[i]["resources"]["peak_private_bytes"]}
            for i, label in enumerate(LABELS)
        ],
        "scope_warning": "This theorem is exactly source alpha10 for terminal alpha6. It excludes source alpha11 and higher.",
        "hashes": {**hashes, Path(__file__).name: digest(Path(__file__))},
    }
    OUTPUT.write_text(json.dumps(payload, indent=2, sort_keys=True) + "\n", encoding="utf-8")
    print(payload["status"])
    print(f"ranges={ranges} raw={aggregate['independently_enumerated_multisets']} checks={aggregate['canonical_checks']} negative=0 zero=0")
    print(f"assembly_sha256={digest(OUTPUT)}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
