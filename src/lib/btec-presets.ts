export interface BtecPreset {
  id: string;
  label: string;
  title: string;
  unit_title: string;
  specialisationName: string;
}

/**
 * Common Pearson BTEC units used to pre-fill the Create Order form.
 * `specialisationName` must match a row in `public.specialisations`.
 */
export const BTEC_PRESETS: BtecPreset[] = [
  {
    id: "unit1-business",
    label: "الوحدة 1: بيئة الأعمال",
    title: "تقرير وحدة بيئة الأعمال",
    unit_title: "الوحدة 1: استكشاف الأعمال (Exploring Business)",
    specialisationName: "إدارة الأعمال",
  },
  {
    id: "unit2-marketing",
    label: "الوحدة 2: الحملة التسويقية",
    title: "تقرير وحدة الحملة التسويقية",
    unit_title: "الوحدة 2: تطوير حملة تسويقية (Developing a Marketing Campaign)",
    specialisationName: "إدارة الأعمال",
  },
  {
    id: "unit3-finance",
    label: "الوحدة 3: التمويل الشخصي والتجاري",
    title: "تقرير وحدة التمويل الشخصي والتجاري",
    unit_title: "الوحدة 3: التمويل الشخصي والتجاري (Personal and Business Finance)",
    specialisationName: "إدارة الأعمال",
  },
  {
    id: "unit1-it",
    label: "الوحدة 1: نظم تكنولوجيا المعلومات",
    title: "تقرير وحدة نظم تكنولوجيا المعلومات",
    unit_title: "الوحدة 1: نظم تكنولوجيا المعلومات (Information Technology Systems)",
    specialisationName: "تكنولوجيا المعلومات",
  },
  {
    id: "unit2-it",
    label: "الوحدة 2: إنشاء نظم إدارة المعلومات",
    title: "تقرير وحدة إنشاء نظم إدارة المعلومات",
    unit_title: "الوحدة 2: إنشاء نظم لإدارة المعلومات (Creating Systems to Manage Information)",
    specialisationName: "تكنولوجيا المعلومات",
  },
  {
    id: "unit6-web",
    label: "الوحدة 6: تطوير المواقع",
    title: "مشروع وحدة تطوير المواقع",
    unit_title: "الوحدة 6: تطوير المواقع الإلكترونية (Website Development)",
    specialisationName: "تكنولوجيا المعلومات",
  },
];
