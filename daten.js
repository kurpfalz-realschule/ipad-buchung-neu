/* ════════════════════════════════════════════════════════════════
   KRS iPad-Buchung (neu) — gemeinsame Stammdaten
   Wird von index.html (Demo/Seed) UND etiketten.html (Druck) geladen.
   Quelle der echten Koffer: "Medienbuchung (Vorlage neu)".
   ════════════════════════════════════════════════════════════════ */
window.KRS_MEDIEN = {

  // ── Physische Koffer / Medien (Barcode = Scan-Code am Koffer) ──
  // kapazitaet: bei Laptops aus der Vorlage (15); bei iPad-Koffern liegt
  // keine Stückzahl vor → 0 = "nicht hinterlegt" (nur 1 buchbare Einheit).
  KOFFER: [
    // iPad-Koffer · Standort LZ (Lernzentrum)
    { barcode: 'KOFFER-01', bezeichnung: 'iPad lila/weiß',     typ: 'ipad_koffer', kapazitaet: 0, standort: 'LZ',  notiz: 'iPad-Wagen (3 Koffer)' },
    { barcode: 'KOFFER-02', bezeichnung: 'iPad grün',          typ: 'ipad_koffer', kapazitaet: 0, standort: 'LZ',  notiz: '' },
    { barcode: 'KOFFER-03', bezeichnung: 'iPad gelb',          typ: 'ipad_koffer', kapazitaet: 0, standort: 'LZ',  notiz: '' },
    { barcode: 'KOFFER-04', bezeichnung: 'iPad braun',         typ: 'ipad_koffer', kapazitaet: 0, standort: 'LZ',  notiz: 'iPad-Wagen (2 Koffer)' },
    { barcode: 'KOFFER-05', bezeichnung: 'iPad grün/gelb',     typ: 'ipad_koffer', kapazitaet: 0, standort: 'LZ',  notiz: '' },
    { barcode: 'KOFFER-06', bezeichnung: 'iPad rot/braun',     typ: 'ipad_koffer', kapazitaet: 0, standort: 'LZ',  notiz: 'weißer Koffer' },
    // iPad-Koffer · Standort 1. OG
    { barcode: 'KOFFER-07', bezeichnung: 'iPad Silber',        typ: 'ipad_koffer', kapazitaet: 0, standort: '1OG', notiz: '' },
    { barcode: 'KOFFER-08', bezeichnung: 'iPad Rot',           typ: 'ipad_koffer', kapazitaet: 0, standort: '1OG', notiz: '' },
    { barcode: 'KOFFER-09', bezeichnung: 'iPad weiß',          typ: 'ipad_koffer', kapazitaet: 0, standort: '1OG', notiz: '' },
    { barcode: 'KOFFER-10', bezeichnung: 'iPad lila',          typ: 'ipad_koffer', kapazitaet: 0, standort: '1OG', notiz: '' },
    { barcode: 'KOFFER-11', bezeichnung: 'iPad orange',        typ: 'ipad_koffer', kapazitaet: 0, standort: '1OG', notiz: '' },
    { barcode: 'KOFFER-12', bezeichnung: 'iPad grün/rot (VKL)', typ: 'ipad_koffer', kapazitaet: 0, standort: '1OG', notiz: 'VKL' },
    // Laptop-Koffer (Stückzahl aus Vorlage)
    { barcode: 'LAPTOP-01', bezeichnung: 'Laptop-Koffer 1',    typ: 'laptop_koffer', kapazitaet: 15, standort: 'LZ',  notiz: '15 PCs' },
    { barcode: 'LAPTOP-02', bezeichnung: 'Laptop-Koffer 2',    typ: 'laptop_koffer', kapazitaet: 15, standort: 'LZ',  notiz: '15 Stück' },
    { barcode: 'LAPTOP-03', bezeichnung: 'Laptop-Koffer 1',    typ: 'laptop_koffer', kapazitaet: 15, standort: '1OG', notiz: '15 PCs' },
    { barcode: 'LAPTOP-04', bezeichnung: 'Laptop-Koffer 2',    typ: 'laptop_koffer', kapazitaet: 15, standort: '1OG', notiz: '15 Stück' }
  ],

  // ── Lehrkräfte (für Wand-Etiketten mit Lehrer-Code L-<Kürzel>) ──
  // S2 (2026-07-03): Klarnamen entfernt (DSGVO) — dies ist NUR die
  // anonyme Demo-/Platzhalter-Liste. Produktiv:
  //  · App (index.html): Lehrer-Codes werden serverseitig aufgelöst
  //    (rpc_station_checkout); die Anzeige-Liste kommt nach Login aus
  //    der SECURITY-DEFINER-RPC get_kollegium_public() (public.users).
  //  · Etiketten-Druck (etiketten.html): echte Liste lokal über die
  //    NICHT eingecheckte Datei daten.local.js (siehe .gitignore).
  LEHRER: [
    { kuerzel: 'Ko', name: 'Demo-Admin' },  { kuerzel: 'L2', name: 'Lehrkraft B' },
    { kuerzel: 'L3', name: 'Lehrkraft C' }, { kuerzel: 'L4', name: 'Lehrkraft D' },
    { kuerzel: 'L5', name: 'Lehrkraft E' }, { kuerzel: 'L6', name: 'Lehrkraft F' }
  ],

  // ── Aktions- und Slot-Barcodes (hängen an der Wand) ──
  AKTIONEN: [
    { code: 'AKTION-RUECKGABE', label: 'RÜCKGABE', sub: 'Koffer zurückgeben', icon: '📥' }
  ],
  SLOTS: [
    { code: 'SLOT-JETZT',    label: 'Aktuelle Stunde',  sub: 'jetzt buchen',        kind: 'jetzt'  },
    { code: 'SLOT-NAECHSTE', label: 'Nächste Stunde',   sub: 'nächste Einzelstunde', kind: 'naechste' },
    { code: 'SLOT-DOPPEL',   label: 'Doppelstunde',     sub: 'jetzt + nächste',      kind: 'doppel' },
    { code: 'SLOT-1', label: '1. Stunde', kind: 'fix', stunde: 1 },
    { code: 'SLOT-2', label: '2. Stunde', kind: 'fix', stunde: 2 },
    { code: 'SLOT-3', label: '3. Stunde', kind: 'fix', stunde: 3 },
    { code: 'SLOT-4', label: '4. Stunde', kind: 'fix', stunde: 4 },
    { code: 'SLOT-5', label: '5. Stunde', kind: 'fix', stunde: 5 },
    { code: 'SLOT-6', label: '6. Stunde', kind: 'fix', stunde: 6 },
    { code: 'SLOT-7', label: '7. Stunde', kind: 'fix', stunde: 7 },
    { code: 'SLOT-8', label: '8. Stunde', kind: 'fix', stunde: 8 }
  ],

  // ── Klingelzeiten (Stunde → Start/Ende) ────────────────────────
  // Offizielle KRS-Läutezeiten, Quelle: realschule-schriesheim.de/laeutezeiten
  // (Block 1/2: 7:50–8:35 / 8:35–9:20 · Pause 9:20–9:40 · Block 3/4: 9:40–10:25 /
  //  10:25–11:10 · Pause 11:10–11:25 · Block 5/6: 11:25–12:10 / 12:10–12:55 ·
  //  Mittagspause 12:55–13:20 · Block 7/8: 13:20–14:05 / 14:05–14:50 ·
  //  Stunde 9 (nur AES/„Mum"): 14:50–15:35). Format "HH:MM".
  STUNDEN_ZEITEN: {
    1: ['07:50', '08:35'], 2: ['08:35', '09:20'], 3: ['09:40', '10:25'],
    4: ['10:25', '11:10'], 5: ['11:25', '12:10'], 6: ['12:10', '12:55'],
    7: ['13:20', '14:05'], 8: ['14:05', '14:50'], 9: ['14:50', '15:35']
  }
};
