/*
 * wromcheck.c -- exhaustive exact verification over all free trees on n vertices.
 *
 * Enumeration: Wright-Richmond-Odlyzko-McKay canonical level sequences (the same
 * algorithm as networkx.nonisomorphic_trees, ported to C).  The number of trees
 * for each n is asserted against A000055.
 *
 * For each tree the independence polynomial is computed exactly by the rooted
 * DP (A_v = prod (A_c + B_c), B_v = x prod A_c) in 64-bit unsigned integers
 * (coefficients are <= C(n, r) < 2^63 for n <= 60), and the following are
 * checked with unsigned __int128 products:
 *
 *   UNIMODAL, LC_r, ISO_r (all r, and prefix 2<=r<=L-1), NW_r, WR_r on the
 *   prefix, TAIL (p_r >= p_{r+1} for r >= L), with L = ceil((2 alpha - 1)/3).
 *
 * Output: one JSON object per n on stdout.  With --dump, every tree is printed
 * as  "levels;coefficients"  (for cross-validation against the Python suite).
 *
 * Build:  gcc -O3 -march=native -std=c11 -o wromcheck wromcheck.c
 * Usage:  ./wromcheck --nmin A --nmax B [--dump]
 */
#include <stdint.h>
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <time.h>

typedef unsigned __int128 u128;
typedef uint64_t u64;

#define MAXN 64

/* A000055: number of free trees on n vertices, n = 0..30 */
static const u64 A000055[] = {
    1ULL, 1ULL, 1ULL, 1ULL, 2ULL, 3ULL, 6ULL, 11ULL, 23ULL, 47ULL, 106ULL, 235ULL, 551ULL,
    1301ULL, 3159ULL, 7741ULL, 19320ULL, 48629ULL, 123867ULL, 317955ULL, 823065ULL,
    2144505ULL, 5623756ULL, 14828074ULL, 39299897ULL, 104636890ULL, 279793450ULL,
    751065460ULL, 2023443032ULL, 5469566585ULL, 14830871802ULL};

/* ------------------------------------------------------------------ WROM */

static int next_rooted_tree(int *pred, int n, int p) {
    /* one Beyer-Hedetniemi step; p < 0 means "compute p"; returns 0 when finished */
    if (p < 0) {
        p = n - 1;
        while (pred[p] == 1) p--;
    }
    if (p == 0) return 0;
    int q = p - 1;
    while (pred[q] != pred[p] - 1) q--;
    for (int i = p; i < n; i++) pred[i] = pred[i - p + q];
    return 1;
}

/* split: left = layout[1..m-1] - 1 ; rest = [0] + layout[m..] ; returns m */
static int split_tree(const int *layout, int n) {
    int one_found = 0;
    for (int i = 0; i < n; i++) {
        if (layout[i] == 1) {
            if (one_found) return i;
            one_found = 1;
        }
    }
    return n;
}

static int max_of(const int *a, int lo, int hi) { /* max over [lo, hi) */
    int m = -1;
    for (int i = lo; i < hi; i++)
        if (a[i] > m) m = a[i];
    return m;
}

/* returns 1 if candidate (possibly modified) is a valid free tree, 0 if enumeration ended */
static int next_tree(int *cand, int n) {
    int m = split_tree(cand, n);
    int left_len = m - 1;
    int rest_len = n - m + 1;
    /* left heights are cand[1..m-1]-1 ; rest heights are cand[m..n-1] and 0 */
    int left_height = max_of(cand, 1, m) - 1;
    int rest_height = max_of(cand, m, n);
    if (rest_height < 0) rest_height = 0;
    int valid = rest_height >= left_height;
    if (valid && rest_height == left_height) {
        if (left_len > rest_len) valid = 0;
        else if (left_len == rest_len) {
            /* compare left (cand[1..m-1]-1) with rest ([0], cand[m..]) lexicographically */
            for (int i = 0; i < left_len; i++) {
                int l = cand[1 + i] - 1;
                int r = (i == 0) ? 0 : cand[m + i - 1];
                if (l != r) { if (l > r) valid = 0; break; }
            }
        }
    }
    if (valid) return 1;
    int p = left_len;
    int old_cand_p = cand[p];
    if (!next_rooted_tree(cand, n, p)) return 0;
    if (old_cand_p > 2) {
        int m2 = split_tree(cand, n);
        int new_left_height = max_of(cand, 1, m2) - 1;
        int suffix_len = new_left_height + 1; /* range(1, new_left_height + 2) */
        for (int i = 0; i < suffix_len; i++) cand[n - suffix_len + i] = i + 1;
    }
    return 1;
}

/* ------------------------------------------------------- polynomial DP */

typedef struct { int deg; u64 c[MAXN + 2]; } poly;

static void poly_mul(const poly *a, const poly *b, poly *out) {
    poly t; t.deg = a->deg + b->deg;
    memset(t.c, 0, sizeof(u64) * (t.deg + 1));
    for (int i = 0; i <= a->deg; i++) {
        if (!a->c[i]) continue;
        for (int j = 0; j <= b->deg; j++) t.c[i + j] += a->c[i] * b->c[j];
    }
    *out = t;
}

static void poly_add(const poly *a, const poly *b, poly *out) {
    poly t; t.deg = a->deg > b->deg ? a->deg : b->deg;
    for (int i = 0; i <= t.deg; i++) t.c[i] = (i <= a->deg ? a->c[i] : 0) + (i <= b->deg ? b->c[i] : 0);
    *out = t;
}

static void indep_poly(const int *layout, int n, poly *result) {
    static int parent[MAXN], stack[MAXN];
    static poly A[MAXN], B[MAXN];
    int sp = 0;
    for (int i = 0; i < n; i++) {
        while (sp > 0 && layout[stack[sp - 1]] >= layout[i]) sp--;
        parent[i] = sp > 0 ? stack[sp - 1] : -1;
        stack[sp++] = i;
        A[i].deg = 0; A[i].c[0] = 1;
        B[i].deg = 1; B[i].c[0] = 0; B[i].c[1] = 1;
    }
    for (int v = n - 1; v > 0; v--) {
        int p = parent[v];
        poly s, t;
        poly_add(&A[v], &B[v], &s);
        poly_mul(&A[p], &s, &t); A[p] = t;
        poly_mul(&B[p], &A[v], &t); B[p] = t;
    }
    poly_add(&A[0], &B[0], result);
    while (result->deg > 0 && result->c[result->deg] == 0) result->deg--;
}

/* ------------------------------------------------------------ checks */

typedef struct {
    u64 count, unimodal, lc, iso_all, iso_prefix, nw_all, wr_prefix, tail;
    /* per r: minimum of Q/den as exact fraction plus argmin */
    u128 minQ[MAXN + 2], minD[MAXN + 2]; int have[MAXN + 2];
    int argmin_levels[MAXN + 2][MAXN]; poly argmin_poly[MAXN + 2];
    /* prefix minimum */
    u128 pminQ, pminD; int phave; int pargmin_levels[MAXN]; poly pargmin_poly; int pargmin_r;
    /* examples of failures */
    int nw_fail_levels[MAXN]; poly nw_fail_poly; int nw_fail_r; int have_nw_fail;
    int iso_fail_levels[MAXN]; poly iso_fail_poly; int iso_fail_r; int have_iso_fail;
    int uni_fail_levels[MAXN]; poly uni_fail_poly; int have_uni_fail;
    int wr_fail_levels[MAXN]; poly wr_fail_poly; int wr_fail_r; int have_wr_fail;
    int tail_fail_levels[MAXN]; poly tail_fail_poly; int tail_fail_r; int have_tail_fail;
} agg_t;

static int ceil_div(int a, int b) { return (a + b - 1) / b; }

/* Q may be negative; represent sign separately. den > 0. Compare a/b < c/d exactly. */
static int frac_less(int sa, u128 a, u128 b, int sc, u128 c, u128 d) {
    /* sa, sc in {-1,0,1} signs of numerators */
    if (sa < 0 && sc >= 0) return 1;
    if (sa >= 0 && sc < 0) return 0;
    if (sa >= 0) return a * d < c * b;           /* both nonnegative */
    return a * d > c * b;                        /* both negative: more negative is less */
}

static void check_tree(const int *layout, int n, const poly *P, agg_t *G) {
    int alpha = P->deg;
    int L = ceil_div(2 * alpha - 1, 3);
    const u64 *p = P->c;
    G->count++;
    /* unimodal */
    int i = 0;
    while (i + 1 <= alpha && p[i] <= p[i + 1]) i++;
    while (i + 1 <= alpha && p[i] >= p[i + 1]) i++;
    int uni = (i >= alpha);
    G->unimodal += uni;
    if (!uni && !G->have_uni_fail) { G->have_uni_fail = 1; memcpy(G->uni_fail_levels, layout, sizeof(int) * n); G->uni_fail_poly = *P; }
    int lc = 1, iso_all = 1, iso_prefix = 1, nw_all = 1;
    int pbest_have = 0; u128 pbQ = 0, pbD = 1; int pbsign = 1, pbr = 0;
    for (int r = 1; r <= alpha - 1; r++) {
        u128 a = p[r - 1], b = p[r], c = p[r + 1];
        u128 bb = b * b, ac = a * c;
        if (bb < ac) lc = 0;
        u128 den = (u128)(r + 1) * ac;
        u128 lhs = (u128)r * bb + a * a;
        int sign; u128 Q;
        if (lhs >= den) { sign = (lhs == den) ? 0 : 1; Q = lhs - den; } else { sign = -1; Q = den - lhs; }
        if ((u128)r * bb < den) { nw_all = 0; if (!G->have_nw_fail) { G->have_nw_fail = 1; memcpy(G->nw_fail_levels, layout, sizeof(int) * n); G->nw_fail_poly = *P; G->nw_fail_r = r; } }
        if (sign < 0) {
            iso_all = 0;
            if (2 <= r && r <= L - 1) iso_prefix = 0;
            if (!G->have_iso_fail) { G->have_iso_fail = 1; memcpy(G->iso_fail_levels, layout, sizeof(int) * n); G->iso_fail_poly = *P; G->iso_fail_r = r; }
        }
        if (den > 0) {
            if (!G->have[r] || frac_less(sign, Q, den, G->have[r] == 2 ? -1 : 1, G->minQ[r], G->minD[r])) {
                G->have[r] = (sign < 0) ? 2 : 1; /* 2 encodes negative minimum */
                G->minQ[r] = Q; G->minD[r] = den;
                memcpy(G->argmin_levels[r], layout, sizeof(int) * n); G->argmin_poly[r] = *P;
            }
            if (2 <= r && r <= L - 1) {
                if (!pbest_have || frac_less(sign, Q, den, pbsign, pbQ, pbD)) { pbest_have = 1; pbQ = Q; pbD = den; pbsign = sign; pbr = r; }
            }
        }
    }
    if (pbest_have) {
        if (!G->phave || frac_less(pbsign, pbQ, pbD, G->phave == 2 ? -1 : 1, G->pminQ, G->pminD)) {
            G->phave = (pbsign < 0) ? 2 : 1; G->pminQ = pbQ; G->pminD = pbD; G->pargmin_r = pbr;
            memcpy(G->pargmin_levels, layout, sizeof(int) * n); G->pargmin_poly = *P;
        }
    }
    G->lc += lc; G->iso_all += iso_all; G->iso_prefix += iso_prefix; G->nw_all += nw_all;
    /* WR on prefix 2..L-1 */
    int wr = 1;
    for (int r = 2; r <= L - 1 && r <= alpha; r++) if (p[r - 1] > (u64)r * p[r]) { wr = 0; if (!G->have_wr_fail) { G->have_wr_fail = 1; memcpy(G->wr_fail_levels, layout, sizeof(int) * n); G->wr_fail_poly = *P; G->wr_fail_r = r; } break; }
    G->wr_prefix += wr;
    /* tail */
    int tail = 1;
    for (int r = (L > 0 ? L : 0); r <= alpha - 1; r++) if (p[r] < p[r + 1]) { tail = 0; if (!G->have_tail_fail) { G->have_tail_fail = 1; memcpy(G->tail_fail_levels, layout, sizeof(int) * n); G->tail_fail_poly = *P; G->tail_fail_r = r; } break; }
    G->tail += tail;
}

/* ------------------------------------------------------------- output */

static void print_u128(u128 v) {
    char buf[64]; int k = 0;
    if (v == 0) { putchar('0'); return; }
    while (v) { buf[k++] = '0' + (int)(v % 10); v /= 10; }
    while (k) putchar(buf[--k]);
}

static void print_levels(const int *lv, int n) {
    putchar('[');
    for (int i = 0; i < n; i++) { if (i) putchar(','); printf("%d", lv[i]); }
    putchar(']');
}

static void print_poly(const poly *P) {
    putchar('[');
    for (int i = 0; i <= P->deg; i++) { if (i) putchar(','); printf("%llu", (unsigned long long)P->c[i]); }
    putchar(']');
}

static void print_cell(const char *name, int have, u128 Q, u128 D, int r, const int *lv, int n, const poly *P) {
    printf("\"%s\":", name);
    if (!have) { printf("null"); return; }
    printf("{\"r\":%d,\"Q_r\":\"%s", r, have == 2 ? "-" : "");
    print_u128(Q);
    printf("\",\"denominator\":\"");
    print_u128(D);
    printf("\",\"ratio_float\":%.12g,\"argmin_levels\":", (have == 2 ? -1.0 : 1.0) * (double)Q / (double)D);
    print_levels(lv, n);
    printf(",\"coefficients\":");
    print_poly(P);
    putchar('}');
}

static void print_fail(const char *name, int have, const int *lv, int n, const poly *P, int r) {
    printf("\"%s\":", name);
    if (!have) { printf("null"); return; }
    printf("{\"r\":%d,\"levels\":", r); print_levels(lv, n); printf(",\"coefficients\":"); print_poly(P); putchar('}');
}

int main(int argc, char **argv) {
    int nmin = 1, nmax = 20, dump = 0;
    for (int i = 1; i < argc; i++) {
        if (!strcmp(argv[i], "--nmin") && i + 1 < argc) nmin = atoi(argv[++i]);
        else if (!strcmp(argv[i], "--nmax") && i + 1 < argc) nmax = atoi(argv[++i]);
        else if (!strcmp(argv[i], "--dump")) dump = 1;
        else { fprintf(stderr, "usage: %s --nmin A --nmax B [--dump]\n", argv[0]); return 2; }
    }
    if (nmax > 30 || nmin < 1) { fprintf(stderr, "n must be in 1..30 (A000055 table)\n"); return 2; }
    int all_ok = 1;
    for (int n = nmin; n <= nmax; n++) {
        clock_t t0 = clock();
        agg_t *G = calloc(1, sizeof(agg_t));
        int layout[MAXN];
        poly P;
        if (n == 1) {
            layout[0] = 0; P.deg = 1; P.c[0] = 1; P.c[1] = 1;
            if (dump) { print_levels(layout, 1); putchar(';'); print_poly(&P); putchar('\n'); }
            check_tree(layout, 1, &P, G);
        } else {
            int k = 0;
            for (int i = 0; i <= n / 2; i++) layout[k++] = i;
            for (int i = 1; i < (n + 1) / 2; i++) layout[k++] = i;
            int alive = 1;
            while (alive) {
                alive = next_tree(layout, n);
                if (!alive) break;
                indep_poly(layout, n, &P);
                if (dump) { print_levels(layout, n); putchar(';'); print_poly(&P); putchar('\n'); }
                check_tree(layout, n, &P, G);
                alive = next_rooted_tree(layout, n, -1);
            }
        }
        int count_ok = (G->count == A000055[n]);
        if (!count_ok) all_ok = 0;
        double secs = (double)(clock() - t0) / CLOCKS_PER_SEC;
        printf("{\"n\":%d,\"count\":%llu,\"A000055\":%llu,\"count_check\":\"%s\","
               "\"unimodal\":%llu,\"log_concave\":%llu,\"iso_all\":%llu,\"iso_prefix\":%llu,\"nw_all\":%llu,\"wr_prefix_ok\":%llu,\"tail_ok\":%llu,"
               "\"all_unimodal\":%s,\"all_log_concave\":%s,\"all_iso\":%s,\"all_iso_prefix\":%s,\"all_nw\":%s,\"all_wr_prefix\":%s,\"all_tail\":%s,",
               n, (unsigned long long)G->count, (unsigned long long)A000055[n], count_ok ? "PASS" : "FAIL",
               (unsigned long long)G->unimodal, (unsigned long long)G->lc, (unsigned long long)G->iso_all, (unsigned long long)G->iso_prefix,
               (unsigned long long)G->nw_all, (unsigned long long)G->wr_prefix, (unsigned long long)G->tail,
               G->unimodal == G->count ? "true" : "false", G->lc == G->count ? "true" : "false", G->iso_all == G->count ? "true" : "false",
               G->iso_prefix == G->count ? "true" : "false", G->nw_all == G->count ? "true" : "false", G->wr_prefix == G->count ? "true" : "false",
               G->tail == G->count ? "true" : "false");
        print_cell("iso_min_prefix_2<=r<=L-1", G->phave, G->pminQ, G->pminD, G->pargmin_r, G->pargmin_levels, n, &G->pargmin_poly);
        printf(",\"iso_min_by_r\":{");
        int first = 1;
        for (int r = 1; r <= n; r++) {
            if (!G->have[r]) continue;
            if (!first) putchar(',');
            first = 0;
            char name[16]; snprintf(name, sizeof name, "%d", r);
            print_cell(name, G->have[r], G->minQ[r], G->minD[r], r, G->argmin_levels[r], n, &G->argmin_poly[r]);
        }
        printf("},");
        print_fail("nonunimodal_example", G->have_uni_fail, G->uni_fail_levels, n, &G->uni_fail_poly, 0); putchar(',');
        print_fail("iso_violation_example", G->have_iso_fail, G->iso_fail_levels, n, &G->iso_fail_poly, G->iso_fail_r); putchar(',');
        print_fail("nw_violation_example", G->have_nw_fail, G->nw_fail_levels, n, &G->nw_fail_poly, G->nw_fail_r); putchar(',');
        print_fail("wr_prefix_failure_example", G->have_wr_fail, G->wr_fail_levels, n, &G->wr_fail_poly, G->wr_fail_r); putchar(',');
        print_fail("tail_failure_example", G->have_tail_fail, G->tail_fail_levels, n, &G->tail_fail_poly, G->tail_fail_r);
        printf(",\"seconds\":%.2f}\n", secs);
        fflush(stdout);
        free(G);
    }
    return all_ok ? 0 : 1;
}
