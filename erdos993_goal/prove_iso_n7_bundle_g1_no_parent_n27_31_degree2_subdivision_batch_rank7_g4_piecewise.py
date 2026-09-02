#!/usr/bin/env python3
"""Exact subdivision/payment theorem for degree-two orders 27..31."""

from __future__ import annotations

import hashlib
import json
import math
from fractions import Fraction
from pathlib import Path

import probe_iso_n7_bundle_g1_no_parent_n27_31_degree2_subdivision_batch_rank7_g4_piecewise as probe


HERE = Path(__file__).resolve().parent
OUTPUT = HERE / (
    "iso_n7_bundle_g1_no_parent_n27_31_degree2_subdivision_batch_exact_"
    "rank7_g4_piecewise_20260831.json"
)
MARKER = (
    "PASS_EXACT_ISO_N7_BUNDLE_G1_NO_PARENT_N27_31_DEGREE2_"
    "SUBDIVISION_BATCH_RANK7_G4_PIECEWISE"
)
DEPENDENCIES = {
    "probe_iso_n7_bundle_g1_no_parent_n27_31_degree2_subdivision_batch_rank7_g4_piecewise.py":
        "B651AD91A7B0A34D7743763E6C454C2D88B0BB4D6EA327B3B86C84F949E923E4",
    "probe_iso_n7_bundle_g1_no_parent_n27_31_degree2_subdivision_batch_rank7_g4_piecewise_20260831.json":
        "498F2F1BECF205A5AB424C95F3E591FA6DCFF327BD8CB84524ED8920F002FDAD",
    "probe_iso_n7_bundle_g1_sum0_connected_high_degree_profiles_rank7_g4_piecewise.py":
        "300C8AF1CF91E42047B2A888908DFCC21E765778D1AD3B0E650B0713B8E64B92",
    "probe_iso_n7_bundle_g1_sum0_connected_high_degree_profiles_p4_rank7_g4_piecewise.py":
        "005A3CF6E2A5F7B67D0B2EB2A0E9D63C5F9E8DD959EDAE82DA9BCBFE8BE78AF4",
    "derive_iso_n7_bundle_g1_edge_subdivision_q_increment_shadow_obstruction_rank7_g4_piecewise.py":
        "3337E701EAE2E534F78E013F93FE3AA2437978794A3849FA44E7D67C4A9C8DB9",
    "iso_n7_bundle_g1_edge_subdivision_q_increment_shadow_obstruction_exact_rank7_g4_piecewise_20260831.json":
        "84CFD187FD13E8445E40129C83B11A5FBC69E62B2EDBC2F9803E0E08F4381A90",
    "derive_iso_n7_bundle_g1_edge_subdivision_g2_profile_cone_obstruction_rank7_g4_piecewise.py":
        "0023B1FDAE66FF2B446ABA956E4573B2E1DCAB1EC43436795DD697EA3CC6CA51",
    "iso_n7_bundle_g1_edge_subdivision_g2_profile_cone_obstruction_exact_rank7_g4_piecewise_20260831.json":
        "1F62A92CD0D19132942097FB020A04FEEBC210F7FB021ECC533CB0A6CEC7E65C",
    "assemble_iso_n7_bundle_g1_no_parent_n26_complete_rank7_g4_piecewise.py":
        "047EC9DAEBA8C6F1CBE5072FC33AD5B8EEA92CBB24CDA2E567BAB3E773D1B5CB",
    "iso_n7_bundle_g1_no_parent_n26_complete_exact_rank7_g4_piecewise_20260831.json":
        "6DA22678C1C15973F9E45EE33AD5A64DCBBA102422DD5F324A238F9BD7C40AA9",
    "iso_n7_bundle_g1_no_parent_n26_degree2_subdivision_exact_rank7_g4_piecewise_20260831.json":
        "415636952D93008B3B2DA15673A1BD20231F7D757B9D12A64518C553E4A373E2",
    "iso_n7_bundle_g1_no_parent_n26_degree2free_core_leaf_census_exact_rank7_g4_piecewise_20260831.json":
        "25870F1532D012C78340ED3602A809EAA130D5FBFD57EA49C50DCE22E16D942E",
    "prove_iso_n7_bundle_g1_no_parent_n27_31_degree2free_core_leaf_batch_rank7_g4_piecewise.py":
        "0EC3C28AA33174F23611AA31E96F81D4CB7424BD97268D8FBBFDE806CF597926",
    "iso_n7_bundle_g1_no_parent_n27_31_degree2free_core_leaf_batch_exact_rank7_g4_piecewise_20260831.json":
        "E6986EDF9E64C9F6F9786FAEF4D287CA5268A296473E4CA4986886C16844F114",
}
EXPECTED = {
    27: (1255, 2462, 155106, "-2448184327/7", "8A818BEE0F685D5A433A261FBE2B82F94A786AB72D02F39CEB9861D5528933CE"),
    28: (1575, 3100, 195300, "-7173464999/6", "954CBA5B8905C5115EE901A13D121F4470DE5B09678CFCB25D0D7E1501979216"),
    29: (1958, 3864, 243432, "-7914623137/3", "745B37A999A633CC1878F4B8981976EC46BE349F74BC57B035FDF7A127592C6D"),
    30: (2436, 4818, 303534, "-69416825935/14", "1A69482056EE32806A3FDBF29223E1A1DEC5D2549297382F8621C6885EC4866C"),
    31: (3010, 5964, 375732, "-59740677504/7", "A8CE08EE99E876954AEFBFFA18FD26E1B83EC7D77A10C44947887484223B5D2D"),
}


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def main() -> None:
    for name, digest in DEPENDENCIES.items():
        assert sha256(HERE / Path(name)) == digest, name

    # Byte-identical replay of all five exact profile certificates.
    probe.main()
    assert sha256(probe.OUTPUT) == DEPENDENCIES[probe.OUTPUT.name]
    raw = json.loads(probe.OUTPUT.read_text(encoding="utf-8"))
    for order, expected in EXPECTED.items():
        record = raw["results"][str(order)]
        assert (
            record["profiles"],
            record["eligible_g2_endpoint_cases"],
            record["bernstein_controls"],
            record["increment_lower_bound"],
            record["ordered_certificate_stream_sha256"],
        ) == expected

    # Check the strict high-row monotonicity that validates substituting the
    # normalized-shadow chain in every prefix and every order in the batch.
    for contracted_order in range(25, 30):
        h2 = math.comb(contracted_order - 1, 2)
        for g2 in range(h2 + 1):
            for prefix in range(7):
                coefficient6 = -157*h2
                if prefix >= 1:
                    coefficient6 -= 51*g2
                if prefix >= 2:
                    coefficient6 -= Fraction(10*g2*(contracted_order - 3), 3)
                # The omitted -73*H3 is strictly negative.
                assert coefficient6 < 0
                # The omitted -18*H3 is strictly negative as well.
                coefficient7 = -59*h2 - (8*g2 if prefix >= 1 else 0)
                assert coefficient7 < 0
                assert -8*h2 < 0

    n26_degree2 = json.loads((
        HERE / "iso_n7_bundle_g1_no_parent_n26_degree2_subdivision_exact_"
        "rank7_g4_piecewise_20260831.json"
    ).read_text(encoding="utf-8"))
    n26_degree2free = json.loads((
        HERE / "iso_n7_bundle_g1_no_parent_n26_degree2free_core_leaf_census_exact_"
        "rank7_g4_piecewise_20260831.json"
    ).read_text(encoding="utf-8"))
    degree2free = json.loads((
        HERE / "iso_n7_bundle_g1_no_parent_n27_31_degree2free_core_leaf_batch_exact_"
        "rank7_g4_piecewise_20260831.json"
    ).read_text(encoding="utf-8"))
    global_lower = min(
        Fraction(n26_degree2["payment"]["resulting_order26_lower_bound"]),
        Fraction(n26_degree2free["exact_evaluation"]["minimum"]["value"]),
    )
    assert global_lower == Fraction(830_606_786_371, 42)

    propagation = {}
    for order in range(27, 32):
        increment = Fraction(raw["results"][str(order)]["increment_lower_bound"])
        degree2_lower = global_lower + increment
        degree2free_minimum = Fraction(
            degree2free["orders"][str(order)]["minimum_G1"]
        )
        assert degree2_lower > 0
        assert degree2free_minimum > 0
        new_global = min(degree2_lower, degree2free_minimum)
        propagation[str(order)] = {
            "previous_all_tree_lower_bound": str(global_lower),
            "subdivision_increment_lower_bound": str(increment),
            "degree2_tree_lower_bound": str(degree2_lower),
            "degree2free_exact_minimum": str(degree2free_minimum),
            "all_tree_lower_bound": str(new_global),
        }
        global_lower = new_global
    assert global_lower == Fraction(29_401_386_223, 14) > 0

    report = {
        "marker": MARKER,
        "status": "proved exact",
        "theorem": (
            "For each order m=27,28,29,30,31, every connected m-vertex "
            "tree W in the rank-seven common0/sum0 no-parent G1 cell with "
            "maximum degree at least four, at least three branching "
            "vertices, and at least one degree-two vertex has strictly "
            "positive G1."
        ),
        "subdivision_reduction": (
            "Suppress a degree-two vertex. The resulting (m-1)-vertex tree "
            "retains the same maximum degree and branching vertices. The "
            "exact subdivision identity and normalized-shadow-chain profile "
            "certificate bound the G1 increment; the previous all-tree "
            "lower bound pays that increment."
        ),
        "normalized_shadow_chain": [
            "6 H6 <= (h-5) H5",
            "7 H7 <= (h-6) H6",
            "8 H8 <= (h-7) H7",
        ],
        "profile_certificates": raw["results"],
        "sequential_payment": propagation,
        "final_order31_all_tree_lower_bound_after_combining_degree2free": str(
            global_lower
        ),
        "coverage_gap_within_stated_degree2_orders_27_31_scope": None,
        "remaining_scope_after_combining_degree2free_batch": (
            "None in orders 27..31 for this connected high-degree "
            "common0/sum0 no-parent G1 cell."
        ),
        "scope_guard": (
            "This theorem itself covers the degree-two lane. Its payment "
            "recurrence uses the separately frozen degree-two-free batch to "
            "maintain a valid all-tree lower bound at each preceding order."
        ),
        "dependencies_sha256": DEPENDENCIES,
        "source_sha256": sha256(Path(__file__)),
    }
    encoded = json.dumps(report, indent=2, sort_keys=True) + "\n"
    OUTPUT.write_text(encoded, encoding="utf-8", newline="\n")
    print(json.dumps({
        "marker": MARKER,
        "orders": [27, 31],
        "degree_two_lane": "proved exact",
        "final_order31_all_tree_lower_bound": str(global_lower),
        "coverage_gap_within_stated_degree2_orders_27_31_scope": None,
    }, indent=2, sort_keys=True))
    print("SOURCE_SHA256", report["source_sha256"])
    print("REPORT_SHA256", hashlib.sha256(encoded.encode()).hexdigest().upper())
    print(MARKER)


if __name__ == "__main__":
    main()
