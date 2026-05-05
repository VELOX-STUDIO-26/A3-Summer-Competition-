# 输入为一个文件，例如
# A B
# B C
# B A
# ...表示前者指向后者
import csv
import numpy as np


def run():
    # 读入有向图，存储边
    with open('result.csv', 'r', encoding="UTF-8") as f:
        ed = [line.strip('\n').split(',') for line in f]
        print(ed)
        edges = []
        for eds in ed:
            if eds[0] != eds[2]:
                edges.append([eds[0], eds[2]])  # 避免自环
        print(edges)

    # 根据边获取节点的集合
    nodes = []
    for edge in edges:
        if edge[0] not in nodes:
            nodes.append(edge[0])
        if edge[1] not in nodes:
            nodes.append(edge[1])
    print(nodes)

    N = len(nodes)

    # 将节点符号（字母），映射成阿拉伯数字，便于后面生成A矩阵/S矩阵
    i = 0
    node_to_num = {}
    for node in nodes:
        node_to_num[node] = i
        i += 1
    for edge in edges:
        edge[0] = node_to_num[edge[0]]
        edge[1] = node_to_num[edge[1]]
    print(edges)

    # 生成初步的S矩阵
    S = np.zeros([N, N])
    for edge in edges:
        S[edge[1], edge[0]] = 1
    print(S)

    # 计算比例：即一个网页对其他网页的PageRank值的贡献，即进行列的归一化处理
    for j in range(N):
        sum_of_col = sum(S[:, j])
        for i in range(N):
            if sum_of_col != 0:
                S[i, j] /= sum_of_col
            else:
                S[i, j] = 1 / N
    print(S)

    # 计算矩阵A
    alpha = 0.85
    A = alpha * S + (1 - alpha) / N * np.ones([N, N])
    print(A)

    # 生成初始的PageRank值，记录在P_n中，P_n和P_n1均用于迭代
    P_n = np.ones(N) / N
    P_n1 = np.zeros(N)

    e = 100000  # 误差初始化
    k = 0  # 记录迭代次数
    print('loop...')

    while e > 0.00000001:  # 开始迭代
        P_n1 = np.dot(A, P_n)  # 迭代公式
        e = P_n1 - P_n
        e = max(map(abs, e))  # 计算误差
        P_n = P_n1
        k += 1
        print('iteration %s:' % str(k), P_n1)

    print('final result:', P_n)
    # 举例验证
    print('PR最大值为: ', np.max(P_n))
    np.argsort(P_n)
    print(P_n)

    qw = np.argsort(P_n)  # 排序并且返回下标,升序排序，右边最大
    print("各节点的PR值排序为: ")
    print(qw)

    # PR值从高到低打印
    print("PR值从高到低分别为:")
    m = 0

    # 读入字典，在字典里的才输出
    with open("filter/newwords.txt", "r", encoding="UTF-8") as f:
        keywords = []
        for line in f:
            keywords.append(line.strip())

    # 关键词中加入同义词
    with open('filter/equal.csv', 'r', encoding="UTF-8") as f:
        words = [line.strip('\n').split(',') for line in f]
        for w in words:
            for i in w[1:]:
                if i != '':
                    keywords.append(i)

    with open("pagerank.csv", "w", encoding="UTF-8", newline='') as csvfile:
        writer = csv.writer(csvfile)

        for i in range(len(qw)):
            for key in keywords:
                if key == nodes[qw[len(qw) - i - 1]]:
                    writer.writerow([m + 1, nodes[qw[len(qw) - i - 1]],
                                     P_n[qw[len(qw) - i - 1]] * 2000, ])
                    print(m + 1, " ", end="")
                    print(nodes[qw[len(qw) - i - 1]], " ", end="")
                    print(P_n[qw[len(qw) - i - 1]])
            m = m + 1
