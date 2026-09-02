#!/usr/bin/env python3
"""Independent literal audit of the finite cubic Delta2/Delta3 census."""

from __future__ import annotations

import hashlib
import json
from pathlib import Path

from audit_rank8_delta23_e3_cubic_mixed_newton_i256_root import (
    forest_polynomial,
    residual,
)


ROOT = Path(__file__).resolve().parent
REPORT = ROOT / "rank8_delta23_e3_cubic_skeleton_n27_n36_exact_root_20260823.json"
DELTA01_REPORT = ROOT / "rank8_delta01_e3_cubic_skeleton_n27_n36_exact_agent_20260822.json"
DELTA01_AUDIT = ROOT / "rank8_delta01_e3_cubic_skeleton_n27_n36_independent_audit_agent_20260822.json"
OUTPUT = ROOT / "rank8_delta23_e3_cubic_skeleton_n27_n36_independent_audit_root_20260823.json"
EXPECTED = {
    REPORT.name: "5E1B7899CC32F789319DB643932FF23FF3758BD5AEE54C452AA7882518DC6E6D",
    DELTA01_REPORT.name: "81DF2C8EA2B8BD8EEED04F1C4C25A8101174B67DA44D255D2C6F9DB5632527D8",
    DELTA01_AUDIT.name: "42DDF19A1AFB20C46C59B126F7D5D3614060F11AEB04C77E4E22D4CDB9CF03E4",
    "run_rank8_delta23_e3_cubic_skeleton_n27_n36_i256_root.py": "3D9DFD39FE038AC6E7D5694FC7037E9F038DC5343F5EBBB8DF0413C02883BC4F",
    "verify_rank8_delta23_e3_cubic_skeleton_order_i256_root.rs": "85341DD4AC11551EBBC55A5F707A9369B25CD0B33424EBDCB5B786D18DBF2DC7",
    "verify_rank8_delta23_e3_cubic_skeleton_order_i256_root.exe": "97F3CE2B556418334F5751D83BDBB31C03B1334EA4DED369EF286E66421733FD",
    "audit_rank8_delta23_e3_cubic_mixed_newton_i256_root.py": "702244F51CBD3CEB500B4C935C06D10B8AA1AD5E0EC3BBF1EFB51015C8966B3E",
}


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def canonical(lengths: tuple[int, ...]) -> bool:
    u, v, a1, a2, _, b1, b2 = lengths
    return a1 <= a2 and b1 <= b2 and (a1, a2, u) <= (b1, b2, v)


def subdivision(lengths: tuple[int, ...]):
    edges = ((0, 1), (1, 2), (0, 3), (0, 4), (1, 5), (2, 6), (2, 7))
    order = 1 + sum(lengths)
    adjacency = [[] for _ in range(order)]
    next_vertex = 8
    for (left, right), length in zip(edges, lengths, strict=True):
        previous = left
        for _ in range(1, length):
            vertex = next_vertex
            next_vertex += 1
            adjacency[previous].append(vertex)
            adjacency[vertex].append(previous)
            previous = vertex
        adjacency[previous].append(right)
        adjacency[right].append(previous)
    assert next_vertex == order
    return adjacency


def delta23(core: list[int], deleted: list[int]):
    r1 = residual(core, deleted, 1)
    r2 = residual(core, deleted, 2)
    r3 = residual(core, deleted, 3)
    r4 = residual(core, deleted, 4)
    return r3 - 2 * r2 + r1, r4 - 3 * r3 + 3 * r2 - r1


def main() -> None:
    actual = {name: sha256(ROOT / name) for name in EXPECTED}
    assert actual == EXPECTED
    report = json.loads(REPORT.read_text(encoding="utf-8"))
    delta01 = json.loads(DELTA01_REPORT.read_text(encoding="utf-8"))
    delta01_audit = json.loads(DELTA01_AUDIT.read_text(encoding="utf-8"))
    assert report["status"] == "PASS_EXACT_RANK8_DELTA23_E3_CUBIC_SKELETON_ALL_ROOTS_N27_N36"
    assert delta01["status"] == "PASS_EXACT_RANK8_DELTA01_E3_CUBIC_SKELETON_ALL_ROOTS_N27_N36"
    assert delta01_audit["status"] == "PASS_INDEPENDENT_RANK8_DELTA01_E3_CUBIC_SKELETON_N27_N36_AUDIT"
    assert report["totals"] == {
        "canonical_cores": 953_954,
        "rooted_rows": 31_601_571,
        "negative_or_zero_Delta2": 0,
        "negative_or_zero_Delta3": 0,
    }
    delta01_by_order = {row["order"]: row for row in delta01["orders"]}
    replays = []
    for row in report["orders"]:
        order = row["order"]
        assert 27 <= order <= 36
        assert row["trees"] == delta01_by_order[order]["trees"]
        assert row["roots"] == delta01_by_order[order]["roots"]
        assert row["negative2"] == row["negative3"] == 0
        for rank in (2, 3):
            witness = row[f"witness{rank}"]
            lengths = tuple(witness["lengths"])
            assert sum(lengths) + 1 == order and canonical(lengths)
            adjacency = subdivision(lengths)
            core = forest_polynomial(adjacency)
            deleted = forest_polynomial(adjacency, witness["root"])
            values = delta23(core, deleted)
            assert core == witness["core"]
            assert deleted == witness["deleted"]
            expected = int(row[f"minimum{rank}"])
            assert values[rank - 2] == expected > 0
            replays.append({
                "order": order,
                "rank": rank,
                "lengths": list(lengths),
                "root": witness["root"],
                "expected_and_replayed_minimum": expected,
            })
        print("PASS", order, flush=True)

    payload = {
        "schema": "rank8-delta23-e3-cubic-skeleton-n27-n36-independent-audit-root-v1",
        "status": "PASS_INDEPENDENT_RANK8_DELTA23_E3_CUBIC_SKELETON_N27_N36_AUDIT",
        "coverage": {
            **report["totals"],
            "orders": 10,
            "literal_minimum_replays": len(replays),
        },
        "enumeration_cross_check": {
            "delta01_report": DELTA01_REPORT.name,
            "delta01_independent_audit": DELTA01_AUDIT.name,
            "per_order_counts_match": True,
        },
        "literal_minimum_replays": replays,
        "immutable_inputs": actual,
        "source_sha256": sha256(Path(__file__)),
        "scope_warning": "This audits only the finite n=27..36 cubic Delta2/Delta3 theorem. No all-order cubic, quartic-star, connected-Q8, forest-Q8, PGC, or Problem-993 claim is made.",
    }
    OUTPUT.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    print(payload["status"])
    print("SOURCE", payload["source_sha256"])
    print("OUTPUT", sha256(OUTPUT))


if __name__ == "__main__":
    main()
