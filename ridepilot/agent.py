import inspect
import json
import os
import re
from pydantic import create_model, ConfigDict
from openai import OpenAI
from . import tools
from .prompts import SYSTEM
from .sample_data import SOURCE

NAMES=['get_route_summary','search_supply_pois','calculate_supply_gaps','score_stop_candidates','analyze_route_risks','replan_itinerary']
REGISTRY={n:getattr(tools,n) for n in NAMES}
TYPES={'start':str,'end':str,'days':int,'intensity':str,'target':float,'start_km':float,'end_km':float,'preferences':list[str]|None,'max_daily_distance':float,'total_distance':float|None,'current_plan':dict,'current_day':int,'completed_distance':float,'fatigue':str,'weather':str|None,'remaining_hours':float|None}
MODELS={n:create_model(n, __config__=ConfigDict(extra='forbid'), **{k:(TYPES[k],... if p.default is inspect.Parameter.empty else p.default) for k,p in inspect.signature(fn).parameters.items()}) for n,fn in REGISTRY.items()}
SPECS=[dict(type='function',function=dict(name=n,description=n+'：使用模拟数据计算，返回来源标识',parameters=MODELS[n].model_json_schema())) for n in NAMES]

def enabled():
    return bool(os.getenv('LLM_API_KEY') and os.getenv('LLM_MODEL'))

def execute(name,args,trace):
    try:
        validated=MODELS[name].model_validate(args).model_dump()
        result=REGISTRY[name](**validated)
        trace.append(dict(name=name,arguments=args,result=result,status='success'))
        return result
    except Exception as exc:
        result={'error':str(exc) if isinstance(exc,(ValueError,KeyError)) else '工具执行失败'}
        trace.append(dict(name=name,arguments=args,result=result,status='error'))
        return result

def run(req,task='chat',client=None):
    trace=[]
    payload=req.model_dump()
    message=req.user_message or req.message
    if enabled() or client is not None:
        client=client or OpenAI(api_key=os.environ['LLM_API_KEY'],base_url=os.getenv('LLM_BASE_URL') or None,timeout=45,max_retries=1)
        messages=[dict(role='system',content=SYSTEM)]
        messages += [dict(role=h['role'],content=str(h.get('content',''))[:6000]) for h in req.history if h.get('role') in ['user','assistant']]
        messages.append(dict(role='user',content=json.dumps(dict(task=task,**payload),ensure_ascii=False)))
        reply='达到工具调用轮数上限，请缩小问题范围。'
        for _ in range(5):
            response=client.chat.completions.create(model=os.getenv('LLM_MODEL') or 'test',messages=messages,tools=SPECS,tool_choice='auto')
            msg=response.choices[0].message
            messages.append(msg.model_dump(exclude_none=True))
            if not msg.tool_calls:
                try: reply=json.loads(msg.content)['reply']
                except (ValueError,TypeError,KeyError): reply='模型未返回有效 JSON，请重试。'
                break
            for call in msg.tool_calls[:12]:
                try: args=json.loads(call.function.arguments)
                except ValueError: args={}
                result=execute(call.function.name,args,trace)
                messages.append(dict(role='tool',tool_call_id=call.id,content=json.dumps(result,ensure_ascii=False)))
        mode='llm'
    else:
        mode='local_rules'
        plan=req.current_plan
        if task=='replan' or (plan and any(w in message for w in ['累','下雨','天气变','调整','体力下降'])):
            completed=req.completed_distance
            match=re.search(r'(\d+(?:\.\d+)?)\s*公里',message)
            if match: completed=float(match[1])
            fatigue=req.fatigue or ('high' if '累' in message else None)
            weather=req.weather or ('rain' if '雨' in message else None)
            if plan is None or completed is None or fatigue is None or weather is None or req.remaining_hours is None:
                reply='请提供当前行程、当前日期、当天已骑公里数、疲劳程度、天气和剩余可骑小时数。'
            else:
                execute('analyze_route_risks',dict(weather=weather,remaining_hours=req.remaining_hours),trace)
                execute('score_stop_candidates',dict(target=req.remaining_hours*12,preferences=req.preferences),trace)
                r=execute('replan_itinerary',dict(current_plan=plan,current_day=req.current_day,completed_distance=completed,fatigue=fatigue,weather=weather,remaining_hours=req.remaining_hours,preferences=req.preferences),trace)
                reply=r.get('reason',r.get('error',''))
        elif plan and '补给' in message and ('哪' in message or '风险' in message):
            execute('calculate_supply_gaps',dict(intensity=plan['constraints']['intensity']),trace)
            day=max(plan['itinerary'],key=lambda d:d['gapDistance'])
            reply=f"Day {day['day']} 最大示例补给间隔 {day['gapDistance']}km；提前补水、携带食物，核实停靠点营业情况。"
        elif plan and ('为什么' in message or '安全优先' in message):
            rows=execute('score_stop_candidates',dict(target=plan['total_distance']/len(plan['itinerary']),preferences=['安全优先'] if '安全优先' in message else req.preferences),trace)
            reply='终点评分按住宿40%、补给25%、里程20%、安全15%计算。安全优先会筛除示例安全评分低于85的候选点。详细评分见工具记录，原计划保持不变。'
        else:
            start=req.start or ('成都' if '成都' in message else None)
            end=req.end or ('乐山' if '乐山' in message else None)
            match=re.search(r'([一二三四五六七八九十\d]+)\s*[天日]',message)
            days=req.days
            if match:
                raw=match[1]; days=int(raw) if raw.isdigit() else '一二三四五六七八九十'.index(raw)+1
            if not start or not end or not days: reply='请补充起点、终点和计划天数。当前示例支持成都到乐山。'
            else:
                limit=re.search(r'不超过\s*(\d+)\s*公里',message)
                p=execute('get_route_summary',dict(start=start,end=end,days=days,intensity=req.intensity,preferences=req.preferences,total_distance=req.total_distance,max_daily_distance=float(limit[1]) if limit else req.max_daily_distance),trace)
                if 'error' in p: reply=p['error']
                else:
                    for name,args in [('search_supply_pois',{}),('calculate_supply_gaps',{'intensity':req.intensity}),('score_stop_candidates',{'target':246/days}),('analyze_route_risks',{'intensity':req.intensity})]: execute(name,args,trace)
                    reply='已通过 Python 工具生成示例行程。当前为本地规则演示，未调用大模型。'
    plans=[t['result'] for t in trace if t['name']=='get_route_summary' and t['status']=='success']
    proposals=[t['result'] for t in trace if t['name']=='replan_itinerary' and t['status']=='success']
    return dict(reply=reply,mode=mode,plan=plans[-1] if plans else None,proposal=proposals[-1] if proposals else None,trace=trace,data_source=SOURCE,warning='当前为模拟数据，仅用于产品功能演示，不代表真实道路、POI 营业状态或实时天气。')
