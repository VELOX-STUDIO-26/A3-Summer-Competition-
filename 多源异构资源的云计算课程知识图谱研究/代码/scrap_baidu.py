import requests, threading, re
from lxml import etree


def scrapy_page(key: str, is_jp: bool):
    if is_jp == True:
        url = "https://baike.baidu.com%s" % key
    else:
        url = "https://baike.baidu.com/item/%s" % key
    res = requests.get(url)
    html = etree.HTML(res.content.decode('utf-8'))
    content = [i.strip() for i in html.xpath('//div[@class="para"]/text()')]
    page_content = ''.join(content)
    page_content = re.sub("\（.*?\）", '', page_content)
    page_content = re.sub("\(.*?\)", '', page_content)
    result = page_content.split("。")
    # print(res.content.decode('utf-8'))
    return result


def check_ploysetmant_word(target_list: list):
    print(target_list)
    for key in target_list:
        res = requests.get(
            "https://baike.baidu.com/item/%s" % key)
        html = etree.HTML(res.content.decode('utf-8'))
        check_tag = html.xpath('//a[@class="J-polysemant-word"]/text()')
        if len(check_tag) == 0:
            result = scrapy_page(key, False)

        else:
            jump_to = html.xpath('//div[@class="para"]/a[@target="_blank"]/@href')
            # print(jump_to)
            result = scrapy_page(jump_to[0], True)

        with open("txt/%s.txt" % key, 'w+', encoding='utf-8') as f:
            for i in result:
                f.write(i + "\n")


def run():
    # search_dict = ['云计算', '即服务', '内容即服务', '数据即服务', '桌面虚拟化', '函数即服务', '基础设施即服务',
    #                '平台集成即服务', '移动后端即服务', '网络即服务', '平台即服务',
    #                '安全即服务', '软件即服务', '云数据库', '云存储', '数据中心', '分布式云文件系统', '硬件虚拟化',
    #                '互联网', '原生云程序', '计算机网络', '安全性',
    #                '结构化存储', '虚拟设备', '网络API', '虚拟私有云', '应用程序', 'Box', 'Dropbox', 'Google',
    #                'Workspace', '云硬盘', 'HP云',
    #                'IBM云', '微软', 'Microsoft 365', 'OneDrive', '甲骨文云', 'Rackspace', 'Salesforce', 'Workday',
    #                'Zoho',
    #                '平台', '阿里云', '腾讯云', '百度云', '新浪云', '网易云', '金山云', '华为云', '明源云',
    #                '搜狗云输入法', '亚马逊', 'AppScale', 'Box',
    #                'Bluemix', 'CloudBolt', '云铸造', '可卡因', 'Creatio', '引擎工厂', 'Helion', 'GE Predix',
    #                'Google App Engine',
    #                'GreenQloud', 'Heroku', 'IBM云', 'Inktank', 'Jelastic', 'Mendix', 'Microsoft Azure', 'MindSphere',
    #                'Netlify', '甲骨文云', 'OutSystems', 'openQRM', 'OpenShift', 'PythonAnywhere', 'RightScale', 'Scalr',
    #                'Force.com', 'SAP云平台', 'VCloud Air', 'WaveMaker', '基础设施', '阿里云', '亚马逊云计算服务',
    #                'Abiquo企业版',
    #                'CloudStack', 'Citrix云', 'CtrlS', 'DigitalOcean', 'EMC Atmos', 'Eucalyptus', '富士通', 'GoGrid',
    #                'Google云平台', 'GreenButton', 'GreenQloud', 'IBM云', 'iland', 'Joyent', 'Linode', 'Lunacloud',
    #                'Microsoft Azure', 'Mirantis', 'Netlify', 'Nimbula', 'Nimbus', 'OpenIO', 'OpenNebula', 'OpenStack',
    #                '甲骨文云', 'OrionVM', 'Rackspace云', 'Safe Swiss云', 'SoftLayer', 'Zadara Storage', 'Libvirt',
    #                'Libguestfs', 'OVirt', 'Virtual Machine Manager', 'Wakame-vdc', 'VCloud Air', '分类', '并行计算',
    #                '并发计算',
    #                '分布式计算', '并行计算', '大规模并行处理机', '云计算', '高性能计算', '多元处理',
    #                '大规模多核心处理器', 'GPGPU', '计算机网络', 'Systolic array',
    #                '比特', '指令', '线程', '任务', '数据', '内存', '循环', '流水线', '多线程', '时间', '同时多线程',
    #                '投机', '抢占式', '协作', '集群多线程',
    #                '硬件侦测', 'PRAM模型', '并行算法分析', '阿姆达尔定律', "Gustafson's law", 'Cost efficiency',
    #                'Karp–Flatt metric',
    #                '减速', '加速比', '行程', '线程', '纤程', '指令窗口', '多元处理', '内存一致性', '缓存一致性',
    #                '高速缓存失效', '屏障', '同步', '应用程序检查点',
    #                '编程', '流处理', '数据流处理', '模型', '隐式并行', '显式并行', '并发性', '非阻塞算法', '硬件',
    #                '费林分类法', '单指令流单数据流', '单指令流多数据流',
    #                '单指令多线程', '多指令流单数据流', '多指令流多数据流', '数据流架构', '指令流水线', '超标量',
    #                '并行向量处理机', '多处理器', '对称', '非对称', '内存',
    #                '共享', '分布式内存', '分布式共享', 'UMA', 'NUMA', 'COMA', '大规模并行处理机', '计算机集群',
    #                '网格计算', 'API', 'Ateji PX',
    #                'Boost.Thread', 'Charm++', 'Cilk', 'Coarray Fortran', 'CUDA', 'Dryad', 'C++ AMP', 'Global Arrays',
    #                'MPI', 'OpenMP', 'OpenCL', 'HMPP开放标准', 'OpenACC', 'TPL', 'PLINQ', '并行虚拟机', 'POSIX线程',
    #                'RaftLib',
    #                'UPC', 'TBB', '软件闭锁', '可缩放性', '竞争危害', '死锁', '活锁', '饥饿', '确定性算法', '并行变慢',
    #                '分类：并行计算', '维基共享资源', '云计算']
    print("开始爬取百度百科")
    with open("filter/newwords.txt", "r", encoding="UTF-8") as f:
        search_dict = []
        for line in f:
            search_dict.append(line.strip())
        print(search_dict)

    search_dict1 = search_dict[0:int(len(search_dict) / 4)]
    search_dict2 = search_dict[int(len(search_dict) / 4):int(len(search_dict) / 2)]
    search_dict3 = search_dict[int(len(search_dict) / 2):int(len(search_dict) * 3 / 4)]
    search_dict4 = search_dict[int(len(search_dict) * 3 / 4):]

    thread1 = threading.Thread(name='t1', target=check_ploysetmant_word, args=(search_dict1,))
    thread2 = threading.Thread(name='t2', target=check_ploysetmant_word, args=(search_dict2,))
    thread3 = threading.Thread(name='t3', target=check_ploysetmant_word, args=(search_dict3,))
    thread4 = threading.Thread(name='t4', target=check_ploysetmant_word, args=(search_dict4,))

    thread1.start()
    thread2.start()
    thread3.start()
    thread4.start()
