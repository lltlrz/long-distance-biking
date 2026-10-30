(() => {
  let plan = null, pending = null, history = [], busy = false;
  const panel = document.createElement('section');
  panel.className = 'panel-section agent-panel';
  panel.innerHTML = `<h2>RidePilot AI Assistant</h2><p id="agentMode">连接后端中…</p><p>当前为模拟数据，仅用于产品功能演示，不代表真实道路、POI 营业状态或实时天气。地图为静态示意图。</p><div id="conversation" aria-live="polite"></div><div id="quick"></div><textarea id="agentMessage" class="text-input" aria-label="骑行需求" placeholder="从成都骑到乐山，三天完成"></textarea><button id="sendAgent" class="primary-button">发送</button><details><summary>途中状态：体力下降 / 天气变化 / 时间不足 / 进度滞后</summary><label>当前第几天<input id="rideDay" type="number" min="1" value="2"></label><label>当天已完成公里<input id="completed" type="number" min="0" placeholder="46"></label><label>疲劳<select id="fatigue"><option value="">请选择</option><option value="low">低</option><option value="medium">中</option><option value="high">高</option></select></label><label>天气<select id="weather"><option value="">请选择</option><option value="clear">晴</option><option value="rain">下雨</option></select></label><label>剩余可骑小时<input id="hours" type="number" min="0" placeholder="3"></label><button id="replanAgent">生成调整建议</button></details><div id="proposal"></div><h3>Agent Trace</h3><div id="agentTrace"></div>`;
  document.querySelector('.app-shell').append(panel);
  const el = id => document.getElementById(id);
  const say = (role, content) => {const p=document.createElement('p'); p.textContent=`${role}：${content}`;el('conversation').append(p);};
  ['帮我生成一份骑行计划。','哪一天的补给风险最高？','为什么推荐这个每日终点？','如果我体力下降，应该怎么调整？','如果天气变差，是否需要修改路线？'].forEach(q=>{const b=document.createElement('button');b.textContent=q;b.onclick=()=>{el('agentMessage').value=q;};el('quick').append(b);});
  function showPlan() {
    if(!plan)return;
    el('routeTitle').textContent=`${plan.constraints.start} → ${plan.constraints.end} · ${plan.itinerary.length} 日`;
    el('routeSubtitle').textContent=`${plan.total_distance}km · Python 计算的模拟路线`;
    el('avgDistance').textContent=`${(plan.total_distance/plan.itinerary.length).toFixed(1)}km`;
    el('gapCount').textContent=plan.itinerary.flatMap(d=>d.gaps).filter(g=>g.level!=='低').length+' 段';
    el('riskLevel').textContent=plan.itinerary.some(d=>d.risks.length)?'中':'低';
    el('dayCards').replaceChildren();el('warningList').replaceChildren();
    plan.itinerary.forEach(d=>{const card=document.createElement('article');card.className='day-card';card.textContent=`Day ${d.day} ${d.start} → ${d.end} | ${d.distance}km | ${d.hours}h | 爬升 ${d.climb}m（模拟）\n${d.reason}`;card.onclick=()=>{el('warningList').textContent=JSON.stringify({gaps:d.gaps,risks:d.risks},null,2);};el('dayCards').append(card);});
  }
  async function send(task) {
    if(busy)return;busy=true;el('sendAgent').disabled=true;el('agentMode').textContent='正在调用后端…';
    const message=el('agentMessage').value; say('你',message);
    const payload={user_message:message,history,current_plan:plan,current_day:Number(el('rideDay').value),completed_distance:el('completed').value===''?null:Number(el('completed').value),fatigue:el('fatigue').value||null,weather:el('weather').value||null,remaining_hours:el('hours').value===''?null:Number(el('hours').value)};
    if(task==='plan')Object.assign(payload,{start:el('startInput').value,end:el('endInput').value,days:Number(el('daysInput').value),total_distance:Number(el('distanceInput').value),intensity:activeIntensity,preferences:[...document.querySelectorAll('.preference-list input:checked')].map(x=>x.value)});
    try {
      const response=await fetch(`/api/agent/${task}`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)});
      const result=await response.json();if(!response.ok)throw Error(typeof result.detail==='string'?result.detail:JSON.stringify(result.detail));
      el('agentMode').textContent=result.mode==='llm'?'真实 LLM Agent 模式':'本地规则演示模式（未调用大模型）';
      say('助手',result.reply);history.push({role:'user',content:message},{role:'assistant',content:result.reply});history=history.slice(-20);
      el('agentTrace').replaceChildren();result.trace.forEach(t=>{const details=document.createElement('details');const title=document.createElement('summary');title.textContent=`${t.status==='success'?'✓':'×'} ${t.name}`;const pre=document.createElement('pre');pre.textContent=JSON.stringify(t,null,2);details.append(title,pre);el('agentTrace').append(details);});
      pending=null;el('proposal').replaceChildren();
      if(result.plan){plan=result.plan;showPlan();}
      if(result.proposal){pending=result.proposal.after;const pre=document.createElement('pre');pre.textContent=JSON.stringify(result.proposal,null,2);el('proposal').append(pre);if(pending){const yes=document.createElement('button'),no=document.createElement('button');yes.textContent='确认调整';no.textContent='取消调整';yes.onclick=()=>{plan=pending;pending=null;showPlan();el('proposal').replaceChildren();};no.onclick=()=>{pending=null;el('proposal').replaceChildren();};el('proposal').append(yes,no);}}
    }catch(e){say('错误',e.message);el('agentMode').textContent='服务不可用，原计划保留';}finally{busy=false;el('sendAgent').disabled=false;}
  }
  el('sendAgent').onclick=()=>send('chat');el('replanAgent').onclick=()=>send('replan');
  ['generateButton','adjustButton','saveButton','resetButton'].forEach(id=>{const old=el(id),b=old.cloneNode(true);old.replaceWith(b);b.onclick=()=>{if(id==='generateButton')send('plan');if(id==='adjustButton')panel.scrollIntoView({behavior:'smooth'});if(id==='saveButton'){localStorage.setItem('ridepilot-plan',JSON.stringify(plan));showToast('已保存到本机浏览器');}if(id==='resetButton'){plan=null;pending=null;history=[];el('proposal').replaceChildren();renderPlan(false);}};});
  document.querySelectorAll('.segment').forEach(b=>b.addEventListener('click',()=>{if(plan)showPlan();}));
  fetch('/api/health').then(r=>r.json()).then(r=>el('agentMode').textContent=r.mode==='llm'?'真实 LLM Agent 模式':'本地规则演示模式').catch(()=>el('agentMode').textContent='请通过 FastAPI 地址打开页面');
})();
