import json
import re

# ====================== 配置项（仅需改这里） ======================
# 词典文件路径：改成你实际的文件路径，JSON格式用这个，TXT格式注释掉这行，打开下面TXT的行
DICT_PATH = "./dict/synonym.json"
# DICT_PATH = "./dict/synonym.txt"  # 如果用TXT格式，打开这行，注释上面JSON的行

# ====================== 第一步：加载同义词词典 ======================
def load_synonym_dict():
    """加载同义词词典，返回：标准词到同义词的映射 + 所有同义词到标准词的反向映射"""
    # 正向映射：{标准词: [同义词1, 同义词2...]}
    forward_dict = {}
    # 反向映射：{同义词: 标准词}（用于快速匹配替换）
    reverse_dict = {}

    # 读取JSON格式词典
    if DICT_PATH.endswith(".json"):
        with open(DICT_PATH, "r", encoding="utf-8") as f:
            forward_dict = json.load(f)
    # 读取TXT格式词典
    elif DICT_PATH.endswith(".txt"):
        with open(DICT_PATH, "r", encoding="utf-8") as f:
            for line in f:
                line = line.strip()
                if not line:  # 跳过空行
                    continue
                # 按|分割，第一个是标准词，后面是同义词
                parts = line.split("|")
                standard_word = parts[0].strip()
                synonyms = [p.strip() for p in parts[1:] if p.strip()]
                forward_dict[standard_word] = synonyms

    # 构建反向映射（包含模糊匹配的变体，比如“急性心梗”也能匹配）
    for standard_word, synonyms in forward_dict.items():
        # 先把标准词自己也加入反向映射（避免替换掉标准词）
        reverse_dict[standard_word] = standard_word
        # 遍历所有同义词，加入反向映射
        for syn in synonyms:
            reverse_dict[syn] = standard_word

    return forward_dict, reverse_dict

# 加载词典（程序启动时执行一次即可，不用重复加载）
forward_dict, reverse_dict = load_synonym_dict()

# ====================== 第二步：词汇归一化（核心替换逻辑） ======================
def normalize_medical_terms(user_query):
    """
    词汇归一化：把用户提问中的同义词替换成标准词
    :param user_query: 用户原始提问（比如“最近总拉肚子是不是肠胃炎？”）
    :return: 替换后的标准提问（比如“最近总腹泻是不是肠胃炎？”）
    """
    if not user_query:
        return ""

    # 步骤1：提取所有可能的医疗词汇（模糊匹配，优先匹配长词，避免“心梗”先匹配，导致“急性心梗”漏匹配）
    # 把所有同义词+标准词按长度从长到短排序，避免短词先匹配
    all_terms = sorted(reverse_dict.keys(), key=lambda x: len(x), reverse=True)
    # 步骤2：遍历所有词汇，替换用户提问中的同义词为标准词
    normalized_query = user_query
    for term in all_terms:
        if term in normalized_query:
            # 用正则替换（全局替换，不区分位置）
            normalized_query = re.sub(re.escape(term), reverse_dict[term], normalized_query)

    return normalized_query

# ====================== 第三步：测试示例（可删除） ======================
if __name__ == "__main__":
    # 测试用例1：基础替换
    user_question1 = "最近总拉肚子是不是肠胃炎？"
    normalized1 = normalize_medical_terms(user_question1)
    print(f"原始提问：{user_question1}")
    print(f"归一化后：{normalized1}")  # 输出：最近总腹泻是不是肠胃炎？

    # 测试用例2：模糊匹配（急性心梗）
    user_question2 = "急性心梗需要马上送医院吗？"
    normalized2 = normalize_medical_terms(user_question2)
    print(f"\n原始提问：{user_question2}")
    print(f"归一化后：{normalized2}")  # 输出：急性心肌梗死需要马上送医院吗？

    # 测试用例3：多词替换
    user_question3 = "发烧拉肚子是不是急性肠胃炎？"
    normalized3 = normalize_medical_terms(user_question3)
    print(f"\n原始提问：{user_question3}")
    print(f"归一化后：{normalized3}")  # 输出：发热腹泻是不是急性肠胃炎？