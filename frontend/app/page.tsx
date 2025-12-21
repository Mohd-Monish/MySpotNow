"use client";

import { useState, useEffect } from 'react';

// --- TYPES ---
type Customer = {
  token: number;
  name: string;
  service: string;
  joined_at: string;
};

type QueueData = {
  shop_status: string;
  people_ahead: number;
  estimated_wait_minutes: number;
  queue: Customer[];
};

export default function Home() {
  // --- STATE ---
  const [data, setData] = useState<QueueData | null>(null);
  const [loading, setLoading] = useState(true);
  
  // User Session State (Who am I?)
  const [myToken, setMyToken] = useState<number | null>(null);
  const [myName, setMyName] = useState<string | null>(null);

  // Form State
  const [showModal, setShowModal] = useState(false);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [service, setService] = useState("Haircut"); // Default service
  const [submitting, setSubmitting] = useState(false);

  // --- API CONFIG (CHANGE THIS TO YOUR REAL BACKEND URL) ---
  const API_URL = 'https://myspotnow-api.onrender.com'; 

  // --- 1. INITIAL LOAD (Restore Session) ---
  useEffect(() => {
    // Check if user is already in queue (from LocalStorage)
    const savedToken = localStorage.getItem('slotSync_token');
    const savedName = localStorage.getItem('slotSync_name');
    
    if (savedToken && savedName) {
      setMyToken(parseInt(savedToken));
      setMyName(savedName);
    }

    fetchStatus();
    const interval = setInterval(fetchStatus, 3000); 
    return () => clearInterval(interval);
  }, []);

  const fetchStatus = async () => {
    try {
      const res = await fetch(`${API_URL}/queue/status`);
      if (!res.ok) throw new Error("Server Error");
      const json = await res.json();
      setData(json);
      setLoading(false);
    } catch (err) {
      console.error(err);
    }
  };

  // --- 2. JOIN QUEUE ---
  const handleJoin = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      const res = await fetch(`${API_URL}/queue/join`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, phone, service_type: service }),
      });

      const result = await res.json();
      
      if (res.ok) {
        // SAVE TO LOCAL STORAGE (So refresh doesn't kill session)
        localStorage.setItem('slotSync_token', result.your_token.toString());
        localStorage.setItem('slotSync_name', result.your_name);
        
        setMyToken(result.your_token);
        setMyName(result.your_name);
        
        setShowModal(false);
        fetchStatus();
      } else {
        alert("Failed to join.");
      }
    } catch (error) {
      alert("Network Error.");
    } finally {
      setSubmitting(false);
    }
  };

  // --- 3. LEAVE QUEUE (Cancel) ---
  const handleLeave = async () => {
    if(!confirm("Are you sure you want to leave the queue?")) return;
    
    if (myToken) {
        await fetch(`${API_URL}/queue/leave`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ token: myToken }),
        });
    }

    // Clear local session
    localStorage.removeItem('slotSync_token');
    localStorage.removeItem('slotSync_name');
    setMyToken(null);
    setMyName(null);
    fetchStatus();
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center text-blue-600 font-bold">Loading SlotSync...</div>;

  // Check if "My Token" is actually still in the list (maybe admin deleted me?)
  const amIInQueue = data?.queue.some(c => c.token === myToken);

  return (
    <main className="min-h-screen bg-gray-50 p-4 md:p-8 flex flex-col items-center font-sans text-gray-900">
      
      {/* HEADER CARD */}
      <div className="w-full max-w-md bg-white rounded-3xl shadow-xl overflow-hidden mb-6 border border-gray-100">
        <div className="bg-blue-600 p-6 text-center text-white relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-br from-blue-500 to-blue-700 opacity-50"></div>
          <h1 className="text-2xl font-black tracking-tight relative z-10">SlotSync</h1>
          <p className="text-blue-100 text-sm opacity-90 relative z-10">Smart Queue System</p>
        </div>

        <div className="p-8 text-center">
          {/* DYNAMIC STATUS DISPLAY */}
          {amIInQueue ? (
             <div className="animate-in zoom-in duration-300">
                <p className="text-sm font-bold text-gray-400 uppercase">You are currently</p>
                <p className="text-5xl font-black text-blue-600 mt-2">#{myToken}</p>
                <p className="text-gray-500 text-sm mt-1">Wait for your turn</p>
                
                <button 
                  onClick={handleLeave}
                  className="mt-6 text-red-500 text-sm font-bold hover:bg-red-50 px-4 py-2 rounded-full transition"
                >
                  ✕ Leave Queue
                </button>
             </div>
          ) : (
             <div>
                <p className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-2">Est. Wait Time</p>
                <div className="text-6xl font-black text-gray-800 tracking-tighter">
                    {data?.estimated_wait_minutes}<span className="text-lg text-gray-400 ml-1">min</span>
                </div>
                <div className="mt-6 flex justify-center">
                    <span className="inline-flex items-center bg-green-100 text-green-700 text-xs font-bold px-3 py-1 rounded-full">
                        ● {data?.people_ahead} People Waiting
                    </span>
                </div>
                <button 
                    onClick={() => setShowModal(true)}
                    className="w-full mt-8 bg-black hover:bg-gray-800 text-white font-bold py-4 rounded-xl text-lg shadow-lg transition transform active:scale-95"
                >
                    Join Queue
                </button>
             </div>
          )}
        </div>
      </div>

      {/* QUEUE LIST */}
      <div className="w-full max-w-md">
        <div className="flex items-center justify-between mb-4 px-2">
          <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider">Current Queue</h3>
          <span className="text-[10px] text-gray-400 bg-gray-200 px-2 py-1 rounded-full">Live Updates</span>
        </div>
        
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden divide-y divide-gray-50">
          {data?.queue.map((customer, index) => {
            const isMe = customer.token === myToken;
            return (
                <div key={customer.token} className={`p-4 flex items-center justify-between transition ${isMe ? 'bg-blue-50' : 'bg-white'}`}>
                <div className="flex items-center gap-3">
                    <div className={`
                    w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold
                    ${index === 0 ? 'bg-green-100 text-green-700' : isMe ? 'bg-blue-500 text-white' : 'bg-gray-100 text-gray-500'}
                    `}>
                    #{customer.token}
                    </div>
                    <div>
                    <p className={`font-bold ${isMe ? 'text-blue-700' : 'text-gray-800'}`}>
                        {customer.name} {isMe && "(You)"}
                    </p>
                    <div className="flex items-center gap-2 text-xs text-gray-400">
                        <span>{customer.service}</span>
                        <span>•</span>
                        <span>{customer.joined_at}</span>
                    </div>
                    </div>
                </div>
                {index === 0 && (
                    <span className="bg-green-100 text-green-700 text-[10px] font-bold px-2 py-1 rounded uppercase tracking-wide">
                    Now Serving
                    </span>
                )}
                </div>
            )
          })}
          
          {data?.queue.length === 0 && (
            <div className="p-10 text-center text-gray-400">
              <p className="italic">The shop is free right now!</p>
            </div>
          )}
        </div>
      </div>

      {/* JOIN MODAL */}
      {showModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm animate-in fade-in zoom-in duration-200 overflow-hidden">
            <div className="bg-gray-50 px-6 py-4 border-b border-gray-100 flex justify-between items-center">
              <h2 className="font-bold text-lg text-gray-800">Join Queue</h2>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600 font-bold">✕</button>
            </div>
            
            <form onSubmit={handleJoin} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Your Name</label>
                <input 
                  autoFocus required
                  className="w-full p-3 bg-white border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:outline-none text-gray-900"
                  placeholder="e.g. Rahul"
                  value={name}
                  onChange={e => setName(e.target.value)}
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Service</label>
                <select 
                    className="w-full p-3 bg-white border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:outline-none text-gray-900 appearance-none"
                    value={service}
                    onChange={e => setService(e.target.value)}
                >
                    <option value="Haircut">Haircut (20 min)</option>
                    <option value="Shave">Shave (10 min)</option>
                    <option value="Massage">Head Massage (15 min)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Phone (Optional)</label>
                <input 
                  type="tel"
                  className="w-full p-3 bg-white border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:outline-none text-gray-900"
                  placeholder="For notifications"
                  value={phone}
                  onChange={e => setPhone(e.target.value)}
                />
              </div>

              <button 
                disabled={submitting}
                className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white font-bold py-3 rounded-xl mt-2 transition shadow-md"
              >
                {submitting ? "Booking..." : "Confirm Spot"}
              </button>
            </form>
          </div>
        </div>
      )}
    </main>
  );
}