export function CheckoutStepper({ step }: { step: 1 | 2 | 3 }) {
  const steps = ["Pengiriman", "Pembayaran", "Selesai"];
  return (
    <ol className="flex items-center gap-2 flex-wrap text-xs sm:text-sm font-bold mb-6" aria-label="Langkah checkout">
      {steps.map((label, i) => {
        const n = (i + 1) as 1 | 2 | 3;
        const done = n < step;
        const active = n === step;
        return (
          <li key={label} className="flex items-center gap-2">
            <span
              className={`flex items-center gap-2 ${
                active || done ? "text-[#396254] dark:text-[#dcf58d]" : "text-neutral-400 dark:text-neutral-500"
              }`}
              aria-current={active ? "step" : undefined}
            >
              <span
                className={`w-6 h-6 rounded-full grid place-items-center text-[11px] ${
                  done
                    ? "bg-[#396254] text-[#dcf58d]"
                    : active
                    ? "bg-[#dcf58d] text-[#396254] ring-4 ring-[#d5c6ff]/70"
                    : "bg-neutral-200 dark:bg-neutral-800"
                }`}
              >
                {done ? "✓" : n}
              </span>
              <span>{label}</span>
            </span>
            {i < steps.length - 1 && <span className="w-6 h-0.5 rounded bg-neutral-200 dark:bg-neutral-700" />}
          </li>
        );
      })}
    </ol>
  );
}
