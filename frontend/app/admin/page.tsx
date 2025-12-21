"use client";
import { useState, useEffect } from 'react';

const API_URL = "https://myspotnow-api.onrender.com";

export default function Admin() {
  const [data, setData] = useState<any>(null);
  const [selected, setSelected] = useState<any>(null);
  const [timeLeft, setTimeLeft] = useState(0);

  // --- INITIAL LOAD ---
  useEffect(() => {
    refresh();
    
    // Poll Server every 3s
    const poller = setInterval(refresh, 3000);
    
    // Local Countdown (Visual only)
    const timer = setInterval(() => {
        setTimeLeft(prev => prev > 0 ? prev - 1 : 0);
    }, 1000);

    return () => { clearInterval(poller); clearInterval(timer); };
  }, []);

  const refresh = async () => {
    try {
        const res = await fetch(`${API_URL}/queue/status`);
        const json = await res.json();
        setData(json);

        // --- NEW TIMER LOGIC ---
        // Sync directly with the Server's Master Clock
        if (Math.abs(json.seconds_left - timeLeft) > 2) {
            setTimeLeft(json.seconds_left);
        }
    } catch (e) { console.error("API Error"); }
  };

  const handleNext = async () => { 
      await fetch(`${API_URL}/queue/next`, { method: "POST" }); 
      refresh(); 
  };

  const handleReset = async () => { 
      if(confirm("⚠ WARNING: This will delete everyone. Reset System?")) { 
          await fetch(`${API_URL}/queue/reset`, { method: "POST" }); 
          refresh(); 
      }
  };

  const formatTime = (s: number) => {
    const mins = Math.floor(s / 60);
    const secs = s % 60;
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  return (
    <div className="min-h-screen bg-neutral-950 text-gray-200 p-6 font-sans">
      
      {/* PERFORMANCE CARDS */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <div className="bg-neutral-900/50 border border-green-500/30 p-6 rounded-2xl flex items-center justify-between shadow-[0_0_20px_rgba(34,197,94,0.1)]">
              <div>
                  <p className="text-xs font-bold text-green-500 uppercase tracking-widest mb-1">Current Wait Time</p>
                  <p className="text-4xl font-mono font-bold text-white tracking-tighter">{formatTime(timeLeft)}</p>
              </div>
              <div className="h-10 w-10 rounded-full bg-green-500/20 flex items-center justify-center animate-pulse">
                  <span className="text-green-400">⏱</span>
              </div>
          </div>

          <div className="bg-neutral-900/50 border border-white/10 p-6 rounded-2xl flex items-center justify-between">
              <div>
                  <p className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-1">In Queue</p>
                  <p className="text-4xl font-black text-white">{data?.people_ahead || 0}</p>
              </div>
              <div className="h-10 w-10 rounded-full bg-blue-500/20 flex items-center justify-center text-blue-400 font-bold">
                  👥
              </div>
          </div>

          <div className="bg-neutral-900/50 border border-white/10 p-6 rounded-2xl flex items-center justify-between">
              <div>
                  <p className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-1">Performance</p>
                  <div className="flex items-baseline gap-2">
                      <p className="text-4xl font-black text-white">{data?.daily_stats?.served || 0}</p>
                      <span className="text-sm text-gray-600">Customers</span>
                  </div>
              </div>
              <div className="h-10 w-10 rounded-full bg-purple-500/20 flex items-center justify-center text-purple-400 font-bold">
                  📈
              </div>
          </div>
      </div>

      {/* CONTROLS */}
      <div className="flex justify-between items-center mb-6">
         <h2 className="text-xl font-bold text-white">Queue Management</h2>
         <div className="flex gap-3">
             <button onClick={handleReset} className="px-4 py-2 border border-red-900/50 text-red-500 hover:bg-red-900/20 rounded-xl text-sm font-bold transition">
                 Reset System
             </button>
             <button 
                onClick={handleNext} 
                disabled={!data?.queue?.length}
                className="px-6 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-bold shadow-lg disabled:opacity-50 disabled:cursor-not-allowed transition"
             >
                 Call Next Customer →
             </button>
         </div>
      </div>

      {/* QUEUE GRID */}
      <div className="grid md:grid-cols-3 lg:grid-cols-4 gap-4">
         {data?.queue.map((p: any, index: number) => (
             <div key={p.token} onClick={() => setSelected(p)}
                className={`p-6 rounded-2xl border cursor-pointer transition-all hover:scale-[1.02] active:scale-95 group relative overflow-hidden
                    ${index===0 
                        ? 'bg-blue-600 border-blue-400 shadow-[0_0_30px_rgba(37,99,235,0.3)]' 
                        : 'bg-neutral-900 border-white/5 hover:border-white/20'}
                `}
             >
                {index === 0 && <div className="absolute top-0 right-0 p-3 opacity-10 text-6xl font-black">#1</div>}

                <div className="flex justify-between items-start mb-4 relative z-10">
                    <span className={`text-3xl font-black ${index===0 ? 'text-white' : 'text-gray-600 group-hover:text-gray-400'}`}>
                        #{p.token}
                    </span>
                    {index===0 && <span className="bg-white text-blue-600 px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wider">Serving Now</span>}
                </div>
                
                <div className="relative z-10">
                    <h3 className={`font-bold text-lg truncate ${index===0 ? 'text-white' : 'text-gray-200'}`}>{p.name}</h3>
                    <p className={`text-sm mt-1 ${index===0 ? 'text-blue-200' : 'text-gray-500'}`}>
                        {p.services.length} services • {p.total_duration}m
                    </p>
                </div>
             </div>
         ))}
      </div>

      {/* EMPTY STATE */}
      {data?.queue.length === 0 && (
          <div className="flex flex-col items-center justify-center h-64 bg-neutral-900/30 border-2 border-dashed border-neutral-800 rounded-3xl">
              <p className="font-bold text-xl text-gray-700">All Caught Up! 🎉</p>
          </div>
      )}

      {/* DETAILS POPUP */}
      {selected && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
              <div className="bg-neutral-900 border border-white/10 p-8 rounded-3xl w-full max-w-md relative animate-in fade-in zoom-in duration-200 shadow-2xl">
                  <button onClick={() => setSelected(null)} className="absolute top-6 right-6 text-gray-500 hover:text-white transition">✕</button>
                  
                  <div className="text-center">
                      <div className="inline-block px-4 py-1 bg-blue-500/10 text-blue-400 border border-blue-500/20 rounded-full text-sm font-bold mb-4">
                          Token #{selected.token}
                      </div>
                      <h2 className="text-3xl font-bold text-white mb-1">{selected.name}</h2>
                      <p className="text-gray-400 text-lg font-mono tracking-wide">{selected.phone}</p>
                  </div>

                  <div className="bg-neutral-950/50 border border-white/5 rounded-2xl p-6 mt-8">
                      <div className="flex justify-between items-center mb-4">
                          <h3 className="text-xs font-bold text-gray-500 uppercase tracking-widest">Service List</h3>
                          <span className="text-xs text-gray-600">{selected.joined_at}</span>
                      </div>
                      <div className="flex flex-wrap gap-2">
                          {selected.services.map((s:string) => (
                              <span key={s} className="px-3 py-2 bg-neutral-800 border border-white/5 rounded-lg text-sm text-gray-300 font-medium">
                                  {s}
                              </span>
                          ))}
                      </div>
                      <div className="mt-6 pt-6 border-t border-white/5 flex justify-between text-sm items-center">
                          <span className="text-gray-500">Estimated Duration</span>
                          <span className="font-bold text-green-400 text-xl">{selected.total_duration} <span className="text-sm text-gray-500 font-normal">min</span></span>
                      </div>
                  </div>
              </div>
          </div>
      )}
    </div>
  );
}