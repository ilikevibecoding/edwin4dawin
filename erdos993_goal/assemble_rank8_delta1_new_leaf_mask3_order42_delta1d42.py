#!/usr/bin/env python3
"""Fail-closed assembly of the complete D=42, Delta1 mask-3 certificate."""

from __future__ import annotations

import hashlib
import json
import os
from pathlib import Path


HERE = Path(__file__).resolve().parent
OUTPUT = HERE / "rank8_delta1_new_leaf_mask3_order42_delta1d42_20260825.json"
SHARDS = ((27, 28), (29, 30), (31, 32), (33, 34), (35, 36), (37, 38), (39, 40), (41, 41))
EXPECTED = {
    "prove_rank8_delta1_new_leaf_mask3_order42_exact_F_shard_delta1d42.py":
        "72532F39C0A55ECD40D22BFF4A577DBEC36F9C4B9EDBA8F0D716FB60BE33F459",
    "audit_rank8_delta1_new_leaf_mask3_order42_exact_F_shard_delta1d42.py":
        "A3492F30806A5DFF496ADE7A003516D4374E0ACDA4D9EBAF818BB27B86183051",
    "prove_rank8_delta1_new_leaf_mask3_order42_small_F26_delta1d42.py":
        "588F917516A9C06706ADA9B3F1C1EEF78D34E45B7BA6C111D85126CA49078296",
    "rank8_delta1_new_leaf_mask3_order42_small_F26_delta1d42_20260825.json":
        "DBA04CCDB0D793D7AB8B8665FF1CD4A4C9C80837B5E5EF2A701404330A4AE39F",
    "audit_rank8_delta1_new_leaf_mask3_order42_small_F26_delta1d42.py":
        "634CA74EA55ADE00C28815502F25AB532DB19BC5194DE2697E38BB7DB145DBA5",
    "rank8_delta1_new_leaf_mask3_order42_small_F26_independent_audit_delta1d42_20260825.json":
        "C6BA56CEFD2466F1EC2146420EF4C28ED74F88D0C7640890C78F3BCF24E493E7",
    "audit_rank8_delta1_order42_bound_chain_delta1d42.py":
        "9B2CFE146A767C377D941224E82913CF9C7392829E69EAF2D88F2959E05BD9DE",
    "rank8_delta1_order42_bound_chain_independent_audit_delta1d42_20260825.json":
        "9F3E5C38C5399E584CCD8D306EAC391DDE654D0E1B0B271A7BC69EEDC855907A",
    "rank8_delta1_new_leaf_mask3_order42_exact_F_27_28_delta1d42_20260825.json":
        "851A4BB7DB8341FF388659C621C3F937EFEA09FA6DF79C4537612C1D234AB207",
    "rank8_delta1_new_leaf_mask3_order42_exact_F_27_28_independent_audit_delta1d42_20260825.json":
        "85B27E9374BB094D6A38A11267BA5E539FDEA147415BE23DCBD44F927FA0CB7E",
    "rank8_delta1_new_leaf_mask3_order42_exact_F_29_30_delta1d42_20260825.json":
        "B8A0F411A39576360D859018DF72F2FF651A25E6AAA34D4ED45437BA99F5B538",
    "rank8_delta1_new_leaf_mask3_order42_exact_F_29_30_independent_audit_delta1d42_20260825.json":
        "69488ABE8BCC493D8ACD98EA295A54B7842DD7D648BB5E25E778D5B9E38AB543",
    "rank8_delta1_new_leaf_mask3_order42_exact_F_31_32_delta1d42_20260825.json":
        "C8177BC97452BCC8CFB7CC9DFF68AFC2E0CABF552E549762C8419EF7C9B4633B",
    "rank8_delta1_new_leaf_mask3_order42_exact_F_31_32_independent_audit_delta1d42_20260825.json":
        "6E566AEBDA02D7D7813766E61D3795BE3DDB3D6BF38621133CC6B5F43890CD92",
    "rank8_delta1_new_leaf_mask3_order42_exact_F_33_34_delta1d42_20260825.json":
        "335CB62B9D3E0811B9C3270366237B68B41E3DDEFFF7501048BF6FBEC0C50B49",
    "rank8_delta1_new_leaf_mask3_order42_exact_F_33_34_independent_audit_delta1d42_20260825.json":
        "A5016D2625B15B681B2829107DF00E6E7C4E9526B5E6BD0EA277DD52BDE1F544",
    "rank8_delta1_new_leaf_mask3_order42_exact_F_35_36_delta1d42_20260825.json":
        "BAF7A425730434741DBD3057E11E403A481AA289270D618152AD79A8CCD97CB0",
    "rank8_delta1_new_leaf_mask3_order42_exact_F_35_36_independent_audit_delta1d42_20260825.json":
        "5021FF2903C0E07467429282119F49EED57F0A4F7C4180FFF1703012644B7F36",
    "rank8_delta1_new_leaf_mask3_order42_exact_F_37_38_delta1d42_20260825.json":
        "9E35276AAECD71D6DF44067496D9FAAFD9A4395C87ED8BC781EB9D6EB50B8B4C",
    "rank8_delta1_new_leaf_mask3_order42_exact_F_37_38_independent_audit_delta1d42_20260825.json":
        "2A2342332D1EDA9DDBA30F7AC2DBAD51EAAABA47C270FC68092FCCC900225946",
    "rank8_delta1_new_leaf_mask3_order42_exact_F_39_40_delta1d42_20260825.json":
        "69428E62E8864B78905E357949C76B42733BBA36FC3C7B7CC3DBE991EE717598",
    "rank8_delta1_new_leaf_mask3_order42_exact_F_39_40_independent_audit_delta1d42_20260825.json":
        "BD93851B0918AC810620E9661A000B2ADCDE36656A1879A237D1F7EA4455B736",
    "rank8_delta1_new_leaf_mask3_order42_exact_F_41_41_delta1d42_20260825.json":
        "96B3E31B2379C1AA68A84934073A3D2D6A74E090E902991A1301C842566F0BF1",
    "rank8_delta1_new_leaf_mask3_order42_exact_F_41_41_independent_audit_delta1d42_20260825.json":
        "313B6BC9C0141BBACE4A61B45EE4D70C5930653F8246877BB034808CF9DF9E30",
}


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def load(name: str) -> dict[str, object]:
    return json.loads((HERE / name).read_text(encoding="utf-8"))


def main() -> None:
    actual = {name: sha256(HERE / name) for name in EXPECTED}
    assert actual == EXPECTED, (actual, EXPECTED)
    small_name = (
        "rank8_delta1_new_leaf_mask3_order42_small_F26_"
        "delta1d42_20260825.json"
    )
    small_audit_name = (
        "rank8_delta1_new_leaf_mask3_order42_small_F26_"
        "independent_audit_delta1d42_20260825.json"
    )
    small = load(small_name)
    small_audit = load(small_audit_name)
    bounds = load(
        "rank8_delta1_order42_bound_chain_independent_audit_"
        "delta1d42_20260825.json"
    )
    assert small["status"] == (
        "PASS_EXACT_DELTA1_NEW_LEAF_MASK3_D_ORDER_42_F_ORDER_AT_MOST_26"
    )
    assert small_audit["status"] == (
        "PASS_INDEPENDENT_EXACT_DELTA1_NEW_LEAF_MASK3_D_ORDER_42_"
        "F_ORDER_AT_MOST_26"
    )
    assert bounds["status"] == "PASS_INDEPENDENT_EXACT_DELTA1_ORDER42_BOUND_CHAIN"
    assert small_audit["primary"]["sha256"] == actual[small_name]
    aggregate_keys = ("regions", "coefficients", "negative", "zero", "positive")
    assert all(
        small["aggregate"][key] == small_audit["aggregate"][key]
        for key in aggregate_keys
    )
    assert small["aggregate"] == {
        "regions": 4, "coefficients": 4200,
        "negative": 0, "zero": 0, "positive": 4200,
    }

    exact_coverage = []
    exact_primaries = []
    exact_audits = []
    for first, last in SHARDS:
        primary_name = (
            "rank8_delta1_new_leaf_mask3_order42_exact_F_"
            f"{first}_{last}_delta1d42_20260825.json"
        )
        audit_name = (
            "rank8_delta1_new_leaf_mask3_order42_exact_F_"
            f"{first}_{last}_independent_audit_delta1d42_20260825.json"
        )
        primary = load(primary_name)
        audit = load(audit_name)
        expected_orders = list(range(first, last + 1))
        assert primary["F_orders"] == audit["F_orders"] == expected_orders
        assert primary["status"] == (
            "PASS_EXACT_DELTA1_NEW_LEAF_MASK3_D_ORDER_42_"
            f"F_ORDERS_{first}_THROUGH_{last}"
        )
        assert audit["status"] == (
            "PASS_INDEPENDENT_EXACT_DELTA1_NEW_LEAF_MASK3_D_ORDER_42_"
            f"F_ORDERS_{first}_THROUGH_{last}"
        )
        assert audit["primary"]["sha256"] == actual[primary_name]
        assert all(
            primary["aggregate"][key] == audit["aggregate"][key]
            for key in aggregate_keys
        )
        assert primary["aggregate"]["regions"] == len(expected_orders) * 64
        assert primary["aggregate"]["coefficients"] == len(expected_orders) * 76800
        assert primary["aggregate"]["negative"] == 0
        assert primary["aggregate"]["zero"] == 0
        exact_coverage.extend(expected_orders)
        exact_primaries.append(primary)
        exact_audits.append(audit)
    assert exact_coverage == list(range(27, 42))

    totals = {
        key: small["aggregate"][key]
        + sum(primary["aggregate"][key] for primary in exact_primaries)
        for key in aggregate_keys
    }
    assert totals == {
        "regions": 964,
        "coefficients": 1156200,
        "negative": 0,
        "zero": 0,
        "positive": 1156200,
    }
    digest = hashlib.sha256()
    digest.update(
        (
            "small:"
            + small_audit["aggregate"]["ordered_region_digest_sha256"]
            + "\n"
        ).encode()
    )
    for audit in exact_audits:
        digest.update(
            (
                f"{audit['F_orders'][0]}-{audit['F_orders'][-1]}:"
                + audit["aggregate"]["ordered_region_digest_sha256"]
                + "\n"
            ).encode()
        )

    payload = {
        "schema": "rank8-delta1-new-leaf-mask3-order42-assembled-v1",
        "status": "PASS_EXACT_DELTA1_NEW_LEAF_MASK3_FOR_D_ORDER_42",
        "theorem": (
            "For a tree A, vertex v, D=A-v and F=A-N[v], the Delta1 "
            "new-leaf mask-3 endpoint is nonnegative when |D|=42."
        ),
        "D_order": 42,
        "F_order_partition": [
            {"first_F_order": 0, "last_F_order": 26},
            *[
                {"first_F_order": first, "last_F_order": last}
                for first, last in SHARDS
            ],
        ],
        "coverage": (
            "A tree has deg_A(v)>=1, so |F|<=41. The small branch covers "
            "0<=|F|<=26 and the exact shards cover every integer 27<=|F|<=41."
        ),
        "analytic_bound_chain": {
            "status": bounds["status"],
            "mu4_floor": bounds["mu4_floor"],
            "mu5_floor": bounds["mu5_floor"],
            "x_bounds": bounds["x_bounds"],
            "y_bounds": bounds["y_bounds"],
            "exact_switch_checks": bounds["exact_switch_checks"],
        },
        "aggregate": totals,
        "ordered_partition_digest_sha256": digest.hexdigest().upper(),
        "raw_endpoint_numerator_sha256": small_audit[
            "raw_endpoint_numerator"
        ]["sha256"],
        "cleared_endpoint_denominator": "2744*d5**4*(d6 + f5)",
        "independent_reconstruction": (
            "Every primary box is replayed from the canonical endpoint "
            "transcript by an auditor importing neither producer nor probe."
        ),
        "proof_boundary": (
            "This certificate closes only endpoint mask 3 at D order 42. "
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
