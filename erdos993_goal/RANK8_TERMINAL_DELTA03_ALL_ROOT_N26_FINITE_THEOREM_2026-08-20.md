# Rank-eight terminal residual: exact all-root order-26 theorem for `Delta^0` through `Delta^3`

Date: 2026-08-20

Status: **PASS, finite core order 26 only.**

## Theorem

For every free tree `A` on 26 vertices and every root `q`,

```text
Delta^j R_1(A,q) > 0,  j=0,1,2,3.
```

The exact WROM census covers 279,793,450 free trees and all 7,274,629,700
rooted pairs.  Every rooted pair is active, the negative counts are exactly
`[0,0,0,0]`, and the negative-witness streams are empty.

The exact global minima are

```text
Delta0    993,449,159,246,754,201,600
Delta1  2,817,881,992,439,429,068,800
Delta2  4,024,927,688,858,057,088,000
Delta3  4,670,215,822,947,096,806,400.
```

All four occur at an endpoint root of `P_26` and exactly match the values
predicted before the primary scan by an independent generic tree DP.

## Independent audit

The order-26 source normalizes byte-for-byte to the frozen order-25 checker
after only the commented order, `n`, expected tree count, and PASS label are
substituted.  The audit pins the exact order-25 boundary, replays the audited
small-order WROM/graph-atlas lane, reconstructs the four minima, and checks
both output streams for any negative witness.

The conservative absolute bound on every rank-three finite difference is

```text
10,492,045,289,328,788,785,600,000,000.
```

It uses 94 bits and leaves a signed-`i128` integer margin factor of at least
16,216,207,495.

## Scope guard

This is a finite order-26 theorem only.  It does not prove order 27 and
above, connected `Q8`, the forest lift, rank-eight PGC, or Problem 993.

## Replay

```powershell
python .\audit_rank8_terminal_delta03_finite_n26.py
```

The audit deliberately does not repeat the full census.

## Frozen hashes

```text
verify_rank8_terminal_delta03_finite_n26.rs
  B9BA86D5FCA5A36438116670D0D937D076008F37B3FC7101D7653287F4B1B9FC
verify_rank8_terminal_delta03_finite_n26.exe
  C9911356BE65E542BA15FF163DC277180B84E5C5C651931B63B9ABE4736C1A7F
rank8_terminal_delta03_finite_n26_primary_20260820.log
  0A4E319110FB2937DE97595B24E4E4DFA5DBA7B2F2A6C0FAD3C46E523044DA61
rank8_terminal_delta03_finite_n26_primary_20260820.err.log
  E3B0C44298FC1C149AFBF4C8996FB92427AE41E4649B934CA495991B7852B855
audit_rank8_terminal_delta03_finite_n26.py
  99593A501A92CDB692285E4D528B5C37CC302AFCAA05BE297DCD15C2460C016B
rank8_terminal_delta03_finite_n26_independent_audit_exact_20260820.json
  8B167C350391FCE93887BE47E4327DD608E272553879669A0DCD3E32D66A1101
```
