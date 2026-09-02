#!/usr/bin/env python3
"""Fail-closed assembler for the twelve e=2 all-long Delta0..3 cells."""

from __future__ import annotations

import hashlib
import json
from fractions import Fraction
from pathlib import Path


HERE = Path(__file__).resolve().parent
EXPECTED = {
    "audit_rank8_delta013_e2_double_claws_n23_independent.py": "B28D1264C8A80F711F68E5DDDC88CDAACEF8FE1C9D1AD812882F3E6782BFF6D8",
    "rank8_delta013_e2_double_claws_n23_independent_audit_exact_20260820.json": "BF988098870847459BD61B3B58C0ED8010C092130A0DFAC45735000B2FA4C027",
    "probe_rank8_delta2_e2_symmetric_long_cells.py": "4141749D3431C439510C1A35F5BA4509EC4236503104753D610E7FC777250A36",
    "rank8_delta2_e2_branch_symmetric_long_exact_20260820.json": "82A55E610EB145FF453FE164AD1452C99C61B5B2C71B4D8EB9C8E7BCD58BFFDD",
    "rank8_delta2_e2_bridge_interior_symmetric_long_exact_20260820.json": "82D505176D8CB949C2C93B9F9124470F7816B89EF0C35C7B438D494581DA1ABB",
    "rank8_delta2_e2_pendant_symmetric_long_exact_20260820.json": "F53798E4748FA70D769BABA8AE4DD21A2D16BE8D2ADEF49E8D33F30F0247DE11",
    "audit_rank8_delta2_e2_long_pair_sum_identity.py": "A63B505EA6F50FFAACB6DBBBCF1A5707E5105122FFE65D9A846117DD7688005B",
    "rank8_delta2_e2_long_pair_sum_independent_audit_exact_20260820.json": "3D08D942263C416BD799F4BBA5822B3289CD92BCBEE936520D95B23FFD2CAB46",
    "probe_rank8_delta013_e2_symmetric_long_cells.py": "32CC4A331D388143640809AD4F07D18B002AB9A16C1F0C40769D9923F7DD0085",
    "rank8_delta0_e2_branch_symmetric_long_exact_20260820.json": "3B31D1FA72F933122B6D94CDFF126AD2A9B715D6317BB2C698704E83B349C058",
    "rank8_delta1_e2_branch_symmetric_long_exact_20260820.json": "F077F9048BC7E3071F44C4BCD24CD82A29B010F960384B0A431CCB4B77629BCF",
    "rank8_delta3_e2_branch_symmetric_long_exact_20260820.json": "189DDE9C64CF1A8A24F5DB6BDEA82F7C37CE853C6FEEF2C900D12752C5271913",
    "rank8_delta0_e2_bridge_interior_symmetric_long_exact_20260820.json": "2310F262FE2B336348E90A0EE397245796E1E8627E218E4D082092E1186F5101",
    "rank8_delta1_e2_bridge_interior_symmetric_long_exact_20260820.json": "33674A26103DEDAFC31E932983EB1E335D72577B0AEA1BE71F906EEBD78C1397",
    "rank8_delta3_e2_bridge_interior_symmetric_long_exact_20260820.json": "BE38D03793225600A374592CCB11AD529EAB7443E5C599231834C531DF336E93",
    "rank8_delta0_e2_pendant_symmetric_long_exact_20260820.json": "910A128C8ABA3A5843D709D539EFEF648D039A4113E1035A9732D9B97A245C48",
    "rank8_delta1_e2_pendant_symmetric_long_exact_20260820.json": "30563236FB48A6F759726B6E2A15B97751D0F3896A1A2FA23A06D5FC7444D3CD",
    "rank8_delta3_e2_pendant_symmetric_long_exact_20260820.json": "E3DA855160CC5A4CEA00D6219C4C01CA466CD3E085BC62690A08D4E5D55BBE59",
    "audit_rank8_delta013_e2_symmetric_long_cells.py": "D5EB865FC0923F0AF43B89F8EEC6092FD5EE081E78E50EDA00DFA7A4D5F3875E",
    "rank8_delta013_e2_symmetric_long_independent_audit_exact_20260820.json": "7872A0B5F181B4F15FC54DDFB9E54B57E1412C3BDC620D477911192EABE55A1B",
}


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def load(name: str) -> dict:
    return json.loads((HERE / name).read_text())


def report_name(rank: int, cell: str) -> str:
    return f"rank8_delta{rank}_e2_{cell}_symmetric_long_exact_20260820.json"


def main() -> None:
    actual = {name: sha256(HERE / name) for name in EXPECTED}
    assert actual == EXPECTED
    classification_audit = load("rank8_delta013_e2_double_claws_n23_independent_audit_exact_20260820.json")
    sum_audit = load("rank8_delta2_e2_long_pair_sum_independent_audit_exact_20260820.json")
    delta013_audit = load("rank8_delta013_e2_symmetric_long_independent_audit_exact_20260820.json")
    assert classification_audit["status"] == "PASS_INDEPENDENT_EXACT_AUDIT_RANK8_DELTA013_E2_DOUBLE_CLAWS_N23"
    assert sum_audit["status"] == "PASS_INDEPENDENT_AUDIT_RANK8_DELTA2_E2_LONG_PAIR_SUM_AND_ROOT_CELLS"
    assert delta013_audit["status"] == "PASS_INDEPENDENT_AUDIT_RANK8_DELTA013_E2_SYMMETRIC_LONG_CELLS"

    cells = []
    for rank in range(4):
        for cell in ("branch", "bridge_interior", "pendant"):
            report = load(report_name(rank, cell))
            assert report["status"] == "PASS_POSITIVE_SYMMETRIC_COEFFICIENT_CELL"
            if rank != 2:
                assert report["rank"] == rank and report["cell"] == cell
            else:
                assert report["cell"] == cell
            assert report["negative_coefficients"] == 0
            assert Fraction(report["constant_coefficient"]) > 0
            if cell in ("branch", "bridge_interior"):
                assert report["degrees"][1] == report["degrees"][3] == 0
            cells.append(
                {
                    "rank": rank,
                    "root_type": cell,
                    "degrees": report["degrees"],
                    "terms": report["terms"],
                    "report_sha256": EXPECTED[report_name(rank, cell)],
                }
            )
    assert len(cells) == 12

    payload = {
        "schema": "rank8-delta013-e2-all-long-v1",
        "status": "PASS_EXACT_RANK8_DELTA013_E2_ALL_LONG_ROOT_CELLS",
        "immutable_input_hashes": actual,
        "classification": "e=2 trees are exactly double claws: two degree-3 vertices, four leaves, and five positive suppressed edge lengths",
        "root_type_partition": {
            "branch": "the root is one of the two degree-3 vertices; side reversal covers either branch",
            "pendant": "the root is internal to a pendant arm; its near and tail deletion segments are both at least 7",
            "bridge_interior": "the root is internal to the central bridge; each deletion-side bridge gap has at least 7 vertices",
        },
        "exact_long_scopes": {
            "branch": "all four pendant arm lengths >=7 and central bridge length >=8",
            "pendant": "near=d-1>=7, tail=a-d>=7, the paired and far pendant arms >=7, and central bridge length >=8",
            "bridge_interior": "all four pendant arms >=7 and the numbers of bridge vertices strictly between the root and each branch are >=7 (equivalently each root-to-branch edge distance >=8)",
        },
        "sum_only_identity": "for ranks through 8, two long arms A+7,B+7 enter every branch endpoint state only through S=A+B; the product coordinate cancels",
        "cells": cells,
        "theorem": "For every rooted e=2 double-claw core in one of the exact long scopes, Delta^j R_1>0 for j=0,1,2,3.",
        "scope_guard": "This is not an all-order theorem for every e=2 root: any short pendant/bridge/root-split segment remains a boundary cell until separately certified.",
    }
    output = HERE / "rank8_delta013_e2_all_long_exact_20260820.json"
    output.write_text(json.dumps(payload, indent=2) + "\n")
    print(payload["status"])
    print("cells", len(cells))
    print("source_sha256", sha256(Path(__file__)))
    print("report_sha256", sha256(output))


if __name__ == "__main__":
    main()
