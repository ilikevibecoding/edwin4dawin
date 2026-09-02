# Rank-eight low/high full-convolution cone theorem

## Exact theorem

Let the first rank-eight factor row lie in the low cone

```text
delta0>=2h, delta1=h-t, delta2>=h+t,
delta3,...,delta7>=h, 0<=t<=h,
```

and let the second factor row lie in the high cone

```text
delta0>=2h, delta1,...,delta7>=h.
```

Then their rank-eight terminal convolution margin is nonnegative.  Thus the
low/high member of the three full/full rank-eight convolution cones is closed
for every admissible factor pair.

## Reduction and proof

Replace the low row's second adjusted ratio by `C=A2-t`.  This produces a high
base row with `delta1=h`, and the original low row is recovered by multiplying
all coefficients of index at least three by

```text
lambda=1+t/C,  C>=6h,  0<=t<=h.
```

The exact terminal margin is

```text
M(t)=M0+(t/C)d+(t/C)^2 q2.
```

The high/high MLR theorem gives `M0>=0`.  The exact pairwise theorem gives
`q2>=0`.  It remains to prove the strong auxiliary

```text
H_str=C*M0+h*d>=0.
```

That auxiliary is covered without reusing or double-counting the `M0` reserve:

1. An independently audited multinomial AM-GM certificate proves `H_str>=0`
   on the core face `a0=a2=b3=...=b7=0`, with arbitrary
   `a3,...,a7,b0,b1,b2`.
2. Exact nonnegative positive-`a2` support and the two positive powers of the
   quadratic `a0` extension make `a0,a2` arbitrary.
3. Ordered, no-gap coefficient extensions make `b3`, then `b4`, then `b5`
   arbitrary.  The final `b5` stage contains 3,168 cells and 203,484,831 exact
   coefficients, with zero negatives; its zero face is the audited `b3,b4`
   theorem.
4. Exact nonnegative correction identities add arbitrary `b7` and then `b6`,
   with all previous slacks retained.

For `d>=0`, the displayed quadratic gives `M(t)>=M0>=0`.  For `d<0`,
`0<=t<=h` gives

```text
M(t) >= M0+(h/C)d >= 0
```

by `H_str>=0`.  Hence there is no endpoint or interior gap.

## Sealed integration artifacts

```text
assemble_rank8_low_high_full_cone_direct_h.py
A2A0DEF0524ACBFEE0C92750261E79ABB98CB12C6094A5CC3BBD202450972A57

rank8_low_high_full_cone_direct_h_exact_20260821.json
DAE963CA32C18CF7E6FAB7876B82EBC622A1ECAA8808F44DC901CE2E912DC9A5

audit_rank8_low_high_full_cone_direct_h.py
716527442600C1BF787E7B3ABD3BCA8834277B3026C11AC28361BB4E055063EB

rank8_low_high_full_cone_direct_h_independent_audit_exact_20260821.json
EE7828E3738047A0C925D885845DFE02A1D51871E3D10B842C5B5105F4240AD5

verify_rank8_low_high_strong_b5_b4_a0_a2_cells.py
B8662E4167A6ABF401E29D74D4D753858ED14A39DEA51ED083BDCC83C5B06C59

rank8_low_high_strong_b5_b4_a0_a2_cells_exact_20260820.json
E89F08432FBE629B89B3537DFF8AE00AE1805BB14DBBA279EAC5D37046D69744

audit_rank8_low_high_strong_b5_b4_a0_a2_cells.py
CAA4C2FFE4B4A5A61537E36DAE672AAF745F94BE0480B213A7AD0C3EF751B076

rank8_low_high_strong_b5_b4_a0_a2_cells_independent_audit_exact_20260821.json
9FA7E65225A2E03695539294E91A8B93D9CC1349E70B40CEEA8A19CF8F2C879F
```

Both the assembler and its independent audit pin every core, left-lift,
`b3`, `b4`, `b5`, corrected `b6/b7`, `q2`, tail-reduction, and high/high input
hash.  They regenerate all ordered coefficient-key universes and reject the
withdrawn base-payment route and its incorrect join.

## Scope

This theorem closes exactly the rank-eight low/high convolution cone.  It does
not close the low/low cone, the remaining connected rank-eight inputs, the
terminal-alpha-eight or terminal-alpha-nine first-crossing bands, the complete
forest lift, the rank-eight PGC boundary, or Problem 993.
