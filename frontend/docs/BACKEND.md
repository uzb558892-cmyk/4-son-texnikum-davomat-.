# Backend talablari (Supabase)

Frontend quyidagi obyektlarni kutadi. Nomlar yoki ustunlar boshqacha bo'lsa, tegishli `src/services/*Service.ts` faylini moslang.

## Jadvallar
| Jadval | Ustunlar | Izoh |
|---|---|---|
| `profiles` | id (= auth.users.id), full_name, email, role (`admin`\|`group_leader`), group_id, is_active | Login'dan keyin o'qiladi |
| `groups` | id, name, course (int), leader_id | CRUD (admin) |
| `students` | id, full_name, group_id, phone, parent_phone | CRUD (admin) |
| `attendance_records` | id, student_id, group_id, date, lesson (int, para), status (`present`\|`excused`\|`unexcused`\|`skipped`), skip_after (1\|2\|3 yoki null) | **UNIQUE (student_id, date, lesson)** — upsert shu kalit bilan |

## View'lar
- `groups_overview`: id, name, course, leader_id, leader_name, student_count
- `students_overview`: id, full_name, group_id, group_name, phone, parent_phone, is_active

## RPC funksiyalar
1. `get_unexcused_warnings(p_group_id uuid default null)` → massiv:
   `{student_id, student_name, group_id, group_name, phone, parent_phone, unexcused_hours, threshold_hours, last_absence_date, absences:[{date, lesson, status}]}`
   72 soat qoidasi va soatlarni **backend** hisoblaydi. Frontend hech narsa hisoblamaydi.
2. `get_attendance_report(p_period text, p_date date, p_group_by text, p_group_id uuid default null)`
   p_period: `daily|weekly|monthly|yearly`; p_group_by: `group|student` → massiv:
   `{key, label, sub, present, excused, unexcused, skipped, excused_hours, unexcused_hours}`
   (`sub` — o'quvchi kesimida guruh nomi. Qochgan (`skipped`) soatlar sababsiz soatga qo'shiladimi — backend belgilaydi.)
3. `get_dashboard_stats(p_date date, p_group_id uuid default null)` → obyekt:
   `{groups, students, present, excused, unexcused, skipped, warnings, groupsToday:[{group_id, group_name, total, present, excused, unexcused, skipped}]}`

## Edge Function
- `create-user` — body: `{email, password, full_name, role, group_id}`. `service_role` bilan auth foydalanuvchisi va `profiles` yozuvini yaratadi; faqat admin chaqira olishi shart.

## RLS (majburiy)
- `group_leader`: `students`, `attendance_records`, `groups`, view va RPC natijalarida faqat `profiles.group_id` ga mos qatorlarni ko'radi/yozadi.
- `admin`: hamma narsaga ruxsat.
- `profiles`: foydalanuvchi o'z qatorini o'qiy oladi; o'zgartirish faqat admin.

## Auth
Email + parol (`signInWithPassword`). Parol almashtirish: `auth.updateUser`.
