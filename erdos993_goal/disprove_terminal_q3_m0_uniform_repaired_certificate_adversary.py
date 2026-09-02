#!/usr/bin/env python3
"""Exact literal obstruction to uniform C_repaired >= 0 at Newton m=0.

This does NOT disprove the terminal coefficient or Erdos 993.  The exact
q3-qj reserve is positive and more than repairs every displayed certificate
deficit.  The script reconstructs the literal tree rows, including the
one-induced-edge row z_j, by an integer tree DP.
"""

from __future__ import annotations

import hashlib
import json
import os
from fractions import Fraction
from math import comb
from pathlib import Path


ROOT = Path(__file__).resolve().parent
OUTPUT = ROOT / "terminal_q3_m0_uniform_repaired_certificate_obstruction_exact_adversary_20260829.json"
NOTE = ROOT / "TERMINAL_Q3_M0_UNIFORM_REPAIRED_CERTIFICATE_OBSTRUCTION_2026-08-29.md"
DEPENDENCIES = (
    ROOT / "prove_terminal_q3_m0_retained_hprev_decomposition_adversary.py",
    ROOT / "terminal_q3_m0_retained_hprev_decomposition_exact_adversary_20260829.json",
)


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def C(n: int, k: int) -> int:
    return comb(n, k) if 0 <= k <= n else 0


def rank3_counts(order: int, edges: int, wedges: int, connected_four: int) -> tuple[int, int]:
    independent = C(order, 3) - edges * (order - 2) + wedges
    matchings = C(edges, 2) - wedges
    one_edge = (
        edges * C(order - 2, 2)
        - 2 * (wedges * (order - 3) + matchings)
        + 3 * connected_four
    )
    return independent, one_edge


def literal_tree_rows(
    subdivisions: tuple[int, ...], maximum: int
) -> tuple[list[int], list[int], list[int], int]:
    """Return f,h,z through maximum for the one-centre spider F.

    State `(selected, induced_edges)` is retained for induced_edges 0 or 1.
    At the root, the unselected/zero-edge state is exactly the row H=F-root.
    """
    children: list[list[int]] = [[]]
    for ell in subdivisions:
        previous = 0
        for _ in range(ell + 1):
            children.append([])
            vertex = len(children) - 1
            children[previous].append(vertex)
            previous = vertex

    dp: dict[int, dict[tuple[int, int], list[int]]] = {}
    for vertex in range(len(children) - 1, -1, -1):
        current = {
            (0, 0): [1] + [0] * maximum,
            (0, 1): [0] * (maximum + 1),
            (1, 0): [0, 1] + [0] * (maximum - 1),
            (1, 1): [0] * (maximum + 1),
        }
        for child in children[vertex]:
            updated = {
                (selected, edges): [0] * (maximum + 1)
                for selected in (0, 1)
                for edges in (0, 1)
            }
            for (selected, edge_count), left in current.items():
                for (child_selected, child_edges), right in dp[child].items():
                    new_edges = edge_count + child_edges + selected * child_selected
                    if new_edges > 1:
                        continue
                    output = updated[(selected, new_edges)]
                    for i, left_value in enumerate(left):
                        if not left_value:
                            continue
                        for k, right_value in enumerate(right[: maximum + 1 - i]):
                            if right_value:
                                output[i + k] += left_value * right_value
            current = updated
        dp[vertex] = current

    root = dp[0]
    f = [root[(0, 0)][k] + root[(1, 0)][k] for k in range(maximum + 1)]
    h = list(root[(0, 0)])
    z = [root[(0, 1)][k] + root[(1, 1)][k] for k in range(maximum + 1)]
    return f, h, z, len(children)


def structural_coefficients() -> dict[str, int]:
    N, d, R, T, Y = 315, 1, 9, 305, 8
    S = R + T
    A2 = C(R, 2)
    B2 = A2
    B3 = C(R, 3)
    tau = B3 + T - (N - 2) + (R - 1) * Y
    a = C(N, 2) - S
    W = N - 1 + B2
    wedges_f = W - C(d, 2) - R
    z2 = S * (N - 2) - 2 * wedges_f
    h2 = C(S, 2) - T
    c0 = a + z2 + h2
    f3 = C(N, 3) - S * (N - 2) + wedges_f
    matchings_f = C(S, 2) - wedges_f
    T4_f = (
        N
        - 2
        + B2
        + tau
        - C(d, 3)
        - A2
        - (d - 1) * R
        - Y
    )
    z3 = S * C(N - 2, 2) - 2 * (
        wedges_f * (N - 3) + matchings_f
    ) + 3 * T4_f
    n = N + 1
    v4 = n - 3 + B2 + tau
    p0, R0 = rank3_counts(n + 1, n - 1, W, v4)
    it, st = rank3_counts(
        n + 2,
        n + 1,
        W + d + 1,
        v4 + C(d, 2) + R + d,
    )
    A0 = st * p0 - R0 * it
    assert A0 == p0 * c0 - a * R0
    return {
        "N": N,
        "d": d,
        "R": R,
        "T": T,
        "Y": Y,
        "tau": tau,
        "A2": A2,
        "B2": B2,
        "B3": B3,
        "a": a,
        "f3": f3,
        "z3": z3,
        "c0": c0,
        "p0": p0,
        "R0": R0,
        "A0": A0,
    }


def fraction_record(value: Fraction) -> dict[str, int]:
    return {"numerator": value.numerator, "denominator": value.denominator}


def allocation_record(name: str, subdivisions: tuple[int, ...]) -> dict[str, object]:
    data = structural_coefficients()
    j = 24
    f, h, z, order = literal_tree_rows(subdivisions, j + 1)
    assert order == data["N"]
    assert f[2] == data["a"] and f[3] == data["f3"]
    a, f3, z3, P, R0, A0, c0 = (
        data[key] for key in ("a", "f3", "z3", "p0", "R0", "A0", "c0")
    )
    Cf = f3 * (j + 1) * a * A0
    Cb = (
        f3
        * (
            (j + 1) * a * A0
            + a * P * ((j + 1) * (c0 + R0) - 3 * (P + a))
        )
        - a * P * (P + a) * j * z3
    )
    Ch = f3 * ((j + 1) * a * A0 - 3 * a * P * (P + a))
    repaired = Cf * (f[j + 1] + h[j - 1]) + Cb * f[j] + Ch * h[j]
    U = f[j + 1] + h[j] + f[j] + h[j - 1]
    # ``z[k]`` is indexed by the number of selected vertices.  In the
    # terminal notation ``z_j`` counts one-edge (j+1)-sets, hence z[j+1].
    target_one_edge = z[j + 1]
    e = target_one_edge + h[j] + f[j]
    delta0 = (
        (j + 1) * a * A0 * U
        + a * P * ((j + 1) * f[j] * (c0 + R0) - 3 * (P + a) * e)
    )
    reserve = a * P * (P + a) * (
        j * z3 * f[j] - 3 * f3 * target_one_edge
    )
    assert f3 * delta0 == repaired + reserve
    assert repaired < 0 < reserve < f3 * delta0 - repaired + 1
    assert delta0 > 0
    q3 = Fraction(z3, 3 * f3)
    qj = Fraction(target_one_edge, j * f[j])
    gap = q3 - qj
    required_gap = Fraction(-repaired, 3 * j * a * P * (P + a) * f[j] * f3)
    assert gap > required_gap > 0
    return {
        "name": name,
        "subdivisions": list(subdivisions),
        "rank": j,
        "literal_rows": {
            "f_j": f[j],
            "f_next": f[j + 1],
            "h_prev": h[j - 1],
            "h_j": h[j],
            "z_j": target_one_edge,
        },
        "C_repaired": repaired,
        "q3_minus_qj": fraction_record(gap),
        "minimum_q_gap_required": fraction_record(required_gap),
        "q_gap_reserve": reserve,
        "f3_times_delta0": f3 * delta0,
        "delta0": delta0,
        "identity_residual": f3 * delta0 - repaired - reserve,
    }


def theorem_note(records: list[dict[str, object]]) -> str:
    first = records[0]
    return f"""# Obstruction to uniform nonnegativity of C_repaired

Date: 2026-08-29

The proposed all-order intermediate target `C_repaired>=0` is false.  The
smallest exact cell found in the expanded adversarial search has

```text
N=315, j=24, d=1, R=9, T=305, Y=8, tau=140,
subdivisions=(298,1,1,1,1,1,1,1,0).
```

An integer tree DP retaining selected/unselected root state and exactly zero
or one induced edge gives

```text
C_repaired = {first['C_repaired']},
q-gap reserve = {first['q_gap_reserve']},
f3*delta0 = {first['f3_times_delta0']},
delta0 = {first['delta0']}.
```

The exact identity residual is zero.  Thus this is a counterexample only to
the uniform sign of the sufficient intermediate certificate.  It is **not**
a counterexample to terminal Newton `m=0`, the terminal-payment theorem, or
Erdos Problem 993: the quantitative `q3-q_j` reserve is positive and repairs
the deficit by a wide exact margin.

The same sign pattern is replayed at the K-concentrated and balanced arm
allocations stored in the report.  Any valid all-order proof must retain a
quantitative portion of `q3-q_j` (or an equivalent direct pendant/variance
reserve); merely using its nonnegativity and then demanding
`C_repaired>=0` cannot close.

Replay:

```powershell
python .\\disprove_terminal_q3_m0_uniform_repaired_certificate_adversary.py
```

Required marker:

```text
PASS_EXACT_LITERAL_OBSTRUCTION_TO_UNIFORM_C_REPAIRED_NONNEGATIVITY
```
"""


def main() -> None:
    structural = structural_coefficients()
    allocations = {
        "H_concentrated": (298, 1, 1, 1, 1, 1, 1, 1, 0),
        "K_concentrated": (291, 2, 2, 2, 2, 2, 2, 2, 0),
        "balanced_positive_arms": (39, 38, 38, 38, 38, 38, 38, 38, 0),
    }
    records = [allocation_record(name, row) for name, row in allocations.items()]
    NOTE.write_text(theorem_note(records), encoding="utf-8")
    payload = {
        "schema": "terminal-q3-m0-uniform-repaired-certificate-obstruction-v1",
        "status": "PASS_EXACT_LITERAL_OBSTRUCTION_TO_UNIFORM_C_REPAIRED_NONNEGATIVITY",
        "structural_cell": structural,
        "literal_allocation_records": records,
        "conclusion": (
            "Uniform C_repaired>=0 is false.  Each literal delta0 remains "
            "strictly positive because the exact q3-qj reserve exceeds the deficit."
        ),
        "dependency_sha256": {path.name: sha256(path) for path in DEPENDENCIES},
        "note_sha256": sha256(NOTE),
        "scope_warning": (
            "This disproves only an intermediate sufficient certificate.  It "
            "does not disprove terminal m=0, the terminal-payment theorem, or Erdos 993."
        ),
        "source_sha256": sha256(Path(__file__)),
    }
    temporary = OUTPUT.with_suffix(OUTPUT.suffix + ".tmp")
    temporary.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    os.replace(temporary, OUTPUT)
    print(payload["status"])
    for record in records:
        print(record["name"], "C_repaired", record["C_repaired"])
        print(record["name"], "q_gap_reserve", record["q_gap_reserve"])
        print(record["name"], "delta0", record["delta0"])
    print("source_sha256", payload["source_sha256"])
    print("report_sha256", sha256(OUTPUT))
    print("note_sha256", payload["note_sha256"])


if __name__ == "__main__":
    main()
