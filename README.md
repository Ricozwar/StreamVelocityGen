# StreamVelocity Gen

Lokalny generator bannerów kierowców VRCP z CSV i JSON SimGrid. Rysuje overlaye w przeglądarce (Canvas) — bez Gemini i bez Google AI Studio.

**Live:** https://ricozwar.github.io/StreamVelocityGen/

Repo: https://github.com/Ricozwar/StreamVelocityGen

## Uruchomienie

Wymagane: [Node.js](https://nodejs.org/)

**Windows:** dwuklik na `start.bat` (zainstaluje zależności przy pierwszym starcie i otworzy http://localhost:3003/).

Albo ręcznie:

```
npm install
npm run dev
```

Serwer stoi na `http://localhost:3003/`.

## CSV i JSON

Wejście: lista zgłoszeń z SimGrid (UTF-8). Możesz wrzucić **tylko CSV**, **tylko JSON** albo **oba naraz**.

| Dane na banerze | Źródło |
| --- | --- |
| Imię i nazwisko | JSON: `firstName` + `lastName`. CSV: domyślnie `real name` (w eksporcie SimGrid to zwykle nick). Po wczytaniu możesz zaznaczyć inne / kilka pól. Po wygenerowaniu nazwę da się poprawić i **Zapisać** (przerysuje baner). |
| Numer | `car number` / `raceNumber` |
| Marka / logo | CSV `car name` (pierwszy człon, np. Mazda) |
| Klasa | CSV `car class` (gdy brak — PRO) |

JSON i CSV spina `playerID` z JSON (`P…` / `M…` / `S…`) z kolumnami `psn_id`, `xbox_id`, `steam64_id`. Wpisy w JSON bez imienia (same admin ID) są pomijane.

Przykład CSV w repo: `entrylist (15).csv`.

1. Upuść lub wybierz CSV i/lub JSON (Entrylist).
2. Ewentualnie popraw imię / markę w karcie, włącz team i wpisz nazwę.
3. **Generate Banners** → **Pobierz wszystkie** (ZIP z PNG 1000×100, nazwa pliku = imię i nazwisko) albo **Download** przy pojedynczym kierowcy.
