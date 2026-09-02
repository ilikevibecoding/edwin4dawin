# Rank-eight cumulative exceptional first-crossing theorem through alpha six

Date: 2026-08-20

Status: **fail-closed exact PASS for terminal component alpha one through six,
covering all 21 required source cells with exact type coverage and independent
audits.  This is a cumulative partial theorem; terminal alpha seven through
nine remain.**

## Theorem

Order the 1,215 exceptional component jets by the fixed order in
`rank8_exceptional_tree_jets_exact_20260820.tsv`.  Consider an exceptional-only
product at the first point its total independence number reaches 14.  If its
unique largest sorted component type has independence number at most six, then

```text
Q8 = 16*i8^2 - i7*i8 - 18*i7*i9 > 0.
```

For terminal alpha `a`, the exact source range is

```text
14-a <= source alpha <= 13.
```

Thus terminal bands one through six require exactly

```text
1 + 2 + 3 + 4 + 5 + 6 = 21
```

source cells.  All 21 occur exactly once; none is missing or duplicated.

## Exact coverage

```text
terminal alpha  source alpha range  crossing total range  type indices
       1              13                   14                 1..2
       2            12..13               14..15               3..4
       3            11..13               14..16               5..9
       4            10..13               14..17              10..24
       5             9..13               14..18              25..72
       6             8..13               14..19              73..247

exact terminal type union                                  1..247
missing source cells                                             0
duplicate source cells                                           0
```

Every source cell has an exact recurrence report and an independent audit.
Where cells were resource-sharded, their source-band assembly first proved an
exact consecutive no-gap union.  Canonical key collisions are retained as
equivalence compression and are not treated as omissions.

## Terminal-alpha-six aggregate

```text
source cells                                   6
raw source multisets                  39,319,350
canonical checks                     28,400,924
distinct shard-product counts sum    27,605,829
multiset-to-key collisions            10,918,426
key-to-product collisions in shards      795,095
negative Q8                                    0
zero Q8                                        0
minimum Q8                            9,399,272
maximum Q8                  282,462,928,635,888
```

## Cumulative alpha-one-through-six aggregate

```text
terminal bands                                 6
source cells                                  21
independently enumerated multisets    43,008,068
canonical check keys                  31,148,628
distinct cell/shard product sum       29,747,474
multiset-to-key collisions            11,859,440
key-to-product collisions              1,401,154
negative Q8                                    0
zero Q8                                        0
minimum Q8                            9,324,000
maximum Q8                  282,462,928,635,888
```

Every canonical check is strictly positive.  Product counts are sums over
sealed cells or shards, not a cross-cell global deduplication.

## Fail-closed assembly and independent audit

The cumulative assembler fails on any missing input, SHA-256 drift, non-PASS
status, nonpositive sign, count mismatch, missing/duplicate source cell, or
type-range gap.  It pins the already sealed cumulative alpha-one-through-five
package and the six complete terminal-alpha-six source packages.

The independent cumulative audit rehashes the producer, cumulative JSON and
all 14 sealed input assembly/report artifacts; reconstructs the triangular
source rule; verifies the consecutive terminal type ranges `1..247`; checks all
21 source cells for exact-once coverage; and recomputes every aggregate count,
sign and extremum.

## Pinned input package hashes

```text
rank8_exceptional_first_crossing_alpha1_5_cumulative_exact_20260820.json
13D2FEF2B889A8F85FDB7A2D8F38CDE7E0B9DA9A0C5C9EA249E632845E264EE7

rank8_exceptional_first_crossing_alpha1_5_cumulative_audit_exact_20260820.json
95A777D45DB195DE88B0F6D6AD93DB35618F873093EF00E35197FBBD56452261

rank8_exceptional_first_crossing_alpha6_s8_types73_247_exact_20260820.json
7EB4EB1FCAA4C12A86F25FE48EC210F27569FB1187A458FFB38188DD222413EA
rank8_exceptional_first_crossing_alpha6_s8_types73_247_audit_exact_20260820.json
98E94B82733EE2F04A978141E56F6225E8FC6DF0930DF865C0837743DFA198CB

rank8_exceptional_first_crossing_alpha6_s9_complete_exact_20260820.json
3FA63B5C268993BDA02B63D73BC82F7823CE171EE42F0D368B63A55B45B6F91A
rank8_exceptional_first_crossing_alpha6_s9_complete_audit_exact_20260820.json
D8B33E850B03D7725609504401AE80494E7A20807E655321E36E5D79FC236651

rank8_exceptional_first_crossing_alpha6_s10_complete_exact_20260820.json
3F8CB1ECCCACAB493B58BF558D21529CF2449A1FBCCECF941053462F9941698B
rank8_exceptional_first_crossing_alpha6_s10_complete_audit_exact_20260820.json
DB6AEFC73EF103E8CF119471D085BA65F2542830CCCB32052988B1FBBDC04AD1

rank8_exceptional_first_crossing_alpha6_s11_complete_exact_20260820.json
6E7EA517686D368427F150A7C120E641213E90E421F534EB302D54BA93B5EED6
rank8_exceptional_first_crossing_alpha6_s11_complete_audit_exact_20260820.json
3DD34F9B0E2CB3C2A4D06AAC20D5D180DB0E1D82A5C7B0F3C34256E9E5A03F14

rank8_exceptional_first_crossing_alpha6_s12_complete_exact_20260820.json
EF1CDF5CCEC98B8707B737ADB7767C8511F9B45E685CFF7AC01C439F860CCB60
rank8_exceptional_first_crossing_alpha6_s12_complete_audit_exact_20260820.json
B17E099ED2B879D7BA4FA556EFC7E7CC82F03DCFD2AB7245920BDE0484A1228B

rank8_exceptional_first_crossing_alpha6_s13_complete_exact_20260820.json
0327AFE9BFFA08B05D5D2B3AE708E097E97D4CF2F18A075F10C72994593559B2
rank8_exceptional_first_crossing_alpha6_s13_complete_audit_exact_20260820.json
E9B9023D4905EA81EA45071691696671C3FF070415DC92D309058872A0BED139
```

## Cumulative package hashes

```text
assemble_rank8_exceptional_first_crossing_alpha1_6.py
71579B4089739825DD8E940DF0EB02A773C5BCCF07D97A44094CEDA93813CDE5

rank8_exceptional_first_crossing_alpha1_6_cumulative_exact_20260820.json
6AE270E454FF67C122BFCE5409F9D280C186D293ED12F783F07DC0616EC94671

audit_rank8_exceptional_first_crossing_alpha1_6.py
F3E38B6265F356C115F7960FAAE4C158002F71617445F80E0BB6522BDD496E65

rank8_exceptional_first_crossing_alpha1_6_cumulative_audit_exact_20260820.json
01BBD95FE7931FD507A1A37A07CDFAD8540411113A38073883B07695D9D2BFED
```

## Scope boundary

This theorem is the exact exceptional-only first-crossing certificate through
terminal alpha six.  Terminal alpha 7, 8 and 9 remain.  It does not prove a
full/full cone, connected `Q8`, the lower all-forest gaps, full forest `Q8`, or
PGC.  No terminal-alpha-seven computation was launched.
