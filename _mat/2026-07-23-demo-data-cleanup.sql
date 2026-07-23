-- I dati demo non vengono più generati/scritti su DB: ora sono un dataset
-- hardcoded in lib/demoData.ts, unito ai dati reali solo lato rendering quando
-- il toggle "Demo" è attivo. Questa query rimuove eventuali righe residue create
-- dal vecchio meccanismo (generateDemoData) prima di questa modifica.
DELETE FROM projects WHERE is_demo = true;
DELETE FROM users WHERE is_demo = true;
