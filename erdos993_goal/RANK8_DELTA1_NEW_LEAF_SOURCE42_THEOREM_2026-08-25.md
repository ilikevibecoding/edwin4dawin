# Rank-eight Delta1 inserted-leaf theorem for source order at least 42

Date: 2026-08-25

Status: **proved with independent exact reconstruction**. This is one
rank-eight leaf-gate theorem, not a proof of Erdős Problem 993.

## Theorem

Let `A` be a tree of order at least 42, let `v` be any vertex, and attach a
new leaf `w` at `v`. At the new root `w`, the Newton `Delta1` coefficient
of the rank-eight terminal residual is nonnegative.

Put

```text
D=A-v,                 F=A-N_A[v].
```

The sealed source-order-43 theorem handles `|D|>=42`. Thus only `|D|=41`
is new here.

## Endpoint reduction and analytic bounds

The raw `Delta1` gate is separately concave in the two top coefficients
`c8` and `d7`. The `Q7(C)` and `Q6(D)` bounds reduce its minimum to four
endpoint masks. The independently audited containment certificate proves
masks 0, 1, and 2 for every `|D|>=26`. It remains to prove mask 3 at
`|D|=41`.

Normalize

```text
d6=1,       x=d5/d6,       y=d4/d5,       u5=f5/d5.
```

The sharp forest rank-(4,5) ratio, the discrete two-extension lemma, and
extension counting give

```text
1/6 <= x <= 31977/141733,
5/37 <= y <= 95/561.
```

For completeness, choose an independent four-set `S` of `D` uniformly and
put `q=|D-N[S]|`. Then

```text
E q = mu4 := 5d5/d4,
E i2(D-N[S]) = 15d6/d4.
```

For integer `q>=2`, the linear interpolation of
`h(q)=C(q-1,2)` exceeds its quadratic continuation at `q+r` by exactly
`r(1-r)/2`. Jensen's inequality therefore gives

```text
mu5 := 6d6/d5 >= 2 Phi(mu4)/mu4
                     >= mu4-3+2/mu4.                 (0)
```

At `|D|=41`, the pinned forest theorem gives `mu4>=561/19`. The right
side of (0) is increasing there and equals `283466/10659`, proving the
stated upper bound on `x`. The bound-chain auditor recomputes the
interpolation reserve, derivative, and all rational constants exactly.

The proved forest `Q5(D)>=0` inequality is

```text
y <= 10x/(x+12).                                      (1)
```

With `M=|F|`, the compatible shadow bounds are

```text
6 f6 <= (M-5) f5,                                     (2)
4(d5-f5) <= 37(d4-f4).                                (3)
```

The tree/vertex decomposition has
`M=|F|=|E(D)|=41-deg_A(v)`.

## The branch `M<=25`

The edge-union bound

```text
i_k(D) >= C(41,k)-25 C(39,k-2)
```

gives the rank-4, rank-5, and rank-6 floors

```text
82745, 520923, 2440113.
```

Together with `f_k<=C(25,k)`, the normalized absolute caps are

```text
f4/d4 <= 2530/16549,
f5/d5 <= 17710/173641,
f6/d6 <= 177100/2440113.
```

Split normalized `x` at `0,1/2,1`; on each slab use (1) at its right
endpoint. Split `u5` at

```text
0, 228190130/2364469497, 17710/173641,
```

using (2) below the interior switch and the absolute rank-6 cap above it.
The absolute rank-4 cap is sharper throughout. These four rational boxes
have 4,200 tensor Bernstein coefficients, all strictly positive.

The same coarse independent-cap relaxation first fails at cutoff 26 with
five negative coefficients and two negative vertices. This is not a
compatible counterexample: its minimum tensor vertex has `u5=f5=0` but
`f4>0`, violating the exact `M=26` forest ratio
`f4<=(115/342)f5`. The split-diagnostic audit checks this rational
incompatibility and the independently replayed exact `M=26` certificate.

## The exact branches `26<=M<=40`

For exact order `M`, the sharp forest ratio gives

```text
t_M=(M-7)(M-8)/(M-3),             f4 <= (5/t_M) f5.   (4)
```

Partition normalized `x` at

```text
0, 1/8, 1/4, 1/2, 1.
```

At the right endpoint `x_b` of an `x` slab use the outer cap

```text
y <= min(95/561, 10 x_b/(x_b+12)).
```

Partition the resulting `y` interval at normalized positions

```text
0, 1/4, 1/2, 3/4, 7/8, 15/16, 31/32, 63/64, 1.
```

For lower endpoint `y_0`, split `u5` at

```text
s(M,y_0)=(y_0-4/37)/(5/t_M-4/37).
```

Use (4) on `[0,s]`, (3) on `[s,1]`, and (2) for `f6` throughout.
The independent bound audit checks all 480 switches and finds
`342/2887<=s<=40317/44557`.

There are 15 exact integer orders, four `x` slabs, eight `y` slabs, and
two `u5` regions: 960 rational boxes. Their 1,152,000 tensor Bernstein
coefficients are all strictly positive. Together with the small branch,
the `|D|=41` mask-3 certificate has 964 boxes and 1,156,200 strictly
positive coefficients.

Every shard auditor imports neither producer nor probe. It reconstructs the
endpoint numerator from the canonical symbolic transcript and recomputes
every rational Bernstein coefficient. The canonical numerator hash is

```text
5298C43C68E11DEA0072E4BF78AFB212FB32ACEC84C6FC25C492EEC4C050404E
```

and the cleared endpoint denominator is

```text
2744 d5^4(d6+f5)>0.
```

Thus mask 3 is positive at `|D|=41`. Masks 0--2 and separate concavity
complete the `|D|=41` gate. Combining it with the sealed `|D|>=42` gate
and using `|D|=|A|-1` proves the theorem.

## Order-band diagnostic

An exact structural enumeration over every integer `27<=|D|<=42` and every
compatible integer `9<=M<=|D|-1` checked 13,056 ratio/missing-shadow
switches. All lie in `(0,1)`, and the same four `x`-slab cap pattern
`Q5,Q5,Q5,path-ratio` persists throughout. This is useful evidence for
reusing the partition, but it is deliberately **not** promoted to a
continuous order-band theorem: such a theorem still needs an additional
order variable in the rational Bernstein certificate and must preserve the
triangular coupling `M<=|D|-1` and the changing small-`F` cutoff.

## Boundary

This theorem closes only the `Delta1` gate when the inserted leaf is the
root and `|A|>=42`. Source orders 27--41, the remaining `Delta2/3` work,
old-root increment gates, connected `Q8`, forest `Q8`, rank-eight PGC,
and Erdős Problem 993 remain outside this certificate.

## Exact evidence

```text
prove_rank8_delta1_new_leaf_mask3_order41_small_F25_delta1d41.py
  B4EF136A3250154737502130AE5E6FF26FB8C09CF7315901B0F619CE1E9B7B87
rank8_delta1_new_leaf_mask3_order41_small_F25_delta1d41_20260825.json
  839106E16721FF4E92A648801743D642E376757AB88AEA359B32C6383E441961
audit_rank8_delta1_new_leaf_mask3_order41_small_F25_delta1d41.py
  3EF10D889E4CB82340B09B7F1DFDB6269A8D1A7ACA6129823D00BB8C8DD61653
rank8_delta1_new_leaf_mask3_order41_small_F25_independent_audit_delta1d41_20260825.json
  5187287BDDD4F98FBCB2D7F9DD47F2F55C028C91122970F02B056CFC68F56CEB

prove_rank8_delta1_new_leaf_mask3_order41_exact_F_shard_delta1d41.py
  6F21EF8B9577F83C845DCBCDB0A0CA628C9639F16807457E27129319850E8872
audit_rank8_delta1_new_leaf_mask3_order41_exact_F_shard_delta1d41.py
  B1F57DBEE6BF2C11740BFFB726D62871E3785ADAF305C072DFC968CCBB4A1DCC

primary exact-F reports 26-27 / 28-29 / 30-31 / 32-33 / 34-35 / 36-37 / 38-39 / 40
  C663A580BC634A47768F8554A2777639A5B91EEA1454C6A1F97ECCAA968AE4F1
  FE56F1B2CF738D537E58246092D186280E751C0DDD85A9FAE5A5C1EBE816D3B9
  7B5B9438B9930C3DDAEEC53D16077E0DDDD7E09A745B3B3CE1C794E440475F26
  28F578CA810B1B4B5F2D9C49DB01F7C557E361D11B09A6B06072F0E8BA59D8D6
  B0235397809DFF28497C5CDCF8283A514116C0A108AE36C61F48E30D01AA3E5A
  0A68CB20BCB622B66CB815C82A12C120D698A86A4A742C0749C73F2C8D3A8AB7
  E440F7B5BEB2F5768E32C4E8BD3DC6C0B5D523DA0D159AFC9DE6F9C7D91B709B
  C78C61A2D5A24B3AA4B6DFEE1859B1AAFDFA7499EE1A302FB141A7FB6DE189EC
independent exact-F reports 26-27 / 28-29 / 30-31 / 32-33 / 34-35 / 36-37 / 38-39 / 40
  6EF16701DA6B949DF1434A17908AA764C820D8EF797CDC8CDB7798D4F7C0F5C4
  CC56FC084AA750F36BAFC3A5210ACBD8AD0932EEFB118FFA2CDBD1E62C974415
  547AEC9AFF8C297B3D54DD7875AC8B1F1C33036CAAEA3E9CBA8A9241E9685239
  8FAA2FF6E636F8EBA8CB03E1B987E988EBA5FD671A785F093257A1BA6ED26102
  A5A0C4430FCCC66C03617A970E061A8253DA512D053138A261FFA58D9D720BC6
  17710530BA6D7EAD3F909D071E55E250B2ACCA6812A928D42015CD78006E06FB
  B5DF0130F97F76D40D039FF7122C2A75839E66C829566A731F81559CCAD358F5
  70278E9E204CE23B218EA6EFA9371B00736C0060FAF34186D2BFD40C4DE35A82

audit_rank8_delta1_order41_bound_chain_delta1d41.py
  D8765DE3B711226D196E62EE4B2F3FBC41A8C3D3F690EF902F125BCE580F9F08
rank8_delta1_order41_bound_chain_independent_audit_delta1d41_20260825.json
  AD31ECFD2BA893FC5743CD4C8BEA7F68A3B0E32F99A4DC9C8A66A1F8F93BDCFC

audit_rank8_delta1_order41_split_diagnostic_delta1d41.py
  29D83BEA34C615B126E827DE1B4023CE1FEE36BDE3FB455D567FA7D919600428
rank8_delta1_order41_split_diagnostic_audit_delta1d41_20260825.json
  51967354296D826BA37B090AB19F25EDD6BC832F4388A1C93C2B993E78C65CBB

assemble_rank8_delta1_new_leaf_mask3_order41_delta1d41.py
  67F96798EDAB374DBCA89F20560B5E75FFCA3B5EBC93A31C517F2A787418553C
rank8_delta1_new_leaf_mask3_order41_delta1d41_20260825.json
  2712CB0DE3DC5236C4E4419F1765D0B5B6EA12658FF7E99DCC47EE5DE6D29360
audit_rank8_delta1_new_leaf_mask3_order41_assembly_delta1d41.py
  B5B459EB7EF69DDF27BC0358C8C79C15D6D1F00E44B9A74FD7A43E510109439B
rank8_delta1_new_leaf_mask3_order41_assembly_independent_audit_delta1d41_20260825.json
  37FE1052D251FDF74044287849974AFAF07785D30633C8B25A1752BB227A03C4

assemble_rank8_delta1_new_leaf_gate_source42_delta1d41.py
  F84132D6FD090CECC917D447320CDDC89640DB0C1AC3DAADE4ED071359C78E29
rank8_delta1_new_leaf_gate_source42_delta1d41_20260825.json
  044DFC4B935AB4961CCD5B846079F4C783A1E08704138349E1D3D78A76E59676
audit_rank8_delta1_new_leaf_gate_source42_delta1d41.py
  23F81A27613EFF509A2E4D001905DA846A4BBDC2EE75EE91EF66096397633FD4
rank8_delta1_new_leaf_gate_source42_independent_audit_delta1d41_20260825.json
  3F1459BDE8E33BB6824E651A2964F87876D5E8FEE8EA06AC67AE904A68AF37A4

analyze_rank8_delta1_Nband_structure_delta1d41.py
  3195798D7DA76F55E6E34A03D84CA91E6E69A8FC5DA27C0BEF5C4186E086FCA3
rank8_delta1_Nband_structure_diagnostic_delta1d41_20260825.json
  77EE8B3FA96F029F6F0306B464B1E5D6B34563F69CC009B90E09FC13129D8B1B
```

Pinned analytic dependencies:

```text
FOREST_V6_ALPHA10_THEOREM_2026-08-13.md
  D6F2B1017B3C222167209AC00158423C98607CAE1804415C24ED82F2DC8F91FF
prove_forest_v6_alpha10.py
  2B3620BEF00E761B857AAFBAA2BABB79A5419D0E0D26AB45C787CED2585DD947
forest_v6_alpha10_exact_20260813.json
  5F3954C8E3CC8817376CE89685CF283BAEE2FF55214A8E9FCFE816D50A8E9AA4
TREE_RANK45_PATH_RATIO_THEOREM_2026-07-28.md
  7FE34CDC7F02442ABB9665A0FDC093B78331C6B93CC0793F60B06259BB7B1528
verify_tree_rank45_path_ratio.py
  AB5D6E395A13BE66276D45C25EB2F869B2410B2445F78A45F4A83648CE1CA86C
RANK5_FOREST_THREE_HALVES_THEOREM_2026-07-27.md
  CA5323D8DF3110087228193C892F576F4814D4A813AE6FAB184887048377203D
verify_rank5_three_halves_forest_certificate.py
  56B52DFE4FFA9BBE7273EF8EAA24AA737615338815DF0D41A5792C6728F17DBE
verify_rank5_three_halves_convolution_cones.py
  06BD1AA9355B1C07DE5B9087AFEE0477D9C583E0ED943EA86FC332FB692A8194

assemble_rank8_delta1_new_leaf_gate_source43_delta1d42.py
  AC599E484CB115B51411EF18FB0CDABE009D37B815708F369D7B0FB29F4BA078
rank8_delta1_new_leaf_gate_source43_delta1d42_20260825.json
  C47388E65A7F05F92658507330AA8D584E4D31E54589B7C92BDA26DFC82533EA
audit_rank8_delta1_new_leaf_gate_source43_delta1d42.py
  CFF9DE8B5B9D16EEBC5EA10281DC6452A96FD7B382BE8B3531EA4FE640FF977B
rank8_delta1_new_leaf_gate_source43_independent_audit_delta1d42_20260825.json
  A0C2F4BEAE9F4A511E7FF1227E71A34B8AFC74A5867D9493BDC5517058EBF586
```
