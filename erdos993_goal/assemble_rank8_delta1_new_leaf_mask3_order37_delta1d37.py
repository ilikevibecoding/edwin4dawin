#!/usr/bin/env python3
"""Fail-closed assembly of the complete D=37 Delta1 mask-3 certificate."""

from __future__ import annotations

import hashlib
import json
import os
from pathlib import Path


HERE = Path(__file__).resolve().parent
OUTPUT = HERE / "rank8_delta1_new_leaf_mask3_order37_delta1d37_20260825.json"
BRIDGES = (21, 22, 23)
SHARDS = ((24, 25), (26, 27), (28, 29), (30, 31), (32, 33), (34, 35), (36, 36))
EXPECTED = {
    "prove_rank8_delta1_new_leaf_mask3_order37_exact_F_shard_delta1d37.py":
        "1FA8893C50D9C0FBD18839BA9C630E5B6A1A5A7DC6775C759AD557F1762EA1ED",
    "audit_rank8_delta1_new_leaf_mask3_order37_exact_F_shard_delta1d37.py":
        "1166C4ADA71D136C4E41E820039888144549199200B80A5E9B6381111B3149C0",
    "prove_rank8_delta1_new_leaf_mask3_order37_small_F20_delta1d37.py":
        "473B49227528DF77F873B7E611F485D0A1F1EF40422343FB53E4FEC36A727B27",
    "rank8_delta1_new_leaf_mask3_order37_small_F20_delta1d37_20260825.json":
        "4588038446273FF703AB59F43472DC8BA2EEF1E5E9EC2FDD7553D8852BFD07DD",
    "audit_rank8_delta1_new_leaf_mask3_order37_small_F20_delta1d37.py":
        "F1D7567DD55B92BB00306504D089E3828A417D63DA46561F44B4F8037C2FD1F6",
    "rank8_delta1_new_leaf_mask3_order37_small_F20_independent_audit_delta1d37_20260825.json":
        "BC4B6038DE3B94E2C3060417E495DCA674978D44D1FAC08A073B9F4493C49342",
    "prove_rank8_delta1_new_leaf_mask3_order37_exact_F21_bridge_delta1d37.py":
        "F54FF3C4308192BD232E09AA29CDB05D94A4F396C1BC33D40B39B7FABD55C4B1",
    "rank8_delta1_new_leaf_mask3_order37_exact_F21_bridge_delta1d37_20260825.json":
        "1EC9699A830E9B4F0727568BD975D83270CBA4F7B947B4EEB3A54A2FB025AFCC",
    "audit_rank8_delta1_new_leaf_mask3_order37_exact_F21_bridge_delta1d37.py":
        "38B613C175E5B81CB26EE94A86AEE419C96065A11329F4619FAF31D868C95CCF",
    "rank8_delta1_new_leaf_mask3_order37_exact_F21_bridge_independent_audit_delta1d37_20260825.json":
        "BE8A89377A719040B518AB6FC96A13E0C8ACCB775AC73A7702314DAFECD6CCF5",
    "prove_rank8_delta1_new_leaf_mask3_order37_exact_F22_bridge_delta1d37.py":
        "D6575903DB49781562A023D7FFA41D977E48637F37D2ABA2617063A971339B00",
    "rank8_delta1_new_leaf_mask3_order37_exact_F22_bridge_delta1d37_20260825.json":
        "7322332BA25F07C212468357CF94B6F8D1A41D3834C0440F0B14127180B7BCD9",
    "audit_rank8_delta1_new_leaf_mask3_order37_exact_F22_bridge_delta1d37.py":
        "C0682B71B38210927301B3BF7A32DF19CD990488F3F42C49A81CDD23E64FE10E",
    "rank8_delta1_new_leaf_mask3_order37_exact_F22_bridge_independent_audit_delta1d37_20260825.json":
        "B2A9384EFB633454BC99A79732EC44ABBBDB24BCCCAC3A5EB50C6A9423B34B39",
    "prove_rank8_delta1_new_leaf_mask3_order37_exact_F23_bridge_delta1d37.py":
        "12D8ECE6CBAC73F99412374ABADAA88FFA57C186CB54E4E3EC2BC7479E07C78E",
    "rank8_delta1_new_leaf_mask3_order37_exact_F23_bridge_delta1d37_20260825.json":
        "2A51A4130950473F81C88C6106C0D20303C0B9CDAEEAEFC9F0697EE2D943587E",
    "audit_rank8_delta1_new_leaf_mask3_order37_exact_F23_bridge_delta1d37.py":
        "DF6E3E8F6A73C098E7241B8F0286E19ACCE861E39223E1F7C383D6969EA3B803",
    "rank8_delta1_new_leaf_mask3_order37_exact_F23_bridge_independent_audit_delta1d37_20260825.json":
        "8F826B180E8697AF3A68265BED2D6DF59DC755BE11045299A632E65172A6B6A4",
    "audit_rank8_delta1_order37_bound_chain_delta1d37.py":
        "5F3E848DC823033ACFA23335F39DCDD7B28C76135B3AB96C72DCF7FBDA21AAD8",
    "rank8_delta1_order37_bound_chain_independent_audit_delta1d37_20260825.json":
        "EBA3CC04FCEA010905624CC15BD3D4F927BF0E0B6571ABD1D63403BEDCA6C3AB",
    "audit_rank8_delta1_order37_split_diagnostic_delta1d37.py":
        "20E31D8E906AECD04629D90278EB49FBBDCAD836F3469AB37030CE979659EE15",
    "rank8_delta1_order37_split_diagnostic_audit_delta1d37_20260825.json":
        "1C77F20BC936894147BFBB57170916E40F991450BB933998E67FB576029F3A86",
    "rank8_delta1_new_leaf_mask3_order37_exact_F_24_25_delta1d37_20260825.json":
        "AED9E34F98F975F9DF5E322D25733C696CEFF9012F1632747360F7D10DE316D7",
    "rank8_delta1_new_leaf_mask3_order37_exact_F_24_25_independent_audit_delta1d37_20260825.json":
        "FA65DB1CE32509D403E1FD1F663DD37086EAC9D1524006731E6BAAAC35020EF4",
    "rank8_delta1_new_leaf_mask3_order37_exact_F_26_27_delta1d37_20260825.json":
        "A3846DE363C7B56F5E202B61D4C2055FAC0C0D73052AC8C09232629C8B3D6116",
    "rank8_delta1_new_leaf_mask3_order37_exact_F_26_27_independent_audit_delta1d37_20260825.json":
        "1D1E52F347637FD7A3B22A6798A65B3E6AA7B9659710C5518C62BFDB05D8E652",
    "rank8_delta1_new_leaf_mask3_order37_exact_F_28_29_delta1d37_20260825.json":
        "E47342D4EFA78711D50CCF91232D463F076265D17A6C862D13983B7E487AD192",
    "rank8_delta1_new_leaf_mask3_order37_exact_F_28_29_independent_audit_delta1d37_20260825.json":
        "3C4BC8AB7EE64E32134E9A6B458B16F44938CDD148CB5A60BEDE72D3B347C80E",
    "rank8_delta1_new_leaf_mask3_order37_exact_F_30_31_delta1d37_20260825.json":
        "6510C654683557B9805870D50402805BDD34E922604174F05B9B139954C56743",
    "rank8_delta1_new_leaf_mask3_order37_exact_F_30_31_independent_audit_delta1d37_20260825.json":
        "3BA25BEA4E45BD2C3591346B87D988496851CFF5DD63D3A349190B8148132C2A",
    "rank8_delta1_new_leaf_mask3_order37_exact_F_32_33_delta1d37_20260825.json":
        "870BC129BBC887B30C05AF158B2B898C267C9250DF67AFBCA2255D0DC6BA79D9",
    "rank8_delta1_new_leaf_mask3_order37_exact_F_32_33_independent_audit_delta1d37_20260825.json":
        "E0791BE9EB3011BA0319DA5C6F824A289C59B5C15B2A4825F368016AB618EDB5",
    "rank8_delta1_new_leaf_mask3_order37_exact_F_34_35_delta1d37_20260825.json":
        "2894255D9738CE15C4DD1EC578EF2714C714AD97A6269354497ABEB401D1ABB9",
    "rank8_delta1_new_leaf_mask3_order37_exact_F_34_35_independent_audit_delta1d37_20260825.json":
        "424159720139A024EC4A17201B096A103BFCBA7B646D12DCE4129AB51439C7AE",
    "rank8_delta1_new_leaf_mask3_order37_exact_F_36_36_delta1d37_20260825.json":
        "61B4741743F87EA0A2C7B5B21B74A4672B01A21C4563E043831EF3C03816C129",
    "rank8_delta1_new_leaf_mask3_order37_exact_F_36_36_independent_audit_delta1d37_20260825.json":
        "5263C61AF076BE52716182ACDA2EBADACD01BE7CD9194B87DFA4EBCCA20B6F61",
}


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def load(name: str) -> dict[str, object]:
    return json.loads((HERE / name).read_text(encoding="utf-8"))


def main() -> None:
    assert len(EXPECTED) == 36
    actual = {name: sha256(HERE / name) for name in EXPECTED}
    assert actual == EXPECTED, (actual, EXPECTED)
    aggregate_keys = ("regions", "coefficients", "negative", "zero", "positive")
    small_name = (
        "rank8_delta1_new_leaf_mask3_order37_small_F20_"
        "delta1d37_20260825.json"
    )
    small_audit_name = (
        "rank8_delta1_new_leaf_mask3_order37_small_F20_"
        "independent_audit_delta1d37_20260825.json"
    )
    small = load(small_name)
    small_audit = load(small_audit_name)
    bounds = load(
        "rank8_delta1_order37_bound_chain_independent_audit_"
        "delta1d37_20260825.json"
    )
    split = load(
        "rank8_delta1_order37_split_diagnostic_audit_delta1d37_20260825.json"
    )
    assert small["status"] == (
        "PASS_EXACT_DELTA1_NEW_LEAF_MASK3_D_ORDER_37_F_ORDER_AT_MOST_20"
    )
    assert small_audit["status"] == (
        "PASS_INDEPENDENT_EXACT_DELTA1_NEW_LEAF_MASK3_D_ORDER_37_"
        "F_ORDER_AT_MOST_20"
    )
    assert bounds["status"] == "PASS_INDEPENDENT_EXACT_DELTA1_ORDER37_BOUND_CHAIN"
    assert split["status"] == (
        "PASS_D37_SPLIT_AT_20_FIRST_COARSE_NEGATIVE_IS_RELAXATION_ARTIFACT"
    )
    assert small_audit["primary"]["sha256"] == actual[small_name]
    assert all(
        small["aggregate"][key] == small_audit["aggregate"][key]
        for key in aggregate_keys
    )

    coverage = list(range(21))
    components = [("small", small, small_audit)]
    for order in BRIDGES:
        primary_name = (
            "rank8_delta1_new_leaf_mask3_order37_exact_"
            f"F{order}_bridge_delta1d37_20260825.json"
        )
        audit_name = (
            "rank8_delta1_new_leaf_mask3_order37_exact_"
            f"F{order}_bridge_independent_audit_delta1d37_20260825.json"
        )
        primary = load(primary_name)
        audit = load(audit_name)
        assert primary["F_order"] == audit["F_order"] == order
        assert primary["status"] == (
            "PASS_EXACT_DELTA1_NEW_LEAF_MASK3_D_ORDER_37_"
            f"F_ORDER_{order}_BRIDGE"
        )
        assert audit["status"] == (
            "PASS_INDEPENDENT_EXACT_DELTA1_NEW_LEAF_MASK3_D_ORDER_37_"
            f"F_ORDER_{order}_BRIDGE"
        )
        assert audit["primary"]["sha256"] == actual[primary_name]
        assert all(
            primary["aggregate"][key] == audit["aggregate"][key]
            for key in aggregate_keys
        )
        coverage.append(order)
        components.append((f"bridge-{order}", primary, audit))

    for first, last in SHARDS:
        primary_name = (
            "rank8_delta1_new_leaf_mask3_order37_exact_F_"
            f"{first}_{last}_delta1d37_20260825.json"
        )
        audit_name = (
            "rank8_delta1_new_leaf_mask3_order37_exact_F_"
            f"{first}_{last}_independent_audit_delta1d37_20260825.json"
        )
        primary = load(primary_name)
        audit = load(audit_name)
        orders = list(range(first, last + 1))
        assert primary["F_orders"] == audit["F_orders"] == orders
        assert primary["status"] == (
            "PASS_EXACT_DELTA1_NEW_LEAF_MASK3_D_ORDER_37_"
            f"F_ORDERS_{first}_THROUGH_{last}"
        )
        assert audit["status"] == (
            "PASS_INDEPENDENT_EXACT_DELTA1_NEW_LEAF_MASK3_D_ORDER_37_"
            f"F_ORDERS_{first}_THROUGH_{last}"
        )
        assert audit["primary"]["sha256"] == actual[primary_name]
        assert all(
            primary["aggregate"][key] == audit["aggregate"][key]
            for key in aggregate_keys
        )
        coverage.extend(orders)
        components.append((f"{first}-{last}", primary, audit))
    assert coverage == list(range(37))

    totals = {
        key: sum(primary["aggregate"][key] for _, primary, _ in components)
        for key in aggregate_keys
    }
    assert totals == {
        "regions": 850, "coefficients": 1018200,
        "negative": 0, "zero": 0, "positive": 1018200,
    }
    digest = hashlib.sha256()
    endpoint_hashes = set()
    for label, _, audit in components:
        digest.update(
            (
                f"{label}:"
                + audit["aggregate"]["ordered_region_digest_sha256"]
                + "\n"
            ).encode()
        )
        endpoint_hashes.add(audit["raw_endpoint_numerator"]["sha256"])
    assert endpoint_hashes == {
        "5298C43C68E11DEA0072E4BF78AFB212FB32ACEC84C6FC25C492EEC4C050404E"
    }

    payload = {
        "schema": "rank8-delta1-new-leaf-mask3-order37-assembled-v1",
        "status": "PASS_EXACT_DELTA1_NEW_LEAF_MASK3_FOR_D_ORDER_37",
        "theorem": (
            "For a tree A, vertex v, D=A-v and F=A-N[v], the Delta1 "
            "new-leaf mask-3 endpoint is nonnegative when |D|=37."
        ),
        "D_order": 37,
        "F_order_partition": [
            {"first_F_order": 0, "last_F_order": 20},
            *[
                {"first_F_order": order, "last_F_order": order}
                for order in BRIDGES
            ],
            *[
                {"first_F_order": first, "last_F_order": last}
                for first, last in SHARDS
            ],
        ],
        "coverage": (
            "A tree has deg_A(v)>=1, so |F|<=36. The small branch covers "
            "0<=|F|<=20, exact cap-ratio bridges cover 21,22,23, and the "
            "ordinary exact shards cover every integer 24<=|F|<=36."
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
            "This certificate closes only endpoint mask 3 at D order 37. "
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
