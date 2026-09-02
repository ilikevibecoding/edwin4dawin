# Rank-eight exceptional first-crossing terminal-alpha-four band

Date: 2026-08-20

Status: **exact PASS for all four terminal-alpha-four cells, with an
independent disk-backed, bidirectional no-gap and collision audit.  This stops
before terminal alpha five.**

## Certified cells and signs

```text
source terminal total checks products key->product collisions negative zero
  10      4      14    18,864  15,599          3,265             0      0
  11      4      15    31,862  25,922          5,940             0      0
  12      4      16    53,393  43,088         10,305             0      0
  13      4      17    85,149  67,545         17,604             0      0
total                  189,268 152,154         37,114             0      0
```

Exact sign ranges:

```text
source 10:  10,482,966 <= Q8 <=    703,056,190,464
source 11:  43,750,575 <= Q8 <=  2,975,769,688,320
source 12: 161,328,816 <= Q8 <= 11,040,305,557,248
source 13: 535,600,208 <= Q8 <= 36,720,692,676,096
```

Every canonical check is strictly positive.

## Exact partial-state counts

After closing sorted component type 24, the distinct keys
`(alpha,i1,...,i9)` are

```text
alpha   0  1  2  3  4  5   6   7   8    9   10   11   12    13
states  1  2  5 13 38 69 147 299 616 1057 1979 3516 6254 10174
```

The total is 24,170 partial states.

## Independent no-gap and collision audit

The recurrence retained every canonical
`(source alpha, largest type, source jet, product jet, Q8)` key in an exact
SQLite table.  Independently, the audit enumerated every exponent vector of
the 24 component types of alpha at most four, selected the unique largest
nonzero alpha-four type, removed one terminal copy by exact triangular
deconvolution, and rebuilt the same key.

The independent and recurrence key tables, and their distinct-product tables,
were compared in both directions with relational `EXCEPT`.  All four
differences were empty.

```text
source raw multisets canonical keys products multiset->key key->product
  10      22,165         18,864      15,599      3,301        3,265
  11      38,570         31,862      25,922      6,708        5,940
  12      66,330         53,393      43,088     12,937       10,305
  13     109,515         85,149      67,545     24,366       17,604
total    236,580        189,268     152,154     47,312       37,114
```

Maximum multiplicities were:

```text
source max multisets/key max keys/product max multisets/product
  10          4                4                 8
  11          4                4                 8
  12          6                4                10
  13          7                4                14
```

These collisions are exact equivalence compression, not omissions.  Distinct
component multisets can have the same truncated product jet through rank nine;
once the alpha and `i0..i9` key agrees, all subsequent truncated convolutions
and literal `Q8` evaluations agree.  The audit nevertheless begins from every
raw multiset and proves that its canonical equivalence class is present.

## Resources and scope

Recurrence run:

```text
workers             1
elapsed              2.698379100067541 seconds
peak private bytes  67,436,544
peak private MiB    64.3125
cap                 512 MiB
```

Independent audit:

```text
workers             1
elapsed              8.417264000046998 seconds
peak private bytes  71,012,352
peak private MiB    67.72265625
cap                 512 MiB
```

An initial audit attempt completed enumeration but failed at the final Windows
SQLite URI attachment.  Its temporary database was automatically discarded;
no mathematical or resource obstruction occurred.  The native-path read-only
comparison then passed, and the sealed recurrence database hash was unchanged
before and after the audit.

This certifies only terminal alpha four.  Terminal-alpha bands five through
nine remain.  No full/full cone and no connected `Delta0..3` work was run.

## Exact hashes

```text
probe_rank8_exceptional_first_crossing_alpha4_exact.py
30CDED3A22C1614DF10D0472CCD518313A87B7F739E30A4005DD89ED9E70D644

rank8_exceptional_first_crossing_alpha4_exact_20260820.json
0737ACA3606D2B733C67BBE1CF9C10365C935FBB0C89776C6556EE219F9E5779

rank8_exceptional_first_crossing_alpha4_keys_exact_20260820.sqlite3
E058ACAAFD9E02B19EFDE4F17CD2BED1ADAE95C03EC3FF55D156082CD949A335

audit_rank8_exceptional_first_crossing_alpha4.py
F0B14E675926750FEB5B6FA8C49677D82316B3AF9C73BCAC5B81C0A92E6A60FF

rank8_exceptional_first_crossing_alpha4_audit_exact_20260820.json
56A7253B6CCAAA2608D0F429B7AEE8348A48549D22A3E915033F94C9CE54A888

probe_rank8_exceptional_first_crossing_alpha2_exact.py
DEB3979EAD3F997A7399C4485AFCABF7D246B66FC02A2B8D8ABA6F7BFA5D46D3

rank8_exceptional_tree_jets_exact_20260820.tsv
B4558C561CE1C13C74C4AFB2DA25CD0E0265AB7AD6C9AC1C283EC54133D1F17A

rank8_exceptional_tree_jets_exact_20260820.json
BFE580BFED487B75D8C4A188AA56770D06EED3C6F4C351F4E093998F3CF0B0C4
```
