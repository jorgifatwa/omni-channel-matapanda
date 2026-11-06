export interface ShippingCard {
  id: string;
  bullet: boolean;
  content: string[];
}

export const SHIPPING_RATES_DATA = {
  freeShippingThreshold: 500000, // Rp 500.000
  standardFee: 50000, // Rp 50.000
  cards: [
    {
      id: "free-shipping",
      bullet: true,
      content: [
        "Shipping is free for Indonesia orders Rp 500.000 and above, inclusive of duties and handling taxes. For orders under Rp 500.000, standard delivery fee starts from Rp 50.000 depending on destination zone.",
      ],
    },
    {
      id: "delivery-timeline",
      bullet: true,
      content: [
        "Delivery takes 1 to 3 working days for Java & Jabodetabek, and 2 to 5 working days for all other areas across Indonesia (allow 4 to 7 working days during festive peaks and major sale periods).",
      ],
    },
    {
      id: "domestic-only",
      bullet: true,
      content: [
        "We currently ship within Indonesia only. Orders are dispatched from our Bandung studio using the courier you choose at checkout (JNE, J&T, SiCepat, AnterAja, or POS Indonesia).",
      ],
    },
    {
      id: "liability-disclaimer",
      bullet: true,
      content: [
        "it'smatapanda is not liable for return shipment costs and reshipment handling fees incurred once the parcel has left our Studio. This includes situations where the recipient is uncontactable, wrong address provided, or courier partners are unable to complete final delivery.",
        "During sale and festive peak seasons, there may be slight delivery delays due to the high surge of courier logistical volumes.",
      ],
    },
  ] as ShippingCard[],
};
