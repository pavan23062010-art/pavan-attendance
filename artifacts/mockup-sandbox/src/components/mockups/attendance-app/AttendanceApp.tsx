import { useState, useEffect } from "react";

interface Student {
  id: string;
  name: string;
  totalDays: number;
  presentDays: number;
}

interface AttendanceRecord {
  studentId: string;
  status: "present" | "absent";
}

const STORAGE_KEY = "attendance_students";

function generateId() {
  return Math.random().toString(36).slice(2, 9);
}

export function AttendanceApp() {
  const [students, setStudents] = useState<Student[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      return saved ? JSON.parse(saved) : [
        { id: "1", name: "Alice Johnson", totalDays: 20, presentDays: 18 },
        { id: "2", name: "Bob Smith", totalDays: 20, presentDays: 14 },
        { id: "3", name: "Clara Davis", totalDays: 20, presentDays: 20 },
        { id: "4", name: "Daniel Lee", totalDays: 20, presentDays: 9 },
      ];
    } catch {
      return [];
    }
  });

  const [newName, setNewName] = useState("");
  const [search, setSearch] = useState("");
  const [attendance, setAttendance] = useState<Record<string, "present" | "absent">>({});
  const [saved, setSaved] = useState(false);
  const [activeTab, setActiveTab] = useState<"mark" | "report">("mark");

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(students));
    } catch {}
  }, [students]);

  const filtered = students.filter((s) =>
    s.name.toLowerCase().includes(search.toLowerCase())
  );

  function addStudent() {
    const trimmed = newName.trim();
    if (!trimmed) return;
    setStudents((prev) => [
      ...prev,
      { id: generateId(), name: trimmed, totalDays: 0, presentDays: 0 },
    ]);
    setNewName("");
  }

  function toggleAttendance(id: string) {
    setAttendance((prev) => ({
      ...prev,
      [id]: prev[id] === "present" ? "absent" : "present",
    }));
  }

  function saveAttendance() {
    setStudents((prev) =>
      prev.map((s) => {
        const status = attendance[s.id];
        if (!status) return s;
        return {
          ...s,
          totalDays: s.totalDays + 1,
          presentDays: s.presentDays + (status === "present" ? 1 : 0),
        };
      })
    );
    setAttendance({});
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  function removeStudent(id: string) {
    setStudents((prev) => prev.filter((s) => s.id !== id));
  }

  const pct = (s: Student) =>
    s.totalDays === 0 ? 0 : Math.round((s.presentDays / s.totalDays) * 100);

  const markedCount = Object.keys(attendance).length;

  return (
    <div
      style={{ fontFamily: "'Poppins', sans-serif" }}
      className="min-h-screen bg-[#eef2f7] pb-8"
    >
      {/* Header */}
      <div
        className="text-white text-center py-5 px-4"
        style={{
          background: "linear-gradient(135deg, #4e73df, #1cc88a)",
          borderRadius: "0 0 24px 24px",
        }}
      >
        <div className="text-2xl font-bold tracking-tight">Smart Attendance</div>
        <div className="text-sm opacity-80 mt-1">
          {students.length} student{students.length !== 1 ? "s" : ""} enrolled
        </div>
        {/* Tabs */}
        <div className="flex justify-center mt-4 gap-2">
          {(["mark", "report"] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className="px-5 py-1.5 rounded-full text-sm font-medium transition-all"
              style={{
                background: activeTab === tab ? "white" : "rgba(255,255,255,0.2)",
                color: activeTab === tab ? "#4e73df" : "white",
              }}
            >
              {tab === "mark" ? "Mark Attendance" : "Report"}
            </button>
          ))}
        </div>
      </div>

      <div className="px-4 mt-4 space-y-4">
        {/* Add Student */}
        <div className="bg-white rounded-2xl shadow-sm p-4">
          <h3 className="font-semibold text-gray-700 mb-3">Add Student</h3>
          <div className="flex gap-2">
            <input
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && addStudent()}
              placeholder="Enter student name"
              className="flex-1 border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#4e73df]/30"
            />
            <button
              onClick={addStudent}
              className="px-4 py-2.5 rounded-xl text-white text-sm font-semibold"
              style={{ background: "linear-gradient(135deg,#4e73df,#1cc88a)" }}
            >
              Add
            </button>
          </div>
        </div>

        {/* Search */}
        <div className="bg-white rounded-2xl shadow-sm p-4">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="🔍  Search student..."
            className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#4e73df]/30"
          />
        </div>

        {activeTab === "mark" ? (
          /* Mark Attendance */
          <div className="bg-white rounded-2xl shadow-sm p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-gray-700">Today's Attendance</h3>
              {markedCount > 0 && (
                <span className="text-xs text-[#4e73df] font-medium">
                  {markedCount} marked
                </span>
              )}
            </div>

            {filtered.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-6">
                No students found
              </p>
            ) : (
              <div className="space-y-2">
                {filtered.map((s) => {
                  const status = attendance[s.id];
                  return (
                    <div
                      key={s.id}
                      className="flex items-center justify-between p-3 rounded-xl transition-all"
                      style={{
                        background:
                          status === "present"
                            ? "#e8fdf3"
                            : status === "absent"
                            ? "#fde8e8"
                            : "#f8f9fc",
                      }}
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold"
                          style={{ background: "linear-gradient(135deg,#4e73df,#1cc88a)" }}
                        >
                          {s.name.charAt(0)}
                        </div>
                        <div>
                          <div className="text-sm font-medium text-gray-800">{s.name}</div>
                          <div className="text-xs text-gray-400">
                            {pct(s)}% attendance
                          </div>
                        </div>
                      </div>
                      <div className="flex gap-2 items-center">
                        <button
                          onClick={() => toggleAttendance(s.id)}
                          className="text-xs font-semibold px-3 py-1.5 rounded-lg transition-all"
                          style={{
                            background:
                              status === "present"
                                ? "#1cc88a"
                                : status === "absent"
                                ? "#e74a3b"
                                : "#e0e0e0",
                            color: status ? "white" : "#666",
                          }}
                        >
                          {status === "present"
                            ? "✓ Present"
                            : status === "absent"
                            ? "✗ Absent"
                            : "Mark"}
                        </button>
                        <button
                          onClick={() => removeStudent(s.id)}
                          className="text-gray-300 hover:text-red-400 transition-colors text-lg leading-none"
                        >
                          ×
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            <button
              onClick={saveAttendance}
              disabled={markedCount === 0}
              className="w-full mt-4 py-3 rounded-xl text-white font-semibold text-sm transition-all"
              style={{
                background:
                  markedCount === 0
                    ? "#ccc"
                    : saved
                    ? "#1cc88a"
                    : "linear-gradient(135deg,#4e73df,#1cc88a)",
              }}
            >
              {saved ? "✓ Saved!" : `Save Attendance (${markedCount})`}
            </button>
          </div>
        ) : (
          /* Report */
          <div className="bg-white rounded-2xl shadow-sm p-4">
            <h3 className="font-semibold text-gray-700 mb-3">Attendance Report</h3>

            {/* Summary cards */}
            <div className="grid grid-cols-3 gap-2 mb-4">
              {[
                {
                  label: "Students",
                  value: students.length,
                  color: "#4e73df",
                },
                {
                  label: "≥75% Rate",
                  value: students.filter((s) => pct(s) >= 75).length,
                  color: "#1cc88a",
                },
                {
                  label: "<75% Rate",
                  value: students.filter((s) => pct(s) < 75 && s.totalDays > 0).length,
                  color: "#e74a3b",
                },
              ].map((card) => (
                <div
                  key={card.label}
                  className="rounded-xl p-3 text-center"
                  style={{ background: card.color + "18" }}
                >
                  <div
                    className="text-xl font-bold"
                    style={{ color: card.color }}
                  >
                    {card.value}
                  </div>
                  <div className="text-xs text-gray-500 mt-0.5">{card.label}</div>
                </div>
              ))}
            </div>

            {filtered.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-6">
                No students found
              </p>
            ) : (
              <div className="space-y-3">
                {filtered
                  .slice()
                  .sort((a, b) => pct(b) - pct(a))
                  .map((s) => {
                    const p = pct(s);
                    const isLow = s.totalDays > 0 && p < 75;
                    return (
                      <div key={s.id} className="p-3 bg-[#f8f9fc] rounded-xl">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <div
                              className="w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-bold"
                              style={{
                                background:
                                  "linear-gradient(135deg,#4e73df,#1cc88a)",
                              }}
                            >
                              {s.name.charAt(0)}
                            </div>
                            <div>
                              <div className="text-sm font-medium text-gray-800">
                                {s.name}
                              </div>
                              <div className="text-xs text-gray-400">
                                {s.presentDays}/{s.totalDays} days
                              </div>
                            </div>
                          </div>
                          <div className="text-right">
                            <span
                              className="text-sm font-bold"
                              style={{ color: isLow ? "#e74a3b" : "#1cc88a" }}
                            >
                              {s.totalDays === 0 ? "—" : `${p}%`}
                            </span>
                            {isLow && (
                              <div className="text-xs text-red-400">Low</div>
                            )}
                          </div>
                        </div>
                        {s.totalDays > 0 && (
                          <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                            <div
                              className="h-2 rounded-full transition-all"
                              style={{
                                width: `${p}%`,
                                background: isLow
                                  ? "#e74a3b"
                                  : "linear-gradient(90deg,#4e73df,#1cc88a)",
                              }}
                            />
                          </div>
                        )}
                      </div>
                    );
                  })}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
