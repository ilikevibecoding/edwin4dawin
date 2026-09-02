# Inductive low-block q-gap floor for one-centre spiders

Date: 2026-08-29

In the exact spider split `F=H+xK`, both `H` and `K` are strictly smaller
forests than the source tree.  Thus the strong induction input is available
separately on both blocks, with no same-order circularity:

```text
q_j(H)<=q3(H),
q_(j-1)(K)<=q3(K)<=q2(K).                          (1)
```

For `H`, the order, component count, and number of paths of length at least
two are `(R+T,R,Y)`.  Its rank-three denominator is fixed, while its
one-edge numerator decreases by exactly three for every extra path of length
at least three.  Hence the maximum `q3(H)` occurs with zero such paths when
`T=Y`, and one otherwise.

For `K`, the order and component count are `(T,Y)`.  Its exact `q2` increases
with the number of paths of length at least two, whose maximum is
`min(Y,T-Y)`.  Taking the minimum of these low-block caps and the frozen
empty-component caps in each block gives a stronger all-order H/K mass
floor.

At the N=315,R=11,Y=5,j=11 relaxation failure, the earlier floor was
`564445988534158692320712233/118412582233` and the low-block floor is
`1611655931654083777591842194635355/5675235250707891`.  The bounded replay checked
1355 spiders and
5532 supported ranks.

This theorem proves the inductive low-block reserve floor only.  Its
unbounded payment of the terminal m=0 certificate and all d>1 sectors remain
separate obligations.

Replay:

```powershell
python .\prove_d1_spider_inductive_lowblock_qgap_mass_floor_adversary.py
```

Required marker:

```text
PASS_EXACT_ALL_ORDER_D1_SPIDER_INDUCTIVE_LOWBLOCK_QGAP_MASS_FLOOR
```
