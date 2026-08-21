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
        const { id, label, icon_key, icon_tone, sort_order, is_active } = req.body;
        const trimmedLabel = String(label || '').trim();
        if (!trimmedLabel) {
            return res.redirect('/dashboard/kategoriler?error=save');
        }
        await categoryRepository.upsert({ id, label: trimmedLabel, icon_key, icon_tone, sort_order, is_active });
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
        const keys = [
            'home_hero_title','home_hero_subtitle',
            'about_hero_title','about_hero_description','about_paragraphs','about_advantages',
            'howitworks_title','howitworks_description','howitworks_steps',
        ];
        const rows = await prisma.appSetting.findMany({ where: { key: { in: keys } } });
        const map = Object.fromEntries(rows.map(r => [r.key, r.value]));

        const defaultParagraphs = [
            'Tranzit.AZ yük sahibləri, sürücülər və daşıma şirkətləri arasında əlaqəni asanlaşdıran onlayn yük elanları platformasıdır. Məqsədimiz yükünüzün daha asan tapılmasını sürətli, şəffaf və rahat etməkdir.',
            'Platformada yük sahibləri öz elanlarını pulsuz yerləşdirə, sürücülər və daşıma şirkətləri isə uyğun yükləri asanlıqla taparaq əlaqə saxlaya bilərlər.'
        ];
        const defaultAdvantages = [
            'Vaxta qənaət - Siz sürücü yox, sürücülər sizi axtarır.',
            'Rahat elan yerləşdirmə',
            'Yük növü, nəqliyyat və şəhərə görə axtarış sistemi',
            'Sürücülər və daşıma şirkətləri üçün yeni sifariş imkanları',
            'Birbaşa zəng və vasitəsiz danışıq imkanı',
            'Sürücülər üçün qeydiyyat olmadan yük görmə və zəng etmə imkanları'
        ];
        const defaultSteps = [
            { icon: 'UploadCloud', title: 'Asan yük yerləşdirmə', text: 'Yük sahibi qeydiyyatdan keçərək yük formunu bir neçə kliklə doldurur.' },
            { icon: 'ShieldCheck', title: 'Təsdiqləmə vaxtı', text: 'Dəqiqələr içində elanınız yoxlanılır, qaydalara uyğun olduqda təsdiqlənir.' },
            { icon: 'ClipboardList', title: 'Əlçatan elan səhifəsi', text: 'Elanınız əsas səhifədə görünərək sürücülər üçün daha əlçatan olur.' },
            { icon: 'PhoneCall', title: 'Birbaşa zəng', text: 'Fərdi sürücülər birbaşa sizinlə əlaqə saxlayaraq daşınmanın detallarını razılaşdırır.' },
        ];

        let paragraphs = defaultParagraphs;
        let advantages = defaultAdvantages;
        let steps = defaultSteps;
        try { if (map.about_paragraphs) paragraphs = JSON.parse(map.about_paragraphs); } catch {}
        try { if (map.about_advantages) advantages = JSON.parse(map.about_advantages); } catch {}
        try { if (map.howitworks_steps) steps = JSON.parse(map.howitworks_steps); } catch {}

        res.render('sehife-mezmunu', {
            user: req.session.user,
            path: '/dashboard/sehife-mezmunu',
            saved: req.query.saved === '1',
            error: req.query.error || null,
            settings: {
                home_hero_title: map.home_hero_title || 'Daşımalarınızı bizimlə asanlaşdırın',
                home_hero_subtitle: map.home_hero_subtitle || 'Yükünüz üçün doğru marşrutu, nəqliyyatı və daşıyıcını bir yerdə tapın.',
                about_hero_title: map.about_hero_title || 'Platforma haqqında',
                about_hero_description: map.about_hero_description || 'Tranzit.AZ yük bazarında əlaqəni sürətləndirən, aydın və rahat iş axını təqdim edən elan platformasıdır.',
                about_paragraphs_raw: paragraphs.join('\n'),
                about_advantages_raw: advantages.join('\n'),
                howitworks_title: map.howitworks_title || 'Sadə elan modeli, sürətli əlaqə',
                howitworks_description: map.howitworks_description || 'Tranzit.AZ marketplace deyil. Platforma yük elanını dərc edir və sürücünü birbaşa yük sahibi ilə danışdırır.',
                steps,
            },
        });
    } catch (e) {
        console.error('Səhifə məzmunu yüklənmədi:', e);
        res.redirect('/dashboard?error=content');
    }
});

// Səhifə Məzmunu - POST
app.post('/dashboard/sehife-mezmunu', requireAuth, requireAdmin, async (req, res) => {
    try {
        const {
            home_hero_title, home_hero_subtitle,
            about_hero_title, about_hero_description,
            about_paragraphs_raw, about_advantages_raw,
            howitworks_title, howitworks_description,
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

        const upserts = [
            ['home_hero_title', (home_hero_title || '').trim()],
            ['home_hero_subtitle', (home_hero_subtitle || '').trim()],
            ['about_hero_title', (about_hero_title || '').trim()],
            ['about_hero_description', (about_hero_description || '').trim()],
            ['about_paragraphs', JSON.stringify(paragraphs)],
            ['about_advantages', JSON.stringify(advantages)],
            ['howitworks_title', (howitworks_title || '').trim()],
            ['howitworks_description', (howitworks_description || '').trim()],
            ['howitworks_steps', JSON.stringify(steps)],
        ];

        await Promise.all(upserts.map(([key, value]) =>
            prisma.appSetting.upsert({ where: { key }, update: { value }, create: { key, value } })
        ));

        res.redirect('/dashboard/sehife-mezmunu?saved=1');
    } catch (e) {
        console.error('Səhifə məzmunu saxlanmadı:', e);
        res.redirect('/dashboard/sehife-mezmunu?error=save');
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
