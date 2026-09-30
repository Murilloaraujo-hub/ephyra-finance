# Ephyra Finance — assistente, recuperação e exclusão de conta

## Aplicação

Substitua os arquivos do site pelo conteúdo deste pacote, mantendo as pastas. Esta atualização separa o código principal em `js/app.js` e os eventos em `js/events.js`: ambos são necessários. Inclui as melhorias do assistente feitas nesta conversa. A atualização não foi publicada automaticamente no GitHub Pages.

**Antes de publicar, siga `ATIVAR-EMAIL-E-CONTAS.md`.** A autenticação agora exige Supabase configurado e o primeiro acesso remove as contas locais antigas, conforme solicitado. Este pacote ainda não está publicado e não excluiu contas de produção.

Para testar localmente, execute `python -m http.server 8000` na pasta do projeto e abra http://localhost:8000. Use HTTPS na hospedagem. Exporte um backup antes de substituir uma versão em uso. A remoção das contas antigas inclui os dados financeiros locais; exporte antes se quiser preservá-los.

## Visual

- Paleta de cinza e azul-petróleo, com verde discreto para ações.
- Menu fixo no computador e navegação adaptada para celular.
- Cartões com colunas regulares, alturas e espaçamentos consistentes.
- Três gráficos alinhados no desktop; adaptação para telas menores.
- Menos gradientes, sombras e animações de entrada.
- Temas claro e escuro preservados.
- Fontes, ícones e Chart.js incluídos no pacote para evitar dependência de CDN na interface.
- Imagens do tutorial mantidas, com `object-fit: contain`.

## Segurança implementada

- Política CSP bloqueia scripts inline, atributos de eventos, `eval`, plugins e fontes de scripts externas.
- 109 atributos de eventos foram substituídos por funções explícitas em `js/events.js`. Não há avaliação de strings como código.
- As 32 atribuições de HTML dinâmico passam por DOMPurify. Parâmetros de eventos são escapados como atributos.
- Backups: limite de 5 MB, validação de objetos/listas, profundidade e quantidade de campos; rejeição de chaves de poluição de protótipo.
- Importação mantém a senha e o e-mail de acesso atuais. Cores, ícones, moedas e alertas são normalizados.
- Autenticação por Supabase Auth, confirmação de cadastro e recuperação de senha por e-mail. O navegador não armazena as senhas das novas contas.
- Sessões na aba, validação de conta no servidor e bloqueio após 30 minutos inativos ou oito horas desde o login. “Lembrar” guarda somente o e-mail.
- Resetar Tudo exige senha e confirmação, exclui a conta via função de servidor e só depois remove seus dados locais.
- Limite persistente de tentativas de exclusão e identidade obtida do token validado, nunca de um ID arbitrário do navegador.
- Migração única remove contas locais antigas e não recria a demonstração.
- Os dados das novas contas são separados pelo ID do Auth; reutilizar um e-mail não recupera os registros de uma conta excluída.
- Registros auxiliares de transações, categorias, metas e alertas usam identificadores por conta para evitar colisões.

## Limites reais

O frontend é estático, mas a autenticação, os e-mails e a exclusão dependem de Supabase configurado. Os dados financeiros continuam em IndexedDB/localStorage, **sem criptografia em repouso e sem sincronização entre dispositivos**. Quem tem acesso ao perfil do navegador ou malware no dispositivo pode acessar esses dados. A atualização não apaga cópias em dispositivos que não a abriram, backups exportados ou usuários de um projeto Supabase já existente.

A CSP permite estilos inline para preservar o layout existente. Restrições de enquadramento (`frame-ancestors`) exigem cabeçalhos HTTP e não podem ser aplicadas por meta tag no GitHub Pages. Não foi realizada auditoria completa de segurança ou implantação em produção.

## Validação

- Testes de assistente, sanitização, migração, isolamento por ID, exclusão e autorização: `node --test tests/*.test.cjs`.
- `tests/auth-ui.cjs`: fluxos de autenticação em Chromium com Supabase simulado; nenhuma conta real ou e-mail foi usado. Requer Playwright.
- SQL e SMTP reais não foram executados; instruções de ativação e validação estão no guia.
- Verificação no Chromium de navegação, cadastro/edição de transação, criação de meta, conversa do assistente, conversor, temas e expiração por inatividade.
- Verificação de execução de conteúdo malicioso por sanitização e bloqueio CSP.
- Responsividade das oito páginas em 1440, 1024, 768, 390 e 320 pixels.
- APIs de cotações substituídas por indisponibilidade nos testes de interface, exercitando o modo offline; disponibilidade/correção de cotações ao vivo não foi auditada.

## Referências e dependências

- [OWASP — prevenção de XSS](https://cheatsheetseries.owasp.org/cheatsheets/Cross_Site_Scripting_Prevention_Cheat_Sheet.html)
- [OWASP — segurança de armazenamento no navegador](https://cheatsheetseries.owasp.org/cheatsheets/HTML5_Security_Cheat_Sheet.html)
- [MDN — Content Security Policy](https://developer.mozilla.org/en-US/docs/Web/HTTP/Guides/CSP)
- Supabase JS 2.117.2: MIT, arquivo local e licença em `js/vendor`.
- DOMPurify 3.3.3: licença Apache-2.0 ou MPL-2.0, mantida no cabeçalho do arquivo.
- Chart.js 4.4.1: MIT, cabeçalho mantido.
- Font Awesome Free 6.5.1: fontes SIL OFL 1.1, código MIT, ícones CC BY 4.0.
- Inter, via Fontsource Variable 5.2.8: SIL Open Font License 1.1.

## Assistente — orientação de orçamento

Agora reconhece pedidos para economizar, organizar ganhos e começar um orçamento. Oferece passos de registro, revisão de despesas e definição de metas. Usa as movimentações do mês atual por padrão e sinaliza quando não há registros; a diferença entre receitas e despesas não é apresentada como saldo livre garantido. A regra 50/30/20 aparece como exemplo flexível. Não altera registros automaticamente e continua funcionando localmente por regras.

Testes: `node --test tests/assistant.test.cjs` (12 cenários, incluindo as duas frases da captura de tela).
Referência de educação financeira: [Banco Central — orçamento pessoal](https://www.bcb.gov.br/meubc/faqs/p/o-que-e-um-orcamento-pessoal).

## Recomendações

Configurações → Recomendações → Enviar sugestão abre um formulário com tipo, título e descrição. O botão abre o aplicativo de e-mail com a mensagem preenchida; o usuário revisa e envia por lá. Não há envio automático nem inclusão de dados financeiros, senha ou histórico. “Copiar mensagem” oferece uma alternativa quando não há aplicativo de e-mail configurado.

Defina o endereço público de destino em `js/contact-config.js`, no campo `recommendationsEmail`. O destino definido pelo proprietário é sillvamuriloarauja@gmail.com. Essa opção independe do SMTP do Supabase; a recuperação de senha continua com sua integração anterior. Nenhum painel administrativo foi adicionado.
