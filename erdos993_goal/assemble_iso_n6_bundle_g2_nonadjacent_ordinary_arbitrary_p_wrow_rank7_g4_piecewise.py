#!/usr/bin/env python3
"""Freeze the exact arbitrary-p W-row closure for one rank-six G2 shard.

The scope is deliberately narrow: N>=20, nonadjacent ordinary parent,
common0/high-near-high-edge/B00/C00/D20, with the exact ratio-floor
parameterization.  This does not claim universal rank-six G2.
"""

from __future__ import annotations

import hashlib
import json
from pathlib import Path


HERE = Path(__file__).resolve().parent
OUTPUT = HERE / (
    "iso_n6_bundle_g2_nonadjacent_ordinary_arbitrary_p_wrow_assembled_"
    "exact_rank7_g4_piecewise_20260831.json"
)
MARKER = (
    "PASS_EXACT_ISO_N6_BUNDLE_G2_NONADJACENT_ORDINARY_ARBITRARY_P_"
    "WROW_ASSEMBLED_RANK7_G4_PIECEWISE"
)

BASE_SOURCE = HERE / (
    "probe_iso_n6_bundle_g2_nonadjacent_ordinary_wedge_simplex_flint_root.py"
)
BASE_SOURCE_SHA256 = (
    "8A37537B2CB5978F309039C2675DFFAC3D55DF0743712760BCBE1C8D2A97E67E"
)
ENDPOINT_SOURCE = HERE / (
    "probe_iso_n6_bundle_g2_nonadjacent_ordinary_deletion_recurrence_caps_"
    "rank7_g4_piecewise.py"
)
ENDPOINT_SOURCE_SHA256 = (
    "5ED3837155F5793D333C61CDA7176ABF6BD3B239B403A5289A5C268AA343695B"
)
LOSS = HERE / (
    "iso_n6_bundle_g2_nonadjacent_ordinary_parent_loss_exact_root_20260831.json"
)
LOSS_SHA256 = (
    "9136FFABFE8BA82A646C9D49991A0883A5D6979863A89F36ADB4BB7E8F43FBF6"
)
RATIO_FLOOR = HERE / (
    "iso_n6_bundle_g2_nonadjacent_ordinary_pw2_ratio_floor_exact_root_20260831.json"
)
RATIO_FLOOR_SHA256 = (
    "A6EA8DB36702DED69ADEE4C8D6CC7D5F3B78D65EC0625F7859D69743F5BD25FA"
)
ZERO = HERE / (
    "iso_n6_bundle_g2_nonadjacent_ordinary_ratio_floor_split_pw3_wedge_"
    "common0_high_near_highedge_B00_C00_D20_zero_N20_ratiofloor_"
    "flint_probe_root_20260831.json"
)
ZERO_SHA256 = (
    "BF0497E178E345A33BD8B943E450EB908C4051013D42610A84ADA269338B4667"
)
EDGELESS = HERE / (
    "iso_n6_bundle_g2_nonadjacent_ordinary_deletion_recurrence_caps_"
    "common0_high_near_highedge_B00_C00_D20_forest_edgeless_endpoint_"
    "ratiofloor_rank7_g4_piecewise_20260831.json"
)
EDGELESS_SHA256 = (
    "87F94EE9A678F776A259481EBBD6A49CD7E72352DA4C59FF83F297E617EF004C"
)
STAR = HERE / (
    "iso_n6_bundle_g2_nonadjacent_ordinary_deletion_recurrence_caps_"
    "common0_high_near_highedge_B00_C00_D20_forest_star_endpoint_"
    "ratiofloor_rank7_g4_piecewise_20260831.json"
)
STAR_SHA256 = (
    "A644AAC4FA70820BE507641F988B54B84F208E0ED9E2CFD3938D01B87AB0E4C3"
)


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def load(path: Path, expected_hash: str) -> dict:
    assert sha256(path) == expected_hash, path
    return json.loads(path.read_text(encoding="utf-8"))


def validate_common(report: dict) -> None:
    assert report["geometry"] == "common0"
    assert report["order_chart"] == "high_near_highedge"
    assert report["B_mask"] == 0
    assert report["C_mask"] == 0
    assert report["D2_mask"] == 0
    assert report["negative_lower_controls"] == 0
    assert report["negative_sign_controls"] == 0
    assert report["ordinary_lower_certificate"]["negative"] == 0
    assert all(
        certificate["negative"] == 0
        for certificate in report["sign_certificates"].values()
    )
    assert report["ratio_floor_parameterization"] == (
        "u4=2t/3 and ui=(1-2t/3)ri for i=0..3, sum ri=1"
    )


def main() -> None:
    assert sha256(BASE_SOURCE) == BASE_SOURCE_SHA256
    assert sha256(ENDPOINT_SOURCE) == ENDPOINT_SOURCE_SHA256
    loss = load(LOSS, LOSS_SHA256)
    ratio_floor = load(RATIO_FLOOR, RATIO_FLOOR_SHA256)
    zero = load(ZERO, ZERO_SHA256)
    edgeless = load(EDGELESS, EDGELESS_SHA256)
    star = load(STAR, STAR_SHA256)

    assert loss["marker"] == (
        "DERIVED_EXACT_ISO_N6_BUNDLE_G2_NONADJACENT_ORDINARY_PARENT_LOSS_ROOT"
    )
    assert ratio_floor["marker"] == (
        "PASS_EXACT_ISO_N6_BUNDLE_G2_NONADJACENT_ORDINARY_PW2_RATIO_FLOOR_ROOT"
    )
    assert zero["marker"] == (
        "PROBE_EXACT_ISO_N6_BUNDLE_G2_NONADJACENT_ORDINARY_RATIO_FLOOR_"
        "SPLIT_PW3_WEDGE_FLINT_ROOT"
    )
    assert zero["source_sha256"] == BASE_SOURCE_SHA256
    assert zero["loss_report_sha256"] == LOSS_SHA256
    assert zero["ratio_floor_report_sha256"] == RATIO_FLOOR_SHA256
    assert zero["W_parent_endpoint_mode"] == "zero"
    assert zero["scope"].startswith("N>=20,")
    validate_common(zero)

    endpoint_marker = (
        "PROBE_EXACT_ISO_N6_BUNDLE_G2_NONADJACENT_ORDINARY_DELETION_"
        "RECURRENCE_CAPS_RANK7_G4_PIECEWISE"
    )
    for report, endpoint in ((edgeless, "edgeless"), (star, "star")):
        assert report["marker"] == endpoint_marker
        assert report["source_sha256"] == ENDPOINT_SOURCE_SHA256
        assert report["base_source_sha256"] == BASE_SOURCE_SHA256
        assert report["base_loss_report_sha256"] == LOSS_SHA256
        assert report["base_ratio_floor_report_sha256"] == RATIO_FLOOR_SHA256
        assert report["base_order"] == 20
        assert report["scope"].startswith("N>=20,")
        assert report["W_parent_endpoint_mode"] == (
            f"arbitrary_p_forest_{endpoint}_endpoint"
        )
        assert report["W_parent_deletion_identity"] == (
            "I(A,x)=I(A-p,x)+x*I(A-N[p],x)"
        )
        reduction = report["W_parent_forest_row_reduction"]
        assert reduction["checked_endpoint"] == endpoint
        assert reduction["checked_order"] == "t=N-1"
        assert reduction["wedge_cap"] == "0<=omega<=C(f,2)"
        assert report["sign_certificates"]["PW2_GLOBAL_POSITIVE"]["negative"] == 0
        assert report["sign_certificates"]["PW4"]["negative"] == 0
        validate_common(report)

    rows = []
    for label, path, digest, report in (
        ("zero", ZERO, ZERO_SHA256, zero),
        ("edgeless", EDGELESS, EDGELESS_SHA256, edgeless),
        ("star", STAR, STAR_SHA256, star),
    ):
        certificate = report["ordinary_lower_certificate"]
        rows.append({
            "case": label,
            "report": path.name,
            "report_sha256": digest,
            "minimum": certificate["minimum"],
            "simplex_coefficients": certificate["simplex_coefficients"],
            "bernstein_coefficients": sum(
                row["bernstein_coefficients"] for row in certificate["records"]
            ),
            "ordered_record_sha256": certificate["ordered_record_sha256"],
        })

    assembled = {
        "marker": MARKER,
        "status": (
            "proved exact for the stated N>=20 ratio-floor shard; arbitrary-p "
            "W-row correlation closed; no universal rank-six G2 claim"
        ),
        "scope": (
            "rank-six G2, nonadjacent marks, ordinary parent, common0/"
            "high-near-high-edge/B00/C00/D20, N>=20"
        ),
        "exact_reduction": {
            "deletion": "I(A)=I(A-p)+xI(Q), Q=A-N[p]",
            "forest_parameters": (
                "t=|Q|, f=e(Q), omega=sum_v C(deg_Q(v),2)"
            ),
            "row_identities": [
                "PW2=t",
                "PW3=C(t,2)-f",
                "PW4=C(t,3)-f(t-2)+omega",
            ],
            "wedge_cap": "omega<=C(f,2)",
            "edge_reduction": (
                "PW4<=0 makes the paid expression concave in f, so f=0 or f=t-1"
            ),
            "order_reduction": (
                "for either edge endpoint, first differences are a concave "
                "sequence with initial value PW2>=0; hence no interior minimum"
            ),
            "exhaustive_cases": ["t=0", "f=0,t=N-1", "f=t-1,t=N-1"],
        },
        "coverage_gap_within_W_parent_row": None,
        "universal_G2_coverage_gap": (
            "all other nonadjacent ordinary-parent geometry/chart/corner shards, "
            "other parent modes, finite N<20 assembly, and universal replay"
        ),
        "dependencies": {
            BASE_SOURCE.name: BASE_SOURCE_SHA256,
            ENDPOINT_SOURCE.name: ENDPOINT_SOURCE_SHA256,
            LOSS.name: LOSS_SHA256,
            RATIO_FLOOR.name: RATIO_FLOOR_SHA256,
        },
        "rows": rows,
        "negative_lower_controls": 0,
        "negative_sign_controls": 0,
        "source_sha256": sha256(Path(__file__)),
    }
    raw = json.dumps(assembled, indent=2, sort_keys=True) + "\n"
    OUTPUT.write_text(raw, encoding="utf-8", newline="\n")
    print(json.dumps({
        "marker": MARKER,
        "status": assembled["status"],
        "cases": [row["case"] for row in rows],
        "coverage_gap_within_W_parent_row": None,
    }, indent=2, sort_keys=True))
    print("SOURCE_SHA256", assembled["source_sha256"])
    print("REPORT_SHA256", hashlib.sha256(raw.encode()).hexdigest().upper())
    print(MARKER)


if __name__ == "__main__":
    main()
