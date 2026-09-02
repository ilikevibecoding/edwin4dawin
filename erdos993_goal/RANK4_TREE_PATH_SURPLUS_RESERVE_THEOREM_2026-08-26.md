# A quantitative rank-4 path-surplus reserve for trees

Date: 2026-08-26

Status: **proved for every tree of order at least 15, with an
independent exact audit**.  This is a coupling input for the pending
rank-8 Delta-2 certificate; it does not by itself resolve Erdos Problem
993.

## Theorem

Let \(T\) be an \(n\)-vertex tree, \(n\ge15\), and put

\[
e=\sum_{v\in V(T)}\binom{d_T(v)-1}{2}.
\]

Then

\[
\boxed{
i_4(T)-i_4(P_n)
=i_4(T)-\binom{n-3}{4}
\ge \frac{2n-11}{3}\,e .}
\tag{1}
\]

In the rank-8 source coordinates, where

\[
i_4(T)=\binom{n-3}{4}+(n-4)e-\tau,
\]

this is equivalently

\[
\boxed{\tau\le\frac{n-1}{3}\,e.}
\tag{2}
\]

## Proof

Write

\[
x_v=d_T(v)-1,\qquad
B_j=\sum_v\binom{x_v}{j},
\]

\[
E=\sum_{uv\in E(T)}x_ux_v,\qquad
X=E-(n-3).
\]

Thus \(B_2=e\).  The exact four-set motif identity is

\[
D:=i_4(T)-i_4(P_n)=(n-5)B_2-B_3-X.
\tag{3}
\]

The previously proved Zagreb coupling theorem gives, for every
\(n\ge15\),

\[
7X\le2(n-4)B_2-6B_3.
\tag{4}
\]

Substitution of (4) in (3) yields

\[
D\ge\frac{(5n-27)B_2-B_3}{7}.
\tag{5}
\]

For every vertex, \(x_v\le n-2\), and hence

\[
\binom{x_v}{3}
=\frac{x_v-2}{3}\binom{x_v}{2}
\le\frac{n-4}{3}\binom{x_v}{2}.
\]

After summing,

\[
B_3\le\frac{n-4}{3}B_2.
\tag{6}
\]

Combining (5) and (6) gives

\[
D\ge
\frac{(5n-27)B_2-(n-4)B_2/3}{7}
=\frac{2n-11}{3}B_2,
\]

which is (1).  Rearranging
\(D=(n-4)e-\tau\) gives (2).  This completes the proof.

## Replayable evidence

Primary verifier:

- `verify_rank4_tree_path_surplus_reserve_root.py`
- SHA-256
  `719BE60CCF0660C71293690DED81B9120922F5823BCA27EF61CD334A109D4AEC`
- report `rank4_tree_path_surplus_reserve_exact_root_20260826.json`
- report SHA-256
  `301944315BFBDADD40B6DB7B5BD4912D184F5FF6167C51BD32167BFC49BAEF97`
- status `PASS_EXACT_RANK4_TREE_PATH_SURPLUS_RESERVE_N15_PLUS`
- exact census: all 27,061 unlabeled trees of orders 15 and 16, plus
  24 deterministic larger-family checks.

Independent verifier:

- `audit_rank4_tree_path_surplus_reserve_root.py`
- SHA-256
  `472B2DC9D10573E6F628CB60BE8F96F16BE11A46E652ABC75CE0BE133D509027`
- report
  `rank4_tree_path_surplus_reserve_independent_audit_root_20260826.json`
- report SHA-256
  `01F8D577C8F64B2E6B9CBADCB5D25FD8E2AD658B8ACD3C17722992016CE4E137`
- status `PASS_INDEPENDENT_RANK4_TREE_PATH_SURPLUS_RESERVE_AUDIT`
- the audit rebuilds the symbolic derivation without importing the
  producer and recomputes all 7,741 unlabeled order-15 trees using a
  separate independence-polynomial dynamic program.

Pinned all-order input:

- `TREE_RANK45_PATH_RATIO_THEOREM_2026-07-28.md`
- SHA-256
  `7FE34CDC7F02442ABB9665A0FDC093B78331C6B93CC0793F60B06259BB7B1528`
- `verify_tree_rank45_path_ratio.py`
- SHA-256
  `AB5D6E395A13BE66276D45C25EB2F869B2410B2445F78A45F4A83648CE1CA86C`

## Scope boundary

The theorem supplies a previously missing joint restriction between
the degree surplus and \(i_4(T)\).  A complete solution still requires
the remaining Delta-2 finite layer and the final global assembly.
