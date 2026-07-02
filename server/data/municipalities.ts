/**
 * Datos geoespaciales de municipios del Estado de México
 * Coordenadas (latitud, longitud) y datos de población
 * Fuente: INEGI, CONABIO
 */

export interface Municipality {
  id: string;
  code: number;
  name: string;
  latitude: number;
  longitude: number;
  population: number;
  area: number; // km²
  region: string;
}

export const municipalities: Municipality[] = [
  {
    id: "ecatepec",
    code: 15031,
    name: "Ecatepec de Morelos",
    latitude: 25.5117,
    longitude: -99.0494,
    population: 1620284,
    area: 130.58,
    region: "Zona Metropolitana",
  },
  {
    id: "toluca",
    code: 15093,
    name: "Toluca",
    latitude: 19.2827,
    longitude: -99.6547,
    population: 489611,
    area: 422.58,
    region: "Centro",
  },
  {
    id: "tlalnepantla",
    code: 15088,
    name: "Tlalnepantla de Baz",
    latitude: 25.5333,
    longitude: -99.2167,
    population: 664225,
    area: 84.16,
    region: "Zona Metropolitana",
  },
  {
    id: "cuautitlan-izcalli",
    code: 15016,
    name: "Cuautitlán Izcalli",
    latitude: 25.6667,
    longitude: -99.2667,
    population: 507664,
    area: 136.72,
    region: "Zona Metropolitana",
  },
  {
    id: "naucalpan",
    code: 15058,
    name: "Naucalpan de Juárez",
    latitude: 25.4833,
    longitude: -99.3167,
    population: 846559,
    area: 150.70,
    region: "Zona Metropolitana",
  },
  {
    id: "nezahualcoyotl",
    code: 15061,
    name: "Nezahualcóyotl",
    latitude: 25.5167,
    longitude: -98.9833,
    population: 1098677,
    area: 63.40,
    region: "Zona Metropolitana",
  },
  {
    id: "chimalhuacan",
    code: 15014,
    name: "Chimalhuacán",
    latitude: 25.5333,
    longitude: -98.9167,
    population: 614127,
    area: 53.78,
    region: "Zona Metropolitana",
  },
  {
    id: "ixtapaluca",
    code: 15041,
    name: "Ixtapaluca",
    latitude: 25.3667,
    longitude: -98.8667,
    population: 557229,
    area: 285.74,
    region: "Zona Metropolitana",
  },
  {
    id: "valle-chalco",
    code: 15095,
    name: "Valle de Chalco Solidaridad",
    latitude: 25.2333,
    longitude: -98.9167,
    population: 408169,
    area: 148.36,
    region: "Zona Metropolitana",
  },
  {
    id: "texcoco",
    code: 15086,
    name: "Texcoco",
    latitude: 25.4167,
    longitude: -98.8833,
    population: 235146,
    area: 433.06,
    region: "Oriente",
  },
  {
    id: "coacalco",
    code: 15013,
    name: "Coacalco de Berriozábal",
    latitude: 25.6333,
    longitude: -99.1333,
    population: 265608,
    area: 29.60,
    region: "Zona Metropolitana",
  },
  {
    id: "atizapan",
    code: 15006,
    name: "Atizapán de Zaragoza",
    latitude: 25.6333,
    longitude: -99.3833,
    population: 489269,
    area: 90.21,
    region: "Zona Metropolitana",
  },
  {
    id: "huixquilucan",
    code: 15039,
    name: "Huixquilucan",
    latitude: 25.4167,
    longitude: -99.3667,
    population: 239754,
    area: 109.96,
    region: "Zona Metropolitana",
  },
  {
    id: "lerma",
    code: 15046,
    name: "Lerma",
    latitude: 19.3167,
    longitude: -99.5167,
    population: 129873,
    area: 130.00,
    region: "Centro",
  },
  {
    id: "metepec",
    code: 15054,
    name: "Metepec",
    latitude: 19.2333,
    longitude: -99.6333,
    population: 230556,
    area: 73.19,
    region: "Centro",
  },
  {
    id: "tultitlan",
    code: 15091,
    name: "Tultitlán",
    latitude: 25.6667,
    longitude: -99.1667,
    population: 491796,
    area: 78.73,
    region: "Zona Metropolitana",
  },
  {
    id: "chalco",
    code: 15012,
    name: "Chalco",
    latitude: 25.2667,
    longitude: -98.9333,
    population: 301394,
    area: 206.09,
    region: "Zona Metropolitana",
  },
  {
    id: "tecamac",
    code: 15084,
    name: "Tecámac",
    latitude: 25.7333,
    longitude: -99.0667,
    population: 330525,
    area: 105.08,
    region: "Zona Metropolitana",
  },
  {
    id: "zumpango",
    code: 15104,
    name: "Zumpango",
    latitude: 25.8333,
    longitude: -99.1167,
    population: 152823,
    area: 111.63,
    region: "Norte",
  },
  {
    id: "temoaya",
    code: 15085,
    name: "Temoaya",
    latitude: 19.4667,
    longitude: -99.7333,
    population: 63626,
    area: 138.27,
    region: "Centro",
  },
];

/**
 * Obtener municipio por ID
 */
export function getMunicipalityById(id: string): Municipality | undefined {
  return municipalities.find((m) => m.id === id);
}

/**
 * Obtener municipio por código
 */
export function getMunicipalityByCode(code: number): Municipality | undefined {
  return municipalities.find((m) => m.code === code);
}

/**
 * Obtener municipios por región
 */
export function getMunicipalitiesByRegion(region: string): Municipality[] {
  return municipalities.filter((m) => m.region === region);
}

/**
 * Calcular distancia entre dos puntos (Haversine)
 */
export function calculateDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371; // Radio de la Tierra en km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Obtener municipios cercanos
 */
export function getNearbyMunicipalities(
  latitude: number,
  longitude: number,
  radiusKm: number = 50
): Municipality[] {
  return municipalities.filter((m) => {
    const distance = calculateDistance(latitude, longitude, m.latitude, m.longitude);
    return distance <= radiusKm;
  });
}
