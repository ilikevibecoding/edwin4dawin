#!/usr/bin/env python3
"""Generate a hash-pinned manifest for one standardized lower mask-3 row."""

from __future__ import annotations

import argparse
import hashlib
import json
import os
from pathlib import Path


HERE = Path(__file__).resolve().parent
DATE = "20260826"


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def load(path: Path) -> dict[str, object]:
    return json.loads(path.read_text(encoding="utf-8"))


def component(
    label: str,
    first: int,
    last: int,
    primary_name: str,
    audit_name: str,
    primary_status: str,
    audit_status: str,
) -> dict[str, object]:
    primary_path, audit_path = HERE / primary_name, HERE / audit_name
    primary, audit = load(primary_path), load(audit_path)
    assert primary["status"] == primary_status
    assert audit["status"] == audit_status
    assert audit["primary"]["sha256"] == sha256(primary_path)
    for key in ("regions", "coefficients", "negative", "zero", "positive"):
        assert int(primary["aggregate"][key]) == int(audit["aggregate"][key])
    return {
        "label": label,
        "first_F_order": first,
        "last_F_order": last,
        "primary": {
            "path": primary_name,
            "sha256": sha256(primary_path),
            "status": primary_status,
        },
        "audit": {
            "path": audit_name,
            "sha256": sha256(audit_path),
            "status": audit_status,
        },
    }


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--D-order", type=int, required=True)
    parser.add_argument("--small-F-max", type=int, required=True)
    parser.add_argument("--hybrid-first", type=int, required=True)
    parser.add_argument("--hybrid-last", type=int, required=True)
    parser.add_argument("--q5-first", type=int, required=True)
    parser.add_argument("--q5-last", type=int, required=True)
    parser.add_argument("--forest-first", type=int, required=True)
    parser.add_argument("--forest-last", type=int, required=True)
    parser.add_argument("--containment-first", type=int, required=True)
    parser.add_argument("--output", required=True)
    args = parser.parse_args()
    n = args.D_order
    assert 27 <= n <= 34
    ranges = [
        (0, args.small_F_max),
        (args.hybrid_first, args.hybrid_last),
        (args.q5_first, args.q5_last),
        (args.forest_first, args.forest_last),
        (args.containment_first, n - 1),
    ]
    coverage = [value for first, last in ranges for value in range(first, last + 1)]
    assert coverage == list(range(n)), ranges

    prefix = f"rank8_delta1_new_leaf_mask3_D{n}"
    components = []
    small = args.small_F_max
    components.append(
        component(
            f"small-0-{small}", 0, small,
            f"{prefix}_smallF{small}_exact_root_{DATE}.json",
            f"{prefix}_smallF{small}_independent_audit_root_{DATE}.json",
            f"PASS_EXACT_DELTA1_NEW_LEAF_MASK3_D_ORDER_{n}_F_ORDER_AT_MOST_{small}",
            f"PASS_INDEPENDENT_EXACT_DELTA1_NEW_LEAF_MASK3_D_ORDER_{n}_F_ORDER_AT_MOST_{small}_AUDIT",
        )
    )
    for order in range(args.hybrid_first, args.hybrid_last + 1):
        components.append(
            component(
                f"hybrid-{order}", order, order,
                f"{prefix}_F{order}_hybrid_exact_root_{DATE}.json",
                f"{prefix}_F{order}_hybrid_independent_audit_root_{DATE}.json",
                f"PASS_EXACT_DELTA1_NEW_LEAF_MASK3_D_ORDER_{n}_F_ORDER_{order}_HYBRID",
                f"PASS_INDEPENDENT_EXACT_DELTA1_NEW_LEAF_MASK3_D_ORDER_{n}_F_ORDER_{order}_HYBRID_AUDIT",
            )
        )
    for order in range(args.q5_first, args.q5_last + 1):
        components.append(
            component(
                f"q5-coupled-{order}", order, order,
                f"{prefix}_F{order}_q5coupled_exact_root_{DATE}.json",
                f"{prefix}_F{order}_q5coupled_independent_audit_root_{DATE}.json",
                f"PASS_EXACT_DELTA1_NEW_LEAF_MASK3_D_ORDER_{n}_F_ORDER_{order}_Q5_COUPLED",
                f"PASS_INDEPENDENT_EXACT_DELTA1_NEW_LEAF_MASK3_D_ORDER_{n}_F_ORDER_{order}_Q5_COUPLED_AUDIT",
            )
        )
    for order in range(args.forest_first, args.forest_last + 1):
        components.append(
            component(
                f"forest-q5-{order}", order, order,
                f"{prefix}_F{order}_forestq5_exact_root_{DATE}.json",
                f"{prefix}_F{order}_forestq5_independent_audit_root_{DATE}.json",
                f"PASS_EXACT_DELTA1_NEW_LEAF_MASK3_D_ORDER_{n}_F_ORDER_{order}_FOREST_Q5_COUPLED",
                f"PASS_INDEPENDENT_EXACT_DELTA1_NEW_LEAF_MASK3_D_ORDER_{n}_F_ORDER_{order}_FOREST_Q5_COUPLED_AUDIT",
            )
        )
    for order in range(args.containment_first, n):
        components.append(
            component(
                f"containment-q5-{order}", order, order,
                f"{prefix}_F{order}_containmentq5_exact_root_{DATE}.json",
                f"{prefix}_F{order}_containmentq5_independent_audit_root_{DATE}.json",
                f"PASS_EXACT_DELTA1_NEW_LEAF_MASK3_D_ORDER_{n}_F_ORDER_{order}_CONTAINMENT_Q5",
                f"PASS_INDEPENDENT_EXACT_DELTA1_NEW_LEAF_MASK3_D_ORDER_{n}_F_ORDER_{order}_CONTAINMENT_Q5_AUDIT",
            )
        )

    payload = {
        "schema": "rank8-delta1-mask3-lower-order-manifest-v1",
        "D_order": n,
        "components": components,
        "generator_source_sha256": sha256(Path(__file__)),
    }
    output = Path(args.output).resolve()
    temporary = output.with_suffix(output.suffix + ".tmp")
    temporary.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    os.replace(temporary, output)
    print("PASS_GENERATED_HASH_PINNED_MASK3_MANIFEST_D_ORDER", n)
    print("COMPONENTS", len(components), "F_ORDERS", len(coverage))
    print("SOURCE", payload["generator_source_sha256"])
    print("REPORT", sha256(output))


if __name__ == "__main__":
    main()
