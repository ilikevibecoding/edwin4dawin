#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <stdint.h>
#include "gtools.h"

#define MAX_ORDER 19
#define LIMIT 5

typedef unsigned long long u64;
typedef __int128 i128;

static unsigned char adjacency[MAX_ORDER + 1][MAX_ORDER + 1];
static unsigned char done[MAX_ORDER + 1][MAX_ORDER + 1];
static u64 msg_excluded[MAX_ORDER + 1][MAX_ORDER + 1][LIMIT + 1];
static u64 msg_total[MAX_ORDER + 1][MAX_ORDER + 1][LIMIT + 1];
static int current_order;

static u64 tree_counts[MAX_ORDER + 1];
static u64 root_counts[MAX_ORDER + 1];
static u64 negative_counts[MAX_ORDER + 1];
static i128 minimum_margin[MAX_ORDER + 1];
static int minimum_set[MAX_ORDER + 1];
static u64 witness_tree[MAX_ORDER + 1];
static int witness_root[MAX_ORDER + 1];
static u64 witness_window[MAX_ORDER + 1][5];
static int registered = 0;

static void poly_mul(const u64 a[LIMIT + 1], const u64 b[LIMIT + 1], u64 out[LIMIT + 1])
{
    u64 temporary[LIMIT + 1] = {0};
    for (int i = 0; i <= LIMIT; ++i)
        for (int j = 0; i + j <= LIMIT; ++j)
            temporary[i + j] += a[i] * b[j];
    memcpy(out, temporary, sizeof(temporary));
}

static void message(int vertex, int parent)
{
    if (done[vertex][parent]) return;
    u64 excluded[LIMIT + 1] = {1, 0, 0, 0, 0, 0};
    u64 included_base[LIMIT + 1] = {1, 0, 0, 0, 0, 0};
    u64 temporary[LIMIT + 1];
    for (int child = 1; child <= current_order; ++child)
    {
        if (!adjacency[vertex][child] || child == parent) continue;
        message(child, vertex);
        poly_mul(excluded, msg_total[child][vertex], temporary);
        memcpy(excluded, temporary, sizeof(temporary));
        poly_mul(included_base, msg_excluded[child][vertex], temporary);
        memcpy(included_base, temporary, sizeof(temporary));
    }
    memcpy(msg_excluded[vertex][parent], excluded, sizeof(excluded));
    memcpy(msg_total[vertex][parent], excluded, sizeof(excluded));
    for (int rank = 1; rank <= LIMIT; ++rank)
        msg_total[vertex][parent][rank] += included_base[rank - 1];
    done[vertex][parent] = 1;
}

static u64 choose_small(int n, int k)
{
    if (k < 0 || k > n) return 0;
    if (k > n - k) k = n - k;
    u64 value = 1;
    for (int j = 1; j <= k; ++j)
        value = value * (u64)(n - k + j) / (u64)j;
    return value;
}

static u64 smoothed(const u64 core[LIMIT + 1], int siblings, int rank)
{
    u64 value = 0;
    for (int offset = 0; offset <= rank; ++offset)
        value += choose_small(siblings, offset) * core[rank - offset];
    return value;
}

static i128 ratio_payment_margin(u64 a, u64 b, u64 d, u64 e, u64 f)
{
    i128 q4 = 8 * (i128)e * e - (i128)d * e - 10 * (i128)d * f;
    i128 cross_difference = (i128)b * d - (i128)a * e;
    i128 cross =
        (i128)a * d * e * (a + d + 2 * e)
        + 2 * (i128)a * a * e * e
        - 50 * cross_difference * cross_difference;
    i128 payment = 6 * (i128)a * (a + d) * q4 + cross;
    i128 target = (i128)a * d * e * (a + d);
    return payment - target;
}

static void print_i128(i128 value)
{
    if (value == 0)
    {
        putchar('0');
        return;
    }
    if (value < 0)
    {
        putchar('-');
        value = -value;
    }
    char digits[64];
    int length = 0;
    while (value > 0)
    {
        digits[length++] = (char)('0' + value % 10);
        value /= 10;
    }
    while (length--) putchar(digits[length]);
}

static void report_scan(void)
{
    u64 total_trees = 0, total_roots = 0, total_negative = 0;
    puts("order,siblings,trees,roots,negative,min_margin,witness_tree,witness_root,a,b,d,e,f");
    for (int order = 1; order <= MAX_ORDER; ++order)
    {
        int siblings = 26 - order;
        printf("%d,%d,%llu,%llu,%llu,", order, siblings,
               tree_counts[order], root_counts[order], negative_counts[order]);
        print_i128(minimum_margin[order]);
        printf(",%llu,%d,%llu,%llu,%llu,%llu,%llu\n",
               witness_tree[order], witness_root[order],
               witness_window[order][0], witness_window[order][1],
               witness_window[order][2], witness_window[order][3],
               witness_window[order][4]);
        total_trees += tree_counts[order];
        total_roots += root_counts[order];
        total_negative += negative_counts[order];
    }
    printf("TOTAL,,, %llu,%llu,%llu\n", total_trees, total_roots, total_negative);
    puts(total_negative == 0
         ? "PASS_EXACT_RANK5_RATIO_PAYMENT_ORDER28_SMALL_CORES"
         : "FAIL_RANK5_RATIO_PAYMENT_ORDER28_SMALL_CORES");
}

void scan_ratio_payment(FILE *output, int parent[], int order)
{
    (void)output;
    if (!registered)
    {
        if (atexit(report_scan) != 0) abort();
        registered = 1;
    }
    current_order = order;
    memset(adjacency, 0, sizeof(adjacency));
    memset(done, 0, sizeof(done));
    memset(msg_excluded, 0, sizeof(msg_excluded));
    memset(msg_total, 0, sizeof(msg_total));
    for (int vertex = 2; vertex <= order; ++vertex)
    {
        int ancestor = parent[vertex];
        adjacency[vertex][ancestor] = 1;
        adjacency[ancestor][vertex] = 1;
    }
    message(1, 0);
    u64 core[LIMIT + 1];
    memcpy(core, msg_total[1][0], sizeof(core));
    int siblings = 26 - order;
    u64 d = smoothed(core, siblings, 3);
    u64 e = smoothed(core, siblings, 4);
    u64 f = smoothed(core, siblings, 5);
    u64 tree_index = tree_counts[order]++;

    for (int root = 1; root <= order; ++root)
    {
        u64 deleted[LIMIT + 1] = {1, 0, 0, 0, 0, 0};
        u64 temporary[LIMIT + 1];
        for (int neighbor = 1; neighbor <= order; ++neighbor)
        {
            if (!adjacency[root][neighbor]) continue;
            message(neighbor, root);
            poly_mul(deleted, msg_total[neighbor][root], temporary);
            memcpy(deleted, temporary, sizeof(temporary));
        }
        u64 a = e + deleted[3];
        u64 b = f + deleted[4];
        i128 margin = ratio_payment_margin(a, b, d, e, f);
        ++root_counts[order];
        if (margin < 0) ++negative_counts[order];
        if (!minimum_set[order] || margin < minimum_margin[order])
        {
            minimum_set[order] = 1;
            minimum_margin[order] = margin;
            witness_tree[order] = tree_index;
            witness_root[order] = root;
            witness_window[order][0] = a;
            witness_window[order][1] = b;
            witness_window[order][2] = d;
            witness_window[order][3] = e;
            witness_window[order][4] = f;
        }
    }
}
