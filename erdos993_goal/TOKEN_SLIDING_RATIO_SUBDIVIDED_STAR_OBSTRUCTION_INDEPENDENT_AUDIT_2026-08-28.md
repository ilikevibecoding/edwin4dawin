# Independent audit of the subdivided-star token-sliding ratio obstruction

Date: 2026-08-28

Status: **exact counterexample to adjacent-rank token-sliding ratio
monotonicity, minimal inside the uniform subdivided-star family**.

This note independently reconstructs the result without importing or executing
the producer.

## 1. Family and closed forms

Let `S_d` be obtained by subdividing every edge of `K_(1,d)` once. It has a
center `c`, arm roots `a_1,...,a_d`, pendant leaves `l_1,...,l_d`, and order
`2d+1`.

If `c` is excluded, each arm contributes `1+2x`. If `c` is included, every
root is excluded and the leaves are free. Therefore

```text
A_d(x)=I(S_d;x)=(1+2x)^d+x(1+x)^d.
```

Let `B_d,k` count `k`-vertex subsets inducing exactly one edge. Such a set is
the union of the two configurations joined by one edge of the token-sliding
graph, so

```text
s_r=|E(TS_r(S_d))|=B_d,r+1.
```

For a center-root edge, deleting both closed neighborhoods leaves `d-1`
isolated leaves. For a root-leaf edge, it leaves `d-1` disjoint edges. There
are `d` edges of each type, giving

```text
B_d(x)=d x^2[(1+x)^(d-1)+(1+2x)^(d-1)].
```

Consequently

```text
i_r=2^r C(d,r)+C(d,r-1),
s_r=d(1+2^(r-1))C(d-1,r-1),
q_r=s_r/(r i_r)
   =(2^(r-1)+1)/(2^r+r/(d-r+1)).
```

An independent rooted-tree dynamic program counting zero- and one-induced-edge
subsets matches these forms for `1<=d<=40`. Literal subset enumeration also
matches the dynamic program for `1<=d<=6`.

## 2. Exact adjacent cross factor

Put

```text
t=d-r+1.
```

Direct denominator clearing gives

```text
P_(d,r)
=2^(r-1)[2t^2-(r+1)t+2r]+t+r,

C_(d,r)
=s_r (r+1)i_(r+1)-s_(r+1) r i_r
=(r/t) C(d,r)^2 P_(d,r).
```

Every factor outside `P_(d,r)` is positive, so `P` is the exact sign
certificate. These are non-oriented token-sliding edge counts; using oriented
slides would multiply every cross by two.

## 3. Minimum family member

After substituting `r=d-t+1`, the bracket multiplying `2^(r-1)` is

```text
F_d(t)=3t^2-(d+4)t+2d+2.
```

For `d<=17` and every integer `t>=2`,

```text
F_d(t)=3(t-3)(t-4)+(17-d)(t-2)>=0.
```

Thus `P_(d,r)>0` throughout every `S_d` with `d<=17`. At `d=18`, exactly

```text
(r,t)=(15,4),(16,3)
```

give

```text
P_(18,r)=-32749.
```

Hence `S_18`, of order 37, is the first counterexample in this family.

The exact failures are

```text
r=15 -> 16:
q15=65540/131087,
q16=98307/196624,
q15-q16=-32749/25774850288,
C_(18,15)=-81772943040.

r=16 -> 17:
q16=98307/196624,
q17=131074/262161,
q16-q17=-32749/51547144464,
C_(18,16)=-4088647152.
```

## 4. Scope shield

This kills only the proposed adjacent-rank monotonicity of `q_r`.

For `S_18`,

```text
W=C(35,2)=595,
m2=459.
```

The actual averaged margins

```text
r m2 i_r-W s_r
```

at ranks 15, 16, and 17 are respectively

```text
64788256980,
25914324816,
6478458957,
```

all strictly positive. Moreover `q_r<=q_2=51/70` at every supported rank.
Thus this is not a counterexample to the weaker initial-level domination, the
actual averaged component-surplus candidate, forest independence unimodality,
or Erdős Problem 993.
