from pydantic import BaseModel, Field, ConfigDict
from typing import Literal

class Constraints(BaseModel):
    model_config = ConfigDict(extra='forbid')
    start: str = Field(min_length=1)
    end: str = Field(min_length=1)
    days: int = Field(ge=1, le=10)
    intensity: Literal['easy','standard','challenge'] = 'standard'
    max_daily_distance: float = Field(default=130, gt=0, le=300)
    preferences: list[str] = Field(default_factory=list)
    total_distance: float | None = Field(default=None, gt=0)

class Request(BaseModel):
    user_message: str = Field(default='', max_length=6000)
    message: str = Field(default='', max_length=6000)
    start: str | None = None
    end: str | None = None
    days: int | None = Field(default=None, ge=1, le=10)
    total_distance: float | None = Field(default=None, gt=0)
    intensity: Literal['easy','standard','challenge'] = 'standard'
    preferences: list[str] = Field(default_factory=list)
    max_daily_distance: float = Field(default=130, gt=0, le=300)
    history: list[dict] = Field(default_factory=list, max_length=30)
    current_plan: dict | None = None
    current_day: int = Field(default=1, ge=1, le=10)
    completed_distance: float | None = Field(default=None, ge=0)
    fatigue: Literal['low','medium','high'] | None = None
    weather: str | None = None
    remaining_hours: float | None = Field(default=None, ge=0, le=24)
