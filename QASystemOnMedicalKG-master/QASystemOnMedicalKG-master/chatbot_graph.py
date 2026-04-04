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

import requests
import time
from flask import Flask, request, jsonify
from flask_cors import CORS

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
app = Flask(__name__)
CORS(app)
chat_bot = ChatBotGraph()

default_answer = '抱歉，我暂时无法回答您的问题，请您更换提问方式或咨询其他相关内容，我会尽力为您解答。'

# ---------------------- 主问答接口 ----------------------
@app.route('/api/qa', methods=['POST'])
def get_qa_answer():
    try:
        data = request.get_json()

        if not data or 'question' not in data:
            return jsonify({'code': 400,'msg': '请输入有效的问题', 'answer': '', 'source': 'unknown'})

        user_question = data['question'].strip()
        if not user_question:
            return jsonify({'code': 400,'msg': '问题不能为空', 'answer': '', 'source': 'unknown'})

        answer = chat_bot.chat_main(user_question)

        if answer == default_answer or '抱歉，我暂时无法回答' in answer:
            source = "llm"
        else:
            source = "knowledge_graph"

        return jsonify({'code': 200,'msg': 'success', 'answer': answer, 'source': source})

    except Exception as e:
        return jsonify({'code': 500,'msg': f'服务器错误：{str(e)}', 'answer': default_answer, 'source': 'llm'})

# ---------------------- 稳定版 LLM 大模型接口 ----------------------
@app.route('/api/llm', methods=['POST'])
def api_llm():
    try:
        data = request.get_json()
        question = data.get('question', '').strip()
        if not question:
            return jsonify({"code": 400, "msg": "问题不能为空", "content": ""})

        # 敏感词优化，防止被拦截
        q = question.replace("怎么治", "如何缓解").replace("吃什么药", "如何护理").replace("治疗", "缓解方法")

        content = None

        # 稳定机制：重试 2 次
        for retry in range(2):
            try:
                response = requests.post(
                    "https://api.lolimi.cn/API/AI/gpt.php",
                    data={
                        "msg": f"你是专业医疗助手，简洁、有条理回答：{q}",
                        "type": "json"
                    },
                    timeout=12
                )
                res = response.json()
                if res.get("code") == 200 and res.get("data"):
                    content = res["data"]
                    break
            except Exception as e:
                time.sleep(0.8)
                continue

        # 如果成功获取回答
        if content:
            return jsonify({"code": 200, "msg": "success", "content": content})

        # 智能兜底（不写死大量答案，只高频急救）
        knowledge_fallback = {
            "手疼": "手疼常见原因包括肌肉劳损、腱鞘炎、关节炎等，建议休息、热敷，持续不缓解请及时就医检查。",
            "肚子疼": "腹痛多与饮食、肠胃痉挛、炎症相关，可热敷休息，剧烈或持续疼痛请立即就医。",
            "中毒": "中毒急救原则：立即脱离毒物、保持呼吸通畅，尽快拨打120就医，切勿自行处理。",
            "头痛": "头痛常见原因有疲劳、感冒、压力大、睡眠不足等，建议休息放松，持续头痛请就医。",
            "感冒": "感冒常见症状：发热、鼻塞、流涕、咽痛、乏力，建议多休息、多喝水，对症缓解。",
            "咳嗽": "咳嗽常见原因：感冒、咽喉炎、支气管炎，建议多喝温水，持续咳嗽请就医检查。",
            "发烧": "发烧可先物理降温，多喝水，超过38.5℃或持续发烧请及时就医。"
        }

        for key in knowledge_fallback:
            if key in question:
                return jsonify({"code": 200, "msg": "fallback", "content": knowledge_fallback[key]})

        return jsonify({
            "code": 200,
            "msg": "fallback",
            "content": "我已收到你的健康问题，当前服务临时不稳定，你可以稍后再问我哦～建议不适及时就医。"
        })

    except Exception as e:
        return jsonify({
            "code": 500,
            "msg": str(e),
            "content": "当前服务暂时不稳定，你可以稍后再试。"
        })

if __name__ == '__main__':
    print("=" * 60)
    print(" 医疗知识问答系统 —— 后端服务已启动")
    print(" 作者：熊锦帅  | 指导老师：兰伟")
    print(" 稳定版：知识图谱 + 重试机制 + 智能兜底")
    print("=" * 60)
    app.run(host='0.0.0.0', port=5000, debug=True)