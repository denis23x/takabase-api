-- AlterTable
ALTER TABLE `Settings` ADD COLUMN `pageScrollInfinite` BOOLEAN NOT NULL DEFAULT true,
    ADD COLUMN `pageScrollToTop` BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN `redirectFromHome` BOOLEAN NOT NULL DEFAULT true;
