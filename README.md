# MAL Jiten Difficulty Percent

Userscript do Tampermonkey que adiciona **percentuais de dificuldade do Jiten com cores** nas capas de anime do MyAnimeList.

Funciona nas páginas de detalhes, listas, Top Anime, Seasonal, resultados de busca e na maioria das outras páginas que exibem capas.

## Funcionalidades

- Mostra a dificuldade como um badge de porcentagem (calculado a partir da pontuação de dificuldade do Jiten)
- Cores de acordo com a dificuldade:
  - **Azul** < 40%
  - **Verde** 40–59%
  - **Limão/Amarelo** 60–74%
  - **Laranja** 75–84%
  - **Vermelho** 85–94%
  - **Roxo** ≥ 95%
- O tamanho do badge se adapta ao tamanho da capa (tiny → xlarge)
- Tooltip ao passar o mouse mostra: dificuldade %, tempo estimado de fala e contagem de palavras
- Clicar no badge abre o deck correspondente no Jiten
- Resultados são salvos em cache por 7 dias (localStorage) para reduzir chamadas à API
- Funciona tanto em carregamentos completos de página quanto em conteúdo dinâmico / navegação estilo SPA do MAL

## Instalação

1. Instale o [Tampermonkey](https://www.tampermonkey.net/) (Chrome, Firefox, Edge, Safari, etc.)
2. Crie um novo userscript e cole o conteúdo do arquivo `mal-jiten-difficulty.user.js`  
   (ou instale diretamente pelo arquivo raw se estiver hospedado no GitHub/Gist)
3. Certifique-se de que o script está ativado e corresponde a `https://myanimelist.net/*`
4. Recarregue qualquer página do MyAnimeList

O script precisa de permissão para se conectar a `api.jiten.moe`.

## Como funciona (versão resumida)

1. Encontra capas / links de anime que contenham um ID do MAL (`/anime/{id}`)
2. Chama a API do Jiten:
   - `GET /api/media-deck/by-link-id/5/{malId}` (tipo 5 = MyAnimeList)
   - Depois busca os detalhes do deck
3. Converte `difficultyRaw` (escala de 0–5) → porcentagem (0–100)
4. Cria um badge posicionado na capa com a porcentagem e a cor correspondente
5. Salva o resultado em cache para que o mesmo anime não faça nova requisição por uma semana

## Observações / Limitações

- Só funciona para animes que possuem um media deck vinculado no Jiten
- Se não existir deck, nada é mostrado
- O posicionamento do badge depende do container da capa ter `position: relative` (o script define isso quando necessário)
- Páginas muito dinâmicas podem demorar um pouco para os badges aparecerem (MutationObserver + debounce curto)

## Créditos

- Dados fornecidos por [Jiten](https://jiten.moe)
- Funciona no [MyAnimeList](https://myanimelist.net)