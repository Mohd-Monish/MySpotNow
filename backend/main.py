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

# --- DATABASE ---
queue_db = []
history_db = []
current_token = 100

# --- HELPERS ---
def get_total_wait_time():
    return sum(c['total_duration'] for c in queue_db)

def get_daily_stats():
    return {
        "served": len(history_db), 
        "minutes": sum(c['total_duration'] for c in history_db)
    }

# --- ENDPOINTS ---

@app.get("/")
def home(): return {"status": "Online"}

@app.get("/queue/status")
def get_status():
    return {
        "shop_status": "Open",
        "people_ahead": len(queue_db),
        "total_wait_minutes": get_total_wait_time(),
        "queue": queue_db,
        "daily_stats": get_daily_stats()
    }

@app.post("/queue/join")
def join_queue(req: JoinRequest):
    global current_token
    # Filter duplicates just in case
    unique_services = list(set(req.services))
    
    current_token += 1
    duration = sum(MENU.get(s, 0) for s in unique_services)
    
    new_customer = {
        "token": current_token,
        "name": req.name,
        "phone": req.phone,
        "services": unique_services,
        "total_duration": duration,
        "status": "waiting",
        "joined_at": datetime.now().strftime("%I:%M %p")
    }
    queue_db.append(new_customer)
    return {"message": "Joined", "token": current_token}

@app.post("/queue/add-service")
def add_service(req: AddServiceRequest):
    for customer in queue_db:
        if customer['token'] == req.token:
            # LOGIC: Only add services that are NOT already in the list
            added_services = []
            for s in req.new_services:
                if s not in customer['services']:
                    customer['services'].append(s)
                    customer['total_duration'] += MENU.get(s, 0)
                    added_services.append(s)
            
            if not added_services:
                return {"message": "No new services added (duplicates ignored)"}
                
            return {"message": "Updated", "added": added_services}
            
    raise HTTPException(status_code=404, detail="Token not found")

@app.post("/queue/next")
def next_customer():
    if not queue_db: return {"message": "Queue Empty"}
    customer = queue_db.pop(0)
    customer['status'] = 'completed'
    history_db.insert(0, customer)
    return {"message": f"Called #{customer['token']}"}

@app.post("/queue/reset")
def reset_system():
    global queue_db, history_db, current_token
    queue_db = []
    history_db = []
    current_token = 100
    return {"message": "Reset Done"}