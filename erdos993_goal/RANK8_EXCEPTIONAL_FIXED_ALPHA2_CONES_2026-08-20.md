# Rank-eight alpha-two exceptional fixed/full cones

Date: 2026-08-20

Status: **exact, no-gap categorical certificate in both full cones.**

## Theorem

Let `E` be a connected-tree exceptional jet with `alpha(E)=2`, stored
through independence rank nine, and let `F` be an abstract rank-eight full
factor in either the high or low gap cone.  Then

```text
Q8(EF)>=0.
```

The exact exceptional database contains precisely two alpha-two jets:

```text
database index 3: (1,3,1,0,0,0,0,0,0,0)
database index 4: (1,4,3,0,0,0,0,0,0,0).
```

Both have fixed `Q8=0`.  Indices 1–2 have alpha one and index 5 has alpha
three, so the range 3–4 is the complete alpha-two class with no gap.

For each fixed jet, the verifier forms the exact factorial convolution

```text
q_k(EF)=sum_(j=0)^k binom(k,j)q_j(E)q_(k-j)(F)
```

and expands

```text
q8(EF)^2-q7(EF)q9(EF)-h q7(EF)q8(EF)
```

in the nonnegative parameters of the selected full cone.  Results:

```text
cone     jets      terms   negative   minimum   peak private GiB
high        2   1,772,700         0         1              0.145
low         2   2,586,704         0         1              0.181
```

Thus all `4,359,404` nonzero symbolic coefficients checked across the four
fixed-cone cases are positive.  Both peak-memory measurements are below the
one-GiB limit.

## Scope

This closes exactly the alpha-two fixed/full class.  Together with the
previous alpha-one result, four of the 1,215 exceptional jets are now closed
against both full cones.  It does not prove an alpha-three-or-higher
fixed/full class, a full/full cone, exceptional first crossing, connected
`Q8`, forest `Q8`, or rank-eight PGC.

## Independent replay and hashes

Run

```powershell
python .\audit_rank8_exceptional_fixed_alpha2.py
```

Expected marker:

```text
PASS_EXACT_NO_GAP_RANK8_EXCEPTIONAL_FIXED_ALPHA2_BOTH_FULL_CONES
```

SHA-256 values:

```text
verify_rank8_exceptional_fixed_full.py
6777296E01B957F426284B6F2C488ED8005030F1C8C14837DE028B35D1AF48BE

rank8_exceptional_fixed_high_exact_20260820_range_3_4.json
AEFB3796850B5E6C3FBC7C132C80EE06A016217A11F1287C0D804601D7803909

rank8_exceptional_fixed_low_exact_20260820_range_3_4.json
A93C4808D6E5F0E8081CD9DC5CD0AEC227B78F1D87D49452E289E2760AC37AD1

audit_rank8_exceptional_fixed_alpha2.py
5208C2F25D21410A29F259AD7845CB977D3049A3737F9E7338CE8D1580FA63B9

rank8_exceptional_fixed_alpha2_independent_audit_exact_20260820.json
711A53226DF2616B6C993CFCAAE61C3457CF7BC65183588A0C839863A21065B5

rank8_exceptional_tree_jets_exact_20260820.tsv
B4558C561CE1C13C74C4AFB2DA25CD0E0265AB7AD6C9AC1C283EC54133D1F17A

rank8_exceptional_tree_jets_exact_20260820.json
BFE580BFED487B75D8C4A188AA56770D06EED3C6F4C351F4E093998F3CF0B0C4
```
