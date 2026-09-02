#!/usr/bin/env python3
"""Independent classification and dependency audit of the full e=3 theorem."""

from __future__ import annotations

import hashlib
import json
from pathlib import Path


ROOT = Path(__file__).resolve().parent
ASSEMBLY = "rank8_delta01_e3_complete_exact_agent_20260823.json"
EXPECTED = {
    ASSEMBLY: "155638908E41D9CD8122F5E8BFFAD76708992A8701D70C2CB539AAA2CDA27EE3",
    "assemble_rank8_delta01_e3_complete_agent.py": "17AAE8CD6A85E8DB89C5C06E041521F0FF68774E2AED85BD3E7555D6EAC3BC3A",
    "rank8_delta01_e3_quartic_star_reduction_exact_agent_20260822.json": "4584E6DD0A4C34A6283817BA1739D570E409670DBFB7BC0A0459C171FF4780D8",
    "rank8_delta01_e3_quartic_star_reduction_independent_audit_agent_20260822.json": "ACF88386C30C0FFECAC3505CDD5EBAAB9558993A62E0C0B76276F56E354F4199",
    "rank8_delta01_e3_quartic_star_complete_exact_agent_20260822.json": "BDF3E713D926E622AE725BA9ABD8D472B8C500E175D66506AA9CECF0FB363C10",
    "rank8_delta01_e3_cubic_complete_exact_agent_20260823.json": "3A51CDECE37E0F74DC147F034B6EFCBE3BA72907E1655DA6FA8D6C122F54C339",
    "rank8_delta01_e3_cubic_complete_independent_audit_agent_20260823.json": "C87471EC0153C0C4CF386861204BC57F3F15CB8E48927A25E653E8EC352BF024",
}


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def load(name: str) -> dict:
    return json.loads((ROOT / name).read_text(encoding="utf-8"))


def integer_partitions(total: int, allowed: tuple[int, ...], maximum: int | None = None):
    if total == 0:
        yield ()
        return
    upper = total if maximum is None else min(total, maximum)
    for value in sorted((x for x in allowed if x <= upper), reverse=True):
        for tail in integer_partitions(total - value, allowed, value):
            yield (value,) + tail


def main() -> None:
    actual = {name: sha256(ROOT / name) for name in EXPECTED}
    assert actual == EXPECTED
    assembly = load(ASSEMBLY)
    quartic = load("rank8_delta01_e3_quartic_star_complete_exact_agent_20260822.json")
    cubic = load("rank8_delta01_e3_cubic_complete_exact_agent_20260823.json")
    cubic_audit = load("rank8_delta01_e3_cubic_complete_independent_audit_agent_20260823.json")
    reduction = load("rank8_delta01_e3_quartic_star_reduction_exact_agent_20260822.json")
    reduction_audit = load("rank8_delta01_e3_quartic_star_reduction_independent_audit_agent_20260822.json")

    assert assembly["status"] == "PASS_EXACT_RANK8_DELTA01_E3_ALL_SKELETONS_N27_PLUS"
    assert quartic["status"] == "PASS_EXACT_RANK8_DELTA01_E3_QUARTIC_STAR_COMPLETE_N27_PLUS"
    assert cubic["status"] == "PASS_EXACT_RANK8_DELTA01_E3_CUBIC_COMPLETE_N27_PLUS"
    assert cubic_audit["status"] == "PASS_INDEPENDENT_RANK8_DELTA01_E3_CUBIC_COMPLETE_AUDIT"
    assert reduction_audit["status"] == "PASS_INDEPENDENT_SCOPE_AUDIT_RANK8_DELTA01_E3_QUARTIC_STAR_REDUCTION"

    # For a branching vertex of degree d>=3, the contribution to
    # e=sum binom(d-1,2) is triangular: 1,3,6,... .  At total e=3 only
    # the partitions 3 and 1+1+1 are possible.
    degree_contributions = {degree: (degree - 1) * (degree - 2) // 2 for degree in range(3, 10)}
    allowed = tuple(sorted({value for value in degree_contributions.values() if value <= 3}))
    assert allowed == (1, 3)
    partitions = sorted(set(integer_partitions(3, allowed)), reverse=True)
    assert set(partitions) == {(3,), (1, 1, 1)}
    inverse = {value: degree for degree, value in degree_contributions.items() if value <= 3}
    degree_patterns = [tuple(inverse[value] for value in partition) for partition in partitions]
    assert set(degree_patterns) == {(4,), (3, 3, 3)}

    # With one degree-four vertex the reduced tree is the unique four-arm star.
    # With three degree-three vertices their induced reduced tree must be a
    # three-vertex path; the two ends carry two leaves and the middle carries
    # one leaf, giving the unique five-leaf cubic skeleton.
    assert assembly["classification"]["unrooted_reduced_skeletons"] == 2
    types = {row["type"] for row in assembly["classification"]["skeletons"]}
    assert types == {"one degree-four vertex", "exactly three degree-three vertices"}
    assert assembly["classification"]["exhaustive"] is True
    assert reduction["classification"]["degree_surplus_definition"] == "e(A)=sum_v binom(deg(v)-1,2)"

    assert quartic["theorem"].startswith("For every rooted subdivision A of the four-arm star with |A|>=27")
    assert cubic["theorem"].startswith("For every rooted subdivision A of the five-leaf cubic skeleton")
    assert cubic["partition_accounting"]["no_gaps_or_duplicates"] is True
    assert cubic_audit["totals"]["mixed_remainder"] == 0

    ledger = assembly["connected_ledger_effect"]
    assert "e=2" in ledger["remaining_Delta0"] and "e>=4" in ledger["remaining_Delta0"]
    assert "e=2" in ledger["remaining_Delta1"] and "e>=4" in ledger["remaining_Delta1"]
    assert "e=2" in ledger["remaining_Delta2"] and "e>=3" in ledger["remaining_Delta2"]
    assert "e=2" in ledger["remaining_Delta3"] and "e>=3" in ledger["remaining_Delta3"]

    payload = {
        "schema": "rank8_delta01_e3_complete_independent_audit_agent_v1",
        "status": "PASS_INDEPENDENT_RANK8_DELTA01_E3_ALL_SKELETONS_AUDIT",
        "assembly": ASSEMBLY,
        "assembly_sha256": EXPECTED[ASSEMBLY],
        "classification_rederivation": {
            "degree_contributions_at_most_three": degree_contributions,
            "integer_partitions_of_three": [list(row) for row in partitions],
            "branch_degree_patterns": [list(row) for row in degree_patterns],
            "unique_reduced_skeletons": [
                "one degree-four vertex gives the four-arm star",
                "three degree-three vertices form a path and give the five-leaf cubic skeleton",
            ],
            "exhaustive": True,
        },
        "endpoint_checks": {
            "quartic_star_all_roots_n27_plus": True,
            "cubic_all_roots_n27_plus": True,
            "cubic_independent_coverage_audit": True,
        },
        "broader_connected_remainder_preserved": ledger,
        "immutable_inputs": actual,
        "source_sha256": sha256(Path(__file__)),
        "scope_warning": "This independently audits the e=3 Delta0/Delta1 theorem only. The explicitly preserved connected remainder prevents any connected-Q8, forest, rank-eight PGC, or Problem 993 claim.",
    }
    output = ROOT / "rank8_delta01_e3_complete_independent_audit_agent_20260823.json"
    output.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    print(payload["status"])
    print("SOURCE", payload["source_sha256"])
    print("OUTPUT", sha256(output))


if __name__ == "__main__":
    main()

