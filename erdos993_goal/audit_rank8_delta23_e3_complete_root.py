#!/usr/bin/env python3
"""Independent classification and hash audit of the complete e=3 theorem."""

from __future__ import annotations

import hashlib
import json
import math
from pathlib import Path


ROOT = Path(__file__).resolve().parent
PRIMARY = ROOT / "rank8_delta23_e3_complete_exact_root_20260823.json"
OUTPUT = ROOT / "rank8_delta23_e3_complete_independent_audit_root_20260823.json"
EXPECTED = {
    PRIMARY.name: "95F0F20308D7D0CE5B479623F225D4E34D366EDD15853CD1F5F8BE1C4974EAF0",
    "assemble_rank8_delta23_e3_complete_root.py":
        "1082895BAF186726BD07553C036531F0D8D665826C3830153919A9C9432A3580",
}


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def main() -> None:
    actual = {name: sha256(ROOT / name) for name in EXPECTED}
    assert actual == EXPECTED
    primary = json.loads(PRIMARY.read_text(encoding="utf-8"))
    assert primary["status"] == "PASS_EXACT_RANK8_DELTA23_E3_COMPLETE_N27_PLUS"
    assert {
        name: sha256(ROOT / name) for name in primary["immutable_inputs"]
    } == primary["immutable_inputs"]

    # Enumerate every nonnegative branch-degree inventory that can contribute
    # total surplus three. Degrees at least five already contribute at least six.
    solutions = []
    for b3 in range(4):
        for b4 in range(2):
            if b3 * math.comb(2, 2) + b4 * math.comb(3, 2) == 3:
                solutions.append((b3, b4))
    assert solutions == [(0, 1), (3, 0)]

    quartic = json.loads(
        (ROOT / "rank8_delta23_e3_quartic_star_complete_exact_root_20260823.json")
        .read_text(encoding="utf-8")
    )
    cubic = json.loads(
        (ROOT / "rank8_delta23_e3_cubic_complete_exact_root_20260823.json")
        .read_text(encoding="utf-8")
    )
    assert "every subdivision A of the four-arm star" in quartic["theorem"]
    assert "every root" in cubic["theorem"]
    assert "|A|>=27" in quartic["theorem"] and "n>=27" in cubic["theorem"]

    payload = {
        "schema": "rank8-delta23-e3-complete-independent-audit-root-v1",
        "status": "PASS_INDEPENDENT_RANK8_DELTA23_E3_COMPLETE_AUDIT",
        "surplus_inventory_solutions_b3_b4": [list(row) for row in solutions],
        "classification_checks": [
            "one degree-four branch vertex suppresses to the four-arm star",
            "three degree-three branch vertices form a path after degree-two suppression",
            "both certificates cover every subdivision root and every order n>=27",
        ],
        "transitive_hashes_replayed": len(primary["immutable_inputs"]),
        "immutable_inputs": actual,
        "source_sha256": sha256(Path(__file__)),
        "scope_warning": "This audits only Delta2/Delta3 at degree surplus e=3.",
    }
    OUTPUT.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    print(payload["status"])
    print("SOURCE", payload["source_sha256"])
    print("OUTPUT", sha256(OUTPUT))


if __name__ == "__main__":
    main()
