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
  
  // LOGIN STATE
  const [isLocked, setIsLocked] = useState(true);
  const [password, setPassword] = useState("");
  const [error, setError] = useState(false);
  
  // MODAL STATES
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [editingUser, setEditingUser] = useState<any>(null);
  const [editServices, setEditServices] = useState<string[]>([]);
  const [loadingAction, setLoadingAction] = useState<number | null>(null);

  // --- 1. SYNC & TIMER ---
  useEffect(() => {
    if(isLocked) return;
    refresh();
    const poller = setInterval(refresh, 3000);
    const timer = setInterval(() => setTimeLeft(p => p > 0 ? p - 1 : 0), 1000);
    return () => { clearInterval(poller); clearInterval(timer); };
  }, [isLocked]);

  const refresh = async () => {
    try {
        const res = await fetch(`${API_URL}/queue/status`);
        const json = await res.json();
        setData((prev: any) => {
            if (JSON.stringify(prev?.queue) !== JSON.stringify(json.queue)) return json;
            return prev;
        });
        if (Math.abs(json.seconds_left - timeLeft) > 2) setTimeLeft(json.seconds_left);
    } catch (e) { console.error("API Error"); }
  };

  // --- LOGIN ---
  const handleUnlock = (e: React.FormEvent) => {
    e.preventDefault();
    if (password === "2568") setIsLocked(false);
    else { setError(true); setTimeout(() => setError(false), 500); setPassword(""); }
  };

  // --- ACTIONS ---
  const handleNext = async () => { await fetch(`${API_URL}/queue/next`, { method: "POST" }); refresh(); };
  const handleReset = async () => { if(confirm("⚠ RESET SYSTEM: Delete all data?")) { await fetch(`${API_URL}/queue/reset`, { method: "POST" }); refresh(); }};
  const moveUser = async (token: number, direction: "up" | "down", e: any) => { e.stopPropagation(); setLoadingAction(token); const newQueue = [...data.queue]; const idx = newQueue.findIndex(c => c.token === token); if (idx !== -1) { if (direction === "up" && idx > 0) { [newQueue[idx], newQueue[idx-1]] = [newQueue[idx-1], newQueue[idx]]; } else if (direction === "down" && idx < newQueue.length - 1) { [newQueue[idx], newQueue[idx+1]] = [newQueue[idx+1], newQueue[idx]]; } setData({ ...data, queue: newQueue }); } await fetch(`${API_URL}/queue/move`, { method: "POST", headers: {"Content-Type":"application/json"}, body: JSON.stringify({ token, direction }) }); setTimeout(() => setLoadingAction(null), 500); refresh(); };
  const deleteUser = async (token: number, e: any) => { e.stopPropagation(); if(!confirm("Remove this customer?")) return; await fetch(`${API_URL}/queue/delete`, { method: "POST", headers: {"Content-Type":"application/json"}, body: JSON.stringify({ token }) }); refresh(); };
  const serveNow = async (token: number, e: any) => { e.stopPropagation(); if(!confirm("Jump to front?")) return; await fetch(`${API_URL}/queue/serve-now`, { method: "POST", headers: {"Content-Type":"application/json"}, body: JSON.stringify({ token }) }); refresh(); };
  
  // --- EDIT ---
  const openEdit = (user: any, e: any) => { e.stopPropagation(); setEditingUser(user); setEditServices(user.services); };
  const toggleEditService = (svc: string) => { if(editServices.includes(svc)) setEditServices(editServices.filter(s => s !== svc)); else setEditServices([...editServices, svc]); };
  const saveEdit = async () => { if(editServices.length === 0) return alert("Must have 1 service."); await fetch(`${API_URL}/queue/edit`, { method: "POST", headers: {"Content-Type":"application/json"}, body: JSON.stringify({ token: editingUser.token, services: editServices }) }); setEditingUser(null); refresh(); };

  const formatTime = (s: number) => { const mins = Math.floor(s / 60); const secs = s % 60; return `${mins}:${secs < 10 ? '0' : ''}${secs}`; };

  // --- CALCULATE INDIVIDUAL WAIT TIMES ---
  const getCustomerWait = (index: number) => {
      if (index === 0) return 0; // Currently serving
      
      let waitSeconds = 0;
      // Sum duration of all people AHEAD of this index
      for(let i=0; i < index; i++) {
          waitSeconds += (data.queue[i].total_duration * 60);
      }
      // Subtract elapsed time of the person in the chair
      waitSeconds -= data.elapsed_seconds;
      
      return Math.max(0, Math.ceil(waitSeconds / 60)); // Return in Minutes
  };

  // --- RENDER LOGIN ---
  if (isLocked) {
      return (
        <div className="min-h-screen bg-neutral-950 flex flex-col items-center justify-center p-6 font-sans">
            <div className={`w-full max-w-sm bg-neutral-900/50 backdrop-blur-xl border border-white/10 p-8 rounded-3xl shadow-2xl transition-all duration-200 ${error ? 'border-red-500 translate-x-2' : ''}`}>
                <div className="text-center mb-8">
                    <div className="w-16 h-16 bg-green-500/10 rounded-full flex items-center justify-center mx-auto mb-4 animate-pulse"><span className="text-3xl">🔒</span></div>
                    <h1 className="text-2xl font-black text-white">Vendor Access</h1>
                    <p className="text-gray-500 text-sm mt-1">Enter PIN to manage queue</p>
                </div>
                <form onSubmit={handleUnlock} className="space-y-4">
                    <input type="password" autoFocus className={`w-full p-4 bg-black/50 border rounded-xl text-center text-2xl font-bold tracking-widest text-white outline-none focus:ring-2 transition-all ${error ? 'border-red-500 ring-red-500/20' : 'border-white/10 focus:border-green-500 focus:ring-green-500/20'}`} placeholder="••••" maxLength={4} value={password} onChange={e => setPassword(e.target.value)}/>
                    <button className="w-full bg-green-500 hover:bg-green-400 text-black font-bold py-4 rounded-xl shadow-[0_0_20px_rgba(34,197,94,0.3)] transition-all transform active:scale-95">Unlock Panel</button>
                </form>
            </div>
            <p className="text-gray-600 text-xs mt-8">SlotSync Secure System v2.0</p>
        </div>
      );
  }

  // --- DASHBOARD ---
  return (
    <div className="min-h-screen bg-neutral-950 text-gray-200 p-6 font-sans">
      
      {/* STATS */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <div className="bg-neutral-900/50 border border-green-500/30 p-6 rounded-2xl flex items-center justify-between shadow-[0_0_20px_rgba(34,197,94,0.1)]">
              <div><p className="text-xs font-bold text-green-500 uppercase tracking-widest mb-1">Total Wait Time</p><p className="text-4xl font-mono font-bold text-white">{formatTime(timeLeft)}</p></div>
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

      {/* CONTROLS */}
      <div className="flex justify-between items-center mb-6">
         <h2 className="text-xl font-bold text-white">Master Control</h2>
         <div className="flex gap-3">
             <button onClick={handleReset} className="px-4 py-2 border border-red-900/50 text-red-500 hover:bg-red-900/20 rounded-xl text-sm font-bold transition">Reset Day</button>
             <button onClick={handleNext} disabled={!data?.queue?.length} className="px-6 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-bold shadow-lg disabled:opacity-50 transition">Call Next →</button>
         </div>
      </div>

      {/* LIST */}
      <div className="space-y-3 relative">
         {data?.queue.map((p: any, index: number) => {
             const personalWait = getCustomerWait(index);
             
             return (
                 <div key={p.token} 
                    onClick={() => setSelectedUser(p)} 
                    className={`flex flex-col md:flex-row items-center justify-between p-4 rounded-xl border cursor-pointer 
                        transition-all duration-500 ease-in-out transform hover:scale-[1.01] hover:bg-neutral-800
                        ${index===0 ? 'bg-blue-900/20 border-blue-500/50 translate-x-2' : 'bg-neutral-900 border-white/5'}
                        ${loadingAction === p.token ? 'opacity-50 scale-95' : 'opacity-100'}
                    `}
                 >
                    <div className="flex items-center gap-4 w-full md:w-auto mb-4 md:mb-0">
                        <span className={`text-2xl font-black w-16 text-center ${index===0 ? 'text-blue-400' : 'text-gray-600'}`}>#{p.token}</span>
                        <div>
                            <div className="flex items-center gap-3">
                                <h3 className="font-bold text-white text-lg">{p.name}</h3>
                                {/* NEW: WAIT TIME BADGE */}
                                <span className={`text-xs font-bold px-2 py-0.5 rounded ${index === 0 ? 'bg-green-500 text-black' : 'bg-neutral-700 text-gray-300'}`}>
                                    {index === 0 ? "Serving Now" : `Wait: ~${personalWait}m`}
                                </span>
                            </div>
                            <p className="text-sm text-gray-400 mt-1">{p.phone} • {p.services.length} services • {p.total_duration}m duration</p>
                            <div className="flex flex-wrap gap-1 mt-1">
                                {p.services.map((s:string) => <span key={s} className="text-[10px] bg-white/10 px-2 rounded text-gray-300">{s}</span>)}
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        <a href={`tel:${p.phone}`} onClick={(e)=>e.stopPropagation()} className="p-2 bg-green-500/10 text-green-500 hover:bg-green-500 hover:text-white rounded-lg transition transform hover:-translate-y-1">📞</a>
                        <button onClick={(e) => openEdit(p, e)} className="p-2 bg-neutral-800 text-gray-300 hover:bg-white hover:text-black rounded-lg transition transform hover:-translate-y-1">✎</button>
                        <button onClick={(e) => moveUser(p.token, "up", e)} disabled={index === 0} className="p-2 bg-neutral-800 text-gray-300 hover:bg-blue-600 hover:text-white rounded-lg disabled:opacity-30 transition active:scale-90">⬆</button>
                        <button onClick={(e) => moveUser(p.token, "down", e)} disabled={index === data.queue.length - 1} className="p-2 bg-neutral-800 text-gray-300 hover:bg-blue-600 hover:text-white rounded-lg disabled:opacity-30 transition active:scale-90">⬇</button>
                        {index !== 0 && (
                            <button onClick={(e) => serveNow(p.token, e)} className="p-2 bg-yellow-500/10 text-yellow-500 hover:bg-yellow-500 hover:text-black rounded-lg transition transform hover:rotate-12">⚡</button>
                        )}
                        <button onClick={(e) => deleteUser(p.token, e)} className="p-2 bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white rounded-lg transition hover:scale-110">✕</button>
                    </div>
                 </div>
             )
         })}
      </div>
      
      {data?.queue.length === 0 && <div className="p-10 text-center text-gray-600 border-2 border-dashed border-neutral-800 rounded-xl mt-4 animate-pulse">Queue is empty</div>}

      {/* MODALS (EDIT & VIEW) */}
      {selectedUser && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
              <div className="bg-neutral-900 border border-white/10 p-8 rounded-3xl w-full max-w-md relative animate-in fade-in zoom-in duration-200 shadow-2xl">
                  <button onClick={() => setSelectedUser(null)} className="absolute top-6 right-6 text-gray-500 hover:text-white transition">✕</button>
                  <div className="text-center">
                      <div className="inline-block px-4 py-1 bg-blue-500/10 text-blue-400 border border-blue-500/20 rounded-full text-sm font-bold mb-4">Token #{selectedUser.token}</div>
                      <h2 className="text-3xl font-bold text-white mb-1">{selectedUser.name}</h2>
                      <p className="text-gray-400 text-lg font-mono tracking-wide">{selectedUser.phone}</p>
                  </div>
                  <div className="bg-neutral-950/50 border border-white/5 rounded-2xl p-6 mt-8">
                      <div className="flex justify-between items-center mb-4"><h3 className="text-xs font-bold text-gray-500 uppercase tracking-widest">Services</h3><span className="text-xs text-gray-600">{selectedUser.joined_at}</span></div>
                      <div className="flex flex-wrap gap-2">{selectedUser.services.map((s:string) => (<span key={s} className="px-3 py-2 bg-neutral-800 border border-white/5 rounded-lg text-sm text-gray-300 font-medium">{s}</span>))}</div>
                  </div>
              </div>
          </div>
      )}

      {editingUser && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
              <div className="bg-neutral-900 border border-white/10 p-6 rounded-2xl w-full max-w-sm animate-in zoom-in duration-200">
                  <h3 className="text-xl font-bold text-white mb-4">Edit #{editingUser.token} Services</h3>
                  <div className="space-y-2 mb-6">
                      {ALL_SERVICES.map(svc => (
                          <div key={svc.name} onClick={() => toggleEditService(svc.name)} className={`p-3 rounded-lg border cursor-pointer flex justify-between items-center transition duration-300 ${editServices.includes(svc.name) ? 'bg-blue-600 border-blue-500 text-white scale-[1.02]' : 'bg-neutral-800 border-white/5 text-gray-400 hover:bg-neutral-700'}`}>
                              <span>{svc.name}</span><span className="text-xs opacity-60">{svc.time}m</span>
                          </div>
                      ))}
                  </div>
                  <div className="flex gap-2">
                      <button onClick={saveEdit} className="w-full py-3 bg-green-500 text-black font-bold rounded-xl hover:bg-green-400 transform transition active:scale-95">Save Changes</button>
                      <button onClick={() => setEditingUser(null)} className="w-1/3 py-3 bg-neutral-800 text-white font-bold rounded-xl hover:bg-neutral-700">Cancel</button>
                  </div>
              </div>
          </div>
      )}
    </div>
  );
}