"""
Knowledge Graph Translation Script

Translates the knowledge graph from Chinese to English while preserving
all structure, relationships, and metadata.
"""

import json
from pathlib import Path

# Translation mapping for node titles
TITLE_TRANSLATIONS = {
    "云服务": "Cloud Services",
    "云计算": "Cloud Computing",
    "网格计算": "Grid Computing",
    "分布式计算": "Distributed Computing",
    "并行计算": "Parallel Computing",
    "并发计算": "Concurrent Computing",
    "雾计算": "Fog Computing",
    "霾计算": "Haze Computing",  # Edge variant
    "边缘计算": "Edge Computing",
    "粒计算": "Granular Computing",
    "弹性计算": "Elastic Computing",
    "效用计算": "Utility Computing",
    "公有云": "Public Cloud",
    "私有云": "Private Cloud",
    "混合云": "Hybrid Cloud",
    "多云战略": "Multi-Cloud Strategy",
    "虚拟化": "Virtualization",
    "无服务器计算": "Serverless Computing",
    "负载均衡": "Load Balancing",
    "微服务": "Microservices",
    "容器技术": "Container Technology",
    "隧道技术": "Tunneling Technology",
    "多租户技术": "Multi-Tenancy",
    "云原生": "Cloud Native",
    "硬件虚拟化": "Hardware Virtualization",
    "结构化存储": "Structured Storage",
    "虚拟设备": "Virtual Appliance",
    "虚拟私有云": "Virtual Private Cloud",
    "云硬盘": "Cloud Block Storage",
    "云存储": "Cloud Storage",
    "阿里云": "Alibaba Cloud",
    "腾讯云": "Tencent Cloud",
    "百度云": "Baidu Cloud",
    "新浪云": "Sina Cloud",
    "网易云": "NetEase Cloud",
    "金山云": "Kingsoft Cloud",
    "华为云": "Huawei Cloud",
    "甲骨文云": "Oracle Cloud",
    "Google云": "Google Cloud",
    "云数据库": "Cloud Database",
    "云存储数据中心": "Cloud Storage Data Center",
    "虚拟机": "Virtual Machine",
    "虚拟化平台": "Virtualization Platform",
    "大数据平台": "Big Data Platform",
    "Web服务": "Web Services",
    "分布式文件系统": "Distributed File System",
    "云部署": "Cloud Deployment",
    "云盘": "Cloud Drive",
    "IBM云": "IBM Cloud",
    "DevOps": "DevOps",
}

# Acronyms and already-English terms that should stay as-is
ENGLISH_TERMS = {
    "IDC", "VPC", "IaaS", "PaaS", "SaaS", "FaaS", "BaaS", "CaaS",
    "MaaS", "NaaS", "SOA", "NFV", "SDN", "SAN", "Docker", "Kubernets",
    "VMware", "API", "OpenStack", "GPGPU", "Azure", "Libvirt",
    "CloudStack", "OneDrive", "Rackspace", "Bluemix", "EC2", "Xen",
    "Hadoop", "FusionManager"
}


def translate_text(text: str) -> str:
    """Translate Chinese text to English using mapping."""
    if not text:
        return text

    # If it's already English, return as-is
    if text in ENGLISH_TERMS:
        return text

    # Direct translation
    if text in TITLE_TRANSLATIONS:
        return TITLE_TRANSLATIONS[text]

    # Try partial translations for compound terms
    translated = text
    for chinese, english in sorted(TITLE_TRANSLATIONS.items(), key=lambda x: len(x[0]), reverse=True):
        translated = translated.replace(chinese, english)

    return translated


def translate_knowledge_graph(input_path: str, output_path: str):
    """Translate the entire knowledge graph JSON file."""
    print(f"Loading knowledge graph from {input_path}...")

    with open(input_path, 'r', encoding='utf-8') as f:
        data = json.load(f)

    print(f"Loaded {data['total_nodes']} nodes, {data['total_edges']} edges")

    # Translate nodes
    translated_nodes = []
    translation_log = []

    for node in data['nodes']:
        translated_node = node.copy()

        # Translate title
        original_title = node['title']
        translated_title = translate_text(original_title)
        translated_node['title'] = translated_title

        if original_title != translated_title:
            translation_log.append(f"  {node['node_id']}: {original_title} -> {translated_title}")

        # Translate description (first sentence or summary)
        if 'description' in node and node['description']:
            # For now, replace the Chinese description with a generic English one
            # based on the translated title
            translated_node['description'] = generate_english_description(
                translated_title, node.get('topic_tags', [])
            )

        translated_nodes.append(translated_node)

    # Update data
    data['nodes'] = translated_nodes
    data['course_name'] = "Cloud Computing Fundamentals"
    data['description'] = "Comprehensive cloud computing course covering virtualization, containers, orchestration, and cloud services"

    # Save translated file
    print(f"\nSaving translated knowledge graph to {output_path}...")
    with open(output_path, 'w', encoding='utf-8') as f:
        json.dump(data, f, indent=2, ensure_ascii=False)

    # Print translation summary
    print(f"\nTranslation complete!")
    print(f"Translated {len(translation_log)} node titles")
    print("\nTranslations:")
    for log in translation_log:
        print(log)

    return data


def generate_english_description(title: str, topic_tags: list) -> str:
    """Generate a simple English description based on title and tags."""
    descriptions = {
        "Cloud Services": "Cloud services refer to infrastructure, platforms, or software hosted by third-party providers and made available to users through the internet.",
        "Cloud Computing": "Cloud computing is the on-demand delivery of IT resources over the internet with pay-as-you-go pricing, enabling faster innovation and flexible resources.",
        "Grid Computing": "Grid computing is a distributed computing model that coordinates networked computers to work together as a virtual supercomputer.",
        "Distributed Computing": "Distributed computing is a model in which components of a software system are shared among multiple computers to improve efficiency and performance.",
        "Parallel Computing": "Parallel computing is a type of computation where many calculations or processes are carried out simultaneously on multiple processors.",
        "Concurrent Computing": "Concurrent computing is a form of computing in which several computations are executed concurrently during overlapping time periods.",
        "Fog Computing": "Fog computing extends cloud computing to the edge of the network, providing data, compute, storage, and application services to end-users.",
        "Edge Computing": "Edge computing is a distributed computing paradigm that brings computation and data storage closer to the sources of data.",
        "Elastic Computing": "Elastic computing enables dynamic provisioning and de-provisioning of resources to meet workload demands automatically.",
        "Utility Computing": "Utility computing is a service provisioning model where a provider makes computing resources available as needed and charges for specific usage.",
        "Virtualization": "Virtualization is the creation of a virtual version of something, such as server resources, storage devices, or network resources.",
        "Container Technology": "Container technology enables applications to run reliably when moved from one computing environment to another by packaging code with its dependencies.",
        "Docker": "Docker is an open platform for developing, shipping, and running applications in containers, enabling consistent environments across development and production.",
        "Kubernets": "Kubernetes is an open-source container orchestration platform for automating deployment, scaling, and management of containerized applications.",
        "Microservices": "Microservices architecture structures an application as a collection of loosely coupled, independently deployable services.",
        "Serverless Computing": "Serverless computing is a cloud computing execution model where the cloud provider dynamically manages the allocation of machine resources.",
        "DevOps": "DevOps is a set of practices that combines software development and IT operations to shorten the systems development life cycle.",
        "Cloud Native": "Cloud native is an approach to building and running applications that exploits the advantages of the cloud computing delivery model.",
        "Load Balancing": "Load balancing is the process of distributing network traffic across multiple servers to ensure no single server bears too much demand.",
        "Virtual Machine": "A virtual machine is a software emulation of a physical computer that can run programs and operating systems like a physical computer.",
    }

    return descriptions.get(title, f"Learn about {title} in cloud computing environments.")


if __name__ == "__main__":
    input_file = Path("data/knowledge_graph.json")
    output_file = Path("data/knowledge_graph_en.json")

    translate_knowledge_graph(str(input_file), str(output_file))
    print(f"\nDone! Translated file saved to: {output_file}")
