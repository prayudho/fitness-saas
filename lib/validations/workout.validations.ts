import { z } from 'zod'

export const exerciseSetSchema = z.object({
  reps:   z.number().int().min(1, 'Reps must be at least 1'),
  weight: z.number().min(0, 'Weight cannot be negative'),
})

export const workoutExerciseSchema = z.object({
  exercise_id:     z.string().uuid(),
  name:            z.string().min(1),
  muscle_groups:   z.array(z.string()),
  category:        z.string(),
  sets:            z.array(exerciseSetSchema).min(1, 'Add at least one set'),
  notes:           z.string().optional(),
  order:           z.number().int().min(1),
})

export const saveWorkoutLogSchema = z.object({
  trainer_session_id: z.string().uuid().optional(),
  member_id:          z.string().uuid(),
  exercises:          z.array(workoutExerciseSchema).min(1, 'Log at least one exercise'),
  duration_minutes:   z.number().int().min(1).optional(),
  notes:              z.string().optional(),
})

export const createExerciseSchema = z.object({
  name:              z.string().min(2, 'Name must be at least 2 characters'),
  category:          z.enum(['strength','cardio','flexibility','plyometric','full_body']),
  muscle_groups:     z.array(z.string()).min(1, 'Select at least one muscle group'),
  secondary_muscles: z.array(z.string()).optional().default([]),
  equipment:         z.string().optional(),
  instructions:      z.string().optional(),
})

export type ExerciseSet     = z.infer<typeof exerciseSetSchema>
export type WorkoutExercise = z.infer<typeof workoutExerciseSchema>
export type SaveWorkoutLogInput = z.infer<typeof saveWorkoutLogSchema>
export type CreateExerciseInput = z.infer<typeof createExerciseSchema>
