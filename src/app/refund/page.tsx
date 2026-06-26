import { LegalPage } from "../../components/LegalPage";

export default function RefundPage() {
  return (
    <LegalPage
      eyebrow={{ en: "Refunds", ar: "الاسترداد" }}
      title={{ en: "Refund Policy", ar: "سياسة الاسترداد" }}
      updated={{ en: "Last updated: June 23, 2026", ar: "آخر تحديث: 23 يونيو 2026" }}
      intro={{
        en: "This policy explains how refund requests are handled for paid FadFada Plus digital subscription access.",
        ar: "توضح هذه السياسة كيفية التعامل مع طلبات الاسترداد لخطة فضفضة بلس الرقمية المدفوعة.",
      }}
      sections={[
        {
          title: { en: "Refund window", ar: "مدة طلب الاسترداد" },
          body: {
            en: "If you are not satisfied with FadFada Plus, you may request a refund within 14 days of purchase. Refunds are reviewed based on account status, payment history, and usage of the paid digital features.",
            ar: "إذا لم تكن راضيًا عن فضفضة بلس، يمكنك طلب استرداد خلال 14 يومًا من الشراء. تتم مراجعة الاسترداد حسب حالة الحساب وسجل الدفع واستخدام الخصائص الرقمية المدفوعة.",
          },
        },
        {
          title: { en: "How to request", ar: "كيفية الطلب" },
          body: {
            en: "Use the Lemon Squeezy receipt or customer portal when available, or contact support with the email used for purchase and the Lemon Squeezy receipt or transaction reference. Approved refunds are processed back to the original payment method through Lemon Squeezy.",
            ar: "استخدم إيصال Lemon Squeezy أو بوابة العميل عند توفرها، أو تواصل مع الدعم باستخدام البريد الإلكتروني المستخدم للشراء وإيصال Lemon Squeezy أو مرجع المعاملة. تتم معالجة الاستردادات الموافق عليها إلى وسيلة الدفع الأصلية عبر Lemon Squeezy.",
          },
        },
        {
          title: { en: "Subscription cancellation", ar: "إلغاء الاشتراك" },
          body: {
            en: "You may cancel renewal of a subscription where supported. Canceling renewal does not automatically refund previous paid periods unless a refund is approved under this policy.",
            ar: "يمكنك إلغاء تجديد الاشتراك عند توفر ذلك. إلغاء التجديد لا يعني تلقائيًا استرداد الفترات المدفوعة السابقة إلا إذا تمت الموافقة على الاسترداد وفق هذه السياسة.",
          },
        },
      ]}
    />
  );
}