from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, validator
from datetime import datetime
from typing import List

app = FastAPI()

# --- CONFIG ---
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

MENU = {
    "Haircut": 20,
    "Shave": 10,
    "Head Massage": 15,
    "Hair Color": 45,
    "Facial": 30
}

# --- DATABASE ---
queue_db = []
history_db = []
current_token = 100

# NEW: Tracks when the current service actually started
# This is the "Master Clock"
current_service_start = None

# --- MODELS ---
class JoinRequest(BaseModel):
    name: str
    phone: str
    services: List[str]

    @validator('phone')
    def validate_phone(cls, v):
        if not v.isdigit() or len(v) != 10:
            raise ValueError('Phone must be 10 digits')
        return v

class AddServiceRequest(BaseModel):
    token: int
    new_services: List[str]

# --- HELPERS ---
def calculate_status():
    # 1. Total Raw Duration of everyone in line
    total_minutes = sum(c['total_duration'] for c in queue_db)
    
    # 2. Calculate how much time has passed since service started
    elapsed_seconds = 0
    if queue_db and current_service_start:
        elapsed_seconds = (datetime.now() - current_service_start).total_seconds()
    
    # 3. Calculate Real Remaining Time (Total - Elapsed)
    seconds_left = (total_minutes * 60) - elapsed_seconds
    
    # Don't show negative time (if barber is slow)
    if seconds_left < 0: 
        seconds_left = 0
        
    return {
        "count": len(queue_db),
        "seconds_left": int(seconds_left),  # Send SECONDS, not minutes
        "stats": {
            "served": len(history_db), 
            "minutes": sum(c['total_duration'] for c in history_db)
        }
    }

# --- ENDPOINTS ---
@app.get("/")
def home(): return {"status": "Online"}

@app.get("/queue/status")
def get_status():
    status = calculate_status()
    return {
        "shop_status": "Open",
        "people_ahead": status["count"],
        "seconds_left": status["seconds_left"], # The Master Time
        "queue": queue_db,
        "daily_stats": status["stats"]
    }

@app.post("/queue/join")
def join_queue(req: JoinRequest):
    global current_token, current_service_start
    
    # If queue was empty, START the timer now
    if len(queue_db) == 0:
        current_service_start = datetime.now()

    current_token += 1
    duration = sum(MENU.get(s, 0) for s in list(set(req.services)))
    
    new_customer = {
        "token": current_token,
        "name": req.name,
        "phone": req.phone,
        "services": list(set(req.services)),
        "total_duration": duration,
        "joined_at": datetime.now().strftime("%I:%M %p")
    }
    queue_db.append(new_customer)
    return {"message": "Joined", "token": current_token}

@app.post("/queue/add-service")
def add_service(req: AddServiceRequest):
    for customer in queue_db:
        if customer['token'] == req.token:
            for s in req.new_services:
                if s not in customer['services']:
                    customer['services'].append(s)
                    customer['total_duration'] += MENU.get(s, 0)
            return {"message": "Updated"}
    raise HTTPException(status_code=404, detail="Token not found")

@app.post("/queue/next")
def next_customer():
    global current_service_start
    if not queue_db: return {"message": "Queue Empty"}
    
    # Move current to history
    customer = queue_db.pop(0)
    history_db.insert(0, customer)
    
    # RESET TIMER for the next person
    if len(queue_db) > 0:
        current_service_start = datetime.now()
    else:
        current_service_start = None # Stop timer if empty
        
    return {"message": f"Called #{customer['token']}"}

@app.post("/queue/reset")
def reset_system():
    global queue_db, history_db, current_token, current_service_start
    queue_db = []
    history_db = []
    current_token = 100
    current_service_start = None
    return {"message": "Reset Done"}