# Rank-6 proof audit and reproducibility record

Date: 2026-07-28

## Scope

This record audits the candidate proof of

\[
12i_6(T)^2-i_5(T)i_6(T)-14i_5(T)i_7(T)\ge0
\]

for every tree \(T\) of order at least \(13\).  The mathematical
statement and proof are in
`RANK6_TREE_THREE_HALVES_THEOREM_2026-07-28.md`.

This is a fixed-rank theorem.  It does **not** prove the
Alavi--Malde--Schwenk--Erdős all-rank unimodality conjecture.

## Proof chain

1. The terminal-broom identity and the exact three-term decomposition
   are checked by symbolic expansion.
2. The residual is a polynomial of degree at most \(11\) in the
   number of sibling leaves.  Its twelve Newton coefficients are
   proved nonnegative.
3. The coefficients \(\Delta^2,\ldots,\Delta^{11}\) are covered by
   exact rational factorization and exact Bernstein-basis
   certificates.
4. The two boundary coefficients \(R_1,\Delta R_1\) are covered
   analytically for core order at least \(24\), and by exhaustive
   exact enumeration for core orders \(18,\ldots,23\).
5. Every rooted core of order at most \(17\) is exhaustively checked,
   including all Newton differences needed for every number of
   sibling leaves.
6. Strong induction then combines the nonnegative residual, the
   rank-6 induction hypothesis on the remaining tree, and the
   previously proved rank-5 forest theorem.

The one-vertex core, corresponding to stars, is programmatically
checked by the same Newton-difference mechanism; it is not a
hard-coded pass.

## Clean replay results

The current source produced the following terminal lines:

| Certificate | Result |
|---|---|
| symbolic decomposition | `PASS`, residual degree 11 |
| \(\Delta^7,\ldots,\Delta^{11}\) | `CERTIFIED` |
| \(\Delta^6\) | `CERTIFIED`, 1,296 coefficients |
| \(D_4\)-concavity | `CERTIFIED`, 102,060 coefficients |
| ordinary \(\Delta^2,\ldots,\Delta^5\) cells | `PASS`, 186,372 coefficients |
| refined rooted \(\Delta^2\) cell | `PASS`, 26,472 coefficients |
| symbolic boundary reduction | `PASS` |
| infinite boundary, \(n\ge24\) | `PASS`, 59,342 coefficients |
| rooted cores through order 17 | `CERTIFIED`, 81,137 trees and 1,324,073 roots |
| boundary orders 18--21 | `CERTIFIED`, 3,409,392 trees and 69,766,656 roots |
| boundary order 22 | `CERTIFIED`, 5,623,756 trees and 123,722,632 roots |
| boundary order 23, eight shards | `CERTIFIED`, 14,828,074 trees and 341,045,702 roots |

The order-23 aggregator reports

\[
\min R_1=213298868270896256,\qquad
\min\Delta R_1=456707985617333448.
\]

All arithmetic in the symbolic and Bernstein verifiers is exact
integer or rational arithmetic.  All arithmetic in the finite Rust
verifier is signed 128-bit integer arithmetic.

## Reproduction environment

The clean replay used:

- Python 3.12.10;
- SymPy 1.14.0;
- NumPy 2.3.5;
- Rust 1.97.1 with target `wasm32-wasip1`;
- Node.js 24.12.0.

The finite verifier recompiles the Rust source before running it.

## SHA-256 source manifest

```text
07A6558FA23C30ED33B2F7E87C0013989001976B03682DAA53FCB0B1A0ADD901  verify_rank6_terminal_bundle_reduction.py
3AA41467139F117F2B7ED6585F40AFFA9E5F159553565AF9C7C493560EBC4CA9  verify_rank6_terminal_bundle_high_differences.py
C7C8069F4E61F6580D0B11B1D54D45CC82B0F795176DBE72CCECD3C47343788B  verify_rank6_terminal_bundle_delta6.py
C17D8724D9973DD59EF30AE3FA99F28715DC1A6909F0AC0E615806F393824BF6  verify_rank6_terminal_bundle_d4_concavity.py
3A916A23C1928C9235D5AA6730B2C09013FCB20AD599F7061A77428B4935B741  verify_rank6_terminal_bundle_delta2to5.py
06DCF312BA8B0774AD4DF1DE9637F628CC676ED6D0C5BDF1F940706FCD437475  verify_rank6_terminal_bundle_delta2_refined_upper.py
2DD08746ACA2C9E5154BD4A05A9F6391FEB581724DBCF769C4FB049DD9278E63  verify_rank6_terminal_bundle_boundary_reduction.py
38246BA069C879736405B9B231F9E18F61337BE78245017244E74A9BEBA14532  verify_rank6_terminal_bundle_boundary_infinite.py
0F700C716739ABEF49DB90C9890C3218186F680E7CA71DC81A82249BC9951AFA  explore_rank4_three_halves_grouped.py
5C2DF92B10658F33F5C9FFACF158B8897EE36DAD97DF294EB197FD90943487B1  verify_rank6_small_core_isolate_payments.py
A9882BFF52907EB8F7BD9A0F9549240AF394AAECDA4D1F36A5EB96B331940222  verify_rank6_small_core_isolate_payments.rs
A895D74CF70FCD1CC81D9671C1F55FF2DEC58ADDD2CEF07CC2C5A532464D2C20  verify_rank6_small_core_isolate_payments.js
C959EC42E7D0E8A93136ED5A63D678F1916AB20CF6368D40C58FFB89B6016C22  verify_rank6_boundary_n23_shards.py
```

## Independent-review priorities

An independent reviewer should focus first on:

1. whether each normalized domain in the Bernstein verifiers contains
   every realizable tree/root parameter tuple;
2. the two rooted relations
   \(r=1-u\) and \(q=1-(c_4/c_5)uY\);
3. the small-\(m\) path-minimality bound and the large-\(m\) forest
   ratio bound used for the refined \(\Delta^2\) cell;
4. the adjacent-ratio correlation used by the infinite boundary
   verifier;
5. the terminal-broom decomposition and the final strong-induction
   split.

Passing the supplied programs establishes that the stated exact
algebra and enumerations agree with the encoded domains.  Independent
mathematical review is still needed to confirm that no domain
assumption was encoded too narrowly.
