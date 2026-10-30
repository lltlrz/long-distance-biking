SOURCE = dict(source_type='simulated', source_name='RidePilot Demo Dataset', is_real_time=False)
# These chainages and service scores are fictional demonstration observations.
STOPS = [('成都',0,95,95,80),('新津',46,75,85,85),('彭山',65,80,80,85),('眉山',82,95,95,90),('青神',128,85,85,90),('示例驿站',145,70,70,85),('夹江',164,95,90,75),('示例河畔镇',205,80,80,85),('乐山',246,95,95,85)]
POIS = [dict(name=f'{name}示例{kind}', type=kind, km=km, section=name, distance_to_route_m=200, opening_hours='未知（模拟）', confidence='模拟，未经核实', **SOURCE) for name,km,*_ in STOPS for kind in ['餐饮','便利店','超市','住宿','城镇和村庄','医疗','自行车维修']]
RISKS = [dict(type=kind,start=a,end=b,level='中',basis='示例数据标注，不是实时监测',action=action,**SOURCE) for kind,a,b,action in [('国道和省道',135,185,'白天通过'),('大车',135,185,'保持距离，必要时停车避让'),('隧道和桥梁',150,160,'开启车灯'),('连续爬升',170,195,'预留体力'),('弱网络',180,205,'下载离线地图')]]
