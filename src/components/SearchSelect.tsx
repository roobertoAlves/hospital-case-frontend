import { ChevronDown, X } from 'lucide-react'
import { useCallback, useEffect, useId, useLayoutEffect, useMemo, useRef, useState, type ReactNode, type RefObject } from 'react'
import { createPortal } from 'react-dom'
import { cx } from './ui'

export interface Option {
  value: string
  label: string
  code?: string
  hint?: string
  group?: string
}

const normalize = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()

const MAX_HEIGHT = 320
const GAP = 4

function useAnchor(anchor: RefObject<HTMLElement | null>, open: boolean) {
  const [box, setBox] = useState<{ left: number; width: number; top?: number; bottom?: number; maxHeight: number } | null>(null)
  const place = useCallback(() => {
    const el = anchor.current
    if (!el) return
    const r = el.getBoundingClientRect()
    const below = window.innerHeight - r.bottom - GAP - 8
    const above = r.top - GAP - 8
    const up = below < 180 && above > below
    setBox(up
      ? { left: r.left, width: r.width, bottom: window.innerHeight - r.top + GAP, maxHeight: Math.min(MAX_HEIGHT, above) }
      : { left: r.left, width: r.width, top: r.bottom + GAP, maxHeight: Math.min(MAX_HEIGHT, below) })
  }, [anchor])
  useLayoutEffect(() => {
    if (!open) return
    place()
    window.addEventListener('resize', place)
    window.addEventListener('scroll', place, true)
    return () => { window.removeEventListener('resize', place); window.removeEventListener('scroll', place, true) }
  }, [open, place])
  return box
}

function Popup({ anchor, open, id, children, listRef }: { anchor: RefObject<HTMLElement | null>; open: boolean; id: string; children: ReactNode; listRef: RefObject<HTMLUListElement | null> }) {
  const box = useAnchor(anchor, open)
  if (!open || !box) return null
  return createPortal(
    <ul ref={listRef} id={id} role="listbox" style={{ position: 'fixed', left: box.left, width: box.width, top: box.top, bottom: box.bottom, maxHeight: box.maxHeight }}
      className="z-[60] overflow-auto rounded-[var(--radius-card)] border border-line bg-surface p-1 shadow-xl">
      {children}
    </ul>,
    document.body,
  )
}

function useOutside(refs: RefObject<HTMLElement | null>[], onOutside: () => void) {
  useEffect(() => {
    const close = (e: MouseEvent) => { if (!refs.some((r) => r.current?.contains(e.target as Node))) onOutside() }
    document.addEventListener('mousedown', close)
    return () => document.removeEventListener('mousedown', close)
  })
}

function scrollActive(list: RefObject<HTMLUListElement | null>, index: number) {
  list.current?.querySelectorAll('[role="option"]')[index]?.scrollIntoView({ block: 'nearest' })
}

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
  const list = useRef<HTMLUListElement>(null)
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
  useEffect(() => { if (open) scrollActive(list, active) }, [active, open])
  useOutside([box, list], () => { setOpen(false); setQuery('') })

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
          if (e.key === 'Escape' || e.key === 'Tab') { setOpen(false); setQuery('') }
        }}
      />
      <span className="pointer-events-none absolute top-0 right-2 flex h-full items-center gap-1 text-faint">
        {selected && !disabled && (
          <button type="button" className="pointer-events-auto rounded p-1 hover:bg-raised" aria-label="Limpar escolha"
            onMouseDown={(e) => { e.preventDefault(); onChange('', null); setQuery('') }}>
            <X className="size-3.5" />
          </button>
        )}
        <ChevronDown className={cx('size-4 transition-transform', open && 'rotate-180')} />
      </span>
      <Popup anchor={box} open={open && !disabled} id={listId} listRef={list}>
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
      </Popup>
    </div>
  )
}

export function SuggestInput({ name, value, onChange, suggestions, placeholder, maxLength, invalid, disabled }: {
  name?: string
  value: string
  onChange: (value: string) => void
  suggestions: string[]
  placeholder?: string
  maxLength?: number
  invalid?: boolean
  disabled?: boolean
}) {
  const listId = useId()
  const [open, setOpen] = useState(false)
  const [active, setActive] = useState(-1)
  const [typed, setTyped] = useState(false)
  const box = useRef<HTMLDivElement>(null)
  const list = useRef<HTMLUListElement>(null)

  const filtered = useMemo(() => {
    const q = normalize(value).trim()
    return !typed || !q ? suggestions : suggestions.filter((s) => normalize(s).includes(q))
  }, [suggestions, value, typed])

  useEffect(() => { setActive(-1) }, [value, open])
  useEffect(() => { if (open && active >= 0) scrollActive(list, active) }, [active, open])
  useOutside([box, list], () => setOpen(false))

  const choose = (s: string) => { onChange(s); setTyped(false); setOpen(false) }

  return (
    <div ref={box} className="relative">
      <input
        id={name} name={name} autoComplete="off" disabled={disabled} maxLength={maxLength} placeholder={placeholder}
        aria-invalid={invalid || undefined} role="combobox" aria-expanded={open} aria-controls={listId} aria-autocomplete="list"
        className="field-input pr-9" value={value}
        onFocus={() => { setTyped(false); setOpen(true) }}
        onChange={(e) => { onChange(e.target.value); setTyped(true); setOpen(true) }}
        onKeyDown={(e) => {
          if (e.key === 'ArrowDown') { e.preventDefault(); setOpen(true); setActive((a) => Math.min(a + 1, filtered.length - 1)) }
          if (e.key === 'ArrowUp') { e.preventDefault(); setActive((a) => Math.max(a - 1, 0)) }
          if (e.key === 'Enter' && open && active >= 0 && filtered[active]) { e.preventDefault(); choose(filtered[active]) }
          if (e.key === 'Escape' || e.key === 'Tab') setOpen(false)
        }}
      />
      <button type="button" tabIndex={-1} disabled={disabled} aria-label="Mostrar sugestões"
        className="absolute top-0 right-2 flex h-full items-center text-faint"
        onMouseDown={(e) => { e.preventDefault(); setTyped(false); setOpen((o) => !o) }}>
        <ChevronDown className={cx('size-4 transition-transform', open && 'rotate-180')} />
      </button>
      <Popup anchor={box} open={open && !disabled && filtered.length > 0} id={listId} listRef={list}>
        {filtered.map((s, i) => (
          <li key={s} role="option" aria-selected={s === value}
            onMouseDown={(e) => { e.preventDefault(); choose(s) }} onMouseEnter={() => setActive(i)}
            className={cx('cursor-pointer rounded-lg px-3 py-2', i === active ? 'bg-brand-50' : s === value ? 'bg-raised font-medium' : '')}>
            {s}
          </li>
        ))}
      </Popup>
    </div>
  )
}
