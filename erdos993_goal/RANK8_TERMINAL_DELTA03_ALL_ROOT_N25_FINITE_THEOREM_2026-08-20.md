# Rank-eight terminal residual: exact all-root order-25 theorem for `Delta^0` through `Delta^3`

Date: 2026-08-20

Status: **PASS, finite core order 25 only.**

## Theorem

For every free tree `A` on 25 vertices and every root `q`,

```text
Delta^j R_1(A,q) > 0,  j=0,1,2,3.
```

The exact WROM census covers 104,636,890 free trees and all 2,615,922,250
rooted pairs.  Every rooted pair is active, the negative counts are exactly
`[0,0,0,0]`, and the negative-witness streams are empty.

The exact global minima are

```text
Delta0    195,231,879,800,229,242,880
Delta1    587,022,928,070,258,744,064
Delta2    916,860,486,100,125,176,064
Delta3  1,160,407,068,315,624,694,656.
```

All four occur at an endpoint root of `P_25` and match the values predicted
before the primary scan by an independent generic tree DP.

## Independent audit

The order-25 source normalizes byte-for-byte to the frozen order-24 checker
after only the commented order, `n`, expected tree count, and PASS label are
substituted.  The audit pins the exact order-24 boundary, replays the audited
small-order WROM/graph-atlas checks, reconstructs the four minima, and checks
both output streams for any negative witness.

The conservative absolute bound on every rank-three finite difference is

```text
3,105,504,169,469,025,836,720,947,200.
```

It uses 92 bits and leaves a signed-`i128` integer margin factor of at least
54,786,976,341.

## Scope guard

This is a finite order-25 theorem only.  It does not prove order 26 and
above, connected `Q8`, the forest lift, rank-eight PGC, or Problem 993.

## Replay

```powershell
python .\audit_rank8_terminal_delta03_finite_n25.py
```

The audit deliberately does not repeat the full census.

## Frozen hashes

```text
verify_rank8_terminal_delta03_finite_n25.rs
  431A54BC6C37EF884074D4ADBD805AE8614A78BB773F37AE4BC84EB0DF7E0E8A
verify_rank8_terminal_delta03_finite_n25.exe
  4A91610ED7D468D62EA1FC81B1A199EE23338FE4F22E3AFDA7E198E3B04F7110
rank8_terminal_delta03_finite_n25_primary_20260820.log
  030E2A06BCEF8A4FFA09B366BA699245C244F94298156993A0BC6411BFAE206F
rank8_terminal_delta03_finite_n25_primary_20260820.err.log
  E3B0C44298FC1C149AFBF4C8996FB92427AE41E4649B934CA495991B7852B855
audit_rank8_terminal_delta03_finite_n25.py
  285A7623620B7697FDAF302C33EDD1D2AE4C3AAF5A56B240B020DBC643160F3B
rank8_terminal_delta03_finite_n25_independent_audit_exact_20260820.json
  EDC9574415B23BB596074536734F33123D909258E9BC2D1C713036E426687F72
```
