# SQLite Migration Arşivi

Bu dizin, PostgreSQL'e geçiş (2026-07-14) öncesinde kullanılan SQLite migration'larını içermektedir.
Uygulama kodu veya production migration süreçlerinde kullanılmaz; yalnızca tarihsel referans amaçlıdır.

Konum: `prisma/migration-archive/sqlite/` (aktif `prisma/migrations/` dışında)

| Dosya | Açıklama |
|---|---|
| 20260711172055_init_sqlite.sql | İlk SQLite şeması |
| 20260712120000_add_cargo_post_extra_details.sql | CargoPost ek alanları (SQLite ALTER) |
