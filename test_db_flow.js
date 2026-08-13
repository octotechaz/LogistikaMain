const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function runTest() {
  try {
    console.log('--- Starting DB E2E Flow Test ---');

    const ownerPassword = await bcrypt.hash('password123', 10);
    const owner = await prisma.user.create({
      data: {
        firstName: 'Test',
        lastName: 'Owner',
        email: 'testowner@example.com',
        passwordHash: ownerPassword,
        role: 'CARGO_OWNER',
        phone: '+994501234567',
        status: 'ACTIVE',
        cargoOwnerProfile: {
           create: {
               companyName: "Test Company"
           }
        }
      },
      include: {
          cargoOwnerProfile: true
      }
    });
    console.log('✅ Cargo Owner created:', owner.id);

    const driverPassword = await bcrypt.hash('password123', 10);
    const driver = await prisma.user.create({
      data: {
        firstName: 'Test',
        lastName: 'Driver',
        email: 'testdriver@example.com',
        passwordHash: driverPassword,
        role: 'CARRIER',
        phone: '+994509876543',
        status: 'ACTIVE',
        carrierProfile: {
          create: {
            whatsappPhone: '+994509876543',
            vehicleType: 'TIR'
          }
        }
      },
      include: {
          carrierProfile: true
      }
    });
    console.log('✅ Driver (Carrier) created:', driver.id);
    
    const vehicle = await prisma.vehicle.create({
        data: {
            carrierId: driver.id,
            carrierProfileId: driver.carrierProfile.id,
            vehicleType: 'TIR',
            brand: 'Volvo',
            model: 'FH16',
            plateNumber: '99-AA-999',
            capacityTons: 20,
            bodyLength: 13.6,
            bodyWidth: 2.45,
            bodyHeight: 2.7,
            overallDimensions: '13.6x2.45x2.7',
            status: 'APPROVED',
            driverFirstName: 'Test',
            driverLastName: 'Driver',
            driverPhone: '+994509876543',
            workHours: '09:00-18:00',
            workDays: ['MONDAY', 'TUESDAY']
        }
    });
    console.log('✅ Vehicle created:', vehicle.id);

    const cargo = await prisma.cargoPost.create({
      data: {
        ownerId: owner.id,
        cargoOwnerProfileId: owner.cargoOwnerProfile.id,
        cargoName: 'Test Cargo Baku to Ganja',
        cargoType: 'Pallets',
        description: 'Need to transport goods',
        weight: 1000,
        pickupAddress: 'Baku center',
        deliveryAddress: 'Ganja center',
        pickupCity: 'Baku',
        deliveryCity: 'Ganja',
        pickupDate: new Date(),
        requiredVehicleType: 'TIR',
        contactPhone: '+994501234567',
        status: 'ACTIVE'
      }
    });
    console.log('✅ Cargo listing created:', cargo.id);

    const application = await prisma.cargoApplication.create({
      data: {
        cargoPostId: cargo.id,
        carrierId: driver.id,
        carrierProfileId: driver.carrierProfile.id,
        vehicleId: vehicle.id,
        status: 'PENDING',
        offeredPrice: 480
      }
    });
    console.log('✅ Driver applied to cargo:', application.id);

    const updatedApplication = await prisma.cargoApplication.update({
      where: { id: application.id },
      data: { status: 'ACCEPTED' }
    });
    console.log('✅ Owner accepted application. Status:', updatedApplication.status);

    console.log('--- Test Completed Successfully ---');

  } catch (error) {
    console.error('❌ Test failed:', error);
  } finally {
    try {
        await prisma.cargoApplication.deleteMany({});
        await prisma.vehicle.deleteMany({});
        await prisma.cargoPost.deleteMany({});
        await prisma.carrierProfile.deleteMany({});
        await prisma.cargoOwnerProfile.deleteMany({});
        await prisma.user.deleteMany({ where: { email: { in: ['testowner@example.com', 'testdriver@example.com'] } } });
    } catch(e) {}
    await prisma.$disconnect();
  }
}

runTest();
