-- ============================================================
-- FitnessPlace SaaS — Demo Seed Data
-- File: supabase/seed.sql
-- ⚠️  Local development only — run with: supabase db seed
-- ⚠️  Inserts directly into auth.users (not for production)
-- ============================================================

-- ============================================================
-- AUTH USERS (8 users)
-- Passwords: all use "demo1234"
-- ============================================================

INSERT INTO auth.users (
  instance_id, id, aud, role, email,
  encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data,
  created_at, updated_at,
  confirmation_token, recovery_token,
  email_change, email_change_token_new,
  is_super_admin
) VALUES
  -- Admin
  (
    '00000000-0000-0000-0000-000000000000',
    'aaaaaaaa-0000-0000-0000-000000000001',
    'authenticated', 'authenticated', 'alex@fitlife.studio',
    crypt('demo1234', gen_salt('bf', 10)),
    NOW(),
    '{"provider":"email","providers":["email"]}',
    '{"full_name":"Alex Martinez"}',
    NOW() - INTERVAL '180 days', NOW(), '', '', '', '', false
  ),
  -- Trainer 1
  (
    '00000000-0000-0000-0000-000000000000',
    'cccccccc-0000-0000-0000-000000000001',
    'authenticated', 'authenticated', 'carlos@fitlife.studio',
    crypt('demo1234', gen_salt('bf', 10)),
    NOW(),
    '{"provider":"email","providers":["email"]}',
    '{"full_name":"Carlos Rodriguez"}',
    NOW() - INTERVAL '170 days', NOW(), '', '', '', '', false
  ),
  -- Trainer 2
  (
    '00000000-0000-0000-0000-000000000000',
    'cccccccc-0000-0000-0000-000000000002',
    'authenticated', 'authenticated', 'priya@fitlife.studio',
    crypt('demo1234', gen_salt('bf', 10)),
    NOW(),
    '{"provider":"email","providers":["email"]}',
    '{"full_name":"Priya Patel"}',
    NOW() - INTERVAL '165 days', NOW(), '', '', '', '', false
  ),
  -- Members
  (
    '00000000-0000-0000-0000-000000000000',
    'bbbbbbbb-0000-0000-0000-000000000001',
    'authenticated', 'authenticated', 'john.doe@example.com',
    crypt('demo1234', gen_salt('bf', 10)),
    NOW(),
    '{"provider":"email","providers":["email"]}',
    '{"full_name":"John Doe"}',
    NOW() - INTERVAL '120 days', NOW(), '', '', '', '', false
  ),
  (
    '00000000-0000-0000-0000-000000000000',
    'bbbbbbbb-0000-0000-0000-000000000002',
    'authenticated', 'authenticated', 'sarah.kim@example.com',
    crypt('demo1234', gen_salt('bf', 10)),
    NOW(),
    '{"provider":"email","providers":["email"]}',
    '{"full_name":"Sarah Kim"}',
    NOW() - INTERVAL '90 days', NOW(), '', '', '', '', false
  ),
  (
    '00000000-0000-0000-0000-000000000000',
    'bbbbbbbb-0000-0000-0000-000000000003',
    'authenticated', 'authenticated', 'mike.chen@example.com',
    crypt('demo1234', gen_salt('bf', 10)),
    NOW(),
    '{"provider":"email","providers":["email"]}',
    '{"full_name":"Mike Chen"}',
    NOW() - INTERVAL '75 days', NOW(), '', '', '', '', false
  ),
  (
    '00000000-0000-0000-0000-000000000000',
    'bbbbbbbb-0000-0000-0000-000000000004',
    'authenticated', 'authenticated', 'emma.wilson@example.com',
    crypt('demo1234', gen_salt('bf', 10)),
    NOW(),
    '{"provider":"email","providers":["email"]}',
    '{"full_name":"Emma Wilson"}',
    NOW() - INTERVAL '60 days', NOW(), '', '', '', '', false
  ),
  (
    '00000000-0000-0000-0000-000000000000',
    'bbbbbbbb-0000-0000-0000-000000000005',
    'authenticated', 'authenticated', 'david.tan@example.com',
    crypt('demo1234', gen_salt('bf', 10)),
    NOW(),
    '{"provider":"email","providers":["email"]}',
    '{"full_name":"David Tan"}',
    NOW() - INTERVAL '30 days', NOW(), '', '', '', '', false
  )
ON CONFLICT (id) DO NOTHING;

-- Auth identities (required for email login in local dev)
INSERT INTO auth.identities (
  id, user_id, provider_id, identity_data, provider,
  last_sign_in_at, created_at, updated_at
) VALUES
  (gen_random_uuid(), 'aaaaaaaa-0000-0000-0000-000000000001', 'alex@fitlife.studio',
   '{"sub":"aaaaaaaa-0000-0000-0000-000000000001","email":"alex@fitlife.studio"}',
   'email', NOW(), NOW(), NOW()),
  (gen_random_uuid(), 'cccccccc-0000-0000-0000-000000000001', 'carlos@fitlife.studio',
   '{"sub":"cccccccc-0000-0000-0000-000000000001","email":"carlos@fitlife.studio"}',
   'email', NOW(), NOW(), NOW()),
  (gen_random_uuid(), 'cccccccc-0000-0000-0000-000000000002', 'priya@fitlife.studio',
   '{"sub":"cccccccc-0000-0000-0000-000000000002","email":"priya@fitlife.studio"}',
   'email', NOW(), NOW(), NOW()),
  (gen_random_uuid(), 'bbbbbbbb-0000-0000-0000-000000000001', 'john.doe@example.com',
   '{"sub":"bbbbbbbb-0000-0000-0000-000000000001","email":"john.doe@example.com"}',
   'email', NOW(), NOW(), NOW()),
  (gen_random_uuid(), 'bbbbbbbb-0000-0000-0000-000000000002', 'sarah.kim@example.com',
   '{"sub":"bbbbbbbb-0000-0000-0000-000000000002","email":"sarah.kim@example.com"}',
   'email', NOW(), NOW(), NOW()),
  (gen_random_uuid(), 'bbbbbbbb-0000-0000-0000-000000000003', 'mike.chen@example.com',
   '{"sub":"bbbbbbbb-0000-0000-0000-000000000003","email":"mike.chen@example.com"}',
   'email', NOW(), NOW(), NOW()),
  (gen_random_uuid(), 'bbbbbbbb-0000-0000-0000-000000000004', 'emma.wilson@example.com',
   '{"sub":"bbbbbbbb-0000-0000-0000-000000000004","email":"emma.wilson@example.com"}',
   'email', NOW(), NOW(), NOW()),
  (gen_random_uuid(), 'bbbbbbbb-0000-0000-0000-000000000005', 'david.tan@example.com',
   '{"sub":"bbbbbbbb-0000-0000-0000-000000000005","email":"david.tan@example.com"}',
   'email', NOW(), NOW(), NOW())
ON CONFLICT DO NOTHING;

-- ============================================================
-- BRAND
-- ============================================================

INSERT INTO brands (id, name, slug, primary_color, owner_user_id, subscription_plan, created_at)
VALUES (
  'dddddddd-0000-0000-0000-000000000001',
  'FitLife Studio',
  'fitlife-studio',
  '#0EA5E9',
  'aaaaaaaa-0000-0000-0000-000000000001',
  'growth',
  NOW() - INTERVAL '180 days'
);

-- ============================================================
-- PROFILES (auto-created by trigger; update with brand context)
-- ============================================================

UPDATE profiles SET
  brand_id = 'dddddddd-0000-0000-0000-000000000001',
  role     = 'admin',
  phone    = '+62-812-0000-0001',
  gender   = 'male'
WHERE id = 'aaaaaaaa-0000-0000-0000-000000000001';

UPDATE profiles SET
  brand_id = 'dddddddd-0000-0000-0000-000000000001',
  role     = 'trainer',
  phone    = '+62-812-0000-0011',
  gender   = 'male',
  date_of_birth = '1990-05-15'
WHERE id = 'cccccccc-0000-0000-0000-000000000001';

UPDATE profiles SET
  brand_id = 'dddddddd-0000-0000-0000-000000000001',
  role     = 'trainer',
  phone    = '+62-812-0000-0012',
  gender   = 'female',
  date_of_birth = '1993-08-22'
WHERE id = 'cccccccc-0000-0000-0000-000000000002';

UPDATE profiles SET
  brand_id = 'dddddddd-0000-0000-0000-000000000001',
  role     = 'member',
  phone    = '+62-812-0000-0101',
  gender   = 'male',
  date_of_birth = '1992-03-10',
  emergency_contact_name  = 'Jane Doe',
  emergency_contact_phone = '+62-812-0000-0102'
WHERE id = 'bbbbbbbb-0000-0000-0000-000000000001';

UPDATE profiles SET
  brand_id = 'dddddddd-0000-0000-0000-000000000001',
  role     = 'member',
  phone    = '+62-812-0000-0201',
  gender   = 'female',
  date_of_birth = '1995-11-30'
WHERE id = 'bbbbbbbb-0000-0000-0000-000000000002';

UPDATE profiles SET
  brand_id = 'dddddddd-0000-0000-0000-000000000001',
  role     = 'member',
  phone    = '+62-812-0000-0301',
  gender   = 'male',
  date_of_birth = '1988-07-04'
WHERE id = 'bbbbbbbb-0000-0000-0000-000000000003';

UPDATE profiles SET
  brand_id = 'dddddddd-0000-0000-0000-000000000001',
  role     = 'member',
  phone    = '+62-812-0000-0401',
  gender   = 'female',
  date_of_birth = '1997-02-18'
WHERE id = 'bbbbbbbb-0000-0000-0000-000000000004';

UPDATE profiles SET
  brand_id = 'dddddddd-0000-0000-0000-000000000001',
  role     = 'member',
  phone    = '+62-812-0000-0501',
  gender   = 'male',
  date_of_birth = '2000-09-25'
WHERE id = 'bbbbbbbb-0000-0000-0000-000000000005';

-- ============================================================
-- TRAINERS
-- ============================================================

INSERT INTO trainers (id, brand_id, bio, specialties, certifications, commission_model, commission_value)
VALUES
  (
    'cccccccc-0000-0000-0000-000000000001',
    'dddddddd-0000-0000-0000-000000000001',
    'Certified personal trainer with 8 years of experience in strength & conditioning.',
    ARRAY['Strength Training', 'HIIT', 'Powerlifting'],
    ARRAY['ACE-CPT', 'NSCA-CSCS'],
    'percent',
    40
  ),
  (
    'cccccccc-0000-0000-0000-000000000002',
    'dddddddd-0000-0000-0000-000000000001',
    'Yoga and Pilates specialist with focus on mindful movement and flexibility.',
    ARRAY['Yoga', 'Pilates', 'Stretching', 'Meditation'],
    ARRAY['RYT-200', 'PMA-CPT'],
    'percent',
    40
  );

-- Trainer availability (Carlos: Mon–Fri 06:00–20:00; Priya: Mon/Wed/Fri 07:00–18:00, Sat 08:00–14:00)
INSERT INTO trainer_availability (trainer_id, day_of_week, start_time, end_time) VALUES
  -- Carlos (Mon=0 … Fri=4)
  ('cccccccc-0000-0000-0000-000000000001', 0, '06:00', '20:00'),
  ('cccccccc-0000-0000-0000-000000000001', 1, '06:00', '20:00'),
  ('cccccccc-0000-0000-0000-000000000001', 2, '06:00', '20:00'),
  ('cccccccc-0000-0000-0000-000000000001', 3, '06:00', '20:00'),
  ('cccccccc-0000-0000-0000-000000000001', 4, '06:00', '20:00'),
  -- Priya (Mon, Wed, Fri + Sat=5)
  ('cccccccc-0000-0000-0000-000000000002', 0, '07:00', '18:00'),
  ('cccccccc-0000-0000-0000-000000000002', 2, '07:00', '18:00'),
  ('cccccccc-0000-0000-0000-000000000002', 4, '07:00', '18:00'),
  ('cccccccc-0000-0000-0000-000000000002', 5, '08:00', '14:00');

-- ============================================================
-- MEMBERSHIP PACKAGES
-- ============================================================

INSERT INTO membership_packages (id, brand_id, name, description, type, duration_days, price, currency, allow_freeze, max_freeze_days)
VALUES
  (
    'eeeeeeee-0000-0000-0000-000000000001',
    'dddddddd-0000-0000-0000-000000000001',
    'Monthly Unlimited',
    'Unlimited gym access for 30 days. Includes all group classes.',
    'monthly', 30, 350000, 'IDR', true, 7
  ),
  (
    'eeeeeeee-0000-0000-0000-000000000002',
    'dddddddd-0000-0000-0000-000000000001',
    'Annual VIP',
    'Best value — 12 months of unlimited access + 2 free PT sessions per month.',
    'annual', 365, 3500000, 'IDR', true, 30
  ),
  (
    'eeeeeeee-0000-0000-0000-000000000003',
    'dddddddd-0000-0000-0000-000000000001',
    '10-Session Pack',
    'Flexible 10-visit pack. Valid for 90 days from activation.',
    'sessions', 90, 500000, 'IDR', false, NULL
  );

UPDATE membership_packages
SET session_credits = 10
WHERE id = 'eeeeeeee-0000-0000-0000-000000000003';

-- ============================================================
-- MEMBERSHIPS
-- ============================================================

INSERT INTO memberships (id, brand_id, member_id, package_id, status, starts_at, expires_at, sessions_remaining, auto_renew)
VALUES
  -- John: active monthly (started 25 days ago)
  (
    'ffffffff-0000-0000-0000-000000000001',
    'dddddddd-0000-0000-0000-000000000001',
    'bbbbbbbb-0000-0000-0000-000000000001',
    'eeeeeeee-0000-0000-0000-000000000001',
    'active',
    NOW() - INTERVAL '25 days',
    NOW() + INTERVAL '5 days',
    NULL, true
  ),
  -- Sarah: active annual
  (
    'ffffffff-0000-0000-0000-000000000002',
    'dddddddd-0000-0000-0000-000000000001',
    'bbbbbbbb-0000-0000-0000-000000000002',
    'eeeeeeee-0000-0000-0000-000000000002',
    'active',
    NOW() - INTERVAL '60 days',
    NOW() + INTERVAL '305 days',
    NULL, true
  ),
  -- Mike: active 10-session pack (4 sessions used)
  (
    'ffffffff-0000-0000-0000-000000000003',
    'dddddddd-0000-0000-0000-000000000001',
    'bbbbbbbb-0000-0000-0000-000000000003',
    'eeeeeeee-0000-0000-0000-000000000003',
    'active',
    NOW() - INTERVAL '40 days',
    NOW() + INTERVAL '50 days',
    6, false
  ),
  -- Emma: active monthly (fresh)
  (
    'ffffffff-0000-0000-0000-000000000004',
    'dddddddd-0000-0000-0000-000000000001',
    'bbbbbbbb-0000-0000-0000-000000000004',
    'eeeeeeee-0000-0000-0000-000000000001',
    'active',
    NOW() - INTERVAL '5 days',
    NOW() + INTERVAL '25 days',
    NULL, false
  ),
  -- David: active monthly (just joined)
  (
    'ffffffff-0000-0000-0000-000000000005',
    'dddddddd-0000-0000-0000-000000000001',
    'bbbbbbbb-0000-0000-0000-000000000005',
    'eeeeeeee-0000-0000-0000-000000000001',
    'active',
    NOW() - INTERVAL '2 days',
    NOW() + INTERVAL '28 days',
    NULL, false
  );

-- ============================================================
-- INVOICES (payments for memberships)
-- ============================================================

INSERT INTO invoices (brand_id, member_id, membership_id, amount, currency, status, payment_method, paid_at, created_at)
VALUES
  ('dddddddd-0000-0000-0000-000000000001', 'bbbbbbbb-0000-0000-0000-000000000001',
   'ffffffff-0000-0000-0000-000000000001', 350000, 'IDR', 'paid', 'cash',
   NOW() - INTERVAL '25 days', NOW() - INTERVAL '25 days'),

  ('dddddddd-0000-0000-0000-000000000001', 'bbbbbbbb-0000-0000-0000-000000000002',
   'ffffffff-0000-0000-0000-000000000002', 3500000, 'IDR', 'paid', 'transfer',
   NOW() - INTERVAL '60 days', NOW() - INTERVAL '60 days'),

  ('dddddddd-0000-0000-0000-000000000001', 'bbbbbbbb-0000-0000-0000-000000000003',
   'ffffffff-0000-0000-0000-000000000003', 500000, 'IDR', 'paid', 'cash',
   NOW() - INTERVAL '40 days', NOW() - INTERVAL '40 days'),

  ('dddddddd-0000-0000-0000-000000000001', 'bbbbbbbb-0000-0000-0000-000000000004',
   'ffffffff-0000-0000-0000-000000000004', 350000, 'IDR', 'paid', 'gateway',
   NOW() - INTERVAL '5 days', NOW() - INTERVAL '5 days'),

  ('dddddddd-0000-0000-0000-000000000001', 'bbbbbbbb-0000-0000-0000-000000000005',
   'ffffffff-0000-0000-0000-000000000005', 350000, 'IDR', 'paid', 'cash',
   NOW() - INTERVAL '2 days', NOW() - INTERVAL '2 days'),

  -- Previous monthly for John
  ('dddddddd-0000-0000-0000-000000000001', 'bbbbbbbb-0000-0000-0000-000000000001',
   NULL, 350000, 'IDR', 'paid', 'cash',
   NOW() - INTERVAL '55 days', NOW() - INTERVAL '55 days'),

  -- Previous monthly for Sarah (before annual)
  ('dddddddd-0000-0000-0000-000000000001', 'bbbbbbbb-0000-0000-0000-000000000002',
   NULL, 350000, 'IDR', 'paid', 'transfer',
   NOW() - INTERVAL '90 days', NOW() - INTERVAL '90 days');

-- ============================================================
-- CLASS TYPES
-- ============================================================

INSERT INTO class_types (id, brand_id, name, description, color, icon)
VALUES
  ('11111111-0000-0000-0000-000000000001', 'dddddddd-0000-0000-0000-000000000001',
   'HIIT',        'High-intensity interval training',                  '#EF4444', '🔥'),
  ('11111111-0000-0000-0000-000000000002', 'dddddddd-0000-0000-0000-000000000001',
   'Yoga',        'Mindful movement and flexibility',                   '#8B5CF6', '🧘'),
  ('11111111-0000-0000-0000-000000000003', 'dddddddd-0000-0000-0000-000000000001',
   'Strength',    'Barbell and functional strength training',           '#F59E0B', '🏋️'),
  ('11111111-0000-0000-0000-000000000004', 'dddddddd-0000-0000-0000-000000000001',
   'Pilates',     'Core strength and posture correction',               '#10B981', '🌿'),
  ('11111111-0000-0000-0000-000000000005', 'dddddddd-0000-0000-0000-000000000001',
   'Cardio Dance','Fun cardio set to music',                            '#EC4899', '💃');

-- ============================================================
-- CLASSES (past 2 weeks + next 2 weeks = 10 classes)
-- ============================================================

INSERT INTO classes (id, brand_id, class_type_id, instructor_id, room, capacity, duration_minutes, scheduled_at, status)
VALUES
  -- Past classes (last 14 days)
  ('22222222-0000-0000-0000-000000000001', 'dddddddd-0000-0000-0000-000000000001',
   '11111111-0000-0000-0000-000000000001', 'cccccccc-0000-0000-0000-000000000001',
   'Studio A', 15, 45, NOW() - INTERVAL '12 days' + TIME '07:00', 'completed'),

  ('22222222-0000-0000-0000-000000000002', 'dddddddd-0000-0000-0000-000000000001',
   '11111111-0000-0000-0000-000000000002', 'cccccccc-0000-0000-0000-000000000002',
   'Studio B', 12, 60, NOW() - INTERVAL '10 days' + TIME '09:00', 'completed'),

  ('22222222-0000-0000-0000-000000000003', 'dddddddd-0000-0000-0000-000000000001',
   '11111111-0000-0000-0000-000000000003', 'cccccccc-0000-0000-0000-000000000001',
   'Gym Floor', 20, 60, NOW() - INTERVAL '7 days' + TIME '06:00', 'completed'),

  ('22222222-0000-0000-0000-000000000004', 'dddddddd-0000-0000-0000-000000000001',
   '11111111-0000-0000-0000-000000000004', 'cccccccc-0000-0000-0000-000000000002',
   'Studio B', 10, 60, NOW() - INTERVAL '5 days' + TIME '10:00', 'completed'),

  ('22222222-0000-0000-0000-000000000005', 'dddddddd-0000-0000-0000-000000000001',
   '11111111-0000-0000-0000-000000000005', 'cccccccc-0000-0000-0000-000000000002',
   'Studio A', 20, 45, NOW() - INTERVAL '3 days' + TIME '17:00', 'completed'),

  ('22222222-0000-0000-0000-000000000006', 'dddddddd-0000-0000-0000-000000000001',
   '11111111-0000-0000-0000-000000000001', 'cccccccc-0000-0000-0000-000000000001',
   'Studio A', 15, 45, NOW() - INTERVAL '1 days' + TIME '07:00', 'completed'),

  -- Upcoming classes (next 14 days)
  ('22222222-0000-0000-0000-000000000007', 'dddddddd-0000-0000-0000-000000000001',
   '11111111-0000-0000-0000-000000000002', 'cccccccc-0000-0000-0000-000000000002',
   'Studio B', 12, 60, NOW() + INTERVAL '1 days' + TIME '09:00', 'scheduled'),

  ('22222222-0000-0000-0000-000000000008', 'dddddddd-0000-0000-0000-000000000001',
   '11111111-0000-0000-0000-000000000003', 'cccccccc-0000-0000-0000-000000000001',
   'Gym Floor', 20, 60, NOW() + INTERVAL '3 days' + TIME '06:00', 'scheduled'),

  ('22222222-0000-0000-0000-000000000009', 'dddddddd-0000-0000-0000-000000000001',
   '11111111-0000-0000-0000-000000000001', 'cccccccc-0000-0000-0000-000000000001',
   'Studio A', 15, 45, NOW() + INTERVAL '5 days' + TIME '07:00', 'scheduled'),

  ('22222222-0000-0000-0000-000000000010', 'dddddddd-0000-0000-0000-000000000001',
   '11111111-0000-0000-0000-000000000004', 'cccccccc-0000-0000-0000-000000000002',
   'Studio B', 10, 60, NOW() + INTERVAL '7 days' + TIME '10:00', 'scheduled');

-- ============================================================
-- CLASS BOOKINGS (20 bookings on 6 past + 4 upcoming classes)
-- ============================================================

INSERT INTO class_bookings (class_id, member_id, status, booked_at, checked_in_at) VALUES

  -- Class 1 (HIIT, -12d) — 4 attendees
  ('22222222-0000-0000-0000-000000000001', 'bbbbbbbb-0000-0000-0000-000000000001', 'attended',
   NOW() - INTERVAL '13 days', NOW() - INTERVAL '12 days' + TIME '06:55'),
  ('22222222-0000-0000-0000-000000000001', 'bbbbbbbb-0000-0000-0000-000000000002', 'attended',
   NOW() - INTERVAL '13 days', NOW() - INTERVAL '12 days' + TIME '07:02'),
  ('22222222-0000-0000-0000-000000000001', 'bbbbbbbb-0000-0000-0000-000000000003', 'no_show',
   NOW() - INTERVAL '13 days', NULL),

  -- Class 2 (Yoga, -10d) — 3 attendees
  ('22222222-0000-0000-0000-000000000002', 'bbbbbbbb-0000-0000-0000-000000000002', 'attended',
   NOW() - INTERVAL '11 days', NOW() - INTERVAL '10 days' + TIME '08:58'),
  ('22222222-0000-0000-0000-000000000002', 'bbbbbbbb-0000-0000-0000-000000000004', 'attended',
   NOW() - INTERVAL '11 days', NOW() - INTERVAL '10 days' + TIME '09:01'),
  ('22222222-0000-0000-0000-000000000002', 'bbbbbbbb-0000-0000-0000-000000000001', 'cancelled',
   NOW() - INTERVAL '11 days', NULL),

  -- Class 3 (Strength, -7d) — 4 attendees
  ('22222222-0000-0000-0000-000000000003', 'bbbbbbbb-0000-0000-0000-000000000001', 'attended',
   NOW() - INTERVAL '8 days', NOW() - INTERVAL '7 days' + TIME '05:58'),
  ('22222222-0000-0000-0000-000000000003', 'bbbbbbbb-0000-0000-0000-000000000003', 'attended',
   NOW() - INTERVAL '8 days', NOW() - INTERVAL '7 days' + TIME '06:00'),
  ('22222222-0000-0000-0000-000000000003', 'bbbbbbbb-0000-0000-0000-000000000005', 'attended',
   NOW() - INTERVAL '8 days', NOW() - INTERVAL '7 days' + TIME '06:03'),

  -- Class 4 (Pilates, -5d) — 2 attendees
  ('22222222-0000-0000-0000-000000000004', 'bbbbbbbb-0000-0000-0000-000000000002', 'attended',
   NOW() - INTERVAL '6 days', NOW() - INTERVAL '5 days' + TIME '09:57'),
  ('22222222-0000-0000-0000-000000000004', 'bbbbbbbb-0000-0000-0000-000000000004', 'attended',
   NOW() - INTERVAL '6 days', NOW() - INTERVAL '5 days' + TIME '10:00'),

  -- Class 5 (Dance, -3d) — 3 attendees
  ('22222222-0000-0000-0000-000000000005', 'bbbbbbbb-0000-0000-0000-000000000002', 'attended',
   NOW() - INTERVAL '4 days', NOW() - INTERVAL '3 days' + TIME '16:55'),
  ('22222222-0000-0000-0000-000000000005', 'bbbbbbbb-0000-0000-0000-000000000004', 'attended',
   NOW() - INTERVAL '4 days', NOW() - INTERVAL '3 days' + TIME '17:00'),
  ('22222222-0000-0000-0000-000000000005', 'bbbbbbbb-0000-0000-0000-000000000005', 'attended',
   NOW() - INTERVAL '4 days', NOW() - INTERVAL '3 days' + TIME '17:02'),

  -- Class 6 (HIIT yesterday) — 2 attended
  ('22222222-0000-0000-0000-000000000006', 'bbbbbbbb-0000-0000-0000-000000000001', 'attended',
   NOW() - INTERVAL '2 days', NOW() - INTERVAL '1 days' + TIME '06:58'),
  ('22222222-0000-0000-0000-000000000006', 'bbbbbbbb-0000-0000-0000-000000000003', 'attended',
   NOW() - INTERVAL '2 days', NOW() - INTERVAL '1 days' + TIME '07:01'),

  -- Upcoming class bookings
  ('22222222-0000-0000-0000-000000000007', 'bbbbbbbb-0000-0000-0000-000000000002', 'booked', NOW(), NULL),
  ('22222222-0000-0000-0000-000000000007', 'bbbbbbbb-0000-0000-0000-000000000004', 'booked', NOW(), NULL),
  ('22222222-0000-0000-0000-000000000008', 'bbbbbbbb-0000-0000-0000-000000000001', 'booked', NOW(), NULL),
  ('22222222-0000-0000-0000-000000000009', 'bbbbbbbb-0000-0000-0000-000000000003', 'booked', NOW(), NULL);

-- ============================================================
-- CHECKINS (recent check-in history)
-- ============================================================

INSERT INTO checkins (brand_id, member_id, membership_id, method, checked_in_at) VALUES
  ('dddddddd-0000-0000-0000-000000000001', 'bbbbbbbb-0000-0000-0000-000000000001',
   'ffffffff-0000-0000-0000-000000000001', 'qr',    NOW() - INTERVAL '1 days' + TIME '07:00'),
  ('dddddddd-0000-0000-0000-000000000001', 'bbbbbbbb-0000-0000-0000-000000000002',
   'ffffffff-0000-0000-0000-000000000002', 'qr',    NOW() - INTERVAL '1 days' + TIME '09:00'),
  ('dddddddd-0000-0000-0000-000000000001', 'bbbbbbbb-0000-0000-0000-000000000003',
   'ffffffff-0000-0000-0000-000000000003', 'staff', NOW() - INTERVAL '3 days' + TIME '06:00'),
  ('dddddddd-0000-0000-0000-000000000001', 'bbbbbbbb-0000-0000-0000-000000000004',
   'ffffffff-0000-0000-0000-000000000004', 'qr',    NOW() - INTERVAL '3 days' + TIME '09:55'),
  ('dddddddd-0000-0000-0000-000000000001', 'bbbbbbbb-0000-0000-0000-000000000005',
   'ffffffff-0000-0000-0000-000000000005', 'staff', NOW() - INTERVAL '2 days' + TIME '08:00'),
  ('dddddddd-0000-0000-0000-000000000001', 'bbbbbbbb-0000-0000-0000-000000000001',
   'ffffffff-0000-0000-0000-000000000001', 'qr',    NOW() - INTERVAL '5 days' + TIME '06:55'),
  ('dddddddd-0000-0000-0000-000000000001', 'bbbbbbbb-0000-0000-0000-000000000002',
   'ffffffff-0000-0000-0000-000000000002', 'qr',    NOW() - INTERVAL '5 days' + TIME '17:00'),
  ('dddddddd-0000-0000-0000-000000000001', 'bbbbbbbb-0000-0000-0000-000000000001',
   'ffffffff-0000-0000-0000-000000000001', 'qr',    NOW() - INTERVAL '7 days' + TIME '07:00');

-- ============================================================
-- PROMO CODES
-- ============================================================

INSERT INTO promo_codes (brand_id, code, discount_type, discount_value, max_uses, valid_until)
VALUES
  ('dddddddd-0000-0000-0000-000000000001', 'NEWMEMBER20', 'percent', 20, 50, NOW() + INTERVAL '90 days'),
  ('dddddddd-0000-0000-0000-000000000001', 'ANNUAL100K',  'fixed',   100000, 10, NOW() + INTERVAL '30 days');

-- ============================================================
-- TRAINER SESSIONS (past and upcoming PT sessions)
-- ============================================================

INSERT INTO trainer_sessions (brand_id, trainer_id, member_id, scheduled_at, duration_minutes, status, session_fee, commission_earned, created_at)
VALUES
  ('dddddddd-0000-0000-0000-000000000001',
   'cccccccc-0000-0000-0000-000000000001', 'bbbbbbbb-0000-0000-0000-000000000001',
   NOW() - INTERVAL '14 days' + TIME '08:00', 60, 'completed', 200000, 80000,
   NOW() - INTERVAL '15 days'),
  ('dddddddd-0000-0000-0000-000000000001',
   'cccccccc-0000-0000-0000-000000000001', 'bbbbbbbb-0000-0000-0000-000000000003',
   NOW() - INTERVAL '7 days' + TIME '08:00', 60, 'completed', 200000, 80000,
   NOW() - INTERVAL '8 days'),
  ('dddddddd-0000-0000-0000-000000000001',
   'cccccccc-0000-0000-0000-000000000002', 'bbbbbbbb-0000-0000-0000-000000000002',
   NOW() - INTERVAL '10 days' + TIME '10:00', 60, 'completed', 180000, 72000,
   NOW() - INTERVAL '11 days'),
  ('dddddddd-0000-0000-0000-000000000001',
   'cccccccc-0000-0000-0000-000000000001', 'bbbbbbbb-0000-0000-0000-000000000001',
   NOW() + INTERVAL '2 days' + TIME '08:00', 60, 'scheduled', 200000, NULL,
   NOW()),
  ('dddddddd-0000-0000-0000-000000000001',
   'cccccccc-0000-0000-0000-000000000002', 'bbbbbbbb-0000-0000-0000-000000000004',
   NOW() + INTERVAL '4 days' + TIME '10:00', 60, 'scheduled', 180000, NULL,
   NOW());
