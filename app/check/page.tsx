"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

type StudentRow = { id: string; name: string; batch: string };
type TestRow = {
  id: string;
  test_name: string;
  mcq_key: {
    physics: string[];
    chemistry: string[];
    maths: string[];
  };
  numerical_key: {
    physics: string[];
    chemistry: string[];
    maths: string[];
  };
};

type AnswersMCQ = {
  physics: string[]; // 20
  chemistry: string[]; // 20
  maths: string[]; // 20
};

type AnswersNUM = {
  physics: string[]; // 5
  chemistry: string[]; // 5
  maths: string[]; // 5
};

function emptyMCQ(): AnswersMCQ {
  return {
    physics: Array(20).fill(""),
    chemistry: Array(20).fill(""),
    maths: Array(20).fill(""),
  };
}
function emptyNUM(): AnswersNUM {
  return {
    physics: Array(5).fill(""),
    chemistry: Array(5).fill(""),
    maths: Array(5).fill(""),
  };
}

function normalizeNumberString(x: string): string {
  const t = x.trim();
  if (!t) return "";
  const n = Number(t);
  if (Number.isNaN(n)) return "__invalid__";
  // 3 == 3.0
  return String(n);
}

function gradeSectionMCQ(key: string[], ans: string[]) {
  let correct = 0;
  let wrong = 0;
  let unattempt = 0;
  const wrongQs: number[] = [];
  for (let i = 0; i < 20; i++) {
    const a = (ans[i] ?? "").trim().toUpperCase();
    const k = (key[i] ?? "").trim().toUpperCase();
    if (!a) {
      unattempt++;
      continue;
    }
    if (a === k) correct++;
    else {
      wrong++;
      wrongQs.push(i + 1);
    }
  }
  const marks = correct * 4 - wrong * 1;
  return { correct, wrong, unattempt, marks, wrongQs };
}

function gradeSectionNUM(key: string[], ans: string[]) {
  let correct = 0;
  let wrong = 0;
  let unattempt = 0;
  const wrongQs: number[] = [];
  for (let i = 0; i < 5; i++) {
    const aRaw = (ans[i] ?? "").trim();
    const kRaw = (key[i] ?? "").trim();

    if (!aRaw) {
      unattempt++;
      continue;
    }

    const a = normalizeNumberString(aRaw);
    const k = normalizeNumberString(kRaw);

    // If manager typed something non-number, treat as wrong (and flag)
    if (a === "__invalid__" || k === "__invalid__") {
      wrong++;
      wrongQs.push(21 + i);
      continue;
    }

    if (a === k) correct++;
    else {
      wrong++;
      wrongQs.push(21 + i);
    }
  }
  const marks = correct * 4 - wrong * 1;
  return { correct, wrong, unattempt, marks, wrongQs };
}

export default function CheckPage() {
  // Student select
  const [studentQuery, setStudentQuery] = useState("");
  const [studentSuggestions, setStudentSuggestions] = useState<StudentRow[]>([]);
  const [selectedStudent, setSelectedStudent] = useState<StudentRow | null>(null);

  // Test select
  const [tests, setTests] = useState<TestRow[]>([]);
  const [selectedTestId, setSelectedTestId] = useState("");
  const selectedTest = useMemo(
    () => tests.find((t) => t.id === selectedTestId) ?? null,
    [tests, selectedTestId]
  );

  // Answers
  const [mcqAns, setMcqAns] = useState<AnswersMCQ>(emptyMCQ());
  const [numAns, setNumAns] = useState<AnswersNUM>(emptyNUM());

  // Results
  const [status, setStatus] = useState("");
  const [result, setResult] = useState<any>(null);

  async function loadTests() {
    const { data, error } = await supabase
      .from("tests")
      .select("id,test_name,mcq_key,numerical_key")
      .order("created_at", { ascending: false })
      .limit(100);

    if (error) {
      setStatus("❌ Failed to load tests: " + error.message);
      return;
    }
    setTests((data ?? []) as any);
  }

  useEffect(() => {
    loadTests();
  }, []);

  async function searchStudents() {
    const q = studentQuery.trim();
    if (!q) {
      setStudentSuggestions([]);
      return;
    }
    const { data, error } = await supabase
      .from("students")
      .select("id,name,batch")
      .ilike("name", `%${q}%`)
      .limit(10);

    if (error) {
      setStatus("❌ Student search failed: " + error.message);
      return;
    }
    setStudentSuggestions((data ?? []) as any);
  }

  function setMCQ(subject: keyof AnswersMCQ, idx: number, val: string) {
    setMcqAns((prev) => {
      const next = { ...prev, [subject]: [...prev[subject]] };
      next[subject][idx] = val;
      return next;
    });
  }

  function setNUM(subject: keyof AnswersNUM, idx: number, val: string) {
    setNumAns((prev) => {
      const next = { ...prev, [subject]: [...prev[subject]] };
      next[subject][idx] = val;
      return next;
    });
  }

  function compute() {
    setStatus("");
    setResult(null);

    if (!selectedStudent) {
      setStatus("❌ Please select a student.");
      return;
    }
    if (!selectedTest) {
      setStatus("❌ Please select a test.");
      return;
    }

    const mcqP = gradeSectionMCQ(selectedTest.mcq_key.physics, mcqAns.physics);
    const mcqC = gradeSectionMCQ(selectedTest.mcq_key.chemistry, mcqAns.chemistry);
    const mcqM = gradeSectionMCQ(selectedTest.mcq_key.maths, mcqAns.maths);

    const numP = gradeSectionNUM(selectedTest.numerical_key.physics, numAns.physics);
    const numC = gradeSectionNUM(selectedTest.numerical_key.chemistry, numAns.chemistry);
    const numM = gradeSectionNUM(selectedTest.numerical_key.maths, numAns.maths);

    const phyMarks = mcqP.marks + numP.marks;
    const chemMarks = mcqC.marks + numC.marks;
    const mathMarks = mcqM.marks + numM.marks;
    const total = phyMarks + chemMarks + mathMarks;

    const wrong = {
      physics: [...mcqP.wrongQs, ...numP.wrongQs],
      chemistry: [...mcqC.wrongQs, ...numC.wrongQs],
      maths: [...mcqM.wrongQs, ...numM.wrongQs],
    };

    const out = {
      physics: { marks: phyMarks, mcq: mcqP, num: numP },
      chemistry: { marks: chemMarks, mcq: mcqC, num: numC },
      maths: { marks: mathMarks, mcq: mcqM, num: numM },
      total,
      wrong,
    };

    setResult(out);
    setStatus("✅ Computed. Now you can Save Result.");
  }

  async function saveResult() {
    setStatus("");

    if (!selectedStudent || !selectedTest || !result) {
      setStatus("❌ Compute first (and select student + test).");
      return;
    }

    setStatus("Saving result...");

    const payload = {
      student_id: selectedStudent.id,
      student_name: selectedStudent.name,
      test_id: selectedTest.id,
      test_name: selectedTest.test_name,
      mcq_answers: mcqAns,
      numerical_answers: numAns,
      marks: {
        physics: result.physics.marks,
        chemistry: result.chemistry.marks,
        maths: result.maths.marks,
        total: result.total,
      },
      wrong_questions: result.wrong,
    };

    const { error } = await supabase.from("results").insert(payload);

    if (error) {
      setStatus("❌ Save failed: " + error.message);
      return;
    }

    setStatus("✅ Result saved successfully.");
  }

  return (
    <main style={{ padding: 24, fontFamily: "system-ui", maxWidth: 1100 }}>
      <h1 style={{ fontSize: 26, fontWeight: 900 }}>Manual Checking</h1>
      <p style={{ marginTop: 6, opacity: 0.8 }}>
        Module 4: select Student + Test → enter answers → marks + wrong Qs → save.
      </p>

      <hr style={{ margin: "18px 0" }} />

      {/* Student select */}
      <section>
        <h2 style={{ fontSize: 18, fontWeight: 800 }}>1) Select Student</h2>
        <div style={{ display: "flex", gap: 8, marginTop: 10, flexWrap: "wrap" }}>
          <input
            value={studentQuery}
            onChange={(e) => setStudentQuery(e.target.value)}
            placeholder='Type "Pri"...'
            style={{ padding: 10, width: 320 }}
          />
          <button
            onClick={searchStudents}
            style={{ padding: "10px 14px", fontWeight: 800, cursor: "pointer" }}
          >
            Search
          </button>
          {selectedStudent && (
            <div style={{ padding: 10, border: "1px solid #ddd", borderRadius: 8 }}>
              Selected: <b>{selectedStudent.name}</b>
            </div>
          )}
        </div>

        {studentSuggestions.length > 0 && (
          <div style={{ marginTop: 10, border: "1px solid #ddd", borderRadius: 10 }}>
            {studentSuggestions.map((s) => (
              <div
                key={s.id}
                onClick={() => {
                  setSelectedStudent(s);
                  setStudentSuggestions([]);
                  setStudentQuery(s.name);
                }}
                style={{
                  padding: 10,
                  borderBottom: "1px solid #eee",
                  cursor: "pointer",
                }}
              >
                {s.name}
              </div>
            ))}
          </div>
        )}
      </section>

      <hr style={{ margin: "18px 0" }} />

      {/* Test select */}
      <section>
        <h2 style={{ fontSize: 18, fontWeight: 800 }}>2) Select Test</h2>
        <select
          value={selectedTestId}
          onChange={(e) => setSelectedTestId(e.target.value)}
          style={{ marginTop: 10, padding: 10, width: 360 }}
        >
          <option value="">-- Select test --</option>
          {tests.map((t) => (
            <option key={t.id} value={t.id}>
              {t.test_name}
            </option>
          ))}
        </select>
      </section>

      <hr style={{ margin: "18px 0" }} />

      {/* Answers */}
      <section>
        <h2 style={{ fontSize: 18, fontWeight: 900 }}>3) Enter Answers (Manual)</h2>

        <div style={{ marginTop: 12, fontWeight: 900 }}>MCQ (Q1–Q20)</div>

        {(["physics", "chemistry", "maths"] as const).map((subj) => (
          <div key={subj} style={{ marginTop: 12 }}>
            <div style={{ fontWeight: 900, textTransform: "capitalize" }}>{subj}</div>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(10, minmax(60px, 1fr))",
                gap: 8,
                marginTop: 8,
              }}
            >
              {mcqAns[subj].map((v, i) => (
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

        <div style={{ marginTop: 18, fontWeight: 900 }}>Numericals (Q21–Q25)</div>

        {(["physics", "chemistry", "maths"] as const).map((subj) => (
          <div key={subj} style={{ marginTop: 12 }}>
            <div style={{ fontWeight: 900, textTransform: "capitalize" }}>{subj}</div>
            <div style={{ display: "flex", gap: 8, marginTop: 8, flexWrap: "wrap" }}>
              {numAns[subj].map((v, i) => (
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

        <div style={{ display: "flex", gap: 10, marginTop: 16, flexWrap: "wrap" }}>
          <button
            onClick={compute}
            style={{ padding: "10px 14px", fontWeight: 900, cursor: "pointer" }}
          >
            Compute Result
          </button>
          <button
            onClick={saveResult}
            style={{ padding: "10px 14px", fontWeight: 900, cursor: "pointer" }}
          >
            Save Result
          </button>
        </div>
      </section>

      {/* Output */}
      {result && (
        <section style={{ marginTop: 22 }}>
          <h2 style={{ fontSize: 18, fontWeight: 900 }}>4) Results</h2>

          <div style={{ marginTop: 10, border: "1px solid #ddd", borderRadius: 12 }}>
            {(["physics", "chemistry", "maths"] as const).map((subj) => {
              const r = result[subj];
              return (
                <div key={subj} style={{ padding: 12, borderBottom: "1px solid #eee" }}>
                  <div style={{ fontWeight: 900, textTransform: "capitalize" }}>
                    {subj} — Marks: <b>{r.marks}</b>
                  </div>
                  <div style={{ marginTop: 6, opacity: 0.85 }}>
                    Wrong Qs: <b>{(result.wrong[subj] as number[]).length}</b>{" "}
                    {((result.wrong[subj] as number[]).length > 0) ? (
                      <>({(result.wrong[subj] as number[]).join(", ")})</>
                    ) : (
                      <>(none)</>
                    )}
                  </div>
                </div>
              );
            })}
            <div style={{ padding: 12 }}>
              <div style={{ fontWeight: 900, fontSize: 16 }}>
                Total: <b>{result.total}</b> / 300
              </div>
            </div>
          </div>
        </section>
      )}

      {status && <p style={{ marginTop: 16, fontWeight: 900 }}>{status}</p>}
    </main>
  );
}
