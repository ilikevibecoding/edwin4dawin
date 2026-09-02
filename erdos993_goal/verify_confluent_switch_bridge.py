#!/usr/bin/env python3
"""Replay the super-ballot switch identity and confluent quotient evidence.

The identity

    B_q Tau_q^{-1}[:,p]
      = coeff((x+3)_p (x+p+5)_(q-1-p))

holds in all sizes by barycentric interpolation (or direct hypergeometric
summation).  It makes the upper Newton quotient U_q Tau_q^{-1} TN by the
all-order switch-polynomial coefficient theorem.

For the confluent switch basis

    g_p(t;x)=(x+t)^p (x+p+5)_(q-1-p),

let U_q(t)=L_q^{-1}G_q(t) be its upper Newton factor.  We additionally
audit the still-conjectural quotient U_q(1)^{-1} C_q through q=50 by exact
two-sided Neville elimination.  This is not the direct quotient
G_q(1)^{-1}C_q.  The finite audit is evidence, not an all-size theorem.
"""

from __future__ import annotations

import json
from fractions import Fraction as F
from pathlib import Path

from fast_bottom_forward import beta_coefficients, inverse_upper, matmul
from probe_beta_newton_compressed_factor import neville_pair
from probe_beta_newton_coordinates import beta_newton_lower, inverse_lower_unit
from probe_beta_newton_superballot_bridge import super_ballot
from probe_switch_gauge_quotient import (
    confluent_quotient,
    switch_coefficients,
)


OUT = Path("confluent_switch_bridge_certificate_20260803.json")


def audit(matrix):
    forward, transposed = neville_pair(matrix)
    assert forward["status"] == "PASS"
    assert transposed["status"] == "PASS"
    return {
        "forward_positive_multipliers": forward["positive"],
        "forward_zero_multipliers": forward["zero"],
        "transpose_positive_multipliers": transposed["positive"],
        "transpose_zero_multipliers": transposed["zero"],
        "positive_pivots_each_orientation": forward["positive_pivots"],
    }


def main():
    bridge_records = []
    bridge_entry_checks = 0
    for q in range(2, 31):
        tau = super_ballot(q)
        gamma = matmul(beta_coefficients(q), inverse_upper(tau))
        expected = switch_coefficients(q, F(3))
        assert gamma == expected
        bridge_entry_checks += q * q

        lower = beta_newton_lower(q)
        upper_bridge = matmul(inverse_lower_unit(lower), gamma)
        bridge_audit = audit(upper_bridge)
        bridge_records.append({"q": q, **bridge_audit})
        print(f"bridge q={q} PASS", flush=True)

    quotient_records = []
    for q in range(2, 51):
        quotient_audit = audit(confluent_quotient(q, F(1)))
        quotient_records.append({"q": q, **quotient_audit})
        print(f"confluent quotient q={q} PASS", flush=True)

    report = {
        "kind": "confluent_switch_bridge_certificate",
        "status": "PASS_EXACT_SWITCH_IDENTITY_AND_CONFLUENT_QUOTIENT_AUDIT",
        "super_ballot_gap2_switch_identity_range": [2, 30],
        "gap2_upper_bridge_neville_range": [2, 30],
        "confluent_t1_quotient_neville_range": [2, 50],
        "gap2_switch_identity_entry_checks": bridge_entry_checks,
        "bridge_records": bridge_records,
        "confluent_quotient_records": quotient_records,
        "all_order_identity": (
            "B_q Tau_q^{-1} has polynomial columns "
            "(x+3)_p (x+p+5)_(q-1-p)."
        ),
        "confluent_flow": (
            "d_t g_p(t)=p/(p+4-t)*(g_(p-1)(t)-g_p(t)); the basis "
            "transition for increasing t is a pure-death TN flow."
        ),
        "scope": (
            "The super-ballot gap-two switch identity and the TN conclusion "
            "for its upper Newton quotient have all-order algebraic proofs. "
            "The t=1 quotient checks through q=50 are exact finite evidence "
            "only and do not prove total positivity for every q."
        ),
    }
    OUT.write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    print(report["status"])


if __name__ == "__main__":
    main()
