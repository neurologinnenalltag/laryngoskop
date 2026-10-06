# Laryngoskop

EKG-Quiz für das Handy mit anonymer Live-Auswertung.

| Seite | Zweck |
|---|---|
| `/?runde=vortrag` | **Vortrag:** Publikum (QR-Code `laryngoskop-qr.png`). Fragen erscheinen erst, wenn sie freigegeben werden. |
| `/vortrag.html` | **Präsentation:** alle Folien im Browser, Quizfragen werden beim Weiterschalten freigegeben und aufgelöst. `R` öffnet die Referentenansicht mit Notizen. |
| `/ergebnis.html?runde=vortrag` | **Beamer/Moderation:** Live-Balken, Fragen freigeben, Auflösen, Statistik zurücksetzen (PIN). |
| `/` | Freier Modus: alle Fragen im eigenen Tempo. |

Dateien: `ekg.js` (Folien, Fragen, Notizen + EKG-Grafiken), `vortrag.html` (Präsentation), `qrcode.js` (QR-Code-Bibliothek, MIT), `quiz.js` (Teilnehmerseite), `ergebnis.html` (Auswertung), `supabase.sql` (Datenbank).

Gespeichert werden nur Runde, Frage, Antwort, richtig/falsch und eine zufällige Geräte-ID – keine Namen, kein Login. Einzelantworten sind öffentlich nicht lesbar, die Ergebnisseite erhält nur Summen.
