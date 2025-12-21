"use client";
import { useState, useEffect } from 'react';

const API_URL = "https://myspotnow-api.onrender.com";

const ALL_SERVICES = [
  { name: "Haircut", time: 20 },
  { name: "Shave", time: 10 },
  { name: "Head Massage", time: 15 },
  { name: "Facial", time: 30 },
  { name: "Hair Color", time: 45 },
];

export default function Admin() {
  const [data, setData] = useState<any>(null);
  const [timeLeft, setTimeLeft] = useState(0);
  
  // EDIT MODE STATE
  const [editingUser, setEditingUser] = useState<any>(null); // The user being edited
  const [editServices, setEditServices] = useState<string[]>([]); // Their new services

  // --- 1. SYNC & TIMER ---
  useEffect(() => {
    refresh();
    const poller = setInterval(refresh, 3000);
    const timer = setInterval(() => setTimeLeft(p => p > 0 ? p - 1 : 0), 1000);
    return () => { clearInterval(poller); clearInterval(timer); };
  }, []);

  const refresh = async () => {
    try {
        const res = await fetch(`${API_URL}/queue/status`);
        const json = await res.json();
        setData(json);
        if (Math.abs(json.seconds_left - timeLeft) > 2) setTimeLeft(json.seconds_left);
    } catch (e) { console.error("API Error"); }
  };

  // --- 2. MASTER ACTIONS ---
  const handleNext = async () => { await fetch(`${API_URL}/queue/next`, { method: "POST" }); refresh(); };
  
  const handleReset = async () => { 
      if(confirm("⚠ RESET SYSTEM: Delete all data?")) { 
          await fetch(`${API_URL}/queue/reset`, { method: "POST" }); refresh(); 
      }
  };

  const moveUser = async (token: number, direction: "up" | "down", e: any) => {
      e.stopPropagation();
      await fetch(`${API_URL}/queue/move`, { 
          method: "POST", headers: {"Content-Type":"application/json"},
          body: JSON.stringify({ token, direction }) 
      });
      refresh();
  };

  const deleteUser = async (token: number, e: any) => {
      e.stopPropagation();
      if(!confirm("Remove this customer from the queue?")) return;
      await fetch(`${API_URL}/queue/delete`, { 
          method: "POST", headers: {"Content-Type":"application/json"},
          body: JSON.stringify({ token }) 
      });
      refresh();
  };

  const serveNow = async (token: number, e: any) => {
      e.stopPropagation();
      if(!confirm("Jump this customer to the front of the line?")) return;
      await fetch(`${API_URL}/queue/serve-now`, { 
          method: "POST", headers: {"Content-Type":"application/json"},
          body: JSON.stringify({ token }) 
      });
      refresh();
  };

  // --- EDIT MODAL LOGIC ---
  const openEdit = (user: any, e: any) => {
      e.stopPropagation();
      setEditingUser(user);
      setEditServices(user.services); // Pre-fill current services
  };

  const toggleEditService = (svc: string) => {
      if(editServices.includes(svc)) setEditServices(editServices.filter(s => s !== svc));
      else setEditServices([...editServices, svc]);
  };

  const saveEdit = async () => {
      if(editServices.length === 0) return alert("Customer must have at least 1 service.");
      await fetch(`${API_URL}/queue/edit`, {
          method: "POST", headers: {"Content-Type":"application/json"},
          body: JSON.stringify({ token: editingUser.token, services: editServices })
      });
      setEditingUser(null);
      refresh();
  };

  const formatTime = (s: number) => {
    const mins = Math.floor(s / 60);
    const secs = s % 60;
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  return (
    <div className="min-h-screen bg-neutral-950 text-gray-200 p-6 font-sans">
      
      {/* --- STATS BAR --- */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <div className="bg-neutral-900/50 border border-green-500/30 p-6 rounded-2xl flex items-center justify-between shadow-[0_0_20px_rgba(34,197,94,0.1)]">
              <div><p className="text-xs font-bold text-green-500 uppercase tracking-widest mb-1">Wait Time</p><p className="text-4xl font-mono font-bold text-white">{formatTime(timeLeft)}</p></div>
              <div className="text-green-400 text-3xl animate-pulse">⏱</div>
          </div>
          <div className="bg-neutral-900/50 border border-white/10 p-6 rounded-2xl flex items-center justify-between">
              <div><p className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-1">Queue</p><p className="text-4xl font-black text-white">{data?.people_ahead || 0}</p></div>
              <div className="text-blue-400 text-3xl">👥</div>
          </div>
          <div className="bg-neutral-900/50 border border-white/10 p-6 rounded-2xl flex items-center justify-between">
              <div><p className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-1">Done</p><p className="text-4xl font-black text-white">{data?.daily_stats?.served || 0}</p></div>
              <div className="text-purple-400 text-3xl">📈</div>
          </div>
      </div>

      {/* --- CONTROLS --- */}
      <div className="flex justify-between items-center mb-6">
         <h2 className="text-xl font-bold text-white">Master Control</h2>
         <div className="flex gap-3">
             <button onClick={handleReset} className="px-4 py-2 border border-red-900/50 text-red-500 hover:bg-red-900/20 rounded-xl text-sm font-bold transition">Reset Day</button>
             <button onClick={handleNext} disabled={!data?.queue?.length} className="px-6 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-bold shadow-lg disabled:opacity-50 transition">Call Next Customer →</button>
         </div>
      </div>

      {/* --- QUEUE LIST --- */}
      <div className="space-y-3">
         {data?.queue.map((p: any, index: number) => (
             <div key={p.token} 
                className={`flex flex-col md:flex-row items-center justify-between p-4 rounded-xl border transition-all 
                    ${index===0 ? 'bg-blue-900/20 border-blue-500/50' : 'bg-neutral-900 border-white/5'}
                `}
             >
                {/* LEFT: INFO */}
                <div className="flex items-center gap-4 w-full md:w-auto mb-4 md:mb-0">
                    <span className={`text-2xl font-black w-16 text-center ${index===0 ? 'text-blue-400' : 'text-gray-600'}`}>#{p.token}</span>
                    <div>
                        <h3 className="font-bold text-white text-lg">{p.name}</h3>
                        <p className="text-sm text-gray-400">{p.phone} • {p.services.length} services • {p.total_duration}m</p>
                        <div className="flex flex-wrap gap-1 mt-1">
                            {p.services.map((s:string) => <span key={s} className="text-[10px] bg-white/10 px-2 rounded text-gray-300">{s}</span>)}
                        </div>
                    </div>
                </div>

                {/* RIGHT: ACTION BUTTONS */}
                <div className="flex items-center gap-2">
                    {/* PHONE CALL */}
                    <a href={`tel:${p.phone}`} className="p-2 bg-green-500/10 text-green-500 hover:bg-green-500 hover:text-white rounded-lg transition" title="Call Customer">
                        📞
                    </a>

                    {/* EDIT */}
                    <button onClick={(e) => openEdit(p, e)} className="p-2 bg-neutral-800 text-gray-300 hover:bg-white hover:text-black rounded-lg transition" title="Edit Services">
                        ✎
                    </button>

                    {/* MOVE UP */}
                    <button onClick={(e) => moveUser(p.token, "up", e)} disabled={index === 0} className="p-2 bg-neutral-800 text-gray-300 hover:bg-blue-600 hover:text-white rounded-lg disabled:opacity-30 transition">
                        ⬆
                    </button>

                    {/* MOVE DOWN */}
                    <button onClick={(e) => moveUser(p.token, "down", e)} disabled={index === data.queue.length - 1} className="p-2 bg-neutral-800 text-gray-300 hover:bg-blue-600 hover:text-white rounded-lg disabled:opacity-30 transition">
                        ⬇
                    </button>

                    {/* SERVE NOW (Jump Queue) */}
                    {index !== 0 && (
                        <button onClick={(e) => serveNow(p.token, e)} className="p-2 bg-yellow-500/10 text-yellow-500 hover:bg-yellow-500 hover:text-black rounded-lg transition" title="Serve Now">
                            ⚡
                        </button>
                    )}

                    {/* DELETE */}
                    <button onClick={(e) => deleteUser(p.token, e)} className="p-2 bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white rounded-lg transition" title="Remove">
                        ✕
                    </button>
                </div>
             </div>
         ))}
      </div>
      
      {data?.queue.length === 0 && <div className="p-10 text-center text-gray-600 border-2 border-dashed border-neutral-800 rounded-xl mt-4">Queue is empty</div>}

      {/* --- EDIT MODAL --- */}
      {editingUser && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
              <div className="bg-neutral-900 border border-white/10 p-6 rounded-2xl w-full max-w-sm animate-in zoom-in duration-200">
                  <h3 className="text-xl font-bold text-white mb-4">Edit #{editingUser.token} {editingUser.name}</h3>
                  <div className="space-y-2 mb-6">
                      {ALL_SERVICES.map(svc => (
                          <div key={svc.name} 
                            onClick={() => toggleEditService(svc.name)}
                            className={`p-3 rounded-lg border cursor-pointer flex justify-between items-center transition
                                ${editServices.includes(svc.name) ? 'bg-blue-600 border-blue-500 text-white' : 'bg-neutral-800 border-white/5 text-gray-400'}
                            `}
                          >
                              <span>{svc.name}</span>
                              <span className="text-xs opacity-60">{svc.time}m</span>
                          </div>
                      ))}
                  </div>
                  <div className="flex gap-2">
                      <button onClick={saveEdit} className="w-full py-3 bg-green-500 text-black font-bold rounded-xl hover:bg-green-400">Save Changes</button>
                      <button onClick={() => setEditingUser(null)} className="w-1/3 py-3 bg-neutral-800 text-white font-bold rounded-xl hover:bg-neutral-700">Cancel</button>
                  </div>
              </div>
          </div>
      )}

    </div>
  );
}