// DEVELOPMENT/DEMO ONLY — this seed file must never be invoked in production.
// Production admin bootstrap is handled by: node scripts/bootstrap-production-admin.mjs
if (process.env.NODE_ENV === "production") {
  console.error("ERROR: prisma/seed.ts must not be run in production. Use prod:bootstrap-admin instead.");
  process.exit(1);
}

import { PrismaClient, Role } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();
const password = "Password123!";

async function createUser(input: {
  firstName: string;
  lastName: string;
  phone: string;
  email: string;
  role: Role;
  companyName?: string;
}) {
  return prisma.user.create({
    data: {
      firstName: input.firstName,
      lastName: input.lastName,
      phone: input.phone,
      email: input.email,
      passwordHash: await bcrypt.hash(password, 12),
      role: input.role,
      companyName: input.companyName ?? null,
      status: "ACTIVE"
    }
  });
}

async function main() {
  await prisma.review.deleteMany();
  await prisma.loadContactAttempt.deleteMany();
  await prisma.operatorLog.deleteMany();
  await prisma.notificationTemplate.deleteMany();
  await prisma.notification.deleteMany();
  await prisma.adminLog.deleteMany();
  await prisma.complaint.deleteMany();
  await prisma.cargoApplication.deleteMany();
  await prisma.image.deleteMany();
  await prisma.load.deleteMany();
  await prisma.cargoPost.deleteMany();
  await prisma.vehicle.deleteMany();
  await prisma.driverProfile.deleteMany();
  await prisma.dispatcherProfile.deleteMany();
  await prisma.carrierProfile.deleteMany();
  await prisma.cargoOwnerProfile.deleteMany();
  await prisma.user.deleteMany();

  const admin = await createUser({
    firstName: "Sistem",
    lastName: "Admin",
    phone: "+994501112233",
    email: "admin@tranzit.az",
    role: Role.ADMIN
  });

  const operator = await createUser({
    firstName: "Aysel",
    lastName: "Operator",
    phone: "+994501010101",
    email: "operator@tranzit.az",
    role: Role.OPERATOR,
    companyName: "tranzit.az"
  });

  const ownerUsers = await Promise.all([
    createUser({
      firstName: "Nərmin",
      lastName: "Quliyeva",
      phone: "+994703334455",
      email: "owner@tranzit.az",
      role: Role.CARGO_OWNER,
      companyName: "Qafqaz Tikinti"
    }),
    createUser({
      firstName: "Rəşad",
      lastName: "Məmmədov",
      phone: "+994502224466",
      email: "owner2@tranzit.az",
      role: Role.CARGO_OWNER,
      companyName: "Fresh Market"
    }),
    createUser({
      firstName: "Elnur",
      lastName: "Qasımov",
      phone: "050 555 10 20",
      email: "elnur@example.com",
      role: Role.CARGO_OWNER,
      companyName: "Global Cargo MMC"
    }),
  ]);

  const ownerProfiles = await Promise.all([
    prisma.cargoOwnerProfile.create({
      data: {
        userId: ownerUsers[0].id,
        companyName: "Qafqaz Tikinti",
        voen: "1501234561",
        city: "Bakı"
      }
    }),
    prisma.cargoOwnerProfile.create({
      data: {
        userId: ownerUsers[1].id,
        companyName: "Fresh Market",
        voen: "1709876541",
        city: "Sumqayıt"
      }
    })
  ]);

  const driverUsers = await Promise.all([
    createUser({ firstName: "Elvin", lastName: "Hüseynov", phone: "+994552223344", email: "driver1@tranzit.local", role: Role.DRIVER }),
    createUser({ firstName: "Ramin", lastName: "Əliyev", phone: "+994554441888", email: "driver2@tranzit.local", role: Role.DRIVER }),
    createUser({ firstName: "Nicat", lastName: "Məmmədov", phone: "+994702224590", email: "driver3@tranzit.local", role: Role.DRIVER }),
    createUser({ firstName: "Murad", lastName: "Kazımov", phone: "+994552009977", email: "driver4@tranzit.local", role: Role.DRIVER }),
    createUser({ firstName: "Orxan", lastName: "Rüstəmli", phone: "+994772008866", email: "driver5@tranzit.local", role: Role.DRIVER })
  ]);

  const drivers = await Promise.all([
    prisma.driverProfile.create({
      data: {
        userId: driverUsers[0].id,
        whatsappPhone: "+994552223344",
        city: "Bakı",
        vehicleType: "Ford Transit",
        brand: "Ford",
        model: "Transit",
        plateNumber: "10-DR-101",
        capacityTons: 3,
        bodyLength: 4.2,
        bodyWidth: 1.9,
        bodyHeight: 2,
        workingDays: ["Bazar ertəsi", "Çərşənbə", "Cümə"],
        workingHours: "09:00-19:00",
        routes: ["Bakı", "Gəncə", "Şəki"],
        notificationChannels: ["WHATSAPP", "SMS", "CALL"],
        consentToReceiveOffers: true,
        activityScore: 87,
        status: "ACTIVE"
      }
    }),
    prisma.driverProfile.create({
      data: {
        userId: driverUsers[1].id,
        whatsappPhone: "+994554441888",
        city: "Sumqayıt",
        vehicleType: "Kamaz",
        brand: "Kamaz",
        model: "5320",
        plateNumber: "50-KM-222",
        capacityTons: 12,
        bodyLength: 6,
        bodyWidth: 2.4,
        bodyHeight: 2.4,
        workingDays: ["Hər gün"],
        workingHours: "08:00-20:00",
        routes: ["Bakı", "Sumqayıt", "Qəbələ"],
        notificationChannels: ["WHATSAPP", "CALL"],
        consentToReceiveOffers: true,
        activityScore: 74,
        status: "ACTIVE"
      }
    }),
    prisma.driverProfile.create({
      data: {
        userId: driverUsers[2].id,
        whatsappPhone: "+994702224590",
        city: "Xırdalan",
        vehicleType: "TIR",
        brand: "Mercedes-Benz",
        model: "Actros",
        plateNumber: "90-TR-333",
        capacityTons: 22,
        bodyLength: 13.6,
        bodyWidth: 2.45,
        bodyHeight: 2.7,
        workingDays: ["Bazar ertəsi", "Çərşənbə axşamı", "Çərşənbə", "Cümə"],
        workingHours: "09:00-18:00",
        routes: ["Xırdalan", "Gəncə", "Bakı"],
        notificationChannels: ["WHATSAPP", "SMS"],
        consentToReceiveOffers: true,
        activityScore: 69,
        status: "ACTIVE"
      }
    }),
    prisma.driverProfile.create({
      data: {
        userId: driverUsers[3].id,
        whatsappPhone: "+994552009977",
        city: "Lənkəran",
        vehicleType: "Soyuduculu maşın",
        brand: "Hyundai",
        model: "HD78",
        plateNumber: "99-SY-808",
        capacityTons: 5,
        bodyLength: 5.2,
        bodyWidth: 2.1,
        bodyHeight: 2.2,
        workingDays: ["Hər gün"],
        workingHours: "06:00-18:00",
        routes: ["Lənkəran", "Bakı", "Masallı"],
        notificationChannels: ["WHATSAPP", "CALL"],
        consentToReceiveOffers: true,
        activityScore: 81,
        status: "ACTIVE"
      }
    }),
    prisma.driverProfile.create({
      data: {
        userId: driverUsers[4].id,
        whatsappPhone: "+994772008866",
        city: "Gəncə",
        vehicleType: "Evakuator",
        brand: "Isuzu",
        model: "NPR",
        plateNumber: "20-EV-505",
        capacityTons: 4,
        bodyLength: 5.5,
        bodyWidth: 2.2,
        bodyHeight: 1.2,
        workingDays: ["Hər gün"],
        workingHours: "24/7",
        routes: ["Gəncə", "Bakı", "Şəmkir"],
        notificationChannels: ["CALL", "WHATSAPP"],
        consentToReceiveOffers: true,
        activityScore: 58,
        status: "ACTIVE"
      }
    })
  ]);

  // CARRIER istifadəçilər — müraciət sistemi üçün
  const carrierUsers = await Promise.all([
    createUser({ firstName: "Kamran", lastName: "Hüseynli", phone: "+994501234567", email: "carrier1@tranzit.local", role: Role.CARRIER, companyName: "Hüseynli Nəqliyyat" }),
    createUser({ firstName: "Tural", lastName: "Babayev", phone: "+994552345678", email: "carrier2@tranzit.local", role: Role.CARRIER, companyName: "Bakı Trans MMC" }),
  ]);

  const carrierProfiles = await Promise.all([
    prisma.carrierProfile.create({
      data: {
        userId: carrierUsers[0].id,
        whatsappPhone: "+994501234567",
        vehicleType: "TIR",
        supportedCargoTypes: ["Tikinti materialı", "Metal", "Paletli yük"],
        maxWeightTons: 22,
        cargoSpaceVolumeM3: 90,
        locationLabel: "Bakı",
        locationLat: 40.409264,
        locationLng: 49.867092,
      }
    }),
    prisma.carrierProfile.create({
      data: {
        userId: carrierUsers[1].id,
        whatsappPhone: "+994552345678",
        vehicleType: "Ford Transit",
        supportedCargoTypes: ["Mebel", "Ev əşyaları", "Ərzaq"],
        maxWeightTons: 3,
        cargoSpaceVolumeM3: 18,
        locationLabel: "Sumqayıt",
        locationLat: 40.589722,
        locationLng: 49.66861,
      }
    }),
  ]);

  await Promise.all([
    prisma.vehicle.create({
      data: {
        carrierId: carrierUsers[0].id,
        carrierProfileId: carrierProfiles[0].id,
        vehicleType: "TIR",
        brand: "Mercedes-Benz",
        model: "Actros",
        plateNumber: "77-TI-999",
        driverFirstName: "Kamran",
        driverLastName: "Hüseynli",
        driverPhone: "+994501234567",
        capacityTons: 22,
        bodyLength: 13.6,
        bodyWidth: 2.45,
        bodyHeight: 2.7,
        overallDimensions: "13.6x2.45x2.7",
        workDays: ["Bazar ertəsi", "Çərşənbə axşamı", "Çərşənbə", "Cümə axşamı", "Cümə"],
        workHours: "08:00-20:00",
        serviceAreas: ["Bakı", "Gəncə", "Sumqayıt", "Mingəçevir"],
        status: "APPROVED",
      }
    }),
    prisma.vehicle.create({
      data: {
        carrierId: carrierUsers[1].id,
        carrierProfileId: carrierProfiles[1].id,
        vehicleType: "Ford Transit",
        brand: "Ford",
        model: "Transit",
        plateNumber: "10-TR-555",
        driverFirstName: "Tural",
        driverLastName: "Babayev",
        driverPhone: "+994552345678",
        capacityTons: 3,
        bodyLength: 4.2,
        bodyWidth: 1.9,
        bodyHeight: 2.0,
        overallDimensions: "4.2x1.9x2.0",
        workDays: ["Hər gün"],
        workHours: "09:00-19:00",
        serviceAreas: ["Bakı", "Sumqayıt", "Xırdalan", "Abşeron"],
        status: "APPROVED",
      }
    }),
  ]);

  const dispatcherUsers = await Promise.all([
      createUser({
        firstName: "Samir",
        lastName: "Qarayev",
        phone: "+994505557788",
        email: "dispatcher1@tranzit.local",
        role: Role.DISPATCHER,
        companyName: "Qafqaz Fleet"
      }),
      createUser({
        firstName: "Leyla",
        lastName: "Abdullayeva",
        phone: "+994774445566",
        email: "dispatcher2@tranzit.local",
        role: Role.DISPATCHER,
        companyName: "Region Trans"
      })
    ]);

  const dispatchers = await Promise.all([
    prisma.dispatcherProfile.create({
      data: {
        userId: dispatcherUsers[0].id,
        whatsappPhone: "+994505557788",
        companyName: "Qafqaz Fleet",
        vehicleCount: 8,
        vehicleTypes: ["TIR", "Kamaz", "Ford Transit"],
        routes: ["Bakı", "Gəncə", "Qəbələ", "Sumqayıt"],
        note: "Regionlar üzrə gündəlik maşın yönləndirir.",
        activityScore: 92,
        status: "ACTIVE"
      }
    }),
    prisma.dispatcherProfile.create({
      data: {
        userId: dispatcherUsers[1].id,
        whatsappPhone: "+994774445566",
        companyName: "Region Trans",
        vehicleCount: 5,
        vehicleTypes: ["Soyuduculu maşın", "TIR", "Evakuator"],
        routes: ["Lənkəran", "Bakı", "Gəncə", "Şəmkir"],
        note: "Soyuduculu və evakuator maşınları daha aktivdir.",
        activityScore: 76,
        status: "ACTIVE"
      }
    })
  ]);

  const pickupBase = Date.now() + 1000 * 60 * 60 * 24;
  const loads = await Promise.all([
    prisma.load.create({
      data: {
        cargoOwnerId: ownerUsers[0].id,
        cargoOwnerProfileId: ownerProfiles[0].id,
        title: "Mebel daşınması",
        cargoType: "Mebel",
        description: "Bakıdan Gəncəyə 2 ton mebel daşınmalıdır.",
        weight: 2,
        volume: 18,
        length: 4,
        width: 2,
        height: 2,
        quantity: "1 dəst",
        pickupCity: "Bakı",
        deliveryCity: "Gəncə",
        pickupAddress: "Bakı, Nərimanov rayonu",
        deliveryAddress: "Gəncə, mərkəz",
        pickupDate: new Date(pickupBase),
        pickupTime: "10:00",
        requiredVehicleType: "Ford Transit",
        priceFrom: 180,
        priceTo: 220,
        isNegotiable: false,
        contactPhone: "+994703334455",
        status: "NEW"
      }
    }),
    prisma.load.create({
      data: {
        cargoOwnerId: ownerUsers[0].id,
        cargoOwnerProfileId: ownerProfiles[0].id,
        title: "Kubik daşınması",
        cargoType: "Tikinti materialı",
        description: "Bakıdan Sumqayıta 10 ton kubik daşınması üçün Kamaz tələb olunur.",
        weight: 10,
        volume: 30,
        quantity: "10 ton",
        pickupCity: "Bakı",
        deliveryCity: "Sumqayıt",
        pickupAddress: "Bakı, Qaradağ",
        deliveryAddress: "Sumqayıt, sənaye zonası",
        pickupDate: new Date(pickupBase + 1000 * 60 * 60 * 24),
        pickupTime: "09:00",
        requiredVehicleType: "Kamaz",
        priceFrom: 120,
        priceTo: 150,
        isNegotiable: true,
        contactPhone: "+994703334455",
        status: "MATCHING",
        operatorId: operator.id
      }
    }),
    prisma.load.create({
      data: {
        cargoOwnerId: ownerUsers[1].id,
        cargoOwnerProfileId: ownerProfiles[1].id,
        title: "Paletli yük",
        cargoType: "Paletli yük",
        description: "Xırdalandan Gəncəyə 18 ton paletli tikinti materialı üçün TIR lazımdır.",
        weight: 18,
        volume: 42,
        quantity: "18 palet",
        pickupCity: "Xırdalan",
        deliveryCity: "Gəncə",
        pickupAddress: "Xırdalan logistika anbarı",
        deliveryAddress: "Gəncə sənaye zonası",
        pickupDate: new Date(pickupBase + 1000 * 60 * 60 * 24 * 2),
        pickupTime: "13:00",
        requiredVehicleType: "TIR",
        priceFrom: 700,
        priceTo: 850,
        isNegotiable: true,
        contactPhone: "+994502224466",
        status: "WAITING_RESPONSE",
        operatorId: operator.id
      }
    }),
    prisma.load.create({
      data: {
        cargoOwnerId: ownerUsers[1].id,
        cargoOwnerProfileId: ownerProfiles[1].id,
        title: "Soyudulmuş ərzaq",
        cargoType: "Ərzaq",
        description: "Lənkərandan Bakıya soyuduculu maşınla ərzaq daşınması.",
        weight: 4,
        volume: 20,
        quantity: "120 qutu",
        pickupCity: "Lənkəran",
        deliveryCity: "Bakı",
        pickupAddress: "Lənkəran, mərkəzi anbar",
        deliveryAddress: "Bakı, Nərimanov rayonu",
        pickupDate: new Date(pickupBase + 1000 * 60 * 60 * 24 * 3),
        pickupTime: "08:00",
        requiredVehicleType: "Soyuduculu maşın",
        priceFrom: 520,
        priceTo: 560,
        isNegotiable: false,
        contactPhone: "+994502224466",
        status: "CONFIRMED",
        operatorId: operator.id,
        assignedDriverId: drivers[3].id
      }
    }),
    prisma.load.create({
      data: {
        cargoOwnerId: ownerUsers[0].id,
        cargoOwnerProfileId: ownerProfiles[0].id,
        title: "Texnika avadanlığı",
        cargoType: "Texnika",
        description: "Gəncədən Bakıya texnika avadanlıqlarının daşınması.",
        weight: 6,
        volume: 22,
        quantity: "4 ədəd",
        pickupCity: "Gəncə",
        deliveryCity: "Bakı",
        pickupAddress: "Gəncə, sənaye küçəsi",
        deliveryAddress: "Bakı, Xətai rayonu",
        pickupDate: new Date(pickupBase + 1000 * 60 * 60 * 24 * 4),
        pickupTime: "15:00",
        requiredVehicleType: "TIR",
        priceFrom: 650,
        priceTo: 750,
        isNegotiable: true,
        contactPhone: "+994703334455",
        status: "PRICE_TOO_LOW",
        operatorId: operator.id,
        assignedDispatcherId: dispatchers[0].id
      }
    })
  ]);

  await prisma.loadContactAttempt.createMany({
    data: [
      {
        loadId: loads[2].id,
        operatorId: operator.id,
        driverId: drivers[2].id,
        channel: "WHATSAPP",
        responseStatus: "NO_ANSWER",
        messageText: "YukTap: Xırdalan-Gəncə, 18 tons Paletli yük, cavab gözlənilir.",
        note: "Birinci WhatsApp mesajı göndərildi."
      },
      {
        loadId: loads[3].id,
        operatorId: operator.id,
        driverId: drivers[3].id,
        channel: "CALL",
        responseStatus: "ACCEPTED",
        messageText: "Telefon danışığı: sürücü yükü qəbul etdi.",
        note: "Soyuduculu maşın təsdiqləndi."
      },
      {
        loadId: loads[4].id,
        operatorId: operator.id,
        dispatcherId: dispatchers[0].id,
        channel: "WHATSAPP",
        responseStatus: "PRICE_TOO_LOW",
        messageText: "Dispetçer qiymətin az olduğunu bildirdi.",
        note: "Qiymət danışıqları lazımdır."
      }
    ]
  });

  await prisma.notificationTemplate.createMany({
    data: [
      {
        type: "LOAD_OFFER_WHATSAPP",
        title: "WhatsApp yük təklifi",
        body: "{pickupCity} → {deliveryCity} | {weight} ton {title} | Cavab: 1 gedirəm, 2 yox, 3 qiymət azdır"
      },
      {
        type: "LOAD_OFFER_SMS",
        title: "SMS yük təklifi",
        body: "YukTap: {pickupCity}-{deliveryCity}, {weight} tons {title}. Reply: 1 accept, 2 no, 3 price low."
      }
    ]
  });

  await prisma.operatorLog.create({
    data: {
      operatorId: operator.id,
      loadId: loads[2].id,
      action: "SEED_CONTACT_ATTEMPT",
      note: "Seed zamanı operator contact attempt yaradıldı.",
      metadata: { responseStatus: "NO_ANSWER" }
    }
  });

  const expiresAt = new Date(Date.now() + 1000 * 60 * 60 * 24 * 14); // 14 gün sonra

  await prisma.cargoPost.createMany({
    data: [
      {
        ownerId: ownerUsers[0].id,
        cargoOwnerProfileId: ownerProfiles[0].id,
        cargoName: "Mebel dəsti",
        cargoType: "Mebel",
        description: "Bakıdan Gəncəyə 2 ton yüngül mebel daşınması. Həcm: 18 m³. Diqqətlə daşınmalıdır.",
        weight: 2,
        volume: 18,
        length: 4,
        width: 2,
        height: 2,
        quantity: "1 dəst",
        pickupCity: "Bakı",
        deliveryCity: "Gəncə",
        pickupAddress: "Bakı, Nərimanov rayonu, Hüsü Hacıyev küç. 14",
        deliveryAddress: "Gəncə, Nizami küç. 45",
        pickupDate: new Date(pickupBase),
        requiredVehicleType: "Ford Transit",
        proposedPrice: 220,
        priceNegotiable: false,
        contactPhone: "+994703334455",
        status: "ACTIVE",
        legacyAdminStatus: "APPROVED",
        expiresAt
      },
      {
        ownerId: ownerUsers[0].id,
        cargoOwnerProfileId: ownerProfiles[0].id,
        cargoName: "Tikinti materialı (kubik)",
        cargoType: "Tikinti materialı",
        description: "Bakıdan Sumqayıta 10 ton inşaat kubik daşınması. Kamaz tələb olunur.",
        weight: 10,
        volume: 30,
        quantity: "10 ton",
        pickupCity: "Bakı",
        deliveryCity: "Sumqayıt",
        pickupAddress: "Bakı, Qaradağ rayonu, Sənaye şossesi",
        deliveryAddress: "Sumqayıt, 18-ci sənaye zonası",
        pickupDate: new Date(pickupBase + 1000 * 60 * 60 * 24),
        requiredVehicleType: "Kamaz",
        proposedPrice: 150,
        priceNegotiable: true,
        contactPhone: "+994703334455",
        status: "ACTIVE",
        legacyAdminStatus: "APPROVED",
        expiresAt
      },
      {
        ownerId: ownerUsers[1].id,
        cargoOwnerProfileId: ownerProfiles[1].id,
        cargoName: "Paletli tikinti materialı",
        cargoType: "Paletli yük",
        description: "Xırdalandan Gəncəyə 18 ton paletli tikinti materialı. TIR tələb olunur. Yüklənmə köməyi var.",
        weight: 18,
        volume: 42,
        quantity: "18 palet",
        pickupCity: "Xırdalan",
        deliveryCity: "Gəncə",
        pickupAddress: "Xırdalan, logistika anbarı, H. Əliyev pr. 110",
        deliveryAddress: "Gəncə, sənaye zonası, 7-ci blok",
        pickupDate: new Date(pickupBase + 1000 * 60 * 60 * 24 * 2),
        requiredVehicleType: "TIR",
        proposedPrice: 850,
        priceNegotiable: true,
        contactPhone: "+994502224466",
        needsLoadingHelp: "Var",
        status: "ACTIVE",
        legacyAdminStatus: "APPROVED",
        expiresAt
      },
      {
        ownerId: ownerUsers[1].id,
        cargoOwnerProfileId: ownerProfiles[1].id,
        cargoName: "Soyudulmuş ərzaq məhsulları",
        cargoType: "Ərzaq",
        description: "Lənkərandan Bakıya soyuduculu maşınla 4 ton ərzaq. Temperatur: +2°C - +4°C.",
        weight: 4,
        volume: 20,
        quantity: "120 qutu",
        pickupCity: "Lənkəran",
        deliveryCity: "Bakı",
        pickupAddress: "Lənkəran, mərkəzi anbar, H. Aslanov küç. 3",
        deliveryAddress: "Bakı, Nərimanov r., Tbilisi pr. 82",
        pickupDate: new Date(pickupBase + 1000 * 60 * 60 * 24 * 3),
        requiredVehicleType: "Soyuduculu maşın",
        proposedPrice: 560,
        priceNegotiable: false,
        contactPhone: "+994502224466",
        status: "ACTIVE",
        legacyAdminStatus: "APPROVED",
        expiresAt
      },
      {
        ownerId: ownerUsers[0].id,
        cargoOwnerProfileId: ownerProfiles[0].id,
        cargoName: "Texniki avadanlıq",
        cargoType: "Texnika",
        description: "Gəncədən Bakıya 4 ədəd texniki avadanlıq. Möhkəm bağlama tələb olunur.",
        weight: 6,
        volume: 22,
        quantity: "4 ədəd",
        pickupCity: "Gəncə",
        deliveryCity: "Bakı",
        pickupAddress: "Gəncə, sənaye küç. 12, Texnikaevi",
        deliveryAddress: "Bakı, Xətai r., 8 Noyabr pr. 44",
        pickupDate: new Date(pickupBase + 1000 * 60 * 60 * 24 * 4),
        requiredVehicleType: "TIR",
        proposedPrice: 750,
        priceNegotiable: true,
        contactPhone: "+994703334455",
        status: "ACTIVE",
        legacyAdminStatus: "APPROVED",
        expiresAt
      },
      {
        ownerId: ownerUsers[1].id,
        cargoOwnerProfileId: ownerProfiles[1].id,
        cargoName: "Ev əşyaları köçürməsi",
        cargoType: "Ev əşyaları",
        description: "Şəkidən Bakıya ev əşyalarının daşınması. 3 ton, yüngül qablaşdırma.",
        weight: 3,
        volume: 25,
        quantity: "1 ev",
        pickupCity: "Şəki",
        deliveryCity: "Bakı",
        pickupAddress: "Şəki, İstiqlal küç. 7",
        deliveryAddress: "Bakı, Binəqədi r., Binəqədi qəs.",
        pickupDate: new Date(pickupBase + 1000 * 60 * 60 * 24 * 5),
        requiredVehicleType: "Ford Transit",
        proposedPrice: 320,
        priceNegotiable: true,
        contactPhone: "+994502224466",
        status: "ACTIVE",
        legacyAdminStatus: "APPROVED",
        expiresAt
      },
      {
        ownerId: ownerUsers[0].id,
        cargoOwnerProfileId: ownerProfiles[0].id,
        cargoName: "Dəmir konstruksiyalar",
        cargoType: "Metal",
        description: "Bakıdan Mingəçevirə dəmir konstruksiyalar. 15 ton, uzun ölçülü yük.",
        weight: 15,
        volume: 35,
        length: 9,
        width: 2.4,
        height: 1.5,
        quantity: "6 ədəd",
        pickupCity: "Bakı",
        deliveryCity: "Mingəçevir",
        pickupAddress: "Bakı, Sabunçu r., Zavod küç. 1",
        deliveryAddress: "Mingəçevir, sənaye məntəqəsi",
        pickupDate: new Date(pickupBase + 1000 * 60 * 60 * 24 * 6),
        requiredVehicleType: "TIR",
        proposedPrice: 950,
        priceNegotiable: false,
        contactPhone: "+994703334455",
        status: "ACTIVE",
        legacyAdminStatus: "APPROVED",
        expiresAt
      },
      {
        ownerId: ownerUsers[1].id,
        cargoOwnerProfileId: ownerProfiles[1].id,
        cargoName: "Qida məhsulları (toplu)",
        cargoType: "Ərzaq",
        description: "Bakıdan Naxçıvana qida məhsulları, 8 ton. Sürətli çatdırılma vacibdir.",
        weight: 8,
        volume: 28,
        quantity: "200 qutu",
        pickupCity: "Bakı",
        deliveryCity: "Naxçıvan",
        pickupAddress: "Bakı, Abşeron r., İndustriya küç. 5",
        deliveryAddress: "Naxçıvan, mərkəzi bazar yaxınlığı",
        pickupDate: new Date(pickupBase + 1000 * 60 * 60 * 24 * 2),
        requiredVehicleType: "Kamaz",
        proposedPrice: 1200,
        priceNegotiable: true,
        contactPhone: "+994502224466",
        roundTrip: "Var",
        status: "ACTIVE",
        legacyAdminStatus: "APPROVED",
        expiresAt
      }
    ]
  });

  await prisma.adminLog.create({
    data: {
      adminId: admin.id,
      action: "SEED_CREATED",
      entityType: "SYSTEM",
      metadata: { message: "Operator-assisted MVP seed data created" }
    }
  });

  console.log("Seed tamamlandı.");
  console.log("Demo şifrə:", password);
  console.log("Admin:", "admin@tranzit.az");
  console.log("Operator:", "operator@tranzit.az");
  console.log("Yük verən:", "owner@tranzit.az");
  console.log("Yük verən 2:", "owner2@tranzit.az");
  console.log("Sürücü:", "driver1@tranzit.local");
  console.log("Daşıyıcı (CARRIER):", "carrier1@tranzit.local");
  console.log("Daşıyıcı 2 (CARRIER):", "carrier2@tranzit.local");
  console.log("Dispetçer:", "dispatcher1@tranzit.local");
  console.log("CargoPost ilanları: 8 ilan əlavə edildi");
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
