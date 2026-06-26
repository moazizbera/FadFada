import { LegalPage } from "../../components/LegalPage";

export default function PricingPage() {
  return (
    <LegalPage
      eyebrow={{ en: "Pricing", ar: "الأسعار" }}
      title={{ en: "FadFada Plus", ar: "فضفضة بلس" }}
      updated={{ en: "Last updated: June 23, 2026", ar: "آخر تحديث: 23 يونيو 2026" }}
      intro={{
        en: "FadFada offers a free wellbeing companion experience and a paid Plus plan for people who want deeper reflection, saved progress, and premium personalization.",
        ar: "تقدم فضفضة تجربة مجانية للرفاه النفسي وخطة بلس مدفوعة لمن يريدون تأملًا أعمق وحفظًا للتقدم وتخصيصًا أفضل.",
      }}
      sections={[
        {
          title: { en: "Free plan", ar: "الخطة المجانية" },
          body: {
            en: "The free plan includes access to the core bilingual reflection chat, guided check-ins, emotional tone tools, and selected wellbeing prompts.",
            ar: "تتضمن الخطة المجانية محادثة التأمل الأساسية بالعربية والإنجليزية، وجلسات التحقق الموجهة، وأدوات النبرة الشعورية، ومجموعة من محفزات الرفاه.",
          },
        },
        {
          title: { en: "Plus plan", ar: "خطة بلس" },
          body: {
            en: "FadFada Plus is planned at $4.99 per month and includes premium reflection tools, deeper mood and journey insights, saved wellbeing plans, personalization features, and expanded companion experiences.",
            ar: "خطة فضفضة بلس مخططة بسعر 4.99 دولار شهريًا وتشمل أدوات تأمل مميزة، ورؤى أعمق للمزاج والرحلة، وخطط رفاه محفوظة، وخصائص تخصيص، وتجارب رفيق موسعة.",
          },
        },
        {
          title: { en: "Billing", ar: "الفوترة" },
          body: {
            en: "Payments are processed securely through the active checkout provider. Taxes, receipts, and invoices are handled by the payment processor for completed payments.",
            ar: "تتم معالجة المدفوعات بأمان عبر مزود الدفع النشط. يتولى معالج الدفع الضرائب والإيصالات أو الفواتير للمدفوعات المكتملة.",
          },
        },
      ]}
    />
  );
}