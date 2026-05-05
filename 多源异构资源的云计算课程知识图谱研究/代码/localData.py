import csv

with open("E:/pytorch/filter/newwords.txt", "r", encoding="UTF-8") as f:
    keywords = []
    for line in f:
        keywords.append(line.strip())

with open('E:/pytorch/filter/equal.csv', 'r', encoding="UTF-8") as f:
    equal = [line.strip('\n').split(',') for line in f]
    should_equal = []
    for w in equal:
        for i in w[1:]:
            if i != '':
                keywords.append(i)

    print(keywords)

with open("my_result.txt", "r", encoding="UTF-8") as f:
    res = []
    for line in f:
        res.append(line.replace('<a>', '').replace('</a>', '').strip().split('\t'))

with open("result_localData.csv", "w", newline='', encoding="UTF-8") as f, open("result_localData_to_neo4j.csv", "w",
                                                                                newline='',
                                                                                encoding="UTF-8") as f_neo:
    writer = csv.writer(f)
    writer_neo = csv.writer(f_neo)
    texts =[]
    for r in res:
        # #  简单的知识融合，中英文替换
        # for word in should_equal:
        #     if word in r[0] or word in r[2]:  # 判断端点是否在应该被融合的列表里
        #         for w in equal:
        #             for i in w[1:]:
        #                 if r[0] == i:
        #                     r[0] = w[0]
        #                 if r[2] == i:
        #                     r[2] = w[0]
        #  端点包含字典里的词汇则归结于字典中的词汇
        for keyword in keywords:
            if keyword == r[0] or keyword == r[2]:
                writer.writerow(r)
                print(r)
                break

        if r[0] in keywords and r[2] in keywords and r[0] != r[2]:
            writer_neo.writerow(r)
            texts.append(r)

print(texts)