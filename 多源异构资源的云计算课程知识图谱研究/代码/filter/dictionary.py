import csv
def run():
    # 定义关键词列表
    with open("E:/pytorch/filter/newwords.txt", "r", encoding="UTF-8") as f:
        keywords = []
        for line in f:
            keywords.append(line.strip())

    # 关键词中加入同义词
    with open('E:/pytorch/filter/equal.csv', 'r', encoding="UTF-8") as f:
        words = [line.strip('\n').split(',') for line in f]
        for w in words:
            for i in w[1:]:
                if i != '':
                    keywords.append(i)
        print(keywords)

        # 定义要过滤的句子
        with open("brevity.txt", "r", encoding="UTF-8") as f:
            sentences = []
            for line in f:
                sentences.append(line.strip())

        with open("brevity.txt", "w", newline='', encoding='UTF-8') as f:
            # 判断句子中是否包含关键词
            for sentence in sentences:
                for keyword in keywords:
                    if keyword in sentence:
                        # 如果句子中包含关键词，则保留句子
                        f.writelines(str(sentence + '\n'))
                        print(sentence + " key:" + keyword)
                        break
                    else:
                        # 如果句子中不包含关键词，则过滤句子
                        pass
