export type DominicanLocation = {
  sector: string;
  municipality: string;
  province: string;
};

// Catálogo local de las 32 demarcaciones y sus 158 municipios.
const municipalitiesByProvince: Record<string, string[]> = {
  'Distrito Nacional': ['Santo Domingo de Guzmán'],
  Azua: ['Azua de Compostela', 'Estebanía', 'Guayabal', 'Las Charcas', 'Las Yayas de Viajama', 'Padre Las Casas', 'Peralta', 'Pueblo Viejo', 'Sabana Yegua', 'Tábara Arriba'],
  'Baoruco (Bahoruco)': ['Neiba', 'Galván', 'Los Ríos', 'Tamayo', 'Villa Jaragua'],
  Barahona: ['Barahona', 'Cabral', 'El Peñón', 'Enriquillo', 'Fundación', 'Jaquimeyes', 'La Ciénaga', 'Las Salinas', 'Paraíso', 'Polo', 'Vicente Noble'],
  Dajabón: ['Dajabón', 'El Pino', 'Loma de Cabrera', 'Partido', 'Restauración'],
  Duarte: ['San Francisco de Macorís', 'Arenoso', 'Castillo', 'Eugenio María de Hostos', 'Las Guáranas', 'Pimentel', 'Villa Riva'],
  'Elías Piña': ['Comendador', 'Bánica', 'El Llano', 'Hondo Valle', 'Juan Santiago', 'Pedro Santana'],
  'El Seibo': ['Santa Cruz del Seibo', 'Miches'],
  Espaillat: ['Moca', 'Cayetano Germosén', 'Gaspar Hernández', 'Jamao al Norte', 'San Víctor'],
  'Hato Mayor': ['Hato Mayor del Rey', 'El Valle', 'Sabana de la Mar'],
  'Hermanas Mirabal': ['Salcedo', 'Tenares', 'Villa Tapia'],
  Independencia: ['Jimaní', 'Cristóbal', 'Duvergé', 'La Descubierta', 'Mella', 'Postrer Río'],
  'La Altagracia': ['Salvaleón de Higüey', 'San Rafael del Yuma'],
  'La Romana': ['La Romana', 'Guaymate', 'Villa Hermosa'],
  'La Vega': ['Concepción de La Vega', 'Constanza', 'Jarabacoa', 'Jima Abajo'],
  'María Trinidad Sánchez': ['Nagua', 'Cabrera', 'El Factor', 'Río San Juan'],
  'Monseñor Nouel': ['Bonao', 'Maimón', 'Piedra Blanca'],
  'Monte Cristi': ['San Fernando de Monte Cristi', 'Castañuelas', 'Guayubín', 'Las Matas de Santa Cruz', 'Pepillo Salcedo', 'Villa Vásquez'],
  'Monte Plata': ['Monte Plata', 'Bayaguana', 'Peralvillo', 'Sabana Grande de Boyá', 'Yamasá'],
  Pedernales: ['Pedernales', 'Oviedo'],
  Peravia: ['Baní', 'Matanzas', 'Nizao'],
  'Puerto Plata': ['San Felipe de Puerto Plata', 'Altamira', 'Guananico', 'Imbert', 'Los Hidalgos', 'Luperón', 'Sosúa', 'Villa Isabela', 'Villa Montellano'],
  Samaná: ['Santa Bárbara de Samaná', 'Las Terrenas', 'Sánchez'],
  'San Cristóbal': ['San Cristóbal', 'Bajos de Haina', 'Cambita Garabitos', 'Los Cacaos', 'Sabana Grande de Palenque', 'San Gregorio de Nigua', 'Villa Altagracia', 'Yaguate'],
  'San José de Ocoa': ['San José de Ocoa', 'Rancho Arriba', 'Sabana Larga'],
  'San Juan': ['San Juan de la Maguana', 'Bohechío', 'El Cercado', 'Juan de Herrera', 'Las Matas de Farfán', 'Vallejuelo'],
  'San Pedro de Macorís': ['San Pedro de Macorís', 'Consuelo', 'Guayacanes', 'Los Llanos', 'Quisqueya', 'Ramón Santana'],
  'Sánchez Ramírez': ['Cotuí', 'Cevicos', 'Fantino', 'La Mata'],
  Santiago: ['Santiago de los Caballeros', 'Baitoa', 'Bisonó (Navarrete)', 'Jánico', 'Licey al Medio', 'Puñal', 'Sabana Iglesia', 'San José de las Matas', 'Tamboril', 'Villa González'],
  'Santiago Rodríguez': ['San Ignacio de Sabaneta', 'Los Almácigos', 'Monción'],
  'Santo Domingo': ['Santo Domingo Este', 'Santo Domingo Norte', 'Santo Domingo Oeste', 'Boca Chica', 'Los Alcarrizos', 'Pedro Brand', 'San Antonio de Guerra'],
  Valverde: ['Mao', 'Esperanza', 'Laguna Salada'],
};

const municipalityLocations: DominicanLocation[] = Object.entries(municipalitiesByProvince).flatMap(([province, municipalities]) => (
  municipalities.map((municipality) => ({ sector: '', municipality, province }))
));

const sectorLocations: DominicanLocation[] = [
  { sector: 'Los Maestros', municipality: 'Fantino', province: 'Sánchez Ramírez' },
  { sector: 'Centro del Pueblo', municipality: 'Fantino', province: 'Sánchez Ramírez' },
  { sector: 'El Hoyo', municipality: 'Fantino', province: 'Sánchez Ramírez' },
  { sector: 'La Javilla', municipality: 'Fantino', province: 'Sánchez Ramírez' },
  { sector: 'La Herradura', municipality: 'Santiago de los Caballeros', province: 'Santiago' },
  { sector: 'Barrio Nuevo', municipality: 'Santiago de los Caballeros', province: 'Santiago' },
  { sector: 'Bella Vista', municipality: 'Santiago de los Caballeros', province: 'Santiago' },
  { sector: 'Los Jardines Metropolitanos', municipality: 'Santiago de los Caballeros', province: 'Santiago' },
  { sector: 'Villa Olga', municipality: 'Santiago de los Caballeros', province: 'Santiago' },
  { sector: 'Pekín', municipality: 'Santiago de los Caballeros', province: 'Santiago' },
  { sector: 'Cienfuegos', municipality: 'Santiago de los Caballeros', province: 'Santiago' },
  { sector: 'Gurabo', municipality: 'Santiago de los Caballeros', province: 'Santiago' },
  { sector: 'Los Pepines', municipality: 'Santiago de los Caballeros', province: 'Santiago' },
  { sector: 'Ensanche Libertad', municipality: 'Santiago de los Caballeros', province: 'Santiago' },
  { sector: 'Naco', municipality: 'Santo Domingo de Guzmán', province: 'Distrito Nacional' },
  { sector: 'Piantini', municipality: 'Santo Domingo de Guzmán', province: 'Distrito Nacional' },
  { sector: 'Gazcue', municipality: 'Santo Domingo de Guzmán', province: 'Distrito Nacional' },
  { sector: 'Villa Juana', municipality: 'Santo Domingo de Guzmán', province: 'Distrito Nacional' },
  { sector: 'Villa Consuelo', municipality: 'Santo Domingo de Guzmán', province: 'Distrito Nacional' },
  { sector: 'Los Prados', municipality: 'Santo Domingo de Guzmán', province: 'Distrito Nacional' },
  { sector: 'Los Mina', municipality: 'Santo Domingo Este', province: 'Santo Domingo' },
  { sector: 'Ensanche Ozama', municipality: 'Santo Domingo Este', province: 'Santo Domingo' },
  { sector: 'Alma Rosa', municipality: 'Santo Domingo Este', province: 'Santo Domingo' },
  { sector: 'Invivienda', municipality: 'Santo Domingo Este', province: 'Santo Domingo' },
  { sector: 'Villa Mella', municipality: 'Santo Domingo Norte', province: 'Santo Domingo' },
  { sector: 'Sabana Perdida', municipality: 'Santo Domingo Norte', province: 'Santo Domingo' },
  { sector: 'Herrera', municipality: 'Santo Domingo Oeste', province: 'Santo Domingo' },
  { sector: 'Las Caobas', municipality: 'Santo Domingo Oeste', province: 'Santo Domingo' },
  { sector: 'Villa Lora', municipality: 'Concepción de La Vega', province: 'La Vega' },
  { sector: 'Villa Rosa', municipality: 'Concepción de La Vega', province: 'La Vega' },
  { sector: 'El Nápoles', municipality: 'Concepción de La Vega', province: 'La Vega' },
  { sector: 'Cristo Rey', municipality: 'San Cristóbal', province: 'San Cristóbal' },
  { sector: 'Pueblo Nuevo', municipality: 'San Cristóbal', province: 'San Cristóbal' },
  { sector: 'Villa Velásquez', municipality: 'San Pedro de Macorís', province: 'San Pedro de Macorís' },
  { sector: 'Miramar', municipality: 'San Pedro de Macorís', province: 'San Pedro de Macorís' },
  { sector: 'Villa Verde', municipality: 'La Romana', province: 'La Romana' },
  { sector: 'Savica', municipality: 'La Romana', province: 'La Romana' },
  { sector: 'Bávaro', municipality: 'Salvaleón de Higüey', province: 'La Altagracia' },
  { sector: 'Los Rosales', municipality: 'Salvaleón de Higüey', province: 'La Altagracia' },
  { sector: 'Pueblo Nuevo', municipality: 'San Francisco de Macorís', province: 'Duarte' },
  { sector: 'Santa Ana', municipality: 'San Francisco de Macorís', province: 'Duarte' },
  { sector: 'Los Jardines', municipality: 'Bonao', province: 'Monseñor Nouel' },
  { sector: 'El Brisal', municipality: 'Bonao', province: 'Monseñor Nouel' },
];

export const dominicanLocations = [...municipalityLocations, ...sectorLocations];
