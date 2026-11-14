-- TEST MA‘LUMOTLARI (faqat lokal/staging uchun; productionda ishlatmang).
-- Barcha ismlar to‘qima. Foydalanuvchi (auth) hisoblari bu yerda yaratilmaydi:
-- admin -> bootstrap-admin funksiyasi, rahbarlar -> create-group-leader funksiyasi.

insert into public.groups (name) values ('IT-21'), ('IT-22'), ('BUX-21')
on conflict (name) do nothing;

insert into public.students (group_id, full_name, student_code, parent_name, parent_phone, parent_address)
select g.id, v.full_name, v.code, v.parent_name, v.parent_phone, v.addr
from (values
  ('IT-21',  'Aliyev Anvar',        'T-0001', 'Aliyev Karim',      '+998900000001', 'Toshkent sh., Chilonzor'),
  ('IT-21',  'Karimova Dilnoza',    'T-0002', 'Karimov Rustam',    '+998900000002', 'Toshkent sh., Yunusobod'),
  ('IT-21',  'Tursunov Jasur',      'T-0003', 'Tursunova Malika',  '+998900000003', 'Toshkent sh., Mirzo Ulug‘bek'),
  ('IT-21',  'Rahimova Zarina',     'T-0004', 'Rahimov Bahodir',   '+998900000004', 'Toshkent sh., Sergeli'),
  ('IT-22',  'Yusupov Sardor',      'T-0005', 'Yusupov Olim',      '+998900000005', 'Toshkent sh., Shayxontohur'),
  ('IT-22',  'Qodirova Madina',     'T-0006', 'Qodirov Akmal',     '+998900000006', 'Toshkent sh., Olmazor'),
  ('IT-22',  'Normatov Behzod',     'T-0007', 'Normatova Gulnora', '+998900000007', 'Toshkent sh., Uchtepa'),
  ('IT-22',  'Ergasheva Nilufar',   'T-0008', 'Ergashev Shavkat',  '+998900000008', 'Toshkent sh., Yakkasaroy'),
  ('BUX-21', 'Sobirov Otabek',      'T-0009', 'Sobirov Anvar',     '+998900000009', 'Toshkent sh., Bektemir'),
  ('BUX-21', 'Hamidova Shahlo',     'T-0010', 'Hamidov Ilhom',     '+998900000010', 'Toshkent sh., Yashnobod'),
  ('BUX-21', 'Ismoilov Doniyor',    'T-0011', 'Ismoilova Sevara',  '+998900000011', 'Toshkent sh., Chilonzor'),
  ('BUX-21', 'Abdullayeva Laylo',   'T-0012', 'Abdullayev Farhod', '+998900000012', 'Toshkent sh., Mirobod')
) as v(group_name, full_name, code, parent_name, parent_phone, addr)
join public.groups g on g.name = v.group_name
on conflict (student_code) do nothing;
