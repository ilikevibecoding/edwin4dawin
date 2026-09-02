#!/usr/bin/env python3
"""Independent literal audit of finite quartic-star Delta2/Delta3."""

from __future__ import annotations

import hashlib
import json
from pathlib import Path

from audit_rank8_delta01_e3_quartic_stars_n27_n36_agent import build_star, forest_polynomial
from audit_rank8_delta23_e3_cubic_mixed_newton_i256_root import residual


ROOT = Path(__file__).resolve().parent
PRIMARY = ROOT / "rank8_delta23_e3_quartic_stars_n27_n36_exact_root_20260823.json"
DELTA01 = ROOT / "rank8_delta01_e3_quartic_stars_n27_n36_exact_agent_20260822.json"
DELTA01_AUDIT = ROOT / "rank8_delta01_e3_quartic_stars_n27_n36_independent_audit_agent_20260822.json"
OUTPUT = ROOT / "rank8_delta23_e3_quartic_stars_n27_n36_independent_audit_root_20260823.json"
EXPECTED = {
    PRIMARY.name: "2B7B0F91BE47034979BB8D6204D3E2AD53945E6A56CAB131C1EB3C0AA40936DA",
    DELTA01.name: "0BD25498A6C35D33B4109D5AB674239A80426B2F1FC2E653F2E40B852E531879",
    DELTA01_AUDIT.name: "FA3795E985077B76B6B6EB6C8CB32D97371BBABBD79947F0BF782FB1AB8D14AB",
    "scan_rank8_delta23_e3_quartic_stars_n27_n36_root.py": "54910568AD3BD497DB821557D1D77AD5A1D873ED146A89C57C336B9A7ADB92AF",
    "audit_rank8_delta01_e3_quartic_stars_n27_n36_agent.py": "94A14B56E224EEF5136B3756AD0C4652F0FECC1A68BB46E932FB3B949F56C201",
    "audit_rank8_delta23_e3_cubic_mixed_newton_i256_root.py": "702244F51CBD3CEB500B4C935C06D10B8AA1AD5E0EC3BBF1EFB51015C8966B3E",
}


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def delta23(core, deleted):
    r1 = residual(core, deleted, 1)
    r2 = residual(core, deleted, 2)
    r3 = residual(core, deleted, 3)
    r4 = residual(core, deleted, 4)
    return r3 - 2 * r2 + r1, r4 - 3 * r3 + 3 * r2 - r1


def main() -> None:
    actual = {name: sha256(ROOT / name) for name in EXPECTED}
    assert actual == EXPECTED
    primary = json.loads(PRIMARY.read_text(encoding="utf-8"))
    delta01 = json.loads(DELTA01.read_text(encoding="utf-8"))
    delta01_audit = json.loads(DELTA01_AUDIT.read_text(encoding="utf-8"))
    assert primary["status"] == "PASS_EXACT_RANK8_DELTA23_E3_QUARTIC_STARS_ALL_ROOTS_N27_N36"
    assert delta01_audit["status"] == "PASS_INDEPENDENT_LITERAL_DP_RANK8_DELTA01_E3_QUARTIC_STARS_N27_N36"
    assert primary["totals"] == delta01["totals"] == {
        "canonical_cores": 2208,
        "rooted_rows": 71257,
    }
    delta01_by_order = {row["order"]: row for row in delta01["orders"]}
    replays = []
    for row in primary["orders"]:
        order = row["order"]
        assert row["canonical_cores"] == delta01_by_order[order]["canonical_cores"]
        assert row["rooted_rows"] == delta01_by_order[order]["rooted_rows"]
        for rank in (2, 3):
            witness = row["minimum_witnesses"][str(rank)]
            arms = tuple(witness["arms"])
            adjacency, descriptors = build_star(arms)
            assert len(adjacency) == order
            assert descriptors[witness["root"]] == tuple(witness["root_descriptor"])
            core = forest_polynomial(adjacency)
            deleted = forest_polynomial(adjacency, witness["root"])
            values = delta23(core, deleted)
            expected = row["minimum_values"][str(rank)]
            assert core == witness["core"] and deleted == witness["deleted"]
            assert values[rank - 2] == expected == witness["value"] > 0
            replays.append({
                "order": order,
                "rank": rank,
                "arms": list(arms),
                "root": witness["root"],
                "expected_and_replayed_minimum": expected,
            })
    payload = {
        "schema": "rank8-delta23-e3-quartic-stars-n27-n36-independent-audit-root-v1",
        "status": "PASS_INDEPENDENT_RANK8_DELTA23_E3_QUARTIC_STARS_N27_N36_AUDIT",
        "coverage": {
            **primary["totals"],
            "orders": 10,
            "literal_minimum_replays": len(replays),
            "negative_or_zero_Delta2": 0,
            "negative_or_zero_Delta3": 0,
        },
        "enumeration_cross_check": {
            "delta01_report": DELTA01.name,
            "delta01_independent_audit": DELTA01_AUDIT.name,
            "per_order_counts_match": True,
        },
        "literal_minimum_replays": replays,
        "immutable_inputs": actual,
        "source_sha256": sha256(Path(__file__)),
        "scope_warning": "Finite quartic-star Delta2/Delta3 only; no all-order or broader connected claim is made.",
    }
    OUTPUT.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    print(payload["status"])
    print("SOURCE", payload["source_sha256"])
    print("OUTPUT", sha256(OUTPUT))


if __name__ == "__main__":
    main()
