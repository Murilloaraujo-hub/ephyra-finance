# Correções realizadas

## Tutorial

- Criada a pasta `images/tutorial/`.
- Corrigido o caminho usado pelo onboarding.
- Movida `tutorialwelcome.png` para a nova pasta.
- Mantido fallback visual para imagens ainda ausentes.
- A imagem disponível agora preenche todo o quadro com corte proporcional.
- O placeholder desaparece completamente quando a imagem termina de carregar.
- Atualizada a explicação sobre armazenamento local.

## Segurança local

- Novas senhas são armazenadas usando PBKDF2-SHA256, salt aleatório e 210 mil
  iterações.
- Contas antigas com senha em texto simples são migradas automaticamente após
  o primeiro login correto.
- Backups novos não incluem senha nem hash de senha.
- A importação de backups não pode substituir as credenciais da conta atual.
- Textos digitados pelo usuário são escapados antes de serem inseridos em HTML.
- As notificações agora usam `textContent` para exibir mensagens.

## Mercado

- Dados de fallback agora aparecem como "Dados simulados — não usar como
  cotação real".
- A atualização manual avisa quando as fontes reais estão indisponíveis.

## Compatibilidade e cache

- Removido o Tailwind Browser, que não era necessário para o CSS do projeto.
- Atualizadas as versões dos arquivos locais para impedir que o GitHub Pages
  continue usando JavaScript e CSS antigos em cache.

## Documentação

- README principal preenchido com instruções de execução e publicação.
- Adicionado um README com a lista exata das imagens do tutorial.
