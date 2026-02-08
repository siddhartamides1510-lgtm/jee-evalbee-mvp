"use client";

import { useMemo, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { parseNamesFromCSV } from "@/lib/csv";

type StudentRow = { id: string; name: string; batch: string; created_at: string };

export default function StudentsPage() {
  const [csvText, setCsvText] = useState("");
  const [batch, setBatch] = useState("JEE");
  const [status, setStatus] = useState<string>("");
  const [savedCount, setSavedCount] = useState<number>(0);
  const [query, setQuery] = useState("");
  const [matches, setMatches] = useState<StudentRow[]>([]);

  const parsedNames = useMemo(() => {
    if (!csvText.trim()) return [];
    return parseNamesFromCSV(csvText);
  }, [csvText]);

  async function onFilePick(file: File) {
    setStatus("");
    setSavedCount(0);
    const text = await file.text();
    setCsvText(text);
  }

  async function saveToDatabase() {
    setStatus("Saving to database...");
    setSavedCount(0);

    const names = parsedNames;
    if (names.length === 0) {
      setStatus("❌ No names found in CSV.");
      return;
    }

    // Insert in chunks to avoid big request
    const chunkSize = 200;
    let totalSaved = 0;

    for (let i = 0; i < names.length; i += chunkSize) {
      const chunk = names.slice(i, i + chunkSize).map((name) => ({
        name,
        batch,
      }));

      const { error, data } = await supabase
        .from("students")
        .insert(chunk)
        .select("id");

      if (error) {
        setStatus("❌ Save failed: " + error.message);
        return;
      }
      totalSaved += data?.length ?? chunk.length;
      setSavedCount(totalSaved);
    }

    setStatus("✅ Saved students successfully.");
  }

  async function searchStudents() {
    setStatus("");
    const q = query.trim();
    if (!q) {
      setMatches([]);
      return;
    }

    const { data, error } = await supabase
      .from("students")
      .select("id,name,batch,created_at")
      .ilike("name", `%${q}%`)
      .eq("batch", batch)
      .limit(10);

    if (error) {
      setStatus("❌ Search failed: " + error.message);
      return;
    }
    setMatches(data ?? []);
  }

  return (
    <main style={{ padding: 24, fontFamily: "system-ui", maxWidth: 820 }}>
      <h1 style={{ fontSize: 26, fontWeight: 800 }}>Students</h1>
      <p style={{ marginTop: 8, opacity: 0.8 }}>
        Module 2: Import student names (CSV) + autocomplete search.
      </p>

      <hr style={{ margin: "20px 0" }} />

      <section>
        <h2 style={{ fontSize: 18, fontWeight: 700 }}>Batch</h2>
        <input
          value={batch}
          onChange={(e) => setBatch(e.target.value)}
          style={{ marginTop: 8, padding: 10, width: 220 }}
          placeholder="JEE"
        />
      </section>

      <hr style={{ margin: "20px 0" }} />

      <section>
        <h2 style={{ fontSize: 18, fontWeight: 700 }}>1) Upload CSV</h2>

        <div style={{ marginTop: 10 }}>
          <input
            type="file"
            accept=".csv,text/csv"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) onFilePick(f);
            }}
          />
        </div>

        <p style={{ marginTop: 10, opacity: 0.8 }}>
          Parsed names found: <b>{parsedNames.length}</b>
        </p>

        <button
          onClick={saveToDatabase}
          style={{
            marginTop: 10,
            padding: "10px 14px",
            fontWeight: 700,
            cursor: "pointer",
          }}
        >
          Save to Database
        </button>

        {savedCount > 0 && (
          <p style={{ marginTop: 10 }}>Saved: <b>{savedCount}</b></p>
        )}
      </section>

      <hr style={{ margin: "20px 0" }} />

      <section>
        <h2 style={{ fontSize: 18, fontWeight: 700 }}>2) Autocomplete Search</h2>

        <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder='Type "P" or "Pri"...'
            style={{ padding: 10, flex: 1 }}
          />
          <button
            onClick={searchStudents}
            style={{ padding: "10px 14px", fontWeight: 700, cursor: "pointer" }}
          >
            Search
          </button>
        </div>

        {matches.length > 0 && (
          <div style={{ marginTop: 12 }}>
            <div style={{ fontWeight: 700, marginBottom: 6 }}>Suggestions:</div>
            <div style={{ border: "1px solid #ddd", borderRadius: 8 }}>
              {matches.map((s) => (
                <div
                  key={s.id}
                  style={{
                    padding: 10,
                    borderBottom: "1px solid #eee",
                  }}
                >
                  {s.name}
                </div>
              ))}
            </div>
          </div>
        )}
      </section>

      {status && (
        <p style={{ marginTop: 16, fontWeight: 700 }}>{status}</p>
      )}
    </main>
  );
}
