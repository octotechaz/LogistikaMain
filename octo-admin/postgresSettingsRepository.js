"use strict";

function makeSettingsRepository(prisma) {
  return {
    async getSetting(key, defaultValue = null) {
      const row = await prisma.appSetting.findUnique({ where: { key } });
      return row ? row.value : defaultValue;
    },

    async setSetting(key, value) {
      const row = await prisma.$transaction(async (tx) => {
        return tx.appSetting.upsert({
          where: { key },
          update: { value },
          create: { key, value },
        });
      });
      return row.value;
    },
  };
}

module.exports = { makeSettingsRepository };