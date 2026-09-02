#!/usr/bin/env python3
"""Fail-closed publication audit for master Section 109.74."""

from __future__ import annotations

import hashlib
import json
from pathlib import Path


ROOT = Path(__file__).resolve().parent
MASTER = ROOT / "ARBITRARY_NEGATIVE_FACTOR_COMPATIBILITY_ROUTE_2026-08-06.md"
EXPECTED = {
    "RANK8_E2_LENGTH_EXTENSION_FINITE_AND_THIN_THEOREMS_2026-08-20.md":
        "B82FF80537AAEBF59548C871641AA6931AB99C34FCBBC8AF3E4DE6CC1E2CE9A4",
    "probe_rank8_delta013_e2_length_extension.py":
        "C8BA8039C99D8273194DF3672E3E23EE4DB592F19AC57D3571EC47075D0DC38C",
    "rank8_delta013_e2_length_extension_scout_exact_20260820.json":
        "49D5B53516C07B7DE085D5586158F3674B523F01B4167E8BA972AA61118F16C4",
    "certify_rank8_delta013_e2_thin_bridge_extension_all_order.py":
        "F31EFBF365D25BF85713D0C9D5CBA37F44385CA463B24BE00245BDE039E69C9B",
    "rank8_delta013_e2_thin_bridge_extension_all_order_exact_20260820.json":
        "4308C23DC1EC19647B1B22F2D0FA21D1B3C243A72B0CF52F563F3550340DC4F5",
    "audit_rank8_delta013_e2_length_extension.py":
        "4E654621FC3AE9A8989764D8F284B49F87CF17038C7C0CE6B26B724977188E52",
    "rank8_delta013_e2_length_extension_independent_audit_exact_20260820.json":
        "FC336F62A58EE4C2CFB7EF6F9AF6D3BE24FA689B89841A86D656A2547CCE63A2",
}


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def load(name: str) -> dict:
    return json.loads((ROOT / name).read_text(encoding="utf-8"))


def main() -> None:
    actual = {name: sha256(ROOT / name) for name in EXPECTED}
    assert actual == EXPECTED, {
        name: {"expected": EXPECTED[name], "actual": actual[name]}
        for name in EXPECTED
        if EXPECTED[name] != actual[name]
    }

    scout = load("rank8_delta013_e2_length_extension_scout_exact_20260820.json")
    thin = load("rank8_delta013_e2_thin_bridge_extension_all_order_exact_20260820.json")
    audit = load("rank8_delta013_e2_length_extension_independent_audit_exact_20260820.json")

    assert scout["status"] == "PASS_EXACT_SCOUT_RANK8_DELTA013_E2_LENGTH_EXTENSION_ORDERS_23_29"
    assert audit["status"] == "PASS_INDEPENDENT_AUDIT_RANK8_DELTA013_E2_LENGTH_EXTENSION"
    assert thin["status"] == "PASS_EXACT_RANK8_DELTA013_E2_THIN_BRIDGE_EXTENSION_ALL_ORDER"
    assert [row["source_order"] for row in scout["orders"]] == list(range(23, 30))
    assert sum(row["canonical_cores"] for row in scout["orders"]) == 11612
    assert sum(row["old_root_comparisons"] for row in scout["orders"]) == 1547905
    assert sum(row["inserted_roots"] for row in scout["orders"]) == 58060
    assert scout["global_minimum_increments"] == {
        "0": 34080271754300065318,
        "1": 103720774269292825800,
        "2": 172737383793236516056,
        "3": 231463817470675423152,
    }
    for row in scout["orders"]:
        assert all(int(value) > 0 for value in row["minimum_increments"].values())
        assert all(int(value) > 0 for value in row["minimum_inserted_root_values"].values())

    assert audit["finite_scout"]["orders"] == 7
    assert audit["finite_scout"]["old_root_witnesses_rebuilt"] == 28
    assert audit["exact_extension_identities"]["generic_polynomial_identity_checks"] == 280
    assert audit["thin_all_order_theorem"]["cells"] == 19
    assert audit["thin_all_order_theorem"]["rank_cells"] == 76
    assert audit["thin_all_order_theorem"]["constants_rebuilt"] == 76
    assert "orders 24..30" in audit["finite_induction_target"]
    assert "general all-order extension theorem is not claimed" in audit["scope_guard"]

    master = MASTER.read_text(encoding="utf-8")
    marker = "### 109.74 The degree-surplus-two layer is closed through order 30"
    assert master.count(marker) == 1
    section = master.split(marker, 1)[1]
    for name, digest in EXPECTED.items():
        assert name in section and digest in section, name
    for text in (
        "11,612 canonical cores",
        "1,547,905 old-root comparisons",
        "58,060 inserted",
        "19 no-gap cells",
        "76 rank cells",
        "withdrawn and superseded",
        "`e>=3` at orders 23",
        "`e>=2` from order 31",
        "not a proof of Problem 993",
    ):
        assert text in section, text

    payload = {
        "status": "PASS_PUBLICATION_AUDIT_RANK8_MASTER_SECTION_109_74",
        "immutable_inputs": actual,
        "finite_target_orders_closed": list(range(23, 31)),
        "closed_ranks": [0, 1, 2, 3],
        "thin_all_order_extension_family_closed": True,
        "connected_Q8_complete": False,
        "master_sha256": sha256(MASTER),
    }
    output = ROOT / "rank8_master_section_109_74_publication_audit_20260820.json"
    output.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    print(payload["status"])
    print("MASTER", payload["master_sha256"])
    print("REPORT", sha256(output))


if __name__ == "__main__":
    main()
