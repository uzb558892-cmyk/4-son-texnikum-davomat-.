/**
 * DEMO REJIM: bu fayl backendni SIMULYATSIYA qiladi.
 * Haqiqiy Supabase ulanganda ishlatilmaydi. Barcha hisob-kitoblar (jumladan 72 soat)
 * haqiqiy rejimda backenddan keladi.
 */
import type {
  AttendanceRecord, DashboardStats, Group, NewUserInput, Profile, ReportQuery, ReportRow, Student, StudentWarning
} from '../types';
import { toISODate, todayISO } from '../utils/format';

const PARA_HOURS = 2;
const THRESHOLD = 72;

const MALE = ['Aziz', 'Bekzod', 'Jasur', 'Sardor', 'Dilshod', 'Otabek', 'Shoxrux', 'Eldor', 'Jahongir', 'Sherzod', 'Umid', 'Farhod'];
const FEMALE = ['Madina', 'Nilufar', 'Zilola', 'Malika', 'Sevara', 'Dildora', 'Gulnora', 'Shahzoda', 'Kamola', 'Muhayyo', 'Nodira', 'Feruza'];
const LAST = ['Karimov', 'Rahimov', 'Tursunov', 'Yusupov', 'Abdullayev', 'Ismoilov', 'Hasanov', 'Saidov', 'Nazarov', 'Qodirov', 'Ergashev', 'Mirzayev'];

let seed = 42;
const rnd = () => {
  seed = (seed * 1664525 + 1013904223) % 4294967296;
  return seed / 4294967296;
};
const uid = () => 'demo-' + Math.random().toString(36).slice(2, 10);

const groups: Group[] = [
  { id: 'g1', name: 'IT-21', course: 3, leader_id: 'u2', leader_name: 'Nodira Qodirova' },
  { id: 'g2', name: 'AT-22', course: 2, leader_id: 'u3', leader_name: 'Rustam Aliyev' },
  { id: 'g3', name: 'EL-23', course: 1, leader_id: null, leader_name: null },
  { id: 'g4', name: 'MX-24', course: 1, leader_id: null, leader_name: null }
];

const profiles: Profile[] = [
  { id: 'u1', full_name: 'Demo Administrator', email: 'admin@demo.uz', role: 'admin', group_id: null, is_active: true },
  { id: 'u2', full_name: 'Nodira Qodirova', email: 'rahbar@demo.uz', role: 'group_leader', group_id: 'g1', is_active: true },
  { id: 'u3', full_name: 'Rustam Aliyev', email: 'rustam@demo.uz', role: 'group_leader', group_id: 'g2', is_active: true }
];

const students: Student[] = [];
let n = 0;
groups.forEach((g) => {
  for (let i = 0; i < 6; i++, n++) {
    const female = n % 2 === 1;
    const first = (female ? FEMALE : MALE)[n % 12];
    const last = LAST[(n * 5) % 12] + (female ? 'a' : '');
    students.push({
      id: 's' + (n + 1), full_name: `${last} ${first}`, group_id: g.id, group_name: g.name,
      phone: `+998 90 ${100 + n * 7} ${10 + n} ${20 + n}`, parent_phone: `+998 91 ${200 + n * 3} ${30 + n} ${40 + n}`, is_active: true
    });
  }
});

const records: AttendanceRecord[] = [];
const HEAVY = new Set(['s3', 's10', 's16']);
(function seedRecords() {
  const today = new Date();
  for (let back = 0; back < 20; back++) {
    const d = new Date(today);
    d.setDate(today.getDate() - back);
    if (back > 0 && d.getDay() === 0) continue;
    const date = toISODate(d);
    for (const s of students) {
      for (let lesson = 1; lesson <= 3; lesson++) {
        if (back === 0 && lesson > 2) continue;
        const r = rnd();
        let status: AttendanceRecord['status'] = 'present';
        let skip: AttendanceRecord['skip_after'] = null;
        if (HEAVY.has(s.id)) status = r < 0.8 ? 'unexcused' : 'present';
        else if (r > 0.97) { status = 'skipped'; skip = (1 + Math.floor(rnd() * 3)) as 1 | 2 | 3; }
        else if (r > 0.94) status = 'unexcused';
        else if (r > 0.9) status = 'excused';
        records.push({ student_id: s.id, group_id: s.group_id, date, lesson, status, skip_after: skip });
      }
    }
  }
})();

function range(period: ReportQuery['period'], date: string): [string, string] {
  const d = new Date(date + 'T00:00:00');
  if (period === 'daily') return [date, date];
  if (period === 'weekly') {
    const day = (d.getDay() + 6) % 7;
    const a = new Date(d); a.setDate(d.getDate() - day);
    const b = new Date(a); b.setDate(a.getDate() + 6);
    return [toISODate(a), toISODate(b)];
  }
  if (period === 'monthly') return [toISODate(new Date(d.getFullYear(), d.getMonth(), 1)), toISODate(new Date(d.getFullYear(), d.getMonth() + 1, 0))];
  return [`${d.getFullYear()}-01-01`, `${d.getFullYear()}-12-31`];
}

const delay = <T,>(v: T): Promise<T> => new Promise((r) => setTimeout(() => r(structuredClone(v)), 150));
const withCounts = (): Group[] => groups.map((g) => ({ ...g, student_count: students.filter((s) => s.group_id === g.id).length }));

export const demoApi = {
  profile: (id: string) => profiles.find((p) => p.id === id) ?? null,
  groups: () => delay(withCounts()),
  saveGroup: (g: Partial<Group> & { name: string; course: number }) => {
    if (g.id) Object.assign(groups.find((x) => x.id === g.id)!, g);
    else groups.push({ id: uid(), name: g.name, course: g.course, leader_id: g.leader_id ?? null, leader_name: null });
    groups.forEach((x) => (x.leader_name = profiles.find((p) => p.id === x.leader_id)?.full_name ?? null));
    return delay(true);
  },
  removeGroup: (id: string) => { const i = groups.findIndex((g) => g.id === id); if (i >= 0) groups.splice(i, 1); return delay(true); },
  students: (groupId?: string) => delay(students.filter((s) => !groupId || s.group_id === groupId)),
  saveStudent: (s: Partial<Student> & { full_name: string; group_id: string }) => {
    const gname = groups.find((g) => g.id === s.group_id)?.name;
    if (s.id) Object.assign(students.find((x) => x.id === s.id)!, s, { group_name: gname });
    else students.push({ id: uid(), full_name: s.full_name, group_id: s.group_id, group_name: gname, phone: s.phone ?? null, parent_phone: s.parent_phone ?? null, is_active: true });
    return delay(true);
  },
  removeStudent: (id: string) => { const i = students.findIndex((s) => s.id === id); if (i >= 0) students.splice(i, 1); return delay(true); },
  attendance: (groupId: string, date: string, lesson: number) =>
    delay(records.filter((r) => r.group_id === groupId && r.date === date && r.lesson === lesson)),
  saveAttendance: (rows: AttendanceRecord[]) => {
    rows.forEach((row) => {
      const i = records.findIndex((r) => r.student_id === row.student_id && r.date === row.date && r.lesson === row.lesson);
      if (i >= 0) records[i] = row; else records.push(row);
    });
    return delay(true);
  },
  warnings: (groupId?: string): Promise<StudentWarning[]> => {
    const out: StudentWarning[] = [];
    for (const s of students) {
      if (groupId && s.group_id !== groupId) continue;
      const bad = records.filter((r) => r.student_id === s.id && (r.status === 'unexcused' || r.status === 'skipped'));
      const hours = bad.length * PARA_HOURS;
      if (hours <= THRESHOLD) continue;
      const sorted = [...bad].sort((a, b) => b.date.localeCompare(a.date));
      out.push({
        student_id: s.id, student_name: s.full_name, group_id: s.group_id, group_name: s.group_name ?? '',
        phone: s.phone, parent_phone: s.parent_phone, unexcused_hours: hours, threshold_hours: THRESHOLD,
        last_absence_date: sorted[0]?.date ?? null,
        absences: sorted.slice(0, 30).map((r) => ({ date: r.date, lesson: r.lesson, status: r.status }))
      });
    }
    return delay(out.sort((a, b) => b.unexcused_hours - a.unexcused_hours));
  },
  report: (q: ReportQuery): Promise<ReportRow[]> => {
    const [from, to] = range(q.period, q.date);
    const recs = records.filter((r) => r.date >= from && r.date <= to && (!q.groupId || r.group_id === q.groupId));
    const keys = q.groupBy === 'group'
      ? groups.filter((g) => !q.groupId || g.id === q.groupId).map((g) => ({ key: g.id, label: g.name, sub: undefined as string | undefined }))
      : students.filter((s) => !q.groupId || s.group_id === q.groupId).map((s) => ({ key: s.id, label: s.full_name, sub: s.group_name }));
    const rows = keys.map((k) => {
      const mine = recs.filter((r) => (q.groupBy === 'group' ? r.group_id : r.student_id) === k.key);
      const c = (st: string) => mine.filter((r) => r.status === st).length;
      return {
        ...k, present: c('present'), excused: c('excused'), unexcused: c('unexcused'), skipped: c('skipped'),
        excused_hours: c('excused') * PARA_HOURS, unexcused_hours: (c('unexcused') + c('skipped')) * PARA_HOURS
      };
    });
    return delay(rows);
  },
  dashboard: async (groupId?: string): Promise<DashboardStats> => {
    const today = todayISO();
    const gs = groups.filter((g) => !groupId || g.id === groupId);
    const ss = students.filter((s) => !groupId || s.group_id === groupId);
    const rec = records.filter((r) => r.date === today && (!groupId || r.group_id === groupId));
    const c = (st: string) => rec.filter((r) => r.status === st).length;
    const warnings = (await demoApi.warnings(groupId)).length;
    return delay({
      groups: gs.length, students: ss.length, present: c('present'), excused: c('excused'), unexcused: c('unexcused'), skipped: c('skipped'), warnings,
      groupsToday: gs.map((g) => {
        const r = rec.filter((x) => x.group_id === g.id);
        const k = (st: string) => r.filter((x) => x.status === st).length;
        return { group_id: g.id, group_name: g.name, total: r.length, present: k('present'), excused: k('excused'), unexcused: k('unexcused'), skipped: k('skipped') };
      })
    });
  },
  users: () => delay(profiles),
  createUser: (u: NewUserInput) => { profiles.push({ id: uid(), full_name: u.full_name, email: u.email, role: u.role, group_id: u.group_id, is_active: true }); return delay(true); },
  updateUser: (id: string, patch: Partial<Profile>) => { Object.assign(profiles.find((p) => p.id === id)!, patch); return delay(true); }
};
