#!/usr/bin/env python3
"""Adjacent retained-isolate cone with the common-compatible frozen minor."""

from __future__ import annotations

import os
from pathlib import Path

import search_iso_n6_bundle_g1_retained_isolate_qfree_adjacent_common_compatible_ipm_root as base
from derive_iso_n6_bundle_g1_adjacent_common_frozen_cells_root import (
    adjacent_common_frozen_cells,
)


HERE = Path(__file__).resolve().parent
OUTPUT = HERE / "iso_n6_bundle_g1_retained_isolate_qfree_adjacent_common_frozen_ipm_search_root_20260901.json"
MARKER = "SEARCHED_EXACT_ISO_N6_BUNDLE_G1_RETAINED_ISOLATE_QFREE_ADJACENT_COMMON_FROZEN_IPM_ROOT"


_base_frozen_cells = base.frozen_cells


def enhanced_frozen_cells(label, variables):
    cells = _base_frozen_cells(label, variables)
    if label.startswith("adjacent"):
        cells.extend(adjacent_common_frozen_cells(variables))
    return cells


def main() -> None:
    os.environ["HANDELMAN_BRANCH"] = "adjacent_u0_v0"
    base.frozen_cells = enhanced_frozen_cells
    base.OUTPUT = OUTPUT
    base.MARKER = MARKER
    # Make the producer hash name the actual wrapper that defines the stronger
    # cone rather than the imported sparse assembly engine.
    base.__file__ = __file__
    base.main()


if __name__ == "__main__":
    main()
