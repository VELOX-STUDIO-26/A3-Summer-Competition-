# 示例代码
import imageio
from wordcloud import WordCloud
from PIL import Image
import numpy as np
import matplotlib.pyplot as plt
import jieba


def run():
    # 打开文本
    with open('pagerank.csv', 'r', encoding="UTF-8") as f:
        s = [line.strip('\n').split(',') for line in f]
        print(s)
        sentence = ""
        for i in s:
            sentence = sentence + i[1] + " "
        print(sentence)

    mask = imageio.imread("cloud_base.png")
    word = WordCloud(background_color="white", \
                     width=1050, \
                     height=840,
                     font_path='simhei.ttf',
                     mask=mask,
                     scale=4
                     ).generate(sentence)

    word.to_file('cloud.png')
    img = Image.open('cloud.png')
    img.show()
