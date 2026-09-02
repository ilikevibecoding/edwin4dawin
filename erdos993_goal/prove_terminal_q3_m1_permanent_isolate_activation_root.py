#!/usr/bin/env python3
"""Close permanent-isolate activation for terminal-q3 Newton m=1.

Combined with the pinned no-isolate m=1 theorem, this proves m=1 for every
forest base whose marked root is nonisolated, even when removing permanent
isolated components makes the target rank temporarily unsupported.  The
marked-isolated-root/star lane and Newton m=0 remain outside this theorem.
"""

from __future__ import annotations

import hashlib
import json
from math import factorial
from pathlib import Path

import sympy as sp


BASE = Path(__file__).resolve().parent
OUTPUT = BASE / "terminal_q3_m1_permanent_isolate_activation_exact_root_20260831.json"

PINS = {
    "assemble_terminal_q3_m1_no_isolate_forest_all_j_root.py":
        "6275FBB718940724556CB41C9D9FFA2999D967EDD2BFA685AEC5DC8E8451A917",
    "terminal_q3_m1_no_isolate_forest_all_j_assembled_exact_root_20260831.json":
        "648A894B58038366BE0DF3BD44DCC2F98746AB810B338B528494B95372ACC9D8",
    "prove_terminal_q3_forest_anchor_lift_agent.py":
        "01F04CA1C51B155D987C61611298B8B38CC60981EBA7C8269FD251B75BCB434D",
    "terminal_q3_forest_anchor_lift_exact_agent_20260829.json":
        "E9CD1A6276D589F885626AB69786D9499116D291242DA76883FAA577850F1DDF",
    "verify_terminal_payment_permanent_isolate_shift_agent.py":
        "40631FFC5863F3FBD24D8D4A197A8DA7A2B50931C6F680D3FD633D60F194DBCD",
    "terminal_payment_permanent_isolate_shift_exact_20260829.json":
        "F66D640F42D027C05DB92E9B78007063FEFF81B76D65F564E5D92C46C3B7F8BF",
    "audit_terminal_q3_low_newton_m2_forest_base_agent.py":
        "78DF5272D69C8137CE0EF78BDBAD24A8C858D0FD60EAA0734EBFF3351D5BF54E",
    "terminal_q3_low_newton_m2_forest_base_audit_20260829.json":
        "328F2A1486CB9A581A565862993380D37EDC91A27BC29924A99E6B970B7FFD69",
}


def digest(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def load(name: str) -> dict:
    return json.loads((BASE / name).read_text(encoding="utf-8"))


def binomial_product_coefficient(p: int, q: int, r: int) -> int:
    if not (max(p, q) <= r <= p + q):
        return 0
    return factorial(r) // (
        factorial(r - p) * factorial(r - q) * factorial(p + q - r)
    )


def main() -> None:
    observed = {name: digest(BASE / name) for name in PINS}
    assert observed == PINS

    no_isolate = load(
        "terminal_q3_m1_no_isolate_forest_all_j_assembled_exact_root_20260831.json"
    )
    anchor = load("terminal_q3_forest_anchor_lift_exact_agent_20260829.json")
    shift = load("terminal_payment_permanent_isolate_shift_exact_20260829.json")
    m2 = load("terminal_q3_low_newton_m2_forest_base_audit_20260829.json")
    assert no_isolate["status"] == (
        "PASS_EXACT_NO_ISOLATE_FOREST_ALL_TARGETS_TERMINAL_Q3_NEWTON_M1_ASSEMBLY"
    )
    assert anchor["status"] == "PASS_EXACT_ALL_ORDER_TERMINAL_Q3_FOREST_BASE_ANCHOR_LIFT"
    assert shift["status"] == "PASS_EXACT_TERMINAL_PAYMENT_PERMANENT_ISOLATE_NEWTON_SHIFT"
    assert m2["status"] == "PASS_INDEPENDENT_EXACT_ALL_FOREST_BASE_TERMINAL_Q3_LOW_NEWTON_M2"

    # Low rows for an arbitrary forest G.  A(t)=P(t)c(t)-aR(t) is the
    # coefficientwise terminal q3 anchor cross.  Expand it in the Newton
    # basis at t=1+s by exact forward differences.
    g1, g2, g3, r2, r3, r4, C, a, t = sp.symbols(
        "g1 g2 g3 r2 r3 r4 C a t", nonnegative=True
    )
    P = g3 + t * g2 + sp.binomial(t, 2) * g1 + sp.binomial(t, 3)
    R = r4 + t * r3 + sp.binomial(t, 2) * r2
    A = sp.expand(P * (C + t * a) - a * R)
    rows = [[sp.expand(A.subs(t, value)) for value in range(1, 6)]]
    for _ in range(4):
        rows.append([
            sp.expand(rows[-1][index + 1] - rows[-1][index])
            for index in range(len(rows[-1]) - 1)
        ])
    newton = [sp.factor(rows[index][0]) for index in range(5)]
    expected = [
        C * g2 + C * g3 + a * g2 + a * g3 - a * r3 - a * r4,
        C * (g1 + g2) + a * (2 * g1 + 3 * g2 + g3 - r2 - r3),
        C * (g1 + 1) + a * (5 * g1 + 2 * g2 - r2 + 3),
        C + a * (3 * g1 + 7),
        4 * a,
    ]
    assert all(sp.expand(newton[index] - expected[index]) == 0 for index in range(5))

    # Prove the only two non-obvious tail factors positive on every forest.
    # For n vertices, m edges, and W=sum_v binom(deg(v),2), use
    # m<=n-1 and W>=max(0,2m-n).
    n, m, W, q = sp.symbols("n m W q", integer=True, nonnegative=True)
    forest_g2 = sp.binomial(n, 2) - m
    forest_g3 = sp.binomial(n, 3) - m * (n - 2) + W
    forest_r2 = m
    forest_r3 = m * (n - 2) - 2 * W
    E1 = sp.expand(2 * n + 3 * forest_g2 + forest_g3 - forest_r2 - forest_r3)
    E2 = sp.expand(5 * n + 2 * forest_g2 - forest_r2 + 3)
    E1_poly = sp.expand_func(E1).expand()
    E2_poly = sp.expand_func(E2).expand()
    assert E1_poly == 3 * W - 2 * m * n + n**3 / 6 + n**2 + 5 * n / 6
    assert E2_poly == -3 * m + n**2 + 4 * n + 3

    # Sector m<=n/2: W>=0 and the worst m is n/2.
    E1_sparse = sp.factor(E1_poly.subs({W: 0, m: n / 2}))
    assert sp.expand(E1_sparse - n * (n**2 + 5) / 6) == 0
    # Sector m>=n/2, n>=3: W>=2m-n; the slope in m is 6-2n,
    # hence the worst endpoint is m=n-1.
    E1_dense = sp.factor(E1_poly.subs(W, 2 * m - n).subs(m, n - 1))
    dense_shift = sp.Poly(sp.expand(E1_dense.subs(n, q + 3)), q)
    assert all(value > 0 for value in dense_shift.all_coeffs())
    assert sp.expand(E1_dense.subs(n, q + 3)) == q**3 / 6 + q**2 / 2 + 13 * q / 3 + 7
    # Small n not covered by the n>=3 dense-sector monotonicity.
    small_E1 = []
    for n_value in range(3):
        for m_value in range(max(0, n_value)):
            lower = E1_poly.subs({n: n_value, m: m_value, W: max(0, 2 * m_value - n_value)})
            assert lower >= 0
            small_E1.append((n_value, m_value, str(lower)))
    E2_lower = sp.factor(E2_poly.subs(m, n - 1))
    assert sp.expand(E2_lower - (n**2 + n + 6)) == 0

    # If b=i_j(G-w)=0, downward closure gives h_j=z_j=0.  The canonical
    # payment becomes delta(t)=(j+1)*a*A(t)*U(t).  U has a nonnegative
    # Newton row after shifting t=1+s.  Products preserve nonnegative Newton
    # rows by the exact binomial-product identity below.
    s = sp.symbols("s", integer=True, nonnegative=True)
    product_checks = 0
    minimum_multiplier = None
    for p in range(5):
        for q_value in range(17):
            rhs = sum(
                binomial_product_coefficient(p, q_value, r) * sp.binomial(s, r)
                for r in range(max(p, q_value), p + q_value + 1)
            )
            assert sp.expand_func(
                sp.binomial(s, p) * sp.binomial(s, q_value) - rhs
            ).expand() == 0
            multipliers = [
                binomial_product_coefficient(p, q_value, r)
                for r in range(max(p, q_value), p + q_value + 1)
            ]
            assert all(value > 0 for value in multipliers)
            local_min = min(multipliers)
            minimum_multiplier = (
                local_min if minimum_multiplier is None else min(minimum_multiplier, local_min)
            )
            product_checks += 1

    report = {
        "schema": "terminal-q3-m1-permanent-isolate-activation-v1",
        "date": "2026-08-31",
        "status": "PASS_EXACT_TERMINAL_Q3_M1_PERMANENT_ISOLATE_ACTIVATION_NONISOLATED_ROOT",
        "claim": (
            "For every finite forest base with a nonisolated marked root, arbitrary "
            "permanent isolated components, and every supported target j>=3, terminal-q3 "
            "Newton coefficient m=1 is nonnegative, conditional only where stated on the "
            "strictly-smaller-forest q-envelope input."
        ),
        "unsupported_target_lemma": {
            "downward_closure": (
                "If b=i_j(G-w)=0 then i_j(G-N[w])=0 and s_(j+1)(G-w)=0; "
                "deleting one endpoint of a unique edge proves the latter."
            ),
            "factorization": "delta(t)=(j+1)*a*A(t)*U(t)",
            "anchor_newton_coefficients": [str(value) for value in newton],
            "anchor_constant": "nonnegative by the pinned all-forest anchor theorem",
            "anchor_tail": (
                "coefficients 1..4 are nonnegative by the displayed forest bounds "
                "m<=n-1 and W>=max(0,2m-n)"
            ),
            "E1_sparse_lower": str(E1_sparse),
            "E1_dense_shift": str(dense_shift.as_expr()),
            "E1_small_checks": small_E1,
            "E2_lower": str(E2_lower),
            "binomial_product_identity": (
                "C(s,p)C(s,q)=sum_r r!/((r-p)!(r-q)!(p+q-r)!) C(s,r)"
            ),
            "identity_replay_cells": product_checks,
            "minimum_positive_product_multiplier": minimum_multiplier,
            "consequence": (
                "Every Newton coefficient of an unsupported-target payment is "
                "nonnegative, so support activation under permanent-isolate shifts "
                "cannot create a negative m=1 coefficient."
            ),
        },
        "isolate_lift": {
            "identity": "d1(G+K1)=d1(G)+d2(G)",
            "unsupported_stage": "both d1 and d2 are nonnegative by the activation lemma",
            "supported_stage": "d1 uses the no-isolate/lifted theorem and d2 uses the all-forest m2 theorem",
            "iteration": "remove all permanent isolates, then restore them one at a time",
        },
        "pins": PINS,
        "scope_guard": (
            "The marked root must remain nonisolated after permanent isolates are removed. "
            "A marked isolated root (the star-component terminal decomposition), Newton "
            "m=0, the complete terminal payment, the global q-envelope, unimodality, and "
            "Erdos Problem 993 remain separate obligations."
        ),
    }
    source_hash = digest(Path(__file__).resolve())
    report["source"] = Path(__file__).name
    report["source_sha256"] = source_hash
    OUTPUT.write_text(json.dumps(report, indent=2, sort_keys=True) + "\n", encoding="utf-8")
    report_hash = digest(OUTPUT)
    print(json.dumps({
        "anchor_newton_degree": 4,
        "binomial_product_identity_checks": product_checks,
        "marker": report["status"],
        "minimum_positive_product_multiplier": minimum_multiplier,
    }, indent=2, sort_keys=True))
    print("SOURCE_SHA256", source_hash)
    print("REPORT_SHA256", report_hash)
    print(report["status"])


if __name__ == "__main__":
    main()
