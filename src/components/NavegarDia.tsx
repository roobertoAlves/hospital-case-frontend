import { ChevronLeft, ChevronRight } from 'lucide-react'
import { hojeIso, somarDias } from '../lib/formato'
import { Botao } from './ui'

/** Anterior / data / proximo / hoje: troca o ?data= da tela. */
export function NavegarDia({ dia, aoTrocar }: { dia: string; aoTrocar: (d: string) => void }) {
  return (
    <div className="flex items-center gap-2">
      <Botao aria-label="Dia anterior" onClick={() => aoTrocar(somarDias(dia, -1))} className="w-10 px-0"><ChevronLeft className="size-4" /></Botao>
      <label htmlFor="dataDia" className="sr-only">Data</label>
      <input id="dataDia" type="date" value={dia} onChange={(e) => e.target.value && aoTrocar(e.target.value)} className="field-input w-[160px]" />
      <Botao aria-label="Próximo dia" onClick={() => aoTrocar(somarDias(dia, 1))} className="w-10 px-0"><ChevronRight className="size-4" /></Botao>
      {dia !== hojeIso() && <Botao variante="texto" onClick={() => aoTrocar(hojeIso())}>Hoje</Botao>}
    </div>
  )
}
