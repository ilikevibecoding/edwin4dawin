#!/usr/bin/env python3
"""Assemble the audited middle and tail distance-six theorems."""

from __future__ import annotations

import hashlib
import json
from pathlib import Path


HERE = Path(__file__).resolve().parent
OUTPUT = HERE / (
    "terminal_q3_m0_marked_isolate_hub_distance6_double_broom_all_targets_"
    "exact_root_20260831.json"
)
NOTE = HERE / (
    "TERMINAL_Q3_M0_MARKED_ISOLATE_HUB_DISTANCE6_DOUBLE_BROOM_ALL_TARGETS_"
    "ROOT_2026-08-31.md"
)
MARKER = (
    "PASS_EXACT_ALL_SUPPORTED_TARGETS_TERMINAL_Q3_M0_MARKED_ISOLATE_"
    "HUB_DISTANCE6_DOUBLE_BROOM_ROOT"
)

J3_DEPENDENCY = {
    "source": "prove_terminal_q3_m0_marked_isolate_j3_all_order_root.py",
    "source_sha256": "8D39EE9ECDD3075053833C14B4A4ACCEADFB7174AC92C64D0F375826CCD6B558",
    "report": "terminal_q3_m0_marked_isolate_j3_all_order_exact_root_20260831.json",
    "report_sha256": "0E9D2C9F7338A87645D4EF3BE00008F6370C8B77084A823D451F84C0F08EDCBD",
    "note": "TERMINAL_Q3_M0_MARKED_ISOLATE_J3_ALL_ORDER_ROOT_2026-08-31.md",
    "note_sha256": "F3EC8E277C01A8629A79E2C6AEF8D0A37B282B6F33EA108492A9548408F8FAF7",
    "audit_source": "audit_terminal_q3_m0_marked_isolate_j3_finite_independent_root.py",
    "audit_source_sha256": "080287409B50AA5A8270BBAA05DCF6905B2D2E902C82B76BCDEF7F292252420D",
    "audit_report": "terminal_q3_m0_marked_isolate_j3_finite_independent_audit_root_20260831.json",
    "audit_report_sha256": "53CC4CCD34CCF0A33BEA72FF67CE108C1A9F9257B2B8380A7F052100306D4130",
    "status": "PASS_EXACT_ALL_ORDER_TERMINAL_Q3_M0_MARKED_ISOLATE_J3_ROOT",
    "audit_status": "PASS_INDEPENDENT_FINITE_TERMINAL_Q3_M0_MARKED_ISOLATE_J3_ROOT",
}

DEPENDENCIES = {
    "middle": {
        "source": (
            "prove_terminal_q3_m0_marked_isolate_hub_distance6_double_broom_"
            "middle_all_j_root.py"
        ),
        "source_sha256": "AF0564EC20CBD2523C66C18C9F58CBE168FC2C75A5BB50491910F110587B873C",
        "report": (
            "terminal_q3_m0_marked_isolate_hub_distance6_double_broom_middle_"
            "all_j_exact_root_20260831.json"
        ),
        "report_sha256": "1072A476ACADA3E7823886867746E2B07297A0853B11D548E70654B9D2D40D4F",
        "note": (
            "TERMINAL_Q3_M0_MARKED_ISOLATE_HUB_DISTANCE6_DOUBLE_BROOM_"
            "MIDDLE_ALL_J_ROOT_2026-08-31.md"
        ),
        "note_sha256": "CE4E858AB870340DD7BE02BD02BCC292D87EB536E64CB4CDAE4F28B8E24027DB",
        "audit_source": (
            "audit_terminal_q3_m0_marked_isolate_hub_distance6_double_broom_"
            "middle_independent_root.py"
        ),
        "audit_source_sha256": "F9BFD6FA155CA44B426EC3CBA5B1A2E6DA02C22C19D4D8161F9E65CC71EC588E",
        "audit_report": (
            "terminal_q3_m0_marked_isolate_hub_distance6_double_broom_middle_"
            "independent_audit_root_20260831.json"
        ),
        "audit_report_sha256": "605E3B2713929B6E4B4A577713078453516E464F0F38589B4928B4E2BBC1881D",
        "status": (
            "PASS_EXACT_MIDDLE_ALL_TARGET_TERMINAL_Q3_M0_MARKED_ISOLATE_"
            "HUB_DISTANCE6_DOUBLE_BROOM_ROOT"
        ),
        "audit_status": (
            "PASS_INDEPENDENT_EXACT_MIDDLE_TERMINAL_Q3_M0_MARKED_ISOLATE_"
            "HUB_DISTANCE6_DOUBLE_BROOM_ROOT"
        ),
    },
    "tail": {
        "source": (
            "prove_terminal_q3_m0_marked_isolate_hub_distance6_double_broom_"
            "tail_all_j_root.py"
        ),
        "source_sha256": "990F8D4D7042A80C0E1541605221635A2BC99396ECA79A79FB48B43811ED8F9D",
        "report": (
            "terminal_q3_m0_marked_isolate_hub_distance6_double_broom_tail_"
            "all_j_exact_root_20260831.json"
        ),
        "report_sha256": "A0FA9708CA733FF06BBC5EB3B7153D21E374D828E192553D0547469DA59F0122",
        "note": (
            "TERMINAL_Q3_M0_MARKED_ISOLATE_HUB_DISTANCE6_DOUBLE_BROOM_TAIL_"
            "ALL_J_ROOT_2026-08-31.md"
        ),
        "note_sha256": "CAEA8B6C49C111D7B5B426AAFF00332545D4FE6F49E743B0D84B0B3F013E8E40",
        "audit_source": (
            "audit_terminal_q3_m0_marked_isolate_hub_distance6_double_broom_"
            "tail_independent_root.py"
        ),
        "audit_source_sha256": "F9AC3CF9EEEEC18AAB0E0C55A563F711893DA61BD614C603482BB6692F0705E4",
        "audit_report": (
            "terminal_q3_m0_marked_isolate_hub_distance6_double_broom_tail_"
            "independent_audit_root_20260831.json"
        ),
        "audit_report_sha256": "841CD41BD90B9A1B31758FCC36CD44B3850EBB10A8CBB5291C715F5AE130E6FE",
        "status": (
            "PASS_EXACT_TAIL_ALL_TARGET_TERMINAL_Q3_M0_MARKED_ISOLATE_"
            "HUB_DISTANCE6_DOUBLE_BROOM_ROOT"
        ),
        "audit_status": (
            "PASS_INDEPENDENT_EXACT_TAIL_TERMINAL_Q3_M0_MARKED_ISOLATE_"
            "HUB_DISTANCE6_DOUBLE_BROOM_ROOT"
        ),
    },
}

EXPECTED_PARTITION = {
    "checks": 4370520,
    "j3_checks": 21660,
    "middle_checks": 1144780,
    "tail_checks": 3204080,
    "ordered_stream_sha256": "398A709EA7F5ADAB5975809C6A2086AE0EA8E4514CB81B587F694EF3DCA7031B",
}


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def verify_dependency(name: str, pin: dict) -> dict:
    for key in ("source", "report", "note", "audit_source", "audit_report"):
        path = HERE / pin[key]
        assert path.is_file(), (name, key, path)
        assert sha256(path) == pin[f"{key}_sha256"], (name, key, sha256(path))
    report = json.loads((HERE / pin["report"]).read_text(encoding="utf-8"))
    audit = json.loads((HERE / pin["audit_report"]).read_text(encoding="utf-8"))
    assert report["status"] == pin["status"]
    assert report["source_sha256"] == pin["source_sha256"]
    assert report["note_sha256"] == pin["note_sha256"]
    assert report["coverage_gap_within_scope"] is None
    assert audit["status"] == pin["audit_status"]
    assert audit["pinned_theorem"]["source_sha256"] == pin["source_sha256"]
    assert audit["pinned_theorem"]["report_sha256"] == pin["report_sha256"]
    assert audit["coverage_gap_within_theorem_scope"] is None
    return {
        "pins": pin,
        "theorem": report["theorem"],
        "report_scope_guard": report["scope_guard"],
        "audit_method": audit["independent_method"],
    }


def verify_j3_dependency() -> dict:
    pin = J3_DEPENDENCY
    for key in ("source", "report", "note", "audit_source", "audit_report"):
        path = HERE / pin[key]
        assert path.is_file(), ("j3", key, path)
        assert sha256(path) == pin[f"{key}_sha256"], ("j3", key, sha256(path))
    report = json.loads((HERE / pin["report"]).read_text(encoding="utf-8"))
    audit = json.loads((HERE / pin["audit_report"]).read_text(encoding="utf-8"))
    assert report["status"] == pin["status"]
    assert report["source_sha256"] == pin["source_sha256"]
    assert report["coverage_gap_within_scope"] is None
    assert audit["status"] == pin["audit_status"]
    assert audit["theorem_source_sha256"] == pin["source_sha256"]
    assert audit["theorem_report_sha256"] == pin["report_sha256"]
    assert audit["negative_delta_rows"] == 0
    return {
        "pins": pin,
        "theorem_scope": report["scope"],
        "audit_scope": audit["scope"],
        "audit_supported_rows": audit["supported_j3_rows"],
    }


def main():
    verified = {
        "j3": verify_j3_dependency(),
        **{
        name: verify_dependency(name, pin)
        for name, pin in DEPENDENCIES.items()
        },
    }

    partition_checks = 0
    partition_stream = hashlib.sha256()
    j3_checks = 0
    middle_checks = 0
    tail_checks = 0
    for b in range(1, 121):
        for a in range(b, 241):
            for target in range(3, a + b + 4):
                if target == 3:
                    j3_checks += 1
                    classification = "j3"
                elif b >= target - 2:
                    assert target <= b + 2
                    middle_checks += 1
                    classification = "middle"
                else:
                    assert target >= b + 3
                    tail_checks += 1
                    classification = "tail"
                partition_stream.update(
                    f"{a}|{b}|{target}|{classification}\n".encode()
                )
                partition_checks += 1

    assert partition_checks == EXPECTED_PARTITION["checks"]
    assert j3_checks == EXPECTED_PARTITION["j3_checks"]
    assert middle_checks == EXPECTED_PARTITION["middle_checks"]
    assert tail_checks == EXPECTED_PARTITION["tail_checks"]
    assert partition_stream.hexdigest().upper() == EXPECTED_PARTITION[
        "ordered_stream_sha256"
    ]

    payload = {
        "status": MARKER,
        "theorem": (
            "For every sorted distance-six double broom T_(a,b,6), a>=b>=1, "
            "the exact isolated-marked-root terminal-q3 Newton m=0 payment "
            "is nonnegative at every supported target 3<=j<=a+b+3, and is "
            "positive at every target j>=4."
        ),
        "dependencies": verified,
        "exact_integer_partition": {
            "boundary": "j=3",
            "middle": "b>=j-2, equivalently j<=b+2",
            "tail": "j>=b+3",
            "proof": (
                "After the separate j=3 boundary, every integer j>=4 satisfies "
                "exactly one of j<=b+2 and j>=b+3."
            ),
            "audit_rectangle": {
                "b_maximum": 120,
                "a_maximum": 240,
                "checks": partition_checks,
                "j3_checks": j3_checks,
                "middle_checks": middle_checks,
                "tail_checks": tail_checks,
                "ordered_stream_sha256": partition_stream.hexdigest().upper(),
            },
        },
        "coverage_gap_within_scope": None,
        "scope_guard": (
            "This closes one connected distance-six double-broom remainder "
            "family in the isolated-marked-root terminal-q3 m=0 lane. Other "
            "remainder forests, nonisolated marked roots, the complete "
            "terminal payment, and Erdos Problem 993 remain separate."
        ),
        "note": NOTE.name,
        "note_sha256": sha256(NOTE),
        "source_sha256": sha256(Path(__file__).resolve()),
    }
    OUTPUT.write_text(
        json.dumps(payload, indent=2, sort_keys=True) + "\n",
        encoding="utf-8",
        newline="\n",
    )
    print(
        json.dumps(
            {
                "status": MARKER,
                "partition_checks": partition_checks,
                "j3_checks": j3_checks,
                "middle_checks": middle_checks,
                "tail_checks": tail_checks,
                "partition_stream_sha256": partition_stream.hexdigest().upper(),
                "coverage_gap_within_scope": None,
            },
            indent=2,
            sort_keys=True,
        )
    )
    print("SOURCE_SHA256", payload["source_sha256"])
    print("REPORT_SHA256", sha256(OUTPUT))
    print(MARKER)


if __name__ == "__main__":
    main()
