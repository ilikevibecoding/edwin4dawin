# Rank-7 Delta0 lower-b / upper-d, small-mid m: exact finite certificate

Date: 2026-08-20

Status: **PASS for the scoped finite enclosure, pending independent mathematical
audit and fail-closed integration audit.**  This note does not claim full
rank-7 by itself.

## Exact scope

- `27 <= n <= 38`.
- `5 <= m <= 17`.
- Rank-0 lower-`b` / upper-`d` side.
- Both established `q` endpoints.
- Active lower-`b` endpoint split into all three faces:
  `zero`, `lifted`, and `h_extension`.
- For `5 <= m <= 8`, the sign-correct special branch
  `D >= binom(m-3,2) g(E)/6`, with the two regimes `E<=1` and `E>=1`.
- For `9 <= m <= 17`, the three continuous weighted-pair regimes.
- One worker, exact rational arithmetic, adaptive tensor Bernstein
  certification, checkpoint after every cell, stop on first non-PASS.

## No-gap active-face split

Writing `a=i4(J)`, `b=i5(J)`, and retaining the global `c5,z` variables, the
exact H-extension inequality

```text
6 h6 <= (n-6) h5
```

is equivalent to the third lower bound

```text
L_H = c5/z - (n-6)(c5-a)/6 <= b.
```

The weighted edge-pair lift gives a second lower bound `L_pair`, so the
lower endpoint is

```text
b = max(0, L_pair, L_H).
```

The prover certifies the three exact active regions with opposing dominance
constraints:

```text
zero:        b=0,       0>=L_pair, 0>=L_H
lifted:      b=L_pair,  L_pair>=0, L_pair>=L_H
h_extension: b=L_H,    L_H>=0, L_H>=L_pair.
```

It also retains the two upper capacities on `b`, containment, half retention,
the `c6` coefficient ceiling, and the exact H-extension relation.  A PASS is
therefore a certificate for this stated relaxation and parameter cell; it is
not a tree enumeration and is not an all-rank theorem on its own.

## Frozen result

The corrected manifest has **2,520 / 2,520 PASS**:

- 210 cells for each `n=27,...,38`.
- 840 cells for each active face.
- Regime counts: 936 in regime 0, 936 in regime 1, 648 in regime 2.
- No mathematical non-PASS or unresolved enclosure cell.
- One transient Windows report-file lock occurred after a computed checkpoint;
  the unchanged runner resumed from the prior durable checkpoint and recomputed
  that one cell successfully.

Final marker:

```text
PASS_EXACT_RANK7_DELTA0_WEIGHTED_PAIR_H_EXTENSION_SMALL_M_THREE_FACE_N27_N38
```

## Frozen artifacts and SHA-256

```text
prove_rank7_delta0_joint_lower_b_weighted_pair_small_m_hface_finite.py
9367209095EDBFF981D81C504C0CEFBC88B8613CBD7F5C43DB596F35C8CA5D66

run_rank7_delta0_joint_lower_b_weighted_pair_small_m_hface_batch.py
5A54F1674DF8E45BAC0579F4C5DD8C042F0FFEC98E21BB477CE6A7E9AA09BED7

rank7_delta0_joint_lower_b_weighted_pair_small_m_hface_n27_n38_exact_20260820.json
6003869DDC83FF71151693CE774E878A08E12564BE61438CD5C8F3244F96D25A

verify_rank7_delta0_weighted_pair_small_m_hface_batch.py
B7DD2D86F63689B981B355CB4E28DC50E1B22B0808EFC2FA044D89F421CB859F

rank7_delta0_weighted_pair_small_m_hface_integrity_audit_exact_20260820.json
BE64D70B884748A5FE2D841AA1AE3688F698DCC1442F229C8F91BCB6E64E7D67
```

The integrity audit marker is
`PASS_EXACT_MANIFEST_INTEGRITY`.  It verifies the frozen hashes, exact 2,520
parameter keys, uniqueness, per-cell return codes, empty standard-error fields,
parsed PASS markers, and the expected order/face/regime counts.  It is a
package-integrity audit, not the independent mathematical or fail-closed final
integration audit.

## Superseded partial evidence

The earlier 64-cell two-face run is retained only as partial evidence and is
explicitly marked `PARTIAL_TWO_FACE_ONLY_MISSING_H_ACTIVE_FACE`.  It is not used
for the scoped conclusion above.
