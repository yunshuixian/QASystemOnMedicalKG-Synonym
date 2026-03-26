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

  let currentVoiceBtn = null;

  if (!localStorage.getItem('has_welcome')) {
    addMessage('bot', '你好！我是医疗智能问答助手，你可以咨询感冒、咳嗽、发烧等常见健康问题。', false);
    localStorage.setItem('has_welcome', 'true');
  }

  loadChatHistory();

  questionInput.addEventListener('input', () => {
    wordCount.textContent = questionInput.value.length + '/1000';
  });

  sendBtn.addEventListener('click', sendMessage);
  questionInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') sendMessage();
  });

  clearBtn.addEventListener('click', () => {
    if (!confirm('确定清空所有对话？')) return;
    chatBox.innerHTML = '';
    localStorage.removeItem('chat_history');
    showToast('清空成功', 'success');
  });

  exportBtn.addEventListener('click', exportHistory);
  function exportHistory() {
    const history = localStorage.getItem('chat_history');
    if (!history) { showToast('无对话记录', 'error'); return; }
    const data = JSON.parse(history);
    let text = '=== 医疗知识问答 ===\n';
    data.forEach(item => {
      const cleanText = item.text.replace(/复制|朗读|正在朗读/g, '').trim();
      text += (item.role === 'user' ? '我' : '助手') + '：' + cleanText + '\n';
    });
    const blob = new Blob([text], { type: 'text/plain' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = '对话记录.txt';
    a.click();
    showToast('导出成功', 'success');
  }

  document.querySelectorAll('.tag-item').forEach(tag => {
    tag.addEventListener('click', () => {
      questionInput.value = tag.getAttribute('data-text');
      sendMessage();
    });
  });

  async function sendMessage() {
    const question = questionInput.value.trim();
    if (!question) { showToast('请输入问题', 'error'); return; }

    addMessage('user', question);
    questionInput.value = '';
    wordCount.textContent = '0/1000';
    document.getElementById('recommendWrapper').style.display = 'none';

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

  function highlight(content) {
    const words = ['感冒','咳嗽','发烧','头痛','流感','药','治疗','症状','缓解','鼻塞','流涕','喉咙痛','儿童','孕期','预防'];
    words.forEach(w => {
      content = content.replaceAll(w, `<span class="highlight">${w}</span>`);
    });
    return content;
  }

  function addMessage(role, content, hasCopy = false) {
    const div = document.createElement('div');
    div.className = role === 'user' ? 'message user-message' : 'message system-message';

    let copyBtn = '';
    let voiceBtn = '';
    const pureText = content.replace(/<[^>]+>/g, '');

    if (hasCopy) {
      copyBtn = `<button class="copy-btn" onclick="window.copyMsg(this)" data-text="${encodeURI(pureText)}">
        <i class="bi bi-clipboard"></i> 复制
      </button>`;

      voiceBtn = `<button class="voice-btn" onclick="window.toggleVoice(this)" data-text="${encodeURI(pureText)}">
        <i class="bi bi-volume-up"></i> 朗读
      </button>`;
    }

    div.innerHTML = `
      <div>${highlight(content)}</div>
      <div style="display:flex;gap:5px;">
        ${copyBtn}
        ${voiceBtn}
      </div>
      <div class="message-time">${new Date().toLocaleTimeString()}</div>
    `;

    chatBox.appendChild(div);
    chatBox.scrollTop = chatBox.scrollHeight;
    saveChatHistory();
    return div;
  }

  window.copyMsg = function (btn) {
    navigator.clipboard.writeText(decodeURI(btn.dataset.text)).then(() => {
      btn.innerHTML = '<i class="bi bi-check"></i> 已复制';
      setTimeout(() => btn.innerHTML = '<i class="bi bi-clipboard"></i> 复制', 1500);
      showToast('复制成功', 'success');
    });
  };

  window.toggleVoice = function (btn) {
    if (btn.classList.contains('playing')) {
      window.speechSynthesis.cancel();
      btn.innerHTML = '<i class="bi bi-volume-up"></i> 朗读';
      btn.classList.remove('playing');
      currentVoiceBtn = null;
      showToast('已停止', 'success');
      return;
    }

    window.speechSynthesis.cancel();
    if (currentVoiceBtn) {
      currentVoiceBtn.innerHTML = '<i class="bi bi-volume-up"></i> 朗读';
      currentVoiceBtn.classList.remove('playing');
    }

    const text = decodeURI(btn.getAttribute('data-text'));
    const u = new SpeechSynthesisUtterance(text);
    u.lang = 'zh-CN';
    u.rate = 1;

    btn.innerHTML = '<i class="bi bi-volume-up"></i> 正在朗读';
    btn.classList.add('playing');
    currentVoiceBtn = btn;
    window.speechSynthesis.speak(u);

    u.onend = function () {
      btn.innerHTML = '<i class="bi bi-volume-up"></i> 朗读';
      btn.classList.remove('playing');
      currentVoiceBtn = null;
    };
  };

  function saveChatHistory() {
    const list = [];
    document.querySelectorAll('.message').forEach(item => {
      const role = item.classList.contains('user-message') ? 'user' : 'bot';
      const text = item.querySelector('div:first-child').innerText.trim();
      if (text.includes('...')) return;
      list.push({ role, text });
    });
    localStorage.setItem('chat_history', JSON.stringify(list));
  }

  function loadChatHistory() {
    const h = localStorage.getItem('chat_history');
    if (!h) return;
    chatBox.innerHTML = '';
    JSON.parse(h).forEach(m => addMessage(m.role, m.text, m.role === 'bot'));
  }

  function showToast(msg, type) {
    toast.textContent = msg;
    toast.className = `toast ${type} show`;
    setTimeout(() => toast.className = 'toast', 2000);
  }

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

  // 相似问题推荐
  const recommendMap = {
    感冒: ["感冒如何预防", "感冒不能吃什么", "感冒和流感区别"],
    咳嗽: ["咳嗽吃什么缓解", "咳嗽多久需要就医", "干咳有痰区别"],
    发烧: ["发烧如何物理降温", "发烧吃什么药", "持续发烧怎么办"],
    喉咙痛: ["喉咙痛怎么缓解", "喉咙痛吃什么水果", "喉咙发炎怎么办"],
    头痛: ["头痛快速缓解方法", "头痛常见原因", "头痛需要做什么检查"]
  };

  const recommendWrapper = document.getElementById("recommendWrapper");
  const recommendList = document.getElementById("recommendList");

  questionInput.addEventListener("input", function () {
    const val = this.value.trim();
    recommendList.innerHTML = "";
    recommendWrapper.style.display = "none";

    for (const key in recommendMap) {
      if (val.includes(key)) {
        recommendWrapper.style.display = "block";
        recommendMap[key].forEach(item => {
          const div = document.createElement("div");
          div.className = "tag-item";
          div.textContent = item;
          div.onclick = () => {
            questionInput.value = item;
            recommendWrapper.style.display = "none";
          };
          recommendList.appendChild(div);
        });
        break;
      }
    }
  });
});