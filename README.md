# StreamVelocity Gen

Lokalny generator bannerów kierowców VRCP z pliku CSV. Rysuje overlaye w przeglądarce (Canvas) — bez Gemini i bez Google AI Studio.

**Live:** https://ricozwar.github.io/StreamVelocityGen/

## Uruchomienie

Wymagane: [Node.js](https://nodejs.org/)

**Windows:** dwuklik na `start.bat` (zainstaluje zależności przy pierwszym starcie i otworzy http://localhost:3003/).

Albo ręcznie:

```
npm install
npm run dev
```

Serwer stoi na `http://localhost:3003/`.

## CSV

Wejście: lista zgłoszeń (UTF-8). Rozpoznawane kolumny:

| Dane na banerze | Kolumny |
| --- | --- |
| Imię i nazwisko | `real name` (albo kierowca / driver) |
| Numer | `car number` |
| Marka / logo | `car name` (pierwszy człon, np. Lamborghini) |
| Klasa | `car class` (gdy brak — PRO) |

Przykład w repo: `entrylist (15).csv`.

1. Upuść lub wybierz CSV.
2. Ewentualnie popraw imię / markę w karcie, włącz team i wpisz nazwę.
3. **Generate Banners** → **Pobierz wszystkie** (ZIP z PNG 1000×100, nazwa pliku = imię i nazwisko) albo **Download** przy pojedynczym kierowcy.
