# Rank-eight cumulative exceptional first-crossing theorem through alpha five

Date: 2026-08-20

Status: **fail-closed exact PASS for terminal component alpha one through five,
covering all 15 required source cells with pinned report and audit hashes.  This
is a cumulative partial theorem; terminal alpha six through nine remain.**

## Theorem

Order the 1,215 exceptional component jets by the fixed order in
`rank8_exceptional_tree_jets_exact_20260820.tsv`.  Consider an
exceptional-only product at the first point its total independence number
reaches 14.  If its unique largest sorted component type has independence
number at most five, then

```text
Q8 = 16*i8^2 - i7*i8 - 18*i7*i9 > 0.
```

For terminal alpha `a`, the exact source range is

```text
14-a <= source alpha <= 13.
```

Thus terminal bands one through five require exactly

```text
1 + 2 + 3 + 4 + 5 = 15
```

source cells.  All 15 occur exactly once in the assembly; none is missing or
duplicated.

## Exact coverage

```text
terminal alpha  source alpha range  crossing total range  type indices
       1              13                   14                 1..2
       2            12..13               14..15               3..4
       3            11..13               14..16               5..9
       4            10..13               14..17              10..24
       5             9..13               14..18              25..72
```

Each band has an exact recurrence report and an independent no-gap audit.  The
alpha-four and alpha-five audits compare canonical key and product tables in
both relational directions.  Jet collisions are retained as exact equivalence
compression and are not treated as omitted multisets.

## Aggregate exact counts

```text
terminal bands                         5
source cells                           15
independently enumerated multisets     3,688,718
canonical check keys                   2,747,704
distinct cell product jets             2,141,645
multiset-to-key collisions               941,014
key-to-product collisions                 606,059
negative Q8                                    0
zero Q8                                        0
minimum Q8                             9,324,000
maximum Q8               105,099,639,472,256
```

Every canonical check is strictly positive.

## Fail-closed assembly

The assembler fails on any:

* missing band report or audit;
* pinned SHA-256 drift;
* non-PASS input status;
* missing or duplicate `(terminal alpha, source alpha)` cell;
* audit/report count mismatch;
* nonpositive reported minimum; or
* negative or zero literal `Q8` value.

The independent cumulative audit reconstructs the triangular cell coverage,
checks contiguous terminal type indices `1..72`, rehashes all ten pinned band
artifacts, and recomputes every aggregate count.

## Pinned band artifacts

```text
rank8_exceptional_first_crossing_alpha1_pilot_exact_20260820.json
193BE4F3BC1418BAEE4F070D0AC1F215E2EAE035A9A07AFE71539AD1D1011F04

rank8_exceptional_first_crossing_alpha1_pilot_audit_exact_20260820.json
14DE98471DD87DB704E5F97776F00016FE692494CF039B9F8887B626FDEE9D2E

rank8_exceptional_first_crossing_alpha2_exact_20260820.json
E7F7367B14C38F4298500FDC657B375120997657DACB64DBBA90DC3B657C386A

rank8_exceptional_first_crossing_alpha2_audit_exact_20260820.json
D20CD466290D88256D9DCB6A529C8CF32591F2070BEE7EBA6CAB0A2D39AB6B70

rank8_exceptional_first_crossing_alpha3_exact_20260820.json
55E3215E4205BD6B1673B35F7ED1A7BCA1B63147555B1C5C3F1E8A87F969C0BA

rank8_exceptional_first_crossing_alpha3_audit_exact_20260820.json
904EC889C7CD57B78BECE572BEEBB65B881B5E51C933E8A612BE008F55074867

rank8_exceptional_first_crossing_alpha4_exact_20260820.json
0737ACA3606D2B733C67BBE1CF9C10365C935FBB0C89776C6556EE219F9E5779

rank8_exceptional_first_crossing_alpha4_audit_exact_20260820.json
56A7253B6CCAAA2608D0F429B7AEE8348A48549D22A3E915033F94C9CE54A888

rank8_exceptional_first_crossing_alpha5_complete_assembly_exact_20260820.json
067E8986AC825027D65F22B9E4595A63BC1C5A5D4DC3795C17CCBCD9A39C775F

rank8_exceptional_first_crossing_alpha5_complete_assembly_audit_exact_20260820.json
E48B9770ABF4BE1500E1FDC34B653BBBE518F96BEF883A9C3764A512AC251316
```

## Cumulative package hashes

```text
assemble_rank8_exceptional_first_crossing_alpha1_5.py
DA3DF4C794E803544C7FC2A0E8FB87F460A3A67B805ED599DB2A26CF4F5E3213

rank8_exceptional_first_crossing_alpha1_5_cumulative_exact_20260820.json
13D2FEF2B889A8F85FDB7A2D8F38CDE7E0B9DA9A0C5C9EA249E632845E264EE7

audit_rank8_exceptional_first_crossing_alpha1_5.py
6243F1966D145BEE7685BF3D979A77026DBCFD58937DF5438CF90065975C647C

rank8_exceptional_first_crossing_alpha1_5_cumulative_audit_exact_20260820.json
95A777D45DB195DE88B0F6D6AD93DB35618F873093EF00E35197FBBD56452261
```

## Scope boundary

This theorem does not cover terminal alpha six, seven, eight, or nine and is
not the complete exceptional-only first-crossing certificate.  It does not
prove a full/full cone, connected `Q8`, the lower all-forest gaps, full forest
`Q8`, or PGC.  No connected `Delta0..3` work is included.
