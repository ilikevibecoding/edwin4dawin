#!/usr/bin/env python3
"""Fail-closed assembly of the complete D=35 Delta1 mask-3 certificate."""

from __future__ import annotations

import hashlib
import json
import os
from pathlib import Path


HERE = Path(__file__).resolve().parent
OUTPUT = HERE / "rank8_delta1_new_leaf_mask3_order35_delta1d35_20260825.json"
BRIDGES = tuple(range(19, 26))
SHARDS = ((27, 28), (29, 30), (31, 32), (33, 34))
EXPECTED = {
    "audit_rank8_delta1_new_leaf_mask3_order35_exact_F_shard_delta1d35.py": "08106EA09F545123141B679ABF055D9BF546BF2FB0B14048A9786A9039699D8D",
    "prove_rank8_delta1_new_leaf_mask3_order35_exact_F_shard_delta1d35.py": "EA9B876B67263D3EB3F4B8175C42EA9F14C66A535E58CC84F25FBA8BF93356F6",
    "prove_rank8_delta1_new_leaf_mask3_order35_small_F18_delta1d35.py": "4731C6061DEA73712EB2E17214978BAF702CA7B664A8063C1A48218CBD030F10",
    "rank8_delta1_new_leaf_mask3_order35_small_F18_delta1d35_20260825.json": "5E465ACC24C8CBB383233D09425DA72E8C9079633E0C4CFAB7E2C5EDEA15ACC1",
    "audit_rank8_delta1_new_leaf_mask3_order35_small_F18_delta1d35.py": "00440CADA736570084F989891733A99600D902D33C2541842325677705D76105",
    "rank8_delta1_new_leaf_mask3_order35_small_F18_independent_audit_delta1d35_20260825.json": "24C76F4E06047D369BD64608EEEA80B164DFC89DD6D9E251710B1CF5E258BC0C",
    "audit_rank8_delta1_order35_bound_chain_delta1d35.py": "7964EC428920A4A0EEFC1E95AE539D06495B37A983EAEDD32DEDA958124D68DD",
    "rank8_delta1_order35_bound_chain_independent_audit_delta1d35_20260825.json": "E54886D7C745B143961A542B56CC8B4DD2D5AAF62581D2B0F68B6C075CC856F7",
    "prove_rank8_delta1_new_leaf_mask3_order35_exact_F19_bridge_delta1d35.py": "F02C555BE1D14D21740F5DD6059290FA60B913C5ABD93B1711AB3C79052A7457",
    "rank8_delta1_new_leaf_mask3_order35_exact_F19_bridge_delta1d35_20260825.json": "D76593CC3182A97042231F4C62A0173E3893294FE56B299E1434EC47CABEECAB",
    "audit_rank8_delta1_new_leaf_mask3_order35_exact_F19_bridge_delta1d35.py": "FF080C1440A3857806C7F130A84FBF0A54F0723AFCB379979724377EB4560018",
    "rank8_delta1_new_leaf_mask3_order35_exact_F19_bridge_independent_audit_delta1d35_20260825.json": "01C5B42182850BD9861E8F8216E7411D3F68D407E680E085BD8A9AFDB09B2E6F",
    "prove_rank8_delta1_new_leaf_mask3_order35_exact_F20_bridge_delta1d35.py": "A2061ACA3475D4D5B7E214FEBF549E7586C0FC209C0639A431F6768867FA0C74",
    "rank8_delta1_new_leaf_mask3_order35_exact_F20_bridge_delta1d35_20260825.json": "D97ADD9F996F73A19631F57BA8C0286B966138C1DC864AE5172FABFCA124CDA3",
    "audit_rank8_delta1_new_leaf_mask3_order35_exact_F20_bridge_delta1d35.py": "8F4FD88F6574E4656B167A853932A6BC24094442579C9B8D03A84420E27CE6DE",
    "rank8_delta1_new_leaf_mask3_order35_exact_F20_bridge_independent_audit_delta1d35_20260825.json": "FC88749C07E78B5553FF49A0E2E3FDDF333394DC7776CF324996946D6631F00F",
    "prove_rank8_delta1_new_leaf_mask3_order35_exact_F21_bridge_delta1d35.py": "0DFF1F0DFA1E6C0DE2B1E37FD090D487749194865B1BFB2FE1C59D6B09CC7453",
    "rank8_delta1_new_leaf_mask3_order35_exact_F21_bridge_delta1d35_20260825.json": "B943C87B700DBDF4F800E7909667344EF6D439215879E7462617C096685C57AA",
    "audit_rank8_delta1_new_leaf_mask3_order35_exact_F21_bridge_delta1d35.py": "61AB4735F324549046424C56E60D749902AB6F08B49CD1C570A09BA1B3FD2910",
    "rank8_delta1_new_leaf_mask3_order35_exact_F21_bridge_independent_audit_delta1d35_20260825.json": "6FED7DC1DBF88893CF2ECC7A21AB7EDDA4B818E03765CF4A30EDCC797233B8AB",
    "prove_rank8_delta1_new_leaf_mask3_order35_exact_F22_bridge_delta1d35.py": "4BBB69243DFC7A44FD9B62078332925B700EBB55C413E133FF48B9AD92C2CE29",
    "rank8_delta1_new_leaf_mask3_order35_exact_F22_bridge_delta1d35_20260825.json": "E9EA7F57632DBC25B71D3BA03D365A3934D2E68420A62ABB79614201B416DCE2",
    "audit_rank8_delta1_new_leaf_mask3_order35_exact_F22_bridge_delta1d35.py": "CA802FDDB2A0E0745E41338EF5E8719C67607AE5AC4614C1FD81F9DCF0A55857",
    "rank8_delta1_new_leaf_mask3_order35_exact_F22_bridge_independent_audit_delta1d35_20260825.json": "192532B21B0BC7B367ADB09C61B30ED749FC48F1D8292D2BA1FC1AFCA346A385",
    "prove_rank8_delta1_new_leaf_mask3_order35_exact_F23_bridge_delta1d35.py": "EEF859E1F30F15297D2780C4010286F98C2C1039C803D9E17351BCC62FA8218E",
    "rank8_delta1_new_leaf_mask3_order35_exact_F23_bridge_delta1d35_20260825.json": "AF46D57D8E24106345D1D9E649035DDC044E7516F6A2CB49F2117C26EBBE57AA",
    "audit_rank8_delta1_new_leaf_mask3_order35_exact_F23_bridge_delta1d35.py": "57EABC9D1691C2D4A75FED79BCEA6E23A94416D6E0E4A103A6DFFCD7B6D54ED9",
    "rank8_delta1_new_leaf_mask3_order35_exact_F23_bridge_independent_audit_delta1d35_20260825.json": "53544F6E409E1679EDFD24502E0AFF8ED8161484053870EC06744B0D49691933",
    "prove_rank8_delta1_new_leaf_mask3_order35_exact_F24_bridge_delta1d35.py": "88318BA336ACD161CEFB77D79110D7CC58568192EB3BACD69F1EB486B61F5565",
    "rank8_delta1_new_leaf_mask3_order35_exact_F24_bridge_delta1d35_20260825.json": "7E805FC480A3FFB17913170E3216102A36D6D555C853E86E7518F36FAE4CE932",
    "audit_rank8_delta1_new_leaf_mask3_order35_exact_F24_bridge_delta1d35.py": "7DBD2054EF67B0524D991937C1AF1D62B1A765B4BB5350712006F69EC0F6E173",
    "rank8_delta1_new_leaf_mask3_order35_exact_F24_bridge_independent_audit_delta1d35_20260825.json": "0FFD18390AB83778FCA63FAF127B93854644773F86E7A69DF311028AC65DD232",
    "prove_rank8_delta1_new_leaf_mask3_order35_exact_F25_bridge_delta1d35.py": "5F86DB5FE79A17DA159A3F74EAB85EC6AA1291CAD2AE06A7A064D3FF89157742",
    "rank8_delta1_new_leaf_mask3_order35_exact_F25_bridge_delta1d35_20260825.json": "2DE5433AB8EE613D051FA2C042299059D83E23E1C3E0FA9050E717185E1F8632",
    "audit_rank8_delta1_new_leaf_mask3_order35_exact_F25_bridge_delta1d35.py": "E9665036E89FA473DC3503E33FDD8C765F65F678158FFEB2108DDF0F6246A64F",
    "rank8_delta1_new_leaf_mask3_order35_exact_F25_bridge_independent_audit_delta1d35_20260825.json": "23B8661CA6EA5C33AFB7484D25C45443BABFB3EAE587541E47A0FB30643086AB",
    "prove_rank8_delta1_new_leaf_mask3_order35_exact_F26_q5_bridge_delta1d35.py": "9E7935F5C76A1E9DE0EA8E15BEA987F8F142D8A6B99146EFF0F3FEE9163BF2AD",
    "rank8_delta1_new_leaf_mask3_order35_exact_F26_q5_bridge_delta1d35_20260825.json": "9EFF65DF0C24C7B418EAA3BBA21FFFB2D7162A3F4CB9FCD91B8DDB1C64114CED",
    "audit_rank8_delta1_new_leaf_mask3_order35_exact_F26_q5_bridge_delta1d35.py": "C4F5DA704FD3C15A31ACEB976601C627C1CF22344CC31861884FCA150D005325",
    "rank8_delta1_new_leaf_mask3_order35_exact_F26_q5_bridge_independent_audit_delta1d35_20260825.json": "E66E2A870CFB8AF0C6E1401AAC804B543C2EE3DB22B18E9C1DFF840CD563B15C",
    "rank8_delta1_new_leaf_mask3_order35_exact_F_27_28_delta1d35_20260825.json": "F5BBC60A325D60938260EFFA4465A83E97028EDF1333CD4CBBE4EFB9473BEA5D",
    "rank8_delta1_new_leaf_mask3_order35_exact_F_29_30_delta1d35_20260825.json": "09C710B56DD8C984AB66CE2EC8EBD36118EB5EBA32C592553811FF3F5F72C06A",
    "rank8_delta1_new_leaf_mask3_order35_exact_F_31_32_delta1d35_20260825.json": "4FFCC3F0E90C1FD134290BBA65305DA578317EECF7A4A9D212DB4AFC1F81B188",
    "rank8_delta1_new_leaf_mask3_order35_exact_F_31_32_independent_audit_delta1d35_20260825.json": "B3A9E4D0BC5BFE60887E843CCB3D73B5AC84EB53F58C099FD96907B20B68704B",
    "rank8_delta1_new_leaf_mask3_order35_exact_F_33_34_delta1d35_20260825.json": "A4DEF0A732588067CC6D509FCC652A7916924B5A591DB558C974818900F03946",
    "rank8_delta1_new_leaf_mask3_order35_exact_F_33_34_independent_audit_delta1d35_20260825.json": "CFCE8C4BF6E911D244A2C44E42FB77BE7FD5FCD4F1E83C7CF2B4508BEBDFF1F9",
    "rank8_delta1_new_leaf_mask3_order35_exact_F_27_28_independent_audit_delta1d35_20260825.json": "6CDE85A620131A5BCEDE1BAAF0A434D2B67A1FE2E2E0B3E471C6E663EE9391AB",
    "rank8_delta1_new_leaf_mask3_order35_exact_F_29_30_independent_audit_delta1d35_20260825.json": "F5ACF4F67CDBB9EB61D282D905E4968CFC35D5AF4838E644AC64782A1FBDDC7F",
}


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def load(name: str) -> dict[str, object]:
    return json.loads((HERE / name).read_text(encoding="utf-8"))


def main() -> None:
    assert "PENDING" not in EXPECTED.values()
    actual = {name: sha256(HERE / name) for name in EXPECTED}
    assert actual == EXPECTED, (actual, EXPECTED)
    keys = ("regions", "coefficients", "negative", "zero", "positive")

    small_name = (
        "rank8_delta1_new_leaf_mask3_order35_small_F18_delta1d35_20260825.json"
    )
    small_audit_name = (
        "rank8_delta1_new_leaf_mask3_order35_small_F18_"
        "independent_audit_delta1d35_20260825.json"
    )
    small, small_audit = load(small_name), load(small_audit_name)
    bounds = load(
        "rank8_delta1_order35_bound_chain_independent_audit_delta1d35_20260825.json"
    )
    assert small["status"] == (
        "PASS_EXACT_DELTA1_NEW_LEAF_MASK3_D_ORDER_35_F_ORDER_AT_MOST_18"
    )
    assert small_audit["status"] == (
        "PASS_INDEPENDENT_EXACT_DELTA1_NEW_LEAF_MASK3_D_ORDER_35_"
        "F_ORDER_AT_MOST_18"
    )
    assert bounds["status"] == "PASS_INDEPENDENT_EXACT_DELTA1_ORDER35_BOUND_CHAIN"
    assert small_audit["primary"]["sha256"] == actual[small_name]
    assert all(small["aggregate"][key] == small_audit["aggregate"][key] for key in keys)

    coverage = list(range(19))
    components = [("small", small, small_audit)]
    for order in BRIDGES:
        primary_name = (
            "rank8_delta1_new_leaf_mask3_order35_exact_"
            f"F{order}_bridge_delta1d35_20260825.json"
        )
        audit_name = (
            "rank8_delta1_new_leaf_mask3_order35_exact_"
            f"F{order}_bridge_independent_audit_delta1d35_20260825.json"
        )
        primary, audit = load(primary_name), load(audit_name)
        assert primary["F_order"] == audit["F_order"] == order
        assert primary["status"] == (
            "PASS_EXACT_DELTA1_NEW_LEAF_MASK3_D_ORDER_35_"
            f"F_ORDER_{order}_BRIDGE"
        )
        assert audit["status"] == (
            "PASS_INDEPENDENT_EXACT_DELTA1_NEW_LEAF_MASK3_D_ORDER_35_"
            f"F_ORDER_{order}_BRIDGE"
        )
        assert audit["primary"]["sha256"] == actual[primary_name]
        assert all(primary["aggregate"][key] == audit["aggregate"][key] for key in keys)
        coverage.append(order)
        components.append((f"bridge-{order}", primary, audit))

    q5_primary_name = (
        "rank8_delta1_new_leaf_mask3_order35_exact_F26_q5_bridge_"
        "delta1d35_20260825.json"
    )
    q5_audit_name = (
        "rank8_delta1_new_leaf_mask3_order35_exact_F26_q5_bridge_"
        "independent_audit_delta1d35_20260825.json"
    )
    q5_primary, q5_audit = load(q5_primary_name), load(q5_audit_name)
    assert q5_primary["F_order"] == q5_audit["F_order"] == 26
    assert q5_primary["status"] == (
        "PASS_EXACT_DELTA1_NEW_LEAF_MASK3_D_ORDER_35_F_ORDER_26_Q5_BRIDGE"
    )
    assert q5_audit["status"] == (
        "PASS_INDEPENDENT_EXACT_DELTA1_NEW_LEAF_MASK3_D_ORDER_35_"
        "F_ORDER_26_Q5_BRIDGE"
    )
    assert q5_audit["primary"]["sha256"] == actual[q5_primary_name]
    assert all(q5_primary["aggregate"][key] == q5_audit["aggregate"][key] for key in keys)
    coverage.append(26)
    components.append(("q5-bridge-26", q5_primary, q5_audit))

    for first, last in SHARDS:
        primary_name = (
            "rank8_delta1_new_leaf_mask3_order35_exact_F_"
            f"{first}_{last}_delta1d35_20260825.json"
        )
        audit_name = (
            "rank8_delta1_new_leaf_mask3_order35_exact_F_"
            f"{first}_{last}_independent_audit_delta1d35_20260825.json"
        )
        primary, audit = load(primary_name), load(audit_name)
        orders = list(range(first, last + 1))
        assert primary["F_orders"] == audit["F_orders"] == orders
        assert primary["status"] == (
            "PASS_EXACT_DELTA1_NEW_LEAF_MASK3_D_ORDER_35_"
            f"F_ORDERS_{first}_THROUGH_{last}"
        )
        assert audit["status"] == (
            "PASS_INDEPENDENT_EXACT_DELTA1_NEW_LEAF_MASK3_D_ORDER_35_"
            f"F_ORDERS_{first}_THROUGH_{last}"
        )
        assert audit["primary"]["sha256"] == actual[primary_name]
        assert all(primary["aggregate"][key] == audit["aggregate"][key] for key in keys)
        coverage.extend(orders)
        components.append((f"{first}-{last}", primary, audit))
    assert coverage == list(range(35))

    totals = {
        key: sum(primary["aggregate"][key] for _, primary, _ in components)
        for key in keys
    }
    assert totals == {
        "regions": 556, "coefficients": 675000,
        "negative": 0, "zero": 0, "positive": 675000,
    }
    digest = hashlib.sha256()
    endpoint_hashes = set()
    for label, _, audit in components:
        digest.update(
            (f"{label}:" + audit["aggregate"]["ordered_region_digest_sha256"] + "\n").encode()
        )
        endpoint_hashes.add(audit["raw_endpoint_numerator"]["sha256"])
    assert endpoint_hashes == {
        "5298C43C68E11DEA0072E4BF78AFB212FB32ACEC84C6FC25C492EEC4C050404E"
    }

    payload = {
        "schema": "rank8-delta1-new-leaf-mask3-order35-assembled-v1",
        "status": "PASS_EXACT_DELTA1_NEW_LEAF_MASK3_FOR_D_ORDER_35",
        "theorem": (
            "For a tree A, vertex v, D=A-v and F=A-N[v], the Delta1 "
            "new-leaf mask-3 endpoint is nonnegative when |D|=35."
        ),
        "D_order": 35,
        "F_order_partition": [
            {"first_F_order": 0, "last_F_order": 18},
            *[{"first_F_order": order, "last_F_order": order} for order in BRIDGES],
            {"first_F_order": 26, "last_F_order": 26, "coupling": "forest_Q5"},
            *[
                {"first_F_order": first, "last_F_order": last}
                for first, last in SHARDS
            ],
        ],
        "coverage": (
            "A tree has deg_A(v)>=1, so |F|<=34. The small branch covers "
            "0<=|F|<=18; exact cap-ratio bridges cover 19 through 25; "
            "the forest-Q5 bridge covers 26; ordinary shards cover 27 through 34."
        ),
        "analytic_bound_chain": {
            "status": bounds["status"],
            "mu4_floor": bounds["mu4_floor"],
            "mu5_floor": bounds["mu5_floor"],
            "x_bounds": bounds["x_bounds"],
            "y_bounds": bounds["y_bounds"],
            "M26_q5_coupling": bounds["M26_q5_coupling"],
            "exact_switch_checks": bounds["exact_switch_checks"],
        },
        "aggregate": totals,
        "ordered_partition_digest_sha256": digest.hexdigest().upper(),
        "raw_endpoint_numerator_sha256": next(iter(endpoint_hashes)),
        "cleared_endpoint_denominator": "2744*d5**4*(d6 + f5)",
        "independent_reconstruction": (
            "Every primary box is replayed from the canonical endpoint "
            "transcript by an auditor importing neither producer nor probe."
        ),
        "proof_boundary": (
            "This certificate closes only endpoint mask 3 at D order 35. "
            "Masks 0-2 and separate endpoint concavity are assembled elsewhere."
        ),
        "pinned_inputs": actual,
        "source_sha256": sha256(Path(__file__)),
    }
    temporary = OUTPUT.with_suffix(OUTPUT.suffix + ".tmp")
    temporary.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    os.replace(temporary, OUTPUT)
    print(payload["status"])
    print("REGIONS", totals["regions"], "COEFFICIENTS", totals["coefficients"])
    print("SOURCE", sha256(Path(__file__)))
    print("REPORT", sha256(OUTPUT))


if __name__ == "__main__":
    main()
