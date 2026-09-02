#!/usr/bin/env python3
"""Nonadjacent retained-isolate cone with its common-compatible frozen minor."""

from __future__ import annotations

import os
from pathlib import Path

import search_iso_n6_bundle_g1_retained_isolate_qfree_mark_cross_edge_lifted_ipm_root as base
from derive_iso_n6_bundle_g1_nonadjacent_common_frozen_cells_root import (
    nonadjacent_common_frozen_cells,
)


HERE = Path(__file__).resolve().parent
OUTPUT = HERE / "iso_n6_bundle_g1_retained_isolate_qfree_nonadjacent_common_frozen_ipm_search_root_20260901.json"
MARKER = "SEARCHED_EXACT_ISO_N6_BUNDLE_G1_RETAINED_ISOLATE_QFREE_NONADJACENT_COMMON_FROZEN_IPM_ROOT"


_base_frozen_cells = base.frozen_cells


def enhanced_frozen_cells(label, variables):
    cells = _base_frozen_cells(label, variables)
    if not label.startswith("adjacent"):
        cells.extend(nonadjacent_common_frozen_cells(variables))
    return cells


def main() -> None:
    os.environ["HANDELMAN_BRANCH"] = "nonadjacent_u0_v0"
    base.frozen_cells = enhanced_frozen_cells
    base.OUTPUT = OUTPUT
    base.MARKER = MARKER
    base.__file__ = __file__
    base.main()


if __name__ == "__main__":
    main()
