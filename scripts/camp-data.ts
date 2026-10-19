/**
 * NYSC Permanent Orientation Camps — seed data for the `camps` module.
 *
 * PRIMARY SOURCE: https://www.nysc.gov.ng/camps.html (fetched live
 * 2026-10-19), which lists every camp with its official address and a
 * "View on Map" Google Maps link. The 36 resolvable map links were followed
 * to their final Google Maps URLs and the coordinates read from those URLs,
 * so these are the coordinates NYSC itself publishes per camp — not
 * estimates. Cross-referenced with NYSC Mobilization (Aug 2026) and
 * ground-truth corrections from Shekinah (serving corper, 2026-10-19).
 *
 * COORDINATE CONFIDENCE:
 *   - 36/37: read directly from NYSC's own Google Maps links.
 *   - EN (Enugu): NYSC's map link resolves to a plus-code URL
 *     (3FMC+MRR, Awgu) whose numeric form is not exposed. Set to the
 *     OpenStreetMap centroid of Awgu, Enugu — LGA-level, not camp-level.
 *     Refine before using for navigation.
 *
 * GROUND-TRUTH CORRECTIONS (Shekinah, 2026-10-19) overriding the live
 * address text where they differ:
 *   - PLATEAU: Jakatari (Jakatai), Mangu LGA  (site still lists Waye
 *     Foundation, Jos South — live map link resolves near Mangu)
 *   - ZAMFARA: Tsafe LGA                      (site lists UBEC, Gusau)
 *   - ENUGU:   Awgu LGA                      (site reads "Agwu", same place)
 *   - BORNO:   Maiduguri confirmed unchanged.
 *
 * Each entry carries verifiedSource so the provenance of every record is
 * auditable. All 36 state camps + FCT are represented.
 */

export interface CampSeed {
  stateCode: string
  stateName: string
  campName: string
  address: string
  lga: string
  lat: number
  lng: number
  status: 'permanent' | 'temporary'
  verifiedSource: string
}

/** All 37 NYSC orientation camps, ordered by state code. */
export const nyscCamps: CampSeed[] = [
  // South-East Zone
  {
    stateCode: 'AB',
    stateName: 'Abia',
    campName: 'NYSC Permanent Orientation Camp',
    address: 'NYSC Permanent Orientation Camp, Umunna, Bende Local Government Area, Abia State.',
    lga: 'Bende',
    lat: 5.7231528,
    lng: 7.641434,
    status: 'permanent',
    verifiedSource: 'nysc.gov.ng/camps.html live 2026-10-19 (map link coords); NYSC Mobilization 2026-08-20',
  },
  {
    stateCode: 'AN',
    stateName: 'Anambra',
    campName: 'NYSC Permanent Orientation Camp',
    address: 'NYSC Permanent Orientation Camp, Umuawulu/Mbaukwu Awka South Local Government Area, Anambra State.',
    lga: 'Awka South',
    lat: 6.1351177,
    lng: 7.0938709,
    status: 'permanent',
    verifiedSource: 'nysc.gov.ng/camps.html live 2026-10-19 (map link coords); NYSC Mobilization 2026-08-20',
  },
  {
    stateCode: 'EB',
    stateName: 'Ebonyi',
    campName: 'NYSC Permanent Orientation Camp',
    address: 'NYSC Permanent Orientation Camp, Macgregor College, Afikpo Local Government Area, Ebonyi State.',
    lga: 'Afikpo',
    lat: 5.8900967,
    lng: 7.9132392,
    status: 'permanent',
    verifiedSource: 'nysc.gov.ng/camps.html live 2026-10-19 (map link coords); NYSC Mobilization 2026-08-20',
  },
  {
    stateCode: 'EN',
    stateName: 'Enugu',
    campName: 'NYSC Permanent Orientation Camp',
    address: 'NYSC Permanent Orientation Camp, Awgu Local Government Area, Enugu State.',
    lga: 'Awgu',
    lat: 6.1731327,
    lng: 7.4512478,
    status: 'permanent',
    verifiedSource: 'nysc.gov.ng/camps.html live 2026-10-19; user ground truth (Shekinah) 2026-10-19; COORDS: OSM Awgu centroid (LGA-level, refine before navigation)',
  },
  {
    stateCode: 'IM',
    stateName: 'Imo',
    campName: 'NYSC Permanent Orientation Camp',
    address: 'NYSC Permanent Orientation Camp, Former Girls Model Secondary School, Eziama Obaire, Nkwerre Local Government Area, Imo State.',
    lga: 'Nkwerre',
    lat: 5.7415714,
    lng: 7.0777583,
    status: 'permanent',
    verifiedSource: 'nysc.gov.ng/camps.html live 2026-10-19 (map link coords); NYSC Mobilization 2026-08-20',
  },

  // South-South Zone
  {
    stateCode: 'AK',
    stateName: 'Akwa Ibom',
    campName: 'NYSC Permanent Orientation Camp',
    address: 'NYSC Permanent Orientation Camp, Ikot Itie Udung, Nsit Atai Local Government Area, Akwa Ibom State.',
    lga: 'Nsit Atai',
    lat: 4.8752586,
    lng: 8.0541587,
    status: 'permanent',
    verifiedSource: 'nysc.gov.ng/camps.html live 2026-10-19 (map link coords); NYSC Mobilization 2026-08-20',
  },
  {
    stateCode: 'BY',
    stateName: 'Bayelsa',
    campName: 'NYSC Permanent Orientation Camp',
    address: 'NYSC Permanent Orientation Camp, Boro Town, Kolokuma/Opokuma Local Government Area, Bayelsa State.',
    lga: 'Kolokuma/Opokuma',
    lat: 5.0844871,
    lng: 6.2803482,
    status: 'permanent',
    verifiedSource: 'nysc.gov.ng/camps.html live 2026-10-19 (map link coords); NYSC Mobilization 2026-08-20',
  },
  {
    stateCode: 'CR',
    stateName: 'Cross River',
    campName: 'NYSC Permanent Orientation Camp',
    address: 'NYSC Permanent Orientation Camp, Ogada I, Obubra Local Government Area, Cross River State.',
    lga: 'Obubra',
    lat: 6.0535253,
    lng: 8.3455653,
    status: 'permanent',
    verifiedSource: 'nysc.gov.ng/camps.html live 2026-10-19 (map link coords); NYSC Mobilization 2026-08-20',
  },
  {
    stateCode: 'DT',
    stateName: 'Delta',
    campName: 'NYSC Permanent Orientation Camp',
    address: 'NYSC Permanent Orientation Camp, Former Martins TTC, Issele-Uku, Aniocha North L.G.A. Delta State.',
    lga: 'Aniocha North',
    lat: 6.321792,
    lng: 6.4633858,
    status: 'permanent',
    verifiedSource: 'nysc.gov.ng/camps.html live 2026-10-19 (map link coords); NYSC Mobilization 2026-08-20',
  },
  {
    stateCode: 'ED',
    stateName: 'Edo',
    campName: 'NYSC Permanent Orientation Camp',
    address: 'NYSC Permanent Orientation Camp, Opposite Igbinedion University, Okada, Ovia North East Local Government Area, Edo State.',
    lga: 'Ovia North East',
    lat: 6.7371827,
    lng: 5.3976039,
    status: 'permanent',
    verifiedSource: 'nysc.gov.ng/camps.html live 2026-10-19 (map link coords); NYSC Mobilization 2026-08-20',
  },
  {
    stateCode: 'RV',
    stateName: 'Rivers',
    campName: 'NYSC Permanent Orientation Camp',
    address: 'NYSC Permanent Orientation Camp, Nonwa-Gbam, Tai Local Government Area, Rivers State.',
    lga: 'Tai',
    lat: 4.7385762,
    lng: 7.2265884,
    status: 'permanent',
    verifiedSource: 'nysc.gov.ng/camps.html live 2026-10-19 (map link coords); NYSC Mobilization 2026-08-20',
  },

  // South-West Zone
  {
    stateCode: 'EK',
    stateName: 'Ekiti',
    campName: 'NYSC Permanent Orientation Camp',
    address: 'NYSC Permanent Orientation Camp, Ise-Orun/Emure Local Government Area, Ekiti State.',
    lga: 'Ise-Orun',
    lat: 7.4496747,
    lng: 5.4412296,
    status: 'permanent',
    verifiedSource: 'nysc.gov.ng/camps.html live 2026-10-19 (map link coords); NYSC Mobilization 2026-08-20',
  },
  {
    stateCode: 'LA',
    stateName: 'Lagos',
    campName: 'NYSC Permanent Orientation Camp',
    address: 'NYSC Permanent Orientation Camp, Iyana Ipaja, Agege, Lagos State.',
    lga: 'Agege',
    lat: 6.6251506,
    lng: 3.3026871,
    status: 'permanent',
    verifiedSource: 'nysc.gov.ng/camps.html live 2026-10-19 (map link coords); keenable.in places; NYSC Mobilization 2026-08-20',
  },
  {
    stateCode: 'OG',
    stateName: 'Ogun',
    campName: 'NYSC Permanent Orientation Camp',
    address: 'NYSC Permanent Orientation Camp, Ikenne Road, Sagamu Local Government Area, Sagamu, Ogun State.',
    lga: 'Sagamu',
    lat: 6.8616193,
    lng: 3.6680637,
    status: 'permanent',
    verifiedSource: 'nysc.gov.ng/camps.html live 2026-10-19 (map link coords); NYSC Mobilization 2026-08-20',
  },
  {
    stateCode: 'OD',
    stateName: 'Ondo',
    campName: 'NYSC Permanent Orientation Camp',
    address: 'NYSC Permanent Orientation Camp, Ikare-Akoko Local Government Area, Ondo State.',
    lga: 'Akoko North East',
    lat: 7.5214408,
    lng: 5.7360204,
    status: 'permanent',
    verifiedSource: 'nysc.gov.ng/camps.html live 2026-10-19 (map link coords); NYSC Mobilization 2026-08-20',
  },
  {
    stateCode: 'OS',
    stateName: 'Osun',
    campName: 'NYSC Permanent Orientation Camp',
    address: 'NYSC Permanent Orientation Camp, Aisu Junction, Cottage Hospital Road, Ede, Ede North Local Government, Osun State.',
    lga: 'Ede North',
    lat: 7.7047391,
    lng: 4.4539119,
    status: 'permanent',
    verifiedSource: 'nysc.gov.ng/camps.html live 2026-10-19 (map link coords); NYSC Mobilization 2026-08-20',
  },
  {
    stateCode: 'OY',
    stateName: 'Oyo',
    campName: 'NYSC Permanent Orientation Camp',
    address: 'NYSC Permanent Orientation Camp, Okeho Road, Gbakuta, Iseyin Local Government Area, Oyo State.',
    lga: 'Iseyin',
    lat: 7.988412,
    lng: 3.5599338,
    status: 'permanent',
    verifiedSource: 'nysc.gov.ng/camps.html live 2026-10-19 (map link coords); NYSC Mobilization 2026-08-20',
  },

  // North-Central Zone
  {
    stateCode: 'BN',
    stateName: 'Benue',
    campName: 'NYSC Permanent Orientation Camp',
    address: 'NYSC Permanent Orientation Camp, Wannune, Tarka Local Government Area, Kilometer 35 Makurdi Gboko Road, Benue State.',
    lga: 'Tarka',
    lat: 7.5882801,
    lng: 8.8736182,
    status: 'permanent',
    verifiedSource: 'nysc.gov.ng/camps.html live 2026-10-19 (map link coords); NYSC Mobilization 2026-08-20',
  },
  {
    stateCode: 'FC',
    stateName: 'FCT Abuja',
    campName: 'NYSC Permanent Orientation Camp',
    address: 'NYSC Permanent Orientation Camp, Kubwa, Bwari Area Council, FCT.',
    lga: 'Bwari',
    lat: 9.148659,
    lng: 7.3164481,
    status: 'permanent',
    verifiedSource: 'nysc.gov.ng/camps.html live 2026-10-19 (map link coords); NYSC Mobilization 2026-08-20',
  },
  {
    stateCode: 'KG',
    stateName: 'Kogi',
    campName: 'NYSC Permanent Orientation Camp',
    address: 'NYSC Permanent Orientation Camp, Asaya, Kabba Local Government Area, Kogi State.',
    lga: 'Kabba/Bunu',
    lat: 7.8181043,
    lng: 6.0438821,
    status: 'permanent',
    verifiedSource: 'nysc.gov.ng/camps.html live 2026-10-19 (map link coords); NYSC Mobilization 2026-08-20',
  },
  {
    stateCode: 'KW',
    stateName: 'Kwara',
    campName: 'NYSC Temporary Orientation Camp',
    address: 'NYSC Temporary Orientation Camp, Kwara State Polytechnic, Old Jebba Road, before University of Ilorin Teaching Hospital, Ilorin, Kwara State.',
    lga: 'Ilorin East',
    lat: 8.5893603,
    lng: 4.669054,
    status: 'temporary',
    verifiedSource: 'nysc.gov.ng/camps.html live 2026-10-19 (map link coords); user ground truth (Shekinah) 2026-10-19',
  },
  {
    stateCode: 'NS',
    stateName: 'Nasarawa',
    campName: 'Magaji Dan-Yamusa Permanent Orientation Camp',
    address: 'Magaji Dan-Yamusa Permanent Orientation Camp, Keffi, Nasarawa State.',
    lga: 'Keffi',
    lat: 8.8615197,
    lng: 7.8299632,
    status: 'permanent',
    verifiedSource: 'nysc.gov.ng/camps.html live 2026-10-19 (map link coords); NYSC Mobilization 2026-08-20',
  },
  {
    stateCode: 'NG',
    stateName: 'Niger',
    campName: 'NYSC Permanent Orientation Camp',
    address: 'NYSC Permanent Orientation Camp, Former Abubakar Dada Senior Secondary School, Paiko, Niger State.',
    lga: 'Paikoro',
    lat: 9.4569695,
    lng: 6.6350225,
    status: 'permanent',
    verifiedSource: 'nysc.gov.ng/camps.html live 2026-10-19 (map link coords); NYSC Mobilization 2026-08-20',
  },
  {
    stateCode: 'PL',
    stateName: 'Plateau',
    campName: 'NYSC Orientation Camp',
    address: 'NYSC Orientation Camp, Jakatari (Jakatai), Mangu Local Government Area, Plateau State.',
    lga: 'Mangu',
    lat: 9.8035644,
    lng: 8.9194172,
    status: 'permanent',
    verifiedSource: 'User ground truth (Shekinah, serving corper) 2026-10-19; coords from nysc.gov.ng map link (resolves near Mangu); site text still lists Waye Foundation Jos South',
  },

  // North-East Zone
  {
    stateCode: 'AD',
    stateName: 'Adamawa',
    campName: 'NYSC Permanent Orientation Camp',
    address: 'NYSC Permanent Orientation Camp, Lapondo Road, Damare, Girei Local Government Area, Adamawa State.',
    lga: 'Girei',
    lat: 9.3199661,
    lng: 12.4427296,
    status: 'permanent',
    verifiedSource: 'nysc.gov.ng/camps.html live 2026-10-19 (map link coords); NYSC Mobilization 2026-08-20',
  },
  {
    stateCode: 'BA',
    stateName: 'Bauchi',
    campName: 'NYSC Permanent Orientation Camp',
    address: 'NYSC Permanent Orientation Camp, KM 60 Wailo, Ganjuwa Local Government Council, Bauchi State.',
    lga: 'Ganjuwa',
    lat: 10.6779703,
    lng: 10.2115835,
    status: 'permanent',
    verifiedSource: 'nysc.gov.ng/camps.html live 2026-10-19 (map link coords); NYSC Mobilization 2026-08-20',
  },
  {
    stateCode: 'BO',
    stateName: 'Borno',
    campName: 'Mustapha Umar El-Kanemi Arabic Teachers College',
    address: 'Mustapha Umar El-Kanemi Arabic Teachers College, Maiduguri, Borno State.',
    lga: 'Maiduguri',
    lat: 11.8282013,
    lng: 13.1210051,
    status: 'permanent',
    verifiedSource: 'nysc.gov.ng/camps.html live 2026-10-19 (map link coords); user ground truth (Shekinah) 2026-10-19: Maiduguri confirmed',
  },
  {
    stateCode: 'GM',
    stateName: 'Gombe',
    campName: 'NYSC Temporary Orientation Camp',
    address: 'NYSC Temporary Orientation Camp, Science Technical College, Amada, KM 21 Gombe-Bauchi Highway, Near International Airport, Gombe State.',
    lga: 'Gombe',
    lat: 10.2878079,
    lng: 11.0034999,
    status: 'temporary',
    verifiedSource: 'nysc.gov.ng/camps.html live 2026-10-19 (map link coords); user ground truth (Shekinah) 2026-10-19',
  },
  {
    stateCode: 'TR',
    stateName: 'Taraba',
    campName: 'NYSC Permanent Orientation Camp',
    address: 'NYSC Permanent Orientation Camp, Sibre Airport Road, Jalingo, Taraba State.',
    lga: 'Jalingo',
    lat: 8.8786204,
    lng: 11.2430928,
    status: 'permanent',
    verifiedSource: 'nysc.gov.ng/camps.html live 2026-10-19 (map link coords); NYSC Mobilization 2026-08-20',
  },
  {
    stateCode: 'YB',
    stateName: 'Yobe',
    campName: 'NYSC Permanent Orientation Camp',
    address: 'NYSC Permanent Orientation Camp, Dazigau, KM 5 Potiskum-Kano Road, Nangere Local Government Area, Yobe State.',
    lga: 'Nangere',
    lat: 11.7222031,
    lng: 10.9887116,
    status: 'permanent',
    verifiedSource: 'nysc.gov.ng/camps.html live 2026-10-19 (map link coords); NYSC Mobilization 2026-08-20',
  },

  // North-West Zone
  {
    stateCode: 'JG',
    stateName: 'Jigawa',
    campName: 'NYSC Permanent Camp',
    address: 'NYSC Permanent Camp, Opposite Army Barrack, Fanisau, Dutse Local Government Area, Jigawa State.',
    lga: 'Dutse',
    lat: 11.8031923,
    lng: 9.3556527,
    status: 'permanent',
    verifiedSource: 'nysc.gov.ng/camps.html live 2026-10-19 (map link coords); NYSC Mobilization 2026-08-20',
  },
  {
    stateCode: 'KD',
    stateName: 'Kaduna',
    campName: 'Government College',
    address: 'Government College, Gwamna Road, Kurmin Mashi, Kaduna, Kaduna State.',
    lga: 'Kaduna North',
    lat: 10.5424032,
    lng: 7.4201447,
    status: 'permanent',
    verifiedSource: 'nysc.gov.ng/camps.html live 2026-10-19 (map link coords); NYSC Mobilization 2026-08-20',
  },
  {
    stateCode: 'KN',
    stateName: 'Kano',
    campName: 'NYSC Permanent Orientation Camp',
    address: 'NYSC Permanent Orientation Camp, Kusala Dam, Karaye, Karaye Local Government, Kano State.',
    lga: 'Karaye',
    lat: 11.8223891,
    lng: 8.0324748,
    status: 'permanent',
    verifiedSource: 'nysc.gov.ng/camps.html live 2026-10-19 (map link coords); NYSC Mobilization 2026-08-20',
  },
  {
    stateCode: 'KT',
    stateName: 'Katsina',
    campName: 'Youth Multi-purpose Centre / NYSC Permanent Orientation Camp',
    address: 'Youth Multi-purpose Centre / NYSC Permanent Orientation Camp, Mani Road, Katsina State.',
    lga: 'Katsina',
    lat: 12.9663898,
    lng: 7.6481588,
    status: 'permanent',
    verifiedSource: 'nysc.gov.ng/camps.html live 2026-10-19 (map link coords); NYSC Mobilization 2026-08-20',
  },
  {
    stateCode: 'KB',
    stateName: 'Kebbi',
    campName: 'NYSC Temporary Orientation Camp',
    address: 'NYSC Temporary Orientation Camp, Government Science College, Basaura, KM 15, Along Birnin Kebbi - Jega Road, Basaura, Birnin Kebbi, Kebbi State.',
    lga: 'Basaura (Birnin Kebbi)',
    lat: 11.6725472,
    lng: 4.060978,
    status: 'temporary',
    verifiedSource: 'nysc.gov.ng/camps.html live 2026-10-19 (map link coords); user ground truth (Shekinah) 2026-10-19',
  },
  {
    stateCode: 'SO',
    stateName: 'Sokoto',
    campName: 'NYSC Permanent Orientation Camp',
    address: 'NYSC Permanent Orientation Camp, Wamakko, Wamakko Local Government Area, Sokoto State.',
    lga: 'Wamakko',
    lat: 13.0360223,
    lng: 5.0932753,
    status: 'permanent',
    verifiedSource: 'nysc.gov.ng/camps.html live 2026-10-19 (map link coords); NYSC Mobilization 2026-08-20',
  },
  {
    stateCode: 'ZM',
    stateName: 'Zamfara',
    campName: 'NYSC Permanent Orientation Camp',
    address: 'NYSC Permanent Orientation Camp, Tsafe Local Government Area, Zamfara State.',
    lga: 'Tsafe',
    lat: 12.1639164,
    lng: 6.6738082,
    status: 'permanent',
    verifiedSource: 'User ground truth (Shekinah, serving corper) 2026-10-19 (Tsafe); nysc.gov.ng map link coords 2026-10-19',
  },
]

/** Validate the seed: exactly 37 unique state codes. */
export function validateCampSeed(): void {
  if (nyscCamps.length !== 37) {
    throw new Error(`Expected 37 camps, got ${nyscCamps.length}`)
  }
  const codes = new Set(nyscCamps.map((c) => c.stateCode))
  if (codes.size !== 37) {
    throw new Error('Duplicate state codes in camp seed data')
  }
}
