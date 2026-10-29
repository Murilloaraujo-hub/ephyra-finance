# Ephyra Finance

Aplicativo de controle financeiro pessoal **100% local**, feito com **HTML5, CSS3 e JavaScript puro**.
Não precisa de instalação, build, servidor de aplicação, banco de dados na nuvem, cadastro ou login:
tudo roda no navegador e os dados ficam no armazenamento do próprio dispositivo.

> **Sem conta, sem senha, sem nuvem.** O app não faz nenhuma requisição de rede e continua funcionando offline.

---

## 1. Como executar

O projeto é estático. Existem duas formas, ambas válidas:

### Opção A — abrir direto no navegador (mais simples)

1. Descompacte o ZIP.
2. Dê duplo clique em `index.html` (ou arraste o arquivo para uma aba do navegador).

Testado no Chromium abrindo via `file://`: tela de entrada, criação de perfil, lançamentos,
persistência após recarregar, exportação de backup e tema funcionam normalmente.
Navegadores com políticas mais rígidas para arquivos locais podem limitar o armazenamento;
nesse caso use a Opção B.

### Opção B — servir a pasta com um servidor estático

Qualquer servidor de arquivos estáticos serve (o Python abaixo é só um utilitário de
desenvolvimento, **não é dependência do app**):

```bash
# dentro da pasta do projeto
python3 -m http.server 8000
```

Depois abra `http://localhost:8000`.

### Requisitos

- Navegador moderno com suporte a ES6, IndexedDB e Canvas (Chrome, Edge, Firefox, Safari atuais).
- Nenhum Node.js, npm, Python, banco de dados ou chave de API é necessário para usar.
- Conexão com a internet **não** é necessária depois de baixar os arquivos.

---

## 2. Funcionalidades

Todas as telas abaixo alimentam as mesmas estruturas locais de dados e são recalculadas na hora.

| Tela | O que faz |
| --- | --- |
| **Dashboard** | Saldo disponível, receitas, despesas e economia do período; nível e XP; cartões de metas, conquistas e transações; gráfico de distribuição 50/30/20 e demais gráficos em Canvas. |
| **Transações** | Cadastro de receitas e despesas com descrição, valor, categoria e data; edição, exclusão, busca e filtros; lista com todas as movimentações. |
| **Metas** | Criação de metas com valor-alvo e valor guardado, barra de progresso, aporte e conclusão com recompensa em XP. |
| **Mercado** | Catálogo de moedas e criptomoedas com **valores fictícios fixos** (ver seção 4), conversor de moedas, favoritos, alertas e histórico ilustrativo. |
| **Conquistas** | Medalhas por hábitos financeiros, XP acumulado, nível e progresso até o próximo nível. |
| **Perfil** | Nome do perfil, foto (redimensionada e salva localmente), salário e resumo da conta. |
| **Resumo Financeiro** | Evolução mês a mês a partir dos lançamentos reais cadastrados, com gráficos e indicadores. O mês corrente aparece como **“Mês em andamento”** e é recalculado a cada visita; os meses encerrados ficam salvos. |
| **Configurações** | Tema claro/escuro, moeda de exibição, exportar JSON, exportar CSV, importar JSON, editar perfil e apagar os dados do dispositivo. |
| **Assistente** | Assistente local baseado em regras que responde sobre saldo, gastos por categoria, metas e dicas — sem enviar nada para fora. |
| **Tutorial** | Passo a passo na primeira abertura, com opção de rever depois. |

Outros recursos:

- **Tema claro e escuro** com preferência salva no dispositivo.
- **Metas, XP, níveis e conquistas** calculados a partir dos dados reais.
- **Valores tratados em centavos inteiros** nos cálculos de saldo, evitando erros de arredondamento.
- **Layout responsivo**: barra lateral no desktop e navegação inferior em formato de dock no celular,
  com telas testadas de 320 px a 1280 px sem rolagem horizontal.
- **Acessibilidade**: link "Pular para o conteúdo", `aria-label` nos controles, `role="img"` e
  descrição textual nos gráficos, alvos de toque de no mínimo ~38 px no celular, foco visível
  e mensagens de erro anunciadas por `role="alert"`.

---

## 3. Estrutura de arquivos

```
ephyra-finance/
├── index.html                  Estrutura da aplicação e da tela de entrada local
├── README.md                   Este documento
├── css/
│   ├── style.css               Estilos do app, tema claro/escuro e responsividade
│   └── vendor/
│       └── fontawesome.min.css Ícones (fonte embutida em base64 — funciona offline)
├── js/
│   ├── app.js                  Perfil local, telas, cálculos, backup, CSV e navegação
│   ├── events.js               Mapa de eventos declarativos (data-on-click, data-on-submit…)
│   ├── storage.js              Persistência (IndexedDB com fallback em localStorage), backup
│   ├── database.js             Camada mínima de acesso ao IndexedDB
│   ├── security.js             Escape de HTML e sanitização de dados de entrada
│   ├── onboarding.js           Tutorial de primeira abertura
│   ├── assistant.js            Assistente financeiro local, baseado em regras
│   ├── recommendations.js      Formulário de sugestões que copia o texto para a área de transferência
│   ├── monthly-summary.js      Resumo financeiro mês a mês
│   ├── market/                 Mercado demonstrativo, conversor, favoritos, alertas e histórico
│   ├── sidebar/sidebar.js      Comportamento do menu lateral
│   └── vendor/                 Bibliotecas locais (Chart.js 4.4.1 e DOMPurify 3.3.3)
```

Cada arquivo JS é um módulo independente exposto por um objeto global (`App`, `Auth`,
`EphyraStorage`, `MonthlySummary`, `EphyraAssistant`…), carregado na ordem definida no fim do
`index.html`. Não há empacotador, transpilador nem dependência instalada.

**Bibliotecas de terceiros (todas locais, nenhuma CDN):**

| Biblioteca | Versão | Uso | Licença |
| --- | --- | --- | --- |
| Chart.js (`js/vendor/chart.umd.min.js`) | 4.4.1 | Gráficos em Canvas | MIT |
| DOMPurify (`js/vendor/purify.min.js`) | 3.3.3 | Sanitização de HTML | Apache 2.0 / MPL 2.0 |
| Font Awesome Free (`css/vendor/fontawesome.min.css`) | 6.5.1 | Ícones (fonte embutida) | CC BY 4.0 / SIL OFL 1.1 / MIT |

---

## 4. Dados de demonstração (mercado)

A tela **Mercado** existe apenas para demonstrar a interface. Os valores de moedas e criptomoedas
são **fixos, fictícios e ficticiamente datados**: não são cotações reais, não vêm de nenhuma API e
**não são atualizados**. A tela exibe os avisos:

- selo **“Valores de demonstração — não são cotações reais”**;
- botão de recarga que apenas restaura os mesmos valores fixos;
- nenhum temporizador de “atualização automática” é iniciado.

O conversor usa esses mesmos valores fixos. Nenhuma decisão financeira deve ser tomada com base neles.

Os lançamentos, metas, conquistas e o gráfico do Resumo usam **exclusivamente** o que foi cadastrado
pelo usuário — não há histórico fictício inserido nos seus dados.

---

## 5. Armazenamento local

- **Onde:** `IndexedDB`, banco `EphyraFinanceDB` (versão 3), com as stores `users` e `userdata`.
  Se o IndexedDB estiver indisponível (modo restrito, navegador antigo), o app cai automaticamente
  para `localStorage`.
- **Chaves usadas:**
  - `ephyra_profile_v1` — ponteiro com o perfil ativo (nome, salário, foto, data de cadastro).
  - `ephyra_data_local` — cópia de segurança dos dados no fallback de `localStorage`.
  - `ephyra_migrated_v2` — marca de migração de versões anteriores.
  - `ephyra_tutorial_completed_<perfil>` — controle do tutorial já visto.
- **Preferências** (tema claro/escuro, moeda de exibição, nível, XP) ficam dentro do registro de
  dados do perfil (`config`), não em chaves separadas — assim o backup JSON leva tudo junto.
- **Um perfil por navegador:** como não há contas, existe apenas um perfil local (`local`).
- **Gravação:** as alterações são mantidas em memória e gravadas de forma serializada; o app força
  a gravação ao sair da página (`pagehide`), então recarregar o navegador não perde os lançamentos.
- **Somente neste dispositivo:** os dados **não** são enviados a lugar algum e **não** há
  sincronização entre aparelhos nem entre navegadores diferentes.

> Limpar os dados do site, usar uma janela anônima ou trocar de navegador/dispositivo faz o app
> começar do zero. O backup em JSON é a única forma de levar os dados para outro lugar.

---

## 6. Backup, restauração e exportação

Em **Configurações → Dados**:

- **Exportar JSON** — gera `ephyra-backup.json` com o formato completo:

  ```json
  {
    "app": "Ephyra Finance",
    "format": "ephyra-backup",
    "version": 2,
    "exportedAt": "2026-10-29T12:00:00.000Z",
    "user": { "nome": "…", "foto": null, "salario": 4200.5, "dataCadastro": "…" },
    "data": { "historico": [], "metas": [], "conquistas": [], "categorias": [], "…": "…" }
  }
  ```

- **Importar JSON** — disponível em Configurações **e na tela de entrada**
  (“Restaurar um backup (.json)”). O arquivo é validado antes de aplicar; se o formato não for
  reconhecido, nada é sobrescrito e um aviso é exibido.
- **Exportar CSV** — gera `ephyra-transacoes.csv` (UTF-8 com BOM, separador `;`) com as colunas
  `Data;Tipo;Descrição;Categoria;Valor`, pronto para abrir no Excel, LibreOffice ou Google Sheets.
  **O CSV é apenas para leitura/planilha:** ele não pode ser reimportado no app — para restaurar
  use o JSON.
- **Apagar dados deste dispositivo** — remove perfil, lançamentos, metas, conquistas, preferências
  e o banco local, voltando para a tela de entrada.

---

## 7. Privacidade, offline e segurança

- **Nenhuma requisição de rede:** os testes automatizados registram **zero** requisições externas
  durante todo o uso, e a política de segurança de conteúdo do `index.html` define
  `connect-src 'none'`, ou seja, o navegador bloqueia qualquer `fetch`/XHR.
- **Nenhum script remoto, CDN ou fonte externa:** estilos, ícones, gráficos e bibliotecas estão
  todos dentro do projeto (a fonte de ícones vai embutida em base64).
- **Nenhuma credencial:** não há chave de API, token, variável de ambiente, arquivo `.env`,
  configuração de serviço externo ou SDK de integração no projeto.
- **Nenhuma senha:** o app não tem campo de senha e não simula autenticação.
- **Sem telemetria:** não há analytics, rastreamento, cookies de terceiros ou envio de relatórios.
- **Fonte e sugestões:** o formulário de sugestões apenas **copia** o texto para a área de
  transferência do usuário — nenhum e-mail é enviado pelo app.

---

## 8. Limitações (leia antes de usar com dados reais)

1. **Não há autenticação segura.** Como o app é estático e roda no navegador, o “perfil” é apenas
   um nome de exibição: não há senha, criptografia, sessão, verificação de identidade nem
   servidor validando nada. Qualquer pessoa com acesso físico ao navegador (ou aos dados do
   perfil no sistema) pode abrir o app e ver os lançamentos.
2. **Não há isolamento confiável de dados.** O armazenamento pertence ao navegador/origem do site,
   não a um usuário autenticado. Em um computador compartilhado, os dados ficam visíveis para
   quem usar o mesmo navegador.
3. **Não há sincronização entre dispositivos.** Nada é enviado para a nuvem; não existe conta,
   backup automático remoto ou compartilhamento entre celular e computador.
4. **Os dados podem ser perdidos** ao limpar o cache/armazenamento do navegador, usar modo anônimo
   ou trocar de navegador/dispositivo. Exporte o JSON com frequência e guarde-o em local seguro.
5. **O backup JSON não é criptografado.** Ele contém seus lançamentos em texto legível.
6. **O CSV é somente exportação**, não serve para restaurar dados.
7. **O mercado é ilustrativo**: valores fixos e fictícios, sem qualquer relação com o mercado real.
8. **Conversão de moeda é apenas de exibição**, feita com as taxas fictícias do mercado demonstrativo.
9. **Assistente e recomendações são locais e determinísticos**: o assistente aplica regras simples
   sobre os seus dados (não é IA generativa) e as respostas não substituem orientação profissional.
10. **O app não substitui aconselhamento financeiro.** É uma ferramenta de organização pessoal e
    um projeto de portfólio.

---

## 9. Verificação técnica executada

Os testes foram executados neste projeto, não apenas descritos. Resumo do que foi verificado em
navegador real (Chromium via Playwright), com o app servido por HTTP local:

- **38/38 verificações automatizadas aprovadas**, cobrindo: tela de entrada sem campo de senha;
  criação de perfil; cálculos de saldo, receitas, despesas e metas; renderização das 8 telas;
  resumo financeiro gerando o mês corrente a partir dos lançamentos reais; mercado com valores
  rotulados como demonstração; exportação JSON e CSV (conteúdo conferido); persistência após
  recarregar; alternância de tema; apagar tudo e restaurar pelo backup; **zero requisições
  externas** e **zero erros de JavaScript**.
- **Responsividade** testada em 320, 360, 390, 430, 768 e 1280 px em todas as telas:
  **sem rolagem horizontal** e **sem erros de JS**.
- **Abertura via `file://`** testada: entrada, criação de perfil, gravação, recarregamento e
  persistência funcionando, sem requisições externas.
- **Varredura de termos proibidos** (`supabase`, `firebase`, `appwrite`, `api key`, `access token`,
  `fetch(`, `XMLHttpRequest`, `OAuth`, `SMTP`, `process.env`, `endpoint`, URLs `http(s)://`):
  nenhuma integração ou chamada de rede. As únicas ocorrências restantes são comentários com URL
  dentro das bibliotecas de terceiros e namespaces W3C (`http://www.w3.org/...`), que não geram
  requisição.
- **Integridade de arquivos:** todos os scripts e estilos referenciados no `index.html` existem;
  não há arquivo órfão nem referência quebrada.

---

## 10. Notas de implementação

- **Centavos inteiros:** valores monetários são convertidos para centavos inteiros antes de somar,
  e só então formatados — evita `0.1 + 0.2 = 0.30000000000000004` no saldo.
- **Eventos declarativos:** elementos usam `data-on-click="h23"`, `data-on-submit="h1"` etc., e o
  arquivo `js/events.js` mapeia o código para a função. Isso evita `onclick` inline e mantém o
  HTML limpo.
- **Sanitização:** todo HTML dinâmico passa por `security.js` (escape) e, quando aplicável, por
  DOMPurify antes de entrar no DOM.
- **CSP:** o `index.html` traz `default-src 'self'; connect-src 'none'; object-src 'none';
  base-uri 'none'; form-action 'none'`, reforçando que o app não fala com a rede.
- **Extensão Python opcional:** não existe nenhuma. O app roda inteiramente no navegador; caso se
  use `python3 -m http.server`, o Python atua apenas como servidor de arquivos estáticos.

---

## 11. Licença e créditos

Projeto de portfólio de **Ephyra Finance**. As bibliotecas de terceiros listadas na seção 3
permanecem sob suas próprias licenças (MIT, Apache 2.0 / MPL 2.0 e CC BY 4.0 / SIL OFL 1.1 / MIT).
