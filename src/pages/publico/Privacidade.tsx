import type { ReactNode } from 'react'
import { Link } from 'react-router'
import { PaginaSimples } from '../../components/PaginaSimples'
import { EMAIL_CONTATO_CURSINHO, TEXTO_CONTATO_PENDENTE } from '../../lib/contato'

function Secao({ titulo, children }: { titulo: string; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-2">
      <h2 className="text-xl font-bold">{titulo}</h2>
      {children}
    </section>
  )
}

/** /privacidade — aviso de privacidade público (RF-27, SPEC §5.5). */
export function Privacidade() {
  return (
    <PaginaSimples>
      <h1 className="text-3xl font-bold text-marca">Aviso de privacidade</h1>
      <p>
        Este sistema é usado pelo Cursinho Popular Professor Agnes Lemos (Campinas-SP) para organizar as aulas, a
        presença e as entregas de tarefas. Aqui explicamos, de forma simples, o que fazemos com os seus dados, conforme
        a Lei Geral de Proteção de Dados (LGPD).
      </p>

      <Secao titulo="Quais dados guardamos">
        <ul className="list-disc space-y-1 pl-6">
          <li>Seu nome social, seus pronomes (se você quiser informar) e o seu e-mail.</li>
          <li>Os registros de presença nas aulas.</li>
          <li>As entregas de tarefas, as notas, os conceitos e as devolutivas.</li>
          <li>Os arquivos que você envia.</li>
        </ul>
        <p>
          Não guardamos o nome nem a foto da sua conta Google, e não pedimos telefone, nome civil, data de nascimento
          nem outros dados.
        </p>
      </Secao>

      <Secao titulo="Para que usamos">
        <p>
          Somente para a gestão pedagógica do cursinho. A base legal é o seu consentimento, registrado quando você
          aceita este aviso no primeiro acesso, e a execução da atividade educacional.
        </p>
      </Secao>

      <Secao titulo="Quem vê os seus dados">
        <ul className="list-disc space-y-1 pl-6">
          <li>Você vê os seus próprios dados.</li>
          <li>Estudantes não veem a lista de outras pessoas estudantes.</li>
          <li>
            Docentes veem o nome social e os pronomes das pessoas estudantes das turmas onde dão aula, e as entregas e
            presenças das próprias aulas.
          </li>
          <li>A coordenação vê os dados necessários para a gestão do cursinho, incluindo o e-mail.</li>
        </ul>
        <p>Essas regras são aplicadas diretamente no banco de dados, e não só nas telas.</p>
      </Secao>

      <Secao titulo="Onde os dados ficam">
        <ul className="list-disc space-y-1 pl-6">
          <li>Banco de dados: Supabase, com servidores na região de São Paulo.</li>
          <li>Arquivos: Google Drive da conta do cursinho, acessíveis só por link.</li>
        </ul>
        <p>Não usamos ferramentas de análise, pixels de rastreamento nem fontes de terceiros.</p>
      </Secao>

      <Secao titulo="Por quanto tempo">
        <p>
          A coordenação define o prazo de guarda. A orientação é excluir os dados em até 12 meses depois do fim do seu
          vínculo com o cursinho.
        </p>
      </Secao>

      <Secao titulo="Como pedir a exclusão ou tirar dúvidas">
        <p>
          Fale com a coordenação do cursinho ou escreva para{' '}
          {EMAIL_CONTATO_CURSINHO ? (
            <a
              href={`mailto:${EMAIL_CONTATO_CURSINHO}`}
              className="font-semibold text-marca underline underline-offset-4"
            >
              {EMAIL_CONTATO_CURSINHO}
            </a>
          ) : (
            TEXTO_CONTATO_PENDENTE
          )}
          . Seus dados serão excluídos e o pedido será registrado.
        </p>
      </Secao>

      <Link to="/" className="self-start font-semibold text-marca underline underline-offset-4">
        Voltar para o início
      </Link>
    </PaginaSimples>
  )
}
