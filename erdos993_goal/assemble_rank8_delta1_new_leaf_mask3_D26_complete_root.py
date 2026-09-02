#!/usr/bin/env python3
"""Fail-closed assembly of the complete D=26 Delta1 mask-3 certificate."""

from __future__ import annotations

import hashlib
import json
import os
from pathlib import Path


HERE = Path(__file__).resolve().parent
OUTPUT = HERE / "rank8_delta1_new_leaf_mask3_D26_complete_root_20260826.json"
EXPECTED = {
    "certify_rank8_delta1_new_leaf_mask3_lower_small_f_root.py":
        "617F2C74C0A71F732DEF365702B6EF83010BE1A247ACF6FF6B6D62B76A6FC029",
    "audit_rank8_delta1_new_leaf_mask3_lower_small_f_root.py":
        "B4E9E28DF4A7353F1B810AA12B36B0254809DB7237B2BD8959ABC890F586F941",
    "certify_rank8_delta1_new_leaf_mask3_lower_exact_f_hybrid_root.py":
        "7D96BD915E3B8938CC06507CD9CFEC1118F44ECAD30BED40C7C8C70C986E1212",
    "audit_rank8_delta1_new_leaf_mask3_lower_exact_f_hybrid_root.py":
        "DB340797119A0AFD9ACA792F9BA89295E2A88FB567E7C535F45169288C68B648",
    "certify_rank8_delta1_new_leaf_mask3_lower_exact_q5_coupled_root.py":
        "BE1BBAF7B732A3C6F5BA30622E0DCEC16E38AB31849138B3A8F4DB2C064E4BF9",
    "audit_rank8_delta1_new_leaf_mask3_lower_exact_q5_coupled_root.py":
        "B24AB78AC8A6E5D8672EAD885E2B36FABBCB796DF7E931A7512DC507490C5706",
    "certify_rank8_delta1_new_leaf_mask3_lower_exact_forest_q5_root.py":
        "D7C75FA11EA76ABE2CA790645C0F8892B5102C005AEDF1B6DB314E8C92FF7C82",
    "audit_rank8_delta1_new_leaf_mask3_lower_exact_forest_q5_root.py":
        "E7AC431BE844CB873317B195B1F79BADC08A397BE4BCC641AA60786711C3675E",
    "certify_rank8_delta1_new_leaf_mask3_D26_F25_containment_q5_root.py":
        "D180C2AB7200CDAC2DBA4D115BDF298ADA23FD247AEBACBB34625EB498152CFE",
    "audit_rank8_delta1_new_leaf_mask3_D26_F25_containment_q5_root.py":
        "51A2850F8599BACA5D48893CD3DE18E07DAB34E2C7B6FE4E181D00D3CA82F399",
    "rank8_delta1_new_leaf_mask3_D26_smallF14_exact_root_20260826.json":
        "928B6A8FE421FED9D69D4013948F204432F38A61532D03FE1553991842777E9D",
    "rank8_delta1_new_leaf_mask3_D26_smallF14_independent_audit_root_20260826.json":
        "96CEBABB1B3D77DF55848DF357E833176BB1B93D92B60EBC0624B811F683B35A",
    "rank8_delta1_new_leaf_mask3_D26_F15_hybrid_exact_stable_root_20260826.json":
        "65571FC4EADBD9958A84EEC5D84BBF1413F07F89653EF600413F8AF15E92F9D1",
    "rank8_delta1_new_leaf_mask3_D26_F15_hybrid_independent_audit_root_20260826.json":
        "58BF6F6EE85996588A0887A6A5F039EFE950E8CC861CE6B5C3540EA70E95AA47",
    "rank8_delta1_new_leaf_mask3_D26_F16_hybrid_exact_root_20260826.json":
        "A942AF8F9908C57490AF31B9E841D89AD1E81B763D40006FBECA5ABDF930FC7E",
    "rank8_delta1_new_leaf_mask3_D26_F16_hybrid_independent_audit_root_20260826.json":
        "A6D2C0C940B652CA8A559D48C04960EC35028ED55F636BC49DA5C747AC3437B3",
    "rank8_delta1_new_leaf_mask3_D26_F17_hybrid_exact_root_20260826.json":
        "0F58CFA2DA0A6E943AD2BDD1F03567FEEAE28AA05109CA8FE8E387E99C46EDF5",
    "rank8_delta1_new_leaf_mask3_D26_F17_hybrid_independent_audit_root_20260826.json":
        "E0FB9DAC45D04E4D11C3A7A9443E9D1D24027BB1D4964C3F4849D5AEE9648A5D",
    "rank8_delta1_new_leaf_mask3_D26_F18_hybrid_exact_root_20260826.json":
        "218B65A9E6AAB53269071A7430332E57D24CD36FD1EAFBFAB195F75926B4106C",
    "rank8_delta1_new_leaf_mask3_D26_F18_hybrid_independent_audit_root_20260826.json":
        "61C834DB81002035A0B428C4EFB1E27A4B794B6D72C31DC331422209E4799549",
    "rank8_delta1_new_leaf_mask3_D26_F19_q5coupled_exact_stable_root_20260826.json":
        "55A99462D1600369640B2974A08460DA65C7A9D8988E7E908C91D99F3D5D556A",
    "rank8_delta1_new_leaf_mask3_D26_F19_q5coupled_independent_audit_root_20260826.json":
        "615477C222AB7D55E7E0D4315B2A96AE8BE292F94EFC42EC1AF93DEB0F3CBF96",
    "rank8_delta1_new_leaf_mask3_D26_F20_forestq5_exact_root_20260826.json":
        "5840037F14BED2D82EDD491CC811F23A31DD11B206E5241C8F4BD6045FAE6C9E",
    "rank8_delta1_new_leaf_mask3_D26_F20_forestq5_independent_audit_root_20260826.json":
        "D05057E21888727536EAF1867B1DCC65F47558F23A5614470A7B809CCB705A5D",
    "rank8_delta1_new_leaf_mask3_D26_F21_forestq5_exact_root_20260826.json":
        "19FF006B623A5DFC2F4F68C88C799A62F6E41CCC5BB3A7A63FCC808006BFBDF1",
    "rank8_delta1_new_leaf_mask3_D26_F21_forestq5_independent_audit_root_20260826.json":
        "51A09275680DE53002541C93AC822CB4BE60F8EE0196D0A397D69BDA5543AD94",
    "rank8_delta1_new_leaf_mask3_D26_F22_forestq5_exact_root_20260826.json":
        "4F53A824B2043AB9A6B6D9972D23B2B760C9B44D67AB3B38518DF4FA58FA0F85",
    "rank8_delta1_new_leaf_mask3_D26_F22_forestq5_independent_audit_root_20260826.json":
        "B2DFC9EECB1E6A3603150E0A826C6A68449610C8E2DB9ED411BB54578078E0E0",
    "rank8_delta1_new_leaf_mask3_D26_F23_forestq5_exact_root_20260826.json":
        "CFCBA20C992D6E648365143643B24DFCCEA68209EBB152FE6F5468BB69ADDFBF",
    "rank8_delta1_new_leaf_mask3_D26_F23_forestq5_independent_audit_root_20260826.json":
        "03AEE5EF33CC9A8BDAE759ABC06C205F4156DA2F4F861164C59B121DDD708EDF",
    "rank8_delta1_new_leaf_mask3_D26_F24_forestq5_exact_root_20260826.json":
        "AB621E714F08A3F2E4F9F5FBE223E14FE0EB7BA105F783EF5DAEEE4206972D7B",
    "rank8_delta1_new_leaf_mask3_D26_F24_forestq5_independent_audit_root_20260826.json":
        "C4A63AC26A5066BD4B47F91BEDC09A7547D3B04C3F89DD54AEC96442032283E2",
    "rank8_delta1_new_leaf_mask3_D26_F25_containmentq5_exact_root_20260826.json":
        "121E94CE3C2FC8AEBBB2EB7673025F1DCC09AF7648108FF5E40A826E9F697278",
    "rank8_delta1_new_leaf_mask3_D26_F25_containmentq5_independent_audit_root_20260826.json":
        "6102E99E13EC421DC7C67D6B10E82D0AA8D05B96671B4976744C822E74262F53",
}


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def load(name: str) -> dict[str, object]:
    return json.loads((HERE / name).read_text(encoding="utf-8"))


def main() -> None:
    actual = {name: sha256(HERE / name) for name in EXPECTED}
    assert actual == EXPECTED, (actual, EXPECTED)
    keys = ("regions", "coefficients", "negative", "zero", "positive")
    specifications = [
        (
            "small-0-14", 0, 14,
            "rank8_delta1_new_leaf_mask3_D26_smallF14_exact_root_20260826.json",
            "rank8_delta1_new_leaf_mask3_D26_smallF14_independent_audit_root_20260826.json",
            "PASS_EXACT_DELTA1_NEW_LEAF_MASK3_D_ORDER_26_F_ORDER_AT_MOST_14",
            "PASS_INDEPENDENT_EXACT_DELTA1_NEW_LEAF_MASK3_D_ORDER_26_F_ORDER_AT_MOST_14_AUDIT",
        ),
        *[
            (
                f"hybrid-{order}", order, order,
                (
                    "rank8_delta1_new_leaf_mask3_D26_F15_hybrid_exact_stable_root_20260826.json"
                    if order == 15 else
                    f"rank8_delta1_new_leaf_mask3_D26_F{order}_hybrid_exact_root_20260826.json"
                ),
                f"rank8_delta1_new_leaf_mask3_D26_F{order}_hybrid_independent_audit_root_20260826.json",
                f"PASS_EXACT_DELTA1_NEW_LEAF_MASK3_D_ORDER_26_F_ORDER_{order}_HYBRID",
                f"PASS_INDEPENDENT_EXACT_DELTA1_NEW_LEAF_MASK3_D_ORDER_26_F_ORDER_{order}_HYBRID_AUDIT",
            )
            for order in range(15, 19)
        ],
        (
            "q5-coupled-19", 19, 19,
            "rank8_delta1_new_leaf_mask3_D26_F19_q5coupled_exact_stable_root_20260826.json",
            "rank8_delta1_new_leaf_mask3_D26_F19_q5coupled_independent_audit_root_20260826.json",
            "PASS_EXACT_DELTA1_NEW_LEAF_MASK3_D_ORDER_26_F_ORDER_19_Q5_COUPLED",
            "PASS_INDEPENDENT_EXACT_DELTA1_NEW_LEAF_MASK3_D_ORDER_26_F_ORDER_19_Q5_COUPLED_AUDIT",
        ),
        *[
            (
                f"forest-q5-{order}", order, order,
                f"rank8_delta1_new_leaf_mask3_D26_F{order}_forestq5_exact_root_20260826.json",
                f"rank8_delta1_new_leaf_mask3_D26_F{order}_forestq5_independent_audit_root_20260826.json",
                f"PASS_EXACT_DELTA1_NEW_LEAF_MASK3_D_ORDER_26_F_ORDER_{order}_FOREST_Q5_COUPLED",
                f"PASS_INDEPENDENT_EXACT_DELTA1_NEW_LEAF_MASK3_D_ORDER_26_F_ORDER_{order}_FOREST_Q5_COUPLED_AUDIT",
            )
            for order in range(20, 25)
        ],
        (
            "containment-q5-25", 25, 25,
            "rank8_delta1_new_leaf_mask3_D26_F25_containmentq5_exact_root_20260826.json",
            "rank8_delta1_new_leaf_mask3_D26_F25_containmentq5_independent_audit_root_20260826.json",
            "PASS_EXACT_DELTA1_NEW_LEAF_MASK3_D_ORDER_26_F_ORDER_25_CONTAINMENT_Q5",
            "PASS_INDEPENDENT_EXACT_DELTA1_NEW_LEAF_MASK3_D_ORDER_26_F_ORDER_25_CONTAINMENT_Q5_AUDIT",
        ),
    ]

    components = []
    coverage: list[int] = []
    endpoint_hashes = set()
    digest = hashlib.sha256()
    for label, first, last, primary_name, audit_name, status, audit_status in specifications:
        primary, audit = load(primary_name), load(audit_name)
        assert primary["status"] == status
        assert audit["status"] == audit_status
        assert primary["D_order"] == audit["D_order"] == 26
        assert audit["primary"]["sha256"] == actual[primary_name]
        assert all(primary["aggregate"][key] == audit["aggregate"][key] for key in keys)
        orders = list(range(first, last + 1))
        coverage.extend(orders)
        endpoint_hashes.add(audit["raw_endpoint_numerator"]["sha256"])
        digest.update(
            (f"{label}:{audit['aggregate']['ordered_region_digest_sha256']}\n").encode()
        )
        components.append((label, primary, audit, first, last))

    assert coverage == list(range(26))
    assert endpoint_hashes == {
        "5298C43C68E11DEA0072E4BF78AFB212FB32ACEC84C6FC25C492EEC4C050404E"
    }
    totals = {
        key: sum(int(primary["aggregate"][key]) for _, primary, _, _, _ in components)
        for key in keys
    }
    assert totals == {
        "regions": 358,
        "coefficients": 1555800,
        "negative": 0,
        "zero": 0,
        "positive": 1555800,
    }

    payload = {
        "schema": "rank8-delta1-new-leaf-mask3-D26-complete-assembled-v1",
        "status": "PASS_EXACT_AND_INDEPENDENT_DELTA1_NEW_LEAF_MASK3_FOR_D_ORDER_26",
        "theorem": (
            "For a tree A, vertex v, D=A-v and F=A-N[v], the Delta1 "
            "new-leaf mask-3 endpoint is nonnegative when |D|=26."
        ),
        "D_order": 26,
        "F_orders": coverage,
        "F_order_partition": [
            {
                "label": label,
                "first_F_order": first,
                "last_F_order": last,
                "primary_sha256": actual[primary_name],
                "audit_sha256": actual[audit_name],
            }
            for (
                label, first, last, primary_name, audit_name, _, _
            ) in specifications
        ],
        "coverage": (
            "Because deg_A(v)>=1, the induced forest F=A-N[v] has |F|<=25. "
            "The integer partition is exactly 0 through 25 without a gap."
        ),
        "aggregate": totals,
        "ordered_partition_digest_sha256": digest.hexdigest().upper(),
        "raw_endpoint_numerator_sha256": next(iter(endpoint_hashes)),
        "cleared_endpoint_denominator": "2744*d5**4*(d6 + f5)",
        "independent_reconstruction": (
            "Every primary region is replayed from the canonical endpoint by "
            "an auditor importing neither its producer nor its probe."
        ),
        "proof_boundary": (
            "This certificate closes endpoint mask 3 only at D order 26. "
            "Masks 0-2 and the remaining D orders are assembled separately."
        ),
        "pinned_inputs": actual,
        "source_sha256": sha256(Path(__file__)),
    }
    temporary = OUTPUT.with_suffix(OUTPUT.suffix + ".tmp")
    temporary.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    os.replace(temporary, OUTPUT)
    print(payload["status"])
    print("F_ORDERS", len(coverage), coverage[0], coverage[-1])
    print("REGIONS", totals["regions"], "COEFFICIENTS", totals["coefficients"])
    print("SOURCE", sha256(Path(__file__)))
    print("REPORT", sha256(OUTPUT))


if __name__ == "__main__":
    main()
