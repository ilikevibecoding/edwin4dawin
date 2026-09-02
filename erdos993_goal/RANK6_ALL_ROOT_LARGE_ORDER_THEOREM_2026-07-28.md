# Rank-6 rooted reserve from order 30

Date: 2026-07-28

Status: **proved theorem**. This improves the earlier broad
grouped-moment threshold \(32\) to \(30\). It does not yet settle the
finite band \(18\le n\le29\), so it is not yet the rank-6 coefficient
theorem.

## Theorem 1: a second sharp path ratio

For every tree \(T\) of order \(n\ge15\),

\[
\boxed{
\frac{i_4(T)}{i_3(T)}
\ge \frac{(n-5)(n-6)}{4(n-2)}.
}
\tag{1}
\]

Equality holds exactly for the path.

Put \(x_v=d(v)-1\),

\[
B_j=\sum_v\binom{x_v}{j},\qquad
E=\sum_{uv\in E(T)}x_ux_v,\qquad X=E-(n-3).
\]

The motif formulas give

\[
i_3(T)=i_3(P_n)+B_2
\]

and

\[
i_4(T)=i_4(P_n)+(n-5)B_2-B_3-X.
\]

The Zagreb inequality already certified in the rank-\((4,5)\)
path-ratio proof is

\[
7X\le2(n-4)B_2-6B_3.
\]

Since \(B_3\le(n-4)B_2/3\),

\[
B_3+X\le\frac{n-4}{3}B_2.
\]

After clearing the path ratio in (1), the remaining margin is at
least

\[
\frac{5n^2-27n-2}{3}\,B_2.
\]

This is positive for \(n\ge15\) whenever \(B_2>0\); and \(B_2=0\)
means the tree is a path.

## Theorem 2: arbitrary rooted trees

Let \(T\) be any tree of order \(n\ge30\), rooted at any vertex \(p\).
Write

\[
d=i_4(T),\quad e=i_5(T),\qquad
h=i_4(T-p),\quad k=i_5(T-p).
\]

Then

\[
\boxed{
S_6(T,p):=d(2e+d)-24(eh-dk)>0.
}
\tag{2}
\]

Consequently,

\[
\boxed{
C_6(T,p):=
d(e^2-di_6(T))-2e(eh-dk)>0.
}
\tag{3}
\]

To prove (2), put \(F=T-N[p]\), \(a=i_3(F)\), \(b=i_4(F)\), and
\(x=e/d\). The rooted deletion term is exactly

\[
eh-dk=db-ea.
\]

Set \(y=b/a\) when \(a>0\). Extension counting gives

\[
y\le L:=\frac{n-5}{4}.
\]

Moreover, the independent \(4\)-sets in \(F\) and the sets obtained
by adjoining \(p\) to independent \(3\)-sets in \(F\) are disjoint,
so

\[
d\ge a+b.
\]

If \(y\le x\), then \(db-ea\le0\). If \(y>x\), the preceding
inequalities give

\[
\frac{db-ea}{d^2}\le\frac{L-x}{1+L}.
\]

The sharp rank-\((4,5)\) path-ratio theorem gives

\[
x\ge\frac{(n-7)(n-8)}{5(n-3)}.
\]

Substitution yields

\[
\frac{S_6(T,p)}{d^2}
\ge
\frac{2n^3-51n^2-358n+3479}
{5(n-3)(n-1)}.
\]

The numerator is \(839\) at \(n=30\), has positive derivative
there, and has increasing derivative thereafter. This proves (2).

The proved rank-5 theorem gives

\[
e^2-di_6(T)\ge \frac{e(2e+d)}{12},
\]

which converts (2) directly into (3).

## Theorem 3: sibling-leaf closure

Let \(A\) be a tree of order at least \(17\), rooted at \(r\). Attach
a new vertex \(q\) to \(r\), distinguish \(q\) as the root, and then
attach any number of additional leaf siblings at \(q\).

Each additional sibling strictly increases \(S_6\).

The key deletion-ratio estimate is

\[
\frac{i_4(A-r)/i_4(A)}
{i_3(A-r)/i_3(A)}
\le
\frac{(m-4)(m-2)}{(m-5)(m-6)}
\le\frac32
\qquad(m=|A|\ge17).
\]

The first inequality combines extension counting in \(A-r\) with
the sharp path ratio (1). The second reduces to

\[
m^2-21m+74\ge0.
\]

Writing \(H\) for the root-deleted forest and \(F\) for the
closed-neighborhood-deleted forest, normalize

\[
X=\frac{i_3(H)}{i_4(H)},\quad
D=1-\frac{i_3(H)i_5(H)}{i_4(H)^2},\quad
r=\frac{i_3(F)}{i_3(H)},\quad
q=\frac{i_4(F)}{i_4(H)}.
\]

The exact increment divided by \(i_4(H)^2\) is

\[
(X+2)^2-2D+2rX^2+26rX-22qX.
\]

Here \(0<X\le1\), \(D\le1559/3575\), and
\(q\le\min(1,3r/2)\). Both \(r\)-cells attain their lower endpoint at
\(r=2/3,q=1\). Completing the square gives the strict bound

\[
\frac73\left(X-\frac17\right)^2
+\frac{231247}{75075}>0.
\]

The ratio condition persists after every sibling is added because
the proved rank-3 forest reserve implies ordinary log-concavity
\(i_3(H)^2\ge i_2(H)i_4(H)\).

## Replay

```powershell
python .\verify_rank6_root_large_order_and_leaf_closure.py
```
