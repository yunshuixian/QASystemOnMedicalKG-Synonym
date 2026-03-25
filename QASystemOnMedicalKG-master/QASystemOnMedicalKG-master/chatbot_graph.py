#!/usr/bin/env python3
# coding: utf-8
# File: chatbot_graph.py
# Author: lhy<lhy_in_blcu@126.com,https://huangyong.github.io>
# Date: 18-10-4

# 导入词汇归一化函数（注意：需确保vocab_normalizer.py文件和当前文件同目录）
try:
    from vocab_normalizer import normalize_medical_terms
except ImportError:
    # 备用方案：如果归一化文件不存在，定义空函数避免报错
    def normalize_medical_terms(sent):
        return sent

# 导入问答核心模块（需确保这三个文件同目录）
from question_classifier import QuestionClassifier
from question_parser import QuestionPaser
from answer_search import AnswerSearcher

'''问答核心类'''
class ChatBotGraph:
    def __init__(self):
        # 初始化分类、解析、检索模块
        self.classifier = QuestionClassifier()
        self.parser = QuestionPaser()
        self.searcher = AnswerSearcher()

    def chat_main(self, sent):
        """
        核心问答逻辑
        :param sent: 用户原始问题
        :return: 格式化后的回答
        """
        # ✅ 通用兜底回答（已替换）
        default_answer = '抱歉，我暂时无法回答您的问题，请您更换提问方式或咨询其他相关内容，我会尽力为您解答。'

        # 1. 词汇归一化：统一医疗术语表述
        normalized_sent = normalize_medical_terms(sent)

        # 2. 问题分类：识别用户问题意图
        res_classify = self.classifier.classify(normalized_sent)
        if not res_classify:  # 分类失败，返回兜底回答
            return default_answer

        # 3. 问题解析：生成检索用的SQL/检索条件
        res_sql = self.parser.parser_main(res_classify)
        if not res_sql:  # 解析失败，返回兜底回答
            return default_answer

        # 4. 答案检索：从知识库获取答案
        final_answers = self.searcher.search_main(res_sql)
        if not final_answers:  # 无匹配答案，返回兜底回答
            return default_answer

        # 5. 答案格式化：去重、纠错、清理格式
        formatted_answers = []
        for ans in final_answers:
            # 修正常见错别字
            ans = ans.replace("蔓蔓", "蔓延")\
                     .replace("急急腹泻", "急性腹泻")\
                     .replace("在在", "在")
            # 清理多余空格/换行
            ans = ans.strip().replace("  ", " ").replace("\n\n", "\n")
            # 去重
            if ans not in formatted_answers:
                formatted_answers.append(ans)

        # 6. 返回拼接后的最终回答
        return '\n'.join(formatted_answers)

# ========== 新增Flask接口（适配前端调用） ==========
from flask import Flask, request, jsonify
from flask_cors import CORS  # 解决前端跨域问题

# 初始化Flask应用
app = Flask(__name__)
CORS(app)  # 允许所有跨域请求
chat_bot = ChatBotGraph()  # 初始化问答机器人

# ✅ 这里也替换成通用版本
default_answer = '抱歉，我暂时无法回答您的问题，请您更换提问方式或咨询其他相关内容，我会尽力为您解答。'

@app.route('/api/qa', methods=['POST'])
def get_qa_answer():
    """
    前端调用的问答接口
    """
    try:
        data = request.get_json()

        if not data or 'question' not in data:
            return jsonify({
                'code': 400,
                'msg': '请输入有效的问题',
                'answer': ''
            })

        user_question = data['question'].strip()
        if not user_question:
            return jsonify({
                'code': 400,
                'msg': '问题不能为空',
                'answer': ''
            })

        # 调用问答核心逻辑
        answer = chat_bot.chat_main(user_question)

        return jsonify({
            'code': 200,
            'msg': 'success',
            'answer': answer
        })

    except Exception as e:
        return jsonify({
            'code': 500,
            'msg': f'服务器错误：{str(e)}',
            'answer': default_answer
        })

if __name__ == '__main__':
    print("model init finished ......")
    print("问答接口已启动：http://localhost:5000/api/qa")
    app.run(host='0.0.0.0', port=5000, debug=True)