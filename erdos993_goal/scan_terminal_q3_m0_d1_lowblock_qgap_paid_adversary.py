#!/usr/bin/env python3
"""Search-only d=1 payment scan with the inductive low-block mass floor."""

from __future__ import annotations

import argparse

import scan_terminal_q3_m0_d1_empty_component_qgap_paid_adversary as base
from prove_d1_spider_inductive_lowblock_qgap_mass_floor_adversary import (
    inductive_lowblock_mass_floor,
)


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--start-order", type=int, default=15)
    parser.add_argument("--order", type=int, default=250)
    parser.add_argument("--R", type=int, default=30)
    parser.add_argument("--rank", type=int, default=50)
    args = parser.parse_args()

    # The imported scan resolves this name at call time.  Replacing the
    # theorem-grade floor leaves all payment/certificate bookkeeping and
    # exact record formatting identical to the preceding search.
    base.enhanced_mass_floor = inductive_lowblock_mass_floor
    result = base.scan(args.start_order, args.order, args.R, args.rank)
    for key, value in result.items():
        print(key, value)
    print(
        "SEARCH_EXACT_D1_INDUCTIVE_LOWBLOCK_QGAP_PAID",
        "PASS" if result["negative_checks"] == 0 else "FAIL",
    )


if __name__ == "__main__":
    main()
