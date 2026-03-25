const chatBox = document.getElementById('chatBox');
const questionInput = document.getElementById('questionInput');
const sendBtn = document.getElementById('sendBtn');
const clearBtn = document.getElementById('clearBtn');
const wordCount = document.getElementById('wordCount');
const toast = document.getElementById('toast');
const API_URL = 'http://localhost:5000/api/qa';
const MAX_WORD_LENGTH = 100;

function getCurrentTime() {
    const now = new Date();
    const h = String(now.getHours()).padStart(2, '0');
    const m = String(now.getMinutes()).padStart(2, '0');
    return `${h}:${m}`;
}

function showToast(message, type = 'default', duration = 2000) {
    toast.textContent = message;
    toast.className = 'toast ' + type;
    toast.classList.add('show');
    setTimeout(() => toast.classList.remove('show'), duration);
}

function filterIllegalChars(text) {
    return text.replace(/<[^>]*>/g, '').replace(/javascript:/gi, '');
}

function createLoadingElement() {
    const div = document.createElement('div');
    div.className = 'message system-message';
    div.innerHTML = `
        <span class="message-content">正在思考中...</span>
        <span class="message-time">${getCurrentTime()}</span>
    `;
    return div;
}

function clearChatHistory() {
    chatBox.innerHTML = `
        <div class="message system-message">
            <span class="message-content">你好！我是医疗问答助手，请问有什么感冒相关的问题想要问我？</span>
            <span class="message-time">${getCurrentTime()}</span>
        </div>
    `;
    showToast('已清空聊天', 'success');
}

function highlightKeywords(content) {
    const keywords = ['感冒','症状','治疗','发烧','咳嗽','鼻塞','流涕','头痛','退烧药','抗生素'];
    let res = content;
    keywords.forEach(k => {
        res = res.replace(new RegExp(k, 'g'), `<span class="highlight">${k}</span>`);
    });
    return res;
}

function addMessage(content, type, needHighlight = false) {
    const div = document.createElement('div');
    div.className = `message ${type}-message`;
    const safe = filterIllegalChars(content);
    const html = needHighlight ? highlightKeywords(safe) : safe;
    div.innerHTML = `
        <span class="message-content">${html}</span>
        <span class="message-time">${getCurrentTime()}</span>
    `;
    chatBox.appendChild(div);
    chatBox.scrollTop = chatBox.scrollHeight;
}

async function sendQuestion() {
    const q = questionInput.value.trim();
    if (!q) {
        showToast('请输入问题', 'error');
        return;
    }

    sendBtn.disabled = true;
    sendBtn.textContent = '正在回答...';
    const loading = createLoadingElement();
    chatBox.appendChild(loading);

    addMessage(q, 'user');

    try {
        const res = await fetch(API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ question: q })
        });

        const data = await res.json();
        chatBox.removeChild(loading);

        if (data.code === 200) {
            addMessage(data.answer, 'system', true);
        } else {
            addMessage(data.msg || '出错了', 'system');
        }

    } catch (e) {
        chatBox.removeChild(loading);
        addMessage('服务器未启动或网络异常', 'system');
        showToast('连接失败', 'error');
    } finally {
        sendBtn.disabled = false;
        sendBtn.innerHTML = '<i class="bi bi-send"></i> 提问';
        questionInput.value = '';
        wordCount.textContent = `0/${MAX_WORD_LENGTH}`;
    }
}

questionInput.addEventListener('input', () => {
    const len = questionInput.value.length;
    wordCount.textContent = `${len}/${MAX_WORD_LENGTH}`;
});

sendBtn.addEventListener('click', sendQuestion);
clearBtn.addEventListener('click', clearChatHistory);

questionInput.addEventListener('keydown', e => {
    if (e.key === 'Enter') {
        e.preventDefault();
        sendQuestion();
    }
});

window.onload = () => {
    document.querySelector('.message-time').textContent = getCurrentTime();
    showToast('欢迎使用医疗问答系统', 'success');
};