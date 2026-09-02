#!/usr/bin/env python3
"""Joint rooted-floor repair for the 2+2 four-attachment H1 padding coefficient."""

from __future__ import annotations

import hashlib
import json
from pathlib import Path

import sympy as sp

from probe_iso_n7_bundle_g3_adjacent_no_parent_four_attachment_split_padding_rank7_g5_finish import monomial_safe_lower, padding_coefficients
from probe_iso_n7_bundle_g3_sum0_dense_extension_threshold_rank7_g5_finish import choose_poly
from probe_iso_n7_bundle_g5_threshold11_fast_rank7_g5_tail import fast_summary


HERE = Path(__file__).resolve().parent
OUTPUT = HERE / "iso_n7_bundle_g3_adjacent_no_parent_four_attachment_22_padding_H1_joint_floor_h4_probe_rank7_g5_finish_20260831.json"
MARKER = "PROBE_EXACT_ISO_N7_BUNDLE_G3_ADJACENT_NO_PARENT_FOUR_ATTACHMENT_22_PADDING_H1_JOINT_FLOOR_RANK7_G5_FINISH"


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def build_value():
    h, I, JP, JQ, coefficients, (a_value, b_value) = padding_coefficients("2+2")
    exact = coefficients[1]
    baseline, audit = monomial_safe_lower(h, I, JP, JQ, exact, a_value, b_value)
    assert sp.diff(exact, JP[2], JQ[2]) == 38
    assert sp.diff(exact, JP[2], JQ[3]) == 30
    assert sp.diff(exact, JP[3], JQ[2]) == 30
    assert sp.diff(exact, JP[3], JQ[3]) == 20
    # JP2=2h-3-Dp and JQ2=2h-3-Dq.  The four roots lie in distinct
    # components, so Dp,Dq<=e<=h-4 and JP2,JQ2>=h+1.  For either two-root
    # family, sum the single-root induced-pair floors and subtract their
    # exact overlap. Jensen gives
    #   J3 >= 2*C(h-1-D/2,2)-2e+2D-h+2.
    # This decreases on 0<=D<=e<=h-4, hence J3>=(h^2-2h+8)/4.
    rank2_floor = h+1
    rank3_floor = (h**2-2*h+8)/4
    joint_floor = sp.expand(
        38*rank2_floor**2
        + 30*(rank2_floor*rank3_floor+rank3_floor*rank2_floor)
        + 20*rank3_floor**2
    )
    lower = sp.expand(baseline+joint_floor)

    edge_parameter, omega_parameter = sp.symbols("edge_parameter omega_parameter", nonnegative=True)
    extensions = {k: sp.Symbol(f"extension{k}_parameter", nonnegative=True) for k in range(4, 9)}
    edge = (h-4)*edge_parameter
    omega_low, omega_high = 2*edge**2/h-edge, edge**2/2
    omega = omega_low+omega_parameter*(omega_high-omega_low)
    rows = {2: choose_poly(h, 2)-edge, 3: choose_poly(h, 3)-edge*(h-2)+omega}
    for rank in range(4, 9):
        previous = rank-1
        low = ((h-previous)*rows[previous]-2*edge*choose_poly(h-2, previous-1))/rank
        high = (h-previous)*rows[previous]/rank
        rows[rank] = sp.expand(low+extensions[rank]*(high-low))
    value = sp.cancel(lower.subs({I[k]: rows[k] for k in range(2, 9)}))
    return h, (edge_parameter, omega_parameter, *(extensions[k] for k in range(4, 9))), value, exact, lower, audit, joint_floor


def main() -> None:
    h, variables, value, exact, lower, audit, joint_floor = build_value()
    tail = sp.Symbol("tail", nonnegative=True)
    summary = fast_summary(sp.cancel(value.subs(h, tail+4)), variables, tail)
    report = {
        "marker": MARKER,
        "status": "exact diagnostic lower; no theorem asserted",
        "distribution": "2+2",
        "newton_index": 1,
        "threshold_h": 4,
        "exact_newton_coefficient": str(exact),
        "baseline_safe_lower": str(sp.expand(lower-joint_floor)),
        "retained_joint_floor": str(joint_floor),
        "joint_floor_proof": "The positive bilinear block is 38 JP2 JQ2+30(JP2 JQ3+JP3 JQ2)+20 JP3 JQ3. Distinct components give J2>=h+1. Summing the two single-root induced-pair floors, subtracting their exact overlap, and applying Jensen gives J3>=2*C(h-1-D/2,2)-2e+2D-h+2>=(h^2-2h+8)/4 on 0<=D<=e<=h-4.",
        "safe_lower": str(lower),
        "root_monomial_cap_audit": audit,
        "summary": summary,
        "scope": "H1 isolate-padding coefficient for adjacent no-parent split 2+2 exactly-four attachments.",
        "source_sha256": sha256(Path(__file__)),
    }
    raw = json.dumps(report, indent=2, sort_keys=True)+"\n"
    OUTPUT.write_text(raw, encoding="utf-8", newline="\n")
    print(json.dumps({"marker": MARKER, "negative_tail_scalar_coefficients": summary["negative_tail_scalar_coefficients"], "minimum_tail_scalar_coefficient": summary["minimum_tail_scalar_coefficient"], "first_negative": summary["first_negative"]}, indent=2, sort_keys=True))
    print("SOURCE_SHA256", report["source_sha256"])
    print("REPORT_SHA256", hashlib.sha256(raw.encode()).hexdigest().upper())
    print(MARKER)


if __name__ == "__main__":
    main()
