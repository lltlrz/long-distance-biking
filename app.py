from pathlib import Path
from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException
from fastapi.staticfiles import StaticFiles
from ridepilot.schemas import Request
from ridepilot.agent import run, enabled

ROOT=Path(__file__).resolve().parent
load_dotenv(ROOT/'.env')
app=FastAPI(title='RidePilot Agent')
@app.get('/api/health')
def health(): return {'status':'ok','mode':'llm' if enabled() else 'local_rules'}
@app.post('/api/agent/{task}')
def agent(task:str, request:Request):
    if task not in ['plan','chat','replan']: raise HTTPException(404,'接口不存在')
    try: return run(request,task)
    except Exception:
        raise HTTPException(502,'大模型服务请求失败，请检查后端配置或稍后重试；未覆盖当前行程。')
app.mount('/',StaticFiles(directory=ROOT/'frontend',html=True),name='demo')
