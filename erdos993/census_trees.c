/*
 * census_trees.c -- exact census of ALL nonisomorphic free trees of order N
 * for Erdős Problem #993 (unimodality of the independent-set sequence).
 *
 * Generator: Wright–Richmond–Odlyzko–McKay canonical level sequences, a
 * line-by-line port of tree_level_sequences / _next_rooted_tree / _next_tree /
 * _split_tree in forest_indep.py (itself a port of NetworkX, BSD-3-Clause).
 * Vertex i has depth seq[i]; the sequence is a preorder listing, so the parent
 * of i is the nearest j < i with seq[j] == seq[i] - 1.
 *
 * Polynomial: rooted DP along the preorder (a stack indexed by depth), exact
 * uint64 coefficients.  Every intermediate coefficient counts independent sets
 * of a sub-forest, so it is <= 2^N; nothing can overflow for N <= 63.
 *
 * Framework quantities (all exact; no floating point enters any verdict):
 *   alpha       = deg I(T;x)                      L = ceil((2 alpha - 1)/3)
 *   prefix      = { r : 1 <= r <= L - 1 }         tail = { r : L <= r <= alpha-1 }
 *   WR_r slack  = r p_r - p_{r-1}                                 (>= 0 iff WR_r)
 *   ISO_r Q_r   = r p_r^2 + p_{r-1}^2 - (r+1) p_{r-1} p_{r+1}     (>= 0 iff ISO_r)
 *   ISO_r ratio = (r p_r^2 + p_{r-1}^2) / ((r+1) p_{r-1} p_{r+1})  (>= 1 iff ISO_r)
 *   TAIL        : p_r >= p_{r+1} for r >= L       (Levit–Mandrescu, all graphs)
 *   unimodal, log-concave (p_r^2 >= p_{r-1} p_{r+1}) as usual.
 * Products are formed in (unsigned) __int128 and rationals are compared by
 * cross-multiplication in unsigned __int128.
 *
 * Overflow bound for the rational comparisons: p_r <= 2^N, hence
 *   numerator, denominator <= (N+1) 2^{2N}  and cross products <= (N+1)^2 2^{4N},
 * which is < 2^128 for N <= 29 ((30)^2 2^116 < 2^126).  The program refuses N > 29.
 * (For N <= 26 the actual bound p_r <= C(26,13) < 2^24 gives cross products < 2^106.)
 *
 * Finite enumeration is falsification evidence only; nothing here proves the
 * conjecture for any infinite family.
 *
 * Usage:
 *   census_trees [--out DIR] N [N ...]     write DIR/census_trees_n{N}.json, one
 *                                          summary line per order on stdout,
 *                                          progress on stderr
 *   census_trees --dump N                  print "seq | poly" for every tree of
 *                                          order N (for the Python cross-check)
 * Exit status is nonzero if a tree count disagrees with OEIS A000055.
 */

#define _POSIX_C_SOURCE 199309L
#include <inttypes.h>
#include <stdint.h>
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <time.h>

typedef uint64_t u64;
typedef unsigned __int128 u128;
typedef __int128 i128;

#define MAXN 29            /* largest order accepted (see overflow bound above) */
#define MAXP (MAXN + 2)    /* polynomial buffer length */
#define TOPK 5             /* number of tightest-ratio trees kept per order */
#define MAX_STORE 64       /* offending trees stored verbatim per category */

/* OEIS A000055, n = 0..29 (n = 27..29 recomputed with forest_indep.count_trees). */
static const u64 A000055[MAXN + 1] = {
    1ULL, 1ULL, 1ULL, 1ULL, 2ULL, 3ULL, 6ULL, 11ULL, 23ULL, 47ULL, 106ULL, 235ULL,
    551ULL, 1301ULL, 3159ULL, 7741ULL, 19320ULL, 48629ULL, 123867ULL, 317955ULL,
    823065ULL, 2144505ULL, 5623756ULL, 14828074ULL, 39299897ULL, 104636890ULL,
    279793450ULL, 751065460ULL, 2023443032ULL, 5469566585ULL};

static double now_sec(void) {
    struct timespec ts;
    clock_gettime(CLOCK_MONOTONIC, &ts);
    return (double)ts.tv_sec + 1e-9 * (double)ts.tv_nsec;
}

/* ------------------------------------------------------------------------ */
/* WROM generator (port of forest_indep.py)                                  */
/* ------------------------------------------------------------------------ */

/* Beyer–Hedetniemi successor of a rooted level sequence, in place.
 * p < 0 selects the default p (rightmost entry with level != 1).
 * Returns 0 when there is no successor (p == 0). */
static int next_rooted_tree(int *s, int n, int p) {
    if (p < 0) {
        p = n - 1;
        while (s[p] == 1) p--;
    }
    if (p == 0) return 0;
    int q = p - 1;
    while (s[q] != s[p] - 1) q--;
    for (int i = p; i < n; i++) s[i] = s[i - p + q];
    return 1;
}

/* _split_tree: index m of the second '1' in s (n if there is only one).
 * left = s[1..m-1] - 1 (length m-1), rest = [0] + s[m..n-1] (length n-m+1). */
static inline int split_index(const int *s, int n) {
    for (int i = 2; i < n; i++)
        if (s[i] == 1) return i;
    return n;
}

/* _next_tree: leave s unchanged if it is the canonical level sequence of a
 * free tree, otherwise jump (in place) to the next canonical one. */
static void next_tree(int *s, int n) {
    int m = split_index(s, n);
    int left_len = m - 1, rest_len = n - m + 1;
    int left_h = 0, rest_h = 0;
    for (int i = 1; i < m; i++)
        if (s[i] - 1 > left_h) left_h = s[i] - 1;
    for (int i = m; i < n; i++)
        if (s[i] > rest_h) rest_h = s[i];
    int valid = rest_h >= left_h;
    if (valid && rest_h == left_h) {
        if (left_len > rest_len) {
            valid = 0;
        } else if (left_len == rest_len) {
            /* lexicographic left > rest ?  left[i] = s[i+1]-1, rest[0] = 0,
             * rest[i] = s[m+i-1] for i >= 1; index 0 is 0 on both sides. */
            int cmp = 0;
            for (int i = 1; i < left_len; i++) {
                int a = s[i + 1] - 1, b = s[m + i - 1];
                if (a != b) { cmp = (a > b) ? 1 : -1; break; }
            }
            if (cmp > 0) valid = 0;
        }
    }
    if (valid) return;
    int p = left_len;
    int old_sp = s[p];              /* candidate[p] of the ORIGINAL sequence */
    next_rooted_tree(s, n, p);
    if (old_sp > 2) {
        int m2 = split_index(s, n);
        int h2 = 0;
        for (int i = 1; i < m2; i++)
            if (s[i] - 1 > h2) h2 = s[i] - 1;
        int len = h2 + 1;           /* suffix 1, 2, ..., h2 + 1 */
        for (int k = 0; k < len; k++) s[n - len + k] = k + 1;
    }
}

/* ------------------------------------------------------------------------ */
/* Exact polynomials                                                         */
/* ------------------------------------------------------------------------ */

typedef struct {
    int len;
    u64 c[MAXP];
} Poly;

static inline void poly_copy(Poly *dst, const Poly *src) {
    dst->len = src->len;
    memcpy(dst->c, src->c, (size_t)src->len * sizeof(u64));
}

static inline void poly_mul_into(const Poly *a, const Poly *b, Poly *out) {
    int la = a->len, lb = b->len, lo = la + lb - 1;
    u64 *o = out->c;
    for (int k = 0; k < lo; k++) o[k] = 0;
    for (int i = 0; i < la; i++) {
        u64 ai = a->c[i];
        if (!ai) continue;
        const u64 *bc = b->c;
        for (int j = 0; j < lb; j++) o[i + j] += ai * bc[j];
    }
    out->len = lo;
}

/* Stack of partial polynomials indexed by depth.  SF[d]: root of the open
 * vertex at depth d excluded (product over finished children c of f_c+g_c);
 * SG[d]: root included (x times the product of f_c). */
static Poly SF[MAXN + 1], SG[MAXN + 1];

static inline void close_level(int d) {
    Poly h, t;
    const Poly *F = &SF[d], *G = &SG[d];
    int lh = F->len > G->len ? F->len : G->len;
    for (int i = 0; i < lh; i++)
        h.c[i] = (i < F->len ? F->c[i] : 0) + (i < G->len ? G->c[i] : 0);
    h.len = lh;
    poly_mul_into(&SF[d - 1], &h, &t);
    poly_copy(&SF[d - 1], &t);
    poly_mul_into(&SG[d - 1], F, &t);
    poly_copy(&SG[d - 1], &t);
}

/* Exact independence polynomial p_0..p_alpha of the tree with level sequence s. */
static void indep_poly_levelseq(const int *s, int n, Poly *P) {
    int cur = -1;
    for (int i = 0; i < n; i++) {
        int d = s[i];
        if (d > cur + 1 || d < 0) {
            fprintf(stderr, "invalid level sequence (depth jump) at position %d\n", i);
            exit(3);
        }
        while (cur >= d) { close_level(cur); cur--; }
        SF[d].len = 1; SF[d].c[0] = 1;
        SG[d].len = 2; SG[d].c[0] = 0; SG[d].c[1] = 1;
        cur = d;
    }
    while (cur >= 1) { close_level(cur); cur--; }
    int lp = SF[0].len > SG[0].len ? SF[0].len : SG[0].len;
    for (int i = 0; i < lp; i++)
        P->c[i] = (i < SF[0].len ? SF[0].c[i] : 0) + (i < SG[0].len ? SG[0].c[i] : 0);
    P->len = lp;
    while (P->len > 1 && P->c[P->len - 1] == 0) P->len--;
}

/* ------------------------------------------------------------------------ */
/* Per-order aggregation                                                     */
/* ------------------------------------------------------------------------ */

typedef struct {
    int seq[MAXN];
    Poly P;
    int r;          /* index attaining the recorded quantity (0 if n/a) */
    i128 val;       /* WR slack or Q_r */
    u128 num, den;  /* ISO ratio numerator / denominator (unreduced) */
    int n_lc_fail;
    int lc_fail[MAXP];
    int unimodal;
} Rec;

typedef struct {
    u64 tree_count, non_unimodal, tail_fail, wr_prefix_fail, iso_prefix_fail;
    u64 non_lc, with_prefix;
    int alpha_min, alpha_max;
    u64 alpha_hist[MAXP];
    u64 lc_fail_hist[MAXP];
    int have_wrp;   Rec wrp;     /* min WR prefix slack */
    int have_isop;  Rec isop;    /* min ISO prefix Q_r */
    int have_ratio; Rec ratio;   /* min ISO prefix ratio */
    int have_wra;   Rec wra;     /* min WR slack over all r */
    int have_isoa;  Rec isoa;    /* min Q_r over all r */
    int ntop;       Rec top[TOPK];
    int n_nonlc;    Rec nonlc[MAX_STORE];
    int n_wrf;      Rec wrf[MAX_STORE];
    int n_isof;     Rec isof[MAX_STORE];
    int n_nonuni;   Rec nonuni[MAX_STORE];
    int n_tailf;    Rec tailf[MAX_STORE];
} Agg;

static void rec_fill(Rec *R, const int *s, int n, const Poly *P, int r,
                     i128 val, u128 num, u128 den, int unimodal) {
    memset(R, 0, sizeof *R);
    memcpy(R->seq, s, (size_t)n * sizeof(int));
    poly_copy(&R->P, P);
    R->r = r;
    R->val = val;
    R->num = num;
    R->den = den;
    R->unimodal = unimodal;
}

/* a/b < c/d by cross-multiplication (all operands < 2^63 for N <= 29) */
static inline int ratio_less(u128 a, u128 b, u128 c, u128 d) {
    return a * d < c * b;
}

static void top_insert(Agg *A, const int *s, int n, const Poly *P, int r,
                       u128 num, u128 den, int unimodal) {
    if (A->ntop == TOPK &&
        !ratio_less(num, den, A->top[TOPK - 1].num, A->top[TOPK - 1].den))
        return;
    int pos = A->ntop;
    while (pos > 0 && ratio_less(num, den, A->top[pos - 1].num, A->top[pos - 1].den))
        pos--;
    if (pos >= TOPK) return;
    if (A->ntop < TOPK) A->ntop++;
    for (int k = A->ntop - 1; k > pos; k--) A->top[k] = A->top[k - 1];
    rec_fill(&A->top[pos], s, n, P, r, 0, num, den, unimodal);
}

static void analyze(Agg *A, const int *s, int n, const Poly *P) {
    const u64 *p = P->c;
    int alpha = P->len - 1;
    A->tree_count++;
    A->alpha_hist[alpha]++;
    if (alpha < A->alpha_min) A->alpha_min = alpha;
    if (alpha > A->alpha_max) A->alpha_max = alpha;
    int L = alpha >= 1 ? (2 * alpha + 1) / 3 : 0;   /* ceil((2 alpha - 1)/3) */

    /* unimodality */
    int i = 0;
    while (i < alpha && p[i] <= p[i + 1]) i++;
    while (i < alpha && p[i] >= p[i + 1]) i++;
    int unimodal = (i == alpha);

    /* log-concavity */
    int lcf[MAXP], nlcf = 0;
    for (int r = 1; r < alpha; r++)
        if ((u128)p[r] * p[r] < (u128)p[r - 1] * p[r + 1]) lcf[nlcf++] = r;

    /* tail: p_r >= p_{r+1} for L <= r <= alpha-1 */
    int tail_ok = 1;
    for (int r = L; r < alpha; r++)
        if (p[r] < p[r + 1]) { tail_ok = 0; break; }

    /* prefix quantities, r = 1..L-1 */
    int have_prefix = (L >= 2);
    i128 wrp = 0, isop = 0;
    int wrp_r = 0, isop_r = 0, rat_r = 0;
    u128 rnum = 0, rden = 1;
    for (int r = 1; r < L; r++) {
        u64 a = p[r - 1], b = p[r], c = p[r + 1];
        i128 wr = (i128)r * (i128)b - (i128)a;
        u128 num = (u128)r * b * b + (u128)a * a;
        u128 den = (u128)(r + 1) * a * c;
        i128 Q = (i128)num - (i128)den;
        if (r == 1 || wr < wrp) { wrp = wr; wrp_r = r; }
        if (r == 1 || Q < isop) { isop = Q; isop_r = r; }
        if (r == 1 || ratio_less(num, den, rnum, rden)) { rnum = num; rden = den; rat_r = r; }
    }

    /* all r: WR over 1..alpha, ISO over 1..alpha-1 */
    i128 wra = 0; int wra_r = 0;
    for (int r = 1; r <= alpha; r++) {
        i128 wr = (i128)r * (i128)p[r] - (i128)p[r - 1];
        if (r == 1 || wr < wra) { wra = wr; wra_r = r; }
    }
    i128 isoa = 0; int isoa_r = 0;
    for (int r = 1; r < alpha; r++) {
        u64 a = p[r - 1], b = p[r], c = p[r + 1];
        i128 Q = (i128)((u128)r * b * b + (u128)a * a) - (i128)((u128)(r + 1) * a * c);
        if (r == 1 || Q < isoa) { isoa = Q; isoa_r = r; }
    }

    /* aggregate */
    if (!unimodal) {
        A->non_unimodal++;
        if (A->n_nonuni < MAX_STORE)
            rec_fill(&A->nonuni[A->n_nonuni++], s, n, P, 0, 0, 0, 1, unimodal);
    }
    if (nlcf) {
        A->non_lc++;
        for (int k = 0; k < nlcf; k++) A->lc_fail_hist[lcf[k]]++;
        if (A->n_nonlc < MAX_STORE) {
            Rec *R = &A->nonlc[A->n_nonlc++];
            rec_fill(R, s, n, P, 0, 0, 0, 1, unimodal);
            R->n_lc_fail = nlcf;
            memcpy(R->lc_fail, lcf, (size_t)nlcf * sizeof(int));
        }
    }
    if (!tail_ok) {
        A->tail_fail++;
        if (A->n_tailf < MAX_STORE)
            rec_fill(&A->tailf[A->n_tailf++], s, n, P, 0, 0, 0, 1, unimodal);
    }
    if (have_prefix) {
        A->with_prefix++;
        if (wrp < 0) {
            A->wr_prefix_fail++;
            if (A->n_wrf < MAX_STORE)
                rec_fill(&A->wrf[A->n_wrf++], s, n, P, wrp_r, wrp, 0, 1, unimodal);
        }
        if (isop < 0) {
            A->iso_prefix_fail++;
            if (A->n_isof < MAX_STORE)
                rec_fill(&A->isof[A->n_isof++], s, n, P, isop_r, isop, 0, 1, unimodal);
        }
        if (!A->have_wrp || wrp < A->wrp.val) {
            A->have_wrp = 1;
            rec_fill(&A->wrp, s, n, P, wrp_r, wrp, 0, 1, unimodal);
        }
        if (!A->have_isop || isop < A->isop.val) {
            A->have_isop = 1;
            rec_fill(&A->isop, s, n, P, isop_r, isop, 0, 1, unimodal);
        }
        if (!A->have_ratio || ratio_less(rnum, rden, A->ratio.num, A->ratio.den)) {
            A->have_ratio = 1;
            rec_fill(&A->ratio, s, n, P, rat_r, 0, rnum, rden, unimodal);
        }
        top_insert(A, s, n, P, rat_r, rnum, rden, unimodal);
    }
    if (alpha >= 1 && (!A->have_wra || wra < A->wra.val)) {
        A->have_wra = 1;
        rec_fill(&A->wra, s, n, P, wra_r, wra, 0, 1, unimodal);
    }
    if (alpha >= 2 && (!A->have_isoa || isoa < A->isoa.val)) {
        A->have_isoa = 1;
        rec_fill(&A->isoa, s, n, P, isoa_r, isoa, 0, 1, unimodal);
    }
}

/* ------------------------------------------------------------------------ */
/* Exact decimal rendering of 128-bit integers and rationals                 */
/* ------------------------------------------------------------------------ */

static char *u128_str(u128 v, char *buf) {
    char tmp[48];
    int k = 0;
    if (v == 0) tmp[k++] = '0';
    while (v) { tmp[k++] = (char)('0' + (int)(v % 10)); v /= 10; }
    for (int i = 0; i < k; i++) buf[i] = tmp[k - 1 - i];
    buf[k] = 0;
    return buf;
}

static char *i128_str(i128 v, char *buf) {
    if (v < 0) { buf[0] = '-'; u128_str((u128)(-v), buf + 1); }
    else u128_str((u128)v, buf);
    return buf;
}

static u128 gcd_u128(u128 a, u128 b) {
    while (b) { u128 t = a % b; a = b; b = t; }
    return a;
}

/* "num/den" in lowest terms */
static char *ratio_str(u128 num, u128 den, char *buf) {
    u128 g = gcd_u128(num, den);
    if (g == 0) g = 1;
    char a[48], b[48];
    u128_str(num / g, a);
    u128_str(den / g, b);
    sprintf(buf, "%s/%s", a, b);
    return buf;
}

/* decimal expansion of num/den truncated after `digits` places (exact long division) */
static char *ratio_decimal_str(u128 num, u128 den, int digits, char *buf) {
    u128 ip = num / den, rem = num % den;
    char *q = buf;
    u128_str(ip, q);
    q += strlen(q);
    *q++ = '.';
    for (int k = 0; k < digits; k++) {
        rem *= 10;
        *q++ = (char)('0' + (int)(rem / den));
        rem %= den;
    }
    *q = 0;
    return buf;
}

/* ------------------------------------------------------------------------ */
/* JSON output                                                               */
/* ------------------------------------------------------------------------ */

static void json_int_array(FILE *f, const int *a, int n) {
    fputc('[', f);
    for (int i = 0; i < n; i++) fprintf(f, "%s%d", i ? ", " : "", a[i]);
    fputc(']', f);
}

static void json_poly(FILE *f, const Poly *P) {
    fputc('[', f);
    for (int i = 0; i < P->len; i++) fprintf(f, "%s%" PRIu64, i ? ", " : "", P->c[i]);
    fputc(']', f);
}

enum { REC_VALUE, REC_RATIO, REC_LC, REC_PLAIN };

static void json_rec(FILE *f, const Rec *R, int n, int kind) {
    char b1[64], b2[128];
    fprintf(f, "{\"level_sequence\": ");
    json_int_array(f, R->seq, n);
    fprintf(f, ", \"poly\": ");
    json_poly(f, &R->P);
    fprintf(f, ", \"alpha\": %d", R->P.len - 1);
    switch (kind) {
    case REC_VALUE:
        fprintf(f, ", \"r\": %d, \"value\": %s", R->r, i128_str(R->val, b1));
        break;
    case REC_RATIO:
        fprintf(f, ", \"r\": %d, \"ratio\": \"%s\", \"ratio_decimal_approx\": \"%s\"",
                R->r, ratio_str(R->num, R->den, b2),
                ratio_decimal_str(R->num, R->den, 15, b1));
        break;
    case REC_LC:
        fprintf(f, ", \"lc_fail_indices\": ");
        json_int_array(f, R->lc_fail, R->n_lc_fail);
        fprintf(f, ", \"unimodal\": %s", R->unimodal ? "true" : "false");
        break;
    default:
        fprintf(f, ", \"unimodal\": %s", R->unimodal ? "true" : "false");
        break;
    }
    fputc('}', f);
}

static void json_rec_or_null(FILE *f, int have, const Rec *R, int n, int kind) {
    if (have) json_rec(f, R, n, kind);
    else fprintf(f, "null");
}

static void json_rec_list(FILE *f, const Rec *R, int cnt, int n, int kind) {
    fputc('[', f);
    for (int i = 0; i < cnt; i++) {
        fprintf(f, "%s\n    ", i ? "," : "");
        json_rec(f, &R[i], n, kind);
    }
    fprintf(f, "%s]", cnt ? "\n  " : "");
}

static void write_json(const Agg *A, int n, double secs, const char *path) {
    FILE *f = fopen(path, "w");
    if (!f) { perror(path); exit(2); }
    int count_ok = (n <= MAXN) ? (A->tree_count == A000055[n]) : -1;
    fprintf(f, "{\n");
    fprintf(f, "  \"N\": %d,\n", n);
    fprintf(f, "  \"tree_count\": %" PRIu64 ",\n", A->tree_count);
    fprintf(f, "  \"expected_A000055\": %" PRIu64 ",\n", n <= MAXN ? A000055[n] : 0);
    fprintf(f, "  \"count_matches_A000055\": %s,\n", count_ok == 1 ? "true" : "false");
    fprintf(f, "  \"non_unimodal_count\": %" PRIu64 ",\n", A->non_unimodal);
    fprintf(f, "  \"tail_fail_count\": %" PRIu64 ",\n", A->tail_fail);
    fprintf(f, "  \"wr_prefix_fail_count\": %" PRIu64 ",\n", A->wr_prefix_fail);
    fprintf(f, "  \"iso_prefix_fail_count\": %" PRIu64 ",\n", A->iso_prefix_fail);
    fprintf(f, "  \"non_log_concave_count\": %" PRIu64 ",\n", A->non_lc);
    fprintf(f, "  \"trees_with_nonempty_prefix\": %" PRIu64 ",\n", A->with_prefix);
    fprintf(f, "  \"alpha_min\": %d,\n", A->tree_count ? A->alpha_min : 0);
    fprintf(f, "  \"alpha_max\": %d,\n", A->tree_count ? A->alpha_max : 0);
    fprintf(f, "  \"alpha_histogram\": {");
    {
        int first = 1;
        for (int a = 0; a < MAXP; a++)
            if (A->alpha_hist[a]) {
                fprintf(f, "%s\"%d\": %" PRIu64, first ? "" : ", ", a, A->alpha_hist[a]);
                first = 0;
            }
    }
    fprintf(f, "},\n");
    fprintf(f, "  \"lc_fail_index_histogram\": {");
    {
        int first = 1;
        for (int r = 0; r < MAXP; r++)
            if (A->lc_fail_hist[r]) {
                fprintf(f, "%s\"%d\": %" PRIu64, first ? "" : ", ", r, A->lc_fail_hist[r]);
                first = 0;
            }
    }
    fprintf(f, "},\n");
    fprintf(f, "  \"wr_prefix_min\": ");
    json_rec_or_null(f, A->have_wrp, &A->wrp, n, REC_VALUE);
    fprintf(f, ",\n  \"iso_prefix_min\": ");
    json_rec_or_null(f, A->have_isop, &A->isop, n, REC_VALUE);
    fprintf(f, ",\n  \"iso_prefix_ratio_min\": ");
    json_rec_or_null(f, A->have_ratio, &A->ratio, n, REC_RATIO);
    fprintf(f, ",\n  \"wr_all_min\": ");
    json_rec_or_null(f, A->have_wra, &A->wra, n, REC_VALUE);
    fprintf(f, ",\n  \"iso_all_min\": ");
    json_rec_or_null(f, A->have_isoa, &A->isoa, n, REC_VALUE);
    fprintf(f, ",\n  \"tightest_ratio_trees\": ");
    json_rec_list(f, A->top, A->ntop, n, REC_RATIO);
    fprintf(f, ",\n  \"non_log_concave_trees\": ");
    json_rec_list(f, A->nonlc, A->n_nonlc, n, REC_LC);
    fprintf(f, ",\n  \"non_log_concave_trees_stored\": %d", A->n_nonlc);
    fprintf(f, ",\n  \"wr_prefix_fail_trees\": ");
    json_rec_list(f, A->wrf, A->n_wrf, n, REC_VALUE);
    fprintf(f, ",\n  \"iso_prefix_fail_trees\": ");
    json_rec_list(f, A->isof, A->n_isof, n, REC_VALUE);
    fprintf(f, ",\n  \"non_unimodal_trees\": ");
    json_rec_list(f, A->nonuni, A->n_nonuni, n, REC_PLAIN);
    fprintf(f, ",\n  \"tail_fail_trees\": ");
    json_rec_list(f, A->tailf, A->n_tailf, n, REC_PLAIN);
    fprintf(f, ",\n  \"offending_trees_stored_cap\": %d", MAX_STORE);
    fprintf(f, ",\n  \"wall_time_seconds\": %.3f", secs);
    fprintf(f, ",\n  \"trees_per_second\": %.1f", secs > 0 ? (double)A->tree_count / secs : 0.0);
    fprintf(f, ",\n  \"arithmetic\": \"exact: uint64 coefficients, __int128 products, rationals compared by cross-multiplication\"");
    fprintf(f, "\n}\n");
    fclose(f);
}

/* ------------------------------------------------------------------------ */
/* Driver                                                                    */
/* ------------------------------------------------------------------------ */

static void dump_tree(const int *s, int n, const Poly *P) {
    for (int i = 0; i < n; i++) printf("%s%d", i ? " " : "", s[i]);
    printf(" |");
    for (int i = 0; i < P->len; i++) printf(" %" PRIu64, P->c[i]);
    printf("\n");
}

static int run_order(int n, const char *outdir, int dump) {
    if (n < 1 || n > MAXN) {
        fprintf(stderr, "order %d out of range 1..%d\n", n, MAXN);
        return 1;
    }
    Agg *A = calloc(1, sizeof(Agg));
    if (!A) { perror("calloc"); exit(2); }
    A->alpha_min = 1 << 30;
    A->alpha_max = -1;
    int s[MAXN];
    Poly P;
    double t0 = now_sec(), tlast = t0;
    u64 progress_mask = ((u64)1 << 24) - 1;

    if (n == 1) {
        s[0] = 0;
        indep_poly_levelseq(s, 1, &P);
        if (dump) dump_tree(s, 1, &P); else analyze(A, s, 1, &P);
    } else {
        /* start at the path rooted at its centre: 0..n/2 then 1..(n+1)/2-1 */
        int k = 0;
        for (int v = 0; v <= n / 2; v++) s[k++] = v;
        for (int v = 1; v < (n + 1) / 2; v++) s[k++] = v;
        if (k != n) { fprintf(stderr, "internal: bad initial layout\n"); exit(3); }
        u64 cnt = 0;
        for (;;) {
            next_tree(s, n);
            indep_poly_levelseq(s, n, &P);
            if (dump) dump_tree(s, n, &P); else analyze(A, s, n, &P);
            cnt++;
            if (!dump && (cnt & progress_mask) == 0) {
                double t = now_sec();
                fprintf(stderr, "[n=%d] %" PRIu64 " trees, %.1f s elapsed (%.2f Mtrees/s recent)\n",
                        n, cnt, t - t0, (double)(progress_mask + 1) / (t - tlast) / 1e6);
                tlast = t;
            }
            if (!next_rooted_tree(s, n, -1)) break;
        }
    }
    double secs = now_sec() - t0;
    int rc = 0;
    if (!dump) {
        char path[4096];
        snprintf(path, sizeof path, "%s/census_trees_n%d.json", outdir, n);
        write_json(A, n, secs, path);
        int count_ok = (A->tree_count == A000055[n]);
        char b1[64], b2[64], b3[128], b4[64];
        printf("n=%2d trees=%" PRIu64 " A000055=%s non_unimodal=%" PRIu64 " tail_fail=%" PRIu64
               " wr_prefix_fail=%" PRIu64 " iso_prefix_fail=%" PRIu64 " non_LC=%" PRIu64
               " min_wr_prefix=%s min_isoQ_prefix=%s min_iso_ratio=%s(~%s) at r=%d seq=",
               n, A->tree_count, count_ok ? "ok" : "MISMATCH",
               A->non_unimodal, A->tail_fail, A->wr_prefix_fail, A->iso_prefix_fail, A->non_lc,
               A->have_wrp ? i128_str(A->wrp.val, b1) : "n/a",
               A->have_isop ? i128_str(A->isop.val, b2) : "n/a",
               A->have_ratio ? ratio_str(A->ratio.num, A->ratio.den, b3) : "n/a",
               A->have_ratio ? ratio_decimal_str(A->ratio.num, A->ratio.den, 9, b4) : "n/a",
               A->have_ratio ? A->ratio.r : 0);
        if (A->have_ratio) json_int_array(stdout, A->ratio.seq, n); else printf("n/a");
        printf(" time=%.2fs%s%s\n", secs,
               (A->non_unimodal || A->tail_fail || A->wr_prefix_fail || A->iso_prefix_fail)
                   ? " ANOMALY" : "",
               count_ok ? "" : " COUNT-MISMATCH");
        fflush(stdout);
        if (!count_ok) rc = 4;
    }
    free(A);
    return rc;
}

int main(int argc, char **argv) {
    const char *outdir = "results";
    int dump = 0;
    int orders[128], norders = 0;
    for (int i = 1; i < argc; i++) {
        if (!strcmp(argv[i], "--out") && i + 1 < argc) outdir = argv[++i];
        else if (!strcmp(argv[i], "--dump")) dump = 1;
        else if (norders < 128) orders[norders++] = atoi(argv[i]);
    }
    if (!norders) {
        fprintf(stderr, "usage: %s [--out DIR] [--dump] N [N ...]\n", argv[0]);
        return 1;
    }
    int rc = 0;
    for (int i = 0; i < norders; i++) {
        int r = run_order(orders[i], outdir, dump);
        if (r) rc = r;
    }
    return rc;
}
