-- CreateEnum
CREATE TYPE "Role" AS ENUM ('CARRIER', 'CARGO_OWNER', 'DRIVER', 'DISPATCHER', 'OPERATOR', 'ADMIN');

-- CreateEnum
CREATE TYPE "UserStatus" AS ENUM ('ACTIVE', 'PENDING', 'BLOCKED');

-- CreateEnum
CREATE TYPE "DriverStatus" AS ENUM ('ACTIVE', 'PENDING', 'BLOCKED');

-- CreateEnum
CREATE TYPE "DispatcherStatus" AS ENUM ('ACTIVE', 'PENDING', 'BLOCKED');

-- CreateEnum
CREATE TYPE "VehicleStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "CargoStatus" AS ENUM ('ACTIVE', 'ASSIGNED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "LoadStatus" AS ENUM ('NEW', 'CHECKING', 'MATCHING', 'CONTACTING', 'WAITING_RESPONSE', 'DRIVER_ACCEPTED', 'DISPATCHER_ACCEPTED', 'PRICE_TOO_LOW', 'NEGOTIATION', 'CONFIRMED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "ApplicationStatus" AS ENUM ('PENDING', 'ACCEPTED', 'REJECTED');

-- CreateEnum
CREATE TYPE "ContactResponseStatus" AS ENUM ('ACCEPTED', 'DECLINED', 'PRICE_TOO_LOW', 'NO_ANSWER', 'CALL_LATER');

-- CreateEnum
CREATE TYPE "ContactChannel" AS ENUM ('WHATSAPP', 'SMS', 'CALL');

-- CreateEnum
CREATE TYPE "ImageCategory" AS ENUM ('PROFILE', 'VEHICLE', 'VEHICLE_DOCUMENT', 'CARGO');

-- CreateEnum
CREATE TYPE "NotificationType" AS ENUM ('APPLICATION_CREATED', 'APPLICATION_ACCEPTED', 'APPLICATION_REJECTED', 'ADMIN_APPROVED', 'ADMIN_REJECTED', 'SYSTEM');

-- CreateEnum
CREATE TYPE "ReviewTargetType" AS ENUM ('CARRIER', 'CARGO_OWNER', 'DRIVER', 'DISPATCHER');

-- CreateEnum
CREATE TYPE "ComplaintStatus" AS ENUM ('OPEN', 'IN_REVIEW', 'RESOLVED', 'REJECTED');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "role" "Role" NOT NULL,
    "companyName" TEXT,
    "profileImage" TEXT,
    "status" "UserStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CarrierProfile" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "bio" TEXT,
    "rating" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "whatsappPhone" TEXT,
    "vehicleType" TEXT,
    "supportedCargoTypes" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "cargoSpaceVolumeM3" DOUBLE PRECISION,
    "maxWeightTons" DOUBLE PRECISION,
    "locationAddress" TEXT,
    "locationLabel" TEXT,
    "locationLat" DOUBLE PRECISION,
    "locationLng" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CarrierProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CargoOwnerProfile" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "companyName" TEXT,
    "voen" TEXT,
    "city" TEXT,
    "rating" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CargoOwnerProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DriverProfile" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "whatsappPhone" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "vehicleType" TEXT NOT NULL,
    "brand" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "plateNumber" TEXT NOT NULL,
    "capacityTons" DOUBLE PRECISION NOT NULL,
    "bodyLength" DOUBLE PRECISION NOT NULL,
    "bodyWidth" DOUBLE PRECISION NOT NULL,
    "bodyHeight" DOUBLE PRECISION NOT NULL,
    "workingDays" TEXT[],
    "workingHours" TEXT NOT NULL,
    "routes" TEXT[],
    "notificationChannels" TEXT[],
    "consentToReceiveOffers" BOOLEAN NOT NULL DEFAULT true,
    "activityScore" INTEGER NOT NULL DEFAULT 0,
    "status" "DriverStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DriverProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DispatcherProfile" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "whatsappPhone" TEXT NOT NULL,
    "companyName" TEXT NOT NULL,
    "vehicleCount" INTEGER NOT NULL,
    "vehicleTypes" TEXT[],
    "routes" TEXT[],
    "note" TEXT,
    "activityScore" INTEGER NOT NULL DEFAULT 0,
    "status" "DispatcherStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DispatcherProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Vehicle" (
    "id" TEXT NOT NULL,
    "carrierId" TEXT NOT NULL,
    "carrierProfileId" TEXT NOT NULL,
    "vehicleType" TEXT NOT NULL,
    "brand" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "plateNumber" TEXT NOT NULL,
    "driverFirstName" TEXT NOT NULL,
    "driverLastName" TEXT NOT NULL,
    "driverPhone" TEXT NOT NULL,
    "capacityTons" DOUBLE PRECISION NOT NULL,
    "bodyLength" DOUBLE PRECISION NOT NULL,
    "bodyWidth" DOUBLE PRECISION NOT NULL,
    "bodyHeight" DOUBLE PRECISION NOT NULL,
    "overallDimensions" TEXT NOT NULL,
    "workDays" TEXT[],
    "workHours" TEXT NOT NULL,
    "serviceAreas" TEXT[],
    "status" "VehicleStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Vehicle_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CargoPost" (
    "id" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,
    "cargoOwnerProfileId" TEXT NOT NULL,
    "cargoName" TEXT NOT NULL,
    "cargoType" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "weight" DOUBLE PRECISION NOT NULL,
    "volume" DOUBLE PRECISION,
    "length" DOUBLE PRECISION,
    "width" DOUBLE PRECISION,
    "height" DOUBLE PRECISION,
    "quantity" TEXT,
    "pickupAddress" TEXT NOT NULL,
    "deliveryAddress" TEXT NOT NULL,
    "pickupCity" TEXT NOT NULL,
    "deliveryCity" TEXT NOT NULL,
    "pickupDate" TIMESTAMP(3) NOT NULL,
    "requiredVehicleType" TEXT NOT NULL,
    "proposedPrice" DECIMAL(12,2),
    "priceNegotiable" BOOLEAN NOT NULL DEFAULT false,
    "contactPhone" TEXT NOT NULL,
    "needsLoadingHelp" TEXT,
    "needsUnloadingHelp" TEXT,
    "requiresInvoice" TEXT,
    "roundTrip" TEXT,
    "status" "CargoStatus" NOT NULL DEFAULT 'ACTIVE',
    "pickupDeadlineDate" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3),
    "deactivatedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CargoPost_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CargoApplication" (
    "id" TEXT NOT NULL,
    "cargoPostId" TEXT NOT NULL,
    "carrierId" TEXT NOT NULL,
    "carrierProfileId" TEXT NOT NULL,
    "vehicleId" TEXT NOT NULL,
    "message" TEXT,
    "offeredPrice" DECIMAL(12,2),
    "status" "ApplicationStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CargoApplication_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Image" (
    "id" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "alt" TEXT,
    "mimeType" TEXT,
    "size" INTEGER,
    "category" "ImageCategory" NOT NULL,
    "userId" TEXT,
    "vehicleId" TEXT,
    "cargoPostId" TEXT,
    "loadId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Image_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Load" (
    "id" TEXT NOT NULL,
    "cargoOwnerId" TEXT NOT NULL,
    "cargoOwnerProfileId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "cargoType" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "weight" DOUBLE PRECISION NOT NULL,
    "volume" DOUBLE PRECISION,
    "length" DOUBLE PRECISION,
    "width" DOUBLE PRECISION,
    "height" DOUBLE PRECISION,
    "quantity" TEXT,
    "pickupCity" TEXT NOT NULL,
    "deliveryCity" TEXT NOT NULL,
    "pickupAddress" TEXT NOT NULL,
    "deliveryAddress" TEXT NOT NULL,
    "pickupDate" TIMESTAMP(3) NOT NULL,
    "pickupTime" TEXT,
    "requiredVehicleType" TEXT NOT NULL,
    "priceFrom" DECIMAL(12,2),
    "priceTo" DECIMAL(12,2),
    "isNegotiable" BOOLEAN NOT NULL DEFAULT false,
    "contactPhone" TEXT NOT NULL,
    "note" TEXT,
    "status" "LoadStatus" NOT NULL DEFAULT 'NEW',
    "operatorNote" TEXT,
    "operatorId" TEXT,
    "assignedDriverId" TEXT,
    "assignedDispatcherId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Load_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LoadContactAttempt" (
    "id" TEXT NOT NULL,
    "loadId" TEXT NOT NULL,
    "operatorId" TEXT,
    "driverId" TEXT,
    "dispatcherId" TEXT,
    "channel" "ContactChannel" NOT NULL,
    "responseStatus" "ContactResponseStatus",
    "messageText" TEXT NOT NULL,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LoadContactAttempt_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OperatorLog" (
    "id" TEXT NOT NULL,
    "operatorId" TEXT,
    "loadId" TEXT,
    "action" TEXT NOT NULL,
    "note" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OperatorLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NotificationTemplate" (
    "id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "NotificationTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Notification" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "type" "NotificationType" NOT NULL DEFAULT 'SYSTEM',
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Review" (
    "id" TEXT NOT NULL,
    "loadId" TEXT,
    "cargoOwnerId" TEXT,
    "driverId" TEXT,
    "dispatcherId" TEXT,
    "reviewerId" TEXT,
    "revieweeId" TEXT,
    "cargoPostId" TEXT,
    "rating" INTEGER NOT NULL,
    "comment" TEXT,
    "targetType" "ReviewTargetType",
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Review_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Complaint" (
    "id" TEXT NOT NULL,
    "reporterId" TEXT NOT NULL,
    "accusedId" TEXT,
    "cargoPostId" TEXT,
    "reason" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "status" "ComplaintStatus" NOT NULL DEFAULT 'OPEN',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Complaint_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AdminLog" (
    "id" TEXT NOT NULL,
    "adminId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AdminLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_phone_key" ON "User"("phone");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "User_role_idx" ON "User"("role");

-- CreateIndex
CREATE INDEX "User_status_idx" ON "User"("status");

-- CreateIndex
CREATE UNIQUE INDEX "CarrierProfile_userId_key" ON "CarrierProfile"("userId");

-- CreateIndex
CREATE INDEX "CarrierProfile_vehicleType_idx" ON "CarrierProfile"("vehicleType");

-- CreateIndex
CREATE UNIQUE INDEX "CargoOwnerProfile_userId_key" ON "CargoOwnerProfile"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "DriverProfile_userId_key" ON "DriverProfile"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "DriverProfile_plateNumber_key" ON "DriverProfile"("plateNumber");

-- CreateIndex
CREATE INDEX "DriverProfile_vehicleType_idx" ON "DriverProfile"("vehicleType");

-- CreateIndex
CREATE INDEX "DriverProfile_status_idx" ON "DriverProfile"("status");

-- CreateIndex
CREATE INDEX "DriverProfile_activityScore_idx" ON "DriverProfile"("activityScore");

-- CreateIndex
CREATE UNIQUE INDEX "DispatcherProfile_userId_key" ON "DispatcherProfile"("userId");

-- CreateIndex
CREATE INDEX "DispatcherProfile_status_idx" ON "DispatcherProfile"("status");

-- CreateIndex
CREATE INDEX "DispatcherProfile_activityScore_idx" ON "DispatcherProfile"("activityScore");

-- CreateIndex
CREATE UNIQUE INDEX "Vehicle_plateNumber_key" ON "Vehicle"("plateNumber");

-- CreateIndex
CREATE INDEX "Vehicle_carrierId_idx" ON "Vehicle"("carrierId");

-- CreateIndex
CREATE INDEX "Vehicle_carrierProfileId_idx" ON "Vehicle"("carrierProfileId");

-- CreateIndex
CREATE INDEX "Vehicle_status_idx" ON "Vehicle"("status");

-- CreateIndex
CREATE INDEX "Vehicle_vehicleType_idx" ON "Vehicle"("vehicleType");

-- CreateIndex
CREATE INDEX "CargoPost_ownerId_idx" ON "CargoPost"("ownerId");

-- CreateIndex
CREATE INDEX "CargoPost_cargoOwnerProfileId_idx" ON "CargoPost"("cargoOwnerProfileId");

-- CreateIndex
CREATE INDEX "CargoPost_status_idx" ON "CargoPost"("status");

-- CreateIndex
CREATE INDEX "CargoPost_pickupCity_idx" ON "CargoPost"("pickupCity");

-- CreateIndex
CREATE INDEX "CargoPost_deliveryCity_idx" ON "CargoPost"("deliveryCity");

-- CreateIndex
CREATE INDEX "CargoPost_requiredVehicleType_idx" ON "CargoPost"("requiredVehicleType");

-- CreateIndex
CREATE INDEX "CargoPost_expiresAt_idx" ON "CargoPost"("expiresAt");

-- CreateIndex
CREATE INDEX "CargoApplication_carrierId_idx" ON "CargoApplication"("carrierId");

-- CreateIndex
CREATE INDEX "CargoApplication_status_idx" ON "CargoApplication"("status");

-- CreateIndex
CREATE INDEX "CargoApplication_vehicleId_idx" ON "CargoApplication"("vehicleId");

-- CreateIndex
CREATE UNIQUE INDEX "CargoApplication_cargoPostId_carrierId_key" ON "CargoApplication"("cargoPostId", "carrierId");

-- CreateIndex
CREATE INDEX "Image_category_idx" ON "Image"("category");

-- CreateIndex
CREATE INDEX "Image_userId_idx" ON "Image"("userId");

-- CreateIndex
CREATE INDEX "Image_vehicleId_idx" ON "Image"("vehicleId");

-- CreateIndex
CREATE INDEX "Image_cargoPostId_idx" ON "Image"("cargoPostId");

-- CreateIndex
CREATE INDEX "Image_loadId_idx" ON "Image"("loadId");

-- CreateIndex
CREATE INDEX "Load_cargoOwnerId_idx" ON "Load"("cargoOwnerId");

-- CreateIndex
CREATE INDEX "Load_cargoOwnerProfileId_idx" ON "Load"("cargoOwnerProfileId");

-- CreateIndex
CREATE INDEX "Load_status_idx" ON "Load"("status");

-- CreateIndex
CREATE INDEX "Load_operatorId_idx" ON "Load"("operatorId");

-- CreateIndex
CREATE INDEX "Load_pickupCity_idx" ON "Load"("pickupCity");

-- CreateIndex
CREATE INDEX "Load_deliveryCity_idx" ON "Load"("deliveryCity");

-- CreateIndex
CREATE INDEX "Load_requiredVehicleType_idx" ON "Load"("requiredVehicleType");

-- CreateIndex
CREATE INDEX "LoadContactAttempt_loadId_idx" ON "LoadContactAttempt"("loadId");

-- CreateIndex
CREATE INDEX "LoadContactAttempt_operatorId_idx" ON "LoadContactAttempt"("operatorId");

-- CreateIndex
CREATE INDEX "LoadContactAttempt_driverId_idx" ON "LoadContactAttempt"("driverId");

-- CreateIndex
CREATE INDEX "LoadContactAttempt_dispatcherId_idx" ON "LoadContactAttempt"("dispatcherId");

-- CreateIndex
CREATE INDEX "LoadContactAttempt_channel_idx" ON "LoadContactAttempt"("channel");

-- CreateIndex
CREATE INDEX "OperatorLog_operatorId_idx" ON "OperatorLog"("operatorId");

-- CreateIndex
CREATE INDEX "OperatorLog_loadId_idx" ON "OperatorLog"("loadId");

-- CreateIndex
CREATE INDEX "OperatorLog_action_idx" ON "OperatorLog"("action");

-- CreateIndex
CREATE UNIQUE INDEX "NotificationTemplate_type_key" ON "NotificationTemplate"("type");

-- CreateIndex
CREATE INDEX "Notification_userId_isRead_idx" ON "Notification"("userId", "isRead");

-- CreateIndex
CREATE INDEX "Review_loadId_idx" ON "Review"("loadId");

-- CreateIndex
CREATE INDEX "Review_cargoOwnerId_idx" ON "Review"("cargoOwnerId");

-- CreateIndex
CREATE INDEX "Review_driverId_idx" ON "Review"("driverId");

-- CreateIndex
CREATE INDEX "Review_dispatcherId_idx" ON "Review"("dispatcherId");

-- CreateIndex
CREATE INDEX "Review_revieweeId_idx" ON "Review"("revieweeId");

-- CreateIndex
CREATE INDEX "Review_targetType_idx" ON "Review"("targetType");

-- CreateIndex
CREATE INDEX "Complaint_reporterId_idx" ON "Complaint"("reporterId");

-- CreateIndex
CREATE INDEX "Complaint_accusedId_idx" ON "Complaint"("accusedId");

-- CreateIndex
CREATE INDEX "Complaint_status_idx" ON "Complaint"("status");

-- CreateIndex
CREATE INDEX "AdminLog_adminId_idx" ON "AdminLog"("adminId");

-- CreateIndex
CREATE INDEX "AdminLog_entityType_idx" ON "AdminLog"("entityType");

-- AddForeignKey
ALTER TABLE "CarrierProfile" ADD CONSTRAINT "CarrierProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CargoOwnerProfile" ADD CONSTRAINT "CargoOwnerProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DriverProfile" ADD CONSTRAINT "DriverProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DispatcherProfile" ADD CONSTRAINT "DispatcherProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Vehicle" ADD CONSTRAINT "Vehicle_carrierId_fkey" FOREIGN KEY ("carrierId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Vehicle" ADD CONSTRAINT "Vehicle_carrierProfileId_fkey" FOREIGN KEY ("carrierProfileId") REFERENCES "CarrierProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CargoPost" ADD CONSTRAINT "CargoPost_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CargoPost" ADD CONSTRAINT "CargoPost_cargoOwnerProfileId_fkey" FOREIGN KEY ("cargoOwnerProfileId") REFERENCES "CargoOwnerProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CargoApplication" ADD CONSTRAINT "CargoApplication_cargoPostId_fkey" FOREIGN KEY ("cargoPostId") REFERENCES "CargoPost"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CargoApplication" ADD CONSTRAINT "CargoApplication_carrierId_fkey" FOREIGN KEY ("carrierId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CargoApplication" ADD CONSTRAINT "CargoApplication_carrierProfileId_fkey" FOREIGN KEY ("carrierProfileId") REFERENCES "CarrierProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CargoApplication" ADD CONSTRAINT "CargoApplication_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES "Vehicle"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Image" ADD CONSTRAINT "Image_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Image" ADD CONSTRAINT "Image_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES "Vehicle"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Image" ADD CONSTRAINT "Image_cargoPostId_fkey" FOREIGN KEY ("cargoPostId") REFERENCES "CargoPost"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Image" ADD CONSTRAINT "Image_loadId_fkey" FOREIGN KEY ("loadId") REFERENCES "Load"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Load" ADD CONSTRAINT "Load_cargoOwnerId_fkey" FOREIGN KEY ("cargoOwnerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Load" ADD CONSTRAINT "Load_cargoOwnerProfileId_fkey" FOREIGN KEY ("cargoOwnerProfileId") REFERENCES "CargoOwnerProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Load" ADD CONSTRAINT "Load_operatorId_fkey" FOREIGN KEY ("operatorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Load" ADD CONSTRAINT "Load_assignedDriverId_fkey" FOREIGN KEY ("assignedDriverId") REFERENCES "DriverProfile"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Load" ADD CONSTRAINT "Load_assignedDispatcherId_fkey" FOREIGN KEY ("assignedDispatcherId") REFERENCES "DispatcherProfile"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LoadContactAttempt" ADD CONSTRAINT "LoadContactAttempt_loadId_fkey" FOREIGN KEY ("loadId") REFERENCES "Load"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LoadContactAttempt" ADD CONSTRAINT "LoadContactAttempt_operatorId_fkey" FOREIGN KEY ("operatorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LoadContactAttempt" ADD CONSTRAINT "LoadContactAttempt_driverId_fkey" FOREIGN KEY ("driverId") REFERENCES "DriverProfile"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LoadContactAttempt" ADD CONSTRAINT "LoadContactAttempt_dispatcherId_fkey" FOREIGN KEY ("dispatcherId") REFERENCES "DispatcherProfile"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OperatorLog" ADD CONSTRAINT "OperatorLog_operatorId_fkey" FOREIGN KEY ("operatorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OperatorLog" ADD CONSTRAINT "OperatorLog_loadId_fkey" FOREIGN KEY ("loadId") REFERENCES "Load"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Review" ADD CONSTRAINT "Review_loadId_fkey" FOREIGN KEY ("loadId") REFERENCES "Load"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Review" ADD CONSTRAINT "Review_cargoOwnerId_fkey" FOREIGN KEY ("cargoOwnerId") REFERENCES "CargoOwnerProfile"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Review" ADD CONSTRAINT "Review_driverId_fkey" FOREIGN KEY ("driverId") REFERENCES "DriverProfile"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Review" ADD CONSTRAINT "Review_dispatcherId_fkey" FOREIGN KEY ("dispatcherId") REFERENCES "DispatcherProfile"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Review" ADD CONSTRAINT "Review_reviewerId_fkey" FOREIGN KEY ("reviewerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Review" ADD CONSTRAINT "Review_revieweeId_fkey" FOREIGN KEY ("revieweeId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Complaint" ADD CONSTRAINT "Complaint_reporterId_fkey" FOREIGN KEY ("reporterId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Complaint" ADD CONSTRAINT "Complaint_accusedId_fkey" FOREIGN KEY ("accusedId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AdminLog" ADD CONSTRAINT "AdminLog_adminId_fkey" FOREIGN KEY ("adminId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
