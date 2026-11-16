# Asklep: frontend

Interface web do **Asklep**, o sistema de gestão clínica e hospitalar. O nome vem de Asclépio, deus grego da medicina, e a logo é o bastão com uma serpente.

Este repositório tem **só a interface**. Os dados, as regras e a segurança ficam no backend Java,
no repositório [**hospital-case-backend**](https://github.com/roobertoAlves/hospital-case-backend).

- **React 19 + TypeScript**, empacotado com **Vite**
- **Tailwind CSS v4**: estilo claro inspirado no nav.dasa, com folha branca, moldura tingida e acento verde-azulado
- **motion** (Framer Motion): animações de entrada, diálogos e avisos
- **lucide-react**: ícones
- **react-router**: navegação

## O que precisa estar instalado

1. **Node.js 20 ou mais novo**: `node -v`. Na faculdade, se não puder instalar, a versão em zip do site do Node funciona descompactada.
2. **O backend rodando** no Tomcat (veja o README do backend). Por padrão, o frontend procura em
   `http://localhost:8080/hospital-case-backend`.

## Como rodar

```bash
npm install
npm run dev
```

Abra **http://localhost:5173**.

Em desenvolvimento, o Vite repassa tudo que começa com `/hospital-case-backend` para o Tomcat. Para o
navegador há uma origem só: o cookie de sessão e o token CSRF funcionam sem configurar CORS.

Se o Tomcat estiver em outra porta, por exemplo a 8095, crie o arquivo `.env.local` (ele fica fora do Git):

```
BACKEND_URL=http://localhost:8095
```

Usuários de demonstração (dados fictícios):

| Perfil | E-mail | Senha |
|---|---|---|
| Recepção | `recepcao@hospital.local` | `recepcao123` |
| Enfermagem | `enfermeiro@hospital.local` | `enfermeiro123` |
| Médico | `medico@hospital.local` | `medico123` |
| Administrador | `admin@hospital.local` | `admin123` |
| Paciente (portal) | `paciente@hospital.local` | `paciente123` |

> **Se um arquivo novo aparecer sem estilo** durante o `npm run dev`, pare e rode `npm run dev` de novo.
> O Tailwind só vê as classes de arquivos criados depois que o servidor subiu quando ele reinicia.

## As três áreas

| Endereço | Quem usa | O que tem |
|---|---|---|
| `/`, `/servicos/...`, `/cadastro` | Qualquer pessoa, sem login | Site público: consultas (especialidades e médicos), exames (preparo, exige pedido ou não), vacinas e cadastro |
| `/minha-saude/...` | Paciente | Marcar, confirmar, remarcar e cancelar consultas; exames com pedido anexado; vacinas e cartão; receitas |
| `/painel` e demais telas | Equipe (recepção, enfermagem, médico, administrador) | As telas internas, incluindo **Pedidos médicos** (conferência) e **Sala de vacinação** |

Depois do login, cada pessoa vai para a sua área. O paciente nunca vê as telas da equipe, e a equipe (inclusive o administrador) não entra no portal de um paciente. O backend também bloqueia esses acessos.

## Outros comandos

```bash
npm run typecheck   # confere os tipos (TypeScript)
npm run build       # gera a versão de produção em dist/
npm run preview     # serve o dist/ para conferir
```

## Como o frontend conversa com o backend

- `src/lib/api.ts`: todas as chamadas.
  - Leituras usam `GET /api/...`. São as mesmas ações das telas JSP, respondendo em JSON (`"jsonView": true` no `routes.json`).
  - Alterações usam `POST` com o cabeçalho `X-CSRF-Token`.
- `src/lib/sessao.tsx`: `GET /api/sessao` informa quem está logado, os grupos, as permissões, se a senha precisa ser trocada e o token CSRF.
- **O menu e os botões aparecem conforme as permissões**, mas quem garante o acesso é o backend:
  - ele responde 403 para o que o perfil não pode fazer;
  - ele responde 404 para dados clínicos de pacientes sem vínculo com o profissional.
- Os erros de validação (422) chegam por campo e aparecem embaixo de cada campo.

## Em produção

Sirva o `dist/` e o backend **no mesmo domínio**, com um proxy reverso (nginx, Apache ou IIS) que repasse
`/hospital-case-backend` para o Tomcat. Para o backend ficar em outro endereço, gere o build com
`VITE_API_BASE=https://api.exemplo/hospital-case-backend` e ative o CORS no `config.json` do backend,
liberando só essa origem.

## Estrutura

```
src/
  lib/          api, sessão, formatação, máscaras, menu por permissão
  components/   layout (menu lateral, barra superior), componentes de interface, avisos, agenda
  pages/        uma tela por arquivo (login, painel, pacientes, agenda, triagem, atendimento...)
```
