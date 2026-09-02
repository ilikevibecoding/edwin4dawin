# Nonuniform depth-two-star rank-three theorem

Date: 2026-08-28

## Theorem

Let `T` consist of a central vertex with `d` branches of depth at most two.
Branch `i` has one neighbour of the centre and `m_i>=0` leaves attached to
that neighbour.  Put

```text
i_r(T) = number of independent r-sets,
s_r(T) = number of (r+1)-sets inducing exactly one edge,
q_r(T) = s_r(T)/(r i_r(T)).
```

Then, universally,

```text
3 m_2(T) i_3(T) - i_2(T) s_3(T) >= 0.          (1)
```

Consequently, whenever `i_3(T)>0` (so both ratios are defined),

```text
q_3(T) <= q_2(T)=m_2(T)/i_2(T),
```

where `m_2(T)` is the number of two-edge matchings.

The multiplicities may be unequal and may include direct leaves (`m_i=0`).

## Exact reduction

Write

```text
M=sum_i m_i,   S2=sum_i m_i^2,   S3=sum_i m_i^3.
```

Direct coefficient extraction from

```text
I(T;x)=prod_i((1+x)^m_i+x)+x(1+x)^M
```

and

```text
J(T;x)/x^2
 =sum_i (1+x)^(M-m_i)
  +sum_i m_i prod_(j!=i)((1+x)^m_j+x)
```

gives exact formulas for `i_3`, `s_3`, `m_2`, and `i_2`.  Substitution into
four times the left side of (1) gives a symmetric polynomial `Q` of total
degree five in the arm multiplicities.

Separate the `t` zero multiplicities from the `s` positive multiplicities,
and write each positive one as `m_i=y_i+1`.  Thus `s>=1`, `t>=0`, and
`y_i>=0`.  In the monomial-symmetric basis,

```text
Q=sum_lambda c_lambda(s,t) m_lambda(y).
```

There are exactly 17 occurring partitions `lambda`.  With `u=s-1`, every
coefficient has an exact expansion

```text
c_lambda(s,t)=sum_(a,b) gamma_(lambda,a,b) binom(u,a) binom(t,b),
```

and every integer `gamma_(lambda,a,b)` is nonnegative.  Therefore every
`c_lambda` and every monomial-symmetric term is nonnegative on the full
integer domain, proving `Q>=0`.  If `s=0`, the tree is a star and `Q=0`
directly.

The replay records all 17 coefficient polynomials and every nonzero
binomial-basis coefficient.  It also independently counts literal subsets
for every sorted multiplicity vector of length at most four with entries at
most three.

## Replay

Run

```powershell
python .\verify_multitype_depth2_star_q3_q2_theorem_root.py
```

The required marker is

```text
PASS_EXACT_ALL_ORDER_MULTITYPE_DEPTH2_STAR_Q3_AT_MOST_Q2_THEOREM
```

## Scope

This is an all-order theorem for the complete nonuniform depth-two-star
family, not merely a scan.  It does not yet prove `q_r<=q_3` for `r>3`, the
token-surplus inequality for arbitrary trees, or Erdős Problem #993.
