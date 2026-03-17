#!/usr/bin/env python3
# coding: utf-8
# File: chatbot_graph.py
# Author: lhy<lhy_in_blcu@126.com,https://huangyong.github.io>
# Date: 18-10-4

# 导入词汇归一化函数（注意文件名要和你保存的一致）
from vocab_normalizer import normalize_medical_terms

from question_classifier import *
from question_parser import *
from answer_search import *

'''问答类'''
class ChatBotGraph:
    def __init__(self):
        self.classifier = QuestionClassifier()
        self.parser = QuestionPaser()
        self.searcher = AnswerSearcher()

    def chat_main(self, sent):
        answer = '您好，我是小勇医药智能助理，希望可以帮到您。如果没答上来，可联系https://liuhuanyong.github.io/。祝您身体棒棒！'

        # ===== 新增：词汇归一化核心代码 =====
        # 对用户输入的原始问题进行词汇归一化处理
        normalized_sent = normalize_medical_terms(sent)
        # ==================================

        # 使用归一化后的文本进行意图分类（替换原有的sent）
        res_classify = self.classifier.classify(normalized_sent)
        if not res_classify:
            return answer
        # 归一化后的文本已用于分类，后续解析和检索基于分类结果，逻辑保持一致
#         res_sql = self.parser.parser_main(res_classify)place("急急腹泻", "急性腹泻").replace("在在", "在")
        final_answers = self.searcher.search_main(res_sql)
        if not final_answers:
            return answer
        else:
             # 新增：格式化回答（去重、去多余空格、修正明显错别字）
                formatted_answers = []
                for ans in final_answers:
                    # 替换常见错别字
                    ans = ans.replace("蔓蔓", "蔓延").re
                    # 去多余空格和换行
                    ans = ans.strip().replace("  ", " ").replace("\n\n", "\n")
                    if ans not in formatted_answers:
                        formatted_answers.append(ans)
            return '\n'.join(final_answers)

if __name__ == '__main__':
    handler = ChatBotGraph()
    while 1:
        question = input('用户:')
        answer = handler.chat_main(question)
        print('小勇:', answer)