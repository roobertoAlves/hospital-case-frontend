export function LogoMark({ className = 'size-8' }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={className} aria-hidden="true">
      <rect width="32" height="32" rx="9" className="fill-brand-600" />
      <path d="M16 5.5v21" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" />
      <path
        d="M19.6 9.4c-1.8-1.5-6.4-.9-6.1 1.6.3 2.3 6.2 1.9 6.1 4.6-.1 2.6-6.3 2.2-6.2 4.8.1 2.2 4.8 2 4.9 4"
        fill="none" stroke="#fff" strokeWidth="1.7" strokeLinecap="round"
      />
      <circle cx="20" cy="8.6" r="1.35" fill="#fff" />
    </svg>
  )
}

export function Logo({ subtitle = true }: { subtitle?: boolean }) {
  return (
    <span className="flex items-center gap-2.5">
      <LogoMark />
      <span className="leading-tight">
        <span className="block text-[17px] font-semibold tracking-tight text-brand-700">Asklep</span>
        {subtitle && <span className="block text-[11px] text-faint">Gestão clínica e hospitalar</span>}
      </span>
    </span>
  )
}
