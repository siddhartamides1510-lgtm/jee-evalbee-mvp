"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

type TestRow = {
  id: string;
  test_name: string;
  created_at: string;
};

type MCQKey = {
  physics: string[]; // length 20, each A/B/C/D or ""
  chemistry: string[];
  maths: string[];
};

type NumericalKey = {
  physics: string[]; // length 5, stored as strings ("3" == "3.0" later)
  chemistry: string[];
  maths: string[];
};

function makeMCQEmpty(): MCQKey {
  return {
    physics: Array(20).fill(""),
    chemistry: Array(20).fill(""),
    maths: Array(20).fill(""),
  };
}

function makeNumEmpty(): NumericalKey {
  return {
    physics: Array(5).fill(""),
    chemistry: Array(5).fill(""),
    maths: Array(5).fill(""),
  };
}

export default function TestsPage() {
  const [testName, setTestName] = useState("");
  const [mcq, setMcq] = useState<MCQKey>(makeMCQEmpty());
  const [num, setNum] = useState<NumericalKey>(makeNumEmpty());
  const [status, setStatus] = useState("");
  const [tests, setTests] = useState<TestRow[]>([]);

  const canSave = useMemo(() => testName.trim().length > 0, [testName]);

  async function loadTests() {
    const { data, error } = await supabase
      .from("tests")
      .select("id,test_name,created_at")
      .order("created_at", { ascending: false })
      .limit(50);

    if (error) {
      setStatus("❌ Failed to load tests: " + error.message);
      return;
    }
    setTests(data ?? []);
  }

  useEffect(() => {
    loadTests();
  }, []);

  function setMCQ(subject: keyof MCQKey, idx: number, val: string) {
    setMcq((prev) => {
      const next = { ...prev, [subject]: [...prev[subject]] };
      next[subject][idx] = val;
      return next;
    });
  }

  function setNUM(subject: keyof NumericalKey, idx: number, val: string) {
    setNum((prev) => {
      const next = { ...prev, [subject]: [...prev[subject]] };
      next[subject][idx] = val;
      return next;
    });
  }

  async function saveTest() {
    setStatus("");
    if (!canSave) {
      setStatus("❌ Please enter Test Name.");
      return;
    }

    setStatus("Saving test...");

    const payload = {
      test_name: testName.trim(),
      mcq_key: mcq,
      numerical_key: num,
    };

    const { error } = await supabase.from("tests").insert(payload);

    if (error) {
      setStatus("❌ Save failed: " + error.message);
      return;
    }

    setStatus("✅ Test saved successfully.");
    setTestName("");
    setMcq(makeMCQEmpty());
    setNum(makeNumEmpty());
    await loadTests();
  }

  return (
    <main style={{ padding: 24, fontFamily: "system-ui", maxWidth: 980 }}>
      <h1 style={{ fontSize: 26, fontWeight: 800 }}>Tests</h1>
      <p style={{ marginTop: 8, opacity: 0.8 }}>
        Module 3: Create Test + Answer Key Storage
      </p>

      <hr style={{ margin: "18px 0" }} />

      <section>
        <h2 style={{ fontSize: 18, fontWeight: 800 }}>Create Test</h2>

        <div style={{ marginTop: 10 }}>
          <div style={{ fontWeight: 700, marginBottom: 6 }}>Test Name</div>
          <input
            value={testName}
            onChange={(e) => setTestName(e.target.value)}
            placeholder="e.g., JEE Mock Test 01"
            style={{ padding: 10, width: "100%", maxWidth: 520 }}
          />
        </div>

        <div style={{ marginTop: 16, fontWeight: 800 }}>
          MCQ Answer Key (Q1–Q20) — A/B/C/D
        </div>

        {(["physics", "chemistry", "maths"] as const).map((subj) => (
          <div key={subj} style={{ marginTop: 12 }}>
            <div style={{ fontWeight: 800, textTransform: "capitalize" }}>
              {subj}
            </div>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(10, minmax(60px, 1fr))",
                gap: 8,
                marginTop: 8,
              }}
            >
              {mcq[subj].map((v, i) => (
                <div key={i} style={{ display: "flex", flexDirection: "column" }}>
                  <div style={{ fontSize: 12, opacity: 0.7 }}>Q{i + 1}</div>
                  <select
                    value={v}
                    onChange={(e) => setMCQ(subj, i, e.target.value)}
                    style={{ padding: 8 }}
                  >
                    <option value="">-</option>
                    <option value="A">A</option>
                    <option value="B">B</option>
                    <option value="C">C</option>
                    <option value="D">D</option>
                  </select>
                </div>
              ))}
            </div>
          </div>
        ))}

        <div style={{ marginTop: 18, fontWeight: 800 }}>
          Numerical Answer Key (Q21–Q25) — exact match later
        </div>

        {(["physics", "chemistry", "maths"] as const).map((subj) => (
          <div key={subj} style={{ marginTop: 12 }}>
            <div style={{ fontWeight: 800, textTransform: "capitalize" }}>
              {subj}
            </div>
            <div style={{ display: "flex", gap: 8, marginTop: 8, flexWrap: "wrap" }}>
              {num[subj].map((v, i) => (
                <div key={i} style={{ display: "flex", flexDirection: "column" }}>
                  <div style={{ fontSize: 12, opacity: 0.7 }}>Q{21 + i}</div>
                  <input
                    value={v}
                    onChange={(e) => setNUM(subj, i, e.target.value)}
                    placeholder="e.g. 3 or -1.5"
                    style={{ padding: 8, width: 120 }}
                  />
                </div>
              ))}
            </div>
          </div>
        ))}

        <button
          onClick={saveTest}
          style={{
            marginTop: 18,
            padding: "10px 14px",
            fontWeight: 800,
            cursor: "pointer",
          }}
        >
          Save Test
        </button>

        {status && <p style={{ marginTop: 12, fontWeight: 800 }}>{status}</p>}
      </section>

      <hr style={{ margin: "22px 0" }} />

      <section>
        <h2 style={{ fontSize: 18, fontWeight: 800 }}>Saved Tests</h2>
        <div style={{ marginTop: 10, border: "1px solid #ddd", borderRadius: 10 }}>
          {tests.length === 0 ? (
            <div style={{ padding: 12, opacity: 0.8 }}>No tests yet.</div>
          ) : (
            tests.map((t) => (
              <div
                key={t.id}
                style={{
                  padding: 12,
                  borderBottom: "1px solid #eee",
                  display: "flex",
                  justifyContent: "space-between",
                  gap: 10,
                }}
              >
                <div style={{ fontWeight: 800 }}>{t.test_name}</div>
                <div style={{ opacity: 0.7, fontSize: 12 }}>
                  {new Date(t.created_at).toLocaleString()}
                </div>
              </div>
            ))
          )}
        </div>
      </section>
    </main>
  );
}
