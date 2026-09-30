# Ativar e-mail e exclusão de contas

O projeto Supabase **Ephyra Finance** (`jvsazjgpdwscxwxpgfxq`) foi criado em São Paulo. A URL e a chave pública estão configuradas no código. A migração do controle de tentativas foi aplicada e a função `delete-account` foi publicada. **Ainda faltam os redirecionamentos de autenticação, a configuração do envio de e-mails e a publicação do HTML no site.** Nenhum e-mail de teste foi enviado e nenhuma conta de produção foi excluída. Sem configuração, o site mostra um aviso e desabilita o acesso; não volta ao login local antigo.

## 1. Projeto e autenticação

Use o projeto existente **Ephyra Finance**, referência `jvsazjgpdwscxwxpgfxq`; não é necessário criar outro. O acesso por e-mail e a confirmação de cadastro já foram verificados como habilitados. Confira no painel a senha mínima de 8 caracteres. Não habilite CAPTCHA sem também integrar o desafio ao formulário; esta versão não fornece esse componente.

O arquivo `js/auth-config.js` e o HTML único já contêm a URL e a chave pública desse projeto. O formato abaixo é apenas referência para uma futura troca de projeto:

```js
window.EPHYRA_AUTH_CONFIG = Object.freeze({
  url: 'https://SEU-PROJETO.supabase.co',
  publicKey: 'SUA_CHAVE_PUBLICA',
});
```

Use a chave **publishable** (`sb_publishable_...`) ou a chave pública `anon`. Nunca coloque `service_role`, `sb_secret_...`, senha SMTP ou token de administração no site/GitHub. O código rejeita chaves administrativas na configuração do navegador. A configuração suporta domínios padrão `*.supabase.co`.

Em Authentication → URL Configuration:

- Site URL: URL final completa do site, por exemplo `https://murilloaraujo-hub.github.io/ephyra-finance/`.
- Redirect URLs: permita exatamente essa URL e também a variante terminada em `/index.html` caso seja usada. Para testes, adicione a URL local explicitamente, sem curingas de produção.

Mantenha `{{ .ConfirmationURL }}` nos links dos templates de confirmação e recuperação. O SDK recebe a sessão pelo fragmento do link e o remove da barra de endereço. O botão “Esqueci minha senha” envia a solicitação; o link abre o formulário de nova senha. Após salvar, o usuário volta ao login.

## 2. Envio de e-mails

Configure Custom SMTP em Authentication com um provedor e remetente verificado. O remetente e as credenciais ficam apenas no painel do Supabase. O serviço padrão do Supabase é restrito a testes e endereços autorizados da equipe; não atende um site público. Configure o domínio do remetente conforme as instruções do seu provedor e revise os limites de envio no Supabase.

O formulário mostra uma resposta genérica: “Se houver uma conta…”. Isso evita revelar quem está cadastrado. Erros de serviço ou excesso de tentativas não são apresentados como envio concluído.

## 3. Serviço de exclusão

A migração abaixo já foi aplicada ao projeto existente; não é necessário executá-la novamente:

`supabase/migrations/202609290001_delete_account_throttle.sql`

Ele cria o controle de tentativas de exclusão (5 por conta a cada janela de 15 minutos). A função SQL só pode ser chamada com a credencial administrativa no servidor. Os registros de limite são removidos automaticamente ao excluir o usuário.

A Edge Function `delete-account` já foi publicada e está ativa, a partir de:

`supabase/functions/delete-account/index.ts` e `handler.js` na mesma pasta

O serviço publicado aceita a origem `https://murilloaraujo-hub.github.io`. Se mudar a hospedagem, configure `SITE_ORIGIN` nos Secrets das Edge Functions como a **origem sem caminho** da nova hospedagem. O serviço lê as credenciais do ambiente do servidor e suporta chaves modernas e legadas. Nunca copie esses segredos para o frontend.

Somente se alterar o código do serviço, publique novamente com a CLI autenticada e o projeto vinculado, a partir da raiz deste projeto:

```sh
supabase functions deploy delete-account
```

`supabase/config.toml` define `verify_jwt = false`: a função verifica o token diretamente em Auth `/user`, antes de qualquer operação administrativa. Ao publicar pelo painel, use essa mesma opção. Isso não torna a exclusão anônima: tokens inválidos, origem diferente, senha errada e identidade divergente são rejeitados.

A função obtém o ID e o e-mail do usuário autenticado, confirma sua senha e exclui somente esse ID. Não aceita um ID escolhido pelo navegador. Se a exclusão falhar, a interface mantém a conta e os dados locais para uma nova tentativa.

## 4. Publicação e limpeza das contas antigas

Para a entrega em arquivo único, publique `Ephyra-Finance.html` como `index.html` no GitHub Pages. Ele já incorpora os scripts, estilos e a configuração pública do Supabase. A versão atualizada ainda não foi publicada. Abra o endereço HTTPS do site para usar os links de recuperação; abrir o arquivo diretamente pelo gerenciador de arquivos do celular não substitui a hospedagem.

Como alternativa para desenvolvimento, publique os arquivos separados do repositório, incluindo `js/vendor/supabase.min.js`, `js/auth-config.js` e `js/auth-service.js`. O código de servidor da pasta `supabase` já foi publicado separadamente no Supabase.

**Com o serviço configurado, a primeira abertura da nova versão em cada navegador apaga todas as contas locais antigas e seus dados Ephyra nesse navegador.** Essa limpeza é a alteração destrutiva solicitada pelo proprietário. Ela acontece uma vez, marcada no IndexedDB; recarregar não apaga as novas contas. A conta de demonstração não é recriada. Se quiser guardar informações antes, exporte-as pela versão antiga antes da atualização.

Não existe uma lista central de contas antigas para excluir remotamente: o sistema anterior armazenava tudo no navegador de cada pessoa. Navegadores que não abrirem a atualização conservam suas cópias. A migração não apaga usuários que já existam em um projeto Supabase escolhido.

Em Configurações → Zona Perigosa → Resetar Tudo, a pessoa confirma a senha e a exclusão. Após confirmação do servidor, o site remove sua conta, perfil, transações, metas, histórico, favoritos, resumo mensal e preferências locais associadas ao ID. Os demais usuários locais não são apagados por esse botão. Cópias exportadas e dados de outros dispositivos não podem ser removidos remotamente. Uma nova conta com o mesmo e-mail recebe outro ID e não herda os dados excluídos.

## 5. Verificação após ativação

1. Cadastre uma conta de teste com uma caixa de e-mail acessível e confirme o cadastro.
2. Saia, solicite recuperação, abra o link, escolha outra senha e entre com ela.
3. Confirme que a senha anterior falha e que um link expirado gera erro.
4. Crie uma transação de teste. Em Resetar Tudo, tente primeiro uma senha errada: a conta e a transação devem permanecer.
5. Confirme com a senha correta. Confira a remoção em Authentication → Users e a impossibilidade de entrar com as credenciais excluídas.

A interface foi testada com servidor simulado. No projeto real, a migração foi aplicada, as permissões foram verificadas e a função publicada rejeitou uma chamada sem autenticação com HTTP 401. O envio real de e-mails, o cadastro, a recuperação e a exclusão de uma conta de teste ainda precisam de validação completa após configurar SMTP, redirecionamentos e publicar o site.

## Dados e sessões

As credenciais passam a ser verificadas pelo Supabase Auth; o site não grava a senha. A sessão fica na aba (`sessionStorage`), e o aplicativo valida a conta no servidor ao restaurar o acesso. O bloqueio da interface ocorre após 30 minutos sem atividade ou 8 horas desde o login, inclusive após recarregar a aba. “Lembrar” guarda somente o e-mail.

**Os registros financeiros continuam no navegador, sem sincronização e sem criptografia em repouso.** Entrar em outro dispositivo não transfere esses registros. A foto e o salário inicial são locais; na confirmação de cadastro em outro navegador, registre o salário pelo botão Receita. O perfil permite editar nome e foto; o e-mail de acesso fica somente para leitura nesta versão.

## Documentação oficial

- [Recuperação de senha](https://supabase.com/docs/guides/auth/passwords)
- [SMTP próprio](https://supabase.com/docs/guides/auth/auth-smtp)
- [URLs de redirecionamento](https://supabase.com/docs/guides/auth/redirect-urls)
- [Exclusão administrativa de usuário](https://supabase.com/docs/reference/javascript/auth-admin-deleteuser)
- [Autenticação das Edge Functions](https://supabase.com/docs/guides/functions/auth)
