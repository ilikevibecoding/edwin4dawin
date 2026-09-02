#!/usr/bin/env python3
"""Exact parity comparison for an upper Schur/Jacobi tail."""

from __future__ import annotations

import argparse
import json
from pathlib import Path

from analyze_group_arbitrary_layer_schur_pattern import derive_tail, upper_selector


HERE = Path(__file__).resolve().parent
REPORT = HERE / "group_ninth_homogeneous_upper_parity_20260804.json"
LAYER = 8


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--layer", type=int, default=LAYER)
    parser.add_argument("--output", type=Path, default=REPORT)
    args = parser.parse_args()
    layer = args.layer
    if layer < 0:
        parser.error("layer must be nonnegative")
    tail_order = layer // 2 + 2
    selector = upper_selector(layer)
    even_A, even_B = derive_tail(layer, selector, "even")
    odd_A, odd_B = derive_tail(layer, selector, "odd")
    A_identities = [not (left - right) for left, right in zip(even_A, odd_A)]
    B_identities = [not (left - right) for left, right in zip(even_B, odd_B)]
    assert len(even_A) == len(odd_A) == tail_order + 1
    assert len(even_B) == len(odd_B) == tail_order
    assert all(A_identities) and all(B_identities)
    report = {
        "status": f"EXACT_S{layer}_UPPER_PARITY_IDENTITY",
        "layer_deficit": layer,
        f"A{tail_order}_coefficient_identities": A_identities,
        f"B{tail_order - 1}_coefficient_identities": B_identities,
    }
    args.output.write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    print(args.output)


if __name__ == "__main__":
    main()
