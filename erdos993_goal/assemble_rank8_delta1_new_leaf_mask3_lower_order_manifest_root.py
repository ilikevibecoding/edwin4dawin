#!/usr/bin/env python3
"""Fail-closed generic assembly of one finite lower-order mask-3 row."""

from __future__ import annotations

import argparse
import hashlib
import json
import os
from pathlib import Path


ENDPOINT_SHA256 = "5298C43C68E11DEA0072E4BF78AFB212FB32ACEC84C6FC25C492EEC4C050404E"
AGGREGATE_KEYS = ("regions", "coefficients", "negative", "zero", "positive")


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def load(path: Path) -> dict[str, object]:
    return json.loads(path.read_text(encoding="utf-8"))


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--manifest", required=True)
    parser.add_argument("--expected-manifest-sha256", required=True)
    parser.add_argument("--output", required=True)
    args = parser.parse_args()

    manifest_path = Path(args.manifest).resolve()
    manifest_sha256 = sha256(manifest_path)
    assert manifest_sha256 == args.expected_manifest_sha256.upper()
    manifest = load(manifest_path)
    assert manifest["schema"] == "rank8-delta1-mask3-lower-order-manifest-v1"
    n_value = int(manifest["D_order"])
    assert 26 <= n_value <= 34
    specifications = manifest["components"]
    assert specifications

    coverage: list[int] = []
    endpoint_hashes = set()
    digest = hashlib.sha256()
    totals = dict.fromkeys(AGGREGATE_KEYS, 0)
    pinned_inputs: dict[str, str] = {}
    assembled_partition = []

    for specification in specifications:
        label = str(specification["label"])
        first = int(specification["first_F_order"])
        last = int(specification["last_F_order"])
        assert 0 <= first <= last < n_value
        primary_record = specification["primary"]
        audit_record = specification["audit"]
        primary_path = (manifest_path.parent / primary_record["path"]).resolve()
        audit_path = (manifest_path.parent / audit_record["path"]).resolve()
        assert primary_path.parent == manifest_path.parent
        assert audit_path.parent == manifest_path.parent
        primary_hash = sha256(primary_path)
        audit_hash = sha256(audit_path)
        assert primary_hash == str(primary_record["sha256"]).upper()
        assert audit_hash == str(audit_record["sha256"]).upper()
        assert primary_path.name not in pinned_inputs
        assert audit_path.name not in pinned_inputs
        pinned_inputs[primary_path.name] = primary_hash
        pinned_inputs[audit_path.name] = audit_hash

        primary, audit = load(primary_path), load(audit_path)
        assert primary["status"] == primary_record["status"]
        assert audit["status"] == audit_record["status"]
        assert int(primary["D_order"]) == int(audit["D_order"]) == n_value
        assert audit["primary"]["sha256"] == primary_hash
        assert all(
            int(primary["aggregate"][key]) == int(audit["aggregate"][key])
            for key in AGGREGATE_KEYS
        )
        assert int(primary["aggregate"]["negative"]) == 0
        assert int(audit["aggregate"]["negative"]) == 0
        assert int(audit["aggregate"]["coefficients"]) == (
            int(audit["aggregate"]["zero"])
            + int(audit["aggregate"]["positive"])
        )
        endpoint_hashes.add(audit["raw_endpoint_numerator"]["sha256"])
        ordered_digest = audit["aggregate"]["ordered_region_digest_sha256"]
        digest.update(f"{label}:{ordered_digest}\n".encode())
        coverage.extend(range(first, last + 1))
        for key in AGGREGATE_KEYS:
            totals[key] += int(primary["aggregate"][key])
        assembled_partition.append(
            {
                "label": label,
                "first_F_order": first,
                "last_F_order": last,
                "primary_sha256": primary_hash,
                "audit_sha256": audit_hash,
            }
        )

    assert coverage == list(range(n_value))
    assert endpoint_hashes == {ENDPOINT_SHA256}
    assert totals["negative"] == 0
    assert totals["coefficients"] == totals["zero"] + totals["positive"]
    payload = {
        "schema": "rank8-delta1-new-leaf-mask3-lower-order-manifest-assembled-v1",
        "status": (
            "PASS_EXACT_AND_INDEPENDENT_DELTA1_NEW_LEAF_MASK3_FOR_D_ORDER_"
            f"{n_value}"
        ),
        "theorem": (
            "For a tree A, vertex v, D=A-v and F=A-N[v], the Delta1 "
            f"new-leaf mask-3 endpoint is nonnegative when |D|={n_value}."
        ),
        "D_order": n_value,
        "F_orders": coverage,
        "F_order_partition": assembled_partition,
        "coverage": (
            f"Because deg_A(v)>=1, |F|<=|D|-1={n_value - 1}; the manifest "
            f"partition is exactly 0 through {n_value - 1} without a gap."
        ),
        "aggregate": totals,
        "ordered_partition_digest_sha256": digest.hexdigest().upper(),
        "raw_endpoint_numerator_sha256": ENDPOINT_SHA256,
        "cleared_endpoint_denominator": "2744*d5**4*(d6 + f5)",
        "independent_reconstruction": (
            "Every primary region is bound to an import-independent replay "
            "from the canonical endpoint transcript."
        ),
        "proof_boundary": (
            f"This certificate closes endpoint mask 3 only at D order {n_value}."
        ),
        "manifest": {"path": str(manifest_path), "sha256": manifest_sha256},
        "pinned_inputs": pinned_inputs,
        "source_sha256": sha256(Path(__file__)),
    }
    output = Path(args.output).resolve()
    temporary = output.with_suffix(output.suffix + ".tmp")
    temporary.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    os.replace(temporary, output)
    print(payload["status"])
    print("F_ORDERS", len(coverage), coverage[0], coverage[-1])
    print("REGIONS", totals["regions"], "COEFFICIENTS", totals["coefficients"])
    print("MANIFEST", manifest_sha256)
    print("SOURCE", payload["source_sha256"])
    print("REPORT", sha256(output))


if __name__ == "__main__":
    main()
