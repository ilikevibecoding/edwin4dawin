#!/usr/bin/env python3
"""Fail-closed assembly of the complete D=36 Delta1 mask-3 certificate."""

from __future__ import annotations

import hashlib
import json
import os
from pathlib import Path


HERE = Path(__file__).resolve().parent
OUTPUT = HERE / "rank8_delta1_new_leaf_mask3_order36_delta1d36_20260825.json"
BRIDGES = (20, 21, 22, 23, 24)
SHARDS = ((25, 25), (26, 27), (28, 29), (30, 31), (32, 33), (34, 35))
EXPECTED = {
    "prove_rank8_delta1_new_leaf_mask3_order36_exact_F_shard_delta1d36.py":
        "C69989C6E77E35E0D7205CDEFD1B21C149068D35B10483C372001C5AF373C4B2",
    "audit_rank8_delta1_new_leaf_mask3_order36_exact_F_shard_delta1d36.py":
        "3B1E9C1F6100F171AB8498AD02C55F38BC40A74818798788ABF2441924C76AAA",
    "prove_rank8_delta1_new_leaf_mask3_order36_small_F19_delta1d36.py":
        "2837682A800F896CF83B427BCD6A40EFA1B985A8B519F7828F4C51C5D62CF82D",
    "rank8_delta1_new_leaf_mask3_order36_small_F19_delta1d36_20260825.json":
        "CD4AEDE0491633C26298031DE35D2B31016C5603AB20E6DA7C0515E9CD5BBD1A",
    "audit_rank8_delta1_new_leaf_mask3_order36_small_F19_delta1d36.py":
        "E5E8517F1804E025527C2EB0A82D744C16938196162A08E26AC083B647DDCF75",
    "rank8_delta1_new_leaf_mask3_order36_small_F19_independent_audit_delta1d36_20260825.json":
        "CC06D4127C99D4EEAAD3718160339C42BD0C1439905909F0C36955993C82C2AB",
    "prove_rank8_delta1_new_leaf_mask3_order36_exact_F20_bridge_delta1d36.py":
        "E867F0573C3638ABB429F55EF8A1FEFBF044AB5B3DE10B35BF96F44CEAAAF7A9",
    "rank8_delta1_new_leaf_mask3_order36_exact_F20_bridge_delta1d36_20260825.json":
        "BD333AFF238F2662021FE761CB8930054AF7A4503C3AC20ABA5279F09DBBC78F",
    "audit_rank8_delta1_new_leaf_mask3_order36_exact_F20_bridge_delta1d36.py":
        "C1A1E79E4B89665B0FBBC265CE95C1E1BB91FF49E80D8F1A15EC6DACB43CCC2D",
    "rank8_delta1_new_leaf_mask3_order36_exact_F20_bridge_independent_audit_delta1d36_20260825.json":
        "7F935023FB65D8DEA0A1D043A9B60C6AE00FF9447BA2DE1AC192C3356AE5ECDF",
    "prove_rank8_delta1_new_leaf_mask3_order36_exact_F21_bridge_delta1d36.py":
        "0BDC4D17A6BE6EF87C0BCFB6BB844EBB73CB97C5997040061C11EE01837FBEF2",
    "rank8_delta1_new_leaf_mask3_order36_exact_F21_bridge_delta1d36_20260825.json":
        "CB3993B06123EDB81D568EF03C65C0A80E0701D16992C850099DAE1617B06AAC",
    "audit_rank8_delta1_new_leaf_mask3_order36_exact_F21_bridge_delta1d36.py":
        "736063B2B157F8BEC0849DFF762938049B7A3CE608AB1939BAA4E483693085C8",
    "rank8_delta1_new_leaf_mask3_order36_exact_F21_bridge_independent_audit_delta1d36_20260825.json":
        "E16247140681E07163015338A205D77A696F0C9CB0C931F047EC1090EC42CFE9",
    "prove_rank8_delta1_new_leaf_mask3_order36_exact_F22_bridge_delta1d36.py":
        "3D35F5AEC9CCDAEFA04714C4708A415DB78BA4D86D4F4B10F074C0D06A3EE7D3",
    "rank8_delta1_new_leaf_mask3_order36_exact_F22_bridge_delta1d36_20260825.json":
        "803CFA43615EE54E540ED24C4F7B5DFEBBFFC2AB0A92F40D09077F75D8E40D14",
    "audit_rank8_delta1_new_leaf_mask3_order36_exact_F22_bridge_delta1d36.py":
        "FF3C36B7F08C9909D4C4690542EF50FBAE86693EFFF23D1D48697C784F9FC608",
    "rank8_delta1_new_leaf_mask3_order36_exact_F22_bridge_independent_audit_delta1d36_20260825.json":
        "1586B2BC90A939535F03527F468DE439A9AE72AAB8F44F57F3669AD0BE7E54CB",
    "prove_rank8_delta1_new_leaf_mask3_order36_exact_F23_bridge_delta1d36.py":
        "5ED32EADA0597A5130499BE9FDCDBC669A4AA4AADC6144782BB19ABCB4104B08",
    "rank8_delta1_new_leaf_mask3_order36_exact_F23_bridge_delta1d36_20260825.json":
        "95BCC8C89169A5D476DCE571E7857B0A7893FD8F0581E4C2CD479E0726389E2D",
    "audit_rank8_delta1_new_leaf_mask3_order36_exact_F23_bridge_delta1d36.py":
        "B6ADA2BBDF1BF08344676523EAA8848B96378E301BA85D8B66210E047198C407",
    "rank8_delta1_new_leaf_mask3_order36_exact_F23_bridge_independent_audit_delta1d36_20260825.json":
        "4D0B1B991140FC45821FD6A06B207B1E4EE5A64BDD0256B91063E4C6E8EC73CE",
    "prove_rank8_delta1_new_leaf_mask3_order36_exact_F24_bridge_delta1d36.py":
        "5C200FBD4968E886829B855E179D56B3CD3BAC91D88F6E40BF769CDE5B6E3E51",
    "rank8_delta1_new_leaf_mask3_order36_exact_F24_bridge_delta1d36_20260825.json":
        "5925665DF16CD5E17AEBD47A0B8B5F9B38DF03362389E77D4FD0F1AB6CA528DD",
    "audit_rank8_delta1_new_leaf_mask3_order36_exact_F24_bridge_delta1d36.py":
        "EDBA3B2F46333804597A4C0165AAC9F11914BEB997408E85E1E4AFB111BEAA8A",
    "rank8_delta1_new_leaf_mask3_order36_exact_F24_bridge_independent_audit_delta1d36_20260825.json":
        "98356E437251788BB0B36502486810A393F0369D2C85E527C2DCED9E7C41FD09",
    "audit_rank8_delta1_order36_bound_chain_delta1d36.py":
        "AAE6C2941299738CDF54091A270A61C4D3C9923DB11D5E692973C7959868634F",
    "rank8_delta1_order36_bound_chain_independent_audit_delta1d36_20260825.json":
        "27C866739491E00B96D008903BE4CA7815D4A26F35FBD1440D74639860119DA1",
    "audit_rank8_delta1_order36_split_diagnostic_delta1d36.py":
        "BA8E8C7E92422622088588557198CFCE0A19C6283791010831C34764D1B8F860",
    "rank8_delta1_order36_split_diagnostic_audit_delta1d36_20260825.json":
        "EA4BB358E56F5F9AB19B4FE88A9E02E540F73F951467597627C2B5A5B11E469E",
    "rank8_delta1_new_leaf_mask3_order36_exact_F_25_25_delta1d36_20260825.json":
        "0F3B17F134365755483FCA055CF025108929C70A0EC98DDEDD8D4E9BDA2DBE90",
    "rank8_delta1_new_leaf_mask3_order36_exact_F_25_25_independent_audit_delta1d36_20260825.json":
        "3192A9978323FC57A8DA8DB767E108F78863C36191B792B571FD71C8108EA037",
    "rank8_delta1_new_leaf_mask3_order36_exact_F_26_27_delta1d36_20260825.json":
        "D8228F2E9E85F08780FA1E3D4708EEC93556BDA05D4796F7CAB2C11F8019ED10",
    "rank8_delta1_new_leaf_mask3_order36_exact_F_26_27_independent_audit_delta1d36_20260825.json":
        "66DC94C4945BC62FF972DBEFC5C7130FF29A22B21000A9C0A3998E2BEAC4496B",
    "rank8_delta1_new_leaf_mask3_order36_exact_F_28_29_delta1d36_20260825.json":
        "1384F5B3C7EF18F30990A3E394EA0494A75348337395B5A14A33A72EA854C6D4",
    "rank8_delta1_new_leaf_mask3_order36_exact_F_28_29_independent_audit_delta1d36_20260825.json":
        "EF31E0BC3847EEA55177E577B933373817629EB3C0BCC6395B6ACFF1F148CEDF",
    "rank8_delta1_new_leaf_mask3_order36_exact_F_30_31_delta1d36_20260825.json":
        "3E6194318917D49D1945839B256580CD390F2CCEBC7986CA6F789B8D018CF635",
    "rank8_delta1_new_leaf_mask3_order36_exact_F_30_31_independent_audit_delta1d36_20260825.json":
        "78A73AD5FA4DAF2935172A5B99B016C2CD8567D438540777803CD2A37C57B9F8",
    "rank8_delta1_new_leaf_mask3_order36_exact_F_32_33_delta1d36_20260825.json":
        "3756EDC765EB7B58F8D0695CA300CA13D3217B27B0D9B357A5393BEC62EFFDC6",
    "rank8_delta1_new_leaf_mask3_order36_exact_F_32_33_independent_audit_delta1d36_20260825.json":
        "2F65457A3976253E11BDE7EDAE85EF38EFFED4BB2DE9FDEF8B921415D1C50459",
    "rank8_delta1_new_leaf_mask3_order36_exact_F_34_35_delta1d36_20260825.json":
        "8AFD91188BA1CD56181F0CAE7510B0CBF0FFFD8960BA8364D9309D4EE71C3B81",
    "rank8_delta1_new_leaf_mask3_order36_exact_F_34_35_independent_audit_delta1d36_20260825.json":
        "5759F35A7D95EB80CF06B2265B337B791BA187E8E39286480527A546DA78AD98",
}


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def load(name: str) -> dict[str, object]:
    return json.loads((HERE / name).read_text(encoding="utf-8"))


def main() -> None:
    assert len(EXPECTED) == 42
    actual = {name: sha256(HERE / name) for name in EXPECTED}
    assert actual == EXPECTED, (actual, EXPECTED)
    keys = ("regions", "coefficients", "negative", "zero", "positive")
    small_name = (
        "rank8_delta1_new_leaf_mask3_order36_small_F19_"
        "delta1d36_20260825.json"
    )
    small_audit_name = (
        "rank8_delta1_new_leaf_mask3_order36_small_F19_"
        "independent_audit_delta1d36_20260825.json"
    )
    small = load(small_name)
    small_audit = load(small_audit_name)
    bounds = load(
        "rank8_delta1_order36_bound_chain_independent_audit_"
        "delta1d36_20260825.json"
    )
    split = load(
        "rank8_delta1_order36_split_diagnostic_audit_delta1d36_20260825.json"
    )
    assert small["status"] == (
        "PASS_EXACT_DELTA1_NEW_LEAF_MASK3_D_ORDER_36_F_ORDER_AT_MOST_19"
    )
    assert small_audit["status"] == (
        "PASS_INDEPENDENT_EXACT_DELTA1_NEW_LEAF_MASK3_D_ORDER_36_"
        "F_ORDER_AT_MOST_19"
    )
    assert bounds["status"] == "PASS_INDEPENDENT_EXACT_DELTA1_ORDER36_BOUND_CHAIN"
    assert split["status"] == (
        "PASS_D36_SPLIT_AT_19_FIRST_COARSE_NEGATIVE_IS_RELAXATION_ARTIFACT"
    )
    assert small_audit["primary"]["sha256"] == actual[small_name]
    assert all(small["aggregate"][key] == small_audit["aggregate"][key] for key in keys)

    coverage = list(range(20))
    components = [("small", small, small_audit)]
    for order in BRIDGES:
        primary_name = (
            "rank8_delta1_new_leaf_mask3_order36_exact_"
            f"F{order}_bridge_delta1d36_20260825.json"
        )
        audit_name = (
            "rank8_delta1_new_leaf_mask3_order36_exact_"
            f"F{order}_bridge_independent_audit_delta1d36_20260825.json"
        )
        primary, audit = load(primary_name), load(audit_name)
        assert primary["F_order"] == audit["F_order"] == order
        assert primary["status"] == (
            "PASS_EXACT_DELTA1_NEW_LEAF_MASK3_D_ORDER_36_"
            f"F_ORDER_{order}_BRIDGE"
        )
        assert audit["status"] == (
            "PASS_INDEPENDENT_EXACT_DELTA1_NEW_LEAF_MASK3_D_ORDER_36_"
            f"F_ORDER_{order}_BRIDGE"
        )
        assert audit["primary"]["sha256"] == actual[primary_name]
        assert all(primary["aggregate"][key] == audit["aggregate"][key] for key in keys)
        coverage.append(order)
        components.append((f"bridge-{order}", primary, audit))

    for first, last in SHARDS:
        primary_name = (
            "rank8_delta1_new_leaf_mask3_order36_exact_F_"
            f"{first}_{last}_delta1d36_20260825.json"
        )
        audit_name = (
            "rank8_delta1_new_leaf_mask3_order36_exact_F_"
            f"{first}_{last}_independent_audit_delta1d36_20260825.json"
        )
        primary, audit = load(primary_name), load(audit_name)
        orders = list(range(first, last + 1))
        assert primary["F_orders"] == audit["F_orders"] == orders
        assert primary["status"] == (
            "PASS_EXACT_DELTA1_NEW_LEAF_MASK3_D_ORDER_36_"
            f"F_ORDERS_{first}_THROUGH_{last}"
        )
        assert audit["status"] == (
            "PASS_INDEPENDENT_EXACT_DELTA1_NEW_LEAF_MASK3_D_ORDER_36_"
            f"F_ORDERS_{first}_THROUGH_{last}"
        )
        assert audit["primary"]["sha256"] == actual[primary_name]
        assert all(primary["aggregate"][key] == audit["aggregate"][key] for key in keys)
        coverage.extend(orders)
        components.append((f"{first}-{last}", primary, audit))
    assert coverage == list(range(36))

    totals = {
        key: sum(primary["aggregate"][key] for _, primary, _ in components)
        for key in keys
    }
    assert totals == {
        "regions": 732, "coefficients": 876600,
        "negative": 0, "zero": 0, "positive": 876600,
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
        "schema": "rank8-delta1-new-leaf-mask3-order36-assembled-v1",
        "status": "PASS_EXACT_DELTA1_NEW_LEAF_MASK3_FOR_D_ORDER_36",
        "theorem": (
            "For a tree A, vertex v, D=A-v and F=A-N[v], the Delta1 "
            "new-leaf mask-3 endpoint is nonnegative when |D|=36."
        ),
        "D_order": 36,
        "F_order_partition": [
            {"first_F_order": 0, "last_F_order": 19},
            *[{"first_F_order": order, "last_F_order": order} for order in BRIDGES],
            *[
                {"first_F_order": first, "last_F_order": last}
                for first, last in SHARDS
            ],
        ],
        "coverage": (
            "A tree has deg_A(v)>=1, so |F|<=35. The small branch covers "
            "0<=|F|<=19, exact cap-ratio bridges cover 20 through 24, and "
            "the ordinary exact shards cover every integer 25<=|F|<=35."
        ),
        "analytic_bound_chain": {
            "status": bounds["status"],
            "mu4_floor": bounds["mu4_floor"],
            "mu5_floor": bounds["mu5_floor"],
            "x_bounds": bounds["x_bounds"],
            "y_bounds": bounds["y_bounds"],
            "exact_switch_checks": bounds["exact_switch_checks"],
        },
        "split_diagnostic": {
            "status": split["status"],
            "incompatibility_certificate": split["incompatibility_certificate"],
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
            "This certificate closes only endpoint mask 3 at D order 36. "
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
