# Rank-eight forest-lift reduction and first bounded fixed cones

Date: 2026-08-20

Status: **exact forest-lift reduction; exact all-order finite exceptional
component classification; exact fixed/full certificates for the complete
alpha-one exceptional band.  This is not yet the full forest lift.**

## 1. Conditional forest-lift theorem

Write

```text
q_j(F)=2^j j! i_j(F).
```

The literal rank-eight functional has the same sign as

```text
M8(F)=q8(F)^2-q7(F)q9(F)-q7(F)q8(F),
```

because

```text
M8=(2^16(8!)^2/16) Q8.
```

Assume the following five inputs:

1. `Q8(T)>=0` for every connected tree with `alpha(T)>=14`;
2. the lower all-forest ratio gaps through rank seven, including forest
   `Q7`;
3. the three full/full rank-eight convolution cones;
4. fixed-exceptional/full preservation for every exceptional component; and
5. an exact exceptional-only first-crossing certificate at total alpha 14.

Then

```text
Q8(F)>=0 for every forest F with alpha(F)>=14.
```

The assembly is exact.  A component is **full** when the lower gaps put it
in one of the exhaustive high/low cones and it has `Q8>=0`.  A connected
component is **exceptional** precisely when

```text
alpha<=7 or Q8<0.
```

If a target forest already has a full component, start there and adjoin
full components by a full/full cone and exceptional components by fixed/full
preservation.  Otherwise, order the exceptional components and take the
shortest prefix whose total alpha reaches 14.  The first-crossing certificate
makes that prefix full; then continue by the two preservation rules.

## 2. Exact full-factor cones

Put `rho_j=q_(j+1)/q_j` and `delta_j=rho_j-rho_(j+1)`.  Homogenize the
constant one as `h`.  The lower forest inequalities and the factor's `Q8`
condition give

```text
delta0 >= 2h,
delta1 >= 0,
delta1+delta2 >= 2h,
delta3,...,delta7 >= h.
```

The two exhaustive parametrizations are:

```text
high:
  delta0=2h+d0,
  delta1=h+d1,
  delta2=h+d2, ..., delta7=h+d7;

low:
  delta0=2h+d0,
  delta1=r,
  delta2=2h-r+d2,
  delta3=h+d3, ..., delta7=h+d7,
  0<=r<h.
```

Consequently the full/full obligation has exactly three symmetric cases:

```text
high/high, low/high, low/low.
```

For two factors, factorial scaling gives the exact product law

```text
q_k(AB)=sum_(j=0)^k binom(k,j)q_j(A)q_(k-j)(B).
```

This is the rank-eight extension of the existing rank-seven cone
parametrization.  The completed rank-seven cones themselves do not prove
any of these three new rank-eight cases.

## 3. Reusable exact artifacts

The rank-seven conditional lift and its SQLite first-crossing replay provide
the correct assembly and low-memory database template:

```text
rank7_forest_lift_conditional_exact_20260816.json
5DD81CC8BF4A334ED9D6D7B88DBE271DB0A0F9FEA4FEB9F9126DCC06875E563E

verify_rank7_forest_lift.py
90FF77DEA1992259A0F9B3D68F112949A0229918644E6BEA1D693F1D889809B5
```

Two rank-eight artifacts also substantially reduce the finite component
classification:

```text
rank8_q8_forest_polynomials_through_n20_exact_20260816.json
B5AF2DAF154DE687FDA92C966AFB533A13C0056EEAB7A134A237761E9681AF9D

rank8_pgc_matching_quotient_boundary_exact_20260817.json
E61C51E0D37569C617DBE23AC3E88BA1A89DD188B3FC629264303714D1679A85
```

The order-20 census records every negative `Q8` forest row with alpha at
least nine.  The matching boundary proves `q_negative=0` in every alpha-13
cell through maximum order 26.

## 4. Six missing core cells

After those reusable artifacts, the only possible alpha-11/12 connected
cells beyond order 20 are

```text
(21,11), (22,11),
(21,12), (22,12), (23,12), (24,12).
```

The new matching-quotient verifier covers them without a WROM order scan.
It contracts a maximum matching, enumerates all independent singleton
blocks and endpoint attachments, rejects augmenting paths, recomputes alpha,
and evaluates core `Q8` exactly.  With automorphic multiplicity it checked

```text
endpoint attachments                  53,680,160
matching-valid expanded cores         34,255,272
negative Q8 rows                               0
minimum Q8                            42,145,389.
```

Thus no order-21–24 exceptional jets were added.

## 5. Complete finite exceptional-jet classification

Bipartiteness gives `|T|<=2alpha(T)`.  Therefore:

* alpha at most seven ends by order 14;
* alpha eight ends by order 16;
* alpha nine and ten end by order 20;
* alpha eleven and twelve end by order 24; and
* alpha thirteen ends by order 26.

Streaming the small connected trees through order 16, then using the exact
order-20 forest census, the new six-cell quotient result, and the alpha-13
boundary, gives the complete component database through rank nine:

```text
alpha                 1   2   3   4   5    6    7    8   9
distinct jets         2   2   5  15  48  175  700  253  15
```

There are `1,215` distinct exceptional jets from `1,455` tree occurrences.
Exactly `268` distinct jets have negative `Q8`: `253` at alpha eight and
`15` at alpha nine.  The other `947` have alpha at most seven.  No
exceptional component has alpha above nine.

The classification is the exact finite structural input to a lift
conditional on connected `Q8` at alpha at least 14.  It is not an
independent proof of that connected theorem.

## 6. First bounded fixed/full cone certificate

The first two database rows are the complete alpha-one exceptional band.
For each row, exact factorial convolution was formed against both abstract
full cones and the complete rank-eight margin was expanded.  Every
coefficient is positive:

```text
cone     jets      terms   negative   minimum   peak private GiB
high        2   1,772,700         0         1              0.145
low         2   2,586,704         0         1              0.181
```

Hence adjoining either alpha-one exceptional connected-tree jet to any
abstract full factor preserves `Q8`.  This is a complete categorical
subcertificate, but `1,213` exceptional jets remain in each fixed/full cone.

## 7. Exact first-crossing obligation

Before total alpha first reaches 14, a partial exceptional product has alpha
at most 13.  The largest exceptional component has alpha nine, so the exact
crossing envelope is

```text
14 <= alpha(crossing product) <= 22.
```

The certificate must retain distinct product jets through `i9`; this
truncation is exact because product `Q8` uses no higher factor coefficient.
The rank-seven disk-backed, sorted-type, unbounded-multiset dynamic program
is reusable after changing the threshold to 14, the retained rank to nine,
and the exceptional database to these 1,215 rows.  Overshoots through 22
must not be omitted.

## 8. Rejected coarse high/high design

A coarse six-variable slice of the full high/high cone checked its first
`12,813,915` coefficients with no negatives, but its construction peaked at
`7.553 GiB`.  It is rejected because it violates the lane's `1 GiB` cap.
This is only a resource obstruction: it is not a cone theorem, a negative
coefficient, or a forest counterexample.  The checkpoint is retained so the
partial calculation cannot be mistaken for a certificate.

## 9. Remaining exact dependencies

After this work, the forest lane still needs exactly:

1. connected `Q8` for alpha at least 14;
2. the lower all-forest gaps through rank seven;
3. all three full/full rank-eight cones;
4. fixed-exceptional/high and fixed-exceptional/low for the remaining 1,213
   jets; and
5. the exceptional-only first-crossing dynamic program through alpha 22.

No connected theorem, full forest theorem, or rank-eight PGC conclusion is
claimed here.

## 10. Replay and hashes

Run

```powershell
python .\audit_rank8_forest_lift_lane.py
```

Expected marker:

```text
PASS_EXACT_RANK8_FOREST_LIFT_REDUCTION_AND_ALPHA1_FIXED_CONES
```

Principal SHA-256 values:

```text
verify_rank8_exceptional_core_q8_matching_quotient.rs
0F12A6EFBAAEC586971C3D0A1CE21C46384DAE1F17FD0334A4B158ED57DF4F76

rank8_exceptional_core_q8_matching_quotient_exact_20260820.json
31D3B6F0940280414D13FD3215E3C9BA2C0F0335CA7763D3D99D0FFE7331AB08

extract_rank8_exceptional_tree_jets.py
76B43490D2ECA565441A9A3C647ECA2C476F10ABD1A5300B8ED47B98437FE5B8

rank8_exceptional_tree_jets_exact_20260820.tsv
B4558C561CE1C13C74C4AFB2DA25CD0E0265AB7AD6C9AC1C283EC54133D1F17A

rank8_exceptional_tree_jets_exact_20260820.json
BFE580BFED487B75D8C4A188AA56770D06EED3C6F4C351F4E093998F3CF0B0C4

verify_rank8_exceptional_fixed_full.py
6777296E01B957F426284B6F2C488ED8005030F1C8C14837DE028B35D1AF48BE

rank8_exceptional_fixed_high_exact_20260820_range_1_2.json
0B64998AD85B5588D0CCFC04BB30B13DF5F5EB60599E74B462FAE95279CB0B61

rank8_exceptional_fixed_low_exact_20260820_range_1_2.json
9D7F0F76C12150019EA70291F1E493586DCEAD018253E0DF72173DA558B21240

audit_rank8_forest_lift_lane.py
5DF486E586EDC302812529602BEE8579D06AE6448F0C347EEAEE39D8BD7532D9

rank8_forest_lift_lane_independent_audit_exact_20260820.json
6DC960E80727BF64941C9F0C02AC37E459F5444DB986DD780B8A22829F371FA0

rank8_high_high_convolution_sliced_checkpoint_20260820.json
AD63D7893EED7354A9B74C444D375D7996F25D6F4A95FF7EEDC3AE67526E91D6
```
