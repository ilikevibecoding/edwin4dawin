#!/usr/bin/env python3
"""Fail-closed all-forest/all-root assembly for terminal-q3 Newton m=1."""

from __future__ import annotations

import hashlib
import json
from pathlib import Path


HERE = Path(__file__).resolve().parent
OUTPUT = HERE / "terminal_q3_m1_all_forest_all_roots_assembled_exact_root_20260831.json"

PINS = {
    "assemble_terminal_q3_m1_no_isolate_forest_all_j_root.py":
        "6275FBB718940724556CB41C9D9FFA2999D967EDD2BFA685AEC5DC8E8451A917",
    "terminal_q3_m1_no_isolate_forest_all_j_assembled_exact_root_20260831.json":
        "648A894B58038366BE0DF3BD44DCC2F98746AB810B338B528494B95372ACC9D8",
    "prove_terminal_q3_m1_permanent_isolate_activation_root.py":
        "44C59D853027EC5F7D9CFF677DAD921C76FC3D64B04B47783B5510CB0450EE8F",
    "terminal_q3_m1_permanent_isolate_activation_exact_root_20260831.json":
        "C01647EB7D4F5F3EBF8998517C72FD32AFFADBF0173FA534C07BA23B4A65CE82",
    "prove_terminal_q3_m1_marked_isolate_noisolate_remainder_root.py":
        "A05CF5B8A73D81D99A628F44019811F44210E85D9DE7050DB058CDBF1E1D22ED",
    "terminal_q3_m1_marked_isolate_noisolate_remainder_exact_root_20260831.json":
        "88790B8EC9513F2AD4EE3BE0AB41FF2FF477F9A51404939600A95796657E729D",
    "verify_terminal_payment_permanent_isolate_shift_agent.py":
        "40631FFC5863F3FBD24D8D4A197A8DA7A2B50931C6F680D3FD633D60F194DBCD",
    "terminal_payment_permanent_isolate_shift_exact_20260829.json":
        "F66D640F42D027C05DB92E9B78007063FEFF81B76D65F564E5D92C46C3B7F8BF",
    "audit_terminal_q3_low_newton_m2_forest_base_agent.py":
        "78DF5272D69C8137CE0EF78BDBAD24A8C858D0FD60EAA0734EBFF3351D5BF54E",
    "terminal_q3_low_newton_m2_forest_base_audit_20260829.json":
        "328F2A1486CB9A581A565862993380D37EDC91A27BC29924A99E6B970B7FFD69",
}


def digest(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def load(name: str) -> dict:
    return json.loads((HERE / name).read_text(encoding="utf-8"))


def main() -> None:
    observed = {name: digest(HERE / name) for name in PINS}
    assert observed == PINS

    no_isolate = load("terminal_q3_m1_no_isolate_forest_all_j_assembled_exact_root_20260831.json")
    activation = load("terminal_q3_m1_permanent_isolate_activation_exact_root_20260831.json")
    marked = load("terminal_q3_m1_marked_isolate_noisolate_remainder_exact_root_20260831.json")
    shift = load("terminal_payment_permanent_isolate_shift_exact_20260829.json")
    m2 = load("terminal_q3_low_newton_m2_forest_base_audit_20260829.json")

    assert no_isolate["status"] == (
        "PASS_EXACT_NO_ISOLATE_FOREST_ALL_TARGETS_TERMINAL_Q3_NEWTON_M1_ASSEMBLY"
    )
    assert activation["status"] == (
        "PASS_EXACT_TERMINAL_Q3_M1_PERMANENT_ISOLATE_ACTIVATION_NONISOLATED_ROOT"
    )
    assert marked["status"] == (
        "PASS_EXACT_TERMINAL_Q3_M1_MARKED_ISOLATE_NOISOLATE_REMAINDER"
    )
    assert shift["status"] == "PASS_EXACT_TERMINAL_PAYMENT_PERMANENT_ISOLATE_NEWTON_SHIFT"
    assert m2["status"] == "PASS_INDEPENDENT_EXACT_ALL_FOREST_BASE_TERMINAL_Q3_LOW_NEWTON_M2"
    assert activation["unsupported_target_lemma"]["factorization"] == (
        "delta(t)=(j+1)*a*A(t)*U(t)"
    )
    assert activation["unsupported_target_lemma"]["consequence"].startswith(
        "Every Newton coefficient of an unsupported-target payment is nonnegative"
    )
    assert activation["isolate_lift"]["identity"] == "d1(G+K1)=d1(G)+d2(G)"

    report = {
        "schema": "terminal-q3-m1-all-forest-all-roots-assembly-v1",
        "date": "2026-08-31",
        "status": "PASS_EXACT_ALL_FOREST_ALL_ROOTS_TERMINAL_Q3_NEWTON_M1_ASSEMBLY",
        "claim": (
            "For every finite forest base G, every marked vertex w, and every supported "
            "terminal target j>=3, the canonical terminal-q3 Newton coefficient m=1 is "
            "nonnegative, conditional only where stated on the strictly-smaller-forest "
            "q-envelope input."
        ),
        "exhaustive_root_partition": [
            {
                "case": "marked root nonisolated",
                "certificate": activation["status"],
                "logic": (
                    "Remove every permanent isolated component, use the all-target "
                    "no-isolate theorem or the root-agnostic unsupported-target lemma, "
                    "then restore isolates with d1(G+K1)=d1(G)+d2(G)."
                ),
            },
            {
                "case": "marked root isolated; supported after deleting other isolates",
                "certificate": marked["status"],
                "logic": (
                    "The reduced base is K1(w) disjoint_union R with every component of "
                    "R nontrivial; the marked-isolate all-order cone applies."
                ),
            },
            {
                "case": "marked root isolated; target initially unsupported",
                "certificate": "root-agnostic unsupported-target factorization",
                "logic": (
                    "The activation factorization uses only downward closure and arbitrary-"
                    "forest anchor rows, so it also applies when w is isolated. Restore "
                    "isolates until support appears; every pre-activation d1 and d2 is "
                    "nonnegative, and later stages use the all-forest m2 theorem."
                ),
            },
        ],
        "logical_exhaustion": (
            "Every marked vertex is isolated or nonisolated. After deleting all other "
            "isolated components, the remainder beside an isolated marked root is either "
            "empty or has only nontrivial components; supported and unsupported targets "
            "give the final disjoint split."
        ),
        "target_partition": "every supported integer j>=3; no target gap",
        "pins": PINS,
        "scope_guard": (
            "This closes Newton m=1 only. Newton m=0, the complete terminal payment, "
            "remaining rank-six/rank-seven propagation, final global proof assembly, "
            "unimodality, and Erdos Problem 993 remain separate obligations."
        ),
    }
    source_hash = digest(Path(__file__).resolve())
    report["source"] = Path(__file__).name
    report["source_sha256"] = source_hash
    OUTPUT.write_text(json.dumps(report, indent=2, sort_keys=True) + "\n", encoding="utf-8")
    report_hash = digest(OUTPUT)
    print(report["status"])
    print("SOURCE_SHA256", source_hash)
    print("REPORT_SHA256", report_hash)


if __name__ == "__main__":
    main()
