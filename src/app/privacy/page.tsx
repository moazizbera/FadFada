import { LegalPage } from "../../components/LegalPage";

export default function PrivacyPage() {
  return (
    <LegalPage
      eyebrow={{ en: "Privacy", ar: "الخصوصية" }}
      title={{ en: "Privacy Policy", ar: "سياسة الخصوصية" }}
      updated={{ en: "Last updated: June 23, 2026", ar: "آخر تحديث: 23 يونيو 2026" }}
      intro={{
        en: "This policy explains what information FadFada uses to provide the app experience and how payment-related data is handled.",
        ar: "توضح هذه السياسة المعلومات التي تستخدمها فضفضة لتقديم تجربة التطبيق وكيفية التعامل مع بيانات الدفع.",
      }}
      sections={[
        {
          title: { en: "Information we collect", ar: "المعلومات التي نجمعها" },
          body: {
            en: "We may collect account information, saved reflections, app preferences, usage events, and technical data needed to operate, secure, and improve FadFada.",
            ar: "قد نجمع معلومات الحساب، والتأملات المحفوظة، وتفضيلات التطبيق، وأحداث الاستخدام، والبيانات التقنية اللازمة لتشغيل فضفضة وتأمينها وتحسينها.",
          },
        },
        {
          title: { en: "How we use information", ar: "كيف نستخدم المعلومات" },
          body: {
            en: "We use information to provide chat and wellbeing features, remember user preferences, maintain subscriptions, prevent abuse, improve reliability, and support users.",
            ar: "نستخدم المعلومات لتقديم المحادثة وخصائص الرفاه، وتذكر التفضيلات، وإدارة الاشتراكات، ومنع الإساءة، وتحسين الاعتمادية، ودعم المستخدمين.",
          },
        },
        {
          title: { en: "Payments", ar: "المدفوعات" },
          body: {
            en: "Payments are processed by Lemon Squeezy. We do not store full card numbers. Lemon Squeezy may collect payment, billing, tax, subscription, and fraud-prevention information according to its own policies.",
            ar: "تتم معالجة المدفوعات عبر Lemon Squeezy. لا نخزن أرقام البطاقات الكاملة. قد تجمع Lemon Squeezy معلومات الدفع والفوترة والضرائب والاشتراك ومنع الاحتيال وفق سياساتها الخاصة.",
          },
        },
        {
          title: { en: "Contact", ar: "التواصل" },
          body: {
            en: "For privacy requests or account questions, contact the FadFada team through the support channel provided in the app or on the website.",
            ar: "لطلبات الخصوصية أو أسئلة الحساب، تواصل مع فريق فضفضة عبر قناة الدعم المتاحة في التطبيق أو على الموقع.",
          },
        },
      ]}
    />
  );
}