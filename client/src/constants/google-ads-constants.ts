export const DEFAULT_LANG = "languageConstants/1040"; // vi-VN
export const DEFAULT_GEO = "geoTargetConstants/2704"; // Vietnam

export interface GeoTargetConstant {
  id: string;
  name: string;
  displayName: string;
  countryCode: string;
  type: "Country" | "Region";
  status: "Active";
  value: string;
}

export interface LanguageConstant {
  name: string;
  code: string;
  criterionId: string;
  value: string;
}

export const GEO_TARGET_CONSTANTS: GeoTargetConstant[] = [
  // Vietnam first (default)
  {
    id: "2704",
    name: "Vietnam",
    displayName: "Vietnam",
    countryCode: "VN",
    type: "Country",
    status: "Active",
    value: "geoTargetConstants/2704"
  },
  // Rest of countries in alphabetical order
  {
    id: "2660",
    name: "Anguilla",
    displayName: "Anguilla",
    countryCode: "AI",
    type: "Region",
    status: "Active",
    value: "geoTargetConstants/2660"
  },
  {
    id: "2533",
    name: "Aruba",
    displayName: "Aruba",
    countryCode: "AW",
    type: "Region",
    status: "Active",
    value: "geoTargetConstants/2533"
  },
  {
    id: "2204",
    name: "Benin",
    displayName: "Benin",
    countryCode: "BJ",
    type: "Country",
    status: "Active",
    value: "geoTargetConstants/2204"
  },
  {
    id: "2854",
    name: "Burkina Faso",
    displayName: "Burkina Faso",
    countryCode: "BF",
    type: "Country",
    status: "Active",
    value: "geoTargetConstants/2854"
  },
  {
    id: "2535",
    name: "Caribbean Netherlands",
    displayName: "Caribbean Netherlands",
    countryCode: "BQ",
    type: "Country",
    status: "Active",
    value: "geoTargetConstants/2535"
  },
  {
    id: "2162",
    name: "Christmas Island",
    displayName: "Christmas Island",
    countryCode: "CX",
    type: "Country",
    status: "Active",
    value: "geoTargetConstants/2162"
  },
  {
    id: "2166",
    name: "Cocos (Keeling) Islands",
    displayName: "Cocos (Keeling) Islands",
    countryCode: "CC",
    type: "Country",
    status: "Active",
    value: "geoTargetConstants/2166"
  },
  {
    id: "2170",
    name: "Colombia",
    displayName: "Colombia",
    countryCode: "CO",
    type: "Country",
    status: "Active",
    value: "geoTargetConstants/2170"
  },
  {
    id: "2174",
    name: "Comoros",
    displayName: "Comoros",
    countryCode: "KM",
    type: "Country",
    status: "Active",
    value: "geoTargetConstants/2174"
  },
  {
    id: "2184",
    name: "Cook Islands",
    displayName: "Cook Islands",
    countryCode: "CK",
    type: "Country",
    status: "Active",
    value: "geoTargetConstants/2184"
  },
  {
    id: "2188",
    name: "Costa Rica",
    displayName: "Costa Rica",
    countryCode: "CR",
    type: "Country",
    status: "Active",
    value: "geoTargetConstants/2188"
  },
  {
    id: "2384",
    name: "Cote d'Ivoire",
    displayName: "Cote d'Ivoire",
    countryCode: "CI",
    type: "Country",
    status: "Active",
    value: "geoTargetConstants/2384"
  },
  {
    id: "2191",
    name: "Croatia",
    displayName: "Croatia",
    countryCode: "HR",
    type: "Country",
    status: "Active",
    value: "geoTargetConstants/2191"
  },
  {
    id: "2531",
    name: "Curacao",
    displayName: "Curacao",
    countryCode: "CW",
    type: "Country",
    status: "Active",
    value: "geoTargetConstants/2531"
  },
  {
    id: "2196",
    name: "Cyprus",
    displayName: "Cyprus",
    countryCode: "CY",
    type: "Country",
    status: "Active",
    value: "geoTargetConstants/2196"
  },
  {
    id: "2203",
    name: "Czechia",
    displayName: "Czechia",
    countryCode: "CZ",
    type: "Country",
    status: "Active",
    value: "geoTargetConstants/2203"
  },
  {
    id: "2180",
    name: "Democratic Republic of the Congo",
    displayName: "Democratic Republic of the Congo",
    countryCode: "CD",
    type: "Country",
    status: "Active",
    value: "geoTargetConstants/2180"
  },
  {
    id: "2208",
    name: "Denmark",
    displayName: "Denmark",
    countryCode: "DK",
    type: "Country",
    status: "Active",
    value: "geoTargetConstants/2208"
  },
  {
    id: "2262",
    name: "Djibouti",
    displayName: "Djibouti",
    countryCode: "DJ",
    type: "Country",
    status: "Active",
    value: "geoTargetConstants/2262"
  },
  {
    id: "2212",
    name: "Dominica",
    displayName: "Dominica",
    countryCode: "DM",
    type: "Country",
    status: "Active",
    value: "geoTargetConstants/2212"
  },
  {
    id: "2214",
    name: "Dominican Republic",
    displayName: "Dominican Republic",
    countryCode: "DO",
    type: "Country",
    status: "Active",
    value: "geoTargetConstants/2214"
  },
  {
    id: "2218",
    name: "Ecuador",
    displayName: "Ecuador",
    countryCode: "EC",
    type: "Country",
    status: "Active",
    value: "geoTargetConstants/2218"
  },
  {
    id: "2818",
    name: "Egypt",
    displayName: "Egypt",
    countryCode: "EG",
    type: "Country",
    status: "Active",
    value: "geoTargetConstants/2818"
  },
  {
    id: "2222",
    name: "El Salvador",
    displayName: "El Salvador",
    countryCode: "SV",
    type: "Country",
    status: "Active",
    value: "geoTargetConstants/2222"
  },
  {
    id: "2226",
    name: "Equatorial Guinea",
    displayName: "Equatorial Guinea",
    countryCode: "GQ",
    type: "Country",
    status: "Active",
    value: "geoTargetConstants/2226"
  },
  {
    id: "2232",
    name: "Eritrea",
    displayName: "Eritrea",
    countryCode: "ER",
    type: "Country",
    status: "Active",
    value: "geoTargetConstants/2232"
  },
  {
    id: "2233",
    name: "Estonia",
    displayName: "Estonia",
    countryCode: "EE",
    type: "Country",
    status: "Active",
    value: "geoTargetConstants/2233"
  },
  {
    id: "2748",
    name: "Eswatini",
    displayName: "Eswatini",
    countryCode: "SZ",
    type: "Country",
    status: "Active",
    value: "geoTargetConstants/2748"
  },
  {
    id: "2231",
    name: "Ethiopia",
    displayName: "Ethiopia",
    countryCode: "ET",
    type: "Country",
    status: "Active",
    value: "geoTargetConstants/2231"
  },
  {
    id: "2238",
    name: "Falkland Islands (Islas Malvinas)",
    displayName: "Falkland Islands (Islas Malvinas)",
    countryCode: "FK",
    type: "Region",
    status: "Active",
    value: "geoTargetConstants/2238"
  },
  {
    id: "2234",
    name: "Faroe Islands",
    displayName: "Faroe Islands",
    countryCode: "FO",
    type: "Region",
    status: "Active",
    value: "geoTargetConstants/2234"
  },
  {
    id: "2242",
    name: "Fiji",
    displayName: "Fiji",
    countryCode: "FJ",
    type: "Country",
    status: "Active",
    value: "geoTargetConstants/2242"
  },
  {
    id: "2246",
    name: "Finland",
    displayName: "Finland",
    countryCode: "FI",
    type: "Country",
    status: "Active",
    value: "geoTargetConstants/2246"
  },
  {
    id: "2250",
    name: "France",
    displayName: "France",
    countryCode: "FR",
    type: "Country",
    status: "Active",
    value: "geoTargetConstants/2250"
  },
  {
    id: "2254",
    name: "French Guiana",
    displayName: "French Guiana",
    countryCode: "GF",
    type: "Region",
    status: "Active",
    value: "geoTargetConstants/2254"
  },
  {
    id: "2258",
    name: "French Polynesia",
    displayName: "French Polynesia",
    countryCode: "PF",
    type: "Country",
    status: "Active",
    value: "geoTargetConstants/2258"
  },
  {
    id: "2260",
    name: "French Southern and Antarctic Lands",
    displayName: "French Southern and Antarctic Lands",
    countryCode: "TF",
    type: "Country",
    status: "Active",
    value: "geoTargetConstants/2260"
  },
  {
    id: "2266",
    name: "Gabon",
    displayName: "Gabon",
    countryCode: "GA",
    type: "Country",
    status: "Active",
    value: "geoTargetConstants/2266"
  },
  {
    id: "2268",
    name: "Georgia",
    displayName: "Georgia",
    countryCode: "GE",
    type: "Country",
    status: "Active",
    value: "geoTargetConstants/2268"
  },
  {
    id: "2276",
    name: "Germany",
    displayName: "Germany",
    countryCode: "DE",
    type: "Country",
    status: "Active",
    value: "geoTargetConstants/2276"
  },
  {
    id: "2288",
    name: "Ghana",
    displayName: "Ghana",
    countryCode: "GH",
    type: "Country",
    status: "Active",
    value: "geoTargetConstants/2288"
  },
  {
    id: "2292",
    name: "Gibraltar",
    displayName: "Gibraltar",
    countryCode: "GI",
    type: "Region",
    status: "Active",
    value: "geoTargetConstants/2292"
  },
  {
    id: "2300",
    name: "Greece",
    displayName: "Greece",
    countryCode: "GR",
    type: "Country",
    status: "Active",
    value: "geoTargetConstants/2300"
  },
  {
    id: "2304",
    name: "Greenland",
    displayName: "Greenland",
    countryCode: "GL",
    type: "Region",
    status: "Active",
    value: "geoTargetConstants/2304"
  },
  {
    id: "2308",
    name: "Grenada",
    displayName: "Grenada",
    countryCode: "GD",
    type: "Country",
    status: "Active",
    value: "geoTargetConstants/2308"
  },
  {
    id: "2312",
    name: "Guadeloupe",
    displayName: "Guadeloupe",
    countryCode: "GP",
    type: "Region",
    status: "Active",
    value: "geoTargetConstants/2312"
  },
  {
    id: "2316",
    name: "Guam",
    displayName: "Guam",
    countryCode: "GU",
    type: "Country",
    status: "Active",
    value: "geoTargetConstants/2316"
  },
  {
    id: "2320",
    name: "Guatemala",
    displayName: "Guatemala",
    countryCode: "GT",
    type: "Country",
    status: "Active",
    value: "geoTargetConstants/2320"
  },
  {
    id: "2831",
    name: "Guernsey",
    displayName: "Guernsey",
    countryCode: "GG",
    type: "Country",
    status: "Active",
    value: "geoTargetConstants/2831"
  },
  {
    id: "2324",
    name: "Guinea",
    displayName: "Guinea",
    countryCode: "GN",
    type: "Country",
    status: "Active",
    value: "geoTargetConstants/2324"
  },
  {
    id: "2624",
    name: "Guinea-Bissau",
    displayName: "Guinea-Bissau",
    countryCode: "GW",
    type: "Country",
    status: "Active",
    value: "geoTargetConstants/2624"
  },
  {
    id: "2328",
    name: "Guyana",
    displayName: "Guyana",
    countryCode: "GY",
    type: "Country",
    status: "Active",
    value: "geoTargetConstants/2328"
  },
  {
    id: "2332",
    name: "Haiti",
    displayName: "Haiti",
    countryCode: "HT",
    type: "Country",
    status: "Active",
    value: "geoTargetConstants/2332"
  },
  {
    id: "2334",
    name: "Heard Island and McDonald Islands",
    displayName: "Heard Island and McDonald Islands",
    countryCode: "HM",
    type: "Country",
    status: "Active",
    value: "geoTargetConstants/2334"
  },
  {
    id: "2340",
    name: "Honduras",
    displayName: "Honduras",
    countryCode: "HN",
    type: "Country",
    status: "Active",
    value: "geoTargetConstants/2340"
  },
  {
    id: "2344",
    name: "Hong Kong",
    displayName: "Hong Kong",
    countryCode: "HK",
    type: "Region",
    status: "Active",
    value: "geoTargetConstants/2344"
  },
  {
    id: "2348",
    name: "Hungary",
    displayName: "Hungary",
    countryCode: "HU",
    type: "Country",
    status: "Active",
    value: "geoTargetConstants/2348"
  },
  {
    id: "2352",
    name: "Iceland",
    displayName: "Iceland",
    countryCode: "IS",
    type: "Country",
    status: "Active",
    value: "geoTargetConstants/2352"
  },
  {
    id: "2356",
    name: "India",
    displayName: "India",
    countryCode: "IN",
    type: "Country",
    status: "Active",
    value: "geoTargetConstants/2356"
  },
  {
    id: "2360",
    name: "Indonesia",
    displayName: "Indonesia",
    countryCode: "ID",
    type: "Country",
    status: "Active",
    value: "geoTargetConstants/2360"
  },
  {
    id: "2368",
    name: "Iraq",
    displayName: "Iraq",
    countryCode: "IQ",
    type: "Country",
    status: "Active",
    value: "geoTargetConstants/2368"
  },
  {
    id: "2372",
    name: "Ireland",
    displayName: "Ireland",
    countryCode: "IE",
    type: "Country",
    status: "Active",
    value: "geoTargetConstants/2372"
  },
  {
    id: "2833",
    name: "Isle of Man",
    displayName: "Isle of Man",
    countryCode: "IM",
    type: "Country",
    status: "Active",
    value: "geoTargetConstants/2833"
  },
  {
    id: "2376",
    name: "Israel",
    displayName: "Israel",
    countryCode: "IL",
    type: "Country",
    status: "Active",
    value: "geoTargetConstants/2376"
  },
  {
    id: "2380",
    name: "Italy",
    displayName: "Italy",
    countryCode: "IT",
    type: "Country",
    status: "Active",
    value: "geoTargetConstants/2380"
  },
  {
    id: "2388",
    name: "Jamaica",
    displayName: "Jamaica",
    countryCode: "JM",
    type: "Country",
    status: "Active",
    value: "geoTargetConstants/2388"
  },
  {
    id: "2392",
    name: "Japan",
    displayName: "Japan",
    countryCode: "JP",
    type: "Country",
    status: "Active",
    value: "geoTargetConstants/2392"
  },
  {
    id: "2832",
    name: "Jersey",
    displayName: "Jersey",
    countryCode: "JE",
    type: "Country",
    status: "Active",
    value: "geoTargetConstants/2832"
  },
  {
    id: "2400",
    name: "Jordan",
    displayName: "Jordan",
    countryCode: "JO",
    type: "Country",
    status: "Active",
    value: "geoTargetConstants/2400"
  },
  {
    id: "2398",
    name: "Kazakhstan",
    displayName: "Kazakhstan",
    countryCode: "KZ",
    type: "Country",
    status: "Active",
    value: "geoTargetConstants/2398"
  },
  {
    id: "2404",
    name: "Kenya",
    displayName: "Kenya",
    countryCode: "KE",
    type: "Country",
    status: "Active",
    value: "geoTargetConstants/2404"
  },
  {
    id: "2296",
    name: "Kiribati",
    displayName: "Kiribati",
    countryCode: "KI",
    type: "Country",
    status: "Active",
    value: "geoTargetConstants/2296"
  },
  {
    id: "2900",
    name: "Kosovo",
    displayName: "Kosovo",
    countryCode: "XK",
    type: "Region",
    status: "Active",
    value: "geoTargetConstants/2900"
  },
  {
    id: "2414",
    name: "Kuwait",
    displayName: "Kuwait",
    countryCode: "KW",
    type: "Country",
    status: "Active",
    value: "geoTargetConstants/2414"
  },
  {
    id: "2417",
    name: "Kyrgyzstan",
    displayName: "Kyrgyzstan",
    countryCode: "KG",
    type: "Country",
    status: "Active",
    value: "geoTargetConstants/2417"
  },
  {
    id: "2418",
    name: "Laos",
    displayName: "Laos",
    countryCode: "LA",
    type: "Country",
    status: "Active",
    value: "geoTargetConstants/2418"
  },
  {
    id: "2428",
    name: "Latvia",
    displayName: "Latvia",
    countryCode: "LV",
    type: "Country",
    status: "Active",
    value: "geoTargetConstants/2428"
  },
  {
    id: "2422",
    name: "Lebanon",
    displayName: "Lebanon",
    countryCode: "LB",
    type: "Country",
    status: "Active",
    value: "geoTargetConstants/2422"
  },
  {
    id: "2426",
    name: "Lesotho",
    displayName: "Lesotho",
    countryCode: "LS",
    type: "Country",
    status: "Active",
    value: "geoTargetConstants/2426"
  },
  {
    id: "2430",
    name: "Liberia",
    displayName: "Liberia",
    countryCode: "LR",
    type: "Country",
    status: "Active",
    value: "geoTargetConstants/2430"
  },
  {
    id: "2434",
    name: "Libya",
    displayName: "Libya",
    countryCode: "LY",
    type: "Country",
    status: "Active",
    value: "geoTargetConstants/2434"
  },
  {
    id: "2438",
    name: "Liechtenstein",
    displayName: "Liechtenstein",
    countryCode: "LI",
    type: "Country",
    status: "Active",
    value: "geoTargetConstants/2438"
  },
  {
    id: "2440",
    name: "Lithuania",
    displayName: "Lithuania",
    countryCode: "LT",
    type: "Country",
    status: "Active",
    value: "geoTargetConstants/2440"
  },
  {
    id: "2442",
    name: "Luxembourg",
    displayName: "Luxembourg",
    countryCode: "LU",
    type: "Country",
    status: "Active",
    value: "geoTargetConstants/2442"
  },
  {
    id: "2446",
    name: "Macao",
    displayName: "Macao",
    countryCode: "MO",
    type: "Region",
    status: "Active",
    value: "geoTargetConstants/2446"
  },
  {
    id: "2450",
    name: "Madagascar",
    displayName: "Madagascar",
    countryCode: "MG",
    type: "Country",
    status: "Active",
    value: "geoTargetConstants/2450"
  },
  {
    id: "2454",
    name: "Malawi",
    displayName: "Malawi",
    countryCode: "MW",
    type: "Country",
    status: "Active",
    value: "geoTargetConstants/2454"
  },
  {
    id: "2458",
    name: "Malaysia",
    displayName: "Malaysia",
    countryCode: "MY",
    type: "Country",
    status: "Active",
    value: "geoTargetConstants/2458"
  },
  {
    id: "2462",
    name: "Maldives",
    displayName: "Maldives",
    countryCode: "MV",
    type: "Country",
    status: "Active",
    value: "geoTargetConstants/2462"
  },
  {
    id: "2466",
    name: "Mali",
    displayName: "Mali",
    countryCode: "ML",
    type: "Country",
    status: "Active",
    value: "geoTargetConstants/2466"
  },
  {
    id: "2470",
    name: "Malta",
    displayName: "Malta",
    countryCode: "MT",
    type: "Country",
    status: "Active",
    value: "geoTargetConstants/2470"
  },
  {
    id: "2584",
    name: "Marshall Islands",
    displayName: "Marshall Islands",
    countryCode: "MH",
    type: "Country",
    status: "Active",
    value: "geoTargetConstants/2584"
  },
  {
    id: "2474",
    name: "Martinique",
    displayName: "Martinique",
    countryCode: "MQ",
    type: "Region",
    status: "Active",
    value: "geoTargetConstants/2474"
  },
  {
    id: "2478",
    name: "Mauritania",
    displayName: "Mauritania",
    countryCode: "MR",
    type: "Country",
    status: "Active",
    value: "geoTargetConstants/2478"
  },
  {
    id: "2480",
    name: "Mauritius",
    displayName: "Mauritius",
    countryCode: "MU",
    type: "Country",
    status: "Active",
    value: "geoTargetConstants/2480"
  },
  {
    id: "2175",
    name: "Mayotte",
    displayName: "Mayotte",
    countryCode: "YT",
    type: "Region",
    status: "Active",
    value: "geoTargetConstants/2175"
  },
  {
    id: "2484",
    name: "Mexico",
    displayName: "Mexico",
    countryCode: "MX",
    type: "Country",
    status: "Active",
    value: "geoTargetConstants/2484"
  },
  {
    id: "2583",
    name: "Micronesia",
    displayName: "Micronesia",
    countryCode: "FM",
    type: "Country",
    status: "Active",
    value: "geoTargetConstants/2583"
  },
  {
    id: "2498",
    name: "Moldova",
    displayName: "Moldova",
    countryCode: "MD",
    type: "Country",
    status: "Active",
    value: "geoTargetConstants/2498"
  },
  {
    id: "2492",
    name: "Monaco",
    displayName: "Monaco",
    countryCode: "MC",
    type: "Country",
    status: "Active",
    value: "geoTargetConstants/2492"
  },
  {
    id: "2496",
    name: "Mongolia",
    displayName: "Mongolia",
    countryCode: "MN",
    type: "Country",
    status: "Active",
    value: "geoTargetConstants/2496"
  },
  {
    id: "2499",
    name: "Montenegro",
    displayName: "Montenegro",
    countryCode: "ME",
    type: "Country",
    status: "Active",
    value: "geoTargetConstants/2499"
  },
  {
    id: "2500",
    name: "Montserrat",
    displayName: "Montserrat",
    countryCode: "MS",
    type: "Region",
    status: "Active",
    value: "geoTargetConstants/2500"
  },
  {
    id: "2504",
    name: "Morocco",
    displayName: "Morocco",
    countryCode: "MA",
    type: "Country",
    status: "Active",
    value: "geoTargetConstants/2504"
  },
  {
    id: "2508",
    name: "Mozambique",
    displayName: "Mozambique",
    countryCode: "MZ",
    type: "Country",
    status: "Active",
    value: "geoTargetConstants/2508"
  },
  {
    id: "2516",
    name: "Namibia",
    displayName: "Namibia",
    countryCode: "NA",
    type: "Country",
    status: "Active",
    value: "geoTargetConstants/2516"
  },
  {
    id: "2520",
    name: "Nauru",
    displayName: "Nauru",
    countryCode: "NR",
    type: "Country",
    status: "Active",
    value: "geoTargetConstants/2520"
  },
  {
    id: "2524",
    name: "Nepal",
    displayName: "Nepal",
    countryCode: "NP",
    type: "Country",
    status: "Active",
    value: "geoTargetConstants/2524"
  },
  {
    id: "2528",
    name: "Netherlands",
    displayName: "Netherlands",
    countryCode: "NL",
    type: "Country",
    status: "Active",
    value: "geoTargetConstants/2528"
  },
  {
    id: "2540",
    name: "New Caledonia",
    displayName: "New Caledonia",
    countryCode: "NC",
    type: "Country",
    status: "Active",
    value: "geoTargetConstants/2540"
  },
  {
    id: "2554",
    name: "New Zealand",
    displayName: "New Zealand",
    countryCode: "NZ",
    type: "Country",
    status: "Active",
    value: "geoTargetConstants/2554"
  },
  {
    id: "2558",
    name: "Nicaragua",
    displayName: "Nicaragua",
    countryCode: "NI",
    type: "Country",
    status: "Active",
    value: "geoTargetConstants/2558"
  },
  {
    id: "2562",
    name: "Niger",
    displayName: "Niger",
    countryCode: "NE",
    type: "Country",
    status: "Active",
    value: "geoTargetConstants/2562"
  },
  {
    id: "2566",
    name: "Nigeria",
    displayName: "Nigeria",
    countryCode: "NG",
    type: "Country",
    status: "Active",
    value: "geoTargetConstants/2566"
  },
  {
    id: "2570",
    name: "Niue",
    displayName: "Niue",
    countryCode: "NU",
    type: "Country",
    status: "Active",
    value: "geoTargetConstants/2570"
  },
  {
    id: "2574",
    name: "Norfolk Island",
    displayName: "Norfolk Island",
    countryCode: "NF",
    type: "Country",
    status: "Active",
    value: "geoTargetConstants/2574"
  },
  {
    id: "2807",
    name: "North Macedonia",
    displayName: "North Macedonia",
    countryCode: "MK",
    type: "Country",
    status: "Active",
    value: "geoTargetConstants/2807"
  },
  {
    id: "2580",
    name: "Northern Mariana Islands",
    displayName: "Northern Mariana Islands",
    countryCode: "MP",
    type: "Country",
    status: "Active",
    value: "geoTargetConstants/2580"
  },
  {
    id: "2578",
    name: "Norway",
    displayName: "Norway",
    countryCode: "NO",
    type: "Country",
    status: "Active",
    value: "geoTargetConstants/2578"
  },
  {
    id: "2512",
    name: "Oman",
    displayName: "Oman",
    countryCode: "OM",
    type: "Country",
    status: "Active",
    value: "geoTargetConstants/2512"
  },
  {
    id: "2586",
    name: "Pakistan",
    displayName: "Pakistan",
    countryCode: "PK",
    type: "Country",
    status: "Active",
    value: "geoTargetConstants/2586"
  },
  {
    id: "2585",
    name: "Palau",
    displayName: "Palau",
    countryCode: "PW",
    type: "Country",
    status: "Active",
    value: "geoTargetConstants/2585"
  },
  {
    id: "2275",
    name: "Palestine",
    displayName: "Palestine",
    countryCode: "PS",
    type: "Region",
    status: "Active",
    value: "geoTargetConstants/2275"
  },
  {
    id: "2591",
    name: "Panama",
    displayName: "Panama",
    countryCode: "PA",
    type: "Country",
    status: "Active",
    value: "geoTargetConstants/2591"
  },
  {
    id: "2598",
    name: "Papua New Guinea",
    displayName: "Papua New Guinea",
    countryCode: "PG",
    type: "Country",
    status: "Active",
    value: "geoTargetConstants/2598"
  },
  {
    id: "2600",
    name: "Paraguay",
    displayName: "Paraguay",
    countryCode: "PY",
    type: "Country",
    status: "Active",
    value: "geoTargetConstants/2600"
  },
  {
    id: "2604",
    name: "Peru",
    displayName: "Peru",
    countryCode: "PE",
    type: "Country",
    status: "Active",
    value: "geoTargetConstants/2604"
  },
  {
    id: "2608",
    name: "Philippines",
    displayName: "Philippines",
    countryCode: "PH",
    type: "Country",
    status: "Active",
    value: "geoTargetConstants/2608"
  },
  {
    id: "2612",
    name: "Pitcairn Islands",
    displayName: "Pitcairn Islands",
    countryCode: "PN",
    type: "Country",
    status: "Active",
    value: "geoTargetConstants/2612"
  },
  {
    id: "2616",
    name: "Poland",
    displayName: "Poland",
    countryCode: "PL",
    type: "Country",
    status: "Active",
    value: "geoTargetConstants/2616"
  },
  {
    id: "2620",
    name: "Portugal",
    displayName: "Portugal",
    countryCode: "PT",
    type: "Country",
    status: "Active",
    value: "geoTargetConstants/2620"
  },
  {
    id: "2630",
    name: "Puerto Rico",
    displayName: "Puerto Rico",
    countryCode: "PR",
    type: "Region",
    status: "Active",
    value: "geoTargetConstants/2630"
  },
  {
    id: "2634",
    name: "Qatar",
    displayName: "Qatar",
    countryCode: "QA",
    type: "Country",
    status: "Active",
    value: "geoTargetConstants/2634"
  },
  {
    id: "2178",
    name: "Republic of the Congo",
    displayName: "Republic of the Congo",
    countryCode: "CG",
    type: "Country",
    status: "Active",
    value: "geoTargetConstants/2178"
  },
  {
    id: "2638",
    name: "Reunion",
    displayName: "Reunion",
    countryCode: "RE",
    type: "Region",
    status: "Active",
    value: "geoTargetConstants/2638"
  },
  {
    id: "2642",
    name: "Romania",
    displayName: "Romania",
    countryCode: "RO",
    type: "Country",
    status: "Active",
    value: "geoTargetConstants/2642"
  },
  {
    id: "2643",
    name: "Russia",
    displayName: "Russia",
    countryCode: "RU",
    type: "Country",
    status: "Active",
    value: "geoTargetConstants/2643"
  },
  {
    id: "2646",
    name: "Rwanda",
    displayName: "Rwanda",
    countryCode: "RW",
    type: "Country",
    status: "Active",
    value: "geoTargetConstants/2646"
  },
  {
    id: "2652",
    name: "Saint Barthelemy",
    displayName: "Saint Barthelemy",
    countryCode: "BL",
    type: "Country",
    status: "Active",
    value: "geoTargetConstants/2652"
  },
  {
    id: "2654",
    name: "Saint Helena, Ascension and Tristan da Cunha",
    displayName: "Saint Helena, Ascension and Tristan da Cunha",
    countryCode: "SH",
    type: "Country",
    status: "Active",
    value: "geoTargetConstants/2654"
  },
  {
    id: "2659",
    name: "Saint Kitts and Nevis",
    displayName: "Saint Kitts and Nevis",
    countryCode: "KN",
    type: "Country",
    status: "Active",
    value: "geoTargetConstants/2659"
  },
  {
    id: "2662",
    name: "Saint Lucia",
    displayName: "Saint Lucia",
    countryCode: "LC",
    type: "Country",
    status: "Active",
    value: "geoTargetConstants/2662"
  },
  {
    id: "2663",
    name: "Saint Martin",
    displayName: "Saint Martin",
    countryCode: "MF",
    type: "Country",
    status: "Active",
    value: "geoTargetConstants/2663"
  },
  {
    id: "2666",
    name: "Saint Pierre and Miquelon",
    displayName: "Saint Pierre and Miquelon",
    countryCode: "PM",
    type: "Country",
    status: "Active",
    value: "geoTargetConstants/2666"
  },
  {
    id: "2670",
    name: "Saint Vincent and the Grenadines",
    displayName: "Saint Vincent and the Grenadines",
    countryCode: "VC",
    type: "Country",
    status: "Active",
    value: "geoTargetConstants/2670"
  },
  {
    id: "2882",
    name: "Samoa",
    displayName: "Samoa",
    countryCode: "WS",
    type: "Country",
    status: "Active",
    value: "geoTargetConstants/2882"
  },
  {
    id: "2674",
    name: "San Marino",
    displayName: "San Marino",
    countryCode: "SM",
    type: "Country",
    status: "Active",
    value: "geoTargetConstants/2674"
  },
  {
    id: "2678",
    name: "Sao Tome and Principe",
    displayName: "Sao Tome and Principe",
    countryCode: "ST",
    type: "Country",
    status: "Active",
    value: "geoTargetConstants/2678"
  },
  {
    id: "2682",
    name: "Saudi Arabia",
    displayName: "Saudi Arabia",
    countryCode: "SA",
    type: "Country",
    status: "Active",
    value: "geoTargetConstants/2682"
  },
  {
    id: "2686",
    name: "Senegal",
    displayName: "Senegal",
    countryCode: "SN",
    type: "Country",
    status: "Active",
    value: "geoTargetConstants/2686"
  },
  {
    id: "2688",
    name: "Serbia",
    displayName: "Serbia",
    countryCode: "RS",
    type: "Country",
    status: "Active",
    value: "geoTargetConstants/2688"
  },
  {
    id: "2690",
    name: "Seychelles",
    displayName: "Seychelles",
    countryCode: "SC",
    type: "Country",
    status: "Active",
    value: "geoTargetConstants/2690"
  },
  {
    id: "2694",
    name: "Sierra Leone",
    displayName: "Sierra Leone",
    countryCode: "SL",
    type: "Country",
    status: "Active",
    value: "geoTargetConstants/2694"
  },
  {
    id: "2702",
    name: "Singapore",
    displayName: "Singapore",
    countryCode: "SG",
    type: "Country",
    status: "Active",
    value: "geoTargetConstants/2702"
  },
  {
    id: "2534",
    name: "Sint Maarten",
    displayName: "Sint Maarten",
    countryCode: "SX",
    type: "Country",
    status: "Active",
    value: "geoTargetConstants/2534"
  },
  {
    id: "2703",
    name: "Slovakia",
    displayName: "Slovakia",
    countryCode: "SK",
    type: "Country",
    status: "Active",
    value: "geoTargetConstants/2703"
  },
  {
    id: "2705",
    name: "Slovenia",
    displayName: "Slovenia",
    countryCode: "SI",
    type: "Country",
    status: "Active",
    value: "geoTargetConstants/2705"
  },
  {
    id: "2706",
    name: "Somalia",
    displayName: "Somalia",
    countryCode: "SO",
    type: "Country",
    status: "Active",
    value: "geoTargetConstants/2706"
  },
  {
    id: "2710",
    name: "South Africa",
    displayName: "South Africa",
    countryCode: "ZA",
    type: "Country",
    status: "Active",
    value: "geoTargetConstants/2710"
  },
  {
    id: "2239",
    name: "South Georgia and the South Sandwich Islands",
    displayName: "South Georgia and the South Sandwich Islands",
    countryCode: "GS",
    type: "Country",
    status: "Active",
    value: "geoTargetConstants/2239"
  },
  {
    id: "2410",
    name: "South Korea",
    displayName: "South Korea",
    countryCode: "KR",
    type: "Country",
    status: "Active",
    value: "geoTargetConstants/2410"
  },
  {
    id: "2728",
    name: "South Sudan",
    displayName: "South Sudan",
    countryCode: "SS",
    type: "Country",
    status: "Active",
    value: "geoTargetConstants/2728"
  },
  {
    id: "2724",
    name: "Spain",
    displayName: "Spain",
    countryCode: "ES",
    type: "Country",
    status: "Active",
    value: "geoTargetConstants/2724"
  },
  {
    id: "2736",
    name: "Sudan",
    displayName: "Sudan",
    countryCode: "SD",
    type: "Country",
    status: "Active",
    value: "geoTargetConstants/2736"
  },
  {
    id: "2740",
    name: "Suriname",
    displayName: "Suriname",
    countryCode: "SR",
    type: "Country",
    status: "Active",
    value: "geoTargetConstants/2740"
  },
  {
    id: "2744",
    name: "Svalbard and Jan Mayen",
    displayName: "Svalbard and Jan Mayen",
    countryCode: "SJ",
    type: "Region",
    status: "Active",
    value: "geoTargetConstants/2744"
  },
  {
    id: "2752",
    name: "Sweden",
    displayName: "Sweden",
    countryCode: "SE",
    type: "Country",
    status: "Active",
    value: "geoTargetConstants/2752"
  },
  {
    id: "2756",
    name: "Switzerland",
    displayName: "Switzerland",
    countryCode: "CH",
    type: "Country",
    status: "Active",
    value: "geoTargetConstants/2756"
  },
  {
    id: "2762",
    name: "Tajikistan",
    displayName: "Tajikistan",
    countryCode: "TJ",
    type: "Country",
    status: "Active",
    value: "geoTargetConstants/2762"
  },
  {
    id: "2834",
    name: "Tanzania",
    displayName: "Tanzania",
    countryCode: "TZ",
    type: "Country",
    status: "Active",
    value: "geoTargetConstants/2834"
  },
  {
    id: "2270",
    name: "The Gambia",
    displayName: "The Gambia",
    countryCode: "GM",
    type: "Country",
    status: "Active",
    value: "geoTargetConstants/2270"
  },
  {
    id: "2764",
    name: "Thailand",
    displayName: "Thailand",
    countryCode: "TH",
    type: "Country",
    status: "Active",
    value: "geoTargetConstants/2764"
  },
  {
    id: "2626",
    name: "Timor-Leste",
    displayName: "Timor-Leste",
    countryCode: "TL",
    type: "Country",
    status: "Active",
    value: "geoTargetConstants/2626"
  },
  {
    id: "2768",
    name: "Togo",
    displayName: "Togo",
    countryCode: "TG",
    type: "Country",
    status: "Active",
    value: "geoTargetConstants/2768"
  },
  {
    id: "2772",
    name: "Tokelau",
    displayName: "Tokelau",
    countryCode: "TK",
    type: "Country",
    status: "Active",
    value: "geoTargetConstants/2772"
  },
  {
    id: "2776",
    name: "Tonga",
    displayName: "Tonga",
    countryCode: "TO",
    type: "Country",
    status: "Active",
    value: "geoTargetConstants/2776"
  },
  {
    id: "2780",
    name: "Trinidad and Tobago",
    displayName: "Trinidad and Tobago",
    countryCode: "TT",
    type: "Country",
    status: "Active",
    value: "geoTargetConstants/2780"
  },
  {
    id: "2788",
    name: "Tunisia",
    displayName: "Tunisia",
    countryCode: "TN",
    type: "Country",
    status: "Active",
    value: "geoTargetConstants/2788"
  },
  {
    id: "2792",
    name: "Turkiye",
    displayName: "Turkiye",
    countryCode: "TR",
    type: "Country",
    status: "Active",
    value: "geoTargetConstants/2792"
  },
  {
    id: "2795",
    name: "Turkmenistan",
    displayName: "Turkmenistan",
    countryCode: "TM",
    type: "Country",
    status: "Active",
    value: "geoTargetConstants/2795"
  },
  {
    id: "2796",
    name: "Turks and Caicos Islands",
    displayName: "Turks and Caicos Islands",
    countryCode: "TC",
    type: "Region",
    status: "Active",
    value: "geoTargetConstants/2796"
  },
  {
    id: "2798",
    name: "Tuvalu",
    displayName: "Tuvalu",
    countryCode: "TV",
    type: "Country",
    status: "Active",
    value: "geoTargetConstants/2798"
  },
  {
    id: "2850",
    name: "U.S. Virgin Islands",
    displayName: "U.S. Virgin Islands",
    countryCode: "VI",
    type: "Region",
    status: "Active",
    value: "geoTargetConstants/2850"
  },
  {
    id: "2800",
    name: "Uganda",
    displayName: "Uganda",
    countryCode: "UG",
    type: "Country",
    status: "Active",
    value: "geoTargetConstants/2800"
  },
  {
    id: "2804",
    name: "Ukraine",
    displayName: "Ukraine",
    countryCode: "UA",
    type: "Country",
    status: "Active",
    value: "geoTargetConstants/2804"
  },
  {
    id: "2784",
    name: "United Arab Emirates",
    displayName: "United Arab Emirates",
    countryCode: "AE",
    type: "Country",
    status: "Active",
    value: "geoTargetConstants/2784"
  },
  {
    id: "2826",
    name: "United Kingdom",
    displayName: "United Kingdom",
    countryCode: "GB",
    type: "Country",
    status: "Active",
    value: "geoTargetConstants/2826"
  },
  {
    id: "2840",
    name: "United States",
    displayName: "United States",
    countryCode: "US",
    type: "Country",
    status: "Active",
    value: "geoTargetConstants/2840"
  },
  {
    id: "2581",
    name: "United States Minor Outlying Islands",
    displayName: "United States Minor Outlying Islands",
    countryCode: "UM",
    type: "Country",
    status: "Active",
    value: "geoTargetConstants/2581"
  },
  {
    id: "2858",
    name: "Uruguay",
    displayName: "Uruguay",
    countryCode: "UY",
    type: "Country",
    status: "Active",
    value: "geoTargetConstants/2858"
  },
  {
    id: "2860",
    name: "Uzbekistan",
    displayName: "Uzbekistan",
    countryCode: "UZ",
    type: "Country",
    status: "Active",
    value: "geoTargetConstants/2860"
  },
  {
    id: "2548",
    name: "Vanuatu",
    displayName: "Vanuatu",
    countryCode: "VU",
    type: "Country",
    status: "Active",
    value: "geoTargetConstants/2548"
  },
  {
    id: "2336",
    name: "Vatican City",
    displayName: "Vatican City",
    countryCode: "VA",
    type: "Country",
    status: "Active",
    value: "geoTargetConstants/2336"
  },
  {
    id: "2862",
    name: "Venezuela",
    displayName: "Venezuela",
    countryCode: "VE",
    type: "Country",
    status: "Active",
    value: "geoTargetConstants/2862"
  },
  {
    id: "2876",
    name: "Wallis and Futuna",
    displayName: "Wallis and Futuna",
    countryCode: "WF",
    type: "Country",
    status: "Active",
    value: "geoTargetConstants/2876"
  },
  {
    id: "2732",
    name: "Western Sahara",
    displayName: "Western Sahara",
    countryCode: "EH",
    type: "Region",
    status: "Active",
    value: "geoTargetConstants/2732"
  },
  {
    id: "2887",
    name: "Yemen",
    displayName: "Yemen",
    countryCode: "YE",
    type: "Country",
    status: "Active",
    value: "geoTargetConstants/2887"
  },
  {
    id: "2894",
    name: "Zambia",
    displayName: "Zambia",
    countryCode: "ZM",
    type: "Country",
    status: "Active",
    value: "geoTargetConstants/2894"
  },
  {
    id: "2716",
    name: "Zimbabwe",
    displayName: "Zimbabwe",
    countryCode: "ZW",
    type: "Country",
    status: "Active",
    value: "geoTargetConstants/2716"
  }
];

export const LANGUAGE_CONSTANTS: LanguageConstant[] = [
  // Vietnamese first (default)
  {
    name: "Vietnamese",
    code: "vi",
    criterionId: "1040",
    value: "languageConstants/1040"
  },
  // Rest of languages in alphabetical order
  {
    name: "Arabic",
    code: "ar",
    criterionId: "1019",
    value: "languageConstants/1019"
  },
  {
    name: "Bengali",
    code: "bn",
    criterionId: "1056",
    value: "languageConstants/1056"
  },
  {
    name: "Bulgarian",
    code: "bg",
    criterionId: "1020",
    value: "languageConstants/1020"
  },
  {
    name: "Catalan",
    code: "ca",
    criterionId: "1038",
    value: "languageConstants/1038"
  },
  {
    name: "Chinese (simplified)",
    code: "zh_CN",
    criterionId: "1017",
    value: "languageConstants/1017"
  },
  {
    name: "Chinese (traditional)",
    code: "zh_TW",
    criterionId: "1018",
    value: "languageConstants/1018"
  },
  {
    name: "Croatian",
    code: "hr",
    criterionId: "1039",
    value: "languageConstants/1039"
  },
  {
    name: "Czech",
    code: "cs",
    criterionId: "1021",
    value: "languageConstants/1021"
  },
  {
    name: "Danish",
    code: "da",
    criterionId: "1009",
    value: "languageConstants/1009"
  },
  {
    name: "Dutch",
    code: "nl",
    criterionId: "1010",
    value: "languageConstants/1010"
  },
  {
    name: "English",
    code: "en",
    criterionId: "1000",
    value: "languageConstants/1000"
  },
  {
    name: "Estonian",
    code: "et",
    criterionId: "1043",
    value: "languageConstants/1043"
  },
  {
    name: "Filipino",
    code: "tl",
    criterionId: "1042",
    value: "languageConstants/1042"
  },
  {
    name: "Finnish",
    code: "fi",
    criterionId: "1011",
    value: "languageConstants/1011"
  },
  {
    name: "French",
    code: "fr",
    criterionId: "1002",
    value: "languageConstants/1002"
  },
  {
    name: "German",
    code: "de",
    criterionId: "1001",
    value: "languageConstants/1001"
  },
  {
    name: "Greek",
    code: "el",
    criterionId: "1022",
    value: "languageConstants/1022"
  },
  {
    name: "Gujarati",
    code: "gu",
    criterionId: "1072",
    value: "languageConstants/1072"
  },
  {
    name: "Hebrew",
    code: "iw",
    criterionId: "1027",
    value: "languageConstants/1027"
  },
  {
    name: "Hindi",
    code: "hi",
    criterionId: "1023",
    value: "languageConstants/1023"
  },
  {
    name: "Hungarian",
    code: "hu",
    criterionId: "1024",
    value: "languageConstants/1024"
  },
  {
    name: "Icelandic",
    code: "is",
    criterionId: "1026",
    value: "languageConstants/1026"
  },
  {
    name: "Indonesian",
    code: "id",
    criterionId: "1025",
    value: "languageConstants/1025"
  },
  {
    name: "Italian",
    code: "it",
    criterionId: "1004",
    value: "languageConstants/1004"
  },
  {
    name: "Japanese",
    code: "ja",
    criterionId: "1005",
    value: "languageConstants/1005"
  },
  {
    name: "Kannada",
    code: "kn",
    criterionId: "1086",
    value: "languageConstants/1086"
  },
  {
    name: "Korean",
    code: "ko",
    criterionId: "1012",
    value: "languageConstants/1012"
  },
  {
    name: "Latvian",
    code: "lv",
    criterionId: "1028",
    value: "languageConstants/1028"
  },
  {
    name: "Lithuanian",
    code: "lt",
    criterionId: "1029",
    value: "languageConstants/1029"
  },
  {
    name: "Malay",
    code: "ms",
    criterionId: "1102",
    value: "languageConstants/1102"
  },
  {
    name: "Malayalam",
    code: "ml",
    criterionId: "1098",
    value: "languageConstants/1098"
  },
  {
    name: "Marathi",
    code: "mr",
    criterionId: "1101",
    value: "languageConstants/1101"
  },
  {
    name: "Norwegian",
    code: "no",
    criterionId: "1013",
    value: "languageConstants/1013"
  },
  {
    name: "Persian",
    code: "fa",
    criterionId: "1064",
    value: "languageConstants/1064"
  },
  {
    name: "Polish",
    code: "pl",
    criterionId: "1030",
    value: "languageConstants/1030"
  },
  {
    name: "Portuguese",
    code: "pt",
    criterionId: "1014",
    value: "languageConstants/1014"
  },
  {
    name: "Punjabi",
    code: "pa",
    criterionId: "1110",
    value: "languageConstants/1110"
  },
  {
    name: "Romanian",
    code: "ro",
    criterionId: "1032",
    value: "languageConstants/1032"
  },
  {
    name: "Russian",
    code: "ru",
    criterionId: "1031",
    value: "languageConstants/1031"
  },
  {
    name: "Serbian",
    code: "sr",
    criterionId: "1035",
    value: "languageConstants/1035"
  },
  {
    name: "Slovak",
    code: "sk",
    criterionId: "1033",
    value: "languageConstants/1033"
  },
  {
    name: "Slovenian",
    code: "sl",
    criterionId: "1034",
    value: "languageConstants/1034"
  },
  {
    name: "Spanish",
    code: "es",
    criterionId: "1003",
    value: "languageConstants/1003"
  },
  {
    name: "Swedish",
    code: "sv",
    criterionId: "1015",
    value: "languageConstants/1015"
  },
  {
    name: "Tamil",
    code: "ta",
    criterionId: "1130",
    value: "languageConstants/1130"
  },
  {
    name: "Telugu",
    code: "te",
    criterionId: "1131",
    value: "languageConstants/1131"
  },
  {
    name: "Thai",
    code: "th",
    criterionId: "1044",
    value: "languageConstants/1044"
  },
  {
    name: "Turkish",
    code: "tr",
    criterionId: "1037",
    value: "languageConstants/1037"
  },
  {
    name: "Ukrainian",
    code: "uk",
    criterionId: "1036",
    value: "languageConstants/1036"
  },
  {
    name: "Urdu",
    code: "ur",
    criterionId: "1041",
    value: "languageConstants/1041"
  }
];

export const NETWORK_CONSTANTS = [
  {
    name: "Google Search",
    value: "GOOGLE_SEARCH"
  },
  {
    name: "Google Search & Partners",
    value: "GOOGLE_SEARCH_AND_PARTNERS"
  }
] as const;