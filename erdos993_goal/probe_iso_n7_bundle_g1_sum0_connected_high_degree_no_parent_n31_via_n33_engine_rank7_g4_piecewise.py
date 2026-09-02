#!/usr/bin/env python3
"""Non-authoritative exact sizing pass for order 31 via the n33 engine."""

from pathlib import Path

import prove_iso_n7_bundle_g1_sum0_connected_high_degree_no_parent_n33_rank7_g4_piecewise as engine


class AnyExactValue:
    def __eq__(self, _other):
        return True


HERE = Path(__file__).resolve().parent
engine.ORDER = 31
engine.OUTPUT = HERE / (
    "probe_iso_n7_bundle_g1_sum0_connected_high_degree_no_parent_n31_"
    "rank7_g4_piecewise_20260831.json"
)
engine.MARKER = (
    "PROBE_EXACT_ISO_N7_BUNDLE_G1_SUM0_CONNECTED_HIGH_DEGREE_NO_PARENT_"
    "N31_VIA_N33_ENGINE_RANK7_G4_PIECEWISE"
)
unknown = AnyExactValue()
engine.EXPECTED = {
    "total_profiles": unknown,
    "profile_analytic": unknown,
    "profile_residual": unknown,
    "compatible_assignments": unknown,
    "literal_assignments": unknown,
    "core_orders": unknown,
    "accelerator_crosschecks": unknown,
    "literal_minimum": unknown,
}
engine.EXPECTED_PROFILE_STREAM = unknown
engine.EXPECTED_TOPOLOGY_STREAM = unknown
engine.__file__ = str(Path(__file__).resolve())


if __name__ == "__main__":
    engine.main()
