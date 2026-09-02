# Rank-eight terminal residual: exact all-root order-24 theorem for `Delta^0` through `Delta^3`

Date: 2026-08-20

Status: **PASS, finite core order 24 only.**

## Theorem

For every free tree `A` on 24 vertices and every root `q` of `A`, the first
four Newton coefficients of the rank-eight terminal-broom residual are
strictly positive:

```text
Delta^j R_1(A,q) > 0,  j=0,1,2,3.
```

The exact WROM census covers 39,299,897 free trees and all 943,197,528
rooted pairs.  Every rooted pair is active.  The negative counts are exactly
`[0,0,0,0]`, and both output streams contain no negative witness.

The global minima are

```text
Delta0   34,473,285,324,077,064,192
Delta1  110,853,430,454,951,847,936
Delta2  191,062,683,117,818,942,976
Delta3  265,702,252,552,979,633,664.
```

All four occur at an endpoint root of `P_24` and are reconstructed exactly
by an independent generic tree-independence-polynomial DP.

## Independent audit

The order-24 source normalizes byte-for-byte to the frozen order-23 checker
after exactly four declared substitutions: the commented order, `n`, the
expected free-tree count, and the PASS label.  The included WROM generator
and polynomial arithmetic are unchanged.

The audit pins and replays the independent small-order generator checks from
the order-23 package: the known free-tree sequence through order 13 and a
bijection, up to isomorphism, with the NetworkX graph atlas through order 7.
It also pins the exact order-23 boundary and independently reconstructs the
order-24 path minima.

A conservative absolute bound for every rank-three finite difference is

```text
870,838,427,900,674,277,588,529,216.
```

This uses 90 bits and leaves an integer margin factor of at least
195,376,292,558 below signed `i128` maximum.

## Scope guard

This is a finite order-24 theorem.  It does not prove the order-25-and-above
`Delta^0`--`Delta^3` cells, connected `Q8`, the forest lift, rank-eight PGC,
or Problem 993.  In the read-only integration it removes core order 24 from
the remaining four-coefficient gap.

## Replay

```powershell
python .\audit_rank8_terminal_delta03_finite_n24.py
```

The audit deliberately does not repeat the full census.

## Frozen hashes

```text
verify_rank8_terminal_delta03_finite_n24.rs
  02B51B72B4E75B332E3B4DFBC1497AD2C84E307B082EE49152D42D1B18E09468
verify_rank8_terminal_delta03_finite_n24.exe
  398E61190A52F26ED961F04595CD3058BA5A85379DE49F5FD17A625C7253ECF1
rank8_terminal_delta03_finite_n24_primary_20260820.log
  8FF4CE82AD545051D1259149CE4875D2CA5E6E3EDFF3314720FF00530CB9BFC4
rank8_terminal_delta03_finite_n24_primary_20260820.err.log
  E3B0C44298FC1C149AFBF4C8996FB92427AE41E4649B934CA495991B7852B855
audit_rank8_terminal_delta03_finite_n24.py
  2BE60B8C9814F5F64E61B1FD68A4FE521CF2FC877D94E333BDC061811E9B8097
rank8_terminal_delta03_finite_n24_independent_audit_exact_20260820.json
  60F0DA73B3B6A749EE48E6D54DA2B044A97054235E5A0D04E12B4CD03B616428
```
