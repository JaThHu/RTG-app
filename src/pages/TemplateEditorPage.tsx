import { useState } from 'react';
import { Navigate, useNavigate, useParams } from 'react-router-dom';
import { PageHeader } from '../components/PageHeader';
import { ExerciseSheet } from '../components/ExerciseSheet';
import type { ExerciseDraft } from '../components/ExerciseSheet';
import { ConfirmSheet, EmptyState, Field, Sheet } from '../components/ui';
import { useToast } from '../components/Toast';
import {
  IconCopy,
  IconDown,
  IconEdit,
  IconPlay,
  IconPlus,
  IconTrash,
  IconUp,
} from '../components/Icons';
import {
  ACCENTS,
  addPlanExercise,
  deletePlanExercise,
  deleteTemplate,
  duplicateTemplate,
  movePlanExercise,
  startSession,
  updatePlanExercise,
  updateTemplate,
} from '../lib/actions';
import { WEEKDAYS_SHORT } from '../lib/date';
import { formatDuration } from '../lib/date';
import { formatTarget } from '../lib/format';
import { useData } from '../lib/store';
import type { PlanExercise } from '../lib/types';

export function TemplateEditorPage() {
  const { templateId } = useParams();
  const data = useData();
  const navigate = useNavigate();
  const toast = useToast();

  const template = data.templates.find((t) => t.id === templateId);
  const [editing, setEditing] = useState<PlanExercise | undefined>();
  const [sheetOpen, setSheetOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  if (!template) return <Navigate to="/plan" replace />;

  const toggleWeekday = (day: number) => {
    const weekdays = template.weekdays.includes(day)
      ? template.weekdays.filter((d) => d !== day)
      : [...template.weekdays, day].sort((a, b) => a - b);
    updateTemplate(template.id, { weekdays });
  };

  const saveExercise = (draft: ExerciseDraft) => {
    if (editing) {
      updatePlanExercise(template.id, editing.id, draft);
    } else {
      addPlanExercise(template.id, draft);
    }
    setEditing(undefined);
  };

  const openNew = () => {
    setEditing(undefined);
    setSheetOpen(true);
  };

  const openEdit = (exercise: PlanExercise) => {
    setEditing(exercise);
    setSheetOpen(true);
  };

  const start = () => {
    const session = startSession(template);
    navigate(`/workout/${session.id}`);
  };

  return (
    <main className="page">
      <PageHeader
        eyebrow="Workout"
        title={template.name}
        back="/plan"
        action={
          <button className="icon-btn" onClick={() => setSettingsOpen(true)} aria-label="Einstellungen">
            <IconEdit />
          </button>
        }
      />

      <div className="card" style={{ borderColor: template.accent }}>
        <div className="field__label" style={{ marginBottom: 8 }}>
          Geplante Tage
        </div>
        <div className="row" style={{ gap: 6 }}>
          {WEEKDAYS_SHORT.map((label, index) => {
            const day = index + 1;
            const on = template.weekdays.includes(day);
            return (
              <button
                key={day}
                className={`chip ${on ? 'chip--on' : ''}`}
                style={{
                  flex: 1,
                  justifyContent: 'center',
                  minHeight: 38,
                  borderColor: on ? template.accent : undefined,
                  color: on ? template.accent : undefined,
                  background: on ? 'var(--surface-2)' : undefined,
                }}
                aria-pressed={on}
                onClick={() => toggleWeekday(day)}
              >
                {label}
              </button>
            );
          })}
        </div>
        {template.note && <p className="small muted" style={{ marginTop: 'var(--gap-sm)' }}>{template.note}</p>}
      </div>

      <section className="section">
        <div className="section__head">
          <h2>Übungen ({template.exercises.length})</h2>
          <button className="btn btn--sm" onClick={openNew}>
            <IconPlus size={16} /> Übung
          </button>
        </div>

        {template.exercises.length === 0 ? (
          <EmptyState
            icon="🏋️"
            title="Noch keine Übungen"
            text="Füge Übungen mit Sätzen und Zielwerten hinzu."
            action={
              <button className="btn btn--primary" onClick={openNew}>
                <IconPlus size={18} /> Übung hinzufügen
              </button>
            }
          />
        ) : (
          <ul className="stack">
            {template.exercises.map((exercise, index) => (
              <li key={exercise.id} className="card">
                <div className="row-between" style={{ alignItems: 'flex-start' }}>
                  <button
                    className="grow"
                    style={{ textAlign: 'left', minWidth: 0 }}
                    onClick={() => openEdit(exercise)}
                  >
                    <strong className="truncate" style={{ display: 'block' }}>
                      {exercise.name}
                    </strong>
                    <span className="small muted">
                      {formatTarget(exercise)}
                      {exercise.restSeconds ? ` · Pause ${formatDuration(exercise.restSeconds)}` : ''}
                    </span>
                    {exercise.note && <span className="tiny faint" style={{ display: 'block' }}>{exercise.note}</span>}
                  </button>
                  <div className="row" style={{ gap: 4 }}>
                    <button
                      className="icon-btn"
                      style={{ width: 32, height: 32 }}
                      disabled={index === 0}
                      onClick={() => movePlanExercise(template.id, exercise.id, -1)}
                      aria-label="Nach oben"
                    >
                      <IconUp size={16} />
                    </button>
                    <button
                      className="icon-btn"
                      style={{ width: 32, height: 32 }}
                      disabled={index === template.exercises.length - 1}
                      onClick={() => movePlanExercise(template.id, exercise.id, 1)}
                      aria-label="Nach unten"
                    >
                      <IconDown size={16} />
                    </button>
                    <button
                      className="icon-btn"
                      style={{ width: 32, height: 32, color: 'var(--red)' }}
                      onClick={() => deletePlanExercise(template.id, exercise.id)}
                      aria-label={`${exercise.name} entfernen`}
                    >
                      <IconTrash size={16} />
                    </button>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      {template.exercises.length > 0 && (
        <button
          className="btn btn--primary btn--block btn--lg"
          style={{ marginTop: 'var(--gap-xl)', background: template.accent, borderColor: template.accent }}
          onClick={start}
        >
          <IconPlay /> Workout starten
        </button>
      )}

      <ExerciseSheet
        open={sheetOpen}
        exercise={editing}
        defaultRest={data.settings.defaultRestSeconds}
        onSave={saveExercise}
        onClose={() => {
          setSheetOpen(false);
          setEditing(undefined);
        }}
      />

      <Sheet open={settingsOpen} title="Workout-Einstellungen" onClose={() => setSettingsOpen(false)}>
        <div className="stack-lg">
          <Field label="Name">
            <input
              className="input"
              value={template.name}
              onChange={(event) => updateTemplate(template.id, { name: event.target.value })}
            />
          </Field>

          <Field label="Notiz">
            <textarea
              className="textarea"
              value={template.note ?? ''}
              placeholder="Fokus, Hinweise, Aufwärmen ..."
              onChange={(event) => updateTemplate(template.id, { note: event.target.value })}
            />
          </Field>

          <div className="field">
            <span className="field__label">Farbe</span>
            <div className="row wrap">
              {ACCENTS.map((accent) => (
                <button
                  key={accent}
                  onClick={() => updateTemplate(template.id, { accent })}
                  aria-label={`Farbe ${accent}`}
                  style={{
                    width: 34,
                    height: 34,
                    borderRadius: '50%',
                    background: accent,
                    border: template.accent === accent ? '3px solid var(--text)' : '3px solid transparent',
                  }}
                />
              ))}
            </div>
          </div>

          <div className="stack">
            <button
              className="btn btn--ghost btn--block"
              onClick={() => {
                const copy = duplicateTemplate(template.id);
                setSettingsOpen(false);
                if (copy) navigate(`/plan/${copy.id}`);
              }}
            >
              <IconCopy /> Duplizieren
            </button>
            <button
              className="btn btn--ghost btn--block"
              onClick={() => {
                updateTemplate(template.id, { archived: !template.archived, weekdays: [] });
                toast(template.archived ? 'Wieder aktiv' : 'Archiviert');
                setSettingsOpen(false);
              }}
            >
              {template.archived ? 'Aus Archiv holen' : 'Archivieren'}
            </button>
            <button className="btn btn--danger btn--block" onClick={() => setConfirmDelete(true)}>
              <IconTrash /> Workout löschen
            </button>
          </div>
        </div>
      </Sheet>

      <ConfirmSheet
        open={confirmDelete}
        title={`"${template.name}" löschen?`}
        text="Die Vorlage wird entfernt. Bereits absolvierte Workouts bleiben im Verlauf erhalten."
        onCancel={() => setConfirmDelete(false)}
        onConfirm={() => {
          deleteTemplate(template.id);
          navigate('/plan');
        }}
      />
    </main>
  );
}
