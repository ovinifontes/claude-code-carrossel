# Padrão de Carrossel — ArkheDigital

## Identidade Visual

| Elemento | Valor |
|----------|-------|
| Arkhe Blue | `#045C90` |
| Cyan | `#24D1E7` |
| Energy Orange | `#F58118` |
| Fundo escuro | `#0B1622` |
| Fundo secundário | `#111D2E` |
| Texto principal | `#FFFFFF` |
| Texto secundário | `#B8C5D3` |
| Fonte | Sora (Google Fonts) — Bold para títulos, Regular para corpo |
| Formato | 1080×1350px (portrait Instagram) |

## Estrutura Padrão (7-10 slides)

### Slide 1 — CAPA
- Imagem de fundo gerada por IA (Gemini/NanoBanana Pro)
- Overlay escuro com gradiente para legibilidade
- Logo ArkheDigital no topo
- Tag "INTELIGÊNCIA ARTIFICIAL" em Cyan
- Título grande e impactante (max 8 palavras)
- Subtítulo provocativo (1 frase)
- "Deslize para saber mais →" em Cyan

### Slides 2-3 — CONTEXTO
- O que aconteceu / Por que importa
- Barra de acento colorida (gradiente Cyan → Orange)
- Indicador "ARKHEDIGITAL • SLIDE N" no topo
- Linha decorativa lateral (gradiente Cyan → Blue)
- Título max 6 palavras
- Corpo max 40 palavras

### Slides 4-6 — DETALHES
- Fatos, dados, comparações
- Mesmo layout dos slides de contexto
- Emojis com moderação (1 por slide, no máximo)

### Slides 7-8 — IMPACTO
- O que muda na prática para o leitor
- Conexão com o dia a dia do público

### Slide 9 (opcional) — OPINIÃO
- Visão/previsão da ArkheDigital sobre o tema

### Slide Final — CTA
- Título: chamada para ação
- Handle: @arkhedigitall em destaque (Cyan)
- Botões visuais: 💾 Salvar | 🔄 Compartilhar | ❤️ Curtir

## Elementos Visuais Recorrentes

- **Glows decorativos**: círculos radiais suaves de Cyan e Blue nos cantos
- **Linha lateral**: gradiente vertical Cyan → Blue no lado esquerdo (slides de conteúdo)
- **Barra de acento**: 60px de largura, gradiente Cyan → Orange, abaixo do emoji
- **Footer**: Logo "A" + "ArkheDigital" à esquerda, número do slide à direita
- **Título com gradiente**: texto com gradiente Branco → Cyan (CSS background-clip)

## Diretrizes de Copywriting

- Linguagem: Português Brasil
- Tom: Profissional mas acessível — nunca formal demais
- Público: Profissionais e entusiastas de tech/IA
- Cada slide: max 40 palavras de corpo
- Títulos: max 6 palavras, impactantes
- Emojis: com moderação (1 por slide max)

## Caption do Post (DOCX)

- Gancho forte na primeira linha (aparece no preview)
- 3-4 parágrafos curtos
- CTA final: "Salve esse post e compartilhe com quem precisa saber disso!"
- Hashtags relevantes (8-15)
- Max 300 palavras total

## Schedule

| Dia | Horário BRT | Cron UTC |
|-----|-------------|----------|
| Terça | 6h | `0 9 * * 2` |
| Quinta | 6h | `0 9 * * 4` |
| Sábado | 6h | `0 9 * * 6` |
