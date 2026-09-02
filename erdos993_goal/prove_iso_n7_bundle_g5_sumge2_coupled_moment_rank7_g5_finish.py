#!/usr/bin/env python3
"""Exact coupled forest-moment theorem for rank-seven g5 sum>=2.

The coarse g5 cone eliminated W4 and W5 independently.  This refinement keeps
them coupled to the exact forest moments e, Omega and tau.  It imports the
frozen rank-seven g4 moment lemma

  2 e^2/m-e <= Omega <= e^2/2,
  2 Omega(Omega-e)/(3e) <= tau <= Omega e/2,

uses the exact W4 formula and the shadow lower floor for bad five-sets.
Arithmetic and Bernstein signs are exact; the script fails closed unless
every shadow-floor control is nonnegative.
"""

from __future__ import annotations

import hashlib
import json
from pathlib import Path

import sympy as sp

import probe_iso_n7_bundle_g5_interval_edge_cone_rank7_g5_tail as base
from probe_iso_n7_bundle_g5_threshold11_fast_rank7_g5_tail import fast_summary


HERE = Path(__file__).resolve().parent
INPUT = HERE / "iso_n7_bundle_g5_parent_modes_probe_rank7_g5_tail_20260831.json"
OUTPUT = HERE / "iso_n7_bundle_g5_sumge2_coupled_moment_exact_rank7_g5_finish_20260831.json"
MARKER = "PASS_EXACT_ISO_N7_BUNDLE_G5_SUMGE2_COUPLED_MOMENT_RANK7_G5_FINISH"
THRESHOLD = 60
DEPENDENCIES = {
    "prove_iso_n7_bundle_g4_sum0_piecewise_bernstein_rank7_g4_piecewise.py":
        "24E9538B8DA863D884BA2522E6D10316181F21206BE53A5C472D80C9DCE62FB5",
    "iso_n7_bundle_g4_sum0_piecewise_bernstein_exact_rank7_g4_piecewise_20260831.json":
        "E602040E714BF069F56DFB6C2BE94728595B087C530FF77371777662550E99C1",
    "prove_iso_n7_bundle_g4_sum1_coupled_moment_bernstein_rank7_g4_piecewise.py":
        "501E9E7F12781A5A3B2F821C78A8B251EC7A39EC72D47E0522AFE466AF7C136B",
    "iso_n7_bundle_g4_sum1_coupled_moment_bernstein_exact_rank7_g4_piecewise_20260831.json":
        "7A3969BBCA7B945D72E33BB8A036F3C6747CEA960BA76CF1C51FD81A5C92844C",
}


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def main() -> None:
    for name, digest in DEPENDENCIES.items():
        assert sha256(HERE / name) == digest
    source = json.loads(INPUT.read_text(encoding="utf-8"))
    symbols = {"n": sp.Symbol("n", nonnegative=True)}
    for family in "WABZ":
        for rank in range(2, 8):
            symbols[f"{family}{rank}"] = sp.Symbol(
                f"{family}{rank}", nonnegative=True
            )
    n = symbols["n"]
    tail = sp.Symbol("t", nonnegative=True)
    m = n - 2
    edge_symbol = base.choose(m, 2) - symbols["W2"]

    def category_lower(h, k):
        return base.choose(h, k) - edge_symbol * base.choose(h, k - 2)

    def category_upper(h, k):
        retained = edge_symbol - m * (m - h)
        extension = k * base.choose(h, k) / (m * (m - 1))
        return base.choose(h, k) - retained * extension

    intervals = {}
    for rank in range(3, 8):
        internal_rank = rank - 1
        intervals[f"A{rank}"] = (
            category_lower(symbols["A2"], internal_rank),
            category_upper(symbols["A2"], internal_rank),
        )
        intervals[f"B{rank}"] = (
            category_lower(symbols["B2"], internal_rank),
            category_upper(symbols["B2"], internal_rank),
        )
    for rank in range(4, 8):
        internal_rank = rank - 2
        intervals[f"Z{rank}"] = (
            symbols["Z2"] * category_lower(symbols["Z3"], internal_rank),
            symbols["Z2"] * category_upper(symbols["Z3"], internal_rank),
        )
    for rank in (6, 7):
        incidence = edge_symbol * base.choose(m - 2, rank - 2)
        intervals[f"W{rank}"] = (
            base.choose(m, rank) - incidence,
            base.choose(m, rank) - incidence / (rank - 1),
        )

    current = sp.expand(
        sp.sympify(source["modes"]["no_parent"]["expression"], locals=symbols)
    )
    elimination = []
    for rank in range(7, 2, -1):
        labels = [f"A{rank}", f"B{rank}"]
        if rank >= 4:
            if rank in (6, 7):
                labels.append(f"W{rank}")
            labels.append(f"Z{rank}")
        for label in labels:
            current, row = base.eliminate_linear(
                current, symbols[label], *intervals[label], n, tail
            )
            elimination.append(row)
    assert current.free_symbols <= {
        n, symbols["A2"], symbols["B2"], symbols["W2"], symbols["W3"],
        symbols["W4"], symbols["W5"], symbols["Z2"], symbols["Z3"],
    }
    w5_derivative = sp.factor(sp.diff(current, symbols["W5"]))
    assert sp.Poly(w5_derivative, symbols["W5"]).degree() == 0

    # Exhaustive nonadjacent/common0/sum>=2 marked geometry.
    a, b, c, y, z = sp.symbols("a b c y z", nonnegative=True)
    n_value = tail + THRESHOLD
    m_value = n_value - 2
    total = 2 + (m_value - 2) * a
    marked_x = total * b
    marked_y = total * (1 - b)
    edges = (m_value + 1 - total) * c

    omega_lower = 2 * edges**2 / m_value - edges
    omega_upper = edges**2 / 2
    omega = sp.cancel(omega_lower + y * (omega_upper - omega_lower))
    tau_lower = sp.cancel(2 * omega * (omega - edges) / (3 * edges))
    tau_upper = omega * edges / 2
    tau = sp.cancel(tau_lower + z * (tau_upper - tau_lower))
    bad4 = (
        edges * base.choose(m_value - 2, 2)
        - omega * (m_value - 4)
        - edges * (edges - 1) / 2
        + tau
    )
    floors = {"shadow": (m_value - 4) * bad4 / 5}
    common = {
        n: n_value,
        symbols["A2"]: m_value - marked_x,
        symbols["B2"]: m_value - marked_y,
        symbols["W2"]: base.choose(m_value, 2) - edges,
        symbols["W3"]: (
            base.choose(m_value, 3) - edges * (m_value - 2) + omega
        ),
        symbols["W4"]: base.choose(m_value, 4) - bad4,
        symbols["Z2"]: 1,
        symbols["Z3"]: m_value - total,
    }

    summaries = {}
    for label, floor in floors.items():
        value = sp.cancel(
            current.subs(
                {**common, symbols["W5"]: base.choose(m_value, 5) - floor},
                simultaneous=True,
            )
        )
        print("FLOOR_START", label, flush=True)
        summaries[label] = fast_summary(value, (a, b, c, y, z), tail)

    assert summaries["shadow"]["negative_tail_scalar_coefficients"] == 0
    assert sp.Rational(
        summaries["shadow"]["minimum_tail_scalar_coefficient"]
    ) > 0

    report = {
        "marker": MARKER,
        "threshold": THRESHOLD,
        "geometry": "nonadjacent_common0_sum_ge2",
        "elimination": elimination,
        "pre_moment_residual": str(sp.factor(current)),
        "W5_derivative": str(w5_derivative),
        "moment_parameterization": {
            "Omega_lower": str(omega_lower),
            "Omega_upper": str(omega_upper),
            "tau_lower": str(tau_lower),
            "tau_upper": str(tau_upper),
        },
        "floor_summaries": summaries,
        "bad_five_shadow_floor": (
            "bad5 >= (m-4)*bad4/5 by double-counting extensions of bad "
            "four-sets; every bad five-set has at most five four-subsets."
        ),
        "dependencies_sha256": DEPENDENCIES,
        "theorem": (
            "For every forest C of order n>=60 in no-parent mode, with "
            "nonadjacent marks having no common neighbor and total marked "
            "ordinary-neighbor count at least two, the exact rank-seven "
            "bundle coefficient g5 is nonnegative."
        ),
        "scope": (
            "Exact no-parent nonadjacent/common0/sum>=2 theorem for n>=60 only."
        ),
        "status": MARKER,
        "source_sha256": sha256(Path(__file__)),
    }
    encoded = json.dumps(report, indent=2, sort_keys=True) + "\n"
    OUTPUT.write_text(encoded, encoding="utf-8", newline="\n")
    print(json.dumps({
        "marker": MARKER,
        "floor_negative_counts": {
            label: row["negative_tail_scalar_coefficients"]
            for label, row in summaries.items()
        },
    }, indent=2, sort_keys=True))
    print("REPORT_SHA256", hashlib.sha256(encoded.encode()).hexdigest().upper())
    print(MARKER)


if __name__ == "__main__":
    main()

