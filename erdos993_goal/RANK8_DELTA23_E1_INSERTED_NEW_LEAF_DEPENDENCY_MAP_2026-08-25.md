# Rank-eight Delta2/Delta3 e=1 inserted-new-leaf dependency map

Date: 2026-08-25

Status: **coverage map only; no new theorem is claimed here**.

## Exact target

Start with an `e=1` subdivided claw of source order at least 23, extend one arm
by a new endpoint leaf, and root the extended tree at that newly inserted
leaf.  The remaining target is positivity of the rank-eight terminal-residual
coefficients `Delta2` and `Delta3` for every ordered source claw and every one
of the three extension-arm orbits.

Write the ordered source arm lengths as

```text
(A+1, A+B+1, A+B+C+1),
```

where `A,B,C>=0`.  Then the source order is

```text
n = 4 + 3*A + 2*B + C,
```

and `n>=23` is exactly `3*A+2*B+C>=19`.

## Existing exact producer evidence

The older all-order producer and report are:

```text
certify_rank8_e1_new_leaf_newton_cell.py
  2FE6FD3C9CE46F46795238903D8264FD42629A5DCEA9F0CCB1A4D576C72DB218
certify_rank8_delta013_e1_new_leaf_all_order.py
  9899FC2D687ADFE1DE8A60314563FE42AF24064D12E0F50870AC364E1E54903E
rank8_delta013_e1_new_leaf_all_order_exact_20260820.json
  968F0DD84D0ABB95B9677FB1A33D6C4C6C39F60A8D10EBEBCE6D50F58B218960
```

Despite the historical filename/status spelling `Delta013`, the source loops
over ranks `0,1,2,3`, and the report scope explicitly includes `Delta0` through
`Delta3`.  Its exact Delta2/Delta3 slices are:

| rank | extension cases | routed cells | Newton coefficients | negative | zero | positive |
|---:|---:|---:|---:|---:|---:|---:|
| Delta2 | 3 | 135 | 85,428 | 0 | 63,531 | 21,897 |
| Delta3 | 3 | 135 | 77,355 | 0 | 57,270 | 20,085 |
| **combined** | **6** | **270** | **162,783** | **0** | **120,801** | **41,982** |

For each extension and rank, the producer uses a 45-cell no-gap partition:

```text
A>=7;
A=0..6 and B>=ceil((19-3*A)/2);
A=0..6, smaller fixed B, and C>=19-3*A-2*B.
```

Its conservative per-axis degree bounds are 27 for Delta2 and 26 for Delta3.

## Precise certification gap

The 2026-08-20 report stores only per-cell aggregate sign counts, origins, and
sample minima.  It does **not** store ordered coefficient digests, and no
matching independent literal adjacency-list/include-exclude tree-DP audit is
present.  Therefore this map does not promote that historical PASS to the
current independent-replay standard.

The smallest clean closure has two finite steps:

1. Produce a new hash-pinned Delta2/Delta3 report for the same 270 cells and
   162,783 coefficients, storing every ordered tensor digest and minimum.
2. Independently rebuild the new rooted tree as a literal adjacency list,
   compute its core and new-root deletion polynomials by generic include/
   exclude forest DP, rebuild all 45 routing cells, replay every ordered
   coefficient, and check literal tensor corners in all six rank/orbit cases.

For a new endpoint root, deleting the root recovers the source claw exactly.
Thus the independent profile engine needs only:

```text
core    = independence profile of the one-arm-extended claw;
deleted = independence profile of the original source claw.
```

The same ordered weighted-cone geometry already independently audited for the
center-root packages applies to the source-order domain, but no center-root
sign conclusion may be imported.

## Downstream ledger dependency

Only after the two steps above pass may a final `e=1` placement ledger combine:

- the separately sealed Delta2 old-root placement ledger;
- the separately sealed Delta3 old-root placement ledger; and
- the new inserted-leaf Delta2/Delta3 audit.

That would close only the `e=1` subdivided-claw root-placement subgate.  It
would not establish arbitrary-tree extension positivity, full `Q8/PGC`,
forest independence-sequence unimodality, or Erdős Problem 993.
