# Wave-12 global completion audit for Erdős Problem #993

Date: 2026-08-13

Status: **the conjecture remains open.**  This is a clean-room dependency,
logic, replay, and hash audit of master Section 109+ and the final-day
artifacts.  It corrects one proof-coverage omission in the rank-four replay;
the correction passes the complete exact certificate.

## 1. Shortest surviving sufficient chain

The shortest sufficient theorem is still the prefix pendant cascade (PGC):

```text
rank-2 PGC (proved)
rank-3 PGC (proved)
rank-4 PGC (proved after the replay correction below)
PGC at every required rank k>=5 (OPEN)
    -> repeated pendant deletion
    -> prefix GSB
    -> known bipartite decreasing tail
    -> unimodality for every forest and tree.
```

Thus the current cut is exactly PGC at ranks `k>=5`, or a forest-specific
replacement strong enough to imply it.  The component Schur inequality by
itself is not sufficient because the first-difference transport is often
negative; the rank-three and rank-four proofs pay it using extra reserves.

## 2. Rank 2--4 plus Boundary-SM3 is not an induction

The reciprocal Boundary-SM3 tensor identity is exact:

```text
D_(r+1)(F)+D_r(F)+D_r(H)=3[x^a]J-[x^(a+1)]J.
```

Even a proof of its open sign for every rooted product would close the SM3
coefficient induction only.  In the exact three-quarters-PGC decomposition,
SM3 controls the non-curvature coefficient summand.  It does not control or
propagate the factorial-curvature/normalized-Schur summand.  Nothing in the
rank-2, rank-3, or rank-4 proofs supplies a rank-shift recurrence for that
summand.  The first unproved PGC rank therefore remains five.

An exact algebraic failure shield makes the separation explicit.  For

```text
B=(1,112,490,499,438,162,455,269,465),
C=(1,357,377,231,65,234,47,243,262),
P=(1+x)B+xC=(1,114,959,1366,1168,665,851,771,977,727),
```

the relevant factor-three coefficient inequalities hold for `P` through
rank six and for `B` through rank five; PGC holds at ranks two, three, and
four, but its exact rank-five gap is

```text
-10142954341/582832 < 0.
```

These are arbitrary nonnegative rows, not forest independence polynomials,
so this is not a forest counterexample.  It proves only that the proposed
induction does not follow from the displayed algebraic inputs; a new
forest-specific curvature invariant would be required.

## 3. Corrected rank-four coverage gap

The rank-four note and replay claimed a large-order theorem for every forest
but parameterized

```text
e=1+t(n-2),  0<=t<=1,
```

which covers only `1<=e<=n-2` and omits connected trees (`e=n-1`).  The
omission is real at the proof-coverage level, although the theorem is true.
The corrected parameterization is

```text
e=1+t(n-1),  0<=t<=1.
```

The full replay with this range again certifies all 299 nonnegative
Bernstein/power terms, then completes 942,394 `U` checks, 941,997 `L` checks,
and 331,153 rank-four pendant checks with zero failures.  Its minimum exact
Schur and PGC margins remain `1735/18` and `1300/9`.  The note, replay, JSON,
and master Section 109.3 hashes were updated.

## 4. Status of the other final routes

* The `T_m` plus isolates compensator is an all-order theorem for exactly
  that two-parameter family.  It does not cover arbitrary rooted products.
* The general reciprocal tensor is an all-order identity/equivalence, but
  `j_(a+1)<=3j_a` remains open.  Aggregate log-concavity and the tilted
  mean/mode certificate both fail on literal eligible trees while the
  Boundary-SM3 margin stays positive.
* ORP gives an exact critical-count/root-channel/Hall reduction.  The
  two-critical scalar payment and all proper-subfamily Hall inequalities are
  unproved; the order-13 result is bounded evidence only.
* The 57-vertex tree exactly refutes the second split payment and the stronger
  reserve, not Boundary-SM3 or unimodality.
* The adversarial campaigns and polynomial-complete censuses find no forest
  counterexample.  They remain finite evidence.
* The public literature check still lists Problem #993 as open and finds no
  primary-source universal theorem.  The normalized Schur language is a
  useful reduction, not the missing cross-rank forest theorem.

## 5. Replays and hashes

The audit replay is
`replay_wave12_global_completion_audit.py`; it checks the live hashes,
the corrected rank-four endpoint certificate, and the algebraic induction
failure shield, then writes
`wave12_global_completion_audit_exact_20260813.json`.

Updated rank-four SHA-256:

```text
134727625692B79423680E01E5331705E19BACAFF36F491CA3128F2CB974BAFA
  RANK4_COMPONENT_SCHUR_PAYMENT_AND_TRANSPORT_THEOREM_2026-08-13.md
4710BE9256B814871561FDD385FEC2D0EA0B6632D4A4289A54DB5B8FB2A8C196
  replay_rank4_component_schur_payment.py
044C5B3955A49C4D987BE296E9FD60CA1E59A8B65672B048CF3BA7A7C12CF4CB
  rank4_component_schur_payment_exact_20260813.json
```

The final audit status is
`PASS_EXACT_GLOBAL_AUDIT_OPEN_PROBLEM`.
