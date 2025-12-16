"use client";

import { useEffect, useState } from "react";

export default function AdminPage() {
  const ADMIN_PIN = "1234"; // <--- CHANGE PIN HERE IF YOU WANT

  // --- STATE ---
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [pinInput, setPinInput] = useState("");
  const [queue, setQueue] = useState<any[]>([]);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState(""); // To show "Connected" or "Error"

  // --- THE CORRECT BACKEND LINK ---
  const API_URL = "https://myspotnow-api.onrender.com";

  // --- FETCHER ---
  const fetchQueue = async () => {
    try {
      const res = await fetch(`${API_URL}/queue`);
      if (!res.ok) throw new Error("Connection Error");
      const data = await res.json();
      setQueue(data);
      setStatus("Connected ✅");
    } catch (err) {
      console.error(err);
      setStatus("Connecting..."); // Shows this while waking up server
    }
  };

  // --- EFFECTS ---
  useEffect(() => {
    if (isUnlocked) {
      fetchQueue();
      const interval = setInterval(fetchQueue, 3000); // Auto-refresh every 3s
      return () => clearInterval(interval);
    }
  }, [isUnlocked]);

  // --- HANDLERS ---
  const handleUnlock = (e: React.FormEvent) => {
    e.preventDefault();
    if (pinInput === ADMIN_PIN) {
      setIsUnlocked(true);
    } else {
      alert("Incorrect PIN");
      setPinInput("");
    }
  };

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !phone) return;
    setLoading(true);

    try {
      await fetch(`${API_URL}/add`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, phone_number: phone }),
      });
      setName("");
      setPhone("");
      fetchQueue(); // Refresh list immediately
    } catch (error) {
      alert("Failed to add customer. Server might be sleeping.");
    } finally {
      setLoading(false);
    }
  };

  const handleRemove = async (id: number) => {
    if(!confirm("Remove this customer?")) return;
    try {
      await fetch(`${API_URL}/remove/${id}`, { method: "DELETE" });
      fetchQueue();
    } catch (error) {
      alert("Failed to remove customer.");
    }
  };

  // --- VIEW 1: LOCK SCREEN ---
  if (!isUnlocked) {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-800 text-white">
        <form onSubmit={handleUnlock} className="flex flex-col gap-4 text-center">
          <h1 className="text-2xl font-bold">Admin Locked</h1>
          <input
            type="password"
            placeholder="Enter PIN"
            className="rounded px-4 py-2 text-black text-center text-xl outline-none"
            value={pinInput}
            onChange={(e) => setPinInput(e.target.value)}
            autoFocus
          />
          <button className="rounded bg-blue-500 py-2 font-bold hover:bg-blue-600">
            Unlock
          </button>
        </form>
      </div>
    );
  }

  // --- VIEW 2: DASHBOARD ---
  return (
    <div className="min-h-screen p-6 bg-gray-50">
      <div className="max-w-4xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold text-gray-900">Queue Manager</h1>
          <div className="text-right">
            <span className="text-xs text-gray-400 block">{status}</span>
            <button 
              onClick={() => setIsUnlocked(false)}
              className="text-red-600 underline text-sm"
            >
              Lock Screen
            </button>
          </div>
        </div>

        {/* ADD FORM */}
        <form onSubmit={handleAdd} className="bg-white p-6 rounded-lg shadow mb-6 flex flex-col md:flex-row gap-4">
          <input 
            className="border p-3 rounded flex-1 outline-none focus:border-blue-500"
            placeholder="Customer Name"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          <input 
            className="border p-3 rounded flex-1 outline-none focus:border-blue-500"
            placeholder="Phone Number"
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
          />
          <button 
            disabled={loading} 
            className="bg-green-600 text-white px-8 py-3 rounded font-bold hover:bg-green-700 disabled:opacity-50"
          >
            {loading ? "..." : "Add"}
          </button>
        </form>

        {/* LIST */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="p-4 bg-gray-100 border-b font-semibold text-gray-600">
            Current Queue ({queue.length})
          </div>
          <ul className="divide-y">
            {queue.map((c) => (
              <li key={c.id} className="p-4 flex justify-between items-center hover:bg-gray-50">
                <div>
                  <span className="text-lg font-bold text-gray-800 block">{c.name}</span>
                  <span className="text-sm text-gray-500">{new Date(c.joined_at).toLocaleTimeString()}</span>
                </div>
                <button 
                  onClick={() => handleRemove(c.id)}
                  className="bg-red-50 text-red-600 px-4 py-2 rounded border border-red-200 hover:bg-red-100 transition"
                >
                  Done
                </button>
              </li>
            ))}
            {queue.length === 0 && (
              <li className="p-8 text-center text-gray-500">
                No customers waiting.
              </li>
            )}
          </ul>
        </div>
      </div>
    </div>
  );
}