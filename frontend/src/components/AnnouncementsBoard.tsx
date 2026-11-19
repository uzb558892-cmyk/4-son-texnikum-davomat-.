import { useMemo, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useAsync } from '../hooks/useAsync';
import { announcementsService } from '../services';
import type { Announcement, Role } from '../types';
import { ROLE_LABEL } from '../utils/constants';
import { errorMessage } from '../utils/format';
import Button from './Button';
import { Field, Input, Textarea } from './Fields';
import Modal from './Modal';
import { ErrorBox, Spinner, Toast } from './Feedback';

const INITIAL_VISIBLE = 5;

function formatTashkentDateTime(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return new Intl.DateTimeFormat('uz-UZ', {
    timeZone: 'Asia/Tashkent',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  }).format(d);
}

function roleLabel(role: string): string {
  return ROLE_LABEL[role as Role] ?? role;
}

export default function AnnouncementsBoard() {
  const { user } = useAuth();
  const { data, loading, error, reload } = useAsync(() => announcementsService.list(), []);

  const canWrite = !!user && (user.role === 'admin' || user.role === 'navbatchi' || user.role === 'group_leader');
  const canManageItem = (item: Announcement) => !!user && (user.role === 'admin' || item.author_id === user.id);

  const [expanded, setExpanded] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [files, setFiles] = useState<File[]>([]);
  const [submitting, setSubmitting] = useState(false);

  const [editing, setEditing] = useState<Announcement | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editBody, setEditBody] = useState('');
  const [keptUrls, setKeptUrls] = useState<string[]>([]);
  const [editFiles, setEditFiles] = useState<File[]>([]);
  const [updating, setUpdating] = useState(false);

  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [toast, setToast] = useState<{ m: string; t: 'ok' | 'err' } | null>(null);

  const notify = (m: string, t: 'ok' | 'err' = 'ok') => {
    setToast({ m, t });
    setTimeout(() => setToast(null), 2600);
  };

  const items = data ?? [];
  const visibleItems = useMemo(
    () => (expanded ? items : items.slice(0, INITIAL_VISIBLE)),
    [items, expanded]
  );
  const hiddenCount = Math.max(0, items.length - INITIAL_VISIBLE);

  function openCreate() {
    setTitle('');
    setBody('');
    setFiles([]);
    setCreateOpen(true);
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!user || !canWrite) return;
    setSubmitting(true);
    try {
      await announcementsService.create(user.id, { title, body, files });
      setCreateOpen(false);
      setTitle('');
      setBody('');
      setFiles([]);
      await reload();
      notify("E'lon joylandi");
    } catch (err) {
      notify(errorMessage(err), 'err');
    } finally {
      setSubmitting(false);
    }
  }

  function openEdit(item: Announcement) {
    setEditing(item);
    setEditTitle(item.title);
    setEditBody(item.body);
    setKeptUrls([...(item.image_urls ?? [])]);
    setEditFiles([]);
  }

  async function handleUpdate(e: React.FormEvent) {
    e.preventDefault();
    if (!user || !editing) return;
    setUpdating(true);
    try {
      await announcementsService.update(editing.id, user.id, {
        title: editTitle,
        body: editBody,
        existingImageUrls: keptUrls,
        newFiles: editFiles
      });
      setEditing(null);
      await reload();
      notify("E'lon yangilandi");
    } catch (err) {
      notify(errorMessage(err), 'err');
    } finally {
      setUpdating(false);
    }
  }

  async function handleDelete(item: Announcement) {
    if (!confirm(`"${item.title}" e'lonini o'chirishni tasdiqlaysizmi?`)) return;
    setDeletingId(item.id);
    try {
      await announcementsService.remove(item);
      await reload();
      notify("E'lon o'chirildi");
    } catch (err) {
      notify(errorMessage(err), 'err');
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <section className="mb-6 rounded-2xl border-2 border-amber-300 bg-gradient-to-br from-amber-50/90 via-white to-orange-50/60 p-4 shadow-sm sm:p-5">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3 border-b border-amber-200/80 pb-3">
        <div className="flex items-center gap-2.5">
          <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-amber-500 text-white shadow-sm">
            <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <path d="M11 5L6 9H2v6h4l5 4V5z" />
              <path d="M15.54 8.46a5 5 0 010 7.07" />
              <path d="M19.07 4.93a10 10 0 010 14.14" />
            </svg>
          </span>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold tracking-tight text-slate-900 sm:text-lg">E&apos;LONLAR TAXTASI</h2>
              <span className="rounded-full bg-amber-500 px-2.5 py-0.5 text-xs font-semibold text-white">
                {items.length}
              </span>
            </div>
            <p className="text-xs text-slate-600">Texnikum yangiliklari va muhim e&apos;lonlar</p>
          </div>
        </div>
        {canWrite && (
          <Button onClick={openCreate}>+ Yangi e&apos;lon</Button>
        )}
      </div>

      {error && <ErrorBox message={error} onRetry={reload} />}

      {loading && !data ? (
        <div className="py-4"><Spinner /></div>
      ) : visibleItems.length === 0 ? (
        <div className="rounded-xl border border-dashed border-amber-200 bg-white/80 px-4 py-6 text-center text-sm text-slate-500">
          Hozircha e&apos;lonlar yo&apos;q.
        </div>
      ) : (
        <div className="space-y-3">
          {visibleItems.map((item, idx) => (
            <article
              key={item.id}
              className={`rounded-xl border p-3.5 transition sm:p-4 ${
                idx === 0
                  ? 'border-amber-300 bg-white shadow-xs'
                  : 'border-slate-200/90 bg-white/95'
              }`}
            >
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    {idx === 0 && (
                      <span className="rounded-md bg-rose-100 px-2 py-0.5 text-[11px] font-bold uppercase text-rose-700">
                        Yangi
                      </span>
                    )}
                    <h3 className="text-sm font-bold text-slate-900 sm:text-base">{item.title}</h3>
                  </div>
                  <p className="mt-1.5 whitespace-pre-line text-sm leading-relaxed text-slate-700">{item.body}</p>
                </div>

                {canManageItem(item) && (
                  <div className="flex shrink-0 items-center gap-1.5">
                    <Button
                      variant="secondary"
                      className="px-2.5 py-1 text-xs"
                      onClick={() => openEdit(item)}
                    >
                      Tahrirlash
                    </Button>
                    <Button
                      variant="ghost"
                      className="px-2.5 py-1 text-xs text-red-600 hover:bg-red-50"
                      disabled={deletingId === item.id}
                      onClick={() => handleDelete(item)}
                    >
                      {deletingId === item.id ? "O'chirilmoqda..." : "O'chirish"}
                    </Button>
                  </div>
                )}
              </div>

              {Array.isArray(item.image_urls) && item.image_urls.length > 0 && (
                <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4">
                  {item.image_urls.map((url, i) => (
                    <button
                      key={`${item.id}-img-${i}`}
                      type="button"
                      onClick={() => setPreviewUrl(url)}
                      className="group relative aspect-video overflow-hidden rounded-lg border border-slate-200 bg-slate-100 focus:outline-none focus:ring-2 focus:ring-amber-400"
                    >
                      <img
                        src={url}
                        alt={`${item.title} — rasm ${i + 1}`}
                        loading="lazy"
                        className="h-full w-full object-cover transition duration-200 group-hover:scale-105"
                      />
                    </button>
                  ))}
                </div>
              )}

              <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 pt-2 text-xs text-slate-500">
                <span>
                  Muallif: <strong className="font-semibold text-slate-700">{item.author_name}</strong>{' '}
                  <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[11px] font-medium text-slate-600">
                    {roleLabel(item.author_role)}
                  </span>
                </span>
                <span>{formatTashkentDateTime(item.created_at)}</span>
              </div>
            </article>
          ))}
        </div>
      )}

      {!expanded && hiddenCount > 0 && (
        <div className="mt-4 flex justify-center">
          <Button variant="secondary" onClick={() => setExpanded(true)}>
            Yana {hiddenCount} ta e&apos;lonni ko&apos;rsatish
          </Button>
        </div>
      )}
      {expanded && items.length > INITIAL_VISIBLE && (
        <div className="mt-4 flex justify-center">
          <Button variant="ghost" onClick={() => setExpanded(false)}>
            Qisqartirish (so&apos;nggi {INITIAL_VISIBLE} ta)
          </Button>
        </div>
      )}

      {createOpen && (
        <Modal title="Yangi e'lon qo'shish" onClose={() => setCreateOpen(false)}>
          <form onSubmit={handleCreate} className="space-y-4">
            <Field label="Sarlavha">
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Masalan: Ertaga umumiy yig'ilish"
                required
              />
            </Field>
            <Field label="E'lon matni">
              <Textarea
                rows={4}
                value={body}
                onChange={(e) => setBody(e.target.value)}
                placeholder="E'lon mazmunini batafsil yozing..."
                required
              />
            </Field>
            <Field label="Rasmlar (ixtiyoriy, bir nechta tanlash mumkin, har biri max 5 MB)">
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif"
                multiple
                onChange={(e) => setFiles(Array.from(e.target.files ?? []))}
                className="block w-full text-xs text-slate-600 file:mr-3 file:rounded-lg file:border-0 file:bg-amber-100 file:px-3 file:py-2 file:text-xs file:font-semibold file:text-amber-900 hover:file:bg-amber-200"
              />
              {files.length > 0 && (
                <p className="mt-1 text-xs text-slate-600">
                  Tanlangan rasmlar: {files.map((f) => f.name).join(', ')}
                </p>
              )}
            </Field>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="secondary" onClick={() => setCreateOpen(false)}>
                Bekor qilish
              </Button>
              <Button type="submit" disabled={submitting}>
                {submitting ? 'Joylanmoqda...' : "E'lonni joylash"}
              </Button>
            </div>
          </form>
        </Modal>
      )}

      {editing && (
        <Modal title="E'lonni tahrirlash" onClose={() => setEditing(null)}>
          <form onSubmit={handleUpdate} className="space-y-4">
            <Field label="Sarlavha">
              <Input
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                required
              />
            </Field>
            <Field label="E'lon matni">
              <Textarea
                rows={4}
                value={editBody}
                onChange={(e) => setEditBody(e.target.value)}
                required
              />
            </Field>
            {keptUrls.length > 0 && (
              <div>
                <p className="mb-1.5 text-xs font-medium text-slate-700">Mavjud rasmlar</p>
                <div className="grid grid-cols-3 gap-2">
                  {keptUrls.map((url, i) => (
                    <div key={`kept-${i}`} className="relative overflow-hidden rounded-lg border border-slate-200">
                      <img src={url} alt={`Rasm ${i + 1}`} className="h-20 w-full object-cover" />
                      <button
                        type="button"
                        onClick={() => setKeptUrls((prev) => prev.filter((_, idx) => idx !== i))}
                        className="absolute right-1 top-1 rounded bg-red-600 px-1.5 py-0.5 text-[10px] font-bold text-white"
                      >
                        X
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
            <Field label="Yangi rasm qo'shish (ixtiyoriy)">
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif"
                multiple
                onChange={(e) => setEditFiles(Array.from(e.target.files ?? []))}
                className="block w-full text-xs text-slate-600 file:mr-3 file:rounded-lg file:border-0 file:bg-amber-100 file:px-3 file:py-2 file:text-xs file:font-semibold file:text-amber-900 hover:file:bg-amber-200"
              />
            </Field>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="secondary" onClick={() => setEditing(null)}>
                Bekor qilish
              </Button>
              <Button type="submit" disabled={updating}>
                {updating ? 'Saqlanmoqda...' : 'Saqlash'}
              </Button>
            </div>
          </form>
        </Modal>
      )}

      {previewUrl && (
        <Modal title="Rasm ko'rinishi" onClose={() => setPreviewUrl(null)}>
          <div className="flex flex-col items-center gap-3">
            <img src={previewUrl} alt="Kattalashtirilgan rasm" className="max-h-[70vh] w-auto rounded-lg object-contain" />
            <a
              href={previewUrl}
              target="_blank"
              rel="noreferrer"
              className="text-xs font-medium text-blue-600 underline"
            >
              Asl hajmda yangi oynada ochish
            </a>
          </div>
        </Modal>
      )}

      {toast && <Toast message={toast.m} tone={toast.t} />}
    </section>
  );
}
