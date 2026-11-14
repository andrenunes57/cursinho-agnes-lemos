import { useRef, useState, type FormEvent } from 'react'
import { ehDataISO, formatarHora } from '../lib/datas'
import { TITULO_AULA_MAX, validarObrigatorio, validarTituloAula } from '../lib/validacoes'
import { Button } from './ui/Button'
import { Field } from './ui/Field'
import { Select, type OpcaoSelect } from './ui/Select'

export type DadosAula = {
  turma_id: string
  disciplina_id: string
  professor_id: string
  data: string
  inicio: string | null
  titulo: string
}

type Props = {
  inicial?: Partial<DadosAula>
  turmas: readonly OpcaoSelect[]
  disciplinas: readonly OpcaoSelect[]
  /**
   * Opções de docente (coordenação, RF-09). Sem elas o campo não aparece e `professor_id` vem de
   * `inicial` (docente criando a própria aula, RF-10).
   */
  docentes?: readonly OpcaoSelect[]
  enviando: boolean
  textoBotao: string
  onEnviar: (dados: DadosAula) => void
  onCancelar?: () => void
}

/** Formulário de aula (turma, disciplina, docente, data, início e título). SPEC §8.3, RF-09/RF-10. */
export function AulaForm({ inicial, turmas, disciplinas, docentes, enviando, textoBotao, onEnviar, onCancelar }: Props) {
  const [turma, setTurma] = useState(inicial?.turma_id ?? '')
  const [disciplina, setDisciplina] = useState(inicial?.disciplina_id ?? '')
  const [docente, setDocente] = useState(inicial?.professor_id ?? '')
  const [data, setData] = useState(inicial?.data ?? '')
  const [inicio, setInicio] = useState(formatarHora(inicial?.inicio ?? null) ?? '')
  const [titulo, setTitulo] = useState(inicial?.titulo ?? '')
  const [tentou, setTentou] = useState(false)

  const refTurma = useRef<HTMLSelectElement>(null)
  const refDisciplina = useRef<HTMLSelectElement>(null)
  const refDocente = useRef<HTMLSelectElement>(null)
  const refData = useRef<HTMLInputElement>(null)
  const refTitulo = useRef<HTMLInputElement>(null)

  const erros = {
    turma: validarObrigatorio(turma, 'Escolha a turma.'),
    disciplina: validarObrigatorio(disciplina, 'Escolha a disciplina.'),
    docente: docentes ? validarObrigatorio(docente, 'Escolha quem dá a aula.') : null,
    data: ehDataISO(data) ? null : 'Informe a data da aula.',
    titulo: validarTituloAula(titulo),
  }

  function enviar(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setTentou(true)
    // Foco no primeiro campo com erro (SPEC §5.3).
    if (erros.titulo) return refTitulo.current?.focus()
    if (erros.turma) return refTurma.current?.focus()
    if (erros.disciplina) return refDisciplina.current?.focus()
    if (erros.docente) return refDocente.current?.focus()
    if (erros.data) return refData.current?.focus()
    onEnviar({
      turma_id: turma,
      disciplina_id: disciplina,
      professor_id: docente,
      data,
      inicio: inicio || null,
      titulo: titulo.trim(),
    })
  }

  const erro = (campo: keyof typeof erros) => (tentou ? erros[campo] : null)

  return (
    <form noValidate onSubmit={enviar} className="flex flex-col gap-4">
      <Field
        ref={refTitulo}
        rotulo="Título da aula"
        dica={`Ex.: Funções do 1º grau. Até ${TITULO_AULA_MAX} caracteres.`}
        obrigatorio
        autoComplete="off"
        value={titulo}
        onChange={(e) => setTitulo(e.target.value)}
        erro={erro('titulo')}
      />
      {/* grid-cols-1 = minmax(0, 1fr): sem isso, um <select> com opção longa alarga a página no celular. */}
      <div className="grid grid-cols-1 gap-4 largo:grid-cols-2">
        <Select
          ref={refTurma}
          rotulo="Turma"
          obrigatorio
          vazio="Escolha a turma"
          opcoes={turmas}
          value={turma}
          onChange={(e) => setTurma(e.target.value)}
          erro={erro('turma')}
        />
        <Select
          ref={refDisciplina}
          rotulo="Disciplina"
          obrigatorio
          vazio="Escolha a disciplina"
          opcoes={disciplinas}
          value={disciplina}
          onChange={(e) => setDisciplina(e.target.value)}
          erro={erro('disciplina')}
        />
        {docentes && (
          <Select
            ref={refDocente}
            rotulo="Docente"
            obrigatorio
            vazio="Escolha quem dá a aula"
            opcoes={docentes}
            value={docente}
            onChange={(e) => setDocente(e.target.value)}
            erro={erro('docente')}
          />
        )}
        <Field
          ref={refData}
          rotulo="Data"
          type="date"
          obrigatorio
          value={data}
          onChange={(e) => setData(e.target.value)}
          erro={erro('data')}
        />
        <Field rotulo="Horário de início (opcional)" type="time" value={inicio} onChange={(e) => setInicio(e.target.value)} />
      </div>
      <div className="flex flex-wrap gap-2">
        <Button type="submit" carregando={enviando} textoCarregando="Salvando…">
          {textoBotao}
        </Button>
        {onCancelar && (
          <Button variante="discreto" onClick={onCancelar}>
            Cancelar
          </Button>
        )}
      </div>
    </form>
  )
}
