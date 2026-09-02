# Rank-eight low/low full-early suffix-4 theorem

## Result

All four pending low/low Bernstein auxiliaries are nonnegative for

```text
h,ta,tb,a0,a2,a4,a6,a7,b0,b2,b4,b6,b7 >= 0,
```

with the adjusted gap slacks `a3=a5=b3=b5=0`.  This is an exact
all-variable cone theorem on the stated face, not a numerical value scan.

## Directional AM-GM lift

The immutable full-early-core certificate supplies 54, 84, and 159 AM-GM
allocations in its three nontrivial target rows.  The suffix-4 lift uses the
following exact directional masks:

```text
target                       left blocks   right blocks
curvature middle                       0              0
curvature far                          0             51
strong middle                         75              0
strong far                            76             68
```

These masks agree exactly with the separately proved suffix-5 masks.  The
agreement was not assumed: degree-one overlap discovery forced the nonzero
strong masks, full right-curvature discovery forced its 51-block mask, and
the complete grid check validates all selected and zero masks simultaneously.

The `a4` and `b4` gaps each occur in five ratios.  Curvature therefore has
outer degree at most `(10,10)`, while the left capacity factor raises the
strong `a4` degree bound to 11.  The fail-closed verifier checks every cell in

```text
0 <= deg(a4) <= 11,    0 <= deg(b4) <= 10.
```

The origin is the hash-locked full-early-core AM-GM certificate.  The other
131 cells contain:

```text
curvature middle    14,451,162   minimum 4
curvature far       14,448,067   minimum 1
strong middle       27,758,823   minimum 4
strong far          27,757,313   minimum 1
total               84,415,365
negative                     0
```

The independent audit verifies the report, probe, and origin hashes; the
complete 132-key grid; every row invariant; recomputed aggregates; every mask
bound against its allocation count; and five fresh representative cells.  It
is explicitly a structural and sample recomputation audit, not a second full
84-million-coefficient engine.

## Sealed artifacts

```text
probe_rank8_low_low_full_early_suffix4_a4_b4_cell_flint.py
D116602901A39024D304148BD1474CCF702FB325AC7BC2E9BDE1BD37515EE986

discover_rank8_low_low_full_early_suffix4_masks.py
588185BAC53CA5C6B5F5307E85A59F0AE4C704772D5C8E3FF0A909BD7C927B34

verify_rank8_low_low_full_early_suffix4_a4_b4_cells.py
080EAFAE4D8B325C037F4ADE447DA496AFDF9E06D5D5625CB12111024B8181DD

rank8_low_low_full_early_suffix4_a4_b4_cells_exact_20260821.json
7FE98FC820FFBEC01289AFDB7AE86913528D5C4E2DD90F3DEDD4B9F72803CA7E

audit_rank8_low_low_full_early_suffix4_cells.py
41AC5E5F56999BF7BD676AA00D673812FDF5E4C00F9FE5AFE80622CE049DC44F

rank8_low_low_full_early_suffix4_audit_20260822.json
BA51DD8EDDA7A7D0D6425A6C795BA18C1542F350AB4F1376A7EA38419BA73F78
```

## Remaining low/low join

This theorem closes suffix index 4 over the full early core with suffix index
5 zero.  The earlier theorem closes suffix index 5 over the same core with
suffix index 4 zero.  Their simultaneous interaction is not a formal
consequence of the two coordinate-face theorems and remains to be proved.
After that joint `(a4,b4,a5,b5)` lift, suffix index 3 must still be joined to
obtain the entire low/low slack cone.
