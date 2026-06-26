import { LegalPage } from "../../components/LegalPage";

export default function TermsPage() {
  return (
    <LegalPage
      eyebrow={{ en: "Terms", ar: "الشروط" }}
      title={{ en: "Terms of Service", ar: "شروط الخدمة" }}
      updated={{ en: "Last updated: June 23, 2026", ar: "آخر تحديث: 23 يونيو 2026" }}
      intro={{
        en: "These terms explain how you may use FadFada, a digital AI wellbeing companion delivered through our web app.",
        ar: "توضح هذه الشروط كيفية استخدام فضفضة، وهي رفيق رفاه نفسي رقمي يعمل بالذكاء الاصطناعي عبر تطبيق الويب.",
      }}
      sections={[
        {
          title: { en: "Use of the service", ar: "استخدام الخدمة" },
          body: {
            en: "You may use FadFada for personal reflection, guided check-ins, and wellbeing support. You must not misuse the service, interfere with its operation, or attempt unauthorized access to accounts, systems, or data.",
            ar: "يمكنك استخدام فضفضة للتأمل الشخصي، وجلسات التحقق الموجهة، ودعم الرفاه. لا يجوز إساءة استخدام الخدمة أو تعطيل عملها أو محاولة الوصول غير المصرح به إلى الحسابات أو الأنظمة أو البيانات.",
          },
        },
        {
          title: { en: "Wellbeing disclaimer", ar: "تنبيه متعلق بالرفاه" },
          body: {
            en: "FadFada is not a medical device, emergency service, therapist, or replacement for professional care. If you may harm yourself or someone else, contact local emergency services or a trusted person immediately.",
            ar: "فضفضة ليست جهازًا طبيًا أو خدمة طوارئ أو معالجًا أو بديلًا للرعاية المتخصصة. إذا كنت قد تؤذي نفسك أو شخصًا آخر، تواصل فورًا مع خدمات الطوارئ المحلية أو شخص موثوق.",
          },
        },
        {
          title: { en: "Paid access", ar: "الوصول المدفوع" },
          body: {
            en: "Paid Plus access unlocks digital features described on our pricing page. Payment processing, receipts, taxes, subscription management, and some billing communications may be handled by Lemon Squeezy as merchant of record.",
            ar: "تفتح خطة بلس المدفوعة خصائص رقمية موضحة في صفحة الأسعار. قد تتولى Lemon Squeezy معالجة الدفع والإيصالات والضرائب وإدارة الاشتراك وبعض رسائل الفوترة بصفتها التاجر المسجل.",
          },
        },
        {
          title: { en: "Changes", ar: "التغييرات" },
          body: {
            en: "We may update the service or these terms as FadFada evolves. Continued use after updates means you accept the updated terms.",
            ar: "قد نحدث الخدمة أو هذه الشروط مع تطور فضفضة. استمرار الاستخدام بعد التحديث يعني قبولك للشروط المحدثة.",
          },
        },
      ]}
    />
  );
}