# Testy MV SR – slovenský verejný príklad

Zdroj: https://www.minv.sk/egovinet02/PCPZobrazFile?fileName=test2.html

Stiahnuté sú **všetky slovenské testy z dátového súboru priamo načítaného touto stránkou**:
100 testov, 4 000 výskytov otázok, 956 jedinečných otázok, 240 obrázkov.
Stránka je označená „Príklad teoretickej skúšky“. Tento export nie je potvrdením
úplnosti internej skúšobnej databázy ani súladu otázok s najnovšou legislatívou.
Dátum získania a odtlačok zdrojového súboru sú v `metadata.json`.
Zdroj neuvádza overiteľný dátum aktualizácie; importuje sa aktuálne poskytovaný obsah.

## Súbory

- `tests.sk.json`: celé testy vrátane otázok, pôvodného poradia odpovedí,
  časového limitu a bodových hraníc.
- `tests.compact.json`: identické testy ako odkazy na unikátne otázky a poradie
  odpovedí; `index.ts` ich obnovuje, aby sa texty zbytočne neopakovali v mobilnom builde.
- `questions.sk.json`: otázky deduplikované podľa pôvodného ID; poradie odpovedí
  z prvého výskytu. Správnosť je kontrolovaná aj pri premiešaní odpovedí v iných testoch.
- `categories.sk.json`: 10 tematických okruhov.
- `source.sk.json`: pôvodné slovenské dáta bez zmeny schémy.
- `images/`: všetky obrázky odkazované slovenskými otázkami; zdieľané obrázky
  sú uložené iba raz a každá otázka má príslušnú lokálnu cestu.
- `images.json`: zdrojové URL, veľkosti, skutočné formáty a SHA-256 obrázkov.
- `metadata.json`: pôvod, rozsah a čas stiahnutia.
- `index.ts`: export dát a helper na URL obrázkov pre React/Vite.

`correctAnswerIndex` je **index od nuly** (0 = A, 1 = B, 2 = C), nie pôvodné
číslovanie `platna` od 1. `image` je relatívna cesta voči `src/assets/minv`,
alebo `null`. Každý test má vlastné poradie odpovedí a zodpovedajúci index;
pri použití testov ho nenahrádzajte poradím z deduplikovaného zoznamu.
Diakritika a pôvodné texty vrátane prípadných preklepov sú zachované (UTF-8).
Niektoré zdrojové `.jpg` obsahujú PNG; ponechané sú originálne názvy a bajty.

## Použitie v React/Vite

```tsx
import { tests, getQuestionImageUrl } from './assets/minv'

const question = tests[0].questions[0]
const imageUrl = getQuestionImageUrl(question)
// V komponente: imageUrl && <img src={imageUrl} alt="Ilustrácia otázky" />
// Správna odpoveď: question.answers[question.correctAnswerIndex]
```

Helper používa `import.meta.glob`, aby Vite zahrnul obrázky do produkčného buildu.
Samotný reťazec cesty z JSON nestačí použiť ako URL obrázka.

## Opätovné stiahnutie

Z koreňa aplikácie: `python scripts/download-minv-tests.py`.
Importer objaví dátový súbor priamo v HTML; JavaScript nikdy nevykonáva.
Existujúce obrázky kontroluje a opätovne používa. Pri požiadavke na čerstvé
stiahnutie už uloženého obrázka odstráňte príslušný súbor pred spustením.
Kontroluje počty a body otázok, správne odpovede, konzistenciu ID a formáty obrázkov.
Používa iba štandardnú knižnicu Pythonu.
