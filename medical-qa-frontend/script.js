// 获取页面元素
const chatBox = document.getElementById('chatBox');
const questionInput = document.getElementById('questionInput');
const sendBtn = document.getElementById('sendBtn');
const clearBtn = document.getElementById('clearBtn'); // 新增：清空按钮
const API_URL = 'http://localhost:5000/api/qa';

// 核心：清空聊天历史
function clearChatHistory() {
    // 清空聊天框，恢复初始欢迎语
    chatBox.innerHTML = `
        <div class="message system-message">
            你好！我是医疗问答助手，请问有什么感冒相关的问题想要问我？
        </div>
    `;
    // 滚动到顶部
    chatBox.scrollTop = 0;
}

// 核心：关键词高亮（感冒、症状、治疗、发烧、咳嗽等）
function highlightKeywords(content) {
    const keywords = ['感冒', '症状', '治疗', '发烧', '咳嗽', '鼻塞', '流涕', '头痛', '退烧药', '抗生素'];
    let highlightedContent = content;
    keywords.forEach(keyword => {
        // 替换关键词为高亮样式
        highlightedContent = highlightedContent.replace(
            new RegExp(keyword, 'g'),
            `<span class="highlight">${keyword}</span>`
        );
    });
    return highlightedContent;
}

// 发送问题到后端
async function sendQuestion() {
    const question = questionInput.value.trim();
    if (!question) {
        alert('请输入要提问的问题！');
        return;
    }

    sendBtn.disabled = true;
    sendBtn.innerHTML = '<i class="bi bi-hourglass-split"></i> 正在回答...';

    // 添加用户消息（无高亮）
    addMessage(question, 'user', false);

    try {
        const response = await fetch(API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ question: question })
        });

        const result = await response.json();
        let answer = '';
        if (result.code === 200) {
            answer = result.answer;
        } else {
            answer = `出错了：${result.msg}`;
        }

        // 添加助手消息（带关键词高亮）
        addMessage(answer, 'system', true);
    } catch (error) {
        addMessage('抱歉，服务器连接失败，请检查后端是否启动！', 'system', false);
        console.error('接口调用失败：', error);
    } finally {
        sendBtn.disabled = false;
        sendBtn.innerHTML = '<i class="bi bi-send"></i> 提问';
        questionInput.value = '';
        chatBox.scrollTop = chatBox.scrollHeight;
    }
}

// 新增：添加消息（支持高亮）
function addMessage(content, type, needHighlight = false) {
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${type}-message`;
    
    // 如果需要高亮，先处理内容
    if (needHighlight) {
        messageDiv.innerHTML = highlightKeywords(content);
    } else {
        messageDiv.textContent = content;
    }
    
    chatBox.appendChild(messageDiv);
    chatBox.scrollTop = chatBox.scrollHeight;
}

// 绑定事件
sendBtn.addEventListener('click', sendQuestion);
clearBtn.addEventListener('click', clearChatHistory); // 绑定清空按钮
questionInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') sendQuestion();
});