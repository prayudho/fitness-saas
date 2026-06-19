'use client'

import { useState } from 'react'
import { PageHeader } from '@/components/shared/page-header'
import { EmptyState } from '@/components/shared/empty-state'
import { ConfirmDialog } from '@/components/shared/confirm-dialog'
import { StatusBadge } from '@/components/shared/status-badge'
import { WeekScheduleGrid } from '@/components/classes/week-schedule-grid'
import { ClassDetailSheet } from '@/components/classes/class-detail-sheet'
import { ClassForm } from '@/components/classes/class-form'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import { Input } from '@/components/ui/input'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Plus, Settings2, Pencil, Trash2 } from 'lucide-react'
import {
  useClasses,
  useClassTypes,
  useCreateClassType,
  useUpdateClassType,
  useDeleteClassType,
} from '@/lib/hooks/use-classes'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useBranchList } from '@/lib/hooks/use-branches'
import type { ClassTypeRow } from '@/lib/actions/classes'

function getMonday(date: Date): Date {
  const d = new Date(date)
  const day = d.getDay()
  const diff = day === 0 ? -6 : 1 - day
  d.setDate(d.getDate() + diff)
  d.setHours(0, 0, 0, 0)
  return d
}

const classTypeSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  color: z.string().min(4, 'Color is required'),
  icon: z.string().optional(),
})
type ClassTypeForm = z.infer<typeof classTypeSchema>

function ClassTypeFormFields({
  defaultValues,
  onSubmit,
  isPending,
  submitLabel,
}: {
  defaultValues?: Partial<ClassTypeForm>
  onSubmit: (data: ClassTypeForm) => void
  isPending: boolean
  submitLabel: string
}) {
  const form = useForm<ClassTypeForm>({
    resolver: zodResolver(classTypeSchema),
    defaultValues: {
      name: defaultValues?.name ?? '',
      color: defaultValues?.color ?? '#6366f1',
      icon: defaultValues?.icon ?? '',
    },
  })

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Name</FormLabel>
              <FormControl>
                <Input placeholder="e.g. Yoga, HIIT, Pilates" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="color"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Color</FormLabel>
                <FormControl>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={field.value}
                      onChange={field.onChange}
                      className="h-9 w-12 cursor-pointer rounded border border-input"
                    />
                    <Input {...field} placeholder="#6366f1" className="font-mono" />
                  </div>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="icon"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Icon (optional)</FormLabel>
                <FormControl>
                  <Input placeholder="e.g. dumbbell" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        <div className="flex justify-end">
          <Button type="submit" disabled={isPending}>
            {isPending ? 'Saving...' : submitLabel}
          </Button>
        </div>
      </form>
    </Form>
  )
}

export default function ClassesPage() {
  const [weekStart, setWeekStart] = useState<Date>(() => getMonday(new Date()))
  const [selectedClassId, setSelectedClassId] = useState<string | null>(null)
  const [isDetailOpen, setIsDetailOpen] = useState(false)
  const [isAddClassOpen, setIsAddClassOpen] = useState(false)
  const [isManageTypesOpen, setIsManageTypesOpen] = useState(false)
  const [editingType, setEditingType] = useState<ClassTypeRow | null>(null)
  const [branchId, setBranchId] = useState('all')

  const { data: branchData } = useBranchList()
  const { data: classes = [], isLoading } = useClasses({
    weekStart: weekStart.toISOString(),
    branchId:  branchId !== 'all' ? branchId : undefined,
  })
  const { data: classTypes = [] } = useClassTypes()
  const createClassType = useCreateClassType()
  const updateClassType = useUpdateClassType()
  const deleteClassType = useDeleteClassType()

  function handleClassClick(classId: string) {
    setSelectedClassId(classId)
    setIsDetailOpen(true)
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Class Schedule"
        description="Manage group fitness classes and bookings"
        action={
          <div className="flex gap-2 flex-wrap items-center">
            {(branchData?.data?.length ?? 0) > 0 && (
              <Select value={branchId} onValueChange={setBranchId}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="All Branches" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Branches</SelectItem>
                  {(branchData?.data ?? []).map((b) => (
                    <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
            <Button variant="outline" size="sm" onClick={() => setIsManageTypesOpen(true)}>
              <Settings2 className="h-4 w-4 mr-1.5" />
              Manage Class Types
            </Button>
            <Button size="sm" onClick={() => setIsAddClassOpen(true)}>
              <Plus className="h-4 w-4 mr-1.5" />
              Add Class
            </Button>
          </div>
        }
      />

      {isLoading ? (
        <div className="h-64 flex items-center justify-center text-muted-foreground text-sm">
          Loading schedule...
        </div>
      ) : (
        <WeekScheduleGrid
          classes={classes}
          weekStart={weekStart}
          onClassClick={handleClassClick}
          onWeekChange={setWeekStart}
          isAdmin
        />
      )}

      {/* Class Detail Sheet */}
      <ClassDetailSheet
        classId={selectedClassId}
        isOpen={isDetailOpen}
        onClose={() => {
          setIsDetailOpen(false)
          setSelectedClassId(null)
        }}
        isAdmin
      />

      {/* Add Class Sheet */}
      <Sheet open={isAddClassOpen} onOpenChange={setIsAddClassOpen}>
        <SheetContent className="sm:max-w-md overflow-y-auto">
          <SheetHeader>
            <SheetTitle>Schedule New Class</SheetTitle>
          </SheetHeader>
          <div className="mt-6">
            <ClassForm
              onSuccess={() => setIsAddClassOpen(false)}
            />
          </div>
        </SheetContent>
      </Sheet>

      {/* Manage Class Types Dialog */}
      <Dialog open={isManageTypesOpen} onOpenChange={setIsManageTypesOpen}>
        <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Manage Class Types</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            {/* Existing types */}
            {classTypes.length === 0 ? (
              <EmptyState
                title="No class types"
                description="Create your first class type to start scheduling classes"
              />
            ) : (
              <div className="space-y-2">
                {classTypes.map((ct) => (
                  <div
                    key={ct.id}
                    className="flex items-center gap-3 p-3 rounded-lg border bg-card"
                  >
                    <div
                      className="h-5 w-5 rounded-full flex-shrink-0"
                      style={{ backgroundColor: ct.color }}
                    />
                    <span className="flex-1 text-sm font-medium">{ct.name}</span>
                    <StatusBadge status={ct.icon ?? 'active'} className="hidden" />
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        onClick={() => setEditingType(ct)}
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <ConfirmDialog
                        title="Delete Class Type"
                        description={`Are you sure you want to delete "${ct.name}"? This will fail if classes use this type.`}
                        onConfirm={() => deleteClassType.mutate(ct.id)}
                        isPending={deleteClassType.isPending}
                        variant="destructive"
                      >
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-destructive hover:text-destructive"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </ConfirmDialog>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Edit form */}
            {editingType ? (
              <div className="border rounded-lg p-4 space-y-3 bg-muted/30">
                <h4 className="text-sm font-semibold">Edit: {editingType.name}</h4>
                <ClassTypeFormFields
                  defaultValues={{ ...editingType, icon: editingType.icon ?? undefined }}
                  onSubmit={async (data) => {
                    await updateClassType.mutateAsync({ id: editingType.id, input: data })
                    setEditingType(null)
                  }}
                  isPending={updateClassType.isPending}
                  submitLabel="Update Type"
                />
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setEditingType(null)}
                  className="w-full"
                >
                  Cancel Edit
                </Button>
              </div>
            ) : (
              <div className="border rounded-lg p-4 space-y-3 bg-muted/30">
                <h4 className="text-sm font-semibold">Add New Class Type</h4>
                <ClassTypeFormFields
                  onSubmit={async (data) => {
                    await createClassType.mutateAsync(data)
                  }}
                  isPending={createClassType.isPending}
                  submitLabel="Add Type"
                />
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
