#!/usr/bin/env python3
"""Independent algebra and manifest audit of the assembled n>=35 Delta2 gate."""

from __future__ import annotations

import hashlib
import json
import os
from pathlib import Path

import sympy as sp


HERE = Path(__file__).resolve().parent
OUTPUT = HERE / (
    "rank8_delta2_attachment_floor_n35plus_"
    "independent_audit_root_20260826.json"
)
EXPECTED = {
    "assemble_rank8_delta2_attachment_floor_n35plus_root.py":
        "2D617B2C42C73BFD23B9F3DC840CDCBE4A21D092AD6E46C6A69A807DF6EC5693",
    "rank8_delta2_attachment_floor_n35plus_assembled_root_20260826.json":
        "A57332C57EA89C00C84069EBEC00D9D3B7186E55F90B345243EAFA75A2707E8E",
    "rank8_delta2_lcross_k1_attachment_floor_tail35_exact_root_20260826.json":
        "00860979907DF5E22F518944AB93596F03E83CD70300EA08C340D1887733B6F3",
    "rank8_delta2_lcross_k7_attachment_floor_n28plus_exact_agent_20260825.json":
        "E101B7FF7A56B4A58C3F07EB807355C5F90F2F3502782203BC0EC8CF43609108",
    "rank8_delta2_ucap_k1_attachment_floor_n28plus_exact_agent_20260825.json":
        "38EA3F7EA229A4B83E8700F539428997A190AA48B4D729B14BC498E7B28C6CBF",
    "rank8_delta2_ucap_k7_attachment_floor_n28plus_exact_agent_20260825.json":
        "21B03E592F1A74BF5B1096B58F798553DBD2F029DF71C289D0F8C1E9A0B86666",
    "rank8_delta2_lcross_k1_attachment_floor_tail35_independent_audit_root_20260826.json":
        "2C5145F40B600663AE77EAC37E5C20848EFBA9BC7F51913D50516CB527C13719",
    "rank8_delta23_live_path_attachment_floor_box_mappings_independent_audit_agent_20260825.json":
        "4EA7C717C4F8C85699E77847E298CD0C47E38766D7D94C1EAFEFCBDC2A5F77DB",
    "rank8_q8_terminal_delta2_reduction_exact_20260820.json":
        "3808552D9ED786FAB5B87E217E10121275769144B6600FB2570B051CF8C0496D",
    "rank8_root_deletion_attachment_floor_independent_audit_root_20260825.json":
        "9F691B70DB4240B056EE92D1424D2A9269DF0224C9CE9A22A2C2F00EA89B8C9D",
}


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def load(name: str) -> dict[str, object]:
    return json.loads((HERE / name).read_text(encoding="utf-8"))


def main() -> None:
    actual = {name: sha256(HERE / name) for name in EXPECTED}
    assert actual == EXPECTED, (actual, EXPECTED)
    assembled = load("rank8_delta2_attachment_floor_n35plus_assembled_root_20260826.json")
    reduction = load("rank8_q8_terminal_delta2_reduction_exact_20260820.json")
    mapping = load(
        "rank8_delta23_live_path_attachment_floor_box_mappings_"
        "independent_audit_agent_20260825.json"
    )
    tail_audit = load(
        "rank8_delta2_lcross_k1_attachment_floor_tail35_"
        "independent_audit_root_20260826.json"
    )
    floor_audit = load(
        "rank8_root_deletion_attachment_floor_independent_audit_root_20260825.json"
    )
    assert assembled["status"] == (
        "PASS_EXACT_RANK8_DELTA2_TERMINAL_GATE_FOR_ALL_ROOTED_TREES_N35_PLUS"
    )
    assert reduction["status"] == (
        "PASS_EXACT_RANK8_TERMINAL_DELTA2_REDUCTION_FOUR_LIVE_PATHS"
    )
    assert mapping["status"] == (
        "PASS_INDEPENDENT_EXACT_DELTA23_ATTACHMENT_FLOOR_BOX_MAPPING_AUDIT"
    )
    assert tail_audit["status"] == (
        "PASS_INDEPENDENT_DELTA2_LCROSS_K1_ATTACHMENT_FLOOR_TAIL35_AUDIT"
    )
    assert floor_audit["status"] == "PASS_INDEPENDENT_ROOT_DELETION_ATTACHMENT_FLOOR_AUDIT"

    # Reconstruct both compactified floor maps without tensor-source imports.
    T, Zc = sp.symbols("T Zc", nonnegative=True)
    floor_maps = {}
    for cutoff in (28, 35):
        t = T / cutoff
        p, q, d = 1 - 19 * t, 7 * t, 1 - 12 * t
        Z = sp.cancel((p + q * Zc) / d)
        assert sp.expand(p + q - d) == 0
        assert p.subs(T, 1) > 0 and d.subs(T, 1) > 0
        assert sp.factor(Z.subs(Zc, 1)) == 1
        floor_maps[str(cutoff)] = {
            "t": str(t), "p": str(sp.factor(p)), "q": str(sp.factor(q)),
            "d": str(sp.factor(d)),
            "lower_endpoint": str(sp.factor(Z.subs({T: 1, Zc: 0}))),
        }
    assert floor_maps["28"]["lower_endpoint"] == "9/16"
    assert floor_maps["35"]["lower_endpoint"] == "16/23"

    # Reconstruct both live path ratio identities.
    a, root_q, c6, Z = sp.symbols("a root_q c6 Z", positive=True)
    c7 = a * root_q * c6 / 6
    lower_cross = sp.cancel(c7 * Z / c7)
    upper_S = 7 * root_q * Z / 6
    upper_capacity = sp.cancel((a * upper_S * c6 / 7) / c7)
    assert lower_cross == upper_capacity == Z

    expected_names = {
        (1, "lcross"): "rank8_delta2_lcross_k1_attachment_floor_tail35_exact_root_20260826.json",
        (7, "lcross"): "rank8_delta2_lcross_k7_attachment_floor_n28plus_exact_agent_20260825.json",
        (1, "ucap"): "rank8_delta2_ucap_k1_attachment_floor_n28plus_exact_agent_20260825.json",
        (7, "ucap"): "rank8_delta2_ucap_k7_attachment_floor_n28plus_exact_agent_20260825.json",
    }
    combinations = set()
    positive = 0
    rows = []
    for row in assembled["tensor_rows"]:
        key = (row["D6_k"], row["capacity_piece"])
        name = row["report"]
        assert name == expected_names[key]
        report = load(name)
        assert report["D6_k"] == key[0] and report["capacity_piece"] == key[1]
        assert report["coefficient_sign_counts"] == {
            "negative": 0, "zero": 0, "positive": 2_313_441,
        }
        assert report["bernstein_coefficients"] == 2_313_441
        assert sp.Rational(report["minimum"]) > 0
        assert row["report_sha256"] == actual[name]
        combinations.add(key)
        positive += report["bernstein_coefficients"]
        rows.append({
            "D6_k": key[0], "capacity_piece": key[1],
            "coefficient_count": report["bernstein_coefficients"],
            "minimum_positive": True, "report_sha256": actual[name],
        })
    assert combinations == set(expected_names)
    assert positive == 9_253_764
    assert assembled["aggregate"] == {
        "boxes": 4, "coefficients": positive,
        "negative": 0, "zero": 0, "positive": positive,
    }
    assert assembled["remaining_finite_band"] == (
        "orders 28 through 34 for k=1 lower-cross only"
    )

    payload = {
        "schema": "rank8-delta2-attachment-floor-n35plus-independent-audit-v1",
        "status": (
            "PASS_INDEPENDENT_EXACT_RANK8_DELTA2_TERMINAL_GATE_"
            "FOR_ALL_ROOTED_TREES_N35_PLUS"
        ),
        "verified": [
            "the rank-six reduction leaves exactly k=1 and k=7",
            "the root-capacity boundary leaves exactly lower-cross and upper-capacity",
            "both compactified attachment-floor maps are reconstructed exactly",
            "the four reports exhaust the endpoint/path Cartesian product",
            "all 9,253,764 exact Bernstein coefficients are reported strictly positive",
            "every exact reported minimum is positive",
            "the only remaining Delta2 band is k=1 lower-cross at orders 28..34",
        ],
        "independent_floor_maps": floor_maps,
        "independent_path_ratios": {
            "lower_cross": str(lower_cross), "upper_capacity": str(upper_capacity),
        },
        "tensor_rows": rows,
        "aggregate": assembled["aggregate"],
        "remaining_finite_band": assembled["remaining_finite_band"],
        "pinned_inputs": actual,
        "source_sha256": sha256(Path(__file__)),
    }
    temporary = OUTPUT.with_suffix(OUTPUT.suffix + ".tmp")
    temporary.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    os.replace(temporary, OUTPUT)
    print(payload["status"])
    print("COEFFICIENTS", positive)
    print("SOURCE", payload["source_sha256"])
    print("REPORT", sha256(OUTPUT))


if __name__ == "__main__":
    main()
