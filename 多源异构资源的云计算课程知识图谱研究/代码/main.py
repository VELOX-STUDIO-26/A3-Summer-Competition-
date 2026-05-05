import image
import scrap_baidu
import scrapy_sougou
import filter.filter
import filter.dictionary
import triples_extraction_ltp
import pagerank

if __name__ == '__main__':
    scrap_baidu.run()  # 爬取百度百科
    scrapy_sougou.run()  # 爬取搜狗百科
    filter.filter.run()  # 对文本进行数据清洗
    filter.dictionary.run()  # 对文本进行数据清洗
    triples_extraction_ltp.run()  # 对文本进行三元组抽取
    pagerank.run()  # 进行pagerank算法排名
    image.run()
