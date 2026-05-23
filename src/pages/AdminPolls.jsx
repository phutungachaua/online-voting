import { Edit3, Plus, Save, Trash2, X } from 'lucide-react';
import { useMemo, useState } from 'react';
import EmptyState from '../components/EmptyState';
import Loading from '../components/Loading';
import { useToast } from '../components/ToastProvider';
import { useAuth } from '../hooks/useAuth';
import { usePolls } from '../hooks/usePolls';
import { createPoll, deletePoll, updatePoll } from '../services/pollService';

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

export default function AdminPolls() {
  const { user } = useAuth();
  const { toast } = useToast();
  const { polls, loading, error } = usePolls();
  const [form, setForm] = useState(createEmptyForm);
  const [editingId, setEditingId] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  const editingPoll = useMemo(() => polls.find((poll) => poll.id === editingId), [polls, editingId]);
  const isVotePoll = form.type === 'vote';

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
      await updatePoll(poll.id, {
        title: poll.title,
        description: poll.description,
        type,
        status: nextStatus,
        options: type === 'vote' ? (poll.options || []) : (poll.options?.length >= 2 ? poll.options : scorePlaceholderOptions),
        createdBy: poll.createdBy,
      });
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

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-slate-950">Quản trị poll</h1>
          <p className="mt-2 text-slate-500">Admin tạo poll dạng bình chọn hoặc chấm điểm. User chỉ gửi được một lần khi poll đang mở.</p>
        </div>
        <button
          type="button"
          onClick={openCreateModal}
          className="inline-flex items-center justify-center gap-2 rounded-full bg-brand-600 px-5 py-3 text-sm font-bold text-white shadow-md transition hover:bg-brand-700"
        >
          <Plus size={18} />
          Tạo bình chọn
        </button>
      </div>

      <section>
        {loading && <Loading />}
        {error && <div className="rounded-2xl bg-red-50 p-4 text-sm font-semibold text-red-700">{error}</div>}
        {!loading && !error && polls.length === 0 && <EmptyState title="Chưa có poll" description="Bấm Tạo bình chọn để tạo poll đầu tiên." />}
        {!loading && !error && polls.length > 0 && (
          <div className="space-y-4">
            {polls.map((poll) => (
              <div key={poll.id} className="rounded-3xl bg-white p-5 shadow-soft">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                  <div className="min-w-0">
                    <div className="mb-2 flex flex-wrap items-center gap-2">
                      <h3 className="text-lg font-black text-slate-950">{poll.title}</h3>
                      <span className={`rounded-full px-3 py-1 text-xs font-bold ${poll.status === 'active' ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>{poll.status === 'active' ? 'Đang mở' : 'Đã đóng'}</span>
                      <span className="rounded-full bg-brand-50 px-3 py-1 text-xs font-bold text-brand-700">{typeOptions.find((item) => item.value === (poll.type || 'vote'))?.label}</span>
                    </div>
                    <p className="line-clamp-2 text-sm text-slate-500">{poll.description}</p>
                    <p className="mt-2 text-xs font-semibold text-slate-400">{(poll.type || 'vote') === 'vote' ? `${poll.options?.length || 0} lựa chọn` : 'Chấm điểm một lần'}</p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button onClick={() => handleToggleStatus(poll)} className="rounded-full bg-slate-100 px-4 py-2 text-sm font-bold text-slate-700 hover:bg-slate-200">{poll.status === 'active' ? 'Đóng' : 'Mở'}</button>
                    <button onClick={() => startEdit(poll)} className="inline-flex items-center gap-2 rounded-full bg-brand-50 px-4 py-2 text-sm font-bold text-brand-700 hover:bg-brand-100"><Edit3 size={16} />Sửa</button>
                    <button onClick={() => handleDelete(poll)} className="inline-flex items-center gap-2 rounded-full bg-red-50 px-4 py-2 text-sm font-bold text-red-700 hover:bg-red-100"><Trash2 size={16} />Xóa</button>
                  </div>
                </div>
              </div>
            ))}
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
    </div>
  );
}
