# PLAYER FORGE — RPG Character Sheet v7.33

Sistema local e genérico de fichas para o meu grupo de RPG com um save portátil por personagem.

VOCÊ PRECISA BAIXAR O NODE.JS PARA QUE O PLAYER FORGE FUNCIONE

## Abrir

1. Extraia a pasta.
2. Abra a pasta `player-forge`.
3. Abra o PowerShell nessa pasta. (clique com o mouse na barra digitável no topo dos arquivos (provavelmente estará algo como "Downloads > Player.Forge.v7.33", apenas digite "powershell" e aperte enter)
4. Rode `node server.js`.
5. Acesse no seu navegador `http://localhost:3000`.

## Save portátil

Todo conteúdo editável do personagem fica em:

```text
save/
├── character.json
├── README_SAVE.txt
└── uploads/
```

Sem a pasta `save`, o servidor cria uma ficha vazia automaticamente.
Após cada alteração, a pasta save guardará automaticamente as informações do personagem, faça sempre um backup.
Em caso de atualização de versão, copie sua pasta de SAVE para a nova versão, suas informações serão transferidas

## v7.3

- Nova aba expansível **MAGIAS | PARTICULARIDADES** acima do Inventário.
- Cada registro possui **Título, Imagem e Descrição**.
- Os registros podem ser adicionados, editados e removidos pela aba **Editar ficha**.
- Dados em `save/character.json` e imagens em `save/uploads/`.
- Saves anteriores continuam compatíveis; a nova lista começa vazia quando não existir no save.
- Mantém o combate da v7.21 com prévia automática, sem botão de prévia.
- Histórico de combate mostra dano recebido/vida e cura recebida/vida.

## v7.31

Em **Editar ficha → Magias | Particularidades**, cada registro possui listas independentes de **Capacidades** (título, descrição e valor opcional) e **Efeitos de Status** (nome e qualquer quantidade de stacks, cada uma com rótulo e efeito/dano). Elas aparecem após a descrição no painel de leitura. Não alteram automaticamente o combate.

Saves anteriores: `abilities` e `statusEffects` ausentes são tratados como listas vazias. Copie a pasta `save` inteira ao atualizar.

## v7.32

Em **Editar ficha → Rituais**, adicione cada ritual com título, descrição e imagem opcional. Cada ritual tem uma lista independente de **Capacidades**, com título, custo opcional (inclusive custos múltiplos em texto livre) e efeito. No painel de visão geral, RITUAIS fica entre MAGIAS | PARTICULARIDADES e INVENTÁRIO; clique para expandir e visualizar os detalhes. Os dados residem no campo `rituals` de `save/character.json`, e imagens adicionadas ficam em `save/uploads/`.

Saves da v7.31 e anteriores carregam com `rituals: []` quando o campo está ausente. Ao atualizar, substitua a pasta `save/` inteira pela sua cópia antiga. Placeholders dos editores foram neutralizados para todos os personagens. Rituais são informativos e não aplicam efeitos automaticamente no combate.


## v7.33 — leitura compacta / arquivo limpo

- Magias | Particularidades e Rituais possuem área de rolagem independente e limite de altura; ao expandir um registro, os detalhes também podem ser rolados sem aumentar indefinidamente a página.
- Na visualização, **Descrição**, **Capacidades** e **Efeitos de Status** são seções recolhíveis por registro. Em Rituais: **Descrição** e **Capacidades**.
- A distribuição inclui `save/character.json` em branco e `save/uploads/` vazia; não inclui informações ou imagens do personagem de exemplo.
- Para usar seu próprio personagem, com o servidor fechado, substitua a pasta `save/` do pacote pela sua pasta `save/` completa. A interface não altera os dados existentes.
