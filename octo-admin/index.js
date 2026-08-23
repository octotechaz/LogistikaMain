require('dotenv').config();
const express = require('express');
const path = require('path');
const multer = require('multer');
const fs = require('fs');
const session = require('express-session');
const bcrypt = require('bcryptjs');
const sharp = require('sharp');
const { randomInt } = require('crypto');
const { normalizeAzPhone, normalizeInternationalPhone, validateOtpInputs } = require('./phoneUtils');
const {
  buildSessionOptions, requireAdminHost, requirePortalHost,
  getTrustProxy, validateHostsAtStartup, getHosts,
  loginGetHostPolicy, loginPreGate, loginPostHostPolicy,
  requireAuthRedirectTarget, loginRedirectTarget, requireAuthAction, loginLandingPath, loginLandingTarget,
  ADMIN_ROUTE_PREFIXES, PORTAL_ROUTE_PREFIXES,
  isBrowserHtmlRequest, authCookieClearOptions,
} = require('./hostConfig');
const {
  makeLoginPostHandler,
  makeLoginGetHandler,
  makeRequireAuth,
} = require('./authHandlers');
const { PrismaClient } = require('@prisma/client');
const { makeCategoryRepository } = require('./postgresCategoryRepository');
const { makeCargoRepository } = require('./postgresCargoRepository');
const { makeUserRepository } = require('./postgresUserRepository');
const { makeSettingsRepository } = require('./postgresSettingsRepository');
const { parseAdminPhones, serializeAdminPhones, resolveAdminNotifyPhones, syncConnectedWhatsAppPhone } = require('./adminPhoneUtils');
const { notifyAdminsPendingCargo } = require('./cargoApprovalNotify');
const passwordPolicy = require('../config/password-policy.json');

const prisma = new PrismaClient();
const categoryRepository = makeCategoryRepository(prisma);
const cargoRepository = makeCargoRepository(prisma);
const userRepository = makeUserRepository(prisma);
const settingsRepository = makeSettingsRepository(prisma);

// Fail-closed: validate required host env vars before accepting any requests
validateHostsAtStartup();

const NODE_ENV = process.env.NODE_ENV || 'development';
const isProd = NODE_ENV === 'production';

// Resolve internal URLs — fail closed in production when absent or non-loopback
function resolveInternalUrl(key, devDefault, expectedPrefix) {
  const value = process.env[key] || devDefault;
  if (isProd && !value.startsWith(expectedPrefix)) {
    throw new Error(`${key} must start with ${expectedPrefix} in production (got a non-loopback value)`);
  }
  return value;
}

const INTERNAL_BACKEND_URL = resolveInternalUrl(
  'INTERNAL_BACKEND_URL',
  'http://127.0.0.1:4001',
  'http://127.0.0.1:4001'
);

// Resolve octo-admin listen host/port — must be loopback in production
const OCTO_ADMIN_HOST = process.env.OCTO_ADMIN_HOST || '127.0.0.1';
if (isProd && OCTO_ADMIN_HOST !== '127.0.0.1') {
  throw new Error('OCTO_ADMIN_HOST must be 127.0.0.1 in production — refusing to bind to non-loopback');
}
const OCTO_ADMIN_PORT = Number(process.env.OCTO_ADMIN_PORT || 3005);

// Resolve the public app URL for redirects — no hardcoded localhost in production
const PUBLIC_APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3001';
if (isProd && !process.env.NEXT_PUBLIC_APP_URL) {
  throw new Error('NEXT_PUBLIC_APP_URL is required in production — refusing to start with hardcoded localhost redirect');
}

const app = express();
app.locals.publicAppUrl = PUBLIC_APP_URL;

// Global Middleware: Əgər birbaşa 3005 portuna daxil olunursa, 3001 portuna (Next.js proxy) yönləndir.
app.use((req, res, next) => {
    const host = req.get('host') || '';
    // Əgər istək Next.js proxy vasitəsilə yox, birbaşa brauzerdən gəlirsə yönləndir
    const isProxy = req.headers['x-forwarded-host'] || req.headers['x-forwarded-for'];
    
    if (false) {}
    next();
});

// Express ayarları
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// EJS QRCode generator for views
const QRCode = require('qrcode');
app.locals.generateQR = async (text) => {
    try {
        return await QRCode.toDataURL(text);
    } catch (err) {
        return null;
    }
};

// Trust proxy — required for secure cookies behind Traefik in production
app.set('trust proxy', getTrustProxy(NODE_ENV));

// Session ayarları — fail-closed in production (throws if SESSION_SECRET absent)
app.use(session(buildSessionOptions(NODE_ENV)));

// Auth Middleware — unauthenticated users:
//   admin/portal host → redirect to /login
//   public/unknown host → fail closed with 404 (never silently fall back to portal)
const requireAuth = makeRequireAuth({ userRepository });

// Glocals for templates
app.use((req, res, next) => {
    res.locals.user = req.session.user || null;
    res.locals.path = req.path;
    res.locals.passwordPolicy = passwordPolicy;
    next();
});

// Uploads klasörü
const uploadDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir);
}

// Multer ayarları (hafızada tutarak sharp ile optimize edeceğiz)
const storage = multer.memoryStorage();
const upload = multer({
    storage: storage,
    limits: { fileSize: 150 * 1024 * 1024 } // 150MB limit
});

const allowedUploadMime = new Set(['image/jpeg', 'image/jpg', 'image/png', 'image/webp']);

async function saveUploadedImageBuffer(buffer, originalName = 'image') {
    const filename = `${Date.now()}-${Math.round(Math.random() * 1e9)}.webp`;
    const filepath = path.join(uploadDir, filename);
    await sharp(buffer)
        .rotate()
        .resize(1920, 1080, { fit: 'inside', withoutEnlargement: true })
        .webp({ quality: 80 })
        .toFile(filepath);

    // Also mirror into Next public/uploads so previews work even if rewrite misses.
    try {
        const publicDir = path.join(__dirname, '..', 'public', 'uploads');
        if (!fs.existsSync(publicDir)) {
            fs.mkdirSync(publicDir, { recursive: true });
        }
        fs.copyFileSync(filepath, path.join(publicDir, filename));
    } catch (copyError) {
        console.warn('public/uploads mirror failed:', copyError.message);
    }

    return {
        url: `/uploads/${filename}`,
        mimeType: 'image/webp',
        size: fs.statSync(filepath).size,
        originalName,
    };
}

/**
 * Public listing image upload (multer + sharp).
 * Proxied from Next via /dashboard/* rewrite — used by cargo-owner form.
 */
app.post('/dashboard/api/upload', upload.single('file'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({
                success: false,
                ok: false,
                message: 'Şəkil faylı göndərilməyib.',
            });
        }

        const mime = String(req.file.mimetype || '').toLowerCase();
        if (!allowedUploadMime.has(mime)) {
            return res.status(400).json({
                success: false,
                ok: false,
                message: 'Yalnız jpg, png və webp şəkillər qəbul edilir.',
            });
        }

        const saved = await saveUploadedImageBuffer(req.file.buffer, req.file.originalname);
        return res.json({
            success: true,
            ok: true,
            data: saved,
        });
    } catch (error) {
        console.error('Upload error:', error);
        return res.status(400).json({
            success: false,
            ok: false,
            message: error instanceof Error ? error.message : 'Şəkil yüklənmədi.',
        });
    }
});


// Auth Routes
app.get('/dashboard', requireAuth, (req, res) => {
    const userRole = req.session.user?.role;
    res.redirect(userRole === 'ADMIN' ? '/dashboard/butun-elanlar' : '/dashboard/menim-elanlarim');
});

app.get('/dashboard/session-user', requireAuth, async (req, res) => {
    const user = await userRepository.findSessionUser(req.session.userId);
    if (!user) {
        return res.status(404).json({ user: null });
    }

    res.json({
        user: {
            id: user.id,
            name: user.name,
            email: user.email,
            role: user.role,
            profile_picture: user.profile_picture
        }
    });
});

app.get('/dashboard/login', makeLoginGetHandler());
app.post('/dashboard/login', makeLoginPostHandler(userRepository));

// Canonical admin login: https://admin.tranzit.az/auth
app.get('/auth', makeLoginGetHandler({ adminOnly: true }));
app.post('/auth', makeLoginPostHandler(userRepository, { adminOnly: true }));

// Dedicated admin login aliases (ADMIN_HOST only via host policy in handlers)
app.get('/admin/login', (req, res) => res.redirect(302, '/auth'));
app.get('/login', makeLoginGetHandler({ adminOnly: true }));
app.post('/login', makeLoginPostHandler(userRepository, { adminOnly: true }));

app.get('/dashboard/qeydiyyat', (req, res) => {
    if (req.session.userId) {
        return res.redirect('/dashboard/yeni-elan');
    }
    res.render('qeydiyyat', { error: null });
});

app.post('/dashboard/api/send-otp', async (req, res) => {
    try {
        const validation = validateOtpInputs(req.body.phone);
        if (!validation.ok) {
            return res.json({ success: false, message: validation.message });
        }
        const canonicalPhone = validation.phone;

        // Nömrənin artıq qeydiyyatda olub-olmadığını yoxla
        const existing = await userRepository.findIdentityConflict({ phone: canonicalPhone });
        if (existing) {
            return res.json({ success: false, message: 'Bu nömrə artıq qeydiyyatdan keçib.' });
        }

        // Cryptographically random 6-digit OTP
        const otp = String(randomInt(100000, 1000000));

        // Backend stores OTP after successful WhatsApp delivery
        const response = await fetch(`${INTERNAL_BACKEND_URL}/api/whatsapp/send-code`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ phone: canonicalPhone, code: otp })
        });

        if (response.ok) {
            res.json({ success: true });
        } else {
            res.json({ success: false, message: 'WhatsApp servisinə qoşulmaq mümkün olmadı.' });
        }
    } catch (error) {
        console.error("OTP Error:", error);
        res.json({ success: false, message: 'Server xətası baş verdi.' });
    }
});

app.post('/dashboard/qeydiyyat', async (req, res) => {
    const { role, name, phone, full_phone, otp, email, password, vehicle_type, capacity } = req.body;

    if (typeof password !== 'string' || password.length < passwordPolicy.minimumLength) {
        return res.render('qeydiyyat', { error: passwordPolicy.minimumMessage });
    }

    // Canonicalize phone — use normalizeAzPhone so any UI form is accepted
    let formattedPhone;
    try {
        formattedPhone = normalizeInternationalPhone(full_phone || phone || '');
    } catch {
        return res.render('qeydiyyat', { error: 'Telefon nömrəsi düzgün deyil.' });
    }

    try {
        // Conflict checks before OTP so a valid token is not consumed on a duplicate
        const existingConflict = await userRepository.findIdentityConflict({ email, phone: formattedPhone });
        if (existingConflict) {
            if (existingConflict.email === email) {
                return res.render('qeydiyyat', { error: 'Bu e-poçt artıq qeydiyyatdan keçib.' });
            }
            return res.render('qeydiyyat', { error: 'Bu nömrə artıq qeydiyyatdan keçib.' });
        }

        // OTP Doğrulama — backend verify (consumes entry on success)
        const verifyResp = await fetch(`${INTERNAL_BACKEND_URL}/api/whatsapp/verify-otp`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ phone: formattedPhone, otp })
        });
        const verifyData = await verifyResp.json();

        if (!verifyData.success) {
            return res.render('qeydiyyat', { error: 'OTP kodu yanlışdır və ya vaxtı bitib.' });
        }

        const salt = bcrypt.genSaltSync(10);
        const hash = bcrypt.hashSync(password, salt);

        const created = await userRepository.createLegacyUser({
            name,
            email,
            phone: formattedPhone,
            passwordHash: hash,
            role: role || 'USER',
            vehicleType: vehicle_type,
            capacity,
        });

        // Auto-login and send user to the public site (not a separate dashboard login).
        req.session.userId = created.id;
        req.session.user = {
            id: created.id,
            email: created.email,
            name: created.name,
            role: created.role,
        };

        res.redirect(`${PUBLIC_APP_URL}/?registered=1`);
    } catch (error) {
        console.error(error);
        res.render('qeydiyyat', { error: 'Qeydiyyat zamanı xəta baş verdi.' });
    }
});

// Admin - Logout (clear Express session + Next JWT so ADMIN cannot re-enter via bridge)
app.get('/dashboard/logout', (req, res) => {
    req.session.destroy(() => {
        res.clearCookie('azlog_token', authCookieClearOptions(NODE_ENV));
        res.redirect(loginRedirectTarget(req.get('host') || ''));
    });
});

// Role Middleware
const requireAdmin = (req, res, next) => {
    if (req.session.user && req.session.user.role === 'ADMIN') {
        next();
    } else {
        const action = requireAuthAction(req.get('host') || '');
        if (action.action === 'redirect') {
            return res.redirect(action.location);
        }
        return res.status(404).send("Not found");
    }
};

// Host guards — derived from the single exported classifier arrays.
// Admin routes: only on ADMIN_HOST (browser GET redirects, mutations 404)
// Portal routes: only on PORTAL_HOST
// Shared login/OTP routes are exempt — reachable on both hosts for session bootstrap.
app.use(ADMIN_ROUTE_PREFIXES, requireAdminHost);
app.use(PORTAL_ROUTE_PREFIXES, requirePortalHost);

// Routes
app.get('/octo-admin', requireAuth, (req, res) => {
    res.redirect(loginLandingTarget(req.session.user?.role, req.get('host') || ''));
});

app.get('/dashboard/yeni-elan', requireAuth, (req, res) => {
    res.render('yeni-elan', { path: '/dashboard/yeni-elan' });
});

app.post('/dashboard/yeni-elan', requireAuth, upload.array('images', 10), async (req, res) => {
    try {
        const {
            title, cargo_type, description, weight, quantity,
            length, width, height, loading_city, loading_address,
            unloading_city, unloading_address, loading_date, latest_pickup_date,
            loading_time, transport_type, price, phone, notes,
            needs_loading_help, needs_unloading_help, requires_invoice, round_trip
        } = req.body;

        const imagePaths = [];
        if (req.files && req.files.length > 0) {
            for (const file of req.files) {
                const filename = Date.now() + '-' + Math.round(Math.random() * 1E9) + '.webp';
                const filepath = path.join(uploadDir, filename);
                await sharp(file.buffer)
                    .resize(1920, 1080, { fit: 'inside', withoutEnlargement: true })
                    .webp({ quality: 80 })
                    .toFile(filepath);
                // Keep Next public mirror in sync for direct <img> loads.
                try {
                    const publicDir = path.join(__dirname, '..', 'public', 'uploads');
                    if (!fs.existsSync(publicDir)) fs.mkdirSync(publicDir, { recursive: true });
                    fs.copyFileSync(filepath, path.join(publicDir, filename));
                } catch (_) {}
                imagePaths.push('/uploads/' + filename);
            }
        }

        const cargo = await cargoRepository.createCargo({
            ownerId:              req.session.userId,
            title,
            cargo_type,
            description:          description || "",
            weight,
            quantity:             quantity    || null,
            volume:               null,
            length:               length      || null,
            width:                width       || null,
            height:               height      || null,
            loading_city,
            loading_address,
            unloading_city,
            unloading_address,
            loading_date:         loading_date         || null,
            latest_pickup_date,
            loading_time:         loading_time         || null,
            transport_type:       transport_type       || null,
            price:                price                || null,
            phone,
            notes:                notes                || null,
            needs_loading_help:   needs_loading_help   || null,
            needs_unloading_help: needs_unloading_help || null,
            requires_invoice:     requires_invoice     || null,
            round_trip:           round_trip           || null,
            imagePaths,
        });

        // Admine WhatsApp üzərindən bildiriş göndər (port 4001)
        try {
            const hosts = getHosts();
            await notifyAdminsPendingCargo({
                settingsRepository,
                backendUrl: INTERNAL_BACKEND_URL,
                adminHost: hosts.admin,
                portalHost: hosts.portal,
                details: {
                    listingId: cargo.id,
                    listingNumber: cargo.legacySqliteId ?? cargo.id,
                    title,
                    cargoType: cargo_type,
                    pickupCity: loading_city,
                    deliveryCity: unloading_city,
                    contactPhone: phone,
                    ownerName: req.session.user?.name || null,
                },
            });
        } catch (waError) {
            console.error('Admine WhatsApp bildirişi göndərilərkən xəta:', waError);
        }

        res.redirect('/dashboard/menim-elanlarim?success=true');
    } catch (error) {
        console.error(error);
        res.status(500).send("Bir xəta baş verdi");
    }
});

// Profil Ayarları Səhifəsi
app.get('/dashboard/profil', requireAuth, async (req, res) => {
    try {
        const user = await userRepository.findSessionUser(req.session.userId);
        if (!user) {
            return res.redirect(loginRedirectTarget(req.get('host') || ''));
        }
        res.render('profil', { user, path: '/dashboard/profil', success: req.query.success, error: req.query.error });
    } catch (error) {
        console.error(error);
        res.status(500).send("Xəta baş verdi");
    }
});

app.get('/dashboard/avtomobiller', requireAuth, requireAdmin, async (req, res) => {
    try {
        const vehicles = await prisma.vehicle.findMany({
            include: {
                carrier: {
                    select: {
                        id: true,
                        firstName: true,
                        lastName: true,
                        email: true,
                    },
                },
                carrierProfile: true,
                images: {
                    orderBy: { createdAt: 'asc' },
                },
            },
            orderBy: [
                { status: 'asc' },
                { createdAt: 'desc' },
            ],
        });

        res.render('admin-avtomobiller', {
            vehicles,
            path: '/dashboard/avtomobiller',
            req,
        });
    } catch (error) {
        console.error(error);
        res.status(500).send("Xəta baş verdi");
    }
});

app.post('/dashboard/vehicle/status/:id', requireAuth, requireAdmin, async (req, res) => {
    try {
        const { id } = req.params;
        const status = String(req.body.status || '').trim().toUpperCase();
        if (!['PENDING', 'APPROVED', 'REJECTED'].includes(status)) {
            return res.redirect('/dashboard/avtomobiller');
        }

        const vehicle = await prisma.vehicle.update({
            where: { id },
            data: { status },
            include: { carrierProfile: true },
        });

        await prisma.adminLog.create({
            data: {
                adminId: req.session.userId,
                action: 'VEHICLE_STATUS_UPDATED',
                entityType: 'Vehicle',
                entityId: id,
                metadata: JSON.stringify({ status }),
            },
        });

        if (vehicle.carrierProfile) {
            await prisma.notification.create({
                data: {
                    userId: vehicle.carrierProfile.userId,
                    title: status === 'APPROVED' ? 'Avtomobil təsdiqləndi' : 'Avtomobil statusu yeniləndi',
                    message:
                        status === 'APPROVED'
                            ? `${vehicle.brand} ${vehicle.model} avtomobiliniz təsdiqləndi.`
                            : `${vehicle.brand} ${vehicle.model} avtomobilinizin statusu: ${status}.`,
                    type: status === 'APPROVED' ? 'ADMIN_APPROVED' : 'ADMIN_REJECTED',
                },
            });
        }

        return res.redirect('/dashboard/avtomobiller?updated=1');
    } catch (error) {
        console.error(error);
        return res.redirect('/dashboard/avtomobiller');
    }
});

// Profil Yeniləmə
app.post('/dashboard/profil/update', requireAuth, upload.single('profile_picture'), async (req, res) => {
    let { name, email, phone, otp } = req.body;
    const userId = req.session.userId;

    try {
        const currentUser = await userRepository.findSessionUser(userId);
        if (!currentUser) {
            return res.redirect(loginRedirectTarget(req.get('host') || ''));
        }

        // Şəkil yüklənibsə onu qeyd et, əks halda köhnəni saxla
        let profileImage = currentUser.profile_picture;
        if (req.file) {
            const filename = Date.now() + '-' + Math.round(Math.random() * 1E9) + '-profile.webp';
            const filepath = path.join(uploadDir, filename);

            await sharp(req.file.buffer)
                .resize(400, 400, { fit: 'cover' })
                .webp({ quality: 80 })
                .toFile(filepath);

            profileImage = '/uploads/' + filename;
        }

        // Canonicalize phone via shared helper
        try {
            phone = normalizeAzPhone(phone || '');
        } catch {
            return res.redirect('/dashboard/profil?error=Telefon nömrəsi düzgün deyil.');
        }

        // Əgər email və ya nömrə dəyişibsə, OTP mütləqdir
        if (currentUser.email !== email || currentUser.phone !== phone) {
            // Conflict check before OTP so a valid token is not consumed on a duplicate
            const exists = await userRepository.findIdentityConflict({ email, phone, excludeId: userId });
            if (exists) {
                return res.redirect('/dashboard/profil?error=Bu E-poçt və ya Nömrə artıq başqa istifadəçi tərəfindən istifadə olunur');
            }

            if (!otp) {
                return res.redirect('/dashboard/profil?error=Məlumatları dəyişmək üçün OTP kodu mütləqdir');
            }

            // OTP Doğrulama — immediately before the DB mutation
            try {
                const response = await fetch(`${INTERNAL_BACKEND_URL}/api/whatsapp/verify-otp`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ phone: phone, otp: otp })
                });
                const data = await response.json();

                if (!data.success) {
                    return res.redirect('/dashboard/profil?error=OTP kodu yanlışdır və ya vaxtı bitib');
                }
            } catch (err) {
                return res.redirect('/dashboard/profil?error=OTP doğrulama xətası baş verdi');
            }
        }

        await userRepository.updateProfile({ id: userId, name, email, phone, profileImage });

        // Session məlumatlarını da yenilə
        req.session.user.name = name;
        req.session.user.email = email;
        req.session.user.phone = phone;
        req.session.user.profile_picture = profileImage;

        // Bütün app res.locals.user üçün sessionu yeniləyək ki, header və s. işləsin
        res.locals.user = req.session.user;

        res.redirect('/dashboard/profil?success=Profil məlumatlarınız uğurla yeniləndi');
    } catch (error) {
        console.error(error);
        res.redirect('/dashboard/profil?error=Bilinməyən xəta baş verdi');
    }
});

// Öz Hesabını Silmə
app.post('/dashboard/profil/sil', requireAuth, async (req, res) => {
    try {
        const userId = req.session.userId;

        await userRepository.deleteUserWithCargos(userId);

        // Hesab silindikdən sonra avtomatik çıxış
        req.session.destroy();
        res.redirect(loginRedirectTarget(req.get('host') || '', {
            error: 'Hesabınız və məlumatlarınız qalıcı olaraq silindi',
        }));
    } catch (error) {
        console.error(error);
        res.redirect('/dashboard/profil?error=Hesabı silərkən xəta baş verdi');
    }
});

app.get('/dashboard/menim-elanlarim', requireAuth, async (req, res) => {
    try {
        const cargos = await cargoRepository.listForSessionOwner(req.session.userId);
        res.render('menim-elanlarim', { cargos, path: '/dashboard/menim-elanlarim' });
    } catch (error) {
        console.error(error);
        res.status(500).send("Xəta baş verdi");
    }
});

// Elan silme (Yük sahibi)
app.post('/dashboard/elan/sil/:id', requireAuth, async (req, res) => {
    try {
        await cargoRepository.deleteForSessionOwner(req.params.id, req.session.userId);
        res.redirect('/dashboard/menim-elanlarim?deleted=true');
    } catch (error) {
        console.error(error);
        res.status(500).send("Xəta baş verdi");
    }
});

// Admin Dashboard - Bütün elanlar
app.get('/dashboard/butun-elanlar', requireAuth, requireAdmin, async (req, res) => {
    try {
        const cargos = await cargoRepository.listForAdmin();
        res.render('admin-elanlar', { cargos, path: '/dashboard/butun-elanlar' });
    } catch (error) {
        console.error(error);
        res.status(500).send("Xəta baş verdi");
    }
});

// Admin - Elan statusu dəyişdirmə
app.post('/dashboard/elan/status/:id', requireAuth, requireAdmin, async (req, res) => {
    try {
        const { status } = req.body;
        await cargoRepository.updateAdminStatus(req.params.id, status);
        res.redirect('/dashboard/butun-elanlar?updated=true');
    } catch (error) {
        console.error(error);
        res.status(500).send("Xəta baş verdi");
    }
});

// Admin - Elan silmə
app.post('/dashboard/elan/admin-sil/:id', requireAuth, requireAdmin, async (req, res) => {
    try {
        await cargoRepository.deleteForAdmin(req.params.id);
        res.redirect('/dashboard/butun-elanlar?deleted=true');
    } catch (error) {
        console.error(error);
        res.status(500).send("Xəta baş verdi");
    }
});

// Admin - Kateqoriyalar siyahısı
app.get('/dashboard/kategoriler', requireAuth, requireAdmin, async (req, res) => {
    try {
        const categories = await categoryRepository.listOrdered();
        res.render('admin-kategoriler', {
            user: req.session.user,
            path: '/dashboard/kategoriler',
            categories,
            flash: req.query.saved === '1'
                ? { type: 'success', message: 'Kateqoriya uğurla yadda saxlanıldı.' }
                : req.query.deleted === '1'
                    ? { type: 'success', message: 'Kateqoriya silindi.' }
                    : req.query.error === 'save'
                        ? { type: 'error', message: 'Kateqoriya saxlanılarkən xəta baş verdi.' }
                        : req.query.error === 'delete'
                            ? { type: 'error', message: 'Kateqoriya silinərkən xəta baş verdi.' }
                            : null
        });
    } catch (error) {
        console.error(error);
        res.status(500).send("Kateqoriyalar yüklənərkən xəta baş verdi.");
    }
});

app.post('/dashboard/kategoriler', requireAuth, requireAdmin, async (req, res) => {
    try {
        const { id, label, icon_key, icon_tone, sort_order, is_active, match_cargo_type, match_vehicle_type, match_keyword } = req.body;
        const trimmedLabel = String(label || '').trim();
        if (!trimmedLabel) {
            return res.redirect('/dashboard/kategoriler?error=save');
        }
        await categoryRepository.upsert({ id, label: trimmedLabel, icon_key, icon_tone, sort_order, is_active, match_cargo_type, match_vehicle_type, match_keyword });
        res.redirect('/dashboard/kategoriler?saved=1');
    } catch (error) {
        console.error(error);
        res.redirect('/dashboard/kategoriler?error=save');
    }
});

app.post('/dashboard/kategoriler/delete', requireAuth, requireAdmin, async (req, res) => {
    try {
        const { id } = req.body;
        await categoryRepository.deleteById(id);
        res.redirect('/dashboard/kategoriler?deleted=1');
    } catch (error) {
        console.error(error);
        res.redirect('/dashboard/kategoriler?error=delete');
    }
});

app.get('/dashboard/istifadeciler', requireAuth, requireAdmin, async (req, res) => {
    const users = await userRepository.listUsers();
    res.render('admin-istifadeciler', { users, path: '/dashboard/istifadeciler' });
});

// Admin - İstifadəçi yaratma
app.post('/dashboard/istifadeci/yarat', requireAuth, requireAdmin, async (req, res) => {
    try {
        const { name, email, phone, password, role, otp } = req.body;

        // Canonicalize phone via shared helper
        let formattedPhone;
        try {
            formattedPhone = normalizeAzPhone(phone || '');
        } catch {
            return res.json({ success: false, message: 'Telefon nömrəsi düzgün deyil.' });
        }

        // Conflict checks before OTP so a valid token is not consumed on a duplicate
        const existingUser = await userRepository.findIdentityConflict({ email, phone: formattedPhone });
        if (existingUser) {
            return res.json({ success: false, message: 'Bu e-poçt və ya nömrə artıq qeydiyyatdan keçib.' });
        }

        // OTP Doğrulama — backend verify (consumes entry on success)
        const verifyResp = await fetch(`${INTERNAL_BACKEND_URL}/api/whatsapp/verify-otp`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ phone: formattedPhone, otp })
        });
        const verifyData = await verifyResp.json();

        if (!verifyData.success) {
            return res.json({ success: false, message: 'OTP kodu yanlışdır və ya vaxtı bitib.' });
        }

        const salt = bcrypt.genSaltSync(10);
        const hash = bcrypt.hashSync(password, salt);

        await userRepository.createLegacyUser({
            name,
            email,
            phone: formattedPhone,
            passwordHash: hash,
            role: role || 'USER',
        });

        res.json({ success: true });
    } catch (error) {
        console.error(error);
        res.json({ success: false, message: "Server xətası baş verdi." });
    }
});

// Admin - İstifadəçi silmə
app.post('/dashboard/istifadeci/sil/:id', requireAuth, requireAdmin, async (req, res) => {
    try {
        // Kendi kendini silemez
        if (req.params.id === req.session.userId) {
            return res.redirect('/dashboard/istifadeciler?error=self_delete');
        }

        await userRepository.deleteUserWithCargos(req.params.id);

        res.redirect('/dashboard/istifadeciler?deleted=true');
    } catch (error) {
        console.error(error);
        res.status(500).send("Xəta baş verdi");
    }
});

// Admin - İstifadəçi rolu dəyişmə
app.post('/dashboard/istifadeci/rol/:id', requireAuth, requireAdmin, async (req, res) => {
    try {
        // Kendi rolünü değiştiremez
        if (req.params.id === req.session.userId) {
            return res.redirect('/dashboard/istifadeciler?error=self_role');
        }

        const { role } = req.body;
        await userRepository.updateLegacyRole(req.params.id, role);
        res.redirect('/dashboard/istifadeciler?updated=true');
    } catch (error) {
        console.error(error);
        res.status(500).send("Xəta baş verdi");
    }
});

// Admin - Whatsapp Status
app.get('/dashboard/whatsapp', requireAuth, requireAdmin, async (req, res) => {
    try {
        const response = await fetch(`${INTERNAL_BACKEND_URL}/api/whatsapp/status`);
        const data = await response.json();

        let qrDataUrl = null;
        if (data.status === 'qr_ready' && data.qr) {
            qrDataUrl = await QRCode.toDataURL(data.qr);
        }

        if (data.status === 'connected' && data.connectedPhone) {
            await syncConnectedWhatsAppPhone({
                settingsRepository,
                connectedPhone: data.connectedPhone,
            });
        }

        const currentAdminPhone = await settingsRepository.getSetting('whatsapp_admin_phone', '');
        const adminPhones = await resolveAdminNotifyPhones({
            settingsRepository,
            backendUrl: INTERNAL_BACKEND_URL,
        });
        const connectedPhone = typeof data.connectedPhone === 'string' ? data.connectedPhone : null;
        const flash = req.query.saved === '1'
            ? { type: 'success', message: `${adminPhones.length} admin nömrəsi yadda saxlanıldı.` }
            : req.query.error === 'phone'
                ? { type: 'error', message: 'Ən azı bir düzgün WhatsApp nömrəsi daxil edin.' }
                : req.query.error === 'true'
                    ? { type: 'error', message: 'WhatsApp çıxışı zamanı xəta baş verdi.' }
                    : null;

        res.render('whatsapp-ayarlar', {
            whatsapp: data,
            qrDataUrl,
            path: '/dashboard/whatsapp',
            adminPhone: currentAdminPhone,
            adminPhones,
            connectedPhone,
            flash,
        });
    } catch (e) {
        console.error("WhatsApp Fetch Error:", e);
        res.render('whatsapp-ayarlar', {
            whatsapp: { status: 'error', error: 'Backend serverinə qoşulmaq mümkün olmadı' },
            qrDataUrl: null,
            path: '/dashboard/whatsapp',
            adminPhone: '',
            adminPhones: [],
            connectedPhone: null,
            flash: null,
        });
    }
});

app.get('/dashboard/whatsapp/status.json', requireAuth, requireAdmin, async (req, res) => {
    try {
        const response = await fetch(`${INTERNAL_BACKEND_URL}/api/whatsapp/status`);
        const data = await response.json();

        if (data.status === 'connected' && data.connectedPhone) {
            await syncConnectedWhatsAppPhone({
                settingsRepository,
                connectedPhone: data.connectedPhone,
            });
        }

        let qrDataUrl = null;
        if (data.status === 'qr_ready' && data.qr) {
            qrDataUrl = await QRCode.toDataURL(data.qr);
        }

        res.json({ ...data, qrDataUrl });
    } catch (e) {
        res.status(503).json({ status: 'error', error: 'Backend serverinə qoşulmaq mümkün olmadı' });
    }
});

// Admin - Update WhatsApp Admin Phone(s)
app.post('/dashboard/whatsapp/phone', requireAuth, requireAdmin, async (req, res) => {
    const rawPhones = typeof req.body.phones === 'string'
        ? req.body.phones
        : typeof req.body.phone === 'string'
            ? req.body.phone
            : '';

    const phones = parseAdminPhones(rawPhones);
    if (phones.length === 0) {
        const connected = await resolveAdminNotifyPhones({
            settingsRepository,
            backendUrl: INTERNAL_BACKEND_URL,
        });
        if (connected.length === 0) {
            return res.redirect('/dashboard/whatsapp?error=phone');
        }
        await settingsRepository.setSetting('whatsapp_admin_phone', '');
        return res.redirect('/dashboard/whatsapp?saved=1');
    }

    await settingsRepository.setSetting('whatsapp_admin_phone', serializeAdminPhones(phones));
    res.redirect('/dashboard/whatsapp?saved=1');
});

// Admin - Whatsapp Logout
app.post('/dashboard/whatsapp/logout', requireAuth, requireAdmin, async (req, res) => {
    try {
        await fetch(`${INTERNAL_BACKEND_URL}/api/whatsapp/logout`, { method: 'POST' });
        res.redirect('/dashboard/whatsapp');
    } catch (e) {
        res.redirect('/dashboard/whatsapp?error=true');
    }
});

// Səhifə Məzmunu - GET
app.get('/dashboard/sehife-mezmunu', requireAuth, requireAdmin, async (req, res) => {
    try {
        const SUPPORTED_LOCALES = ['az', 'ru', 'en', 'tr'];
        const lang = SUPPORTED_LOCALES.includes(req.query.lang) ? req.query.lang : 'az';
        const suffix = `_${lang}`;

        const BASE_KEYS = ['home_hero_title','home_hero_subtitle','about_hero_title','about_hero_description','about_paragraphs','about_advantages','howitworks_title','howitworks_description','howitworks_steps','search_eyebrow','search_title','search_route_label','search_pickup_city','search_delivery_city','search_cargo_type','search_vehicle_type','search_keyword','search_keyword_placeholder','search_btn','search_btn_loading','search_advanced_btn','search_advanced_hint','listings_title','categories_title','login_eyebrow','login_title','login_subtitle','login_tab_owner','login_tab_carrier','login_method_phone','login_method_email','login_field_phone','login_field_email','login_field_email_placeholder','login_field_password','login_field_password_placeholder','login_forgot_password','login_btn','login_btn_loading','login_btn_owner','login_btn_carrier','login_no_account','login_register_owner','login_register_carrier','login_sidebar_title','login_sidebar_owner_title','login_sidebar_carrier_title','login_sidebar_owner_desc','login_sidebar_carrier_desc','login_error_invalid','login_error_phone','login_error_email','register_title','register_eyebrow_owner','register_eyebrow_carrier','register_subtitle_owner','register_subtitle_carrier','register_field_firstname','register_field_lastname','register_field_phone','register_field_email','register_field_password','register_field_company','register_field_voen','register_btn','register_btn_loading','register_terms_prefix','register_terms_link','register_privacy_link','register_terms_suffix','register_success','register_error','forgot_title','forgot_subtitle','forgot_field_phone','forgot_field_email','forgot_field_email_placeholder','forgot_btn_send','forgot_btn_sending','forgot_otp_label','forgot_otp_placeholder','forgot_new_password','forgot_new_password_placeholder','forgot_confirm_password','forgot_confirm_password_placeholder','forgot_btn_reset','forgot_btn_resetting','forgot_btn_back','forgot_success_title','forgot_success_redirect','forgot_success_login','forgot_back_to_login','forgot_create_account','forgot_error_send','forgot_error_reset','role_select_eyebrow','role_select_title','role_carrier_title','role_carrier_desc','role_owner_title','role_owner_desc','carrier_highlight_1','carrier_highlight_2','carrier_highlight_3','carrier_field_contact_phone','carrier_field_whatsapp','carrier_company_placeholder','carrier_vehicle_type','carrier_location_address','carrier_location_placeholder','carrier_cargo_volume','carrier_cargo_volume_placeholder','carrier_max_weight','carrier_max_weight_placeholder','carrier_cargo_types_title','carrier_map_title'];
        const dbKeys = BASE_KEYS.map(k => `${k}${suffix}`);
        const rows = await prisma.appSetting.findMany({ where: { key: { in: dbKeys } } });
        // key-dən suffix-i sondan sil
        const map = {};
        for (const row of rows) {
            const baseKey = row.key.endsWith(suffix) ? row.key.slice(0, -suffix.length) : row.key;
            map[baseKey] = row.value;
        }

        // Locale JSON faylını octo-admin qovluğundan oxu
        let localeDefaults = {};
        try {
            const localePath = path.join(__dirname, `${lang}.json`);
            localeDefaults = JSON.parse(fs.readFileSync(localePath, 'utf-8'));
        } catch (e) {
            // public/locales/ yedəyi
            try {
                const localePath2 = path.join(__dirname, '..', 'public', 'locales', `${lang}.json`);
                localeDefaults = JSON.parse(fs.readFileSync(localePath2, 'utf-8'));
            } catch {}
        }

        const g = (key) => {
            if (map[key] !== undefined && map[key] !== '') return map[key];
            if (typeof localeDefaults[key] === 'string') return localeDefaults[key];
            return '';
        };

        const DEFAULT_STEPS = [
            { icon: 'UploadCloud', title: '', text: '' },
            { icon: 'ShieldCheck', title: '', text: '' },
            { icon: 'ClipboardList', title: '', text: '' },
            { icon: 'PhoneCall', title: '', text: '' },
        ];

        let paragraphs = Array.isArray(localeDefaults.about_paragraphs) ? localeDefaults.about_paragraphs : [];
        let advantages = Array.isArray(localeDefaults.about_advantages) ? localeDefaults.about_advantages : [];
        let steps = Array.isArray(localeDefaults.howitworks_steps) ? localeDefaults.howitworks_steps : DEFAULT_STEPS;
        try { if (map.about_paragraphs) paragraphs = JSON.parse(map.about_paragraphs); } catch {}
        try { if (map.about_advantages) advantages = JSON.parse(map.about_advantages); } catch {}
        try { if (map.howitworks_steps) steps = JSON.parse(map.howitworks_steps); } catch {}

        // steps-i həmişə 4 elementli et
        while (steps.length < 4) steps.push(DEFAULT_STEPS[steps.length]);

        res.render('sehife-mezmunu', {
            user: req.session.user,
            path: '/dashboard/sehife-mezmunu',
            saved: req.query.saved === '1',
            error: req.query.error || null,
            currentLang: lang,
            settings: {
                home_hero_title: g('home_hero_title'),
                home_hero_subtitle: g('home_hero_subtitle'),
                about_hero_title: g('about_hero_title'),
                about_hero_description: g('about_hero_description'),
                about_paragraphs_raw: paragraphs.join('\n'),
                about_advantages_raw: advantages.join('\n'),
                howitworks_title: g('howitworks_title'),
                howitworks_description: g('howitworks_description'),
                steps,
                search_eyebrow: g('search_eyebrow'),
                search_title: g('search_title'),
                search_route_label: g('search_route_label'),
                search_pickup_city: g('search_pickup_city'),
                search_delivery_city: g('search_delivery_city'),
                search_cargo_type: g('search_cargo_type'),
                search_vehicle_type: g('search_vehicle_type'),
                search_keyword: g('search_keyword'),
                search_keyword_placeholder: g('search_keyword_placeholder'),
                search_btn: g('search_btn'),
                search_btn_loading: g('search_btn_loading'),
                search_advanced_btn: g('search_advanced_btn'),
                search_advanced_hint: g('search_advanced_hint'),
                listings_title: g('listings_title'),
                categories_title: g('categories_title'),
                login_eyebrow: g('login_eyebrow'), login_title: g('login_title'), login_subtitle: g('login_subtitle'),
                login_tab_owner: g('login_tab_owner'), login_tab_carrier: g('login_tab_carrier'),
                login_method_phone: g('login_method_phone'), login_method_email: g('login_method_email'),
                login_field_phone: g('login_field_phone'), login_field_email: g('login_field_email'), login_field_email_placeholder: g('login_field_email_placeholder'),
                login_field_password: g('login_field_password'), login_field_password_placeholder: g('login_field_password_placeholder'),
                login_forgot_password: g('login_forgot_password'), login_btn: g('login_btn'), login_btn_loading: g('login_btn_loading'),
                login_btn_owner: g('login_btn_owner'), login_btn_carrier: g('login_btn_carrier'),
                login_no_account: g('login_no_account'), login_register_owner: g('login_register_owner'), login_register_carrier: g('login_register_carrier'),
                login_sidebar_title: g('login_sidebar_title'), login_sidebar_owner_title: g('login_sidebar_owner_title'), login_sidebar_carrier_title: g('login_sidebar_carrier_title'),
                login_sidebar_owner_desc: g('login_sidebar_owner_desc'), login_sidebar_carrier_desc: g('login_sidebar_carrier_desc'),
                login_error_invalid: g('login_error_invalid'), login_error_phone: g('login_error_phone'), login_error_email: g('login_error_email'),
                register_title: g('register_title'), register_eyebrow_owner: g('register_eyebrow_owner'), register_eyebrow_carrier: g('register_eyebrow_carrier'),
                register_subtitle_owner: g('register_subtitle_owner'), register_subtitle_carrier: g('register_subtitle_carrier'),
                register_field_firstname: g('register_field_firstname'), register_field_lastname: g('register_field_lastname'),
                register_field_phone: g('register_field_phone'), register_field_email: g('register_field_email'),
                register_field_password: g('register_field_password'), register_field_company: g('register_field_company'), register_field_voen: g('register_field_voen'),
                register_btn: g('register_btn'), register_btn_loading: g('register_btn_loading'),
                register_terms_prefix: g('register_terms_prefix'), register_terms_link: g('register_terms_link'),
                register_privacy_link: g('register_privacy_link'), register_terms_suffix: g('register_terms_suffix'),
                register_success: g('register_success'), register_error: g('register_error'),
                forgot_title: g('forgot_title'), forgot_subtitle: g('forgot_subtitle'),
                forgot_field_phone: g('forgot_field_phone'), forgot_field_email: g('forgot_field_email'), forgot_field_email_placeholder: g('forgot_field_email_placeholder'),
                forgot_btn_send: g('forgot_btn_send'), forgot_btn_sending: g('forgot_btn_sending'),
                forgot_otp_label: g('forgot_otp_label'), forgot_otp_placeholder: g('forgot_otp_placeholder'),
                forgot_new_password: g('forgot_new_password'), forgot_new_password_placeholder: g('forgot_new_password_placeholder'),
                forgot_confirm_password: g('forgot_confirm_password'), forgot_confirm_password_placeholder: g('forgot_confirm_password_placeholder'),
                forgot_btn_reset: g('forgot_btn_reset'), forgot_btn_resetting: g('forgot_btn_resetting'), forgot_btn_back: g('forgot_btn_back'),
                forgot_success_title: g('forgot_success_title'), forgot_success_redirect: g('forgot_success_redirect'), forgot_success_login: g('forgot_success_login'),
                forgot_back_to_login: g('forgot_back_to_login'), forgot_create_account: g('forgot_create_account'),
                forgot_error_send: g('forgot_error_send'), forgot_error_reset: g('forgot_error_reset'),
                role_select_eyebrow: g('role_select_eyebrow'), role_select_title: g('role_select_title'),
                role_carrier_title: g('role_carrier_title'), role_carrier_desc: g('role_carrier_desc'),
                role_owner_title: g('role_owner_title'), role_owner_desc: g('role_owner_desc'),
                carrier_highlight_1: g('carrier_highlight_1'), carrier_highlight_2: g('carrier_highlight_2'), carrier_highlight_3: g('carrier_highlight_3'),
                carrier_field_contact_phone: g('carrier_field_contact_phone'), carrier_field_whatsapp: g('carrier_field_whatsapp'),
                carrier_company_placeholder: g('carrier_company_placeholder'), carrier_vehicle_type: g('carrier_vehicle_type'),
                carrier_location_address: g('carrier_location_address'), carrier_location_placeholder: g('carrier_location_placeholder'),
                carrier_cargo_volume: g('carrier_cargo_volume'), carrier_cargo_volume_placeholder: g('carrier_cargo_volume_placeholder'),
                carrier_max_weight: g('carrier_max_weight'), carrier_max_weight_placeholder: g('carrier_max_weight_placeholder'),
                carrier_cargo_types_title: g('carrier_cargo_types_title'), carrier_map_title: g('carrier_map_title'),
            },
        });
    } catch (e) {
        console.error('Səhifə məzmunu yüklənmədi:', e);
        res.redirect('/dashboard?error=content');
    }
});

// Səhifə məzmunu - dil üzrə JSON API (admin panel JS üçün)
app.get('/dashboard/api/page-content', requireAuth, requireAdmin, async (req, res) => {
    try {
        const SUPPORTED_LOCALES = ['az', 'ru', 'en', 'tr'];
        const lang = SUPPORTED_LOCALES.includes(req.query.locale) ? req.query.locale : 'az';
        const suffix = `_${lang}`;
        const BASE_KEYS = ['home_hero_title','home_hero_subtitle','about_hero_title','about_hero_description','about_paragraphs','about_advantages','howitworks_title','howitworks_description','howitworks_steps','search_eyebrow','search_title','search_route_label','search_pickup_city','search_delivery_city','search_cargo_type','search_vehicle_type','search_keyword','search_keyword_placeholder','search_btn','search_btn_loading','search_advanced_btn','search_advanced_hint','listings_title','categories_title','login_eyebrow','login_title','login_subtitle','login_tab_owner','login_tab_carrier','login_method_phone','login_method_email','login_field_phone','login_field_email','login_field_email_placeholder','login_field_password','login_field_password_placeholder','login_forgot_password','login_btn','login_btn_loading','login_btn_owner','login_btn_carrier','login_no_account','login_register_owner','login_register_carrier','login_sidebar_title','login_sidebar_owner_title','login_sidebar_carrier_title','login_sidebar_owner_desc','login_sidebar_carrier_desc','login_error_invalid','login_error_phone','login_error_email','register_title','register_eyebrow_owner','register_eyebrow_carrier','register_subtitle_owner','register_subtitle_carrier','register_field_firstname','register_field_lastname','register_field_phone','register_field_email','register_field_password','register_field_company','register_field_voen','register_btn','register_btn_loading','register_terms_prefix','register_terms_link','register_privacy_link','register_terms_suffix','register_success','register_error','forgot_title','forgot_subtitle','forgot_field_phone','forgot_field_email','forgot_field_email_placeholder','forgot_btn_send','forgot_btn_sending','forgot_otp_label','forgot_otp_placeholder','forgot_new_password','forgot_new_password_placeholder','forgot_confirm_password','forgot_confirm_password_placeholder','forgot_btn_reset','forgot_btn_resetting','forgot_btn_back','forgot_success_title','forgot_success_redirect','forgot_success_login','forgot_back_to_login','forgot_create_account','forgot_error_send','forgot_error_reset','role_select_eyebrow','role_select_title','role_carrier_title','role_carrier_desc','role_owner_title','role_owner_desc','carrier_highlight_1','carrier_highlight_2','carrier_highlight_3','carrier_field_contact_phone','carrier_field_whatsapp','carrier_company_placeholder','carrier_vehicle_type','carrier_location_address','carrier_location_placeholder','carrier_cargo_volume','carrier_cargo_volume_placeholder','carrier_max_weight','carrier_max_weight_placeholder','carrier_cargo_types_title','carrier_map_title'];
        const dbKeys = BASE_KEYS.map(k => `${k}${suffix}`);
        const rows = await prisma.appSetting.findMany({ where: { key: { in: dbKeys } } });
        const map = {};
        for (const row of rows) {
            const baseKey = row.key.endsWith(suffix) ? row.key.slice(0, -suffix.length) : row.key;
            map[baseKey] = row.value;
        }

        let localeDefaults = {};
        try {
            const localePath = path.join(__dirname, `${lang}.json`);
            localeDefaults = JSON.parse(fs.readFileSync(localePath, 'utf-8'));
        } catch {}

        const result = {};
        for (const key of BASE_KEYS) {
            if (map[key] !== undefined && map[key] !== '') {
                try { result[key] = JSON.parse(map[key]); } catch { result[key] = map[key]; }
            } else {
                result[key] = localeDefaults[key] ?? '';
            }
        }
        res.json({ locale: lang, ...result });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// Səhifə Məzmunu - POST
app.post('/dashboard/sehife-mezmunu', requireAuth, requireAdmin, async (req, res) => {
    try {
        const SUPPORTED_LOCALES = ['az', 'ru', 'en', 'tr'];
        const lang = SUPPORTED_LOCALES.includes(req.body.lang) ? req.body.lang : 'az';
        const suffix = `_${lang}`;

        const {
            home_hero_title, home_hero_subtitle,
            about_hero_title, about_hero_description,
            about_paragraphs_raw, about_advantages_raw,
            howitworks_title, howitworks_description,
            search_eyebrow, search_title, search_route_label,
            search_pickup_city, search_delivery_city,
            search_cargo_type, search_vehicle_type,
            search_keyword, search_keyword_placeholder,
            search_btn, search_btn_loading,
            search_advanced_btn, search_advanced_hint,
            listings_title, categories_title,
        } = req.body;

        const steps = [];
        for (let i = 0; i < 4; i++) {
            steps.push({
                icon: req.body[`step_icon_${i}`] || 'UploadCloud',
                title: (req.body[`step_title_${i}`] || '').trim(),
                text: (req.body[`step_text_${i}`] || '').trim(),
            });
        }

        const paragraphs = (about_paragraphs_raw || '').split('\n').map(s => s.trim()).filter(Boolean);
        const advantages = (about_advantages_raw || '').split('\n').map(s => s.trim()).filter(Boolean);

        const str = (v) => (v || '').trim();
        const upserts = [
            [`home_hero_title${suffix}`, str(home_hero_title)],
            [`home_hero_subtitle${suffix}`, str(home_hero_subtitle)],
            [`about_hero_title${suffix}`, str(about_hero_title)],
            [`about_hero_description${suffix}`, str(about_hero_description)],
            [`about_paragraphs${suffix}`, JSON.stringify(paragraphs)],
            [`about_advantages${suffix}`, JSON.stringify(advantages)],
            [`howitworks_title${suffix}`, str(howitworks_title)],
            [`howitworks_description${suffix}`, str(howitworks_description)],
            [`howitworks_steps${suffix}`, JSON.stringify(steps)],
            [`search_eyebrow${suffix}`, str(search_eyebrow)],
            [`search_title${suffix}`, str(search_title)],
            [`search_route_label${suffix}`, str(search_route_label)],
            [`search_pickup_city${suffix}`, str(search_pickup_city)],
            [`search_delivery_city${suffix}`, str(search_delivery_city)],
            [`search_cargo_type${suffix}`, str(search_cargo_type)],
            [`search_vehicle_type${suffix}`, str(search_vehicle_type)],
            [`search_keyword${suffix}`, str(search_keyword)],
            [`search_keyword_placeholder${suffix}`, str(search_keyword_placeholder)],
            [`search_btn${suffix}`, str(search_btn)],
            [`search_btn_loading${suffix}`, str(search_btn_loading)],
            [`search_advanced_btn${suffix}`, str(search_advanced_btn)],
            [`search_advanced_hint${suffix}`, str(search_advanced_hint)],
            [`listings_title${suffix}`, str(listings_title)],
            [`categories_title${suffix}`, str(categories_title)],
        ];

        // Auth key-lərini body-dən götür
        const AUTH_KEYS = ['carrier_highlight_1','carrier_highlight_2','carrier_highlight_3','carrier_field_contact_phone','carrier_field_whatsapp','carrier_company_placeholder','carrier_vehicle_type','carrier_location_address','carrier_location_placeholder','carrier_cargo_volume','carrier_cargo_volume_placeholder','carrier_max_weight','carrier_max_weight_placeholder','carrier_cargo_types_title','carrier_map_title','login_eyebrow','login_title','login_subtitle','login_tab_owner','login_tab_carrier','login_method_phone','login_method_email','login_field_phone','login_field_email','login_field_email_placeholder','login_field_password','login_field_password_placeholder','login_forgot_password','login_btn','login_btn_loading','login_btn_owner','login_btn_carrier','login_no_account','login_register_owner','login_register_carrier','login_sidebar_title','login_sidebar_owner_title','login_sidebar_carrier_title','login_sidebar_owner_desc','login_sidebar_carrier_desc','login_error_invalid','login_error_phone','login_error_email','register_title','register_eyebrow_owner','register_eyebrow_carrier','register_subtitle_owner','register_subtitle_carrier','register_field_firstname','register_field_lastname','register_field_phone','register_field_email','register_field_password','register_field_company','register_field_voen','register_btn','register_btn_loading','register_terms_prefix','register_terms_link','register_privacy_link','register_terms_suffix','register_success','register_error','forgot_title','forgot_subtitle','forgot_field_phone','forgot_field_email','forgot_field_email_placeholder','forgot_btn_send','forgot_btn_sending','forgot_otp_label','forgot_otp_placeholder','forgot_new_password','forgot_new_password_placeholder','forgot_confirm_password','forgot_confirm_password_placeholder','forgot_btn_reset','forgot_btn_resetting','forgot_btn_back','forgot_success_title','forgot_success_redirect','forgot_success_login','forgot_back_to_login','forgot_create_account','forgot_error_send','forgot_error_reset','role_select_eyebrow','role_select_title','role_carrier_title','role_carrier_desc','role_owner_title','role_owner_desc','carrier_highlight_1','carrier_highlight_2','carrier_highlight_3','carrier_field_contact_phone','carrier_field_whatsapp','carrier_company_placeholder','carrier_vehicle_type','carrier_location_address','carrier_location_placeholder','carrier_cargo_volume','carrier_cargo_volume_placeholder','carrier_max_weight','carrier_max_weight_placeholder','carrier_cargo_types_title','carrier_map_title'];
        for (const k of AUTH_KEYS) {
            upserts.push([`${k}${suffix}`, str(req.body[k])]);
        }

        await Promise.all(upserts.map(([key, value]) =>
            prisma.appSetting.upsert({ where: { key }, update: { value }, create: { key, value } })
        ));

        res.redirect(`/dashboard/sehife-mezmunu?saved=1&lang=${lang}`);
    } catch (e) {
        console.error('Səhifə məzmunu saxlanmadı:', e);
        res.redirect('/dashboard/sehife-mezmunu?error=save');
    }
});

// Filter Ayarları - GET
app.get('/dashboard/filter-ayarlari', requireAuth, requireAdmin, async (req, res) => {
    try {
        const DEFAULT_CITIES = ["Bakı","Sumqayıt","Gəncə","Xırdalan","Quba","Qəbələ","Mingəçevir","Şəki","Lənkəran","Masallı","Şamaxı","Naxçıvan"];
        const DEFAULT_CARGO_TYPES = ["Mebel","Tikinti materialı","Kubik","Ərzaq","Texnika","Paletli yük","Soyudulmuş məhsul","Sənaye avadanlığı"];
        const DEFAULT_VEHICLE_TYPES = ["Ford Transit","Kamaz","TIR","Tentli yük maşını","Soyuduculu maşın","Platforma","Konteyner daşıyan"];

        const rows = await prisma.appSetting.findMany({
            where: { key: { in: ['filters_cities','filters_cargo_types','filters_vehicle_types'] } }
        });
        const map = Object.fromEntries(rows.map(r => [r.key, r.value]));

        const parse = (key, def) => { try { return map[key] ? JSON.parse(map[key]) : def; } catch { return def; } };

        res.render('filter-ayarlari', {
            user: req.session.user,
            path: '/dashboard/filter-ayarlari',
            saved: req.query.saved === '1',
            error: req.query.error || null,
            filters: {
                cities: parse('filters_cities', DEFAULT_CITIES),
                cargoTypes: parse('filters_cargo_types', DEFAULT_CARGO_TYPES),
                vehicleTypes: parse('filters_vehicle_types', DEFAULT_VEHICLE_TYPES),
            },
        });
    } catch (e) {
        console.error('Filter ayarları yüklənmədi:', e);
        res.redirect('/dashboard?error=filters');
    }
});

// Filter Ayarları - POST
app.post('/dashboard/filter-ayarlari', requireAuth, requireAdmin, async (req, res) => {
    try {
        const parse = (val, def) => { try { const a = JSON.parse(val); return Array.isArray(a) ? a.filter(Boolean) : def; } catch { return def; } };
        const cities = parse(req.body.cities_json, []);
        const cargoTypes = parse(req.body.cargo_types_json, []);
        const vehicleTypes = parse(req.body.vehicle_types_json, []);

        await Promise.all([
            prisma.appSetting.upsert({ where: { key: 'filters_cities' }, update: { value: JSON.stringify(cities) }, create: { key: 'filters_cities', value: JSON.stringify(cities) } }),
            prisma.appSetting.upsert({ where: { key: 'filters_cargo_types' }, update: { value: JSON.stringify(cargoTypes) }, create: { key: 'filters_cargo_types', value: JSON.stringify(cargoTypes) } }),
            prisma.appSetting.upsert({ where: { key: 'filters_vehicle_types' }, update: { value: JSON.stringify(vehicleTypes) }, create: { key: 'filters_vehicle_types', value: JSON.stringify(vehicleTypes) } }),
        ]);

        res.redirect('/dashboard/filter-ayarlari?saved=1');
    } catch (e) {
        console.error('Filter ayarları saxlanmadı:', e);
        res.redirect('/dashboard/filter-ayarlari?error=save');
    }
});

// Footer Ayarları - GET
app.get('/dashboard/footer-ayarlari', requireAuth, requireAdmin, async (req, res) => {
    try {
        const [phone, whatsapp, email, telegram, workHours, copyright, tagline] = await Promise.all([
            settingsRepository.getSetting('footer_phone', '+994 50 123 45 67'),
            settingsRepository.getSetting('footer_whatsapp', '+994501234567'),
            settingsRepository.getSetting('footer_email', 'info@tranzit.az'),
            settingsRepository.getSetting('footer_telegram', 'tranzitaz'),
            settingsRepository.getSetting('footer_work_hours', 'Hər gün 09:00-20:00'),
            settingsRepository.getSetting('footer_copyright', '© 2026 Tranzit.AZ. Bütün hüquqlar qorunur.'),
            settingsRepository.getSetting('footer_tagline', 'Yük elanları və daşıma əlaqələri üçün public platforma.'),
        ]);
        res.render('footer-ayarlari', {
            user: req.session.user,
            path: '/dashboard/footer-ayarlari',
            saved: req.query.saved === '1',
            error: req.query.error || null,
            settings: { phone, whatsapp, email, telegram, workHours, copyright, tagline },
        });
    } catch (e) {
        console.error('Footer ayarları yüklənmədi:', e);
        res.redirect('/dashboard?error=footer');
    }
});

// Footer Ayarları - POST
app.post('/dashboard/footer-ayarlari', requireAuth, requireAdmin, async (req, res) => {
    try {
        const { phone, whatsapp, email, telegram, workHours, copyright, tagline } = req.body;
        await Promise.all([
            settingsRepository.setSetting('footer_phone', (phone || '').trim()),
            settingsRepository.setSetting('footer_whatsapp', (whatsapp || '').trim()),
            settingsRepository.setSetting('footer_email', (email || '').trim()),
            settingsRepository.setSetting('footer_telegram', (telegram || '').trim()),
            settingsRepository.setSetting('footer_work_hours', (workHours || '').trim()),
            settingsRepository.setSetting('footer_copyright', (copyright || '').trim()),
            settingsRepository.setSetting('footer_tagline', (tagline || '').trim()),
        ]);
        res.redirect('/dashboard/footer-ayarlari?saved=1');
    } catch (e) {
        console.error('Footer ayarları saxlanmadı:', e);
        res.redirect('/dashboard/footer-ayarlari?error=save');
    }
});

app.listen(OCTO_ADMIN_PORT, OCTO_ADMIN_HOST, () => {
    console.log(`Cargo Admin Panel running at http://${OCTO_ADMIN_HOST}:${OCTO_ADMIN_PORT}`);
});
