from copy import deepcopy
from itertools import combinations
import pandas as pd
from .sample_data import SOURCE, STOPS, POIS, RISKS
from .schemas import Constraints

THRESHOLDS = {'easy':25,'standard':35,'challenge':50}

def search_supply_pois():
    return deepcopy(POIS)

def calculate_supply_gaps(intensity='standard', start_km=0, end_km=246):
    threshold = THRESHOLDS[intensity]
    points = sorted(set([start_km,end_km]+[p['km'] for p in POIS if start_km<p['km']<end_km and p['type'] in ['餐饮','便利店','超市','城镇和村庄']]))
    return [dict(start=a,end=b,distance=b-a,level='高' if b-a>=threshold*1.5 else '中' if b-a>=threshold else '低',action='提前补水、携带食物并核实停靠点',**SOURCE) for a,b in zip(points,points[1:])]

def score_stop_candidates(target=82, start_km=0, preferences=None):
    frame = pd.DataFrame(STOPS,columns=['name','km','hotel','supply','safety'])
    frame = frame[frame.km>=start_km].copy()
    frame['distance_match'] = (100-abs(frame.km-start_km-target)/max(target,1)*100).clip(0,100)
    frame['score'] = (frame.hotel*.4+frame.supply*.25+frame.distance_match*.2+frame.safety*.15).round(2)
    frame['reason'] = '住宿40% + 补给25% + 里程20% + 安全15%；示例服务评分'
    if preferences and any(x in preferences for x in ['安全优先','safe']):
        frame = frame[frame.safety>=85]
    return frame.sort_values('score',ascending=False).to_dict('records')

def analyze_route_risks(start_km=0,end_km=246,intensity='standard',weather=None,remaining_hours=None):
    rows = [deepcopy(r) for r in RISKS if r['start']<end_km and r['end']>start_km]
    rows += [dict(type='补给不足',**g) for g in calculate_supply_gaps(intensity,start_km,end_km) if g['level']!='低']
    if weather and weather not in ['clear','晴']:
        rows.append(dict(type='用户报告天气变化',level='高',basis=weather,action='核实路况，优先就近停留',source_type='user_provided',is_real_time=False))
    if remaining_hours is not None and end_km-start_km>remaining_hours*12:
        rows.append(dict(type='时间不足/夜骑风险',level='高',basis='剩余距离超过按12km/h估计的时间预算',action='缩短当天行程',**SOURCE))
    return rows

def _days(points,intensity):
    result=[]
    for i,(a,b) in enumerate(zip(points,points[1:]),1):
        gaps=calculate_supply_gaps(intensity,a[1],b[1])
        risks=analyze_route_risks(a[1],b[1],intensity)
        result.append(dict(day=i,start=a[0],end=b[0],start_km=a[1],end_km=b[1],distance=b[1]-a[1],hours=round((b[1]-a[1])/15,1),climb=round((b[1]-a[1])*5),gapDistance=max(g['distance'] for g in gaps),supplyLevel='中' if any(g['level']!='低' for g in gaps) else '低',safetyLevel='中' if risks else '低',reason='依据示例住宿、补给、里程匹配和安全评分选择',gaps=gaps,risks=risks))
    return result

def get_route_summary(start,end,days,intensity='standard',preferences=None,max_daily_distance=130,total_distance=None):
    c=Constraints(start=start,end=end,days=days,intensity=intensity,preferences=preferences or [],max_daily_distance=max_daily_distance,total_distance=total_distance)
    if (start,end)!=('成都','乐山'): raise ValueError('当前仅支持成都至乐山示例路线，未接入真实地图')
    if total_distance is not None and total_distance!=246: raise ValueError('示例数据总长246km，不能将用户里程缩放成真实路线')
    options=[]
    for middle in combinations(STOPS[1:-1],days-1):
        points=[STOPS[0],*middle,STOPS[-1]]
        if any(b[1]-a[1]>c.max_daily_distance for a,b in zip(points,points[1:])): continue
        score=0
        for a,b in zip(points,points[1:]):
            rows=score_stop_candidates(246/days,a[1],preferences)
            score+=next((r['score'] for r in rows if r['name']==b[0]),-1000)
        options.append((score,points))
    if not options: raise ValueError('候选停靠点不能满足天数和每日里程限制，请调整约束')
    points=max(options,key=lambda x:x[0])[1]
    return dict(constraints=c.model_dump(),total_distance=246,itinerary=_days(points,intensity),segments=deepcopy(RISKS),climb=1230,**SOURCE)

def replan_itinerary(current_plan,current_day,completed_distance,fatigue,weather,remaining_hours,preferences=None):
    before=deepcopy(current_plan)
    old=before['itinerary']
    if current_day>len(old): raise ValueError('当前日期超出行程')
    day=old[current_day-1]
    if completed_distance>day['distance']: raise ValueError('已完成距离指当天里程，不能超过当日计划')
    position=day['start_km']+completed_distance
    capacity=min(remaining_hours*12*(.5 if fatigue=='high' else .8 if fatigue=='medium' else 1),current_plan['constraints']['max_daily_distance']-completed_distance)
    if weather not in ['clear','晴']: capacity*=.65
    candidates=[r for r in score_stop_candidates(capacity,position,preferences) if r['km']<=position+capacity]
    if not candidates: return dict(suggest_adjustment=True,before=before,after=None,reason='可骑范围内没有已知住宿候选点，建议停止冒险并联系接驳或当地帮助',confirmed=False,**SOURCE)
    stop=candidates[0]
    points=[(day['start'],day['start_km']), (stop['name'],stop['km'])]
    limit=current_plan['constraints']['max_daily_distance']
    while points[-1][1]<246:
        remaining=[s for s in STOPS if points[-1][1]<s[1]<=points[-1][1]+limit]
        if not remaining: raise ValueError('后续路线无法满足每日里程限制')
        points.append(min(remaining,key=lambda s:abs(s[1]-points[-1][1]-min(82,246-points[-1][1]))))
    after=deepcopy(before)
    tail=_days(points,current_plan['constraints']['intensity'])
    for i,d in enumerate(tail,current_day): d['day']=i
    after['itinerary']=old[:current_day-1]+tail
    after['constraints']['days']=len(after['itinerary'])
    return dict(suggest_adjustment=True,before=before,after=after,new_endpoint=stop['name'],reason='按剩余时间、疲劳、用户报告天气及可达住宿点重算；可能延长天数',comparison=dict(before_distance=day['distance'],after_distance=tail[0]['distance'],before_supply=day['gaps'],after_supply=tail[0]['gaps'],before_safety=day['risks'],after_safety=analyze_route_risks(position,stop['km'],weather=weather,remaining_hours=remaining_hours)),confirmed=False,**SOURCE)

