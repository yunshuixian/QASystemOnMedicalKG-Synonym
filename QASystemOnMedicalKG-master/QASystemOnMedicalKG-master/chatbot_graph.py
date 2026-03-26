#!/usr/bin/env python3
# coding: utf-8
# File: chatbot_graph.py
# 毕业设计：医疗知识问答系统
# 作者：熊锦帅
# 指导老师：兰伟

# 导入词汇归一化函数
try:
    from vocab_normalizer import normalize_medical_terms
except ImportError:
    def normalize_medical_terms(sent):
        return sent

# 导入问答核心模块
from question_classifier import QuestionClassifier
from question_parser import QuestionPaser
from answer_search import AnswerSearcher

'''问答核心类'''
class ChatBotGraph:
    def __init__(self):
        self.classifier = QuestionClassifier()
        self.parser = QuestionPaser()
        self.searcher = AnswerSearcher()

    def chat_main(self, sent):
        # 通用兜底回答（毕设正式版）
        default_answer = '抱歉，我暂时无法回答您的问题，请您更换提问方式或咨询其他相关内容，我会尽力为您解答。'

        # 1. 文本归一化
        normalized_sent = normalize_medical_terms(sent)

        # 2. 问题分类
        res_classify = self.classifier.classify(normalized_sent)
        if not res_classify:
            return default_answer

        # 3. 语法解析与SQL生成
        res_sql = self.parser.parser_main(res_classify)
        if not res_sql:
            return default_answer

        # 4. 答案检索
        final_answers = self.searcher.search_main(res_sql)
        if not final_answers:
            return default_answer

        # 5. 答案格式化
        formatted_answers = []
        for ans in final_answers:
            ans = ans.replace("蔓蔓", "蔓延")\
                     .replace("急急腹泻", "急性腹泻")\
                     .replace("在在", "在")
            ans = ans.strip().replace("  ", " ").replace("\n\n", "\n")
            if ans not in formatted_answers:
                formatted_answers.append(ans)

        return '\n'.join(formatted_answers)

# ==================== Flask 接口服务 ====================
from flask import Flask, request, jsonify
from flask_cors import CORS

app = Flask(__name__)
CORS(app)  # 解决跨域问题
chat_bot = ChatBotGraph()

# 统一兜底回答
default_answer = '抱歉，我暂时无法回答您的问题，请您更换提问方式或咨询其他相关内容，我会尽力为您解答。'

@app.route('/api/qa', methods=['POST'])
def get_qa_answer():
    try:
        data = request.get_json()

        # 参数校验
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

        # 调用核心问答逻辑
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
    print("=" * 50)
    print(" 医疗知识问答系统 —— 后端服务已启动")
    print(" 作者：熊锦帅  | 指导老师：兰伟")
    print(" 接口地址：http://localhost:5000/api/qa")
    print("=" * 50)
    app.run(host='0.0.0.0', port=5000, debug=True)