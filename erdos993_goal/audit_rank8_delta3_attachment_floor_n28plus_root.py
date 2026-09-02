#!/usr/bin/env python3
"""Independent algebra and manifest audit of the assembled n>=28 Delta3 gate."""

from __future__ import annotations

import hashlib
import json
import os
from pathlib import Path

import sympy as sp


HERE = Path(__file__).resolve().parent
OUTPUT = HERE / (
    "rank8_delta3_attachment_floor_n28plus_"
    "independent_audit_root_20260825.json"
)
EXPECTED = {
    "assemble_rank8_delta3_attachment_floor_n28plus_root.py": "C6D547949116DCF726BDEA1F7994CB88E997C15B8C904496565F747F881C2301",
    "rank8_delta3_attachment_floor_n28plus_assembled_root_20260825.json": "0328FF3EB1690F40A68E3CE618C2B6189BD0EBADA6A61E37EB8AC639EA6EFFEF",
    "rank8_delta3_lcross_k1_attachment_floor_n28plus_exact_agent_20260825.json": "C195C2B3E1EE9542ADA98BAF28496BDD71F0F8A1FEBCAAE6D6166F82A74A9BAA",
    "rank8_delta3_lcross_k7_attachment_floor_n28plus_exact_agent_20260825.json": "A4D1341BA9328B27D040D4AB1A14CB09ABF047803E026FB8170B7B7AE2D80BEA",
    "rank8_delta3_ucap_k1_attachment_floor_n28plus_exact_agent_20260825.json": "9FF88BC019B8564E383774400A4DFF55F68769BE49F8B2292CC97CC5A275176E",
    "rank8_delta3_ucap_k7_attachment_floor_n28plus_exact_agent_20260825.json": "7293186F612ED942DB4FB7ABC3A23FA7A9E741302C0AD69EE563260BA4C6B0C7",
    "rank8_delta23_live_path_attachment_floor_box_mappings_independent_audit_agent_20260825.json": "4EA7C717C4F8C85699E77847E298CD0C47E38766D7D94C1EAFEFCBDC2A5F77DB",
    "rank8_q8_terminal_delta3_bounded_reduction_exact_20260820.json": "EBEF5AF8A1AF594C6C701C5A340F1F56595616F7A5EF0A53197CBE6D0DA9CC26",
    "rank8_root_deletion_attachment_floor_independent_audit_root_20260825.json": "9F691B70DB4240B056EE92D1424D2A9269DF0224C9CE9A22A2C2F00EA89B8C9D",
}


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def load(name: str) -> dict[str, object]:
    return json.loads((HERE / name).read_text(encoding="utf-8"))


def main() -> None:
    actual = {name: sha256(HERE / name) for name in EXPECTED}
    assert actual == EXPECTED, (actual, EXPECTED)
    assembled = load(
        "rank8_delta3_attachment_floor_n28plus_assembled_root_20260825.json"
    )
    mapping = load(
        "rank8_delta23_live_path_attachment_floor_box_mappings_"
        "independent_audit_agent_20260825.json"
    )
    reduction = load(
        "rank8_q8_terminal_delta3_bounded_reduction_exact_20260820.json"
    )
    floor_audit = load(
        "rank8_root_deletion_attachment_floor_independent_audit_root_20260825.json"
    )
    assert assembled["status"] == (
        "PASS_EXACT_RANK8_DELTA3_TERMINAL_GATE_FOR_ALL_ROOTED_TREES_N28_PLUS"
    )
    assert mapping["status"] == (
        "PASS_INDEPENDENT_EXACT_DELTA23_ATTACHMENT_FLOOR_BOX_MAPPING_AUDIT"
    )
    assert reduction["status"] == (
        "PASS_EXACT_RANK8_TERMINAL_DELTA3_BOUNDED_REDUCTION_WITH_ENCLOSURE_OBSTRUCTION"
    )
    assert floor_audit["status"] == "PASS_INDEPENDENT_ROOT_DELETION_ATTACHMENT_FLOOR_AUDIT"

    # Rebuild the compactified attachment floor without importing either
    # tensor producer or its mapping audit.
    T, Zc = sp.symbols("T Zc", nonnegative=True)
    t = T / 28
    p = 1 - 19 * t
    q = 7 * t
    d = 1 - 12 * t
    Z = sp.cancel((p + q * Zc) / d)
    assert sp.expand(p + q - d) == 0
    assert sp.factor(Z.subs({T: 1, Zc: 0})) == sp.Rational(9, 16)
    assert sp.factor(Z.subs(Zc, 1)) == 1
    assert sp.limit(Z.subs(Zc, 0), T, 0, dir="+") == 1
    assert p.subs(T, 1) > 0 and d.subs(T, 1) > 0

    # Rebuild the two path ratio identities.
    a, root_q, c6, z = sp.symbols("a root_q c6 z", positive=True)
    c7 = a * root_q * c6 / 6
    lower_cross_ratio = sp.cancel(c7 * z / c7)
    upper_capacity_s = 7 * root_q * z / 6
    upper_capacity_ratio = sp.cancel((a * upper_capacity_s * c6 / 7) / c7)
    assert lower_cross_ratio == upper_capacity_ratio == z

    combinations = set()
    positive = 0
    report_rows = []
    for row in assembled["tensor_rows"]:
        name = row["report"]
        report = load(name)
        key = (report["D6_k"], report["capacity_piece"])
        assert key == (row["D6_k"], row["capacity_piece"])
        assert report["status"] == "PASS_EXACT_DELTA3_LIVE_PATH_WITH_ATTACHMENT_FLOOR"
        assert report["coefficient_sign_counts"]["negative"] == 0
        assert report["coefficient_sign_counts"]["zero"] == 0
        assert report["coefficient_sign_counts"]["positive"] == report[
            "bernstein_coefficients"
        ] == 2_135_484
        assert row["report_sha256"] == actual[name]
        combinations.add(key)
        positive += report["bernstein_coefficients"]
        report_rows.append({
            "D6_k": key[0],
            "capacity_piece": key[1],
            "ordered_coefficient_count": report["bernstein_coefficients"],
            "negative": 0,
            "zero": 0,
            "report_sha256": actual[name],
        })
    assert combinations == {(1, "lcross"), (1, "ucap"), (7, "lcross"), (7, "ucap")}
    assert positive == 8_541_936
    assert assembled["aggregate"] == {
        "boxes": 4, "coefficients": positive,
        "negative": 0, "zero": 0, "positive": positive,
    }
    assert reduction["remaining_bounded_families"]["D6_endpoints"] == [1, 7]
    assert mapping["endpoint_coverage"] == {
        "h7_zero_faces": "excluded for n>=28 by the strict floor",
        "full_root": "included by lower-cross at Zc=1",
        "upper_junction": "included by upper-capacity at Zc=1",
    }

    payload = {
        "schema": "rank8-delta3-attachment-floor-n28plus-independent-audit-v1",
        "status": (
            "PASS_INDEPENDENT_EXACT_RANK8_DELTA3_TERMINAL_GATE_"
            "FOR_ALL_ROOTED_TREES_N28_PLUS"
        ),
        "verified": [
            "the compactified attachment-floor map is reconstructed exactly and has positive denominator",
            "both root-capacity path coordinates equal h7/c7",
            "the four reports are exactly the Cartesian product of k={1,7} and {lower-cross,upper-capacity}",
            "all 8,541,936 exact Bernstein coefficients are strictly positive",
            "the h7=0 face is excluded while the full-root and upper-junction endpoints are included",
            "the structural rank-six concavity reduction leaves exactly the two audited defect endpoints",
        ],
        "independent_floor_map": {
            "t": str(t), "p": str(sp.factor(p)), "q": str(sp.factor(q)),
            "d": str(sp.factor(d)), "Z": str(sp.factor(Z)),
            "n28_floor": "9/16", "upper_endpoint": "1",
        },
        "independent_path_ratios": {
            "lower_cross": str(lower_cross_ratio),
            "upper_capacity": str(upper_capacity_ratio),
        },
        "tensor_rows": report_rows,
        "aggregate": assembled["aggregate"],
        "proof_boundary": assembled["proof_boundary"],
        "pinned_inputs": actual,
        "source_sha256": sha256(Path(__file__)),
    }
    temporary = OUTPUT.with_suffix(OUTPUT.suffix + ".tmp")
    temporary.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    os.replace(temporary, OUTPUT)
    print(payload["status"])
    print("COEFFICIENTS", positive)
    print("SOURCE", sha256(Path(__file__)))
    print("REPORT", sha256(OUTPUT))


if __name__ == "__main__":
    main()
