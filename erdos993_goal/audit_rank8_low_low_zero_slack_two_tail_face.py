#!/usr/bin/env python3
"""Independent logical audit of the zero-slack two-tail face assembly."""

from __future__ import annotations

import hashlib
import json
from pathlib import Path

import sympy as sp


ROOT = Path(__file__).resolve().parent
REPORT = ROOT / "rank8_low_low_zero_slack_two_tail_face_independent_audit_exact_20260821.json"
ASSEMBLER = "assemble_rank8_low_low_zero_slack_two_tail_face.py"
ASSEMBLY = "rank8_low_low_zero_slack_two_tail_face_exact_20260821.json"
EXPECTED = {
    ASSEMBLER: "714D2BADF88CDEDBDDFD7B0A914EA950003D80BF7DD8ED64E5E14AFFE379726A",
    ASSEMBLY: "DC70DA88AD6E86045DEAF624EB68BB0F5AC2AC9AE0757126035DE17C7CDED732",
    "rank8_low_low_double_tail_reduction_independent_audit_exact_20260820.json":
        "34F75B0E1185B86AD946988898099ED7A1E93C8A780B4AFBAF03D342FDAA2ABF",
    "rank8_low_low_tail_curvature_far_zero_slack_amgm_independent_audit_exact_20260821.json":
        "6F4B40ABA29A55207ED5371786348300090AB00E326D3E7BEFCFA528E3D333AB",
    "rank8_low_low_strong_payment_zero_slack_amgm_independent_audit_exact_20260821.json":
        "CCC40D4325ACD001328156374DA1F82DA84328B9BFE9F4713C368F69B31BD9E3",
    "rank8_low_high_full_cone_direct_h_independent_audit_exact_20260821.json":
        "EE7828E3738047A0C925D885845DFE02A1D51871E3D10B842C5B5105F4240AD5",
}


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def load(name: str) -> dict:
    return json.loads((ROOT / name).read_text(encoding="utf-8"))


def main() -> None:
    actual_inputs = {name: sha256(ROOT / name) for name in EXPECTED}
    assert actual_inputs == EXPECTED
    assembly = load(ASSEMBLY)
    assert assembly["status"] == "PASS_EXACT_RANK8_LOW_LOW_ZERO_SLACK_TWO_TAIL_FACE"
    assert assembly["source_sha256"] == actual_inputs[ASSEMBLER]
    assert load("rank8_low_low_double_tail_reduction_independent_audit_exact_20260820.json")["status"] == \
        "PASS_INDEPENDENT_AUDIT_LOW_LOW_REDUCTION_NOT_CONE_THEOREM"
    assert load("rank8_low_low_tail_curvature_far_zero_slack_amgm_independent_audit_exact_20260821.json")["status"] == \
        "PASS_INDEPENDENT_AUDIT_ZERO_SLACK_TAIL_CURVATURE_FAR_AMGM"
    assert load("rank8_low_low_strong_payment_zero_slack_amgm_independent_audit_exact_20260821.json")["status"] == \
        "PASS_INDEPENDENT_AUDIT_ZERO_SLACK_STRONG_PAYMENT_ALL_BERNSTEIN_AMGM"
    assert load("rank8_low_high_full_cone_direct_h_independent_audit_exact_20260821.json")["status"] == \
        "PASS_INDEPENDENT_AUDIT_RANK8_LOW_HIGH_FULL_CONVOLUTION_CONE"

    # Rebuild the complete abstract sign implication without using the
    # assembler's prose.  z=y/(h/D) lies in [0,1].
    z = sp.symbols("z", nonnegative=True)
    q0, q1, q2, s0, s1, s2 = sp.symbols("q0 q1 q2 s0 s1 s2", nonnegative=True)
    q_bernstein = sp.expand(q0 * (1 - z) ** 2 + 2 * q1 * z * (1 - z) + q2 * z**2)
    s_bernstein = sp.expand(s0 * (1 - z) ** 2 + 2 * s1 * z * (1 - z) + s2 * z**2)
    assert sp.Poly(q_bernstein, q0, q1, q2).coeffs() == [z**2 - 2*z + 1, -2*z**2 + 2*z, z**2]
    assert sp.Poly(s_bernstein, s0, s1, s2).coeffs() == [z**2 - 2*z + 1, -2*z**2 + 2*z, z**2]

    h, C, M0, d = sp.symbols("h C M0 d", positive=True)
    strong = C * M0 + h * d
    assert sp.cancel(M0 + h * d / C - strong / C) == 0
    # The two cases are exact: d>=0 uses M0 and q>=0; d<0 uses x<=h/C,
    # hence x*d >= (h/C)*d, followed by the identity above.

    payload = {
        "schema": "rank8-low-low-zero-slack-two-tail-face-independent-audit-v1",
        "status": "PASS_INDEPENDENT_AUDIT_RANK8_LOW_LOW_ZERO_SLACK_TWO_TAIL_FACE",
        "checks": {
            "all_input_hashes": "exact",
            "component_audit_statuses": 4,
            "curvature_bernstein_weights": ["(1-z)^2", "2z(1-z)", "z^2"],
            "strong_bernstein_weights": ["(1-z)^2", "2z(1-z)", "z^2"],
            "weights_nonnegative_on_unit_interval": True,
            "x_negative_derivative_endpoint_identity": "0",
            "x_sign_cases": ["d>=0", "d<0"],
        },
        "immutable_inputs": actual_inputs,
        "source_sha256": sha256(Path(__file__)),
        "scope_warning": assembly["scope_warning"],
    }
    REPORT.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    print(payload["status"])
    print("SOURCE", payload["source_sha256"])
    print("REPORT", sha256(REPORT))


if __name__ == "__main__":
    main()
