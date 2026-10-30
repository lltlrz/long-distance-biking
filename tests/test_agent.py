import json
import pytest
from fastapi.testclient import TestClient
from app import app
from ridepilot.agent import run, execute
from ridepilot.schemas import Request
from ridepilot.tools import get_route_summary

@pytest.fixture(autouse=True)
def no_key(monkeypatch): monkeypatch.delenv('LLM_API_KEY',raising=False)

def test_api_and_static():
    c=TestClient(app)
    assert c.get('/').status_code==200
    assert c.get('/api/health').json()['mode']=='local_rules'
    r=c.post('/api/agent/plan',json={'user_message':'我想从成都骑到乐山，三天完成，标准强度，住宿和补给优先。'}).json()
    assert len(r['plan']['itinerary'])==3
    assert len(r['trace'])==5
    assert c.post('/api/agent/plan',json={'days':0}).status_code==422
    assert c.post('/api/agent/plan',json={'total_distance':-1}).status_code==422

def test_missing_and_failure():
    assert run(Request(user_message='帮我规划'))['plan'] is None
    trace=[]
    assert 'error' in execute('unknown',{},trace)
    assert trace[0]['status']=='error'
    with pytest.raises(ValueError): get_route_summary('北京','乐山',3)

def test_llm_tool_roundtrip():
    from types import SimpleNamespace as NS
    from openai.types.chat import ChatCompletionMessage
    seen=[]
    def create(**kwargs):
        seen.append(list(kwargs['messages']))
        if len(seen)==1:
            m=ChatCompletionMessage(role='assistant',tool_calls=[{'id':'call1','type':'function','function':{'name':'get_route_summary','arguments':json.dumps({'start':'成都','end':'乐山','days':3})}}])
        else:
            assert kwargs['messages'][-1]['role']=='tool'
            assert json.loads(kwargs['messages'][-1]['content'])['total_distance']==246
            m=ChatCompletionMessage(role='assistant',content='{"reply":"依据工具结果生成"}')
        return NS(choices=[NS(message=m)])
    result=run(Request(user_message='规划'),client=NS(chat=NS(completions=NS(create=create))))
    assert result['mode']=='llm'
    assert result['plan']['total_distance']==246
    assert len(seen)==2

def test_supply_followup():
    p=get_route_summary('成都','乐山',3)
    r=run(Request(user_message='哪一天补给风险最高',current_plan=p))
    assert r['trace'][0]['name']=='calculate_supply_gaps'
