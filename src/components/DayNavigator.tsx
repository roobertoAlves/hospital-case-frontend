import { ChevronLeft, ChevronRight } from 'lucide-react'
import { todayIso, addDays } from '../lib/format'
import { Button } from './ui'

/** Previous / date / next / today: changes the screen's ?data= parameter. */
export function DayNavigator({ date, onChange }: { date: string; onChange: (d: string) => void }) {
  return (
    <div className="flex items-center gap-2">
      <Button aria-label="Dia anterior" onClick={() => onChange(addDays(date, -1))} className="w-10 px-0"><ChevronLeft className="size-4" /></Button>
      <label htmlFor="dataDia" className="sr-only">Data</label>
      <input id="dataDia" type="date" value={date} onChange={(e) => e.target.value && onChange(e.target.value)} className="field-input w-[160px]" />
      <Button aria-label="Próximo dia" onClick={() => onChange(addDays(date, 1))} className="w-10 px-0"><ChevronRight className="size-4" /></Button>
      {date !== todayIso() && <Button variant="texto" onClick={() => onChange(todayIso())}>Hoje</Button>}
    </div>
  )
}
