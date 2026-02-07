"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

export default function Home() {
  const [status, setStatus] = useState("Checking Supabase connection...");

  useEffect(() => {
    async function check() {
      try {
        const { error } = await supabase.auth.getSession();
        if (error) throw error;
        setStatus("✅ Supabase connected! (Session check OK)");
      } catch (e: any) {
        setStatus("❌ Supabase not connected: " + (e?.message ?? "Unknown error"));
      }
    }
    check();
  }, []);

  return (
    <main style={{ padding: 24, fontFamily: "system-ui" }}>
      <h1 style={{ fontSize: 28, fontWeight: 700 }}>JEE EvalBee MVP</h1>
      <p style={{ marginTop: 12, fontSize: 18 }}>{status}</p>
    </main>
  );
}
