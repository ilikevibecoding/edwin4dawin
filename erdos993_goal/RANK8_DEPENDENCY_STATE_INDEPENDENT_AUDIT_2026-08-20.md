# Rank-eight dependency-state independent audit

Date: 2026-08-20

Status: **the stored `Delta^5` package is algebraically and
cryptographically coherent, but it is currently conditional on the connected
rank-seven `Q7` theorem in `alpha>=12`.  Connected `Q8`, forest `Q8`, and
rank-eight PGC are not yet complete.**

This audit was read-only with respect to every pre-existing certificate.  It
did not invoke the long Bernstein builders, did not touch the live `Delta^4`
jobs, and did not edit the master.

## 1. `Delta^5` and the `Q7` endpoint

An independent symbolic reconstruction from

```text
I(G_t;x)=(1+x)^t I(A;x)+xI(A-q;x)
```

reproduces the exact terminal identity and the fifth Newton difference.  It
gives

```text
d Delta^5/dc8
=-16h6(54c1c7+16c1c8+83c2c7+16c2c8+29c3c7) <= 0.
```

The rank-seven reserve

```text
Q7(A)=14c7^2-c6c7-16c6c8>=0
```

therefore gives the valid upper endpoint

```text
c8=c7(14c7-c6)/(16c6).
```

The orientation is correct: because `Delta^5` decreases in `c8`, evaluating
at this endpoint gives a lower value even where this endpoint is above the
ordinary extension ceiling.  For the analytic range `n>=23`, bipartiteness
gives `alpha(A)>=ceil(n/2)>=12`, exactly the claimed guard.

All 33 unique files pinned by the `Delta^5` manifest match their expected
SHA-256 hashes.  The six stored analytic reports have the right branch keys,
degree products, one-leaf unsplit certificates, and total

```text
28,621,872 exact Bernstein coefficients.
```

The finite reports cover `9,114,285` free trees and `194,813,361` rooted
cores through order 22, with nonnegative stored minima.  A separate small
implementation checked every root of every nonisomorphic tree through order
10: 200 free trees, 1,808 rooted rows, 461 active rows, and minimum active
`Delta^5=5,799,448`.

This validates the package as the conditional theorem it says it is.  It is
not currently unconditional: the live rank-seven assembler still has status

```text
PENDING_RANK7_INTEGRATION_DEPENDENCY_ASSEMBLER_AWAITING_FINAL_INPUTS.
```

The theorem note and manifest already state this conditionality correctly;
the phrase “already certified” must not be used until the rank-seven guarded
inputs and final assembler pass.

## 2. Exact route still needed for connected `Q8`

The current connected-tree obligations are:

1. Finish connected `Q7` for `alpha>=12`, thereby discharging the shared
   `c8` endpoint dependency in `Delta^4` and `Delta^5`.
2. Prove the large-core residual coefficients `Delta^0` through `Delta^4`.
   The current `Delta^4` work is a reduction/live-box computation, not a
   theorem; no all-order `Delta^0`--`Delta^3` package exists.
3. Finish the literal shifted terminal-family guard for exceptional cores of
   orders 21 through 26.  The order-at-most-20 guard is complete.  Of the
   twelve remaining `(order,alpha)` cells, `(21,13)` and `(22,13)` are closed
   conditional on `Q7`; the exact remaining matrix is:

```text
alpha 13, orders 23--26: residual Delta1--Delta4;
alpha 12, orders 21--22: reserve-coupled shifted C1--C7;
alpha 12, orders 23--24: shifted C1--C7, with Delta1--Delta4 also open;
alpha 11, orders 21--22: reserve-coupled shifted C1--C7.
```

4. Assemble the terminal induction while retaining the literal small-core
   reserve terms.  Residual `Delta^0` really is negative on 950 rooted rows at
   orders 11--14, so those terms cannot be discarded.

## 3. From connected `Q8` to forest `Q8` and PGC

The exact matching-quotient certificate already has `q_negative=0` and
`coupled_negative=0` in all eighteen no-gap `alpha=13,14` cells above its
independent finite base.  Thus standalone `Q8` and the coupled PGC boundary
are closed at those two exact alpha values.

For the full forest theorem `Q8(F)>=0` when `alpha(F)>=14`, the remaining
lift still needs:

1. the connected target theorem;
2. full/full rank-eight factorial-convolution cones;
3. the finite exceptional connected-jet classification through rank nine;
4. fixed-exceptional/full preservation in every full cone;
5. the exceptional-only first-crossing certificate, including crossings that
   overshoot from below 14 to total alpha greater than 14.

The all-forest theorem `V8>=0` for `alpha>=14` is already complete.  Therefore
after forest `Q8` is proved, the separated pendant identity closes
`alpha(G)>=15`, while the matching-quotient theorem already closes
`alpha(G)=13,14`.  Those are the exact remaining dependencies to rank-eight
PGC.

## 4. Failed relaxations remain enclosure failures

The three negative extension-only `c8` jets at orders 43, 44, and 46 all
violate `Q7`.  They are failures of the enlarged cone, not rooted-tree
counterexamples and not failures of `Delta^5`.

The current `k=7`, full-root, `V`-concavity report for `Delta^4` is
`UNRESOLVED_NO_SPLIT` on an enlarged box.  Its negative Bernstein coefficient
is likewise only an enclosure failure; it proves neither a negative
`Delta^4` value nor wrong curvature on the actual tree cone.  The live
`Delta^4` computation was not duplicated or interrupted.

## 5. Audit artifacts and hashes

```text
audit_rank8_dependency_state_independent.py
C095C37BD2C7B2AC0DE1D71C70B394473A209C663219EB23E1C29E2017ABD6E1

rank8_dependency_state_independent_audit_exact_20260820.json
F74ED4582F62389B931D1534FE32817DD04A342D98F7665090AE53B9C7EF3739

RANK8_Q8_TERMINAL_DELTA5_ALL_ORDER_THEOREM_2026-08-17.md
C5A7CED09832254FE27A19FBC583E5C2DA9BE459D15F67F5EC218F5A06572CEE

rank8_q8_terminal_delta5_all_order_manifest_20260817.json
81EBFA2B843332181CC0F2FC7D0588DA95C6AACA2C1A1EB448D3987C5A4C2900

rank8_q8_terminal_delta5_all_order_replay_20260817.json
E56F800A84E8E4A01A35EDEE75FF9C4F0ACF40EF9B9E14C71531C585CBD65569
```

The JSON report contains all 33 verified manifest hashes, the six analytic
branch hashes and keys, the finite keys, the independent symbolic formulas,
the tiny exact probe, the live dependency snapshot, and the preserved
enclosure-failure classifications.
