# Rank-seven PGC theorem

Date: 2026-08-20

## Theorem

The rank-seven step of the pendant-graph compatibility program is valid for
every forest in its required range.  Equivalently, the rank-seven component
inequality used in the induction for Erdos Problem 993 is nonnegative in every
literal pendant reconstruction.

This is a complete rank-seven theorem.  It is not a proof of Erdos Problem 993,
because ranks eight and above remain.

## Exact proof chain

1. The terminal-broom residual has all fourteen Newton coefficients
   nonnegative for every rooted core of order at least 15.  Orders 1 through 14
   are closed by a literal terminal-family certificate, which is necessary
   because the residual itself can be negative at core orders 10 through 12.
2. Exact finite coverage closes rooted core orders 15 through 26.  For orders
   27 through 38, the rank-zero coefficient is covered by the no-gap upper- and
   lower-endpoint partition over all values of `m`; ranks one through six are
   supplied by the cutoff theorems and ranks seven through thirteen by the high
   Newton theorem.  The large-order rank-zero theorem covers every order at
   least 39.
3. The terminal-broom identity and strong induction imply connected-tree
   `Q7>=0` in the required range.  The three exact convolution cones then lift
   this to all forests.
4. The already-proved forest `V7` theorem, the exact alpha-11 boundary, and the
   component identity

   ```text
   H7(P)-H6(B)=7 Q7(P)/(2 p6)+21 c6/2+V7(B)/(2 b5)
   ```

   prove the rank-seven PGC step.

## Final audits

The read-only dependency assembler finished with

```text
PASS_EXACT_RANK7_INTEGRATION_DEPENDENCY_ASSEMBLER
pending_inputs=0
```

and SHA-256

```text
rank7_integration_readonly_20260820.json
E5E09C141040746F6FDBC69EA89A9E4507CE63C9DDEDD73DF0E1C47E67191C59
```

The independent fail-closed audit regenerated every Delta0 key set, verified
the disjoint 756-cell underlying `(n,m,q)` partition, checked all coefficient
ranks and 43 immutable input hashes, and finished with

```text
PASS_INDEPENDENT_FINAL_RANK7_INTEGRATION_NO_SCOPE_GAP
```

Its report and source hashes are

```text
rank7_final_integration_independent_audit_exact_20260820.json
3052B52A9AB79C2B961C37C0D150DC9E440BBF0D81FCA6F4A657C262554205EE

audit_rank7_final_integration.py
B97444AFC5CA30266ACEDE843B74273A50F6416E91A5B9F57E7B399D0C28AFA4
```

The final small/mid-`m` input and its independent numeric audit have hashes

```text
rank7_delta0_joint_lower_b_weighted_pair_small_m_hface_n27_n38_exact_20260820.json
6003869DDC83FF71151693CE774E878A08E12564BE61438CD5C8F3244F96D25A

rank7_delta0_small_m_three_face_batch_independent_audit_exact_20260820.json
F35738D2409141B2FFAEDED2372310518839EF1DC9FD2A0CAA45A29F1BC1BB98
```

The fresh exhaustive order-25/26 replay and its independent audit have hashes

```text
rank7_terminal_broom_delta012_n25_n26_replay_exact_20260820.json
688EBD5B8C0CD5B2BC58FE452C2C89AB5AF8D5232B2A83DA7B18BE9CF037019F

rank7_terminal_broom_delta012_n25_n26_independent_audit_exact_20260820.json
37D1A5B08C1BE91FC007392467308EBD80DD57C441E72F95A94E70782F7B8536
```

## Scope guard

No statement here promotes the false residual claim at core orders 10 through
12.  Those orders are closed only by the literal small-core splice.  No
statement here resolves ranks eight or above.
