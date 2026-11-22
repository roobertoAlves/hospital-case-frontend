export function LogoMark({ className = 'size-8' }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={className} aria-hidden="true">
      <rect width="32" height="32" rx="9" className="fill-brand-600" />
      <circle cx="16" cy="6.4" r="1.9" fill="none" stroke="#fff" strokeWidth="1.5" />
      <path d="M16 8.3v18.4" stroke="#fff" strokeWidth="1.6" strokeLinecap="round" />
      <path
        d="M20.3 10.4C18.2 9.3 13 9.7 12.8 12.1c-.2 2.4 6.7 1.9 6.8 4.5.1 2.6-6.8 2.1-6.7 4.6.1 2 5.4 1.7 4.7 3.6-.5 1.1-2.1 1.3-3.2.9"
        fill="none" stroke="#fff" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round"
      />
      <path d="M19.6 9.6c.8-.6 2.4-.5 2.9.3.3.5-.2 1-1 1h-1.5" fill="none" stroke="#fff" strokeWidth="1.15" strokeLinecap="round" strokeLinejoin="round" />
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
