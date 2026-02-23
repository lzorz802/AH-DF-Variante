export interface Report {
  id: string;
  title: string;
  description: string;
  tag: string;
  url: string;
  featured?: boolean;
}

export const reports: Report[] = [
  {
    id: "1",
    title: "HBenchmark – Advanced Sales Analytics",
    description:
      "Monitor RevPAR performance, daily analysis, competitive benchmarking and LYST trends for hotel structures.",
    tag: "sales",
    url: "https://app.fabric.microsoft.com/reportEmbed?reportId=14911e08-e17e-448c-9d81-8f7dc771b171&autoAuth=true&ctid=deff24bb-2089-4400-8c8e-f71e680378b2",
    featured: true,
  },
  {
    id: "2",
    title: "CEE Report 2023 – Italia",
    description:
      "KPMG benchmark on customer experience excellence across 9 Italian industries. Tracks NPS, OmniIndex, Six Pillars, CEE Score and CEE Rank from 2017 to present.",
    tag: "marketing",
    url: "https://app.fabric.microsoft.com/reportEmbed?reportId=00c308c3-e8e6-40a6-87cd-fa2bded22d71&autoAuth=true&ctid=deff24bb-2089-4400-8c8e-f71e680378b2",
  },
  {
    id: "3",
    title: "Asset & Facility Monitoring – Regione Veneto",
    description:
      "Dashboard di monitoraggio di edifici, asset e manutenzioni delle strutture ospedaliere della Regione Veneto.",
    tag: "operations",
    url: "https://app.fabric.microsoft.com/reportEmbed?reportId=7404ad55-f269-42eb-b7f4-a9994d4e97ab&autoAuth=true&ctid=deff24bb-2089-4400-8c8e-f71e680378b2",
  },
  {
    id: "4",
    title: "Project & Works Monitoring – Regione Lombardia",
    description:
      "Dashboard di monitoraggio delle commesse e direzione lavori per la Regione Lombardia. Supervisione avanzamento progetti e KPI operativi.",
    tag: "operations",
    url: "https://app.fabric.microsoft.com/reportEmbed?reportId=baddae82-b173-4894-bec3-99c4052e2741&autoAuth=true&ctid=deff24bb-2089-4400-8c8e-f71e680378b2",
  },
  {
    id: "5",
    title: "Speckle BIM Viewer",
    description: "Visualizzazione federata del modello BIM 3D con tutti i layer disciplinari sovrapposti.",
    tag: "operations",
    url: "https://app.speckle.systems/projects/a0102047d4/models/all?embedToken=0c70148e6c17a7848184ee9a7947313e5359b3bf70#embed=%7B%22isEnabled%22%3Atrue%7D",
  },
];

export const filterTabs = [
  { label: "All Reports", value: "all" },
  { label: "Sales", value: "sales" },
  { label: "Finance", value: "finance" },
  { label: "Operations", value: "operations" },
  { label: "HR", value: "hr" },
  { label: "Marketing", value: "marketing", icon: "flame" as const },
];
