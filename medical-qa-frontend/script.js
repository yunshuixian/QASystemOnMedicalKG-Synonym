// 获取页面上的核心元素：聊天框、输入框、提问按钮
const chatBox = document.getElementById('chatBox');
const questionInput = document.getElementById('questionInput');
const sendBtn = document.getElementById('sendBtn');

// 后端接口地址（和你Flask启动的地址一致，不用改）
const API_URL = 'http://localhost:5000/api/qa';

// 核心函数：发送问题到后端
async function sendQuestion() {
    // 1. 获取用户输入的问题，去掉首尾空格
    const question = questionInput.value.trim();
    if (!question) {
        alert('请输入要提问的问题！');
        return;
    }

    // 2. 禁用按钮，防止重复点击（显示“正在回答”）
    sendBtn.disabled = true;
    sendBtn.innerHTML = '<i class="bi bi-hourglass-split"></i> 正在回答...';

    // 3. 把用户的问题显示到聊天框（右对齐的蓝色气泡）
    addMessage(question, 'user');

    try {
        // 4. 调用后端接口（POST请求，传JSON格式的问题）
        const response = await fetch(API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ question: question })
        });

        // 5. 解析后端返回的结果
        const result = await response.json();

        // 6. 显示回答：成功就显示答案，失败显示错误提示
        if (result.code === 200) {
            addMessage(result.answer, 'system');
        } else {
            addMessage(`出错了：${result.msg}`, 'system');
        }
    } catch (error) {
        // 网络错误/接口不通的提示
        addMessage('抱歉，服务器连接失败，请检查后端是否启动！', 'system');
        console.error('接口调用失败：', error);
    } finally {
        // 7. 恢复按钮状态，清空输入框，滚动到聊天框底部
        sendBtn.disabled = false;
        sendBtn.innerHTML = '<i class="bi bi-send"></i> 提问';
        questionInput.value = '';
        chatBox.scrollTop = chatBox.scrollHeight;
    }
}

// 辅助函数：往聊天框添加消息（区分用户/助手）
function addMessage(content, type) {
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${type}-message`;
    messageDiv.textContent = content;
    chatBox.appendChild(messageDiv);
    // 自动滚动到底部，显示最新消息
    chatBox.scrollTop = chatBox.scrollHeight;
}

// 绑定事件1：点击“提问”按钮发送问题
sendBtn.addEventListener('click', sendQuestion);

// 绑定事件2：按回车键发送问题（更方便）
questionInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
        sendQuestion();
    }
});