# Ephyra Finance — organização visual e proteção do navegador

## Aplicação

Substitua os arquivos do site pelo conteúdo deste pacote, mantendo as pastas. Esta atualização separa o código principal em `js/app.js` e os eventos em `js/events.js`: ambos são necessários. Inclui as melhorias do assistente feitas nesta conversa. A atualização não foi publicada automaticamente no GitHub Pages.

Para testar localmente, execute `python -m http.server 8000` na pasta do projeto e abra http://localhost:8000. Use HTTPS na hospedagem. Exporte um backup antes de substituir uma versão em uso. Não limpe os dados do navegador.

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
- Hash de senha PBKDF2-SHA256 com salt aleatório e 600 mil iterações. Hashes antigos válidos são atualizados após login. Senhas antigas em texto puro são migradas e cópias legadas removidas após gravação.
- Metadados dos hashes são validados para impedir fatores de trabalho absurdos.
- Sessões locais ficam na aba, expiram após 30 minutos de inatividade ou oito horas totais. “Lembrar” guarda somente o e-mail; sessões persistentes antigas não são restauradas.
- Mensagem de falha de login genérica e espera de um minuto após cinco falhas. Essa espera é local e pode ser contornada por quem controla o navegador.
- Registros auxiliares de transações, categorias, metas e alertas usam identificadores por conta para evitar colisões.

## Limites reais

O aplicativo continua estático e usa IndexedDB/localStorage. Os dados financeiros **não estão criptografados em repouso**. O login local não é autorização de servidor: alguém com acesso ao perfil do navegador, às ferramentas de desenvolvedor ou com malware no dispositivo pode acessar/alterar os dados. O pacote não oferece autenticação multiusuário de servidor, proteção contra invasão da conta GitHub, DDoS ou garantia de ausência de vulnerabilidades.

Para contas acessíveis de vários dispositivos e dados realmente separados entre usuários, é necessário um backend com autenticação e autorização. A CSP desta versão permite estilos inline para preservar o layout existente. Restrições de enquadramento (`frame-ancestors`) exigem cabeçalhos HTTP e não podem ser aplicadas por uma meta tag no GitHub Pages.

## Validação

- Testes automatizados de senha, migração, backups, preservação de credenciais e expiração: `node --test tests/security.test.cjs`.
- Verificação no Chromium de navegação, cadastro/edição de transação, criação de meta, conversa do assistente, conversor, temas e expiração por inatividade.
- Verificação de execução de conteúdo malicioso por sanitização e bloqueio CSP.
- Responsividade das oito páginas em 1440, 1024, 768, 390 e 320 pixels.
- APIs de cotações substituídas por indisponibilidade nos testes de interface, exercitando o modo offline; disponibilidade/correção de cotações ao vivo não foi auditada.

## Referências e dependências

- [OWASP — prevenção de XSS](https://cheatsheetseries.owasp.org/cheatsheets/Cross_Site_Scripting_Prevention_Cheat_Sheet.html)
- [OWASP — segurança de armazenamento no navegador](https://cheatsheetseries.owasp.org/cheatsheets/HTML5_Security_Cheat_Sheet.html)
- [MDN — Content Security Policy](https://developer.mozilla.org/en-US/docs/Web/HTTP/Guides/CSP)
- DOMPurify 3.3.3: licença Apache-2.0 ou MPL-2.0, mantida no cabeçalho do arquivo.
- Chart.js 4.4.1: MIT, cabeçalho mantido.
- Font Awesome Free 6.5.1: fontes SIL OFL 1.1, código MIT, ícones CC BY 4.0.
- Inter, via Fontsource Variable 5.2.8: SIL Open Font License 1.1.
