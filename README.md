# Find My Buddy

MVP af en anonym koncert/festival-app.

## Produktprincipper (opdateret)

- Ingen permanent datalagring i browseren (ingen localStorage/sessionStorage i flowet).
- En admin opretter gruppen og inviterer resten via gruppekode.
- Brugere er anonyme via kaldenavn.
- Kun gruppen kan se din position.
- Brugeren kan altid selv forlade gruppen.
- Navigation skal finde nærmeste makker (pil-flowet er næste trin i MVP).


## Sådan prøver du appen lokalt

1. Start en lokal webserver i projektmappen:
   ```bash
   python -m http.server 4173
   ```
2. Åbn browseren på:
   - `http://localhost:4173/index.html` (start flow)
   - `http://localhost:4173/group.html?code=ABC123&role=admin&nick=Test` (hurtig demo af gruppeside)
3. Stop serveren igen med `Ctrl+C`.

> Tip: Åbn siden i to faner (eller to telefoner) for at teste admin/member-flowet hurtigere.
