-- AlterTable
ALTER TABLE `products` ADD COLUMN `flash_sale_info` JSON NULL,
    ADD COLUMN `prices` JSON NULL,
    ADD COLUMN `stock_details` JSON NULL;

