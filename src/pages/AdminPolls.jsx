import { BarChart3, GripVertical, Edit3, Plus, RotateCcw, Save, Trash2, Users, X } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import EmptyState from '../components/EmptyState';
import Loading from '../components/Loading';
import { useToast } from '../components/ToastProvider';
import { useAuth } from '../hooks/useAuth';
import { usePolls } from '../hooks/usePolls';
import { createPoll, deletePoll, updatePoll, updatePollOrder } from '../services/pollService';
import { resetPollVotes } from '../services/voteService';

const createEmptyForm = () => ({
  title: '',
  description: '',
  type: 'vote',
  status: 'active',
  options: [
    { id: 'option-1', text: '' },
    { id: 'option-2', text: '' },
  ],
});

const typeOptions = [
  { value: 'vote', label: 'Bình chọn' },
  { value: 'score10', label: 'Chấm điểm thang 10' },
  { value: 'score100', label: 'Chấm điểm thang 100' },
];

const scorePlaceholderOptions = [
  { id: 'score-placeholder-min', text: 'Score placeholder min' },
  { id: 'score-placeholder-max', text: 'Score placeholder max' },
];

const makeOptionId = () => `option-${Date.now()}-${Math.random().toString(16).slice(2)}`;
const makeScoreEntryId = () => `score-${Date.now()}-${Math.random().toString(16).slice(2)}`;
const createEmptyScoreEntry = () => ({ id: makeScoreEntryId(), score: '' });

const getTypeLabel = (type) => typeOptions.find((item) => item.value === (type || 'vote'))?.label || 'Bình chọn';

const normalizeScoreEntriesForForm = (items = []) => (
  items.length
    ? items.map((item) => ({
      id: item.id || makeScoreEntryId(),
      score: item.score ?? '',
    }))
    : [createEmptyScoreEntry()]
);

const normalizeScoreEntriesForSave = (items = [], prefix = 'BGK') => (
  items
    .map((item, index) => ({
      id: item.id || makeScoreEntryId(),
      name: `${prefix}${index + 1}`,
      score: Number(item.score),
    }))
    .filter((item) => Number.isFinite(item.score))
);

export default function AdminPolls() {
  const { user } = useAuth();
  const { toast } = useToast();
  const { polls, loading, error } = usePolls();
  const [form, setForm] = useState(createEmptyForm);
  const [editingId, setEditingId] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [scoreModalPoll, setScoreModalPoll] = useState(null);
  const [scoreTab, setScoreTab] = useState('bgk');
  const [manualScores, setManualScores] = useState({ bgk: [createEmptyScoreEntry()], km: [createEmptyScoreEntry()] });
  const [scoreSaving, setScoreSaving] = useState(false);
  const [localPolls, setLocalPolls] = useState([]);
  const [draggedPollId, setDraggedPollId] = useState(null);
  const [reordering, setReordering] = useState(false);

  const editingPoll = useMemo(() => polls.find((poll) => poll.id === editingId), [polls, editingId]);
  const isVotePoll = form.type === 'vote';
  const summaryStats = useMemo(() => ([
    { label: 'Tổng bình chọn', value: polls.length },
    { label: 'Đang mở', value: polls.filter((poll) => poll.status === 'active').length },
    { label: 'Đã đóng', value: polls.filter((poll) => poll.status === 'closed').length },
    { label: 'Có điểm BGK/KM', value: polls.filter((poll) => (poll.bgkScores?.length || 0) + (poll.kmScores?.length || 0) > 0).length },
  ]), [polls]);

  useEffect(() => {
    setLocalPolls(polls);
  }, [polls]);

  const openCreateModal = () => {
    setForm(createEmptyForm());
    setEditingId(null);
    setModalOpen(true);
  };

  const closeModal = () => {
    if (saving) return;
    setModalOpen(false);
    setForm(createEmptyForm());
    setEditingId(null);
  };

  const openScoreModal = (poll) => {
    setScoreModalPoll(poll);
    setScoreTab('bgk');
    setManualScores({
      bgk: normalizeScoreEntriesForForm(poll.bgkScores),
      km: normalizeScoreEntriesForForm(poll.kmScores),
    });
  };

  const closeScoreModal = () => {
    if (scoreSaving) return;
    setScoreModalPoll(null);
    setScoreTab('bgk');
    setManualScores({ bgk: [createEmptyScoreEntry()], km: [createEmptyScoreEntry()] });
  };

  const startEdit = (poll) => {
    setEditingId(poll.id);
    setForm({
      title: poll.title || '',
      description: poll.description || '',
      type: poll.type || 'vote',
      status: poll.status || 'active',
      options: poll.options?.length ? poll.options : createEmptyForm().options,
    });
    setModalOpen(true);
  };

  const setOptionText = (id, text) => {
    setForm((current) => ({
      ...current,
      options: current.options.map((option) => option.id === id ? { ...option, text } : option),
    }));
  };

  const addOption = () => {
    setForm((current) => ({ ...current, options: [...current.options, { id: makeOptionId(), text: '' }] }));
  };

  const removeOption = (id) => {
    setForm((current) => ({ ...current, options: current.options.filter((option) => option.id !== id) }));
  };

  const setScoreEntryValue = (group, id, field, value) => {
    setManualScores((current) => ({
      ...current,
      [group]: current[group].map((item) => item.id === id ? { ...item, [field]: value } : item),
    }));
  };

  const addScoreEntry = (group) => {
    setManualScores((current) => ({
      ...current,
      [group]: [...current[group], createEmptyScoreEntry()],
    }));
  };

  const removeScoreEntry = (group, id) => {
    setManualScores((current) => {
      const nextRows = current[group].filter((item) => item.id !== id);
      return { ...current, [group]: nextRows.length ? nextRows : [createEmptyScoreEntry()] };
    });
  };

  const handleDragStart = (event, pollId) => {
    setDraggedPollId(pollId);
    event.dataTransfer.effectAllowed = 'move';
    event.dataTransfer.setData('text/plain', pollId);
  };

  const handleDropPoll = async (targetPollId) => {
    if (!draggedPollId || draggedPollId === targetPollId || reordering) {
      setDraggedPollId(null);
      return;
    }

    const fromIndex = localPolls.findIndex((poll) => poll.id === draggedPollId);
    const toIndex = localPolls.findIndex((poll) => poll.id === targetPollId);
    if (fromIndex < 0 || toIndex < 0) {
      setDraggedPollId(null);
      return;
    }

    const nextPolls = [...localPolls];
    const [movedPoll] = nextPolls.splice(fromIndex, 1);
    nextPolls.splice(toIndex, 0, movedPoll);
    setLocalPolls(nextPolls);
    setDraggedPollId(null);
    setReordering(true);

    try {
      await updatePollOrder(nextPolls);
      toast({ title: 'Đã lưu thứ tự bình chọn', message: 'Người dùng sẽ thấy thứ tự mới theo realtime.' });
    } catch (err) {
      setLocalPolls(polls);
      toast({ type: 'error', title: 'Không thể lưu thứ tự', message: err.message });
    } finally {
      setReordering(false);
    }
  };

  const buildPollPayload = (sourcePoll = null) => {
    const validOptions = isVotePoll ? form.options.filter((option) => option.text.trim()) : [];
    return {
      title: form.title,
      description: form.description,
      type: form.type,
      status: form.status,
      options: validOptions,
      createdBy: sourcePoll?.createdBy || user.uid,
    };
  };

  const buildExistingPollPayload = (poll, extra = {}) => {
    const type = poll.type || 'vote';
    return {
      title: poll.title,
      description: poll.description,
      type,
      status: poll.status || 'active',
      options: type === 'vote' ? (poll.options || []) : (poll.options?.length >= 2 ? poll.options : scorePlaceholderOptions),
      createdBy: poll.createdBy,
      ...extra,
    };
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    const validOptions = form.options.filter((option) => option.text.trim());

    if (!form.title.trim()) {
      toast({ type: 'error', title: 'Thiếu tiêu đề', message: 'Poll cần có tiêu đề.' });
      return;
    }

    if (isVotePoll && validOptions.length < 2) {
      toast({ type: 'error', title: 'Thiếu lựa chọn', message: 'Poll bình chọn cần ít nhất 2 lựa chọn.' });
      return;
    }

    setSaving(true);
    try {
      if (editingId) {
        await updatePoll(editingId, buildPollPayload(editingPoll));
        toast({ title: 'Đã cập nhật poll', message: form.title });
      } else {
        await createPoll(buildPollPayload());
        toast({ title: 'Đã tạo poll mới', message: form.title });
      }
      closeModal();
    } catch (err) {
      toast({ type: 'error', title: 'Không thể lưu poll', message: err.message });
    } finally {
      setSaving(false);
    }
  };

  const handleToggleStatus = async (poll) => {
    const type = poll.type || 'vote';
    const nextStatus = poll.status === 'active' ? 'closed' : 'active';

    try {
      await updatePoll(poll.id, buildExistingPollPayload(poll, { status: nextStatus }));
      toast({ title: nextStatus === 'closed' ? 'Đã đóng poll' : 'Đã mở poll', message: poll.title });
    } catch (err) {
      toast({ type: 'error', title: 'Không thể đổi trạng thái', message: err.message });
    }
  };

  const handleDelete = async (poll) => {
    const ok = window.confirm(`Xóa poll "${poll.title}"?`);
    if (!ok) return;

    try {
      await deletePoll(poll.id);
      toast({ title: 'Đã xóa poll', message: poll.title });
    } catch (err) {
      toast({ type: 'error', title: 'Không thể xóa poll', message: err.message });
    }
  };

  const handleResetVotes = async (poll) => {
    const ok = window.confirm(`Reset toàn bộ bình chọn/chấm điểm của poll "${poll.title}"? Poll sẽ trở về trạng thái chưa có lượt gửi nào.`);
    if (!ok) return;

    try {
      const deletedCount = await resetPollVotes(poll.id);
      toast({ title: 'Đã reset bình chọn', message: `Đã xóa ${deletedCount} lượt gửi của "${poll.title}".` });
    } catch (err) {
      toast({ type: 'error', title: 'Không thể reset bình chọn', message: err.message });
    }
  };

  const handleSaveManualScores = async (event) => {
    event.preventDefault();
    if (!scoreModalPoll) return;

    const bgkScores = normalizeScoreEntriesForSave(manualScores.bgk, 'BGK');
    const kmScores = normalizeScoreEntriesForSave(manualScores.km, 'KM');
    const hasInvalidRow = [...manualScores.bgk, ...manualScores.km].some((item) => {
      const hasScore = String(item.score ?? '').trim().length > 0;
      if (!hasScore) return false;
      return !Number.isFinite(Number(item.score)) || Number(item.score) < 0;
    });

    if (hasInvalidRow) {
      toast({ type: 'error', title: 'Điểm chưa hợp lệ', message: 'Mỗi dòng cần có số điểm từ 0 trở lên.' });
      return;
    }

    setScoreSaving(true);
    try {
      await updatePoll(scoreModalPoll.id, buildExistingPollPayload(scoreModalPoll, { bgkScores, kmScores }));
      toast({ title: 'Đã lưu điểm BGK/KM', message: scoreModalPoll.title });
      closeScoreModal();
    } catch (err) {
      toast({ type: 'error', title: 'Không thể lưu điểm', message: err.message });
    } finally {
      setScoreSaving(false);
    }
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-6 overflow-hidden rounded-[2rem] bg-gradient-to-br from-slate-950 via-slate-900 to-brand-900 p-6 text-white shadow-soft sm:p-8">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="mb-3 w-fit rounded-full bg-white/10 px-3 py-1 text-xs font-black uppercase tracking-wide text-cyan-100">Admin dashboard</p>
            <h1 className="text-3xl font-black tracking-tight sm:text-4xl">Quản trị bình chọn</h1>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-200 sm:text-base">
              Tạo tiết mục, đóng/mở bình chọn, nhập điểm BGK/KM và reset lượt gửi trong một màn hình gọn.
            </p>
          </div>
          <button
            type="button"
            onClick={openCreateModal}
            className="inline-flex items-center justify-center gap-2 rounded-full bg-white px-5 py-3 text-sm font-black text-slate-950 shadow-md transition hover:bg-cyan-50"
          >
            <Plus size={18} />
            Tạo bình chọn
          </button>
        </div>

        <div className="mt-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
          {summaryStats.map((item) => (
            <div key={item.label} className="rounded-2xl border border-white/10 bg-white/10 p-4 backdrop-blur">
              <div className="text-2xl font-black">{item.value}</div>
              <div className="mt-1 text-xs font-bold uppercase tracking-wide text-slate-200">{item.label}</div>
            </div>
          ))}
        </div>
      </div>

      <section className="rounded-[2rem] border border-slate-100 bg-white/80 p-4 shadow-soft sm:p-5">
        <div className="mb-5 flex flex-col gap-2 border-b border-slate-100 pb-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-xl font-black text-slate-950">Danh sách bình chọn</h2>
            <p className="text-sm font-medium text-slate-500">Kéo biểu tượng tay nắm để đổi thứ tự hiển thị cho người dùng.</p>
          </div>
          {reordering && <span className="rounded-full bg-amber-50 px-3 py-1 text-xs font-black text-amber-700">Đang lưu thứ tự...</span>}
        </div>

        {loading && <Loading />}
        {error && <div className="rounded-2xl bg-red-50 p-4 text-sm font-semibold text-red-700">{error}</div>}
        {!loading && !error && polls.length === 0 && <EmptyState title="Chưa có poll" description="Bấm Tạo bình chọn để tạo poll đầu tiên." />}

        {!loading && !error && polls.length > 0 && (
          <div className="space-y-3">
            {localPolls.map((poll, index) => {
              const type = poll.type || 'vote';
              const bgkCount = poll.bgkScores?.length || 0;
              const kmCount = poll.kmScores?.length || 0;

              return (
                <article
                  key={poll.id}
                  onDragOver={(event) => event.preventDefault()}
                  onDrop={() => handleDropPoll(poll.id)}
                  className={`rounded-3xl border bg-white p-4 shadow-sm transition hover:border-brand-100 hover:shadow-soft ${draggedPollId === poll.id ? 'border-brand-300 opacity-60' : 'border-slate-100'}`}
                >
                  <div className="grid gap-4 xl:grid-cols-[1fr_auto] xl:items-center">
                    <div className="flex min-w-0 gap-3">
                      <button
                        type="button"
                        draggable
                        onDragStart={(event) => handleDragStart(event, poll.id)}
                        onDragEnd={() => setDraggedPollId(null)}
                        className="mt-1 flex h-10 w-10 shrink-0 cursor-grab items-center justify-center rounded-2xl bg-slate-50 text-slate-400 transition hover:bg-brand-50 hover:text-brand-700 active:cursor-grabbing"
                        title="Kéo để đổi vị trí"
                      >
                        <GripVertical size={18} />
                      </button>
                      <div className="min-w-0 flex-1">
                      <div className="mb-3 flex flex-wrap items-center gap-2">
                        <span className="rounded-full bg-slate-950 px-3 py-1 text-xs font-black text-white">#{index + 1}</span>
                        <span className={`rounded-full px-3 py-1 text-xs font-black ${poll.status === 'active' ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>
                          {poll.status === 'active' ? 'Đang mở' : 'Đã đóng'}
                        </span>
                        <span className="rounded-full bg-brand-50 px-3 py-1 text-xs font-black text-brand-700">{getTypeLabel(type)}</span>
                        {(bgkCount + kmCount > 0) && (
                          <span className="rounded-full bg-cyan-50 px-3 py-1 text-xs font-black text-cyan-700">
                            BGK {bgkCount} · KM {kmCount}
                          </span>
                        )}
                      </div>
                      <h3 className="line-clamp-2 text-lg font-black leading-6 text-slate-950">{poll.title}</h3>
                      {poll.description && <p className="mt-2 line-clamp-2 text-sm leading-6 text-slate-500">{poll.description}</p>}
                      <div className="mt-3 flex flex-wrap gap-2 text-xs font-bold text-slate-500">
                        <span className="inline-flex items-center gap-1 rounded-full bg-slate-50 px-3 py-1.5">
                          <BarChart3 size={14} />
                          {type === 'vote' ? `${poll.options?.length || 0} lựa chọn` : 'Chấm điểm một lần'}
                        </span>
                      </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap sm:justify-end">
                      <button onClick={() => handleToggleStatus(poll)} className="rounded-2xl bg-slate-100 px-4 py-2.5 text-sm font-black text-slate-700 transition hover:bg-slate-200">
                        {poll.status === 'active' ? 'Đóng' : 'Mở'}
                      </button>
                      <button onClick={() => openScoreModal(poll)} className="inline-flex items-center justify-center gap-2 rounded-2xl bg-cyan-50 px-4 py-2.5 text-sm font-black text-cyan-700 transition hover:bg-cyan-100">
                        <Users size={16} />
                        BGK/KM
                      </button>
                      <button onClick={() => handleResetVotes(poll)} className="inline-flex items-center justify-center gap-2 rounded-2xl bg-amber-50 px-4 py-2.5 text-sm font-black text-amber-700 transition hover:bg-amber-100">
                        <RotateCcw size={16} />
                        Reset
                      </button>
                      <button onClick={() => startEdit(poll)} className="inline-flex items-center justify-center gap-2 rounded-2xl bg-brand-50 px-4 py-2.5 text-sm font-black text-brand-700 transition hover:bg-brand-100">
                        <Edit3 size={16} />
                        Sửa
                      </button>
                      <button onClick={() => handleDelete(poll)} className="inline-flex items-center justify-center gap-2 rounded-2xl bg-red-50 px-4 py-2.5 text-sm font-black text-red-700 transition hover:bg-red-100 sm:col-span-1">
                        <Trash2 size={16} />
                        Xóa
                      </button>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>

      {modalOpen && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-950/40 px-4 py-6 backdrop-blur-sm">
          <div className="max-h-[92vh] w-full max-w-xl overflow-y-auto rounded-[2rem] bg-white p-6 shadow-glow">
            <div className="mb-5 flex items-center justify-between gap-4">
              <div>
                <h2 className="text-xl font-black text-slate-950">{editingId ? 'Sửa poll' : 'Tạo bình chọn'}</h2>
                {editingPoll && <p className="mt-1 text-sm text-slate-500">Đang sửa: {editingPoll.title}</p>}
              </div>
              <button type="button" onClick={closeModal} className="rounded-full p-2 text-slate-500 hover:bg-slate-100"><X size={20} /></button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="mb-2 block text-sm font-bold text-slate-700">Tiêu đề</label>
                <input value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} className="w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none focus:border-brand-500 focus:ring-4 focus:ring-brand-100" />
              </div>
              <div>
                <label className="mb-2 block text-sm font-bold text-slate-700">Mô tả</label>
                <textarea rows="4" value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} className="w-full resize-none rounded-2xl border border-slate-200 px-4 py-3 outline-none focus:border-brand-500 focus:ring-4 focus:ring-brand-100" />
              </div>
              <div>
                <label className="mb-2 block text-sm font-bold text-slate-700">Loại poll</label>
                <select value={form.type} onChange={(event) => setForm({ ...form, type: event.target.value })} className="w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none focus:border-brand-500 focus:ring-4 focus:ring-brand-100">
                  {typeOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                </select>
              </div>
              <div>
                <label className="mb-2 block text-sm font-bold text-slate-700">Trạng thái</label>
                <select value={form.status} onChange={(event) => setForm({ ...form, status: event.target.value })} className="w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none focus:border-brand-500 focus:ring-4 focus:ring-brand-100">
                  <option value="active">Đang mở</option>
                  <option value="closed">Đã đóng</option>
                </select>
              </div>

              {isVotePoll && (
                <div>
                  <div className="mb-2 flex items-center justify-between">
                    <label className="text-sm font-bold text-slate-700">Lựa chọn</label>
                    <button type="button" onClick={addOption} className="inline-flex items-center gap-1 rounded-full bg-brand-50 px-3 py-1.5 text-xs font-bold text-brand-700 hover:bg-brand-100"><Plus size={14} />Thêm</button>
                  </div>
                  <div className="space-y-2">
                    {form.options.map((option, index) => (
                      <div key={option.id} className="flex gap-2">
                        <input value={option.text} onChange={(event) => setOptionText(option.id, event.target.value)} placeholder={`Lựa chọn ${index + 1}`} className="min-w-0 flex-1 rounded-2xl border border-slate-200 px-4 py-3 outline-none focus:border-brand-500 focus:ring-4 focus:ring-brand-100" />
                        <button type="button" disabled={form.options.length <= 2} onClick={() => removeOption(option.id)} className="rounded-2xl border border-slate-200 px-3 text-slate-500 hover:bg-red-50 hover:text-red-600 disabled:cursor-not-allowed disabled:opacity-40"><Trash2 size={17} /></button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex flex-col-reverse gap-3 pt-2 sm:flex-row sm:justify-end">
                <button type="button" onClick={closeModal} className="rounded-2xl bg-slate-100 px-5 py-3 font-bold text-slate-700 transition hover:bg-slate-200">Hủy</button>
                <button disabled={saving} className="inline-flex items-center justify-center gap-2 rounded-2xl bg-slate-950 px-5 py-3 font-bold text-white transition hover:bg-brand-700 disabled:opacity-70">
                  <Save size={18} /> {saving ? 'Đang lưu...' : editingId ? 'Lưu thay đổi' : 'Tạo poll'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {scoreModalPoll && (
        <div className="fixed inset-0 z-[72] flex items-center justify-center bg-slate-950/40 px-4 py-6 backdrop-blur-sm">
          <div className="max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-[2rem] bg-white p-6 shadow-glow">
            <div className="mb-5 flex items-start justify-between gap-4">
              <div>
                <h2 className="text-xl font-black text-slate-950">Nhập điểm BGK, KM</h2>
                <p className="mt-1 text-sm text-slate-500">{scoreModalPoll.title}</p>
              </div>
              <button type="button" onClick={closeScoreModal} className="rounded-full p-2 text-slate-500 hover:bg-slate-100"><X size={20} /></button>
            </div>

            <div className="mb-5 grid grid-cols-2 gap-2 rounded-2xl bg-slate-100 p-1">
              {[
                { id: 'bgk', label: 'BGK' },
                { id: 'km', label: 'KM' },
              ].map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setScoreTab(tab.id)}
                  className={`rounded-xl px-4 py-2.5 text-sm font-black transition ${scoreTab === tab.id ? 'bg-white text-brand-700 shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            <form onSubmit={handleSaveManualScores} className="space-y-4">
              <div className="space-y-3">
                {manualScores[scoreTab].map((entry, index) => (
                  <div key={entry.id} className="grid gap-2 rounded-2xl border border-slate-100 bg-slate-50 p-3 sm:grid-cols-[1fr_160px_auto] sm:items-center">
                    <div className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-black text-slate-700">
                      {scoreTab === 'bgk' ? `BGK${index + 1}` : `KM${index + 1}`}
                    </div>
                    <input
                      type="number"
                      min="0"
                      step="0.1"
                      value={entry.score}
                      onChange={(event) => setScoreEntryValue(scoreTab, entry.id, 'score', event.target.value)}
                      placeholder="Số điểm"
                      className="min-w-0 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-brand-500 focus:ring-4 focus:ring-brand-100"
                    />
                    <button
                      type="button"
                      onClick={() => removeScoreEntry(scoreTab, entry.id)}
                      className="inline-flex items-center justify-center rounded-xl border border-slate-200 bg-white px-3 py-3 text-slate-500 hover:bg-red-50 hover:text-red-600"
                      aria-label="Xóa dòng điểm"
                    >
                      <Trash2 size={17} />
                    </button>
                  </div>
                ))}
              </div>

              <button
                type="button"
                onClick={() => addScoreEntry(scoreTab)}
                className="inline-flex items-center gap-2 rounded-full bg-brand-50 px-4 py-2 text-sm font-bold text-brand-700 hover:bg-brand-100"
              >
                <Plus size={16} />
                Thêm dòng {scoreTab === 'bgk' ? 'BGK' : 'KM'}
              </button>

              <div className="flex flex-col-reverse gap-3 border-t border-slate-100 pt-4 sm:flex-row sm:justify-end">
                <button type="button" onClick={closeScoreModal} className="rounded-2xl bg-slate-100 px-5 py-3 font-bold text-slate-700 transition hover:bg-slate-200">Hủy</button>
                <button disabled={scoreSaving} className="inline-flex items-center justify-center gap-2 rounded-2xl bg-slate-950 px-5 py-3 font-bold text-white transition hover:bg-brand-700 disabled:opacity-70">
                  <Save size={18} />
                  {scoreSaving ? 'Đang lưu...' : 'Lưu điểm'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
