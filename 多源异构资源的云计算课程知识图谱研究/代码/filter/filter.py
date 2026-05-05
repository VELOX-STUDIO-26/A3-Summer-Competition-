# -*- coding: utf-8 -*-
import csv

from snownlp import SnowNLP
import jieba.posseg as pseg
import re
import os
import jieba


def readFolder(url):
    '''
    访问文件夹中的每个文件
    url: address
    return: 文件名list
    '''
    path = url  # 文件夹目录
    files = os.listdir(path)  # 得到文件夹下的所有文件名称
    txts = []
    for file in files:  # 遍历文件夹
        if os.path.splitext(file)[1] == '.txt':
            position = path + '\\' + file  # 构造绝对路径，"\\"，其中一个'\'为转义符
            # print(position)
            txts.append(position)
    return txts


def preTrain(input, filepath):
    '''
    文本清洗：文本清洗简单的说就是将特殊符号、多余的空白、繁体转化为简体等去除。
    '''
    # 用不上的，但还有一些意义

    # 寡去重复词
    # cur = input[0]
    # output = ""
    # for i in range(1, len(input)):
    #     pre = cur
    #     cur = input[i]
    #     if(pre != cur):
    #         output = output + pre

    # 寡去除停用词。例如“的”，“啊”，“呢”，“呃”等。
    # 停用词表中还可以增加特殊字符，这样就顺便解决了去特殊符号的问题(但是用于切分句子的特殊符号被去掉了会影响下一步的观点抽取，所以把所有的特殊符号都变成‘ ’即可）
    # Bert 词典里面已经去除了停用词了，所以没必要再处理了。

    # 因为去停用词和去重复词都需要遍历句子，所以可以合并

    # 单一停用词词典
    # filepath = u'data\\stopwords.txt'
    # stopword = [line.strip() for line in open(filepath, 'r', encoding='utf8').readlines()]  # 以行的形式读取停用词表，同时转换为列表

    # 所有停用词词典的并集
    # filespath = readFolder(u'data')
    # stopword = []
    # for filepath in filespath:
    #     for line in open(filepath, 'r', encoding='utf8').readlines():
    #         stopword.append(line.strip())

    # 寡去除特殊符号
    input = re.sub(r"[0-9\s+\.\!\/_,\-.$%^*()?;；：:【】《》+\"\'+\[+\]]+|[+——！，;:。？、“”~@#￥%……&*（）]+", "", str(input))
    if input == '':
        return ''
    # 繁体转简体
    input = SnowNLP(input).han

    # 单一停用词词典
    filepath = "E:/pytorch/filter/data/stopwords2.txt"
    stopword = [line.strip() for line in open(filepath, 'r', encoding='utf8').readlines()]  # 以行的形式读取停用词表，同时转换为列表

    cur = input[0]
    output = []
    word_list = list(jieba.cut(input, cut_all=False))
    for word in word_list:
        if word not in stopword:
            output.append(word)
    return output


# 删除停用词

# # 从当前目录回退到'yuyue-project'目录下
# url=os.getcwd()
# while os.path.split(url)[-1] != 'yuyue-project':
#     url = list(os.path.split(url))[0]
#
# # path=url + '\\filter\\data\\'

def delStopWords(input, path):
    # print(path)
    file = os.path.normpath(path + 'stopwords2.txt')
    return preTrain(input, file)


# 删除模糊词
def delFuzzyWord(input, path):
    file = path + 'fuzzyword.txt'
    return preTrain(input, file)


# 注意如果用windows运行程序的话，要加if __name__ == '__main__':才能正常运行
def run():
    print("开始数据清洗")
    print(os.getcwd())
    url = os.path.normpath(__file__ + '\\..\\data\\')

    path = r"E:\pytorch\txt"  # 文件夹目录
    files = os.listdir(path)  # 得到文件夹下的所有文件名称

    texts = []
    for file in files:  # 遍历文件夹
        position = path + '\\' + file  # 构造绝对路径，"\\"，其中一个'\'为转义符
        print(position)
        with open(position, "r", encoding='UTF-8') as f:  # 打开文件
            for line in f:
                texts.append(line.strip())

    with open("brevity.txt", "w", newline='', encoding='UTF-8') as f:
        for text in texts:
            # words = pseg.cut(text)
            print(text)
            # for w in words:
            #     print(w.word + " " + w.flag)  # 列出词与标记
            text = ''.join(delStopWords(text, path=url))  # 停用词
            print(text)
            f.writelines(str(text + '\n'))
            # words = pseg.cut(text)
            # for w in words:
            #     print(w.word + " " + w.flag)
