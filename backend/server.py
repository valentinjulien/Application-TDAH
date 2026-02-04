"""
TDAH Companion - Backend API
FastAPI backend pour l'application de gestion TDAH
"""
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime, timezone
from pymongo import MongoClient
from bson import ObjectId
import os
from dotenv import load_dotenv

load_dotenv()

app = FastAPI(title="TDAH Companion API", version="1.0.0")

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# MongoDB
MONGO_URL = os.environ.get("MONGO_URL", "mongodb://localhost:27017")
DB_NAME = os.environ.get("DB_NAME", "tdah_companion")

client = MongoClient(MONGO_URL)
db = client[DB_NAME]

# Collections
tasks_collection = db["tasks"]
moods_collection = db["moods"]
pomodoro_collection = db["pomodoro_sessions"]
community_collection = db["community_posts"]


# === MODELS ===
class TaskCreate(BaseModel):
    text: str
    priority: str = "medium"
    quadrant: int = Field(ge=1, le=4, default=1)
    user_id: Optional[str] = None


class TaskUpdate(BaseModel):
    text: Optional[str] = None
    priority: Optional[str] = None
    quadrant: Optional[int] = None
    completed: Optional[bool] = None


class MoodEntry(BaseModel):
    user_id: str
    mood_level: int = Field(ge=1, le=5)
    energy_level: int = Field(ge=1, le=5)
    notes: Optional[str] = None


class PomodoroSession(BaseModel):
    user_id: str
    duration_minutes: int = 25
    break_minutes: int = 5
    completed: bool = False
    task_id: Optional[str] = None


class CommunityPost(BaseModel):
    user_id: str
    username: str
    content: str
    category: str = "general"


# === HELPERS ===
def serialize_doc(doc):
    """Serialize MongoDB document to JSON-safe dict"""
    if doc is None:
        return None
    doc["id"] = str(doc.pop("_id"))
    return doc


# === ROUTES ===

@app.get("/api/health")
async def health_check():
    return {"status": "healthy", "timestamp": datetime.now(timezone.utc).isoformat()}


# --- TASKS ---
@app.get("/api/tasks")
async def get_tasks(user_id: Optional[str] = None):
    query = {}
    if user_id:
        query["user_id"] = user_id
    tasks = list(tasks_collection.find(query).sort("created_at", -1))
    return [serialize_doc(t) for t in tasks]


@app.post("/api/tasks")
async def create_task(task: TaskCreate):
    task_data = task.model_dump()
    task_data["created_at"] = datetime.now(timezone.utc).isoformat()
    task_data["completed"] = False
    result = tasks_collection.insert_one(task_data)
    task_data["id"] = str(result.inserted_id)
    task_data.pop("_id", None)
    return task_data


@app.put("/api/tasks/{task_id}")
async def update_task(task_id: str, task: TaskUpdate):
    try:
        update_data = {k: v for k, v in task.model_dump().items() if v is not None}
        if not update_data:
            raise HTTPException(status_code=400, detail="No update data provided")
        
        result = tasks_collection.update_one(
            {"_id": ObjectId(task_id)},
            {"$set": update_data}
        )
        if result.matched_count == 0:
            raise HTTPException(status_code=404, detail="Task not found")
        
        updated_task = tasks_collection.find_one({"_id": ObjectId(task_id)})
        return serialize_doc(updated_task)
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@app.delete("/api/tasks/{task_id}")
async def delete_task(task_id: str):
    try:
        result = tasks_collection.delete_one({"_id": ObjectId(task_id)})
        if result.deleted_count == 0:
            raise HTTPException(status_code=404, detail="Task not found")
        return {"message": "Task deleted successfully"}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


# --- MOOD TRACKING ---
@app.get("/api/moods")
async def get_moods(user_id: str, limit: int = 30):
    moods = list(moods_collection.find({"user_id": user_id}).sort("created_at", -1).limit(limit))
    return [serialize_doc(m) for m in moods]


@app.post("/api/moods")
async def create_mood(mood: MoodEntry):
    mood_data = mood.model_dump()
    mood_data["created_at"] = datetime.now(timezone.utc).isoformat()
    result = moods_collection.insert_one(mood_data)
    mood_data["id"] = str(result.inserted_id)
    mood_data.pop("_id", None)
    return mood_data


# --- POMODORO ---
@app.get("/api/pomodoro/stats")
async def get_pomodoro_stats(user_id: str):
    today_start = datetime.now(timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0)
    
    # Sessions d'aujourd'hui
    today_sessions = list(pomodoro_collection.find({
        "user_id": user_id,
        "completed": True,
        "created_at": {"$gte": today_start.isoformat()}
    }))
    
    # Total des sessions
    total_sessions = pomodoro_collection.count_documents({
        "user_id": user_id,
        "completed": True
    })
    
    # Calcul du temps total aujourd'hui
    today_minutes = sum(s.get("duration_minutes", 25) for s in today_sessions)
    
    return {
        "today_sessions": len(today_sessions),
        "today_minutes": today_minutes,
        "total_sessions": total_sessions,
        "streak": calculate_streak(user_id)
    }


def calculate_streak(user_id: str) -> int:
    """Calcule le nombre de jours consécutifs avec au moins une session"""
    from datetime import timedelta
    streak = 0
    current_date = datetime.now(timezone.utc).date()
    
    while True:
        day_start = datetime.combine(current_date, datetime.min.time()).replace(tzinfo=timezone.utc)
        day_end = day_start + timedelta(days=1)
        
        sessions = pomodoro_collection.count_documents({
            "user_id": user_id,
            "completed": True,
            "created_at": {
                "$gte": day_start.isoformat(),
                "$lt": day_end.isoformat()
            }
        })
        
        if sessions > 0:
            streak += 1
            current_date -= timedelta(days=1)
        else:
            break
        
        if streak > 365:  # Safety limit
            break
    
    return streak


@app.post("/api/pomodoro/session")
async def create_pomodoro_session(session: PomodoroSession):
    session_data = session.model_dump()
    session_data["created_at"] = datetime.now(timezone.utc).isoformat()
    result = pomodoro_collection.insert_one(session_data)
    session_data["id"] = str(result.inserted_id)
    del session_data["_id"] if "_id" in session_data else None
    return session_data


# --- COMMUNITY ---
@app.get("/api/community/posts")
async def get_community_posts(category: Optional[str] = None, limit: int = 50):
    query = {}
    if category and category != "all":
        query["category"] = category
    posts = list(community_collection.find(query).sort("created_at", -1).limit(limit))
    return [serialize_doc(p) for p in posts]


@app.post("/api/community/posts")
async def create_community_post(post: CommunityPost):
    post_data = post.model_dump()
    post_data["created_at"] = datetime.now(timezone.utc).isoformat()
    post_data["likes"] = 0
    post_data["replies"] = []
    result = community_collection.insert_one(post_data)
    post_data["id"] = str(result.inserted_id)
    del post_data["_id"] if "_id" in post_data else None
    return post_data


@app.post("/api/community/posts/{post_id}/like")
async def like_post(post_id: str):
    try:
        result = community_collection.update_one(
            {"_id": ObjectId(post_id)},
            {"$inc": {"likes": 1}}
        )
        if result.matched_count == 0:
            raise HTTPException(status_code=404, detail="Post not found")
        return {"message": "Post liked"}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8001)
