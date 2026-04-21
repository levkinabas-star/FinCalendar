import { useState } from 'react';
import { Plus, X, Check } from 'lucide-react';
import { useStore } from '../store';
import { translations } from '../translations';
import { Category } from '../types';

const QUICK_ICONS = [
  '🏷️','🎮','🎵','🐾','🌿','🚀','💆','🏋️',
  '🎨','🍷','🌍','🔧','🎯','💡','📦','🛠️',
  '🎪','🧴','🛁','🎁','🎲','🧩','🌸','🍕',
  '☕','🚲','⚡','🎓','🏖️','🎤','💈','🧸',
];

const QUICK_COLORS = [
  '#3B82F6','#8B5CF6','#EC4899','#10B981',
  '#F59E0B','#EF4444','#06B6D4','#F97316',
  '#6366F1','#84CC16','#A855F7','#94A3B8',
];

interface Props {
  selectedId: string;
  onChange: (id: string) => void;
  type: 'income' | 'expense' | 'both';
  error?: string;
}

export default function CategoryPicker({ selectedId, onChange, type, error }: Props) {
  const { language, categories, addCategory } = useStore();
  const t = translations[language];

  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState('');
  const [newIcon, setNewIcon] = useState('🏷️');
  const [newColor, setNewColor] = useState('#3B82F6');

  const filtered = categories.filter((c) => c.type === type || c.type === 'both');

  const handleCreate = () => {
    if (!newName.trim()) return;
    addCategory({
      name: newName.trim(),
      nameEn: newName.trim(),
      icon: newIcon,
      type,
      color: newColor,
    });
    // Find the newly created category (last added custom one matching name+type)
    // We'll select it after store update via useEffect-free approach: store is sync
    const store = useStore.getState();
    const created = store.categories.find(
      (c) => !c.isPreset && c.name === newName.trim() && c.type === type
    );
    if (created) onChange(created.id);
    setNewName('');
    setNewIcon('🏷️');
    setNewColor('#3B82F6');
    setShowCreate(false);
  };

  if (showCreate) {
    return (
      <div className="rounded-2xl p-4 space-y-3" style={{ background: '#131325', border: '1px solid #1E2A40' }}>
        {/* Header */}
        <div className="flex items-center justify-between">
          <p className="text-sm font-semibold text-slate-200">
            {language === 'ru' ? 'Новая категория' : 'New Category'}
          </p>
          <button
            onClick={() => setShowCreate(false)}
            className="w-7 h-7 rounded-lg flex items-center justify-center active-scale"
            style={{ background: '#1E1E38' }}
          >
            <X size={13} className="text-slate-400" />
          </button>
        </div>

        {/* Preview */}
        <div className="flex items-center gap-3 px-3 py-2 rounded-xl" style={{ background: '#1E1E38' }}>
          <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: `${newColor}25` }}>
            <span className="text-xl">{newIcon}</span>
          </div>
          <span className="text-sm font-medium text-slate-200">{newName || '—'}</span>
        </div>

        {/* Name input */}
        <input
          type="text"
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          placeholder={language === 'ru' ? 'Название категории...' : 'Category name...'}
          className="w-full px-3 py-2.5 text-sm"
          style={{ background: '#1E1E38', border: '1px solid #1E2A40', borderRadius: 10, color: '#F1F5F9' }}
          autoFocus
          onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
        />

        {/* Icon picker */}
        <div>
          <p className="text-[10px] text-slate-500 uppercase tracking-wide mb-1.5">{t.icon}</p>
          <div className="grid grid-cols-8 gap-1.5">
            {QUICK_ICONS.map((ic) => (
              <button
                key={ic}
                onClick={() => setNewIcon(ic)}
                className="w-9 h-9 rounded-lg flex items-center justify-center text-lg active-scale transition-all"
                style={{
                  background: newIcon === ic ? `${newColor}30` : '#1E1E38',
                  border: newIcon === ic ? `1.5px solid ${newColor}` : '1.5px solid transparent',
                }}
              >
                {ic}
              </button>
            ))}
          </div>
        </div>

        {/* Color picker */}
        <div>
          <p className="text-[10px] text-slate-500 uppercase tracking-wide mb-1.5">{t.color}</p>
          <div className="flex flex-wrap gap-2">
            {QUICK_COLORS.map((c) => (
              <button
                key={c}
                onClick={() => setNewColor(c)}
                className="w-8 h-8 rounded-xl active-scale flex items-center justify-center"
                style={{
                  background: c,
                  border: newColor === c ? '2.5px solid white' : '2.5px solid transparent',
                  boxShadow: newColor === c ? `0 0 8px ${c}88` : 'none',
                }}
              >
                {newColor === c && <Check size={12} color="white" strokeWidth={3} />}
              </button>
            ))}
          </div>
        </div>

        {/* Create button */}
        <button
          onClick={handleCreate}
          disabled={!newName.trim()}
          className="w-full py-2.5 rounded-xl text-sm font-semibold text-white active-scale disabled:opacity-40"
          style={{ background: `linear-gradient(135deg, ${newColor}, ${newColor}cc)` }}
        >
          {language === 'ru' ? 'Создать категорию' : 'Create Category'}
        </button>
      </div>
    );
  }

  return (
    <div>
      <div className="grid grid-cols-4 gap-2">
        {filtered.map((cat) => (
          <CategoryButton
            key={cat.id}
            cat={cat}
            selected={selectedId === cat.id}
            language={language}
            onClick={() => onChange(cat.id)}
          />
        ))}

        {/* Add new category button */}
        <button
          onClick={() => setShowCreate(true)}
          className="flex flex-col items-center gap-1 p-2.5 rounded-xl active-scale transition-all"
          style={{
            background: '#1E1E38',
            border: '1.5px dashed #334155',
          }}
        >
          <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: '#252540' }}>
            <Plus size={14} className="text-slate-400" />
          </div>
          <span className="text-[10px] text-slate-500 text-center leading-tight">
            {language === 'ru' ? 'Новая' : 'New'}
          </span>
        </button>
      </div>

      {error && <p className="text-red-400 text-xs mt-1">{error}</p>}
    </div>
  );
}

function CategoryButton({
  cat,
  selected,
  language,
  onClick,
}: {
  cat: Category;
  selected: boolean;
  language: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="flex flex-col items-center gap-1 p-2.5 rounded-xl active-scale transition-all"
      style={{
        background: selected ? `${cat.color}22` : '#1E1E38',
        border: selected ? `1.5px solid ${cat.color}` : '1.5px solid transparent',
      }}
    >
      <span className="text-xl">{cat.icon}</span>
      <span
        className="text-[10px] text-center leading-tight"
        style={{ color: selected ? cat.color : '#94A3B8' }}
      >
        {language === 'ru' ? cat.name : cat.nameEn}
      </span>
    </button>
  );
}
