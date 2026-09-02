#!/usr/bin/env python3
"""Fail-closed publication audit for master Section 109.90."""

from __future__ import annotations

import hashlib
import json
from pathlib import Path


ROOT = Path(__file__).resolve().parent
MASTER = ROOT / "ARBITRARY_NEGATIVE_FACTOR_COMPATIBILITY_ROUTE_2026-08-06.md"
EXPECTED = {
    "RANK8_EXCEPTIONAL_FIRST_CROSSING_ALPHA6_SOURCE13_COMPLETE_2026-08-20.md": "448C07571C0A920E492125F09B3B6B9F400F635B7740CFE9C5288984143FE602",
    "assemble_rank8_exceptional_first_crossing_alpha6_s13.py": "06EBC6A62617B7F8F30FB4083AEC2BB3CED2D7667E926685A169F19023AE7E0F",
    "rank8_exceptional_first_crossing_alpha6_s13_complete_exact_20260820.json": "0327AFE9BFFA08B05D5D2B3AE708E097E97D4CF2F18A075F10C72994593559B2",
    "audit_rank8_exceptional_first_crossing_alpha6_s13_assembly.py": "FF9E46F2256B4C78CE34938DDD5BAB3A905FFAE04422A36116CE9575A1CBE0EF",
    "rank8_exceptional_first_crossing_alpha6_s13_complete_audit_exact_20260820.json": "E9B9023D4905EA81EA45071691696671C3FF070415DC92D309058872A0BED139",
    "RANK8_EXCEPTIONAL_FIRST_CROSSING_ALPHA1_6_CUMULATIVE_2026-08-20.md": "050E6F6DF558907FDC670D702CB3262FFA732FB723B6F89DD097575A12F50F7A",
    "assemble_rank8_exceptional_first_crossing_alpha1_6.py": "71579B4089739825DD8E940DF0EB02A773C5BCCF07D97A44094CEDA93813CDE5",
    "rank8_exceptional_first_crossing_alpha1_6_cumulative_exact_20260820.json": "6AE270E454FF67C122BFCE5409F9D280C186D293ED12F783F07DC0616EC94671",
    "audit_rank8_exceptional_first_crossing_alpha1_6.py": "F3E38B6265F356C115F7960FAAE4C158002F71617445F80E0BB6522BDD496E65",
    "rank8_exceptional_first_crossing_alpha1_6_cumulative_audit_exact_20260820.json": "01BBD95FE7931FD507A1A37A07CDFAD8540411113A38073883B07695D9D2BFED",
}


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def main() -> None:
    actual = {name: sha256(ROOT / name) for name in EXPECTED}
    assert actual == EXPECTED, {
        name: {"expected": EXPECTED[name], "actual": actual[name]}
        for name in EXPECTED if EXPECTED[name] != actual[name]
    }
    s13 = json.loads((ROOT / "rank8_exceptional_first_crossing_alpha6_s13_complete_audit_exact_20260820.json").read_text(encoding="utf-8"))
    cumulative = json.loads((ROOT / "rank8_exceptional_first_crossing_alpha1_6_cumulative_audit_exact_20260820.json").read_text(encoding="utf-8"))
    assert s13["status"] == "PASS_INDEPENDENT_NO_GAP_RANK8_ALPHA6_SOURCE13_ASSEMBLY_AUDIT"
    assert s13["coverage"]["exact_union"] == [73, 247]
    assert s13["coverage"]["gaps"] == s13["coverage"]["overlaps"] == 0
    sagg = s13["aggregate"]
    assert sagg["independently_enumerated_multisets"] == 21_803_250
    assert sagg["canonical_checks"] == 15_156_851
    assert sagg["negative_Q8"] == sagg["zero_Q8"] == 0
    assert sagg["minimum_Q8"] == 3_524_647_923
    assert sagg["maximum_Q8"] == 282_462_928_635_888
    assert cumulative["status"] == "PASS_INDEPENDENT_FAIL_CLOSED_RANK8_EXCEPTIONAL_FIRST_CROSSING_ALPHA1_6_AUDIT"
    assert cumulative["coverage"]["terminal_alphas"] == [1, 2, 3, 4, 5, 6]
    assert cumulative["coverage"]["terminal_type_indices"] == [1, 247]
    assert cumulative["coverage"]["source_cells"] == 21
    assert cumulative["coverage"]["missing_cells"] == []
    assert cumulative["coverage"]["duplicate_cells"] == []
    aggregate = cumulative["aggregate"]
    assert aggregate["independently_enumerated_multisets"] == 43_008_068
    assert aggregate["canonical_check_keys"] == 31_148_628
    assert aggregate["distinct_cell_or_shard_crossing_jets_sum"] == 29_747_474
    assert aggregate["multiset_to_canonical_key_collisions"] == 11_859_440
    assert aggregate["canonical_key_to_product_collisions"] == 1_401_154
    assert aggregate["negative_Q8"] == aggregate["zero_Q8"] == 0
    assert aggregate["minimum_Q8"] == 9_324_000
    assert aggregate["maximum_Q8"] == 282_462_928_635_888

    master = MASTER.read_text(encoding="utf-8")
    marker = "### 109.90 Exceptional-only first crossings are closed through terminal alpha six"
    assert master.count(marker) == 1
    section = master.split(marker, 1)[1]
    for name, digest in EXPECTED.items():
        assert name in section and digest in section, name
    for phrase in (
        "Thirty-two\nnew sequential shards",
        "raw multisets                         21,803,250",
        "Combining terminal bands one through six",
        "raw multisets                         43,008,068",
        "canonical check keys                  31,148,628",
        "There are no missing or duplicate source cells",
        "Terminal alpha six is therefore complete",
        "Terminal bands seven through nine\nremain",
        "Problem 993",
    ):
        assert phrase in section, phrase

    payload = {
        "status": "PASS_PUBLICATION_AUDIT_RANK8_MASTER_SECTION_109_90",
        "immutable_inputs": actual,
        "terminal_alpha_range": [1, 6],
        "terminal_type_indices": [1, 247],
        "source_cells": 21,
        "canonical_checks": 31_148_628,
        "negative_q8": 0,
        "zero_q8": 0,
        "terminal_alpha6_complete": True,
        "exceptional_first_crossing_complete": False,
        "master_sha256": sha256(MASTER),
    }
    output = ROOT / "rank8_master_section_109_90_publication_audit_20260820.json"
    output.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    print(payload["status"])
    print("MASTER", payload["master_sha256"])
    print("REPORT", sha256(output))


if __name__ == "__main__":
    main()
