"use client";
import { useState, useEffect } from 'react';

// Define what a "Customer" looks like so React understands the data
type Customer = {
  token: number;
  name: string;
  phone: string;
  joined_at: string;
};

export default function AdminPanel() {
  // --- STATE VARIABLES ---
  // Stores the list of people waiting
  const [queue, setQueue] = useState<Customer[]>([]);
  // Stores the history of served customers
  const [history, setHistory] = useState<Customer[]>([]);
  // Stores general stats (wait time, count)
  const [stats, setStats] = useState({ people_ahead: 0, wait_time: 0 });
  // Loading state (true = showing spinner, false = showing data)
  const [loading, setLoading] = useState(true);

  // --- API FUNCTIONS ---

  // 1. Fetch the latest data from Python backend
  const refreshQueue = async () => {
    try {
      const res = await fetch('https://myspotnow-api.onrender.com/queue/status');
      const data = await res.json();
      
      // Update our state variables with new data
      setQueue(data.queue || []);
      setHistory(data.history || []);
      setStats({
        people_ahead: data.people_ahead,
        wait_time: data.estimated_wait_minutes
      });
      setLoading(false); // Data loaded, stop spinner
    } catch (err) {
      console.error("Connection Error:", err);
      // Optional: Alert user if connection fails
    }
  };

  // 2. Tell backend to move to the next customer
  const handleNext = async () => {
    // Optimistic Update: Remove first person visually immediately (feels faster)
    const personToServe = queue[0];
    if (!personToServe) return;

    // Send command to backend
    await fetch('https://myspotnow-api.onrender.com/queue/next', { method: 'POST' });
    
    // Refresh data to ensure we are in sync with server
    refreshQueue(); 
  };

  // --- AUTO-REFRESH LOGIC ---
  useEffect(() => {
    refreshQueue(); // Run once when page loads
    
    // Then run every 5 seconds automatically
    const interval = setInterval(refreshQueue, 5000);
    
    // Cleanup when leaving page
    return () => clearInterval(interval);
  }, []);

  // --- RENDER: LOADING SCREEN ---
  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-900 text-white">
        <div className="text-xl font-bold animate-pulse">Connecting to Shop...</div>
      </div>
    );
  }

  // --- RENDER: MAIN DASHBOARD ---
  return (
    <div className="min-h-screen bg-gray-900 text-white font-sans p-6 md:p-10">
      
      {/* 1. HEADER SECTION */}
      <div className="flex justify-between items-end border-b border-gray-700 pb-6 mb-8">
        <div>
          <h1 className="text-3xl font-bold text-blue-400">SlotSync</h1>
          <p className="text-gray-400 text-sm mt-1">Vendor Dashboard</p>
        </div>
        <div className="text-right">
           <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-green-900 text-green-300">
             ● System Online
           </span>
        </div>
      </div>

      {/* 2. KEY STATS CARDS */}
      <div className="grid grid-cols-2 gap-4 mb-8">
        {/* Card 1: Queue Count */}
        <div className="bg-gray-800 p-6 rounded-2xl shadow-lg border border-gray-700">
          <p className="text-gray-400 text-xs font-bold uppercase tracking-wider">In Queue</p>
          <p className="text-5xl font-bold mt-2">{stats.people_ahead}</p>
        </div>
        
        {/* Card 2: Wait Time */}
        <div className="bg-gray-800 p-6 rounded-2xl shadow-lg border border-gray-700">
          <p className="text-gray-400 text-xs font-bold uppercase tracking-wider">Est. Wait</p>
          <div className="flex items-baseline mt-2">
            <p className="text-5xl font-bold">{stats.wait_time}</p>
            <span className="text-xl text-gray-500 ml-1">mins</span>
          </div>
        </div>
      </div>

      {/* 3. THE "NEXT CUSTOMER" ACTION AREA */}
      <div className="mb-10">
        {queue.length > 0 ? (
            // If people are waiting, show the button
            <button 
                onClick={handleNext}
                className="w-full py-6 bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 text-white font-bold text-2xl rounded-2xl shadow-xl transform transition hover:scale-[1.02] active:scale-95 flex flex-col items-center justify-center"
            >
                <span>Call #{queue[0].token}</span>
                <span className="text-sm font-normal opacity-80 mt-1">Next: {queue[0].name}</span>
            </button>
        ) : (
            // If queue is empty, disable button
            <div className="w-full py-6 bg-gray-800 text-gray-500 font-bold text-xl rounded-2xl border-2 border-dashed border-gray-700 text-center">
                The Queue is Empty ☕
            </div>
        )}
      </div>

      {/* 4. LIST: UPCOMING CUSTOMERS */}
      <div className="grid md:grid-cols-2 gap-8">
        
        {/* LEFT COLUMN: Waiting List */}
        <div>
          <h3 className="text-gray-400 text-xs font-bold uppercase mb-4 tracking-wider">Up Next</h3>
          <div className="space-y-3">
            {queue.map((person, index) => (
              <div 
                key={person.token} 
                className={`flex items-center justify-between p-4 rounded-xl border-l-4 shadow-sm ${
                    index === 0 ? "bg-gray-800 border-blue-500" : "bg-gray-800/50 border-gray-600"
                }`}
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-blue-300 font-bold">#{person.token}</span>
                    <span className="font-bold text-lg">{person.name}</span>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">Joined at {person.joined_at}</p>
                </div>
                {index === 0 && (
                    <span className="bg-blue-500/20 text-blue-300 text-[10px] font-bold px-2 py-1 rounded uppercase">
                        Current
                    </span>
                )}
              </div>
            ))}
            {queue.length === 0 && <p className="text-gray-600 italic text-sm">No active customers.</p>}
          </div>
        </div>

        {/* RIGHT COLUMN: Recently Completed (History) */}
        <div>
            <h3 className="text-gray-400 text-xs font-bold uppercase mb-4 tracking-wider">Just Completed</h3>
            <div className="space-y-3 opacity-60">
                {history.slice(0, 3).map((person) => (
                    <div key={person.token} className="flex items-center justify-between p-3 rounded-lg bg-gray-800 border-l-4 border-green-500">
                         <div>
                            <span className="font-mono text-gray-400 text-sm">#{person.token}</span>
                            <span className="ml-2 font-medium text-gray-300 line-through decoration-gray-500">{person.name}</span>
                         </div>
                         <span className="text-green-500 text-xs">Done</span>
                    </div>
                ))}
                {history.length === 0 && <p className="text-gray-600 italic text-sm">No history yet.</p>}
            </div>
        </div>

      </div>
    </div>
  );
}