# Rank-seven read-only integration audit

Date: 2026-08-20

Status: **structurally complete and explicitly pending four final evidence
guards.  This note is not yet a final rank-seven theorem.**

## Outcome

The coefficient and dependency ranges join without an order gap once the
currently running reports become final:

| rooted core order | exact source of `R_t>=0` |
|---|---|
| 15--18 | all 14 coefficients in the finite order-18 log |
| 19--21 | all 14 coefficients in the exact finite reports |
| 22--24 | finite `Delta0..6` plus the all-core `Delta7..13` theorem |
| 25--26 | exact census `Delta0..2`, cutoff theorems `Delta3..6`, high theorem `Delta7..13` |
| 27--38 | finite all-`m` endpoint coverage for `Delta0`, cutoff theorems `Delta1..6`, high theorem `Delta7..13` |
| at least 39 | eight-branch `Delta0` theorem, cutoff theorems `Delta1..6`, high theorem `Delta7..13` |

The finite `Delta0` range partitions exactly as

```text
0<=m<=4,  5<=m<=17,  18<=m<=n-2.
```

For the two latter intervals the upper endpoint is
`min(containment,extension)`.  The lower endpoint is
`max(0,lifted,H)` for `5<=m<=17` and `max(ratio,lifted,H)` for
`18<=m<=n-2`.  The regime split is

```text
E<=1, E>=1                         (5<=m<=8),
E<=1, 1<=E<=m/2, E>=m/2           (m>=9).
```

The assembler regenerates every exact key; it does not accept a report from
its row count alone.

## The necessary small-core correction

It is false that `R_t>=0` for every small rooted core: `Delta0=R_1` is
negative for some cores of orders 10, 11, and 12.  A separate exact literal
family theorem now checks all 72,145 rooted cores through order 14 and proves

```text
Q7(G_t)>=0 whenever t>=max(1,12-alpha(A)).
```

Its minimum target-entry value is `609848`.  This is the correct small-core
splice; the integration does not relabel the negative residual values as
nonnegative.

An independent audit checks the WROM order/root counts, one row for every
order 1 through 14, the all-roots loop, the exact target threshold, and the
degree logic: `p6,p7,p8` have degrees at most 6, 7, and 8, so `Q7(G_t)` has
degree at most 14 and 15 consecutive values determine its complete Newton
expansion.

## Connected and forest dependency chain

Every nontrivial target tree has a terminal-broom representation, including
the star case with `A=K1`.  If the core has order at most 14, the literal
small-core theorem applies.  Otherwise:

1. coefficient coverage gives `R_t>=0`;
2. if `alpha(A)>=12`, strong induction gives `Q7(A)>=0`;
3. if `alpha(A)<=11`, the exact exceptional-tree census gives `Q7(A)>=0`
   for orders 15 through 22, and order at least 23 forces `alpha(A)>=12`;
4. `H=A-q` has order at least 14, so the stronger order-at-least-13 result
   proved inside the exact rank-six forest lift gives `Q6(H)>=0`;
5. bipartiteness gives `c6>0` and `h5>0`, so the terminal identity may be
   divided by its positive multiplier.

This proves connected `Q7` in the target range once the pending coefficient
inputs are final.  The existing high/high, low/high, and low/low convolution
cones then give all-forest `Q7` through the exact conditional lift.  In the
component PGC identity, `alpha(B)=alpha(P)-1`: the all-forest `V7` theorem
pays `alpha(B)>=12`, and the exact boundary theorem pays `alpha(B)=11`.

## Current pending guards

At the last assembly snapshot:

```text
n25/26 fresh byte-identical replay: missing/running
large-m ratio/lifted lower-b:       576 / 1944
large-m H-extension lower-b:        465 / 972
small-m zero/lifted/H lower-b:      330 / 2520
```

The assembler status is therefore

```text
PENDING_RANK7_INTEGRATION_DEPENDENCY_ASSEMBLER_AWAITING_FINAL_INPUTS.
```

It cannot emit its final `PASS` marker until all four guards are complete.

## Replay and snapshot hashes

Run:

```powershell
python .\assemble_rank7_integration_readonly.py
python .\audit_rank7_small_core_splice_and_dependency.py
```

Current artifacts:

```text
assemble_rank7_integration_readonly.py
8424B1B0B0408B1C4B9DEF6F7040C9E3CA88E0304D1933BC7DE3DD348D9D587B

rank7_integration_readonly_20260820.json
F564D434BFF36EFDEA3AE63273092589FFD635DF328F5C18C1B2CAF4DBAF0CF2

audit_rank7_small_core_splice_and_dependency.py
9ADE28AD82A0A6F6F42AE8F5E0709CA8CE0F9AFE584728FC13F232DEE7D0047F

rank7_small_core_splice_dependency_independent_audit_20260820.json
505D7FC479F25AE8E31B4CFD7BFD40846C6B0B52F50DE484A77F6CA6B42E46B1
```

The integration report hash is a snapshot and will change as the guarded
running reports advance.  No master file is edited by either script.
