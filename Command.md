Bertindak sebagai senior full-stack engineer. Bangun dan rapikan proyek “Discord Command Center”: platform web/mobile untuk admin mengelola dan memantau server Discord melalui dashboard Expo dan backend Express.

Jangan membuat proyek baru. Audit struktur repository yang ada terlebih dahulu dan lanjutkan dari sana.

## Konteks proyek saat ini

- Root workspace: `B:\appsv`
- Frontend yang benar berada di `frontend/`, bukan `frontend/frontend/`
- Frontend: Expo SDK 57, React Native, Expo Router, TypeScript.
- Backend: Express + TypeScript pada `backend/`.
- Database: MySQL, menggunakan `mysql2`.
- Bot: Discord.js.
- Root sudah memiliki `npm run dev` untuk menjalankan frontend dan backend.
- Ada bot legacy di root `index.js`; backend juga memiliki `discord.js` versi lebih baru. Hindari dua implementasi bot yang berjalan bersamaan.
- Prisma dan `@prisma/client` sengaja telah dihapus karena audit dependency. Jangan memasang Prisma kembali.
- `express-mysql-session` sengaja dihapus karena dependency rentan. Jangan memasangnya kembali tanpa pemeriksaan keamanan.
- Jangan menjalankan `npm audit fix --force`, khususnya pada frontend Expo.
- Saat menambah package Expo, gunakan `npx expo install <package>`, bukan `npm install`.

## Tujuan produk

Buat platform manajemen server Discord dengan aturan berikut:

1. Admin login memakai Discord OAuth2.
2. Admin hanya dapat mengakses server Discord yang memang dapat ia kelola.
3. Memasukkan Guild/Server ID bukan bukti kepemilikan atau otorisasi.
4. Backend wajib memverifikasi:
   - format Guild ID valid;
   - bot benar-benar ada di guild tersebut;
   - pengguna yang login adalah anggota guild;
   - pengguna memiliki izin `Administrator` atau `Manage Guild`.
5. Frontend tidak boleh menerima atau menyimpan bot token, Discord client secret, credential MySQL, maupun session secret.
6. Semua akses database dan Discord API hanya dilakukan backend.
7. Bot mengumpulkan data minimum yang diperlukan untuk statistik:
   - perubahan member masuk/keluar;
   - jumlah pesan per member, tanpa menyimpan isi pesan;
   - durasi aktivitas voice dari event join/leave, tanpa merekam audio;
   - status bot dan sinkronisasi guild.
8. Data aktivitas harus mendukung leaderboard dan statistik harian.
9. Terapkan retensi data event mentah yang bisa dikonfigurasi, default 90 hari.
10. Dashboard harus tetap aman jika bot offline atau Discord API sedang gagal.

## Prinsip keamanan dan privasi

- Gunakan Discord OAuth2 scope `identify` dan `guilds`.
- Gunakan `state` untuk mencegah CSRF pada OAuth web.
- Web memakai cookie session `HttpOnly`; `Secure` untuk production; `SameSite` yang sesuai.
- Untuk aplikasi native Expo, rancang login OAuth dengan PKCE/deep link. Jangan pernah menaruh `DISCORD_CLIENT_SECRET` di aplikasi mobile.
- Semua endpoint guild harus melalui middleware autentikasi dan otorisasi guild.
- Jangan percaya `guildId`, role, atau status admin yang dikirim frontend.
- Gunakan validasi Zod untuk environment, body, params, dan query.
- Gunakan query parameterized/prepared statement melalui `mysql2/promise`; jangan membangun SQL dengan string interpolation.
- Batasi request pada endpoint sensitif.
- Simpan audit log untuk perubahan konfigurasi dan tindakan admin.
- Jangan menyimpan isi pesan, DM, audio voice, atau data pribadi yang tidak dibutuhkan.
- Jangan menampilkan secret di log, error response, README, atau `.env.example`.

## Arsitektur yang diinginkan

Gunakan satu proses backend untuk API Express dan client Discord agar lifecycle, health check, reconnect, serta logging lebih mudah dikelola.

Target struktur, sesuaikan bila ada file existing yang lebih tepat:

appsv/
  backend/
    src/
      app.ts
      server.ts
      config/env.ts
      db/pool.ts
      db/migrations/
      routes/
        auth.routes.ts
        guild.routes.ts
        analytics.routes.ts
      middleware/
        require-auth.ts
        require-guild-admin.ts
        error-handler.ts
      services/
        discord-oauth.service.ts
        guild.service.ts
        activity.service.ts
        analytics.service.ts
      bot/
        client.ts
        events/
          ready.ts
          guild-member.ts
          message.ts
          voice.ts
      types/
  frontend/
    src/
      app/
        _layout.tsx
        index.tsx
        login.tsx
        dashboard.tsx
        guild/[id].tsx
        guild/[id]/members.tsx
        guild/[id]/activity.tsx
        guild/[id]/settings.tsx
      components/
      services/api.ts
      hooks/
      types/
  README.md
  .env.example
  package.json

## Database MySQL

Gunakan migration SQL yang dapat dijalankan ulang dengan aman. Buat tabel dan indeks minimum:

- `users`: Discord user ID unik, username, avatar, timestamps.
- `sessions`: session ID/hash, user ID, expiry, revoke timestamp.
- `guilds`: Discord guild ID unik, name, icon, bot status, timestamps.
- `guild_members`: guild ID, Discord member ID, nickname/display name, join/leave status.
- `activity_events`: guild ID, Discord user ID, event type, channel ID nullable, occurred_at.
- `daily_activity_stats`: agregat pesan dan durasi voice per member per hari.
- `guild_settings`: konfigurasi tracking serta retensi data.
- `audit_logs`: actor user ID, guild ID, aksi, metadata minimum, timestamp.

Tambahkan unique constraint dan index sesuai pola query:
- `guild_id + discord_user_id`
- `guild_id + occurred_at`
- statistik harian per guild/member/tanggal

Event handler harus idempotent agar reconnect atau event duplikat tidak menggandakan statistik.

## Endpoint awal

Implementasikan dan dokumentasikan kontrak API berikut:

- `GET /api/health`
- `GET /api/auth/discord`
- `GET /api/auth/discord/callback`
- `GET /api/auth/me`
- `POST /api/auth/logout`
- `GET /api/guilds`
- `POST /api/guilds/resolve`
- `GET /api/guilds/:guildId`
- `GET /api/guilds/:guildId/members`
- `GET /api/guilds/:guildId/activity`
- `GET /api/guilds/:guildId/leaderboard`
- `GET /api/guilds/:guildId/settings`
- `PATCH /api/guilds/:guildId/settings`

Gunakan pagination untuk daftar member dan event. Semua respons error harus konsisten, misalnya `{ error: { code, message } }`.

## Discord bot

- Migrasikan fungsi bot legacy dari root ke backend TypeScript secara bertahap.
- Gunakan Discord.js versi backend, jangan mempertahankan dua versi berbeda.
- Gunakan intent minimum:
  - Guilds
  - GuildMembers jika sinkronisasi member diaktifkan
  - GuildMessages untuk menghitung event pesan
  - GuildVoiceStates untuk voice duration
- Jangan aktifkan `MessageContent` kecuali benar-benar membutuhkan isi pesan; fitur saat ini tidak membutuhkannya.
- Implementasikan:
  1. initial member sync ketika guild mulai dikelola;
  2. event member join/leave;
  3. penghitung aktivitas pesan;
  4. voice session join/leave;
  5. reconciliation job yang aman diulang;
  6. status bot yang tersedia pada health endpoint.
- Dokumentasikan langkah manual di Discord Developer Portal: OAuth redirect URL, privileged intents, dan bot invite permission. Jangan mencoba mengubah setting portal otomatis.

## Frontend

Bangun UI mobile-first dengan Expo Router:

- Login screen Discord.
- Dashboard setelah login.
- Guild picker/list.
- Guild overview: total member, member baru, aktivitas pesan, total voice time, bot status.
- Member list dengan pagination dan pencarian.
- Activity/leaderboard screen dengan filter periode.
- Guild settings dengan kontrol tracking dan retensi.
- Loading, empty state, error state, serta unauthorized state.
- Gunakan service API terpusat. Jangan gunakan dummy data setelah endpoint tersedia.
- Untuk web, kirim credential cookie dengan aman. Untuk native, siapkan abstraction auth yang mendukung flow PKCE/deep link.
- Ikuti instruksi `frontend/AGENTS.md`, termasuk validasi Expo SDK sebelum menambah dependency.

## Environment

Lengkapi `.env.example` tanpa secret:

API_PORT=3000
FRONTEND_ORIGIN=http://localhost:8081
DATABASE_HOST=localhost
DATABASE_PORT=3306
DATABASE_NAME=discord_command_center
DATABASE_USER=...
DATABASE_PASSWORD=...
SESSION_SECRET=...
DISCORD_CLIENT_ID=...
DISCORD_CLIENT_SECRET=...
DISCORD_REDIRECT_URI=http://localhost:3000/api/auth/discord/callback
DISCORD_BOT_TOKEN=...

## Cara kerja

Kerjakan bertahap dan jangan melompat langsung ke seluruh UI.

1. Audit struktur dan dependency existing.
2. Rapikan scripts root/backend/frontend dan hilangkan referensi folder atau bot legacy yang tidak valid.
3. Buat fondasi backend, config env tervalidasi, MySQL pool, migration, health check, dan bot lifecycle.
4. Implementasikan OAuth2 + session + middleware authorization guild.
5. Implementasikan sinkronisasi Discord dan penyimpanan data minimum.
6. Implementasikan endpoint analytics.
7. Implementasikan frontend yang memakai endpoint nyata.
8. Perbarui README root dengan setup, arsitektur, variabel environment, cara menjalankan, dan langkah Developer Portal.
9. Tambahkan test untuk authorization lintas guild, input invalid, event idempotency, dan endpoint penting.

## Definisi selesai

Sebelum menyatakan selesai:

- Jalankan typecheck backend dan frontend.
- Jalankan lint frontend.
- Jalankan test yang ditambahkan.
- Jalankan `npm audit` pada backend dan frontend.
- Jangan gunakan `--force`.
- Pastikan `npm run dev` dari root dapat menjalankan API, bot, dan frontend sesuai desain final.
- Pastikan `/api/health` memberi informasi API, database, dan status bot tanpa membocorkan secret.
- Berikan laporan akhir berisi file yang diubah, command verifikasi, hasil test, serta langkah manual yang masih harus saya lakukan di MySQL dan Discord Developer Portal.

Jika credential Discord atau MySQL belum tersedia, buat implementasi yang aman, jelaskan variabel yang diperlukan, dan pastikan aplikasi gagal dengan pesan konfigurasi yang jelas tanpa membocorkan nilai rahasia.