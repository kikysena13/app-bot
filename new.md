## Pembaruan

- Memperbaiki tombol `All servers` pada halaman detail server agar selalu kembali ke dashboard menggunakan navigasi yang aman, termasuk saat halaman dibuka langsung atau setelah refresh.
- Menambahkan menu/section `Members` pada detail server yang menampilkan total member aktif, daftar member, dan tanggal mereka bergabung.
- API daftar member kini hanya menampilkan member yang masih aktif di server; jumlah total juga dihitung dari member aktif.
- Tidak ada perubahan struktur database pada pembaruan ini. Tabel `guild_members` yang sudah didefinisikan di `backend/src/db/migrations/001_initial.sql` digunakan kembali.
- Menambahkan sinkronisasi member langsung dari Discord menggunakan cache member guild, sehingga member yang sudah ada sebelum bot aktif ikut muncul.
- Menambahkan metadata member: username, avatar, banner, dekorasi avatar, accent color/border, role, dan tanggal join asli dari Discord.
- Menambahkan kolom metadata member ke `backend/src/db/migrations/001_initial.sql`.
- Agar sinkronisasi dapat mengambil seluruh member, bot harus mengaktifkan **Server Members Intent** pada Discord Developer Portal; backend juga perlu dijalankan ulang agar kode sinkronisasi terbaru dimuat.
Atau langsung jalankan frontend Android:cd /d B:\appsv npm --prefix frontend run android

## Pembaruan Terbaru

- Menambahkan Discord bot presence `Watching your server~ ♡` dengan status `online` saat client berhasil terhubung.
- Presence dipasang ulang setiap kali event `ClientReady` terpanggil, termasuk setelah bot melakukan reconnect.
- Menambahkan command Discord `/forbidden` di `backend/src/commands/forbidden.ts`.
- Command `/forbidden` hanya dapat digunakan oleh member dengan permission **Administrator**.
- Menambahkan pencatatan kata terlarang `shit`, `sex`, dan `kntl` dari event `messageCreate`.
- Pencocokan kata menggunakan kata utuh; tanda baca di sekitar kata tetap diperbolehkan, sedangkan kata yang hanya mengandung teks tersebut tidak dihitung.
- Setiap pelanggaran menyimpan guild, member, display name, username, avatar, kata yang digunakan, channel, message ID, dan waktu kejadian.
- Menambahkan tabel `forbidden_messages` ke `backend/src/db/migrations/001_initial.sql`.
- Command `/forbidden` menampilkan laporan embed berisi member, foto profil, jumlah penggunaan, kata yang digunakan, serta waktu setiap pesan.
- Slash command didaftarkan ke setiap guild saat bot siap tanpa menghapus command lain yang sudah terdaftar.
- Debugging: menambahkan `GatewayIntentBits.MessageContent` agar bot dapat membaca isi pesan untuk pencatatan forbidden chat.
- **Message Content Intent** juga harus diaktifkan pada Discord Developer Portal di halaman Bot, lalu backend wajib direstart.
- Debugging lanjutan: command kini memakai `deferReply` sebelum query database agar tidak kedaluwarsa saat laporan diproses.
- Menambahkan alias `/forbiden` selain `/forbidden` untuk mengakomodasi penulisan command yang digunakan.
- Backend typecheck berhasil dijalankan dengan `npm --prefix backend run typecheck`.
- Memvalidasi koneksi database dan memastikan tabel `forbidden_messages` tersedia di database `DISCORD`.
- Memperbaiki proses laporan agar menggunakan `deferReply` sebelum mengambil data dari database, lalu mengirim hasil menggunakan `editReply`.
- Menambahkan pendaftaran kedua nama slash command saat bot siap, tanpa menghapus command lain yang sudah ada.
- Menambahkan opsi `urutan` pada `/forbidden` dan `/forbiden` dengan pilihan `Member terbaru` atau `Member terlama`.
- Laporan forbidden kini mengurutkan member berdasarkan `joined_at` dari tabel `guild_members`, dengan waktu pesan tetap diurutkan terbaru di dalam detail member.
- Embed laporan menampilkan tanggal join member dan keterangan urutan yang sedang digunakan.
- Menambahkan pengurutan daftar member pada halaman detail setiap server.
- Menambahkan tombol `Newest` dan `Oldest` pada section Members untuk mengurutkan berdasarkan tanggal bergabung.
- Member tanpa tanggal bergabung selalu ditempatkan di bagian paling akhir.