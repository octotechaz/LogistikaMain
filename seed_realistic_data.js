const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

const CITIES = [
  'Bakı', 'Sumqayıt', 'Gəncə', 'Xırdalan', 'Quba', 'Qəbələ', 'Mingəçevir',
  'Şəki', 'Lənkəran', 'Masallı', 'Şamaxı', 'Naxçıvan', 'Yevlax', 'Bərdə', 'Şəmkir', 'Göycay'
];

const CARGO_TYPES = [
  'Mebel', 'Tikinti materialı', 'Kubik', 'Ərzaq', 'Texnika', 
  'Paletli yük', 'Soyudulmuş məhsul', 'Sənaye avadanlığı', 'Taxıl', 'Kimyəvi maddə'
];

const VEHICLE_TYPES = [
  'Ford Transit', 'Kamaz', 'TIR', 'Tentli yük maşını', 
  'Soyuduculu maşın', 'Platforma', 'Konteyner daşıyan', 'İsuzu'
];

const AZ_FIRST_NAMES = [
  'Elçin', 'Rəşad', 'Vüsal', 'Kamran', 'Orxan', 'Tural', 'Fariz', 'Samir', 
  'Emin', 'Anar', 'İlkin', 'Zaur', 'Murad', 'Fərid', 'Nijat', 'Ramil', 'Elmir', 'Tərlan', 'Asim', 'Şahin'
];

const AZ_LAST_NAMES = [
  'Məmmədov', 'Əliyev', 'Hüseynov', 'Quliyev', 'Həsənov', 'Abdullayev', 'İsmayılov', 
  'Sadıqov', 'Kazımov', 'Rzayev', 'Cəfərov', 'Süleymanov', 'Baxşəliyev', 'Nəbi', 'Mustafayev', 'Cabbarov'
];

const AZ_COMPANIES = [
  'Araz-Loqistik MMC', 'Bakı Yük Daşıma ASC', 'Qafqaz Nəqliyyat MMC', 'Xəzər-Kargo LTD', 
  'Abşeron Sənaye Nəqliyyatı', 'Trans-Azərbaycan MMC', 'Gəncə-Kargo ASC', 'İpək Yolu Daşımaları',
  'Baku Logistics Group', 'Sumqayıt-Trans MMC', 'Lənkəran Yük Korporasiyası', 'Optimal Daşıma MMC'
];

const REALISTIC_IMAGE_URLS = [
  'https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?w=800&q=80',
  'https://images.unsplash.com/photo-1578575437130-527eed3abbec?w=800&q=80',
  'https://images.unsplash.com/photo-1519003722824-194d4455a60c?w=800&q=80',
  'https://images.unsplash.com/photo-1601584115197-04ecc0da31d7?w=800&q=80',
  'https://images.unsplash.com/photo-1566576912321-d58ddd7a6088?w=800&q=80',
  'https://images.unsplash.com/photo-1586528116493-a029325540fa?w=800&q=80',
  'https://images.unsplash.com/photo-1494412574643-ff11b0a5c1c3?w=800&q=80',
  'https://images.unsplash.com/photo-1580674285054-bed31e145f59?w=800&q=80'
];

function randomChoice(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function randomNumber(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

async function runSeed() {
  console.log('=== REALİSTİK MƏLUMATLARIN ƏLAVƏ EDİLMƏSİ BAŞLADI ===');
  
  // Create generic PublicCategory to link CargoPosts
  let defaultCategory = await prisma.publicCategory.findFirst();
  if(!defaultCategory) {
     defaultCategory = await prisma.publicCategory.create({
         data: {
             
             
             iconKey: 'box',
             isActive: true,
             sortOrder: 10, label: "Umumi", legacySqliteId: "legacy-" + Date.now()
         }
     });
  }
  
  const defaultPassword = await bcrypt.hash('Password123!', 10);

  // 1. Create 15 Realistic Cargo Owners
  console.log('1. Yük sahibləri (Cargo Owners) yaradılır...');
  const ownerUsers = [];
  for (let i = 0; i < 15; i++) {
    const fn = randomChoice(AZ_FIRST_NAMES);
    const ln = randomChoice(AZ_LAST_NAMES);
    const company = randomChoice(AZ_COMPANIES);
    const email = `yuk.sahibi.${i+1}.${fn.toLowerCase()}.${ln.toLowerCase()}@tranzit.az`.replace(/ə/g,'e').replace(/ç/g,'c').replace(/ş/g,'s').replace(/ğ/g,'g').replace(/ö/g,'o').replace(/ü/g,'u').replace(/ı/g,'i');
    const phone = `+99450${randomNumber(1000000, 9999999)}`;
    
    // Upsert or create user
    const user = await prisma.user.upsert({
      where: { email },
      update: {},
      create: {
        firstName: fn,
        lastName: ln,
        email,
        phone,
        passwordHash: defaultPassword,
        role: 'CARGO_OWNER',
        status: 'ACTIVE',
        cargoOwnerProfile: {
          create: {
            companyName: company
          }
        }
      },
      include: {
        cargoOwnerProfile: true
      }
    });
    ownerUsers.push(user);
  }
  console.log(`✅ 15 Yük Sahibi yaradıldı.`);

  // 2. Create 10 Realistic Carriers / Drivers with Vehicles
  console.log('2. Daşıyıcılar ve Sürücülər (Carriers & Vehicles) yaradılır...');
  const carrierUsers = [];
  for (let i = 0; i < 10; i++) {
    const fn = randomChoice(AZ_FIRST_NAMES);
    const ln = randomChoice(AZ_LAST_NAMES);
    const email = `dasiyici.${i+1}.${fn.toLowerCase()}.${ln.toLowerCase()}@tranzit.az`.replace(/ə/g,'e').replace(/ç/g,'c').replace(/ş/g,'s').replace(/ğ/g,'g').replace(/ö/g,'o').replace(/ü/g,'u').replace(/ı/g,'i');
    const phone = `+99455${randomNumber(1000000, 9999999)}`;
    const vType = randomChoice(VEHICLE_TYPES);

    const carrier = await prisma.user.upsert({
      where: { email },
      update: {},
      create: {
        firstName: fn,
        lastName: ln,
        email,
        phone,
        passwordHash: defaultPassword,
        role: 'CARRIER',
        status: 'ACTIVE',
        carrierProfile: {
          create: {
            whatsappPhone: phone,
            vehicleType: vType
          }
        }
      },
      include: {
        carrierProfile: true
      }
    });
    
    const vehicle = await prisma.vehicle.create({
        data: {
            carrierId: carrier.id,
            carrierProfileId: carrier.carrierProfile.id,
            vehicleType: vType,
            brand: randomChoice(['Volvo', 'Mercedes-Benz', 'MAN', 'DAF', 'Scania', 'Ford', 'KamAZ', 'Isuzu']),
            model: randomChoice(['FH16', 'Actros', 'TGX', 'XF105', 'R500', 'Transit', '5490']),
            plateNumber: `${randomNumber(10, 99)}-${randomChoice(['AA', 'BB', 'AZ', 'BG', 'TT'])}-${randomNumber(100, 999)}`,
            capacityTons: randomNumber(2, 25),
            bodyLength: randomNumber(5, 13),
            bodyWidth: 2.45,
            bodyHeight: 2.7,
            overallDimensions: '13.6x2.45x2.7',
            status: 'APPROVED',
            driverFirstName: fn,
            driverLastName: ln,
            driverPhone: phone,
            workHours: '08:00-20:00',
            workDays: ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY']
        }
    });
    
    carrier.carrierVehicles = [vehicle];
    carrierUsers.push(carrier);
  }
  console.log(`✅ 10 Daşıyıcı/Sürücü və Nəqliyyat vasitəsi yaradıldı.`);

  // 3. Create 100 Realistic Cargo Posts across various categories/cities
  console.log('3. 100 Adət Dolu və Gerçəkci İlan (CargoPost) yaradılır...');
  let createdPostsCount = 0;
  
  for (let i = 0; i < 100; i++) {
    const owner = randomChoice(ownerUsers);
    const origin = randomChoice(CITIES);
    let dest = randomChoice(CITIES);
    while (dest === origin) {
      dest = randomChoice(CITIES);
    }
    
    const cargoType = randomChoice(CARGO_TYPES);
    const reqVehicle = randomChoice(VEHICLE_TYPES);
    const weight = randomNumber(500, 24000);
    const price = randomNumber(150, 3500);
    const pickupDate = new Date(Date.now() + randomNumber(0, 14) * 86400000);
    
    const title = `${origin} - ${dest} istiqamətində ${cargoType.toLowerCase()} daşınması`;
    const descriptions = [
      `${origin} şəhərindən ${dest} şəhərinə ${weight} kq çəkidə ${cargoType.toLowerCase()} daşınacaq. Təcili və etibarlı sürücü axtarılır.`,
      `Yükləmə yeri: ${origin} sənaye zonası. Çatdırılma ünvanı: ${dest} mərkəz. Yük növü: ${cargoType}. Qiymət danışıq yolu ilə və ya nağd.`,
      `Tələb olunan nəqliyyat: ${reqVehicle}. Yük tam hazırdır, ${pickupDate.toLocaleDateString('az-AZ')} tarixində yola düşməlidir.`,
      `${owner.cargoOwnerProfile.companyName} tərəfindən sifariş olunub. ${cargoType} daşınması üçün müraciət edə bilərsiniz.`
    ];
    const desc = randomChoice(descriptions);
    const imageUrl = randomChoice(REALISTIC_IMAGE_URLS);

    const cargoPost = await prisma.cargoPost.create({
      data: {
        ownerId: owner.id,
        cargoOwnerProfileId: owner.cargoOwnerProfile.id,
        
        cargoName: title,
        cargoType: cargoType,
        description: desc,
        weight: weight,
        volume: randomNumber(10, 80),
        pickupAddress: `${origin}, Sənaye və Ticarət Mərkəzi`,
        deliveryAddress: `${dest}, Mərkəzi Anbar`,
        pickupCity: origin,
        deliveryCity: dest,
        pickupDate: pickupDate,
        requiredVehicleType: reqVehicle,
        proposedPrice: price,
        contactPhone: owner.phone,
        status: 'ACTIVE',
        legacyAdminStatus: 'APPROVED',
        images: {
          create: [{
            url: imageUrl,
                category: "CARGO"
          }]
        }
      }
    });

    createdPostsCount++;

    if (Math.random() > 0.6) {
      const carrier = randomChoice(carrierUsers);
      if (carrier.carrierVehicles.length > 0 && carrier.carrierProfile) {
        try {
          await prisma.cargoApplication.create({
            data: {
              cargoPostId: cargoPost.id,
              carrierId: carrier.id,
              carrierProfileId: carrier.carrierProfile.id,
              vehicleId: carrier.carrierVehicles[0].id,
              status: randomChoice(['PENDING', 'ACCEPTED', 'REJECTED']),
              offeredPrice: price - randomNumber(20, 100)
            }
          });
        } catch(e) {
          // Ignore unique constraints
        }
      }
    }
  }

  console.log(`✅ 100 Adət İlan müvəffəqiyyətlə əlavə olundu və kateqoriya/şəhərlərlə bağlandı.`);
  console.log('=== SEED PROSESİ TAMAMLANDI ===');
  await prisma.$disconnect();
}

runSeed().catch(e => {
  console.error(e);
  process.exit(1);
});
