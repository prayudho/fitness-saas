-- Migration: 022_add_workout_recording.sql
-- Adds exercises library and workout_logs tables for PT session recording.

-- ── EXERCISES TABLE ──────────────────────────────────────────────────────────

CREATE TABLE public.exercises (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_id          uuid NOT NULL REFERENCES public.brands(id) ON DELETE CASCADE,
  name              text NOT NULL,
  category          text NOT NULL CHECK (category IN (
                      'strength','cardio','flexibility','plyometric','full_body')),
  muscle_groups     text[] NOT NULL DEFAULT '{}',
  secondary_muscles text[] NOT NULL DEFAULT '{}',
  equipment         text,
  instructions      text,
  created_by        uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at        timestamptz NOT NULL DEFAULT now()
);

-- ── WORKOUT_LOGS TABLE ────────────────────────────────────────────────────────

-- trainer_session_id uses ON DELETE SET NULL so workout history survives
-- if a session record is deleted — critical for the data portability goal.
CREATE TABLE public.workout_logs (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_id           uuid NOT NULL REFERENCES public.brands(id) ON DELETE CASCADE,
  trainer_session_id uuid REFERENCES public.trainer_sessions(id) ON DELETE SET NULL,
  trainer_id         uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  member_id          uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  exercises          jsonb NOT NULL DEFAULT '[]',
  duration_minutes   integer,
  notes              text,
  created_at         timestamptz NOT NULL DEFAULT now(),
  updated_at         timestamptz NOT NULL DEFAULT now()
);

-- ── INDEXES ───────────────────────────────────────────────────────────────────

CREATE INDEX exercises_brand_category_idx ON public.exercises(brand_id, category);
CREATE INDEX workout_logs_session_idx ON public.workout_logs(trainer_session_id);
CREATE INDEX workout_logs_member_idx ON public.workout_logs(member_id, brand_id, created_at DESC);
CREATE INDEX workout_logs_trainer_idx ON public.workout_logs(trainer_id, brand_id);

-- ── UPDATED_AT TRIGGER ────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER workout_logs_updated_at
  BEFORE UPDATE ON public.workout_logs
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ── RLS: EXERCISES ────────────────────────────────────────────────────────────

ALTER TABLE public.exercises ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Brand members can view exercises"
  ON public.exercises FOR SELECT
  USING (brand_id = get_my_brand_id());

CREATE POLICY "Trainers and admins can insert exercises"
  ON public.exercises FOR INSERT
  WITH CHECK (
    brand_id = get_my_brand_id() AND
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
        AND role IN ('trainer', 'admin', 'superadmin')
    )
  );

CREATE POLICY "Trainers can update own exercises; admins can update all"
  ON public.exercises FOR UPDATE
  USING (
    brand_id = get_my_brand_id() AND (
      created_by = auth.uid() OR
      EXISTS (
        SELECT 1 FROM profiles
        WHERE id = auth.uid()
          AND role IN ('admin', 'superadmin')
      )
    )
  );

-- ── RLS: WORKOUT_LOGS ─────────────────────────────────────────────────────────

ALTER TABLE public.workout_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members see own workout logs; trainers see their logs; admins see all"
  ON public.workout_logs FOR SELECT
  USING (
    brand_id = get_my_brand_id() AND (
      member_id = auth.uid() OR
      trainer_id = auth.uid() OR
      EXISTS (
        SELECT 1 FROM profiles
        WHERE id = auth.uid()
          AND role IN ('admin', 'superadmin')
      )
    )
  );

CREATE POLICY "Trainers can insert workout logs for their sessions"
  ON public.workout_logs FOR INSERT
  WITH CHECK (
    brand_id = get_my_brand_id() AND
    trainer_id = auth.uid() AND
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'trainer'
    )
  );

-- 24h edit window enforced at DB layer via RLS
CREATE POLICY "Trainers can update own workout logs within 24h"
  ON public.workout_logs FOR UPDATE
  USING (
    brand_id = get_my_brand_id() AND
    trainer_id = auth.uid() AND
    created_at > now() - interval '24 hours'
  );

-- ── SEED FUNCTION ─────────────────────────────────────────────────────────────

-- Call seed_brand_exercises(brand_id) after creating a new brand to populate
-- the default exercise library. Also called below for all existing brands.
CREATE OR REPLACE FUNCTION public.seed_brand_exercises(p_brand_id uuid)
RETURNS void LANGUAGE plpgsql AS $$
BEGIN
  INSERT INTO public.exercises (brand_id, name, category, muscle_groups, secondary_muscles, equipment) VALUES
    -- CHEST
    (p_brand_id, 'Barbell Bench Press',    'strength',   ARRAY['Chest','Front Deltoid'],           ARRAY['Triceps'],                         'Barbell, Bench'),
    (p_brand_id, 'Dumbbell Bench Press',   'strength',   ARRAY['Chest','Front Deltoid'],           ARRAY['Triceps'],                         'Dumbbells, Bench'),
    (p_brand_id, 'Incline Barbell Press',  'strength',   ARRAY['Upper Chest','Front Deltoid'],     ARRAY['Triceps'],                         'Barbell, Incline Bench'),
    (p_brand_id, 'Dumbbell Flye',          'strength',   ARRAY['Chest','Front Deltoid'],           ARRAY['Biceps'],                          'Dumbbells, Bench'),
    (p_brand_id, 'Cable Crossover',        'strength',   ARRAY['Chest'],                           ARRAY['Front Deltoid'],                   'Cable Machine'),
    (p_brand_id, 'Push-Up',               'strength',   ARRAY['Chest','Triceps','Front Deltoid'], ARRAY['Core'],                            'Bodyweight'),
    (p_brand_id, 'Decline Bench Press',    'strength',   ARRAY['Lower Chest'],                     ARRAY['Triceps','Front Deltoid'],          'Barbell, Decline Bench'),
    (p_brand_id, 'Chest Dips',             'strength',   ARRAY['Chest','Triceps'],                 ARRAY['Front Deltoid'],                   'Parallel Bars'),
    -- BACK
    (p_brand_id, 'Deadlift',              'strength',   ARRAY['Erector Spinae','Hamstrings','Glutes'], ARRAY['Quads','Lats','Traps'],        'Barbell'),
    (p_brand_id, 'Barbell Row',            'strength',   ARRAY['Lats','Rhomboids','Middle Traps'], ARRAY['Biceps','Lower Back'],              'Barbell'),
    (p_brand_id, 'Pull-Up',               'strength',   ARRAY['Lats','Biceps'],                   ARRAY['Rhomboids','Rear Deltoid'],         'Pull-Up Bar'),
    (p_brand_id, 'Chin-Up',               'strength',   ARRAY['Lats','Biceps'],                   ARRAY['Rhomboids'],                       'Pull-Up Bar'),
    (p_brand_id, 'Lat Pulldown',           'strength',   ARRAY['Lats','Biceps'],                   ARRAY['Rhomboids'],                       'Cable Machine'),
    (p_brand_id, 'Seated Cable Row',       'strength',   ARRAY['Lats','Rhomboids'],                ARRAY['Biceps'],                          'Cable Machine'),
    (p_brand_id, 'T-Bar Row',              'strength',   ARRAY['Lats','Middle Traps','Rhomboids'], ARRAY['Biceps'],                          'T-Bar or Landmine'),
    (p_brand_id, 'Dumbbell Single-Arm Row','strength',   ARRAY['Lats','Rhomboids'],                ARRAY['Biceps'],                          'Dumbbell, Bench'),
    (p_brand_id, 'Face Pull',              'strength',   ARRAY['Rear Deltoid','Rotator Cuff'],     ARRAY['Upper Traps'],                     'Cable Machine, Rope'),
    -- SHOULDERS
    (p_brand_id, 'Overhead Barbell Press', 'strength',   ARRAY['Deltoid','Triceps'],               ARRAY['Upper Traps','Core'],               'Barbell'),
    (p_brand_id, 'Dumbbell Shoulder Press','strength',   ARRAY['Deltoid','Triceps'],               ARRAY['Upper Traps'],                     'Dumbbells'),
    (p_brand_id, 'Lateral Raise',          'strength',   ARRAY['Lateral Deltoid'],                 ARRAY['Supraspinatus'],                   'Dumbbells'),
    (p_brand_id, 'Front Raise',            'strength',   ARRAY['Front Deltoid'],                   ARRAY['Upper Traps'],                     'Dumbbells or Plate'),
    (p_brand_id, 'Rear Delt Flye',         'strength',   ARRAY['Rear Deltoid','Rhomboids'],        ARRAY['Middle Traps'],                    'Dumbbells'),
    (p_brand_id, 'Arnold Press',           'strength',   ARRAY['Deltoid','Triceps'],               ARRAY['Rotator Cuff'],                    'Dumbbells'),
    -- ARMS
    (p_brand_id, 'Barbell Curl',           'strength',   ARRAY['Biceps'],                          ARRAY['Forearms'],                        'Barbell'),
    (p_brand_id, 'Dumbbell Curl',          'strength',   ARRAY['Biceps'],                          ARRAY['Forearms'],                        'Dumbbells'),
    (p_brand_id, 'Hammer Curl',            'strength',   ARRAY['Brachialis','Biceps'],             ARRAY['Forearms'],                        'Dumbbells'),
    (p_brand_id, 'Preacher Curl',          'strength',   ARRAY['Biceps (Short Head)'],             ARRAY['Forearms'],                        'EZ-Bar, Preacher Bench'),
    (p_brand_id, 'Concentration Curl',     'strength',   ARRAY['Biceps (Long Head)'],              ARRAY['Forearms'],                        'Dumbbell'),
    (p_brand_id, 'Tricep Pushdown',        'strength',   ARRAY['Triceps'],                         ARRAY['Forearms'],                        'Cable Machine'),
    (p_brand_id, 'Skull Crusher',          'strength',   ARRAY['Triceps (Long Head)'],             ARRAY['Triceps'],                         'EZ-Bar, Bench'),
    (p_brand_id, 'Overhead Tricep Extension','strength', ARRAY['Triceps (Long Head)'],             ARRAY['Triceps'],                         'Dumbbell or Cable'),
    (p_brand_id, 'Tricep Dips',            'strength',   ARRAY['Triceps'],                         ARRAY['Chest','Front Deltoid'],            'Parallel Bars or Bench'),
    -- LEGS
    (p_brand_id, 'Barbell Back Squat',     'strength',   ARRAY['Quads','Glutes'],                  ARRAY['Hamstrings','Core'],                'Barbell, Squat Rack'),
    (p_brand_id, 'Goblet Squat',           'strength',   ARRAY['Quads','Glutes'],                  ARRAY['Core','Hamstrings'],                'Dumbbell or Kettlebell'),
    (p_brand_id, 'Leg Press',              'strength',   ARRAY['Quads','Glutes'],                  ARRAY['Hamstrings'],                      'Leg Press Machine'),
    (p_brand_id, 'Romanian Deadlift',      'strength',   ARRAY['Hamstrings','Glutes'],             ARRAY['Lower Back'],                      'Barbell or Dumbbells'),
    (p_brand_id, 'Lunges',                 'strength',   ARRAY['Quads','Glutes'],                  ARRAY['Hamstrings','Calves'],              'Bodyweight or Dumbbells'),
    (p_brand_id, 'Bulgarian Split Squat',  'strength',   ARRAY['Quads','Glutes'],                  ARRAY['Hamstrings'],                      'Dumbbells, Bench'),
    (p_brand_id, 'Leg Extension',          'strength',   ARRAY['Quads'],                           ARRAY[]::text[],                          'Leg Extension Machine'),
    (p_brand_id, 'Leg Curl',               'strength',   ARRAY['Hamstrings'],                      ARRAY['Calves'],                          'Leg Curl Machine'),
    (p_brand_id, 'Hip Thrust',             'strength',   ARRAY['Glutes'],                          ARRAY['Hamstrings','Quads'],               'Barbell, Bench'),
    (p_brand_id, 'Standing Calf Raise',    'strength',   ARRAY['Gastrocnemius'],                   ARRAY['Soleus'],                          'Calf Raise Machine or Step'),
    (p_brand_id, 'Seated Calf Raise',      'strength',   ARRAY['Soleus'],                          ARRAY['Gastrocnemius'],                   'Seated Calf Machine'),
    -- CORE
    (p_brand_id, 'Plank',                  'strength',   ARRAY['Transverse Abdominis','Core'],     ARRAY['Shoulders','Glutes'],               'Bodyweight'),
    (p_brand_id, 'Crunch',                 'strength',   ARRAY['Rectus Abdominis'],                ARRAY['Hip Flexors'],                     'Bodyweight'),
    (p_brand_id, 'Russian Twist',          'strength',   ARRAY['Obliques'],                        ARRAY['Rectus Abdominis'],                'Bodyweight or Weight Plate'),
    (p_brand_id, 'Hanging Leg Raise',      'strength',   ARRAY['Lower Abs','Hip Flexors'],         ARRAY['Rectus Abdominis'],                'Pull-Up Bar'),
    (p_brand_id, 'Cable Crunch',           'strength',   ARRAY['Rectus Abdominis'],                ARRAY['Obliques'],                        'Cable Machine, Rope'),
    (p_brand_id, 'Dead Bug',               'strength',   ARRAY['Transverse Abdominis'],            ARRAY['Core'],                            'Bodyweight'),
    -- CARDIO
    (p_brand_id, 'Treadmill Run',          'cardio',     ARRAY['Quads','Hamstrings','Calves'],     ARRAY['Glutes','Core'],                   'Treadmill'),
    (p_brand_id, 'Cycling',                'cardio',     ARRAY['Quads','Hamstrings'],              ARRAY['Glutes','Calves'],                 'Bike or Stationary Bike'),
    (p_brand_id, 'Jump Rope',              'cardio',     ARRAY['Calves','Quads'],                  ARRAY['Shoulders','Core'],                'Jump Rope'),
    (p_brand_id, 'Rowing Machine',         'cardio',     ARRAY['Lats','Rhomboids','Quads'],        ARRAY['Biceps','Core'],                   'Rowing Machine'),
    (p_brand_id, 'Burpees',                'cardio',     ARRAY['Chest','Quads','Shoulders'],       ARRAY['Core','Triceps'],                  'Bodyweight'),
    (p_brand_id, 'Battle Ropes',           'cardio',     ARRAY['Shoulders','Core'],                ARRAY['Arms','Back'],                     'Battle Ropes'),
    (p_brand_id, 'Stair Climber',          'cardio',     ARRAY['Quads','Glutes','Calves'],         ARRAY['Hamstrings'],                      'Stair Climber Machine'),
    -- PLYOMETRIC
    (p_brand_id, 'Box Jump',               'plyometric', ARRAY['Quads','Glutes','Calves'],         ARRAY['Hamstrings'],                      'Plyo Box'),
    -- FULL BODY
    (p_brand_id, 'Kettlebell Swing',       'full_body',  ARRAY['Glutes','Hamstrings','Core'],      ARRAY['Shoulders','Lats'],                'Kettlebell'),
    (p_brand_id, 'Clean and Press',        'full_body',  ARRAY['Quads','Glutes','Shoulders'],      ARRAY['Hamstrings','Traps','Triceps'],     'Barbell or Dumbbells'),
    (p_brand_id, 'Thruster',               'full_body',  ARRAY['Quads','Glutes','Shoulders'],      ARRAY['Triceps','Core'],                  'Barbell or Dumbbells'),
    (p_brand_id, 'Turkish Get-Up',         'full_body',  ARRAY['Core','Shoulders'],                ARRAY['Glutes','Hips'],                   'Kettlebell or Dumbbell'),
    (p_brand_id, 'Man Maker',              'full_body',  ARRAY['Chest','Quads','Shoulders'],       ARRAY['Core','Triceps','Back'],            'Dumbbells'),
    (p_brand_id, 'Bear Crawl',             'full_body',  ARRAY['Core','Shoulders','Hips'],         ARRAY['Quads','Triceps'],                 'Bodyweight')
  ON CONFLICT DO NOTHING;
END;
$$;

-- ── BACKFILL EXISTING BRANDS ──────────────────────────────────────────────────

DO $$
DECLARE
  b record;
BEGIN
  FOR b IN SELECT id FROM public.brands LOOP
    PERFORM public.seed_brand_exercises(b.id);
  END LOOP;
END;
$$;
