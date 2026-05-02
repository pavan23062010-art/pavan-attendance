import { MonthRecord, SchoolInfo, Student, presentCount, pct } from "@/context/AppContext";

export const MONTH_LABELS_FULL = [
  "July","August","September","October","November","December",
  "January","February","March","April","May","June",
];
export const ACADEMIC_MONTHS_CONST = [
  "2026-July","2026-August","2026-September","2026-October","2026-November","2026-December",
  "2027-January","2027-February","2027-March","2027-April","2027-May","2027-June",
];

// ─── Class Monthly Report ─────────────────────────────────────────────────────
export function buildClassReportHTML(
  school: SchoolInfo,
  cls: number,
  section: string,
  students: Student[],
  records: MonthRecord[],
): string {
  const clsStu = students.filter(s => s.class === cls && s.section === section)
    .sort((a, b) => a.rollNo.localeCompare(b.rollNo));
  const clsRec = records.filter(r => r.class === cls && r.section === section);

  const totalWD = clsRec.reduce((a, r) => a + r.workingDays, 0);

  const monthHeaders = ACADEMIC_MONTHS_CONST.map((m, i) => {
    const rec = clsRec.find(r => r.month === m);
    return `<th>${MONTH_LABELS_FULL[i]}<br/><small style="font-weight:400;font-size:9px;">${rec?.workingDays ?? 0}d</small></th>`;
  }).join("");

  const rows = clsStu.map((s, idx) => {
    const monthlyCells = ACADEMIC_MONTHS_CONST.map(m => {
      const rec = clsRec.find(r => r.month === m);
      if (!rec) return `<td style="color:#94a3b8;">—</td>`;
      const p = presentCount(rec, s.id);
      const wd = rec.workingDays;
      const pc = pct(p, wd);
      const color = pc >= 85 ? "#16a34a" : pc >= 75 ? "#b45309" : "#dc2626";
      return `<td style="color:${color};font-weight:700;">${p}/${wd}</td>`;
    }).join("");

    const totalPresent = clsRec.reduce((a, r) => a + presentCount(r, s.id), 0);
    const overallPct = pct(totalPresent, totalWD);
    const pctColor = overallPct >= 85 ? "#16a34a" : overallPct >= 75 ? "#b45309" : "#dc2626";
    const bg = idx % 2 === 0 ? "#ffffff" : "#f8fafc";

    return `
      <tr style="background:${bg};">
        <td style="text-align:center;font-weight:700;color:#64748b;">${idx + 1}</td>
        <td style="font-weight:600;">${s.rollNo}</td>
        <td style="font-weight:600;">${s.name}</td>
        ${monthlyCells}
        <td style="font-weight:900;color:${pctColor};font-size:13px;">${overallPct}%</td>
        <td style="font-weight:700;color:#1e40af;">${totalPresent}/${totalWD}</td>
      </tr>`;
  }).join("");

  // Summary row
  const monthSummary = ACADEMIC_MONTHS_CONST.map(m => {
    const rec = clsRec.find(r => r.month === m);
    if (!rec || clsStu.length === 0) return `<td style="font-weight:700;color:#64748b;">—</td>`;
    const totalP = clsStu.reduce((a, s) => a + presentCount(rec, s.id), 0);
    const avgP = Math.round(totalP / clsStu.length);
    const pc = pct(avgP, rec.workingDays);
    const color = pc >= 85 ? "#16a34a" : pc >= 75 ? "#b45309" : "#dc2626";
    return `<td style="font-weight:800;color:${color};">${pc}%</td>`;
  }).join("");

  const overallAvg = clsStu.length === 0 ? 0 : (() => {
    let tp = 0, tposs = 0;
    clsStu.forEach(s => clsRec.forEach(r => { tp += presentCount(r, s.id); tposs += r.workingDays; }));
    return pct(tp, tposs);
  })();
  const avgColor = overallAvg >= 85 ? "#16a34a" : overallAvg >= 75 ? "#b45309" : "#dc2626";

  const below75 = clsStu.filter(s => {
    const tp = clsRec.reduce((a, r) => a + presentCount(r, s.id), 0);
    return pct(tp, totalWD) < 75;
  }).length;

  const generated = new Date().toLocaleDateString("en-IN", { day:"2-digit", month:"long", year:"numeric", hour:"2-digit", minute:"2-digit" });

  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1.0"/>
<title>Attendance Report – Class ${cls}${section}</title>
<style>
  @page { size: A4 landscape; margin: 10mm 8mm; }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: 'Segoe UI', Arial, sans-serif; font-size: 11px; color: #1e293b; background: #fff; }
  .header { background: linear-gradient(135deg, ${school.primaryColor}, #1a3aaa); padding: 14px 20px; display: flex; justify-content: space-between; align-items: center; border-radius: 8px; margin-bottom: 14px; }
  .school-name { color: #fff; }
  .school-name h1 { font-size: 18px; font-weight: 900; letter-spacing: 1px; }
  .school-name h2 { font-size: 14px; font-weight: 800; letter-spacing: 1px; margin-top: 2px; }
  .school-name p { font-size: 10px; color: rgba(255,255,255,0.7); letter-spacing: 2px; text-transform: uppercase; margin-top: 3px; }
  .report-meta { text-align: right; color: rgba(255,255,255,0.85); }
  .report-meta h3 { font-size: 16px; font-weight: 900; }
  .report-meta p { font-size: 10px; margin-top: 3px; }
  .summary-bar { display: flex; gap: 12px; margin-bottom: 14px; }
  .stat-box { flex: 1; border-radius: 8px; padding: 10px 14px; text-align: center; border-left: 4px solid; }
  .stat-box .val { font-size: 20px; font-weight: 900; }
  .stat-box .lbl { font-size: 9px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; margin-top: 2px; color: #64748b; }
  table { width: 100%; border-collapse: collapse; font-size: 10px; }
  thead tr { background: ${school.primaryColor}; color: white; }
  thead th { padding: 7px 5px; text-align: center; font-weight: 700; font-size: 10px; }
  thead th:nth-child(3) { text-align: left; min-width: 100px; }
  tbody td { padding: 6px 5px; text-align: center; border-bottom: 1px solid #f1f5f9; font-size: 10px; }
  tbody td:nth-child(3) { text-align: left; }
  .summary-row { background: #f0f9ff !important; border-top: 2px solid ${school.primaryColor}; }
  .summary-row td { font-size: 10px; padding: 7px 5px; color: #1e40af; }
  .footer { margin-top: 14px; display: flex; justify-content: space-between; font-size: 9px; color: #94a3b8; border-top: 1px solid #e2e8f0; padding-top: 8px; }
  .badge-green { background: #dcfce7; color: #16a34a; padding: 2px 7px; border-radius: 10px; font-size: 9px; font-weight: 800; }
  .badge-yellow { background: #fef3c7; color: #b45309; padding: 2px 7px; border-radius: 10px; font-size: 9px; font-weight: 800; }
  .badge-red { background: #fee2e2; color: #dc2626; padding: 2px 7px; border-radius: 10px; font-size: 9px; font-weight: 800; }
</style>
</head>
<body>
  <div class="header">
    <div class="school-name">
      <h1>${school.nameLine1}</h1>
      <h2>${school.nameLine2}</h2>
      <p>${school.location} &nbsp;·&nbsp; AY ${school.academicYear}</p>
    </div>
    <div class="report-meta">
      <h3>CLASS ${cls} – SECTION ${section}</h3>
      <p>Attendance Report · Full Academic Year</p>
      <p style="margin-top:6px;font-size:9px;opacity:0.7;">Generated: ${generated}</p>
    </div>
  </div>

  <div class="summary-bar">
    <div class="stat-box" style="background:#eff6ff;border-color:#3b82f6;">
      <div class="val" style="color:#1e40af;">${clsStu.length}</div>
      <div class="lbl">Total Students</div>
    </div>
    <div class="stat-box" style="background:#f0fdf4;border-color:#16a34a;">
      <div class="val" style="color:#16a34a;">${overallAvg}%</div>
      <div class="lbl">Overall Average</div>
    </div>
    <div class="stat-box" style="background:#fef3c7;border-color:#f59e0b;">
      <div class="val" style="color:#b45309;">${totalWD}</div>
      <div class="lbl">Working Days</div>
    </div>
    <div class="stat-box" style="background:#fef2f2;border-color:#ef4444;">
      <div class="val" style="color:#dc2626;">${below75}</div>
      <div class="lbl">Below 75% (At Risk)</div>
    </div>
    <div class="stat-box" style="background:#f5f3ff;border-color:#8b5cf6;">
      <div class="val" style="color:#7c3aed;">${clsStu.length - below75}</div>
      <div class="lbl">Regular (≥75%)</div>
    </div>
  </div>

  <table>
    <thead>
      <tr>
        <th style="width:28px;">#</th>
        <th style="width:55px;">Roll No</th>
        <th style="text-align:left;">Student Name</th>
        ${monthHeaders}
        <th style="width:42px;">Overall</th>
        <th style="width:50px;">P/WD</th>
      </tr>
    </thead>
    <tbody>
      ${rows}
      <tr class="summary-row">
        <td colspan="3" style="text-align:left;font-weight:800;color:#1e40af;">CLASS AVERAGE</td>
        ${monthSummary}
        <td style="font-weight:900;color:${avgColor};font-size:12px;">${overallAvg}%</td>
        <td style="font-weight:700;">—</td>
      </tr>
    </tbody>
  </table>

  <div class="footer">
    <span>Legend: P/WD = Present Days / Working Days &nbsp;·&nbsp; 
      <span class="badge-green">≥85% Regular</span> &nbsp;
      <span class="badge-yellow">75–84% Borderline</span> &nbsp;
      <span class="badge-red">&lt;75% At Risk</span>
    </span>
    <span>${school.nameLine1} ${school.nameLine2}, ${school.location} &nbsp;·&nbsp; Made by ${school.madeBy}</span>
  </div>
</body>
</html>`;
}

// ─── School Annual Summary Report ─────────────────────────────────────────────
export function buildSchoolSummaryHTML(
  school: SchoolInfo,
  students: Student[],
  records: MonthRecord[],
  classes: number[],
): string {
  const generated = new Date().toLocaleDateString("en-IN", { day:"2-digit", month:"long", year:"numeric", hour:"2-digit", minute:"2-digit" });

  let totalEnrolled = 0, totalPresent = 0, totalPossible = 0, totalRegular = 0;

  const classRows = classes.map((cls, i) => {
    const clsStu = students.filter(s => s.class === cls);
    const clsRec = records.filter(r => r.class === cls);
    const wd = clsRec.reduce((a, r) => a + r.workingDays, 0) / Math.max(1, clsStu.length > 0 ? 1 : 1);
    const totalWD = clsRec.length > 0 ? clsRec[0].workingDays * 12 : 0;

    let tp = 0, tposs = 0;
    clsStu.forEach(s => {
      records.filter(r => r.class === cls && r.section === s.section).forEach(r => {
        tp += presentCount(r, s.id);
        tposs += r.workingDays;
      });
    });

    const avgPct = pct(tp, tposs);
    const regular = clsStu.filter(s => {
      const stuRecs = records.filter(r => r.class === cls && r.section === s.section);
      const stuTP = stuRecs.reduce((a, r) => a + presentCount(r, s.id), 0);
      const stuWD = stuRecs.reduce((a, r) => a + r.workingDays, 0);
      return pct(stuTP, stuWD) >= 75;
    }).length;

    totalEnrolled += clsStu.length;
    totalPresent += tp;
    totalPossible += tposs;
    totalRegular += regular;

    const pctColor = avgPct >= 85 ? "#16a34a" : avgPct >= 75 ? "#b45309" : "#dc2626";
    const bg = i % 2 === 0 ? "#ffffff" : "#f8fafc";
    const irregular = clsStu.length - regular;

    // Section breakdown
    const sections = [...new Set(clsStu.map(s => s.section))].sort();
    const sectionCells = sections.map(sec => {
      const secStu = clsStu.filter(s => s.section === sec);
      const secRecs = records.filter(r => r.class === cls && r.section === sec);
      let sp = 0, swd = 0;
      secStu.forEach(s => secRecs.forEach(r => { sp += presentCount(r, s.id); swd += r.workingDays; }));
      const spc = pct(sp, swd);
      const sc = spc >= 85 ? "#16a34a" : spc >= 75 ? "#b45309" : "#dc2626";
      return `<span style="font-size:9px;margin-right:8px;color:${sc};">§${sec}: <strong>${spc}%</strong></span>`;
    }).join("");

    return `
      <tr style="background:${bg};">
        <td style="text-align:center;">
          <span style="background:${school.primaryColor}20;color:${school.primaryColor};font-weight:800;padding:3px 8px;border-radius:6px;">${cls}</span>
        </td>
        <td style="text-align:center;font-weight:700;">${clsStu.length}</td>
        <td style="text-align:center;font-weight:800;color:#16a34a;">${regular}</td>
        <td style="text-align:center;font-weight:800;color:#dc2626;">${irregular}</td>
        <td style="text-align:center;font-weight:900;font-size:14px;color:${pctColor};">${avgPct}%</td>
        <td style="text-align:center;font-weight:700;color:#1e40af;">${tp}</td>
        <td>${sectionCells}</td>
      </tr>`;
  }).join("");

  const overallPct = pct(totalPresent, totalPossible);
  const overallColor = overallPct >= 85 ? "#16a34a" : overallPct >= 75 ? "#b45309" : "#dc2626";

  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1.0"/>
<title>Annual Attendance Summary – ${school.nameLine1} ${school.nameLine2}</title>
<style>
  @page { size: A4 portrait; margin: 12mm 10mm; }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: 'Segoe UI', Arial, sans-serif; font-size: 12px; color: #1e293b; background: #fff; }
  .header { background: linear-gradient(135deg, ${school.primaryColor}, #1a3aaa); padding: 18px 22px; display: flex; justify-content: space-between; align-items: center; border-radius: 10px; margin-bottom: 18px; }
  .school-name { color: #fff; }
  .school-name h1 { font-size: 22px; font-weight: 900; letter-spacing: 1.5px; }
  .school-name h2 { font-size: 16px; font-weight: 800; letter-spacing: 1px; margin-top: 3px; }
  .school-name p { font-size: 11px; color: rgba(255,255,255,0.7); letter-spacing: 2px; text-transform: uppercase; margin-top: 4px; }
  .report-meta { text-align: right; color: rgba(255,255,255,0.9); }
  .report-meta h3 { font-size: 14px; font-weight: 900; }
  .report-meta p { font-size: 10px; margin-top: 4px; opacity: 0.8; }
  .summary-bar { display: flex; gap: 14px; margin-bottom: 18px; }
  .stat-box { flex: 1; border-radius: 10px; padding: 14px; text-align: center; border-left: 4px solid; }
  .stat-box .val { font-size: 28px; font-weight: 900; }
  .stat-box .lbl { font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; margin-top: 3px; color: #64748b; }
  table { width: 100%; border-collapse: collapse; font-size: 12px; }
  thead tr { background: ${school.primaryColor}; color: white; }
  thead th { padding: 10px 8px; text-align: center; font-weight: 700; font-size: 11px; }
  thead th:last-child { text-align: left; }
  tbody td { padding: 10px 8px; border-bottom: 1px solid #f1f5f9; }
  .total-row { background: #f0f9ff !important; border-top: 3px solid ${school.primaryColor}; }
  .total-row td { font-weight: 900; font-size: 13px; color: #1e40af; padding: 12px 8px; }
  .footer { margin-top: 18px; display: flex; justify-content: space-between; font-size: 10px; color: #94a3b8; border-top: 1px solid #e2e8f0; padding-top: 10px; }
  .progress-outer { background: #e2e8f0; border-radius: 8px; height: 8px; margin-top: 12px; overflow: hidden; }
  .progress-inner { height: 8px; border-radius: 8px; background: linear-gradient(90deg, ${school.accentColor}, ${school.primaryColor}); }
</style>
</head>
<body>
  <div class="header">
    <div class="school-name">
      <h1>${school.nameLine1}</h1>
      <h2>${school.nameLine2}</h2>
      <p>${school.location}</p>
    </div>
    <div class="report-meta">
      <h3>ANNUAL ATTENDANCE SUMMARY</h3>
      <p>Academic Year ${school.academicYear}</p>
      <p>All Classes · Full Year</p>
      <p style="margin-top:8px;font-size:9px;opacity:0.6;">Generated: ${generated}</p>
    </div>
  </div>

  <div class="summary-bar">
    <div class="stat-box" style="background:#eff6ff;border-color:#3b82f6;">
      <div class="val" style="color:#1e40af;">${totalEnrolled}</div>
      <div class="lbl">Total Enrolled</div>
    </div>
    <div class="stat-box" style="background:#f0fdf4;border-color:#16a34a;">
      <div class="val" style="color:#16a34a;">${overallPct}%</div>
      <div class="lbl">Overall Average</div>
    </div>
    <div class="stat-box" style="background:#f5f3ff;border-color:#8b5cf6;">
      <div class="val" style="color:#7c3aed;">${totalRegular}</div>
      <div class="lbl">Regular (≥75%)</div>
    </div>
    <div class="stat-box" style="background:#fef2f2;border-color:#ef4444;">
      <div class="val" style="color:#dc2626;">${totalEnrolled - totalRegular}</div>
      <div class="lbl">Irregular (&lt;75%)</div>
    </div>
  </div>

  <div class="progress-outer">
    <div class="progress-inner" style="width:${overallPct}%;"></div>
  </div>
  <p style="text-align:center;font-size:10px;color:#64748b;margin:6px 0 18px;">School Attendance Rate: <strong style="color:${overallColor};">${overallPct}%</strong></p>

  <table>
    <thead>
      <tr>
        <th style="width:60px;">Class</th>
        <th>Enrolled</th>
        <th style="color:#a7f3d0;">Regular</th>
        <th style="color:#fca5a5;">Irregular</th>
        <th>Avg %</th>
        <th>Total Present</th>
        <th style="text-align:left;">Section Breakdown</th>
      </tr>
    </thead>
    <tbody>
      ${classRows}
      <tr class="total-row">
        <td style="text-align:center;">TOTAL</td>
        <td style="text-align:center;">${totalEnrolled}</td>
        <td style="text-align:center;color:#16a34a;">${totalRegular}</td>
        <td style="text-align:center;color:#dc2626;">${totalEnrolled - totalRegular}</td>
        <td style="text-align:center;color:${overallColor};font-size:16px;">${overallPct}%</td>
        <td style="text-align:center;">${totalPresent}</td>
        <td></td>
      </tr>
    </tbody>
  </table>

  <div class="footer">
    <span>Attendance report generated for AY ${school.academicYear} · All data from PAVAN Attendance App</span>
    <span>${school.nameLine1} ${school.nameLine2}, ${school.location} &nbsp;·&nbsp; Made by ${school.madeBy}</span>
  </div>
</body>
</html>`;
}
