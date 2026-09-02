# Endpoint rays close through forest layer fifteen

Date: 2026-08-13

## Theorem

Retain the endpoint rays `E,F,G` of Section 105.  For every integer

```text
12 <= s <= 15,        N=2s+5+q,        q,c,u>=0,
```

both endpoint pencils

```text
E+cF,                 F+cG
```

have only nonpositive real roots.  Combined with the existing layers
`2<=s<=11`, this closes the endpoint square through `s=15`, for every forest
excess and every nonnegative `c,u`.

## Tridiagonal discriminant certificate

For each fixed layer, remove no roots other than the already recorded forced
zero of `G` and compute the discriminants exactly in `QQ[c,q,u]`.  Every
coefficient of `Disc_t(E+cF)` is positive.

For `Disc_t(F+cG)`, every negative coefficient lies in a consecutive string
of odd powers of `c`.  Write the negative part of the `c^(2j+1)` block as
`-N_j(q,u)` and the adjacent full even blocks as `A_j(q,u)c^(2j)`.  All
`A_j,N_j` are coefficientwise nonnegative.  With

```text
x=(c^a,c^(a+1),...,c^b)^T
```

the selected tail is a coefficientwise-positive residual plus `x^TQx`,
where `Q` has diagonal `A_j` and off-diagonal `-N_j/2`.  Its leading
principal determinants obey the exact all-order continuant recurrence

```text
K_(-1)=1,
K_0=A_0,
K_j=A_j K_(j-1)-(N_(j-1)^2/4)K_(j-2).              (1)
```

The exact replay finds the following coefficientwise-positive certificates:

| `s` | negative odd `c` blocks | positive terms in successive `K_j` |
|---:|:---|:---|
| 12 | `7,9` | `891,3381,7471` |
| 13 | `5,7,9` | `1001,3801,8401,14801` |
| 14 | `9,11` | recorded by the replay |
| 15 | `7,9,11` | `1651,6325,14023,24745` |

Thus `Q(q,u)` is positive definite when `q,u>0`, and the discriminant is
strictly positive for `c,q,u>0`.  Section 75 supplies the rooted endpoint
rays `E` and `G`.  The positive discriminant and fixed positive leading
coefficient prevent a collision or degree loss along the two `c` homotopies;
positive polynomial coefficients force every nonzero real root to be
negative.  Boundary parameters follow by coefficientwise limits and closure
of real-rootedness.

## Exact replay and scope

Run

```text
python prove_endpoint_rays_forest_layers12_15_tridiagonal_sonc.py
```

It writes
`endpoint_rays_forest_layers12_15_tridiagonal_sonc_exact_20260813.json`.
The FLINT resultants and every continuant coefficient are exact rationals.

Equation (1) is uniform in the number of negative blocks, but its required
coefficientwise sign has only been established here for the four displayed
layers.  The computation is therefore an exact all-parameter theorem through
`s=15`, not an all-`s` theorem.  A genuine all-order closure still requires
an induction or structural subdiscriminant identity proving that the even
blocks and every continuant in (1) are coefficientwise nonnegative for
arbitrary `s`.  No counterexample to this tridiagonal certificate was found
through `s=15`.
