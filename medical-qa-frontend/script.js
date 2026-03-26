document.addEventListener('DOMContentLoaded', function () {
  const chatBox = document.getElementById('chatBox');
  const questionInput = document.getElementById('questionInput');
  const sendBtn = document.getElementById('sendBtn');
  const clearBtn = document.getElementById('clearBtn');
  const exportBtn = document.getElementById('exportBtn');
  const graphBtn = document.getElementById('graphBtn');
  const toast = document.getElementById('toast');
  const wordCount = document.getElementById('wordCount');
  const graphModal = document.getElementById('graphModal');

  // 欢迎语
  if (!localStorage.getItem('has_welcome')) {
    addMessage('bot', '你好！我是医疗智能问答助手，你可以咨询感冒、咳嗽、发烧等常见健康问题。', false);
    localStorage.setItem('has_welcome', 'true');
  }

  // 加载历史
  loadChatHistory();

  // 字数统计（改为1000字）
  questionInput.addEventListener('input', () => {
    wordCount.textContent = questionInput.value.length + '/1000';
  });

  // 发送
  sendBtn.addEventListener('click', sendMessage);
  questionInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') sendMessage();
  });

  // 清空
  clearBtn.addEventListener('click', () => {
    if (!confirm('确定清空所有对话？')) return;
    chatBox.innerHTML = '';
    localStorage.removeItem('chat_history');
    showToast('清空成功', 'success');
  });

  // 导出记录（去掉“复制”）
  exportBtn.addEventListener('click', exportHistory);
  function exportHistory() {
    const history = localStorage.getItem('chat_history');
    if (!history) { showToast('无对话记录', 'error'); return; }
    const data = JSON.parse(history);
    let text = '=== 医疗问答记录 ===\n';
    data.forEach(item => {
      // 过滤掉“复制”字样
      const cleanText = item.text.replace(/复制/g, '').trim();
      text += (item.role === 'user' ? '我' : '助手') + '：' + cleanText + '\n';
    });
    const blob = new Blob([text], { type: 'text/plain' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = '对话记录.txt';
    a.click();
    showToast('导出成功', 'success');
  }

  // 快捷标签
  document.querySelectorAll('.tag-item').forEach(tag => {
    tag.addEventListener('click', () => {
      questionInput.value = tag.getAttribute('data-text');
      sendMessage();
    });
  });

  // 发送请求
  async function sendMessage() {
    const question = questionInput.value.trim();
    if (!question) { showToast('请输入问题', 'error'); return; }

    addMessage('user', question);
    questionInput.value = '';
    wordCount.textContent = '0/1000';

    const loadingMsg = addMessage('bot', '<div class="loading-dots"><span></span><span></span><span></span></div>', false);

    try {
      const res = await fetch('http://localhost:5000/api/qa', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question })
      });
      const data = await res.json();
      chatBox.removeChild(loadingMsg);

      let ans = data.data || data.answer || data.msg || '查询成功';
      if (ans === 'success') ans = '查询成功，已为你找到相关答案';

      // --- 答案自动换行分段 ---
      ans = ans
        .replace(/(症状[:：])/g, '<div class="answer-item">$1</div>')
        .replace(/(治疗[:：])/g, '<div class="answer-item">$1</div>')
        .replace(/(用药[:：])/g, '<div class="answer-item">$1</div>')
        .replace(/(护理[:：])/g, '<div class="answer-item">$1</div>')
        .replace(/(建议[:：])/g, '<div class="answer-item">$1</div>')
        .replace(/(注意事项[:：])/g, '<div class="answer-item">$1</div>')
        .replace(/(预防[:：])/g, '<div class="answer-item">$1</div>')
        .replace(/(区别[:：])/g, '<div class="answer-item">$1</div>')
        .replace(/(原因[:：])/g, '<div class="answer-item">$1</div>');

      addMessage('bot', ans, true);
    } catch (err) {
      chatBox.removeChild(loadingMsg);
      addMessage('bot', '后端服务未启动，请检查后重试', false);
      showToast('请求失败', 'error');
    }
  }

  // 高亮关键词
  function highlight(content) {
    const words = ['感冒','咳嗽','发烧','头痛','流感','药','治疗','症状','缓解','鼻塞','流涕','喉咙痛','儿童','孕期','预防'];
    words.forEach(w => {
      content = content.replaceAll(w, `<span class="highlight">${w}</span>`);
    });
    return content;
  }

  // 添加消息
  function addMessage(role, content, hasCopy = false) {
    const div = document.createElement('div');
    div.className = role === 'user' ? 'message user-message' : 'message system-message';

    let copyBtn = '';
    if (hasCopy) {
      copyBtn = `<button class="copy-btn" onclick="window.copyMsg(this)" data-text="${encodeURI(content.replace(/<[^>]+>/g, ''))}">
        <i class="bi bi-clipboard"></i> 复制
      </button>`;
    }

    div.innerHTML = `
      <div>${highlight(content)}</div>
      ${copyBtn}
      <div class="message-time">${new Date().toLocaleTimeString()}</div>
    `;

    chatBox.appendChild(div);
    chatBox.scrollTop = chatBox.scrollHeight;
    saveChatHistory();
    return div;
  }

  // 复制
  window.copyMsg = function (btn) {
    navigator.clipboard.writeText(decodeURI(btn.dataset.text)).then(() => {
      btn.innerHTML = '<i class="bi bi-check"></i> 已复制';
      setTimeout(() => btn.innerHTML = '<i class="bi bi-clipboard"></i> 复制', 1500);
      showToast('复制成功', 'success');
    });
  };

  // 存储
  function saveChatHistory() {
    const list = [];
    document.querySelectorAll('.message').forEach(item => {
      const role = item.classList.contains('user-message') ? 'user' : 'bot';
      const text = item.innerText.replace(/\d+:\d+:\d+/g, '').trim();
      if (text.includes('...')) return;
      list.push({ role, text });
    });
    localStorage.setItem('chat_history', JSON.stringify(list));
  }

  // 读取
  function loadChatHistory() {
    const h = localStorage.getItem('chat_history');
    if (!h) return;
    chatBox.innerHTML = '';
    JSON.parse(h).forEach(m => addMessage(m.role, m.text, m.role === 'bot'));
  }

  // 提示
  function showToast(msg, type) {
    toast.textContent = msg;
    toast.className = `toast ${type} show`;
    setTimeout(() => toast.className = 'toast', 2000);
  }

  // --- 修复知识图谱显示 ---
  graphBtn.addEventListener('click', initGraph);
  window.closeGraph = () => graphModal.classList.remove('show');
  function initGraph() {
    graphModal.classList.add('show');
    setTimeout(() => {
      const chart = echarts.init(document.getElementById('graphContainer'));
      const option = {
        tooltip: {},
        series: [{
          type: 'graph',
          layout: 'force',
          data: [
            { name: '感冒', itemStyle: { color: '#36D399' } },
            { name: '咳嗽' }, { name: '发烧' }, { name: '头痛' }, { name: '鼻塞' }, { name: '喉咙痛' },
            { name: '布洛芬' }, { name: '对乙酰氨基酚' }, { name: '阿莫西林' },
            { name: '多喝水' }, { name: '休息' }, { name: '通风' }, { name: '戴口罩' }
          ],
          links: [
            { source: '感冒', target: '咳嗽' },
            { source: '感冒', target: '发烧' },
            { source: '感冒', target: '头痛' },
            { source: '感冒', target: '鼻塞' },
            { source: '感冒', target: '喉咙痛' },
            { source: '感冒', target: '布洛芬' },
            { source: '感冒', target: '对乙酰氨基酚' },
            { source: '感冒', target: '阿莫西林' },
            { source: '感冒', target: '多喝水' },
            { source: '感冒', target: '休息' },
            { source: '感冒预防', target: '通风' },
            { source: '感冒预防', target: '戴口罩' }
          ],
          label: { show: true, fontSize: 12 },
          force: { repulsion: 300, edgeLength: 80 }
        }]
      };
      chart.setOption(option);
      window.addEventListener('resize', () => chart.resize());
    }, 100);
  }
});