# Rank 8: scoped all-order e=1 leaf-extension results

Date: 2026-08-20

## Exact all-order theorem: the newly inserted leaf as root

Let the source subdivided claw have ordered positive arm lengths

\[
(a,a+B,a+B+C),\qquad A=a-1\ge0,\ B,C\ge0.
\]

Its order is `n=4+3A+2B+C`, so `n>=23` is exactly
`3A+2B+C>=19`.  For each choice of the extended arm, delete the newly
inserted endpoint.  The resulting rooted-deletion forest is the source claw.

The exact certificate uses the following disjoint, no-gap partition:

1. `A>=7`;
2. `A=0..6` and `B>=ceil((19-3A)/2)`;
3. `A=0..6`, smaller fixed `B`, and `C>=19-3A-2B`.

This gives 45 cells for each rank and extended arm, hence
`4*3*45=540` cells.  Exact finite differences give the coefficients in the
multivariate binomial/Newton basis.  Conservative per-axis degree bounds are
28, 28, 27, 26 for Delta0, Delta1, Delta2, Delta3.  Every cell has a strictly
positive origin coefficient, and all other Newton coefficients are
nonnegative.  Totals are 350,877 coefficients: 0 negative, 261,267 zero, and
89,610 positive.

Therefore the newly inserted leaf satisfies
`Delta0,Delta1,Delta2,Delta3 > 0` for every source order `n>=23`, every
subdivided claw, and every choice of extended arm.

Certificate:

- `certify_rank8_delta013_e1_new_leaf_all_order.py`
  SHA256 `9899FC2D687ADFE1DE8A60314563FE42AF24064D12E0F50870AC364E1E54903E`
- `rank8_delta013_e1_new_leaf_all_order_exact_20260820.json`
  SHA256 `968F0DD84D0ABB95B9677FB1A33D6C4C6C39F60A8D10EBEBCE6D50F58B218960`

## Independently replayed supporting orbits

The finite extension scout was rerun exactly through source orders 23..35.
The base order has 920 rooted cases and minima

`[5923170966582245376, 19969651851918297984,
38230158759117788736, 58724193884454990528]`

for Delta0..Delta3.  Every old-root increment and every inserted-root value in
the stated finite range is strictly positive.

- scout source SHA256
  `EA9B7EC1718A75BE998EB64D992B53259673894D52ED0162462F69DF528DE928`
- scout report SHA256
  `0A42BE021839AD377DCFAE8AC5E024A2E2D1B19AD02F777C8804ED76F22B8D10`

The center-root all-order certificate for Delta0, Delta1, Delta3 replays on
all 28 short/long cells.  Its no-gap split is one three-long cell, six
two-long/one-short cells, and 21 one-long/two-short cells.  Zero long arms
implies order at most 19.  The separate Delta2 center theorem supplies the
fourth rank.

- center source SHA256
  `40F17DC3985A0E81A7DCC1F96DF7D1D8512B096027409439EBE95B2DEE5B4EED`
- center report SHA256
  `D269F04B7FD06A03072577BC95F282FFC2276BA024BF7EABE9B7C4E51EC79984`

The all-four-segments-long arm-root cell (`near,tail,other arms >=7`) also
replays coefficientwise for Delta0, Delta1, Delta3, with respectively
31,465, 31,465, and 23,751 strictly positive coefficients.  The separate
Delta2 all-long theorem supplies the fourth rank.

- all-long source SHA256
  `1E2FD7901FBCC2447F627A80884DEE8032B787B5385C42F75BBD4D12CE7F8529`
- all-long report SHA256
  `1BEFA5608CFA0B622AEAFAD42C65C5A650A0AFBBEC9F439DCACA2498AF92584E`

An independent low-memory audit checked all artifact hashes, scout case
counts, the infinite coordinate partitions, and 41 literal claw/deletion
identities using a generic tree independence-polynomial DP.

- audit source SHA256
  `D9B836E7A1237747993A6084037A44BE6E023560CDF797577B4194C90CC12DA4`
- audit report SHA256
  `857D122C864C9223D0DCC9981DD138BA09788D51FFE5B40AEDB5C33A07D309E7`

## Old-root increment obstruction and exact partial closure

For an old arm root, write `near` for the vertices between the center and the
root, `tail` for the vertices beyond it, and order the other arms as
`short+1 <= short+difference+1`.  At `near=0`, source order at least 23 is
exactly

`tail + 2*short + difference >= 19`.

The corresponding no-gap 120-cell partition was tested exactly for Delta3
and each of the three extension types (root arm, shorter other arm, longer
other arm).  In all three cases the same 101 cells certify coefficientwise;
the remaining 19 cells have negative Newton coefficients.  In particular,
all cells with fixed `tail<=10` certify, together with ten additional
large-difference cells at `tail=11..14`.  All sampled increments are strictly
positive, but the negative coefficients are only method obstructions and do
not establish the remaining infinite cells.

- ordered increment source SHA256
  `EFD0D13515248BC9F9FDC88969A1DA2C8306D15F4F5DC53F27728CDDC3F8ED2D`
- root-arm report SHA256
  `98364D5B0F8D6070B2811FCE6A30CA646B91A9449E3FC63F0B1F18CD372FD9D7`
- shorter-arm report SHA256
  `4745DBC973D6B0E4EFC96A0B36D6C7D42533DE5C75B1E38567640E0DF54B8693`
- longer-arm report SHA256
  `37428897176667DB1801497F33F3CE3B7403D5062F78416865503FC47B0ACE36`

A direct-value attempt on the same Delta3 `near=0` partition also remains a
Newton-method obstruction (all sampled values positive; 8,953 negative
coefficients).  Its source/report hashes are
`31563D3FF4B006DEE789790EAC440E88F89A8AB75EDDF10D34FF14521D4E7DFE` and
`B75735A1379F638182695B2501D4AB17D67D6D0D9EA88E44C5282017D9A2EF52`.

## Exact scope and remaining gap

This package proves the all-order new-leaf root orbit, independently supports
the center and all-long arm-root orbits, and closes 101 infinite `near=0`
old-root increment cells.  It does **not** prove the full all-root e=1 theorem.
The unresolved part is the old-root arm orbit outside the certified cells;
those cases need a stronger boundary identity/basis or a different direct
factorization.
