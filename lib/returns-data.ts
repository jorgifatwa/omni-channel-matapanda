export interface ReturnCard {
  id: string;
  bullet: boolean;
  content: string[];
}

export const RETURNS_POLICY_DATA = {
  returnWindowDays: 7,
  cards: [
    {
      id: "return-window",
      bullet: true,
      content: [
        "Returns and size/color exchanges are accepted within 7 calendar days from the date your it'smatapanda parcel is marked as successfully delivered by the courier.",
      ],
    },
    {
      id: "condition-eligibility",
      bullet: true,
      content: [
        "All returned items must be in original brand-new condition: unworn, unwashed, unaltered, and completely free of marks, odors, or stains. All original product packaging, tags, dustbags, and plastic sleeves must remain intact and securely attached.",
      ],
    },
    {
      id: "shipping-charges",
      bullet: true,
      content: [
        "For exchanges due to change of mind or personal size preference, return shipping fees to our Studio and redelivery fees are covered by the customer.",
        "If the return is due to an incorrect variant sent or a verified manufacturing defect, it'smatapanda will bear 100% of all return and replacement shipping costs.",
      ],
    },
    {
      id: "refund-processing",
      bullet: true,
      content: [
        "Refunds will be processed within 3 to 5 business days once your returned item is received and passes our Quality Control inspection. Refunds are credited back to your original payment method or issued as store credit vouchers.",
      ],
    },
    {
      id: "how-to-initiate",
      bullet: true,
      content: [
        "To start a return or exchange request, simply contact our Customer Care crew on WhatsApp at +62 812-3456-7890 or email hello@itsmatapanda.com with your Order Number and photos of the item.",
      ],
    },
  ] as ReturnCard[],
};
