import { ChevronDown, X } from 'lucide-react'
import { useEffect, useId, useMemo, useRef, useState } from 'react'
import { cx } from './ui'

export interface Option {
  value: string
  label: string
  code?: string
  hint?: string
  group?: string
}

const normalize = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()

export function SearchSelect({ name, options, value, onChange, placeholder = 'Digite para buscar', invalid, disabled, emptyText = 'Nada encontrado.', limit = 60 }: {
  name?: string
  options: Option[]
  value: string
  onChange: (value: string, option: Option | null) => void
  placeholder?: string
  invalid?: boolean
  disabled?: boolean
  emptyText?: string
  limit?: number
}) {
  const listId = useId()
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)
  const [active, setActive] = useState(0)
  const box = useRef<HTMLDivElement>(null)
  const selected = options.find((o) => o.value === value) ?? null

  const filtered = useMemo(() => {
    const terms = normalize(query).split(/\s+/).filter(Boolean)
    const matches = terms.length === 0 ? options : options.filter((o) => {
      const text = normalize(`${o.label} ${o.code ?? ''} ${o.hint ?? ''} ${o.group ?? ''}`)
      return terms.every((t) => text.includes(t))
    })
    const q = normalize(query).trim()
    if (q) {
      matches.sort((a, b) => Number(normalize(b.code ?? '') === q) - Number(normalize(a.code ?? '') === q)
        || Number(normalize(b.label).startsWith(q)) - Number(normalize(a.label).startsWith(q)))
    }
    return matches.slice(0, limit)
  }, [options, query, limit])

  useEffect(() => { setActive(0) }, [query, open])
  useEffect(() => {
    const close = (e: MouseEvent) => { if (box.current && !box.current.contains(e.target as Node)) { setOpen(false); setQuery('') } }
    document.addEventListener('mousedown', close)
    return () => document.removeEventListener('mousedown', close)
  }, [])

  const choose = (o: Option) => { onChange(o.value, o); setOpen(false); setQuery('') }

  return (
    <div ref={box} className="relative">
      <input
        id={name} name={name} autoComplete="off" disabled={disabled} aria-invalid={invalid || undefined}
        role="combobox" aria-expanded={open} aria-controls={listId} aria-autocomplete="list"
        className={cx('field-input pr-16', selected && !open && 'font-medium')}
        placeholder={selected ? '' : placeholder}
        value={open ? query : selected ? `${selected.code ? `${selected.code} · ` : ''}${selected.label}` : ''}
        onFocus={() => setOpen(true)}
        onChange={(e) => { setQuery(e.target.value); setOpen(true) }}
        onKeyDown={(e) => {
          if (e.key === 'ArrowDown') { e.preventDefault(); setOpen(true); setActive((a) => Math.min(a + 1, filtered.length - 1)) }
          if (e.key === 'ArrowUp') { e.preventDefault(); setActive((a) => Math.max(a - 1, 0)) }
          if (e.key === 'Enter' && open && filtered[active]) { e.preventDefault(); choose(filtered[active]) }
          if (e.key === 'Escape') { setOpen(false); setQuery('') }
        }}
      />
      <span className="pointer-events-none absolute top-0 right-2 flex h-full items-center gap-1 text-faint">
        {selected && !disabled && (
          <button type="button" className="pointer-events-auto rounded p-1 hover:bg-raised" aria-label="Limpar escolha"
            onMouseDown={(e) => { e.preventDefault(); onChange('', null); setQuery('') }}>
            <X className="size-3.5" />
          </button>
        )}
        <ChevronDown className="size-4" />
      </span>
      {open && !disabled && (
        <ul id={listId} role="listbox" className="absolute z-30 mt-1 max-h-80 w-full overflow-auto rounded-[var(--radius-card)] border border-line bg-surface p-1 shadow-xl">
          {filtered.length === 0 && <li className="px-3 py-3 text-muted">{emptyText}</li>}
          {filtered.map((o, i) => (
            <li key={o.value} role="option" aria-selected={o.value === value}
              onMouseDown={(e) => { e.preventDefault(); choose(o) }} onMouseEnter={() => setActive(i)}
              className={cx('cursor-pointer rounded-lg px-3 py-2', i === active ? 'bg-brand-50' : o.value === value ? 'bg-raised' : '')}>
              <span className="flex items-baseline gap-2">
                {o.code && <span className="num shrink-0 text-[12px] font-medium text-brand-700">{o.code}</span>}
                <span className="font-medium">{o.label}</span>
              </span>
              {(o.hint || o.group) && <span className="block text-[12px] text-muted">{[o.group, o.hint].filter(Boolean).join(' · ')}</span>}
            </li>
          ))}
          {filtered.length === limit && <li className="px-3 py-2 text-[12px] text-faint">Mostrando os primeiros {limit}. Digite mais para refinar.</li>}
        </ul>
      )}
    </div>
  )
}
