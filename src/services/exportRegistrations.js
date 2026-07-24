import * as XLSX from 'xlsx';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../firebase/config';

const PAYMENT_LABELS = {
  not_required: 'Free event',
  pending_proof: 'Awaiting proof',
  pending_review: 'Needs review',
  approved: 'Paid',
  rejected: 'Rejected'
};

/**
 * Builds and downloads an .xlsx of everyone registered for one event.
 *
 * Solo rows: Name, Roll No, Phone (looked up from the student's own
 * profile — registrations don't store a phone number directly), Payment.
 *
 * Team rows: one row PER MEMBER (never all names crammed into one
 * cell) — the Team Name and Payment cells are vertically merged across
 * a team's member rows, so the team reads as one visual group without
 * repeating the same text on every line. No Phone column for team
 * members: they're typed names, not linked accounts, so no number was
 * ever collected for them.
 */
export async function exportRegistrationsToExcel(event, registrations) {
  const soloRegs = registrations.filter((r) => !r.isTeam);
  const teamRegs = registrations.filter((r) => r.isTeam);

  const rows = [['Type', 'Team name', 'Name', 'Roll number', 'Phone', 'Payment status']];
  const merges = [];

  // Solo section — phone looked up per registrant.
  for (const r of soloRegs) {
    let phone = '';
    if (r.studentUid) {
      try {
        const snap = await getDoc(doc(db, 'students', r.studentUid));
        phone = snap.exists() ? (snap.data().contact || '') : '';
      } catch { /* best-effort — leave blank if the lookup fails */ }
    }
    rows.push(['Solo', '', r.studentName || '', r.rollNo || '', phone, PAYMENT_LABELS[r.paymentStatus] || '']);
  }

  // Team section — one row per member, Team name + Payment merged down.
  for (const r of teamRegs) {
    const members = r.members?.length ? r.members : [{ name: '(no members listed)', rollNo: '' }];
    const startRow = rows.length; // 0-indexed data row about to be added
    members.forEach((m, i) => {
      rows.push(['Team', i === 0 ? (r.teamName || '') : '', m.name || '', m.rollNo || '', '', i === 0 ? (PAYMENT_LABELS[r.paymentStatus] || '') : '']);
    });
    if (members.length > 1) {
      const first = startRow, last = startRow + members.length - 1;
      merges.push({ s: { r: first, c: 1 }, e: { r: last, c: 1 } }); // Team name column
      merges.push({ s: { r: first, c: 5 }, e: { r: last, c: 5 } }); // Payment status column
    }
  }

  const ws = XLSX.utils.aoa_to_sheet(rows);
  ws['!merges'] = merges;
  ws['!cols'] = [{ wch: 8 }, { wch: 20 }, { wch: 22 }, { wch: 14 }, { wch: 14 }, { wch: 16 }];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Registrations');

  const safeTitle = (event.title || 'event').replace(/[^a-z0-9]+/gi, '_').slice(0, 40);
  XLSX.writeFile(wb, `${safeTitle}_registrations.xlsx`);
}
