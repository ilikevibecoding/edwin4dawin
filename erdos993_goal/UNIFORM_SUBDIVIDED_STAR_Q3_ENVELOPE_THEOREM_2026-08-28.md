# Uniform subdivided-star all-rank q3 envelope

Date: 2026-08-28

## Theorem

Let `S_d` be obtained from `K_(1,d)` by subdividing every edge once, with
`d>=2`.  For every supported rank,

```text
q_r(S_d) <= q_3(S_d) <= q_2(S_d).
```

This is the same family on which adjacent-rank monotonicity fails first at
`d=18`, ranks 15 to 16.  Thus the new rank-three envelope survives the exact
obstruction that killed the monotonicity shortcut.

## Exact proof

The zero-edge and one-edge generating functions are

```text
A_d=(1+2x)^d+x(1+x)^d,
B_d=d x^2((1+2x)^(d-1)+(1+x)^(d-1)).
```

For `2<=r<=d`, coefficient extraction gives

```text
q_r=(2^(r-1)+1)(d-r+1)/(2^r(d-r+1)+r).          (1)
```

In particular,

```text
q_2=3(d-1)/(4d-2),
q_3=5(d-2)/(8d-13).
```

The cross numerator for `q_2-q_3` is

```text
4d^2-13d+19,
```

whose discriminant is `-135`; it is strictly positive.

For `3<=r<=d`, put `t=d-r+1>=1`.  The cross numerator for `q_3-q_r` is

```text
(2^r-8)t^2
 +(2^(r-1)(2r-9)-3r+21)t
 +5r(r-3).                                      (2)
```

At `r=3`, (2) is zero.  At `r=4`, it is `8t^2+t+20`.  For every `r>=5`,
all three coefficients are strictly positive.  Finally `q_(d+1)=0`, so this
covers the entire support.

## Replay

Run

```powershell
python .\verify_uniform_subdivided_star_q3_envelope_root.py
```

The required marker is

```text
PASS_EXACT_ALL_RANK_UNIFORM_SUBDIVIDED_STAR_Q3_ENVELOPE_THEOREM
```

## Scope

This closes the rank-three envelope at every rank for the principal
subdivided-star obstruction family.  It does not prove that envelope for
arbitrary trees or resolve Erdős Problem #993.
