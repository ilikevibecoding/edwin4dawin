# Rooted rank-seven cross theorem for `B2=2` and `B2=3`

## Theorem

Let `T` be a tree of order `23 <= n <= 38`, rooted at any vertex `p`, and put

```text
B2(T)=sum_v C(deg(v)-1,2),
d=i5(T), e=i6(T), f=i7(T), h=i5(T-p), k=i6(T-p).
```

If `B2(T)` is 2 or 3, then

```text
C7(T,p)=d(e^2-df)-2e(eh-dk) > 0.
```

This exact structural theorem combines with the earlier path and three-arm
spider check (`B2=0,1`) to close every tree with `B2<=3` throughout the
residual order band.  It does not claim anything about `B2>=4`.

## Exhaustive suppressed-skeleton classification

Suppress every degree-two vertex of a nonpath tree.  Subdivision does not
change `B2`, and every original tree is recovered uniquely by assigning a
positive integer length to every edge of the resulting skeleton, modulo the
skeleton's automorphisms.

Since a degree-three vertex contributes 1 to `B2`, a degree-four vertex
contributes 3, and higher degrees contribute at least 6, the exhaustive
possibilities are:

- `B2=2`: two degree-three vertices joined by an edge, with two leaf edges at
  each branch vertex;
- `B2=3`, first type: one degree-four vertex with four leaf edges;
- `B2=3`, second type: three degree-three vertices whose branch vertices form
  a path, with two leaves at each endpoint and one leaf at the middle.

The Rust verifier enumerates every positive edge-length composition of
`n-1`.  Sorted equal-role arms and a lexicographic reversal condition quotient
exactly by each skeleton's automorphism group.  It reconstructs the subdivided
tree, independently asserts its order and `B2`, and checks every vertex as a
root using exact signed 128-bit independence-polynomial arithmetic.

## Exact census

| order | trees | rooted checks | minimum `C7` |
|---:|---:|---:|---:|
| 23 | 10,180 | 234,140 | 679,432,265,658 |
| 24 | 13,648 | 327,552 | 1,931,637,600,058 |
| 25 | 18,040 | 451,000 | 5,161,556,056,771 |
| 26 | 23,581 | 613,106 | 13,054,289,501,232 |
| 27 | 30,461 | 822,447 | 31,434,528,239,092 |
| 28 | 38,972 | 1,091,216 | 72,429,608,239,256 |
| 29 | 49,365 | 1,431,585 | 160,375,629,820,998 |
| 30 | 62,009 | 1,860,270 | 342,509,019,866,204 |
| 31 | 77,227 | 2,394,037 | 707,785,799,060,204 |
| 32 | 95,481 | 3,055,392 | 1,419,173,258,710,068 |
| 33 | 117,177 | 3,866,841 | 2,767,783,245,055,177 |
| 34 | 142,882 | 4,857,988 | 5,261,702,948,509,912 |
| 35 | 173,101 | 6,058,535 | 9,768,926,003,190,894 |
| 36 | 208,521 | 7,506,756 | 17,743,195,949,256,430 |
| 37 | 249,759 | 9,241,083 | 31,574,909,049,097,580 |
| 38 | 297,639 | 11,310,282 | 55,127,878,489,137,828 |
| **total** | **1,608,043** | **55,122,230** | -- |

There are zero failures.  The global minimum is attained at order 23 by the
degree-four star skeleton with edge lengths `(1,1,1,19)`, rooted at a leaf on
a unit arm:

```text
C7 = 679,432,265,658.
```

The JSON report records separate `B2=2` and `B2=3` counts, the split between
the two `B2=3` skeletons, and exact polynomial/deletion witnesses at every
order.

## Updated residual

Together with the `B2=0,1` certificate, the 85 order/root-degree cells from
the earlier curvature cut remain the correct outer cell list, but every
uncovered interval now starts at `B2=4` rather than `B2=2`.  Thus 170 integer
`(order,root-degree,B2)` levels have been removed from that outer description.
The remaining cells are not silently assumed realizable, and no universal
rooted-`C7` claim is made.

## Replay and hashes

Run:

```powershell
python replay_rank7_rooted_cross_b2_2_3.py
```

SHA-256:

```text
verify_rank7_rooted_cross_b2_2_3.rs
7E85A370AAB43C2411138F682D415152D9AA113A337EEF785B9ACDD153416896

replay_rank7_rooted_cross_b2_2_3.py
804D90BBD267EED561CEE19170CE89CD614AFAD755D58695BC6A15C25C05059D

rank7_rooted_cross_b2_2_3_exact_20260816.json
E8620BCEC42815ED305459A65CF8B4E6559D4332B2539F662B875C2898283946
```
