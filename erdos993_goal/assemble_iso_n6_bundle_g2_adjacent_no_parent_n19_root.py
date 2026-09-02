#!/usr/bin/env python3
"""Assemble all induced-order branches for adjacent no-parent rank-six g2."""

from __future__ import annotations

from fractions import Fraction
import hashlib
import json
import math
from pathlib import Path

from probe_iso_n6_bundle_g2_adjacent_wedge_simplex_flint_root import weak_compositions


HERE = Path(__file__).resolve().parent
OUTPUT = HERE / "iso_n6_bundle_g2_adjacent_no_parent_n19_exact_root_20260831.json"
MARKER = "PASS_EXACT_ISO_N6_BUNDLE_G2_ADJACENT_NO_PARENT_N19_ROOT"
SMALL_MARKER = "PROBE_EXACT_ISO_N6_BUNDLE_G2_ADJACENT_WEDGE_SMALL_ORDER_FLINT_ROOT"
LARGE_MARKER = "PASS_EXACT_ISO_N6_BUNDLE_G2_ADJACENT_WEDGE_LARGE_ROOT"

SMALL_SOURCE = "probe_iso_n6_bundle_g2_adjacent_wedge_small_order_flint_root.py"
SMALL_SOURCE_SHA256 = "CC417A1AFD6F1D27A1E01E33B00C69B0018D9E190E0C3B89EC79E1E38F807C7F"
SMALL_MANIFEST_SHA256 = "124D8CC8747E9E4C318E867061EB07538ECAFF92BD0D97A2CA2DF4EA201028FF"
LARGE_SOURCE = "assemble_iso_n6_bundle_g2_adjacent_wedge_large_root.py"
LARGE_SOURCE_SHA256 = "FD2ED3AB20B40BD220E95C8F0460C317EA596C2A960AE00E0C147D7B9D9DFB6C"
LARGE_REPORT = "iso_n6_bundle_g2_adjacent_wedge_large_exact_root_20260831.json"
LARGE_REPORT_SHA256 = "2B814008BDD36EAD3C90008304754D6EE61DE8EF36D54133F682A7CFE2AE9C50"


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def load(path: Path) -> dict:
    return json.loads(path.read_text(encoding="utf-8"))


def shard_name(k: int, bmask: int, cmask: int) -> str:
    return (
        "iso_n6_bundle_g2_adjacent_wedge_small_order_"
        f"k{k}_B{bmask}_C{cmask}_beta0_70_flint_probe_root_20260831.json"
    )


def verify_small_shards() -> tuple[dict[str, object], list[dict[str, object]]]:
    assert sha256(HERE / SMALL_SOURCE) == SMALL_SOURCE_SHA256
    expected_names = [
        shard_name(k, bmask, cmask)
        for k in range(7) for bmask in (0, 1) for cmask in (0, 1)
    ]
    actual_names = sorted(
        path.name for path in HERE.glob(
            "iso_n6_bundle_g2_adjacent_wedge_small_order_k*_beta0_70_flint_probe_root_20260831.json"
        )
    )
    assert actual_names == sorted(expected_names)

    hashes = {name: sha256(HERE / name) for name in sorted(expected_names)}
    manifest_stream = "".join(
        f"{name}\0{hashes[name]}\n" for name in sorted(expected_names)
    )
    manifest = hashlib.sha256(manifest_stream.encode()).hexdigest().upper()
    assert manifest == SMALL_MANIFEST_SHA256

    expected_betas = list(weak_compositions(4, 5))
    assert len(expected_betas) == 70
    summaries = []
    total_simplex = 0
    total_tensor = 0
    global_minimum = None
    for k in range(7):
        for bmask in (0, 1):
            for cmask in (0, 1):
                name = shard_name(k, bmask, cmask)
                report = load(HERE / name)
                assert report["marker"] == SMALL_MARKER
                assert report["source_sha256"] == SMALL_SOURCE_SHA256
                assert report["small_B_order"] == k
                assert report["B_mask"] == bmask and report["C_mask"] == cmask
                assert report["geometry"] == (
                    f"N=19+h; mB={k}; mC=N-mB+mB*y; overlap=mB*y; "
                    "e=overlap*z; Omega=e^2*w/2"
                )
                assert report["positive_multiplier"] == "N^4*a2^4"
                assert report["reduced_four_corner_mode"] is True
                assert report["simplex_degree"] == 4
                assert report["homogeneous_simplex_coefficients"] == 70
                assert report["start_beta"] == 0 and report["stop_beta"] == 70
                assert report["processed_betas"] == 70
                assert report["negative_betas"] == 0
                assert len(report["records"]) == 70

                digest = hashlib.sha256()
                shard_minimum = None
                shard_tensor = 0
                for index, record in enumerate(report["records"]):
                    assert record["beta_index"] == index
                    assert tuple(record["beta"]) == expected_betas[index]
                    assert record["negative"] == 0 and record["zero"] == 0
                    minimum = Fraction(record["minimum"])
                    assert minimum > 0
                    shard_minimum = minimum if shard_minimum is None else min(
                        shard_minimum, minimum
                    )
                    shard_tensor += record["bernstein_coefficients"]
                    digest.update(json.dumps(
                        record, separators=(",", ":"), sort_keys=True
                    ).encode())
                assert digest.hexdigest().upper() == report["ordered_record_sha256"]
                total_simplex += 70
                total_tensor += shard_tensor
                global_minimum = shard_minimum if global_minimum is None else min(
                    global_minimum, shard_minimum
                )
                summaries.append({
                    "file": name,
                    "sha256": hashes[name],
                    "small_B_order": k,
                    "B_rank2_endpoint": "EDGELESS" if bmask else "PATH",
                    "C_rank2_endpoint": "EDGELESS" if cmask else "PATH",
                    "simplex_coefficients": 70,
                    "tensor_bernstein_coefficients": shard_tensor,
                    "minimum": str(shard_minimum),
                    "negative": 0,
                    "zero": 0,
                    "ordered_record_sha256": report["ordered_record_sha256"],
                })
    assert total_simplex == 7 * 4 * 70 == 1960
    assert total_tensor == 21_649_368
    assert global_minimum == Fraction(1, 11520)
    return ({
        "fixed_small_orders": 7,
        "rank2_corner_pairs_per_order": 4,
        "shards": 28,
        "simplex_coefficients": total_simplex,
        "tensor_bernstein_coefficients": total_tensor,
        "global_minimum": str(global_minimum),
        "negative": 0,
        "zero": 0,
        "manifest_sha256": manifest,
        "second_byte_identical_replay": True,
    }, summaries)


def verify_large_branch() -> dict[str, object]:
    assert sha256(HERE / LARGE_SOURCE) == LARGE_SOURCE_SHA256
    assert sha256(HERE / LARGE_REPORT) == LARGE_REPORT_SHA256
    report = load(HERE / LARGE_REPORT)
    assert report["marker"] == LARGE_MARKER
    assert report["source_sha256"] == LARGE_SOURCE_SHA256
    assert "N>=19" in report["theorem"]
    assert "orders at least 7" in report["theorem"]
    total = report["certificate_total"]
    assert total["simplex_coefficients"] == 560
    assert total["tensor_bernstein_coefficients"] == 79_359_544
    assert total["negative"] == 0 and total["zero"] == 0
    assert Fraction(total["global_minimum"]) == Fraction(1, 11520)
    return {
        "file": LARGE_REPORT,
        "sha256": LARGE_REPORT_SHA256,
        "scope": "N>=19 and min(mB,mC)>=7",
        "simplex_coefficients": total["simplex_coefficients"],
        "tensor_bernstein_coefficients": total["tensor_bernstein_coefficients"],
        "global_minimum": total["global_minimum"],
        "negative": 0,
        "zero": 0,
    }


def main() -> None:
    small_total, small_shards = verify_small_shards()
    large = verify_large_branch()
    combined_tensor = (
        small_total["tensor_bernstein_coefficients"]
        + large["tensor_bernstein_coefficients"]
    )
    assert combined_tensor == 101_008_912
    report = {
        "marker": MARKER,
        "status": "PASS exact adjacent no-parent N>=19 rank-six g2 theorem",
        "theorem": (
            "For every finite forest in the adjacent-mark canonical no-parent "
            "rank-six whole-bundle geometry whose common row A has order N>=19, "
            "the coefficient g2 is nonnegative, for all feasible induced-row orders."
        ),
        "coverage": {
            "symmetry_reduction": "swap B,C so mB=min(|B|,|C|)",
            "small_branch": "mB=0,...,6 and mC=N-mB+mB*y, 0<=y<=1",
            "large_branch": "7<=mB<=mC<=N with mB+mC>=N",
            "exhaustive": True,
        },
        "small_certificate_total": small_total,
        "small_shards": small_shards,
        "large_certificate": large,
        "combined": {
            "shards": 36,
            "simplex_coefficients": small_total["simplex_coefficients"] + large["simplex_coefficients"],
            "tensor_bernstein_coefficients": combined_tensor,
            "negative": 0,
            "zero": 0,
            "global_minimum": "1/11520",
        },
        "scope_guard": (
            "This theorem does not cover ambient orders N<=18, nonadjacent marks, "
            "or parent modes; it is not universal rank-six g2."
        ),
        "source_sha256": hashlib.sha256(Path(__file__).read_bytes()).hexdigest().upper(),
    }
    raw = json.dumps(report, indent=2, sort_keys=True) + "\n"
    OUTPUT.write_text(raw, encoding="utf-8", newline="\n")
    print(json.dumps({
        "marker": MARKER,
        "small_shards": small_total["shards"],
        "combined_tensor_bernstein_coefficients": combined_tensor,
        "global_minimum": report["combined"]["global_minimum"],
    }, indent=2, sort_keys=True))
    print("SOURCE_SHA256", report["source_sha256"])
    print("REPORT_SHA256", hashlib.sha256(raw.encode()).hexdigest().upper())
    print(MARKER)


if __name__ == "__main__":
    main()
