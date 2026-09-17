export type AzerbaijanMapLocation = {
  label: string;
  latitude: number;
  longitude: number;
};

/** Şəhər və rayon mərkəzləri — daşıyıcı xəritəsi və form seçimləri üçün vahid mənbə. */
export const azerbaijanMapLocations = [
  // Abşeron
  { label: "Bakı", latitude: 40.409264, longitude: 49.867092 },
  { label: "Sumqayıt", latitude: 40.589722, longitude: 49.66861 },
  { label: "Xırdalan", latitude: 40.44808, longitude: 49.75502 },
  { label: "Binəqədi", latitude: 40.465, longitude: 49.82 },
  { label: "Qaraçuxur", latitude: 40.3967, longitude: 49.9736 },
  { label: "Lökbatan", latitude: 40.325, longitude: 49.7333 },
  { label: "Mərdəkan", latitude: 40.4933, longitude: 50.1417 },
  { label: "Hövsan", latitude: 40.3744, longitude: 50.0858 },
  { label: "Pirallahi", latitude: 40.47, longitude: 50.325 },

  // Dağlıq Şirvan
  { label: "Şamaxı", latitude: 40.63141, longitude: 48.64137 },
  { label: "İsmayıllı", latitude: 40.785, longitude: 48.1514 },
  { label: "Ağsu", latitude: 40.5692, longitude: 48.4008 },
  { label: "Kürdəmir", latitude: 40.3453, longitude: 48.1508 },

  // Quba-Xaçmaz
  { label: "Quba", latitude: 41.36108, longitude: 48.51341 },
  { label: "Xaçmaz", latitude: 41.4643, longitude: 48.8056 },
  { label: "Qusar", latitude: 41.4275, longitude: 48.4302 },
  { label: "Şabran", latitude: 41.2158, longitude: 48.9942 },
  { label: "Siyəzən", latitude: 41.0781, longitude: 49.1114 },
  { label: "Xızı", latitude: 40.9078, longitude: 49.0739 },

  // Şəki-Zaqatala
  { label: "Şəki", latitude: 41.19194, longitude: 47.17056 },
  { label: "Qəbələ", latitude: 40.98139, longitude: 47.84582 },
  { label: "Oğuz", latitude: 41.0708, longitude: 47.4583 },
  { label: "Qax", latitude: 41.4225, longitude: 46.9242 },
  { label: "Zaqatala", latitude: 41.6336, longitude: 46.6433 },
  { label: "Balakən", latitude: 41.7261, longitude: 46.4042 },

  // Aran
  { label: "Mingəçevir", latitude: 40.77026, longitude: 47.0496 },
  { label: "Yevlax", latitude: 40.6192, longitude: 47.1503 },
  { label: "Ağdaş", latitude: 40.6469, longitude: 47.4739 },
  { label: "Ucar", latitude: 40.5183, longitude: 47.6542 },
  { label: "Zərdab", latitude: 40.2147, longitude: 47.7128 },
  { label: "Göyçay", latitude: 40.6531, longitude: 47.7406 },

  // Gəncə-Qazax
  { label: "Gəncə", latitude: 40.68278, longitude: 46.36056 },
  { label: "Naftalan", latitude: 40.5083, longitude: 46.825 },
  { label: "Goranboy", latitude: 40.6103, longitude: 46.7897 },
  { label: "Tərtər", latitude: 40.345, longitude: 46.9294 },
  { label: "Daşkəsən", latitude: 40.5214, longitude: 46.0778 },
  { label: "Samux", latitude: 40.7647, longitude: 46.4083 },
  { label: "Göygöl", latitude: 40.5858, longitude: 46.3189 },
  { label: "Şəmkir", latitude: 40.8297, longitude: 46.0189 },
  { label: "Gədəbəy", latitude: 40.5656, longitude: 45.8161 },
  { label: "Tovuz", latitude: 40.9922, longitude: 45.6289 },
  { label: "Ağstafa", latitude: 41.1189, longitude: 45.4539 },
  { label: "Qazax", latitude: 41.0925, longitude: 45.3656 },

  // Qarabağ (Azərbaycan)
  { label: "Ağdam", latitude: 39.9931, longitude: 46.9304 },
  { label: "Xankəndi", latitude: 39.8153, longitude: 46.7519 },
  { label: "Şuşa", latitude: 39.7603, longitude: 46.7497 },
  { label: "Xocavənd", latitude: 39.7917, longitude: 47.1103 },
  { label: "Füzuli", latitude: 39.6003, longitude: 47.1433 },
  { label: "Cəbrayıl", latitude: 39.3997, longitude: 47.0283 },
  { label: "Qubadlı", latitude: 39.3444, longitude: 46.5814 },
  { label: "Zəngilan", latitude: 39.0833, longitude: 46.65 },
  { label: "Laçın", latitude: 39.5983, longitude: 46.5503 },
  { label: "Kəlbəcər", latitude: 40.1056, longitude: 46.0444 },

  // Aran (cənub)
  { label: "Bərdə", latitude: 40.37577, longitude: 47.12619 },
  { label: "Ağcabədi", latitude: 40.0508, longitude: 47.4614 },
  { label: "Beyləqan", latitude: 39.7756, longitude: 47.6186 },
  { label: "İmişli", latitude: 39.8709, longitude: 48.06 },
  { label: "Saatlı", latitude: 39.9311, longitude: 48.3689 },
  { label: "Sabirabad", latitude: 40.0089, longitude: 48.477 },
  { label: "Salyan", latitude: 39.5961, longitude: 48.9847 },
  { label: "Neftçala", latitude: 39.3768, longitude: 49.247 },
  { label: "Hacıqabul", latitude: 40.0389, longitude: 48.9425 },
  { label: "Şirvan", latitude: 39.9378, longitude: 48.929 },
  { label: "Biləsuvar", latitude: 39.4544, longitude: 48.545 },
  { label: "Masallı", latitude: 39.03432, longitude: 48.6654 },
  { label: "Lənkəran", latitude: 38.75428, longitude: 48.85062 },
  { label: "Astara", latitude: 38.4561, longitude: 48.875 },
  { label: "Lerik", latitude: 38.7739, longitude: 48.415 },
  { label: "Yardımlı", latitude: 38.9078, longitude: 48.2406 },
  { label: "Cəlilabad", latitude: 39.2097, longitude: 48.4972 },

  // Naxçıvan
  { label: "Naxçıvan", latitude: 39.2089, longitude: 45.4122 },
  { label: "Ordubad", latitude: 38.9022, longitude: 46.0239 },
  { label: "Şahbuz", latitude: 39.4072, longitude: 45.5739 },
  { label: "Culfa", latitude: 38.9558, longitude: 45.6308 },
  { label: "Babək", latitude: 39.15, longitude: 45.45 },

  // Digər
  { label: "Qobustan", latitude: 40.5333, longitude: 49.0167 },
] as const satisfies readonly AzerbaijanMapLocation[];

export const carrierLocationOptions = azerbaijanMapLocations;

export const azerbaijanLocations = azerbaijanMapLocations.map((location) => location.label);
