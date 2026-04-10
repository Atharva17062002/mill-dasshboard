-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "mill" TEXT,
    "role" TEXT NOT NULL DEFAULT 'worker',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "settings" (
    "id" SERIAL NOT NULL,
    "gunny_bag_weight" DOUBLE PRECISION NOT NULL DEFAULT 0.7,
    "plastic_bag_weight" DOUBLE PRECISION NOT NULL DEFAULT 0.3,
    "mill_rate" DOUBLE PRECISION NOT NULL DEFAULT 2369,
    "quality_rate" DOUBLE PRECISION NOT NULL DEFAULT 1900,
    "recovery_rate" DOUBLE PRECISION NOT NULL DEFAULT 0.68,
    "lot_size" INTEGER NOT NULL DEFAULT 290,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "settings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "seasons" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "start_date" TIMESTAMP(3) NOT NULL,
    "end_date" TIMESTAMP(3) NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "seasons_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "societies" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "societies_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "farmers" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "token_name" TEXT,
    "farmer_code" TEXT,
    "ppc_name" TEXT,
    "mobile" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "farmers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "lots" (
    "id" SERIAL NOT NULL,
    "sl_no" INTEGER NOT NULL,
    "season_id" INTEGER NOT NULL,
    "entry_date" TIMESTAMP(3) NOT NULL,
    "farmer_id" INTEGER NOT NULL,
    "society_id" INTEGER NOT NULL,
    "vehicle_no" TEXT NOT NULL,
    "tp_accepted" DOUBLE PRECISION NOT NULL,
    "token_no" TEXT,
    "token_qty_quintal" DOUBLE PRECISION NOT NULL,
    "total_packet" INTEGER NOT NULL,
    "plastic_packet" INTEGER NOT NULL DEFAULT 0,
    "gross_kg" DOUBLE PRECISION NOT NULL,
    "tare_kg" DOUBLE PRECISION NOT NULL,
    "gunny_adv" INTEGER,
    "rej_gunny" INTEGER DEFAULT 0,
    "quality_cutting_quintal" DOUBLE PRECISION,
    "freight_paid_date" TIMESTAMP(3),
    "freight_paid" DOUBLE PRECISION,
    "comment" TEXT,
    "settlement_status" TEXT NOT NULL DEFAULT 'pending',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "lots_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "quality_cuts" (
    "id" SERIAL NOT NULL,
    "lot_id" INTEGER NOT NULL,
    "row_index" INTEGER NOT NULL,
    "mode" TEXT NOT NULL DEFAULT 'percent',
    "packet_count" INTEGER NOT NULL,
    "quality_pct" DOUBLE PRECISION,
    "kg_per_pkt" DOUBLE PRECISION,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "quality_cuts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "moisture_cuts" (
    "id" SERIAL NOT NULL,
    "lot_id" INTEGER NOT NULL,
    "row_index" INTEGER NOT NULL,
    "packet_count" INTEGER NOT NULL,
    "moisture_pct" DOUBLE PRECISION NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "moisture_cuts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "adjustments" (
    "id" SERIAL NOT NULL,
    "lot_id" INTEGER NOT NULL,
    "type" TEXT NOT NULL,
    "qty_quintal" DOUBLE PRECISION NOT NULL,
    "rate_per_qtl" DOUBLE PRECISION,
    "amount_paid" DOUBLE PRECISION,
    "source_lot_id" INTEGER,
    "notes" TEXT,
    "created_by" TEXT NOT NULL,
    "approved_by" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "adjustments_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "societies_name_key" ON "societies"("name");

-- CreateIndex
CREATE UNIQUE INDEX "lots_sl_no_key" ON "lots"("sl_no");

-- AddForeignKey
ALTER TABLE "lots" ADD CONSTRAINT "lots_season_id_fkey" FOREIGN KEY ("season_id") REFERENCES "seasons"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lots" ADD CONSTRAINT "lots_farmer_id_fkey" FOREIGN KEY ("farmer_id") REFERENCES "farmers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lots" ADD CONSTRAINT "lots_society_id_fkey" FOREIGN KEY ("society_id") REFERENCES "societies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quality_cuts" ADD CONSTRAINT "quality_cuts_lot_id_fkey" FOREIGN KEY ("lot_id") REFERENCES "lots"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "moisture_cuts" ADD CONSTRAINT "moisture_cuts_lot_id_fkey" FOREIGN KEY ("lot_id") REFERENCES "lots"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "adjustments" ADD CONSTRAINT "adjustments_lot_id_fkey" FOREIGN KEY ("lot_id") REFERENCES "lots"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "adjustments" ADD CONSTRAINT "adjustments_source_lot_id_fkey" FOREIGN KEY ("source_lot_id") REFERENCES "lots"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "adjustments" ADD CONSTRAINT "adjustments_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "adjustments" ADD CONSTRAINT "adjustments_approved_by_fkey" FOREIGN KEY ("approved_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
