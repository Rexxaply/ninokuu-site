// Isi dengan proyek Supabase milikmu (Project Settings → API).
// Hanya kunci publik (anon / publishable). JANGAN pernah menaruh kunci service_role di sini.
window.NINONIME_CONFIG = {
  SUPABASE_URL: "https://ocersqyrztzegwzjvvoh.supabase.co",
  SUPABASE_ANON_KEY: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9jZXJzcXlyenR6ZWd3emp2dm9oIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTQ2MzEyNjgsImV4cCI6MjExMDIwNzI2OH0.X7LbJUQ375iCEpypD-HHsXuopbfOOf9oc-kD5leR-lY",
  VERSION: "0.1.0",
  // Isi "ninokuu:session" bila NinoNime satu alamat situs dengan Ninokuu (sekali login untuk keduanya).
  // Biarkan kosong bila beda domain: login terpisah, akun tetap sama.
  SESSION_KEY: "",
  // Alamat NinoNime: ninokuu.site/ninonime/ (folder sendiri, tidak menyentuh halaman Ninokuu).
  // Kedua alamat di bawah HARUS ada di Supabase → Auth → URL Configuration → Redirect URLs (cukup tambah: https://ninokuu.site/ninonime/**).
  // Tujuan tautan di email verifikasi (setelah daftar):
  VERIFY_URL: "https://ninokuu.site/ninonime/verified/",
  // Tujuan tautan di email "lupa password":
  RESET_URL: "https://ninokuu.site/ninonime/resetpassword/",
  // nomor bot WhatsApp yang membuat keypass (format internasional, tanpa +)
  // Versi demo: semua sampul anime diganti sampul bertanda NinoNime (icons/demo-cover.jpg). false = sampul asli.
  DEMO_COVERS: true,
  WA_BOT: "6285190814446",
};
