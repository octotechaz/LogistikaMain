# Logistika Traefik Portainer Bundle

Bu klasor, projenin Portainer + Traefik ile production deploy edilmesi icin ayrilmis surumudur. Amac, tek container icinde Next.js (`3001`), admin panel (`3005`) ve backend (`4001`) servislerini calistirirken Traefik uzerinden 3 ayri hostu sorunsuz yonetmektir.

## Bu klasorde neler var

- `docker-compose.yml`
  Portainer stack icin kullanilacak ana dosya.
- `compose.portainer-live.yml`
  Istersen ayni stack'i bu dosyayla da acabilirsin; icerik olarak ayni amaca hizmet eder.
- `Dockerfile`
  Production build alan Dockerfile. `npm ci`, `prisma generate` ve `next build` adimlarini image build sirasinda calistirir.
- `.env.example`
  Doldurulmasi gereken environment degiskenlerinin ornek dosyasi.

## Desteklenen domainler

- `tranzit.az`
- `www.tranzit.az`
- `portal.tranzit.az`
- `admin.tranzit.az`

## Traefik yonlendirme mantigi

- `tranzit.az` ve `www.tranzit.az` -> Next.js public site (`3001`)
- `portal.tranzit.az` -> Next.js portal (`3001`)
- `admin.tranzit.az` -> octo-admin (`3005`)
- `www.tranzit.az` istekleri `tranzit.az` adresine redirect edilir

## Gereksinimler

Deploy oncesi sunucuda bunlar hazir olmali:

1. Docker / Portainer calisiyor olmali.
2. Traefik ayakta olmali.
3. `octobot-net` isminde external Docker network mevcut olmali.
4. DNS kayitlari su hostlara yonlenmeli:
   - `tranzit.az`
   - `www.tranzit.az`
   - `portal.tranzit.az`
   - `admin.tranzit.az`
5. Sunucuda su volume path'leri yazilabilir olmali:
   - `/datastore/logistika/postgres-new`
   - `/datastore/logistika/uploads`
   - `/datastore/logistika/data`

## Portainer deploy adimlari

1. Bu klasoru sunucuya yukle.
2. `.env.example` dosyasini `.env` olarak kopyala.
3. `.env` icindeki tum alanlari gercek production degerleriyle doldur.
4. Portainer icinde yeni Stack olustur.
5. Stack file olarak `docker-compose.yml` kullan.
6. Build context olarak bu klasoru sec.
7. Deploy et.

## `.env` icinde doldurulacak temel alanlar

### Veritabani

- `POSTGRES_USER`
- `POSTGRES_PASSWORD`
- `POSTGRES_DB`
- `DATABASE_URL`

`DATABASE_URL` container icinde `postgres` service adina bakmali. Ornek:

```env
DATABASE_URL=postgresql://logistika:super-secret-password@postgres:5432/logistika_prod?schema=public
```

### Uygulama secret'lari

Asagidaki degerlerin her biri en az 32 karakter olmali:

- `JWT_SECRET`
- `NEXTAUTH_SECRET`
- `SESSION_SECRET`

### Host ayarlari

```env
PUBLIC_SITE_HOST=tranzit.az
PORTAL_HOST=portal.tranzit.az
ADMIN_HOST=admin.tranzit.az
NEXTAUTH_URL=https://tranzit.az
NEXT_PUBLIC_APP_URL=https://tranzit.az
CORS_ORIGIN=https://tranzit.az,https://portal.tranzit.az,https://admin.tranzit.az
```

## Kalici volume mantigi

Compose dosyasi su mount'lari kullanir:

- `/datastore/logistika/postgres-new` -> PostgreSQL data
- `/datastore/logistika/uploads` -> hem `public/uploads` hem `octo-admin/uploads`
- `/datastore/logistika/data` -> `octo-admin/data` ve `data`

Bu sayede:

- upload dosyalari container yeniden olussa bile kaybolmaz
- SQLite destek dosyalari kalici olur
- postgres verisi korunur

## Uygulama icindeki onemli production env'leri

Compose dosyasinda bunlar explicit set edilir:

```env
INTERNAL_ADMIN_URL=http://127.0.0.1:3005
INTERNAL_BACKEND_URL=http://127.0.0.1:4001
OCTO_ADMIN_HOST=127.0.0.1
OCTO_ADMIN_PORT=3005
BACKEND_HOST=127.0.0.1
BACKEND_PORT=4001
UPLOAD_DIR=/app/public/uploads
PUBLIC_LISTINGS_SQLITE_PATH=/app/data/public-listings.sqlite
OCTO_ADMIN_SQLITE_PATH=/app/octo-admin/data/cargo.db
```

Bunlar production host-policy ve env validation beklentileriyle uyumludur.

## Saglik kontrolu

App service icin healthcheck su endpoint'i kontrol eder:

```text
http://127.0.0.1:3001/api/health
```

Bu endpoint `200` donmezse Portainer/Docker service'i unhealthy gosterir.

## Neden bu Dockerfile kullaniliyor

Bu bundle'daki `Dockerfile`:

1. dependency'leri kurar
2. Prisma client uretir
3. Next.js production build alir
4. runtime image icinde uygulamayi calistirir

Boylece onceden build edilmis `.next` klasorune bagimli kalinmaz ve Portainer build sureci daha deterministik olur.

## Notlar

- Admin panel Traefik tarafinda `3005` portuna gider; bu ozellikle duzeltildi.
- `www.tranzit.az` redirect middleware'i compose label'lariyla tanimlandi.
- `tmpfs` kullanimi gecici dosyalari RAM uzerinde tutar.
- `npx prisma migrate deploy` container start sirasinda otomatik calisir.
- `init: true` zombi process problemlerini azaltir.

## Bu makinede yapilan kontrol

Tam `docker compose up` testi bu makinede yapilamadi; cunku burada `docker compose` / `docker-compose` calistirilabilir durumda degildi. Ancak:

- compose dosyalari YAML olarak parse edildi
- Traefik label yapisi duzenlendi
- env beklentileri project validation mantigina gore tamamlandi

Bu nedenle bundle Portainer'a verilmek uzere hazirdir.
