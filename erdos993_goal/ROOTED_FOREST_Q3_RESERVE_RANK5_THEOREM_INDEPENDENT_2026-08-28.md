# Rooted-forest reserve theorem at rank j=5

Date: 2026-08-28

Status: **proved for every finite rooted forest.**

Let `F` be a forest with one distinguished root in each component, let
`H=F-roots`, and write

```text
f_k=i_k(F),  h_k=i_k(H),  K_2=2f_2-s_2(F).
```

Then

```text
(12h_2+3K_2)f_5 >= 6h_5f_2.                         (1)
```

First suppose no rooted component is isolated.  Put

```text
M=number of nonroots=number of edges,
c=number of components,  N=M+c.
```

Then `1<=c<=M` and the corrected exact lower bounds are

```text
f_2=C(N,2)-M,
h_2>=C(M-1,2)+c-1,
K_2>=N(c-1)+2(M-c).
```

Consequently, for `A_5=12h_2+3K_2`, exact simplification gives

```text
A_5-6f_2 >= 3(M-c)(M-2).                            (2)
```

If `h_5>0`, then `M>=5`, so (2) is nonnegative.  Since every independent
set in the induced subforest `H` is also independent in `F`, `f_5>=h_5`.
Therefore

```text
A_5f_5-6h_5f_2
 =(A_5-6f_2)f_5+6f_2(f_5-h_5)>=0.
```

If `h_5=0`, (1) is immediate.  Finally, the corrected independently pinned
isolated-root preservation reduction restores any number of isolated
distinguished-root components.

This proves only rank `j=5` of the rooted reserve.  It does not prove the
terminal two-block payment, the all-tree higher-rank envelope, or Erdos
Problem 993.
