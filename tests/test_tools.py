from ridepilot.tools import get_route_summary, score_stop_candidates, replan_itinerary

def test_plan_conserves_distance():
    p = get_route_summary(start='成都', end='乐山', days=3)
    assert sum(d['distance'] for d in p['itinerary']) == 246

def test_scores():
    rows = score_stop_candidates(target=82)
    assert all(0 <= r['score'] <= 100 for r in rows)

def test_replan_does_not_mutate():
    p = get_route_summary(start='成都', end='乐山', days=3)
    import copy
    original = copy.deepcopy(p)
    r = replan_itinerary(current_plan=p, current_day=2, completed_distance=46, fatigue='high', weather='rain', remaining_hours=2)
    assert p == original
    assert r['confirmed'] is False
    assert r['after']['itinerary'][-1]['end'] == '乐山'
