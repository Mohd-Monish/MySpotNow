from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from datetime import datetime
from typing import List, Optional

app = FastAPI()

# --- CONFIGURATION ---
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- MODELS ---
class Customer(BaseModel):
    name: str
    phone: str
    service_type: str = "Haircut" # Default

class LeaveRequest(BaseModel):
    token: int

# --- DATABASE ---
queue_db = []
history_db = []
current_token = 100

# --- ENDPOINTS ---

@app.get("/")
def home():
    return {"message": "SlotSync Backend Online"}

@app.get("/queue/status")
def get_status():
    waiting_count = len(queue_db)
    # Estimate: Haircut = 20m, Shave = 10m. For simplicity, avg 15m.
    eta_minutes = waiting_count * 15
    
    return {
        "shop_status": "Open",
        "people_ahead": waiting_count,
        "estimated_wait_minutes": eta_minutes,
        "queue": queue_db,
        "history": history_db[-5:] # Send last 5 finished
    }

@app.post("/queue/join")
def join_queue(customer: Customer):
    global current_token
    current_token += 1
    
    new_entry = {
        "token": current_token,
        "name": customer.name,
        "phone": customer.phone,
        "service": customer.service_type,
        "status": "waiting",
        "joined_at": datetime.now().strftime("%I:%M %p")
    }
    
    queue_db.append(new_entry)
    
    return {
        "message": "Joined successfully",
        "your_token": current_token,
        "your_name": customer.name # Return this so frontend can save it
    }

# --- NEW: Allow User to Leave Queue ---
@app.post("/queue/leave")
def leave_queue(req: LeaveRequest):
    global queue_db
    # Find and remove the person with this token
    original_count = len(queue_db)
    queue_db = [c for c in queue_db if c['token'] != req.token]
    
    if len(queue_db) < original_count:
        return {"message": "You have left the queue."}
    else:
        return {"message": "Token not found (maybe already removed?)"}

# --- VENDOR: Call Next ---
@app.post("/queue/next")
def next_customer():
    if len(queue_db) > 0:
        served = queue_db.pop(0)
        served["status"] = "completed"
        served["completed_at"] = datetime.now().strftime("%I:%M %p")
        history_db.append(served)
        return {"message": f"Called #{served['token']}"}
    return {"message": "Queue empty"}