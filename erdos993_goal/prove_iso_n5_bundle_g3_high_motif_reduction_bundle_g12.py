#!/usr/bin/env python3
"""Universal exact high-motif reduction for rank-five bundle g3.

For a forest G with protected marks u,v, classify each edge motif by whether
its vertex set contains neither mark, u only, v only, or both.  An exact
leaf-edge/internal-edge incidence for connected four-edge subtrees converts
the Q35/R4 layer of g3 into nonnegative incidence slacks.  Deleting the
support neighbourhood can only remove motifs in each category.  The complete
high layer is therefore bounded below by -18 times the number of connected
three-edge subtrees containing both marks (and by -8 times that count in the
endpoint singleton mode).  This does not prove the remaining residual sign.
"""

from __future__ import annotations

import hashlib
import json
from pathlib import Path

import sympy as sp


HERE = Path(__file__).resolve().parent
CONFIG_SOURCE = HERE / "derive_iso_n5_bundle_g3_five_mode_configuration_bundle_g12.py"
CONFIG_REPORT = HERE / "iso_n5_bundle_g3_five_mode_configuration_bundle_g12_20260829.json"
OUTPUT = HERE / "iso_n5_bundle_g3_high_motif_reduction_bundle_g12_20260829.json"
MARKER = "PASS_EXACT_ISO_N5_BUNDLE_G3_HIGH_MOTIF_REDUCTION_BUNDLE_G12"


def sha256(path: Path):
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def category_symbols(prefix):
    return sp.symbols(f"{prefix}_none {prefix}_u {prefix}_v {prefix}_both", nonnegative=True)


def mobius_rules(prefix):
    none, only_u, only_v, both = category_symbols(prefix)
    return {
        sp.Symbol(f"{prefix}_E"): none + only_u + only_v + both,
        sp.Symbol(f"{prefix}_U"): none + only_v,
        sp.Symbol(f"{prefix}_V"): none + only_u,
        sp.Symbol(f"{prefix}_W"): none,
    }


def incidence_substitution(n, r, q, t, slack):
    r0, ru, rv, rb = r
    q0, qu, qv, qb = q
    t0, tu, tv, tb = t
    s0, su, sv, sb = slack
    # slack0 = Q0+(n-6)R0-4T0, etc.  These are nonnegative by
    # counting the four deleted edges of each connected four-edge subtree.
    return {
        t0: (q0 + (n - 6) * r0 - s0) / 4,
        tu: (qu + (n - 5) * ru + r0 - su) / 4,
        tv: (qv + (n - 5) * rv + r0 - sv) / 4,
        tb: (qb + (n - 4) * rb + ru + rv - sb) / 4,
    }


def expected_generic_lower(n, r, q, d, slack, drops):
    r0, ru, rv, rb = r
    q0, qu, qv, qb = q
    d0, du, dv, db = d
    s0, su, sv, sb = slack
    dropu, dropv, dropb = drops
    return sp.expand(2 * (
        (31 * n - 39) * r0 / 2
        + (25 * n - 57) * (ru + rv) / 4
        - 9 * rb
        + sp.Rational(15, 2) * q0
        + sp.Rational(21, 4) * (qu + qv)
        + 3 * qb
        + d0 + 2 * dropu + 2 * dropv + 5 * dropb
        + sp.Rational(5, 2) * s0
        + sp.Rational(7, 4) * (su + sv) + sb
    ))


def main():
    config = json.loads(CONFIG_REPORT.read_text(encoding="utf-8"))
    assert config["marker"] == "PASS_EXACT_ISO_N5_BUNDLE_G3_FIVE_MODE_CONFIGURATION_BUNDLE_G12"
    assert config["source_sha256"] == sha256(CONFIG_SOURCE)
    # The producer intentionally used assumption-free symbols; use the exact
    # same SymPy identity here before attaching combinatorial sign metadata in
    # the report prose.
    n = sp.Symbol("n")

    r = category_symbols("R3")
    q = category_symbols("Q35")
    t = category_symbols("R4")
    d = category_symbols("DR3")
    slack = sp.symbols("incidence_slack_none incidence_slack_u incidence_slack_v incidence_slack_both", nonnegative=True)
    drops = sp.symbols("deletion_drop_R3_u deletion_drop_R3_v deletion_drop_R3_both", nonnegative=True)

    rules = {}
    rules.update(mobius_rules("C_connected3"))
    rules.update(mobius_rules("C_three_edge_five"))
    rules.update(mobius_rules("C_connected4"))
    rules.update(mobius_rules("D_connected3"))
    # Rename the generated category symbols to the shorter proof symbols.
    rename = {}
    for long_prefix, short in (
        ("C_connected3", r), ("C_three_edge_five", q),
        ("C_connected4", t), ("D_connected3", d),
    ):
        rename.update(dict(zip(category_symbols(long_prefix), short)))

    generic = sp.sympify(config["generic_forest_invariant"]["high_motif_part"])
    generic_category = sp.expand(generic.subs(rules).subs(rename))
    # D is an induced subforest of C: D-category counts equal C counts minus
    # nonnegative deletion drops.  D-none has a positive coefficient and is
    # deliberately retained rather than enlarged to C-none.
    d0, du, dv, db = d
    ru, rv, rb = r[1], r[2], r[3]
    deletion = {du: ru - drops[0], dv: rv - drops[1], db: rb - drops[2]}
    generic_incidence = sp.expand(
        generic_category.subs(deletion).subs(incidence_substitution(n, r, q, t, slack))
    )
    generic_lower = expected_generic_lower(n, r, q, d, slack, drops)
    assert sp.expand(generic_incidence - generic_lower) == 0

    # Two specialized modes have sharper coefficients because their D rows
    # coincide with C rows in a prescribed way.
    specialized = {}
    expected_data = {
        "no_mark_root_k0": {
            "r0": (31 * n - 37) / 2,
            "ru": (25 * n - 57) / 4,
            "rv": (25 * n - 57) / 4,
            "rb": -9,
            "bound": "-18*R3_both",
        },
        "singleton_endpoint": {
            "r0": (31 * n - 37) / 2,
            "ru": (25 * n - 49) / 4,
            "rv": (25 * n - 57) / 4,
            "rb": -4,
            "bound": "-8*R3_both",
        },
    }
    for mode, expected in expected_data.items():
        expression = sp.sympify(config["modes"][mode]["high_motif_part"])
        category = sp.expand(expression.subs(rules).subs(rename))
        incidence = sp.expand(category.subs(incidence_substitution(n, r, q, t, slack)))
        lower = sp.expand(2 * (
            expected["r0"] * r[0] + expected["ru"] * r[1]
            + expected["rv"] * r[2] + expected["rb"] * r[3]
            + sp.Rational(15, 2) * q[0]
            + sp.Rational(21, 4) * (q[1] + q[2]) + 3 * q[3]
            + sp.Rational(5, 2) * slack[0]
            + sp.Rational(7, 4) * (slack[1] + slack[2]) + slack[3]
        ))
        assert sp.expand(incidence - lower) == 0
        specialized[mode] = {
            "category_form": str(sp.factor(category)),
            "incidence_slack_form": str(sp.factor(lower)),
            "rigorous_lower_bound": expected["bound"],
        }

    r_both = sp.Symbol("R3_both", nonnegative=True)
    generic_residual = sp.sympify(config["generic_forest_invariant"]["residual_without_high_motifs"])
    no_root_residual = sp.sympify(config["modes"]["no_mark_root_k0"]["residual_without_high_motifs"])
    endpoint_residual = sp.sympify(config["modes"]["singleton_endpoint"]["residual_without_high_motifs"])
    report = {
        "marker": MARKER,
        "motif_categories": "none, u only, v only, both marks",
        "incidence_inequalities": {
            "none": "4 R4_none <= Q35_none+(n-6)R3_none",
            "u_only": "4 R4_u <= Q35_u+(n-5)R3_u+R3_none",
            "v_only": "4 R4_v <= Q35_v+(n-5)R3_v+R3_none",
            "both": "4 R4_both <= Q35_both+(n-4)R3_both+R3_u+R3_v",
            "proof": (
                "Delete each of the four edges of a connected four-edge subtree. "
                "Internal-edge deletions inject into Q35; unmarked leaf deletions "
                "inject into an R3 extension by an outside vertex; deleting a marked "
                "leaf injects into the indicated lower mark category. A forest gives "
                "at most one attachment edge for each outside vertex."
            ),
        },
        "generic_exact_incidence_form": str(sp.factor(generic_lower)),
        "generic_high_motif_lower_bound": "-18*R3_both",
        "specialized": specialized,
        "remaining_sufficient_sign_forms": {
            "all_five_modes": str(sp.factor(generic_residual - 18 * r_both)),
            "no_mark_root_k0": str(sp.factor(no_root_residual - 18 * r_both)),
            "singleton_endpoint": str(sp.factor(endpoint_residual - 8 * r_both)),
        },
        "remaining_status": (
            "Unproved sufficient residuals. The incidence theorem removes every "
            "connected4/Q35 sign except the displayed R3_both charge."
        ),
        "scope": "Universal high-motif reduction for rank-five g3 only; not a proof that g3>=0 and not an N5 induction.",
        "dependencies": {
            CONFIG_SOURCE.name: sha256(CONFIG_SOURCE),
            CONFIG_REPORT.name: sha256(CONFIG_REPORT),
        },
        "source_sha256": sha256(Path(__file__)),
    }
    encoded = json.dumps(report, indent=2, sort_keys=True) + "\n"
    OUTPUT.write_text(encoded, encoding="utf-8")
    print(json.dumps({
        "marker": MARKER,
        "generic_high_motif_lower_bound": report["generic_high_motif_lower_bound"],
        "specialized_bounds": {k: v["rigorous_lower_bound"] for k, v in specialized.items()},
        "remaining_status": report["remaining_status"],
        "report_sha256": hashlib.sha256(encoded.encode()).hexdigest().upper(),
    }, indent=2, sort_keys=True))
    print(MARKER)


if __name__ == "__main__":
    main()
