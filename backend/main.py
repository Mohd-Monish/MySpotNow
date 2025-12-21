from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import time
from datetime import datetime

app = FastAPI()

# ==========================================
# 1. CONFIGURATION
# ==========================================

# Allow your Frontend (React/Next.js) to talk to this Backend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allows all connections (Great for testing)
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ==========================================
# 2. DATA MODELS (The Shape of your Data)
# ==========================================

class Customer(BaseModel):
    name: str
    phone: str
    service_type: str = "Haircut"  # Default service if none provided

# ==========================================
# 3. STORAGE (Temporary Memory)
# ==========================================
# NOTE: These reset if you restart the server. 
# For a real app later, we would replace this with a Database (SQLite/Postgres).

queue_db = []      # List of people currently waiting
history_db = []    # List of people who have been served (History)
current_token = 100 # Starting token number for the day

# ==========================================
# 4. API ENDPOINTS (The Controls)
# ==========================================

@app.get("/")
def home():
    """Simple check to see if server is online."""
    return {"message": "SlotSync Backend is Online & Ready!"}

@app.get("/queue/status")
def get_status():
    """
    Returns the full dashboard data:
    1. Who is waiting?
    2. How long is the wait?
    3. Who did we just finish? (History)
    """
    # Calculate wait time: 20 minutes per person in line
    waiting_count = len(queue_db)
    eta_minutes = waiting_count * 20
    
    return {
        "shop_status": "Open",
        "people_ahead": waiting_count,
        "estimated_wait_minutes": eta_minutes,
        "queue": queue_db,       # The active list
        "history": history_db    # The finished list
    }

@app.post("/queue/join")
def join_queue(customer: Customer):
    """
    Adds a new customer to the back of the line.
    """
    global current_token
    current_token += 1 # Increment token for unique ID
    
    # Create the new customer entry
    new_entry = {
        "token": current_token,
        "name": customer.name,
        "phone": customer.phone,
        "service": customer.service_type,
        "status": "waiting",
        "joined_at": datetime.now().strftime("%I:%M %p") # e.g. "10:30 AM"
    }
    
    # Add to the database list
    queue_db.append(new_entry)
    
    return {
        "message": "Welcome to the queue!",
        "your_token": current_token,
        "eta_minutes": len(queue_db) * 20
    }

@app.post("/queue/next")
def next_customer():
    """
    VENDOR BUTTON ACTION:
    Removes the first person from the queue and moves them to 'History'.
    """
    if len(queue_db) > 0:
        # 1. Get the person at the front of the line (Index 0)
        served_customer = queue_db.pop(0)
        
        # 2. Mark them as completed
        served_customer["status"] = "completed"
        served_customer["completed_at"] = datetime.now().strftime("%I:%M %p")
        
        # 3. Save to history (so we don't lose the record)
        history_db.insert(0, served_customer) # Add to top of history
        
        return {
            "message": f"Called {served_customer['name']}",
            "remaining_people": len(queue_db)
        }
    else:
        return {"message": "Queue is empty! Time to relax."}