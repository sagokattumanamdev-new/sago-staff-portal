// ============================================================
// REPORTS & DATA EXPORT ENGINE (Admin & Super Admin)
// Generates professional, printable A4 PDF reports & CSV exports
// ============================================================
import { DB } from './db/adapter.js?v=050';
import { CONFIG } from './config.js?v=050';
import { esc, icon, toast, openSheet, todayKey, fmtDateKey, roleLabel, statusPill, prioPill } from './ui.js?v=050';

export async function openExportModal(root, user, defaultReport = 'master') {
  const [people, staff, tasks, historyData, attPack] = await Promise.all([
    DB.allPeople(),
    DB.listStaff(),
    DB.listTasks(user),
    DB.historyFor(user),
    DB.allAttendance(30)
  ]);

  const modalHTML = `
    <div class="report-modal">
      <div class="report-header">
        <div class="report-header-icon">${icon('pdf')}</div>
        <div class="grow">
          <h3 style="margin:0;font-size:18px">Export Data & PDF Reports</h3>
          <div class="muted small">Generate official company PDF reports or download raw CSV</div>
        </div>
      </div>

      <div class="field">
        <label>REPORT TYPE</label>
        <select class="inp" id="rep-type">
          <option value="master" ${defaultReport === 'master' ? 'selected' : ''}>📊 Master Company Report (All-in-One)</option>
          <option value="attendance" ${defaultReport === 'attendance' ? 'selected' : ''}>☀ Attendance Register & Summary</option>
          <option value="tasks" ${defaultReport === 'tasks' ? 'selected' : ''}>📋 Tasks & Project Execution Report</option>
          <option value="staff" ${defaultReport === 'staff' ? 'selected' : ''}>👥 Staff Directory & Team Roster</option>
          <option value="history" ${defaultReport === 'history' ? 'selected' : ''}>📜 Company Audit & History Log</option>
        </select>
      </div>

      <div class="field-grid" style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-top:10px">
        <div class="field" style="margin-top:0">
          <label>DEPARTMENT</label>
          <select class="inp" id="rep-dept">
            <option value="all">All Departments</option>
            ${CONFIG.departments.map(d => `<option value="${esc(d)}">${esc(d)}</option>`).join('')}
          </select>
        </div>
        <div class="field" style="margin-top:0">
          <label>TIME RANGE</label>
          <select class="inp" id="rep-range">
            <option value="today">Today (${todayKey()})</option>
            <option value="7days" selected>Last 7 Days</option>
            <option value="30days">Last 30 Days</option>
            <option value="all">All Available Records</option>
          </select>
        </div>
      </div>

      <div class="section-title" style="margin-top:14px">Options</div>
      <label class="check-label" style="display:flex;align-items:center;gap:8px;font-size:13px;cursor:pointer">
        <input type="checkbox" id="rep-replies" checked style="accent-color:var(--green);width:16px;height:16px" />
        <span>Include task replies & proof verification details</span>
      </label>

      <div class="report-actions" style="display:flex;gap:10px;margin-top:18px;flex-wrap:wrap">
        <button class="btn btn-primary" id="btn-pdf" style="flex:2">
          ${icon('pdf')} Generate & Print PDF
        </button>
        <button class="btn btn-ghost" id="btn-csv" style="flex:1">
          ${icon('download')} Export CSV
        </button>
        <button class="btn-ghost" id="btn-preview" style="flex:1">
          ${icon('table')} Preview
        </button>
      </div>
      <div style="text-align:center;margin-top:10px">
        <button class="btn-ghost btn-sm" id="btn-close" style="width:auto;border:none;color:var(--muted)">Close</button>
      </div>
    </div>
  `;

  const sheet = openSheet(modalHTML);

  const getFilters = () => ({
    type: sheet.el.querySelector('#rep-type').value,
    dept: sheet.el.querySelector('#rep-dept').value,
    range: sheet.el.querySelector('#rep-range').value,
    includeReplies: sheet.el.querySelector('#rep-replies').checked
  });

  sheet.el.querySelector('#btn-pdf').onclick = () => {
    const filters = getFilters();
    generatePDFReport({ people, staff, tasks, historyData, attPack, user, filters });
  };

  sheet.el.querySelector('#btn-csv').onclick = () => {
    const filters = getFilters();
    exportCSVReport({ people, staff, tasks, historyData, attPack, user, filters });
  };

  sheet.el.querySelector('#btn-preview').onclick = () => {
    const filters = getFilters();
    previewReportModal({ people, staff, tasks, historyData, attPack, user, filters });
  };

  sheet.el.querySelector('#btn-close').onclick = sheet.close;
}

// -------------------------------------------------------------
// FILTERING DATA HELPER
// -------------------------------------------------------------
function filterDataset({ people, staff, tasks, historyData, attPack, filters }) {
  let filteredPeople = people;
  let filteredStaff = staff;
  let filteredTasks = tasks;

  if (filters.dept !== 'all') {
    filteredPeople = people.filter(p => p.dept === filters.dept || p.dept === 'Both' || p.dept === 'All');
    filteredStaff = staff.filter(s => s.dept === filters.dept || s.dept === 'Both' || s.dept === 'All');
    filteredTasks = tasks.filter(t => t.dept === filters.dept);
  }

  // Days range filter for attendance
  let daysCount = 7;
  if (filters.range === 'today') daysCount = 1;
  else if (filters.range === '30days' || filters.range === 'all') daysCount = 30;

  const dates = (attPack.dates || []).slice(0, daysCount);

  return {
    people: filteredPeople,
    staff: filteredStaff,
    tasks: filteredTasks,
    historyData,
    dates,
    attendance: attPack.attendance || {}
  };
}

// -------------------------------------------------------------
// PDF REPORT GENERATION & PRINT VIEW
// -------------------------------------------------------------
export function generatePDFReport(ctx) {
  const { user, filters } = ctx;
  const filtered = filterDataset(ctx);
  const nowStr = new Date().toLocaleString('en-IN', {
    dateStyle: 'full',
    timeStyle: 'medium'
  });

  const reportTitle = {
    master: 'MASTER COMPANY EXECUTIVE REPORT',
    attendance: 'ATTENDANCE REGISTER & WORKFORCE SUMMARY',
    tasks: 'PROJECT & TASK EXECUTION REPORT',
    staff: 'STAFF DIRECTORY & ORGANIZATION ROSTER',
    history: 'COMPANY AUDIT TRAIL & EVENT LOG'
  }[filters.type] || 'COMPANY REPORT';

  const dateRangeLabel = {
    today: `Today (${todayKey()})`,
    '7days': `Last 7 Days (up to ${todayKey()})`,
    '30days': `Last 30 Days (up to ${todayKey()})`,
    all: `Complete Records (up to ${todayKey()})`
  }[filters.range];

  // Build the HTML for the print window
  const printContent = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="utf-8" />
      <title>${esc(CONFIG.company)} - ${esc(reportTitle)}</title>
      <style>
        @page {
          size: A4 portrait;
          margin: 12mm 15mm;
        }
        * { box-sizing: border-box; }
        body {
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
          color: #111827;
          background: #fff;
          margin: 0;
          padding: 0;
          font-size: 11pt;
          line-height: 1.4;
        }
        .header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          border-bottom: 3px solid #00A878;
          padding-bottom: 12px;
          margin-bottom: 16px;
        }
        .brand-info {
          display: flex;
          align-items: center;
          gap: 12px;
        }
        .brand-logo {
          width: 52px;
          height: 52px;
          border-radius: 10px;
          object-fit: contain;
        }
        .company-name {
          font-size: 18pt;
          font-weight: 800;
          color: #006B4D;
          letter-spacing: -0.5px;
          margin: 0;
          line-height: 1.1;
        }
        .company-tagline {
          font-size: 9.5pt;
          color: #4B5563;
          margin-top: 2px;
          font-style: italic;
        }
        .meta-box {
          text-align: right;
          font-size: 8.5pt;
          color: #4B5563;
          line-height: 1.35;
        }
        .report-badge {
          display: inline-block;
          background: #E7F7F1;
          color: #006B4D;
          font-weight: 700;
          padding: 3px 10px;
          border-radius: 6px;
          font-size: 9pt;
          margin-bottom: 4px;
          text-transform: uppercase;
          border: 1px solid #C7EDE0;
        }
        .report-title-bar {
          background: #F3F7F5;
          border-left: 4px solid #00A878;
          padding: 10px 14px;
          margin-bottom: 18px;
          border-radius: 0 6px 6px 0;
        }
        .report-title-bar h2 {
          margin: 0;
          font-size: 13pt;
          color: #0F2A21;
          font-weight: 800;
          letter-spacing: 0.3px;
        }
        .report-title-bar .subtitle {
          font-size: 9pt;
          color: #5F7268;
          margin-top: 3px;
        }
        .stats-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 10px;
          margin-bottom: 20px;
        }
        .stat-card {
          border: 1px solid #E5E7EB;
          border-radius: 8px;
          padding: 10px 12px;
          background: #FAFAFA;
        }
        .stat-val {
          font-size: 16pt;
          font-weight: 800;
          color: #006B4D;
        }
        .stat-lbl {
          font-size: 8pt;
          color: #6B7280;
          text-transform: uppercase;
          font-weight: 600;
          margin-top: 2px;
        }
        .sec-title {
          font-size: 10.5pt;
          font-weight: 800;
          color: #1F2937;
          border-bottom: 1.5px solid #E5E7EB;
          padding-bottom: 4px;
          margin: 18px 0 10px;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          display: flex;
          justify-content: space-between;
        }
        table {
          width: 100%;
          border-collapse: collapse;
          margin-bottom: 16px;
          font-size: 9pt;
        }
        th, td {
          padding: 6px 8px;
          border: 1px solid #E5E7EB;
          text-align: left;
        }
        th {
          background-color: #F3F4F6;
          color: #374151;
          font-weight: 700;
          text-transform: uppercase;
          font-size: 8pt;
          letter-spacing: 0.3px;
        }
        tr:nth-child(even) {
          background-color: #F9FAFB;
        }
        .badge {
          display: inline-block;
          padding: 2px 6px;
          border-radius: 4px;
          font-size: 7.5pt;
          font-weight: 700;
          text-transform: uppercase;
        }
        .badge-present { background: #DCFCE7; color: #166534; }
        .badge-absent { background: #FEE2E2; color: #991B1B; }
        .badge-done { background: #DCFCE7; color: #166534; }
        .badge-prog { background: #FEF3C7; color: #92400E; }
        .badge-assigned { background: #F3F4F6; color: #4B5563; }
        .badge-urgent { background: #FEE2E2; color: #B91C1C; font-weight: 800; }
        .badge-admin { background: #E7F7F1; color: #006B4D; }
        .badge-mgr { background: #E0E7FF; color: #3730A3; }
        .badge-emp { background: #F3F4F6; color: #4B5563; }
        .task-reply {
          background: #F9FAFB;
          border-left: 3px solid #00A878;
          padding: 6px 10px;
          margin: 4px 0 8px 12px;
          font-size: 8.5pt;
          border-radius: 0 4px 4px 0;
        }
        .task-reply-meta {
          font-weight: 700;
          color: #374151;
          font-size: 8pt;
        }
        .footer-sign {
          margin-top: 36px;
          padding-top: 14px;
          border-top: 1px solid #D1D5DB;
          display: flex;
          justify-content: space-between;
          font-size: 8.5pt;
          color: #4B5563;
          page-break-inside: avoid;
        }
        .sign-box {
          text-align: center;
          width: 180px;
        }
        .sign-line {
          border-bottom: 1px solid #9CA3AF;
          margin-bottom: 6px;
          height: 35px;
        }
        .no-print-bar {
          background: #0F2A21;
          color: #fff;
          padding: 10px 18px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          position: sticky;
          top: 0;
          z-index: 999;
          box-shadow: 0 2px 10px rgba(0,0,0,0.2);
        }
        .print-btn {
          background: #00A878;
          color: #fff;
          border: none;
          padding: 8px 18px;
          border-radius: 6px;
          font-weight: 700;
          font-size: 13px;
          cursor: pointer;
        }
        .print-btn:hover { background: #00855F; }
        @media print {
          .no-print-bar { display: none !important; }
          body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          .page-break { page-break-before: always; }
        }
      </style>
    </head>
    <body>
      <div class="no-print-bar">
        <div>
          <b>SaGo Official Report Preview</b> &mdash; Select "Save as PDF" in your print destination.
        </div>
        <div style="display:flex;gap:8px">
          <button class="print-btn" onclick="window.print()">🖨️ Print / Save as PDF</button>
          <button class="print-btn" style="background:#4B5563" onclick="window.close()">Close Window</button>
        </div>
      </div>

      <div style="padding: 18px 24px;">
        <!-- HEADER -->
        <div class="header">
          <div class="brand-info">
            <img class="brand-logo" src="./assets/logo-hd.png" alt="SaGo" />
            <div>
              <div class="company-name">${esc(CONFIG.company)}</div>
              <div class="company-tagline">${esc(CONFIG.tagline)}</div>
            </div>
          </div>
          <div class="meta-box">
            <div class="report-badge">Official Staff Portal Report</div>
            <div><b>Generated on:</b> ${nowStr}</div>
            <div><b>Generated by:</b> ${esc(user.name)} (${esc(roleLabel(user.role))})</div>
            <div><b>Scope:</b> ${filters.dept === 'all' ? 'All Departments' : esc(filters.dept)} · ${esc(dateRangeLabel)}</div>
          </div>
        </div>

        <!-- TITLE BAR -->
        <div class="report-title-bar">
          <h2>${esc(reportTitle)}</h2>
          <div class="subtitle">Confidential &bull; SaGo Management Information System</div>
        </div>

        <!-- STATS OVERVIEW -->
        <div class="stats-grid">
          <div class="stat-card">
            <div class="stat-val">${filtered.people.length}</div>
            <div class="stat-lbl">Total Team Members</div>
          </div>
          <div class="stat-card">
            <div class="stat-val">${filtered.tasks.filter(t => t.status !== 'done').length}</div>
            <div class="stat-lbl">Active / Open Tasks</div>
          </div>
          <div class="stat-card">
            <div class="stat-val">${filtered.tasks.filter(t => t.status === 'done').length}</div>
            <div class="stat-lbl">Verified Completed</div>
          </div>
          <div class="stat-card">
            <div class="stat-val">${calculateTodayAttendance(filtered)}</div>
            <div class="stat-lbl">Today's Present Staff</div>
          </div>
        </div>

        ${renderReportSections(filters.type, filtered, filters)}

        <!-- SIGNATURE FOOTER -->
        <div class="footer-sign">
          <div class="sign-box">
            <div class="sign-line"></div>
            <div><b>Prepared By</b><br />${esc(user.name)}</div>
          </div>
          <div style="text-align:center;max-width:240px">
            <div style="color:#006B4D;font-weight:700">SaGo Staff Management Portal</div>
            <div style="font-size:7.5pt;color:#9CA3AF;margin-top:2px">Verified system-generated report. Valid for internal and audit records.</div>
          </div>
          <div class="sign-box">
            <div class="sign-line"></div>
            <div><b>Authorized Signatory</b><br />Management / Er. G. Sakthimohan</div>
          </div>
        </div>
      </div>
    </body>
    </html>
  `;

  const printWin = window.open('', '_blank');
  if (printWin) {
    printWin.document.open();
    printWin.document.write(printContent);
    printWin.document.close();
    toast('Report generated! Click "Print / Save as PDF"');
  } else {
    toast('Pop-up blocked! Please allow pop-ups in your browser settings.');
  }
}

function calculateTodayAttendance(filtered) {
  const today = todayKey();
  const dayAtt = filtered.attendance[today] || {};
  let present = 0;
  filtered.staff.forEach(s => {
    if (dayAtt[s.id]?.morning === 'present' || dayAtt[s.id]?.afternoon === 'present') {
      present++;
    }
  });
  return `${present}/${filtered.staff.length}`;
}

// -------------------------------------------------------------
// REPORT SECTIONS RENDERER (HTML)
// -------------------------------------------------------------
function renderReportSections(type, data, filters) {
  if (type === 'attendance') return renderAttendanceSection(data);
  if (type === 'tasks') return renderTasksSection(data, filters);
  if (type === 'staff') return renderStaffSection(data);
  if (type === 'history') return renderHistorySection(data);

  // Master Report contains all sections!
  return `
    ${renderStaffSection(data)}
    ${renderAttendanceSection(data)}
    ${renderTasksSection(data, filters)}
    ${renderHistorySection(data)}
  `;
}

function renderStaffSection(data) {
  return `
    <div class="sec-title">
      <span>1. Staff & Workforce Directory</span>
      <span style="font-size:8.5pt;font-weight:normal;color:#6B7280">${data.people.length} Members Registered</span>
    </div>
    <table>
      <thead>
        <tr>
          <th style="width:40px">#</th>
          <th>Name</th>
          <th>Role</th>
          <th>Department</th>
          <th>Contact Number</th>
          <th>System ID</th>
        </tr>
      </thead>
      <tbody>
        ${data.people.map((p, idx) => `
          <tr>
            <td>${idx + 1}</td>
            <td><b>${esc(p.name)}</b></td>
            <td><span class="badge badge-${p.role === 'admin' || p.role === 'superadmin' ? 'admin' : p.role === 'manager' ? 'mgr' : 'emp'}">${esc(roleLabel(p.role))}</span></td>
            <td>${esc(p.dept)}</td>
            <td>${p.phone ? `+91 ${esc(p.phone)}` : '—'}</td>
            <td style="font-family:monospace;font-size:8pt;color:#6B7280">${esc(p.id)}</td>
          </tr>
        `).join('')}
      </tbody>
    </table>
  `;
}

function renderAttendanceSection(data) {
  const { staff, dates, attendance } = data;
  return `
    <div class="sec-title">
      <span>2. Attendance Log & Summary</span>
      <span style="font-size:8.5pt;font-weight:normal;color:#6B7280">Last ${dates.length} Recorded Date(s)</span>
    </div>
    <table>
      <thead>
        <tr>
          <th>Staff Name</th>
          <th>Department</th>
          ${dates.map(d => `<th style="text-align:center">${esc(fmtDateKey(d))}<br /><span style="font-size:7pt;font-weight:normal">☀ M / ⛅ A</span></th>`).join('')}
          <th style="text-align:center">Present Days</th>
        </tr>
      </thead>
      <tbody>
        ${staff.map(s => {
          let presentCount = 0;
          const cells = dates.map(d => {
            const r = (attendance[d] || {})[s.id] || {};
            const m = r.morning === 'present' ? 'P' : r.morning === 'absent' ? 'A' : '—';
            const a = r.afternoon === 'present' ? 'P' : r.afternoon === 'absent' ? 'A' : '—';
            if (r.morning === 'present' || r.afternoon === 'present') presentCount++;
            return `<td style="text-align:center;font-size:8pt">
              <span class="badge ${m === 'P' ? 'badge-present' : m === 'A' ? 'badge-absent' : ''}">${m}</span>
              <span class="badge ${a === 'P' ? 'badge-present' : a === 'A' ? 'badge-absent' : ''}">${a}</span>
            </td>`;
          }).join('');

          return `
            <tr>
              <td><b>${esc(s.name)}</b></td>
              <td>${esc(s.dept)}</td>
              ${cells}
              <td style="text-align:center;font-weight:700;color:#006B4D">${presentCount}/${dates.length}</td>
            </tr>
          `;
        }).join('')}
      </tbody>
    </table>
  `;
}

function renderTasksSection(data, filters) {
  const { tasks, people } = data;
  const getName = id => (people.find(p => p.id === id)?.name) || '—';

  return `
    <div class="sec-title">
      <span>3. Task & Work Execution Summary</span>
      <span style="font-size:8.5pt;font-weight:normal;color:#6B7280">${tasks.length} Total Task(s)</span>
    </div>
    <table>
      <thead>
        <tr>
          <th style="width:40px">#</th>
          <th>Task Title</th>
          <th>Department</th>
          <th>Assigned To</th>
          <th>Assigned By</th>
          <th>Priority</th>
          <th>Status</th>
          <th>Due Date / Verification</th>
        </tr>
      </thead>
      <tbody>
        ${tasks.map((t, idx) => `
          <tr>
            <td>${idx + 1}</td>
            <td>
              <b>${esc(t.title)}</b>
              ${filters.includeReplies && t.replies?.length ? `
                <div style="margin-top:6px">
                  ${t.replies.map(r => `
                    <div class="task-reply">
                      <div class="task-reply-meta">💬 ${esc(r.name)}:</div>
                      <div>${esc(r.text || '')} ${r.photo ? '<i>[Photo Proof Attached]</i>' : ''}</div>
                    </div>
                  `).join('')}
                </div>
              ` : ''}
            </td>
            <td>${esc(t.dept)}</td>
            <td>${esc(getName(t.assignedTo))}</td>
            <td>${esc(getName(t.assignedBy))}</td>
            <td>
              <span class="badge ${t.priority === 'urgent' ? 'badge-urgent' : 'badge-assigned'}">
                ${t.priority === 'urgent' ? '🚩 URGENT' : 'Normal'}
              </span>
            </td>
            <td>
              <span class="badge ${t.status === 'done' ? 'badge-done' : t.status === 'in-progress' ? 'badge-prog' : 'badge-assigned'}">
                ${t.status === 'done' ? '✓ VERIFIED' : t.status === 'in-progress' ? 'IN PROGRESS' : 'ASSIGNED'}
              </span>
            </td>
            <td style="font-size:8pt">
              ${t.status === 'done' ? `<span style="color:#006B4D;font-weight:700">Verified by ${esc(getName(t.verifiedBy))}</span>` : t.due ? `Due: ${esc(t.due)}` : 'No deadline'}
            </td>
          </tr>
        `).join('')}
      </tbody>
    </table>
  `;
}

function renderHistorySection(data) {
  const { historyData } = data;
  return `
    <div class="sec-title">
      <span>4. Company Audit Trail & Activity Log</span>
      <span style="font-size:8.5pt;font-weight:normal;color:#6B7280">${historyData.length} Recent Event(s)</span>
    </div>
    <table>
      <thead>
        <tr>
          <th style="width:40px">#</th>
          <th>Timestamp</th>
          <th>Actor</th>
          <th>Event Description</th>
        </tr>
      </thead>
      <tbody>
        ${historyData.slice(0, 30).map((h, idx) => `
          <tr>
            <td>${idx + 1}</td>
            <td style="white-space:nowrap;font-size:8pt;color:#4B5563">${new Date(h.at).toLocaleString('en-IN')}</td>
            <td><b>${esc(h.actorName || 'System')}</b></td>
            <td>${esc(h.text)}</td>
          </tr>
        `).join('')}
      </tbody>
    </table>
  `;
}

// -------------------------------------------------------------
// CSV EXPORT HELPER
// -------------------------------------------------------------
export function exportCSVReport(ctx) {
  const { filters } = ctx;
  const filtered = filterDataset(ctx);
  let csvContent = '';
  let filename = `sago_${filters.type}_${todayKey()}.csv`;

  if (filters.type === 'staff') {
    csvContent = 'ID,Name,Role,Department,Phone\n' +
      filtered.people.map(p => `"${p.id}","${p.name}","${p.role}","${p.dept}","${p.phone || ''}"`).join('\n');
  } else if (filters.type === 'tasks') {
    const getName = id => (filtered.people.find(p => p.id === id)?.name) || '—';
    csvContent = 'ID,Title,Department,AssignedTo,AssignedBy,Priority,Status,Due,VerifiedBy,CreatedDate\n' +
      filtered.tasks.map(t =>
        `"${t.id}","${t.title.replace(/"/g, '""')}","${t.dept}","${getName(t.assignedTo)}","${getName(t.assignedBy)}","${t.priority}","${t.status}","${t.due || ''}","${getName(t.verifiedBy)}","${t.createdAt || ''}"`
      ).join('\n');
  } else if (filters.type === 'attendance') {
    const header = ['Staff ID', 'Staff Name', 'Department', ...filtered.dates.map(d => `${d} (M)`), ...filtered.dates.map(d => `${d} (A)`)];
    csvContent = header.join(',') + '\n';
    csvContent += filtered.staff.map(s => {
      const row = [
        `"${s.id}"`,
        `"${s.name}"`,
        `"${s.dept}"`,
        ...filtered.dates.map(d => `"${(filtered.attendance[d] || {})[s.id]?.morning || 'none'}"`),
        ...filtered.dates.map(d => `"${(filtered.attendance[d] || {})[s.id]?.afternoon || 'none'}"`)
      ];
      return row.join(',');
    }).join('\n');
  } else if (filters.type === 'history') {
    csvContent = 'ID,Timestamp,ActorName,Event\n' +
      filtered.historyData.map(h => `"${h.id}","${h.at}","${h.actorName || ''}","${h.text.replace(/"/g, '""')}"`).join('\n');
  } else {
    // Master CSV
    const getName = id => (filtered.people.find(p => p.id === id)?.name) || '—';
    csvContent = `=== SAGO STAFF MASTER EXPORT (${todayKey()}) ===\n\n` +
      `[STAFF DIRECTORY]\n` +
      'ID,Name,Role,Department,Phone\n' +
      filtered.people.map(p => `"${p.id}","${p.name}","${p.role}","${p.dept}","${p.phone || ''}"`).join('\n') +
      `\n\n[TASKS]\n` +
      'Title,Department,AssignedTo,Status,Priority,Due\n' +
      filtered.tasks.map(t => `"${t.title.replace(/"/g, '""')}","${t.dept}","${getName(t.assignedTo)}","${t.status}","${t.priority}","${t.due || ''}"`).join('\n') +
      `\n\n[AUDIT LOG]\n` +
      'Timestamp,Actor,Action\n' +
      filtered.historyData.map(h => `"${h.at}","${h.actorName || ''}","${h.text.replace(/"/g, '""')}"`).join('\n');
  }

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  toast(`CSV exported: ${filename} 📥`);
}

// -------------------------------------------------------------
// LIVE PREVIEW MODAL
// -------------------------------------------------------------
function previewReportModal(ctx) {
  const filtered = filterDataset(ctx);
  const sectionsHTML = renderReportSections(ctx.filters.type, filtered, ctx.filters);

  const previewSheet = openSheet(`
    <div style="max-height:80vh;overflow-y:auto;padding-right:4px">
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:12px;border-bottom:1px solid var(--line);padding-bottom:10px">
        <h3 style="margin:0">📄 Report Preview (${esc(ctx.filters.type.toUpperCase())})</h3>
        <button class="btn btn-primary btn-sm" id="prev-print-btn" style="width:auto">🖨️ Generate PDF</button>
      </div>
      <div style="font-size:12px;line-height:1.4">
        ${sectionsHTML}
      </div>
      <div style="margin-top:16px;text-align:right">
        <button class="btn-ghost btn-sm" id="prev-close">Close Preview</button>
      </div>
    </div>
  `);

  previewSheet.el.querySelector('#prev-print-btn').onclick = () => {
    previewSheet.close();
    generatePDFReport(ctx);
  };
  previewSheet.el.querySelector('#prev-close').onclick = previewSheet.close;
}
