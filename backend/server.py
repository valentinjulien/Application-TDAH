"""
TDAH Companion - Backend API
FastAPI backend pour l'application de gestion TDAH avec Emergent Auth
"""
from fastapi import FastAPI, HTTPException, Request, Response, Cookie
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime, timezone, timedelta
from pymongo import MongoClient
from bson import ObjectId
import os
import uuid
import httpx
from dotenv import load_dotenv

load_dotenv()

app = FastAPI(title="TDAH Companion API", version="1.0.0")

# CORS - Important pour les cookies
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
users_collection = db["users"]
sessions_collection = db["user_sessions"]


# === AUTH MODELS ===
class User(BaseModel):
    user_id: str
    email: str
    name: str
    picture: Optional[str] = None


# === TASK MODELS ===
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


async def get_current_user(request: Request) -> Optional[User]:
    """Get current user from session cookie or Authorization header"""
    session_token = request.cookies.get("session_token")
    
    if not session_token:
        auth_header = request.headers.get("Authorization")
        if auth_header and auth_header.startswith("Bearer "):
            session_token = auth_header.split(" ")[1]
    
    if not session_token:
        return None
    
    # Find session
    session_doc = sessions_collection.find_one(
        {"session_token": session_token},
        {"_id": 0}
    )
    
    if not session_doc:
        return None
    
    # Check expiry
    expires_at = session_doc.get("expires_at")
    if isinstance(expires_at, str):
        expires_at = datetime.fromisoformat(expires_at.replace("Z", "+00:00"))
    if expires_at.tzinfo is None:
        expires_at = expires_at.replace(tzinfo=timezone.utc)
    if expires_at < datetime.now(timezone.utc):
        return None
    
    # Get user
    user_doc = users_collection.find_one(
        {"user_id": session_doc["user_id"]},
        {"_id": 0}
    )
    
    if not user_doc:
        return None
    
    return User(**user_doc)


# === AUTH ROUTES ===

@app.post("/api/auth/session")
async def create_session(request: Request, response: Response):
    """Exchange session_id for session_token via Emergent Auth"""
    body = await request.json()
    session_id = body.get("session_id")
    
    if not session_id:
        raise HTTPException(status_code=400, detail="session_id required")
    
    # Call Emergent Auth to get user data
    async with httpx.AsyncClient() as client:
        try:
            auth_response = await client.get(
                "https://demobackend.emergentagent.com/auth/v1/env/oauth/session-data",
                headers={"X-Session-ID": session_id},
                timeout=10.0
            )
            
            if auth_response.status_code != 200:
                raise HTTPException(status_code=401, detail="Invalid session_id")
            
            auth_data = auth_response.json()
        except httpx.RequestError as e:
            raise HTTPException(status_code=500, detail=f"Auth service error: {str(e)}")
    
    # Extract user data
    email = auth_data.get("email")
    name = auth_data.get("name", email.split("@")[0] if email else "User")
    picture = auth_data.get("picture")
    session_token = auth_data.get("session_token")
    
    if not email or not session_token:
        raise HTTPException(status_code=400, detail="Invalid auth response")
    
    # Find or create user
    existing_user = users_collection.find_one({"email": email}, {"_id": 0})
    
    if existing_user:
        user_id = existing_user["user_id"]
        # Update user info
        users_collection.update_one(
            {"email": email},
            {"$set": {"name": name, "picture": picture}}
        )
    else:
        # Create new user
        user_id = f"user_{uuid.uuid4().hex[:12]}"
        users_collection.insert_one({
            "user_id": user_id,
            "email": email,
            "name": name,
            "picture": picture,
            "created_at": datetime.now(timezone.utc).isoformat()
        })
    
    # Store session
    expires_at = datetime.now(timezone.utc) + timedelta(days=7)
    sessions_collection.update_one(
        {"user_id": user_id},
        {
            "$set": {
                "session_token": session_token,
                "expires_at": expires_at.isoformat(),
                "created_at": datetime.now(timezone.utc).isoformat()
            }
        },
        upsert=True
    )
    
    # Set httpOnly cookie - detect if running on HTTPS or HTTP
    is_secure = request.url.scheme == "https" or "emergentagent.com" in str(request.url)
    response.set_cookie(
        key="session_token",
        value=session_token,
        httponly=True,
        secure=is_secure,
        samesite="none" if is_secure else "lax",
        path="/",
        max_age=7 * 24 * 60 * 60  # 7 days
    )
    
    return {
        "user_id": user_id,
        "email": email,
        "name": name,
        "picture": picture
    }


@app.get("/api/auth/me")
async def get_me(request: Request):
    """Get current authenticated user"""
    user = await get_current_user(request)
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    return user.model_dump()


@app.post("/api/auth/logout")
async def logout(request: Request, response: Response):
    """Logout user and clear session"""
    user = await get_current_user(request)
    
    if user:
        # Delete session from database
        sessions_collection.delete_one({"user_id": user.user_id})
    
    # Clear cookie
    response.delete_cookie(
        key="session_token",
        path="/",
        secure=True,
        samesite="none"
    )
    
    return {"message": "Logged out successfully"}


# === GENERAL ROUTES ===

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
    
    today_sessions = list(pomodoro_collection.find({
        "user_id": user_id,
        "completed": True,
        "created_at": {"$gte": today_start.isoformat()}
    }))
    
    total_sessions = pomodoro_collection.count_documents({
        "user_id": user_id,
        "completed": True
    })
    
    today_minutes = sum(s.get("duration_minutes", 25) for s in today_sessions)
    
    return {
        "today_sessions": len(today_sessions),
        "today_minutes": today_minutes,
        "total_sessions": total_sessions,
        "streak": calculate_streak(user_id)
    }


def calculate_streak(user_id: str) -> int:
    """Calcule le nombre de jours consécutifs avec au moins une session"""
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
        
        if streak > 365:
            break
    
    return streak


@app.post("/api/pomodoro/session")
async def create_pomodoro_session(session: PomodoroSession):
    session_data = session.model_dump()
    session_data["created_at"] = datetime.now(timezone.utc).isoformat()
    result = pomodoro_collection.insert_one(session_data)
    session_data["id"] = str(result.inserted_id)
    session_data.pop("_id", None)
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
    post_data.pop("_id", None)
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
