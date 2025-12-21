"use client";
import { useState, useEffect } from 'react';

// 👇 YOUR RENDER LINK
const API_URL = "https://myspotnow-api.onrender.com"; 

const ALL_SERVICES = [
  { name: "Haircut", time: 20 }, { name: "Shave", time: 10 },
  { name: "Head Massage", time: 15 }, { name: "Facial", time: 30 },
  { name: "Hair Color", time: 45 },
];

export default function Admin() {
  const [data, setData] = useState<any>(null);
  const [timeLeft, setTimeLeft] = useState(0);
  const [isLocked, setIsLocked] = useState(true);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [editingUser, setEditingUser] = useState<any>(null);
  const [editServices, setEditServices] = useState<string[]>([]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault(); setLoading(true); setError("");
    try {
        const res = await fetch(`${API_URL}/admin/login`, {
            method: "POST", headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ username, password })
        });
        if (res.ok) { setIsLocked(false); refresh(); } 
        else { setError("Invalid Credentials"); }
    } catch (err) { setError("Connection Failed"); }
    setLoading(false);
  };

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

  const apiCall = async (endpoint: string, body: any) => {
      await fetch(`${API_URL}/queue/${endpoint}`, { 
          method: "POST", headers: {"Content-Type":"application/json"}, body: JSON.stringify(body) 
      });
      refresh();
  };

  const handleNext = async () => apiCall("next", {});
  const handleReset = async () => { if(confirm("DELETE ALL DATA?")) apiCall("reset", {}); };
  const moveUser = (token: number, dir: string, e: any) => { e.stopPropagation(); apiCall("move", { token, direction: dir }); };
  const deleteUser = (token: number, e: any) => { e.stopPropagation(); if(confirm("Remove?")) apiCall("delete", { token }); };
  const serveNow = (token: number, e: any) => { e.stopPropagation(); if(confirm("Jump to front?")) apiCall("serve-now", { token }); };
  const saveEdit = async () => { await apiCall("edit", { token: editingUser.token, services: editServices }); setEditingUser(null); };
  
  const toggleEditService = (svc: string) => {
      if(editServices.includes(svc)) setEditServices(editServices.filter(s => s !== svc));
      else setEditServices([...editServices, svc]);
  };

  const formatTime = (s: number) => { const m = Math.floor(s / 60); const sc = s % 60; return `${m}:${sc < 10 ? '0' : ''}${sc}`; };

  if (isLocked) return (
      <div className="min-h-screen bg-black flex items-center justify-center p-6 font-sans">
          <div className="w-full max-w-sm bg-neutral-900 border border-white/10 p-8 rounded-3xl">
              <h1 className="text-2xl font-bold text-white text-center mb-6">Admin Login</h1>
              <form onSubmit={handleLogin} className="space-y-4">
                  <input className="w-full p-4 bg-black border border-white/10 rounded-xl text-white outline-none" placeholder="Username" value={username} onChange={e => setUsername(e.target.value)} />
                  <input type="password" className="w-full p-4 bg-black border border-white/10 rounded-xl text-white outline-none" placeholder="Password" value={password} onChange={e => setPassword(e.target.value)} />
                  {error && <p className="text-red-500 text-xs text-center">{error}</p>}
                  <button disabled={loading} className="w-full bg-green-500 text-black font-bold py-4 rounded-xl">{loading ? "..." : "Login"}</button>
              </form>
          </div>
      </div>
  );

  return (
    <div className="min-h-screen bg-black text-white p-6 font-sans">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <div className="bg-neutral-900 border border-green-500/30 p-6 rounded-2xl">
              <p className="text-xs font-bold text-green-500 uppercase">Wait Time</p>
              <p className="text-4xl font-mono font-bold">{formatTime(timeLeft)}</p>
          </div>
          <div className="bg-neutral-900 border border-white/10 p-6 rounded-2xl">
              <p className="text-xs font-bold text-gray-500 uppercase">In Queue</p>
              <p className="text-4xl font-bold">{data?.people_ahead || 0}</p>
          </div>
          <div className="bg-neutral-900 border border-white/10 p-6 rounded-2xl flex items-center justify-between">
               <button onClick={handleReset} className="text-red-500 text-xs font-bold border border-red-500/50 px-3 py-1 rounded">RESET</button>
               <button onClick={handleNext} disabled={!data?.queue?.length} className="bg-blue-600 px-6 py-2 rounded-xl font-bold">Call Next</button>
          </div>
      </div>
      <div className="space-y-3">
         {data?.queue.map((p: any, index: number) => (
             <div key={p.token} onClick={() => setSelectedUser(p)} className={`flex items-center justify-between p-4 rounded-xl border cursor-pointer ${index===0 ? 'bg-blue-900/20 border-blue-500' : 'bg-neutral-900 border-white/5'}`}>
                <div className="flex items-center gap-4">
                    <span className="text-2xl font-bold text-gray-500">#{p.token}</span>
                    <div><h3 className="font-bold">{p.name}</h3><p className="text-xs text-gray-400">{p.services.join(", ")}</p></div>
                </div>
                <div className="flex gap-2">
                    <button onClick={(e) => { e.stopPropagation(); setEditingUser(p); setEditServices(p.services); }} className="p-2 bg-neutral-800 rounded">✎</button>
                    <button onClick={(e) => moveUser(p.token, "up", e)} disabled={index === 0} className="p-2 bg-neutral-800 rounded">⬆</button>
                    <button onClick={(e) => moveUser(p.token, "down", e)} disabled={index === data.queue.length - 1} className="p-2 bg-neutral-800 rounded">⬇</button>
                    <button onClick={(e) => deleteUser(p.token, e)} className="p-2 bg-red-900/30 text-red-500 rounded">✕</button>
                    {index !== 0 && <button onClick={(e) => serveNow(p.token, e)} className="p-2 bg-yellow-500/10 text-yellow-500 rounded">⚡</button>}
                </div>
             </div>
         ))}
      </div>
      {editingUser && (
          <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50">
              <div className="bg-neutral-900 p-6 rounded-2xl w-full max-w-sm border border-white/10">
                  <h3 className="text-xl font-bold mb-4">Edit #{editingUser.token}</h3>
                  <div className="space-y-2 mb-6">
                      {ALL_SERVICES.map(svc => (
                          <div key={svc.name} onClick={() => toggleEditService(svc.name)} className={`p-3 rounded border cursor-pointer flex justify-between ${editServices.includes(svc.name) ? 'bg-blue-600 border-blue-500' : 'bg-neutral-800 border-white/5'}`}>
                              <span>{svc.name}</span><span className="text-xs opacity-50">{svc.time}m</span>
                          </div>
                      ))}
                  </div>
                  <button onClick={saveEdit} className="w-full py-3 bg-green-500 text-black font-bold rounded-xl mb-2">Save</button>
                  <button onClick={() => setEditingUser(null)} className="w-full py-3 bg-neutral-800 text-white font-bold rounded-xl">Cancel</button>
              </div>
          </div>
      )}
    </div>
  );
}