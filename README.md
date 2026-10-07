# Autoškola

Jednoduchá responzívna React + TypeScript + Material UI aplikácia na precvičovanie verejných testov MV SR.

## Spustenie

```sh
npm install
npm run dev
```

Na Windows PowerShelli so zakázanými `.ps1` skriptmi použi `npm.cmd run dev`.
Na testovanie na mobile v rovnakej sieti použi `npm.cmd run dev -- --host 0.0.0.0`
a otvor sieťovú adresu vypísanú Vite.

## Režimy

- **Skúšobné testy:** 100 samostatných testov. Každý má vlastný čas, odpovede a poslednú
  otázku. Čas beží iba v otvorenom, viditeľnom teste. Pri odchode, skrytí záložky
  alebo zatvorení stránky sa zastaví. Obnovenie stránky otvorí prehľad; po otvorení
  testu sa pokračuje na uloženej otázke. Posledná odpoveď alebo vypršanie času
  test automaticky ukončí. Percento vyjadruje podiel správnych otázok; bodové
  hodnotenie zohľadňuje rôzne váhy otázok (90/100 na úspech).
- **Všetky otázky:** 956 unikátnych otázok bez časového limitu. Filtre Všetky,
  Nezodpovedané, Správne a Nesprávne. Opakovanie filtra je nezávislý pokus bez
  vopred odhalených odpovedí. Po dokončení možno výslovne preniesť správne odpovede
  do pôvodného pokroku. Neúspešné odpovede nemenia pôvodné výsledky.

Odpoveď je po vyhodnotení uzamknutá; nový pokus je dostupný cez reset alebo opakovanie.
Pokrok testov a pokrok unikátnych otázok sú zámerne oddelené. Reset otázok nevymaže testy.
Na mobile sa mriežka otvára tlačidlom **Prehľad otázok**. Všetky otázky v mriežke
sú dostupné, aj keď sa na obrazovku nezmestia naraz.

## Ukladanie

Všetko je uložené lokálne v prehliadači (`autoskola.progress.v1`), bez účtu a servera.
Vymazanie dát prehliadača vymaže aj pokrok. Zmena adresy, portu, zariadenia alebo
prehliadača má samostatné úložisko. Aplikácia nie je synchronizovaná medzi záložkami;
odporúčané je mať otvorenú jednu inštanciu. Pri nedostupnom úložisku zobrazí upozornenie.

## Overenie

```sh
npm run build
npm run lint
npm test
```

End-to-end testy používajú Playwright a lokálne nainštalovaný Google Chrome.
Overujú časovače, pozastavenie a návrat, dokončenie a timeout, reset, opakovanie
nesprávnych otázok, prenos výsledkov, načítanie obrázkov a rozloženie pri šírkach
360, 390, 768 a 1440 pixelov.

Zdroj a importer dát sú popísané v `src/assets/minv/README.md`.
Ide o verejný **príklad teoretickej skúšky** MV SR, nie potvrdenú úplnú internú databázu.

