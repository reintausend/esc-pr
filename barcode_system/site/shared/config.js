// Central configuration for both the station and the scan page.
//
// To connect the cloud: create a Supabase project, run supabase/schema.sql
// in its SQL editor, then fill in supabaseUrl and supabaseAnonKey below.
// While both are empty the system runs in OFFLINE mode: entries are kept in
// this browser's localStorage, so station and scan page work together only
// on the same machine (useful for development and demos).

export const CONFIG = {
  supabaseUrl: "", // e.g. "https://abcdefgh.supabase.co"
  supabaseAnonKey: "",
  bucket: "artworks",
  table: "messages",

  // Local print server (epson/print_server.py). Drives the physical
  // Epson TM-T88IV and serves both parts of the receipt:
  //   POST /print          - part 1, the hidden-message artwork only (this
  //                           file's PNG); no tick strip, no corner marks.
  //   POST /print-receipt  - part 2, the info receipt (built server-side by
  //                           epson/info_receipt.py) using the SAME code; its
  //                           tick strip is the scannable barcode.
  printHelperUrl: "http://localhost:8740",

  // Decode website URL printed on the info receipt (part 2): the mobile
  // client at /mobile/ (e.g. "https://<user>.github.io/<repo>/mobile/").
  // Placeholder until the site is live on GitHub Pages - update this then.
  decodeUrl: "",

  // Epson TM-T88IV: 180 dpi, 512 printable dots per line on 80 mm paper.
  printWidthDots: 512,

  // No word/character limit: the message length is only restricted by the
  // generator's charset (gui/js/entry.js); long messages print longer
  // receipts. The tick code carries just the lookup id, never the text.

  // Camera scanning
  scan: {
    frameIntervalMs: 250,
    maxFrameSize: 1000, // longest side of the analyzed camera frame
    // accept when one frame yields >= minHitsInstant scanline hits, or the
    // same id is seen (with fewer hits) in two consecutive frames
    minHitsInstant: 2,
  },
};
