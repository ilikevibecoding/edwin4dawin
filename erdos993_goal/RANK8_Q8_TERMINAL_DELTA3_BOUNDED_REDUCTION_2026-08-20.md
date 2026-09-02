# Rank-eight terminal `Delta^3` bounded reduction

Date: 2026-08-20

Status: **exact identity audit and bounded reduction, with an exact enclosure
obstruction.  This is not an all-order `Delta^3` theorem and not a negative
tree example.**

## 1. Audited terminal identity

The replay independently reconstructs

```text
8*c7*h6*Q8(G_t)
 = R_t
 + 8*h6*p7(t)*Q8(A)
 + 9*c7*p7(t)*Q7(A-q).
```

It then extracts the third Newton coefficient of `R_t`.  After the exact tree
substitutions

```text
c0=1, c1=n, c2=C(n-1,2),
```

the `Delta^3` expression is independent of `n` and contains 26 monomials.

The existing exact finite report proves `Delta^1` through `Delta^4`
nonnegative at every root through order 22.  Its hash is

```text
rank8_terminal_delta04_finite_n1_n22_exact_20260820.json
4C8FD019F03D42208F56751BFB896021B1F4A02C699D5F26CE2636C80B59C4AB
```

## 2. Analytic reduction for `n>=23`

The root variable is exactly concave:

```text
d^2 Delta3 / dh7^2 = -252*c7*(c3+c4).
```

The coefficient is nonincreasing in `c8`:

```text
d Delta3 / dc8
 = -16*h6*(36*c3*c7 + 16*c3*c8 + 47*c4*c7
            + 16*c4*c8 + 11*c5*c7).
```

Consequently the now-unconditional rank-seven theorem supplies the correctly
directed endpoint

```text
c8 = c7*(14*c7-c6)/(16*c6).
```

The guard is exact: `n>=23` implies
`alpha(A)>=ceil(n/2)>=12`.  The pinned rank-seven theorem is

```text
RANK7_PGC_ALL_ORDER_THEOREM_2026-08-20.md
2C408B88932157B7F1BFDF0F548335D218F7683517D2F67B4B0DC2CFF1A677B6
```

After this substitution, the curvature across the rank-six defect interval
is `-S*B/c6`.  The bracket `B` has only one negative summand,
`-384*c6^3`.  With

```text
mu = 6*c6/c5,
c7/c6 >= (2*mu-7)/14,
mu >= n-15+10/n,
```

one already has

```text
924*c5*c6*c7 - 384*c6^3
 >= c6^3*(408-2772/mu) >= 0.
```

After multiplying the last numerator by `n` and shifting `n=m+23`, its
coefficients are `(408,9876,15396)`, all positive.  Thus the rank-six defect
parameter collapses exactly to `k in {1,7}`.

The lower-zero root path and the upper full-root path are also concave.  Two
other paths must remain live: on the exact `P23` coefficient jet their second
derivatives are respectively

```text
lower-cross:    2585584976250591744
upper-capacity: 3122298789015838432.
```

Both are positive.  Endpoint collapse on either path would therefore be
invalid.

The surviving analytic problem has eight bounded families:

```text
k in {1,7} crossed with
  lower junction,
  lower-cross with live Z,
  upper-capacity with live Z,
  full-root endpoint.
```

The interior `D5` link remains coupled throughout.

## 3. Exact scalar-cone obstruction

The retained scalar cone contains the exact point

```text
n=28, k=1, lower junction,
w=27/200, x=36/173, U=0, V=1.
```

It saturates `Q7=0`, the complementary root-capacity face, the `k=1`
rank-six endpoint, and the upper `w` and `x` cone faces.  Nevertheless,

```text
Delta3 = -1118972025533307721126883687375737
         / 9965987300490525339840000
       ~= -112279094.0620837.
```

At the same normalized jet,

```text
Delta4 = 10818096728353113350665424291909
         / 92277660189727086480000 > 0,

Delta5 = 100639487630983123581534058931113499
         / 539824312109903455908000000 > 0.
```

This is an enclosure failure only.  It proves that the scalar cone plus the
unconditional `Q7` endpoint cannot certify `Delta^3`; it does not exhibit a
tree with negative `Delta^3`.

## 4. Exact tree coupling excludes the recorded fake point

For a tree let

```text
e = sum_v C(deg(v)-1,2),
T3 = sum_v C(deg(v),3)
     + sum_{uv in E}(deg(u)-1)(deg(v)-1),
tau = T3-(n-3).
```

Direct edge inclusion-exclusion gives the coupled identities

```text
i3 = C(n-2,3)+e,
i4 = C(n-3,4)+(n-4)e-tau.
```

Undoing the fake point's normalization gives

```text
i2=351, i3=2600, i4=112450/9.
```

The first identity forces `e=0`.  Hence every vertex has degree at most two,
so a connected tree must be `P28`.  But `P28` has

```text
i4=C(25,4)=12650,
x=i3/i4=52/253,
```

not `x=36/173`.  Equivalently, the second identity would assign the fake
point the impossible nonintegral motif count `tau=1400/9`.

The terminal identity gives an even stronger rooted check because
`h_j=i_j(A-q)`.  Once the core is forced to be `P28`, deleting a root leaves
`P_l` disjoint union `P_(27-l)`.  The closed formula

```text
i_r(P_s)=C(s-r+1,r)
```

checks all 28 root placements directly.  Their minima are

```text
min i6(A-q)=74613,
min i7(A-q)=116280.
```

The fake point instead has unnormalized values

```text
H6=37910808260/964467 < 74613,
H7=0.
```

Thus every literal rooted placement is separated from the fake root jet; the
exclusion is not merely a nonintegrality observation about `i4`.

There is also an exact endpoint gap at order 28.  Any nonpath tree has
`e>=1`, so

```text
w <= 351/2601 = 39/289,
```

whereas the path endpoint is `27/200`; the excluded strip has width
`3/57800`.

This removes the recorded fake point and identifies the needed refinement:
a quantitative joint bound on the degree surplus `e`, the connected
three-edge motif surplus `tau`, and the rooted deletion coefficients.  The
surrounding eight families remain open.

## 5. Replay and hashes

Run

```powershell
python .\verify_rank8_q8_terminal_delta3_reduction.py
python .\verify_rank8_delta3_n28_fake_junction_tree_coupling.py
```

Current hashes:

```text
verify_rank8_q8_terminal_reduction.py
389216D19951A28784C46E57393F1F9CD5BBE41625DCD317C664F701EC2EC4B7

probe_rank8_delta3_source_curvatures.py
1AAA5FA9EC12DAEF27791DCCADC80F91C2D93B649CF2898C01FABF356775F122

verify_rank8_q8_terminal_delta3_reduction.py
E69B4E8E4D19D1C5AFCC966EE81476583CBA7C9DC86F5E1489FE09169F5AC0A0

rank8_q8_terminal_delta3_bounded_reduction_exact_20260820.json
EBEF5AF8A1AF594C6C701C5A340F1F56595616F7A5EF0A53197CBE6D0DA9CC26

verify_rank8_delta3_n28_fake_junction_tree_coupling.py
26A6AB8610EDFB00C11F87996BFD5DA95092DAA09622AD867FC58AA7C0DA15FE

rank8_delta3_n28_fake_junction_tree_coupling_exact_20260820.json
A7167DF73845D3D7B05A9610D79A46EBDAF049E6E09EE06219021D2DE6DAB93F
```
