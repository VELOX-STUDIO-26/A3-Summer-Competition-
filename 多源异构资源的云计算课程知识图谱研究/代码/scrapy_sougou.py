import json
import time

import requests, threading, re
from lxml import etree

header = {
    "user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/111.0.0.0 "
                  "Safari/537.36 Edg/111.0.1661.54 ",
    'Accept': 'image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8',
    'Accept-Encoding': 'gzip, deflate, br',
    'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8,en-GB;q=0.7,en-US;q=0.6',
    'Connection': 'keep-alive'
}


def get_page_url_tail(key: str):
    url = "https://baike.sogou.com/bapi/searchBarEnter?searchText="
    res = requests.get("%s%s" % (url, key), headers=header)
    url_tail = res.content.decode('utf-8')

    return url_tail


def get_page(key: str):
    url = "https://baike.sogou.com"
    url_tail = get_page_url_tail(key)
    if "sp=0" in url_tail:
        print(key + "未找到")
        return []
    page_url = "%s%s" % (url, url_tail)
    res = requests.get(page_url, headers=header)
    html = etree.HTML(res.content)
    more_info = html.xpath('//script/text()')
    pattern = re.compile(r"window.lemmaData=(.*?);$", re.MULTILINE | re.DOTALL)
    data_str = pattern.search(more_info[0]).group(1)

    # print(data_str)
    json1 = list(json.loads(data_str)['paragraph'].values())[0]
    # print(json1)
    content = ""
    for i in json1:
        try:
            content = "%s%s" % (content, i['content'])
        except:
            pass
    html2 = etree.HTML(content)
    detail1 = html2.xpath('//text()')
    detail2 = html.xpath('//p/text()')
    del detail2[-1]
    full_content = "".join(detail2 + detail1)
    full_content = re.sub("\（.*?\）", '', full_content)
    full_content = re.sub("\(.*?\)", '', full_content)
    # print(full_content)
    result = full_content.split("。")
    # print(result)
    return result


def write_txt(search_list: list):
    for key in search_list:
        result = get_page(key)
        with open("txt/%s_sougou.txt" % key, 'w+', encoding='utf-8') as f:
            for i in result:
                f.write(i + "。\n")


def run():
    print("开始爬取搜狗百科")
    with open("filter/newwords.txt", "r", encoding="UTF-8") as f, open('filter/equal.csv', 'r', encoding="UTF-8") as e:
        search_dict = []
        for line in f:
            search_dict.append(line.strip())
        # 因为搜狗的网页构造，所以讲同义词也加入搜索
        words = [line.strip('\n').split(',') for line in e]
        for w in words:
            for i in w[1:]:
                if i != '':
                    search_dict.append(i)
        print(search_dict)

    # for i in search_list:
    #     # try:
    #         print(get_page(i))
    # except:
    #     print(i)
    # except:
    #     print(m)
    # time.sleep(1)
    search_dict1 = search_dict[0:int(len(search_dict) / 4)]
    search_dict2 = search_dict[int(len(search_dict) / 4):int(len(search_dict) / 2)]
    search_dict3 = search_dict[int(len(search_dict) / 2):int(len(search_dict) * 3 / 4)]
    search_dict4 = search_dict[int(len(search_dict) * 3 / 4):]

    thread1 = threading.Thread(name='t1', target=write_txt, args=(search_dict1,))
    thread2 = threading.Thread(name='t2', target=write_txt, args=(search_dict2,))
    thread3 = threading.Thread(name='t3', target=write_txt, args=(search_dict3,))
    thread4 = threading.Thread(name='t4', target=write_txt, args=(search_dict4,))

    thread1.start()
    thread2.start()
    thread3.start()
    thread4.start()
