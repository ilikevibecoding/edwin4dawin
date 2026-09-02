#!/usr/bin/env python3
"""Fail-closed assembly of all exact pattern shards for four-edge core 6."""

from __future__ import annotations

import hashlib
import json
from pathlib import Path


HERE = Path(__file__).resolve().parent
OUTPUT = HERE / "iso_n7_bundle_g3_adjacent_no_parent_ge6_four_edges_core6_pattern_shards_assembled_exact_rank7_g5_finish_20260831.json"
MARKER = "PASS_EXACT_ISO_N7_BUNDLE_G3_ADJACENT_NO_PARENT_GE6_FOUR_EDGES_CORE6_PATTERN_SHARDS_ASSEMBLED_RANK7_G5_FINISH"
SHARD_MARKER = "PASS_EXACT_ISO_N7_BUNDLE_G3_ADJACENT_NO_PARENT_GE6_FOUR_EDGES_PATTERN_SHARD_RANK7_G5_FINISH"
SHARD_SOURCE = "prove_iso_n7_bundle_g3_adjacent_no_parent_ge6_four_edges_pattern_shard_rank7_g5_finish.py"
SHARD_SOURCE_SHA = "D816B88BF0B0BA782B43BD7FC5BA29ADCE25A3BE9851DD7FC2AD9A81BB29825A"
CLASSIFIER_SOURCE = "audit_iso_n7_bundle_g3_adjacent_no_parent_four_edge_core_classifier_independent_rank7_g5_finish.py"
CLASSIFIER_SOURCE_SHA = "7AEE0C42004F69D60695EE545B29567E7D8F307854F38DEF6660BDE2CE668C38"
CLASSIFIER_REPORT = "iso_n7_bundle_g3_adjacent_no_parent_four_edge_core_classifier_independent_audit_rank7_g5_finish_20260831.json"
CLASSIFIER_REPORT_SHA = "EC45F3B45C24E55A6E7F25048BAA322C11455186DFE4D769007B020BE2772887"
EXPECTED_EDGES = ((0, 1), (0, 2), (3, 4), (5, 6))
REPORT_HASHES = (
    "FC9CCC51CC406E11F8815ADD77B68674E0D24D9D857D03093294A6DC35FB1E3B",
    "B4BA9148233490B91416075EC18AD91ADD58E24107CD7797490B7DD888B13111",
    "8A885C8505E90599AE3BD63E013A01E61056982F779A244D5DE7DDA0FE00F579",
    "2F18444E663C6C980158A12F5FC6EA706A84BCC558FCF3E56075DADE4BDC22FB",
    "352CD5229BBE1A7BD9750C3FDADB04024CAB9B9DBDE3160289C8B1D70725508F",
    "FBC8FBA5EFC06093735A365780B64F3FC2703C015692CEB49E93D9F38F64A6DC",
    "957B8B4750678781DA1AAF569967FA79E9D292CCBDD1469E0606F19ECC125A53",
    "8FFC71AD713A55C2CAA70764AF62CF3A959FBE159978E8046EF5470CD732CD0C",
    "7B3C4A88C4935A424773F5AEF3FC79F3D79B04B25A05A6D2ACA9AB2F6550F681",
    "F7FE0611B2F79163E63E3D82326621D103668DE35EA5693C9E81AA027B54931E",
    "F6A708192EF417BF18EFB35F7C43D3912ACF8125BA3EBC2ED0F86F783BC28C7F",
    "0CEE61D3420CAC440B335CF4BD64AEDBE88CD3CAA08B7F93A9D8A2DE4459D0D4",
    "5658C14E24AB1B6AFE3568E211FAA4744848C1C026C6180A88B526F0B6FB74A1",
    "36B61A497D07BF21B61D8F501B9DD7B51C83E2E923F4E6260B9AF77336EBC492",
    "D3F825E1EABA9F2FD5C0B4E4BE7C9A17998B10A21453EDC28A5BB1410B3C57E7",
    "4750A15CACAE43429E80F1238D74EC912011F98DD93EC80D85209B2AFFB3BB2E",
    "B2EA2C78110EB777028D7CAD1865CDA49C7B3E3696BB12669CB76EB8D7457D1D",
    "3376BD2C8C650E2423E75A8C65DD8B58F338AF81CD8B89618141974E4A1F3253",
    "5DCB2335A58C8C10E3697B8B58635B35124FF7878D15B320365DDCC5AD6614AA",
    "C777AF57B51E1C6C52000292363C935F09A30F3C30401AFF3DC0A244C483416D",
    "4A98293B1FABD4E3294836C681BE8969D5CD4209A3F8955F6AFFB72B652C7167",
    "7B9674D0854B58D3CD5BA9AFEBFCAEF2B761151A551CF3BDCC94F046DBC81A68",
    "C22C618084D41091838AEA687E52837832D35B6C5A73BA39A517F1674E5A117A",
    "0772FA2A71077BAA30716E283ED12531E0398776AEBD1A81BF4F23D2EECE1785",
    "C833673C9968B55C93E3F62B8743EEB0B339AD0A17477D268313F34144EF16BF",
    "16E2D698AD8EC2406ED072514026A91E582A0273EB840708C95B66B0FA0F1F8F",
    "812E87CA2C86B8D0E7DE6DD4728DBB9432BE7CD2665BB7B28EF7DD5F8F549BE1",
    "0DC7FF05D040927888DE518ED3B76F305B81C7CF6EA1F8D436BECC3C3E2E690D",
    "B8CB6CA0D37C81A387F9AAED8E509DAD40D56E1852D96BD1D11335006EC5DF62",
    "5809E9063A6BD571C734EF59AD0594C06BD10794BB02D81D14BCCB16F1BB79E4",
)


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def report_name(pattern_index: int) -> str:
    return (
        "iso_n7_bundle_g3_adjacent_no_parent_ge6_four_edges_"
        f"core6_pattern{pattern_index:02d}_exact_rank7_g5_finish_20260831.json"
    )


def main() -> None:
    assert sha256(HERE / SHARD_SOURCE) == SHARD_SOURCE_SHA
    assert sha256(HERE / CLASSIFIER_SOURCE) == CLASSIFIER_SOURCE_SHA
    assert sha256(HERE / CLASSIFIER_REPORT) == CLASSIFIER_REPORT_SHA
    classifier = json.loads((HERE / CLASSIFIER_REPORT).read_text(encoding="utf-8"))
    assert classifier["coverage_gap_within_four_edge_core_classifier"] is None
    assert classifier["exact_isomorphism_class_count"] == 8
    classifier_core = classifier["isomorphism_classes"][6]
    assert classifier_core["core_index"] == 6
    assert tuple(tuple(edge) for edge in classifier_core["canonical_edges"]) == EXPECTED_EDGES
    dependencies = {
        SHARD_SOURCE: SHARD_SOURCE_SHA,
        CLASSIFIER_SOURCE: CLASSIFIER_SOURCE_SHA,
        CLASSIFIER_REPORT: CLASSIFIER_REPORT_SHA,
    }
    pattern_records = []
    raw_pattern_total = 0
    for pattern_index, expected_hash in enumerate(REPORT_HASHES):
        filename = report_name(pattern_index)
        path = HERE / filename
        assert sha256(path) == expected_hash, filename
        shard = json.loads(path.read_text(encoding="utf-8"))
        assert shard["marker"] == SHARD_MARKER
        assert shard["status"] == "proved exact"
        assert shard["source_sha256"] == SHARD_SOURCE_SHA
        assert shard["core_index"] == 6
        assert shard["pattern_index"] == pattern_index
        assert shard["total_patterns_in_core"] == 30
        assert tuple(tuple(edge) for edge in shard["canonical_edges"]) == EXPECTED_EDGES
        assert shard["coverage_gap_within_stated_pattern"] is None
        certificate = shard["certificate"]
        assert certificate["negative_tail_scalar_coefficients"] == 0
        assert certificate["first_negative"] == []
        assert certificate["exact_power_inversion"] is True
        raw_pattern_total += shard["root_pattern_signature"]["witness"]["equivalent_raw_patterns"]
        pattern_records.append({
            "pattern_index": pattern_index,
            "root_pattern_signature": shard["root_pattern_signature"],
            "minimum_tail_scalar_coefficient": certificate["minimum_tail_scalar_coefficient"],
            "ordered_stream_sha256": certificate["ordered_stream_sha256"],
            "report": filename,
            "report_sha256": expected_hash,
        })
        dependencies[filename] = expected_hash
    assert raw_pattern_total == 175
    ordered_stream = json.dumps(pattern_records, separators=(",", ":"), sort_keys=True).encode()
    report = {
        "marker": MARKER,
        "status": "proved exact",
        "theorem": "For adjacent marks in no-parent mode, rank-seven G3 is nonnegative for every forest with at least six distinct attachment components, arbitrary unrelated isolates, exactly four W-edges, and isolate-free core 6 (P3 plus two K2 components).",
        "core_index": 6,
        "core_order": 7,
        "canonical_edges": EXPECTED_EDGES,
        "component_description": "P3 plus 2K2",
        "root_pattern_classifier": {
            "raw_patterns": raw_pattern_total,
            "deduplicated_patterns": len(pattern_records),
            "deduplication_rule": "Exact deleted-row signature and equal X/Y core-root counts, as pinned by every shard.",
        },
        "pattern_records": pattern_records,
        "ordered_pattern_assembly_sha256": hashlib.sha256(ordered_stream).hexdigest().upper(),
        "minimum_tail_scalar_coefficient": "1",
        "coverage_gap_within_four_edge_core6": None,
        "remaining_four_edge_core_indices": [7],
        "remaining_adjacent_no_parent_ge6_scope": "Four-edge core7 and every forest with at least five edges.",
        "rank7_G3_symmetry_reduced_cells_after": 18,
        "ledger_guard": "This closes one universal core subbranch, not the whole adjacent/no-parent symmetry cell.",
        "dependencies_sha256": dependencies,
        "scope": "Adjacent/no-parent G3, >=6 attachment components, e(W)=4, core6 only.",
        "source_sha256": sha256(Path(__file__)),
    }
    raw = json.dumps(report, indent=2, sort_keys=True) + "\n"
    OUTPUT.write_text(raw, encoding="utf-8", newline="\n")
    print(json.dumps({
        "marker": MARKER,
        "core_index": 6,
        "raw_patterns": raw_pattern_total,
        "deduplicated_patterns": len(pattern_records),
        "minimum_coefficient": "1",
        "coverage_gap_within_four_edge_core6": None,
        "remaining_four_edge_core_indices": [7],
    }, indent=2, sort_keys=True))
    print("SOURCE_SHA256", report["source_sha256"])
    print("REPORT_SHA256", hashlib.sha256(raw.encode()).hexdigest().upper())
    print(MARKER)


if __name__ == "__main__":
    main()
